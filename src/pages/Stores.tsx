import React, { useEffect, useState } from "react";
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
import { useNavigate } from "react-router-dom";
import { Building2, MapPin, Network } from "lucide-react";
import { getStores, type StoreRow } from "@/integrations/supabase/stores";
import { useToast } from "@/components/ui/use-toast";

const Stores: React.FC = () => {
  const navigate = useNavigate();
  const { toast } = useToast();

  const [stores, setStores] = useState<StoreRow[] | null>(null);

  useEffect(() => {
    const load = async () => {
      try {
        const data = await getStores();
        if (data && data.length) setStores(data as StoreRow[]);
        else setStores([]);
      } catch (e) {
        console.warn("Failed to load stores", e);
        setStores([]);
      }
    };
    load();
  }, []);



  return (
    <div className="flex flex-col gap-6 p-6">
      <div className="flex items-center justify-between">
        <div className="flex flex-col gap-2">
          <h1 className="text-3xl font-bold text-foreground">Stores</h1>
          <p className="text-muted-foreground">Manage your store locations and network assets</p>
        </div>
        <Button className="bg-gradient-primary" onClick={() => navigate('/stores/add')}>
          <Building2 className="mr-2 h-4 w-4" />
          Add Store
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {(stores || []).slice(0, 3).map((store) => (
          <Card key={store.id} className="shadow-md hover:shadow-lg transition-shadow">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Building2 className="h-5 w-5 text-primary" />
                {store.store}
              </CardTitle>
              <CardDescription className="flex items-center gap-1">
                <MapPin className="h-3 w-3" />
                {store.address}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Priority</span>
                  <Badge variant="outline">{store.priority}</Badge>
                </div>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Network className="h-3 w-3" />
                  <span>Site readiness: {store.site_readiness}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="shadow-md">
        <CardHeader>
          <CardTitle>All Stores</CardTitle>
          <CardDescription>Detailed view of all store locations and their network infrastructure</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Store Name</TableHead>
                <TableHead>City</TableHead>
                <TableHead>Store Code</TableHead>
                <TableHead>Address</TableHead>
                <TableHead>POC</TableHead>
                <TableHead>POC No</TableHead>
                <TableHead>Priority</TableHead>
                <TableHead>Site Readiness</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(stores || []).map((store) => (
                <TableRow key={store.id}>
                  <TableCell className="font-medium">{store.store}</TableCell>
                  <TableCell>{store.city}</TableCell>
                  <TableCell className="font-mono text-sm">{store.store_code}</TableCell>
                  <TableCell>{store.address}</TableCell>
                  <TableCell>{store.poc}</TableCell>
                  <TableCell>{store.poc_no}</TableCell>
                  <TableCell>{store.priority}</TableCell>
                  <TableCell>{store.site_readiness}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          {!stores || stores.length === 0 ? (
            <div className="text-sm text-muted-foreground">No stores yet. Use Bulk Upload or Add Store to create entries.</div>
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
};

export default Stores;
