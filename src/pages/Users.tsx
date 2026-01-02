import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { User, Users as UsersIcon, Pencil, Trash2, ArrowLeft } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { FeatureManagement } from "@/components/FeatureManagement";
import { getUserFeatureFlags } from "@/integrations/supabase/features";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface UserProfile {
  id: string;
  email: string;
  full_name: string | null;
  enabled: boolean;
  department: string | null;
  roles: string[];
}

export default function Users() {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [editUser, setEditUser] = useState<UserProfile | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [userToDelete, setUserToDelete] = useState<UserProfile | null>(null);
  const { toast } = useToast();
  const { user: currentUser } = useAuth();
  const navigate = useNavigate();

  // Form state
  const [email, setEmail] = useState("");
  const [fullName, setFullName] = useState("");
  const [department, setDepartment] = useState("");
  const [enabled, setEnabled] = useState(true);
  
  // Define internal and external roles
  const internalRoles = ["admin", "manager", "user"] as const;
  const externalRoles = ["vendor", "customer", "isp-vendor"] as const;
  type InternalRole = typeof internalRoles[number];
  type ExternalRole = typeof externalRoles[number];
  type SelectedRole = InternalRole | ExternalRole;
  
  const [selectedRoles, setSelectedRoles] = useState<SelectedRole[]>(["user"]);
  const [activeTab, setActiveTab] = useState<"internal" | "external">("internal");
  const [selectedRoleFilter, setSelectedRoleFilter] = useState<string | null>(null);

  useEffect(() => {
    loadUsers();
  }, []);

  async function loadUsers() {
    try {
      // Directly query profiles table - all authenticated users can see all profiles
      console.log('[Users] Querying profiles table...');
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('*');
      
      console.log('[Users] Profiles fetched:', profiles?.length ?? 0, 'Error:', profilesError);
      if (profilesError) throw profilesError;

      const { data: roles, error: rolesError } = await supabase
        .from('user_roles')
        .select('user_id, role');
      if (rolesError) throw rolesError;

      console.log('[Users] Roles fetched:', roles?.length ?? 0);
      console.log('[Users] Profiles:', profiles);

      const usersWithRoles: UserProfile[] = (profiles || []).map((profile: any) => ({
        id: profile.id,
        email: profile.email,
        full_name: profile.full_name ?? null,
        enabled: profile.enabled ?? true,
        department: profile.department ?? null,
        roles: (roles || [])
          .filter((r: any) => r.user_id === profile.id)
          .map((r: any) => r.role as SelectedRole),
      }));
      console.log('[Users] Final usersWithRoles array:', usersWithRoles);
      setUsers(usersWithRoles);
    } catch (error: any) {
      console.error('Error loading users:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to load users',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }

  async function handleAddUser(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);

    try {
      // 1. Create auth user
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password: Math.random().toString(36).slice(-12), // Random password
        options: {
          data: {
            full_name: fullName,
          },
        }
      });

      if (authError) throw authError;

      // 2. Update profile
      const { error: profileError } = await supabase
        .from('profiles')
        .update({
          full_name: fullName,
          department,
          enabled,
        })
        .eq('id', authData.user!.id);

      if (profileError) throw profileError;

      // 3. Assign roles (one row per role)
      if (selectedRoles.length > 0) {
        const { error: roleError } = await supabase
          .from('user_roles')
          .insert(selectedRoles.map((role) => ({ user_id: authData.user!.id, role })));
        if (roleError) throw roleError;
      }

      toast({
        title: "Success",
        description: "User created successfully",
      });

      // Reset form and reload
      setAddDialogOpen(false);
      resetForm();
      loadUsers();
    } catch (error: any) {
      console.error('Error adding user:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to create user",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  }

  async function handleUpdateUser(e: React.FormEvent) {
    e.preventDefault();
    if (!editUser) return;
    setLoading(true);

    try {
      // Update profile
      const { error: profileError } = await supabase
        .from('profiles')
        .update({
          full_name: fullName,
          department,
          enabled,
        })
        .eq('id', editUser.id);

      if (profileError) throw profileError;

      // Replace roles with the selected set
      await supabase.from('user_roles').delete().eq('user_id', editUser.id);
      if (selectedRoles.length > 0) {
        const { error: roleError } = await supabase
          .from('user_roles')
          .insert(selectedRoles.map((role) => ({ user_id: editUser.id, role })));
        if (roleError) throw roleError;
      }

      toast({
        title: "Success",
        description: "User updated successfully",
      });

      setEditUser(null);
      resetForm();
      loadUsers();
    } catch (error: any) {
      console.error('Error updating user:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to update user",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  }

  function resetForm() {
    setEmail("");
    setFullName("");
    setDepartment("");
    setEnabled(true);
    setSelectedRoles(["user"]);
  }

  function handleEditClick(user: UserProfile) {
    setEditUser(user);
    setEmail(user.email);
    setFullName(user.full_name || "");
    setDepartment(user.department || "");
    setEnabled(user.enabled);
    setSelectedRoles((user.roles && user.roles.length ? user.roles : ["user"]) as SelectedRole[]);
  }

  function handleDeleteClick(user: UserProfile) {
    setUserToDelete(user);
    setDeleteDialogOpen(true);
  }

  async function confirmDelete() {
    if (!userToDelete) return;
    
    try {
      setLoading(true);
      
      // Delete user roles first (due to foreign key)
      const { error: rolesError } = await supabase
        .from('user_roles')
        .delete()
        .eq('user_id', userToDelete.id);
      
      if (rolesError) throw rolesError;
      
      // Delete from profiles
      const { error: profileError } = await supabase
        .from('profiles')
        .delete()
        .eq('id', userToDelete.id);
      
      if (profileError) throw profileError;
      
      // Note: Deleting from auth.users requires admin API or service role
      // This may need to be done via Edge Function or RPC
      
      toast({
        title: "Success",
        description: `User ${userToDelete.email} has been deleted`,
      });
      
      setDeleteDialogOpen(false);
      setUserToDelete(null);
      await loadUsers();
    } catch (error: any) {
      console.error('Error deleting user:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to delete user",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }

  // Access + feature flag gate
  useEffect(() => {
    async function gate() {
      if (!currentUser) return;
      const { data: roles } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', currentUser.id);
      const hasAccess = roles?.some(r => ['admin', 'manager'].includes(r.role)) || false;
      if (!hasAccess) {
        toast({ title: 'Access Denied', description: 'You need admin or manager permissions to view this page', variant: 'destructive' });
        navigate('/');
        return;
      }
      try {
        const flags = await getUserFeatureFlags(currentUser.id);
        if (flags['Users'] === false) {
          toast({ title: 'Feature Disabled', description: 'Users page is disabled for your account.' });
          navigate('/');
        }
      } catch (e: any) {
        // Silent fail: if flags fetch fails we still allow access based on role
        console.warn('Feature flag fetch failed', e?.message);
      }
    }
    gate();
  }, [currentUser, navigate, toast]);

  // Helper function to get users for a specific role
  const getUsersByRole = (role: string): UserProfile[] => {
    return users.filter((user) => user.roles.includes(role as any));
  };

  // Get all unique roles present in the system
  const allRoles = Array.from(new Set(users.flatMap((u) => u.roles)));

  // Count users by role
  const roleStats = allRoles.map((role) => ({
    role,
    count: getUsersByRole(role).length,
    isInternal: internalRoles.includes(role as InternalRole),
  }));

  // Separate internal and external roles
  const internalRoleStats = roleStats.filter((r) => r.isInternal);
  const externalRoleStats = roleStats.filter((r) => !r.isInternal);

  return (
    <div className="flex flex-col gap-6 p-6">
      <div className="flex items-center justify-between">
        <div className="flex flex-col gap-2">
          <h1 className="text-3xl font-bold">Users</h1>
          <p className="text-muted-foreground">Manage user accounts and permissions</p>
        </div>
        <Button
          onClick={() => setAddDialogOpen(true)}
          className="bg-gradient-primary"
        >
          <UsersIcon className="mr-2 h-4 w-4" />
          Add User
        </Button>
      </div>

      {/* Feature Management Section */}
      <FeatureManagement />

      {/* Role-wise Dashboard - Show when no role is selected */}
      {!selectedRoleFilter && (
        <div className="space-y-6">
          {/* Internal Roles Dashboard */}
          {internalRoleStats.length > 0 && (
            <div className="space-y-4">
              <div>
                <h2 className="text-2xl font-bold">Internal Users</h2>
                <p className="text-muted-foreground text-sm">Manage internal staff by role</p>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {internalRoleStats.map(({ role, count }) => (
                  <Card
                    key={role}
                    className="cursor-pointer hover:shadow-lg transition-shadow"
                    onClick={() => setSelectedRoleFilter(role)}
                  >
                    <CardHeader className="pb-3">
                      <CardTitle className="capitalize">{role}</CardTitle>
                      <CardDescription>Click to view users</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="text-3xl font-bold">{count}</div>
                      <p className="text-sm text-muted-foreground">user{count !== 1 ? 's' : ''}</p>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {/* External Roles Dashboard */}
          {externalRoleStats.length > 0 && (
            <div className="space-y-4">
              <div>
                <h2 className="text-2xl font-bold">External Users</h2>
                <p className="text-muted-foreground text-sm">Manage external users by role</p>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {externalRoleStats.map(({ role, count }) => (
                  <Card
                    key={role}
                    className="cursor-pointer hover:shadow-lg transition-shadow"
                    onClick={() => setSelectedRoleFilter(role)}
                  >
                    <CardHeader className="pb-3">
                      <CardTitle className="capitalize">{role.replace('-', ' ')}</CardTitle>
                      <CardDescription>Click to view users</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="text-3xl font-bold">{count}</div>
                      <p className="text-sm text-muted-foreground">user{count !== 1 ? 's' : ''}</p>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* User List - Show when a role is selected */}
      {selectedRoleFilter && (
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setSelectedRoleFilter(null)}
              className="gap-1"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to Dashboard
            </Button>
          </div>
          <Card>
            <CardHeader>
              <CardTitle className="capitalize">
                {selectedRoleFilter} Users
              </CardTitle>
              <CardDescription>
                Manage {getUsersByRole(selectedRoleFilter).length} user(s) with the {selectedRoleFilter} role
              </CardDescription>
            </CardHeader>
            <CardContent>
              {getUsersByRole(selectedRoleFilter).length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>User</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Department</TableHead>
                      <TableHead>Roles</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {getUsersByRole(selectedRoleFilter).map((user) => (
                      <TableRow key={user.id}>
                        <TableCell className="font-medium">
                          <div className="flex items-center gap-2">
                            <User className="h-4 w-4 text-muted-foreground" />
                            {user.full_name || "Unnamed"}
                          </div>
                        </TableCell>
                        <TableCell>{user.email}</TableCell>
                        <TableCell>{user.department || "-"}</TableCell>
                        <TableCell>
                          {user.roles.map((role) => (
                            <Badge key={role} variant="secondary" className="mr-1">
                              {role}
                            </Badge>
                          ))}
                        </TableCell>
                        <TableCell>
                          <Badge variant={user.enabled ? "default" : "destructive"}>
                            {user.enabled ? "Active" : "Disabled"}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleEditClick(user)}
                              className="h-8 w-8 p-0"
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDeleteClick(user)}
                              className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <p className="text-muted-foreground text-center py-8">No users found with this role</p>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as "internal" | "external")} className="w-full">
        <TabsList className="w-full justify-start">
          <TabsTrigger value="internal">Internal Users</TabsTrigger>
          <TabsTrigger value="external">External Users</TabsTrigger>
        </TabsList>

        <TabsContent value="internal"></TabsContent>
        <TabsContent value="external"></TabsContent>
      </Tabs>

      <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add New User</DialogTitle>
            <DialogDescription>
              Create a new user account. They will receive an email to set their password.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleAddUser} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="fullName">Full Name</Label>
              <Input
                id="fullName"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="department">Department</Label>
              <Select value={department} onValueChange={setDepartment}>
                <SelectTrigger id="department">
                  <SelectValue placeholder="Select department" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="PMO">PMO</SelectItem>
                  <SelectItem value="Vendor">Vendor</SelectItem>
                  <SelectItem value="Operations">Operations</SelectItem>
                  <SelectItem value="Finance">Finance</SelectItem>
                  <SelectItem value="Management">Management</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Roles</Label>
              <div className="grid grid-cols-2 gap-2">
                {[...internalRoles, ...externalRoles].map((role) => (
                  <label key={role} className="flex items-center space-x-2">
                    <Checkbox
                      checked={selectedRoles.includes(role)}
                      onCheckedChange={(checked) => {
                        setSelectedRoles((prev) =>
                          checked
                            ? Array.from(new Set<SelectedRole>([...prev, role]))
                            : prev.filter((r) => r !== role)
                        );
                      }}
                    />
                    <span className="capitalize">{role.replace('-', ' ')}</span>
                  </label>
                ))}
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <Switch
                id="enabled"
                checked={enabled}
                onCheckedChange={setEnabled}
              />
              <Label htmlFor="enabled">Account Enabled</Label>
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setAddDialogOpen(false);
                  resetForm();
                }}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={loading}>
                {loading ? "Creating..." : "Create User"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={!!editUser} onOpenChange={(open) => !open && setEditUser(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit User</DialogTitle>
            <DialogDescription>
              Modify user account details and permissions.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleUpdateUser} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={email}
                disabled
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="fullName">Full Name</Label>
              <Input
                id="fullName"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="department">Department</Label>
              <Select value={department} onValueChange={setDepartment}>
                <SelectTrigger id="department">
                  <SelectValue placeholder="Select department" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="PMO">PMO</SelectItem>
                  <SelectItem value="Vendor">Vendor</SelectItem>
                  <SelectItem value="Operations">Operations</SelectItem>
                  <SelectItem value="Finance">Finance</SelectItem>
                  <SelectItem value="Management">Management</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Roles</Label>
              <div className="grid grid-cols-2 gap-2">
                {[...internalRoles, ...externalRoles].map((role) => (
                  <label key={role} className="flex items-center space-x-2">
                    <Checkbox
                      checked={selectedRoles.includes(role)}
                      onCheckedChange={(checked) => {
                        setSelectedRoles((prev) =>
                          checked
                            ? Array.from(new Set<SelectedRole>([...prev, role]))
                            : prev.filter((r) => r !== role)
                        );
                      }}
                    />
                    <span className="capitalize">{role.replace('-', ' ')}</span>
                  </label>
                ))}
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <Switch
                id="enabled"
                checked={enabled}
                onCheckedChange={setEnabled}
              />
              <Label htmlFor="enabled">Account Enabled</Label>
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setEditUser(null);
                  resetForm();
                }}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={loading}>
                {loading ? "Saving..." : "Save Changes"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the user account for{' '}
              <span className="font-semibold">{userToDelete?.email}</span> and remove all associated data.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setUserToDelete(null)}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction 
              onClick={confirmDelete} 
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete User
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}