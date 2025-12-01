import { supabase } from "./client";
// Lightweight typing fallback; your generated types file is empty currently
type InventoryInsert = {
  type: string;
  make: string;
  model?: string | null;
  serial: string;
  in_use?: boolean | null;
  store_code?: string | null;
  arrival_date?: string | null; // ISO date
  assigned_date?: string | null; // ISO date
};

export async function getInventory() {
  try {
    console.log('Fetching inventory from Supabase...');
    // Use maybeSingle: false to ensure we get all rows, and order by id to get consistent results
    const { data, error } = await supabase
      .from('inventory')
      .select('*')
      .order('id', { ascending: true });
    
    if (error) {
      console.error('getInventory error:', error);
      throw error;
    }
    
    console.log('Successfully fetched inventory:', data?.length, 'items');
    return data;
  } catch (e) {
    console.error('getInventory failed:', e);
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
    console.log('addInventoryBulk called with items:', items);
    const { data, error } = await supabase.from('inventory').insert(items as any).select('*');
    if (error) {
      console.error('Supabase insert error:', error);
      console.error('Error code:', error.code);
      console.error('Error message:', error.message);
      console.error('Error details:', error.details);
      console.error('Error hint:', error.hint);
      throw error;
    }
    console.log('Supabase insert success:', data);
    return data ?? null;
  } catch (e: any) {
    console.error('addInventoryBulk failed with exception:', e);
    console.error('Exception message:', e?.message);
    console.error('Exception stack:', e?.stack);
    return null;
  }
}
