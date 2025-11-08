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
import { FileText, IndianRupee, AlertCircle, Send } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

// Sample invoices data with subscription end dates
const invoices = [
  { id: 1, store: "Store NYC-01", invoiceNumber: "INV-2024-001", amount: 1299, dueDate: "2024-02-01", subscriptionEnd: "2024-02-03", status: "Pending", isPaid: false },
  { id: 2, store: "Store LA-02", invoiceNumber: "INV-2024-002", amount: 849, dueDate: "2024-02-05", subscriptionEnd: "2024-02-07", status: "Paid", isPaid: true },
  { id: 3, store: "Store CHI-03", invoiceNumber: "INV-2024-003", amount: 849, dueDate: "2024-02-10", subscriptionEnd: "2024-02-12", status: "Overdue", isPaid: false },
  { id: 4, store: "Store SF-04", invoiceNumber: "INV-2024-004", amount: 1299, dueDate: "2024-02-15", subscriptionEnd: "2024-02-17", status: "Pending", isPaid: false },
  { id: 5, store: "Store MIA-05", invoiceNumber: "INV-2024-005", amount: 549, dueDate: "2024-02-08", subscriptionEnd: "2024-02-10", status: "Paid", isPaid: true },
  { id: 6, store: "Store BOS-06", invoiceNumber: "INV-2024-006", amount: 849, dueDate: "2024-02-12", subscriptionEnd: "2024-02-14", status: "Pending", isPaid: false },
  { id: 7, store: "Store SEA-07", invoiceNumber: "INV-2024-007", amount: 1299, dueDate: "2024-02-03", subscriptionEnd: "2024-02-05", status: "Pending", isPaid: false },
  { id: 8, store: "Store DEN-08", invoiceNumber: "INV-2024-008", amount: 549, dueDate: "2024-02-15", subscriptionEnd: "2024-02-17", status: "Paid", isPaid: true },
];

const Invoices = () => {
  // Calculate alerts for invoices where subscription ends in 2 days or less
  const today = new Date();
  const twoDaysFromNow = new Date(today);
  twoDaysFromNow.setDate(today.getDate() + 2);

  const upcomingInvoices = invoices.filter(inv => {
    const subEndDate = new Date(inv.subscriptionEnd);
    return !inv.isPaid && subEndDate <= twoDaysFromNow && subEndDate >= today;
  });

  const totalPending = invoices.filter(i => !i.isPaid).reduce((sum, inv) => sum + inv.amount, 0);
  const totalPaid = invoices.filter(i => i.isPaid).reduce((sum, inv) => sum + inv.amount, 0);
  const overdueCount = invoices.filter(i => i.status === "Overdue").length;

  const getStatusColor = (status: string) => {
    switch (status) {
      case "Paid": return "bg-green-100 text-green-800";
      case "Pending": return "bg-yellow-100 text-yellow-800";
      case "Overdue": return "bg-red-100 text-red-800";
      default: return "bg-gray-100 text-gray-800";
    }
  };

  const sendInvoice = (invoiceNumber: string, store: string) => {
    // Placeholder for send invoice functionality
    alert(`Sending invoice ${invoiceNumber} to ${store}`);
  };

  return (
    <div className="flex flex-col gap-6 p-6">
      <div className="flex items-center justify-between">
        <div className="flex flex-col gap-2">
          <h1 className="text-3xl font-bold text-foreground">Invoices</h1>
          <p className="text-muted-foreground">
            Manage and track invoices for store subscriptions
          </p>
        </div>
        <Button className="bg-gradient-primary">
          <FileText className="mr-2 h-4 w-4" />
          Generate Invoice
        </Button>
      </div>

      {/* Alert for upcoming subscription ends */}
      {upcomingInvoices.length > 0 && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Urgent: Subscriptions Ending Soon!</AlertTitle>
          <AlertDescription>
            {upcomingInvoices.length} invoice(s) need to be sent - subscriptions ending within 2 days:
            <ul className="mt-2 ml-4 list-disc">
              {upcomingInvoices.map(inv => (
                <li key={inv.id}>
                  {inv.store} - Invoice {inv.invoiceNumber} (Subscription ends: {inv.subscriptionEnd})
                </li>
              ))}
            </ul>
          </AlertDescription>
        </Alert>
      )}

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card className="shadow-md">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Pending</CardTitle>
            <IndianRupee className="h-4 w-4 text-yellow-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">₹{totalPending.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">Awaiting payment</p>
          </CardContent>
        </Card>

        <Card className="shadow-md">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Paid</CardTitle>
            <IndianRupee className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">₹{totalPaid.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">Successfully collected</p>
          </CardContent>
        </Card>

        <Card className="shadow-md">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Overdue Invoices</CardTitle>
            <AlertCircle className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{overdueCount}</div>
            <p className="text-xs text-muted-foreground">Require immediate action</p>
          </CardContent>
        </Card>
      </div>

      {/* Invoices Table */}
      <Card className="shadow-md">
        <CardHeader>
          <CardTitle>Invoice List</CardTitle>
          <CardDescription>All invoices with payment status and subscription end dates</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Invoice Number</TableHead>
                <TableHead>Store</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Due Date</TableHead>
                <TableHead>Subscription Ends</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {invoices.map((inv) => {
                const subEndDate = new Date(inv.subscriptionEnd);
                const daysUntilEnd = Math.ceil((subEndDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
                const needsAlert = !inv.isPaid && daysUntilEnd <= 2 && daysUntilEnd >= 0;

                return (
                  <TableRow key={inv.id} className={needsAlert ? 'bg-red-50' : ''}>
                    <TableCell className="font-medium">{inv.invoiceNumber}</TableCell>
                    <TableCell>{inv.store}</TableCell>
                    <TableCell className="font-semibold">₹{inv.amount.toLocaleString()}</TableCell>
                    <TableCell>{inv.dueDate}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {inv.subscriptionEnd}
                        {needsAlert && (
                          <span title="Subscription ending soon!">
                            <AlertCircle className="h-4 w-4 text-red-600" />
                          </span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge className={getStatusColor(inv.status)}>
                        {inv.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {!inv.isPaid && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => sendInvoice(inv.invoiceNumber, inv.store)}
                        >
                          <Send className="h-4 w-4 mr-1" />
                          Send
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};

export default Invoices;
