import React, { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Plus, Edit, Trash2, Search } from "lucide-react";

interface Store {
  id: string;
  store_code: string;
  store: string;
  city: string;
}

interface Device {
  id: string;
  store_code: string;
  type: string;
  make: string;
  model?: string;
  serial: string;
  ip_address?: string;
  mac_address?: string;
  created_at: string;
}

interface FormData {
  store_code: string;
  type: string;
  make: string;
  model: string;
  serial: string;
}

interface StoreSummary {
  store_code: string;
  store: string;
  city: string;
  devicesCount: number;
}

const AdditionalAssets = () => {
  const [stores, setStores] = useState<Store[]>([]);
  const [filteredStores, setFilteredStores] = useState<Store[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedStore, setSelectedStore] = useState<Store | null>(null);
  const [devices, setDevices] = useState<Device[]>([]);
  const [inventoryDevices, setInventoryDevices] = useState<Device[]>([]);
  const [storeSummaries, setStoreSummaries] = useState<StoreSummary[]>([]);
  const [activeTab, setActiveTab] = useState("add");
  const [loading, setLoading] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deviceTypes, setDeviceTypes] = useState<string[]>([]);
  const [formData, setFormData] = useState<FormData>({
    store_code: "",
    type: "",
    make: "",
    model: "",
    serial: ""
  });
  const { toast } = useToast();

  useEffect(() => {
    loadStores();
  }, []);

  const loadStores = async () => {
    try {
      const { data, error } = await supabase
        .from("stores")
        .select("id, store_code, store, city")
        .order("city");

      if (error) throw error;
      setStores(data || []);
      setFilteredStores(data || []);
      await loadStoreSummaries(data || []);
    } catch (err) {
      console.error("Error loading stores:", err);
      toast({
        title: "Error",
        description: "Failed to load stores",
        variant: "destructive"
      });
    }
  };

  const loadStoreSummaries = async (storeListParam?: Store[]) => {
    try {
      const storeList = storeListParam && storeListParam.length > 0 ? storeListParam : stores;

      const { data, error } = await supabase
        .from("inventory")
        .select("store_code")
        .eq("in_use", true)
        .not("store_code", "is", null)
        .in("type", ["Access Point", "Firewall", "Router", "Switch"]);

      if (error) throw error;

      const counts: Record<string, number> = {};
      (data || []).forEach((item: any) => {
        if (!item.store_code) return;
        counts[item.store_code] = (counts[item.store_code] || 0) + 1;
      });

      const summaries: StoreSummary[] = Object.entries(counts).map(([store_code, devicesCount]) => {
        const storeInfo = storeList.find((s) => s.store_code === store_code);
        return {
          store_code,
          store: storeInfo?.store || "-",
          city: storeInfo?.city || "-",
          devicesCount
        };
      });

      summaries.sort((a, b) => b.devicesCount - a.devicesCount || a.store_code.localeCompare(b.store_code));
      setStoreSummaries(summaries);
    } catch (err) {
      console.error("Error loading store summaries:", err);
      toast({
        title: "Error",
        description: "Failed to load store summary",
        variant: "destructive"
      });
    }
  };

  const handleSearch = (query: string) => {
    setSearchQuery(query);
    const filtered = stores.filter(store =>
      store.store_code.toLowerCase().includes(query.toLowerCase()) ||
      store.store.toLowerCase().includes(query.toLowerCase())
    );
    setFilteredStores(filtered);
  };

  const handleStoreSelect = async (storeCode: string) => {
    const store = stores.find(s => s.store_code === storeCode);
    if (!store) return;

    setSelectedStore(store);
    setFormData({ ...formData, store_code: storeCode });
    await loadDevices(storeCode);
  };

  const loadDevices = async (storeCode: string) => {
    try {
      setLoading(true);
      
      // Load all devices that are IN USE for this store (existing devices)
      const { data, error } = await supabase
        .from("inventory")
        .select("*")
        .eq("store_code", storeCode)
        .eq("in_use", true)
        .order("created_at", { ascending: false });

      if (error) throw error;
      
      setDevices(data || []);
      
      // Get available inventory devices that can be added (not yet assigned to this store)
      const { data: inventory, error: invError } = await supabase
        .from("inventory")
        .select("*")
        .eq("in_use", false)
        .in("type", ["Access Point", "Firewall", "Router", "Switch"])
        .order("type");

      if (invError) throw invError;
      setInventoryDevices(inventory || []);

      // Extract unique device types
      const types = [...new Set(data?.map(d => d.type) || ["Access Point"])];
      setDeviceTypes(types);
    } catch (err) {
      console.error("Error loading devices:", err);
      toast({
        title: "Error",
        description: "Failed to load devices",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleAddNew = () => {
    setFormData({
      store_code: selectedStore?.store_code || "",
      type: "Access Point",
      make: "",
      model: "",
      serial: ""
    });
    setIsEditing(false);
    setEditingId(null);
    setDialogOpen(true);
  };

  const handleAddFromInventory = (device: Device) => {
    setFormData({
      store_code: selectedStore?.store_code || "",
      type: device.type,
      make: device.make,
      model: device.model || "",
      serial: device.serial
    });
    setEditingId(device.id);
    setIsEditing(false);
    setDialogOpen(true);
  };

  const handleEdit = (device: Device) => {
    setFormData({
      store_code: device.store_code,
      type: device.type,
      make: device.make,
      model: device.model || "",
      serial: device.serial
    });
    setEditingId(device.id);
    setIsEditing(true);
    setDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this device?")) return;

    try {
      const { error } = await supabase
        .from("inventory")
        .delete()
        .eq("id", id);

      if (error) throw error;
      toast({
        title: "Success",
        description: "Device deleted successfully"
      });
      if (selectedStore) {
        await loadDevices(selectedStore.store_code);
      }
      await loadStoreSummaries();
    } catch (err) {
      console.error("Error deleting device:", err);
      toast({
        title: "Error",
        description: "Failed to delete device",
        variant: "destructive"
      });
    }
  };

  const handleSave = async () => {
    if (!formData.store_code || !formData.type || !formData.make || !formData.serial) {
      toast({
        title: "Error",
        description: "Please fill in all required fields",
        variant: "destructive"
      });
      return;
    }

    // Ensure we are updating an existing inventory record, not creating a new one
    if (!editingId) {
      toast({
        title: "Select Inventory Device",
        description: "Please pick a device from 'Additional Devices Available' or choose a serial that exists in inventory.",
        variant: "destructive"
      });
      return;
    }

    try {
      // Always update an existing inventory row to in_use=true and assign store_code
      const { error } = await supabase
        .from("inventory")
        .update({
          store_code: formData.store_code,
          type: formData.type,
          make: formData.make,
          model: formData.model || null,
          serial: formData.serial,
          in_use: true,
          assigned_date: new Date().toISOString()
        })
        .eq("id", editingId);

      if (error) throw error;
      toast({
        title: "Success",
        description: "Device assigned to store"
      });

      setDialogOpen(false);
      if (selectedStore) {
        await loadDevices(selectedStore.store_code);
      }
      await loadStoreSummaries();
    } catch (err) {
      console.error("Error saving device:", err);
      toast({
        title: "Error",
        description: "Failed to save device",
        variant: "destructive"
      });
    }
  };

  const handleMakeSearch = (query: string) => {
    if (!query.trim() || !formData.make) {
      return;
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Additional Assets</h1>
        <p className="text-muted-foreground">Manage network equipment and devices for stores</p>
      </div>
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList>
          <TabsTrigger value="summary">Stores with Additional Devices</TabsTrigger>
          <TabsTrigger value="add">Add Device to Store</TabsTrigger>
        </TabsList>

        <TabsContent value="summary">
          <Card>
            <CardHeader>
              <CardTitle>Stores with Additional Devices</CardTitle>
              <CardDescription>List of stores where devices are already assigned</CardDescription>
            </CardHeader>
            <CardContent>
              {storeSummaries.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No additional devices assigned yet.
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Store Code</TableHead>
                      <TableHead>Store Name</TableHead>
                      <TableHead>City</TableHead>
                      <TableHead className="text-center">Devices Added</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {storeSummaries.map((summary) => (
                      <TableRow key={summary.store_code}>
                        <TableCell className="font-medium">{summary.store_code}</TableCell>
                        <TableCell>{summary.store}</TableCell>
                        <TableCell>{summary.city}</TableCell>
                        <TableCell className="text-center font-semibold">{summary.devicesCount}</TableCell>
                        <TableCell>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={async () => {
                              await handleStoreSelect(summary.store_code);
                              setActiveTab("add");
                            }}
                          >
                            View & Add
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

        <TabsContent value="add" className="space-y-6">
          {/* Search Section */}
          <Card>
            <CardHeader>
              <CardTitle>Search Store</CardTitle>
              <CardDescription>Search by store code or store name</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="relative">
                  <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search by store code or name..."
                    value={searchQuery}
                    onChange={(e) => handleSearch(e.target.value)}
                    className="pl-10"
                  />
                </div>

                {searchQuery && filteredStores.length > 0 && (
                  <div className="space-y-2">
                    {filteredStores.map((store) => (
                      <div
                        key={store.id}
                        onClick={() => {
                          handleStoreSelect(store.store_code);
                          setSearchQuery("");
                        }}
                        className="p-3 border rounded-lg cursor-pointer hover:bg-accent transition"
                      >
                        <div className="font-medium">{store.store_code}</div>
                        <div className="text-sm text-muted-foreground">{store.store}</div>
                        <div className="text-sm text-muted-foreground">{store.city}</div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Selected Store Details */}
          {selectedStore && (
            <>
              <Card>
                <CardHeader>
                  <CardTitle>Store Information</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <Label className="text-muted-foreground">Store Code</Label>
                      <p className="text-lg font-semibold">{selectedStore.store_code}</p>
                    </div>
                    <div>
                      <Label className="text-muted-foreground">Store Name</Label>
                      <p className="text-lg font-semibold">{selectedStore.store}</p>
                    </div>
                    <div>
                      <Label className="text-muted-foreground">City</Label>
                      <p className="text-lg font-semibold">{selectedStore.city}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Current Devices */}
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle>Current Devices</CardTitle>
                      <CardDescription>
                        {devices.length} device{devices.length !== 1 ? "s" : ""} assigned to this store
                      </CardDescription>
                    </div>
                    <Button onClick={handleAddNew} className="gap-2">
                      <Plus className="h-4 w-4" />
                      Add New Device
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  {loading ? (
                    <div className="text-center py-8">Loading devices...</div>
                  ) : devices.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      No devices found. Click "Add New Device" to get started.
                    </div>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Type</TableHead>
                          <TableHead>Make</TableHead>
                          <TableHead>Model</TableHead>
                          <TableHead>Serial</TableHead>
                          <TableHead>Added</TableHead>
                          <TableHead>Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {devices.map((device) => (
                          <TableRow key={device.id}>
                            <TableCell>
                              <Badge variant="secondary">{device.type}</Badge>
                            </TableCell>
                            <TableCell className="font-medium">{device.make}</TableCell>
                            <TableCell>{device.model || "-"}</TableCell>
                            <TableCell className="font-mono text-sm">{device.serial}</TableCell>
                            <TableCell className="text-sm text-muted-foreground">
                              {new Date(device.created_at).toLocaleDateString()}
                            </TableCell>
                            <TableCell>
                              <div className="flex gap-2">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleEdit(device)}
                                >
                                  <Edit className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleDelete(device.id)}
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

              {/* Additional Devices Available */}
              <Card>
                <CardHeader>
                  <CardTitle>Additional Devices Available</CardTitle>
                  <CardDescription>
                    {inventoryDevices.length} device{inventoryDevices.length !== 1 ? "s" : ""} available to add from inventory
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {inventoryDevices.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      No additional devices available in inventory
                    </div>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Type</TableHead>
                          <TableHead>Make</TableHead>
                          <TableHead>Model</TableHead>
                          <TableHead>Serial</TableHead>
                          <TableHead>Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {inventoryDevices.map((device) => (
                          <TableRow key={device.id}>
                            <TableCell>
                              <Badge variant="outline">{device.type}</Badge>
                            </TableCell>
                            <TableCell className="font-medium">{device.make}</TableCell>
                            <TableCell>{device.model || "-"}</TableCell>
                            <TableCell className="font-mono text-sm">{device.serial}</TableCell>
                            <TableCell>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleAddFromInventory(device)}
                              >
                                <Plus className="h-4 w-4 mr-1" />
                                Add to Store
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </CardContent>
              </Card>
            </>
          )}
        </TabsContent>
      </Tabs>

      {/* Add/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {isEditing ? "Edit Device" : "Add Device"}
            </DialogTitle>
            <DialogDescription>
              {selectedStore && (
                <>Store: {selectedStore.store_code} - {selectedStore.store}</>
              )}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label htmlFor="type">Device Type *</Label>
              <Select value={formData.type} onValueChange={(value) => setFormData({ ...formData, type: value })}>
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="Select device type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Access Point">Access Point</SelectItem>
                  <SelectItem value="Firewall">Firewall</SelectItem>
                  <SelectItem value="Router">Router</SelectItem>
                  <SelectItem value="Switch">Switch</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Make Field */}
            <div className="space-y-1">
              <Label htmlFor="make">Make *</Label>
              <Select value={formData.make || undefined} onValueChange={(value) => {
                setFormData({ ...formData, make: value, model: "", serial: "" });
              }}>
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="Select make..." />
                </SelectTrigger>
                <SelectContent>
                  {inventoryDevices.length === 0 ? (
                    <div className="p-2 text-sm text-muted-foreground">No devices available</div>
                  ) : (
                    Array.from(new Set(inventoryDevices.map((d: any) => d.make))).map((make: any) => (
                      <SelectItem key={make} value={make}>
                        {make}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>

            {/* Model Field */}
            <div className="space-y-1">
              <Label htmlFor="model">Model</Label>
              <Select 
                value={formData.model || undefined} 
                onValueChange={(value) => {
                  setFormData({ ...formData, model: value, serial: "" });
                }}
                disabled={!formData.make}
              >
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="Select model..." />
                </SelectTrigger>
                <SelectContent>
                  {!formData.make ? (
                    <div className="p-2 text-sm text-muted-foreground">Select make first</div>
                  ) : (
                    (() => {
                      const models = inventoryDevices
                        .filter((d: any) => d.make === formData.make)
                        .map((d: any) => d.model)
                        .filter((v: any, i: any, a: any) => a.indexOf(v) === i);
                      
                      return models.length === 0 ? (
                        <div className="p-2 text-sm text-muted-foreground">No models available</div>
                      ) : (
                        models.map((model: any) => (
                          <SelectItem key={model || 'empty'} value={model || 'N/A'}>
                            {model || 'N/A'}
                          </SelectItem>
                        ))
                      );
                    })()
                  )}
                </SelectContent>
              </Select>
            </div>

            {/* Serial Field with datalist */}
            <div className="space-y-1 relative">
              <Label htmlFor="serial">Serial *</Label>
              <Input
                id="serial"
                placeholder="Type to search available devices..."
                value={formData.serial}
                onChange={(e) => {
                  const value = e.target.value;
                  setFormData({ ...formData, serial: value });
                  // Auto-fill make and model when serial is selected from list
                  if (value.length > 0) {
                    const device = inventoryDevices.find((d: any) => d.serial === value);
                    if (device) {
                      setFormData({ 
                        ...formData, 
                        make: device.make,
                        model: device.model || "",
                        serial: value 
                      });
                      setEditingId(device.id);
                    } else {
                      setEditingId(null);
                    }
                  }
                }}
                disabled={!formData.make}
                className="mt-1"
                list="serialList"
              />
              <datalist id="serialList">
                {inventoryDevices
                  .filter((d: any) => 
                    !formData.serial || d.serial.toLowerCase().includes(formData.serial.toLowerCase())
                  )
                  .filter((d: any) => 
                    (!formData.make || d.make === formData.make) && 
                    (!formData.model || d.model === formData.model)
                  )
                  .slice(0, 20)
                  .map((device: any) => (
                    <option key={device.id} value={device.serial}>
                      {device.serial} - {device.model || 'N/A'}
                    </option>
                  ))}
              </datalist>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSave}>
              {isEditing ? "Update" : "Add"} Device
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdditionalAssets;
