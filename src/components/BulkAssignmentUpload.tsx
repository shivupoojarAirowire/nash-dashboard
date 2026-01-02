import React, { useCallback, useState } from "react";
import * as XLSX from "xlsx";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "@/components/ui/use-toast";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Download, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface UploadedAssignment {
  city: string;
  storeCode: string;
  assignedToEmail?: string;
  deadlineAt?: string;
  apsNeeded?: string;
  remarks?: string;
  floors?: string;
  floorSize?: string;
}

interface RowValidation {
  valid: boolean;
  errors: string[];
  storeId?: string | null;
  assignedToId?: string | null;
}

export function BulkAssignmentUpload({ onDone }: { onDone?: () => void }) {
  const [rows, setRows] = useState<UploadedAssignment[]>([]);
  const [error, setError] = useState<string>("");
  const [validations, setValidations] = useState<RowValidation[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const downloadTemplate = useCallback(() => {
    const template = [
      {
        city: "CITY_NAME",
        storeCode: "STORE_CODE",
        assignedToEmail: "engineer@example.com (optional)",
        deadlineAt: "2025-12-31",
        apsNeeded: "2",
        remarks: "Notes",
        floors: "1",
        floorSize: "5000 sqft",
      },
    ];

    const ws = XLSX.utils.json_to_sheet(template);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Template");
    XLSX.writeFile(wb, "assignment-upload-template.xlsx");
  }, []);

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
        const jsonData = XLSX.utils.sheet_to_json(worksheet) as any[];

        const validated = jsonData.map((row, i) => {
          if (!row.storeCode) throw new Error(`Row ${i + 2}: storeCode is required`);
          return {
            city: (row.city || "").toString().toUpperCase(),
            storeCode: row.storeCode.toString(),
            assignedToEmail: row.assignedToEmail ? row.assignedToEmail.toString() : undefined,
            deadlineAt: row.deadlineAt ? row.deadlineAt.toString() : undefined,
            apsNeeded: row.apsNeeded ? row.apsNeeded.toString() : undefined,
            remarks: row.remarks ? row.remarks.toString() : undefined,
            floors: row.floors ? row.floors.toString() : undefined,
            floorSize: row.floorSize ? row.floorSize.toString() : undefined,
          } as UploadedAssignment;
        });

        setRows(validated);
        setError("");
        toast({ title: "Success", description: `${validated.length} assignments loaded from Excel file` });
        // run validation after parsing
        validateRows(validated).catch((e) => console.error('validation error', e));
      } catch (err) {
        setRows([]);
        setError(err instanceof Error ? err.message : "Error parsing Excel file");
      }
    };
    reader.readAsArrayBuffer(file);
  }, []);

  const validateRows = useCallback(async (targetRows: UploadedAssignment[]) => {
    if (!targetRows || targetRows.length === 0) {
      setValidations([]);
      return [] as RowValidation[];
    }

    const codes = Array.from(new Set(targetRows.map(r => r.storeCode)));
    const emails = Array.from(new Set(targetRows.map(r => r.assignedToEmail).filter(Boolean))) as string[];

    const storeMap: Record<string, string> = {};
    if (codes.length) {
      const { data: stores } = await supabase.from('stores').select('id, store_code').in('store_code', codes as any);
      if (stores) {
        for (const s of stores) storeMap[s.store_code] = s.id;
      }
    }

    const emailMap: Record<string, string> = {};
    if (emails.length) {
      const { data: profiles } = await supabase.from('profiles').select('id, email').in('email', emails as any);
      if (profiles) {
        for (const p of profiles) emailMap[p.email] = p.id;
      }
    }

    const results: RowValidation[] = targetRows.map(r => {
      const errs: string[] = [];
      // store existence
      const storeId = storeMap[r.storeCode] ?? null;
      if (!storeId) errs.push(`Store code ${r.storeCode} not found`);

      // deadline format
      if (r.deadlineAt) {
        const d = new Date(r.deadlineAt);
        if (isNaN(d.getTime())) errs.push(`Invalid deadline date: ${r.deadlineAt}`);
      }

      // assigned email exists?
      const assignedToId = r.assignedToEmail ? (emailMap[r.assignedToEmail] ?? null) : null;
      if (r.assignedToEmail && !assignedToId) errs.push(`Assigned email ${r.assignedToEmail} not found`);

      const valid = errs.length === 0;
      return { valid, errors: errs, storeId, assignedToId } as RowValidation;
    });

    setValidations(results);
    return results;
  }, []);

  const handleSubmit = useCallback(async () => {
    if (!rows.length) {
      setError("Please upload assignments first");
      return;
    }
    // ensure validation run and no errors
    const val = await validateRows(rows);
    const hasErrors = val.some(v => !v.valid);
    if (hasErrors) {
      setError('Fix validation errors before saving');
      return;
    }

    setIsSubmitting(true);
    try {
      // Resolve assigned_to emails to profile ids
      const emailToIdMap: Record<string, string> = {};
      const emails = Array.from(new Set(rows.map(r => r.assignedToEmail).filter(Boolean))) as string[];
      if (emails.length > 0) {
        const { data: profiles } = await supabase.from('profiles').select('id, email').in('email', emails);
        if (profiles) {
          for (const p of profiles) emailToIdMap[p.email] = p.id;
        }
      }

      // use validated storeId / assignedToId from validations
      const records = rows.map((r, idx) => {
        const v = validations[idx];
        return {
          city: r.city || null,
          store_id: v?.storeId ?? null,
          store_code: r.storeCode,
          floor_map_path: null,
          floor_map_url: null,
          assigned_to: v?.assignedToId ?? null,
          assigned_by: null,
          deadline_at: r.deadlineAt ? new Date(r.deadlineAt).toISOString() : null,
          status: 'Pending',
          aps_needed: r.apsNeeded ? Number(r.apsNeeded) : null,
          remarks: r.remarks || null,
          floors: r.floors ? Number(r.floors) : null,
          floor_size: r.floorSize || null,
        };
      });

      const { error: insertError } = await supabase.from('site_assignments').insert(records);
      if (insertError) throw insertError;

      toast({ title: 'Success', description: `${records.length} assignments created` });
      setRows([]);
      setValidations([]);
      if (onDone) onDone();
    } catch (err: any) {
      console.error('Bulk assignment error:', err);
      setError(err?.message || 'Error saving assignments');
      toast({ title: 'Error', description: 'Failed to save assignments', variant: 'destructive' });
    } finally {
      setIsSubmitting(false);
    }
  }, [rows, onDone]);

  const removeRow = useCallback((index: number) => {
    const n = rows.slice();
    n.splice(index, 1);
    setRows(n);
    const v = validations.slice();
    v.splice(index, 1);
    setValidations(v);
  }, [rows, validations]);

  const clearAll = useCallback(() => {
    setRows([]);
    setValidations([]);
    setError("");
  }, []);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Bulk Upload Assignments</CardTitle>
        <CardDescription>Upload Excel with assignments to create site loading tasks</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label>Download Template</Label>
          <Button variant="outline" className="w-full" onClick={downloadTemplate}>
            <Download className="mr-2 h-4 w-4" />
            Download Excel Template
          </Button>
        </div>

        <div className="space-y-2">
          <Label>Upload Excel File</Label>
          <Input type="file" accept=".xlsx,.xls" onChange={handleFileUpload} className="cursor-pointer" />
          <p className="text-sm text-muted-foreground">Upload an Excel file with assignment details. Use the template for correct format.</p>
        </div>

        {error && (
          <Alert variant="destructive">
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {rows.length > 0 && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="text-sm">{rows.length} assignment(s) ready to be reviewed</div>
              <div className="flex gap-2">
                <Button variant="ghost" onClick={() => { validateRows(rows); }}>Re-validate</Button>
                <Button variant="destructive" onClick={clearAll}><Trash2 className="mr-2 h-4 w-4"/>Clear All</Button>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-sm table-auto border-collapse">
                <thead>
                  <tr className="text-left">
                    <th className="p-2">#</th>
                    <th className="p-2">City</th>
                    <th className="p-2">Store Code</th>
                    <th className="p-2">Assigned Email</th>
                    <th className="p-2">Deadline</th>
                    <th className="p-2">APS</th>
                    <th className="p-2">Remarks</th>
                    <th className="p-2">Status</th>
                    <th className="p-2">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r, i) => {
                    const v = validations[i];
                    return (
                      <tr key={i} className={`border-t ${v && !v.valid ? 'bg-red-50' : ''}`}>
                        <td className="p-2 align-top">{i + 1}</td>
                        <td className="p-2 align-top">{r.city}</td>
                        <td className="p-2 align-top">{r.storeCode}</td>
                        <td className="p-2 align-top">{r.assignedToEmail || '-'}</td>
                        <td className="p-2 align-top">{r.deadlineAt || '-'}</td>
                        <td className="p-2 align-top">{r.apsNeeded || '-'}</td>
                        <td className="p-2 align-top">{r.remarks || '-'}</td>
                        <td className="p-2 align-top">
                          {v ? (
                            v.valid ? <span className="text-green-600">Valid</span> : (
                              <div className="text-red-700">
                                {v.errors.map((e, idx) => <div key={idx}>{e}</div>)}
                              </div>
                            )
                          ) : <span className="text-muted-foreground">Not validated</span>}
                        </td>
                        <td className="p-2 align-top">
                          <div className="flex gap-2">
                            <Button size="sm" variant="ghost" onClick={() => removeRow(i)}>Remove</Button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <Button onClick={handleSubmit} className="w-full" disabled={isSubmitting || validations.some(v => !v?.valid)}>
              {isSubmitting ? 'Saving...' : `Save ${rows.length} Assignment${rows.length === 1 ? '' : 's'}`}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
