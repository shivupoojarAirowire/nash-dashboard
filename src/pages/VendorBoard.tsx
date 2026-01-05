import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

export default function VendorBoard() {
  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Vendor Board</CardTitle>
          <CardDescription>Track vendor assignments and progress (coming soon)</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-muted-foreground text-sm">Board view will be added here.</div>
        </CardContent>
      </Card>
    </div>
  );
}
