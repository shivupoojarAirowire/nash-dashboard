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
import { Calendar, IndianRupee, TrendingUp } from "lucide-react";

const subscriptions = [
  { id: 1, store: "Store NYC-01", plan: "Enterprise", startDate: "2024-01-01", monthlyFee: 1299, assets: 45, status: "Active" },
  { id: 2, store: "Store LA-02", plan: "Professional", startDate: "2024-01-05", monthlyFee: 849, assets: 32, status: "Active" },
  { id: 3, store: "Store CHI-03", plan: "Professional", startDate: "2024-01-10", monthlyFee: 849, assets: 28, status: "Pending" },
  { id: 4, store: "Store SF-04", plan: "Enterprise", startDate: "2023-12-15", monthlyFee: 1299, assets: 51, status: "Active" },
  { id: 5, store: "Store MIA-05", plan: "Standard", startDate: "2024-01-08", monthlyFee: 549, assets: 19, status: "Active" },
  { id: 6, store: "Store BOS-06", plan: "Professional", startDate: "2024-01-12", monthlyFee: 849, assets: 38, status: "Active" },
  { id: 7, store: "Store SEA-07", plan: "Enterprise", startDate: "2024-01-03", monthlyFee: 1299, assets: 42, status: "Active" },
  { id: 8, store: "Store DEN-08", plan: "Standard", startDate: "2024-01-15", monthlyFee: 549, assets: 25, status: "Active" },
];

const Subscriptions = () => {
  const totalMRR = subscriptions.reduce((sum, sub) => sum + sub.monthlyFee, 0);
  const activeSubscriptions = subscriptions.filter(s => s.status === "Active").length;

  return (
    <div className="flex flex-col gap-6 p-6">
      <div className="flex items-center justify-between">
        <div className="flex flex-col gap-2">
          <h1 className="text-3xl font-bold text-foreground">Subscriptions</h1>
          <p className="text-muted-foreground">
            Manage NaaS subscription plans for your stores
          </p>
        </div>
        <Button className="bg-gradient-primary">
          <Calendar className="mr-2 h-4 w-4" />
          New Subscription
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card className="shadow-md">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Monthly Revenue</CardTitle>
            <IndianRupee className="h-4 w-4 text-success" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">₹{totalMRR.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">Total MRR</p>
          </CardContent>
        </Card>

        <Card className="shadow-md">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Plans</CardTitle>
            <TrendingUp className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{activeSubscriptions}</div>
            <p className="text-xs text-muted-foreground">Currently active</p>
          </CardContent>
        </Card>

        <Card className="shadow-md">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg. per Store</CardTitle>
            <Calendar className="h-4 w-4 text-accent" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">₹{Math.round(totalMRR / activeSubscriptions)}</div>
            <p className="text-xs text-muted-foreground">Average subscription</p>
          </CardContent>
        </Card>
      </div>

      <Card className="shadow-md">
        <CardHeader>
          <CardTitle>Subscription Overview</CardTitle>
          <CardDescription>View and manage all store subscriptions and billing details</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Store</TableHead>
                <TableHead>Plan</TableHead>
                <TableHead>Start Date</TableHead>
                <TableHead>Assets Covered</TableHead>
                <TableHead>Monthly Fee</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {subscriptions.map((sub) => (
                <TableRow key={sub.id}>
                  <TableCell className="font-medium">{sub.store}</TableCell>
                  <TableCell>
                    <Badge variant="outline">{sub.plan}</Badge>
                  </TableCell>
                  <TableCell>{sub.startDate}</TableCell>
                  <TableCell>{sub.assets} assets</TableCell>
                  <TableCell className="font-semibold">₹{sub.monthlyFee}</TableCell>
                  <TableCell>
                    <Badge variant={sub.status === "Active" ? "default" : "secondary"}>
                      {sub.status}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};

export default Subscriptions;
