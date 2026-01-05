import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

export default function VendorsOverview() {
  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Vendors Overview</CardTitle>
          <CardDescription>High-level view of vendors and tasks (coming soon)</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-muted-foreground text-sm">Overview dashboard will be added here.</div>
        </CardContent>
      </Card>
    </div>
  );
}
