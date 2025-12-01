import { useEffect, useState, useRef } from "react";
import { useFeatureFlags } from '@/hooks/useFeatureFlags';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Package, Truck, CheckCircle2, Clock, Upload, Download, ArrowUpDown, ArrowUp, ArrowDown, Pencil, Trash2, X } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { getDeliveries, updateDelivery } from "@/integrations/supabase/deliveries";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

type DeviceDelivery = {
  id: number;
  store: string;
  deviceType: "Firewall" | "Switch" | "AP";
  quantity: number;
  deliveryDate: string;
  status: "Delivered" | "In Transit" | "Pending";
  trackingNumber: string;
  dbId?: string; // optional UUID from DB
};

type DeliveryTracking = {
  id: string;
  sr_no: number;
  pickup_date: string;
  consignment_number: string;
  invoice_dc_no: string;
  store_code: string;
  delivery_status: string;
  comments?: string;
  delivered_date?: string;
  created_at: string;
  stores?: {
    city: string;
    store: string;
  };
};

const deviceDeliveriesInitial: DeviceDelivery[] = [
  { id: 101, store: "Store NYC-01", deviceType: "Firewall", quantity: 1, deliveryDate: "2024-01-15", status: "Delivered", trackingNumber: "FW-TRK-001" },
  { id: 102, store: "Store NYC-01", deviceType: "Switch", quantity: 2, deliveryDate: "2024-01-15", status: "Delivered", trackingNumber: "SW-TRK-002" },
  { id: 103, store: "Store NYC-01", deviceType: "AP", quantity: 4, deliveryDate: "2024-01-15", status: "Delivered", trackingNumber: "AP-TRK-003" },
  { id: 104, store: "Store CHI-03", deviceType: "Firewall", quantity: 1, deliveryDate: "2024-02-01", status: "In Transit", trackingNumber: "FW-TRK-004" },
  { id: 105, store: "Store CHI-03", deviceType: "Switch", quantity: 1, deliveryDate: "2024-02-01", status: "In Transit", trackingNumber: "SW-TRK-005" },
  { id: 106, store: "Store LA-02", deviceType: "AP", quantity: 3, deliveryDate: "2024-01-18", status: "Delivered", trackingNumber: "AP-TRK-006" },
];

const useDeviceDeliveries = () => {
  const [deviceDeliveries, setDeviceDeliveries] = useState<DeviceDelivery[]>(deviceDeliveriesInitial);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    getDeliveries()
      .then((rows) => {
        if (!mounted || !rows) return;
        const mapped = rows.map((r) => ({
          id: Math.floor(Math.random() * 1000000),
          store: r.store,
          deviceType: r.device_type as DeviceDelivery["deviceType"],
          quantity: r.quantity,
          deliveryDate: r.delivery_date ? new Date(r.delivery_date).toISOString().slice(0, 10) : "",
          status: r.status,
          trackingNumber: r.tracking_number || "",
          dbId: r.id,
        }));
        if (mapped.length > 0) setDeviceDeliveries(mapped);
      })
      .catch(() => {
        // fallback to local data
      })
      .finally(() => setLoading(false));

    return () => {
      mounted = false;
    };
  }, []);

  const setStatus = async (id: number, status: DeviceDelivery["status"]) => {
    setDeviceDeliveries((prev) => prev.map((d) => (d.id === id ? { ...d, status } : d)));
    const found = deviceDeliveries.find((d) => d.id === id);
    try {
      if (found?.dbId) {
        await updateDelivery(found.dbId, { status });
      }
    } catch {
      // ignore persistence errors
    }
  };

  return { deviceDeliveries, loading, setStatus };
};

const inventory = [
  { id: 1, store: "Store NYC-01", items: 15, deliveryDate: "2024-01-15", status: "Delivered", trackingNumber: "TRK001234" },
  { id: 2, store: "Store LA-02", items: 8, deliveryDate: "2024-01-18", status: "Delivered", trackingNumber: "TRK001235" },
  { id: 3, store: "Store CHI-03", items: 12, deliveryDate: "2024-02-01", status: "In Transit", trackingNumber: "TRK001236" },
  { id: 4, store: "Store SF-04", items: 20, deliveryDate: "2024-01-10", status: "Delivered", trackingNumber: "TRK001237" },
  { id: 5, store: "Store MIA-05", items: 6, deliveryDate: "2024-01-25", status: "Delivered", trackingNumber: "TRK001238" },
  { id: 6, store: "Store BOS-06", items: 10, deliveryDate: "2024-02-05", status: "Pending", trackingNumber: "TRK001239" },
  { id: 7, store: "Store SEA-07", items: 14, deliveryDate: "2024-01-28", status: "In Transit", trackingNumber: "TRK001240" },
  { id: 8, store: "Store DEN-08", items: 9, deliveryDate: "2024-02-10", status: "Pending", trackingNumber: "TRK001241" },
];

