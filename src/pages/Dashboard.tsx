import { MetricCard } from "@/components/MetricCard";
import { Building2, Network, Package, TrendingUp, Activity, Wifi, CheckCircle2, Map } from "lucide-react";
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
  const [userDepartment, setUserDepartment] = useState<string | null>(null);
  const [storesCount, setStoresCount] = useState(0);
  const [inventoryStats, setInventoryStats] = useState({
    total: 0,
    routers: 0,
    switches: 0,
    firewalls: 0,
    accessPoints: 0,
  });
  const [recentStores, setRecentStores] = useState<any[]>([]);
  const [heatmapStats, setHeatmapStats] = useState({
    total: 0,
    completed: 0,
    pending: 0,
    inProgress: 0,
  });
  const [deviceConfigStats, setDeviceConfigStats] = useState({
    total: 0,
    configured: 0,
    pending: 0,
  });

  // Fetch current user's department
  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('department')
          .eq('id', user.id)
          .single();
        
        setUserDepartment(profile?.department || null);
      }
    })();
  }, []);

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

  // Fetch heatmap stats for Engineering users
  useEffect(() => {
    if (userDepartment !== 'Engineering') return;
    
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Get total assignments for this user
      const { count: totalCount } = await supabase
        .from('site_assignments')
        .select('*', { count: 'exact', head: true })
        .eq('assigned_to', user.id);

      // Get completed
      const { count: completedCount } = await supabase
        .from('site_assignments')
        .select('*', { count: 'exact', head: true })
        .eq('assigned_to', user.id)
        .eq('status', 'Done');

      // Get in progress
      const { count: inProgressCount } = await supabase
        .from('site_assignments')
        .select('*', { count: 'exact', head: true })
        .eq('assigned_to', user.id)
        .eq('status', 'In Progress');

      // Get pending
      const { count: pendingCount } = await supabase
        .from('site_assignments')
        .select('*', { count: 'exact', head: true })
        .eq('assigned_to', user.id)
        .eq('status', 'Pending');

      setHeatmapStats({
        total: totalCount || 0,
        completed: completedCount || 0,
        inProgress: inProgressCount || 0,
        pending: pendingCount || 0,
      });
    })();
  }, [userDepartment]);

  // Fetch device configuration stats for Engineering users
  useEffect(() => {
    if (userDepartment !== 'Engineering') return;
    
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Get all assignments for this user
      const { data: assignments } = await supabase
        .from('site_assignments')
        .select('device_config')
        .eq('assigned_to', user.id);

      if (!assignments) {
        setDeviceConfigStats({ total: 0, configured: 0, pending: 0 });
        return;
      }

      const total = assignments.length;
      // Count assignments with device_config populated (not null and not empty)
      const configured = assignments.filter(
        (a) => a.device_config && Object.keys(a.device_config).length > 0
      ).length;

      setDeviceConfigStats({
        total,
        configured,
        pending: total - configured,
      });
    })();
  }, [userDepartment]);

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

  // Engineering Dashboard
  if (userDepartment === 'Engineering') {
    const heatmapChartData = [
      { name: 'Completed', value: heatmapStats.completed, fill: '#10b981' },
      { name: 'In Progress', value: heatmapStats.inProgress, fill: '#f59e0b' },
      { name: 'Pending', value: heatmapStats.pending, fill: '#ef4444' },
    ];

    const deviceConfigChartData = [
      { name: 'Configured', value: deviceConfigStats.configured, fill: '#10b981' },
      { name: 'Pending', value: deviceConfigStats.pending, fill: '#ef4444' },
    ];

    return (
      <div className="flex flex-col gap-6 p-6">
        <div className="flex items-center gap-4">
          <SidebarTrigger className="h-8 w-8" />
          <div className="flex flex-col gap-2">
            <h1 className="text-3xl font-bold text-foreground">Engineering Dashboard</h1>
            <p className="text-muted-foreground">
              Your heatmap assignments and device configurations
            </p>
          </div>
        </div>

        {/* Engineering Metrics */}
        <div className="grid gap-4 md:grid-cols-2">
          <MetricCard
            title="Total Heatmap Assignments"
            value={heatmapStats.total.toString()}
            icon={Map}
            description={`${heatmapStats.completed} completed`}
          />
          <MetricCard
            title="Device Configurations"
            value={deviceConfigStats.total.toString()}
            icon={Network}
            description={`${deviceConfigStats.configured} configured`}
          />
        </div>

        {/* Charts */}
        <div className="grid gap-4 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Heatmap Status</CardTitle>
              <CardDescription>Distribution of your heatmap assignments by status</CardDescription>
            </CardHeader>
            <CardContent className="flex justify-center">
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={heatmapChartData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={renderCustomLabel}
                    outerRadius={100}
                    dataKey="value"
                  >
                    {heatmapChartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.fill} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Device Configuration Status</CardTitle>
              <CardDescription>Configuration progress for assigned devices</CardDescription>
            </CardHeader>
            <CardContent className="flex justify-center">
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={deviceConfigChartData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={renderCustomLabel}
                    outerRadius={100}
                    dataKey="value"
                  >
                    {deviceConfigChartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.fill} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // Default Dashboard for non-Engineering users
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
