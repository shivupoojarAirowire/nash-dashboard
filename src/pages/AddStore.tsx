import React from "react";
import { useForm, UseFormSetValue, UseFormWatch } from "react-hook-form";
import { useNavigate } from "react-router-dom";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { toast } from "@/components/ui/use-toast";
import { getStoresByCity, getUniqueCities, addStore, bulkAddStores, type StoreRow } from "@/integrations/supabase/stores";
import { BulkStoreUpload } from "@/components/BulkStoreUpload";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { Upload, Eye, CheckCircle, XCircle, Trash2, Pencil, ChevronDown, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

type FormValues = {
  priority: string;
  city: string;
  store: string;
  storeCode: string;
  address: string;
  poc: string;
  pocNo: string;
  siteReadiness: "Existing site" | "New site";
};

type StoreDetails = {
  id: string;
  store_code: string;
  city: string;
  store: string;
  address?: string;
  poc?: string;
  poc_no?: string;
  priority?: string;
  site_readiness?: string;
  created_at: string;
  deviceCount?: number;
  hasFloorPlan?: boolean;
  status?: string;
  cancel_remarks?: string;
  cancelled_at?: string;
};

type DeviceInfo = {
  id: string;
  type: string;
  make: string;
  model?: string;
  serial: string;
  in_use: boolean;
};

const AddStore: React.FC = () => {
  const navigate = useNavigate();
  const { register, handleSubmit, formState, setValue, watch, reset } = useForm<FormValues>({
    defaultValues: {
      priority: "Medium",
      city: "",
      store: "",
      storeCode: "",
      address: "",
      poc: "",
      pocNo: "",
      siteReadiness: "Existing site",
    },
  });

  // Watch city and store values for suggestions
  const selectedCity = watch("city");
  const selectedStore = watch("store") || "";
  const [storeSuggestions, setStoreSuggestions] = React.useState<StoreRow[]>([]);
  
  // State for store list and details
  const [storeList, setStoreList] = React.useState<StoreDetails[]>([]);
  const [loadingStores, setLoadingStores] = React.useState(false);
  const [selectedStoreForView, setSelectedStoreForView] = React.useState<StoreDetails | null>(null);
  const [deviceList, setDeviceList] = React.useState<DeviceInfo[]>([]);
  const [loadingDevices, setLoadingDevices] = React.useState(false);
  const [floorPlanFiles, setFloorPlanFiles] = React.useState<File[]>([]);
  const [uploadingFloorPlan, setUploadingFloorPlan] = React.useState(false);
  const [addStoreDialogOpen, setAddStoreDialogOpen] = React.useState(false);
  const [bulkUploadDialogOpen, setBulkUploadDialogOpen] = React.useState(false);
  const [editStoreDialogOpen, setEditStoreDialogOpen] = React.useState(false);
  const [editingStore, setEditingStore] = React.useState<StoreDetails | null>(null);
  
  // Filter states
  const [filterStoreCode, setFilterStoreCode] = React.useState("");
  const [filterCity, setFilterCity] = React.useState("");
  const [filterStoreName, setFilterStoreName] = React.useState("");
  
  // Pagination states
  const [currentPage, setCurrentPage] = React.useState(1);
  const [itemsPerPage, setItemsPerPage] = React.useState(100);
  
  // Collapsible state for city distribution
  const [isCityDistributionOpen, setIsCityDistributionOpen] = React.useState(false);
  
  // Cancel states
  const [cancelDialogOpen, setCancelDialogOpen] = React.useState(false);
  const [cancelingStore, setCancelingStore] = React.useState<StoreDetails | null>(null);
  const [cancelRemarks, setCancelRemarks] = React.useState("");
  
  // Tab state
  const [activeTab, setActiveTab] = React.useState<"existing" | "new" | "cancelled">("existing");

  // Load stores on component mount
  React.useEffect(() => {
    loadStores();
  }, []);

  // Reset to page 1 when filters change
  React.useEffect(() => {
    setCurrentPage(1);
  }, [filterStoreCode, filterCity, filterStoreName]);

  const loadStores = async () => {
    setLoadingStores(true);
    try {
      const { data: stores, error } = await supabase
        .from('stores')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Get device counts and floor plan status for each store
      const storesWithDetails = await Promise.all(
        (stores || []).map(async (store) => {
          // Get device count
          const { count: deviceCount } = await supabase
            .from('inventory')
            .select('*', { count: 'exact', head: true })
            .eq('store_code', store.store_code);

          // Check for floor plan in storage
          const { data: floorPlans } = await supabase
            .storage
            .from('floor-maps')
            .list(store.store_code);

          return {
            ...store,
            deviceCount: deviceCount || 0,
            hasFloorPlan: (floorPlans && floorPlans.length > 0) || false,
          };
        })
      );

      setStoreList(storesWithDetails);
    } catch (error) {
      console.error('Error loading stores:', error);
      toast({
        title: "Error",
        description: "Failed to load stores.",
        variant: "destructive",
      });
    } finally {
      setLoadingStores(false);
    }
  };

  // Update store suggestions when city changes
  React.useEffect(() => {
    async function updateSuggestions() {
      if (selectedCity) {
        const stores = await getStoresByCity(selectedCity);
        // Only set suggestions if store field is not empty and has 2 or more characters
        if (selectedStore.length >= 2) {
          const searchTerm = selectedStore.toLowerCase();
          const filtered = stores.filter(s => 
            s.store.toLowerCase().includes(searchTerm) || 
            s.store_code.toLowerCase().includes(searchTerm)
          );
          setStoreSuggestions(filtered);
        } else {
          // Show all stores in the city if no search term
          setStoreSuggestions(stores);
        }
      } else {
        setStoreSuggestions([]);
        setValue("store", "");
        setValue("storeCode", "");
      }
    }
    updateSuggestions();
  }, [selectedCity, selectedStore, setValue]);

  // Handle store selection
  const handleStoreSelect = (storeData: StoreRow) => {
    setValue("store", storeData.store);
    setValue("storeCode", storeData.store_code);
    setStoreSuggestions([]);
  };

  const onSubmit = async (data: FormValues) => {
    try {
      // Map UI-friendly options to DB enum values
      const siteReadinessDb = data.siteReadiness === "Existing site" ? "Ready" : "Not Ready";

      const newStore: Parameters<typeof addStore>[0] = {
        city: data.city,
        store: data.store,
        store_code: data.storeCode,
        address: data.address,
        poc: data.poc,
        poc_no: data.pocNo,
        priority: data.priority as "High" | "Medium" | "Low",
        site_readiness: siteReadinessDb as "Ready" | "Not Ready" | "Partial"
      };
      
      await addStore(newStore);
      
      // Upload floor plans if selected
      if (floorPlanFiles.length > 0) {
        await uploadFloorPlans(data.storeCode);
      }
      
      toast({ title: "Store added", description: `${data.store} (${data.storeCode}) added successfully.` });
      reset();
      setFloorPlanFiles([]);
      loadStores(); // Refresh the store list
    } catch (error) {
      console.error("Failed to add store:", error);
      toast({ 
        title: "Error adding store", 
        description: "Failed to add store. Please try again.",
        variant: "destructive"
      });
    }
  };

  const uploadFloorPlans = async (storeCode: string) => {
    if (floorPlanFiles.length === 0) return;
    
    setUploadingFloorPlan(true);
    try {
      let successCount = 0;
      let errorCount = 0;
      const uploadedRecords: { file_path: string; file_name: string; file_url?: string }[] = [];

      for (const file of floorPlanFiles) {
        try {
          const fileExt = file.name.split('.').pop();
          const fileName = `${file.name.replace(/\.[^/.]+$/, '')}-${Date.now()}.${fileExt}`;
          const filePath = `${storeCode}/${fileName}`;

          const { error: uploadError } = await supabase.storage
            .from('floor-maps')
            .upload(filePath, file);

          if (uploadError) throw uploadError;
          successCount++;
          // collect metadata for DB insert
          const publicUrl = supabase.storage.from('floor-maps').getPublicUrl(filePath).data?.publicUrl;
          uploadedRecords.push({ file_path: filePath, file_name: fileName, file_url: publicUrl });
        } catch (error) {
          console.error(`Error uploading ${file.name}:`, error);
          errorCount++;
        }
      }

      if (successCount > 0) {
        // Persist uploaded file metadata to DB
        try {
          const recordsToInsert = uploadedRecords.map(r => ({
            store_code: storeCode,
            file_path: r.file_path,
            file_name: r.file_name,
            file_url: r.file_url || null
          }));

          const { error: insertError } = await supabase
            .from('store_floor_plans')
            .insert(recordsToInsert);

          if (insertError) console.warn('Failed to persist floor plan metadata:', insertError);
        } catch (err) {
          console.warn('Error inserting floor plan metadata:', err);
        }

        toast({
          title: "Success",
          description: `${successCount} floor plan(s) uploaded successfully.${errorCount > 0 ? ` ${errorCount} failed.` : ''}`,
        });
      } else {
        throw new Error('All uploads failed');
      }
    } catch (error) {
      console.error('Error uploading floor plans:', error);
      toast({
        title: "Error",
        description: "Failed to upload floor plans.",
        variant: "destructive",
      });
    } finally {
      setUploadingFloorPlan(false);
    }
  };

  const handleViewDevices = async (store: StoreDetails) => {
    setSelectedStoreForView(store);
    setLoadingDevices(true);
    
    try {
      const { data: devices, error } = await supabase
        .from('inventory')
        .select('*')
        .eq('store_code', store.store_code);

      if (error) throw error;

      setDeviceList(devices || []);
    } catch (error) {
      console.error('Error loading devices:', error);
      toast({
        title: "Error",
        description: "Failed to load device information.",
        variant: "destructive",
      });
    } finally {
      setLoadingDevices(false);
    }
  };

  const handleEditStore = (store: StoreDetails) => {
    setEditingStore(store);
    // Populate form with store data
    setValue("priority", store.priority || "Medium");
    setValue("city", store.city);
    setValue("store", store.store);
    setValue("storeCode", store.store_code);
    setValue("address", store.address || "");
    setValue("poc", store.poc || "");
    setValue("pocNo", store.poc_no || "");
    setValue("siteReadiness", store.site_readiness === "Ready" ? "Existing site" : "New site");
    setEditStoreDialogOpen(true);
  };

  const handleUpdateStore = async (data: FormValues) => {
    if (!editingStore) return;

    try {
      const siteReadinessDb = data.siteReadiness === "Existing site" ? "Ready" : "Not Ready";

      const { error } = await supabase
        .from('stores')
        .update({
          city: data.city,
          store: data.store,
          store_code: data.storeCode,
          address: data.address,
          poc: data.poc,
          poc_no: data.pocNo,
          priority: data.priority as "High" | "Medium" | "Low",
          site_readiness: siteReadinessDb as "Ready" | "Not Ready" | "Partial"
        })
        .eq('id', editingStore.id);

      if (error) throw error;

      // Upload floor plans if selected
      if (floorPlanFiles.length > 0) {
        await uploadFloorPlans(data.storeCode);
      }

      toast({
        title: "Success",
        description: "Store updated successfully.",
      });

      setEditStoreDialogOpen(false);
      setEditingStore(null);
      reset();
      setFloorPlanFiles([]);
      loadStores();
    } catch (error) {
      console.error('Error updating store:', error);
      toast({
        title: "Error",
        description: "Failed to update store.",
        variant: "destructive",
      });
    }
  };

  const handleDeleteStore = async (storeId: string, storeCode: string) => {
    if (!confirm('Are you sure you want to delete this store? This action cannot be undone.')) {
      return;
    }

    try {
      const { error } = await supabase
        .from('stores')
        .delete()
        .eq('id', storeId);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Store deleted successfully.",
      });
      loadStores();
    } catch (error) {
      console.error('Error deleting store:', error);
      toast({
        title: "Error",
        description: "Failed to delete store.",
        variant: "destructive",
      });
    }
  };

  const handleCancelStore = (store: StoreDetails) => {
    setCancelingStore(store);
    setCancelRemarks("");
    setCancelDialogOpen(true);
  };

  const confirmCancelStore = async () => {
    if (!cancelingStore || !cancelRemarks.trim()) {
      toast({
        title: "Error",
        description: "Please provide remarks for cancellation.",
        variant: "destructive",
      });
      return;
    }

    try {
      const { error } = await supabase
        .from('stores')
        .update({ 
          status: 'cancelled',
          cancel_remarks: cancelRemarks,
          cancelled_at: new Date().toISOString()
        })
        .eq('id', cancelingStore.id);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Store cancelled successfully.",
      });
      
      setCancelDialogOpen(false);
      setCancelingStore(null);
      setCancelRemarks("");
      loadStores();
    } catch (error) {
      console.error('Error cancelling store:', error);
      toast({
        title: "Error",
        description: "Failed to cancel store.",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header with Action Buttons */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Store Management</h1>
          <p className="text-muted-foreground mt-1">Manage store locations, devices, and floor plans</p>
        </div>
        <div className="flex gap-2">
          <Dialog open={addStoreDialogOpen} onOpenChange={setAddStoreDialogOpen}>
            <DialogTrigger asChild>
              <Button>Add Store</Button>
            </DialogTrigger>
            <DialogContent className="max-w-3xl max-h-[90vh] overflow-auto">
              <DialogHeader>
                <DialogTitle>Add New Store</DialogTitle>
                <DialogDescription>Fill the form to register a new store location and upload floor plans.</DialogDescription>
              </DialogHeader>
              <form onSubmit={handleSubmit(async (data) => {
                await onSubmit(data);
                setAddStoreDialogOpen(false);
              })} className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div>
                  <Label>Priority</Label>
                  <select {...register("priority")} className="mt-1 block w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
                    <option>High</option>
                    <option>Medium</option>
                    <option>Low</option>
                  </select>
                </div>

                <div className="relative">
                  <Label>City</Label>
                  <Input {...register("city", { required: true })} autoComplete="off" />
                  <CitySuggestions watch={watch} setValue={setValue} />
                </div>

                <div className="relative">
                  <Label>Store</Label>
                  <Input {...register("store", { required: true })} autoComplete="off" />
                  <StoreSuggestions 
                    suggestions={storeSuggestions} 
                    onSelect={handleStoreSelect}
                  />
                </div>

                <div>
                  <Label>Store Code</Label>
                  <Input {...register("storeCode", { required: true })} />
                </div>

                <div className="md:col-span-2">
                  <Label>Address</Label>
                  <Textarea {...register("address")} />
                </div>

                <div>
                  <Label>POC</Label>
                  <Input {...register("poc")} />
                </div>

                <div>
                  <Label>POC No</Label>
                  <Input {...register("pocNo")} />
                </div>

                <div>
                  <Label>Site readiness</Label>
                  <select {...register("siteReadiness")} className="mt-1 block w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
                    <option>Existing site</option>
                    <option>New site</option>
                  </select>
                </div>

                <div className="md:col-span-2">
                  <Label>Floor Plans (Optional - Multiple files allowed)</Label>
                  <div className="mt-2 space-y-2">
                    <Input
                      type="file"
                      accept=".pdf,.png,.jpg,.jpeg,.dwg"
                      multiple
                      onChange={(e) => {
                        const files = Array.from(e.target.files || []);
                        setFloorPlanFiles(files);
                      }}
                    />
                    {floorPlanFiles.length > 0 && (
                      <div className="flex flex-wrap gap-2">
                        {floorPlanFiles.map((file, index) => (
                          <Badge key={index} variant="outline" className="flex items-center gap-1">
                            <Upload className="h-3 w-3" />
                            {file.name}
                            <button
                              type="button"
                              onClick={() => setFloorPlanFiles(files => files.filter((_, i) => i !== index))}
                              className="ml-1 hover:text-destructive"
                            >
                              ×
                            </button>
                          </Badge>
                        ))}
                      </div>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    Supported formats: PDF, PNG, JPG, DWG. You can select multiple files.
                  </p>
                </div>

                <div className="md:col-span-2 flex items-center justify-end gap-2">
                  <Button type="button" variant="outline" onClick={() => setAddStoreDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button type="submit" disabled={uploadingFloorPlan}>
                    {uploadingFloorPlan ? "Creating..." : "Create Store"}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>

          <Dialog open={bulkUploadDialogOpen} onOpenChange={setBulkUploadDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="outline">
                <Upload className="h-4 w-4 mr-2" />
                Bulk Upload
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-4xl max-h-[90vh] overflow-auto">
              <DialogHeader>
                <DialogTitle>Bulk Store Upload</DialogTitle>
                <DialogDescription>Upload multiple stores at once using CSV file</DialogDescription>
              </DialogHeader>
              <BulkStoreUpload />
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Facts Cards - Store Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">Existing Stores</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-blue-600">
              {storeList.filter(s => s.status !== 'cancelled' && (s.site_readiness || '').trim().toLowerCase() === 'existing site').length}
            </div>
            <p className="text-xs text-muted-foreground mt-1">Existing sites</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">New Stores</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-green-600">
              {storeList.filter(s => s.status !== 'cancelled' && (s.site_readiness || '').trim().toLowerCase() === 'new site').length}
            </div>
            <p className="text-xs text-muted-foreground mt-1">New sites</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">Cancelled Stores</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-orange-600">
              {storeList.filter(s => s.status === 'cancelled').length}
            </div>
            <p className="text-xs text-muted-foreground mt-1">Cancelled locations</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Cities</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">
              {new Set(storeList.map(s => s.city)).size}
            </div>
            <p className="text-xs text-muted-foreground mt-1">Unique cities</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">Stores with Devices</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">
              {storeList.filter(s => (s.deviceCount || 0) > 0).length}
            </div>
            <p className="text-xs text-muted-foreground mt-1">Have allocated devices</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">Stores with Floor Plans</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">
              {storeList.filter(s => s.hasFloorPlan).length}
            </div>
            <p className="text-xs text-muted-foreground mt-1">Floor plans uploaded</p>
          </CardContent>
        </Card>
      </div>

      {/* City-wise Store Distribution */}
      <Collapsible open={isCityDistributionOpen} onOpenChange={setIsCityDistributionOpen}>
        <Card>
          <CollapsibleTrigger asChild>
            <CardHeader className="cursor-pointer hover:bg-accent/50 transition-colors">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>City-wise Store Distribution</CardTitle>
                  <CardDescription>Number of stores in each city</CardDescription>
                </div>
                <ChevronDown 
                  className={`h-5 w-5 transition-transform duration-200 ${isCityDistributionOpen ? 'transform rotate-180' : ''}`}
                />
              </div>
            </CardHeader>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {(() => {
                  const cityGroups = storeList.reduce((acc, store) => {
                    const city = store.city || "Unknown";
                    acc[city] = (acc[city] || 0) + 1;
                    return acc;
                  }, {} as Record<string, number>);

                  const sortedCities = Object.entries(cityGroups).sort((a, b) => b[1] - a[1]);

                  return sortedCities.map(([city, count]) => (
                    <div key={city} className="flex items-center justify-between p-3 border rounded-lg hover:bg-accent transition-colors">
                      <div>
                        <p className="font-medium">{city}</p>
                        <p className="text-sm text-muted-foreground">
                          {((count / storeList.length) * 100).toFixed(1)}% of total
                        </p>
                      </div>
                      <div className="text-2xl font-bold text-primary">{count}</div>
                    </div>
                  ));
                })()}
              </div>
            </CardContent>
          </CollapsibleContent>
        </Card>
      </Collapsible>

      {/* Edit Store Dialog */}
      <Dialog open={editStoreDialogOpen} onOpenChange={setEditStoreDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-auto">
          <DialogHeader>
            <DialogTitle>Edit Store</DialogTitle>
            <DialogDescription>Update store information and floor plans.</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit(async (data) => {
            await handleUpdateStore(data);
          })} className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div>
              <Label>Priority</Label>
              <select {...register("priority")} className="mt-1 block w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
                <option>High</option>
                <option>Medium</option>
                <option>Low</option>
              </select>
            </div>

            <div className="relative">
              <Label>City</Label>
              <Input {...register("city", { required: true })} autoComplete="off" />
              <CitySuggestions watch={watch} setValue={setValue} />
            </div>

            <div className="relative">
              <Label>Store</Label>
              <Input {...register("store", { required: true })} autoComplete="off" />
              <StoreSuggestions 
                suggestions={storeSuggestions} 
                onSelect={handleStoreSelect}
              />
            </div>

            <div>
              <Label>Store Code</Label>
              <Input {...register("storeCode", { required: true })} />
            </div>

            <div className="md:col-span-2">
              <Label>Address</Label>
              <Textarea {...register("address")} />
            </div>

            <div>
              <Label>POC</Label>
              <Input {...register("poc")} />
            </div>

            <div>
              <Label>POC No</Label>
              <Input {...register("pocNo")} />
            </div>

            <div>
              <Label>Site readiness</Label>
              <select {...register("siteReadiness")} className="mt-1 block w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
                <option>Existing site</option>
                <option>New site</option>
              </select>
            </div>

            <div className="md:col-span-2">
              <Label>Floor Plans (Optional - Multiple files allowed)</Label>
              <div className="mt-2 space-y-2">
                <Input
                  type="file"
                  accept=".pdf,.png,.jpg,.jpeg,.dwg"
                  multiple
                  onChange={(e) => {
                    const files = Array.from(e.target.files || []);
                    setFloorPlanFiles(files);
                  }}
                />
                {floorPlanFiles.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {floorPlanFiles.map((file, index) => (
                      <Badge key={index} variant="outline" className="flex items-center gap-1">
                        <Upload className="h-3 w-3" />
                        {file.name}
                        <button
                          type="button"
                          onClick={() => setFloorPlanFiles(files => files.filter((_, i) => i !== index))}
                          className="ml-1 hover:text-destructive"
                        >
                          ×
                        </button>
                      </Badge>
                    ))}
                  </div>
                )}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Supported formats: PDF, PNG, JPG, DWG. You can select multiple files.
              </p>
            </div>

            <div className="md:col-span-2 flex items-center justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => {
                setEditStoreDialogOpen(false);
                setEditingStore(null);
                reset();
                setFloorPlanFiles([]);
              }}>
                Cancel
              </Button>
              <Button type="submit" disabled={uploadingFloorPlan}>
                {uploadingFloorPlan ? "Updating..." : "Update Store"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Cancel Store Dialog */}
      <Dialog open={cancelDialogOpen} onOpenChange={setCancelDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Cancel Store</DialogTitle>
            <DialogDescription>
              You are about to cancel <strong>{cancelingStore?.store}</strong> (Code: {cancelingStore?.store_code}). 
              Please provide remarks for this cancellation.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="cancel-remarks">Remarks *</Label>
              <Textarea
                id="cancel-remarks"
                placeholder="Enter the reason for cancelling this store..."
                value={cancelRemarks}
                onChange={(e) => setCancelRemarks(e.target.value)}
                rows={4}
                className="mt-1"
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setCancelDialogOpen(false);
                  setCancelingStore(null);
                  setCancelRemarks("");
                }}
              >
                Close
              </Button>
              <Button
                type="button"
                variant="destructive"
                onClick={confirmCancelStore}
                disabled={!cancelRemarks.trim()}
              >
                Confirm Cancel
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Store List with Tabs */}
      <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as "existing" | "new" | "cancelled")} className="w-full">
        <TabsList className="grid w-full max-w-2xl grid-cols-3">
          <TabsTrigger value="existing">Existing Stores</TabsTrigger>
          <TabsTrigger value="new">New Stores</TabsTrigger>
          <TabsTrigger value="cancelled">Cancelled Stores</TabsTrigger>
        </TabsList>

        <TabsContent value="existing" className="mt-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Existing Stores</CardTitle>
                  <CardDescription>View all existing site stores with device information and floor plans</CardDescription>
                </div>
                {(filterStoreCode || filterCity || filterStoreName) && (
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => {
                      setFilterStoreCode("");
                      setFilterCity("");
                      setFilterStoreName("");
                    }}
                  >
                    <XCircle className="h-4 w-4 mr-2" />
                    Clear Filters
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent>
          {loadingStores ? (
            <div className="text-center py-8 text-muted-foreground">Loading stores...</div>
          ) : storeList.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No stores added yet. Add a store using the form above.
            </div>
          ) : (
            <>
              {/* Top Pagination Controls */}
              {(() => {
                const filteredStores = storeList.filter((store) => {
                  // Filter out cancelled stores and only show existing site stores
                  if (store.status === 'cancelled') return false;
                  // Check for "Existing site" (case-insensitive and trim whitespace)
                  const siteReadiness = (store.site_readiness || '').trim().toLowerCase();
                  if (siteReadiness !== 'existing site') return false;
                  
                  const matchesStoreCode = !filterStoreCode || 
                    store.store_code.toLowerCase().includes(filterStoreCode.toLowerCase());
                  const matchesCity = !filterCity || 
                    store.city.toLowerCase().includes(filterCity.toLowerCase());
                  const matchesStoreName = !filterStoreName || 
                    store.store.toLowerCase().includes(filterStoreName.toLowerCase());
                  return matchesStoreCode && matchesCity && matchesStoreName;
                });
                
                const totalPages = Math.ceil(filteredStores.length / itemsPerPage);
                const startIndex = (currentPage - 1) * itemsPerPage;
                const endIndex = Math.min(startIndex + itemsPerPage, filteredStores.length);
                
                return (
                  <div className="flex items-center justify-between px-6 py-4 border-b">
                    <div className="flex items-center gap-4">
                      <div className="text-sm text-muted-foreground">
                        Showing {filteredStores.length === 0 ? 0 : startIndex + 1} to {endIndex} of {filteredStores.length} stores
                      </div>
                      <div className="flex items-center gap-2">
                        <label className="text-sm text-muted-foreground">Rows per page:</label>
                        <Select value={itemsPerPage.toString()} onValueChange={(val) => {
                          setItemsPerPage(parseInt(val));
                          setCurrentPage(1);
                        }}>
                          <SelectTrigger className="w-[100px]">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="50">50</SelectItem>
                            <SelectItem value="100">100</SelectItem>
                            <SelectItem value="200">200</SelectItem>
                            <SelectItem value="500">500</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    {totalPages > 1 && (
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                          disabled={currentPage === 1}
                        >
                          Previous
                        </Button>
                        <div className="flex items-center gap-2 px-3">
                          <span className="text-sm">Page {currentPage} of {totalPages}</span>
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                          disabled={currentPage >= totalPages}
                        >
                          Next
                        </Button>
                      </div>
                    )}
                  </div>
                );
              })()}
              
              <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Store Code</TableHead>
                  <TableHead>City</TableHead>
                  <TableHead>Store Name</TableHead>
                  <TableHead>Total Devices</TableHead>
                  <TableHead>Floor Plan</TableHead>
                  <TableHead>Device Data</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
                <TableRow>
                  <TableHead>
                    <Input
                      placeholder="Filter..."
                      value={filterStoreCode}
                      onChange={(e) => setFilterStoreCode(e.target.value)}
                      className="h-8"
                    />
                  </TableHead>
                  <TableHead>
                    <Input
                      placeholder="Filter..."
                      value={filterCity}
                      onChange={(e) => setFilterCity(e.target.value)}
                      className="h-8"
                    />
                  </TableHead>
                  <TableHead>
                    <Input
                      placeholder="Filter..."
                      value={filterStoreName}
                      onChange={(e) => setFilterStoreName(e.target.value)}
                      className="h-8"
                    />
                  </TableHead>
                  <TableHead></TableHead>
                  <TableHead></TableHead>
                  <TableHead></TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(() => {
                  const filteredStores = storeList.filter((store) => {
                    // Filter out cancelled stores and only show existing site stores
                    if (store.status === 'cancelled') return false;
                    // Check for "Existing site" (case-insensitive and trim whitespace)
                    const siteReadiness = (store.site_readiness || '').trim().toLowerCase();
                    if (siteReadiness !== 'existing site') return false;
                    
                    const matchesStoreCode = !filterStoreCode || 
                      store.store_code.toLowerCase().includes(filterStoreCode.toLowerCase());
                    const matchesCity = !filterCity || 
                      store.city.toLowerCase().includes(filterCity.toLowerCase());
                    const matchesStoreName = !filterStoreName || 
                      store.store.toLowerCase().includes(filterStoreName.toLowerCase());
                    return matchesStoreCode && matchesCity && matchesStoreName;
                  });
                  
                  const totalPages = Math.ceil(filteredStores.length / itemsPerPage);
                  const startIndex = (currentPage - 1) * itemsPerPage;
                  const endIndex = startIndex + itemsPerPage;
                  const paginatedStores = filteredStores.slice(startIndex, endIndex);
                  
                  return paginatedStores.map((store) => (
                  <TableRow key={store.id}>
                    <TableCell className="font-mono font-medium">{store.store_code}</TableCell>
                    <TableCell>{store.city}</TableCell>
                    <TableCell>{store.store}</TableCell>
                    <TableCell>
                      <Badge variant="secondary">{store.deviceCount || 0}</Badge>
                    </TableCell>
                    <TableCell>
                      {store.hasFloorPlan ? (
                        <Badge variant="default" className="flex items-center gap-1 w-fit">
                          <CheckCircle className="h-3 w-3" />
                          Yes
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="flex items-center gap-1 w-fit">
                          <XCircle className="h-3 w-3" />
                          No
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      <Dialog>
                        <DialogTrigger asChild>
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => handleViewDevices(store)}
                          >
                            <Eye className="h-4 w-4 mr-2" />
                            View
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="max-w-4xl max-h-[80vh] overflow-auto">
                          <DialogHeader>
                            <DialogTitle>Device Information - {store.store}</DialogTitle>
                            <DialogDescription>
                              Store Code: {store.store_code} | City: {store.city}
                            </DialogDescription>
                          </DialogHeader>
                          {loadingDevices ? (
                            <div className="text-center py-8">Loading devices...</div>
                          ) : deviceList.length === 0 ? (
                            <div className="text-center py-8 text-muted-foreground">
                              No devices allocated to this store yet.
                            </div>
                          ) : (
                            <Table>
                              <TableHeader>
                                <TableRow>
                                  <TableHead>Type</TableHead>
                                  <TableHead>Make</TableHead>
                                  <TableHead>Model</TableHead>
                                  <TableHead>Serial Number</TableHead>
                                  <TableHead>Status</TableHead>
                                </TableRow>
                              </TableHeader>
                              <TableBody>
                                {deviceList.map((device) => (
                                  <TableRow key={device.id}>
                                    <TableCell className="font-medium">{device.type}</TableCell>
                                    <TableCell>{device.make}</TableCell>
                                    <TableCell>{device.model || '-'}</TableCell>
                                    <TableCell className="font-mono text-sm">{device.serial}</TableCell>
                                    <TableCell>
                                      <Badge variant={device.in_use ? "default" : "secondary"}>
                                        {device.in_use ? "In Use" : "Free"}
                                      </Badge>
                                    </TableCell>
                                  </TableRow>
                                ))}
                              </TableBody>
                            </Table>
                          )}
                        </DialogContent>
                      </Dialog>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEditStore(store)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleCancelStore(store)}
                        >
                          <X className="h-4 w-4 text-orange-500" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeleteStore(store.id, store.store_code)}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                  ));
                })()}
              </TableBody>
            </Table>
            
            {/* Bottom Pagination Controls */}
          {!loadingStores && storeList.length > 0 && (() => {
            const filteredStores = storeList.filter((store) => {
              // Filter out cancelled stores and only show existing site stores
              if (store.status === 'cancelled') return false;
              // Check for "Existing site" (case-insensitive and trim whitespace)
              const siteReadiness = (store.site_readiness || '').trim().toLowerCase();
              if (siteReadiness !== 'existing site') return false;
              
              const matchesStoreCode = !filterStoreCode || 
                store.store_code.toLowerCase().includes(filterStoreCode.toLowerCase());
              const matchesCity = !filterCity || 
                store.city.toLowerCase().includes(filterCity.toLowerCase());
              const matchesStoreName = !filterStoreName || 
                store.store.toLowerCase().includes(filterStoreName.toLowerCase());
              return matchesStoreCode && matchesCity && matchesStoreName;
            });
            
            const totalPages = Math.ceil(filteredStores.length / itemsPerPage);
            const startIndex = (currentPage - 1) * itemsPerPage;
            const endIndex = Math.min(startIndex + itemsPerPage, filteredStores.length);
            
            return (
              <div className="flex items-center justify-between px-6 py-4 border-t">
                <div className="flex items-center gap-4">
                  <div className="text-sm text-muted-foreground">
                    Showing {filteredStores.length === 0 ? 0 : startIndex + 1} to {endIndex} of {filteredStores.length} stores
                  </div>
                  <div className="flex items-center gap-2">
                    <label className="text-sm text-muted-foreground">Rows per page:</label>
                    <Select value={itemsPerPage.toString()} onValueChange={(val) => {
                      setItemsPerPage(parseInt(val));
                      setCurrentPage(1);
                    }}>
                      <SelectTrigger className="w-[100px]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="50">50</SelectItem>
                        <SelectItem value="100">100</SelectItem>
                        <SelectItem value="200">200</SelectItem>
                        <SelectItem value="500">500</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                {totalPages > 1 && (
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                      disabled={currentPage === 1}
                    >
                      Previous
                    </Button>
                    <div className="flex items-center gap-2 px-3">
                      <span className="text-sm">Page {currentPage} of {totalPages}</span>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                      disabled={currentPage >= totalPages}
                    >
                      Next
                    </Button>
                  </div>
                )}
              </div>
            );
          })()}
            </>
          )}
        </CardContent>
      </Card>
        </TabsContent>

        <TabsContent value="new" className="mt-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>New Stores</CardTitle>
                  <CardDescription>View all new site stores with device information and floor plans</CardDescription>
                </div>
                {(filterStoreCode || filterCity || filterStoreName) && (
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => {
                      setFilterStoreCode("");
                      setFilterCity("");
                      setFilterStoreName("");
                    }}
                  >
                    <XCircle className="h-4 w-4 mr-2" />
                    Clear Filters
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent>
          {loadingStores ? (
            <div className="text-center py-8 text-muted-foreground">Loading stores...</div>
          ) : storeList.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No stores added yet. Add a store using the form above.
            </div>
          ) : (
            <>
              {/* Top Pagination Controls */}
              {(() => {
                const filteredStores = storeList.filter((store) => {
                  // Filter out cancelled stores and only show new site stores
                  if (store.status === 'cancelled') return false;
                  // Check for "New site" (case-insensitive and trim whitespace)
                  const siteReadiness = (store.site_readiness || '').trim().toLowerCase();
                  if (siteReadiness !== 'new site') return false;
                  
                  const matchesStoreCode = !filterStoreCode || 
                    store.store_code.toLowerCase().includes(filterStoreCode.toLowerCase());
                  const matchesCity = !filterCity || 
                    store.city.toLowerCase().includes(filterCity.toLowerCase());
                  const matchesStoreName = !filterStoreName || 
                    store.store.toLowerCase().includes(filterStoreName.toLowerCase());
                  return matchesStoreCode && matchesCity && matchesStoreName;
                });
                
                const totalPages = Math.ceil(filteredStores.length / itemsPerPage);
                const startIndex = (currentPage - 1) * itemsPerPage;
                const endIndex = Math.min(startIndex + itemsPerPage, filteredStores.length);
                
                return (
                  <div className="flex items-center justify-between px-6 py-4 border-b">
                    <div className="flex items-center gap-4">
                      <div className="text-sm text-muted-foreground">
                        Showing {filteredStores.length === 0 ? 0 : startIndex + 1} to {endIndex} of {filteredStores.length} stores
                      </div>
                      <div className="flex items-center gap-2">
                        <label className="text-sm text-muted-foreground">Rows per page:</label>
                        <Select value={itemsPerPage.toString()} onValueChange={(val) => {
                          setItemsPerPage(parseInt(val));
                          setCurrentPage(1);
                        }}>
                          <SelectTrigger className="w-[100px]">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="50">50</SelectItem>
                            <SelectItem value="100">100</SelectItem>
                            <SelectItem value="200">200</SelectItem>
                            <SelectItem value="500">500</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    {totalPages > 1 && (
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                          disabled={currentPage === 1}
                        >
                          Previous
                        </Button>
                        <div className="flex items-center gap-2 px-3">
                          <span className="text-sm">Page {currentPage} of {totalPages}</span>
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                          disabled={currentPage >= totalPages}
                        >
                          Next
                        </Button>
                      </div>
                    )}
                  </div>
                );
              })()}

            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>
                    <div className="space-y-1">
                      <div>Store Code</div>
                      <Input
                        placeholder="Filter..."
                        value={filterStoreCode}
                        onChange={(e) => setFilterStoreCode(e.target.value)}
                        className="h-8"
                      />
                    </div>
                  </TableHead>
                  <TableHead>
                    <div className="space-y-1">
                      <div>City</div>
                      <Input
                        placeholder="Filter..."
                        value={filterCity}
                        onChange={(e) => setFilterCity(e.target.value)}
                        className="h-8"
                      />
                    </div>
                  </TableHead>
                  <TableHead>
                    <div className="space-y-1">
                      <div>Store Name</div>
                      <Input
                        placeholder="Filter..."
                        value={filterStoreName}
                        onChange={(e) => setFilterStoreName(e.target.value)}
                        className="h-8"
                      />
                    </div>
                  </TableHead>
                  <TableHead>Devices</TableHead>
                  <TableHead>Floor Plan</TableHead>
                  <TableHead></TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(() => {
                  const filteredStores = storeList.filter((store) => {
                    // Filter out cancelled stores and only show new site stores
                    if (store.status === 'cancelled') return false;
                    // Check for "New site" (case-insensitive and trim whitespace)
                    const siteReadiness = (store.site_readiness || '').trim().toLowerCase();
                    if (siteReadiness !== 'new site') return false;
                    
                    const matchesStoreCode = !filterStoreCode || 
                      store.store_code.toLowerCase().includes(filterStoreCode.toLowerCase());
                    const matchesCity = !filterCity || 
                      store.city.toLowerCase().includes(filterCity.toLowerCase());
                    const matchesStoreName = !filterStoreName || 
                      store.store.toLowerCase().includes(filterStoreName.toLowerCase());
                    return matchesStoreCode && matchesCity && matchesStoreName;
                  });
                  
                  const totalPages = Math.ceil(filteredStores.length / itemsPerPage);
                  const startIndex = (currentPage - 1) * itemsPerPage;
                  const endIndex = startIndex + itemsPerPage;
                  const paginatedStores = filteredStores.slice(startIndex, endIndex);
                  
                  return paginatedStores.map((store) => (
                  <TableRow key={store.id}>
                    <TableCell className="font-mono font-medium">{store.store_code}</TableCell>
                    <TableCell>{store.city}</TableCell>
                    <TableCell>{store.store}</TableCell>
                    <TableCell>
                      <Badge variant="secondary">{store.deviceCount || 0}</Badge>
                    </TableCell>
                    <TableCell>
                      {store.hasFloorPlan ? (
                        <Badge variant="default" className="flex items-center gap-1 w-fit">
                          <CheckCircle className="h-3 w-3" />
                          Yes
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="flex items-center gap-1 w-fit">
                          <XCircle className="h-3 w-3" />
                          No
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      <Dialog>
                        <DialogTrigger asChild>
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => handleViewDevices(store)}
                          >
                            <Eye className="h-4 w-4 mr-2" />
                            View
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="max-w-4xl max-h-[80vh] overflow-auto">
                          <DialogHeader>
                            <DialogTitle>Device Information - {store.store}</DialogTitle>
                            <DialogDescription>
                              Store Code: {store.store_code} | City: {store.city}
                            </DialogDescription>
                          </DialogHeader>
                          {loadingDevices ? (
                            <div className="text-center py-8">Loading devices...</div>
                          ) : deviceList.length === 0 ? (
                            <div className="text-center py-8 text-muted-foreground">
                              No devices allocated to this store yet.
                            </div>
                          ) : (
                            <Table>
                              <TableHeader>
                                <TableRow>
                                  <TableHead>Type</TableHead>
                                  <TableHead>Make</TableHead>
                                  <TableHead>Model</TableHead>
                                  <TableHead>Serial Number</TableHead>
                                  <TableHead>Status</TableHead>
                                </TableRow>
                              </TableHeader>
                              <TableBody>
                                {deviceList.map((device) => (
                                  <TableRow key={device.id}>
                                    <TableCell className="font-medium">{device.type}</TableCell>
                                    <TableCell>{device.make}</TableCell>
                                    <TableCell>{device.model || '-'}</TableCell>
                                    <TableCell className="font-mono text-sm">{device.serial}</TableCell>
                                    <TableCell>
                                      <Badge variant={device.in_use ? "default" : "secondary"}>
                                        {device.in_use ? "In Use" : "Free"}
                                      </Badge>
                                    </TableCell>
                                  </TableRow>
                                ))}
                              </TableBody>
                            </Table>
                          )}
                        </DialogContent>
                      </Dialog>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEditStore(store)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleCancelStore(store)}
                        >
                          <X className="h-4 w-4 text-orange-500" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeleteStore(store.id, store.store_code)}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                  ));
                })()}
              </TableBody>
            </Table>
            
            {/* Bottom Pagination Controls */}
          {!loadingStores && storeList.length > 0 && (() => {
            const filteredStores = storeList.filter((store) => {
              // Filter out cancelled stores and only show new site stores
              if (store.status === 'cancelled') return false;
              // Check for "New site" (case-insensitive and trim whitespace)
              const siteReadiness = (store.site_readiness || '').trim().toLowerCase();
              if (siteReadiness !== 'new site') return false;
              
              const matchesStoreCode = !filterStoreCode || 
                store.store_code.toLowerCase().includes(filterStoreCode.toLowerCase());
              const matchesCity = !filterCity || 
                store.city.toLowerCase().includes(filterCity.toLowerCase());
              const matchesStoreName = !filterStoreName || 
                store.store.toLowerCase().includes(filterStoreName.toLowerCase());
              return matchesStoreCode && matchesCity && matchesStoreName;
            });
            
            const totalPages = Math.ceil(filteredStores.length / itemsPerPage);
            const startIndex = (currentPage - 1) * itemsPerPage;
            const endIndex = Math.min(startIndex + itemsPerPage, filteredStores.length);
            
            return (
              <div className="flex items-center justify-between px-6 py-4 border-t">
                <div className="flex items-center gap-4">
                  <div className="text-sm text-muted-foreground">
                    Showing {filteredStores.length === 0 ? 0 : startIndex + 1} to {endIndex} of {filteredStores.length} stores
                  </div>
                  <div className="flex items-center gap-2">
                    <label className="text-sm text-muted-foreground">Rows per page:</label>
                    <Select value={itemsPerPage.toString()} onValueChange={(val) => {
                      setItemsPerPage(parseInt(val));
                      setCurrentPage(1);
                    }}>
                      <SelectTrigger className="w-[100px]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="50">50</SelectItem>
                        <SelectItem value="100">100</SelectItem>
                        <SelectItem value="200">200</SelectItem>
                        <SelectItem value="500">500</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                {totalPages > 1 && (
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                      disabled={currentPage === 1}
                    >
                      Previous
                    </Button>
                    <div className="flex items-center gap-2 px-3">
                      <span className="text-sm">Page {currentPage} of {totalPages}</span>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                      disabled={currentPage >= totalPages}
                    >
                      Next
                    </Button>
                  </div>
                )}
              </div>
            );
          })()}
            </>
          )}
        </CardContent>
      </Card>
        </TabsContent>

        <TabsContent value="cancelled" className="mt-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Cancelled Stores</CardTitle>
                  <CardDescription>View all cancelled stores with cancellation remarks</CardDescription>
                </div>
                {(filterStoreCode || filterCity || filterStoreName) && (
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => {
                      setFilterStoreCode("");
                      setFilterCity("");
                      setFilterStoreName("");
                    }}
                  >
                    <XCircle className="h-4 w-4 mr-2" />
                    Clear Filters
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent>
              {loadingStores ? (
                <div className="text-center py-8 text-muted-foreground">Loading stores...</div>
              ) : (() => {
                const cancelledStores = storeList.filter((store) => store.status === 'cancelled');
                
                if (cancelledStores.length === 0) {
                  return (
                    <div className="text-center py-8 text-muted-foreground">
                      No cancelled stores found.
                    </div>
                  );
                }

                const filteredStores = cancelledStores.filter((store) => {
                  const matchesStoreCode = !filterStoreCode || 
                    store.store_code.toLowerCase().includes(filterStoreCode.toLowerCase());
                  const matchesCity = !filterCity || 
                    store.city.toLowerCase().includes(filterCity.toLowerCase());
                  const matchesStoreName = !filterStoreName || 
                    store.store.toLowerCase().includes(filterStoreName.toLowerCase());
                  return matchesStoreCode && matchesCity && matchesStoreName;
                });

                const totalPages = Math.ceil(filteredStores.length / itemsPerPage);
                const startIndex = (currentPage - 1) * itemsPerPage;
                const endIndex = startIndex + itemsPerPage;
                const paginatedStores = filteredStores.slice(startIndex, endIndex);

                return (
                  <>
                    {/* Top Pagination Controls */}
                    <div className="flex items-center justify-between mb-4">
                      <div className="text-sm text-muted-foreground">
                        Showing {startIndex + 1} to {Math.min(endIndex, filteredStores.length)} of {filteredStores.length} cancelled stores
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="flex items-center gap-2">
                          <span className="text-sm text-muted-foreground">Rows per page:</span>
                          <Select value={itemsPerPage.toString()} onValueChange={(value) => {
                            setItemsPerPage(Number(value));
                            setCurrentPage(1);
                          }}>
                            <SelectTrigger className="w-20">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="50">50</SelectItem>
                              <SelectItem value="100">100</SelectItem>
                              <SelectItem value="200">200</SelectItem>
                              <SelectItem value="500">500</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        {totalPages > 1 && (
                          <div className="flex gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                              disabled={currentPage === 1}
                            >
                              Previous
                            </Button>
                            <div className="flex items-center gap-2 px-3">
                              <span className="text-sm">Page {currentPage} of {totalPages}</span>
                            </div>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                              disabled={currentPage >= totalPages}
                            >
                              Next
                            </Button>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Cancelled Stores Table */}
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>
                            <div className="space-y-1">
                              <div>Store Code</div>
                              <Input
                                placeholder="Filter..."
                                value={filterStoreCode}
                                onChange={(e) => setFilterStoreCode(e.target.value)}
                                className="h-8"
                              />
                            </div>
                          </TableHead>
                          <TableHead>
                            <div className="space-y-1">
                              <div>City</div>
                              <Input
                                placeholder="Filter..."
                                value={filterCity}
                                onChange={(e) => setFilterCity(e.target.value)}
                                className="h-8"
                              />
                            </div>
                          </TableHead>
                          <TableHead>
                            <div className="space-y-1">
                              <div>Store Name</div>
                              <Input
                                placeholder="Filter..."
                                value={filterStoreName}
                                onChange={(e) => setFilterStoreName(e.target.value)}
                                className="h-8"
                              />
                            </div>
                          </TableHead>
                          <TableHead>Priority</TableHead>
                          <TableHead>Cancellation Remarks</TableHead>
                          <TableHead>Cancelled At</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {paginatedStores.map((store) => (
                          <TableRow key={store.id}>
                            <TableCell className="font-medium">{store.store_code}</TableCell>
                            <TableCell>{store.city}</TableCell>
                            <TableCell>{store.store}</TableCell>
                            <TableCell>
                              <Badge variant={
                                store.priority === "High" ? "destructive" :
                                store.priority === "Medium" ? "default" : "secondary"
                              }>
                                {store.priority || "Medium"}
                              </Badge>
                            </TableCell>
                            <TableCell className="max-w-md">
                              <div className="text-sm text-muted-foreground whitespace-pre-wrap">
                                {store.cancel_remarks || "No remarks provided"}
                              </div>
                            </TableCell>
                            <TableCell className="text-sm">
                              {store.cancelled_at 
                                ? new Date(store.cancelled_at).toLocaleDateString('en-US', {
                                    year: 'numeric',
                                    month: 'short',
                                    day: 'numeric',
                                    hour: '2-digit',
                                    minute: '2-digit'
                                  })
                                : '-'
                              }
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>

                    {/* Bottom Pagination Controls */}
                    {totalPages > 1 && (
                      <div className="flex items-center justify-between mt-4">
                        <div className="text-sm text-muted-foreground">
                          Showing {startIndex + 1} to {Math.min(endIndex, filteredStores.length)} of {filteredStores.length} cancelled stores
                        </div>
                        <div className="flex items-center gap-4">
                          <div className="flex items-center gap-2">
                            <span className="text-sm text-muted-foreground">Rows per page:</span>
                            <Select value={itemsPerPage.toString()} onValueChange={(value) => {
                              setItemsPerPage(Number(value));
                              setCurrentPage(1);
                            }}>
                              <SelectTrigger className="w-20">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="50">50</SelectItem>
                                <SelectItem value="100">100</SelectItem>
                                <SelectItem value="200">200</SelectItem>
                                <SelectItem value="500">500</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="flex gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                              disabled={currentPage === 1}
                            >
                              Previous
                            </Button>
                            <div className="flex items-center gap-2 px-3">
                              <span className="text-sm">Page {currentPage} of {totalPages}</span>
                            </div>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                              disabled={currentPage >= totalPages}
                            >
                              Next
                            </Button>
                          </div>
                        </div>
                      </div>
                    )}
                  </>
                );
              })()}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

function CitySuggestions({
  watch,
  setValue,
}: {
  watch: UseFormWatch<FormValues>;
  setValue: UseFormSetValue<FormValues>;
}) {
  const query = watch("city") || "";
  const [suggestions, setSuggestions] = React.useState<string[]>([]);

  React.useEffect(() => {
    async function updateSuggestions() {
      const q = (query || "").trim();
      if (q.length >= 2) {
        const qLower = q.toLowerCase();
        const cities = await getUniqueCities();
        const matched = cities.filter((c) => c.toLowerCase().includes(qLower));
        // dedupe and limit
        const unique = Array.from(new Set(matched));
        setSuggestions(unique.slice(0, 10));
      } else {
        setSuggestions([]);
      }
    }
    updateSuggestions();
  }, [query]);

  if (suggestions.length === 0) return null;

  return (
    <div className="absolute z-50 mt-1 w-full max-h-48 overflow-auto rounded-md border bg-background shadow">
      {suggestions.map((s) => (
        <button
          type="button"
          key={s}
          className="w-full px-3 py-2 text-left hover:bg-accent/30"
          onClick={() => {
            setValue("city", s, { shouldDirty: true, shouldValidate: true });
            setSuggestions([]);
          }}
        >
          {s}
        </button>
      ))}
    </div>
  );
}

function StoreSuggestions({
  suggestions,
  onSelect,
}: {
  suggestions: StoreRow[];
  onSelect: (store: StoreRow) => void;
}) {
  if (suggestions.length === 0) return null;

  return (
    <div className="absolute z-50 mt-1 w-full max-h-48 overflow-auto rounded-md border bg-background shadow">
      {suggestions.map((store) => (
        <button
          type="button"
          key={store.store_code}
          className="w-full px-3 py-2 text-left hover:bg-accent/30"
          onClick={() => onSelect(store)}
        >
          <div className="font-medium">{store.store}</div>
          <div className="text-sm text-muted-foreground">{store.store_code}</div>
        </button>
      ))}
    </div>
  );
}

export default AddStore;