const getStatusIcon = (status: string) => {
  switch (status) {
    case "Delivered":
      return <CheckCircle2 className="h-4 w-4 text-success" />;
    case "In Transit":
      return <Truck className="h-4 w-4 text-accent" />;
    case "Pending":
      return <Clock className="h-4 w-4 text-warning" />;
    default:
      return null;
  }
};

const getStatusVariant = (status: string): "default" | "secondary" | "destructive" | "outline" => {
  switch (status) {
    case "Delivered":
      return "default";
    case "In Transit":
      return "secondary";
    case "Pending":
      return "outline";
    default:
      return "secondary";
  }
};

const Inventory = () => {
  const { has, loading } = useFeatureFlags();
  const navigate = useNavigate();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [deliveryTracking, setDeliveryTracking] = useState<DeliveryTracking[]>([]);
  const [loadingTracking, setLoadingTracking] = useState(true);
  const [sortField, setSortField] = useState<string>('created_at');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  
  // Bulk select and filter states
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());
  const [filters, setFilters] = useState({
    sr_no: '',
    pickup_date: '',
    consignment_number: '',
    invoice_dc_no: '',
    store_code: '',
    delivery_status: '',
    comments: '',
    delivered_date: ''
  });
  
  // Edit and delete states
  const [editingItem, setEditingItem] = useState<DeliveryTracking | null>(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<DeliveryTracking | null>(null);
  const [bulkDeleteDialogOpen, setBulkDeleteDialogOpen] = useState(false);

  useEffect(() => {
    if (!loading) {
      if (!has('Inventory') && !has('Delivery')) {
        navigate('/');
      }
    }
  }, [loading, has, navigate]);

  useEffect(() => {
    loadDeliveryTracking();
  }, []);

  const loadDeliveryTracking = async () => {
    try {
      setLoadingTracking(true);
      const { data, error } = await supabase
        .from('delivery_tracking')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('loadDeliveryTracking database error:', error);
        throw error;
      }
      
      console.log('Loaded delivery tracking data:', data);
      
      // Load store information separately
      if (data && data.length > 0) {
        const storeCodes = [...new Set(data.map(d => d.store_code))];
        const { data: storesData } = await supabase
          .from('stores')
          .select('store_code, city, store')
          .in('store_code', storeCodes);
        
        const storesMap = new Map(storesData?.map(s => [s.store_code, s]) || []);
        
        const enrichedData = data.map(item => ({
          ...item,
          stores: storesMap.get(item.store_code)
        }));
        
        setDeliveryTracking(enrichedData);
      } else {
        setDeliveryTracking(data || []);
      }
    } catch (e) {
      console.error('loadDeliveryTracking error', e);
      toast({
        title: "Error Loading Data",
        description: "Failed to load delivery tracking data. Check console for details.",
        variant: "destructive",
      });
    } finally {
      setLoadingTracking(false);
    }
  };

  const downloadTemplate = () => {
    const headers = [
      'pickup_date',
      'consignment_number',
      'invoice_dc_no',
      'store_code',
      'DELIVERY STATUS',
      'Comments',
      'DELIVERED DATE'
    ];
    
    const sampleRow = [
      '2024-11-09',
      'CON123456',
      'INV-001',
      'BLR_KTHNUR_P01R1CC',
      'Delivered',
      'All devices delivered',
      '2024-11-10'
    ];
    
    const csvContent = headers.join(',') + '\n' + sampleRow.join(',') + '\n';
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = 'delivery_tracking_template.csv';
    link.click();
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const text = await file.text();
      const lines = text.split('\n').filter(line => line.trim());
      
      if (lines.length < 2) {
        toast({
          title: "Error",
          description: "CSV file is empty or invalid",
          variant: "destructive",
        });
        return;
      }

      // Skip header row
      const rows = lines.slice(1);

      const deliveries: any[] = [];
      const errors: string[] = [];
      
      for (let i = 0; i < rows.length; i++) {
        const line = rows[i].trim();
        if (!line) continue;
        
        // Split by comma but handle quoted values
        const values = line.split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/).map(v => v.trim().replace(/^"(.*)"$/, '$1'));
        
        if (values.length < 4) {
          errors.push(`Row ${i + 2}: Not enough columns (expected 7, got ${values.length})`);
          continue;
        }

        const deliveryRecord: any = {
          pickup_date: values[0] && values[0] !== '' ? values[0] : null,
          consignment_number: values[1] || '',
          invoice_dc_no: values[2] || '',
          store_code: values[3] || '',
          delivery_status: values[4] || 'Pending',
          comments: values[5] || null,
          delivered_date: values[6] && values[6] !== '' ? values[6] : null
        };

        // Validate required fields
        if (!deliveryRecord.consignment_number || !deliveryRecord.invoice_dc_no || !deliveryRecord.store_code) {
          errors.push(`Row ${i + 2}: Missing required fields (consignment number, invoice/DC no, or store code)`);
          continue;
        }

        deliveries.push(deliveryRecord);
      }

      if (errors.length > 0) {
        toast({
          title: "Validation Errors",
          description: `Found ${errors.length} error(s). First error: ${errors[0]}`,
          variant: "destructive",
        });
        console.error('CSV validation errors:', errors);
        return;
      }

      if (deliveries.length === 0) {
        toast({
          title: "Error",
          description: "No valid data found in CSV file",
          variant: "destructive",
        });
        return;
      }

      const { error } = await supabase
        .from('delivery_tracking')
        .insert(deliveries);

      if (error) {
        console.error('Database error:', error);
        throw error;
      }

      toast({
        title: "Success",
        description: `${deliveries.length} delivery records uploaded successfully.`,
      });

      loadDeliveryTracking();
      
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    } catch (e: any) {
      console.error('handleFileUpload error', e);
      toast({
        title: "Upload Failed",
        description: e.message || "Please check the file format.",
        variant: "destructive",
      });
    }
  };

  const handleSort = (field: string) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const getSortIcon = (field: string) => {
    if (sortField !== field) {
      return <ArrowUpDown className="ml-2 h-4 w-4" />;
    }
    return sortDirection === 'asc' ? <ArrowUp className="ml-2 h-4 w-4" /> : <ArrowDown className="ml-2 h-4 w-4" />;
  };

  // Filter and sort delivery tracking
  const filteredDeliveryTracking = deliveryTracking.filter(item => {
    return (
      (!filters.sr_no || item.sr_no.toString().includes(filters.sr_no)) &&
      (!filters.pickup_date || (item.pickup_date && item.pickup_date.includes(filters.pickup_date))) &&
      (!filters.consignment_number || item.consignment_number.toLowerCase().includes(filters.consignment_number.toLowerCase())) &&
      (!filters.invoice_dc_no || item.invoice_dc_no.toLowerCase().includes(filters.invoice_dc_no.toLowerCase())) &&
      (!filters.store_code || item.store_code.toLowerCase().includes(filters.store_code.toLowerCase())) &&
      (!filters.delivery_status || item.delivery_status.toLowerCase().includes(filters.delivery_status.toLowerCase())) &&
      (!filters.comments || (item.comments && item.comments.toLowerCase().includes(filters.comments.toLowerCase()))) &&
      (!filters.delivered_date || (item.delivered_date && item.delivered_date.includes(filters.delivered_date)))
    );
  });

  const sortedDeliveryTracking = [...filteredDeliveryTracking].sort((a, b) => {
    let aValue: any = a[sortField as keyof DeliveryTracking];
    let bValue: any = b[sortField as keyof DeliveryTracking];

    // Handle nested store fields
    if (sortField === 'city') {
      aValue = a.stores?.city || '';
      bValue = b.stores?.city || '';
    } else if (sortField === 'store') {
      aValue = a.stores?.store || '';
      bValue = b.stores?.store || '';
    }

    if (aValue === null || aValue === undefined) aValue = '';
    if (bValue === null || bValue === undefined) bValue = '';

    if (typeof aValue === 'string') {
      aValue = aValue.toLowerCase();
      bValue = bValue.toLowerCase();
    }

    if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1;
    if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1;
    return 0;
  });
  
  // Bulk select handlers
  const toggleSelectAll = () => {
    if (selectedItems.size === sortedDeliveryTracking.length) {
      setSelectedItems(new Set());
    } else {
      setSelectedItems(new Set(sortedDeliveryTracking.map(item => item.id)));
    }
  };
  
  const toggleSelectItem = (id: string) => {
    const newSelected = new Set(selectedItems);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedItems(newSelected);
  };
  
  // CRUD handlers
  const handleEdit = (item: DeliveryTracking) => {
    setEditingItem(item);
    setEditDialogOpen(true);
  };
  
  const handleDelete = (item: DeliveryTracking) => {
    setItemToDelete(item);
    setDeleteDialogOpen(true);
  };
  
  const confirmDelete = async () => {
    if (!itemToDelete) return;
    
    try {
      const { error } = await supabase
        .from('delivery_tracking')
        .delete()
        .eq('id', itemToDelete.id);
      
      if (error) throw error;
      
      toast({
        title: "Success",
        description: "Delivery record deleted successfully.",
      });
      
      loadDeliveryTracking();
      setDeleteDialogOpen(false);
      setItemToDelete(null);
    } catch (e: any) {
      toast({
        title: "Error",
        description: e.message || "Failed to delete record.",
        variant: "destructive",
      });
    }
  };
  
  const confirmBulkDelete = async () => {
    if (selectedItems.size === 0) return;
    
    try {
      const { error } = await supabase
        .from('delivery_tracking')
        .delete()
        .in('id', Array.from(selectedItems));
      
      if (error) throw error;
      
      toast({
        title: "Success",
        description: `${selectedItems.size} delivery records deleted successfully.`,
      });
      
      setSelectedItems(new Set());
      loadDeliveryTracking();
      setBulkDeleteDialogOpen(false);
    } catch (e: any) {
      toast({
        title: "Error",
        description: e.message || "Failed to delete records.",
        variant: "destructive",
      });
    }
  };
  
  const saveEdit = async () => {
    if (!editingItem) return;
    
    try {
      const { error } = await supabase
        .from('delivery_tracking')
        .update({
          pickup_date: editingItem.pickup_date,
          consignment_number: editingItem.consignment_number,
          invoice_dc_no: editingItem.invoice_dc_no,
          store_code: editingItem.store_code,
          delivery_status: editingItem.delivery_status,
          comments: editingItem.comments,
          delivered_date: editingItem.delivered_date
        })
        .eq('id', editingItem.id);
      
      if (error) throw error;
      
      toast({
        title: "Success",
        description: "Delivery record updated successfully.",
      });
      
      loadDeliveryTracking();
      setEditDialogOpen(false);
      setEditingItem(null);
    } catch (e: any) {
      toast({
        title: "Error",
        description: e.message || "Failed to update record.",
        variant: "destructive",
      });
    }
  };
  
  const clearFilters = () => {
    setFilters({
      sr_no: '',
      pickup_date: '',
      consignment_number: '',
      invoice_dc_no: '',
      store_code: '',
      delivery_status: '',
      comments: '',
      delivered_date: ''
    });
  };



  if (!loading && !has('Inventory') && !has('Delivery')) {
    return (
      <div className="p-6">
        <Card>
          <CardHeader>
            <CardTitle>Access Restricted</CardTitle>
            <CardDescription>The Inventory/Delivery features are disabled for your account.</CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }
  const deliveredCount = inventory.filter((i) => i.status === "Delivered").length;
  const inTransitCount = inventory.filter((i) => i.status === "In Transit").length;
  const pendingCount = inventory.filter((i) => i.status === "Pending").length;
  const { deviceDeliveries, loading: deviceLoading, setStatus } = useDeviceDeliveries();

  return (
    <div className="flex flex-col gap-6 p-6">
      <Tabs defaultValue="deliveries" className="space-y-4">
        <TabsList>
          <TabsTrigger value="deliveries">Deliveries</TabsTrigger>
          <TabsTrigger value="inventory">Inventory</TabsTrigger>
        </TabsList>

        {/* Deliveries Tab */}
        <TabsContent value="deliveries">
          <div className="flex items-center justify-between">
            <div className="flex flex-col gap-2">
              <h1 className="text-3xl font-bold text-foreground">Deliveries</h1>
              <p className="text-muted-foreground">Track equipment deliveries and device shipments to your stores</p>
            </div>
            <Button className="bg-gradient-primary">
              <Package className="mr-2 h-4 w-4" />
              New Delivery
            </Button>
          </div>

          {/* Summary Cards */}
          <div className="grid gap-4 md:grid-cols-3 mt-4">
            <Card className="shadow-md">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Delivered</CardTitle>
                <CheckCircle2 className="h-4 w-4 text-success" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{deliveredCount}</div>
                <p className="text-xs text-muted-foreground">Completed deliveries</p>
              </CardContent>
            </Card>

            <Card className="shadow-md">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">In Transit</CardTitle>
                <Truck className="h-4 w-4 text-accent" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{inTransitCount}</div>
                <p className="text-xs text-muted-foreground">On the way</p>
              </CardContent>
            </Card>

            <Card className="shadow-md">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Pending</CardTitle>
                <Clock className="h-4 w-4 text-warning" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{pendingCount}</div>
                <p className="text-xs text-muted-foreground">Awaiting shipment</p>
              </CardContent>
            </Card>
          </div>

          {/* Delivery Tracking Table */}
          <Card className="shadow-md mt-4">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Delivery Tracking</CardTitle>
                  <CardDescription>Monitor all inventory deliveries across your stores</CardDescription>
                </div>
                <div className="flex gap-2">
                  {selectedItems.size > 0 && (
                    <Button 
                      variant="destructive" 
                      onClick={() => setBulkDeleteDialogOpen(true)}
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      Delete Selected ({selectedItems.size})
                    </Button>
                  )}
                  {Object.values(filters).some(f => f !== '') && (
                    <Button variant="outline" onClick={clearFilters}>
                      <X className="h-4 w-4 mr-2" />
                      Clear Filters
                    </Button>
                  )}
                  <Button variant="outline" onClick={downloadTemplate}>
                    <Download className="h-4 w-4 mr-2" />
                    Download Template
                  </Button>
                  <Button onClick={() => fileInputRef.current?.click()}>
                    <Upload className="h-4 w-4 mr-2" />
                    Bulk Upload
                  </Button>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".csv"
                    onChange={handleFileUpload}
                    style={{ display: 'none' }}
                  />
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {loadingTracking ? (
                <div className="text-center py-8">Loading delivery tracking data...</div>
              ) : deliveryTracking.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No delivery records found. Upload delivery data using the Bulk Upload button.
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-12">
                        <Checkbox
                          checked={selectedItems.size === sortedDeliveryTracking.length && sortedDeliveryTracking.length > 0}
                          onCheckedChange={toggleSelectAll}
                        />
                      </TableHead>
                      <TableHead onClick={() => handleSort('sr_no')} className="cursor-pointer hover:bg-muted/50">
                        <div className="flex items-center">SR. NO {getSortIcon('sr_no')}</div>
                      </TableHead>
                      <TableHead onClick={() => handleSort('pickup_date')} className="cursor-pointer hover:bg-muted/50">
                        <div className="flex items-center">PICKUP DATE {getSortIcon('pickup_date')}</div>
                      </TableHead>
                      <TableHead onClick={() => handleSort('consignment_number')} className="cursor-pointer hover:bg-muted/50">
                        <div className="flex items-center">CONSIGNMENT NUMBER {getSortIcon('consignment_number')}</div>
                      </TableHead>
                      <TableHead onClick={() => handleSort('invoice_dc_no')} className="cursor-pointer hover:bg-muted/50">
                        <div className="flex items-center">INVOICE / DC No. {getSortIcon('invoice_dc_no')}</div>
                      </TableHead>
                      <TableHead onClick={() => handleSort('store_code')} className="cursor-pointer hover:bg-muted/50">
                        <div className="flex items-center">STORE CODE {getSortIcon('store_code')}</div>
                      </TableHead>
                      <TableHead onClick={() => handleSort('delivery_status')} className="cursor-pointer hover:bg-muted/50">
                        <div className="flex items-center">DELIVERY STATUS {getSortIcon('delivery_status')}</div>
                      </TableHead>
                      <TableHead onClick={() => handleSort('comments')} className="cursor-pointer hover:bg-muted/50">
                        <div className="flex items-center">COMMENTS {getSortIcon('comments')}</div>
                      </TableHead>
                      <TableHead onClick={() => handleSort('delivered_date')} className="cursor-pointer hover:bg-muted/50">
                        <div className="flex items-center">DELIVERED DATE {getSortIcon('delivered_date')}</div>
                      </TableHead>
                      <TableHead>ACTIONS</TableHead>
                    </TableRow>
                    <TableRow>
                      <TableHead></TableHead>
                      <TableHead>
                        <Input
                          placeholder="Filter..."
                          value={filters.sr_no}
                          onChange={(e) => setFilters({ ...filters, sr_no: e.target.value })}
                          className="h-8"
                        />
                      </TableHead>
                      <TableHead>
                        <Input
                          type="date"
                          value={filters.pickup_date}
                          onChange={(e) => setFilters({ ...filters, pickup_date: e.target.value })}
                          className="h-8"
                        />
                      </TableHead>
                      <TableHead>
                        <Input
                          placeholder="Filter..."
                          value={filters.consignment_number}
                          onChange={(e) => setFilters({ ...filters, consignment_number: e.target.value })}
                          className="h-8"
                        />
                      </TableHead>
                      <TableHead>
                        <Input
                          placeholder="Filter..."
                          value={filters.invoice_dc_no}
                          onChange={(e) => setFilters({ ...filters, invoice_dc_no: e.target.value })}
                          className="h-8"
                        />
                      </TableHead>
                      <TableHead>
                        <Input
                          placeholder="Filter..."
                          value={filters.store_code}
                          onChange={(e) => setFilters({ ...filters, store_code: e.target.value })}
                          className="h-8"
                        />
                      </TableHead>
                      <TableHead>
                        <Input
                          placeholder="Filter..."
                          value={filters.delivery_status}
                          onChange={(e) => setFilters({ ...filters, delivery_status: e.target.value })}
                          className="h-8"
                        />
                      </TableHead>
                      <TableHead>
                        <Input
                          placeholder="Filter..."
                          value={filters.comments}
                          onChange={(e) => setFilters({ ...filters, comments: e.target.value })}
                          className="h-8"
                        />
                      </TableHead>
                      <TableHead>
                        <Input
                          type="date"
                          value={filters.delivered_date}
                          onChange={(e) => setFilters({ ...filters, delivered_date: e.target.value })}
                          className="h-8"
                        />
                      </TableHead>
                      <TableHead></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {sortedDeliveryTracking.map((item) => (
                      <TableRow key={item.id}>
                        <TableCell>
                          <Checkbox
                            checked={selectedItems.has(item.id)}
                            onCheckedChange={() => toggleSelectItem(item.id)}
                          />
                        </TableCell>
                        <TableCell className="font-medium">{item.sr_no}</TableCell>
                        <TableCell>{item.pickup_date ? new Date(item.pickup_date).toLocaleDateString() : '-'}</TableCell>
                        <TableCell className="font-mono text-sm">{item.consignment_number}</TableCell>
                        <TableCell>{item.invoice_dc_no}</TableCell>
                        <TableCell className="font-medium">{item.store_code}</TableCell>
                        <TableCell>
                          <Badge variant={getStatusVariant(item.delivery_status)} className="flex items-center gap-1 w-fit">
                            {getStatusIcon(item.delivery_status)}
                            {item.delivery_status}
                          </Badge>
                        </TableCell>
                        <TableCell className="max-w-xs truncate">{item.comments || '-'}</TableCell>
                        <TableCell>{item.delivered_date ? new Date(item.delivered_date).toLocaleDateString() : '-'}</TableCell>
                        <TableCell>
                          <div className="flex gap-2">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleEdit(item)}
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleDelete(item)}
                            >
                              <Trash2 className="h-4 w-4 text-destructive" />
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

          {/* Device Deliveries */}
          <Card className="shadow-md mt-4">
            <CardHeader>
              <CardTitle>Device Deliveries</CardTitle>
              <CardDescription>Delivery tracking with store and device information</CardDescription>
            </CardHeader>
            <CardContent>
              {loadingTracking ? (
                <div className="text-center py-8 text-gray-500">Loading delivery data...</div>
              ) : deliveryTracking.length === 0 ? (
                <div className="text-center py-8 text-gray-500">No delivery data available. Upload CSV to add records.</div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-12">
                        <Checkbox
                          checked={selectedItems.size === sortedDeliveryTracking.length && sortedDeliveryTracking.length > 0}
                          onCheckedChange={toggleSelectAll}
                        />
                      </TableHead>
                      <TableHead onClick={() => handleSort('sr_no')} className="cursor-pointer hover:bg-muted/50">
                        <div className="flex items-center">SR. NO {getSortIcon('sr_no')}</div>
                      </TableHead>
                      <TableHead onClick={() => handleSort('pickup_date')} className="cursor-pointer hover:bg-muted/50">
                        <div className="flex items-center">PICKUP DATE {getSortIcon('pickup_date')}</div>
                      </TableHead>
                      <TableHead onClick={() => handleSort('consignment_number')} className="cursor-pointer hover:bg-muted/50">
                        <div className="flex items-center">CONSIGNMENT NUMBER {getSortIcon('consignment_number')}</div>
                      </TableHead>
                      <TableHead onClick={() => handleSort('invoice_dc_no')} className="cursor-pointer hover:bg-muted/50">
                        <div className="flex items-center">INVOICE / DC No. {getSortIcon('invoice_dc_no')}</div>
                      </TableHead>
                      <TableHead onClick={() => handleSort('store_code')} className="cursor-pointer hover:bg-muted/50">
                        <div className="flex items-center">STORE CODE {getSortIcon('store_code')}</div>
                      </TableHead>
                      <TableHead onClick={() => handleSort('city')} className="cursor-pointer hover:bg-muted/50">
                        <div className="flex items-center">CITY {getSortIcon('city')}</div>
                      </TableHead>
                      <TableHead onClick={() => handleSort('store')} className="cursor-pointer hover:bg-muted/50">
                        <div className="flex items-center">STORE NAME {getSortIcon('store')}</div>
                      </TableHead>
                      <TableHead onClick={() => handleSort('delivery_status')} className="cursor-pointer hover:bg-muted/50">
                        <div className="flex items-center">DELIVERY STATUS {getSortIcon('delivery_status')}</div>
                      </TableHead>
                      <TableHead onClick={() => handleSort('comments')} className="cursor-pointer hover:bg-muted/50">
                        <div className="flex items-center">COMMENTS {getSortIcon('comments')}</div>
                      </TableHead>
                      <TableHead onClick={() => handleSort('delivered_date')} className="cursor-pointer hover:bg-muted/50">
                        <div className="flex items-center">DELIVERED DATE {getSortIcon('delivered_date')}</div>
                      </TableHead>
                      <TableHead>ACTIONS</TableHead>
                    </TableRow>
                    <TableRow>
                      <TableHead></TableHead>
                      <TableHead>
                        <Input
                          placeholder="Filter..."
                          value={filters.sr_no}
                          onChange={(e) => setFilters({ ...filters, sr_no: e.target.value })}
                          className="h-8"
                        />
                      </TableHead>
                      <TableHead>
                        <Input
                          type="date"
                          value={filters.pickup_date}
                          onChange={(e) => setFilters({ ...filters, pickup_date: e.target.value })}
                          className="h-8"
                        />
                      </TableHead>
                      <TableHead>
                        <Input
                          placeholder="Filter..."
                          value={filters.consignment_number}
                          onChange={(e) => setFilters({ ...filters, consignment_number: e.target.value })}
                          className="h-8"
                        />
                      </TableHead>
                      <TableHead>
                        <Input
                          placeholder="Filter..."
                          value={filters.invoice_dc_no}
                          onChange={(e) => setFilters({ ...filters, invoice_dc_no: e.target.value })}
                          className="h-8"
                        />
                      </TableHead>
                      <TableHead>
                        <Input
                          placeholder="Filter..."
                          value={filters.store_code}
                          onChange={(e) => setFilters({ ...filters, store_code: e.target.value })}
                          className="h-8"
                        />
                      </TableHead>
                      <TableHead></TableHead>
                      <TableHead></TableHead>
                      <TableHead>
                        <Input
                          placeholder="Filter..."
                          value={filters.delivery_status}
                          onChange={(e) => setFilters({ ...filters, delivery_status: e.target.value })}
                          className="h-8"
                        />
                      </TableHead>
                      <TableHead>
                        <Input
                          placeholder="Filter..."
                          value={filters.comments}
                          onChange={(e) => setFilters({ ...filters, comments: e.target.value })}
                          className="h-8"
                        />
                      </TableHead>
                      <TableHead>
                        <Input
                          type="date"
                          value={filters.delivered_date}
                          onChange={(e) => setFilters({ ...filters, delivered_date: e.target.value })}
                          className="h-8"
                        />
                      </TableHead>
                      <TableHead></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {sortedDeliveryTracking.map((item) => (
                      <TableRow key={item.id}>
                        <TableCell>
                          <Checkbox
                            checked={selectedItems.has(item.id)}
                            onCheckedChange={() => toggleSelectItem(item.id)}
                          />
                        </TableCell>
                        <TableCell className="font-medium">{item.sr_no}</TableCell>
                        <TableCell>{item.pickup_date ? new Date(item.pickup_date).toLocaleDateString() : '-'}</TableCell>
                        <TableCell className="font-mono text-sm">{item.consignment_number}</TableCell>
                        <TableCell>{item.invoice_dc_no}</TableCell>
                        <TableCell className="font-medium">{item.store_code}</TableCell>
                        <TableCell>{item.stores?.city || '-'}</TableCell>
                        <TableCell>{item.stores?.store || '-'}</TableCell>
                        <TableCell>
                          <Badge variant={getStatusVariant(item.delivery_status)} className="flex items-center gap-1 w-fit">
                            {getStatusIcon(item.delivery_status)}
                            {item.delivery_status}
                          </Badge>
                        </TableCell>
                        <TableCell className="max-w-xs truncate">{item.comments || '-'}</TableCell>
                        <TableCell>{item.delivered_date ? new Date(item.delivered_date).toLocaleDateString() : '-'}</TableCell>
                        <TableCell>
                          <div className="flex gap-2">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleEdit(item)}
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleDelete(item)}
                            >
                              <Trash2 className="h-4 w-4 text-destructive" />
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

        {/* Inventory Tab */}
        <TabsContent value="inventory">
          <Card className="shadow-md">
            <CardHeader>
              <CardTitle>Inventory</CardTitle>
              <CardDescription>Current stock summary per store</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Store</TableHead>
                    <TableHead>Items</TableHead>
                    <TableHead>Delivery Date</TableHead>
                    <TableHead>Tracking</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {inventory.map((item) => (
                    <TableRow key={`inv-${item.id}`}>
                      <TableCell className="font-medium">{item.store}</TableCell>
                      <TableCell>{item.items}</TableCell>
                      <TableCell>{item.deliveryDate}</TableCell>
                      <TableCell className="font-mono text-sm">{item.trackingNumber}</TableCell>
                      <TableCell>
                        <Badge variant={getStatusVariant(item.status)} className="flex items-center gap-1 w-fit">
                          {getStatusIcon(item.status)}
                          {item.status}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Edit Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Edit Delivery Record</DialogTitle>
            <DialogDescription>Update the delivery tracking information</DialogDescription>
          </DialogHeader>
          {editingItem && (
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="edit-sr-no">SR. NO</Label>
                  <Input
                    id="edit-sr-no"
                    type="number"
                    value={editingItem.sr_no}
                    onChange={(e) => setEditingItem({ ...editingItem, sr_no: parseInt(e.target.value) || 0 })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-pickup-date">Pickup Date</Label>
                  <Input
                    id="edit-pickup-date"
                    type="date"
                    value={editingItem.pickup_date || ''}
                    onChange={(e) => setEditingItem({ ...editingItem, pickup_date: e.target.value })}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-consignment">Consignment Number</Label>
                <Input
                  id="edit-consignment"
                  value={editingItem.consignment_number}
                  onChange={(e) => setEditingItem({ ...editingItem, consignment_number: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-invoice">Invoice / DC No.</Label>
                <Input
                  id="edit-invoice"
                  value={editingItem.invoice_dc_no}
                  onChange={(e) => setEditingItem({ ...editingItem, invoice_dc_no: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-store-code">Store Code</Label>
                <Input
                  id="edit-store-code"
                  value={editingItem.store_code}
                  onChange={(e) => setEditingItem({ ...editingItem, store_code: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-status">Delivery Status</Label>
                <Select
                  value={editingItem.delivery_status}
                  onValueChange={(value) => setEditingItem({ ...editingItem, delivery_status: value })}
                >
                  <SelectTrigger id="edit-status">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Pending">Pending</SelectItem>
                    <SelectItem value="In Transit">In Transit</SelectItem>
                    <SelectItem value="Delivered">Delivered</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-comments">Comments</Label>
                <Input
                  id="edit-comments"
                  value={editingItem.comments || ''}
                  onChange={(e) => setEditingItem({ ...editingItem, comments: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-delivered-date">Delivered Date</Label>
                <Input
                  id="edit-delivered-date"
                  type="date"
                  value={editingItem.delivered_date || ''}
                  onChange={(e) => setEditingItem({ ...editingItem, delivered_date: e.target.value })}
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={saveEdit}>Save Changes</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm Delete</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this delivery record?
            </DialogDescription>
          </DialogHeader>
          {itemToDelete && (
            <div className="py-4">
              <p className="text-sm text-muted-foreground">
                <strong>SR. NO:</strong> {itemToDelete.sr_no}<br />
                <strong>Consignment:</strong> {itemToDelete.consignment_number}<br />
                <strong>Store Code:</strong> {itemToDelete.store_code}
              </p>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={confirmDelete}>
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Bulk Delete Dialog */}
      <Dialog open={bulkDeleteDialogOpen} onOpenChange={setBulkDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm Bulk Delete</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete {selectedItems.size} selected delivery records?
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <p className="text-sm text-muted-foreground">
              This action cannot be undone. All selected records will be permanently deleted.
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setBulkDeleteDialogOpen(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={confirmBulkDelete}>
              Delete {selectedItems.size} Records
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Inventory;
