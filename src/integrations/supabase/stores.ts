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
  // Normalize site_readiness to match DB constraint values
  const normalized = { ...store } as any;
  if (normalized.site_readiness) {
    const v = String(normalized.site_readiness).trim().toLowerCase();
    if (v === 'existing site' || v === 'existing' || v === 'ready') normalized.site_readiness = 'Existing site';
    else if (v === 'new site' || v === 'new' || v === 'not ready') normalized.site_readiness = 'New site';
    else normalized.site_readiness = normalized.site_readiness;
  }

  const { data, error } = await supabase
    .from('stores')
    .insert([normalized])
    .select()
    .single();
  
  if (error) throw error;
  return data;
}

export async function bulkAddStores(stores: StoreInsert[]) {
  // Normalize site_readiness values for bulk inserts
  const normalized = stores.map((s: any) => {
    const copy = { ...s } as any;
    if (copy.site_readiness) {
      const v = String(copy.site_readiness).trim().toLowerCase();
      if (v === 'existing site' || v === 'existing' || v === 'ready') copy.site_readiness = 'Existing site';
      else if (v === 'new site' || v === 'new' || v === 'not ready') copy.site_readiness = 'New site';
    }
    return copy;
  });

  const { data, error } = await supabase
    .from('stores')
    .insert(normalized)
    .select();
  
  if (error) throw error;
  return data;
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