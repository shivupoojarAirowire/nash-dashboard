import { useState, useEffect } from "react";
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

type InventoryItem = {
  id: number;
  type: "Router" | "Switch" | "Firewall" | "Access Point";
  make: string;
  serial: string;
  // New fields
  inUse?: boolean;
  site?: string;
  arrivalDate?: string; // ISO date
  assignedDate?: string; // ISO date
};

const initialInventory: InventoryItem[] = [];

export default function InventoryPage() {
  const { has, loading } = useFeatureFlags();
  const navigate = useNavigate();
  useEffect(() => {
    if (!loading && !has('Inventory')) {
      navigate('/');
    }
  }, [loading, has, navigate]);
  if (!loading && !has('Inventory')) {
    return (
      <div className="p-6">
        <Card>
          <CardHeader>
            <CardTitle>Access Restricted</CardTitle>
            <CardDescription>The Inventory feature is disabled for your account.</CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }
  const [items, setItems] = useState<InventoryItem[]>(initialInventory);
  const [nextId, setNextId] = useState(1);
  const [open, setOpen] = useState(false);
  const [selectedType, setSelectedType] = useState<InventoryItem["type"]>("Router");
  const [bulkOpen, setBulkOpen] = useState(false);
  const [parsedBulkItems, setParsedBulkItems] = useState<Omit<InventoryItem, "id">[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const { toast } = useToast();

  // Load existing inventory from DB on first mount
  useEffect(() => {
    (async () => {
      const rows = await getInventory();
      if (!rows || !Array.isArray(rows)) return;
      const mapped: InventoryItem[] = rows.map((r: any, idx: number) => ({
        id: idx + 1,
        type: r.type,
        make: r.make,
        serial: r.serial,
        inUse: !!r.in_use,
        site: r.site || '',
        arrivalDate: r.arrival_date || '',
        assignedDate: r.assigned_date || '',
      }));
      setItems(mapped);
      setNextId(mapped.length + 1);
    })();
  }, []);
  
  const downloadTemplate = () => {
    const csv = [
      "type,make,serial,in_use,site,arrival_date,assigned_date",
      "Router,Fortinet,FTN-EX-0001,true,Store NYC-01,2024-01-15,2024-01-20",
      "Switch,Fortinet,SW-EX-0002,false,,,2024-02-10,",
      "Firewall,Fortinet,FW-EX-0003,true,Store LA-02,2024-03-05,2024-03-12",
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
    // Try to persist to Supabase; on failure fall back to local only
    try {
      const inserted = await addInventoryBulk(newItems.map((it) => ({ 
        type: it.type, 
        make: it.make, 
        serial: it.serial,
        in_use: !!it.inUse,
        site: it.site || null,
        arrival_date: it.arrivalDate || null,
        assigned_date: it.assignedDate || null,
      })));
          // ignore returned uuids for now; still maintain local numeric ids for UI
      setItems((s) => {
        const withIds = newItems.map((it, idx) => ({
          id: nextId + idx,
          ...it,
        }));
        return [...withIds, ...s];
      });
      setNextId((n) => n + newItems.length);
      return inserted;
    } catch (e) {
      // fallback to local state if persistence fails
      setItems((s) => {
        const withIds = newItems.map((it, idx) => ({ id: nextId + idx, ...it }));
        return [...withIds, ...s];
      });
      setNextId((n) => n + newItems.length);
      return null;
    }
  };

  const addItem = async (item: Omit<InventoryItem, "id">) => {
    try {
      await addInventory({
        type: item.type,
        make: item.make,
        serial: item.serial,
        in_use: !!item.inUse,
        site: item.site || null,
        arrival_date: item.arrivalDate ? item.arrivalDate : null,
        assigned_date: item.assignedDate ? item.assignedDate : null,
      } as any);
      setItems((s) => [{ id: nextId, ...item }, ...s]);
      setNextId((n) => n + 1);
    } catch {
      setItems((s) => [{ id: nextId, ...item }, ...s]);
      setNextId((n) => n + 1);
    }
  };

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-3xl font-bold">Inventory</h1>
          <p className="text-muted-foreground">Track device inventory across your stores</p>
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
                  serial: HTMLInputElement;
                };
                const make = form.make.value || "";
                const serial = form.serial.value || "";

                if (!make || !serial) return;

                const inUse = form.inUse.checked;
                const site = form.site?.value || "";
                const arrivalDate = form.arrivalDate?.value || "";
                const assignedDate = form.assignedDate?.value || "";
                
                setIsUploading(true);
                try {
                  await addItem({
                    type: selectedType,
                    make,
                    serial,
                    inUse,
                    site,
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

                <label className="text-sm">Serial Number</label>
                <Input name="serial" />

                <div className="grid md:grid-cols-2 gap-3">
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      name="inUse"
                      id="inUse"
                      className="w-4 h-4 rounded border-gray-300"
                    />
                    <label htmlFor="inUse" className="text-sm">In Use</label>
                  </div>
                  <div>
                    <label className="text-sm">Site (if in use)</label>
                    <Input name="site" placeholder="e.g., Store NYC-01" />
                  </div>
                  <div>
                    <label className="text-sm">Device Arrival Date</label>
                    <Input type="date" name="arrivalDate" />
                  </div>
                  <div>
                    <label className="text-sm">Assigned/Allocated Date</label>
                    <Input type="date" name="assignedDate" />
                  </div>
                </div>

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
                        return {
                          type: (map.type || "Router") as InventoryItem["type"],
                          make: map.make || "Fortinet",
                          serial: map.serial || "",
                          inUse: map.in_use === "true" || map.in_use === "TRUE" || map.in_use === "1",
                          site: map.site || "",
                          arrivalDate: map.arrival_date || "",
                          assignedDate: map.assigned_date || "",
                        } as Omit<InventoryItem, "id">;
                      }
                      // assume order: type, make, serial, in_use, site, arrival_date, assigned_date
                      return {
                        type: (cols[0] || "Router") as InventoryItem["type"],
                        make: cols[1] || "Fortinet",
                        serial: cols[2] || "",
                        inUse: cols[3] === "true" || cols[3] === "TRUE" || cols[3] === "1",
                        site: cols[4] || "",
                        arrivalDate: cols[5] || "",
                        assignedDate: cols[6] || "",
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
                          <th className="text-left">Serial</th>
                          <th className="text-left">In Use</th>
                          <th className="text-left">Site</th>
                          <th className="text-left">Arrival</th>
                          <th className="text-left">Assigned</th>
                        </tr>
                      </thead>
                      <tbody>
                        {parsedBulkItems.map((p, i) => (
                          <tr key={i}>
                            <td>{p.type}</td>
                            <td>{p.make}</td>
                            <td className="font-mono">{p.serial}</td>
                            <td>{p.inUse ? "✓" : "✗"}</td>
                            <td>{p.site || "-"}</td>
                            <td>{p.arrivalDate || "-"}</td>
                            <td>{p.assignedDate || "-"}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <div className="flex justify-end gap-2 pt-2">
                    <Button onClick={() => { setParsedBulkItems([]); setBulkOpen(false); }}>Cancel</Button>
                    <Button onClick={async () => { await addItems(parsedBulkItems); setParsedBulkItems([]); setBulkOpen(false); }}>Import</Button>
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
          const total = items.filter((i) => i.type === t).length;
          const inUse = items.filter((i) => i.type === t && i.inUse).length;
          const free = total - inUse;
          return (
            <Card key={t} className="shadow-sm">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">{t}s</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{total}</div>
                <div className="text-xs text-muted-foreground mt-1">Total</div>
                <div className="flex gap-4 mt-2 text-sm">
                  <div className="flex flex-col">
                    <span className="font-semibold">{inUse}</span>
                    <span className="text-muted-foreground text-xs">In Use</span>
                  </div>
                  <div className="flex flex-col">
                    <span className="font-semibold">{free}</span>
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
          <CardTitle>Inventory List</CardTitle>
          <CardDescription>Items you have added</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Type</TableHead>
                <TableHead>Make</TableHead>
                <TableHead>Serial</TableHead>
                    <TableHead>In Use</TableHead>
                    <TableHead>Site</TableHead>
                    <TableHead>Arrival Date</TableHead>
                    <TableHead>Assigned Date</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((it) => (
                <TableRow key={it.id}>
                  <TableCell className="font-medium">{it.type}</TableCell>
                  <TableCell>{it.make}</TableCell>
                  <TableCell className="font-mono text-sm">{it.serial}</TableCell>
                      <TableCell>{it.inUse ? "✓" : "✗"}</TableCell>
                      <TableCell>{it.site || '-'}</TableCell>
                      <TableCell>{it.arrivalDate || '-'}</TableCell>
                      <TableCell>{it.assignedDate || '-'}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          {items.length === 0 && <div className="text-sm text-muted-foreground">No inventory yet. Click "Add Inventory" to create one.</div>}
        </CardContent>
      </Card>
    </div>
  );
}
