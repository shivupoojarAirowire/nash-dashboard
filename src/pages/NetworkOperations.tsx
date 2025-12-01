import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Network, Circle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

type DeviceStatus = {
  serial: string;
  type: string;
  status: "up" | "down";
  lastSeen?: string;
};

type Site = {
  id: string;
  siteName: string;
  siteCode: string;
  city: string;
  devices: DeviceStatus[];
};

export default function NetworkOperations() {
  const { toast } = useToast();
  const [sites, setSites] = useState<Site[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadSitesData();
  }, []);

  const loadSitesData = async () => {
    try {
      setLoading(true);
      
      // TODO: Replace with actual FortiMonitor API call
      // Uncomment the following lines and remove mock data once FortiMonitor API is configured:
      // import { fetchSites } from '@/integrations/fortimonitor/client';
      // const sites = await fetchSites();
      // setSites(sites);
      // For now, using mock data
      
      // Mock data for demonstration
      const mockSites: Site[] = [
        {
          id: "1",
          siteName: "Mumbai Central Store",
          siteCode: "MUM_CENTRAL_001",
          city: "Mumbai",
          devices: [
            { serial: "FG100E0123456789", type: "Firewall", status: "up", lastSeen: "2025-11-29T10:30:00Z" },
            { serial: "FS108E9876543210", type: "Switch", status: "up", lastSeen: "2025-11-29T10:30:00Z" },
            { serial: "FAP221E1122334455", type: "Access Point", status: "down", lastSeen: "2025-11-29T08:15:00Z" },
            { serial: "FAP221E5544332211", type: "Access Point", status: "up", lastSeen: "2025-11-29T10:30:00Z" }
          ]
        },
        {
          id: "2",
          siteName: "Delhi North Branch",
          siteCode: "DEL_NORTH_002",
          city: "Delhi",
          devices: [
            { serial: "FG60F0987654321", type: "Firewall", status: "up", lastSeen: "2025-11-29T10:28:00Z" },
            { serial: "FS124E1234567890", type: "Switch", status: "up", lastSeen: "2025-11-29T10:28:00Z" },
            { serial: "FAP321E6677889900", type: "Access Point", status: "up", lastSeen: "2025-11-29T10:28:00Z" }
          ]
        },
        {
          id: "3",
          siteName: "Bangalore HSR Store",
          siteCode: "BLR_HSR_003",
          city: "Bangalore",
          devices: [
            { serial: "FG100F1357924680", type: "Firewall", status: "up", lastSeen: "2025-11-29T10:29:00Z" },
            { serial: "FS108E2468013579", type: "Switch", status: "down", lastSeen: "2025-11-29T09:00:00Z" },
            { serial: "FAP221E9988776655", type: "Access Point", status: "up", lastSeen: "2025-11-29T10:29:00Z" },
            { serial: "FAP221E5566778899", type: "Access Point", status: "up", lastSeen: "2025-11-29T10:29:00Z" },
            { serial: "FAP221E1122998877", type: "Access Point", status: "up", lastSeen: "2025-11-29T10:29:00Z" }
          ]
        }
      ];

      setSites(mockSites);
    } catch (error) {
      console.error('Error loading sites data:', error);
      toast({
        title: 'Error',
        description: 'Failed to load network operations data',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const getDeviceStatusColor = (status: "up" | "down") => {
    return status === "up" ? "text-green-500" : "text-red-500";
  };

  const getDeviceStatusBg = (status: "up" | "down") => {
    return status === "up" ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800";
  };

  const upDevicesCount = (devices: DeviceStatus[]) => {
    return devices.filter(d => d.status === "up").length;
  };

  const downDevicesCount = (devices: DeviceStatus[]) => {
    return devices.filter(d => d.status === "down").length;
  };

  if (loading) {
    return (
      <div className="p-6">
        <div className="flex items-center justify-center h-64">
          <div className="text-muted-foreground">Loading network operations data...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <Network className="h-8 w-8" />
          Network Operations
        </h1>
        <p className="text-muted-foreground mt-2">Monitor network devices across all sites</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Sites Overview</CardTitle>
        </CardHeader>
        <CardContent>
          {sites.length === 0 ? (
            <div className="text-center text-muted-foreground py-8">
              No sites found
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Site Name</TableHead>
                  <TableHead>Site Code</TableHead>
                  <TableHead>City</TableHead>
                  <TableHead className="text-center">Total Devices</TableHead>
                  <TableHead className="text-center">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                <TooltipProvider>
                  {sites.map((site) => (
                    <Tooltip key={site.id}>
                      <TooltipTrigger asChild>
                        <TableRow className="cursor-pointer hover:bg-muted/50">
                          <TableCell className="font-medium">{site.siteName}</TableCell>
                          <TableCell className="font-mono text-sm">{site.siteCode}</TableCell>
                          <TableCell>{site.city}</TableCell>
                          <TableCell className="text-center">
                            <Badge variant="outline">{site.devices.length}</Badge>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center justify-center gap-3">
                              <div className="flex items-center gap-1">
                                <Circle className="h-3 w-3 fill-green-500 text-green-500" />
                                <span className="text-xs font-medium">{upDevicesCount(site.devices)}</span>
                              </div>
                              {downDevicesCount(site.devices) > 0 && (
                                <div className="flex items-center gap-1">
                                  <Circle className="h-3 w-3 fill-red-500 text-red-500" />
                                  <span className="text-xs font-medium">{downDevicesCount(site.devices)}</span>
                                </div>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      </TooltipTrigger>
                      <TooltipContent side="right" className="max-w-md">
                        <div className="p-3">
                          <h4 className="font-semibold mb-3 text-base">{site.siteName} - Devices</h4>
                          <div className="space-y-2.5">
                            {site.devices.map((device) => (
                              <div key={device.serial} className="flex items-center justify-between gap-6 p-2 rounded-md bg-muted/50">
                                <div className="flex-1 min-w-0">
                                  <div className="font-medium text-sm">{device.type}</div>
                                  <div className="text-xs text-muted-foreground font-mono truncate">
                                    SN: {device.serial}
                                  </div>
                                </div>
                                <Badge 
                                  className={device.status === "up" 
                                    ? "bg-green-100 text-green-800 hover:bg-green-100" 
                                    : "bg-red-100 text-red-800 hover:bg-red-100"
                                  }
                                >
                                  <Circle className={`h-2 w-2 mr-1 ${device.status === "up" ? "fill-green-500" : "fill-red-500"}`} />
                                  {device.status.toUpperCase()}
                                </Badge>
                              </div>
                            ))}
                          </div>
                        </div>
                      </TooltipContent>
                    </Tooltip>
                  ))}
                </TooltipProvider>
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
