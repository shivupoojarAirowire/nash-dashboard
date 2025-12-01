import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { BarChart3, CalendarIcon, Download, FileText, PieChart as PieChartIcon } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

type ReportType = 'operations' | 'project-operations' | 'finance' | 'vendors' | 'isp' | 'overview';

export default function Reports() {
  const [dateFrom, setDateFrom] = useState<Date>();
  const [dateTo, setDateTo] = useState<Date>();
  const [reportGenerated, setReportGenerated] = useState(false);
  const [reportType, setReportType] = useState<ReportType>('overview');
  
  // Chart configuration
  const [barChartXAxis, setBarChartXAxis] = useState('name');
  const [barChartYAxis, setBarChartYAxis] = useState('value');
  const [pieChartField, setPieChartField] = useState('value');

  // Report data by type
  const reportData: Record<ReportType, any> = {
    overview: {
      summary: [
        { label: 'Total Sites', value: 85, detail: '72 existing + 13 new' },
        { label: 'Devices', value: 299, detail: '278 existing + 21 new' },
        { label: 'ISP Delivered', value: 218, detail: 'ISP1: 163, ISP2: 55' },
        { label: 'Completion', value: '70%', detail: '85 of 121 sites' },
      ],
      chartData: [
        { name: 'Existing Sites', value: 72, count: 72, category: 'Sites' },
        { name: 'New Sites', value: 13, count: 13, category: 'Sites' },
        { name: 'Existing Devices', value: 278, count: 278, category: 'Devices' },
        { name: 'New Devices', value: 21, count: 21, category: 'Devices' },
      ],
      tableData: [
        { site: 'Mumbai Central', code: 'MUM_001', city: 'Mumbai', devices: 8, status: 'Active', date: '2025-01-15' },
        { site: 'Delhi North', code: 'DEL_002', city: 'Delhi', devices: 6, status: 'Active', date: '2025-01-20' },
        { site: 'Bangalore HSR', code: 'BLR_003', city: 'Bangalore', devices: 10, status: 'Active', date: '2025-02-05' },
      ],
    },
    operations: {
      summary: [
        { label: 'Total Inventory', value: 1250, detail: 'All device types' },
        { label: 'Delivered', value: 965, detail: '77% completion' },
        { label: 'Pending', value: 285, detail: '23% remaining' },
        { label: 'Labelling Done', value: 890, detail: '71% labeled' },
      ],
      chartData: [
        { name: 'Routers', value: 320, count: 320, status: 'In Stock', type: 'Router' },
        { name: 'Switches', value: 410, count: 410, status: 'In Stock', type: 'Switch' },
        { name: 'Firewalls', value: 280, count: 280, status: 'In Stock', type: 'Firewall' },
        { name: 'Access Points', value: 240, count: 240, status: 'In Stock', type: 'AP' },
      ],
      tableData: [
        { item: 'Fortinet FG-60F', type: 'Firewall', quantity: 85, delivered: 72, pending: 13, date: '2025-02-10' },
        { item: 'Cisco Catalyst 2960', type: 'Switch', quantity: 120, delivered: 98, pending: 22, date: '2025-02-12' },
        { item: 'FortiAP 221E', type: 'Access Point', quantity: 95, delivered: 85, pending: 10, date: '2025-02-15' },
      ],
    },
    'project-operations': {
      summary: [
        { label: 'Total Projects', value: 85, detail: 'Active sites' },
        { label: 'Completed', value: 72, detail: '85% done' },
        { label: 'In Progress', value: 13, detail: '15% ongoing' },
        { label: 'Heatmaps', value: 68, detail: '80% completed' },
      ],
      chartData: [
        { name: 'Planning', value: 5, count: 5, stage: 'Planning', sites: 5 },
        { name: 'Passive Work', value: 15, count: 15, stage: 'Passive', sites: 15 },
        { name: 'Active Work', value: 22, count: 22, stage: 'Active', sites: 22 },
        { name: 'Completed', value: 43, count: 43, stage: 'Completed', sites: 43 },
      ],
      tableData: [
        { project: 'Mumbai Expansion', sites: 12, stage: 'Active Work', progress: '75%', engineer: 'Rajesh Kumar', date: '2025-03-01' },
        { project: 'Delhi Rollout', sites: 8, stage: 'Passive Work', progress: '50%', engineer: 'Amit Sharma', date: '2025-03-15' },
        { project: 'Bangalore Sites', sites: 15, stage: 'Completed', progress: '100%', engineer: 'Priya Singh', date: '2025-02-20' },
      ],
    },
    finance: {
      summary: [
        { label: 'Total Revenue', value: '₹2.5Cr', detail: 'Current period' },
        { label: 'Subscriptions', value: 145, detail: 'Active subscriptions' },
        { label: 'Invoices', value: 203, detail: '89% paid' },
        { label: 'Outstanding', value: '₹45L', detail: '11% pending' },
      ],
      chartData: [
        { name: 'Jan 2025', value: 850000, revenue: 850000, month: 'Jan', invoices: 42 },
        { name: 'Feb 2025', value: 920000, revenue: 920000, month: 'Feb', invoices: 48 },
        { name: 'Mar 2025', value: 780000, revenue: 780000, month: 'Mar', invoices: 38 },
      ],
      tableData: [
        { invoice: 'INV-2025-001', client: 'Mumbai Store', amount: '₹2,50,000', status: 'Paid', date: '2025-01-15', due: '2025-01-30' },
        { invoice: 'INV-2025-002', client: 'Delhi Branch', amount: '₹3,20,000', status: 'Paid', date: '2025-02-01', due: '2025-02-15' },
        { invoice: 'INV-2025-003', client: 'Bangalore Hub', amount: '₹1,80,000', status: 'Pending', date: '2025-02-20', due: '2025-03-05' },
      ],
    },
    vendors: {
      summary: [
        { label: 'Total Vendors', value: 28, detail: 'Active vendors' },
        { label: 'Orders Placed', value: 145, detail: 'This period' },
        { label: 'Delivered', value: 132, detail: '91% fulfillment' },
        { label: 'Total Value', value: '₹1.8Cr', detail: 'Purchase value' },
      ],
      chartData: [
        { name: 'Fortinet', value: 45, count: 45, orders: 45, amount: 8500000 },
        { name: 'Cisco', value: 38, count: 38, orders: 38, amount: 7200000 },
        { name: 'Aruba', value: 32, count: 32, orders: 32, amount: 3800000 },
        { name: 'Others', value: 30, count: 30, orders: 30, amount: 2500000 },
      ],
      tableData: [
        { vendor: 'Fortinet India', category: 'Firewalls', orders: 45, delivered: 42, pending: 3, value: '₹85L' },
        { vendor: 'Cisco Systems', category: 'Switches', orders: 38, delivered: 35, pending: 3, value: '₹72L' },
        { vendor: 'Aruba Networks', category: 'Access Points', orders: 32, delivered: 30, pending: 2, value: '₹38L' },
      ],
    },
    isp: {
      summary: [
        { label: 'Total ISPs', value: 12, detail: 'Active providers' },
        { label: 'Connections', value: 218, detail: 'Active connections' },
        { label: 'Dual ISP Sites', value: 21, detail: 'Redundancy' },
        { label: 'Uptime', value: '99.2%', detail: 'Average uptime' },
      ],
      chartData: [
        { name: 'Airtel', value: 85, count: 85, connections: 85, sites: 85 },
        { name: 'Jio', value: 78, count: 78, connections: 78, sites: 78 },
        { name: 'Zepto', value: 55, count: 55, connections: 55, sites: 55 },
      ],
      tableData: [
        { isp: 'Airtel Business', connections: 85, bandwidth: '100 Mbps', uptime: '99.5%', sites: 85, cost: '₹8,500/mo' },
        { isp: 'Jio Fiber', connections: 78, bandwidth: '150 Mbps', uptime: '99.2%', sites: 78, cost: '₹7,800/mo' },
        { isp: 'Zepto Broadband', connections: 55, bandwidth: '100 Mbps', uptime: '98.8%', sites: 55, cost: '₹6,500/mo' },
      ],
    },
  };

  const currentReport = reportData[reportType];

  // Get available fields for axis selection based on report type
  const getAvailableFields = () => {
    if (!currentReport?.chartData?.length) return [];
    const firstItem = currentReport.chartData[0];
    return Object.keys(firstItem).filter(key => 
      typeof firstItem[key] === 'number' || typeof firstItem[key] === 'string'
    );
  };

  const availableFields = getAvailableFields();

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
        className="font-bold text-sm"
        style={{ pointerEvents: 'none' }}
      >
        {`${value}`}
      </text>
    );
  };

  const handleGenerateReport = () => {
    setReportGenerated(true);
  };

  const handleDownloadReport = () => {
    // TODO: Implement PDF/Excel export functionality
    alert('Report download functionality will be implemented');
  };

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <BarChart3 className="h-8 w-8" />
          Reports
        </h1>
        <p className="text-muted-foreground mt-2">Generate custom reports based on time range</p>
      </div>

      {/* Report Configuration */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Report Configuration</CardTitle>
          <CardDescription>Select report type and date range</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-4 items-end">
            <div className="flex flex-col gap-2">
              <label className="text-sm font-medium">Report Type</label>
              <Select value={reportType} onValueChange={(value) => setReportType(value as ReportType)}>
                <SelectTrigger className="w-[200px]">
                  <SelectValue placeholder="Select report type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="overview">Overview</SelectItem>
                  <SelectItem value="operations">Operations</SelectItem>
                  <SelectItem value="project-operations">Project Operations</SelectItem>
                  <SelectItem value="finance">Finance</SelectItem>
                  <SelectItem value="vendors">Vendors</SelectItem>
                  <SelectItem value="isp">ISP Management</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex flex-col gap-2">
              <label className="text-sm font-medium">From Date</label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-[180px] justify-start text-left font-normal",
                      !dateFrom && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {dateFrom ? format(dateFrom, "PPP") : <span>Pick a date</span>}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={dateFrom}
                    onSelect={setDateFrom}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>

            <div className="flex flex-col gap-2">
              <label className="text-sm font-medium">To Date</label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-[180px] justify-start text-left font-normal",
                      !dateTo && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {dateTo ? format(dateTo, "PPP") : <span>Pick a date</span>}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={dateTo}
                    onSelect={setDateTo}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>

            <div className="flex gap-2">
              <Button onClick={handleGenerateReport} disabled={!dateFrom || !dateTo}>
                <FileText className="mr-2 h-4 w-4" />
                Generate Report
              </Button>
              {reportGenerated && (
                <Button variant="outline" onClick={handleDownloadReport}>
                  <Download className="mr-2 h-4 w-4" />
                  Download
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Report Content */}
      {reportGenerated && (
        <>
          {/* Summary Cards */}
          <div className="grid gap-4 md:grid-cols-4 mb-6">
            {currentReport.summary.map((item: any, index: number) => (
              <Card key={index}>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">{item.label}</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{item.value}</div>
                  <p className="text-xs text-muted-foreground">{item.detail}</p>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Charts with Dynamic Configuration */}
          <Tabs defaultValue="bar" className="mb-6">
            <TabsList className="mb-4">
              <TabsTrigger value="bar">Bar Chart</TabsTrigger>
              <TabsTrigger value="pie">Pie Chart</TabsTrigger>
            </TabsList>

            <TabsContent value="bar" className="space-y-4">
              {/* Bar Chart Configuration */}
              <Card>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-lg">Bar Chart</CardTitle>
                      <CardDescription className="text-xs">Customize axes to view different metrics</CardDescription>
                    </div>
                    <div className="flex gap-2">
                      <div className="flex flex-col gap-1">
                        <label className="text-xs font-medium">X-Axis</label>
                        <Select value={barChartXAxis} onValueChange={setBarChartXAxis}>
                          <SelectTrigger className="w-[140px] h-8">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {availableFields.map((field) => (
                              <SelectItem key={field} value={field}>{field}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="flex flex-col gap-1">
                        <label className="text-xs font-medium">Y-Axis</label>
                        <Select value={barChartYAxis} onValueChange={setBarChartYAxis}>
                          <SelectTrigger className="w-[140px] h-8">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {availableFields.filter(f => typeof currentReport.chartData[0][f] === 'number').map((field) => (
                              <SelectItem key={field} value={field}>{field}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={currentReport.chartData} margin={{ top: 10, right: 20, left: 10, bottom: 40 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                      <XAxis 
                        dataKey={barChartXAxis} 
                        tick={{ fontSize: 11 }}
                        angle={-15}
                        textAnchor="end"
                        height={70}
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
                      <Legend />
                      <Bar dataKey={barChartYAxis} fill="#6366f1" radius={[6, 6, 0, 0]} maxBarSize={60} />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="pie" className="space-y-4">
              {/* Pie Chart Configuration */}
              <Card>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-lg">Pie Chart</CardTitle>
                      <CardDescription className="text-xs">Select field to visualize distribution</CardDescription>
                    </div>
                    <div className="flex flex-col gap-1">
                      <label className="text-xs font-medium">Data Field</label>
                      <Select value={pieChartField} onValueChange={setPieChartField}>
                        <SelectTrigger className="w-[160px] h-8">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {availableFields.filter(f => typeof currentReport.chartData[0][f] === 'number').map((field) => (
                            <SelectItem key={field} value={field}>{field}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie
                        data={currentReport.chartData}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={100}
                        paddingAngle={3}
                        dataKey={pieChartField}
                        label={renderCustomLabel}
                        labelLine={false}
                      >
                        {currentReport.chartData.map((entry: any, index: number) => (
                          <Cell 
                            key={`cell-${index}`} 
                            fill={['#10b981', '#6366f1', '#8b5cf6', '#f59e0b', '#06b6d4', '#ec4899'][index % 6]} 
                            stroke="white" 
                            strokeWidth={2} 
                          />
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
                        height={50}
                        iconType="circle"
                        wrapperStyle={{ fontSize: '12px', paddingTop: '15px' }}
                        formatter={(value, entry: any) => `${entry.payload.name}: ${entry.payload[pieChartField]}`}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>

          {/* Detailed Table */}
          <Card>
            <CardHeader>
              <CardTitle>Detailed {reportType.charAt(0).toUpperCase() + reportType.slice(1)} Report</CardTitle>
              <CardDescription>Complete data within selected date range</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      {currentReport.tableData.length > 0 && Object.keys(currentReport.tableData[0]).map((key) => (
                        <TableHead key={key} className="capitalize">
                          {key.replace(/([A-Z])/g, ' $1').trim()}
                        </TableHead>
                      ))}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {currentReport.tableData.map((row: any, rowIndex: number) => (
                      <TableRow key={rowIndex}>
                        {Object.entries(row).map(([key, value]: [string, any], cellIndex) => (
                          <TableCell key={cellIndex} className={cellIndex === 0 ? "font-medium" : ""}>
                            {key === 'status' || key === 'stage' || key === 'progress' ? (
                              <Badge variant={
                                value === 'Active' || value === 'Paid' || value === 'Completed' || value === '100%' 
                                  ? "default" 
                                  : value === 'Pending' || value === 'In Progress'
                                  ? "secondary"
                                  : "outline"
                              }>
                                {value}
                              </Badge>
                            ) : typeof value === 'number' && key !== 'date' ? (
                              <Badge variant="outline">{value}</Badge>
                            ) : (
                              <span className={key.includes('code') || key.includes('invoice') ? "font-mono text-sm" : ""}>
                                {value}
                              </span>
                            )}
                          </TableCell>
                        ))}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </>
      )}

      {/* Empty State */}
      {!reportGenerated && (
        <Card>
          <CardContent className="py-12">
            <div className="flex flex-col items-center justify-center text-center">
              <PieChartIcon className="h-16 w-16 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">No Report Generated</h3>
              <p className="text-muted-foreground max-w-md">
                Select a date range above and click "Generate Report" to view detailed analytics with charts and tables
              </p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
