import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { getUniqueCities, getStoresByCity, type StoreRow } from "@/integrations/supabase/stores";

export default function ProjectManager() {
  const [cities, setCities] = useState<string[]>([]);
  const [stores, setStores] = useState<StoreRow[]>([]);
  const [selectedCity, setSelectedCity] = useState<string | null>(null);
  const [selectedStore, setSelectedStore] = useState<StoreRow | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Load cities on mount
  useEffect(() => {
    const loadCities = async () => {
      try {
        const uniqueCities = await getUniqueCities();
        setCities(uniqueCities);
        setError(null);
      } catch (e) {
        setError("Failed to load cities. Please try again.");
        console.error("Failed to load cities:", e);
      } finally {
        setLoading(false);
      }
    };
    loadCities();
  }, []);

  // Load stores when city changes
  useEffect(() => {
    const loadStores = async () => {
      if (!selectedCity) {
        setStores([]);
        return;
      }
      try {
        setLoading(true);
        const cityStores = await getStoresByCity(selectedCity);
        setStores(cityStores);
        setError(null);
      } catch (e) {
        setError("Failed to load stores. Please try again.");
        console.error("Failed to load stores:", e);
      } finally {
        setLoading(false);
      }
    };
    loadStores();
  }, [selectedCity]);

  const handleCityChange = (city: string) => {
    setSelectedCity(city);
    setSelectedStore(null); // Reset store selection when city changes
  };

  const handleStoreChange = (storeId: string) => {
    const store = stores.find(s => s.id === storeId);
    setSelectedStore(store || null);
  };

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-3xl font-bold">Project Manager</h1>
          <p className="text-muted-foreground">Search and select stores to manage projects</p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Store Selection</CardTitle>
          <CardDescription>Search by city and store to get store details</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4">
            <div>
              <label className="text-sm font-medium mb-1 block">City</label>
              <Select 
                value={selectedCity || undefined} 
                onValueChange={handleCityChange}
                disabled={loading || cities.length === 0}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a city" />
                </SelectTrigger>
                <SelectContent>
                  {cities.map(city => (
                    <SelectItem key={city} value={city}>{city}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm font-medium mb-1 block">Store</label>
              <Select
                value={selectedStore?.id}
                onValueChange={handleStoreChange}
                disabled={!selectedCity || loading || stores.length === 0}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a store" />
                </SelectTrigger>
                <SelectContent>
                  {stores.map(store => (
                    <SelectItem key={store.id} value={store.id}>{store.store}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm font-medium mb-1 block">Store Code</label>
              <Input 
                value={selectedStore?.store_code || ""} 
                readOnly 
                placeholder="Store code will appear here"
              />
            </div>
          </div>

          {error && (
            <div className="mt-4 p-4 bg-destructive/10 text-destructive rounded-md text-sm">
              {error}
            </div>
          )}

          {selectedStore && (
            <div className="mt-6 space-y-4">
              <h3 className="font-semibold">Selected Store Details</h3>
              <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
                <dt className="font-medium">City</dt>
                <dd>{selectedStore.city}</dd>
                <dt className="font-medium">Store Name</dt>
                <dd>{selectedStore.store}</dd>
                <dt className="font-medium">Store Code</dt>
                <dd className="font-mono">{selectedStore.store_code}</dd>
                <dt className="font-medium">Address</dt>
                <dd>{selectedStore.address || "—"}</dd>
                <dt className="font-medium">POC</dt>
                <dd>{selectedStore.poc || "—"}</dd>
                <dt className="font-medium">POC Number</dt>
                <dd>{selectedStore.poc_no || "—"}</dd>
                <dt className="font-medium">Priority</dt>
                <dd>{selectedStore.priority}</dd>
                <dt className="font-medium">Site Readiness</dt>
                <dd>{selectedStore.site_readiness}</dd>
              </dl>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}