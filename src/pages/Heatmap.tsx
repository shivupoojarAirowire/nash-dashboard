import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Map, UserPlus, Info, Pencil, Trash2, ChevronDown, Upload } from "lucide-react";
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
  department?: string | null;
}

export default function LoadSite() {
  const { toast } = useToast();
  const [cities, setCities] = useState<string[]>([]);
  const [stores, setStores] = useState<Store[]>([]);
  const [filteredStores, setFilteredStores] = useState<Store[]>([]);
  const [storeSearchQuery, setStoreSearchQuery] = useState<string>("");
  const [showStoreSuggestions, setShowStoreSuggestions] = useState<boolean>(false);
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
  const [editAssignedEngineer, setEditAssignedEngineer] = useState<string>("");
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
      setStoreSearchQuery("");
    }
  }, [selectedCity, stores]);

  useEffect(() => {
    if (selectedStore) {
      const store = filteredStores.find(s => s.id === selectedStore);
      if (store) {
        setSelectedStoreCode(store.store_code);
        setStoreSearchQuery(store.store);
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
      // Filter users by department = 'Engineering' to show only engineering team members
      const { data, error } = await supabase
        .from('profiles')
        .select('id, email, full_name, department')
        .eq('department', 'Engineering')
        .order('full_name');
      
      if (error) throw error;
      
      console.log('🔍 Loaded engineering users:', data);
      console.log(`✅ Total engineering users: ${data?.length || 0}`);
      
      setEngineeringUsers((data as User[]) || []);
      
      if (!data || data.length === 0) {
        toast({
          title: "No Engineering Users",
          description: "No users found with department = 'Engineering'. Please update user profiles in database.",
          variant: "destructive"
        });
      }
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
    const matches = name.includes(query) || email.includes(query);
    
    console.log(`🔍 Searching for "${query}":`, {
      user: u.full_name || u.email,
      name,
      email,
      matches
    });
    
    return matches;
  });
  
  console.log(`📊 Search results for "${userSearchQuery}":`, {
    totalEngineers: engineeringUsers.length,
    filteredCount: filteredUsers.length,
    showSuggestions: showUserSuggestions,
    filtered: filteredUsers.map(u => u.full_name || u.email)
  });

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    
    if (!selectedCity || !selectedStore || !assignedUserId || !deadline) {
      toast({
        title: "Missing Information",
        description: "Please fill all required fields including deadline",
        variant: "destructive"
      });
      return;
    }

    setUploading(true);
    try {
      // Save assignment to database
      const { data: authData } = await supabase.auth.getUser();
      const assignedBy = authData?.user?.id || null;

      const { error: insertError } = await supabase
        .from('site_assignments')
        .insert({
          city: selectedCity,
          store_id: selectedStore,
          store_code: selectedStoreCode,
          assigned_to: assignedUserId,
          assigned_by: assignedBy,
          deadline_at: new Date(deadline).toISOString(),
          status: 'pending',
        });

      if (insertError) throw insertError;

      toast({
        title: "Success",
        description: `Assignment created successfully`,
      });

      // Reset form
      setSelectedCity("");
      setSelectedStore("");
      setSelectedStoreCode("");
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
    setEditAssignedEngineer(assignment.assigned_to || "");
    setEditDeadline(new Date(assignment.deadline_at).toISOString().slice(0, 16));
    setEditStatus(assignment.status);
    setEditApsNeeded(assignment.aps_needed?.toString() || "");
    setEditRemarks(assignment.remarks || "");
    setCompleteFiles([]);
    setCompleteFloors(assignment.floors?.toString() || "");
    setCompleteFloorSize(assignment.floor_size || "");
    setIsEditOpen(true);
  }

  // Handle Update Assignment - Only update assigned engineer
  async function handleUpdateAssignment(e: React.FormEvent) {
    e.preventDefault();
    if (!editingAssignment) return;

    // Validate engineer is selected
    if (!editAssignedEngineer) {
      toast({ title: "Validation Error", description: "Please select an engineer", variant: "destructive" });
      return;
    }

    try {
      const updateData: any = {
        assigned_to: editAssignedEngineer,
        updated_at: new Date().toISOString()
      };

      const { error } = await supabase
        .from('site_assignments')
        .update(updateData)
        .eq('id', editingAssignment.id);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Engineer reassigned successfully"
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
                <div className="relative">
                  <Input
                    id="store"
                    placeholder={selectedCity ? "Search or select site" : "Select city first"}
                    value={storeSearchQuery}
                    disabled={!selectedCity}
                    onChange={(e) => {
                      const val = e.target.value;
                      setStoreSearchQuery(val);
                      setShowStoreSuggestions(true);
                    }}
                    onFocus={() => setShowStoreSuggestions(true)}
                    onBlur={() => setTimeout(() => setShowStoreSuggestions(false), 200)}
                    className="h-9 text-sm"
                    autoComplete="off"
                  />
                  {showStoreSuggestions && selectedCity && (
                    <div className="absolute z-[90] w-full mt-1 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-md shadow-lg max-h-52 overflow-y-auto text-sm">
                      {(() => {
                        const searchLower = storeSearchQuery.toLowerCase();
                        const baseList = selectedCity ? filteredStores : stores;
                        const filtered = baseList.filter((s) =>
                          s.store.toLowerCase().includes(searchLower) || s.store_code.toLowerCase().includes(searchLower)
                        );
                        if (filtered.length === 0) {
                          return <div className="px-3 py-2 text-muted-foreground">No matches</div>;
                        }
                        return filtered.map((store) => (
                          <button
                            key={store.id}
                            type="button"
                            className="w-full px-3 py-2 text-left hover:bg-blue-50 dark:hover:bg-gray-700 border-b last:border-0 border-gray-100 dark:border-gray-700"
                            onClick={() => {
                              setSelectedStore(store.id);
                              setSelectedStoreCode(store.store_code);
                              setStoreSearchQuery(store.store);
                              setShowStoreSuggestions(false);
                            }}
                          >
                            <div className="font-medium">{store.store}</div>
                            <div className="text-xs text-muted-foreground">{store.store_code}</div>
                          </button>
                        ));
                      })()}
                    </div>
                  )}
                </div>
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

            {/* Row 3: Assign User */}
            <div className="space-y-2">
              <Label className="text-xs">Assign to Engineering User *</Label>
              <div className="relative">
                <Input
                  placeholder="Type name or email (e.g., 'su' for Suresh)..."
                  value={userSearchQuery}
                  onChange={(e) => {
                    setUserSearchQuery(e.target.value);
                    setShowUserSuggestions(e.target.value.length >= 2);
                  }}
                  onFocus={() => setShowUserSuggestions(userSearchQuery.length >= 2)}
                  onBlur={() => setTimeout(() => setShowUserSuggestions(false), 200)}
                  className="h-9 text-sm"
                  autoComplete="off"
                />
                {showUserSuggestions && userSearchQuery.length >= 2 && (
                  <div className="absolute z-[100] w-full mt-1 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-md shadow-lg max-h-48 overflow-y-auto">
                    {filteredUsers.length > 0 ? (
                      filteredUsers.map((u) => (
                        <button
                          key={u.id}
                          type="button"
                          className="w-full px-3 py-2 text-left hover:bg-blue-50 dark:hover:bg-gray-700 flex items-start gap-2 border-b border-gray-100 dark:border-gray-700 last:border-0 transition-colors"
                          onClick={() => {
                            setAssignedUserId(u.id);
                            setUserSearchQuery(u.full_name || u.email);
                            setShowUserSuggestions(false);
                          }}
                        >
                          <UserPlus className="h-4 w-4 mt-0.5 shrink-0 text-blue-600 dark:text-blue-400" />
                          <div className="flex flex-col flex-1">
                            <span className="font-medium text-sm text-gray-900 dark:text-gray-100">{u.full_name || u.email}</span>
                            {u.full_name && <span className="text-xs text-gray-500 dark:text-gray-400">{u.email}</span>}
                          </div>
                        </button>
                      ))
                    ) : (
                      <div className="px-3 py-4 text-center text-sm text-gray-500 dark:text-gray-400">
                        <div className="mb-1">No engineering users found</div>
                        <div className="text-xs">Make sure users have department = 'Engineering' in profiles</div>
                      </div>
                    )}
                  </div>
                )}
                {userSearchQuery.length > 0 && userSearchQuery.length < 2 && (
                  <div className="text-xs text-amber-600 dark:text-amber-400 mt-1">
                    Type at least 2 characters to search...
                  </div>
                )}
              </div>
              {selectedUser && (
                <div className="text-xs text-muted-foreground mt-1 p-2 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded">
                  ✓ Assigned: <span className="font-medium text-green-700 dark:text-green-400">{selectedUser.full_name || selectedUser.email}</span>
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
          <div>
            <CardTitle>Upcoming Site Loads</CardTitle>
            <CardDescription>Nearest deadlines first</CardDescription>
          </div>
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
            <DialogTitle>Reassign Engineer</DialogTitle>
            <DialogDescription>
              Change the assigned engineer for this site loading task.
            </DialogDescription>
          </DialogHeader>
          {editingAssignment && (
            <form onSubmit={handleUpdateAssignment} className="space-y-4">
              <div className="space-y-2 p-3 bg-muted rounded-md">
                <div className="text-sm">
                  <span className="font-medium">Site:</span> {editingAssignment.store_code}
                </div>
                <div className="text-sm">
                  <span className="font-medium">City:</span> {editingAssignment.city}
                </div>
                <div className="text-sm">
                  <span className="font-medium">Status:</span> {editingAssignment.status}
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="editAssignedEngineer">Assigned Engineer <span className="text-red-500">*</span></Label>
                <Select value={editAssignedEngineer} onValueChange={setEditAssignedEngineer}>
                  <SelectTrigger id="editAssignedEngineer">
                    <SelectValue placeholder="Select an engineer" />
                  </SelectTrigger>
                  <SelectContent>
                    {engineeringUsers.map((eng) => (
                      <SelectItem key={eng.id} value={eng.id}>
                        {eng.full_name || eng.email}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => setIsEditOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit">
                  Update Engineer
                </Button>
              </div>
            </form>
          )}
        </DialogContent>
      </Dialog>

      {/* View Details Dialog */}
      <Dialog open={isViewDetailsOpen} onOpenChange={setIsViewDetailsOpen}>
        <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Assignment Details</DialogTitle>
            <DialogDescription>
              Complete information about this site assignment
            </DialogDescription>
          </DialogHeader>
          {viewingAssignment && (
            <div className="space-y-4">
              {/* Basic Information */}
              <div className="p-4 bg-muted/50 rounded-lg">
                <h4 className="font-semibold text-sm mb-3">Site Information</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-muted-foreground text-xs">City</Label>
                    <p className="font-medium">{viewingAssignment.city}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground text-xs">Store Code</Label>
                    <p className="font-medium">{viewingAssignment.store_code}</p>
                  </div>
                  <div className="col-span-2">
                    <Label className="text-muted-foreground text-xs">Site/Store Name</Label>
                    <p className="font-medium">{storeNameById[viewingAssignment.store_id] || '—'}</p>
                  </div>
                </div>
              </div>

              {/* Assignment Status */}
              <div className="p-4 bg-muted/50 rounded-lg">
                <h4 className="font-semibold text-sm mb-3">Assignment Status</h4>
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
                </div>
              </div>

              {/* Requirements */}
              <div className="p-4 bg-muted/50 rounded-lg">
                <h4 className="font-semibold text-sm mb-3">Requirements</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-muted-foreground text-xs">APs Needed</Label>
                    <p className="font-medium text-lg">{viewingAssignment.aps_needed ?? '—'}</p>
                  </div>
                  {(viewingAssignment.floors || viewingAssignment.floor_size) && (
                    <>
                      <div>
                        <Label className="text-muted-foreground text-xs">No. of Floors</Label>
                        <p className="font-medium">{viewingAssignment.floors ?? '—'}</p>
                      </div>
                      <div className="col-span-2">
                        <Label className="text-muted-foreground text-xs">Floor Size</Label>
                        <p className="font-medium">{viewingAssignment.floor_size || '—'}</p>
                      </div>
                    </>
                  )}
                </div>
              </div>

              {/* Floor Plan */}
              {viewingAssignment.floor_map_url && (
                <div className="p-4 bg-muted/50 rounded-lg">
                  <h4 className="font-semibold text-sm mb-3">Floor Plan</h4>
                  <a 
                    href={viewingAssignment.floor_map_url} 
                    target="_blank" 
                    rel="noreferrer" 
                    className="inline-flex items-center gap-2 text-primary hover:underline font-medium"
                  >
                    <Upload className="h-4 w-4" />
                    View Floor Plan
                  </a>
                </div>
              )}

              {/* Created Heatmaps */}
              {Array.isArray(viewingAssignment.heatmap_files) && viewingAssignment.heatmap_files.length > 0 && (
                <div className="p-4 bg-muted/50 rounded-lg">
                  <h4 className="font-semibold text-sm mb-3">Created Heatmaps</h4>
                  <div className="space-y-2">
                    {viewingAssignment.heatmap_files.map((url, idx) => (
                      <a 
                        key={idx} 
                        href={url} 
                        target="_blank" 
                        rel="noreferrer" 
                        className="flex items-center gap-2 text-primary hover:underline text-sm p-2 rounded hover:bg-muted"
                      >
                        <Upload className="h-4 w-4" />
                        Heatmap File {idx + 1}
                      </a>
                    ))}
                  </div>
                  {viewingAssignment.completed_at && (
                    <div className="mt-3 pt-3 border-t">
                      <Label className="text-muted-foreground text-xs">Completed At</Label>
                      <p className="text-sm">{new Date(viewingAssignment.completed_at).toLocaleString()}</p>
                    </div>
                  )}
                </div>
              )}

              {/* Remarks */}
              {viewingAssignment.remarks && (
                <div className="p-4 bg-muted/50 rounded-lg">
                  <h4 className="font-semibold text-sm mb-2">Remarks</h4>
                  <p className="text-sm whitespace-pre-wrap">{viewingAssignment.remarks}</p>
                </div>
              )}

              {/* Metadata */}
              <div className="grid grid-cols-2 gap-4 text-xs text-muted-foreground pt-2 border-t">
                <div>
                  <Label className="text-muted-foreground text-xs">Created At</Label>
                  <p>{new Date(viewingAssignment.created_at).toLocaleString()}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground text-xs">Updated At</Label>
                  <p>{new Date(viewingAssignment.updated_at).toLocaleString()}</p>
                </div>
              </div>

              {/* Actions */}
              <div className="flex justify-end gap-2 pt-4">
                <Button variant="outline" onClick={() => setIsViewDetailsOpen(false)}>
                  Close
                </Button>
                <Button onClick={() => {
                  setIsViewDetailsOpen(false);
                  handleEditAssignment(viewingAssignment);
                }}>
                  Reassign Engineer
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
