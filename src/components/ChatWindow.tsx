import { useState, useEffect, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { MessageCircle, X, Send, Minimize2, Maximize2, Users, Paperclip, Image as ImageIcon, FileText, Bold, Italic, Link as LinkIcon, Download, Search } from "lucide-react";

type Message = {
  id: string;
  sender_id: string;
  sender_name: string;
  receiver_id: string;
  message: string;
  message_type: 'text' | 'image' | 'pdf' | 'file';
  file_url?: string;
  file_name?: string;
  file_size?: number;
  created_at: string;
  read: boolean;
};

type User = {
  id: string;
  full_name: string;
  email: string;
  department?: string;
  unreadCount?: number;
};

export default function ChatWindow() {
  const { toast } = useToast();
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [users, setUsers] = useState<User[]>([]);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [unreadCount, setUnreadCount] = useState(0);
  const [uploading, setUploading] = useState(false);
  const [showFormatting, setShowFormatting] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    loadCurrentUser();
  }, []);

  useEffect(() => {
    if (currentUser) {
      loadUsers();
    }
  }, [currentUser]);

  useEffect(() => {
    if (!currentUser) return;

    // Subscribe to ALL messages for current user (for notifications)
    const notificationChannel = supabase
      .channel('message-notifications')
      .on('postgres_changes', 
        { 
          event: 'INSERT', 
          schema: 'public', 
          table: 'messages',
          filter: `receiver_id=eq.${currentUser.id}`
        }, 
        async (payload) => {
          const newMsg = payload.new as Message;
          
          // Show notification if chat is minimized or closed, or if message is from different user
          if (isMinimized || !isOpen || selectedUser?.id !== newMsg.sender_id) {
            // Get unread count from this sender
            const { count } = await supabase
              .from('messages')
              .select('*', { count: 'exact', head: true })
              .eq('sender_id', newMsg.sender_id)
              .eq('receiver_id', currentUser.id)
              .eq('read', false);

            const unreadFromSender = count || 0;
            
            toast({
              title: `${newMsg.sender_name} (${unreadFromSender})`,
              description: newMsg.message_type === 'text' 
                ? newMsg.message.substring(0, 50) + (newMsg.message.length > 50 ? '...' : '')
                : `Sent a ${newMsg.message_type}`,
              duration: 5000,
            });
          }
          
          loadUnreadCount();
          loadUsers(); // Refresh user list to update unread badges
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(notificationChannel);
    };
  }, [currentUser, isMinimized, isOpen, selectedUser]);

  useEffect(() => {
    if (selectedUser) {
      loadMessages();
      markMessagesAsRead();
      
      // Subscribe to new messages for selected conversation
      const channel = supabase
        .channel('messages')
        .on('postgres_changes', 
          { 
            event: 'INSERT', 
            schema: 'public', 
            table: 'messages',
            filter: `receiver_id=eq.${currentUser?.id}`
          }, 
          () => {
            loadMessages();
            loadUnreadCount();
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [selectedUser, currentUser]);

  useEffect(() => {
    if (currentUser) {
      loadUnreadCount();
      const interval = setInterval(loadUnreadCount, 30000); // Check every 30 seconds
      return () => clearInterval(interval);
    }
  }, [currentUser]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const loadCurrentUser = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('id, full_name, email, department')
        .eq('id', user.id)
        .single();
      setCurrentUser(profile);
    }
  };

  const loadUsers = async () => {
    const { data, error } = await supabase
      .from('profiles')
      .select('id, full_name, email, department')
      .order('full_name');

    if (error) {
      console.error('Error loading users:', error);
      return;
    }

    if (!currentUser) {
      setUsers(data || []);
      return;
    }

    // Get unread counts for each user
    const usersWithUnread = await Promise.all(
      (data || []).map(async (user) => {
        const { count } = await supabase
          .from('messages')
          .select('*', { count: 'exact', head: true })
          .eq('sender_id', user.id)
          .eq('receiver_id', currentUser.id)
          .eq('read', false);

        return {
          ...user,
          unreadCount: count || 0
        };
      })
    );

    setUsers(usersWithUnread);
  };

  const loadMessages = async () => {
    if (!selectedUser || !currentUser) return;

    const { data, error } = await supabase
      .from('messages')
      .select('*')
      .or(`and(sender_id.eq.${currentUser.id},receiver_id.eq.${selectedUser.id}),and(sender_id.eq.${selectedUser.id},receiver_id.eq.${currentUser.id})`)
      .order('created_at', { ascending: true });

    if (error) {
      console.error('Error loading messages:', error);
      return;
    }

    setMessages(data || []);
  };

  const loadUnreadCount = async () => {
    if (!currentUser) return;

    const { count } = await supabase
      .from('messages')
      .select('*', { count: 'exact', head: true })
      .eq('receiver_id', currentUser.id)
      .eq('read', false);

    setUnreadCount(count || 0);
  };

  const markMessagesAsRead = async () => {
    if (!selectedUser || !currentUser) return;

    await supabase
      .from('messages')
      .update({ read: true })
      .eq('sender_id', selectedUser.id)
      .eq('receiver_id', currentUser.id)
      .eq('read', false);

    loadUnreadCount();
    loadUsers(); // Refresh user list to update badges
  };

  const sendMessage = async () => {
    if (!newMessage.trim() || !selectedUser || !currentUser) return;

    const { error } = await supabase
      .from('messages')
      .insert({
        sender_id: currentUser.id,
        sender_name: currentUser.full_name || currentUser.email,
        receiver_id: selectedUser.id,
        message: newMessage.trim(),
        message_type: 'text',
        read: false
      });

    if (error) {
      toast({
        title: "Error",
        description: "Failed to send message",
        variant: "destructive"
      });
      return;
    }

    setNewMessage("");
    loadMessages();
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !selectedUser || !currentUser) return;

    setUploading(true);

    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${currentUser.id}/${Date.now()}.${fileExt}`;
      
      const { error: uploadError, data } = await supabase.storage
        .from('chat-files')
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('chat-files')
        .getPublicUrl(fileName);

      let messageType: 'text' | 'image' | 'pdf' | 'file' = 'file';
      if (file.type.startsWith('image/')) {
        messageType = 'image';
      } else if (file.type === 'application/pdf') {
        messageType = 'pdf';
      }

      const { error: messageError } = await supabase
        .from('messages')
        .insert({
          sender_id: currentUser.id,
          sender_name: currentUser.full_name || currentUser.email,
          receiver_id: selectedUser.id,
          message: file.name,
          message_type: messageType,
          file_url: publicUrl,
          file_name: file.name,
          file_size: file.size,
          read: false
        });

      if (messageError) throw messageError;

      loadMessages();
      toast({
        title: "Success",
        description: "File uploaded successfully"
      });
    } catch (error) {
      console.error('File upload error:', error);
      toast({
        title: "Error",
        description: "Failed to upload file",
        variant: "destructive"
      });
    } finally {
      setUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const insertFormatting = (before: string, after: string = '') => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const text = newMessage;
    const selectedText = text.substring(start, end);
    
    const newText = text.substring(0, start) + before + selectedText + after + text.substring(end);
    setNewMessage(newText);
    
    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(start + before.length, end + before.length);
    }, 0);
  };

  const formatFileSize = (bytes?: number) => {
    if (!bytes) return '';
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  if (!isOpen) {
    return (
      <div className="fixed bottom-6 right-6 z-50">
        <Button
          onClick={() => setIsOpen(true)}
          className="rounded-full h-14 w-14 shadow-lg relative"
        >
          <MessageCircle className="h-6 w-6" />
          {unreadCount > 0 && (
            <Badge 
              variant="destructive" 
              className="absolute -top-2 -right-2 h-6 w-6 flex items-center justify-center p-0 rounded-full"
            >
              {unreadCount}
            </Badge>
          )}
        </Button>
      </div>
    );
  }

  return (
    <div className="fixed bottom-6 right-6 z-50">
      <Card className={`w-[600px] shadow-2xl ${isMinimized ? 'h-14' : 'h-[450px]'} flex flex-col`}>
        <CardHeader className="p-4 border-b flex flex-row items-center justify-between">
          <div className="flex items-center gap-2">
            <MessageCircle className="h-5 w-5" />
            <CardTitle className="text-lg">
              {selectedUser ? selectedUser.full_name || selectedUser.email : 'Messages'}
            </CardTitle>
          </div>
          <div className="flex gap-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsMinimized(!isMinimized)}
              className="h-8 w-8 p-0"
            >
              {isMinimized ? <Maximize2 className="h-4 w-4" /> : <Minimize2 className="h-4 w-4" />}
            </Button>
            {selectedUser && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSelectedUser(null)}
                className="h-8 w-8 p-0"
              >
                <Users className="h-4 w-4" />
              </Button>
            )}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsOpen(false)}
              className="h-8 w-8 p-0"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>

        {!isMinimized && (
          <CardContent className="p-0 flex-1 flex flex-col overflow-hidden">
            {!selectedUser ? (
              // Users List
              <>
                <div className="p-3 border-b">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      type="text"
                      placeholder="Search users..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-9"
                    />
                  </div>
                </div>
                <ScrollArea className="flex-1">
                  <div className="p-2">
                    {users
                      .filter(u => u.id !== currentUser?.id)
                      .filter(u => {
                        const query = searchQuery.toLowerCase();
                        return (
                          u.full_name?.toLowerCase().includes(query) ||
                          u.email?.toLowerCase().includes(query) ||
                          u.department?.toLowerCase().includes(query)
                        );
                      })
                      .map((user) => (
                    <div
                      key={user.id}
                      onClick={() => setSelectedUser(user)}
                      className="flex items-center gap-3 p-3 hover:bg-muted rounded-lg cursor-pointer"
                    >
                      <Avatar>
                        <AvatarFallback>{getInitials(user.full_name || user.email)}</AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <div className="font-medium truncate">{user.full_name || user.email}</div>
                        {user.department && (
                          <div className="text-xs text-muted-foreground">{user.department}</div>
                        )}
                      </div>
                      {user.unreadCount! > 0 && (
                        <Badge variant="destructive" className="ml-2">
                          {user.unreadCount}
                        </Badge>
                      )}
                    </div>
                  ))}
                </div>
              </ScrollArea>
              </>
            ) : (
              // Messages View
              <>
                <ScrollArea className="flex-1 p-4">
                  <div className="space-y-4">
                    {messages.map((msg) => {
                      const isOwn = msg.sender_id === currentUser?.id;
                      return (
                        <div
                          key={msg.id}
                          className={`flex ${isOwn ? 'justify-end' : 'justify-start'}`}
                        >
                          <div
                            className={`max-w-[70%] rounded-lg p-3 ${
                              isOwn
                                ? 'bg-primary text-primary-foreground'
                                : 'bg-muted'
                            }`}
                          >
                            {msg.message_type === 'image' && msg.file_url && (
                              <div className="mb-2">
                                <img 
                                  src={msg.file_url} 
                                  alt={msg.file_name}
                                  className="max-w-full rounded cursor-pointer hover:opacity-90"
                                  onClick={() => window.open(msg.file_url, '_blank')}
                                />
                                <div className="text-xs mt-1 opacity-70">{msg.file_name}</div>
                              </div>
                            )}
                            {msg.message_type === 'pdf' && msg.file_url && (
                              <div className="flex items-center gap-2 mb-2">
                                <FileText className="h-8 w-8" />
                                <div className="flex-1 min-w-0">
                                  <div className="text-sm font-medium truncate">{msg.file_name}</div>
                                  <div className="text-xs opacity-70">{formatFileSize(msg.file_size)}</div>
                                </div>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => window.open(msg.file_url, '_blank')}
                                  className={isOwn ? 'text-primary-foreground hover:bg-primary/20' : ''}
                                >
                                  <Download className="h-4 w-4" />
                                </Button>
                              </div>
                            )}
                            {msg.message_type === 'file' && msg.file_url && (
                              <div className="flex items-center gap-2 mb-2">
                                <Paperclip className="h-6 w-6" />
                                <div className="flex-1 min-w-0">
                                  <div className="text-sm font-medium truncate">{msg.file_name}</div>
                                  <div className="text-xs opacity-70">{formatFileSize(msg.file_size)}</div>
                                </div>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => window.open(msg.file_url, '_blank')}
                                  className={isOwn ? 'text-primary-foreground hover:bg-primary/20' : ''}
                                >
                                  <Download className="h-4 w-4" />
                                </Button>
                              </div>
                            )}
                            {msg.message_type === 'text' && (
                              <div 
                                className="text-sm whitespace-pre-wrap break-words"
                                dangerouslySetInnerHTML={{ 
                                  __html: msg.message
                                    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
                                    .replace(/\*(.*?)\*/g, '<em>$1</em>')
                                    .replace(/\[(.*?)\]\((.*?)\)/g, '<a href="$2" target="_blank" class="underline">$1</a>')
                                }}
                              />
                            )}
                            <div
                              className={`text-xs mt-1 ${
                                isOwn ? 'text-primary-foreground/70' : 'text-muted-foreground'
                              }`}
                            >
                              {new Date(msg.created_at).toLocaleTimeString([], {
                                hour: '2-digit',
                                minute: '2-digit'
                              })}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                    <div ref={messagesEndRef} />
                  </div>
                </ScrollArea>

                <div className="p-4 border-t">
                  {showFormatting && (
                    <div className="flex gap-1 mb-2 pb-2 border-b">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => insertFormatting('**', '**')}
                        title="Bold"
                      >
                        <Bold className="h-4 w-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => insertFormatting('*', '*')}
                        title="Italic"
                      >
                        <Italic className="h-4 w-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => insertFormatting('[', '](url)')}
                        title="Link"
                      >
                        <LinkIcon className="h-4 w-4" />
                      </Button>
                    </div>
                  )}
                  <div className="flex gap-2 items-end">
                    <input
                      ref={fileInputRef}
                      type="file"
                      className="hidden"
                      onChange={handleFileUpload}
                      accept="image/*,.pdf,.doc,.docx,.txt"
                    />
                    <div className="flex flex-col gap-1">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => fileInputRef.current?.click()}
                        disabled={uploading}
                        title="Attach file"
                      >
                        <Paperclip className="h-4 w-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => setShowFormatting(!showFormatting)}
                        title="Text formatting"
                      >
                        <Bold className="h-4 w-4" />
                      </Button>
                    </div>
                    <Textarea
                      ref={textareaRef}
                      value={newMessage}
                      onChange={(e) => setNewMessage(e.target.value)}
                      onKeyPress={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                          e.preventDefault();
                          sendMessage();
                        }
                      }}
                      placeholder="Type a message... (Shift+Enter for new line)"
                      className="flex-1 min-h-[40px] max-h-[120px] resize-none"
                      rows={1}
                    />
                    <Button onClick={sendMessage} size="sm" disabled={uploading}>
                      <Send className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </>
            )}
          </CardContent>
        )}
      </Card>
    </div>
  );
}
