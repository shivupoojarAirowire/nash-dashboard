import { useEffect, useState } from "react";
import { useFeatureFlags } from '@/hooks/useFeatureFlags';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Package, Truck, CheckCircle2, Clock } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { getDeliveries, updateDelivery } from "@/integrations/supabase/deliveries";

type DeviceDelivery = {
  id: number;
  store: string;
  deviceType: "Firewall" | "Switch" | "AP";
  quantity: number;
  deliveryDate: string;
  status: "Delivered" | "In Transit" | "Pending";
  trackingNumber: string;
  dbId?: string; // optional UUID from DB
};

const deviceDeliveriesInitial: DeviceDelivery[] = [
  { id: 101, store: "Store NYC-01", deviceType: "Firewall", quantity: 1, deliveryDate: "2024-01-15", status: "Delivered", trackingNumber: "FW-TRK-001" },
  { id: 102, store: "Store NYC-01", deviceType: "Switch", quantity: 2, deliveryDate: "2024-01-15", status: "Delivered", trackingNumber: "SW-TRK-002" },
  { id: 103, store: "Store NYC-01", deviceType: "AP", quantity: 4, deliveryDate: "2024-01-15", status: "Delivered", trackingNumber: "AP-TRK-003" },
  { id: 104, store: "Store CHI-03", deviceType: "Firewall", quantity: 1, deliveryDate: "2024-02-01", status: "In Transit", trackingNumber: "FW-TRK-004" },
  { id: 105, store: "Store CHI-03", deviceType: "Switch", quantity: 1, deliveryDate: "2024-02-01", status: "In Transit", trackingNumber: "SW-TRK-005" },
  { id: 106, store: "Store LA-02", deviceType: "AP", quantity: 3, deliveryDate: "2024-01-18", status: "Delivered", trackingNumber: "AP-TRK-006" },
];

const useDeviceDeliveries = () => {
  const [deviceDeliveries, setDeviceDeliveries] = useState<DeviceDelivery[]>(deviceDeliveriesInitial);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    getDeliveries()
      .then((rows) => {
        if (!mounted || !rows) return;
        const mapped = rows.map((r) => ({
          id: Math.floor(Math.random() * 1000000),
          store: r.store,
          deviceType: r.device_type as DeviceDelivery["deviceType"],
          quantity: r.quantity,
          deliveryDate: r.delivery_date ? new Date(r.delivery_date).toISOString().slice(0, 10) : "",
          status: r.status,
          trackingNumber: r.tracking_number || "",
          dbId: r.id,
        }));
        if (mapped.length > 0) setDeviceDeliveries(mapped);
      })
      .catch(() => {
        // fallback to local data
      })
      .finally(() => setLoading(false));

    return () => {
      mounted = false;
    };
  }, []);

  const setStatus = async (id: number, status: DeviceDelivery["status"]) => {
    setDeviceDeliveries((prev) => prev.map((d) => (d.id === id ? { ...d, status } : d)));
    const found = deviceDeliveries.find((d) => d.id === id);
    try {
      if (found?.dbId) {
        await updateDelivery(found.dbId, { status });
      }
    } catch {
      // ignore persistence errors
    }
  };

  return { deviceDeliveries, loading, setStatus };
};

const inventory = [
  { id: 1, store: "Store NYC-01", items: 15, deliveryDate: "2024-01-15", status: "Delivered", trackingNumber: "TRK001234" },
  { id: 2, store: "Store LA-02", items: 8, deliveryDate: "2024-01-18", status: "Delivered", trackingNumber: "TRK001235" },
  { id: 3, store: "Store CHI-03", items: 12, deliveryDate: "2024-02-01", status: "In Transit", trackingNumber: "TRK001236" },
  { id: 4, store: "Store SF-04", items: 20, deliveryDate: "2024-01-10", status: "Delivered", trackingNumber: "TRK001237" },
  { id: 5, store: "Store MIA-05", items: 6, deliveryDate: "2024-01-25", status: "Delivered", trackingNumber: "TRK001238" },
  { id: 6, store: "Store BOS-06", items: 10, deliveryDate: "2024-02-05", status: "Pending", trackingNumber: "TRK001239" },
  { id: 7, store: "Store SEA-07", items: 14, deliveryDate: "2024-01-28", status: "In Transit", trackingNumber: "TRK001240" },
  { id: 8, store: "Store DEN-08", items: 9, deliveryDate: "2024-02-10", status: "Pending", trackingNumber: "TRK001241" },
];

const getStatusIcon = (status: string) => {
  switch (status) {
    case "Delivered":
      return <CheckCircle2 className="h-4 w-4 text-success" />;
    case "In Transit":
      return <Truck className="h-4 w-4 text-accent" />;
    case "Pending":
      return <Clock className="h-4 w-4 text-warning" />;
    default:
      return null;
  }
};

const getStatusVariant = (status: string): "default" | "secondary" | "destructive" | "outline" => {
  switch (status) {
    case "Delivered":
      return "default";
    case "In Transit":
      return "secondary";
    case "Pending":
      return "outline";
    default:
      return "secondary";
  }
};

