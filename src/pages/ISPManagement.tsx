import { useState, useEffect, useRef } from "react";
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
import { Wifi, Plus, Edit, Calendar, DollarSign, CheckCircle2, AlertCircle, Upload, Download, Trash2 } from "lucide-react";

type ISPProvider = {
  id: string;
  provider_id?: string;
  provider_name: string;
  city?: string;
  area?: string;
  contact_person?: string;
  contact_email?: string;
  email?: string;
  contact_phone?: string;
  operational_area?: string;
  service_type: string;
  cost_50mbps?: number;
  cost_100mbps?: number;
  cost_150mbps?: number;
  otc_charges?: number;
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

type StoreISPDetail = {
  id: string;
  store_code: string;
  isp1_status: string;
  isp1_provider: string;
  isp1_circuit_id: string;
  isp1_delivery_date?: string;
  isp2_status: string;
  isp2_provider: string;
  isp2_circuit_id: string;
  isp2_delivery_date?: string;
  created_at: string;
  stores?: {
    city: string;
    store: string;
  };
};

const serviceTypes = ['ISP', 'ISP & Engineer support', 'Broadband', 'Leased Line', 'MPLS', 'SD-WAN', 'Fiber', 'Wireless'];
const linkTypes = ['Primary', 'Backup', 'Load Balance'];
const billingCycles = ['Monthly', 'Quarterly', 'Yearly'];

export default function ISPManagement() {
  const { has, loading } = useFeatureFlags();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [providers, setProviders] = useState<ISPProvider[]>([]);
  const [connections, setConnections] = useState<ISPConnection[]>([]);
  const [tasks, setTasks] = useState<ISPTask[]>([]);
  const [storeISPDetails, setStoreISPDetails] = useState<StoreISPDetail[]>([]);
  const [stores, setStores] = useState<any[]>([]);
  const [filteredProviders, setFilteredProviders] = useState<ISPProvider[]>([]);
  const [loadingData, setLoadingData] = useState(true);
  const [loadingStoreISP, setLoadingStoreISP] = useState(true);
  const [providerDialogOpen, setProviderDialogOpen] = useState(false);
  const [connectionDialogOpen, setConnectionDialogOpen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [selectedProvider, setSelectedProvider] = useState<ISPProvider | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [providerToDelete, setProviderToDelete] = useState<ISPProvider | null>(null);
  const [activeView, setActiveView] = useState<'providers' | 'connections' | 'overview' | 'store-isp' | 'tasks'>('providers');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Form states
  const [providerForm, setProviderForm] = useState({
    provider_name: '',
    contact_person: '',
    contact_phone: '',
    email: '',
    city: '',
    area: '',
    operational_area: '',
    service_type: 'ISP',
    cost_50mbps: '',
    cost_100mbps: '',
    cost_150mbps: '',
    otc_charges: '',
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
    loadStoreISPDetails();
    loadStores();
  }, []);

  const loadStores = async () => {
    try {
      const { data, error } = await supabase
        .from('stores')
        .select('store_code, store, city')
        .order('store_code', { ascending: true });

      if (error) throw error;
      setStores(data || []);
    } catch (e) {
      console.error('loadStores error', e);
    }
  };

  const loadProviders = async () => {
    try {
      setLoadingData(true);
      const { data, error } = await supabase
        .from('isp_providers')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setProviders(data || []);
      setFilteredProviders(data || []);
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

  const loadStoreISPDetails = async () => {
    try {
      console.log('loadStoreISPDetails: Starting...');
      setLoadingStoreISP(true);
      const { data, error} = await supabase
        .from('store_isp_details')
        .select('*')
        .order('created_at', { ascending: false });

      console.log('loadStoreISPDetails: Query result:', { dataLength: data?.length, error });

      if (error) throw error;

      // Load store information separately
      if (data && data.length > 0) {
        const storeCodes = [...new Set(data.map(d => d.store_code))];
        console.log('loadStoreISPDetails: Loading stores for codes:', storeCodes);
        
        const { data: storesData } = await supabase
          .from('stores')
          .select('store_code, city, store')
          .in('store_code', storeCodes);
        
        console.log('loadStoreISPDetails: Stores data:', storesData);
        
        const storesMap = new Map(storesData?.map(s => [s.store_code, s]) || []);
        
        const enrichedData = data.map(item => ({
          ...item,
          stores: storesMap.get(item.store_code)
        }));
        
        console.log('loadStoreISPDetails: Setting enrichedData with', enrichedData.length, 'items');
        setStoreISPDetails(enrichedData);
      } else {
        console.log('loadStoreISPDetails: Setting empty/raw data');
        setStoreISPDetails(data || []);
      }
    } catch (e) {
      console.error('loadStoreISPDetails error', e);
    } finally {
      setLoadingStoreISP(false);
      console.log('loadStoreISPDetails: Complete');
    }
  };

  const downloadISPTemplate = () => {
    const headers = [
      'store_code',
      'ISP1_Status',
      'ISP1_Provider',
      'ISP1_Circuit_ID',
      'ISP1_Delivery_Date',
      'ISP2_Status',
      'ISP2_Provider',
      'ISP2_Circuit_ID',
      'ISP2_Delivery_Date'
    ];
    
    const sampleRow = [
      'BLR_KTHNUR_P01R1CC',
      'Delivered',
      'Airtel BB',
      'GTPL_AIROWIRE_171_25102025',
      '2025-10-28',
      'Assigned',
      'Jio Fiber',
      'JIO_BLR_12345',
      ''
    ];
    
    const csvContent = headers.join(',') + '\n' + sampleRow.join(',') + '\n';
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = 'store_isp_details_template.csv';
    link.click();
  };

  const convertDateFormat = (dateStr: string): string | null => {
    if (!dateStr || dateStr.trim() === '') return null;
    
    const trimmed = dateStr.trim();
    
    // If already in YYYY-MM-DD format
    if (trimmed.match(/^\d{4}-\d{2}-\d{2}$/)) {
      return trimmed;
    }
    
    // Convert DD-MM-YYYY to YYYY-MM-DD
    if (trimmed.match(/^\d{2}-\d{2}-\d{4}$/)) {
      const [day, month, year] = trimmed.split('-');
      return `${year}-${month}-${day}`;
    }
    
    return null;
  };

  const handleISPFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
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

      const rows = lines.slice(1);
      const ispDetails: any[] = [];
      const errors: string[] = [];
      
      for (let i = 0; i < rows.length; i++) {
        const line = rows[i].trim();
        if (!line) continue;
        
        const values = line.split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/).map(v => v.trim().replace(/^"(.*)"$/, '$1'));
        
        if (values.length < 5) {
          errors.push(`Row ${i + 2}: Not enough columns (expected 9, got ${values.length})`);
          continue;
        }

        // Convert dates from DD-MM-YYYY to YYYY-MM-DD
        const isp1Date = convertDateFormat(values[4]);
        const isp2Date = convertDateFormat(values[8]);

        if (values[4] && values[4].trim() !== '' && !isp1Date) {
          errors.push(`Row ${i + 2}: Invalid ISP1 delivery date format "${values[4]}". Use DD-MM-YYYY or YYYY-MM-DD`);
          continue;
        }

        if (values[8] && values[8].trim() !== '' && !isp2Date) {
          errors.push(`Row ${i + 2}: Invalid ISP2 delivery date format "${values[8]}". Use DD-MM-YYYY or YYYY-MM-DD`);
          continue;
        }

        const record: any = {
          store_code: values[0] || '',
          isp1_status: values[1] || 'Pending',
          isp1_provider: values[2] || null,
          isp1_circuit_id: values[3] || null,
          isp1_delivery_date: isp1Date,
          isp2_status: values[5] || 'Pending',
          isp2_provider: values[6] || null,
          isp2_circuit_id: values[7] || null,
          isp2_delivery_date: isp2Date
        };

        if (!record.store_code) {
          errors.push(`Row ${i + 2}: Missing required field (store_code)`);
          continue;
        }

        ispDetails.push(record);
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

      if (ispDetails.length === 0) {
        toast({
          title: "Error",
          description: "No valid data found in CSV file",
          variant: "destructive",
        });
        return;
      }

      console.log('Uploading ISP details:', ispDetails);
      
      const { data, error } = await supabase
        .from('store_isp_details')
        .upsert(ispDetails, { onConflict: 'store_code' })
        .select();

      if (error) {
        console.error('Database error:', error);
        throw error;
      }

      console.log('Upload successful, records inserted:', data);

      toast({
        title: "Success",
        description: `${ispDetails.length} store ISP records uploaded successfully.`,
      });

      await loadStoreISPDetails();
      
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    } catch (e: any) {
      console.error('handleISPFileUpload error', e);
      toast({
        title: "Upload Failed",
        description: e.message || "Please check the file format.",
        variant: "destructive",
      });
    }
  };

  const handleAddProvider = async () => {
    try {
      console.log('Attempting to add/update provider:', providerForm);
      
      // Convert string values to numbers for pricing fields
      const formData = {
        provider_name: providerForm.provider_name,
        contact_person: providerForm.contact_person || null,
        contact_phone: providerForm.contact_phone || null,
        email: providerForm.email || null,
        city: providerForm.city || null,
        area: providerForm.area || null,
        operational_area: providerForm.operational_area || null,
        service_type: providerForm.service_type,
        cost_50mbps: providerForm.cost_50mbps ? parseFloat(providerForm.cost_50mbps) : null,
        cost_100mbps: providerForm.cost_100mbps ? parseFloat(providerForm.cost_100mbps) : null,
        cost_150mbps: providerForm.cost_150mbps ? parseFloat(providerForm.cost_150mbps) : null,
        otc_charges: providerForm.otc_charges ? parseFloat(providerForm.otc_charges) : null,
        status: providerForm.status
      };
      
      let data, error;
      
      if (isEditMode && selectedProvider) {
        // Update existing provider
        const result = await supabase
          .from('isp_providers')
          .update(formData)
          .eq('id', selectedProvider.id)
          .select();
        data = result.data;
        error = result.error;
      } else {
        // Insert new provider
        const result = await supabase
          .from('isp_providers')
          .insert([formData])
          .select();
        data = result.data;
        error = result.error;
      }

      if (error) {
        console.error('Database error:', error);
        throw error;
      }

      console.log('Provider saved successfully:', data);

      toast({
        title: isEditMode ? "ISP Provider Updated" : "ISP Provider Added",
        description: isEditMode ? "ISP provider has been updated successfully." : "ISP provider has been registered successfully.",
      });

      setProviderDialogOpen(false);
      setIsEditMode(false);
      setSelectedProvider(null);
      setProviderForm({
        provider_name: '',
        contact_person: '',
        contact_phone: '',
        email: '',
        city: '',
        area: '',
        operational_area: '',
        service_type: 'ISP',
        cost_50mbps: '',
        cost_100mbps: '',
        cost_150mbps: '',
        otc_charges: '',
        status: 'Active'
      });
      loadProviders();
    } catch (e: any) {
      console.error('handleAddProvider error', e);
      toast({
        title: "Error",
        description: e.message || "Failed to add ISP provider. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleEditProvider = (provider: ISPProvider) => {
    setSelectedProvider(provider);
    setIsEditMode(true);
    setProviderForm({
      provider_name: provider.provider_name,
      contact_person: provider.contact_person || '',
      contact_phone: provider.contact_phone || '',
      email: provider.email || provider.contact_email || '',
      city: provider.city || '',
      area: provider.area || '',
      operational_area: provider.operational_area || '',
      service_type: provider.service_type,
      cost_50mbps: provider.cost_50mbps?.toString() || '',
      cost_100mbps: provider.cost_100mbps?.toString() || '',
      cost_150mbps: provider.cost_150mbps?.toString() || '',
      otc_charges: provider.otc_charges?.toString() || '',
      status: provider.status
    });
    setProviderDialogOpen(true);
  };

  const handleDeleteProvider = async () => {
    if (!providerToDelete) return;

    try {
      const { error } = await supabase
        .from('isp_providers')
        .delete()
        .eq('id', providerToDelete.id);

      if (error) throw error;

      toast({
        title: "ISP Provider Deleted",
        description: "ISP provider has been removed successfully.",
      });

      setDeleteDialogOpen(false);
      setProviderToDelete(null);
      loadProviders();
    } catch (e: any) {
      console.error('handleDeleteProvider error', e);
      toast({
        title: "Error",
        description: e.message || "Failed to delete ISP provider. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleStoreCodeChange = (storeCode: string) => {
    const selectedStore = stores.find(s => s.store_code === storeCode);
    
    if (selectedStore) {
      // Auto-fill store name
      setConnectionForm(prev => ({
        ...prev,
        store_code: storeCode,
        store_name: selectedStore.store
      }));

      // Filter ISP providers by matching city
      const filtered = providers.filter(p => 
        p.city.toLowerCase() === selectedStore.city.toLowerCase()
      );
      setFilteredProviders(filtered.length > 0 ? filtered : providers);
    } else {
      setConnectionForm(prev => ({
        ...prev,
        store_code: storeCode,
        store_name: ''
      }));
      setFilteredProviders(providers);
    }
  };

  const handleAddConnection = async () => {
    try {
      // Validate and format provisioned date
      let formattedDate = null;
      if (connectionForm.provisioned_date && connectionForm.provisioned_date.trim() !== '') {
        const dateValue = connectionForm.provisioned_date.trim();
        
        // Check if date is in DD-MM-YYYY format and convert to YYYY-MM-DD
        if (dateValue.match(/^\d{2}-\d{2}-\d{4}$/)) {
          const [day, month, year] = dateValue.split('-');
          formattedDate = `${year}-${month}-${day}`;
        } 
        // Check if already in YYYY-MM-DD format
        else if (dateValue.match(/^\d{4}-\d{2}-\d{2}$/)) {
          formattedDate = dateValue;
        }
        else {
          throw new Error('Invalid date format. Please use DD-MM-YYYY or YYYY-MM-DD format.');
        }
      }

      const { error } = await supabase
        .from('isp_connections')
        .insert([{
          ...connectionForm,
          monthly_cost: parseFloat(connectionForm.monthly_cost),
          provisioned_date: formattedDate
        }]);

      if (error) {
        console.error('Database error:', error);
        throw error;
      }

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
    } catch (e: any) {
      console.error('handleAddConnection error', e);
      toast({
        title: "Error",
        description: e.message || "Failed to add connection. Please check all fields and try again.",
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

      {/* Sub-menu Navigation */}
      <div className="mb-6 flex gap-2 border-b flex-wrap">
        <Button
          variant={activeView === 'providers' ? 'default' : 'ghost'}
          onClick={() => setActiveView('providers')}
          className="rounded-b-none"
        >
          ISP Providers
        </Button>
        <Button
          variant={activeView === 'connections' ? 'default' : 'ghost'}
          onClick={() => setActiveView('connections')}
          className="rounded-b-none"
        >
          Store Connections
        </Button>
        <Button
          variant={activeView === 'overview' ? 'default' : 'ghost'}
          onClick={() => setActiveView('overview')}
          className="rounded-b-none"
        >
          Subscription Overview
        </Button>
        <Button
          variant={activeView === 'store-isp' ? 'default' : 'ghost'}
          onClick={() => setActiveView('store-isp')}
          className="rounded-b-none"
        >
          Store ISP Details
        </Button>
        <Button
          variant={activeView === 'tasks' ? 'default' : 'ghost'}
          onClick={() => setActiveView('tasks')}
          className="rounded-b-none"
        >
          Tasks
        </Button>
      </div>

      {/* Providers View */}
      {activeView === 'providers' && (
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Registered ISP Providers</CardTitle>
                  <CardDescription>Manage ISP provider registrations by city and area</CardDescription>
                </div>
                <Dialog open={providerDialogOpen} onOpenChange={(open) => {
                  setProviderDialogOpen(open);
                  if (!open) {
                    setIsEditMode(false);
                    setSelectedProvider(null);
                    setProviderForm({
                      provider_name: '',
                      contact_person: '',
                      contact_phone: '',
                      email: '',
                      city: '',
                      area: '',
                      operational_area: '',
                      service_type: 'ISP',
                      cost_50mbps: '',
                      cost_100mbps: '',
                      cost_150mbps: '',
                      otc_charges: '',
                      status: 'Active'
                    });
                  }
                }}>
                  <DialogTrigger asChild>
                    <Button className="gap-2">
                      <Plus className="h-4 w-4" />
                      Add ISP Provider
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-2xl">
                    <DialogHeader>
                      <DialogTitle>{isEditMode ? 'Edit ISP Provider' : 'Register ISP Provider'}</DialogTitle>
                      <DialogDescription>{isEditMode ? 'Update ISP provider details' : 'Add ISP provider details'}</DialogDescription>
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
                          <Label>POC Name</Label>
                          <Input
                            value={providerForm.contact_person}
                            onChange={(e) => setProviderForm({ ...providerForm, contact_person: e.target.value })}
                            placeholder="Contact person name"
                          />
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label>Contact Number</Label>
                          <Input
                            value={providerForm.contact_phone}
                            onChange={(e) => setProviderForm({ ...providerForm, contact_phone: e.target.value })}
                            placeholder="9876543210"
                          />
                        </div>
                        <div>
                          <Label>Email</Label>
                          <Input
                            type="email"
                            value={providerForm.email}
                            onChange={(e) => setProviderForm({ ...providerForm, email: e.target.value })}
                            placeholder="contact@isp.com"
                          />
                        </div>
                      </div>
                      <div className="grid grid-cols-3 gap-4">
                        <div>
                          <Label>Office Location</Label>
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
                            placeholder="Karnataka"
                          />
                        </div>
                        <div>
                          <Label>Operational Area</Label>
                          <Input
                            value={providerForm.operational_area}
                            onChange={(e) => setProviderForm({ ...providerForm, operational_area: e.target.value })}
                            placeholder="Pan India"
                          />
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
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
                      <div className="border-t pt-4">
                        <Label className="text-base font-semibold mb-3 block">Pricing (INR/Month)</Label>
                        <div className="grid grid-cols-4 gap-4">
                          <div>
                            <Label className="text-sm">50 Mbps</Label>
                            <Input
                              type="number"
                              value={providerForm.cost_50mbps}
                              onChange={(e) => setProviderForm({ ...providerForm, cost_50mbps: e.target.value })}
                              placeholder="1050"
                            />
                          </div>
                          <div>
                            <Label className="text-sm">100 Mbps</Label>
                            <Input
                              type="number"
                              value={providerForm.cost_100mbps}
                              onChange={(e) => setProviderForm({ ...providerForm, cost_100mbps: e.target.value })}
                              placeholder="1200"
                            />
                          </div>
                          <div>
                            <Label className="text-sm">150 Mbps</Label>
                            <Input
                              type="number"
                              value={providerForm.cost_150mbps}
                              onChange={(e) => setProviderForm({ ...providerForm, cost_150mbps: e.target.value })}
                              placeholder="884"
                            />
                          </div>
                          <div>
                            <Label className="text-sm">OTC Charges</Label>
                            <Input
                              type="number"
                              value={providerForm.otc_charges}
                              onChange={(e) => setProviderForm({ ...providerForm, otc_charges: e.target.value })}
                              placeholder="1000"
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                    <DialogFooter>
                      <Button variant="outline" onClick={() => setProviderDialogOpen(false)}>Cancel</Button>
                      <Button onClick={handleAddProvider}>{isEditMode ? 'Update Provider' : 'Add Provider'}</Button>
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
                      <TableHead>Provider ID</TableHead>
                      <TableHead>Provider Name</TableHead>
                      <TableHead>POC</TableHead>
                      <TableHead>Contact Number</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Office Location</TableHead>
                      <TableHead>Operational Area</TableHead>
                      <TableHead>Service Type</TableHead>
                      <TableHead>50 Mbps</TableHead>
                      <TableHead>100 Mbps</TableHead>
                      <TableHead>150 Mbps</TableHead>
                      <TableHead>OTC</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {providers.map((provider) => (
                      <TableRow key={provider.id}>
                        <TableCell>
                          <Badge variant="outline" className="font-mono text-xs">
                            {provider.provider_id || provider.id.substring(0, 8).toUpperCase()}
                          </Badge>
                        </TableCell>
                        <TableCell className="font-medium">{provider.provider_name}</TableCell>
                        <TableCell>{provider.contact_person || '-'}</TableCell>
                        <TableCell>{provider.contact_phone || '-'}</TableCell>
                        <TableCell className="text-sm">{provider.email || provider.contact_email || '-'}</TableCell>
                        <TableCell>{provider.city || '-'}</TableCell>
                        <TableCell>{provider.operational_area || provider.area || '-'}</TableCell>
                        <TableCell>
                          <Badge variant="secondary" className="text-xs">{provider.service_type}</Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          {provider.cost_50mbps ? `₹${provider.cost_50mbps}` : '-'}
                        </TableCell>
                        <TableCell className="text-right">
                          {provider.cost_100mbps ? `₹${provider.cost_100mbps}` : '-'}
                        </TableCell>
                        <TableCell className="text-right">
                          {provider.cost_150mbps ? `₹${provider.cost_150mbps}` : '-'}
                        </TableCell>
                        <TableCell className="text-right">
                          {provider.otc_charges ? `₹${provider.otc_charges}` : '-'}
                        </TableCell>
                        <TableCell>
                          <Badge variant={provider.status === 'Active' ? 'default' : 'secondary'}>
                            {provider.status}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-2">
                            <Button 
                              size="sm" 
                              variant="outline"
                              onClick={() => handleEditProvider(provider)}
                            >
                              <Edit className="h-3 w-3 mr-1" />
                              Edit
                            </Button>
                            <Button 
                              size="sm" 
                              variant="destructive"
                              onClick={() => {
                                setProviderToDelete(provider);
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
      )}

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete ISP Provider</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this ISP provider? This action cannot be undone and will remove all associated connections.
            </DialogDescription>
          </DialogHeader>
          {providerToDelete && (
            <div className="py-4">
              <div className="rounded-lg bg-muted p-4 space-y-2">
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="font-mono">
                    {providerToDelete.provider_id || 'N/A'}
                  </Badge>
                  <div className="font-medium text-lg">{providerToDelete.provider_name}</div>
                </div>
                <div className="text-sm text-muted-foreground">
                  <div>Service Type: {providerToDelete.service_type}</div>
                  {providerToDelete.city && <div>Location: {providerToDelete.city}</div>}
                  {providerToDelete.contact_person && <div>Contact: {providerToDelete.contact_person}</div>}
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>Cancel</Button>
            <Button variant="destructive" onClick={handleDeleteProvider}>
              <Trash2 className="h-4 w-4 mr-2" />
              Delete Provider
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Connections View */}
      {activeView === 'connections' && (
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
                          <Label>Store Code</Label>
                          <Select
                            value={connectionForm.store_code}
                            onValueChange={handleStoreCodeChange}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Select store code" />
                            </SelectTrigger>
                            <SelectContent>
                              {stores.map((store) => (
                                <SelectItem key={store.store_code} value={store.store_code}>
                                  {store.store_code} - {store.city}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div>
                          <Label>Store Name</Label>
                          <Input
                            value={connectionForm.store_name}
                            readOnly
                            placeholder="Auto-filled after selecting store"
                            className="bg-muted"
                          />
                        </div>
                      </div>
                      <div>
                        <Label>
                          ISP Provider
                          {filteredProviders.length < providers.length && (
                            <span className="text-sm text-muted-foreground ml-2">
                              (Filtered by store city: {filteredProviders.length} matches)
                            </span>
                          )}
                        </Label>
                        <Select
                          value={connectionForm.isp_id}
                          onValueChange={(value) => setConnectionForm({ ...connectionForm, isp_id: value })}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select ISP provider" />
                          </SelectTrigger>
                          <SelectContent>
                            {filteredProviders.filter(p => p.status === 'Active').map(provider => (
                              <SelectItem key={provider.id} value={provider.id}>
                                {provider.provider_name} - {provider.city} ({provider.area})
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
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
                            placeholder="YYYY-MM-DD"
                          />
                          <p className="text-xs text-muted-foreground mt-1">Format: YYYY-MM-DD (e.g., 2025-11-24)</p>
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
      )}

      {/* Overview View */}
      {activeView === 'overview' && (
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
      )}

      {/* Store ISP Details View */}
      {activeView === 'store-isp' && (
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Store ISP Details</CardTitle>
                  <CardDescription>Manage ISP connections (ISP1 & ISP2) for each store with bulk upload</CardDescription>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" onClick={downloadISPTemplate}>
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
                    onChange={handleISPFileUpload}
                    style={{ display: 'none' }}
                  />
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {loadingStoreISP ? (
                <div className="text-center py-8">Loading store ISP details...</div>
              ) : storeISPDetails.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No store ISP details found. Upload data using the Bulk Upload button.
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>STORE CODE</TableHead>
                      <TableHead>CITY</TableHead>
                      <TableHead>STORE NAME</TableHead>
                      <TableHead>ISP 1 STATUS</TableHead>
                      <TableHead>ISP 1 PROVIDER</TableHead>
                      <TableHead>ISP 1 CIRCUIT ID</TableHead>
                      <TableHead>ISP 1 DELIVERY DATE</TableHead>
                      <TableHead>ISP 2 STATUS</TableHead>
                      <TableHead>ISP 2 PROVIDER</TableHead>
                      <TableHead>ISP 2 CIRCUIT ID</TableHead>
                      <TableHead>ISP 2 DELIVERY DATE</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {storeISPDetails.map((item) => (
                      <TableRow key={item.id}>
                        <TableCell className="font-medium">{item.store_code}</TableCell>
                        <TableCell>{item.stores?.city || '-'}</TableCell>
                        <TableCell>{item.stores?.store || '-'}</TableCell>
                        <TableCell>
                          <Badge variant={item.isp1_status === 'Delivered' ? 'default' : 'secondary'}>
                            {item.isp1_status}
                          </Badge>
                        </TableCell>
                        <TableCell>{item.isp1_provider || '-'}</TableCell>
                        <TableCell className="font-mono text-sm">{item.isp1_circuit_id || '-'}</TableCell>
                        <TableCell>{item.isp1_delivery_date ? new Date(item.isp1_delivery_date).toLocaleDateString() : '-'}</TableCell>
                        <TableCell>
                          <Badge variant={item.isp2_status === 'Delivered' ? 'default' : 'secondary'}>
                            {item.isp2_status}
                          </Badge>
                        </TableCell>
                        <TableCell>{item.isp2_provider || '-'}</TableCell>
                        <TableCell className="font-mono text-sm">{item.isp2_circuit_id || '-'}</TableCell>
                        <TableCell>{item.isp2_delivery_date ? new Date(item.isp2_delivery_date).toLocaleDateString() : '-'}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
      )}

      {/* Tasks View */}
      {activeView === 'tasks' && (
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
      )}
    </div>
  );
}
