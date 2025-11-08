import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { Layout } from "./components/Layout";
import Dashboard from "./pages/Dashboard";
import AddStore from "./pages/AddStore";
import Stores from "./pages/Stores";
import Inventory from "./pages/Inventory";
import InventoryPage from "./pages/InventoryPage";
import Subscriptions from "./pages/Subscriptions";
import Invoices from "./pages/Invoices";
import Upload from "./pages/Upload";
import ProjectManager from "./pages/ProjectManager";
import LoadSite from "./pages/Heatmap";
import MyHeatmaps from "./pages/MyHeatmaps";
import DeviceConfigurations from "./pages/DeviceConfigurations";
import EngineerDeviceConfigurations from "./pages/EngineerDeviceConfigurations";
import ProjectManagementDashboard from "./pages/ProjectManagementDashboard";
import Users from "./pages/Users";
import Documents from "./pages/Documents";
import Auth from "./pages/Auth";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Layout>
          <Routes>
            <Route path="/auth" element={<Auth />} />
            <Route path="/" element={<Dashboard />} />
            <Route path="/stores" element={<Stores />} />
            <Route path="/stores/add" element={<AddStore />} />
            <Route path="/delivery" element={<Inventory />} />
            <Route path="/inventory" element={<InventoryPage />} />
            <Route path="/subscriptions" element={<Subscriptions />} />
            <Route path="/invoices" element={<Invoices />} />
            <Route path="/upload" element={<Upload />} />
            <Route path="/project-manager" element={<ProjectManager />} />
            <Route path="/project-manager/dashboard" element={<ProjectManagementDashboard />} />
            <Route path="/project-manager/load-site" element={<LoadSite />} />
            <Route path="/project-manager/device-configurations" element={<DeviceConfigurations />} />
            <Route path="/engineering/my-heatmaps" element={<MyHeatmaps />} />
            <Route path="/engineering/device-configurations" element={<EngineerDeviceConfigurations />} />
            <Route path="/users" element={<Users />} />
            <Route path="/documents" element={<Documents />} />
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </Layout>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
