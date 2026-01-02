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
import html2pdf from 'html2pdf.js';

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
  delivery_challan_url?: string | null;
  delivery_challan_number?: string | null;
};

export default function Labelling() {
  const { has, loading } = useFeatureFlags();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [items, setItems] = useState<LabellingItem[]>([]);
  const [userDepartment, setUserDepartment] = useState<string | null>(null);
  const [loadingData, setLoadingData] = useState(true);
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());

  // Load user department
  useEffect(() => {
    const loadDepartment = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data } = await supabase
          .from('profiles')
          .select('department')
          .eq('id', user.id)
          .single();
        if (data) setUserDepartment(data.department);
      }
    };
    loadDepartment();
  }, []);

  useEffect(() => {
    if (!loading && userDepartment !== null && !has('Operations') && userDepartment !== 'admin' && userDepartment !== 'PMO') {
      navigate('/');
    }
  }, [loading, has, navigate, userDepartment]);

  useEffect(() => {
    loadLabellingItems();
  }, []);

  const loadLabellingItems = async () => {
    try {
      setLoadingData(true);

      // Load site assignments with config_status='Completed'
      const { data: assignments, error: assignError } = await supabase
        .from('site_assignments')
        .select('id, city, store_id, store_code, assigned_to, firewall_ip, zonal_port_number, config_status, delivery_challan_url, delivery_challan_number, labeling_done')
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
          i.store_code === a.store_code && i.in_use
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
          labeling_done: a.labeling_done || false,
          delivery_challan_url: a.delivery_challan_url,
          delivery_challan_number: a.delivery_challan_number
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

  const generateAndDownloadDeliveryChallan = async (item: LabellingItem) => {
    try {
      // Count devices by type
      const deviceSummary: Record<string, { qty: number; serials: string[]; make: string }> = {};
      
      item.devices.forEach(device => {
        const key = device.type;
        if (!deviceSummary[key]) {
          deviceSummary[key] = { qty: 0, serials: [], make: device.make };
        }
        deviceSummary[key].qty++;
        deviceSummary[key].serials.push(device.serial);
      });

      const today = new Date();
      const challanDate = today.toLocaleDateString('en-IN', { 
        day: '2-digit', 
        month: '2-digit', 
        year: 'numeric' 
      });
      
      // Generate unique challan number
      const timestamp = Date.now();
      const randomSuffix = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
      const storePrefix = item.store_code.substring(0, 3).toUpperCase();
      const challanNumber = `DC-${storePrefix}${timestamp.toString().slice(-8)}${randomSuffix}`;

      // Calculate subtotal (18% IGST)
      const subTotal = item.devices.length * 10000;
      const igst = subTotal * 0.18;
      const total = subTotal + igst;

      // Convert number to words
      const numberToWords = (num: number): string => {
        const ones = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine'];
        const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];
        const teens = ['Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
        
        if (num === 0) return 'Zero';
        if (num < 10) return ones[num];
        if (num < 20) return teens[num - 10];
        if (num < 100) return tens[Math.floor(num / 10)] + ' ' + ones[num % 10];
        if (num < 1000) return ones[Math.floor(num / 100)] + ' Hundred ' + numberToWords(num % 100);
        if (num < 100000) return numberToWords(Math.floor(num / 1000)) + ' Thousand ' + numberToWords(num % 1000);
        return numberToWords(Math.floor(num / 100000)) + ' Lakh ' + numberToWords(num % 100000);
      };

      const amountInWords = `Indian Rupee ${numberToWords(Math.floor(total))} Only`;

      // Generate HTML content
      const deliveryChallanHTML = generateChallanHTML(item, deviceSummary, challanNumber, challanDate, subTotal, igst, total, amountInWords);
      
      // Create a temporary div element to hold the HTML
      const tempDiv = document.createElement('div');
      tempDiv.innerHTML = deliveryChallanHTML;
      
      // Configure html2pdf options
      const opt = {
        margin: [8, 8, 8, 8] as [number, number, number, number],
        filename: `Delivery_Challan_${challanNumber}_${item.store_code}.pdf`,
        image: { type: 'jpeg' as const, quality: 0.98 },
        html2canvas: { scale: 2, useCORS: true },
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' as const }
      };

      // Generate and download PDF directly (no storage upload)
      html2pdf()
        .set(opt)
        .from(tempDiv)
        .save();

      // Store challan number in localStorage for future reference (optional)
      const recentChallans = JSON.parse(localStorage.getItem('recent_challans') || '[]');
      recentChallans.push({ 
        number: challanNumber, 
        store: item.store_code, 
        timestamp: new Date().toISOString() 
      });
      localStorage.setItem('recent_challans', JSON.stringify(recentChallans.slice(-10)));

      toast({
        title: "PDF Downloaded",
        description: `Delivery Challan #${challanNumber} downloaded to your Downloads folder.`,
      });

      console.log(`Delivery challan PDF ${challanNumber} generated and downloaded for ${item.store_code}`);
      
    } catch (error: any) {
      console.error('Error generating delivery challan:', error);
      // Show user-friendly error message
      toast({
        title: "Error Generating Challan",
        description: error.message || "Failed to generate delivery challan. Please try again.",
        variant: "destructive"
      });
    }
  };

  const generateChallanHTML = (
    item: LabellingItem,
    deviceSummary: Record<string, { qty: number; serials: string[]; make: string }>,
    challanNumber: string,
    challanDate: string,
    subTotal: number,
    igst: number,
    total: number,
    amountInWords: string
  ): string => {
    return `<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>Delivery Challan - ${challanNumber}</title>
    <style>
        @page {
            size: A4;
            margin: 8mm;
        }
        * {
            box-sizing: border-box;
            margin: 0;
            padding: 0;
        }
        body {
            font-family: Arial, Helvetica, sans-serif;
            font-size: 9pt;
            line-height: 1.2;
            color: #000;
            padding: 10px;
        }
        .challan-container {
            border: 2px solid #000;
            padding: 0;
            max-width: 100%;
        }
        .header-section {
            border-bottom: 2px solid #000;
            padding: 10px;
            display: flex;
            align-items: flex-start;
            gap: 15px;
        }
        .logo-section {
            flex: 0 0 120px;
        }
        .logo {
            color: #FF6600;
            font-size: 22pt;
            font-weight: bold;
            margin-bottom: 3px;
        }
        .logo .dot {
            color: #FF6600;
            font-size: 26pt;
        }
        .company-details {
            flex: 1;
        }
        .company-name {
            font-size: 11pt;
            font-weight: bold;
            margin-bottom: 2px;
        }
        .company-info {
            font-size: 8pt;
            line-height: 1.3;
            margin-bottom: 1px;
        }
        .challan-type {
            flex: 0 0 auto;
            text-align: right;
            font-size: 10pt;
            font-weight: bold;
            padding: 6px 12px;
            border: 2px solid #000;
        }
        .info-grid {
            display: grid;
            grid-template-columns: 3fr 2fr;
            border-bottom: 1px solid #000;
        }
        .info-left, .info-right {
            padding: 6px 10px;
            font-size: 8pt;
        }
        .info-left {
            border-right: 1px solid #000;
        }
        .info-row {
            display: flex;
            padding: 2px 0;
        }
        .info-label {
            font-weight: bold;
            width: 120px;
            flex-shrink: 0;
        }
        .info-value {
            flex: 1;
        }
        .deliver-to-section {
            border-bottom: 1px solid #000;
            padding: 8px 10px;
        }
        .section-title {
            font-weight: bold;
            font-size: 9pt;
            margin-bottom: 4px;
        }
        .address {
            font-size: 8pt;
            line-height: 1.5;
        }
        .items-table {
            width: 100%;
            border-collapse: collapse;
        }
        .items-table th {
            background-color: #f0f0f0;
            border: 1px solid #000;
            padding: 6px 4px;
            font-size: 8pt;
            font-weight: bold;
            text-align: left;
        }
        .items-table td {
            border: 1px solid #000;
            padding: 5px 4px;
            font-size: 8pt;
            vertical-align: top;
        }
        .item-description {
            font-size: 8pt;
            line-height: 1.3;
        }
        .serial-numbers {
            font-size: 7pt;
            color: #333;
            margin-top: 2px;
            font-family: 'Courier New', monospace;
            line-height: 1.2;
        }
        .qty-col {
            text-align: center;
            width: 50px;
        }
        .no-col {
            width: 25px;
            text-align: center;
        }
        .totals-section {
            display: grid;
            grid-template-columns: 1fr 250px;
        }
        .left-notes {
            padding: 8px 10px;
            border-right: 1px solid #000;
            font-size: 7pt;
            line-height: 1.3;
        }
        .right-totals {
            padding: 0;
        }
        .total-row {
            display: flex;
            justify-content: space-between;
            padding: 4px 10px;
            border-bottom: 1px solid #000;
            font-size: 8pt;
        }
        .total-row.grand-total {
            font-weight: bold;
            background-color: #f5f5f5;
        }
        .amount-words {
            padding: 6px 10px;
            border-bottom: 1px solid #000;
            font-size: 8pt;
        }
        .amount-words strong {
            font-weight: bold;
        }
        .terms-section {
            padding: 6px 10px;
            border-bottom: 1px solid #000;
            font-size: 7pt;
        }
        .terms-title {
            font-weight: bold;
            margin-bottom: 3px;
            font-size: 8pt;
        }
        .terms-list {
            line-height: 1.4;
            padding-left: 0;
        }
        .signature-section {
            padding: 15px 10px 8px;
            text-align: right;
        }
        .signature-line {
            display: inline-block;
            text-align: center;
        }
        .signature-line strong {
            display: block;
            margin-top: 25px;
            padding-top: 4px;
            border-top: 1px solid #000;
            width: 180px;
            font-size: 8pt;
        }
    </style>
</head>
<body>
    <div class="challan-container">
        <div class="header-section">
            <div class="logo-section">
                <div class="logo">airowire<span class="dot">.</span></div>
            </div>
            <div class="company-details">
                <div class="company-name">Airowire Networks Pvt Ltd</div>
                <div class="company-info">CIN U72200KA2014PTC073769</div>
                <div class="company-info"><strong>Regd Office</strong></div>
                <div class="company-info">Airowire Networks Pvt Ltd</div>
                <div class="company-info">3rd Floor, No #302, "Pine Platinum"</div>
                <div class="company-info">Ambalipura Main Road, Sarjapur Outer Ring Road - Sector 6</div>
                <div class="company-info">Bangalore 560102</div>
                <div class="company-info" style="margin-top: 5px;"><strong>GSTIN: 29AANCA2943E1ZL</strong></div>
            </div>
            <div class="challan-type">
                RETURNABLE DELIVERY CHALLAN
            </div>
        </div>
        <div class="info-grid">
            <div class="info-left">
                <div class="info-row">
                    <span class="info-label">Delivery Challan#</span>
                    <span class="info-value">: ${challanNumber}</span>
                </div>
                <div class="info-row">
                    <span class="info-label">Challan Date</span>
                    <span class="info-value">: ${challanDate}</span>
                </div>
            </div>
            <div class="info-right">
                <div class="info-row">
                    <span class="info-label">Place Of Supply</span>
                    <span class="info-value">: ${item.city} (${item.city.substring(0, 2).toUpperCase()})</span>
                </div>
                <div class="info-row">
                    <span class="info-label">Challan Type</span>
                    <span class="info-value">: Others</span>
                </div>
            </div>
        </div>
        <div class="deliver-to-section">
            <div class="section-title">Deliver To</div>
            <div class="address">
                <strong>${item.store_name}</strong><br>
                ${item.store_address || 'Plot No: 9, Sec 14 Kaushambi, Ghaziabad 201012'}<br>
                ${item.city}<br>
                India
            </div>
        </div>
        <table class="items-table">
            <thead>
                <tr>
                    <th class="no-col">#</th>
                    <th>Item & Description</th>
                    <th class="qty-col">Qty</th>
                </tr>
            </thead>
            <tbody>
                ${Object.entries(deviceSummary).map(([deviceType, info], index) => `
                <tr>
                    <td class="no-col">${index + 1}</td>
                    <td>
                        <div class="item-description">
                            <strong>${info.make}</strong><br>
                            ${deviceType === 'Switch' ? `8-Port Gigabit Desktop Switch with 8-Port PoE with power cable` :
                              deviceType === 'Firewall' ? `40F Firewall with Power cable` :
                              deviceType === 'Access Point' ? `Indoor Wireless FortiAP 221E-D with mount kits` : deviceType}
                        </div>
                        <div class="serial-numbers">
                            Serial Number${info.serials.length > 1 ? 's' : ''}:<br>
                            ${info.serials.join('<br>')}
                        </div>
                    </td>
                    <td class="qty-col">${info.qty.toFixed(2)}<br>No</td>
                </tr>
                `).join('')}
            </tbody>
        </table>
        <div class="totals-section">
            <div class="left-notes">
                <strong>Total In Words</strong><br>
                <em>${amountInWords}</em><br><br>
                <strong>Notes</strong><br>
                C2B-Kaushambi G2B_VSHALI_N02R0CC<br>
                88816D9113
            </div>
            <div class="right-totals">
                <div class="total-row">
                    <span>Sub Total</span>
                    <span>₹${subTotal.toFixed(2)}</span>
                </div>
                <div class="total-row">
                    <span>IGST18 (18%)</span>
                    <span>₹${igst.toFixed(2)}</span>
                </div>
                <div class="total-row">
                    <span>Rounding</span>
                    <span>0.20</span>
                </div>
                <div class="total-row grand-total">
                    <span>Total</span>
                    <span>₹${total.toFixed(2)}</span>
                </div>
            </div>
        </div>
        <div class="terms-section">
            <div class="terms-title">Terms & Conditions</div>
            <div class="terms-list">
                1) This Delivery Challan is issued solely for the purpose of delivery. The<br>
                goods mentioned in this challan are not intended for commercial use.<br>
                2) The materials listed in this challan are provided under an Opex<br>
                (rental) model and will remain the property of Airowire Networks Pvt.<br>
                3) These materials are issued on a rental basis until further notice.<br>
                4) The customer is responsible for ensuring that the materials are<br>
                maintained in good working condition and must prevent any tampering,<br>
                damage, or unauthorized modifications.<br>
                5) Any loss or damage to the materials during the rental period will be<br>
                billed to Zepto Private Limited.<br>
                6) The materials must be returned upon completion of the rental term<br>
                (six months) or upon request by Airowire Networks Pvt. Ltd., along with<br>
                all accessories and original packaging.
            </div>
        </div>
        <div class="signature-section">
            <div class="signature-line">
                <strong>Authorized Signature</strong>
            </div>
        </div>
    </div>
</body>
</html>`;
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

  const generateDeliveryNote = async (item: LabellingItem) => {
    try {
      // Generate and download PDF directly (no storage dependency)
      await generateAndDownloadDeliveryChallan(item);

    } catch (error: any) {
      console.error('Error generating delivery challan:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to generate delivery challan",
        variant: "destructive"
      });
    }
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

  if (!loading && !has('Operations') && userDepartment !== 'admin' && userDepartment !== 'PMO') {
    return (
      <div className="p-6">
        <Card>
          <CardHeader>
            <CardTitle>Access Restricted</CardTitle>
            <CardDescription>You do not have permission to view this page.</CardDescription>
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
