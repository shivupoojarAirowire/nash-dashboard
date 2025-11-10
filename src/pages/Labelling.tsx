import { useState, useEffect } from "react";
import { useFeatureFlags } from '@/hooks/useFeatureFlags';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { supabase } from "@/integrations/supabase/client";
import { getInventory } from "@/integrations/supabase/inventory";
import { useToast } from "@/hooks/use-toast";
import { CheckCircle2, Package, FileText, Printer, ChevronDown } from "lucide-react";

type LabellingItem = {
  id: string;
  city: string;
  store_code: string;
  store_name: string;
  store_address: string;
  poc_name: string;
  poc_number: string;
  engineer: string;
  firewall_ip: string;
  zonal_port_number: string;
  devices: Array<{
    type: string;
    make: string;
    serial: string;
  }>;
  labeling_done: boolean;
};

export default function Labelling() {
  const { has, loading } = useFeatureFlags();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [items, setItems] = useState<LabellingItem[]>([]);
  const [loadingData, setLoadingData] = useState(true);
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!loading && !has('Operations')) {
      navigate('/');
    }
  }, [loading, has, navigate]);

  useEffect(() => {
    loadLabellingItems();
  }, []);

  const loadLabellingItems = async () => {
    try {
      setLoadingData(true);

      // Load site assignments with config_status='Completed'
      const { data: assignments, error: assignError } = await supabase
        .from('site_assignments')
        .select('id, city, store_id, store_code, assigned_to, firewall_ip, zonal_port_number, config_status, labeling_done')
        .eq('config_status', 'Completed')
        .order('created_at', { ascending: false });

      if (assignError) throw assignError;

      // Load stores with full details
      const storeIds = Array.from(new Set((assignments || []).map((a: any) => a.store_id)));
      const { data: stores, error: storesError } = await supabase
        .from('stores')
        .select('id, store, address, poc, poc_no')
        .in('id', storeIds);

      if (storesError) throw storesError;

      const storeMap: Record<string, any> = {};
      (stores || []).forEach((s: any) => {
        storeMap[s.id] = {
          name: s.store,
          address: s.address || '-',
          poc_name: s.poc || '-',
          poc_number: s.poc_no || '-'
        };
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

      // Load inventory to get allocated devices
      const inventory = await getInventory();

      // Build labelling items list
      const labellingList: LabellingItem[] = (assignments || []).map((a: any) => {
        const allocatedDevices = (inventory || []).filter((i: any) => 
          i.site === a.store_code && i.in_use
        ).map((i: any) => ({
          type: i.type,
          make: i.make,
          serial: i.serial
        }));

        const storeDetails = storeMap[a.store_id] || { name: '-', address: '-', poc_name: '-', poc_number: '-' };

        return {
          id: a.id,
          city: a.city,
          store_code: a.store_code,
          store_name: storeDetails.name,
          store_address: storeDetails.address,
          poc_name: storeDetails.poc_name,
          poc_number: storeDetails.poc_number,
          engineer: engineerMap[a.assigned_to] || '-',
          firewall_ip: a.firewall_ip || '-',
          zonal_port_number: a.zonal_port_number || '-',
          devices: allocatedDevices,
          labeling_done: !!a.labeling_done
        };
      });

      setItems(labellingList);

    } catch (e) {
      console.error('loadLabellingItems error', e);
      toast({
        title: "Error",
        description: "Failed to load labelling items. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoadingData(false);
    }
  };

  const generateDeliveryAddressLabel = (item: LabellingItem) => {
    // Create customer address label
    const labelContent = `
DELIVERY ADDRESS LABEL
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

TO:
${item.store_name}
Store Code: ${item.store_code}

DELIVERY ADDRESS:
${item.store_address}
${item.city}

POINT OF CONTACT:
Name: ${item.poc_name}
Phone: ${item.poc_number}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
`;

    // Create a blob and download
    const blob = new Blob([labelContent], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Address_Label_${item.store_code}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    toast({
      title: "Address Label Generated",
      description: `Delivery address label for ${item.store_name} has been downloaded.`,
    });
  };

  const generateDeliveryNote = (item: LabellingItem) => {
    // Count devices by type
    const deviceSummary: Record<string, { qty: number; serials: string[] }> = {};
    
    item.devices.forEach(device => {
      const key = `${device.type} - ${device.make}`;
      if (!deviceSummary[key]) {
        deviceSummary[key] = { qty: 0, serials: [] };
      }
      deviceSummary[key].qty++;
      deviceSummary[key].serials.push(device.serial);
    });

    const today = new Date().toLocaleDateString('en-IN', { 
      day: '2-digit', 
      month: 'short', 
      year: 'numeric' 
    });

    // Create A4 size delivery note in HTML format
    const deliveryNoteHTML = `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>Delivery Note - ${item.store_code}</title>
    <style>
        @page {
            size: A4;
            margin: 20mm;
        }
        body {
            font-family: Arial, sans-serif;
            font-size: 11pt;
            line-height: 1.4;
            color: #000;
            margin: 0;
            padding: 20px;
        }
        .header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            border-bottom: 3px solid #000;
            padding-bottom: 15px;
            margin-bottom: 20px;
        }
        .header .logo {
            flex: 0 0 auto;
        }
        .header .logo img {
            height: 60px;
            width: auto;
        }
        .header .title-section {
            flex: 1;
            text-align: center;
        }
        .header h1 {
            margin: 0 0 5px 0;
            font-size: 24pt;
            font-weight: bold;
            color: #000;
        }
        .header p {
            margin: 0;
            font-size: 10pt;
            color: #666;
        }
        .header .spacer {
            flex: 0 0 auto;
            width: 60px;
        }
        .delivery-info {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 20px;
            margin-bottom: 25px;
        }
        .info-box {
            border: 1px solid #000;
            padding: 15px;
            min-height: 120px;
        }
        .info-box h3 {
            margin: 0 0 10px 0;
            font-size: 12pt;
            border-bottom: 1px solid #ccc;
            padding-bottom: 5px;
        }
        .info-box p {
            margin: 5px 0;
            font-size: 10pt;
        }
        .info-box .label {
            font-weight: bold;
            display: inline-block;
            width: 120px;
        }
        table {
            width: 100%;
            border-collapse: collapse;
            margin: 20px 0;
        }
        th {
            background-color: #000;
            color: #fff;
            padding: 12px 8px;
            text-align: left;
            font-size: 11pt;
            font-weight: bold;
        }
        td {
            border: 1px solid #ddd;
            padding: 10px 8px;
            font-size: 10pt;
        }
        tr:nth-child(even) {
            background-color: #f9f9f9;
        }
        .serial-list {
            font-size: 9pt;
            color: #666;
            margin-top: 5px;
            font-family: 'Courier New', monospace;
        }
        .total-row {
            background-color: #f0f0f0;
            font-weight: bold;
            font-size: 11pt;
        }
        .footer {
            margin-top: 40px;
            border-top: 1px solid #ccc;
            padding-top: 15px;
        }
        .signatures {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 40px;
            margin-top: 60px;
        }
        .signature-box {
            text-align: center;
        }
        .signature-line {
            border-bottom: 2px solid #000;
            margin-bottom: 5px;
            height: 50px;
        }
        .notes {
            margin-top: 20px;
            padding: 15px;
            background-color: #f9f9f9;
            border: 1px solid #ddd;
            border-radius: 4px;
        }
        .notes h4 {
            margin: 0 0 10px 0;
            font-size: 11pt;
        }
        .notes p {
            margin: 5px 0;
            font-size: 9pt;
            color: #666;
        }
        @media print {
            body {
                padding: 0;
            }
            .no-print {
                display: none;
            }
        }
    </style>
</head>
<body>
    <div class="header">
        <div class="logo">
            <!-- Airowire Logo: Using base64 embedded image for compatibility -->
            <!-- Note: Logo path: C:\\Users\\ShivanandPoojar\\OneDrive - AIROWIRE NETWORKS PRIVATE LIMITED\\Documents\\TM logo Colour.png -->
            <svg width="200" height="60" viewBox="0 0 1800 400" xmlns="http://www.w3.org/2000/svg" style="max-width: 200px; height: auto;">
                <!-- Recreated Airowire logo based on the image -->
                <defs>
                    <linearGradient id="triangleGrad1" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" style="stop-color:#F5A962;stop-opacity:1" />
                        <stop offset="100%" style="stop-color:#E67E22;stop-opacity:1" />
                    </linearGradient>
                    <linearGradient id="triangleGrad2" x1="0%" y1="100%" x2="100%" y2="0%">
                        <stop offset="0%" style="stop-color:#9B59B6;stop-opacity:1" />
                        <stop offset="100%" style="stop-color:#8E44AD;stop-opacity:1" />
                    </linearGradient>
                </defs>
                
                <!-- Abstract geometric logo mark -->
                <g transform="translate(0, 50)">
                    <!-- Orange top triangle -->
                    <path d="M 80 20 L 160 140 L 120 100 Z" fill="url(#triangleGrad1)"/>
                    <!-- Orange curved element -->
                    <ellipse cx="120" cy="180" rx="120" ry="80" fill="#F5A962" opacity="0.9"/>
                    <!-- Purple bottom triangle -->
                    <path d="M 50 140 L 120 140 L 80 240 Z" fill="url(#triangleGrad2)"/>
                    <!-- Black accent -->
                    <path d="M 80 120 L 120 140 L 100 180 Z" fill="#2C3E50"/>
                </g>
                
                <!-- airowire text -->
                <text x="280" y="210" font-family="Arial, Helvetica, sans-serif" font-size="180" font-weight="400" fill="#F5A962" letter-spacing="-5">airowire</text>
                
                <!-- TM symbol -->
                <text x="1680" y="120" font-family="Arial, sans-serif" font-size="60" font-weight="bold" fill="#F5A962">™</text>
            </svg>
        </div>
        <div class="title-section">
            <h1>DELIVERY NOTE</h1>
            <p>Network Equipment Delivery</p>
        </div>
        <div class="spacer"></div>
    </div>

    <div style="text-align: right; margin-bottom: 15px;">
        <p style="margin: 0;"><strong>Date:</strong> ${today}</p>
        <p style="margin: 0;"><strong>Delivery Note #:</strong> DN-${item.store_code}-${Date.now().toString().slice(-6)}</p>
    </div>

    <div class="delivery-info">
        <div class="info-box">
            <h3>TO (Delivery Address)</h3>
            <p><span class="label">Store Name:</span> ${item.store_name}</p>
            <p><span class="label">Store Code:</span> ${item.store_code}</p>
            <p><span class="label">City:</span> ${item.city}</p>
            <p><span class="label">Address:</span> ${item.store_address}</p>
            <p style="margin-top: 10px;"><span class="label">Contact Person:</span> ${item.poc_name}</p>
            <p><span class="label">Contact Number:</span> ${item.poc_number}</p>
        </div>
        
        <div class="info-box">
            <h3>Configuration Details</h3>
            <p><span class="label">Engineer:</span> ${item.engineer}</p>
            <p><span class="label">Firewall IP:</span> ${item.firewall_ip}</p>
            <p><span class="label">Zonal Port:</span> ${item.zonal_port_number}</p>
            <p style="margin-top: 10px;"><span class="label">Total Items:</span> ${item.devices.length}</p>
            <p><span class="label">Config Status:</span> Completed</p>
        </div>
    </div>

    <h3 style="margin-top: 30px; margin-bottom: 10px;">Contents of Delivery</h3>
    <table>
        <thead>
            <tr>
                <th style="width: 50px;">S.No</th>
                <th>Device Type & Make</th>
                <th style="width: 80px; text-align: center;">Quantity</th>
                <th>Serial Numbers</th>
            </tr>
        </thead>
        <tbody>
            ${Object.entries(deviceSummary).map(([device, info], index) => `
            <tr>
                <td style="text-align: center;">${index + 1}</td>
                <td><strong>${device}</strong></td>
                <td style="text-align: center;"><strong>${info.qty}</strong></td>
                <td>
                    <div class="serial-list">
                        ${info.serials.map(s => `• ${s}`).join('<br>')}
                    </div>
                </td>
            </tr>
            `).join('')}
            <tr class="total-row">
                <td colspan="2" style="text-align: right;">TOTAL ITEMS:</td>
                <td style="text-align: center;">${item.devices.length}</td>
                <td></td>
            </tr>
        </tbody>
    </table>

    <div class="notes">
        <h4>Important Notes:</h4>
        <p>• Please verify all serial numbers upon receipt of equipment.</p>
        <p>• Report any damage or missing items immediately.</p>
        <p>• This delivery note must be signed and returned as proof of delivery.</p>
        <p>• Contact engineer for installation and configuration support.</p>
    </div>

    <div class="signatures">
        <div class="signature-box">
            <div class="signature-line"></div>
            <p><strong>Delivered By</strong></p>
            <p style="font-size: 9pt; color: #666;">Name & Signature</p>
        </div>
        <div class="signature-box">
            <div class="signature-line"></div>
            <p><strong>Received By</strong></p>
            <p style="font-size: 9pt; color: #666;">Name, Signature & Date</p>
        </div>
    </div>

    <div class="footer">
        <p style="text-align: center; font-size: 9pt; color: #666; margin: 0;">
            This is a computer generated delivery note. For queries, contact support.
        </p>
    </div>

    <script>
        // Auto-print when opened
        window.onload = function() {
            setTimeout(function() {
                window.print();
            }, 500);
        };
    </script>
</body>
</html>
`;

    // Create and download HTML file that will open in browser for printing
    const blob = new Blob([deliveryNoteHTML], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Delivery_Note_${item.store_code}_${today.replace(/\s/g, '_')}.html`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    
    // Also open in new window for immediate printing
    const printWindow = window.open(url, '_blank');
    if (printWindow) {
      printWindow.focus();
    }
    
    setTimeout(() => URL.revokeObjectURL(url), 1000);

    toast({
      title: "Delivery Note Generated",
      description: `A4 delivery note for ${item.store_name} has been generated and opened for printing.`,
    });
  };

  const generateBulkAddressLabels = () => {
    if (selectedItems.size === 0) {
      toast({
        title: "No Items Selected",
        description: "Please select at least one item to generate labels.",
        variant: "destructive",
      });
      return;
    }

    const selectedItemsData = items.filter(item => selectedItems.has(item.id));
    
    selectedItemsData.forEach(item => {
      generateDeliveryAddressLabel(item);
    });

    toast({
      title: "Bulk Address Labels Generated",
      description: `Generated ${selectedItems.size} address label(s) successfully.`,
    });
  };

  const generateBulkDeliveryNotes = () => {
    if (selectedItems.size === 0) {
      toast({
        title: "No Items Selected",
        description: "Please select at least one item to generate delivery notes.",
        variant: "destructive",
      });
      return;
    }

    const selectedItemsData = items.filter(item => selectedItems.has(item.id));
    
    selectedItemsData.forEach((item, index) => {
      setTimeout(() => {
        generateDeliveryNote(item);
      }, index * 1000); // Delay each by 1 second to avoid browser blocking multiple popups
    });

    toast({
      title: "Bulk Delivery Notes Generated",
      description: `Generating ${selectedItems.size} delivery note(s)...`,
    });
  };

  const handleMarkLabelled = async (itemId: string) => {
    try {
      const { error } = await supabase
        .from('site_assignments')
        .update({ labeling_done: true })
        .eq('id', itemId);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Device labelling marked as complete.",
      });

      // Reload data
      loadLabellingItems();
    } catch (e) {
      console.error('handleMarkLabelled error', e);
      toast({
        title: "Error",
        description: "Failed to update labelling status. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleBulkMarkLabelled = async () => {
    if (selectedItems.size === 0) {
      toast({
        title: "No Items Selected",
        description: "Please select at least one item to mark as labelled.",
        variant: "destructive",
      });
      return;
    }

    try {
      const { error } = await supabase
        .from('site_assignments')
        .update({ labeling_done: true })
        .in('id', Array.from(selectedItems));

      if (error) throw error;

      toast({
        title: "Success",
        description: `Marked ${selectedItems.size} item(s) as labelled.`,
      });

      setSelectedItems(new Set());
      loadLabellingItems();
    } catch (e) {
      console.error('handleBulkMarkLabelled error', e);
      toast({
        title: "Error",
        description: "Failed to update labelling status. Please try again.",
        variant: "destructive",
      });
    }
  };

  const toggleSelectItem = (itemId: string) => {
    const newSelected = new Set(selectedItems);
    if (newSelected.has(itemId)) {
      newSelected.delete(itemId);
    } else {
      newSelected.add(itemId);
    }
    setSelectedItems(newSelected);
  };

  const toggleSelectAll = () => {
    if (selectedItems.size === items.filter(i => !i.labeling_done).length) {
      setSelectedItems(new Set());
    } else {
      setSelectedItems(new Set(items.filter(i => !i.labeling_done).map(i => i.id)));
    }
  };

  if (!loading && !has('Operations')) {
    return (
      <div className="p-6">
        <Card>
          <CardHeader>
            <CardTitle>Access Restricted</CardTitle>
            <CardDescription>The Operations feature is disabled for your account.</CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  const stats = {
    total: items.length,
    completed: items.filter(i => i.labeling_done).length,
    pending: items.filter(i => !i.labeling_done).length
  };

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-2">Device Labelling</h1>
        <p className="text-muted-foreground">Label devices after configuration completion</p>
      </div>

      {/* Bulk Actions */}
      {selectedItems.size > 0 && (
        <Card className="mb-6 border-blue-200 bg-blue-50">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <Badge variant="secondary">{selectedItems.size} selected</Badge>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="default" className="gap-2">
                      <Printer className="h-4 w-4" />
                      Generate ({selectedItems.size})
                      <ChevronDown className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent>
                    <DropdownMenuItem onClick={generateBulkAddressLabels}>
                      <FileText className="h-4 w-4 mr-2" />
                      Delivery Address Labels
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={generateBulkDeliveryNotes}>
                      <Printer className="h-4 w-4 mr-2" />
                      Delivery Notes (A4)
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
                <Button 
                  onClick={handleBulkMarkLabelled}
                  variant="outline"
                  className="gap-2"
                >
                  <CheckCircle2 className="h-4 w-4" />
                  Mark as Labelled ({selectedItems.size})
                </Button>
              </div>
              <Button 
                onClick={() => setSelectedItems(new Set())}
                variant="ghost"
                size="sm"
              >
                Clear Selection
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-3 mb-6">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Sites</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
            <p className="text-xs text-muted-foreground">Ready for labelling</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Pending</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">{stats.pending}</div>
            <p className="text-xs text-muted-foreground">Awaiting labels</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Completed</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{stats.completed}</div>
            <p className="text-xs text-muted-foreground">Labels applied</p>
          </CardContent>
        </Card>
      </div>

      {/* Labelling Table */}
      <Card>
        <CardHeader>
          <CardTitle>Sites Ready for Labelling</CardTitle>
          <CardDescription>Configure device labels for completed configurations</CardDescription>
        </CardHeader>
        <CardContent>
          {loadingData ? (
            <div className="text-center py-8 text-muted-foreground">Loading...</div>
          ) : items.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No sites ready for labelling yet.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">
                    <Checkbox 
                      checked={selectedItems.size > 0 && selectedItems.size === items.filter(i => !i.labeling_done).length}
                      onCheckedChange={toggleSelectAll}
                    />
                  </TableHead>
                  <TableHead>City</TableHead>
                  <TableHead>Store Code</TableHead>
                  <TableHead>Store Name</TableHead>
                  <TableHead>PoC Name</TableHead>
                  <TableHead>PoC Number</TableHead>
                  <TableHead>Devices</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell>
                      {!item.labeling_done && (
                        <Checkbox 
                          checked={selectedItems.has(item.id)}
                          onCheckedChange={() => toggleSelectItem(item.id)}
                        />
                      )}
                    </TableCell>
                    <TableCell className="font-medium">{item.city}</TableCell>
                    <TableCell>{item.store_code}</TableCell>
                    <TableCell>{item.store_name}</TableCell>
                    <TableCell>{item.poc_name}</TableCell>
                    <TableCell className="font-mono text-sm">{item.poc_number}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Package className="h-4 w-4" />
                        <span>{item.devices.length}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      {item.labeling_done ? (
                        <Badge className="bg-green-100 text-green-800">
                          <CheckCircle2 className="h-3 w-3 mr-1" />
                          Completed
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="text-yellow-600 border-yellow-600">
                          Pending
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button size="sm" variant="outline" className="gap-1">
                              Generate
                              <ChevronDown className="h-3 w-3" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => generateDeliveryAddressLabel(item)}>
                              <FileText className="h-4 w-4 mr-2" />
                              Delivery Address Label
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => generateDeliveryNote(item)}>
                              <Printer className="h-4 w-4 mr-2" />
                              Delivery Note (A4)
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                        {!item.labeling_done && (
                          <Button 
                            size="sm" 
                            onClick={() => handleMarkLabelled(item.id)}
                          >
                            Mark Done
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
