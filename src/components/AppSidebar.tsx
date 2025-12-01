import { LayoutDashboard, Store, Upload, Package, Calendar, FolderKanban, LogOut, Users as UsersIcon, ChevronRight, Map as MapIcon, Wrench, FileText, Settings as SettingsIcon, Tag, Truck, Wifi, Settings, Network, BarChart3 } from "lucide-react";
import { NavLink } from "@/components/NavLink";
import { useLocation, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { useEffect, useState } from "react";
import { useFeatureFlags } from '@/hooks/useFeatureFlags';
import { supabase } from "@/integrations/supabase/client";

import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubItem,
  SidebarMenuSubButton,
  SidebarTrigger,
  useSidebar,
  SidebarHeader,
} from "@/components/ui/sidebar";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";

const catalogItems = [
  { title: "Dashboard", url: "/", icon: LayoutDashboard },
  { title: "Stores", url: "/stores", icon: Store },
  { 
    title: "Operations", 
    url: "/operations", 
    icon: Package,
    subItems: [
      { title: "Inventory", url: "/inventory", icon: Package },
      { title: "Delivery", url: "/delivery", icon: Package },
      { title: "Labelling", url: "/labelling", icon: Tag }
    ]
  },
  { 
    title: "Finance", 
    url: "/finance", 
    icon: Calendar,
    subItems: [
      { title: "Subscriptions", url: "/subscriptions", icon: Calendar },
      { title: "Invoices", url: "/invoices", icon: FileText }
    ]
  },
  { 
    title: "Project Operations", 
    url: "/project-manager", 
    icon: FolderKanban,
    subItems: [
  { title: "Dashboard", url: "/project-manager/dashboard", icon: LayoutDashboard },
  { title: "Add Store", url: "/add-store", icon: Store },
  { title: "Onboard Store", url: "/project-operations", icon: Settings },
  { title: "HeatMaps", url: "/project-manager/load-site", icon: MapIcon },
  { title: "Device Configurations", url: "/project-manager/device-configurations", icon: Package }
    ]
  },
  {
    title: "Engineering",
    url: "/engineering",
    icon: Wrench,
    subItems: [
  { title: "My Heatmaps", url: "/engineering/my-heatmaps", icon: MapIcon },
  { title: "Device Configurations", url: "/engineering/device-configurations", icon: Package }
    ]
  },
  { title: "Documents", url: "/documents", icon: FileText },
  { title: "Vendors", url: "/vendors", icon: Truck },
  { title: "ISP Management", url: "/isp-management", icon: Wifi },
  { title: "Network Operations", url: "/network-operations", icon: Network },
  { title: "Reports", url: "/reports", icon: BarChart3 },
  { 
    title: "Settings", 
    url: "/settings", 
    icon: SettingsIcon,
    subItems: [
      { title: "Users", url: "/users", icon: UsersIcon }
    ]
  }
];

export function AppSidebar() {
  const { open } = useSidebar();
  const location = useLocation();
  const navigate = useNavigate();
  const currentPath = location.pathname;
  const { signOut, user } = useAuth();
  const [visibleItems, setVisibleItems] = useState<typeof catalogItems>([]);
  const { has, loading: flagsLoading } = useFeatureFlags();
  const [userRoles, setUserRoles] = useState<string[]>([]);
  const [userName, setUserName] = useState<string>("");

  useEffect(() => {
    if (!user) {
      setVisibleItems([]);
      setUserRoles([]);
      setUserName("");
      return;
    }

    // Fetch user roles and profile
    async function loadUserData() {
      try {
        const { data: roles } = await supabase
          .from('user_roles')
          .select('role')
          .eq('user_id', user.id);
        const roleNames = roles?.map((r) => r.role) || [];
        setUserRoles(roleNames);

        const { data: profile } = await supabase
          .from('profiles')
          .select('full_name')
          .eq('id', user.id)
          .single();
        setUserName(profile?.full_name || user.email || "User");
      } catch (e) {
        console.error('Error loading user data:', e);
      }
    }
    loadUserData();

    const filtered = catalogItems.filter((item) => has(item.title));
    setVisibleItems(filtered);
  }, [user, has, flagsLoading]);

  const isActive = (path: string) => currentPath === path;

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="border-b border-sidebar-border">
        <div className="flex items-center gap-2 px-4 py-4">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-primary">
            <span className="text-sm font-bold text-primary-foreground">
              {userName.charAt(0).toUpperCase() || "N"}
            </span>
          </div>
          {open && (
            <div className="flex flex-col">
              <button
                className="text-sm font-semibold text-sidebar-foreground text-left hover:underline focus:outline-none"
                onClick={() => navigate("/profile")}
                title="View Profile"
                style={{ background: "none", border: "none", padding: 0, margin: 0, cursor: "pointer" }}
              >
                {userName}
              </button>
              <span className="text-xs text-sidebar-foreground/60">
                {userRoles.length > 0 ? userRoles.map(r => r.charAt(0).toUpperCase() + r.slice(1)).join(", ") : "User"}
              </span>
            </div>
          )}
        </div>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Navigation</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {visibleItems.map((item) => {
                const hasSubItems = item.subItems && item.subItems.length > 0;
                if (hasSubItems) {
                  return (
                    <Collapsible key={item.title} asChild defaultOpen={currentPath.startsWith(item.url)}>
                      <SidebarMenuItem>
                        <CollapsibleTrigger asChild>
                          <SidebarMenuButton isActive={isActive(item.url)}>
                            <item.icon />
                            <span>{item.title}</span>
                            <ChevronRight className="ml-auto transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90" />
                          </SidebarMenuButton>
                        </CollapsibleTrigger>
                        <CollapsibleContent>
                          <SidebarMenuSub>
                            {item.subItems!.map((subItem) => (
                              <SidebarMenuSubItem key={subItem.title}>
                                <SidebarMenuSubButton asChild isActive={isActive(subItem.url)}>
                                  <NavLink to={subItem.url}>
                                    <subItem.icon className="h-4 w-4" />
                                    <span>{subItem.title}</span>
                                  </NavLink>
                                </SidebarMenuSubButton>
                              </SidebarMenuSubItem>
                            ))}
                          </SidebarMenuSub>
                        </CollapsibleContent>
                      </SidebarMenuItem>
                    </Collapsible>
                  );
                }
                return (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton asChild isActive={isActive(item.url)}>
                      <NavLink to={item.url} end>
                        <item.icon />
                        <span>{item.title}</span>
                      </NavLink>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <div className="mt-auto border-t border-sidebar-border p-4 space-y-2">
        {open && (
          <Button
            onClick={signOut}
            variant="ghost"
            className="w-full justify-start text-sidebar-foreground hover:bg-sidebar-accent"
            size="sm"
          >
            <LogOut className="mr-2 h-4 w-4" />
            Sign Out
          </Button>
        )}
        <SidebarTrigger />
      </div>
    </Sidebar>
  );
}
