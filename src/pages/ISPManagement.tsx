import { useState, useEffect } from "react";
import { useFeatureFlags } from '@/hooks/useFeatureFlags';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Wifi, Plus, Edit, Calendar, DollarSign, CheckCircle2, AlertCircle } from "lucide-react";

type ISPProvider = {
  id: string;
  provider_name: string;
  city: string;
  area: string;
  contact_person: string;
  contact_email: string;
  contact_phone: string;
  service_type: string;
  status: 'Active' | 'Inactive';
  created_at: string;
};

type ISPConnection = {
  id: string;
  isp_id: string;
  isp_name: string;
  store_code: string;
  store_name: string;
  circuit_id: string;
  link_type: string;
  bandwidth: string;
  monthly_cost: number;
  provisioned_date?: string;
  status: 'Active' | 'Inactive' | 'Pending';
  billing_cycle: string;
  created_at: string;
};

type ISPTask = {
  id: string;
  isp_id: string;
  isp_name: string;
  store_code: string;
  task_type: 'Installation' | 'Maintenance' | 'Upgrade' | 'Renewal';
  scheduled_date: string;
  status: 'Pending' | 'In Progress' | 'Completed';
  notes?: string;
};

const serviceTypes = ['Broadband', 'Leased Line', 'MPLS', 'SD-WAN', 'Fiber', 'Wireless'];
const linkTypes = ['Primary', 'Backup', 'Load Balance'];
const billingCycles = ['Monthly', 'Quarterly', 'Yearly'];

