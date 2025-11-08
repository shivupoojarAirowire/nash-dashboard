import { supabase } from "./client";
// Lightweight typing fallback; your generated types file is empty currently
type InventoryInsert = {
  type: string;
  make: string;
  serial: string;
  in_use?: boolean | null;
  site?: string | null;
  arrival_date?: string | null; // ISO date
  assigned_date?: string | null; // ISO date
};

export async function getInventory() {
  try {
    const { data, error } = await supabase.from('inventory').select('*');
    if (error) throw error;
    return data;
  } catch (e) {
    console.warn('getInventory failed', e);
    return null;
  }
}

export async function addInventory(item: Omit<InventoryInsert, 'id' | 'created_at' | 'updated_at'>) {
  try {
  const { data, error } = await supabase.from('inventory').insert([item] as any).select('*');
    if (error) throw error;
    return data?.[0] ?? null;
  } catch (e) {
    console.warn('addInventory failed', e);
    return null;
  }
}

export async function addInventoryBulk(items: Array<Omit<InventoryInsert, 'id' | 'created_at' | 'updated_at'>>) {
  try {
  const { data, error } = await supabase.from('inventory').insert(items as any).select('*');
    if (error) throw error;
    return data ?? null;
  } catch (e) {
    console.warn('addInventoryBulk failed', e);
    return null;
  }
}
