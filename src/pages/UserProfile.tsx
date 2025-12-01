import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export default function UserProfile() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [profile, setProfile] = useState({
    email: "",
    full_name: "",
    phone: "",
    address: "",
    department: "",
    password: ""
  });
  const [roles, setRoles] = useState<string[]>([]);

  // Load user profile from Supabase
  useEffect(() => {
    async function fetchProfile() {
      try {
        setLoading(true);
        const { data: { user }, error: userError } = await supabase.auth.getUser();
        
        if (userError) {
          console.error('Error getting user:', userError);
          return;
        }
        
        if (!user) {
          console.log('No user found');
          return;
        }
        
        console.log('Loading profile for user:', user.id);
        
        const { data, error } = await supabase
          .from("profiles")
          .select("email, phone, address, department, full_name, enabled")
          .eq("id", user.id)
          .single();
        
        if (error) {
          console.error('Error loading profile:', error);
          toast({ 
            title: "Info", 
            description: "No profile found. You can create one by updating your information." 
          });
          // Set email from auth user
          setProfile((prev) => ({
            ...prev,
            email: user.email || ""
          }));
        } else if (data) {
          console.log('Profile loaded:', data);
          setProfile((prev) => ({
            ...prev,
            email: data.email || user.email || "",
            full_name: data.full_name || "",
            phone: data.phone || "",
            address: data.address || "",
            department: data.department || ""
          }));
        }

        // Load roles
        const { data: rolesData } = await supabase
          .from('user_roles')
          .select('role')
          .eq('user_id', user.id);
        setRoles((rolesData || []).map((r: any) => r.role));
      } catch (e) {
        console.error('Error in fetchProfile:', e);
      } finally {
        setLoading(false);
      }
    }
    fetchProfile();
  }, [toast]);

  const handleChange = (field: string, value: string) => {
    setProfile((prev) => ({ ...prev, [field]: value }));
  };

  const handleUpdate = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      
      // Update profile fields except password
      const { error } = await supabase
        .from("profiles")
        .update({
          email: profile.email,
          full_name: profile.full_name,
          phone: profile.phone,
          address: profile.address,
          department: profile.department
        })
        .eq("id", user.id);
      if (error) throw error;

      // Update auth email if changed
      if (profile.email && profile.email !== (user.email || "")) {
        const { error: emailErr } = await supabase.auth.updateUser({ email: profile.email });
        if (emailErr) {
          console.warn('Auth email update failed (may require verification):', emailErr);
        }
      }
      toast({ title: "Profile updated successfully" });
    } catch (e) {
      toast({ title: "Error", description: "Failed to update profile", variant: "destructive" });
    }
    setLoading(false);
  };

  const handlePasswordChange = async () => {
    setLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: profile.password });
      if (error) throw error;
      toast({ title: "Password updated" });
      setProfile((prev) => ({ ...prev, password: "" }));
    } catch (e) {
      toast({ title: "Error", description: "Failed to update password", variant: "destructive" });
    }
    setLoading(false);
  };

  return (
    <div className="max-w-xl mx-auto mt-10">
      <Card>
        <CardHeader>
          <CardTitle>User Profile</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <Label>Full Name</Label>
            <Input value={profile.full_name} onChange={e => handleChange("full_name", e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>Email</Label>
            <Input value={profile.email} onChange={e => handleChange("email", e.target.value)} type="email" />
          </div>
          <div className="space-y-2">
            <Label>Phone Number</Label>
            <Input value={profile.phone} onChange={e => handleChange("phone", e.target.value)} type="tel" />
          </div>
          <div className="space-y-2">
            <Label>Address</Label>
            <Input value={profile.address} onChange={e => handleChange("address", e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>Department</Label>
            <Select value={profile.department} onValueChange={(v) => handleChange("department", v)}>
              <SelectTrigger>
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
          {roles.length > 0 && (
            <div className="space-y-1 text-sm text-muted-foreground">
              <div><span className="font-medium text-foreground">Roles:</span> {roles.join(', ')}</div>
            </div>
          )}
          <Button onClick={handleUpdate} disabled={loading}>Update Profile</Button>
          <hr />
          <div className="space-y-2">
            <Label>Change Password</Label>
            <Input value={profile.password} onChange={e => handleChange("password", e.target.value)} type="password" />
            <Button onClick={handlePasswordChange} disabled={loading || !profile.password}>Update Password</Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
