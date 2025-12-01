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
import { Truck, CheckCircle2, Clock, DollarSign, Plus, Edit, Package, Trash2, Phone, Mail, MapPin } from "lucide-react";

type Vendor = {
  id: string;
  vendor_id: string;
  name: string;
  company: string;
  email: string;
  phone: string;
  city: string;
  address: string;
  expertise: string[];
  status: 'Active' | 'Inactive';
  rating: number;
  created_at: string;
};

type VendorTask = {
  id: string;
  vendor_id: string;
  vendor_name: string;
  store_code: string;
  store_name: string;
  devices: number;
  task_type: 'Onboarding' | 'Installation' | 'Maintenance';
  status: 'Pending' | 'In Progress' | 'Completed' | 'Confirmed';
  assigned_date: string;
  completion_date?: string;
  payment_status: 'Pending' | 'Paid';
  payment_amount?: number;
  notes?: string;
};

const expertiseOptions = [
  'Router Installation',
  'Switch Configuration',
  'Firewall Setup',
  'Access Point Installation',
  'Network Cabling',
  'Device Testing',
  'Site Survey'
];

export default function Vendors() {
  const { has, loading } = useFeatureFlags();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [tasks, setTasks] = useState<VendorTask[]>([]);
  const [loadingData, setLoadingData] = useState(true);
  const [vendorDialogOpen, setVendorDialogOpen] = useState(false);
  const [taskDialogOpen, setTaskDialogOpen] = useState(false);
  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);
  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState<VendorTask | null>(null);
  const [selectedVendor, setSelectedVendor] = useState<Vendor | null>(null);
  const [isEditMode, setIsEditMode] = useState(false);
  const [vendorDetailsOpen, setVendorDetailsOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [vendorToDelete, setVendorToDelete] = useState<Vendor | null>(null);

  // Form states
  const [vendorForm, setVendorForm] = useState({
    name: '',
    company: '',
    email: '',
    phone: '',
    city: '',
    address: '',
    expertise: [] as string[],
    status: 'Active' as 'Active' | 'Inactive',
    rating: 5
  });

  const [paymentAmount, setPaymentAmount] = useState('');

  useEffect(() => {
    if (!loading && !has('Vendors')) {
      navigate('/');
    }
  }, [loading, has, navigate]);

  useEffect(() => {
    loadVendors();
    loadTasks();
  }, []);

  const loadVendors = async () => {
    try {
      setLoadingData(true);
      const { data, error } = await supabase
        .from('vendors')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setVendors(data || []);
    } catch (e) {
      console.error('loadVendors error', e);
    } finally {
      setLoadingData(false);
    }
  };

  const loadTasks = async () => {
    try {
      const { data, error } = await supabase
        .from('vendor_tasks')
        .select(`
          *,
          vendors(name, company)
        `)
        .order('assigned_date', { ascending: false });

      if (error) throw error;
      
      const formattedTasks = (data || []).map((t: any) => ({
        ...t,
        vendor_name: t.vendors?.name || '-',
        vendor_company: t.vendors?.company || '-'
      }));
      
      setTasks(formattedTasks);
    } catch (e) {
      console.error('loadTasks error', e);
    }
  };

  const handleAddVendor = async () => {
    try {
      if (isEditMode && selectedVendor) {
        // Update existing vendor
        const { error } = await supabase
          .from('vendors')
          .update(vendorForm)
          .eq('id', selectedVendor.id);

        if (error) throw error;

        toast({
          title: "Vendor Updated",
          description: "Vendor details have been updated successfully.",
        });
      } else {
        // Insert new vendor
        const { error } = await supabase
          .from('vendors')
          .insert([vendorForm]);

        if (error) throw error;

        toast({
          title: "Vendor Added",
          description: "Vendor has been registered successfully.",
        });
      }

      setVendorDialogOpen(false);
      setIsEditMode(false);
      setSelectedVendor(null);
      setVendorForm({
        name: '',
        company: '',
        email: '',
        phone: '',
        city: '',
        address: '',
        expertise: [],
        status: 'Active',
        rating: 5
      });
      loadVendors();
    } catch (e) {
      console.error('handleAddVendor error', e);
      toast({
        title: "Error",
        description: `Failed to ${isEditMode ? 'update' : 'add'} vendor. Please try again.`,
        variant: "destructive",
      });
    }
  };

  const handleEditVendor = (vendor: Vendor) => {
    setSelectedVendor(vendor);
    setIsEditMode(true);
    setVendorForm({
      name: vendor.name,
      company: vendor.company,
      email: vendor.email,
      phone: vendor.phone,
      city: vendor.city,
      address: vendor.address,
      expertise: vendor.expertise,
      status: vendor.status,
      rating: vendor.rating
    });
    setVendorDetailsOpen(false);
    setVendorDialogOpen(true);
  };

  const handleDeleteVendor = async () => {
    if (!vendorToDelete) return;

    try {
      const { error } = await supabase
        .from('vendors')
        .delete()
        .eq('id', vendorToDelete.id);

      if (error) throw error;

      toast({
        title: "Vendor Deleted",
        description: "Vendor has been removed successfully.",
      });

      setDeleteDialogOpen(false);
      setVendorToDelete(null);
      setVendorDetailsOpen(false);
      loadVendors();
    } catch (e) {
      console.error('handleDeleteVendor error', e);
      toast({
        title: "Error",
        description: "Failed to delete vendor. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleRowClick = (vendor: Vendor) => {
    setSelectedVendor(vendor);
    setVendorDetailsOpen(true);
  };

  const handleCompleteTask = async (taskId: string) => {
    try {
      const { error } = await supabase
        .from('vendor_tasks')
        .update({ 
          status: 'Completed',
          completion_date: new Date().toISOString()
        })
        .eq('id', taskId);

      if (error) throw error;

      toast({
        title: "Task Completed",
        description: "Task marked as completed. Awaiting confirmation.",
      });

      loadTasks();
    } catch (e) {
      console.error('handleCompleteTask error', e);
      toast({
        title: "Error",
        description: "Failed to update task. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleConfirmTask = async () => {
    if (!selectedTask) return;

    try {
      const { error } = await supabase
        .from('vendor_tasks')
        .update({ status: 'Confirmed' })
        .eq('id', selectedTask.id);

      if (error) throw error;

      toast({
        title: "Task Confirmed",
        description: "Vendor task has been confirmed successfully.",
      });

      setConfirmDialogOpen(false);
      setSelectedTask(null);
      loadTasks();
    } catch (e) {
      console.error('handleConfirmTask error', e);
      toast({
        title: "Error",
        description: "Failed to confirm task. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleProcessPayment = async () => {
    if (!selectedTask || !paymentAmount) return;

    try {
      const { error } = await supabase
        .from('vendor_tasks')
        .update({ 
          payment_status: 'Paid',
          payment_amount: parseFloat(paymentAmount)
        })
        .eq('id', selectedTask.id);

      if (error) throw error;

      toast({
        title: "Payment Processed",
        description: `Payment of ₹${paymentAmount} has been recorded.`,
      });

      setPaymentDialogOpen(false);
      setSelectedTask(null);
      setPaymentAmount('');
      loadTasks();
    } catch (e) {
      console.error('handleProcessPayment error', e);
      toast({
        title: "Error",
        description: "Failed to process payment. Please try again.",
        variant: "destructive",
      });
    }
  };

  const toggleExpertise = (expertise: string) => {
    setVendorForm(prev => ({
      ...prev,
      expertise: prev.expertise.includes(expertise)
        ? prev.expertise.filter(e => e !== expertise)
        : [...prev.expertise, expertise]
    }));
  };

  if (!loading && !has('Vendors')) {
    return (
      <div className="p-6">
        <Card>
          <CardHeader>
            <CardTitle>Access Restricted</CardTitle>
            <CardDescription>The Vendors feature is disabled for your account.</CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  const stats = {
    totalVendors: vendors.length,
    activeVendors: vendors.filter(v => v.status === 'Active').length,
    pendingTasks: tasks.filter(t => t.status === 'Pending' || t.status === 'In Progress').length,
    completedTasks: tasks.filter(t => t.status === 'Completed' || t.status === 'Confirmed').length,
    pendingPayments: tasks.filter(t => t.payment_status === 'Pending' && t.status === 'Confirmed').length,
  };

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-2">Vendor Management</h1>
        <p className="text-muted-foreground">Manage vendors, tasks, and payments</p>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-5 mb-6">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Vendors</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalVendors}</div>
            <p className="text-xs text-muted-foreground">{stats.activeVendors} active</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Pending Tasks</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">{stats.pendingTasks}</div>
            <p className="text-xs text-muted-foreground">In progress</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Completed</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{stats.completedTasks}</div>
            <p className="text-xs text-muted-foreground">Tasks done</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Pending Payments</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{stats.pendingPayments}</div>
            <p className="text-xs text-muted-foreground">To be paid</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Paid</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              ₹{tasks.filter(t => t.payment_status === 'Paid').reduce((sum, t) => sum + (t.payment_amount || 0), 0).toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground">This month</p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="vendors" className="w-full">
        <TabsList className="mb-6">
          <TabsTrigger value="vendors">Vendors</TabsTrigger>
          <TabsTrigger value="tasks">Tasks & Onboarding</TabsTrigger>
          <TabsTrigger value="payments">Payments</TabsTrigger>
        </TabsList>

        {/* Vendors Tab */}
        <TabsContent value="vendors">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Registered Vendors</CardTitle>
                  <CardDescription>Manage vendor registrations and expertise</CardDescription>
                </div>
                <Dialog open={vendorDialogOpen} onOpenChange={setVendorDialogOpen}>
                  <DialogTrigger asChild>
                    <Button className="gap-2">
                      <Plus className="h-4 w-4" />
                      Add Vendor
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-2xl">
                    <DialogHeader>
                      <DialogTitle>{isEditMode ? 'Edit Vendor' : 'Register New Vendor'}</DialogTitle>
                      <DialogDescription>{isEditMode ? 'Update vendor details and expertise' : 'Add vendor details and expertise'}</DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label>Vendor Name</Label>
                          <Input
                            value={vendorForm.name}
                            onChange={(e) => setVendorForm({ ...vendorForm, name: e.target.value })}
                            placeholder="John Doe"
                          />
                        </div>
                        <div>
                          <Label>Company Name</Label>
                          <Input
                            value={vendorForm.company}
                            onChange={(e) => setVendorForm({ ...vendorForm, company: e.target.value })}
                            placeholder="ABC Networks"
                          />
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label>Email</Label>
                          <Input
                            type="email"
                            value={vendorForm.email}
                            onChange={(e) => setVendorForm({ ...vendorForm, email: e.target.value })}
                            placeholder="vendor@example.com"
                          />
                        </div>
                        <div>
                          <Label>Phone</Label>
                          <Input
                            value={vendorForm.phone}
                            onChange={(e) => setVendorForm({ ...vendorForm, phone: e.target.value })}
                            placeholder="+91 9876543210"
                          />
                        </div>
                      </div>
                      <div>
                        <Label>City</Label>
                        <Input
                          value={vendorForm.city}
                          onChange={(e) => setVendorForm({ ...vendorForm, city: e.target.value })}
                          placeholder="Bangalore"
                        />
                      </div>
                      <div>
                        <Label>Address</Label>
                        <Textarea
                          value={vendorForm.address}
                          onChange={(e) => setVendorForm({ ...vendorForm, address: e.target.value })}
                          placeholder="Complete address"
                        />
                      </div>
                      <div>
                        <Label>Expertise (Select all that apply)</Label>
                        <div className="grid grid-cols-2 gap-2 mt-2">
                          {expertiseOptions.map((exp) => (
                            <label key={exp} className="flex items-center gap-2 cursor-pointer">
                              <input
                                type="checkbox"
                                checked={vendorForm.expertise.includes(exp)}
                                onChange={() => toggleExpertise(exp)}
                                className="w-4 h-4"
                              />
                              <span className="text-sm">{exp}</span>
                            </label>
                          ))}
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label>Status</Label>
                          <Select
                            value={vendorForm.status}
                            onValueChange={(value: 'Active' | 'Inactive') => setVendorForm({ ...vendorForm, status: value })}
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
                        <div>
                          <Label>Initial Rating</Label>
                          <Input
                            type="number"
                            min="1"
                            max="5"
                            value={vendorForm.rating}
                            onChange={(e) => setVendorForm({ ...vendorForm, rating: parseInt(e.target.value) || 5 })}
                          />
                        </div>
                      </div>
                    </div>
                    <DialogFooter>
                      <Button variant="outline" onClick={() => {
                        setVendorDialogOpen(false);
                        setIsEditMode(false);
                        setSelectedVendor(null);
                      }}>Cancel</Button>
                      <Button onClick={handleAddVendor}>{isEditMode ? 'Update Vendor' : 'Add Vendor'}</Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </div>
            </CardHeader>
            <CardContent>
              {loadingData ? (
                <div className="text-center py-8">Loading vendors...</div>
              ) : vendors.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">No vendors registered yet.</div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Vendor ID</TableHead>
                      <TableHead>Name</TableHead>
                      <TableHead>Company</TableHead>
                      <TableHead>City</TableHead>
                      <TableHead>Contact</TableHead>
                      <TableHead>Expertise</TableHead>
                      <TableHead>Rating</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {vendors.map((vendor) => (
                      <TableRow 
                        key={vendor.id} 
                        className="cursor-pointer hover:bg-muted/50"
                        onClick={() => handleRowClick(vendor)}
                      >
                        <TableCell>
                          <Badge variant="outline" className="font-mono text-xs">
                            {vendor.vendor_id || 'N/A'}
                          </Badge>
                        </TableCell>
                        <TableCell className="font-medium">{vendor.name}</TableCell>
                        <TableCell>{vendor.company}</TableCell>
                        <TableCell>
                          <span className="font-medium text-blue-600">{vendor.city}</span>
                        </TableCell>
                        <TableCell>
                          <div className="text-sm">
                            <div>{vendor.email}</div>
                            <div className="text-muted-foreground">{vendor.phone}</div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-wrap gap-1">
                            {vendor.expertise.slice(0, 2).map((exp, i) => (
                              <Badge key={i} variant="secondary" className="text-xs">
                                {exp}
                              </Badge>
                            ))}
                            {vendor.expertise.length > 2 && (
                              <Badge variant="secondary" className="text-xs">
                                +{vendor.expertise.length - 2}
                              </Badge>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <span className="text-yellow-500">★</span>
                            <span>{vendor.rating}/5</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant={vendor.status === 'Active' ? 'default' : 'secondary'}>
                            {vendor.status}
                          </Badge>
                        </TableCell>
                        <TableCell onClick={(e) => e.stopPropagation()}>
                          <div className="flex gap-2">
                            <Button size="sm" variant="outline" onClick={() => handleEditVendor(vendor)}>
                              <Edit className="h-3 w-3 mr-1" />
                              Edit
                            </Button>
                            <Button 
                              size="sm" 
                              variant="destructive" 
                              onClick={() => {
                                setVendorToDelete(vendor);
                                setDeleteDialogOpen(true);
                              }}
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </div>
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
              <CardTitle>Vendor Tasks & Device Onboarding</CardTitle>
              <CardDescription>Track vendor tasks for device delivery and installation</CardDescription>
            </CardHeader>
            <CardContent>
              {tasks.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">No tasks assigned yet.</div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Vendor</TableHead>
                      <TableHead>Store</TableHead>
                      <TableHead>Task Type</TableHead>
                      <TableHead>Devices</TableHead>
                      <TableHead>Assigned Date</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {tasks.map((task) => (
                      <TableRow key={task.id}>
                        <TableCell>
                          <div className="font-medium">{task.vendor_name}</div>
                        </TableCell>
                        <TableCell>
                          <div>{task.store_name}</div>
                          <div className="text-sm text-muted-foreground">{task.store_code}</div>
                        </TableCell>
                        <TableCell>{task.task_type}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <Package className="h-4 w-4" />
                            {task.devices}
                          </div>
                        </TableCell>
                        <TableCell>{new Date(task.assigned_date).toLocaleDateString()}</TableCell>
                        <TableCell>
                          <Badge
                            variant={
                              task.status === 'Completed' || task.status === 'Confirmed'
                                ? 'default'
                                : task.status === 'In Progress'
                                ? 'secondary'
                                : 'outline'
                            }
                            className={
                              task.status === 'Confirmed' ? 'bg-green-100 text-green-800' : ''
                            }
                          >
                            {task.status === 'Completed' && <CheckCircle2 className="h-3 w-3 mr-1" />}
                            {task.status === 'Pending' && <Clock className="h-3 w-3 mr-1" />}
                            {task.status}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-2">
                            {task.status === 'In Progress' && (
                              <Button size="sm" onClick={() => handleCompleteTask(task.id)}>
                                Complete
                              </Button>
                            )}
                            {task.status === 'Completed' && (
                              <Button
                                size="sm"
                                variant="default"
                                onClick={() => {
                                  setSelectedTask(task);
                                  setConfirmDialogOpen(true);
                                }}
                              >
                                Confirm
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Payments Tab */}
        <TabsContent value="payments">
          <Card>
            <CardHeader>
              <CardTitle>Vendor Payments</CardTitle>
              <CardDescription>Process payments for confirmed tasks</CardDescription>
            </CardHeader>
            <CardContent>
              {tasks.filter(t => t.status === 'Confirmed').length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">No confirmed tasks pending payment.</div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Vendor</TableHead>
                      <TableHead>Store</TableHead>
                      <TableHead>Task Type</TableHead>
                      <TableHead>Completion Date</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Payment Status</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {tasks.filter(t => t.status === 'Confirmed').map((task) => (
                      <TableRow key={task.id}>
                        <TableCell className="font-medium">{task.vendor_name}</TableCell>
                        <TableCell>{task.store_code}</TableCell>
                        <TableCell>{task.task_type}</TableCell>
                        <TableCell>
                          {task.completion_date ? new Date(task.completion_date).toLocaleDateString() : '-'}
                        </TableCell>
                        <TableCell>
                          {task.payment_amount ? (
                            <span className="font-mono">₹{task.payment_amount.toLocaleString()}</span>
                          ) : (
                            <span className="text-muted-foreground">-</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <Badge variant={task.payment_status === 'Paid' ? 'default' : 'secondary'}>
                            {task.payment_status === 'Paid' && <DollarSign className="h-3 w-3 mr-1" />}
                            {task.payment_status}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {task.payment_status === 'Pending' && (
                            <Button
                              size="sm"
                              onClick={() => {
                                setSelectedTask(task);
                                setPaymentDialogOpen(true);
                              }}
                            >
                              <DollarSign className="h-3 w-3 mr-1" />
                              Pay
                            </Button>
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
      </Tabs>

      {/* Confirm Task Dialog */}
      <Dialog open={confirmDialogOpen} onOpenChange={setConfirmDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm Task Completion</DialogTitle>
            <DialogDescription>
              Confirm that the vendor has successfully completed the task and devices are onboarded.
            </DialogDescription>
          </DialogHeader>
          {selectedTask && (
            <div className="py-4">
              <div className="space-y-2 text-sm">
                <div><span className="font-medium">Vendor:</span> {selectedTask.vendor_name}</div>
                <div><span className="font-medium">Store:</span> {selectedTask.store_name} ({selectedTask.store_code})</div>
                <div><span className="font-medium">Task:</span> {selectedTask.task_type}</div>
                <div><span className="font-medium">Devices:</span> {selectedTask.devices}</div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleConfirmTask}>Confirm Completion</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Payment Dialog */}
      <Dialog open={paymentDialogOpen} onOpenChange={setPaymentDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Process Payment</DialogTitle>
            <DialogDescription>Enter payment amount for the completed task</DialogDescription>
          </DialogHeader>
          {selectedTask && (
            <div className="py-4 space-y-4">
              <div className="space-y-2 text-sm">
                <div><span className="font-medium">Vendor:</span> {selectedTask.vendor_name}</div>
                <div><span className="font-medium">Task:</span> {selectedTask.task_type}</div>
                <div><span className="font-medium">Store:</span> {selectedTask.store_code}</div>
              </div>
              <div>
                <Label>Payment Amount (₹)</Label>
                <Input
                  type="number"
                  value={paymentAmount}
                  onChange={(e) => setPaymentAmount(e.target.value)}
                  placeholder="Enter amount"
                  className="mt-1"
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setPaymentDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleProcessPayment}>Process Payment</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Vendor Details Dialog */}
      <Dialog open={vendorDetailsOpen} onOpenChange={setVendorDetailsOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Vendor Details</DialogTitle>
            <DialogDescription>Complete vendor information</DialogDescription>
          </DialogHeader>
          {selectedVendor && (
            <div className="space-y-6 py-4">
              <div className="flex items-start justify-between">
                <div className="space-y-1">
                  <Badge variant="outline" className="font-mono text-xs mb-2">
                    {selectedVendor.vendor_id || 'N/A'}
                  </Badge>
                  <h3 className="text-2xl font-bold">{selectedVendor.name}</h3>
                  <p className="text-lg text-muted-foreground">{selectedVendor.company}</p>
                </div>
                <Badge variant={selectedVendor.status === 'Active' ? 'default' : 'secondary'} className="text-sm">
                  {selectedVendor.status}
                </Badge>
              </div>

              <div className="grid gap-4">
                <div className="flex items-center gap-3 text-sm">
                  <Mail className="h-4 w-4 text-muted-foreground" />
                  <span>{selectedVendor.email}</span>
                </div>
                <div className="flex items-center gap-3 text-sm">
                  <Phone className="h-4 w-4 text-muted-foreground" />
                  <span>{selectedVendor.phone}</span>
                </div>
                <div className="flex items-center gap-3 text-sm">
                  <MapPin className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <div className="font-medium">{selectedVendor.city}</div>
                    <div className="text-muted-foreground">{selectedVendor.address}</div>
                  </div>
                </div>
              </div>

              <div>
                <Label className="text-sm font-medium mb-2 block">Expertise</Label>
                <div className="flex flex-wrap gap-2">
                  {selectedVendor.expertise.map((exp, i) => (
                    <Badge key={i} variant="secondary">
                      {exp}
                    </Badge>
                  ))}
                </div>
              </div>

              <div className="flex items-center gap-4">
                <div>
                  <Label className="text-sm font-medium">Rating</Label>
                  <div className="flex items-center gap-1 mt-1">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <span 
                        key={star} 
                        className={`text-lg ${star <= selectedVendor.rating ? 'text-yellow-500' : 'text-gray-300'}`}
                      >
                        ★
                      </span>
                    ))}
                    <span className="ml-2 text-sm text-muted-foreground">
                      {selectedVendor.rating}/5
                    </span>
                  </div>
                </div>
              </div>

              <div className="text-xs text-muted-foreground">
                Registered on {new Date(selectedVendor.created_at).toLocaleDateString('en-IN', {
                  day: 'numeric',
                  month: 'long',
                  year: 'numeric'
                })}
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setVendorDetailsOpen(false)}>Close</Button>
            <Button 
              variant="destructive"
              onClick={() => {
                if (selectedVendor) {
                  setVendorToDelete(selectedVendor);
                  setDeleteDialogOpen(true);
                }
              }}
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Delete Vendor
            </Button>
            <Button onClick={() => selectedVendor && handleEditVendor(selectedVendor)}>
              <Edit className="h-4 w-4 mr-2" />
              Edit Vendor
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Vendor</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this vendor? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          {vendorToDelete && (
            <div className="py-4">
              <div className="rounded-lg bg-muted p-4 space-y-2">
                <div className="font-medium">{vendorToDelete.name}</div>
                <div className="text-sm text-muted-foreground">{vendorToDelete.company}</div>
                <div className="text-sm text-muted-foreground">{vendorToDelete.city}</div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>Cancel</Button>
            <Button variant="destructive" onClick={handleDeleteVendor}>
              <Trash2 className="h-4 w-4 mr-2" />
              Delete Vendor
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
