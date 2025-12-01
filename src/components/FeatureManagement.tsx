import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { listFeatureCatalog, getUserFeatureFlags, upsertUserFeatureFlags } from "@/integrations/supabase/features";
import { Check, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";

export function FeatureManagement() {
  const [users, setUsers] = useState<{ id: string; email: string; full_name: string | null }[]>([]);
  const [selectedUserId, setSelectedUserId] = useState<string>("");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [catalog, setCatalog] = useState<string[]>([]);
  const [flags, setFlags] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(true);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    // Load users and feature catalog initially
    Promise.all([loadUsers(), loadCatalog()]).finally(() => setLoading(false));
  }, []);
  useEffect(() => {
    if (selectedUserId) {
      loadUserFlags(selectedUserId);
    }
  }, [selectedUserId]);

  useEffect(() => {
    if (selectedUserId && catalog.length) {
      loadUserFlags(selectedUserId);
    }
  }, [catalog]);

  async function loadUsers() {
    try {
      // Fetch users from profiles table only (includes all users after migration)
      const { data: profiles, error } = await supabase
        .from('profiles')
        .select('id, email, full_name')
        .order('email');

      if (error) throw error;
      setUsers(profiles || []);
      if (!selectedUserId && profiles && profiles.length) {
        setSelectedUserId(profiles[0].id);
      }
    } catch (error: any) {
      toast({ title: 'Error', description: error.message || 'Failed to load users', variant: 'destructive' });
    }
  }

  async function loadCatalog() {
    try {
      const items = await listFeatureCatalog();
      setCatalog(items);
    } catch (error: any) {
      toast({ title: 'Error', description: error.message || 'Failed to load features', variant: 'destructive' });
    }
  }

  async function loadUserFlags(userId: string) {
    try {
      const map = await getUserFeatureFlags(userId);
      // For any missing catalog items, default to true
      const next: Record<string, boolean> = {};
      for (const name of catalog) {
        next[name] = name in map ? map[name] : true;
      }
      setFlags(next);
    } catch (error: any) {
      toast({ title: 'Error', description: error.message || 'Failed to load user feature flags', variant: 'destructive' });
    }
  }

  async function toggleFeature(name: string) {
    try {
      const newFlags = { ...flags, [name]: !flags[name] };
      setFlags(newFlags);
      if (!selectedUserId) return;
      await upsertUserFeatureFlags(selectedUserId, { [name]: newFlags[name] });
    } catch (error: any) {
      toast({ title: 'Error', description: error.message || 'Failed to update feature', variant: 'destructive' });
    }
  }

  const getFeatureLabel = (name: string) => `${name} Tab`;

  const filteredUsers = users.filter((u) => {
    if (searchQuery.length < 2) return false;
    const query = searchQuery.toLowerCase();
    const name = (u.full_name || '').toLowerCase();
    const email = u.email.toLowerCase();
    return name.includes(query) || email.includes(query);
  });

  const selectedUser = users.find(u => u.id === selectedUserId);

  if (loading) {
    return <div>Loading...</div>;
  }

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <Card>
        <CollapsibleTrigger asChild>
          <CardHeader className="cursor-pointer hover:bg-accent/50 transition-colors">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Per-User Feature Management</CardTitle>
                <CardDescription>Assign tab visibility per user</CardDescription>
              </div>
              <ChevronDown 
                className={`h-5 w-5 transition-transform duration-200 ${isOpen ? 'transform rotate-180' : ''}`}
              />
            </div>
          </CardHeader>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <CardContent>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Search User</Label>
            <div className="relative">
              <Input
                placeholder="Type name or email (min 2 characters)..."
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setShowSuggestions(e.target.value.length >= 2);
                }}
                onFocus={() => setShowSuggestions(searchQuery.length >= 2)}
                className="w-full"
              />
              {showSuggestions && filteredUsers.length > 0 && (
                <div className="absolute z-50 w-full mt-1 bg-popover border rounded-md shadow-md max-h-60 overflow-y-auto">
                  {filteredUsers.map((u) => (
                    <button
                      key={u.id}
                      type="button"
                      className="w-full px-3 py-2 text-left hover:bg-accent flex items-start gap-2 border-b last:border-0"
                      onClick={() => {
                        setSelectedUserId(u.id);
                        setSearchQuery(u.full_name || u.email);
                        setShowSuggestions(false);
                      }}
                    >
                      <Check
                        className={cn(
                          "h-4 w-4 mt-1 shrink-0",
                          selectedUserId === u.id ? "opacity-100" : "opacity-0"
                        )}
                      />
                      <div className="flex flex-col flex-1">
                        <span className="font-medium text-sm">{u.full_name || u.email}</span>
                        {u.full_name && <span className="text-xs text-muted-foreground">{u.email}</span>}
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
            {selectedUser && (
              <div className="text-sm text-muted-foreground mt-2">
                Managing features for: <span className="font-medium text-foreground">{selectedUser.full_name || selectedUser.email}</span>
              </div>
            )}
          </div>

          <div className="space-y-3">
            {catalog.map((name) => (
              <div key={name} className="flex items-center justify-between space-x-2">
                <Label htmlFor={name} className="flex flex-col space-y-1">
                  <span>{getFeatureLabel(name)}</span>
                  <span className="text-sm text-muted-foreground">
                    {flags[name] ? "Visible" : "Hidden"}
                  </span>
                </Label>
                <Switch id={name} checked={!!flags[name]} onCheckedChange={() => toggleFeature(name)} />
              </div>
            ))}
          </div>
        </div>
          </CardContent>
        </CollapsibleContent>
      </Card>
    </Collapsible>
  );
}