import { useState, useEffect } from "react";
import { useFeatureFlags } from '@/hooks/useFeatureFlags';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { LayoutDashboard, CheckCircle2, Clock, Send, Package, Truck } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { getInventory } from "@/integrations/supabase/inventory";

type ProjectStatus = 'Heatmap Received' | 'Sent to Engineer' | 'Device Allocated' | 'Configuration Complete' | 'Labeling Done' | 'Ready for Shipping';

type Project = {
  id: string;
  city: string;
  store_code: string;
  store_name: string;
  assignedEngineer: string;
  status: ProjectStatus;
  devicesAllocated: number;
  createdAt: string;
  deadline?: string;
  siteAssignmentStatus: string;
};

export default function ProjectManagementDashboard() {
  const { has, loading } = useFeatureFlags();
  const navigate = useNavigate();

  const [projects, setProjects] = useState<Project[]>([]);
  const [loadingProjects, setLoadingProjects] = useState(true);
  const [stats, setStats] = useState({
    heatmapReceived: 0,
    sentToEngineer: 0,
    deviceAllocated: 0,
    configurationComplete: 0,
    labelingDone: 0,
    readyForShipping: 0
  });

  useEffect(() => {
    if (!loading && !has('Project Manager')) {
      navigate('/');
    }
  }, [loading, has, navigate]);

  useEffect(() => {
    loadProjects();
  }, []);

  const getProjectStatus = (siteStatus: string, devicesCount: number): ProjectStatus => {
    if (siteStatus === 'Pending') return 'Heatmap Received';
    if (siteStatus === 'In Progress') return 'Sent to Engineer';
    if (siteStatus === 'Done' && devicesCount === 0) return 'Device Allocated';
    if (siteStatus === 'Done' && devicesCount > 0) return 'Configuration Complete';
    // For now, we'll use device count as proxy for later stages
    // You can add more fields to site_assignments table for labeling_done, shipping_ready flags
    return 'Device Allocated';
  };

  const loadProjects = async () => {
    try {
      setLoadingProjects(true);

      // Load site assignments
      const { data: assignments, error: assignError } = await supabase
        .from('site_assignments')
        .select('id, city, store_id, store_code, assigned_to, status, deadline_at, created_at')
        .order('created_at', { ascending: false });

      if (assignError) throw assignError;

      // Load stores
      const storeIds = Array.from(new Set((assignments || []).map((a: any) => a.store_id)));
      const { data: stores, error: storesError } = await supabase
        .from('stores')
        .select('id, store')
        .in('id', storeIds);

      if (storesError) throw storesError;

      const storeMap: Record<string, string> = {};
      (stores || []).forEach((s: any) => {
        storeMap[s.id] = s.store;
      });

      // Load engineers
      const engineerIds = Array.from(new Set((assignments || []).map((a: any) => a.assigned_to).filter(Boolean)));
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('id, email, full_name')
        .in('id', engineerIds);

      if (profilesError) throw profilesError;

      const engineerMap: Record<string, string> = {};
      (profiles || []).forEach((p: any) => {
        engineerMap[p.id] = p.full_name || p.email;
      });

      // Load inventory to count allocated devices
      const inventory = await getInventory();

      // Build projects list
      const projectsList: Project[] = (assignments || []).map((a: any) => {
        const allocatedDevices = (inventory || []).filter((i: any) => 
          i.site === a.store_code && i.in_use
        ).length;

        const status = getProjectStatus(a.status, allocatedDevices);

        return {
          id: a.id,
          city: a.city,
          store_code: a.store_code,
          store_name: storeMap[a.store_id] || '-',
          assignedEngineer: engineerMap[a.assigned_to] || '-',
          status,
          devicesAllocated: allocatedDevices,
          createdAt: a.created_at,
          deadline: a.deadline_at,
          siteAssignmentStatus: a.status
        };
      });

      setProjects(projectsList);

      // Calculate stats
      const newStats = {
        heatmapReceived: projectsList.filter(p => p.status === 'Heatmap Received').length,
        sentToEngineer: projectsList.filter(p => p.status === 'Sent to Engineer').length,
        deviceAllocated: projectsList.filter(p => p.status === 'Device Allocated').length,
        configurationComplete: projectsList.filter(p => p.status === 'Configuration Complete').length,
        labelingDone: projectsList.filter(p => p.status === 'Labeling Done').length,
        readyForShipping: projectsList.filter(p => p.status === 'Ready for Shipping').length
      };
      setStats(newStats);

    } catch (e) {
      console.error('loadProjects error', e);
    } finally {
      setLoadingProjects(false);
    }
  };

  const getStatusIcon = (status: ProjectStatus) => {
    switch (status) {
      case 'Heatmap Received': return <Clock className="h-4 w-4" />;
      case 'Sent to Engineer': return <Send className="h-4 w-4" />;
      case 'Device Allocated': return <Package className="h-4 w-4" />;
      case 'Configuration Complete': return <CheckCircle2 className="h-4 w-4" />;
      case 'Labeling Done': return <CheckCircle2 className="h-4 w-4" />;
      case 'Ready for Shipping': return <Truck className="h-4 w-4" />;
    }
  };

  const getStatusColor = (status: ProjectStatus) => {
    switch (status) {
      case 'Heatmap Received': return 'bg-gray-100 text-gray-800';
      case 'Sent to Engineer': return 'bg-blue-100 text-blue-800';
      case 'Device Allocated': return 'bg-yellow-100 text-yellow-800';
      case 'Configuration Complete': return 'bg-green-100 text-green-800';
      case 'Labeling Done': return 'bg-purple-100 text-purple-800';
      case 'Ready for Shipping': return 'bg-emerald-100 text-emerald-800';
    }
  };

  if (!loading && !has('Project Manager')) {
    return (
      <div className="p-6">
        <Card>
          <CardHeader>
            <CardTitle>Access Restricted</CardTitle>
            <CardDescription>The Project Manager feature is disabled for your account.</CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <LayoutDashboard className="h-8 w-8" />
          Project Management Dashboard
        </h1>
        <p className="text-muted-foreground mt-2">Track all store projects through the implementation pipeline</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        <Card className="p-4">
          <div className="flex items-center gap-2 text-gray-600 mb-1">
            <Clock className="h-4 w-4" />
            <span className="text-xs font-medium">Heatmap Received</span>
          </div>
          <div className="text-2xl font-bold">{stats.heatmapReceived}</div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center gap-2 text-blue-600 mb-1">
            <Send className="h-4 w-4" />
            <span className="text-xs font-medium">Sent to Engineer</span>
          </div>
          <div className="text-2xl font-bold">{stats.sentToEngineer}</div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center gap-2 text-yellow-600 mb-1">
            <Package className="h-4 w-4" />
            <span className="text-xs font-medium">Device Allocated</span>
          </div>
          <div className="text-2xl font-bold">{stats.deviceAllocated}</div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center gap-2 text-green-600 mb-1">
            <CheckCircle2 className="h-4 w-4" />
            <span className="text-xs font-medium">Config Complete</span>
          </div>
          <div className="text-2xl font-bold">{stats.configurationComplete}</div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center gap-2 text-purple-600 mb-1">
            <CheckCircle2 className="h-4 w-4" />
            <span className="text-xs font-medium">Labeling Done</span>
          </div>
          <div className="text-2xl font-bold">{stats.labelingDone}</div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center gap-2 text-emerald-600 mb-1">
            <Truck className="h-4 w-4" />
            <span className="text-xs font-medium">Ready to Ship</span>
          </div>
          <div className="text-2xl font-bold">{stats.readyForShipping}</div>
        </Card>
      </div>

      {/* Projects Table */}
      <Card>
        <CardHeader>
          <CardTitle>All Store Projects</CardTitle>
          <CardDescription>Complete overview of all projects and their current status</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>City</TableHead>
                  <TableHead>Store</TableHead>
                  <TableHead>Store Code</TableHead>
                  <TableHead>Engineer</TableHead>
                  <TableHead>Devices</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Deadline</TableHead>
                  <TableHead>Created</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loadingProjects ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center text-muted-foreground">
                      Loading projects...
                    </TableCell>
                  </TableRow>
                ) : projects.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center text-muted-foreground">
                      No projects found
                    </TableCell>
                  </TableRow>
                ) : (
                  projects.map((project) => {
                    const isOverdue = project.deadline && new Date(project.deadline) < new Date() 
                      && project.status !== 'Ready for Shipping';
                    return (
                      <TableRow key={project.id}>
                        <TableCell className="font-medium">{project.city}</TableCell>
                        <TableCell className="max-w-[200px] truncate">{project.store_name}</TableCell>
                        <TableCell>{project.store_code}</TableCell>
                        <TableCell>{project.assignedEngineer}</TableCell>
                        <TableCell>
                          {project.devicesAllocated > 0 ? (
                            <Badge variant="secondary">{project.devicesAllocated}</Badge>
                          ) : (
                            <span className="text-xs text-muted-foreground">-</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${getStatusColor(project.status)}`}>
                            {getStatusIcon(project.status)}
                            {project.status}
                          </div>
                        </TableCell>
                        <TableCell>
                          {project.deadline ? (
                            <span className={isOverdue ? 'text-red-600 font-medium' : ''}>
                              {new Date(project.deadline).toLocaleDateString()}
                            </span>
                          ) : (
                            <span className="text-xs text-muted-foreground">-</span>
                          )}
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {new Date(project.createdAt).toLocaleDateString()}
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
