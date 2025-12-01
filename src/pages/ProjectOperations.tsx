import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { CheckCircle2, Clock, UserPlus, Building2, Calendar } from "lucide-react";

interface EligibleStore {
  store_code: string;
  store_name: string;
  city: string;
  devices_delivered: boolean;
  isp1_status: string;
  isp1_provider: string;
  isp1_delivery_date: string;
  isp2_status: string;
  isp2_provider: string;
  isp2_delivery_date: string;
  vendor_assigned: boolean;
  vendor_name?: string;
  deployment_status?: string;
}

interface Vendor {
  id: string;
  vendor_name: string;
  vendor_code: string;
}

interface VendorAssignment {
  id: string;
  store_code: string;
  vendor_id: string;
  assigned_date: string;
  deployment_status: string;
  notes?: string;
  vendors?: {
    vendor_name: string;
  };
}

const ProjectOperations = () => {
  const [eligibleStores, setEligibleStores] = useState<EligibleStore[]>([]);
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [loading, setLoading] = useState(true);
  const [assignDialogOpen, setAssignDialogOpen] = useState(false);
  const [selectedStore, setSelectedStore] = useState<string>("");
  const [assignmentForm, setAssignmentForm] = useState({
    vendor_id: "",
    notes: "",
    deployment_status: "Pending"
  });
  const { toast } = useToast();

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    await Promise.all([loadEligibleStores(), loadVendors()]);
  };

  const loadEligibleStores = async () => {
    try {
      setLoading(true);
      console.log('Starting to load eligible stores...');
      
      // Query to find stores where:
      // 1. Devices are delivered (from delivery_tracking)
      // 2. Both ISP1 and ISP2 are delivered (from store_isp_details)
      
      // First get stores with delivered devices
      const { data: deliveredDevices, error: deliveryError } = await supabase
        .from('delivery_tracking')
        .select('store_code')
        .eq('delivery_status', 'Delivered');

      console.log('Delivered devices query result:', { data: deliveredDevices, error: deliveryError });

      if (deliveryError) {
        console.error('Delivery error:', deliveryError);
        throw deliveryError;
      }

      // Get unique store codes with delivered devices
      const storesWithDevices = [...new Set(deliveredDevices?.map(d => d.store_code) || [])];
      console.log('Stores with delivered devices:', storesWithDevices);

      if (storesWithDevices.length === 0) {
        console.log('No stores with delivered devices found');
        setEligibleStores([]);
        return;
      }

      // Get ISP details for these stores
      const { data: ispDetails, error: ispError } = await supabase
        .from('store_isp_details')
        .select('*')
        .in('store_code', storesWithDevices)
        .eq('isp1_status', 'Delivered')
        .eq('isp2_status', 'Delivered');

      console.log('ISP details query result:', { data: ispDetails, error: ispError });

      if (ispError) {
        console.error('ISP error:', ispError);
        throw ispError;
      }

      // Get stores data separately
      const storeCodesForLookup = ispDetails?.map(s => s.store_code) || [];
      let storesData: any[] = [];
      
      if (storeCodesForLookup.length > 0) {
        const { data: storesResult, error: storesError } = await supabase
          .from('stores')
          .select('store_code, city, store')
          .in('store_code', storeCodesForLookup);
        
        console.log('Stores lookup result:', { data: storesResult, error: storesError });
        storesData = storesResult || [];
      }

      // Create stores map
      const storesMap = new Map(storesData.map(s => [s.store_code, s]));

      // Get vendor assignments
      const { data: assignments, error: assignError } = await supabase
        .from('site_onboarding')
        .select('*');

      console.log('Assignments query result:', { data: assignments, error: assignError });

      if (assignError && assignError.code !== 'PGRST116') {
        console.error('Assignment error:', assignError);
        // Don't throw - table might not exist yet
      }

      // Get vendors data if we have assignments
      let vendorsData: any[] = [];
      if (assignments && assignments.length > 0) {
        const vendorIds = [...new Set(assignments.map(a => a.vendor_id))];
        const { data: vendorsResult } = await supabase
          .from('vendors')
          .select('id, vendor_name')
          .in('id', vendorIds);
        vendorsData = vendorsResult || [];
      }

      const vendorsMap = new Map(vendorsData.map(v => [v.id, v]));

      // Create a map of assignments
      const assignmentMap = new Map(
        assignments?.map(a => [
          a.store_code,
          {
            vendor_name: vendorsMap.get(a.vendor_id)?.vendor_name,
            deployment_status: a.deployment_status
          }
        ]) || []
      );

      // Combine the data
      const eligible: EligibleStore[] = (ispDetails || []).map(store => {
        const storeInfo = storesMap.get(store.store_code);
        return {
          store_code: store.store_code,
          store_name: storeInfo?.store || '-',
          city: storeInfo?.city || '-',
          devices_delivered: true,
          isp1_status: store.isp1_status,
          isp1_provider: store.isp1_provider || '-',
          isp1_delivery_date: store.isp1_delivery_date || '-',
          isp2_status: store.isp2_status,
          isp2_provider: store.isp2_provider || '-',
          isp2_delivery_date: store.isp2_delivery_date || '-',
          vendor_assigned: assignmentMap.has(store.store_code),
          vendor_name: assignmentMap.get(store.store_code)?.vendor_name,
          deployment_status: assignmentMap.get(store.store_code)?.deployment_status
        };
      });

      console.log('Eligible stores for deployment:', eligible);
      setEligibleStores(eligible);
    } catch (error) {
      console.error('Error loading eligible stores:', error);
      toast({
        title: "Error",
        description: "Failed to load eligible stores",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const loadVendors = async () => {
    try {
      console.log('Loading vendors...');
      const { data, error } = await supabase
        .from('vendors')
        .select('id, vendor_name, vendor_code')
        .order('vendor_name');

      console.log('Vendors query result:', { data, error });

      if (error) {
        console.error('Vendors error:', error);
        // Don't throw - vendors table might not exist yet
        setVendors([]);
        return;
      }
      setVendors(data || []);
    } catch (error) {
      console.error('Error loading vendors:', error);
      setVendors([]);
    }
  };

  const handleAssignVendor = async () => {
    if (!selectedStore || !assignmentForm.vendor_id) {
      toast({
        title: "Validation Error",
        description: "Please select a store and vendor",
        variant: "destructive",
      });
      return;
    }

    try {
      const { error } = await supabase
        .from('site_onboarding')
        .insert({
          store_code: selectedStore,
          vendor_id: assignmentForm.vendor_id,
          assigned_date: new Date().toISOString(),
          deployment_status: assignmentForm.deployment_status,
          notes: assignmentForm.notes || null
        });

      if (error) throw error;

      toast({
        title: "Success",
        description: "Vendor assigned successfully",
      });

      setAssignDialogOpen(false);
      setSelectedStore("");
      setAssignmentForm({
        vendor_id: "",
        notes: "",
        deployment_status: "Pending"
      });
      
      loadEligibleStores();
    } catch (error: any) {
      console.error('Error assigning vendor:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to assign vendor",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Store Onboarding</h1>
        <p className="text-muted-foreground">Manage store onboarding and vendor deployment</p>
      </div>

      <Tabs defaultValue="store-onboarding" className="space-y-4">
        <TabsList>
          <TabsTrigger value="store-onboarding">Store Onboarding</TabsTrigger>
          <TabsTrigger value="deployment-status">Deployment Status</TabsTrigger>
        </TabsList>

        <TabsContent value="store-onboarding">
          <Card>
            <CardHeader>
              <CardTitle>Stores Ready for Deployment</CardTitle>
              <CardDescription>
                Stores where devices and both ISP connections (ISP1 & ISP2) have been delivered
              </CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="text-center py-8">Loading eligible stores...</div>
              ) : eligibleStores.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No stores eligible for deployment yet. Ensure devices and both ISP connections are delivered.
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Store Code</TableHead>
                      <TableHead>Store Name</TableHead>
                      <TableHead>City</TableHead>
                      <TableHead>Devices</TableHead>
                      <TableHead>ISP1</TableHead>
                      <TableHead>ISP2</TableHead>
                      <TableHead>Vendor</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {eligibleStores.map((store) => (
                      <TableRow key={store.store_code}>
                        <TableCell className="font-medium">{store.store_code}</TableCell>
                        <TableCell>{store.store_name}</TableCell>
                        <TableCell>{store.city}</TableCell>
                        <TableCell>
                          <Badge variant="default" className="gap-1">
                            <CheckCircle2 className="h-3 w-3" />
                            Delivered
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="space-y-1">
                            <Badge variant="default" className="gap-1">
                              <CheckCircle2 className="h-3 w-3" />
                              {store.isp1_status}
                            </Badge>
                            <div className="text-xs text-muted-foreground">{store.isp1_provider}</div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="space-y-1">
                            <Badge variant="default" className="gap-1">
                              <CheckCircle2 className="h-3 w-3" />
                              {store.isp2_status}
                            </Badge>
                            <div className="text-xs text-muted-foreground">{store.isp2_provider}</div>
                          </div>
                        </TableCell>
                        <TableCell>
                          {store.vendor_assigned ? (
                            <div className="flex items-center gap-1">
                              <Building2 className="h-3 w-3 text-muted-foreground" />
                              <span className="text-sm">{store.vendor_name}</span>
                            </div>
                          ) : (
                            <span className="text-muted-foreground text-sm">Not assigned</span>
                          )}
                        </TableCell>
                        <TableCell>
                          {store.deployment_status ? (
                            <Badge variant={store.deployment_status === 'Completed' ? 'default' : 'secondary'}>
                              {store.deployment_status}
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="gap-1">
                              <Clock className="h-3 w-3" />
                              Pending
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          {!store.vendor_assigned ? (
                            <Dialog open={assignDialogOpen && selectedStore === store.store_code} onOpenChange={(open) => {
                              setAssignDialogOpen(open);
                              if (open) setSelectedStore(store.store_code);
                              else setSelectedStore("");
                            }}>
                              <DialogTrigger asChild>
                                <Button size="sm" variant="outline" className="gap-1">
                                  <UserPlus className="h-3 w-3" />
                                  Assign Vendor
                                </Button>
                              </DialogTrigger>
                              <DialogContent>
                                <DialogHeader>
                                  <DialogTitle>Assign Vendor for Deployment</DialogTitle>
                                  <DialogDescription>
                                    Store: {store.store_code} - {store.store_name}
                                  </DialogDescription>
                                </DialogHeader>
                                <div className="space-y-4 py-4">
                                  <div className="space-y-2">
                                    <Label htmlFor="vendor">Vendor *</Label>
                                    <Select
                                      value={assignmentForm.vendor_id}
                                      onValueChange={(value) => setAssignmentForm({ ...assignmentForm, vendor_id: value })}
                                    >
                                      <SelectTrigger id="vendor">
                                        <SelectValue placeholder="Select vendor" />
                                      </SelectTrigger>
                                      <SelectContent>
                                        {vendors.map((vendor) => (
                                          <SelectItem key={vendor.id} value={vendor.id}>
                                            {vendor.vendor_name} ({vendor.vendor_code})
                                          </SelectItem>
                                        ))}
                                      </SelectContent>
                                    </Select>
                                  </div>
                                  <div className="space-y-2">
                                    <Label htmlFor="status">Initial Status</Label>
                                    <Select
                                      value={assignmentForm.deployment_status}
                                      onValueChange={(value) => setAssignmentForm({ ...assignmentForm, deployment_status: value })}
                                    >
                                      <SelectTrigger id="status">
                                        <SelectValue />
                                      </SelectTrigger>
                                      <SelectContent>
                                        <SelectItem value="Pending">Pending</SelectItem>
                                        <SelectItem value="In Progress">In Progress</SelectItem>
                                        <SelectItem value="Scheduled">Scheduled</SelectItem>
                                      </SelectContent>
                                    </Select>
                                  </div>
                                  <div className="space-y-2">
                                    <Label htmlFor="notes">Notes</Label>
                                    <Textarea
                                      id="notes"
                                      value={assignmentForm.notes}
                                      onChange={(e) => setAssignmentForm({ ...assignmentForm, notes: e.target.value })}
                                      placeholder="Add any deployment notes or instructions..."
                                      rows={3}
                                    />
                                  </div>
                                </div>
                                <DialogFooter>
                                  <Button onClick={handleAssignVendor}>Assign Vendor</Button>
                                </DialogFooter>
                              </DialogContent>
                            </Dialog>
                          ) : (
                            <span className="text-xs text-muted-foreground">Assigned</span>
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

        <TabsContent value="deployment-status">
          <Card>
            <CardHeader>
              <CardTitle>Deployment Status Overview</CardTitle>
              <CardDescription>Track vendor deployment progress across all assigned sites</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8 text-muted-foreground">
                Deployment tracking coming soon...
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default ProjectOperations;
