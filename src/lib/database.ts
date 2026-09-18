import { MenuItem, Order, OrderStatus } from '../types';
import { supabase } from './supabase';

type MenuRow = {
  id: string;
  name: string;
  description: string;
  price: number | string;
  category: MenuItem['category'];
  image: string;
  badge: string | null;
  customizable: boolean;
  is_featured: boolean;
  prep_time_minutes: number | null;
  ingredients: string[];
  default_removals: string[];
  available_extras: MenuItem['availableExtras'];
  available_sauces: string[];
};

const requireClient = () => {
  if (!supabase) throw new Error('Supabase no está configurado.');
  return supabase;
};

export async function fetchAdminEmail() {
  const { data, error } = await requireClient().from('app_settings').select('admin_email').eq('id', true).single();
  if (error) throw error;
  return data.admin_email as string;
}

export async function updateAdminEmail(adminEmail: string) {
  const { error } = await requireClient().from('app_settings').update({ admin_email: adminEmail.trim().toLowerCase() }).eq('id', true);
  if (error) throw error;
}

const toMenuItem = (row: MenuRow): MenuItem => ({
  id: row.id,
  name: row.name,
  description: row.description || '',
  price: Number(row.price) || 0,
  category: row.category,
  image: row.image || '',
  badge: row.badge ?? undefined,
  customizable: Boolean(row.customizable),
  isFeatured: Boolean(row.is_featured),
  prepTimeMinutes: row.prep_time_minutes ?? undefined,
  ingredients: Array.isArray(row.ingredients) ? row.ingredients : [],
  defaultRemovals: Array.isArray(row.default_removals) ? row.default_removals : [],
  availableExtras: Array.isArray(row.available_extras) ? row.available_extras : [],
  availableSauces: Array.isArray(row.available_sauces) ? row.available_sauces : [],
});

const toMenuRow = (item: MenuItem) => ({
  id: item.id,
  name: item.name,
  description: item.description,
  price: item.price,
  category: item.category,
  image: item.image,
  badge: item.badge ?? null,
  customizable: item.customizable,
  is_featured: Boolean(item.isFeatured),
  prep_time_minutes: item.prepTimeMinutes ?? null,
  ingredients: item.ingredients,
  default_removals: item.defaultRemovals,
  available_extras: item.availableExtras,
  available_sauces: item.availableSauces,
});

export async function fetchMenu(): Promise<MenuItem[]> {
  const { data, error } = await requireClient().from('menu_items').select('*').order('name');
  if (error) throw error;
  return (data as MenuRow[]).map(toMenuItem);
}

export async function saveMenuItem(item: MenuItem) {
  const { error } = await requireClient().from('menu_items').upsert(toMenuRow(item));
  if (error) throw error;
}

export async function removeMenuItem(id: string) {
  const { error } = await requireClient().from('menu_items').delete().eq('id', id);
  if (error) throw error;
}

export async function seedMenu(items: MenuItem[]) {
  const { error } = await requireClient().from('menu_items').upsert(items.map(toMenuRow));
  if (error) throw error;
}

type OrderRow = {
  id: string;
  customer_name: string | null;
  order_type: Order['type'];
  location_detail: string;
  items: Order['items'];
  total: number | string;
  status: OrderStatus;
  created_at: string;
};

const toOrder = (row: OrderRow): Order => ({
  id: row.id,
  customerName: row.customer_name ?? undefined,
  type: row.order_type,
  locationDetail: row.location_detail || 'Mesa',
  items: Array.isArray(row.items) ? row.items : [],
  total: Number(row.total) || 0,
  status: row.status,
  timestamp: row.created_at ? new Date(row.created_at).getTime() : Date.now(),
  createdAt: row.created_at ? new Date(row.created_at).toLocaleString('es-ES') : new Date().toLocaleString('es-ES'),
});

export async function fetchOrders() {
  const { data, error } = await requireClient().from('orders').select('*').order('created_at', { ascending: false });
  if (error) throw error;
  
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  return (data as OrderRow[]).map(toOrder).filter((o) => {
    if (['NUEVOS', 'EN PREPARACIÓN', 'LISTOS'].includes(o.status)) return true;
    return o.timestamp >= todayStart.getTime();
  });
}

export async function createOrder(order: Order, customerId: string) {
  const { data, error } = await requireClient()
    .from('orders')
    .insert({
      customer_id: customerId,
      customer_name: order.customerName ?? null,
      order_type: order.type,
      location_detail: order.locationDetail,
      items: order.items,
      total: order.total,
      status: order.status,
    })
    .select()
    .single();
  if (error) throw error;
  return toOrder(data as OrderRow);
}

export async function updateOrderStatus(id: string, status: OrderStatus) {
  const { data, error } = await requireClient()
    .from('orders')
    .update({ status })
    .eq('id', id)
    .select()
    .single();
  if (error) throw error;
  return toOrder(data as OrderRow);
}
