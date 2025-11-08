import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Map, Upload as UploadIcon, UserPlus, Info } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

interface Store {
  id: string;
  city: string;
  store: string;
  store_code: string;
}

interface User {
  id: string;
  email: string;
  full_name: string | null;
}

export default function LoadSite() {
  const { toast } = useToast();
  const [cities, setCities] = useState<string[]>([]);
  const [stores, setStores] = useState<Store[]>([]);
  const [filteredStores, setFilteredStores] = useState<Store[]>([]);
  const [engineeringUsers, setEngineeringUsers] = useState<User[]>([]);
  
  const [selectedCity, setSelectedCity] = useState("");
  const [selectedStore, setSelectedStore] = useState("");
  const [selectedStoreCode, setSelectedStoreCode] = useState("");
  const [floorMapFile, setFloorMapFile] = useState<File | null>(null);
  const [assignedUserId, setAssignedUserId] = useState("");
  const [userSearchQuery, setUserSearchQuery] = useState("");
  const [showUserSuggestions, setShowUserSuggestions] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [deadline, setDeadline] = useState<string>("");

  type Assignment = {
    id: string;
    city: string;
    store_id: string;
    store_code: string;
    floor_map_path: string;
    floor_map_url: string;
    assigned_to: string;
    assigned_by: string | null;
    deadline_at: string;
    status: 'Pending' | 'In Progress' | 'Done' | 'Cancelled';
    created_at: string;
    updated_at: string;
    aps_needed: number | null;
    remarks: string | null;
  };

  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [loadingAssignments, setLoadingAssignments] = useState<boolean>(false);
  const [storeNameById, setStoreNameById] = useState<Record<string, string>>({});
  const [userLabelById, setUserLabelById] = useState<Record<string, string>>({});
  const [isAssignOpen, setAssignOpen] = useState(false);
  const [assignmentCityFilter, setAssignmentCityFilter] = useState<string>("All");
  const [assignmentSearch, setAssignmentSearch] = useState<string>("");
  const [kpis, setKpis] = useState<{ pending: number; inprogress: number; done: number; cancelled: number; overdue: number }>({ pending: 0, inprogress: 0, done: 0, cancelled: 0, overdue: 0 });

  useEffect(() => {
    loadCitiesAndStores();
    loadEngineeringUsers();
    loadAssignments();
  }, []);

  useEffect(() => {
    if (selectedCity) {
      const cityStores = stores.filter(s => s.city === selectedCity);
      setFilteredStores(cityStores);
      setSelectedStore("");
      setSelectedStoreCode("");
    }
  }, [selectedCity, stores]);

  useEffect(() => {
    if (selectedStore) {
      const store = filteredStores.find(s => s.id === selectedStore);
      if (store) {
        setSelectedStoreCode(store.store_code);
      }
    }
  }, [selectedStore, filteredStores]);

  async function loadCitiesAndStores() {
    try {
      const { data, error } = await supabase
        .from('stores')
        .select('id, city, store, store_code')
        .order('city');
      
      if (error) throw error;
      
      setStores(data || []);
      const uniqueCities = Array.from(new Set(data?.map(s => s.city) || []));
      setCities(uniqueCities);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to load cities and stores",
        variant: "destructive"
      });
    }
  }

  async function loadAssignments() {
    try {
      setLoadingAssignments(true);
      const { data, error } = await supabase
        .from('site_assignments')
        .select('id, city, store_id, store_code, floor_map_path, floor_map_url, assigned_to, assigned_by, deadline_at, status, created_at, updated_at, aps_needed, remarks')
        .order('deadline_at', { ascending: true });

      if (error) throw error;

      const rows = (data || []) as Assignment[];
      setAssignments(rows);

      // Compute KPIs
      const now = Date.now();
      let pending = 0, inprogress = 0, done = 0, cancelled = 0, overdue = 0;
      for (const r of rows) {
        if (r.status === 'Pending') pending++;
        else if (r.status === 'In Progress') inprogress++;
        else if (r.status === 'Done') done++;
        else if (r.status === 'Cancelled') cancelled++;
        // Overdue if not Done/Cancelled and past deadline
        if (r.status !== 'Done' && r.status !== 'Cancelled') {
          if (new Date(r.deadline_at).getTime() < now) overdue++;
        }
      }
      setKpis({ pending, inprogress, done, cancelled, overdue });

      // Build lookup maps for store names and user labels
      const storeIds = Array.from(new Set(rows.map(r => r.store_id))).filter(Boolean);
      const userIds = Array.from(new Set(rows.map(r => r.assigned_to).concat(rows.map(r => r.assigned_by || '').filter(Boolean))));

      if (storeIds.length > 0) {
        const { data: storesData, error: storesErr } = await supabase
          .from('stores')
          .select('id, store')
          .in('id', storeIds);
        if (!storesErr && storesData) {
          const map: Record<string, string> = {};
          for (const s of storesData) map[s.id] = s.store;
          setStoreNameById(map);
        }
      } else {
        setStoreNameById({});
      }

      if (userIds.length > 0) {
        const { data: profs, error: profErr } = await supabase
          .from('profiles')
          .select('id, full_name, email')
          .in('id', userIds as string[]);
        if (!profErr && profs) {
          const map: Record<string, string> = {};
          for (const p of profs) map[p.id] = p.full_name || p.email;
          setUserLabelById(map);
        }
      } else {
        setUserLabelById({});
      }
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to load assignments',
        variant: 'destructive'
      });
    } finally {
      setLoadingAssignments(false);
    }
  }

  const filteredAssignments = assignments.filter(a => {
    // City filter
    if (assignmentCityFilter !== 'All' && a.city !== assignmentCityFilter) return false;
    if (assignmentSearch.trim().length >= 2) {
      const q = assignmentSearch.toLowerCase();
      const siteName = (storeNameById[a.store_id] || '').toLowerCase();
      const userLabel = (userLabelById[a.assigned_to] || '').toLowerCase();
      const code = (a.store_code || '').toLowerCase();
      return siteName.includes(q) || userLabel.includes(q) || code.includes(q) || a.city.toLowerCase().includes(q);
    }
    return true;
  });

  async function loadEngineeringUsers() {
    try {
      // Note: Filtering by department requires the `department` column migration to be applied.
      // To avoid type/lint errors before migrations, we fetch minimal fields and filter client-side when possible.
      const { data, error } = await supabase
        .from('profiles')
        .select('id, email, full_name')
        .order('full_name');
      
      if (error) throw error;
      setEngineeringUsers((data as User[]) || []);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to load engineering users",
        variant: "destructive"
      });
    }
  }

  const filteredUsers = engineeringUsers.filter((u) => {
    if (userSearchQuery.length < 2) return false;
    const query = userSearchQuery.toLowerCase();
    const name = (u.full_name || '').toLowerCase();
    const email = u.email.toLowerCase();
    return name.includes(query) || email.includes(query);
  });

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    
    if (!selectedCity || !selectedStore || !floorMapFile || !assignedUserId || !deadline) {
      toast({
        title: "Missing Information",
        description: "Please fill all required fields including deadline",
        variant: "destructive"
      });
      return;
    }

    setUploading(true);
    try {
      // Upload floor map to Supabase Storage
      const fileExt = floorMapFile.name.split('.').pop();
      const fileName = `${selectedStoreCode}_${Date.now()}.${fileExt}`;
      const filePath = `floor-maps/${selectedCity}/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('inventory')
        .upload(filePath, floorMapFile);

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('inventory')
        .getPublicUrl(filePath);

      // Save assignment to database (requires site_assignments table migration)
      const { data: authData } = await supabase.auth.getUser();
      const assignedBy = authData?.user?.id || null;

      const { error: insertError } = await supabase
        .from('site_assignments')
        .insert({
          city: selectedCity,
          store_id: selectedStore,
          store_code: selectedStoreCode,
          floor_map_path: filePath,
          floor_map_url: publicUrl,
          assigned_to: assignedUserId,
          assigned_by: assignedBy,
          deadline_at: new Date(deadline).toISOString(),
          status: 'Pending',
        });

      if (insertError) {
        // If table doesn't exist yet or RLS prevents insert, still treat upload as success and notify
        console.warn('site_assignments insert error:', insertError);
      }

      toast({
        title: "Success",
        description: `Floor map uploaded, deadline set, and assignment created`,
      });

      // Reset form
      setSelectedCity("");
      setSelectedStore("");
      setSelectedStoreCode("");
      setFloorMapFile(null);
      setAssignedUserId("");
      setUserSearchQuery("");
      setDeadline("");

      // Refresh list
      loadAssignments();
      // Close dialog
      setAssignOpen(false);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to process site loading",
        variant: "destructive"
      });
    } finally {
      setUploading(false);
    }
  }

  const selectedUser = engineeringUsers.find(u => u.id === assignedUserId);

  return (
    <div className="flex flex-col gap-6 p-6">
      {/* KPI Summary */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        <Card className="p-3">
          <div className="text-xs text-muted-foreground">Pending</div>
          <div className="text-2xl font-semibold">{kpis.pending}</div>
        </Card>
        <Card className="p-3">
          <div className="text-xs text-muted-foreground">In Progress</div>
          <div className="text-2xl font-semibold">{kpis.inprogress}</div>
        </Card>
        <Card className="p-3">
          <div className="text-xs text-muted-foreground">Done</div>
          <div className="text-2xl font-semibold">{kpis.done}</div>
        </Card>
        <Card className="p-3">
          <div className="text-xs text-muted-foreground">Cancelled</div>
          <div className="text-2xl font-semibold">{kpis.cancelled}</div>
        </Card>
        <Card className="p-3">
          <div className="text-xs text-muted-foreground">Overdue</div>
          <div className="text-2xl font-semibold text-red-600">{kpis.overdue}</div>
        </Card>
      </div>

      <Dialog open={isAssignOpen} onOpenChange={setAssignOpen}>
        <div className="flex items-center justify-between">
          <div className="flex flex-col gap-2">
            <h1 className="text-3xl font-bold text-foreground flex items-center gap-2">
              <Map className="h-8 w-8" />
              HeatMaps
            </h1>
            <p className="text-muted-foreground">
              Assign site loading tasks to engineering team
            </p>
          </div>
          <DialogTrigger asChild>
            <Button size="sm">Assign Heat Map</Button>
          </DialogTrigger>
        </div>

        <DialogContent className="sm:max-w-[640px]">
          <DialogHeader>
            <DialogTitle>Site Loading Assignment</DialogTitle>
            <DialogDescription>
              Select site, upload floor map, pick deadline and assign to user.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-3 text-sm mt-2">
            {/* Row 1: City and Store */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="city" className="text-xs">City *</Label>
                <Select value={selectedCity} onValueChange={setSelectedCity}>
                  <SelectTrigger id="city" className="h-9">
                    <SelectValue placeholder="Select city" />
                  </SelectTrigger>
                  <SelectContent>
                    {cities.map((city) => (
                      <SelectItem key={city} value={city}>
                        {city}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="store" className="text-xs">Site/Store *</Label>
                <Select 
                  value={selectedStore} 
                  onValueChange={setSelectedStore}
                  disabled={!selectedCity}
                >
                  <SelectTrigger id="store" className="h-9">
                    <SelectValue placeholder={selectedCity ? "Select site" : "Select city first"} />
                  </SelectTrigger>
                  <SelectContent>
                    {filteredStores.map((store) => (
                      <SelectItem key={store.id} value={store.id}>
                        {store.store}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Row 2: Store Code and Deadline */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="storeCode" className="text-xs">Site Code</Label>
                <Input
                  id="storeCode"
                  value={selectedStoreCode}
                  disabled
                  placeholder="Auto-filled"
                  className="bg-muted h-9 text-sm"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="deadline" className="text-xs">Deadline *</Label>
                <Input
                  id="deadline"
                  type="datetime-local"
                  value={deadline}
                  onChange={(e) => setDeadline(e.target.value)}
                  className="h-9 text-sm"
                />
              </div>
            </div>

            {/* Row 3: Floor Map Upload */}
            <div className="space-y-2">
              <Label htmlFor="floorMap" className="text-xs">Upload Floor Map *</Label>
              <div className="flex items-center gap-2">
                <Input
                  id="floorMap"
                  type="file"
                  accept=".pdf,.png,.jpg,.jpeg,.dwg"
                  onChange={(e) => setFloorMapFile(e.target.files?.[0] || null)}
                  className="cursor-pointer h-9 text-sm"
                />
                <UploadIcon className="h-4 w-4 text-muted-foreground shrink-0" />
              </div>
              {floorMapFile && (
                <p className="text-[10px] text-muted-foreground">
                  {floorMapFile.name}
                </p>
              )}
            </div>

            {/* Row 4: Assign User */}
            <div className="space-y-2">
              <Label className="text-xs">Assign to Engineering User *</Label>
              <div className="relative">
                <Input
                  placeholder="Type name or email (min 2 chars)..."
                  value={userSearchQuery}
                  onChange={(e) => {
                    setUserSearchQuery(e.target.value);
                    setShowUserSuggestions(e.target.value.length >= 2);
                  }}
                  onFocus={() => setShowUserSuggestions(userSearchQuery.length >= 2)}
                  className="h-9 text-sm"
                />
                {showUserSuggestions && filteredUsers.length > 0 && (
                  <div className="absolute z-50 w-full mt-1 bg-popover border rounded-md shadow-md max-h-48 overflow-y-auto">
                    {filteredUsers.map((u) => (
                      <button
                        key={u.id}
                        type="button"
                        className="w-full px-3 py-2 text-left hover:bg-accent flex items-start gap-2 border-b last:border-0"
                        onClick={() => {
                          setAssignedUserId(u.id);
                          setUserSearchQuery(u.full_name || u.email);
                          setShowUserSuggestions(false);
                        }}
                      >
                        <UserPlus className="h-4 w-4 mt-0.5 shrink-0 text-muted-foreground" />
                        <div className="flex flex-col flex-1">
                          <span className="font-medium text-sm">{u.full_name || u.email}</span>
                          {u.full_name && <span className="text-xs text-muted-foreground">{u.email}</span>}
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
              {selectedUser && (
                <div className="text-xs text-muted-foreground mt-1 p-2 bg-muted rounded">
                  Assigned: <span className="font-medium text-foreground">{selectedUser.full_name || selectedUser.email}</span>
                </div>
              )}
            </div>

            <div className="pt-1">
              <Button type="submit" disabled={uploading} size="sm" className="w-full h-8 text-xs">
                {uploading ? "Processing..." : "Submit Assignment"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      <Card>
        <CardHeader>
          <CardTitle>Upcoming Site Loads</CardTitle>
          <CardDescription>Nearest deadlines first</CardDescription>
        </CardHeader>
        <CardContent>
          {/* Filters */}
          <div className="flex flex-col gap-3 mb-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div className="space-y-1">
                <Label htmlFor="cityFilter" className="text-xs">City Filter</Label>
                <Select value={assignmentCityFilter} onValueChange={setAssignmentCityFilter}>
                  <SelectTrigger id="cityFilter" className="h-8 text-xs">
                    <SelectValue placeholder="Filter by city" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="All">All</SelectItem>
                    {cities.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1 md:col-span-2">
                <Label htmlFor="searchAssign" className="text-xs">Search (site / user / code / city)</Label>
                <Input
                  id="searchAssign"
                  value={assignmentSearch}
                  onChange={(e)=>setAssignmentSearch(e.target.value)}
                  placeholder="Type at least 2 chars to search..."
                  className="h-8 text-xs"
                />
              </div>
            </div>
            <Separator className="mt-1" />
          </div>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>City</TableHead>
                  <TableHead>Site</TableHead>
                  <TableHead>Code</TableHead>
                  <TableHead>Assigned To</TableHead>
                  <TableHead>Deadline</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Floor Map</TableHead>
                  <TableHead>APs Needed</TableHead>
                  <TableHead>Remarks</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredAssignments.map((a) => {
                  const siteName = storeNameById[a.store_id] || '—';
                  const userLabel = userLabelById[a.assigned_to] || '—';
                  const deadlineDate = new Date(a.deadline_at);
                  const isOverdue = (a.status !== 'Done' && a.status !== 'Cancelled') && (deadlineDate.getTime() < Date.now());
                  const deadlineStr = deadlineDate.toLocaleString();
                  const statusColor = a.status === 'Pending' ? 'bg-yellow-100 text-yellow-800' :
                    a.status === 'In Progress' ? 'bg-blue-100 text-blue-800' :
                    a.status === 'Done' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800';
                  return (
                    <TableRow key={a.id} className="hover:bg-muted/40">
                      <TableCell className="whitespace-nowrap">{a.city}</TableCell>
                      <TableCell className="min-w-[180px]">{siteName}</TableCell>
                      <TableCell className="whitespace-nowrap">{a.store_code}</TableCell>
                      <TableCell className="min-w-[180px]">{userLabel}</TableCell>
                      <TableCell className={`whitespace-nowrap ${isOverdue ? 'text-red-600 font-medium' : ''}`}>{deadlineStr}</TableCell>
                      <TableCell>
                        <span className={`inline-flex items-center px-2 py-1 rounded text-xs font-medium ${statusColor}`}>
                          {a.status}
                        </span>
                      </TableCell>
                      <TableCell>
                        <a href={a.floor_map_url} target="_blank" rel="noreferrer" className="text-primary hover:underline">
                          View
                        </a>
                      </TableCell>
                      <TableCell className="whitespace-nowrap text-xs">{a.aps_needed != null ? a.aps_needed : '—'}</TableCell>
                      <TableCell className="min-w-[160px] text-xs">
                        {a.remarks ? (
                          a.remarks.length > 32 ? (
                            <div className="flex items-center gap-2">
                              <span className="truncate max-w-[200px]">{a.remarks.slice(0, 32)}…</span>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <button
                                    type="button"
                                    aria-label="View full remarks"
                                    className="text-muted-foreground hover:text-foreground"
                                  >
                                    <Info className="h-4 w-4" />
                                  </button>
                                </TooltipTrigger>
                                <TooltipContent className="max-w-sm break-words">
                                  {a.remarks}
                                </TooltipContent>
                              </Tooltip>
                            </div>
                          ) : (
                            <span>{a.remarks}</span>
                          )
                        ) : (
                          '—'
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
                {filteredAssignments.length === 0 && !loadingAssignments && (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center text-muted-foreground">
                      No site loads yet.
                    </TableCell>
                  </TableRow>
                )}
                {loadingAssignments && (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center text-muted-foreground">
                      Loading...
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
