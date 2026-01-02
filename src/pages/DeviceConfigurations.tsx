import { useState, useEffect } from "react";
import { useFeatureFlags } from '@/hooks/useFeatureFlags';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Settings, Wrench, Eye, Pencil, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { getInventory } from "@/integrations/supabase/inventory";
import { useToast } from "@/hooks/use-toast";

type SiteAssignment = {
  id: string;
  city: string;
  store_code: string;
  status: string;
  config_status?: string | null;
  assigned_to?: string | null;
  config_assigned_to?: string | null;
  config_assigned_by?: string | null;
  config_deadline_at?: string | null;
  deadline_at?: string | null;
  devicesAllocated: number;
  allocatedDevices?: InventoryItem[];
  aps_needed?: number | null;
  firewall_ip?: string | null;
  zonal_port_number?: string | null;
};

type InventoryItem = {
  id: number;
  type: "Router" | "Switch" | "Firewall" | "Access Point";
  make: string;
  serial: string;
  in_use: boolean;
  site?: string | null;
};

type Engineer = {
  id: string;
  email: string;
};

export default function DeviceConfigurations() {
  const { has, loading } = useFeatureFlags();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [sites, setSites] = useState<SiteAssignment[]>([]);
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [engineers, setEngineers] = useState<Engineer[]>([]);
  const [selectedSite, setSelectedSite] = useState<SiteAssignment | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deviceSelections, setDeviceSelections] = useState<Record<string, boolean>>({}); // serial -> selected
  const [selectedEngineer, setSelectedEngineer] = useState<string>('');
  const [deadline, setDeadline] = useState<string>('');
  const [viewDevicesDialogOpen, setViewDevicesDialogOpen] = useState(false);
  const [viewingDevices, setViewingDevices] = useState<InventoryItem[]>([]);
  const [viewConfigDialogOpen, setViewConfigDialogOpen] = useState(false);
  const [viewingConfig, setViewingConfig] = useState<SiteAssignment | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [siteToDelete, setSiteToDelete] = useState<SiteAssignment | null>(null);

  // Removed permission check - allow all authenticated users
  // useEffect(() => {
  //   if (!loading && !has('Project Manager')) {
  //     navigate('/');
  //   }
  // }, [loading, has, navigate]);

  useEffect(() => {
    loadSites();
    loadInventory();
    loadEngineers();
  }, []);

  const loadSites = async () => {
    try {
      const { data, error } = await supabase
        .from('site_assignments')
        .select('id, city, store_code, status, config_status, assigned_to, config_assigned_to, config_assigned_by, config_deadline_at, deadline_at, aps_needed, firewall_ip, zonal_port_number')
        .eq('status', 'Done')
        .order('updated_at', { ascending: false });
      if (error) throw error;

      // For each site, get allocated devices with their details
      const inv = await getInventory();
      const sitesWithCounts: SiteAssignment[] = (data || []).map((s: any) => {
        const allocatedDevices = (inv || []).filter((i: any) => i.site === s.store_code && i.in_use).map((d: any) => ({
          id: d.id,
          type: d.type,
          make: d.make,
          serial: d.serial,
          in_use: d.in_use,
          site: d.site,
        }));
        return {
          id: s.id,
          city: s.city,
          store_code: s.store_code,
          status: s.status,
          config_status: s.config_status ?? 'Not Started',
          assigned_to: s.assigned_to,
          config_assigned_to: s.config_assigned_to,
          config_assigned_by: s.config_assigned_by,
          config_deadline_at: s.config_deadline_at,
          deadline_at: s.deadline_at,
          devicesAllocated: allocatedDevices.length,
          allocatedDevices: allocatedDevices,
          aps_needed: s.aps_needed ?? null,
          firewall_ip: s.firewall_ip ?? null,
          zonal_port_number: s.zonal_port_number ?? null,
        };
      });
      setSites(sitesWithCounts);
    } catch (e) {
      console.error('loadSites error', e);
    }
  };

  const loadInventory = async () => {
    try {
      const data = await getInventory();
      if (data) {
        const mapped: InventoryItem[] = data.map((item: any) => ({
          id: item.id,
          type: item.type,
          make: item.make,
          serial: item.serial,
          in_use: !!item.in_use,
          site: item.site,
        }));
        setInventory(mapped);
      }
    } catch (e) {
      console.error('loadInventory error', e);
    }
  };

  const loadEngineers = async () => {
    try {
      // Load profiles filtered by Engineering department
      const { data: profiles, error: pErr } = await supabase
        .from('profiles')
        .select('id, email, full_name, department')
        .eq('department', 'Engineering')
        .order('email');
      
      if (pErr) throw pErr;
      
      setEngineers((profiles || []).map((p: any) => ({ 
        id: p.id, 
        email: p.full_name || p.email 
      })));
      
      if (!profiles || profiles.length === 0) {
        console.warn('No users found in Engineering department');
      }
    } catch (e) {
      console.error('loadEngineers error', e);
      toast({
        title: 'Warning',
        description: 'Could not load engineers list',
        variant: 'destructive'
      });
    }
  };

  const availableDevicesByType = (type: InventoryItem['type']) =>
    inventory.filter((d) => d.type === type && !d.in_use);

  const openDialogForSite = (site: SiteAssignment) => {
    setSelectedSite(site);
    setDialogOpen(true);
    setDeviceSelections({});
    setSelectedEngineer(site.config_assigned_to || '');
    setDeadline(site.config_deadline_at ? site.config_deadline_at.split('T')[0] : '');
  };

  const handleDeleteConfiguration = async () => {
    if (!siteToDelete) return;

    try {
      const { error } = await supabase
        .from('site_assignments')
        .update({
          config_assigned_to: null,
          config_assigned_by: null,
          config_deadline_at: null,
          config_status: 'Not Started'
        })
        .eq('id', siteToDelete.id);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Configuration assignment deleted successfully"
      });

      setDeleteDialogOpen(false);
      setSiteToDelete(null);
      await loadSites();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to delete configuration",
        variant: "destructive"
      });
    }
  };

  const toggleDeviceSelection = (serial: string) => {
    setDeviceSelections((prev) => ({ ...prev, [serial]: !prev[serial] }));
  };

  const saveConfiguration = async () => {
    if (!selectedSite) return;
    
    // Validate required fields
    if (!selectedEngineer) {
      toast({
        title: 'Validation Error',
        description: 'Please select an engineer',
        variant: 'destructive'
      });
      return;
    }
    if (!deadline) {
      toast({
        title: 'Validation Error',
        description: 'Please set a deadline',
        variant: 'destructive'
      });
      return;
    }
    
    try {
      // Get current user for config_assigned_by
      const { data: authData } = await supabase.auth.getUser();
      const assignedBy = authData?.user?.id || null;
      
      // Update config engineer & deadline
      const { error: updErr } = await supabase
        .from('site_assignments')
        .update({
          config_assigned_to: selectedEngineer,
          config_assigned_by: assignedBy,
          config_deadline_at: new Date(deadline).toISOString(),
          config_status: 'Not Started'
        })
        .eq('id', selectedSite.id);
      
      if (updErr) throw updErr;

      toast({
        title: 'Assignment Saved',
        description: `Engineer assigned to site ${selectedSite.store_code}`,
      });
      setDialogOpen(false);
      await loadSites();
      
      // Navigate to the engineer's device configurations page
      navigate('/engineering/device-configurations');
    } catch (e) {
      console.error('saveConfiguration error', e);
      toast({
        title: 'Error',
        description: 'Failed to save assignment. Please retry.',
        variant: 'destructive'
      });
    }
  };

  // Removed access restriction - allow all authenticated users
  // if (!loading && !has('Project Manager')) {
  //   return (
  //     <div className="p-6">
  //       <Card>
  //         <CardHeader>
  //           <CardTitle>Access Restricted</CardTitle>
  //           <CardDescription>The Project Manager feature is disabled for your account.</CardDescription>
  //         </CardHeader>
  //       </Card>
  //     </div>
  //   );
  // }

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <Settings className="h-8 w-8" />
          Device Configurations
        </h1>
        <p className="text-muted-foreground mt-2">Assign engineer & allocate devices to completed (Done) sites.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Completed Sites</CardTitle>
          <CardDescription>Sites with status Done ready for device allocation</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>City</TableHead>
                <TableHead>Site Code</TableHead>
                <TableHead>APs Needed</TableHead>
                <TableHead>Devices Allocated</TableHead>
                <TableHead>Allocated Devices</TableHead>
                <TableHead>Engineer</TableHead>
                <TableHead>Config Status</TableHead>
                <TableHead>Deadline</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sites.map((s) => (
                <TableRow key={s.id}>
                  <TableCell className="font-medium">{s.city}</TableCell>
                  <TableCell>{s.store_code}</TableCell>
                  <TableCell>
                    {s.aps_needed !== null ? (
                      <Badge variant="outline">{s.aps_needed}</Badge>
                    ) : (
                      <span className="text-xs text-muted-foreground">-</span>
                    )}
                  </TableCell>
                  <TableCell>{s.devicesAllocated}</TableCell>
                  <TableCell>
                    {s.config_status === 'Completed' ? (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setViewingConfig(s);
                          setViewConfigDialogOpen(true);
                        }}
                      >
                        <Eye className="h-4 w-4 mr-1" />
                        Edit
                      </Button>
                    ) : s.devicesAllocated > 0 ? (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setViewingDevices(s.allocatedDevices || []);
                          setViewDevicesDialogOpen(true);
                        }}
                      >
                        <Eye className="h-4 w-4 mr-1" />
                        View
                      </Button>
                    ) : (
                      <Button
                        size="sm"
                        onClick={() => openDialogForSite(s)}
                      >
                        Assign
                      </Button>
                    )}
                  </TableCell>
                  <TableCell>{engineers.find((e) => e.id === s.config_assigned_to)?.email || '-'}</TableCell>
                  <TableCell>
                    <Badge 
                      className={
                        s.config_status === 'Completed' 
                          ? 'bg-green-100 text-green-800' 
                          : s.config_status === 'In Progress'
                          ? 'bg-blue-100 text-blue-800'
                          : 'bg-gray-100 text-gray-800'
                      }
                    >
                      {s.config_status || 'Not Started'}
                    </Badge>
                  </TableCell>
                  <TableCell>{s.config_deadline_at ? s.config_deadline_at.split('T')[0] : '-'}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      {s.config_status === 'Completed' ? (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setViewingConfig(s);
                            setViewConfigDialogOpen(true);
                          }}
                        >
                          <Eye className="h-4 w-4 mr-1" />
                          View
                        </Button>
                      ) : (
                        <>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => openDialogForSite(s)}
                          >
                            {s.config_assigned_to ? (
                              <>
                                <Pencil className="h-4 w-4 mr-1" />
                                Edit
                              </>
                            ) : (
                              'Assign'
                            )}
                          </Button>
                          {s.config_assigned_to && (
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => {
                                setSiteToDelete(s);
                                setDeleteDialogOpen(true);
                              }}
                              className="text-destructive hover:text-destructive"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          )}
                        </>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          {sites.length === 0 && (
            <div className="text-center py-12">
              <Settings className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">No Completed Heatmaps</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Sites will appear here once their heatmaps are marked as "Done" in the HeatMaps section.
              </p>
              <p className="text-xs text-muted-foreground">
                Once a heatmap is completed, you can assign engineers to configure devices for that site.
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {selectedSite?.config_assigned_to ? 'Edit' : 'Assign'} Device Configuration - {selectedSite?.store_code}
            </DialogTitle>
            <DialogDescription>
              {selectedSite?.config_assigned_to 
                ? 'Update the assigned engineer and deadline for device configuration.' 
                : 'Assign an engineer and set deadline for device configuration.'}
            </DialogDescription>
          </DialogHeader>
          {selectedSite && (
            <div className="space-y-6">
              {/* Engineer & Deadline */}
              <div className="grid md:grid-cols-2 gap-4">
                <div className="flex flex-col gap-1">
                  <label className="text-sm font-medium">Engineer</label>
                  <select
                    className="border rounded px-2 py-1 text-sm bg-background"
                    value={selectedEngineer}
                    onChange={(e) => setSelectedEngineer(e.target.value)}
                  >
                    <option value="">-- Select Engineer --</option>
                    {engineers.map((eng) => (
                      <option key={eng.id} value={eng.id}>{eng.email}</option>
                    ))}
                  </select>
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-sm font-medium">Deadline</label>
                  <input
                    type="date"
                    className="border rounded px-2 py-1 text-sm bg-background"
                    value={deadline}
                    onChange={(e) => setDeadline(e.target.value)}
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-4">
                <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
                <Button onClick={saveConfiguration}>Save Assignment</Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* View Allocated Devices Dialog */}
      <Dialog open={viewDevicesDialogOpen} onOpenChange={setViewDevicesDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Allocated Devices</DialogTitle>
            <DialogDescription>Details of devices allocated to this site</DialogDescription>
          </DialogHeader>
          <div className="mt-4">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Device Type</TableHead>
                  <TableHead>Make</TableHead>
                  <TableHead>Serial Number</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {viewingDevices.map((d) => (
                  <TableRow key={d.serial}>
                    <TableCell className="font-medium">{d.type}</TableCell>
                    <TableCell>{d.make}</TableCell>
                    <TableCell className="font-mono text-xs">{d.serial}</TableCell>
                  </TableRow>
                ))}
                {viewingDevices.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={3} className="text-center text-muted-foreground">
                      No devices allocated
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </DialogContent>
      </Dialog>

      {/* View Configuration Details Dialog */}
      <Dialog open={viewConfigDialogOpen} onOpenChange={setViewConfigDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Configuration Details - {viewingConfig?.store_code}</DialogTitle>
            <DialogDescription>Configuration completed by engineer</DialogDescription>
          </DialogHeader>
          {viewingConfig && (
            <div className="mt-4 space-y-6">
              {/* Site Info */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="text-sm font-medium text-muted-foreground">City</div>
                  <div className="text-base font-semibold">{viewingConfig.city}</div>
                </div>
                <div>
                  <div className="text-sm font-medium text-muted-foreground">Site Code</div>
                  <div className="text-base font-semibold">{viewingConfig.store_code}</div>
                </div>
              </div>

              {/* Engineer Info */}
              <div>
                <div className="text-sm font-medium text-muted-foreground">Assigned Engineer</div>
                <div className="text-base font-semibold">
                  {engineers.find((e) => e.id === viewingConfig.assigned_to)?.email || '-'}
                </div>
              </div>

              {/* Configuration Status */}
              <div>
                <div className="text-sm font-medium text-muted-foreground">Configuration Status</div>
                <Badge 
                  className={
                    viewingConfig.config_status === 'Completed' 
                      ? 'bg-green-100 text-green-800' 
                      : viewingConfig.config_status === 'In Progress'
                      ? 'bg-blue-100 text-blue-800'
                      : 'bg-gray-100 text-gray-800'
                  }
                >
                  {viewingConfig.config_status || 'Not Started'}
                </Badge>
              </div>

              {/* Network Configuration */}
              <div className="border-t pt-4">
                <h3 className="text-lg font-semibold mb-4">Network Configuration</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <div className="text-sm font-medium text-muted-foreground">Firewall IP</div>
                    <div className="text-base font-mono">{viewingConfig.firewall_ip || '-'}</div>
                  </div>
                  <div>
                    <div className="text-sm font-medium text-muted-foreground">Zonal Port Number</div>
                    <div className="text-base font-mono">{viewingConfig.zonal_port_number || '-'}</div>
                  </div>
                </div>
              </div>

              {/* Allocated Devices */}
              <div className="border-t pt-4">
                <h3 className="text-lg font-semibold mb-4">Allocated Devices ({viewingConfig.devicesAllocated})</h3>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Device Type</TableHead>
                      <TableHead>Make</TableHead>
                      <TableHead>Serial Number</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {viewingConfig.allocatedDevices && viewingConfig.allocatedDevices.length > 0 ? (
                      viewingConfig.allocatedDevices.map((d) => (
                        <TableRow key={d.serial}>
                          <TableCell className="font-medium">
                            <Badge variant="outline">{d.type}</Badge>
                          </TableCell>
                          <TableCell>{d.make}</TableCell>
                          <TableCell className="font-mono text-xs">{d.serial}</TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={3} className="text-center text-muted-foreground">
                          No devices allocated
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Configuration Assignment?</AlertDialogTitle>
            <AlertDialogDescription>
              This will remove the engineer assignment and reset the configuration status for site <strong>{siteToDelete?.store_code}</strong>. 
              The site will remain in the list and can be reassigned later.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setSiteToDelete(null)}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleDeleteConfiguration}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
