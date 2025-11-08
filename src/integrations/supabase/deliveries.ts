import { supabase } from './client';
import type { Database } from './types';

export type DeliveryRow = Database['public']['Tables']['deliveries']['Row'];
export type DeliveryInsert = Database['public']['Tables']['deliveries']['Insert'];
export type DeliveryUpdate = Database['public']['Tables']['deliveries']['Update'];

export async function getDeliveries() {
  const { data, error } = await supabase.from('deliveries').select('*').order('delivery_date', { ascending: true });
  if (error) throw error;
  return data as DeliveryRow[];
}

export async function getDeliveriesByStore(store: string) {
  const { data, error } = await supabase.from('deliveries').select('*').eq('store', store).order('delivery_date', { ascending: true });
  if (error) throw error;
  return data as DeliveryRow[];
}

export async function addDelivery(delivery: DeliveryInsert) {
  const { data, error } = await supabase.from('deliveries').insert([delivery]).select().single();
  if (error) throw error;
  return data as DeliveryRow;
}

export async function updateDelivery(id: string, updates: DeliveryUpdate) {
  const { data, error } = await supabase.from('deliveries').update(updates).eq('id', id).select().single();
  if (error) throw error;
  return data as DeliveryRow;
}

export async function deleteDelivery(id: string) {
  const { error } = await supabase.from('deliveries').delete().eq('id', id);
  if (error) throw error;
  return true;
}
