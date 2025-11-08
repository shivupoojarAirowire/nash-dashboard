import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Upload as UploadIcon, FileSpreadsheet, Download, AlertCircle } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";

const Upload = () => {
  const [isDragging, setIsDragging] = useState(false);
  const { toast } = useToast();

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    
    const files = Array.from(e.dataTransfer.files);
    handleFiles(files);
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const files = Array.from(e.target.files);
      handleFiles(files);
    }
  };

  const handleFiles = (files: File[]) => {
    const excelFiles = files.filter(file => 
      file.name.endsWith('.xlsx') || file.name.endsWith('.xls')
    );

    if (excelFiles.length > 0) {
      toast({
        title: "Upload Successful",
        description: `${excelFiles.length} file(s) ready for processing`,
      });
    } else {
      toast({
        title: "Invalid File Type",
        description: "Please upload Excel files (.xlsx or .xls)",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="flex flex-col gap-6 p-6">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold text-foreground">Upload Data</h1>
        <p className="text-muted-foreground">
          Import network asset data from Excel files
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card className="shadow-md">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <UploadIcon className="h-5 w-5 text-primary" />
              Upload Excel File
            </CardTitle>
            <CardDescription>
              Upload store data including network assets, inventory, and subscriptions
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
                isDragging
                  ? 'border-primary bg-primary/5'
                  : 'border-border hover:border-primary/50'
              }`}
            >
              <FileSpreadsheet className="h-12 w-12 mx-auto mb-4 text-primary" />
              <h3 className="font-semibold mb-2">Drop your Excel file here</h3>
              <p className="text-sm text-muted-foreground mb-4">
                or click to browse from your computer
              </p>
              <input
                type="file"
                id="file-upload"
                accept=".xlsx,.xls"
                onChange={handleFileInput}
                className="hidden"
                multiple
              />
              <Button asChild className="bg-gradient-primary">
                <label htmlFor="file-upload" className="cursor-pointer">
                  Select Files
                </label>
              </Button>
              <p className="text-xs text-muted-foreground mt-4">
                Supported formats: .xlsx, .xls
              </p>
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-md">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Download className="h-5 w-5 text-primary" />
              Download Templates
            </CardTitle>
            <CardDescription>
              Use our standardized templates for data import
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                Download and fill out the templates to ensure proper data formatting
              </AlertDescription>
            </Alert>

            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 rounded-lg border border-border hover:bg-muted/50 transition-colors">
                <div>
                  <p className="font-medium">Store Data Template</p>
                  <p className="text-sm text-muted-foreground">Store locations and details</p>
                </div>
                <Button variant="outline" size="sm">
                  <Download className="h-4 w-4 mr-2" />
                  Download
                </Button>
              </div>

              <div className="flex items-center justify-between p-3 rounded-lg border border-border hover:bg-muted/50 transition-colors">
                <div>
                  <p className="font-medium">Network Assets Template</p>
                  <p className="text-sm text-muted-foreground">Routers, switches, access points</p>
                </div>
                <Button variant="outline" size="sm">
                  <Download className="h-4 w-4 mr-2" />
                  Download
                </Button>
              </div>

              <div className="flex items-center justify-between p-3 rounded-lg border border-border hover:bg-muted/50 transition-colors">
                <div>
                  <p className="font-medium">Inventory Template</p>
                  <p className="text-sm text-muted-foreground">Delivery tracking information</p>
                </div>
                <Button variant="outline" size="sm">
                  <Download className="h-4 w-4 mr-2" />
                  Download
                </Button>
              </div>

              <div className="flex items-center justify-between p-3 rounded-lg border border-border hover:bg-muted/50 transition-colors">
                <div>
                  <p className="font-medium">Subscription Template</p>
                  <p className="text-sm text-muted-foreground">Service plans and billing</p>
                </div>
                <Button variant="outline" size="sm">
                  <Download className="h-4 w-4 mr-2" />
                  Download
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="shadow-md">
        <CardHeader>
          <CardTitle>Upload Guidelines</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <h4 className="font-semibold mb-2">Required Fields</h4>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• Store Name and Location</li>
                <li>• Network Asset Type and Count</li>
                <li>• Delivery Date (for inventory)</li>
                <li>• Subscription Start Date</li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-2">Data Format</h4>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• Dates: YYYY-MM-DD format</li>
                <li>• Numbers: No currency symbols</li>
                <li>• Text: UTF-8 encoding</li>
                <li>• Max file size: 10MB</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Upload;
