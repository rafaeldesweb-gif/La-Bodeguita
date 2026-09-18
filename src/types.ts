export type Category = 'hamburguesas' | 'acompañantes' | 'bebidas';

export interface ExtraOption {
  id: string;
  name: string;
  price: number;
}

export interface MenuItem {
  id: string;
  name: string;
  description: string;
  price: number;
  category: Category;
  image: string;
  badge?: string;
  customizable: boolean;
  isFeatured?: boolean;
  prepTimeMinutes?: number;
  ingredients: string[];
  defaultRemovals: string[];
  availableExtras: ExtraOption[];
  availableSauces: string[];
}

export interface CartItemCustomization {
  removals: string[];
  extras: ExtraOption[];
  sauces: string[];
  notes: string;
}

export interface CartItem {
  cartId: string;
  item: MenuItem;
  customization: CartItemCustomization;
  unitPrice: number;
  quantity: number;
}

export const getCustomizationExtraTotal = (customization: CartItemCustomization) =>
  Array.isArray(customization?.extras) ? customization.extras.reduce((sum, extra) => sum + (extra?.price || 0), 0) : 0;

export const getCartItemLineTotal = (cartItem: CartItem) => {
  if (!cartItem) return 0;
  const basePrice = cartItem.unitPrice ?? cartItem.item?.price ?? 0;
  return (basePrice + getCustomizationExtraTotal(cartItem.customization)) * (cartItem.quantity || 1);
};

export const getOrderTotal = (items: CartItem[]) =>
  Array.isArray(items) ? items.reduce((sum, item) => sum + getCartItemLineTotal(item), 0) : 0;

export type OrderStatus = 'NUEVOS' | 'EN PREPARACIÓN' | 'LISTOS' | 'ENTREGADOS' | 'ARCHIVADOS';

export interface Order {
  id: string;
  createdAt: string;
  timestamp: number;
  type: 'Table' | 'Delivery' | 'Pickup';
  locationDetail: string;
  items: CartItem[];
  total: number;
  status: OrderStatus;
  customerName?: string;
}

export interface ChatMessage {
  id: string;
  sender: 'user' | 'bodebot';
  text: string;
  timestamp: string;
  suggestedItemIds?: string[];
}
