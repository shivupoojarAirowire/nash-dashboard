import { useState, useEffect } from "react";
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Settings, Eye, Play, CheckCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { getInventory } from "@/integrations/supabase/inventory";
import { useToast } from "@/hooks/use-toast";

type SiteAssignment = {
  id: string;
  city: string;
  store_code: string;
  store_name: string;
  status: string;
  config_status?: string | null;
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

export default function EngineerDeviceConfigurations() {
  const navigate = useNavigate();
  const { toast } = useToast();

  const [sites, setSites] = useState<SiteAssignment[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewDevicesDialogOpen, setViewDevicesDialogOpen] = useState(false);
  const [viewingDevices, setViewingDevices] = useState<InventoryItem[]>([]);
  const [selectedSite, setSelectedSite] = useState<string>('');
  const [completeDialogOpen, setCompleteDialogOpen] = useState(false);
  const [completingSite, setCompletingSite] = useState<SiteAssignment | null>(null);
  const [firewallIp, setFirewallIp] = useState('');
  const [zonalPortNumber, setZonalPortNumber] = useState('');

  useEffect(() => {
    loadMySites();
  }, []);

  const loadMySites = async () => {
    try {
      setLoading(true);
      
      // Get current user
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) {
        toast({
          title: 'Error',
          description: 'Could not get user information',
          variant: 'destructive'
        });
        return;
      }

      // Load site assignments assigned to this engineer
      const { data, error } = await supabase
        .from('site_assignments')
        .select('id, city, store_code, store_id, status, config_status, deadline_at, aps_needed, firewall_ip, zonal_port_number')
        .eq('assigned_to', user.id)
        .eq('status', 'Done')
        .order('deadline_at', { ascending: true });

      if (error) throw error;

      // Load inventory to get allocated devices
      const inventory = await getInventory();

      // Filter only sites that have devices allocated (assigned from Device Configurations)
      const sitesWithDevices = (data || []).filter((s: any) => {
        return (inventory || []).some((i: any) => i.site === s.store_code && i.in_use);
      });

      // Load store names
      const storeIds = Array.from(new Set(sitesWithDevices.map((s: any) => s.store_id)));
      const { data: stores, error: storesError } = await supabase
        .from('stores')
        .select('id, store')
        .in('id', storeIds);

      if (storesError) throw storesError;

      const storeMap: Record<string, string> = {};
      (stores || []).forEach((s: any) => {
        storeMap[s.id] = s.store;
      });

      // Build sites list (only sites with devices allocated)
      const sitesList: SiteAssignment[] = sitesWithDevices.map((s: any) => {
        const allocatedDevices = (inventory || [])
          .filter((i: any) => i.site === s.store_code && i.in_use)
          .map((d: any) => ({
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
          store_name: storeMap[s.store_id] || '-',
          status: s.status,
          config_status: s.config_status ?? 'Not Started',
          deadline_at: s.deadline_at,
          devicesAllocated: allocatedDevices.length,
          allocatedDevices: allocatedDevices,
          aps_needed: s.aps_needed ?? null,
          firewall_ip: s.firewall_ip ?? null,
          zonal_port_number: s.zonal_port_number ?? null,
        };
      });

      setSites(sitesList);
    } catch (e) {
      console.error('loadMySites error', e);
      toast({
        title: 'Error',
        description: 'Failed to load your assigned sites',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const viewDevices = (site: SiteAssignment) => {
    setSelectedSite(site.store_code);
    setViewingDevices(site.allocatedDevices || []);
    setViewDevicesDialogOpen(true);
  };

  const handleStartWork = async (site: SiteAssignment) => {
    try {
      const { error } = await supabase
        .from('site_assignments')
        .update({ config_status: 'In Progress' })
        .eq('id', site.id);

      if (error) throw error;

      toast({
        title: 'Work Started',
        description: `Started configuration work for ${site.store_code}`,
      });

      await loadMySites();
    } catch (e) {
      console.error('handleStartWork error', e);
      toast({
        title: 'Error',
        description: 'Failed to start work',
        variant: 'destructive'
      });
    }
  };

  const openCompleteDialog = (site: SiteAssignment) => {
    setCompletingSite(site);
    setFirewallIp(site.firewall_ip || '');
    setZonalPortNumber(site.zonal_port_number || '');
    setCompleteDialogOpen(true);
  };

  const handleCompleteWork = async () => {
    if (!completingSite) return;

    if (!firewallIp || !zonalPortNumber) {
      toast({
        title: 'Missing Information',
        description: 'Please enter both Firewall IP and Zonal Port Number',
        variant: 'destructive'
      });
      return;
    }

    try {
      const { error } = await supabase
        .from('site_assignments')
        .update({ 
          config_status: 'Completed',
          firewall_ip: firewallIp,
          zonal_port_number: zonalPortNumber
        })
        .eq('id', completingSite.id);

      if (error) throw error;

      toast({
        title: 'Work Completed',
        description: `Configuration completed for ${completingSite.store_code}`,
      });

      setCompleteDialogOpen(false);
      setCompletingSite(null);
      setFirewallIp('');
      setZonalPortNumber('');
      await loadMySites();
    } catch (e) {
      console.error('handleCompleteWork error', e);
      toast({
        title: 'Error',
        description: 'Failed to complete work',
        variant: 'destructive'
      });
    }
  };

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <Settings className="h-8 w-8" />
          My Device Configurations
        </h1>
        <p className="text-muted-foreground mt-2">View devices allocated to sites assigned to you</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>My Assigned Sites</CardTitle>
          <CardDescription>Sites with device configurations assigned to you</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8 text-muted-foreground">Loading...</div>
          ) : sites.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No sites assigned to you yet
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>City</TableHead>
                    <TableHead>Store</TableHead>
                    <TableHead>Site Code</TableHead>
                    <TableHead>APs Needed</TableHead>
                    <TableHead>Devices Allocated</TableHead>
                    <TableHead>Deadline</TableHead>
                    <TableHead>Config Status</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sites.map((site) => {
                    const isOverdue = site.deadline_at && new Date(site.deadline_at) < new Date();
                    const configStatus = site.config_status || 'Not Started';
                    return (
                      <TableRow key={site.id}>
                        <TableCell className="font-medium">{site.city}</TableCell>
                        <TableCell className="max-w-[200px] truncate">{site.store_name}</TableCell>
                        <TableCell>{site.store_code}</TableCell>
                        <TableCell>
                          {site.aps_needed !== null ? (
                            <Badge variant="outline">{site.aps_needed}</Badge>
                          ) : (
                            <span className="text-xs text-muted-foreground">-</span>
                          )}
                        </TableCell>
                        <TableCell>
                          {site.devicesAllocated > 0 ? (
                            <Badge variant="secondary">{site.devicesAllocated}</Badge>
                          ) : (
                            <span className="text-xs text-muted-foreground">None</span>
                          )}
                        </TableCell>
                        <TableCell>
                          {site.deadline_at ? (
                            <span className={isOverdue ? 'text-red-600 font-medium' : ''}>
                              {new Date(site.deadline_at).toLocaleDateString()}
                            </span>
                          ) : (
                            <span className="text-xs text-muted-foreground">-</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <Badge 
                            className={
                              configStatus === 'Completed' 
                                ? 'bg-green-100 text-green-800' 
                                : configStatus === 'In Progress'
                                ? 'bg-blue-100 text-blue-800'
                                : 'bg-gray-100 text-gray-800'
                            }
                          >
                            {configStatus}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-2">
                            {site.devicesAllocated > 0 && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => viewDevices(site)}
                              >
                                <Eye className="h-4 w-4 mr-1" />
                                View
                              </Button>
                            )}
                            {configStatus === 'Not Started' && (
                              <Button
                                size="sm"
                                onClick={() => handleStartWork(site)}
                              >
                                <Play className="h-4 w-4 mr-1" />
                                Start
                              </Button>
                            )}
                            {configStatus === 'In Progress' && (
                              <Button
                                size="sm"
                                variant="default"
                                onClick={() => openCompleteDialog(site)}
                              >
                                <CheckCircle className="h-4 w-4 mr-1" />
                                Complete
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* View Devices Dialog */}
      <Dialog open={viewDevicesDialogOpen} onOpenChange={setViewDevicesDialogOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Allocated Devices - {selectedSite}</DialogTitle>
            <DialogDescription>Devices configured for this site</DialogDescription>
          </DialogHeader>
          <div className="mt-4">
            {viewingDevices.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No devices allocated yet
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Device Type</TableHead>
                    <TableHead>Make</TableHead>
                    <TableHead>Serial Number</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {viewingDevices.map((device) => (
                    <TableRow key={device.serial}>
                      <TableCell className="font-medium">
                        <Badge variant="outline">{device.type}</Badge>
                      </TableCell>
                      <TableCell>{device.make}</TableCell>
                      <TableCell className="font-mono text-xs">{device.serial}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Complete Configuration Dialog */}
      <Dialog open={completeDialogOpen} onOpenChange={setCompleteDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Complete Configuration</DialogTitle>
            <DialogDescription>
              Enter configuration details for {completingSite?.store_code}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 mt-4">
            <div className="space-y-2">
              <Label htmlFor="firewallIp">Firewall IP *</Label>
              <Input
                id="firewallIp"
                placeholder="e.g., 192.168.1.1"
                value={firewallIp}
                onChange={(e) => setFirewallIp(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="zonalPort">Zonal Port Number *</Label>
              <Input
                id="zonalPort"
                placeholder="e.g., 8080"
                value={zonalPortNumber}
                onChange={(e) => setZonalPortNumber(e.target.value)}
              />
            </div>
            <div className="flex justify-end gap-2 pt-4">
              <Button 
                variant="outline" 
                onClick={() => {
                  setCompleteDialogOpen(false);
                  setCompletingSite(null);
                  setFirewallIp('');
                  setZonalPortNumber('');
                }}
              >
                Cancel
              </Button>
              <Button onClick={handleCompleteWork}>
                <CheckCircle className="h-4 w-4 mr-1" />
                Complete Configuration
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
