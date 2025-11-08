import { MetricCard } from "@/components/MetricCard";
import { Building2, Network, Package, TrendingUp } from "lucide-react";
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

// Mock data
const recentStores = [
  { id: 1, name: "Store NYC-01", assets: 45, status: "Active", delivery: "2024-01-15" },
  { id: 2, name: "Store LA-02", assets: 32, status: "Active", delivery: "2024-01-18" },
  { id: 3, name: "Store CHI-03", assets: 28, status: "Pending", delivery: "2024-02-01" },
  { id: 4, name: "Store SF-04", assets: 51, status: "Active", delivery: "2024-01-10" },
  { id: 5, name: "Store MIA-05", assets: 19, status: "Active", delivery: "2024-01-25" },
];

const Dashboard = () => {
  return (
    <div className="flex flex-col gap-6 p-6">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold text-foreground">Dashboard</h1>
        <p className="text-muted-foreground">
          Overview of your network infrastructure and services
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <MetricCard
          title="Total Stores"
          value={24}
          icon={Building2}
          description="Active locations"
          trend={{ value: 12, isPositive: true }}
        />
        <MetricCard
          title="Network Assets"
          value={412}
          icon={Network}
          description="Deployed devices"
          trend={{ value: 8, isPositive: true }}
        />
        <MetricCard
          title="Pending Deliveries"
          value={7}
          icon={Package}
          description="Awaiting deployment"
        />
        <MetricCard
          title="Active Subscriptions"
          value={24}
          icon={TrendingUp}
          description="Monthly recurring"
          trend={{ value: 5, isPositive: true }}
        />
      </div>

      <Card className="shadow-md">
        <CardHeader>
          <CardTitle>Recent Stores</CardTitle>
          <CardDescription>Overview of recently added stores and their network assets</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Store Name</TableHead>
                <TableHead>Network Assets</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Delivery Date</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {recentStores.map((store) => (
                <TableRow key={store.id}>
                  <TableCell className="font-medium">{store.name}</TableCell>
                  <TableCell>{store.assets}</TableCell>
                  <TableCell>
                    <Badge variant={store.status === "Active" ? "default" : "secondary"}>
                      {store.status}
                    </Badge>
                  </TableCell>
                  <TableCell>{store.delivery}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};

export default Dashboard;
