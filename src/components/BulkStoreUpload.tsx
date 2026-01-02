import React, { useCallback, useState } from "react";
import { useNavigate } from "react-router-dom";
import * as XLSX from "xlsx";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "@/components/ui/use-toast";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Download } from "lucide-react";
import { bulkAddStores } from "@/integrations/supabase/stores";

interface UploadedStore {
  city: string;
  store: string;
  storeCode: string;
  address?: string;
  poc?: string;
  pocNo?: string;
  priority?: string;
  siteReadiness?: string;
}

export function BulkStoreUpload() {
  const navigate = useNavigate();
  const [uploadedStores, setUploadedStores] = useState<UploadedStore[]>([]);
  const [error, setError] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleFileUpload = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: "array" });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const jsonData = XLSX.utils.sheet_to_json(worksheet) as UploadedStore[];

        // Validate the data
        const validatedData = jsonData.map((row, index) => {
          if (!row.city || !row.store || !row.storeCode) {
            throw new Error(`Row ${index + 2}: City, Store, and Store Code are required`);
          }
          return {
            city: row.city.toUpperCase(),
            store: row.store,
            storeCode: row.storeCode,
            address: row.address || "",
            poc: row.poc || "",
            pocNo: row.pocNo || "",
            priority: row.priority || "Medium",
            siteReadiness: row.siteReadiness || "Not Ready",
          };
        });

        setUploadedStores(validatedData);
        setError("");
        toast({
          title: "Success",
          description: `${validatedData.length} stores loaded from Excel file`,
        });
      } catch (err) {
        setError(err instanceof Error ? err.message : "Error parsing Excel file");
        setUploadedStores([]);
      }
    };
    reader.readAsArrayBuffer(file);
  }, []);

  const downloadTemplate = useCallback(() => {
    const template = [
      {
        city: "CITY_NAME",
        store: "STORE_NAME",
        storeCode: "STORE_CODE",
        address: "STORE_ADDRESS",
        poc: "CONTACT_PERSON",
        pocNo: "CONTACT_NUMBER",
        priority: "High/Medium/Low",
        siteReadiness: "Existing site/New site",
      },
    ];

    const ws = XLSX.utils.json_to_sheet(template);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Template");
    XLSX.writeFile(wb, "store-upload-template.xlsx");
  }, []);

  const handleSubmit = useCallback(async () => {
    if (!uploadedStores.length) {
      setError("Please upload stores first");
      return;
    }

    setIsSubmitting(true);
    try {
      const storesToAdd = uploadedStores.map(store => {
        // Map site_readiness values to valid constraint values
        let siteReadiness: "Existing site" | "New site" = "Existing site";
        const value = (store.siteReadiness || "").trim().toLowerCase();
        
        // Map various input formats to valid values
        if (value.includes("new")) {
          siteReadiness = "New site";
        } else {
          siteReadiness = "Existing site";
        }
        
        return {
          city: store.city.toUpperCase(),
          store: store.store,
          store_code: store.storeCode,
          address: store.address || null,
          poc: store.poc || null,
          poc_no: store.pocNo || null,
          priority: (store.priority || "Medium") as "High" | "Medium" | "Low",
          site_readiness: siteReadiness
        };
      });

      await bulkAddStores(storesToAdd);
      toast({
        title: "Success",
        description: `${uploadedStores.length} stores saved successfully`,
      });
      setUploadedStores([]);
      // Navigate back to stores list to see the updates
      navigate("/stores");
    } catch (err) {
      console.error("Bulk upload error:", err);
      setError(err instanceof Error ? err.message : "Error saving stores");
      toast({
        title: "Error",
        description: "Failed to save stores. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsSubmitting(false);
    }
  }, [uploadedStores, navigate]);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Bulk Upload Stores</CardTitle>
        <CardDescription>Upload multiple stores using an Excel file</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label>Download Template</Label>
          <Button 
            variant="outline" 
            className="w-full"
            onClick={downloadTemplate}
          >
            <Download className="mr-2 h-4 w-4" />
            Download Excel Template
          </Button>
        </div>

        <div className="space-y-2">
          <Label>Upload Excel File</Label>
          <Input
            type="file"
            accept=".xlsx,.xls"
            onChange={handleFileUpload}
            className="cursor-pointer"
          />
          <p className="text-sm text-muted-foreground">
            Upload an Excel file with store details. Use the template for correct format.
          </p>
        </div>

        {error && (
          <Alert variant="destructive">
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {uploadedStores.length > 0 && (
          <div className="space-y-4">
            <div className="text-sm">
              {uploadedStores.length} store(s) ready to be added
            </div>
            <Button 
              onClick={handleSubmit} 
              className="w-full"
              disabled={isSubmitting}
            >
              {isSubmitting ? "Saving..." : `Save ${uploadedStores.length} Store${uploadedStores.length === 1 ? '' : 's'}`}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}