export default function ISPManagement() {
  const { has, loading } = useFeatureFlags();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [providers, setProviders] = useState<ISPProvider[]>([]);
  const [connections, setConnections] = useState<ISPConnection[]>([]);
  const [tasks, setTasks] = useState<ISPTask[]>([]);
  const [loadingData, setLoadingData] = useState(true);
  const [providerDialogOpen, setProviderDialogOpen] = useState(false);
  const [connectionDialogOpen, setConnectionDialogOpen] = useState(false);

  // Form states
  const [providerForm, setProviderForm] = useState({
    provider_name: '',
    city: '',
    area: '',
    contact_person: '',
    contact_email: '',
    contact_phone: '',
    service_type: 'Broadband',
    status: 'Active' as 'Active' | 'Inactive'
  });

  const [connectionForm, setConnectionForm] = useState({
    isp_id: '',
    store_code: '',
    store_name: '',
    circuit_id: '',
    link_type: 'Primary',
    bandwidth: '',
    monthly_cost: '',
    provisioned_date: '',
    status: 'Active' as 'Active' | 'Inactive' | 'Pending',
    billing_cycle: 'Monthly'
  });

  useEffect(() => {
    if (!loading && !has('ISP Management')) {
      navigate('/');
    }
  }, [loading, has, navigate]);

  useEffect(() => {
    loadProviders();
    loadConnections();
    loadTasks();
  }, []);

  const loadProviders = async () => {
    try {
      setLoadingData(true);
      const { data, error } = await supabase
        .from('isp_providers')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setProviders(data || []);
    } catch (e) {
      console.error('loadProviders error', e);
    } finally {
      setLoadingData(false);
    }
  };

  const loadConnections = async () => {
    try {
      const { data, error } = await supabase
        .from('isp_connections')
        .select(`
          *,
          isp_providers(provider_name)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      const formattedConnections = (data || []).map((c: any) => ({
        ...c,
        isp_name: c.isp_providers?.provider_name || '-'
      }));
      
      setConnections(formattedConnections);
    } catch (e) {
      console.error('loadConnections error', e);
    }
  };

  const loadTasks = async () => {
    try {
      const { data, error } = await supabase
        .from('isp_tasks')
        .select(`
          *,
          isp_providers(provider_name)
        `)
        .order('scheduled_date', { ascending: false });

      if (error) throw error;
      
      const formattedTasks = (data || []).map((t: any) => ({
        ...t,
        isp_name: t.isp_providers?.provider_name || '-'
      }));
      
      setTasks(formattedTasks);
    } catch (e) {
      console.error('loadTasks error', e);
    }
  };

  const handleAddProvider = async () => {
    try {
      const { error } = await supabase
        .from('isp_providers')
        .insert([providerForm]);

      if (error) throw error;

      toast({
        title: "ISP Provider Added",
        description: "ISP provider has been registered successfully.",
      });

      setProviderDialogOpen(false);
      setProviderForm({
        provider_name: '',
        city: '',
        area: '',
        contact_person: '',
        contact_email: '',
        contact_phone: '',
        service_type: 'Broadband',
        status: 'Active'
      });
      loadProviders();
    } catch (e) {
      console.error('handleAddProvider error', e);
      toast({
        title: "Error",
        description: "Failed to add ISP provider. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleAddConnection = async () => {
    try {
      const { error } = await supabase
        .from('isp_connections')
        .insert([{
          ...connectionForm,
          monthly_cost: parseFloat(connectionForm.monthly_cost),
          provisioned_date: connectionForm.provisioned_date || null
        }]);

      if (error) throw error;

      toast({
        title: "Connection Added",
        description: "ISP connection has been registered successfully.",
      });

      setConnectionDialogOpen(false);
      setConnectionForm({
        isp_id: '',
        store_code: '',
        store_name: '',
        circuit_id: '',
        link_type: 'Primary',
        bandwidth: '',
        monthly_cost: '',
        provisioned_date: '',
        status: 'Active',
        billing_cycle: 'Monthly'
      });
      loadConnections();
    } catch (e) {
      console.error('handleAddConnection error', e);
      toast({
        title: "Error",
        description: "Failed to add connection. Please try again.",
        variant: "destructive",
      });
    }
  };

  if (!loading && !has('ISP Management')) {
    return (
      <div className="p-6">
        <Card>
          <CardHeader>
            <CardTitle>Access Restricted</CardTitle>
            <CardDescription>The ISP Management feature is disabled for your account.</CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  const stats = {
    totalProviders: providers.length,
    activeProviders: providers.filter(p => p.status === 'Active').length,
    totalConnections: connections.length,
    activeConnections: connections.filter(c => c.status === 'Active').length,
    monthlySpend: connections
      .filter(c => c.status === 'Active')
      .reduce((sum, c) => sum + c.monthly_cost, 0),
    pendingTasks: tasks.filter(t => t.status === 'Pending').length,
  };

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-2">ISP Management</h1>
        <p className="text-muted-foreground">Manage ISP providers, connections, and subscriptions</p>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-6 mb-6">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">ISP Providers</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalProviders}</div>
            <p className="text-xs text-muted-foreground">{stats.activeProviders} active</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Connections</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalConnections}</div>
            <p className="text-xs text-muted-foreground">{stats.activeConnections} active</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Monthly Spend</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">₹{stats.monthlySpend.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">Active connections</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Pending Tasks</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">{stats.pendingTasks}</div>
            <p className="text-xs text-muted-foreground">To be completed</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Avg Cost/Site</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ₹{stats.activeConnections > 0 ? Math.round(stats.monthlySpend / stats.activeConnections).toLocaleString() : 0}
            </div>
            <p className="text-xs text-muted-foreground">Per month</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Sites</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{new Set(connections.map(c => c.store_code)).size}</div>
            <p className="text-xs text-muted-foreground">With ISP</p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="providers" className="w-full">
        <TabsList className="mb-6">
          <TabsTrigger value="providers">ISP Providers</TabsTrigger>
          <TabsTrigger value="connections">Store Connections</TabsTrigger>
          <TabsTrigger value="overview">Subscription Overview</TabsTrigger>
          <TabsTrigger value="tasks">Tasks</TabsTrigger>
        </TabsList>

        {/* Providers Tab */}
        <TabsContent value="providers">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Registered ISP Providers</CardTitle>
                  <CardDescription>Manage ISP provider registrations by city and area</CardDescription>
                </div>
                <Dialog open={providerDialogOpen} onOpenChange={setProviderDialogOpen}>
                  <DialogTrigger asChild>
                    <Button className="gap-2">
                      <Plus className="h-4 w-4" />
                      Add ISP Provider
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-2xl">
                    <DialogHeader>
                      <DialogTitle>Register ISP Provider</DialogTitle>
                      <DialogDescription>Add ISP provider details</DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label>Provider Name</Label>
                          <Input
                            value={providerForm.provider_name}
                            onChange={(e) => setProviderForm({ ...providerForm, provider_name: e.target.value })}
                            placeholder="Airtel, Jio, BSNL..."
                          />
                        </div>
                        <div>
                          <Label>Service Type</Label>
                          <Select
                            value={providerForm.service_type}
                            onValueChange={(value) => setProviderForm({ ...providerForm, service_type: value })}
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {serviceTypes.map(type => (
                                <SelectItem key={type} value={type}>{type}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label>City</Label>
                          <Input
                            value={providerForm.city}
                            onChange={(e) => setProviderForm({ ...providerForm, city: e.target.value })}
                            placeholder="Bangalore"
                          />
                        </div>
                        <div>
                          <Label>Area</Label>
                          <Input
                            value={providerForm.area}
                            onChange={(e) => setProviderForm({ ...providerForm, area: e.target.value })}
                            placeholder="Koramangala, Whitefield..."
                          />
                        </div>
                      </div>
                      <div>
                        <Label>Contact Person</Label>
                        <Input
                          value={providerForm.contact_person}
                          onChange={(e) => setProviderForm({ ...providerForm, contact_person: e.target.value })}
                          placeholder="Account manager name"
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label>Contact Email</Label>
                          <Input
                            type="email"
                            value={providerForm.contact_email}
                            onChange={(e) => setProviderForm({ ...providerForm, contact_email: e.target.value })}
                            placeholder="contact@isp.com"
                          />
                        </div>
                        <div>
                          <Label>Contact Phone</Label>
                          <Input
                            value={providerForm.contact_phone}
                            onChange={(e) => setProviderForm({ ...providerForm, contact_phone: e.target.value })}
                            placeholder="+91 9876543210"
                          />
                        </div>
                      </div>
                      <div>
                        <Label>Status</Label>
                        <Select
                          value={providerForm.status}
                          onValueChange={(value: 'Active' | 'Inactive') => setProviderForm({ ...providerForm, status: value })}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="Active">Active</SelectItem>
                            <SelectItem value="Inactive">Inactive</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <DialogFooter>
                      <Button variant="outline" onClick={() => setProviderDialogOpen(false)}>Cancel</Button>
                      <Button onClick={handleAddProvider}>Add Provider</Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </div>
            </CardHeader>
            <CardContent>
              {loadingData ? (
                <div className="text-center py-8">Loading providers...</div>
              ) : providers.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">No ISP providers registered yet.</div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Provider Name</TableHead>
                      <TableHead>Service Type</TableHead>
                      <TableHead>City</TableHead>
                      <TableHead>Area</TableHead>
                      <TableHead>Contact</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {providers.map((provider) => (
                      <TableRow key={provider.id}>
                        <TableCell className="font-medium">{provider.provider_name}</TableCell>
                        <TableCell>
                          <Badge variant="secondary">{provider.service_type}</Badge>
                        </TableCell>
                        <TableCell>
                          <span className="font-medium text-blue-600">{provider.city}</span>
                        </TableCell>
                        <TableCell>{provider.area}</TableCell>
                        <TableCell>
                          <div className="text-sm">
                            <div>{provider.contact_person}</div>
                            <div className="text-muted-foreground">{provider.contact_phone}</div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant={provider.status === 'Active' ? 'default' : 'secondary'}>
                            {provider.status}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Button size="sm" variant="outline">
                            <Edit className="h-3 w-3 mr-1" />
                            Edit
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Connections Tab */}
        <TabsContent value="connections">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Store ISP Connections</CardTitle>
                  <CardDescription>Manage circuit IDs, links, and monthly subscriptions</CardDescription>
                </div>
                <Dialog open={connectionDialogOpen} onOpenChange={setConnectionDialogOpen}>
                  <DialogTrigger asChild>
                    <Button className="gap-2">
                      <Plus className="h-4 w-4" />
                      Add Connection
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-2xl">
                    <DialogHeader>
                      <DialogTitle>Add ISP Connection</DialogTitle>
                      <DialogDescription>Register new ISP connection for a store</DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label>ISP Provider</Label>
                          <Select
                            value={connectionForm.isp_id}
                            onValueChange={(value) => setConnectionForm({ ...connectionForm, isp_id: value })}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Select provider" />
                            </SelectTrigger>
                            <SelectContent>
                              {providers.filter(p => p.status === 'Active').map(provider => (
                                <SelectItem key={provider.id} value={provider.id}>
                                  {provider.provider_name} - {provider.city}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div>
                          <Label>Store Code</Label>
                          <Input
                            value={connectionForm.store_code}
                            onChange={(e) => setConnectionForm({ ...connectionForm, store_code: e.target.value })}
                            placeholder="STR001"
                          />
                        </div>
                      </div>
                      <div>
                        <Label>Store Name</Label>
                        <Input
                          value={connectionForm.store_name}
                          onChange={(e) => setConnectionForm({ ...connectionForm, store_name: e.target.value })}
                          placeholder="Store name"
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label>Circuit ID</Label>
                          <Input
                            value={connectionForm.circuit_id}
                            onChange={(e) => setConnectionForm({ ...connectionForm, circuit_id: e.target.value })}
                            placeholder="CIR123456"
                          />
                        </div>
                        <div>
                          <Label>Link Type</Label>
                          <Select
                            value={connectionForm.link_type}
                            onValueChange={(value) => setConnectionForm({ ...connectionForm, link_type: value })}
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {linkTypes.map(type => (
                                <SelectItem key={type} value={type}>{type}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label>Bandwidth</Label>
                          <Input
                            value={connectionForm.bandwidth}
                            onChange={(e) => setConnectionForm({ ...connectionForm, bandwidth: e.target.value })}
                            placeholder="100 Mbps"
                          />
                        </div>
                        <div>
                          <Label>Monthly Cost (₹)</Label>
                          <Input
                            type="number"
                            value={connectionForm.monthly_cost}
                            onChange={(e) => setConnectionForm({ ...connectionForm, monthly_cost: e.target.value })}
                            placeholder="5000"
                          />
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label>Provisioned Date</Label>
                          <Input
                            type="date"
                            value={connectionForm.provisioned_date}
                            onChange={(e) => setConnectionForm({ ...connectionForm, provisioned_date: e.target.value })}
                          />
                        </div>
                        <div>
                          <Label>Billing Cycle</Label>
                          <Select
                            value={connectionForm.billing_cycle}
                            onValueChange={(value) => setConnectionForm({ ...connectionForm, billing_cycle: value })}
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {billingCycles.map(cycle => (
                                <SelectItem key={cycle} value={cycle}>{cycle}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                      <div>
                        <Label>Status</Label>
                        <Select
                          value={connectionForm.status}
                          onValueChange={(value: 'Active' | 'Inactive' | 'Pending') => setConnectionForm({ ...connectionForm, status: value })}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="Active">Active</SelectItem>
                            <SelectItem value="Pending">Pending</SelectItem>
                            <SelectItem value="Inactive">Inactive</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <DialogFooter>
                      <Button variant="outline" onClick={() => setConnectionDialogOpen(false)}>Cancel</Button>
                      <Button onClick={handleAddConnection}>Add Connection</Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </div>
            </CardHeader>
            <CardContent>
              {connections.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">No connections registered yet.</div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Store</TableHead>
                      <TableHead>ISP Provider</TableHead>
                      <TableHead>Circuit ID</TableHead>
                      <TableHead>Link Type</TableHead>
                      <TableHead>Bandwidth</TableHead>
                      <TableHead>Monthly Cost</TableHead>
                      <TableHead>Provisioned</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {connections.map((conn) => (
                      <TableRow key={conn.id}>
                        <TableCell>
                          <div>
                            <div className="font-medium">{conn.store_name}</div>
                            <div className="text-sm text-muted-foreground">{conn.store_code}</div>
                          </div>
                        </TableCell>
                        <TableCell>{conn.isp_name}</TableCell>
                        <TableCell>
                          <code className="text-xs bg-gray-100 px-2 py-1 rounded">{conn.circuit_id}</code>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">{conn.link_type}</Badge>
                        </TableCell>
                        <TableCell>{conn.bandwidth}</TableCell>
                        <TableCell>
                          <span className="font-mono">₹{conn.monthly_cost.toLocaleString()}</span>
                          <div className="text-xs text-muted-foreground">{conn.billing_cycle}</div>
                        </TableCell>
                        <TableCell>
                          {conn.provisioned_date ? new Date(conn.provisioned_date).toLocaleDateString() : '-'}
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant={
                              conn.status === 'Active' ? 'default' :
                              conn.status === 'Pending' ? 'secondary' : 'outline'
                            }
                          >
                            {conn.status}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Overview Tab */}
        <TabsContent value="overview">
          <Card>
            <CardHeader>
              <CardTitle>Store-wise ISP Subscription Overview</CardTitle>
              <CardDescription>Monthly subscription costs and provisioned dates by store</CardDescription>
            </CardHeader>
            <CardContent>
              {connections.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">No data available.</div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Store Code</TableHead>
                      <TableHead>Store Name</TableHead>
                      <TableHead>ISP Provider</TableHead>
                      <TableHead>Link Type</TableHead>
                      <TableHead>Bandwidth</TableHead>
                      <TableHead>Provisioned Date</TableHead>
                      <TableHead>Monthly Cost</TableHead>
                      <TableHead>Billing Cycle</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {connections
                      .sort((a, b) => a.store_code.localeCompare(b.store_code))
                      .map((conn) => (
                        <TableRow key={conn.id}>
                          <TableCell className="font-medium">{conn.store_code}</TableCell>
                          <TableCell>{conn.store_name}</TableCell>
                          <TableCell>{conn.isp_name}</TableCell>
                          <TableCell>
                            <Badge variant="outline">{conn.link_type}</Badge>
                          </TableCell>
                          <TableCell>{conn.bandwidth}</TableCell>
                          <TableCell>
                            {conn.provisioned_date ? (
                              <div className="flex items-center gap-1">
                                <Calendar className="h-3 w-3 text-muted-foreground" />
                                {new Date(conn.provisioned_date).toLocaleDateString()}
                              </div>
                            ) : (
                              <span className="text-muted-foreground">Not provisioned</span>
                            )}
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1">
                              <DollarSign className="h-3 w-3 text-green-600" />
                              <span className="font-mono font-medium">₹{conn.monthly_cost.toLocaleString()}</span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant="secondary">{conn.billing_cycle}</Badge>
                          </TableCell>
                          <TableCell>
                            {conn.status === 'Active' ? (
                              <Badge className="bg-green-100 text-green-800">
                                <CheckCircle2 className="h-3 w-3 mr-1" />
                                Active
                              </Badge>
                            ) : conn.status === 'Pending' ? (
                              <Badge variant="secondary">
                                <AlertCircle className="h-3 w-3 mr-1" />
                                Pending
                              </Badge>
                            ) : (
                              <Badge variant="outline">Inactive</Badge>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tasks Tab */}
        <TabsContent value="tasks">
          <Card>
            <CardHeader>
              <CardTitle>ISP Tasks</CardTitle>
              <CardDescription>Installation, maintenance, and renewal tasks</CardDescription>
            </CardHeader>
            <CardContent>
              {tasks.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">No tasks scheduled.</div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>ISP Provider</TableHead>
                      <TableHead>Store Code</TableHead>
                      <TableHead>Task Type</TableHead>
                      <TableHead>Scheduled Date</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Notes</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {tasks.map((task) => (
                      <TableRow key={task.id}>
                        <TableCell className="font-medium">{task.isp_name}</TableCell>
                        <TableCell>{task.store_code}</TableCell>
                        <TableCell>
                          <Badge variant="secondary">{task.task_type}</Badge>
                        </TableCell>
                        <TableCell>{new Date(task.scheduled_date).toLocaleDateString()}</TableCell>
                        <TableCell>
                          <Badge
                            variant={
                              task.status === 'Completed' ? 'default' :
                              task.status === 'In Progress' ? 'secondary' : 'outline'
                            }
                          >
                            {task.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="max-w-xs truncate">{task.notes || '-'}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
