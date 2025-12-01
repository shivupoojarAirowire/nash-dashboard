import { useEffect, useState } from 'react';
import { useFeatureFlags } from '@/hooks/useFeatureFlags';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Map, CheckCircle, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface AssignmentRow {
  id: string;
  city: string;
  store_id: string;
  store_code: string;
  floor_map_url: string;
  deadline_at: string;
  status: 'Pending' | 'In Progress' | 'Done' | 'Cancelled';
  assigned_by: string | null;
  aps_needed: number | null;
  remarks: string | null;
  completed_at: string | null;
  floors?: number | null;
  floor_size?: string | null;
  heatmap_files?: string[] | null;
}

export default function MyHeatmaps() {
  const { toast } = useToast();
  const { has, loading: flagsLoading } = useFeatureFlags();
  const navigate = useNavigate();
  const [rows, setRows] = useState<AssignmentRow[]>([]);
  const [completionOpen, setCompletionOpen] = useState(false);
  const [activeAssignment, setActiveAssignment] = useState<AssignmentRow | null>(null);
  const [apsNeeded, setApsNeeded] = useState<string>('');
  const [remarks, setRemarks] = useState<string>('');
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(false);
  const [storeNames, setStoreNames] = useState<Record<string, string>>({});
  const [assignerNames, setAssignerNames] = useState<Record<string, string>>({});
  // Completion fields
  const [completeFiles, setCompleteFiles] = useState<File[]>([]);
  const [floors, setFloors] = useState<string>('');
  const [floorSize, setFloorSize] = useState<string>('');

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    if (!flagsLoading) {
      if (!has('Engineering')) {
        navigate('/');
      }
    }
  }, [flagsLoading, has, navigate]);

  if (!flagsLoading && !has('Engineering')) {
    return (
      <div className="p-6">
        <Card>
          <CardHeader>
            <CardTitle>Access Restricted</CardTitle>
            <CardDescription>The Engineering feature is disabled for your account.</CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  // Real-time: update list when new assignments are created/updated for this user
  useEffect(() => {
    let channel: ReturnType<typeof supabase.channel> | undefined;
    let active = true;
    (async () => {
      const { data: authData } = await supabase.auth.getUser();
      const userId = authData?.user?.id;
      if (!userId || !active) return;
      channel = supabase
        .channel(`site_assignments_user_${userId}`)
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'site_assignments', filter: `assigned_to=eq.${userId}` },
          () => {
            // Simple strategy: reload data to keep lookups in sync
            loadData();
          }
        )
        .subscribe();
    })();
    return () => {
      active = false;
      if (channel) supabase.removeChannel(channel);
    };
  }, []);

  async function loadData() {
    try {
      setLoading(true);
      const { data: authData } = await supabase.auth.getUser();
      const userId = authData?.user?.id;
      if (!userId) return;
      const { data, error } = await supabase
        .from('site_assignments')
        .select('id, city, store_id, store_code, floor_map_url, deadline_at, status, assigned_by, aps_needed, remarks, completed_at, floors, floor_size, heatmap_files')
        .eq('assigned_to', userId)
        .order('deadline_at', { ascending: true });
      if (error) throw error;
      const assignments = (data || []) as AssignmentRow[];
      setRows(assignments);
      // Fetch related store names
      const storeIds = Array.from(new Set(assignments.map(r => r.store_id))).filter(Boolean);
      if (storeIds.length) {
        const { data: storesData } = await supabase
          .from('stores')
          .select('id, store')
          .in('id', storeIds);
        if (storesData) {
          const map: Record<string, string> = {};
          for (const s of storesData) map[s.id] = s.store;
          setStoreNames(map);
        }
      }
      // Fetch assigner names
      const assignerIds = Array.from(new Set(assignments.map(r => r.assigned_by || '').filter(Boolean)));
      if (assignerIds.length) {
        const { data: profs } = await supabase
          .from('profiles')
          .select('id, full_name, email')
          .in('id', assignerIds as string[]);
        if (profs) {
          const map: Record<string, string> = {};
          for (const p of profs) map[p.id] = p.full_name || p.email;
          setAssignerNames(map);
        }
      }
    } catch (err: any) {
      toast({ title: 'Error', description: err.message || 'Failed to load heatmaps', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  }

  async function updateStatus(id: string, status: 'Pending' | 'In Progress' | 'Done' | 'Cancelled') {
    try {
      const { error } = await supabase
        .from('site_assignments')
        .update({ status })
        .eq('id', id);
      if (error) throw error;
      loadData();
    } catch (err: any) {
      toast({ title: 'Status Update Failed', description: err.message, variant: 'destructive' });
    }
  }

  function openCompletion(row: AssignmentRow) {
    setActiveAssignment(row);
    setApsNeeded(row.aps_needed != null ? String(row.aps_needed) : '');
    setRemarks(row.remarks || '');
    setFloors(row.floors != null ? String(row.floors) : '');
    setFloorSize(row.floor_size || '');
    setCompleteFiles([]);
    setCompletionOpen(true);
  }

  async function handleComplete(e: React.FormEvent) {
    e.preventDefault();
    if (!activeAssignment) return;
    
    // Validate required fields
    if (!apsNeeded.trim()) {
      toast({ title: 'Validation Error', description: 'APs Needed is required', variant: 'destructive' });
      return;
    }
    if (completeFiles.length === 0) {
      toast({ title: 'Validation Error', description: 'At least one heatmap file is required', variant: 'destructive' });
      return;
    }
    if (!floors.trim()) {
      toast({ title: 'Validation Error', description: 'No. of Floors is required', variant: 'destructive' });
      return;
    }
    if (!floorSize.trim()) {
      toast({ title: 'Validation Error', description: 'Floor Size is required', variant: 'destructive' });
      return;
    }
    
    setSaving(true);
    try {
      // Upload created heatmaps if provided
      let uploadedUrls: string[] = [];
      if (completeFiles.length > 0) {
        for (const file of completeFiles) {
          const ext = file.name.split('.').pop();
          const safeCode = (activeAssignment.store_code || 'site').replace(/[^a-zA-Z0-9_-]/g, '_');
          const fileName = `${safeCode}_${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`;
          const path = `${activeAssignment.id}/${fileName}`;
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

      const updates: any = {
        status: 'Done',
        completed_at: new Date().toISOString(),
        aps_needed: Number(apsNeeded),
        floors: Number(floors),
        floor_size: floorSize.trim(),
        heatmap_files: uploadedUrls,
      };
      if (remarks.trim() !== '') updates.remarks = remarks.trim();
      const { error } = await supabase
        .from('site_assignments')
        .update(updates)
        .eq('id', activeAssignment.id);
      if (error) throw error;
      toast({ title: 'Marked Done', description: 'Assignment completed successfully.' });
      setCompletionOpen(false);
      setActiveAssignment(null);
      setApsNeeded('');
      setRemarks('');
      setFloors('');
      setFloorSize('');
      setCompleteFiles([]);
      loadData();
    } catch (err: any) {
      toast({ title: 'Completion Failed', description: err.message, variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="p-6 flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div className="flex flex-col gap-1">
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Map className="h-8 w-8" />
            My Heatmaps
          </h1>
          <p className="text-muted-foreground text-sm">All site load assignments assigned to you.</p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Your Assignments</CardTitle>
          <CardDescription>Ordered by nearest deadline first</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>City</TableHead>
                  <TableHead>Site</TableHead>
                  <TableHead>Code</TableHead>
                  <TableHead>Deadline</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Assigned By</TableHead>
                  <TableHead>Floor Map</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map(r => {
                  const siteName = storeNames[r.store_id] || '—';
                  const assigner = r.assigned_by ? (assignerNames[r.assigned_by] || '—') : '—';
                  const deadlineDate = new Date(r.deadline_at);
                  const isOverdue = (r.status !== 'Done' && r.status !== 'Cancelled') && (deadlineDate.getTime() < Date.now());
                  const deadlineStr = deadlineDate.toLocaleString();
                  const statusColor = r.status === 'Pending' ? 'bg-yellow-100 text-yellow-800' :
                    r.status === 'In Progress' ? 'bg-blue-100 text-blue-800' :
                    r.status === 'Done' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800';
                  return (
                    <TableRow key={r.id} className="hover:bg-muted/40">
                      <TableCell className="whitespace-nowrap">{r.city}</TableCell>
                      <TableCell className="min-w-[180px]">{siteName}</TableCell>
                      <TableCell className="whitespace-nowrap">{r.store_code}</TableCell>
                      <TableCell className={`whitespace-nowrap ${isOverdue ? 'text-red-600 font-medium' : ''}`}>{deadlineStr}</TableCell>
                      <TableCell>
                        <span className={`inline-flex items-center px-2 py-1 rounded text-xs font-medium ${statusColor}`}>
                          {r.status}
                        </span>
                      </TableCell>
                      <TableCell className="min-w-[140px]">{assigner}</TableCell>
                      <TableCell>
                        <a href={r.floor_map_url} target="_blank" rel="noreferrer" className="text-primary hover:underline">View</a>
                      </TableCell>
                      <TableCell className="whitespace-nowrap">
                        {r.status !== 'Done' && r.status !== 'Cancelled' && (
                          <div className="flex gap-2">
                            {r.status === 'Pending' && (
                              <Button size="sm" variant="outline" onClick={() => updateStatus(r.id, 'In Progress')}>Start</Button>
                            )}
                            {r.status === 'In Progress' && (
                              <Button size="sm" variant="default" onClick={() => openCompletion(r)}>Complete</Button>
                            )}
                          </div>
                        )}
                        {r.status === 'Done' && r.completed_at && (
                          <span className="text-xs text-muted-foreground">Done: {new Date(r.completed_at).toLocaleDateString()}</span>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
                {rows.length === 0 && !loading && (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center text-muted-foreground">No assignments yet.</TableCell>
                  </TableRow>
                )}
                {loading && (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center text-muted-foreground">Loading...</TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <Dialog open={completionOpen} onOpenChange={setCompletionOpen}>
        <DialogContent className="sm:max-w-[480px]">
          <DialogHeader>
            <DialogTitle>Complete Assignment</DialogTitle>
            <DialogDescription>
              Provide final details before marking this heatmap as Done.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleComplete} className="space-y-4">
            <div className="space-y-2">
              <Label>Heatmap Files (multiple) <span className="text-red-500">*</span></Label>
              <Input type="file" multiple accept=".pdf,.png,.jpg,.jpeg,.zip" onChange={(e) => setCompleteFiles(Array.from(e.target.files || []))} required />
              {completeFiles.length > 0 && (
                <p className="text-xs text-muted-foreground">{completeFiles.length} file(s) selected</p>
              )}
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div className="space-y-1">
                <Label>No. of Floors <span className="text-red-500">*</span></Label>
                <Input type="number" min={0} value={floors} onChange={e => setFloors(e.target.value)} placeholder="e.g. 3" required />
              </div>
              <div className="space-y-1">
                <Label>Floor Size <span className="text-red-500">*</span></Label>
                <Input value={floorSize} onChange={e => setFloorSize(e.target.value)} placeholder="e.g. 12,000 sqft" required />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="aps_needed">APs Needed <span className="text-red-500">*</span></Label>
              <Input id="aps_needed" type="number" min={0} value={apsNeeded} onChange={e => setApsNeeded(e.target.value)} placeholder="e.g. 12" required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="remarks">Remarks (optional)</Label>
              <Input id="remarks" value={remarks} onChange={e => setRemarks(e.target.value)} placeholder="Any notes or blockers" />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setCompletionOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={saving}>
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle className="h-4 w-4 mr-1" />} Done
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
