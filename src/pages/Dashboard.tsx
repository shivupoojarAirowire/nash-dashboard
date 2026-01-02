import { MetricCard } from "@/components/MetricCard";
import { Building2, Network, Package, TrendingUp, Activity, Wifi, CheckCircle2 } from "lucide-react";
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
import { SidebarTrigger } from "@/components/ui/sidebar";
import { supabase } from "@/integrations/supabase/client";
import { useEffect, useState } from "react";
import { BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

const Dashboard = () => {
  const [storesCount, setStoresCount] = useState(0);
  const [inventoryStats, setInventoryStats] = useState({
    total: 0,
    routers: 0,
    switches: 0,
    firewalls: 0,
    accessPoints: 0,
  });
  const [recentStores, setRecentStores] = useState<any[]>([]);

  // Fetch stores count
  useEffect(() => {
    (async () => {
      const { count } = await supabase
        .from('stores')
        .select('*', { count: 'exact', head: true });
      setStoresCount(count || 0);
    })();
  }, []);

  // Fetch inventory stats using count instead of fetching all data
  useEffect(() => {
    (async () => {
      // Get total count
      const { count: totalCount } = await supabase
        .from('inventory')
        .select('*', { count: 'exact', head: true });
      
      // Get count for each type
      const { count: routerCount } = await supabase
        .from('inventory')
        .select('*', { count: 'exact', head: true })
        .eq('type', 'Router');
      
      const { count: switchCount } = await supabase
        .from('inventory')
        .select('*', { count: 'exact', head: true })
        .eq('type', 'Switch');
      
      const { count: firewallCount } = await supabase
        .from('inventory')
        .select('*', { count: 'exact', head: true })
        .eq('type', 'Firewall');
      
      const { count: apCount } = await supabase
        .from('inventory')
        .select('*', { count: 'exact', head: true })
        .eq('type', 'Access Point');
      
      const stats = {
        total: totalCount || 0,
        routers: routerCount || 0,
        switches: switchCount || 0,
        firewalls: firewallCount || 0,
        accessPoints: apCount || 0,
      };
      
      console.log('Dashboard stats (using count):', stats);
      setInventoryStats(stats);
    })();
  }, []);

  // Fetch recent stores with asset counts
  useEffect(() => {
    (async () => {
      const { data: stores } = await supabase
        .from('stores')
        .select('store_code, store, city, created_at')
        .order('created_at', { ascending: false })
        .limit(5);
      
      if (stores) {
        // Get inventory counts for each store
        const storesWithAssets = await Promise.all(
          stores.map(async (store) => {
            const { count } = await supabase
              .from('inventory')
              .select('*', { count: 'exact', head: true })
              .eq('store_code', store.store_code);
            
            return {
              id: store.store_code,
              name: `${store.store} - ${store.city}`,
              assets: count || 0,
              status: 'Active',
              delivery: store.created_at ? new Date(store.created_at).toISOString().split('T')[0] : '-',
            };
          })
        );
        setRecentStores(storesWithAssets);
      }
    })();
  }, []);
  // Project metrics data with refined colors
  const siteData = [
    { name: 'Existing', value: 72, fill: '#10b981' },
    { name: 'New', value: 13, fill: '#6366f1' },
  ];

  const devicesData = [
    { name: 'Existing', value: 278, fill: '#10b981' },
    { name: 'New', value: 21, fill: '#6366f1' },
  ];

  const ispConfigData = [
    { name: 'Single ISP', sites: 37, fill: '#8b5cf6' },
    { name: 'Dual ISP', sites: 21, fill: '#06b6d4' },
    { name: 'Zepto ISP', sites: 17, fill: '#f59e0b' },
  ];

  const ispDeliveryData = [
    { name: 'ISP 1', delivered: 163, fill: '#6366f1' },
    { name: 'ISP 2', delivered: 55, fill: '#8b5cf6' },
  ];

  const passiveActiveData = [
    { category: 'Passive Only', count: 36, fill: '#f59e0b' },
    { category: 'Passive & Active', count: 85, fill: '#10b981' },
  ];

  const renderCustomLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent, value }: any) => {
    const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
    const x = cx + radius * Math.cos(-midAngle * Math.PI / 180);
    const y = cy + radius * Math.sin(-midAngle * Math.PI / 180);

    return (
      <text 
        x={x} 
        y={y} 
        fill="white" 
        textAnchor="middle" 
        dominantBaseline="middle"
        className="font-bold text-base"
        style={{ pointerEvents: 'none' }}
      >
        {`${value}`}
      </text>
    );
  };

  return (
    <div className="flex flex-col gap-6 p-6">
      <div className="flex items-center gap-4">
        <SidebarTrigger className="h-8 w-8" />
        <div className="flex flex-col gap-2">
          <h1 className="text-3xl font-bold text-foreground">Dashboard</h1>
          <p className="text-muted-foreground">
            Overview of your network infrastructure and services
          </p>
        </div>
      </div>

      {/* Key Metrics Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <MetricCard
          title="Sites Up (FMG)"
          value={85}
          icon={Building2}
          description="72 existing + 13 new"
        />
        <MetricCard
          title="Devices Delivered"
          value={299}
          icon={Package}
          description="278 existing + 21 new"
        />
        <MetricCard
          title="Passive Completed"
          value={121}
          icon={Activity}
          description="Infrastructure ready"
        />
        <MetricCard
          title="ISP Delivered"
          value={218}
          icon={Wifi}
          description="163 + 55 (20 dropped)"
        />
      </div>

      {/* Charts Section - 3 columns for better layout */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {/* Sites Breakdown */}
        <Card className="shadow-sm hover:shadow-md transition-shadow">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg">Sites Distribution</CardTitle>
            <CardDescription className="text-xs">Total: 85 sites in FMG</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={240}>
              <PieChart>
                <Pie
                  data={siteData}
                  cx="50%"
                  cy="45%"
                  innerRadius={45}
                  outerRadius={85}
                  paddingAngle={3}
                  dataKey="value"
                  label={renderCustomLabel}
                  labelLine={false}
                >
                  {siteData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.fill} stroke="white" strokeWidth={2} />
                  ))}
                </Pie>
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: 'rgba(255, 255, 255, 0.95)', 
                    border: '1px solid #e5e7eb',
                    borderRadius: '8px',
                    padding: '8px 12px',
                    fontSize: '13px'
                  }}
                />
                <Legend 
                  verticalAlign="bottom" 
                  height={40}
                  iconType="circle"
                  wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }}
                  formatter={(value, entry: any) => `${entry.payload.name}: ${entry.payload.value}`}
                />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Devices Breakdown */}
        <Card className="shadow-sm hover:shadow-md transition-shadow">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg">Devices Overview</CardTitle>
            <CardDescription className="text-xs">Total: 299 devices delivered</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={240}>
              <PieChart>
                <Pie
                  data={devicesData}
                  cx="50%"
                  cy="45%"
                  innerRadius={45}
                  outerRadius={85}
                  paddingAngle={3}
                  dataKey="value"
                  label={renderCustomLabel}
                  labelLine={false}
                >
                  {devicesData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.fill} stroke="white" strokeWidth={2} />
                  ))}
                </Pie>
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: 'rgba(255, 255, 255, 0.95)', 
                    border: '1px solid #e5e7eb',
                    borderRadius: '8px',
                    padding: '8px 12px',
                    fontSize: '13px'
                  }}
                />
                <Legend 
                  verticalAlign="bottom" 
                  height={40}
                  iconType="circle"
                  wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }}
                  formatter={(value, entry: any) => `${entry.payload.name}: ${entry.payload.value}`}
                />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Passive & Active Completion */}
        <Card className="shadow-sm hover:shadow-md transition-shadow">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg">Completion Status</CardTitle>
            <CardDescription className="text-xs">Passive: 121 | Active: 85</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={passiveActiveData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis 
                  dataKey="category" 
                  tick={{ fontSize: 11 }}
                  angle={-15}
                  textAnchor="end"
                  height={60}
                />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: 'rgba(255, 255, 255, 0.95)', 
                    border: '1px solid #e5e7eb',
                    borderRadius: '8px',
                    padding: '8px 12px'
                  }}
                  cursor={{ fill: 'rgba(0, 0, 0, 0.05)' }}
                />
                <Bar dataKey="count" radius={[6, 6, 0, 0]} maxBarSize={60}>
                  {passiveActiveData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.fill} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* ISP Configuration */}
        <Card className="shadow-sm hover:shadow-md transition-shadow">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg">ISP Configuration</CardTitle>
            <CardDescription className="text-xs">Total: 75 sites configured</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={ispConfigData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis 
                  dataKey="name" 
                  tick={{ fontSize: 11 }}
                  angle={-15}
                  textAnchor="end"
                  height={60}
                />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: 'rgba(255, 255, 255, 0.95)', 
                    border: '1px solid #e5e7eb',
                    borderRadius: '8px',
                    padding: '8px 12px'
                  }}
                  cursor={{ fill: 'rgba(0, 0, 0, 0.05)' }}
                />
                <Bar dataKey="sites" radius={[6, 6, 0, 0]} maxBarSize={60}>
                  {ispConfigData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.fill} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* ISP Delivery */}
        <Card className="shadow-sm hover:shadow-md transition-shadow lg:col-span-2">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg">ISP Delivery Status</CardTitle>
            <CardDescription className="text-xs">Total: 218 delivered (20 sites dropped - CISCO setup)</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={ispDeliveryData} margin={{ top: 10, right: 20, left: 10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: 'rgba(255, 255, 255, 0.95)', 
                    border: '1px solid #e5e7eb',
                    borderRadius: '8px',
                    padding: '8px 12px'
                  }}
                  cursor={{ fill: 'rgba(0, 0, 0, 0.05)' }}
                />
                <Legend />
                <Bar dataKey="delivered" radius={[6, 6, 0, 0]} maxBarSize={80}>
                  {ispDeliveryData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.fill} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Recent Stores Table */}
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
