import { useState, useEffect } from "react";
import { useFeatureFlags } from '@/hooks/useFeatureFlags';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Settings, Wrench, Eye } from "lucide-react";
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

  useEffect(() => {
    if (!loading && !has('Project Manager')) {
      navigate('/');
    }
  }, [loading, has, navigate]);

  useEffect(() => {
    loadSites();
    loadInventory();
    loadEngineers();
  }, []);

  const loadSites = async () => {
    try {
      const { data, error } = await supabase
        .from('site_assignments')
        .select('id, city, store_code, status, config_status, assigned_to, deadline_at, aps_needed, firewall_ip, zonal_port_number')
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
    setSelectedEngineer(site.assigned_to || '');
    setDeadline(site.deadline_at ? site.deadline_at.split('T')[0] : '');
  };

  const toggleDeviceSelection = (serial: string) => {
    setDeviceSelections((prev) => ({ ...prev, [serial]: !prev[serial] }));
  };

  const saveConfiguration = async () => {
    if (!selectedSite) return;
    try {
      // Update engineer & deadline if provided
      if (selectedEngineer || deadline) {
        const updatePayload: any = {};
        if (selectedEngineer) updatePayload.assigned_to = selectedEngineer;
        if (deadline) updatePayload.deadline_at = new Date(deadline).toISOString();
        if (Object.keys(updatePayload).length) {
          const { error: updErr } = await supabase
            .from('site_assignments')
            .update(updatePayload)
            .eq('id', selectedSite.id);
          if (updErr) throw updErr;
        }
      }

      // Allocate selected devices
      const selectedSerials = Object.entries(deviceSelections)
        .filter(([, v]) => v)
        .map(([serial]) => serial);
      for (const serial of selectedSerials) {
        await supabase
          .from('inventory')
          .update({ in_use: true, site: selectedSite.store_code, assigned_date: new Date().toISOString().split('T')[0] })
          .eq('serial', serial);
      }

      toast({
        title: 'Configuration Saved',
        description: `Engineer and ${selectedSerials.length} devices assigned to site ${selectedSite.store_code}`,
      });
      setDialogOpen(false);
      await loadSites();
      await loadInventory();
    } catch (e) {
      console.error('saveConfiguration error', e);
      toast({
        title: 'Error',
        description: 'Failed to save configuration. Please retry.',
        variant: 'destructive'
      });
    }
  };

  if (!loading && !has('Project Manager')) {
    return (
      <div className="p-6">
        <Card>
          <CardHeader>
            <CardTitle>Access Restricted</CardTitle>
            <CardDescription>The Project Manager feature is disabled for your account.</CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

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
                <TableHead>Devices Allocated</TableHead>
                <TableHead>Allocated Devices</TableHead>
                <TableHead>Engineer</TableHead>
                <TableHead>Config Status</TableHead>
                <TableHead>Firewall IP</TableHead>
                <TableHead>Zonal Port</TableHead>
                <TableHead>Deadline</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sites.map((s) => (
                <TableRow key={s.id}>
                  <TableCell className="font-medium">{s.city}</TableCell>
                  <TableCell>{s.store_code}</TableCell>
                  <TableCell>{s.devicesAllocated}</TableCell>
                  <TableCell>
                    {s.devicesAllocated > 0 ? (
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
                      <span className="text-xs text-muted-foreground">-</span>
                    )}
                  </TableCell>
                  <TableCell>{engineers.find((e) => e.id === s.assigned_to)?.email || '-'}</TableCell>
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
                  <TableCell className="text-xs">
                    {s.firewall_ip || '-'}
                  </TableCell>
                  <TableCell className="text-xs">
                    {s.zonal_port_number || '-'}
                  </TableCell>
                  <TableCell>{s.deadline_at ? s.deadline_at.split('T')[0] : '-'}</TableCell>
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
                </TableRow>
              ))}
            </TableBody>
          </Table>
          {sites.length === 0 && <div className="text-sm text-muted-foreground mt-2">No completed sites yet.</div>}
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Assign Site {selectedSite?.store_code}</DialogTitle>
            <DialogDescription>Assign an engineer and allocate inventory devices.</DialogDescription>
          </DialogHeader>
          {selectedSite && (
            <div className="space-y-6">
              {/* Engineer & Deadline */}
              <div className="grid md:grid-cols-3 gap-4">
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
                <div className="flex flex-col gap-1">
                  <label className="text-sm font-medium">Currently Allocated</label>
                  <div className="text-sm">{selectedSite.devicesAllocated} devices</div>
                </div>
              </div>

              {/* Device allocation tables with APs Needed mapping */}
              {(['Router','Switch','Firewall','Access Point'] as InventoryItem['type'][]).map((type) => {
                const devices = availableDevicesByType(type);
                // For Access Point, show needed count and selected count
                const isAP = type === 'Access Point';
                const apsNeeded = isAP ? selectedSite.aps_needed ?? 0 : undefined;
                const selectedAPs = isAP ? Object.entries(deviceSelections).filter(([serial, sel]) => sel && devices.some(d => d.serial === serial)).length : undefined;
                return (
                  <div key={type} className="space-y-2">
                    <h3 className="font-semibold text-sm flex items-center gap-2">
                      <Wrench className="h-4 w-4" /> {type}s <span className="text-xs text-muted-foreground">(Available: {devices.length})</span>
                      {isAP && (
                        <span className="ml-2 text-xs font-semibold text-primary">Needed: {apsNeeded} | Selected: {selectedAPs}</span>
                      )}
                    </h3>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-12"></TableHead>
                          <TableHead>Make</TableHead>
                          <TableHead>Serial</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {devices.map((d) => (
                          <TableRow key={d.serial}>
                            <TableCell>
                              <input
                                type="checkbox"
                                className="w-4 h-4"
                                checked={!!deviceSelections[d.serial]}
                                onChange={() => toggleDeviceSelection(d.serial)}
                                disabled={isAP && apsNeeded > 0 && selectedAPs >= apsNeeded && !deviceSelections[d.serial]}
                              />
                            </TableCell>
                            <TableCell>{d.make}</TableCell>
                            <TableCell className="font-mono text-xs">{d.serial}</TableCell>
                          </TableRow>
                        ))}
                        {devices.length === 0 && (
                          <TableRow>
                            <TableCell colSpan={3} className="text-xs text-muted-foreground">No available {type.toLowerCase()}s.</TableCell>
                          </TableRow>
                        )}
                      </TableBody>
                    </Table>
                  </div>
                );
              })}

              <div className="flex justify-end gap-2 pt-4">
                <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
                <Button onClick={saveConfiguration}>Save Configuration</Button>
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
    </div>
  );
}
