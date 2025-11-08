import React from "react";
import { useForm, UseFormSetValue, UseFormWatch } from "react-hook-form";
import { useNavigate } from "react-router-dom";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { toast } from "@/components/ui/use-toast";
import { getStoresByCity, getUniqueCities, addStore, bulkAddStores, type StoreRow } from "@/integrations/supabase/stores";
import { BulkStoreUpload } from "@/components/BulkStoreUpload";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

type FormValues = {
  priority: string;
  city: string;
  store: string;
  storeCode: string;
  address: string;
  poc: string;
  pocNo: string;
  siteReadiness: "Existing site" | "New site";
};

const AddStore: React.FC = () => {
  const navigate = useNavigate();
  const { register, handleSubmit, formState, setValue, watch } = useForm<FormValues>({
    defaultValues: {
      priority: "Medium",
      city: "",
      store: "",
      storeCode: "",
      address: "",
      poc: "",
      pocNo: "",
      siteReadiness: "Existing site",
    },
  });

  // Watch city and store values for suggestions
  const selectedCity = watch("city");
  const selectedStore = watch("store") || "";
  const [storeSuggestions, setStoreSuggestions] = React.useState<StoreRow[]>([]);

  // Update store suggestions when city changes
  React.useEffect(() => {
    async function updateSuggestions() {
      if (selectedCity) {
        const stores = await getStoresByCity(selectedCity);
        // Only set suggestions if store field is not empty and has 2 or more characters
        if (selectedStore.length >= 2) {
          const searchTerm = selectedStore.toLowerCase();
          const filtered = stores.filter(s => 
            s.store.toLowerCase().includes(searchTerm) || 
            s.store_code.toLowerCase().includes(searchTerm)
          );
          setStoreSuggestions(filtered);
        } else {
          // Show all stores in the city if no search term
          setStoreSuggestions(stores);
        }
      } else {
        setStoreSuggestions([]);
        setValue("store", "");
        setValue("storeCode", "");
      }
    }
    updateSuggestions();
  }, [selectedCity, selectedStore, setValue]);

  // Handle store selection
  const handleStoreSelect = (storeData: StoreRow) => {
    setValue("store", storeData.store);
    setValue("storeCode", storeData.store_code);
    setStoreSuggestions([]);
  };

  const onSubmit = async (data: FormValues) => {
    try {
      // Map UI-friendly options to DB enum values
      const siteReadinessDb = data.siteReadiness === "Existing site" ? "Ready" : "Not Ready";

      const newStore: Parameters<typeof addStore>[0] = {
        city: data.city,
        store: data.store,
        store_code: data.storeCode,
        address: data.address,
        poc: data.poc,
        poc_no: data.pocNo,
        priority: data.priority as "High" | "Medium" | "Low",
        site_readiness: siteReadinessDb as "Ready" | "Not Ready" | "Partial"
      };
      
      await addStore(newStore);
      toast({ title: "Store added", description: `${data.store} (${data.storeCode}) added.` });
      navigate("/stores");
    } catch (error) {
      console.error("Failed to add store:", error);
      toast({ 
        title: "Error adding store", 
        description: "Failed to add store. Please try again.",
        variant: "destructive"
      });
    }
  };

  return (
    <div className="p-6">
      <Tabs defaultValue="single" className="space-y-4">
        <TabsList>
          <TabsTrigger value="single">Single Store</TabsTrigger>
          <TabsTrigger value="bulk">Bulk Upload</TabsTrigger>
        </TabsList>

        <TabsContent value="single">
          <Card>
            <CardHeader>
              <CardTitle>Add Store</CardTitle>
              <CardDescription>Fill the form to register a new store location.</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit(onSubmit)} className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div>
                  <Label>Priority</Label>
                  <select {...register("priority")} className="mt-1 block w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
                    <option>High</option>
                    <option>Medium</option>
                    <option>Low</option>
                  </select>
                </div>

                <div className="relative">
                  <Label>City</Label>
                  <Input {...register("city", { required: true })} autoComplete="off" />
                  {/* Autocomplete suggestions: show when user types 2+ characters */}
                  <CitySuggestions watch={watch} setValue={setValue} />
                </div>

                <div className="relative">
                  <Label>Store</Label>
                  <Input {...register("store", { required: true })} autoComplete="off" />
                  {/* Store suggestions */}
                  <StoreSuggestions 
                    suggestions={storeSuggestions} 
                    onSelect={handleStoreSelect}
                  />
                </div>

                <div>
                  <Label>Store Code</Label>
                  <Input {...register("storeCode", { required: true })} readOnly className="bg-muted" />
                </div>

                <div className="md:col-span-2">
                  <Label>Address</Label>
                  <Textarea {...register("address")} />
                </div>

                <div>
                  <Label>POC</Label>
                  <Input {...register("poc")} />
                </div>

                <div>
                  <Label>POC No</Label>
                  <Input {...register("pocNo")} />
                </div>

                <div>
                  <Label>Site readiness</Label>
                  <select {...register("siteReadiness")} className="mt-1 block w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
                    <option>Existing site</option>
                    <option>New site</option>
                  </select>
                </div>

                <div className="md:col-span-2 flex items-center justify-end gap-2">
                  <Button type="button" variant="outline" onClick={() => navigate(-1)}>
                    Cancel
                  </Button>
                  <Button type="submit">Create Store</Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="bulk">
          <BulkStoreUpload />
        </TabsContent>
      </Tabs>
    </div>
  );
};

function CitySuggestions({
  watch,
  setValue,
}: {
  watch: UseFormWatch<FormValues>;
  setValue: UseFormSetValue<FormValues>;
}) {
  const query = watch("city") || "";
  const [suggestions, setSuggestions] = React.useState<string[]>([]);

  React.useEffect(() => {
    async function updateSuggestions() {
      const q = (query || "").trim();
      if (q.length >= 2) {
        const qLower = q.toLowerCase();
        const cities = await getUniqueCities();
        const matched = cities.filter((c) => c.toLowerCase().includes(qLower));
        // dedupe and limit
        const unique = Array.from(new Set(matched));
        setSuggestions(unique.slice(0, 10));
      } else {
        setSuggestions([]);
      }
    }
    updateSuggestions();
  }, [query]);

  if (suggestions.length === 0) return null;

  return (
    <div className="absolute z-50 mt-1 w-full max-h-48 overflow-auto rounded-md border bg-background shadow">
      {suggestions.map((s) => (
        <button
          type="button"
          key={s}
          className="w-full px-3 py-2 text-left hover:bg-accent/30"
          onClick={() => {
            setValue("city", s, { shouldDirty: true, shouldValidate: true });
            setSuggestions([]);
          }}
        >
          {s}
        </button>
      ))}
    </div>
  );
}

function StoreSuggestions({
  suggestions,
  onSelect,
}: {
  suggestions: StoreRow[];
  onSelect: (store: StoreRow) => void;
}) {
  if (suggestions.length === 0) return null;

  return (
    <div className="absolute z-50 mt-1 w-full max-h-48 overflow-auto rounded-md border bg-background shadow">
      {suggestions.map((store) => (
        <button
          type="button"
          key={store.store_code}
          className="w-full px-3 py-2 text-left hover:bg-accent/30"
          onClick={() => onSelect(store)}
        >
          <div className="font-medium">{store.store}</div>
          <div className="text-sm text-muted-foreground">{store.store_code}</div>
        </button>
      ))}
    </div>
  );
}

export default AddStore;