const Inventory = () => {
  const { has, loading } = useFeatureFlags();
  const navigate = useNavigate();
  useEffect(() => {
    if (!loading) {
      if (!has('Inventory') && !has('Delivery')) {
        navigate('/');
      }
    }
  }, [loading, has, navigate]);

  if (!loading && !has('Inventory') && !has('Delivery')) {
    return (
      <div className="p-6">
        <Card>
          <CardHeader>
            <CardTitle>Access Restricted</CardTitle>
            <CardDescription>The Inventory/Delivery features are disabled for your account.</CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }
  const deliveredCount = inventory.filter((i) => i.status === "Delivered").length;
  const inTransitCount = inventory.filter((i) => i.status === "In Transit").length;
  const pendingCount = inventory.filter((i) => i.status === "Pending").length;
  const { deviceDeliveries, loading: deviceLoading, setStatus } = useDeviceDeliveries();

  return (
    <div className="flex flex-col gap-6 p-6">
      <Tabs defaultValue="deliveries" className="space-y-4">
        <TabsList>
          <TabsTrigger value="deliveries">Deliveries</TabsTrigger>
          <TabsTrigger value="inventory">Inventory</TabsTrigger>
        </TabsList>

        {/* Deliveries Tab */}
        <TabsContent value="deliveries">
          <div className="flex items-center justify-between">
            <div className="flex flex-col gap-2">
              <h1 className="text-3xl font-bold text-foreground">Deliveries</h1>
              <p className="text-muted-foreground">Track equipment deliveries and device shipments to your stores</p>
            </div>
            <Button className="bg-gradient-primary">
              <Package className="mr-2 h-4 w-4" />
              New Delivery
            </Button>
          </div>

          {/* Summary Cards */}
          <div className="grid gap-4 md:grid-cols-3 mt-4">
            <Card className="shadow-md">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Delivered</CardTitle>
                <CheckCircle2 className="h-4 w-4 text-success" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{deliveredCount}</div>
                <p className="text-xs text-muted-foreground">Completed deliveries</p>
              </CardContent>
            </Card>

            <Card className="shadow-md">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">In Transit</CardTitle>
                <Truck className="h-4 w-4 text-accent" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{inTransitCount}</div>
                <p className="text-xs text-muted-foreground">On the way</p>
              </CardContent>
            </Card>

            <Card className="shadow-md">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Pending</CardTitle>
                <Clock className="h-4 w-4 text-warning" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{pendingCount}</div>
                <p className="text-xs text-muted-foreground">Awaiting shipment</p>
              </CardContent>
            </Card>
          </div>

          {/* Delivery Tracking Table */}
          <Card className="shadow-md mt-4">
            <CardHeader>
              <CardTitle>Delivery Tracking</CardTitle>
              <CardDescription>Monitor all inventory deliveries across your stores</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Store</TableHead>
                    <TableHead>Items</TableHead>
                    <TableHead>Delivery Date</TableHead>
                    <TableHead>Tracking Number</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {inventory.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell className="font-medium">{item.store}</TableCell>
                      <TableCell>{item.items} items</TableCell>
                      <TableCell>{item.deliveryDate}</TableCell>
                      <TableCell className="font-mono text-sm">{item.trackingNumber}</TableCell>
                      <TableCell>
                        <Badge variant={getStatusVariant(item.status)} className="flex items-center gap-1 w-fit">
                          {getStatusIcon(item.status)}
                          {item.status}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          {/* Device Deliveries */}
          <Card className="shadow-md mt-4">
            <CardHeader>
              <CardTitle>Device Deliveries</CardTitle>
              <CardDescription>Per-device delivery status (Firewall, Switch, AP)</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Store</TableHead>
                    <TableHead>Device</TableHead>
                    <TableHead>Qty</TableHead>
                    <TableHead>Delivery Date</TableHead>
                    <TableHead>Tracking</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {deviceDeliveries.map((d) => (
                    <TableRow key={d.id}>
                      <TableCell className="font-medium">{d.store}</TableCell>
                      <TableCell>{d.deviceType}</TableCell>
                      <TableCell>{d.quantity}</TableCell>
                      <TableCell>{d.deliveryDate}</TableCell>
                      <TableCell className="font-mono text-sm">{d.trackingNumber}</TableCell>
                      <TableCell>
                        <Badge variant={getStatusVariant(d.status)} className="flex items-center gap-1 w-fit">
                          {getStatusIcon(d.status)}
                          {d.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <Button size="sm" onClick={() => setStatus(d.id, "In Transit")}>Mark In Transit</Button>
                          <Button size="sm" onClick={() => setStatus(d.id, "Delivered")}>Mark Delivered</Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Inventory Tab */}
        <TabsContent value="inventory">
          <Card className="shadow-md">
            <CardHeader>
              <CardTitle>Inventory</CardTitle>
              <CardDescription>Current stock summary per store</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Store</TableHead>
                    <TableHead>Items</TableHead>
                    <TableHead>Delivery Date</TableHead>
                    <TableHead>Tracking</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {inventory.map((item) => (
                    <TableRow key={`inv-${item.id}`}>
                      <TableCell className="font-medium">{item.store}</TableCell>
                      <TableCell>{item.items}</TableCell>
                      <TableCell>{item.deliveryDate}</TableCell>
                      <TableCell className="font-mono text-sm">{item.trackingNumber}</TableCell>
                      <TableCell>
                        <Badge variant={getStatusVariant(item.status)} className="flex items-center gap-1 w-fit">
                          {getStatusIcon(item.status)}
                          {item.status}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Inventory;
