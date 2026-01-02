import { useState, useEffect } from "react";
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Settings, Eye, Play, CheckCircle, Pencil } from "lucide-react";
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
  config_deadline_at?: string | null;
  devicesAllocated: number;
  allocatedDevices?: InventoryItem[];
  aps_needed?: number | null;
  firewall_ip?: string | null;
  zonal_port_number?: string | null;
  device_config?: any;
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
  
  // Device information states
  const [switchMake, setSwitchMake] = useState('');
  const [switchModel, setSwitchModel] = useState('');
  const [switchSerial, setSwitchSerial] = useState('');
  
  const [firewallMake, setFirewallMake] = useState('');
  const [firewallModel, setFirewallModel] = useState('');
  const [firewallSerial, setFirewallSerial] = useState('');
  
  const [accessPoints, setAccessPoints] = useState<Array<{make: string; model: string; serial: string}>>([]);
  
  // Inventory data for autocomplete
  const [allInventory, setAllInventory] = useState<any[]>([]);
  const [availableSwitches, setAvailableSwitches] = useState<any[]>([]);
  const [availableFirewalls, setAvailableFirewalls] = useState<any[]>([]);
  const [availableAPs, setAvailableAPs] = useState<any[]>([]);

  useEffect(() => {
    loadMySites();
    // Load inventory immediately
    loadInventoryForAutocomplete();
  }, []);
  
  // Also reload inventory when dialog opens to ensure fresh data
  useEffect(() => {
    if (completeDialogOpen) {
      console.log('Dialog opened, reloading inventory...');
      loadInventoryForAutocomplete();
    }
  }, [completeDialogOpen]);

  const loadInventoryForAutocomplete = async () => {
    try {
      console.log('Loading inventory from database...');
      const inventory = await getInventory();
      console.log('Full inventory loaded:', inventory);
      console.log('Total inventory count:', inventory?.length);
      
      if (inventory && inventory.length > 0) {
        // Log ALL inventory items with their in_use status
        console.log('ALL inventory items with in_use status:');
        inventory.forEach((item: any, index: number) => {
          console.log(`  [${index}] Type: "${item.type}", Make: "${item.make}", Serial: "${item.serial}", in_use: ${item.in_use} (${typeof item.in_use})`);
        });
        
        // Log unique types to see exact values
        const uniqueTypes = [...new Set(inventory.map((i: any) => i.type))];
        console.log('Unique types in inventory:', uniqueTypes);
        
        // Log in_use status distribution
        const inUseTrue = inventory.filter((i: any) => i.in_use === true).length;
        const inUseFalse = inventory.filter((i: any) => i.in_use === false).length;
        const inUseNull = inventory.filter((i: any) => i.in_use === null || i.in_use === undefined).length;
        console.log(`in_use status - true: ${inUseTrue}, false: ${inUseFalse}, null/undefined: ${inUseNull}`);
        
        setAllInventory(inventory);
        
        // Filter available (in_use = false or null) devices by type
        const switches = inventory.filter((i: any) => {
          const typeMatch = i.type === 'Switch' || i.type?.toLowerCase() === 'switch';
          const available = i.in_use === false || i.in_use === null || i.in_use === undefined;
          console.log(`Switch check - Type: "${i.type}", in_use: ${i.in_use}, typeMatch: ${typeMatch}, available: ${available}`);
          return typeMatch && available;
        });
        
        const firewalls = inventory.filter((i: any) => {
          const typeMatch = i.type === 'Firewall' || i.type?.toLowerCase() === 'firewall';
          const available = i.in_use === false || i.in_use === null || i.in_use === undefined;
          console.log(`Firewall check - Type: "${i.type}", in_use: ${i.in_use}, typeMatch: ${typeMatch}, available: ${available}`);
          return typeMatch && available;
        });
        
        const aps = inventory.filter((i: any) => {
          const typeMatch = i.type === 'Access Point' || i.type?.toLowerCase() === 'access point';
          const available = i.in_use === false || i.in_use === null || i.in_use === undefined;
          console.log(`AP check - Type: "${i.type}", in_use: ${i.in_use}, typeMatch: ${typeMatch}, available: ${available}`);
          return typeMatch && available;
        });
        
        console.log('Available Switches:', switches);
        console.log('Available Firewalls:', firewalls);
        console.log('Available APs:', aps);
        
        setAvailableSwitches(switches);
        setAvailableFirewalls(firewalls);
        setAvailableAPs(aps);
      } else {
        console.log('No inventory data returned or empty array');
      }
    } catch (e) {
      console.error('loadInventoryForAutocomplete error', e);
    }
  };

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

      // Load site assignments assigned to this engineer for device configuration
      const { data, error } = await supabase
        .from('site_assignments')
        .select('id, city, store_code, store_id, status, config_status, config_deadline_at, aps_needed, firewall_ip, zonal_port_number, device_config')
        .eq('config_assigned_to', user.id)
        .eq('status', 'Done')
        .order('config_deadline_at', { ascending: true });

      if (error) throw error;

      // Load inventory to get allocated devices
      const inventory = await getInventory();

      // Load store names
      const storeIds = Array.from(new Set((data || []).map((s: any) => s.store_id)));
      const { data: stores, error: storesError } = await supabase
        .from('stores')
        .select('id, store')
        .in('id', storeIds);

      if (storesError) throw storesError;

      const storeMap: Record<string, string> = {};
      (stores || []).forEach((s: any) => {
        storeMap[s.id] = s.store;
      });

      // Build sites list (show all assigned sites, even without devices)
      const sitesList: SiteAssignment[] = (data || []).map((s: any) => {
        const allocatedDevices = (inventory || [])
          .filter((i: any) => i.store_code === s.store_code && i.in_use)
          .map((d: any) => ({
            id: d.id,
            type: d.type,
            make: d.make,
            serial: d.serial,
            in_use: d.in_use,
            site: d.store_code,
          }));

        return {
          id: s.id,
          city: s.city,
          store_code: s.store_code,
          store_name: storeMap[s.store_id] || '-',
          status: s.status,
          config_status: s.config_status ?? 'Not Started',
          config_deadline_at: s.config_deadline_at,
          devicesAllocated: allocatedDevices.length,
          allocatedDevices: allocatedDevices,
          aps_needed: s.aps_needed ?? null,
          firewall_ip: s.firewall_ip ?? null,
          zonal_port_number: s.zonal_port_number ?? null,
          device_config: s.device_config ?? null,
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

  const openCompleteDialog = (site: SiteAssignment, isEdit = false) => {
    console.log('Opening complete dialog for site:', site);
    console.log('Available inventory counts:', {
      switches: availableSwitches.length,
      firewalls: availableFirewalls.length,
      aps: availableAPs.length
    });
    console.log('Sample switch data:', availableSwitches[0]);
    console.log('Sample firewall data:', availableFirewalls[0]);
    console.log('Sample AP data:', availableAPs[0]);
    
    setCompletingSite(site);
    
    // If editing existing configuration, pre-fill with saved data
    if (isEdit && site.device_config) {
      const config = site.device_config;
      
      // Load Switch data
      setSwitchMake(config.switch?.make || '');
      setSwitchModel(config.switch?.model || '');
      setSwitchSerial(config.switch?.serial || '');
      
      // Load Firewall data
      setFirewallMake(config.firewall?.make || '');
      setFirewallModel(config.firewall?.model || '');
      setFirewallSerial(config.firewall?.serial || '');
      
      // Load Access Points data
      if (config.accessPoints && Array.isArray(config.accessPoints)) {
        setAccessPoints(config.accessPoints.map((ap: any) => ({
          make: ap.make || '',
          model: ap.model || '',
          serial: ap.serial || ''
        })));
      } else {
        const apsCount = site.aps_needed || 0;
        setAccessPoints(Array(apsCount).fill(null).map(() => ({ make: '', model: '', serial: '' })));
      }
    } else {
      // Initialize device fields with empty strings (Select needs string values)
      setSwitchMake('');
      setSwitchModel('');
      setSwitchSerial('');
      setFirewallMake('');
      setFirewallModel('');
      setFirewallSerial('');
      
      // Initialize access points array based on APs needed
      const apsCount = site.aps_needed || 0;
      setAccessPoints(Array(apsCount).fill(null).map(() => ({ make: '', model: '', serial: '' })));
    }
    
    setCompleteDialogOpen(true);
  };

  const handleCompleteWork = async () => {
    if (!completingSite) return;

    // Validate device information
    if (!switchMake || !switchModel || !switchSerial) {
      toast({
        title: 'Missing Information',
        description: 'Please enter all Switch information',
        variant: 'destructive'
      });
      return;
    }

    if (!firewallMake || !firewallModel || !firewallSerial) {
      toast({
        title: 'Missing Information',
        description: 'Please enter all Firewall information',
        variant: 'destructive'
      });
      return;
    }

    // Validate all access points
    for (let i = 0; i < accessPoints.length; i++) {
      const ap = accessPoints[i];
      if (!ap.make || !ap.model || !ap.serial) {
        toast({
          title: 'Missing Information',
          description: `Please enter all information for Access Point ${i + 1}`,
          variant: 'destructive'
        });
        return;
      }
    }

    try {
      // Prepare device configuration data
      const deviceConfig = {
        switch: {
          make: switchMake,
          model: switchModel,
          serial: switchSerial
        },
        firewall: {
          make: firewallMake,
          model: firewallModel,
          serial: firewallSerial
        },
        accessPoints: accessPoints
      };

      // Update site_assignments with device config
      const { error: siteError } = await supabase
        .from('site_assignments')
        .update({ 
          config_status: 'Completed',
          device_config: deviceConfig
        })
        .eq('id', completingSite.id);

      if (siteError) throw siteError;

      // Update inventory: set in_use = true and store_code for all devices
      // Update Switch
      const { error: switchError } = await supabase
        .from('inventory')
        .update({ 
          in_use: true,
          store_code: completingSite.store_code,
          assigned_date: new Date().toISOString()
        })
        .eq('serial', switchSerial);

      if (switchError) {
        console.error('Error updating switch in inventory:', switchError);
        toast({
          title: 'Warning',
          description: `Switch ${switchSerial} may not be in inventory`,
          variant: 'destructive'
        });
      }

      // Update Firewall
      const { error: firewallError } = await supabase
        .from('inventory')
        .update({ 
          in_use: true,
          store_code: completingSite.store_code,
          assigned_date: new Date().toISOString()
        })
        .eq('serial', firewallSerial);

      if (firewallError) {
        console.error('Error updating firewall in inventory:', firewallError);
        toast({
          title: 'Warning',
          description: `Firewall ${firewallSerial} may not be in inventory`,
          variant: 'destructive'
        });
      }

      // Update Access Points
      for (const ap of accessPoints) {
        if (ap.serial) {
          const { error: apError } = await supabase
            .from('inventory')
            .update({ 
              in_use: true,
              store_code: completingSite.store_code,
              assigned_date: new Date().toISOString()
            })
            .eq('serial', ap.serial);

          if (apError) {
            console.error(`Error updating AP ${ap.serial} in inventory:`, apError);
          }
        }
      }

      toast({
        title: 'Work Completed',
        description: `Configuration completed for ${completingSite.store_code}. Devices marked as in use.`,
      });

      setCompleteDialogOpen(false);
      setCompletingSite(null);
      setSwitchMake('');
      setSwitchModel('');
      setSwitchSerial('');
      setFirewallMake('');
      setFirewallModel('');
      setFirewallSerial('');
      setAccessPoints([]);
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

  const updateAccessPoint = (index: number, field: 'make' | 'model' | 'serial', value: string) => {
    const updated = [...accessPoints];
    updated[index][field] = value;
    setAccessPoints(updated);
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
                    const isOverdue = site.config_deadline_at && new Date(site.config_deadline_at) < new Date();
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
                          {site.config_deadline_at ? (
                            <span className={isOverdue ? 'text-red-600 font-medium' : ''}>
                              {new Date(site.config_deadline_at).toLocaleDateString()}
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
                              <>
                                <Button
                                  size="sm"
                                  variant="default"
                                  onClick={() => openCompleteDialog(site)}
                                >
                                  <CheckCircle className="h-4 w-4 mr-1" />
                                  Complete
                                </Button>
                              </>
                            )}
                            {configStatus === 'Completed' && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => openCompleteDialog(site, true)}
                              >
                                <Pencil className="h-4 w-4 mr-1" />
                                Edit
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
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Complete Configuration</DialogTitle>
            <DialogDescription>
              Enter device configuration details for {completingSite?.store_code}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-6 mt-4">
            {/* Switch Information */}
            <div className="border rounded-lg p-4 space-y-3">
              <h3 className="font-semibold text-sm">Switch Information * 
                <span className="text-xs text-muted-foreground ml-2">({availableSwitches.length} available in inventory)</span>
              </h3>
              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-1">
                  <Label htmlFor="switchMake">Make</Label>
                  <Select value={switchMake || undefined} onValueChange={(value) => {
                    setSwitchMake(value);
                    setSwitchModel('');
                    setSwitchSerial('');
                  }}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select make..." />
                    </SelectTrigger>
                    <SelectContent>
                      {availableSwitches.length === 0 ? (
                        <div className="p-2 text-sm text-muted-foreground">No switches available</div>
                      ) : (
                        Array.from(new Set(availableSwitches.map((s: any) => s.make))).map((make: any) => (
                          <SelectItem key={make} value={make}>
                            {make}
                          </SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label htmlFor="switchModel">Device Model</Label>
                  <Select 
                    value={switchModel || undefined} 
                    onValueChange={(value) => {
                      setSwitchModel(value);
                      setSwitchSerial('');
                    }}
                    disabled={!switchMake}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select model..." />
                    </SelectTrigger>
                    <SelectContent>
                      {!switchMake ? (
                        <div className="p-2 text-sm text-muted-foreground">Select make first</div>
                      ) : (
                        (() => {
                          const models = availableSwitches
                            .filter((s: any) => s.make === switchMake)
                            .map((s: any) => s.model)
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
                <div className="space-y-1 relative">
                  <Label htmlFor="switchSerial">Serial Number</Label>
                  <Input
                    id="switchSerial"
                    placeholder="Type to search available switches..."
                    value={switchSerial}
                    onChange={(e) => {
                      const value = e.target.value;
                      setSwitchSerial(value);
                      // Auto-fill make and model when serial is selected from list
                      if (value.length > 0) {
                        const device = availableSwitches.find((s: any) => s.serial === value);
                        if (device) {
                          setSwitchMake(device.make);
                          setSwitchModel(device.model || '');
                        }
                      }
                    }}
                    list="switchSerialList"
                  />
                  <datalist id="switchSerialList">
                    {availableSwitches
                      .filter((s: any) => 
                        !switchSerial || s.serial.toLowerCase().includes(switchSerial.toLowerCase())
                      )
                      .filter((s: any) => 
                        (!switchMake || s.make === switchMake) && 
                        (!switchModel || s.model === switchModel)
                      )
                      .slice(0, 20)
                      .map((s: any) => (
                        <option key={s.serial} value={s.serial}>
                          {s.make} {s.model} - {s.serial}
                        </option>
                      ))}
                  </datalist>
                  {switchSerial && availableSwitches.filter((s: any) => 
                    s.serial.toLowerCase().includes(switchSerial.toLowerCase()) &&
                    (!switchMake || s.make === switchMake) && 
                    (!switchModel || s.model === switchModel)
                  ).length === 0 && (
                    <p className="text-xs text-amber-600 mt-1">⚠️ No available switches match this serial</p>
                  )}
                  <p className="text-xs text-muted-foreground">
                    {availableSwitches.length} available in inventory (not in use)
                  </p>
                </div>
              </div>
            </div>

            {/* Firewall Information */}
            <div className="border rounded-lg p-4 space-y-3">
              <h3 className="font-semibold text-sm">Firewall Information *
                <span className="text-xs text-muted-foreground ml-2">({availableFirewalls.length} available in inventory)</span>
              </h3>
              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-1">
                  <Label htmlFor="firewallMake">Make</Label>
                  <Select value={firewallMake || undefined} onValueChange={(value) => {
                    setFirewallMake(value);
                    setFirewallModel('');
                    setFirewallSerial('');
                  }}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select make..." />
                    </SelectTrigger>
                    <SelectContent>
                      {availableFirewalls.length === 0 ? (
                        <div className="p-2 text-sm text-muted-foreground">No firewalls available</div>
                      ) : (
                        Array.from(new Set(availableFirewalls.map((f: any) => f.make))).map((make: any) => (
                          <SelectItem key={make} value={make}>
                            {make}
                          </SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label htmlFor="firewallModel">Device Model</Label>
                  <Select 
                    value={firewallModel || undefined} 
                    onValueChange={(value) => {
                      setFirewallModel(value);
                      setFirewallSerial('');
                    }}
                    disabled={!firewallMake}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select model..." />
                    </SelectTrigger>
                    <SelectContent>
                      {!firewallMake ? (
                        <div className="p-2 text-sm text-muted-foreground">Select make first</div>
                      ) : (
                        (() => {
                          const models = availableFirewalls
                            .filter((f: any) => f.make === firewallMake)
                            .map((f: any) => f.model)
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
                <div className="space-y-1 relative">
                  <Label htmlFor="firewallSerial">Serial Number</Label>
                  <Input
                    id="firewallSerial"
                    placeholder="Type to search available firewalls..."
                    value={firewallSerial}
                    onChange={(e) => {
                      const value = e.target.value;
                      setFirewallSerial(value);
                      // Auto-fill make and model when serial is selected from list
                      if (value.length > 0) {
                        const device = availableFirewalls.find((f: any) => f.serial === value);
                        if (device) {
                          setFirewallMake(device.make);
                          setFirewallModel(device.model || '');
                        }
                      }
                    }}
                    list="firewallSerialList"
                  />
                  <datalist id="firewallSerialList">
                    {availableFirewalls
                      .filter((f: any) => 
                        !firewallSerial || f.serial.toLowerCase().includes(firewallSerial.toLowerCase())
                      )
                      .filter((f: any) => 
                        (!firewallMake || f.make === firewallMake) && 
                        (!firewallModel || f.model === firewallModel)
                      )
                      .slice(0, 20)
                      .map((f: any) => (
                        <option key={f.serial} value={f.serial}>
                          {f.make} {f.model} - {f.serial}
                        </option>
                      ))}
                  </datalist>
                  {firewallSerial && availableFirewalls.filter((f: any) => 
                    f.serial.toLowerCase().includes(firewallSerial.toLowerCase()) &&
                    (!firewallMake || f.make === firewallMake) && 
                    (!firewallModel || f.model === firewallModel)
                  ).length === 0 && (
                    <p className="text-xs text-amber-600 mt-1">⚠️ No available firewalls match this serial</p>
                  )}
                  <p className="text-xs text-muted-foreground">
                    {availableFirewalls.length} available in inventory (not in use)
                  </p>
                </div>
              </div>
            </div>

            {/* Access Points */}
            {accessPoints.length > 0 && (
              <div className="border rounded-lg p-4 space-y-3">
                <h3 className="font-semibold text-sm">
                  Access Points * ({accessPoints.length} required)
                  <span className="text-xs text-muted-foreground ml-2">({availableAPs.length} available in inventory)</span>
                </h3>
                <div className="space-y-4">
                  {accessPoints.map((ap, index) => (
                    <div key={index} className="border-b pb-3 last:border-b-0">
                      <p className="text-xs font-medium text-muted-foreground mb-2">
                        Access Point {index + 1}
                      </p>
                      <div className="grid grid-cols-3 gap-3">
                        <div className="space-y-1">
                          <Label htmlFor={`apMake${index}`}>Make</Label>
                          <Select 
                            value={ap.make || undefined} 
                            onValueChange={(value) => {
                              updateAccessPoint(index, 'make', value);
                              updateAccessPoint(index, 'model', '');
                              updateAccessPoint(index, 'serial', '');
                            }}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Select make..." />
                            </SelectTrigger>
                            <SelectContent>
                              {availableAPs.length === 0 ? (
                                <div className="p-2 text-sm text-muted-foreground">No access points available</div>
                              ) : (
                                Array.from(new Set(availableAPs.map((a: any) => a.make))).map((make: any) => (
                                  <SelectItem key={make} value={make}>
                                    {make}
                                  </SelectItem>
                                ))
                              )}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-1">
                          <Label htmlFor={`apModel${index}`}>Device Model</Label>
                          <Select 
                            value={ap.model || undefined} 
                            onValueChange={(value) => {
                              updateAccessPoint(index, 'model', value);
                              updateAccessPoint(index, 'serial', '');
                            }}
                            disabled={!ap.make}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Select model..." />
                            </SelectTrigger>
                            <SelectContent>
                              {!ap.make ? (
                                <div className="p-2 text-sm text-muted-foreground">Select make first</div>
                              ) : (
                                (() => {
                                  const models = availableAPs
                                    .filter((a: any) => a.make === ap.make)
                                    .map((a: any) => a.model)
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
                        <div className="space-y-1 relative">
                          <Label htmlFor={`apSerial${index}`}>Serial Number</Label>
                          <Input
                            id={`apSerial${index}`}
                            placeholder="Type to search available APs..."
                            value={ap.serial}
                            onChange={(e) => {
                              const value = e.target.value;
                              updateAccessPoint(index, 'serial', value);
                              // Auto-fill make and model when serial is selected from list
                              if (value.length > 0) {
                                const device = availableAPs.find((a: any) => a.serial === value);
                                if (device) {
                                  updateAccessPoint(index, 'make', device.make);
                                  updateAccessPoint(index, 'model', device.model || '');
                                }
                              }
                            }}
                            list={`apSerialList${index}`}
                          />
                          <datalist id={`apSerialList${index}`}>
                            {availableAPs
                              .filter((a: any) => 
                                !ap.serial || a.serial.toLowerCase().includes(ap.serial.toLowerCase())
                              )
                              .filter((a: any) => 
                                (!ap.make || a.make === ap.make) && 
                                (!ap.model || a.model === ap.model)
                              )
                              .slice(0, 20)
                              .map((a: any) => (
                                <option key={a.serial} value={a.serial}>
                                  {a.make} {a.model} - {a.serial}
                                </option>
                              ))}
                          </datalist>
                          {ap.serial && availableAPs
                            .filter((a: any) => 
                              a.serial.toLowerCase().includes(ap.serial.toLowerCase())
                            )
                            .filter((a: any) => 
                              (!ap.make || a.make === ap.make) && 
                              (!ap.model || a.model === ap.model)
                            ).length === 0 && (
                            <p className="text-xs text-amber-600 mt-1">⚠️ No available APs match this serial</p>
                          )}
                          <p className="text-xs text-muted-foreground">{availableAPs.length} available in inventory (not in use)</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="flex justify-end gap-2 pt-4">
              <Button 
                variant="outline" 
                onClick={() => {
                  setCompleteDialogOpen(false);
                  setCompletingSite(null);
                  setSwitchMake('');
                  setSwitchModel('');
                  setSwitchSerial('');
                  setFirewallMake('');
                  setFirewallModel('');
                  setFirewallSerial('');
                  setAccessPoints([]);
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
