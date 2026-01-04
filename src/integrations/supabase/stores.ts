import { supabase } from './client';
import type { Database } from './types';

// Store related types
export type StoreRow = Database['public']['Tables']['stores']['Row'];
export type StoreInsert = Database['public']['Tables']['stores']['Insert'];
export type StoreUpdate = Database['public']['Tables']['stores']['Update'];

// Store functions
export async function getStores() {
  const { data, error } = await supabase
    .from('stores')
    .select('*')
    .order('city');
  
  if (error) throw error;
  return data;
}

export async function getStoresByCity(city: string) {
  const { data, error } = await supabase
    .from('stores')
    .select('*')
    .eq('city', city.toUpperCase())
    .order('store');
  
  if (error) throw error;
  return data;
}

export async function getUniqueCities() {
  const { data, error } = await supabase
    .from('stores')
    .select('city')
    .order('city');
  
  if (error) throw error;
  return Array.from(new Set(data.map(row => row.city)));
}

export async function addStore(store: StoreInsert) {
  const { data, error } = await supabase
    .from('stores')
    .insert([store])
    .select()
    .single();
  
  if (error) throw error;
  return data;
}

export async function bulkAddStores(stores: StoreInsert[]) {
  // Deduplicate stores by store_code (keep last occurrence)
  const uniqueStores = Array.from(
    new Map(stores.map(store => [store.store_code, store])).values()
  );

  // Get existing store codes to check for duplicates
  const { data: existingStores, error: fetchError } = await supabase
    .from('stores')
    .select('store_code')
    .in('store_code', uniqueStores.map(s => s.store_code));

  if (fetchError) throw fetchError;

  // Separate stores into new and existing
  const existingCodes = new Set(existingStores?.map(s => s.store_code) || []);
  const newStores = uniqueStores.filter(store => !existingCodes.has(store.store_code));
  const existingStoresData = uniqueStores.filter(store => existingCodes.has(store.store_code));

  let allData = [];

  // Insert new stores
  if (newStores.length > 0) {
    const { data: insertedData, error: insertError } = await supabase
      .from('stores')
      .insert(newStores)
      .select();
    
    if (insertError) throw insertError;
    allData = allData.concat(insertedData || []);
  }

  // Update existing stores
  if (existingStoresData.length > 0) {
    for (const store of existingStoresData) {
      const { data: updatedData, error: updateError } = await supabase
        .from('stores')
        .update({
          city: store.city,
          store: store.store,
          address: store.address,
          poc: store.poc,
          poc_no: store.poc_no,
          priority: store.priority,
          site_readiness: store.site_readiness
        })
        .eq('store_code', store.store_code)
        .select();
      
      if (updateError) throw updateError;
      allData = allData.concat(updatedData || []);
    }
  }

  return allData;
}

export async function updateStore(id: string, store: StoreUpdate) {
  const { data, error } = await supabase
    .from('stores')
    .update(store)
    .eq('id', id)
    .select()
    .single();
  
  if (error) throw error;
  return data;
}

export async function deleteStore(id: string) {
  const { error } = await supabase
    .from('stores')
    .delete()
    .eq('id', id);
  
  if (error) throw error;
}