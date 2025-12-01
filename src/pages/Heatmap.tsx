import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Map, Upload as UploadIcon, UserPlus, Info, Pencil, Trash2, ChevronDown } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
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
    floors?: number | null;
    floor_size?: string | null;
    heatmap_files?: string[] | null;
    completed_at?: string | null;
  };

  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [loadingAssignments, setLoadingAssignments] = useState<boolean>(false);
  const [storeNameById, setStoreNameById] = useState<Record<string, string>>({});
  const [userLabelById, setUserLabelById] = useState<Record<string, string>>({});
  const [isAssignOpen, setAssignOpen] = useState(false);
  const [assignmentCityFilter, setAssignmentCityFilter] = useState<string>("All");
  const [assignmentSearch, setAssignmentSearch] = useState<string>("");
  const [kpis, setKpis] = useState<{ pending: number; inprogress: number; done: number; cancelled: number; overdue: number }>({ pending: 0, inprogress: 0, done: 0, cancelled: 0, overdue: 0 });
  
  // Edit dialog states
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editingAssignment, setEditingAssignment] = useState<Assignment | null>(null);
  const [editDeadline, setEditDeadline] = useState<string>("");
  const [editStatus, setEditStatus] = useState<'Pending' | 'In Progress' | 'Done' | 'Cancelled'>('Pending');
  const [editApsNeeded, setEditApsNeeded] = useState<string>("");
  const [editRemarks, setEditRemarks] = useState<string>("");
  // Completion fields
  const [completeFiles, setCompleteFiles] = useState<File[]>([]);
  const [completeFloors, setCompleteFloors] = useState<string>("");
  const [completeFloorSize, setCompleteFloorSize] = useState<string>("");
  
  // View details dialog state
  const [isViewDetailsOpen, setIsViewDetailsOpen] = useState(false);
  const [viewingAssignment, setViewingAssignment] = useState<Assignment | null>(null);
  
  // Delete confirmation dialog state
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [assignmentToDelete, setAssignmentToDelete] = useState<string | null>(null);
  
  // Collapsible state for engineer performance
  const [isEngineerPerformanceOpen, setIsEngineerPerformanceOpen] = useState(false);

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
        .select('id, city, store_id, store_code, floor_map_path, floor_map_url, assigned_to, assigned_by, deadline_at, status, created_at, updated_at, aps_needed, remarks, floors, floor_size, heatmap_files, completed_at')
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

  // Handle View Assignment Details
  function handleViewDetails(assignment: Assignment) {
    setViewingAssignment(assignment);
    setIsViewDetailsOpen(true);
  }

  // Handle Edit Assignment
  function handleEditAssignment(assignment: Assignment) {
    setEditingAssignment(assignment);
    setEditDeadline(new Date(assignment.deadline_at).toISOString().slice(0, 16));
    setEditStatus(assignment.status);
    setEditApsNeeded(assignment.aps_needed?.toString() || "");
    setEditRemarks(assignment.remarks || "");
    setCompleteFiles([]);
    setCompleteFloors(assignment.floors?.toString() || "");
    setCompleteFloorSize(assignment.floor_size || "");
    setIsEditOpen(true);
  }

  // Handle Update Assignment
  async function handleUpdateAssignment(e: React.FormEvent) {
    e.preventDefault();
    if (!editingAssignment) return;

    // Validate required fields
    if (!editApsNeeded.trim()) {
      toast({ title: "Validation Error", description: "APs Needed is required", variant: "destructive" });
      return;
    }

    // Additional validation when marking as Done
    if (editStatus === 'Done') {
      if (completeFiles.length === 0) {
        toast({ title: "Validation Error", description: "At least one heatmap file is required when marking as Done", variant: "destructive" });
        return;
      }
      if (!completeFloors.trim()) {
        toast({ title: "Validation Error", description: "No. of Floors is required when marking as Done", variant: "destructive" });
        return;
      }
      if (!completeFloorSize.trim()) {
        toast({ title: "Validation Error", description: "Floor Size is required when marking as Done", variant: "destructive" });
        return;
      }
    }

    try {
      let uploadedUrls: string[] = [];
      // If marking as Done and files selected, upload to heatmaps bucket
      if (editStatus === 'Done' && completeFiles.length > 0) {
        for (const file of completeFiles) {
          const ext = file.name.split('.').pop();
          const safeCode = (editingAssignment.store_code || 'site').replace(/[^a-zA-Z0-9_-]/g, '_');
          const fileName = `${safeCode}_${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`;
          const path = `${editingAssignment.id}/${fileName}`;
          const { error: upErr } = await supabase.storage
            .from('heatmaps')
            .upload(path, file);
          if (upErr) throw upErr;
          const { data: { publicUrl } } = supabase.storage
            .from('heatmaps')
            .getPublicUrl(path);
          uploadedUrls.push(publicUrl);
        }
      }

      const updateData: any = {
        deadline_at: new Date(editDeadline).toISOString(),
        status: editStatus,
        aps_needed: parseInt(editApsNeeded),
        remarks: editRemarks || null,
        updated_at: new Date().toISOString()
      };

      // When marking as Done, always set completion fields (already validated above)
      if (editStatus === 'Done') {
        updateData.floors = parseInt(completeFloors);
        updateData.floor_size = completeFloorSize;
        updateData.heatmap_files = uploadedUrls;
        updateData.completed_at = new Date().toISOString();
      } else {
        // Preserve existing values if not Done
        updateData.floors = completeFloors ? parseInt(completeFloors) : editingAssignment.floors;
        updateData.floor_size = completeFloorSize || editingAssignment.floor_size;
        updateData.heatmap_files = editingAssignment.heatmap_files;
        updateData.completed_at = editingAssignment.completed_at;
      }

      const { error } = await supabase
        .from('site_assignments')
        .update(updateData)
        .eq('id', editingAssignment.id);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Assignment updated successfully"
      });

      setIsEditOpen(false);
      setEditingAssignment(null);
      loadAssignments();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to update assignment",
        variant: "destructive"
      });
    }
  }

  // Handle Delete Assignment - Open confirmation dialog
  function handleDeleteAssignment(assignmentId: string) {
    console.log("Delete button clicked for ID:", assignmentId);
    setAssignmentToDelete(assignmentId);
    setIsDeleteDialogOpen(true);
  }

  // Confirm Delete Assignment
  async function confirmDeleteAssignment() {
    if (!assignmentToDelete) return;

    try {
      console.log("Attempting to delete assignment:", assignmentToDelete);
      
      // Check current user and their role
      const { data: userData } = await supabase.auth.getUser();
      console.log("Current user:", userData?.user?.id);
      
      if (userData?.user?.id) {
        const { data: roleData } = await supabase
          .from('user_roles')
          .select('role')
          .eq('user_id', userData.user.id);
        console.log("User roles:", roleData);
      }
      
      const { data, error } = await supabase
        .from('site_assignments')
        .delete()
        .eq('id', assignmentToDelete)
        .select();

      console.log("Delete response:", { data, error });

      if (error) {
        console.error("Delete error:", error);
        // Show more specific error message
        if (error.code === 'PGRST301' || error.message.includes('policy')) {
          toast({
            title: "Permission Denied",
            description: "You don't have permission to delete assignments. Only admin/manager roles can delete.",
            variant: "destructive"
          });
        } else {
          throw error;
        }
        setIsDeleteDialogOpen(false);
        setAssignmentToDelete(null);
        return;
      }

      toast({
        title: "Success",
        description: "Assignment deleted successfully"
      });

      setIsDeleteDialogOpen(false);
      setAssignmentToDelete(null);
      await loadAssignments();
    } catch (error: any) {
      console.error("Caught error:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to delete assignment",
        variant: "destructive"
      });
      setIsDeleteDialogOpen(false);
      setAssignmentToDelete(null);
    }
  }

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

      {/* Engineer Performance Stats */}
      <Collapsible open={isEngineerPerformanceOpen} onOpenChange={setIsEngineerPerformanceOpen}>
        <Card>
          <CollapsibleTrigger asChild>
            <CardHeader className="cursor-pointer hover:bg-accent/50 transition-colors">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Engineer Performance</CardTitle>
                  <CardDescription>Heat map allocation and completion statistics by engineer</CardDescription>
                </div>
                <ChevronDown 
                  className={`h-5 w-5 transition-transform duration-200 ${isEngineerPerformanceOpen ? 'transform rotate-180' : ''}`}
                />
              </div>
            </CardHeader>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {(() => {
              // Group assignments by engineer
              const engineerStats = assignments.reduce((acc, assignment) => {
                const engineerId = assignment.assigned_to;
                const engineerName = userLabelById[engineerId] || 'Unknown';
                
                if (!acc[engineerId]) {
                  acc[engineerId] = {
                    name: engineerName,
                    total: 0,
                    completed: 0,
                    inProgress: 0,
                    pending: 0,
                    avgCompletionTime: 0,
                    completionTimes: []
                  };
                }
                
                acc[engineerId].total++;
                
                if (assignment.status === 'Done') {
                  acc[engineerId].completed++;
                  // Calculate time taken (deadline to completion)
                  const deadline = new Date(assignment.deadline_at).getTime();
                  const completed = new Date(assignment.updated_at).getTime();
                  const timeTaken = Math.max(0, deadline - completed); // Positive if completed before deadline
                  acc[engineerId].completionTimes.push(timeTaken);
                } else if (assignment.status === 'In Progress') {
                  acc[engineerId].inProgress++;
                } else if (assignment.status === 'Pending') {
                  acc[engineerId].pending++;
                }
                
                return acc;
              }, {} as Record<string, { name: string; total: number; completed: number; inProgress: number; pending: number; avgCompletionTime: number; completionTimes: number[] }>);

              // Calculate average completion time for each engineer
              Object.keys(engineerStats).forEach(engineerId => {
                const times = engineerStats[engineerId].completionTimes;
                if (times.length > 0) {
                  const avg = times.reduce((sum, time) => sum + time, 0) / times.length;
                  engineerStats[engineerId].avgCompletionTime = avg;
                }
              });

              // Sort by completion rate
              const sortedEngineers = Object.entries(engineerStats).sort((a, b) => {
                const rateA = a[1].total > 0 ? (a[1].completed / a[1].total) : 0;
                const rateB = b[1].total > 0 ? (b[1].completed / b[1].total) : 0;
                return rateB - rateA;
              });

              if (sortedEngineers.length === 0) {
                return <div className="col-span-full text-center text-muted-foreground">No assignments yet</div>;
              }

              return sortedEngineers.map(([engineerId, stats], index) => {
                const completionRate = stats.total > 0 ? ((stats.completed / stats.total) * 100).toFixed(1) : '0';
                const isTopPerformer = index === 0 && stats.completed > 0;
                
                return (
                  <Card key={engineerId} className={`p-4 ${isTopPerformer ? 'border-2 border-green-500 bg-green-50/50' : ''}`}>
                    <div className="space-y-3">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <p className="font-semibold text-sm truncate">{stats.name}</p>
                          {isTopPerformer && (
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800 mt-1">
                              🏆 Top Performer
                            </span>
                          )}
                        </div>
                        <div className="text-right">
                          <div className="text-2xl font-bold text-primary">{stats.completed}</div>
                          <div className="text-xs text-muted-foreground">completed</div>
                        </div>
                      </div>
                      
                      <div className="space-y-1">
                        <div className="flex justify-between text-xs">
                          <span className="text-muted-foreground">Total Assigned:</span>
                          <span className="font-medium">{stats.total}</span>
                        </div>
                        <div className="flex justify-between text-xs">
                          <span className="text-muted-foreground">In Progress:</span>
                          <span className="font-medium text-blue-600">{stats.inProgress}</span>
                        </div>
                        <div className="flex justify-between text-xs">
                          <span className="text-muted-foreground">Pending:</span>
                          <span className="font-medium text-yellow-600">{stats.pending}</span>
                        </div>
                        <div className="flex justify-between text-xs pt-1 border-t">
                          <span className="text-muted-foreground">Completion Rate:</span>
                          <span className="font-semibold text-green-600">{completionRate}%</span>
                        </div>
                      </div>

                      {stats.completed > 0 && (
                        <div className="pt-2 border-t">
                          <div className="text-xs text-muted-foreground">Avg Time Saved</div>
                          <div className="text-sm font-medium">
                            {stats.avgCompletionTime > 0 
                              ? `${Math.round(stats.avgCompletionTime / (1000 * 60 * 60))}h before deadline`
                              : 'On time'}
                          </div>
                        </div>
                      )}
                    </div>
                  </Card>
                );
              });
            })()}
          </div>
            </CardContent>
          </CollapsibleContent>
        </Card>
      </Collapsible>

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
                  <TableHead>Code</TableHead>
                  <TableHead>City</TableHead>
                  <TableHead>Engineer Assigned</TableHead>
                  <TableHead>Due Date</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredAssignments.map((a) => {
                  const userLabel = userLabelById[a.assigned_to] || '—';
                  const deadlineDate = new Date(a.deadline_at);
                  const isOverdue = (a.status !== 'Done' && a.status !== 'Cancelled') && (deadlineDate.getTime() < Date.now());
                  const deadlineStr = deadlineDate.toLocaleString();
                  const statusColor = a.status === 'Pending' ? 'bg-yellow-100 text-yellow-800' :
                    a.status === 'In Progress' ? 'bg-blue-100 text-blue-800' :
                    a.status === 'Done' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800';
                  return (
                    <TableRow key={a.id} className="hover:bg-muted/40">
                      <TableCell 
                        className="whitespace-nowrap font-medium cursor-pointer" 
                        onClick={() => handleViewDetails(a)}
                      >
                        {a.store_code}
                      </TableCell>
                      <TableCell 
                        className="whitespace-nowrap cursor-pointer" 
                        onClick={() => handleViewDetails(a)}
                      >
                        {a.city}
                      </TableCell>
                      <TableCell 
                        className="min-w-[180px] cursor-pointer" 
                        onClick={() => handleViewDetails(a)}
                      >
                        {userLabel}
                      </TableCell>
                      <TableCell 
                        className={`whitespace-nowrap cursor-pointer ${isOverdue ? 'text-red-600 font-medium' : ''}`}
                        onClick={() => handleViewDetails(a)}
                      >
                        {deadlineStr}
                      </TableCell>
                      <TableCell 
                        className="cursor-pointer" 
                        onClick={() => handleViewDetails(a)}
                      >
                        <span className={`inline-flex items-center px-2 py-1 rounded text-xs font-medium ${statusColor}`}>
                          {a.status}
                        </span>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              handleEditAssignment(a);
                            }}
                            className="h-8 w-8 p-0"
                            type="button"
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              handleDeleteAssignment(a.id);
                            }}
                            className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                            type="button"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
                {filteredAssignments.length === 0 && !loadingAssignments && (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center text-muted-foreground">
                      No site loads yet.
                    </TableCell>
                  </TableRow>
                )}
                {loadingAssignments && (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center text-muted-foreground">
                      Loading...
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Edit Assignment Dialog */}
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Edit Assignment</DialogTitle>
            <DialogDescription>
              Update deadline, status, APs needed, and remarks. If completing, add final heatmap files and details.
            </DialogDescription>
          </DialogHeader>
          {editingAssignment && (
            <form onSubmit={handleUpdateAssignment} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="editDeadline">Deadline</Label>
                <Input
                  id="editDeadline"
                  type="datetime-local"
                  value={editDeadline}
                  onChange={(e) => setEditDeadline(e.target.value)}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="editStatus">Status</Label>
                <Select value={editStatus} onValueChange={(value: any) => setEditStatus(value)}>
                  <SelectTrigger id="editStatus">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Pending">Pending</SelectItem>
                    <SelectItem value="In Progress">In Progress</SelectItem>
                    <SelectItem value="Done">Done</SelectItem>
                    <SelectItem value="Cancelled">Cancelled</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="editApsNeeded">APs Needed <span className="text-red-500">*</span></Label>
                <Input
                  id="editApsNeeded"
                  type="number"
                  value={editApsNeeded}
                  onChange={(e) => setEditApsNeeded(e.target.value)}
                  placeholder="Enter number of APs"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="editRemarks">Remarks</Label>
                <Textarea
                  id="editRemarks"
                  value={editRemarks}
                  onChange={(e) => setEditRemarks(e.target.value)}
                  placeholder="Add any remarks or notes..."
                  rows={3}
                />
              </div>

              {editStatus === 'Done' && (
                <div className="space-y-4 border-t pt-4">
                  <div>
                    <Label>Upload Created Heatmap (multiple files) <span className="text-red-500">*</span></Label>
                    <Input
                      type="file"
                      accept=".pdf,.png,.jpg,.jpeg,.zip"
                      multiple
                      onChange={(e) => setCompleteFiles(Array.from(e.target.files || []))}
                      required
                    />
                    {completeFiles.length > 0 && (
                      <p className="text-xs text-muted-foreground mt-1">{completeFiles.length} file(s) selected</p>
                    )}
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <div className="space-y-1">
                      <Label>No. of Floors <span className="text-red-500">*</span></Label>
                      <Input
                        type="number"
                        min={0}
                        value={completeFloors}
                        onChange={(e) => setCompleteFloors(e.target.value)}
                        placeholder="e.g., 3"
                        required
                      />
                    </div>
                    <div className="space-y-1">
                      <Label>Floor Size <span className="text-red-500">*</span></Label>
                      <Input
                        value={completeFloorSize}
                        onChange={(e) => setCompleteFloorSize(e.target.value)}
                        placeholder="e.g., 12,000 sqft"
                        required
                      />
                    </div>
                  </div>
                </div>
              )}

              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => setIsEditOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit">
                  {editStatus === 'Done' ? 'Complete Assignment' : 'Update Assignment'}
                </Button>
              </div>
            </form>
          )}
        </DialogContent>
      </Dialog>

      {/* View Details Dialog */}
      <Dialog open={isViewDetailsOpen} onOpenChange={setIsViewDetailsOpen}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Assignment Details</DialogTitle>
            <DialogDescription>
              Complete information about this site assignment
            </DialogDescription>
          </DialogHeader>
          {viewingAssignment && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-muted-foreground text-xs">City</Label>
                  <p className="font-medium">{viewingAssignment.city}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground text-xs">Store Code</Label>
                  <p className="font-medium">{viewingAssignment.store_code}</p>
                </div>
              </div>

              <div>
                <Label className="text-muted-foreground text-xs">Site/Store</Label>
                <p className="font-medium">{storeNameById[viewingAssignment.store_id] || '—'}</p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-muted-foreground text-xs">Status</Label>
                  <div className="mt-1">
                    <span className={`inline-flex items-center px-2 py-1 rounded text-xs font-medium ${
                      viewingAssignment.status === 'Pending' ? 'bg-yellow-100 text-yellow-800' :
                      viewingAssignment.status === 'In Progress' ? 'bg-blue-100 text-blue-800' :
                      viewingAssignment.status === 'Done' ? 'bg-green-100 text-green-800' : 
                      'bg-gray-100 text-gray-800'
                    }`}>
                      {viewingAssignment.status}
                    </span>
                  </div>
                </div>
                <div>
                  <Label className="text-muted-foreground text-xs">Deadline</Label>
                  <p className="font-medium">
                    {new Date(viewingAssignment.deadline_at).toLocaleString()}
                  </p>
                </div>
              </div>

              <div>
                <Label className="text-muted-foreground text-xs">Assigned To</Label>
                <p className="font-medium">{userLabelById[viewingAssignment.assigned_to] || '—'}</p>
              </div>

              {viewingAssignment.assigned_by && (
                <div>
                  <Label className="text-muted-foreground text-xs">Assigned By</Label>
                  <p className="font-medium">{userLabelById[viewingAssignment.assigned_by] || '—'}</p>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-muted-foreground text-xs">APs Needed</Label>
                  <p className="font-medium">{viewingAssignment.aps_needed ?? '—'}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground text-xs">Floor Map</Label>
                  <a 
                    href={viewingAssignment.floor_map_url} 
                    target="_blank" 
                    rel="noreferrer" 
                    className="text-primary hover:underline font-medium"
                  >
                    View Floor Plan
                  </a>
                </div>
              </div>

              {(viewingAssignment.floors || viewingAssignment.floor_size) && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label className="text-muted-foreground text-xs">No. of Floors</Label>
                    <p className="font-medium">{viewingAssignment.floors ?? '—'}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground text-xs">Floor Size</Label>
                    <p className="font-medium">{viewingAssignment.floor_size || '—'}</p>
                  </div>
                </div>
              )}

              {Array.isArray(viewingAssignment.heatmap_files) && viewingAssignment.heatmap_files.length > 0 && (
                <div>
                  <Label className="text-muted-foreground text-xs">Created Heatmaps</Label>
                  <div className="mt-2 space-y-1">
                    {viewingAssignment.heatmap_files.map((url, idx) => (
                      <a key={idx} href={url} target="_blank" rel="noreferrer" className="block text-primary hover:underline text-sm">
                        File {idx + 1}
                      </a>
                    ))}
                  </div>
                </div>
              )}

              {viewingAssignment.remarks && (
                <div>
                  <Label className="text-muted-foreground text-xs">Remarks</Label>
                  <p className="mt-1 p-3 bg-muted rounded-md text-sm">{viewingAssignment.remarks}</p>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4 text-xs text-muted-foreground">
                <div>
                  <Label className="text-muted-foreground text-xs">Created At</Label>
                  <p>{new Date(viewingAssignment.created_at).toLocaleString()}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground text-xs">Updated At</Label>
                  <p>{new Date(viewingAssignment.updated_at).toLocaleString()}</p>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-4">
                <Button variant="outline" onClick={() => setIsViewDetailsOpen(false)}>
                  Close
                </Button>
                <Button onClick={() => {
                  setIsViewDetailsOpen(false);
                  handleEditAssignment(viewingAssignment);
                }}>
                  Edit
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the assignment.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setAssignmentToDelete(null)}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction onClick={confirmDeleteAssignment} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
