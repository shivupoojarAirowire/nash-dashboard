import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { FileText, Upload, Download, Share2, Trash2, FolderOpen } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useFeatureFlags } from '@/hooks/useFeatureFlags';

interface Document {
  id: string;
  name: string;
  file_url: string;
  file_type: string;
  file_size: number;
  uploaded_by: string;
  uploaded_at: string;
  shared_with: string[];
  folder: string;
  description: string;
}

interface Profile {
  id: string;
  email: string;
  full_name: string;
}

export default function Documents() {
  const { user } = useAuth();
  const { toast } = useToast();
  const { has, loading: flagsLoading } = useFeatureFlags();
  const [documents, setDocuments] = useState<Document[]>([]);
  const [users, setUsers] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
  const [shareDialogOpen, setShareDialogOpen] = useState(false);
  const [selectedDoc, setSelectedDoc] = useState<Document | null>(null);
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);

  // Form states
  const [file, setFile] = useState<File | null>(null);
  const [folder, setFolder] = useState('General');
  const [customFolder, setCustomFolder] = useState('');
  const [isCustomFolder, setIsCustomFolder] = useState(false);
  const [description, setDescription] = useState('');
  const [folders, setFolders] = useState<string[]>([]);

  useEffect(() => {
    if (!flagsLoading && has('Documents')) {
      fetchDocuments();
      fetchUsers();
    }
  }, [flagsLoading, has]);

  // Debug: log the feature flag status
  console.log('Documents page - flagsLoading:', flagsLoading, 'has Documents:', has('Documents'), 'user:', user?.id);

  // Show loading while checking feature access
  if (flagsLoading) {
    return (
      <div className="container mx-auto p-6">
        <Card>
          <CardContent className="p-6">
            <p className="text-center text-muted-foreground">Loading feature flags...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Check feature access
  if (!has('Documents')) {
    return (
      <div className="container mx-auto p-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Access Restricted
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">
              You don't have access to the Documents feature. Please contact your administrator.
            </p>
            <p className="text-sm text-muted-foreground mt-2">
              Debug: User ID: {user?.id || 'No user'}
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const fetchDocuments = async () => {
    try {
      const { data, error } = await supabase
        .from('documents')
        .select('*')
        .order('uploaded_at', { ascending: false });

      if (error) throw error;
      setDocuments(data || []);
      
      // Extract unique folders from documents
      const uniqueFolders = [...new Set(data?.map((doc: Document) => doc.folder) || [])];
      setFolders(uniqueFolders.filter(Boolean) as string[]);
    } catch (error: any) {
      toast({
        title: 'Error loading documents',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchUsers = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, email, full_name');

      if (error) throw error;
      setUsers(data || []);
    } catch (error: any) {
      console.error('Error fetching users:', error);
    }
  };

  const handleUpload = async () => {
    if (!file) {
      toast({
        title: 'No file selected',
        description: 'Please select a file to upload',
        variant: 'destructive',
      });
      return;
    }

    // Validate custom folder name if creating new
    if (isCustomFolder && !customFolder.trim()) {
      toast({
        title: 'Folder name required',
        description: 'Please enter a folder name',
        variant: 'destructive',
      });
      return;
    }

    // Validate file type
    const allowedTypes = [
      'application/pdf',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    ];

    if (!allowedTypes.includes(file.type)) {
      toast({
        title: 'Invalid file type',
        description: 'Only PDF, Excel, and Word documents are allowed',
        variant: 'destructive',
      });
      return;
    }

    setUploading(true);

    try {
      // Upload file to storage
      const fileExt = file.name.split('.').pop();
      const fileName = `${Math.random().toString(36).substring(2)}_${Date.now()}.${fileExt}`;
      const filePath = `${user?.id}/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('documents')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('documents')
        .getPublicUrl(filePath);

      // Use custom folder name if creating new, otherwise use selected folder
      const folderName = isCustomFolder ? customFolder.trim() : folder;

      // Save document metadata
      const { error: dbError } = await supabase
        .from('documents')
        .insert({
          name: file.name,
          file_url: publicUrl,
          file_type: file.type,
          file_size: file.size,
          uploaded_by: user?.id,
          folder: folderName,
          description,
          shared_with: [],
        });

      if (dbError) throw dbError;

      toast({
        title: 'Success',
        description: 'Document uploaded successfully',
      });

      setUploadDialogOpen(false);
      setFile(null);
      setDescription('');
      setFolder('General');
      fetchDocuments();
    } catch (error: any) {
      toast({
        title: 'Upload failed',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setUploading(false);
    }
  };

  const handleShare = async () => {
    if (!selectedDoc) return;

    try {
      const { error } = await supabase
        .from('documents')
        .update({ shared_with: selectedUsers })
        .eq('id', selectedDoc.id);

      if (error) throw error;

      toast({
        title: 'Success',
        description: 'Document shared successfully',
      });

      setShareDialogOpen(false);
      setSelectedDoc(null);
      setSelectedUsers([]);
      fetchDocuments();
    } catch (error: any) {
      toast({
        title: 'Share failed',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  const handleDelete = async (doc: Document) => {
    if (!confirm('Are you sure you want to delete this document?')) return;

    try {
      // Delete from storage
      const urlParts = doc.file_url.split('/');
      const filePath = urlParts.slice(-2).join('/');
      
      await supabase.storage.from('documents').remove([filePath]);

      // Delete from database
      const { error } = await supabase
        .from('documents')
        .delete()
        .eq('id', doc.id);

      if (error) throw error;

      toast({
        title: 'Success',
        description: 'Document deleted successfully',
      });

      fetchDocuments();
    } catch (error: any) {
      toast({
        title: 'Delete failed',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  const handleDownload = async (doc: Document) => {
    window.open(doc.file_url, '_blank');
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(2) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Documents</h1>
          <p className="text-muted-foreground">
            Upload and manage project documents
          </p>
        </div>

        <Dialog open={uploadDialogOpen} onOpenChange={setUploadDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Upload className="mr-2 h-4 w-4" />
              Upload Document
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>Upload Document</DialogTitle>
              <DialogDescription>
                Upload PDF, Excel, or Word documents to share with your team
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="file">File</Label>
                <Input
                  id="file"
                  type="file"
                  accept=".pdf,.xlsx,.xls,.doc,.docx"
                  onChange={(e) => setFile(e.target.files?.[0] || null)}
                />
                {file && (
                  <p className="text-sm text-muted-foreground">
                    Selected: {file.name} ({formatFileSize(file.size)})
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="folder">Folder</Label>
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <input
                      type="radio"
                      id="existing-folder"
                      checked={!isCustomFolder}
                      onChange={() => setIsCustomFolder(false)}
                      className="rounded"
                    />
                    <label htmlFor="existing-folder" className="text-sm cursor-pointer">
                      Use existing folder
                    </label>
                    <input
                      type="radio"
                      id="new-folder"
                      checked={isCustomFolder}
                      onChange={() => setIsCustomFolder(true)}
                      className="rounded ml-4"
                    />
                    <label htmlFor="new-folder" className="text-sm cursor-pointer">
                      Create new folder
                    </label>
                  </div>

                  {isCustomFolder ? (
                    <Input
                      id="custom-folder"
                      placeholder="Enter folder name..."
                      value={customFolder}
                      onChange={(e) => setCustomFolder(e.target.value)}
                    />
                  ) : (
                    <Select value={folder} onValueChange={setFolder}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="General">General</SelectItem>
                        {folders.map((f) => (
                          <SelectItem key={f} value={f}>
                            {f}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  placeholder="Optional description..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={3}
                />
              </div>
            </div>

            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => setUploadDialogOpen(false)}
              >
                Cancel
              </Button>
              <Button onClick={handleUpload} disabled={!file || uploading}>
                {uploading ? 'Uploading...' : 'Upload'}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {loading ? (
        <Card>
          <CardContent className="p-6">
            <p className="text-center text-muted-foreground">Loading documents...</p>
          </CardContent>
        </Card>
      ) : documents.length === 0 ? (
        <Card>
          <CardContent className="p-6">
            <div className="text-center space-y-2">
              <FileText className="h-12 w-12 mx-auto text-muted-foreground" />
              <p className="text-muted-foreground">No documents yet</p>
              <p className="text-sm text-muted-foreground">
                Upload your first document to get started
              </p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {documents.map((doc) => (
            <Card key={doc.id}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-3">
                    <FileText className="h-5 w-5 mt-1 text-muted-foreground" />
                    <div>
                      <CardTitle className="text-lg">{doc.name}</CardTitle>
                      <CardDescription className="mt-1">
                        {doc.description || 'No description'}
                      </CardDescription>
                      <div className="flex gap-4 mt-2 text-sm text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <FolderOpen className="h-3 w-3" />
                          {doc.folder}
                        </span>
                        <span>{formatFileSize(doc.file_size)}</span>
                        <span>{formatDate(doc.uploaded_at)}</span>
                      </div>
                      {doc.shared_with.includes('public') ? (
                        <div className="mt-2 space-y-1">
                          <p className="text-sm text-blue-600 dark:text-blue-400 font-medium">
                            🌐 Public - Accessible to everyone
                          </p>
                          <div className="flex items-center gap-2">
                            <input
                              type="text"
                              readOnly
                              value={doc.file_url}
                              className="text-xs bg-muted px-2 py-1 rounded flex-1 font-mono"
                            />
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                navigator.clipboard.writeText(doc.file_url);
                                toast({
                                  title: 'Copied!',
                                  description: 'Public link copied to clipboard',
                                });
                              }}
                            >
                              Copy Link
                            </Button>
                          </div>
                        </div>
                      ) : doc.shared_with.length > 0 ? (
                        <p className="text-sm text-muted-foreground mt-1">
                          👥 Shared with {doc.shared_with.length} user(s)
                        </p>
                      ) : (
                        <p className="text-sm text-muted-foreground mt-1">
                          🔒 Private
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDownload(doc)}
                    >
                      <Download className="h-4 w-4" />
                    </Button>

                    {doc.uploaded_by === user?.id && (
                      <>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => {
                            setSelectedDoc(doc);
                            setSelectedUsers(doc.shared_with);
                            setShareDialogOpen(true);
                          }}
                        >
                          <Share2 className="h-4 w-4" />
                        </Button>

                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDelete(doc)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </>
                    )}
                  </div>
                </div>
              </CardHeader>
            </Card>
          ))}
        </div>
      )}

      {/* Share Dialog */}
      <Dialog open={shareDialogOpen} onOpenChange={setShareDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Share Document</DialogTitle>
            <DialogDescription>
              Choose how to share this document
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {/* Quick Share Options */}
            <div className="space-y-2">
              <Label>Quick Share</Label>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    const allUserIds = users.filter((u) => u.id !== user?.id).map((u) => u.id);
                    setSelectedUsers(allUserIds);
                  }}
                >
                  Share with All Internal Users
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setSelectedUsers(['public']);
                  }}
                >
                  Make Public
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setSelectedUsers([]);
                  }}
                >
                  Clear
                </Button>
              </div>
            </div>

            {/* Public sharing indicator */}
            {selectedUsers.includes('public') && (
              <div className="p-3 bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-md">
                <p className="text-sm text-blue-900 dark:text-blue-100">
                  ✓ This document will be accessible to everyone (public)
                </p>
              </div>
            )}

            {/* Individual Users */}
            {!selectedUsers.includes('public') && (
              <>
                <div className="space-y-2">
                  <Label>Select Individual Users</Label>
                  <div className="space-y-2 max-h-[250px] overflow-y-auto border rounded-md p-2">
                    {users
                      .filter((u) => u.id !== user?.id)
                      .map((u) => (
                        <div key={u.id} className="flex items-center gap-2 p-1 hover:bg-accent rounded">
                          <input
                            type="checkbox"
                            id={u.id}
                            checked={selectedUsers.includes(u.id)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setSelectedUsers([...selectedUsers, u.id]);
                              } else {
                                setSelectedUsers(selectedUsers.filter((id) => id !== u.id));
                              }
                            }}
                            className="rounded border-gray-300"
                          />
                          <label htmlFor={u.id} className="text-sm cursor-pointer flex-1">
                            {u.full_name || u.email}
                          </label>
                        </div>
                      ))}
                  </div>
                  {selectedUsers.length > 0 && !selectedUsers.includes('public') && (
                    <p className="text-sm text-muted-foreground">
                      Selected: {selectedUsers.length} user(s)
                    </p>
                  )}
                </div>
              </>
            )}
          </div>

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setShareDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleShare}>
              {selectedUsers.includes('public') ? 'Make Public' : 'Share with Selected Users'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
