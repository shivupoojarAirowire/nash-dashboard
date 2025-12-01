import { useState, useEffect, useMemo } from "react";
import { useFeatureFlags } from '@/hooks/useFeatureFlags';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Dialog, DialogTrigger, DialogContent, DialogTitle, DialogDescription, DialogHeader, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { addInventory, addInventoryBulk, getInventory } from "@/integrations/supabase/inventory";
import { uploadFloorMap, deleteFloorMap, FileValidationError } from "@/integrations/supabase/storage";
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from "@/components/ui/select";
import { useToast } from "@/components/ui/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Checkbox } from "@/components/ui/checkbox";
import { Pencil, Trash2, X, ArrowUpDown, ArrowUp, ArrowDown } from "lucide-react";

type InventoryItem = {
  id: string; // UUID from database
  type: "Router" | "Switch" | "Firewall" | "Access Point";
  make: string;
  model?: string; // Device model
  serial: string;
  // New fields
  inUse?: boolean;
  storeCode?: string; // Foreign key to stores.store_code
  storeName?: string; // Fetched from stores.store
  city?: string; // Fetched from stores.city
  arrivalDate?: string; // ISO date
  assignedDate?: string; // ISO date
};

const initialInventory: InventoryItem[] = [];

export default function InventoryPage() {
  const { has, loading } = useFeatureFlags();
  const navigate = useNavigate();
  const { toast } = useToast();
  
  // All state declarations MUST come before any conditional returns
  const [items, setItems] = useState<InventoryItem[]>(initialInventory);
  const [stores, setStores] = useState<Array<{ store_code: string; store: string; city: string }>>([]);
  const [nextId, setNextId] = useState(1);
  const [open, setOpen] = useState(false);
  const [selectedType, setSelectedType] = useState<InventoryItem["type"]>("Router");
  const [selectedStoreCode, setSelectedStoreCode] = useState<string>("");
  const [editStoreCode, setEditStoreCode] = useState<string>("");
  const [bulkOpen, setBulkOpen] = useState(false);
  const [parsedBulkItems, setParsedBulkItems] = useState<Omit<InventoryItem, "id">[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  
  // State for details/edit/delete
  const [selectedItem, setSelectedItem] = useState<InventoryItem | null>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  
  // Bulk select and sort states
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());
  const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false);
  const [sortField, setSortField] = useState<keyof InventoryItem>('type');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  
  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [totalInUse, setTotalInUse] = useState(0);
  const [itemsPerPage, setItemsPerPage] = useState(100);
  
  // Device type counts from database
  const [deviceCounts, setDeviceCounts] = useState<{
    [key: string]: { total: number; inUse: number; free: number };
  }>({
    Router: { total: 0, inUse: 0, free: 0 },
    'Access Point': { total: 0, inUse: 0, free: 0 },
    Switch: { total: 0, inUse: 0, free: 0 },
    Firewall: { total: 0, inUse: 0, free: 0 },
  });
  
  // Feature flag check with useEffect
  useEffect(() => {
    if (!loading && !has('Inventory')) {
      navigate('/');
    }
  }, [loading, has, navigate]);

  // Load stores from database
  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from('stores')
        .select('store_code, store, city')
        .order('city', { ascending: true });
      
      if (data) {
        setStores(data);
      }
    })();
  }, []);

  // Load counts
  useEffect(() => {
    loadDeviceCounts();
  }, []);

  const loadDeviceCounts = async () => {
    // Get total count
    const { count: total } = await supabase
      .from('inventory')
      .select('*', { count: 'exact', head: true });
    
    // Get in-use count
    const { count: inUse } = await supabase
      .from('inventory')
      .select('*', { count: 'exact', head: true })
      .eq('in_use', true);
    
    setTotalCount(total || 0);
    setTotalInUse(inUse || 0);

    // Load counts for each device type
    const types: InventoryItem["type"][] = ["Router", "Access Point", "Switch", "Firewall"];
    const counts: typeof deviceCounts = {
      Router: { total: 0, inUse: 0, free: 0 },
      'Access Point': { total: 0, inUse: 0, free: 0 },
      Switch: { total: 0, inUse: 0, free: 0 },
      Firewall: { total: 0, inUse: 0, free: 0 },
    };

    for (const type of types) {
      // Get total count for this type
      const { count: typeTotal } = await supabase
        .from('inventory')
        .select('*', { count: 'exact', head: true })
        .eq('type', type);
      
      // Get in-use count for this type
      const { count: typeInUse } = await supabase
        .from('inventory')
        .select('*', { count: 'exact', head: true })
        .eq('type', type)
        .eq('in_use', true);
      
      counts[type] = {
        total: typeTotal || 0,
        inUse: typeInUse || 0,
        free: (typeTotal || 0) - (typeInUse || 0),
      };
    }

    setDeviceCounts(counts);
  };

  // Load existing inventory from DB with pagination
  useEffect(() => {
    (async () => {
      const start = (currentPage - 1) * itemsPerPage;
      const end = start + itemsPerPage - 1;
      
      const { data: rows, error } = await supabase
        .from('inventory')
        .select('*')
        .order('created_at', { ascending: false })
        .range(start, end);
      
      if (error) {
        console.error('Error loading inventory:', error);
        return;
      }
      
      if (!rows || !Array.isArray(rows)) return;
      
      console.log(`Loading page ${currentPage}, items ${start}-${end}`);
      console.log('Raw inventory data from DB:', rows);
      
      // Create a map of store_code to store details for easy lookup
      const storeMap = new Map(stores.map(s => [s.store_code, s]));
      
      const mapped: InventoryItem[] = rows.map((r: any) => {
        const store = storeMap.get(r.store_code);
        return {
          id: r.id, // Use actual database UUID
          type: r.type,
          make: r.make,
          model: r.model || '',
          serial: r.serial,
          inUse: !!r.in_use,
          storeCode: r.store_code || '',
          storeName: store?.store || '',
          city: store?.city || '',
          arrivalDate: r.arrival_date || '',
          assignedDate: r.assigned_date || '',
        };
      });
      setItems(mapped);
    })();
  }, [stores, currentPage]);
  
  const downloadTemplate = () => {
    const csv = [
      "type,make,model,serial,in_use,store_code,arrival_date,assigned_date",
      "Router,Fortinet,FortiGate 60F,FTN-EX-0001,true,MUM_KOTARI_P01R1CC,2024-01-15,2024-01-20",
      "Switch,Cisco,Catalyst 2960,SW-EX-0002,false,BLR_SRJPUR_P01R1CC,2024-02-10,",
      "Firewall,Fortinet,FortiGate 100F,FW-EX-0003,true,DEL_JNKPRI_P01R0CF,2024-03-05,2024-03-12",
    ].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "inventory_template.csv";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const addItems = async (newItems: Omit<InventoryItem, "id">[]) => {
    try {
      console.log('Attempting to insert items:', newItems.length);
      const itemsToInsert = newItems.map((it) => ({ 
        type: it.type, 
        make: it.make,
        model: it.model || null,
        serial: it.serial,
        in_use: !!it.inUse,
        store_code: it.storeCode || null,
        arrival_date: it.arrivalDate || null,
        assigned_date: it.assignedDate || null,
      }));
      console.log('Items formatted for database:', itemsToInsert);
      
      const inserted = await addInventoryBulk(itemsToInsert);
      console.log('Insert result:', inserted);
      
      if (inserted && Array.isArray(inserted)) {
        // Use actual database IDs from the inserted records
        const withDbIds: InventoryItem[] = inserted.map((dbItem: any, idx: number) => ({
          id: dbItem.id,
          ...newItems[idx],
        }));
        setItems((s) => [...withDbIds, ...s]);
        loadDeviceCounts(); // Refresh counts
        return inserted;
      }
      console.warn('No data returned from insert operation');
      return null;
    } catch (e) {
      console.error('Failed to add items to database:', e);
      return null;
    }
  };

  const addItem = async (item: Omit<InventoryItem, "id">) => {
    try {
      const inserted = await addInventory({
        type: item.type,
        make: item.make,
        model: item.model || null,
        serial: item.serial,
        in_use: !!item.inUse,
        store_code: item.storeCode || null,
        arrival_date: item.arrivalDate ? item.arrivalDate : null,
        assigned_date: item.assignedDate ? item.assignedDate : null,
      } as any);
      
      if (inserted && inserted.id) {
        setItems((s) => [{ id: inserted.id, ...item }, ...s]);
        loadDeviceCounts(); // Refresh counts
        toast({ title: "Added", description: "Inventory item added successfully." });
      }
    } catch (error) {
      console.error('Failed to add item:', error);
      toast({ 
        title: "Error", 
        description: "Failed to add inventory item.", 
        variant: "destructive" 
      });
    }
  };

  const updateItem = async (updatedItem: InventoryItem) => {
    try {
      const { error } = await supabase
        .from('inventory')
        .update({
          type: updatedItem.type,
          make: updatedItem.make,
          model: updatedItem.model || null,
          serial: updatedItem.serial,
          in_use: updatedItem.inUse,
          store_code: updatedItem.storeCode || null,
          arrival_date: updatedItem.arrivalDate || null,
          assigned_date: updatedItem.assignedDate || null,
        })
        .eq('id', updatedItem.id);

      if (error) throw error;

      setItems((s) => s.map((it) => (it.id === updatedItem.id ? updatedItem : it)));
      loadDeviceCounts(); // Refresh counts
      toast({ title: "Updated", description: "Inventory item updated successfully." });
    } catch (error) {
      console.error('Error updating inventory item:', error);
      toast({ 
        title: "Error", 
        description: "Failed to update inventory item.", 
        variant: "destructive" 
      });
    }
  };

  const deleteItem = async (id: string) => {
    try {
      const { error } = await supabase
        .from('inventory')
        .delete()
        .eq('id', id);

      if (error) throw error;

      setItems((s) => s.filter((it) => it.id !== id));
      loadDeviceCounts(); // Refresh counts
      toast({ title: "Deleted", description: "Inventory item deleted successfully." });
    } catch (error) {
      console.error('Error deleting inventory item:', error);
      toast({ 
        title: "Error", 
        description: "Failed to delete inventory item.", 
        variant: "destructive" 
      });
    }
  };

  const handleRowClick = (item: InventoryItem) => {
    setSelectedItem(item);
    setDetailsOpen(true);
  };
  
  // Sorting function
  const handleSort = (field: keyof InventoryItem) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };
  
  const getSortIcon = (field: keyof InventoryItem) => {
    if (sortField !== field) {
      return <ArrowUpDown className="ml-2 h-4 w-4" />;
    }
    return sortDirection === 'asc' ? <ArrowUp className="ml-2 h-4 w-4" /> : <ArrowDown className="ml-2 h-4 w-4" />;
  };
  
  // Sort items using useMemo for performance
  const sortedItems = useMemo(() => {
    return [...items].sort((a, b) => {
      let aValue: any = a[sortField];
      let bValue: any = b[sortField];
      
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
  }, [items, sortField, sortDirection]);
  
  // Bulk select handlers
  const toggleSelectAll = () => {
    if (selectedItems.size === sortedItems.length) {
      setSelectedItems(new Set());
    } else {
      setSelectedItems(new Set(sortedItems.map(item => item.id)));
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
  
  const confirmBulkDelete = async () => {
    const itemsToDelete = Array.from(selectedItems);
    const count = itemsToDelete.length;
    
    try {
      const { error } = await supabase
        .from('inventory')
        .delete()
        .in('id', itemsToDelete);

      if (error) throw error;

      setItems((s) => s.filter((it) => !selectedItems.has(it.id)));
      setSelectedItems(new Set());
      setBulkDeleteOpen(false);
      loadDeviceCounts(); // Refresh counts
      toast({ 
        title: "Deleted", 
        description: `${count} inventory items deleted successfully.` 
      });
    } catch (error) {
      console.error('Error deleting inventory items:', error);
      toast({ 
        title: "Error", 
        description: "Failed to delete some inventory items.", 
        variant: "destructive" 
      });
    }
  };

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-3xl font-bold">Inventory</h1>
          <p className="text-muted-foreground">
            Track device inventory across your stores • Total: {totalCount} • In Use: {totalInUse}
          </p>
        </div>

        <Dialog open={open} onOpenChange={setOpen}>
          <div className="flex gap-2">
            <DialogTrigger asChild>
              <Button>Add Inventory</Button>
            </DialogTrigger>
            <Button variant="outline" onClick={() => setBulkOpen(true)}>Bulk Upload</Button>
          </div>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add Inventory Item</DialogTitle>
              <DialogDescription>Provide device information to add to inventory</DialogDescription>
            </DialogHeader>

            <form
              onSubmit={async (e) => {
                e.preventDefault();
                const form = e.target as HTMLFormElement & {
                  make: HTMLInputElement;
                  model: HTMLInputElement;
                  serial: HTMLInputElement;
                };
                const make = form.make.value || "";
                const model = form.model.value || "";
                const serial = form.serial.value || "";

                if (!make || !serial) return;

                const inUse = form.inUse.checked;
                const arrivalDate = form.arrivalDate?.value || "";
                const assignedDate = form.assignedDate?.value || "";
                
                const selectedStore = stores.find(s => s.store_code === selectedStoreCode);
                
                setIsUploading(true);
                try {
                  await addItem({
                    type: selectedType,
                    make,
                    model,
                    serial,
                    inUse,
                    storeCode: selectedStoreCode,
                    storeName: selectedStore?.store || "",
                    city: selectedStore?.city || "",
                    arrivalDate,
                    assignedDate,
                  });

                  toast({
                    title: "Item added",
                    description: "The inventory item has been added successfully.",
                  });
                } catch (error) {
                  toast({
                    title: "Error",
                    description: "Failed to add inventory item. Please try again.",
                    variant: "destructive",
                  });
                } finally {
                  setIsUploading(false);
                }
                setOpen(false);
              }}
            >
              <div className="grid gap-2">
                <label className="text-sm">Inventory Type</label>
                <Select onValueChange={(v) => setSelectedType(v as InventoryItem["type"])} value={selectedType}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Router">Router</SelectItem>
                    <SelectItem value="Switch">Switch</SelectItem>
                    <SelectItem value="Firewall">Firewall</SelectItem>
                    <SelectItem value="Access Point">Access Point</SelectItem>
                  </SelectContent>
                </Select>

                <label className="text-sm">Make</label>
                <Input name="make" defaultValue="Fortinet" />

                <label className="text-sm">Device Model</label>
                <Input name="model" placeholder="e.g., FortiGate 60F" />

                <label className="text-sm">Serial Number</label>
                <Input name="serial" />

                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    name="inUse"
                    id="inUse"
                    className="w-4 h-4 rounded border-gray-300"
                  />
                  <label htmlFor="inUse" className="text-sm">In Use</label>
                </div>

                <label className="text-sm">Store</label>
                <Select value={selectedStoreCode} onValueChange={setSelectedStoreCode}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select store" />
                  </SelectTrigger>
                  <SelectContent>
                    {stores.map((store) => (
                      <SelectItem key={store.store_code} value={store.store_code}>
                        {store.store} ({store.city})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <label className="text-sm">Device Arrival Date</label>
                <Input type="date" name="arrivalDate" />

                <label className="text-sm">Assigned/Allocated Date</label>
                <Input type="date" name="assignedDate" />

                <div className="flex justify-end gap-2 pt-4">
                  <Button type="submit" disabled={isUploading}>
                    {isUploading ? "Uploading..." : "Add"}
                  </Button>
                </div>
              </div>
            </form>
          </DialogContent>
        </Dialog>

        {/* Bulk upload dialog */}
        <Dialog open={bulkOpen} onOpenChange={setBulkOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Bulk Upload Inventory (CSV)</DialogTitle>
              <DialogDescription>Upload a CSV with columns: type, make, serial, in_use, site, arrival_date, assigned_date. Use true/false for in_use, dates in YYYY-MM-DD format.</DialogDescription>
            </DialogHeader>

              <div className="grid gap-2">
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" onClick={downloadTemplate}>Download Template</Button>
                <div className="text-sm text-muted-foreground">CSV columns: <span className="font-mono">type, make, serial, in_use, site, arrival_date, assigned_date</span></div>
              </div>
              <input
                type="file"
                accept=".csv,text/csv"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (!f) return;
                  const reader = new FileReader();
                  reader.onload = () => {
                    const text = String(reader.result || "");
                    const lines = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
                    if (lines.length === 0) return setParsedBulkItems([]);
                    // parse header or assume order
                    const header = lines[0].split(",").map((h) => h.trim().toLowerCase());
                    const hasHeader = header.includes("type") || header.includes("serial") || header.includes("make");
                    const rows = (hasHeader ? lines.slice(1) : lines).map((ln) => ln.split(",").map((c) => c.trim()));
                    const parsed = rows.map((cols) => {
                      if (hasHeader) {
                        const map: Record<string, string> = {};
                        header.forEach((h, i) => (map[h] = cols[i] || ""));
                        
                        // Map store_code to city and storeName
                        const storeCode = map.store_code || map.site || "";
                        const store = stores.find(s => s.store_code === storeCode);
                        
                        return {
                          type: (map.type || "Router") as InventoryItem["type"],
                          make: map.make || "Fortinet",
                          model: map.model || "",
                          serial: map.serial || "",
                          inUse: map.in_use === "true" || map.in_use === "TRUE" || map.in_use === "1",
                          storeCode: storeCode,
                          storeName: store?.store || "",
                          city: store?.city || "",
                          arrivalDate: map.arrival_date || "",
                          assignedDate: map.assigned_date || "",
                        } as Omit<InventoryItem, "id">;
                      }
                      // assume order: type, make, model, serial, in_use, store_code, arrival_date, assigned_date
                      const storeCode = cols[5] || "";
                      const store = stores.find(s => s.store_code === storeCode);
                      
                      return {
                        type: (cols[0] || "Router") as InventoryItem["type"],
                        make: cols[1] || "Fortinet",
                        model: cols[2] || "",
                        serial: cols[3] || "",
                        inUse: cols[4] === "true" || cols[4] === "TRUE" || cols[4] === "1",
                        storeCode: storeCode,
                        storeName: store?.store || "",
                        city: store?.city || "",
                        arrivalDate: cols[6] || "",
                        assignedDate: cols[7] || "",
                      } as Omit<InventoryItem, "id">;
                    }).filter((r) => r.serial || r.make);
                    setParsedBulkItems(parsed);
                  };
                  reader.readAsText(f);
                }}
              />

              {parsedBulkItems.length > 0 && (
                <div className="space-y-2">
                  <div className="text-sm">Preview ({parsedBulkItems.length} rows)</div>
                  <div className="max-h-48 overflow-auto border rounded p-2 bg-background">
                    <table className="w-full text-sm">
                      <thead>
                        <tr>
                          <th className="text-left">Type</th>
                          <th className="text-left">Make</th>
                          <th className="text-left">Model</th>
                          <th className="text-left">Serial</th>
                          <th className="text-left">In Use</th>
                          <th className="text-left">Store Code</th>
                          <th className="text-left">City</th>
                          <th className="text-left">Arrival</th>
                          <th className="text-left">Assigned</th>
                        </tr>
                      </thead>
                      <tbody>
                        {parsedBulkItems.map((p, i) => (
                          <tr key={i}>
                            <td>{p.type}</td>
                            <td>{p.make}</td>
                            <td>{p.model || "-"}</td>
                            <td className="font-mono">{p.serial}</td>
                            <td>{p.inUse ? "✓" : "✗"}</td>
                            <td>{p.storeCode || "-"}</td>
                            <td>{p.city || "-"}</td>
                            <td>{p.arrivalDate || "-"}</td>
                            <td>{p.assignedDate || "-"}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <div className="flex justify-end gap-2 pt-2">
                    <Button onClick={() => { setParsedBulkItems([]); setBulkOpen(false); }}>Cancel</Button>
                    <Button 
                      onClick={async () => { 
                        try {
                          setIsUploading(true);
                          const result = await addItems(parsedBulkItems);
                          if (result) {
                            toast({ 
                              title: "Success", 
                              description: `${parsedBulkItems.length} items imported successfully.` 
                            });
                            setParsedBulkItems([]);
                            setBulkOpen(false);
                          } else {
                            toast({ 
                              title: "Error", 
                              description: "Failed to import items. Please check the console for details.", 
                              variant: "destructive" 
                            });
                          }
                        } catch (error) {
                          console.error('Import error:', error);
                          toast({ 
                            title: "Error", 
                            description: "An error occurred during import.", 
                            variant: "destructive" 
                          });
                        } finally {
                          setIsUploading(false);
                        }
                      }}
                      disabled={isUploading}
                    >
                      {isUploading ? "Importing..." : "Import"}
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Inventory Dashboard Summary */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-6">
        {(["Router", "Access Point", "Switch", "Firewall"] as InventoryItem["type"][]).map((t) => {
          const counts = deviceCounts[t];
          return (
            <Card key={t} className="shadow-sm">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">{t}s</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{counts.total}</div>
                <div className="text-xs text-muted-foreground mt-1">Total</div>
                <div className="flex gap-4 mt-2 text-sm">
                  <div className="flex flex-col">
                    <span className="font-semibold">{counts.inUse}</span>
                    <span className="text-muted-foreground text-xs">In Use</span>
                  </div>
                  <div className="flex flex-col">
                    <span className="font-semibold">{counts.free}</span>
                    <span className="text-muted-foreground text-xs">Free</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

          <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Inventory List</CardTitle>
              <CardDescription>Items you have added</CardDescription>
            </div>
            <div className="flex gap-2 items-center">
              <div className="flex items-center gap-2">
                <label className="text-sm text-muted-foreground">Rows per page:</label>
                <Select value={itemsPerPage.toString()} onValueChange={(val) => {
                  setItemsPerPage(parseInt(val));
                  setCurrentPage(1); // Reset to first page when changing rows per page
                }}>
                  <SelectTrigger className="w-[100px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="10">10</SelectItem>
                    <SelectItem value="25">25</SelectItem>
                    <SelectItem value="50">50</SelectItem>
                    <SelectItem value="100">100</SelectItem>
                    <SelectItem value="200">200</SelectItem>
                    <SelectItem value="500">500</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {selectedItems.size > 0 && (
                <Button 
                  variant="destructive" 
                  onClick={() => setBulkDeleteOpen(true)}
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete Selected ({selectedItems.size})
                </Button>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12">
                  <Checkbox
                    checked={selectedItems.size === sortedItems.length && sortedItems.length > 0}
                    onCheckedChange={toggleSelectAll}
                  />
                </TableHead>
                <TableHead onClick={() => handleSort('type')} className="cursor-pointer hover:bg-muted/50">
                  <div className="flex items-center">Type {getSortIcon('type')}</div>
                </TableHead>
                <TableHead onClick={() => handleSort('make')} className="cursor-pointer hover:bg-muted/50">
                  <div className="flex items-center">Make {getSortIcon('make')}</div>
                </TableHead>
                <TableHead onClick={() => handleSort('model')} className="cursor-pointer hover:bg-muted/50">
                  <div className="flex items-center">Device Model {getSortIcon('model')}</div>
                </TableHead>
                <TableHead onClick={() => handleSort('serial')} className="cursor-pointer hover:bg-muted/50">
                  <div className="flex items-center">Serial {getSortIcon('serial')}</div>
                </TableHead>
                <TableHead onClick={() => handleSort('inUse')} className="cursor-pointer hover:bg-muted/50">
                  <div className="flex items-center">In Use {getSortIcon('inUse')}</div>
                </TableHead>
                <TableHead onClick={() => handleSort('storeCode')} className="cursor-pointer hover:bg-muted/50">
                  <div className="flex items-center">Store Code {getSortIcon('storeCode')}</div>
                </TableHead>
                <TableHead onClick={() => handleSort('city')} className="cursor-pointer hover:bg-muted/50">
                  <div className="flex items-center">City {getSortIcon('city')}</div>
                </TableHead>
                <TableHead onClick={() => handleSort('arrivalDate')} className="cursor-pointer hover:bg-muted/50">
                  <div className="flex items-center">Arrival Date {getSortIcon('arrivalDate')}</div>
                </TableHead>
                <TableHead onClick={() => handleSort('assignedDate')} className="cursor-pointer hover:bg-muted/50">
                  <div className="flex items-center">Assigned Date {getSortIcon('assignedDate')}</div>
                </TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sortedItems.map((it) => (
                <TableRow key={it.id} className="cursor-pointer hover:bg-muted/50" onClick={() => handleRowClick(it)}>
                  <TableCell onClick={(e) => e.stopPropagation()}>
                    <Checkbox
                      checked={selectedItems.has(it.id)}
                      onCheckedChange={() => toggleSelectItem(it.id)}
                    />
                  </TableCell>
                  <TableCell className="font-medium">{it.type}</TableCell>
                  <TableCell>{it.make}</TableCell>
                  <TableCell>{it.model || '-'}</TableCell>
                  <TableCell className="font-mono text-sm">{it.serial}</TableCell>
                  <TableCell>{it.inUse ? "✓" : "✗"}</TableCell>
                  <TableCell>{it.storeCode || '-'}</TableCell>
                  <TableCell>{it.city || '-'}</TableCell>
                  <TableCell>{it.arrivalDate || '-'}</TableCell>
                  <TableCell>{it.assignedDate || '-'}</TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedItem(it);
                          setEditOpen(true);
                        }}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedItem(it);
                          setDeleteOpen(true);
                        }}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          {sortedItems.length === 0 && <div className="text-sm text-muted-foreground p-4 text-center">
            {items.length === 0 ? "No inventory yet. Click 'Add Inventory' to create one." : "No items match the current filters."}
          </div>}
        </CardContent>
        
        {/* Pagination Controls */}
        <div className="flex items-center justify-between px-6 py-4 border-t">
          <div className="text-sm text-muted-foreground">
            Showing {totalCount === 0 ? 0 : ((currentPage - 1) * itemsPerPage) + 1} to {Math.min(currentPage * itemsPerPage, totalCount)} of {totalCount} items
          </div>
          {totalCount > 0 && (
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
                <span className="text-sm">Page {currentPage} of {Math.ceil(totalCount / itemsPerPage)}</span>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(p => Math.min(Math.ceil(totalCount / itemsPerPage), p + 1))}
                disabled={currentPage >= Math.ceil(totalCount / itemsPerPage)}
              >
                Next
              </Button>
            </div>
          )}
        </div>
      </Card>

      {/* Details Dialog */}
      <Dialog open={detailsOpen} onOpenChange={setDetailsOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Inventory Item Details</DialogTitle>
            <DialogDescription>View detailed information about this inventory item</DialogDescription>
          </DialogHeader>
          {selectedItem && (
            <div className="grid gap-3">
              <div className="grid grid-cols-2 gap-2">
                <div className="text-sm font-medium">Type:</div>
                <div className="text-sm">{selectedItem.type}</div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div className="text-sm font-medium">Make:</div>
                <div className="text-sm">{selectedItem.make}</div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div className="text-sm font-medium">Device Model:</div>
                <div className="text-sm">{selectedItem.model || '-'}</div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div className="text-sm font-medium">Serial Number:</div>
                <div className="text-sm font-mono">{selectedItem.serial}</div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div className="text-sm font-medium">In Use:</div>
                <div className="text-sm">{selectedItem.inUse ? "Yes" : "No"}</div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div className="text-sm font-medium">Store Code:</div>
                <div className="text-sm">{selectedItem.storeCode || "Not assigned"}</div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div className="text-sm font-medium">Store Name:</div>
                <div className="text-sm">{selectedItem.storeName || "Not set"}</div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div className="text-sm font-medium">City:</div>
                <div className="text-sm">{selectedItem.city || "Not set"}</div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div className="text-sm font-medium">Arrival Date:</div>
                <div className="text-sm">{selectedItem.arrivalDate || "Not set"}</div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div className="text-sm font-medium">Assigned Date:</div>
                <div className="text-sm">{selectedItem.assignedDate || "Not set"}</div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setDetailsOpen(false);
                if (selectedItem) {
                  setEditStoreCode(selectedItem.storeCode || "");
                  setEditOpen(true);
                }
              }}
            >
              Edit
            </Button>
            <Button onClick={() => setDetailsOpen(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Inventory Item</DialogTitle>
            <DialogDescription>Update the details of this inventory item</DialogDescription>
          </DialogHeader>
          {selectedItem && (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                const form = e.target as HTMLFormElement & {
                  type: HTMLSelectElement;
                  make: HTMLInputElement;
                  model: HTMLInputElement;
                  serial: HTMLInputElement;
                  inUse: HTMLInputElement;
                  arrivalDate: HTMLInputElement;
                  assignedDate: HTMLInputElement;
                };

                const selectedStore = stores.find(s => s.store_code === editStoreCode);
                const updated: InventoryItem = {
                  ...selectedItem,
                  type: form.type.value as InventoryItem["type"],
                  make: form.make.value,
                  model: form.model.value,
                  serial: form.serial.value,
                  inUse: form.inUse.checked,
                  storeCode: selectedStore?.store_code,
                  storeName: selectedStore?.store,
                  city: selectedStore?.city,
                  arrivalDate: form.arrivalDate.value,
                  assignedDate: form.assignedDate.value,
                };
                updateItem(updated);
                setEditOpen(false);
              }}
            >
              <div className="grid gap-2">
                <label className="text-sm">Type</label>
                <Select name="type" defaultValue={selectedItem.type}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Router">Router</SelectItem>
                    <SelectItem value="Switch">Switch</SelectItem>
                    <SelectItem value="Firewall">Firewall</SelectItem>
                    <SelectItem value="Access Point">Access Point</SelectItem>
                  </SelectContent>
                </Select>

                <label className="text-sm">Make</label>
                <Input name="make" defaultValue={selectedItem.make} />

                <label className="text-sm">Device Model</label>
                <Input name="model" defaultValue={selectedItem.model} />

                <label className="text-sm">Serial Number</label>
                <Input name="serial" defaultValue={selectedItem.serial} />

                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    name="inUse"
                    id="editInUse"
                    defaultChecked={selectedItem.inUse}
                    className="w-4 h-4 rounded border-gray-300"
                  />
                  <label htmlFor="editInUse" className="text-sm">In Use</label>
                </div>

                <label className="text-sm">Store</label>
                <Select value={editStoreCode} onValueChange={setEditStoreCode}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select store" />
                  </SelectTrigger>
                  <SelectContent>
                    {stores.map((store) => (
                      <SelectItem key={store.store_code} value={store.store_code}>
                        {store.store} ({store.city})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <label className="text-sm">Arrival Date</label>
                <Input type="date" name="arrivalDate" defaultValue={selectedItem.arrivalDate} />

                <label className="text-sm">Assigned Date</label>
                <Input type="date" name="assignedDate" defaultValue={selectedItem.assignedDate} />

                <div className="flex justify-end gap-2 pt-4">
                  <Button type="button" variant="outline" onClick={() => setEditOpen(false)}>
                    Cancel
                  </Button>
                  <Button type="submit">Save Changes</Button>
                </div>
              </div>
            </form>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Inventory Item</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this inventory item? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          {selectedItem && (
            <div className="py-4">
              <div className="text-sm">
                <strong>Type:</strong> {selectedItem.type} <br />
                <strong>Make:</strong> {selectedItem.make} <br />
                <strong>Serial:</strong> {selectedItem.serial}
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                if (selectedItem) {
                  deleteItem(selectedItem.id);
                  setDeleteOpen(false);
                }
              }}
            >
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Bulk Delete Dialog */}
      <Dialog open={bulkDeleteOpen} onOpenChange={setBulkDeleteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm Bulk Delete</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete {selectedItems.size} selected inventory items?
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <p className="text-sm text-muted-foreground">
              This action cannot be undone. All selected items will be permanently deleted.
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setBulkDeleteOpen(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={confirmBulkDelete}>
              Delete {selectedItems.size} Items
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
