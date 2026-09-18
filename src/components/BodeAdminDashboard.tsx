import React, { useState, useMemo, useRef } from 'react';
import {
  LayoutDashboard,
  UtensilsCrossed,
  BookOpen,
  BarChart,
  Settings,
  Plus,
  Minus,
  CheckCircle,
  Clock,
  DollarSign,
  TrendingUp,
  X,
  Trash2,
  Pencil,
  Users,
  Printer,
  Mail,
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { Order, OrderStatus, MenuItem, getCartItemLineTotal, getCustomizationExtraTotal } from '../types';

interface BodeAdminDashboardProps {
  activeUser: {
    id: string;
    name: string;
    email: string;
    generatedKey: string;
    profileImage?: string;
  } | null;
  orders: Order[];
  onUpdateOrderStatus: (orderId: string, nextStatus: OrderStatus) => void;
  onClearDelivered?: () => void;
  onCreateManualOrder: (newOrder: Order) => void;
  menuItems: MenuItem[];
  onAddMenuItem: (newItem: MenuItem) => void;
  onUpdateMenuItem: (itemId: string, updatedItem: MenuItem) => void;
  onDeleteMenuItem: (itemId: string) => void;
  onUpdateMenuItemPrice: (itemId: string, newPrice: number) => void;
  onLogoutAdmin: () => void;
  onUpdateAdminProfile: (updates: { name?: string; email?: string; generatedKey?: string; profileImage?: string }) => void;
  allowedAdminEmail: string;
  onUpdateAllowedAdminEmail: (email: string) => Promise<boolean>;
  salesSummary: {
    date: string;
    totalSold: number;
    avgTicket: number;
    bestSellers: Array<{ name: string; units: number; revenue: number }>;
  };
  hasPendingOrders?: boolean;
  pendingOrdersMessage?: string;
}

const createBlankMenuItem = (): MenuItem => ({
  id: `product-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
  name: 'Nuevo producto',
  description: '',
  price: 0,
  category: 'hamburguesas',
  image: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?auto=format&fit=crop&q=80&w=800',
  badge: 'Nuevo',
  customizable: true,
  isFeatured: false,
  prepTimeMinutes: 12,
  ingredients: [''],
  defaultRemovals: [''],
  availableExtras: [],
  availableSauces: ['Salsa Bodeguita'],
});

const parseList = (value: string) =>
  value
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);

export const BodeAdminDashboard: React.FC<BodeAdminDashboardProps> = ({
  activeUser,
  orders,
  onUpdateOrderStatus,
  onClearDelivered,
  onCreateManualOrder,
  menuItems,
  onAddMenuItem,
  onUpdateMenuItem,
  onDeleteMenuItem,
  onUpdateMenuItemPrice,
  onLogoutAdmin,
  onUpdateAdminProfile,
  allowedAdminEmail,
  onUpdateAllowedAdminEmail,
  salesSummary,
  hasPendingOrders = false,
  pendingOrdersMessage,
}) => {
  const [activeAdminTab, setActiveAdminTab] = useState<'orders' | 'menu' | 'analytics' | 'team'>('orders');
  const [isNewOrderModalOpen, setIsNewOrderModalOpen] = useState<boolean>(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState<boolean>(false);
  const [showProfileKey, setShowProfileKey] = useState<boolean>(false);
  const [profileName, setProfileName] = useState(activeUser?.name ?? '');
  const [profileEmail, setProfileEmail] = useState(activeUser?.email ?? '');
  const [profileKey, setProfileKey] = useState(activeUser?.generatedKey ?? '');
  const [profileImage, setProfileImage] = useState(activeUser?.profileImage ?? 'https://lh3.googleusercontent.com/aida-public/AB6AXuDNQRzBdeueEkQYSdTu78GTRT16T9PWYPWLX8hBKoCOgkpDQHzN3Ufi-1QYon1UsJ4T3bqsnzGpAyBhGYJzdh3rOmXGm4Pofhf-M8UX-E8C8CzWolyjrVqcL2hHZcUQemfC9tiSDpS8YPPFTL6uqf718i6WjjVxGwnr8hiMw5fQQawTODJKokLVKrTUhpiYWNKy2_LG7vtVj4R55tM_byBnoyUs3WspYSud4WKqtC_WA11Ut7_Q0y37HQ');
  const [profileStatus, setProfileStatus] = useState<string>('');
  const [isMenuModalOpen, setIsMenuModalOpen] = useState<boolean>(false);
  const [menuFormMode, setMenuFormMode] = useState<'create' | 'edit'>('create');
  const [menuForm, setMenuForm] = useState<MenuItem>(createBlankMenuItem());
  const [menuFormIngredients, setMenuFormIngredients] = useState('');
  const [menuFormRemovals, setMenuFormRemovals] = useState('');
  const [menuFormSauces, setMenuFormSauces] = useState('');
  const [menuImageDraft, setMenuImageDraft] = useState<string | null>(null);
  const [menuImageCropOffset, setMenuImageCropOffset] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [menuCropDragging, setMenuCropDragging] = useState(false);
  const [menuCropDragOrigin, setMenuCropDragOrigin] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const menuCropRef = useRef<HTMLDivElement | null>(null);
  const menuFileInputRef = useRef<HTMLInputElement | null>(null);
  const [collapsedOrders, setCollapsedOrders] = useState<Record<string, boolean>>({});


  const orderFlow: OrderStatus[] = ['NUEVOS', 'EN PREPARACIÓN', 'LISTOS', 'ENTREGADOS'];

  const avanzarEstadoPedido = (orderId: string) => {
    const currentOrder = orders.find((order) => order.id === orderId);
    if (!currentOrder) return;

    const currentIndex = orderFlow.indexOf(currentOrder.status);
    const nextIndex = currentIndex < orderFlow.length - 1 ? currentIndex + 1 : currentIndex;
    onUpdateOrderStatus(orderId, orderFlow[nextIndex]);
  };

  const nuevosOrders = orders.filter((o) => o.status === 'NUEVOS');
  const prepOrders = orders.filter((o) => o.status === 'EN PREPARACIÓN');
  const listosOrders = orders.filter((o) => o.status === 'LISTOS');
  const entregadosOrdersAll = orders.filter((o) => o.status === 'ENTREGADOS' || o.status === 'ARCHIVADOS');
  const entregadosOrders = orders.filter((o) => o.status === 'ENTREGADOS');

  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  const entregadosHoy = entregadosOrdersAll.filter((order) => order.timestamp >= todayStart.getTime());
  const ticketSummaryOrders = entregadosHoy.length > 0 ? entregadosHoy : entregadosOrdersAll;
  const totalTodayOrders = ticketSummaryOrders.length;
  const avgTicket = ticketSummaryOrders.length > 0
    ? ticketSummaryOrders.reduce((sum, order) => sum + order.total, 0) / ticketSummaryOrders.length
    : 0;


  const [teamMembers, setTeamMembers] = useState<{ id: string; email: string; full_name: string; role: string }[]>([]);

  const fetchTeam = async () => {
    if (!supabase) return;
    const { data, error } = await supabase
      .from('profiles')
      .select('id, full_name, role');
    if (data && !error) setTeamMembers(data as any);
  };

  React.useEffect(() => {
    if (activeAdminTab === 'team') {
      fetchTeam();
    }
  }, [activeAdminTab]);

  const handleCreateOrder = (e: React.FormEvent) => {
    e.preventDefault();

    const selectedItem = menuItems.find((m) => m.id === selectedItemId);
    const currentDraftLine = selectedItem
      ? {
          id: `manual-line-${Date.now()}`,
          item: selectedItem,
          quantity: adminOrderQuantity,
          customization: {
            removals: [...adminSelectedRemovals],
            extras: adminSelectedExtras.map((extra) => ({ ...extra })),
            sauces: [...adminSelectedSauces],
            notes: adminOrderNotes.trim(),
          },
          unitPrice: selectedItem.price + adminSelectedExtras.reduce((acc, curr) => acc + curr.price, 0),
        }
      : null;
    const ticketLines = [...manualTicketItems, ...(currentDraftLine ? [currentDraftLine] : [])];

    if (ticketLines.length === 0) return;

    const totalPrice = ticketLines.reduce((sum, line) => sum + getCartItemLineTotal({
      cartId: line.id,
      item: line.item,
      customization: line.customization,
      unitPrice: line.unitPrice,
      quantity: line.quantity,
    }), 0);

    const newId = `#${Math.floor(1000 + Math.random() * 9000)}`;
    const newOrder: Order = {
      id: newId,
      createdAt: 'Ahora mismo',
      timestamp: Date.now(),
      type: tableOrDelivery,
      locationDetail: locationInput,
      status: 'NUEVOS',
      total: totalPrice,
      customerName: locationInput,
      items: ticketLines.map((line) => ({
        cartId: `manual-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        item: line.item,
        customization: line.customization,
        unitPrice: line.unitPrice,
        quantity: line.quantity,
      })),
    };

    onCreateManualOrder(newOrder);
    resetAdminOrderForm();
    setIsNewOrderModalOpen(false);
  };

  const openSettings = () => {
    if (!activeUser) return;
    setProfileName(activeUser.name);
    setProfileEmail(allowedAdminEmail);
    setProfileKey(activeUser.generatedKey);
    setShowProfileKey(false);
    setProfileStatus('');
    setIsSettingsOpen(true);
  };

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!activeUser) return;

    const cleanName = profileName.trim();
    const cleanEmail = profileEmail.trim();
    const cleanKey = profileKey.trim();

    const updates: { name?: string; email?: string; generatedKey?: string; profileImage?: string } = {};

    if (cleanName && cleanName !== activeUser.name) updates.name = cleanName;
    const hasAdminEmailChange = cleanEmail && cleanEmail !== allowedAdminEmail;
    if (cleanKey && cleanKey !== activeUser.generatedKey) updates.generatedKey = cleanKey;
    if (profileImage && profileImage !== activeUser.profileImage) updates.profileImage = profileImage;

    if (Object.keys(updates).length === 0 && !hasAdminEmailChange) {
      setProfileStatus('No has hecho cambios en la configuración.');
      return;
    }

    if (hasAdminEmailChange && !(await onUpdateAllowedAdminEmail(cleanEmail))) return;
    onUpdateAdminProfile(updates);
    setProfileStatus('Configuración guardada correctamente.');
    setIsSettingsOpen(false);
  };

  const handleProfileImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const dataUrl = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result));
        reader.onerror = () => reject(new Error('No se pudo leer la imagen.'));
        reader.readAsDataURL(file);
      });

      setProfileImage(dataUrl);
    } catch (error) {
      console.error(error);
    }
  };

  const normalizeMenuImage = async (dataUrl: string): Promise<string> => {
    const img = new Image();
    img.src = dataUrl;

    await new Promise<void>((resolve, reject) => {
      img.onload = () => resolve();
      img.onerror = () => reject(new Error('No se pudo procesar la imagen.'));
    });

    const outputSize = 1200;
    const canvas = document.createElement('canvas');
    canvas.width = outputSize;
    canvas.height = outputSize;

    const ctx = canvas.getContext('2d');
    if (!ctx) {
      return dataUrl;
    }

    const scale = Math.min(outputSize / img.width, outputSize / img.height);
    const drawWidth = img.width * scale;
    const drawHeight = img.height * scale;
    const offsetScale = outputSize / 100;
    const offsetX = (outputSize - drawWidth) / 2 + menuImageCropOffset.x * 0.4 * offsetScale;
    const offsetY = (outputSize - drawHeight) / 2 + menuImageCropOffset.y * 0.4 * offsetScale;

    ctx.fillStyle = '#0A0A0A';
    ctx.fillRect(0, 0, outputSize, outputSize);
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(img, offsetX, offsetY, drawWidth, drawHeight);

    return canvas.toDataURL('image/jpeg', 0.96);
  };

  const handleMenuImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const dataUrl = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result));
        reader.onerror = () => reject(new Error('No se pudo leer la imagen.'));
        reader.readAsDataURL(file);
      });

      setMenuImageDraft(dataUrl);
      setMenuImageCropOffset({ x: 0, y: 0 });
      event.target.value = '';
    } catch (error) {
      console.error(error);
    }
  };

  const applyMenuImageCrop = async () => {
    if (!menuImageDraft) return;

    try {
      const croppedDataUrl = await normalizeMenuImage(menuImageDraft);
      handleMenuFormChange('image', croppedDataUrl);
      setMenuImageDraft(null);
      setMenuImageCropOffset({ x: 0, y: 0 });
    } catch (error) {
      console.error(error);
      handleMenuFormChange('image', menuImageDraft);
      setMenuImageDraft(null);
    }
  };

  const openCreateMenuProduct = () => {
    setMenuForm(createBlankMenuItem());
    setMenuFormIngredients('');
    setMenuFormRemovals('');
    setMenuFormSauces('Salsa Bodeguita');
    setMenuImageDraft(null);
    setMenuImageCropOffset({ x: 0, y: 0 });
    setMenuFormMode('create');
    setIsMenuModalOpen(true);
  };

  const openEditMenuProduct = (item: MenuItem) => {
    setMenuForm({
      ...item,
      isFeatured: Boolean(item.isFeatured),
      prepTimeMinutes: item.prepTimeMinutes ?? 12,
      ingredients: item.ingredients.length ? [...item.ingredients] : [''],
      defaultRemovals: item.defaultRemovals.length ? [...item.defaultRemovals] : [''],
      availableExtras: item.availableExtras.length ? [...item.availableExtras] : [],
      availableSauces: item.availableSauces.length ? [...item.availableSauces] : [''],
    });
    setMenuFormIngredients(item.ingredients.join(', '));
    setMenuFormRemovals(item.defaultRemovals.join(', '));
    setMenuFormSauces(item.availableSauces.join(', '));
    setMenuImageDraft(null);
    setMenuImageCropOffset({ x: 0, y: 0 });
    setMenuFormMode('edit');
    setIsMenuModalOpen(true);
  };

  const handleMenuFormChange = (field: keyof MenuItem, value: string | number | boolean | string[]) => {
    setMenuForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleMenuExtrasChange = (index: number, field: 'name' | 'price', value: string) => {
    setMenuForm((prev) => ({
      ...prev,
      availableExtras: prev.availableExtras.map((extra, i) =>
        i === index
          ? { ...extra, [field]: field === 'price' ? Number(value) : value }
          : extra
      ),
    }));
  };

  const addMenuExtra = () => {
    setMenuForm((prev) => ({
      ...prev,
      availableExtras: [...prev.availableExtras, { id: `extra-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`, name: '', price: 0 }],
    }));
  };

  const removeMenuExtra = (index: number) => {
    setMenuForm((prev) => ({
      ...prev,
      availableExtras: prev.availableExtras.filter((_, i) => i !== index),
    }));
  };

  const handleMenuSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const cleanItem: MenuItem = {
      ...menuForm,
      name: menuForm.name.trim(),
      description: menuForm.description.trim(),
      badge: menuForm.badge?.trim() || undefined,
      price: Number(menuForm.price) || 0,
      isFeatured: Boolean(menuForm.isFeatured),
      prepTimeMinutes: Number(menuForm.prepTimeMinutes) || 0,
      ingredients: parseList(menuFormIngredients),
      defaultRemovals: parseList(menuFormRemovals),
      availableSauces: parseList(menuFormSauces),
      availableExtras: menuForm.availableExtras
        .filter((extra) => extra.name.trim())
        .map((extra) => ({
          id: extra.id || `extra-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`,
          name: extra.name.trim(),
          price: Number(extra.price) || 0,
        })),
    };

    if (!cleanItem.name || !cleanItem.description) {
      return;
    }

    if (menuFormMode === 'create') {
      onAddMenuItem({
        ...cleanItem,
        id: `product-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      });
    } else {
      onUpdateMenuItem(cleanItem.id, cleanItem);
    }

    setIsMenuModalOpen(false);
  };

  // New Order Form State
  const [tableOrDelivery, setTableOrDelivery] = useState<'Table' | 'Delivery' | 'Pickup'>('Table');
  const [locationInput, setLocationInput] = useState<string>('Mesa 5');
  const [selectedItemId, setSelectedItemId] = useState<string>(menuItems[0]?.id || '');
  const [adminOrderNotes, setAdminOrderNotes] = useState<string>('');
  const [adminSelectedRemovals, setAdminSelectedRemovals] = useState<string[]>([]);
  const [adminSelectedExtras, setAdminSelectedExtras] = useState<any[]>([]);
  const [adminSelectedSauces, setAdminSelectedSauces] = useState<string[]>([]);
  const [adminOrderQuantity, setAdminOrderQuantity] = useState<number>(1);
  const [manualTicketItems, setManualTicketItems] = useState<Array<{
    id: string;
    item: MenuItem;
    quantity: number;
    customization: { removals: string[]; extras: any[]; sauces: string[]; notes: string };
    unitPrice: number;
  }>>([]);

  const resetAdminOrderForm = () => {
    setTableOrDelivery('Table');
    setLocationInput('Mesa 5');
    setSelectedItemId(menuItems[0]?.id || '');
    setAdminOrderNotes('');
    setAdminSelectedRemovals([]);
    setAdminSelectedExtras([]);
    setAdminSelectedSauces([]);
    setAdminOrderQuantity(1);
    setManualTicketItems([]);
  };

  const [analyticsPeriod, setAnalyticsPeriod] = useState<'today' | '7d' | '30d' | 'all' | 'custom'>('today');
  const [analyticsGroup, setAnalyticsGroup] = useState<'date' | 'product' | 'table' | 'customer' | 'time'>('date');
  const [analyticsStartDate, setAnalyticsStartDate] = useState<string>(new Date().toISOString().slice(0, 10));
  const [analyticsEndDate, setAnalyticsEndDate] = useState<string>(new Date().toISOString().slice(0, 10));
  const [selectedReportDate, setSelectedReportDate] = useState<string | null>(null);

  const selectedReportData = useMemo(() => {
    if (!selectedReportDate) return null;
    
    const reportOrders = orders.filter((order) => {
        const label = new Date(order.timestamp).toLocaleDateString('es-ES', {
          day: '2-digit',
          month: '2-digit',
          year: 'numeric',
        });
        return label === selectedReportDate;
    });

    if (reportOrders.length === 0) return null;

    const totalSold = reportOrders.reduce((sum, order) => sum + (Array.isArray(order.items) ? order.items.reduce((orderSum, item) => orderSum + getCartItemLineTotal(item), 0) : 0), 0);
    const avgTicket = totalSold / reportOrders.length;
    
    let totalMesa = 0, totalDelivery = 0, totalLlevar = 0;
    let pedidosMesa = 0, pedidosDelivery = 0, pedidosLlevar = 0;
    const productMap = new Map<string, { name: string; units: number; revenue: number }>();

    reportOrders.forEach(order => {
       const oTotal = Array.isArray(order.items) ? order.items.reduce((orderSum, item) => orderSum + getCartItemLineTotal(item), 0) : 0;
       
       if (order.type === 'Table') { totalMesa += oTotal; pedidosMesa++; }
       else if (order.type === 'Delivery') { totalDelivery += oTotal; pedidosDelivery++; }
       else if (order.type === 'Pickup') { totalLlevar += oTotal; pedidosLlevar++; }

       if (Array.isArray(order.items)) {
         order.items.forEach(item => {
           if (!item?.item) return;
           const current = productMap.get(item.item.id) ?? { name: item.item.name || 'Desconocido', units: 0, revenue: 0 };
           current.units += (item.quantity || 1);
           current.revenue += getCartItemLineTotal(item);
           productMap.set(item.item.id, current);
         });
       }
    });

    const products = Array.from(productMap.values()).sort((a,b) => b.units - a.units || b.revenue - a.revenue);
    
    return {
       dateLabel: selectedReportDate,
       totalSold,
       avgTicket,
       totalOrders: reportOrders.length,
       totalMesa, pedidosMesa,
       totalDelivery, pedidosDelivery,
       totalLlevar, pedidosLlevar,
       products,
       bestSeller: products[0] ?? null
    };
  }, [selectedReportDate, orders]);

  const getTimeSlotLabel = (timestamp: number) => {
    const hours = new Date(timestamp).getHours();

    if (hours >= 8 && hours < 12) return 'Mañana 08:00-12:00';
    if (hours >= 12 && hours < 16) return 'Mediodía 12:00-16:00';
    if (hours >= 16 && hours < 20) return 'Tarde 16:00-20:00';
    return 'Noche 20:00-23:59';
  };

  const filteredAnalyticsOrders = useMemo(() => {
    const now = new Date();
    let startDate = new Date(0);
    let endDate = new Date(now.getTime());

    if (analyticsPeriod === 'today') {
      startDate = new Date(now);
      startDate.setHours(0, 0, 0, 0);
      endDate = new Date(now);
      endDate.setHours(23, 59, 59, 999);
    }

    if (analyticsPeriod === '7d') {
      startDate = new Date(now);
      startDate.setDate(now.getDate() - 6);
      startDate.setHours(0, 0, 0, 0);
      endDate = new Date(now);
      endDate.setHours(23, 59, 59, 999);
    }

    if (analyticsPeriod === '30d') {
      startDate = new Date(now);
      startDate.setDate(now.getDate() - 29);
      startDate.setHours(0, 0, 0, 0);
      endDate = new Date(now);
      endDate.setHours(23, 59, 59, 999);
    }

    if (analyticsPeriod === 'custom') {
      const customStart = new Date(`${analyticsStartDate}T00:00:00`);
      const customEnd = new Date(`${analyticsEndDate}T23:59:59`);
      startDate = customStart;
      endDate = customEnd;
    }

    return orders.filter((order) => {
      const ts = order.timestamp;
      return ts >= startDate.getTime() && ts <= endDate.getTime();
    });
  }, [analyticsPeriod, analyticsStartDate, analyticsEndDate, orders]);

  const analyticsSummary = useMemo(() => {
    const totalSold = filteredAnalyticsOrders.reduce((sum, order) => sum + (Array.isArray(order.items) ? order.items.reduce((orderSum, item) => orderSum + getCartItemLineTotal(item), 0) : 0), 0);
    const avgTicket = filteredAnalyticsOrders.length > 0 ? totalSold / filteredAnalyticsOrders.length : 0;

    const productMap = new Map<string, { name: string; units: number; revenue: number }>();

    filteredAnalyticsOrders.forEach((order) => {
      if (!Array.isArray(order.items)) return;
      order.items.forEach((item) => {
        if (!item?.item) return;
        const lineRevenue = getCartItemLineTotal(item);
        const current = productMap.get(item.item.id) ?? { name: item.item.name || 'Desconocido', units: 0, revenue: 0 };
        current.units += item.quantity || 1;
        current.revenue += lineRevenue;
        productMap.set(item.item.id, current);
      });
    });

    return {
      totalSold,
      avgTicket,
      bestSellers: [...productMap.values()].sort((a, b) => b.units - a.units || b.revenue - a.revenue),
      orderCount: filteredAnalyticsOrders.length,
    };
  }, [filteredAnalyticsOrders]);

  const analyticsRows = useMemo(() => {
    const rowMap = new Map<string, { label: string; total: number; count: number; units: number }>();

    const addRow = (key: string, label: string, total: number, count: number, units = 0) => {
      const existing = rowMap.get(key) ?? { label, total: 0, count: 0, units: 0 };
      existing.total += total;
      existing.count += count;
      existing.units += units;
      rowMap.set(key, existing);
    };

    if (analyticsGroup === 'date') {
      filteredAnalyticsOrders.forEach((order) => {
        const label = new Date(order.timestamp).toLocaleDateString('es-ES', {
          day: '2-digit',
          month: '2-digit',
          year: 'numeric',
        });
        addRow(label, label, order.total, 1, order.items.reduce((sum, item) => sum + item.quantity, 0));
      });
    }

    if (analyticsGroup === 'product') {
      filteredAnalyticsOrders.forEach((order) => {
        if (!Array.isArray(order.items)) return;
        order.items.forEach((item) => {
          if (!item?.item) return;
          const label = item.item.name || 'Desconocido';
          const total = getCartItemLineTotal(item);
          addRow(item.item.id, label, total, 1, item.quantity || 1);
        });
      });
    }

    if (analyticsGroup === 'table') {
      filteredAnalyticsOrders.forEach((order) => {
        const label = order.locationDetail || 'Sin ubicación';
        addRow(label, label, order.total, 1, order.items.reduce((sum, item) => sum + item.quantity, 0));
      });
    }

    if (analyticsGroup === 'customer') {
      filteredAnalyticsOrders.forEach((order) => {
        const label = order.customerName || order.locationDetail || 'Sin cliente';
        addRow(label, label, order.total, 1, order.items.reduce((sum, item) => sum + item.quantity, 0));
      });
    }

    if (analyticsGroup === 'time') {
      filteredAnalyticsOrders.forEach((order) => {
        const label = getTimeSlotLabel(order.timestamp);
        addRow(label, label, order.total, 1, order.items.reduce((sum, item) => sum + item.quantity, 0));
      });
    }

    return [...rowMap.values()]
      .map((row) => ({ ...row, avg: row.count > 0 ? row.total / row.count : 0 }))
      .sort((a, b) => b.total - a.total);
  }, [analyticsGroup, filteredAnalyticsOrders]);

  const maxAnalyticsValue = analyticsRows.length > 0 ? Math.max(...analyticsRows.map((row) => row.total)) : 1;

  return (
    <div className="flex flex-col md:flex-row min-h-screen bg-[#0A0A0A] text-[#E0E0E0]">
      {/* Administrador Sidebar */}
      <aside className="w-full md:w-64 bg-[#141414] border-r border-white/10 p-6 flex flex-col justify-between shrink-0">
        <div>
          {/* Header */}
          <div className="mb-8">
            <p className="text-[9px] uppercase tracking-[0.3em] text-white/40 mb-1">Panel de Control</p>
            <h1 className="font-bold text-2xl text-white tracking-tighter">
              ADMINISTRADOR
            </h1>
            <p className="text-[10px] font-mono text-emerald-400 mt-0.5">Terminal 01 // Online</p>
          </div>

          {/* User Avatar */}
          <div className="mb-8 flex items-center gap-3 p-3 bg-[#0A0A0A] rounded-xl border border-white/10">
            <div className="w-9 h-9 rounded-full bg-white/10 overflow-hidden border border-white/20">
              <img
                src={activeUser?.profileImage ?? 'https://lh3.googleusercontent.com/aida-public/AB6AXuDNQRzBdeueEkQYSdTu78GTRT16T9PWYPWLX8hBKoCOgkpDQHzN3Ufi-1QYon1UsJ4T3bqsnzGpAyBhGYJzdh3rOmXGm4Pofhf-M8UX-E8C8CzWolyjrVqcL2hHZcUQemfC9tiSDpS8YPPFTL6uqf718i6WjjVxGwnr8hiMw5fQQawTODJKokLVKrTUhpiYWNKy2_LG7vtVj4R55tM_byBnoyUs3WspYSud4WKqtC_WA11Ut7_Q0y37HQ'}
                alt="Admin"
                className="w-full h-full object-cover"
              />
            </div>
            <div>
              <p className="font-bold text-xs text-white">{activeUser?.name ?? 'Chef Operador'}</p>
              <span className="text-[9px] text-emerald-400 font-mono font-bold uppercase tracking-wider">● En Vivo</span>
            </div>
          </div>

          {/* Navigation Links */}
          <nav className="flex flex-col gap-1.5 font-medium text-xs">
            <button
              onClick={() => setActiveAdminTab('orders')}
              className={`flex items-center gap-3 p-3 rounded-xl transition-all text-left cursor-pointer uppercase tracking-wider ${
                activeAdminTab === 'orders'
                  ? 'bg-white text-black font-bold shadow-md'
                  : 'text-white/60 hover:text-white hover:bg-white/5'
              }`}
            >
              <UtensilsCrossed className="w-4 h-4" />
              Pedidos
            </button>

            <button
              onClick={() => setActiveAdminTab('menu')}
              className={`flex items-center gap-3 p-3 rounded-xl transition-all text-left cursor-pointer uppercase tracking-wider ${
                activeAdminTab === 'menu'
                  ? 'bg-white text-black font-bold shadow-md'
                  : 'text-white/60 hover:text-white hover:bg-white/5'
              }`}
            >
              <BookOpen className="w-4 h-4" />
              Gestión Menú
            </button>

            <button
              onClick={() => setActiveAdminTab('analytics')}
              className={`flex items-center gap-3 p-3 rounded-xl transition-all text-left cursor-pointer uppercase tracking-wider ${
                activeAdminTab === 'analytics'
                  ? 'bg-white text-black font-bold shadow-md'
                  : 'text-white/60 hover:text-white hover:bg-white/5'
              }`}
            >
              <BarChart className="w-4 h-4" />
              Estadísticas
            </button>

            {activeUser?.email === allowedAdminEmail && (
              <button
                onClick={() => setActiveAdminTab('team')}
                className={`flex items-center gap-3 p-3 rounded-xl transition-all text-left cursor-pointer uppercase tracking-wider ${
                  activeAdminTab === 'team'
                    ? 'bg-amber-500 text-black font-bold shadow-md'
                    : 'text-amber-500/60 hover:text-amber-400 hover:bg-amber-500/10'
                }`}
              >
                <Users className="w-4 h-4" />
                Equipo
              </button>
            )}
          </nav>
        </div>

        <div className="pt-6 border-t border-white/10 mt-6 space-y-2">
          <button
            type="button"
            onClick={openSettings}
            className="flex items-center gap-3 text-xs font-medium text-white/50 hover:text-white transition-colors cursor-pointer w-full p-2 uppercase tracking-wider"
          >
            <Settings className="w-4 h-4" />
            Configuración
          </button>
          <button
            type="button"
            onClick={onLogoutAdmin}
            disabled={hasPendingOrders}
            className={`flex items-center gap-3 text-xs font-medium w-full p-2 uppercase tracking-wider transition-colors ${
              hasPendingOrders
                ? 'text-red-500/60 cursor-not-allowed'
                : 'text-red-300 hover:text-red-200 cursor-pointer'
            }`}
          >
            <X className="w-4 h-4" />
            Cerrar sesión
          </button>
        </div>
      </aside>

      {/* Main Content Dashboard */}
      <main className="flex-1 p-6 md:p-10 overflow-x-auto bg-[#0A0A0A]">
        {/* Header Section */}
        <header className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4 mb-8 border-b border-white/10 pb-6">
          <div>
            <p className="text-[10px] uppercase tracking-[0.3em] text-white/40 mb-1">Panel de Cocina</p>
            <h2 className="font-bold text-3xl md:text-4xl text-white tracking-tighter">
              CONTROL DE PEDIDOS
            </h2>
            <p className="text-xs text-white/60 mt-1 font-light">
              Gestión en tiempo real del flujo de comensales y comanda.
            </p>
          </div>

          <div className="flex items-center gap-4 w-full sm:w-auto">
            <div className="hidden lg:flex gap-3">
              <div className="bg-[#141414] px-4 py-2.5 rounded-xl border border-white/10 flex flex-col">
                <span className="text-[9px] font-bold text-white/40 uppercase tracking-widest">
                  PEDIDOS HOY
                </span>
                <span className="font-mono font-bold text-lg text-white">{totalTodayOrders}</span>
              </div>

              <div className="bg-[#141414] px-4 py-2.5 rounded-xl border border-white/10 flex flex-col">
                <span className="text-[9px] font-bold text-white/40 uppercase tracking-widest">
                  TICKET PROMEDIO
                </span>
                <span className="font-mono font-bold text-lg text-emerald-400">${avgTicket.toFixed(2)}</span>
              </div>
            </div>

            <button
              onClick={() => setIsNewOrderModalOpen(true)}
              className="rounded-sm px-6 py-3.5 font-bold text-xs uppercase tracking-widest transition-all flex items-center justify-center gap-2 shadow-md w-full sm:w-auto bg-white text-black hover:bg-white/90 cursor-pointer active:scale-95"
            >
              <Plus className="w-4 h-4" />
              NUEVO PEDIDO
            </button>
          </div>
        </header>

        {hasPendingOrders && (
          <div className="mb-5 rounded-xl border border-amber-500/40 bg-amber-500/10 px-4 py-3 text-sm text-amber-100">
            <span className="font-bold uppercase tracking-[0.2em] text-amber-200">Acción requerida:</span>{' '}
            {pendingOrdersMessage || 'Hay tickets pendientes en una o varias columnas. Puedes seguir registrando pedidos manualmente, pero no puedes cerrar sesión mientras haya tickets activos.'}
          </div>
        )}

        {/* Tab 1: Orders Dashboard (Visual Read-Only) */}
        {activeAdminTab === 'orders' && (
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-6 min-h-[600px]">
            {[
              { key: 'NUEVOS', label: 'Nuevos', color: 'amber', orders: nuevosOrders, accent: 'bg-amber-500', border: 'border-amber-500/50' },
              { key: 'EN PREPARACIÓN', label: 'En preparación', color: 'blue', orders: prepOrders, accent: 'bg-blue-500', border: 'border-blue-500/50' },
              { key: 'LISTOS', label: 'Listos', color: 'purple', orders: listosOrders, accent: 'bg-purple-500', border: 'border-purple-500/50' },
              { key: 'ENTREGADOS', label: 'Entregados', color: 'emerald', orders: entregadosOrders, accent: 'bg-emerald-500', border: 'border-emerald-500/50' },
            ].map((column) => (
              <div key={column.key} className="bg-[#141414] rounded-2xl p-4 flex flex-col border border-white/10 shadow-sm overflow-hidden">
                <div className="flex justify-between items-center mb-4 pb-3 border-b border-white/10">
                  <h3 className="font-bold text-xs uppercase tracking-wider text-white flex items-center gap-2">
                    <div className={`w-2 h-2 rounded-full ${column.accent} shadow-[0_0_8px_rgba(255,255,255,0.2)]`} />
                    {column.key}
                  </h3>
                  <div className="flex items-center gap-2">
                    {column.key === 'ENTREGADOS' && column.orders.length > 0 && (
                      <button
                        type="button"
                        onClick={() => {
                          if (onClearDelivered) {
                            onClearDelivered();
                          } else {
                            column.orders.forEach((o) => onUpdateOrderStatus(o.id, 'ARCHIVADOS'));
                          }
                        }}
                        className="text-[9px] uppercase tracking-[0.18em] text-red-400 hover:text-red-300 border border-red-500/30 rounded-full px-2 py-1 bg-red-500/10 cursor-pointer"
                        title="Archivar Entregados"
                      >
                        Limpiar
                      </button>
                    )}
                    {column.orders.length > 0 && (() => {
                      const allCollapsed = column.orders.every(o => collapsedOrders[o.id]);
                      return (
                        <button
                          type="button"
                          onClick={() => {
                            const newCollapsedState = { ...collapsedOrders };
                            column.orders.forEach(o => {
                              newCollapsedState[o.id] = !allCollapsed;
                            });
                            setCollapsedOrders(newCollapsedState);
                          }}
                          className="text-[9px] uppercase tracking-[0.18em] text-white/60 hover:text-white border border-white/10 rounded-full px-2 py-1 bg-white/5 cursor-pointer"
                        >
                          {allCollapsed ? 'Expandir' : 'Contraer'}
                        </button>
                      );
                    })()}
                    <span className="bg-white/10 text-white font-mono font-bold text-xs px-2.5 py-0.5 rounded-full border border-white/10">
                      {column.orders.length}
                    </span>
                  </div>
                </div>

                <div className="flex-1 overflow-y-auto space-y-4 pr-1">
                  {column.orders.length === 0 ? (
                    <div className="bg-[#0A0A0A] border border-dashed border-white/10 rounded-xl p-6 text-center">
                      <p className="text-[10px] uppercase tracking-[0.25em] text-white/30">Sin pedidos</p>
                    </div>
                  ) : (
                    column.orders.map((order) => {
                      const isCollapsed = collapsedOrders[order.id] ?? false;

                      return (
                        <div
                          key={order.id}
                          onClick={() => avanzarEstadoPedido(order.id)}
                          onKeyDown={(event) => {
                            if (event.key === 'Enter' || event.key === ' ') {
                              event.preventDefault();
                              avanzarEstadoPedido(order.id);
                            }
                          }}
                          role="button"
                          tabIndex={0}
                          className="bg-[#0A0A0A] border border-white/10 rounded-2xl p-4 shadow-sm relative overflow-hidden cursor-pointer outline-none focus:ring-2 focus:ring-emerald-400/70"
                        >
                          <div className={`absolute top-0 left-0 w-1 h-full ${column.accent}`} />

                          <div className="flex items-start justify-between gap-2 mb-3 pl-2">
                            <div>
                              <p className="font-mono font-bold text-xl text-white">{order.id}</p>
                              <p className="text-[10px] uppercase tracking-[0.18em] text-white/40 mt-1">
                                {order.type === 'Table' ? 'Mesa' : order.type === 'Delivery' ? 'Delivery' : 'Para llevar'}
                              </p>
                            </div>

                            <button
                              type="button"
                              onClick={(event) => {
                                event.stopPropagation();
                                setCollapsedOrders((prev) => ({
                                  ...prev,
                                  [order.id]: !prev[order.id],
                                }));
                              }}
                              className="text-[9px] uppercase tracking-[0.18em] text-white/60 hover:text-white border border-white/10 rounded-full px-2 py-1 bg-white/5 cursor-pointer"
                            >
                              {isCollapsed ? 'Expandir' : 'Contraer'}
                            </button>
                          </div>

                          {!isCollapsed ? (
                            <>
                              <div className="pl-2 space-y-2 border-l border-white/10">
                                <div className="flex items-center justify-between gap-2">
                                  <span className="text-[10px] uppercase tracking-[0.2em] text-white/40">Cliente</span>
                                  <span className="text-sm font-bold text-white">{order.customerName ?? order.locationDetail}</span>
                                </div>

                                <div className="flex items-center justify-between gap-2">
                                  <span className="text-[10px] uppercase tracking-[0.2em] text-white/40">Lugar</span>
                                  <span className="text-xs text-white/75 font-mono text-right">{order.locationDetail}</span>
                                </div>

                                <div className="flex items-center justify-between gap-2">
                                  <span className="text-[10px] uppercase tracking-[0.2em] text-white/40">Estado</span>
                                  <span className={`text-[10px] font-bold uppercase tracking-[0.18em] px-2 py-1 rounded-full border ${column.border} ${column.accent} text-black`}>
                                    {column.key}
                                  </span>
                                </div>
                              </div>

                              <div className="mt-4 pl-2 pt-3 border-t border-white/10">
                                <p className="text-[10px] uppercase tracking-[0.2em] text-white/40 mb-2">Productos</p>
                                <ul className="space-y-1.5 text-xs text-white/80">
                                  {Array.isArray(order.items) && order.items.map((it) => (
                                    <li key={it?.cartId || Math.random()} className="flex items-start justify-between gap-3">
                                      <div className="flex-1">
                                        <span className="block">
                                          {it?.quantity || 1}x {it?.item?.name || 'Producto eliminado'}
                                        </span>
                                        {it?.customization?.removals && it.customization.removals.length > 0 && (
                                          <span className="block text-[10px] text-red-400 mt-0.5">
                                            - {it.customization.removals.join(', ')}
                                          </span>
                                        )}
                                        {it?.customization?.extras && it.customization.extras.length > 0 && (
                                          <span className="block text-[10px] text-emerald-400 mt-0.5">
                                            + {it.customization.extras.map((e) => e?.name).filter(Boolean).join(', ')}
                                          </span>
                                        )}
                                        {it?.customization?.sauces && it.customization.sauces.length > 0 && (
                                          <span className="block text-[10px] text-white/70 mt-0.5">
                                            🍯 {it.customization.sauces.join(', ')}
                                          </span>
                                        )}
                                      </div>
                                      <span className="font-mono text-white/60 flex-shrink-0">€{(it.unitPrice * it.quantity).toFixed(2)}</span>
                                    </li>
                                  ))}
                                </ul>
                              </div>

                              <div className="mt-4 pl-2 flex items-center justify-between border-t border-white/10 pt-3">
                                <span className="text-[10px] uppercase tracking-[0.2em] text-white/40">Total</span>
                                <span className="font-mono font-bold text-emerald-400">€{order.total.toFixed(2)}</span>
                              </div>
                            </>
                          ) : (
                            <div className="pl-2 pt-2 border-t border-white/10">
                              <div className="flex items-center justify-between gap-2">
                                <span className="text-[10px] text-white/40 uppercase tracking-[0.18em]">{order.customerName ?? order.locationDetail}</span>
                                <span className="font-mono text-emerald-400 text-sm">€{order.total.toFixed(2)}</span>
                              </div>
                              <p className="text-[10px] text-white/50 mt-2">Haz clic sobre la tarjeta para avanzar al siguiente estado.</p>
                            </div>
                          )}
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Tab 2: Menu Management */}
        {activeAdminTab === 'menu' && (
          <div className="space-y-6">
            <div className="bg-[#141414] rounded-2xl p-6 border border-white/10 shadow-sm">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-5">
                <div>
                  <p className="text-[10px] uppercase tracking-[0.25em] text-white/40">Catálogo</p>
                  <h3 className="font-bold text-xl text-white uppercase tracking-wider">Gestión de Menú</h3>
                </div>
                <button
                  type="button"
                  onClick={openCreateMenuProduct}
                  className="bg-white text-black font-bold text-xs uppercase tracking-widest py-3 px-5 rounded-sm hover:bg-white/90 cursor-pointer"
                >
                  + Nuevo producto
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                {menuItems.map((item) => (
                  <div
                    key={item.id}
                    className="rounded-2xl border border-white/10 bg-[#0A0A0A] p-3 overflow-hidden"
                  >
                    <img src={item.image} alt={item.name} className="h-32 w-full object-contain rounded-xl mb-3 border border-white/10 bg-[#0A0A0A]" />

                    <div className="flex items-start justify-between gap-3 mb-2">
                      <div>
                        <p className="font-bold text-white text-sm">{item.name}</p>
                        <p className="text-[10px] text-white/40 uppercase tracking-widest font-mono">{item.category}</p>
                      </div>
                      <div className="text-right">
                        <p className="font-mono font-bold text-emerald-400">€{item.price.toFixed(2)}</p>
                        <p className="text-[10px] text-white/40">{item.prepTimeMinutes ?? 12} min</p>
                      </div>
                    </div>

                    <p className="text-xs text-white/70 line-clamp-3 mb-3">{item.description}</p>

                    <div className="flex flex-wrap gap-2 mb-4">
                      {item.ingredients.slice(0, 3).map((ingredient) => (
                        <span key={ingredient} className="text-[10px] rounded-full border border-white/10 bg-white/5 px-2 py-1 text-white/60">
                          {ingredient}
                        </span>
                      ))}
                    </div>

                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => openEditMenuProduct(item)}
                        className="flex-1 bg-white/10 border border-white/10 text-white hover:bg-white hover:text-black rounded-sm px-3 py-2 text-[10px] uppercase tracking-widest cursor-pointer"
                      >
                        <span className="inline-flex items-center gap-1"><Pencil className="w-3 h-3" /> Editar</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => onDeleteMenuItem(item.id)}
                        className="flex-1 bg-red-500/10 border border-red-500/30 text-red-200 hover:bg-red-500 hover:text-white rounded-sm px-3 py-2 text-[10px] uppercase tracking-widest cursor-pointer"
                      >
                        <span className="inline-flex items-center gap-1"><Trash2 className="w-3 h-3" /> Eliminar</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Tab 3: Analytics */}
        {activeAdminTab === 'analytics' && (
          <div className="space-y-6">
            <div className="bg-[#141414] rounded-2xl border border-white/10 p-5 shadow-sm">
              <div className="flex flex-col lg:flex-row lg:items-end gap-4 justify-between mb-5">
                <div>
                  <p className="text-[10px] uppercase tracking-[0.25em] text-white/40">Dashboard financiero</p>
                  <h3 className="mt-1 text-xl font-bold text-white">Estadísticas por fecha y dimensión</h3>
                </div>

                <div className="flex flex-col md:flex-row gap-3">
                  <select
                    value={analyticsPeriod}
                    onChange={(e) => setAnalyticsPeriod(e.target.value as 'today' | '7d' | '30d' | 'all' | 'custom')}
                    className="rounded-xl border border-white/10 bg-[#0A0A0A] px-3 py-2 text-xs text-white outline-none"
                  >
                    <option value="today">Hoy</option>
                    <option value="7d">Últimos 7 días</option>
                    <option value="30d">Últimos 30 días</option>
                    <option value="all">Todo</option>
                    <option value="custom">Personalizado</option>
                  </select>

                  {analyticsPeriod === 'custom' && (
                    <>
                      <input
                        type="date"
                        value={analyticsStartDate}
                        onChange={(e) => setAnalyticsStartDate(e.target.value)}
                        className="rounded-xl border border-white/10 bg-[#0A0A0A] px-3 py-2 text-xs text-white outline-none"
                      />
                      <input
                        type="date"
                        value={analyticsEndDate}
                        onChange={(e) => setAnalyticsEndDate(e.target.value)}
                        className="rounded-xl border border-white/10 bg-[#0A0A0A] px-3 py-2 text-xs text-white outline-none"
                      />
                    </>
                  )}
                </div>
              </div>

              <div className="flex flex-wrap gap-2 mb-5">
                {[
                  { key: 'date', label: 'Fecha' },
                  { key: 'product', label: 'Producto' },
                  { key: 'table', label: 'Mesa' },
                  { key: 'customer', label: 'Cliente' },
                  { key: 'time', label: 'Tramo horario' },
                ].map((option) => (
                  <button
                    key={option.key}
                    type="button"
                    onClick={() => setAnalyticsGroup(option.key as 'date' | 'product' | 'table' | 'customer' | 'time')}
                    className={`px-3 py-2 rounded-full text-[10px] font-bold uppercase tracking-[0.2em] transition-all ${
                      analyticsGroup === option.key
                        ? 'bg-white text-black'
                        : 'bg-white/5 text-white/60 hover:text-white hover:bg-white/10'
                    }`}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-[#141414] p-6 rounded-2xl border border-white/10 shadow-sm flex flex-col gap-2">
                <span className="text-[10px] font-bold text-white/40 uppercase tracking-widest">Total vendido</span>
                <span className="text-3xl font-mono font-extrabold text-emerald-400">€{analyticsSummary.totalSold.toFixed(2)}</span>
                <span className="text-xs text-white/50 font-mono">
                  {filteredAnalyticsOrders.length > 0
                    ? `${filteredAnalyticsOrders.length} pedidos en el rango`
                    : 'Sin pedidos'}
                </span>
              </div>

              <div className="bg-[#141414] p-6 rounded-2xl border border-white/10 shadow-sm flex flex-col gap-2">
                <span className="text-[10px] font-bold text-white/40 uppercase tracking-widest">Ticket promedio</span>
                <span className="text-3xl font-mono font-extrabold text-white">€{analyticsSummary.avgTicket.toFixed(2)}</span>
                <span className="text-xs text-emerald-400 font-bold flex items-center gap-1 mt-1">
                  <TrendingUp className="w-3.5 h-3.5" /> Promedio del período
                </span>
              </div>

              <div className="bg-[#141414] p-6 rounded-2xl border border-white/10 shadow-sm flex flex-col gap-2">
                <span className="text-[10px] font-bold text-white/40 uppercase tracking-widest">Más vendido</span>
                <span className="text-2xl font-bold text-white">
                  {analyticsSummary.bestSellers[0]?.name ?? 'Sin ventas'}
                </span>
                <span className="text-xs text-white/50 font-mono">
                  {analyticsSummary.bestSellers[0] ? `${analyticsSummary.bestSellers[0].units} unidades` : 'Sin datos'}
                </span>
              </div>
            </div>

            <div className="bg-[#141414] p-6 rounded-2xl border border-white/10 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <span className="text-[10px] font-bold text-white/40 uppercase tracking-widest">
                  Clasificación por {analyticsGroup === 'date' ? 'fecha' : analyticsGroup === 'product' ? 'producto' : analyticsGroup === 'table' ? 'mesa' : analyticsGroup === 'customer' ? 'cliente' : 'tramo horario'}
                </span>
                <span className="text-[10px] text-white/50 font-mono">
                  {filteredAnalyticsOrders.length} ventas
                </span>
              </div>

              <div className="space-y-3">
                {analyticsRows.length === 0 ? (
                  <p className="text-sm text-white/50">No hay datos para este rango de fechas.</p>
                ) : (
                  analyticsRows.map((row, index) => (
                    <div 
                      key={`${row.label}-${index}`} 
                      className={`rounded-xl border border-white/10 bg-[#0A0A0A] p-3 transition-colors ${analyticsGroup === 'date' ? 'cursor-pointer hover:border-emerald-500/50 hover:bg-emerald-500/5' : ''}`}
                      onClick={() => {
                        if (analyticsGroup === 'date') {
                          setSelectedReportDate(row.label);
                        }
                      }}
                    >
                      <div className="flex items-center justify-between gap-3 mb-2">
                        <div>
                          <p className={`text-sm font-bold ${analyticsGroup === 'date' ? 'text-emerald-400' : 'text-white'}`}>{row.label}</p>
                          <p className="text-[10px] text-white/50 font-mono">
                            {row.count} pedidos • {row.units} uds
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-mono font-bold text-emerald-400">€{row.total.toFixed(2)}</p>
                          <p className="text-[10px] text-white/50 font-mono">Media €{row.avg.toFixed(2)}</p>
                        </div>
                      </div>

                      <div className="h-2 w-full rounded-full bg-white/5 overflow-hidden">
                        <div
                          className="h-full rounded-full bg-gradient-to-r from-emerald-400 to-emerald-200"
                          style={{ width: `${(row.total / maxAnalyticsValue) * 100}%` }}
                        />
                      </div>
                      
                      {analyticsGroup === 'date' && (
                        <p className="text-[9px] text-emerald-500/70 mt-3 font-medium uppercase tracking-widest text-center">Click para ver informe detallado</p>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        )}

        {/* Tab 4: Team */}
        {activeAdminTab === 'team' && activeUser?.email === allowedAdminEmail && (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
            <div className="bg-[#141414] rounded-2xl border border-white/10 p-5 shadow-sm">
              <h3 className="font-bold text-xs uppercase tracking-wider text-white mb-4">
                Gestión de Personal
              </h3>
              
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm text-white">
                  <thead className="bg-[#0A0A0A] text-[10px] uppercase tracking-wider text-white/50">
                    <tr>
                      <th className="p-4 rounded-tl-xl">Nombre</th>
                      <th className="p-4">Estado / Rol</th>
                      <th className="p-4 text-right rounded-tr-xl">Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {teamMembers.map((member) => (
                      <tr key={member.id} className="border-b border-white/5 last:border-0 hover:bg-white/5">
                        <td className="p-4 font-medium">{member.full_name || 'Usuario'}</td>
                        <td className="p-4">
                          <span className={`px-2 py-1 rounded-full text-[10px] border font-bold tracking-wider ${
                            member.role === 'admin' 
                              ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' 
                              : 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                          }`}>
                            {member.role === 'admin' ? 'ADMINISTRADOR' : 'PENDIENTE / CLIENTE'}
                          </span>
                        </td>
                        <td className="p-4 text-right">
                          {member.role !== 'admin' && (
                            <button
                              onClick={async () => {
                                if (!supabase) return;
                                const { error } = await supabase
                                  .from('profiles')
                                  .update({ role: 'admin' })
                                  .eq('id', member.id);
                                if (!error) {
                                  alert('Usuario aprobado con éxito.');
                                  fetchTeam();
                                } else {
                                  alert('Error al aprobar: ' + error.message);
                                }
                              }}
                              className="px-4 py-2 bg-white text-black text-[10px] font-bold uppercase tracking-wider rounded-lg hover:bg-gray-200 transition-colors"
                            >
                              Aprobar
                            </button>
                          )}
                          {member.role === 'admin' && (
                            <button
                              onClick={async () => {
                                if (!supabase) return;
                                const { error } = await supabase
                                  .from('profiles')
                                  .update({ role: 'customer' })
                                  .eq('id', member.id);
                                if (!error) {
                                  alert('Permisos revocados.');
                                  fetchTeam();
                                } else {
                                  alert('Error: ' + error.message);
                                }
                              }}
                              className="px-4 py-2 bg-red-500/10 text-red-500 text-[10px] font-bold uppercase tracking-wider rounded-lg hover:bg-red-500/20 transition-colors cursor-pointer ml-2"
                            >
                              Revocar
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                    {teamMembers.length === 0 && (
                      <tr>
                        <td colSpan={3} className="p-8 text-center text-white/40 text-sm">
                          No hay usuarios registrados.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </main>

      {isSettingsOpen && activeUser && (
        <div className="fixed inset-0 z-[120] bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-[#141414] border border-white/10 rounded-2xl p-6 shadow-2xl">
            <div className="flex items-center justify-between mb-5">
              <div>
                <p className="text-[10px] uppercase tracking-[0.25em] text-white/40">Cuenta</p>
                <h3 className="text-xl font-bold text-white">Configuración de acceso</h3>
              </div>
              <button
                type="button"
                onClick={() => setIsSettingsOpen(false)}
                className="text-white/60 hover:text-white cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleUpdateProfile} className="space-y-4">
              <div className="flex items-center gap-4 mb-3">
                <img
                  src={profileImage}
                  alt="Perfil"
                  className="w-16 h-16 rounded-full object-cover border border-white/10 bg-[#0A0A0A]"
                />
                <label className="flex-1 cursor-pointer rounded-xl border border-dashed border-white/20 bg-[#0A0A0A] px-3 py-2 text-center text-[10px] uppercase tracking-[0.2em] text-white/70 hover:border-white/40 hover:text-white">
                  Subir foto
                  <input type="file" accept="image/*" className="hidden" onChange={handleProfileImageUpload} />
                </label>
              </div>

              <div>
                <label className="block text-[10px] uppercase tracking-[0.25em] text-white/40 mb-2">Nombre</label>
                <input
                  type="text"
                  value={profileName}
                  onChange={(e) => setProfileName(e.target.value)}
                  className="w-full p-3 rounded-xl border border-white/10 bg-[#0A0A0A] text-white outline-none focus:border-white/30"
                />
              </div>

              <div>
                <label className="block text-[10px] uppercase tracking-[0.25em] text-white/40 mb-2">Correo autorizado para Control de pedidos</label>
                <input
                  type="email"
                  value={profileEmail}
                  onChange={(e) => setProfileEmail(e.target.value)}
                  className="w-full p-3 rounded-xl border border-white/10 bg-[#0A0A0A] text-white outline-none focus:border-white/30"
                />
              </div>

              <div>
                <label className="block text-[10px] uppercase tracking-[0.25em] text-white/40 mb-2">Nueva clave</label>
                <div className="relative">
                  <input
                    type={showProfileKey ? 'text' : 'password'}
                    value={profileKey}
                    onChange={(e) => setProfileKey(e.target.value)}
                    className="w-full p-3 pr-12 rounded-xl border border-white/10 bg-[#0A0A0A] text-white outline-none focus:border-white/30"
                  />
                  <button
                    type="button"
                    onClick={() => setShowProfileKey((prev) => !prev)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] uppercase tracking-[0.2em] text-white/60 hover:text-white cursor-pointer"
                  >
                    {showProfileKey ? 'Ocultar' : 'Ver'}
                  </button>
                </div>
              </div>

              {profileStatus && (
                <p className="text-[11px] text-amber-300">{profileStatus}</p>
              )}

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsSettingsOpen(false)}
                  className="flex-1 bg-transparent border border-white/10 text-white/70 hover:text-white rounded-sm px-4 py-3 text-xs uppercase tracking-widest cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex-1 bg-white text-black font-bold text-xs uppercase tracking-widest py-3 rounded-sm hover:bg-white/90 transition-all cursor-pointer"
                >
                  Guardar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {isMenuModalOpen && (
        <div className="fixed inset-0 z-[120] bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-3xl max-h-[90vh] overflow-y-auto bg-[#141414] border border-white/10 rounded-2xl p-6 shadow-2xl">
            <div className="flex items-center justify-between mb-5">
              <div>
                <p className="text-[10px] uppercase tracking-[0.25em] text-white/40">Catálogo</p>
                <h3 className="text-xl font-bold text-white">
                  {menuFormMode === 'create' ? 'Nuevo producto' : 'Editar producto'}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsMenuModalOpen(false)}
                className="text-white/60 hover:text-white cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleMenuSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] uppercase tracking-[0.25em] text-white/40 mb-2">Nombre</label>
                  <input
                    type="text"
                    value={menuForm.name}
                    onChange={(e) => handleMenuFormChange('name', e.target.value)}
                    className="w-full p-3 rounded-xl border border-white/10 bg-[#0A0A0A] text-white outline-none focus:border-white/30"
                  />
                </div>

                <div>
                  <label className="block text-[10px] uppercase tracking-[0.25em] text-white/40 mb-2">Precio</label>
                  <input
                    type="number"
                    step="0.01"
                    value={menuForm.price}
                    onChange={(e) => handleMenuFormChange('price', Number(e.target.value))}
                    className="w-full p-3 rounded-xl border border-white/10 bg-[#0A0A0A] text-white outline-none focus:border-white/30"
                  />
                </div>

                <div>
                  <label className="block text-[10px] uppercase tracking-[0.25em] text-white/40 mb-2">Categoría</label>
                  <select
                    value={menuForm.category}
                    onChange={(e) => handleMenuFormChange('category', e.target.value as MenuItem['category'])}
                    className="w-full p-3 rounded-xl border border-white/10 bg-[#0A0A0A] text-white outline-none focus:border-white/30"
                  >
                    <option value="hamburguesas">Hamburguesas</option>
                    <option value="acompañantes">Acompañantes</option>
                    <option value="bebidas">Bebidas</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] uppercase tracking-[0.25em] text-white/40 mb-2">Tiempo estimado (min)</label>
                  <input
                    type="number"
                    min={1}
                    value={menuForm.prepTimeMinutes ?? 12}
                    onChange={(e) => handleMenuFormChange('prepTimeMinutes', Number(e.target.value))}
                    className="w-full p-3 rounded-xl border border-white/10 bg-[#0A0A0A] text-white outline-none focus:border-white/30"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-[10px] uppercase tracking-[0.25em] text-white/40 mb-2">Descripción</label>
                  <textarea
                    value={menuForm.description}
                    onChange={(e) => handleMenuFormChange('description', e.target.value)}
                    rows={3}
                    className="w-full p-3 rounded-xl border border-white/10 bg-[#0A0A0A] text-white outline-none focus:border-white/30"
                  />
                </div>

                <div>
                  <label className="block text-[10px] uppercase tracking-[0.25em] text-white/40 mb-2">Etiqueta</label>
                  <input
                    type="text"
                    value={menuForm.badge ?? ''}
                    onChange={(e) => handleMenuFormChange('badge', e.target.value)}
                    className="w-full p-3 rounded-xl border border-white/10 bg-[#0A0A0A] text-white outline-none focus:border-white/30"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-[10px] uppercase tracking-[0.25em] text-white/40 mb-2">Imagen del producto</label>
                  <div className="space-y-3">
                    {menuImageDraft ? (
                      <div className="space-y-3">
                        <div
                          ref={menuCropRef}
                          className="relative w-[100px] h-[100px] overflow-hidden rounded-2xl border border-white/10 bg-[#0A0A0A] mx-auto cursor-grab active:cursor-grabbing"
                          onPointerDown={(event) => {
                            setMenuCropDragging(true);
                            setMenuCropDragOrigin({ x: event.clientX, y: event.clientY });
                            event.currentTarget.setPointerCapture(event.pointerId);
                          }}
                          onPointerMove={(event) => {
                            if (!menuCropDragging) return;
                            const deltaX = event.clientX - menuCropDragOrigin.x;
                            const deltaY = event.clientY - menuCropDragOrigin.y;
                            setMenuCropDragOrigin({ x: event.clientX, y: event.clientY });
                            setMenuImageCropOffset((prev) => ({ x: prev.x + deltaX, y: prev.y + deltaY }));
                          }}
                          onPointerUp={(event) => {
                            setMenuCropDragging(false);
                            event.currentTarget.releasePointerCapture(event.pointerId);
                          }}
                          onPointerLeave={() => setMenuCropDragging(false)}
                        >
                          <div className="absolute inset-0">
                            <img
                              src={menuImageDraft}
                              alt="Previsualización para recorte"
                              className="h-full w-full object-contain bg-[#0A0A0A] pointer-events-none select-none"
                              style={{ transform: `translate(${menuImageCropOffset.x}px, ${menuImageCropOffset.y}px)` }}
                            />
                          </div>

                          <div className="absolute inset-0 rounded-2xl ring-2 ring-white/90 ring-inset" />
                        </div>

                        <div className="flex flex-col sm:flex-row gap-3">
                          <button
                            type="button"
                            onClick={() => setMenuImageDraft(null)}
                            className="flex-1 rounded-xl border border-white/10 bg-transparent px-4 py-3 text-[10px] uppercase tracking-[0.2em] text-white/70 hover:text-white"
                          >
                            Cancelar
                          </button>
                          <button
                            type="button"
                            onClick={applyMenuImageCrop}
                            className="flex-1 rounded-xl bg-white px-4 py-3 text-[10px] uppercase tracking-[0.2em] text-black font-bold"
                          >
                            Usar imagen 100x100
                          </button>
                        </div>
                      </div>
                    ) : (
                      <>
                        <div className="relative w-[100px] h-[100px] overflow-hidden rounded-2xl border border-white/10 bg-[#0A0A0A] mx-auto">
                          <img src={menuForm.image} alt={menuForm.name} className="h-full w-full object-contain bg-[#0A0A0A]" />
                        </div>

                        <div className="flex flex-col md:flex-row gap-3 items-stretch">
                          <button
                            type="button"
                            onClick={() => menuFileInputRef.current?.click()}
                            className="w-full min-w-0 cursor-pointer rounded-xl border border-dashed border-white/20 bg-[#0A0A0A] px-3 py-3 text-center text-[10px] uppercase tracking-[0.2em] text-white/70 hover:border-white/40 hover:text-white"
                          >
                            Subir foto
                          </button>

                          <input
                            ref={menuFileInputRef}
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={handleMenuImageUpload}
                          />
                        </div>

                        <input
                          type="url"
                          value={menuForm.image}
                          onChange={(e) => handleMenuFormChange('image', e.target.value)}
                          className="w-full p-3 rounded-xl border border-white/10 bg-[#0A0A0A] text-white outline-none focus:border-white/30"
                          placeholder="O pega la URL aquí"
                        />
                      </>
                    )}
                  </div>
                </div>

                {menuForm.category !== 'bebidas' && (
                  <>
                    <div className="md:col-span-2">
                      <label className="block text-[10px] uppercase tracking-[0.25em] text-white/40 mb-2">Ingredientes</label>
                      <textarea
                        value={menuFormIngredients}
                        onChange={(e) => setMenuFormIngredients(e.target.value)}
                        rows={2}
                        className="w-full p-3 rounded-xl border border-white/10 bg-[#0A0A0A] text-white outline-none focus:border-white/30"
                      />
                    </div>

                    <div className="md:col-span-2">
                      <label className="block text-[10px] uppercase tracking-[0.25em] text-white/40 mb-2">Qué se puede quitar</label>
                      <textarea
                        value={menuFormRemovals}
                        onChange={(e) => setMenuFormRemovals(e.target.value)}
                        rows={2}
                        className="w-full p-3 rounded-xl border border-white/10 bg-[#0A0A0A] text-white outline-none focus:border-white/30"
                      />
                    </div>

                    <div className="md:col-span-2">
                      <label className="block text-[10px] uppercase tracking-[0.25em] text-white/40 mb-2">Salsas disponibles</label>
                      <textarea
                        value={menuFormSauces}
                        onChange={(e) => setMenuFormSauces(e.target.value)}
                        rows={2}
                        className="w-full p-3 rounded-xl border border-white/10 bg-[#0A0A0A] text-white outline-none focus:border-white/30"
                      />
                    </div>

                    <div className="md:col-span-2">
                      <div className="flex items-center justify-between mb-2">
                        <label className="block text-[10px] uppercase tracking-[0.25em] text-white/40">Extras disponibles</label>
                        <button
                          type="button"
                          onClick={addMenuExtra}
                          className="text-[10px] uppercase tracking-[0.2em] text-white/70 hover:text-white cursor-pointer"
                        >
                          + Añadir extra
                        </button>
                      </div>

                      <div className="space-y-3">
                        {menuForm.availableExtras.length === 0 ? (
                          <p className="text-xs text-white/40">Sin extras configurados.</p>
                        ) : (
                          menuForm.availableExtras.map((extra, index) => (
                            <div key={extra.id || index} className="grid grid-cols-1 md:grid-cols-[1.4fr_0.8fr_auto] gap-2 items-center">
                              <input
                                type="text"
                                value={extra.name}
                                onChange={(e) => handleMenuExtrasChange(index, 'name', e.target.value)}
                                placeholder="Nombre del extra"
                                className="w-full p-3 rounded-xl border border-white/10 bg-[#0A0A0A] text-white outline-none focus:border-white/30"
                              />
                              <input
                                type="number"
                                step="0.01"
                                value={extra.price}
                                onChange={(e) => handleMenuExtrasChange(index, 'price', e.target.value)}
                                placeholder="Precio"
                                className="w-full p-3 rounded-xl border border-white/10 bg-[#0A0A0A] text-white outline-none focus:border-white/30"
                              />
                              <button
                                type="button"
                                onClick={() => removeMenuExtra(index)}
                                className="text-red-300 hover:text-red-200 cursor-pointer"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  </>
                )}
              </div>

              <div className="flex gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => setIsMenuModalOpen(false)}
                  className="flex-1 bg-transparent border border-white/10 text-white/70 hover:text-white rounded-sm px-4 py-3 text-xs uppercase tracking-widest cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex-1 bg-white text-black font-bold text-xs uppercase tracking-widest py-3 rounded-sm hover:bg-white/90 transition-all cursor-pointer"
                >
                  Guardar producto
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* New Order Modal */}
      {isNewOrderModalOpen && (() => {
        const selectedItem = menuItems.find((m) => m.id === selectedItemId);
        const extrasTotal = adminSelectedExtras.reduce((acc, curr) => acc + curr.price, 0);
        const unitPrice = selectedItem ? selectedItem.price + extrasTotal : 0;
        const draftLineTotal = unitPrice * adminOrderQuantity;
        const ticketTotal = manualTicketItems.reduce((acc, item) => acc + item.unitPrice * item.quantity, 0);

        const toggleRemoval = (removal: string) => {
          setAdminSelectedRemovals((prev) =>
            prev.includes(removal) ? prev.filter((r) => r !== removal) : [...prev, removal]
          );
        };

        const toggleExtra = (extra: any) => {
          setAdminSelectedExtras((prev) =>
            prev.some((e) => e.id === extra.id)
              ? prev.filter((e) => e.id !== extra.id)
              : [...prev, extra]
          );
        };

        const toggleSauce = (sauce: string) => {
          setAdminSelectedSauces((prev) =>
            prev.includes(sauce) ? prev.filter((s) => s !== sauce) : [...prev, sauce]
          );
        };

        const buildDraftLine = () => {
          if (!selectedItem) return null;

          return {
            id: `ticket-line-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
            item: selectedItem,
            quantity: adminOrderQuantity,
            customization: {
              removals: [...adminSelectedRemovals],
              extras: adminSelectedExtras.map((extra) => ({ ...extra })),
              sauces: [...adminSelectedSauces],
              notes: adminOrderNotes.trim(),
            },
            unitPrice: selectedItem.price + extrasTotal,
          };
        };

        const addCurrentSelectionToTicket = () => {
          const draftLine = buildDraftLine();
          if (!draftLine) return;

          setManualTicketItems((prev) => [...prev, draftLine]);
          setAdminSelectedRemovals([]);
          setAdminSelectedExtras([]);
          setAdminSelectedSauces([]);
          setAdminOrderNotes('');
          setAdminOrderQuantity(1);
        };

        const currentDraftTotal = (() => {
          const draftLine = buildDraftLine();
          return draftLine ? draftLine.unitPrice * draftLine.quantity : 0;
        })();

        const displayTotal = ticketTotal + currentDraftTotal;

        return (
          <div className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-xs flex items-center justify-center p-4 md:p-6 animate-fadeIn">
            <div className="bg-[#0A0A0A] text-[#E0E0E0] w-full max-w-2xl max-h-[90vh] rounded-2xl shadow-2xl flex flex-col overflow-hidden transform transition-all border border-white/10">
              {/* Header */}
              <div className="p-6 flex justify-between items-center border-b border-white/10 bg-[#0A0A0A]">
                <div>
                  <h2 className="font-bold text-xl text-white uppercase tracking-wider">Crear Pedido Manual</h2>
                  <p className="text-xs font-mono text-emerald-400 mt-0.5">{selectedItem?.name || 'Selecciona un producto'}</p>
                </div>
                <button
                  onClick={() => setIsNewOrderModalOpen(false)}
                  className="text-white/50 hover:text-white p-2 bg-[#141414] border border-white/10 rounded-full flex items-center justify-center cursor-pointer transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Scrollable Body */}
              <div className="p-6 overflow-y-auto flex flex-col gap-6 flex-1">
                {/* Tipo de Pedido y Ubicación */}
                <section>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <h3 className="font-bold text-[10px] uppercase tracking-[0.2em] text-white/50 mb-3">Tipo de Pedido</h3>
                      <select
                        value={tableOrDelivery}
                        onChange={(e) => setTableOrDelivery(e.target.value as any)}
                        className="w-full p-2.5 rounded-xl border border-white/10 bg-[#141414] text-white outline-none focus:border-white/40 text-xs"
                      >
                        <option value="Table">En Mesa</option>
                        <option value="Pickup">Para Llevar</option>
                        <option value="Delivery">Delivery</option>
                      </select>
                    </div>
                    <div>
                      <h3 className="font-bold text-[10px] uppercase tracking-[0.2em] text-white/50 mb-3">Ubicación / Mesa</h3>
                      <input
                        type="text"
                        required
                        value={locationInput}
                        onChange={(e) => setLocationInput(e.target.value)}
                        className="w-full p-2.5 rounded-xl border border-white/10 bg-[#141414] text-white outline-none focus:border-white/40 text-xs"
                        placeholder="Ej: Mesa 5"
                      />
                    </div>
                  </div>
                </section>

                <hr className="border-white/10" />

                {/* Seleccionar Producto */}
                <section>
                  <h3 className="font-bold text-[10px] uppercase tracking-[0.2em] text-white/50 mb-3">Producto</h3>
                  <select
                    value={selectedItemId}
                    onChange={(e) => {
                      setSelectedItemId(e.target.value);
                      setAdminSelectedRemovals([]);
                      setAdminSelectedExtras([]);
                      setAdminSelectedSauces([]);
                    }}
                    className="w-full p-2.5 rounded-xl border border-white/10 bg-[#141414] text-white outline-none focus:border-white/40 text-xs"
                  >
                    {menuItems.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.name} (${m.price.toFixed(2)})
                      </option>
                    ))}
                  </select>
                </section>

                {selectedItem && (
                  <>
                    <hr className="border-white/10" />

                    {/* Quitar Ingredientes */}
                    {selectedItem.defaultRemovals && selectedItem.defaultRemovals.length > 0 && (
                      <section>
                        <h3 className="font-bold text-[10px] uppercase tracking-[0.2em] text-white/50 mb-3">Quitar Ingredientes</h3>
                        <div className="flex flex-wrap gap-2.5">
                          {selectedItem.defaultRemovals.map((removal) => {
                            const isChecked = adminSelectedRemovals.includes(removal);
                            return (
                              <button
                                key={removal}
                                type="button"
                                onClick={() => toggleRemoval(removal)}
                                className={`px-4 py-2.5 rounded-xl border text-xs font-bold transition-all cursor-pointer select-none ${
                                  isChecked
                                    ? 'bg-red-950/60 text-red-400 border-red-500/50'
                                    : 'bg-[#141414] text-white/80 border-white/10 hover:border-white/30'
                                }`}
                              >
                                {removal}
                              </button>
                            );
                          })}
                        </div>
                      </section>
                    )}

                    {selectedItem.defaultRemovals && selectedItem.defaultRemovals.length > 0 && <hr className="border-white/10" />}

                    {/* Añadir Extras */}
                    {selectedItem.availableExtras && selectedItem.availableExtras.length > 0 && (
                      <section>
                        <h3 className="font-bold text-[10px] uppercase tracking-[0.2em] text-white/50 mb-3">Añadir Extras</h3>
                        <div className="flex flex-col gap-2">
                          {selectedItem.availableExtras.map((extra) => {
                            const isChecked = adminSelectedExtras.some((e) => e.id === extra.id);
                            return (
                              <label
                                key={extra.id}
                                onClick={() => toggleExtra(extra)}
                                className={`flex justify-between items-center p-3 rounded-xl border transition-all cursor-pointer select-none ${
                                  isChecked
                                    ? 'bg-emerald-950/30 border-emerald-500/50 text-white'
                                    : 'bg-[#141414] border-white/10 hover:border-white/30 text-white/90'
                                }`}
                              >
                                <div className="flex items-center gap-3">
                                  <input
                                    type="checkbox"
                                    checked={isChecked}
                                    onChange={() => toggleExtra(extra)}
                                    className="w-4 h-4 rounded text-emerald-500 focus:ring-emerald-500 cursor-pointer accent-emerald-500"
                                  />
                                  <span className="font-medium text-xs">{extra.name}</span>
                                </div>
                                <span className="font-mono text-xs text-emerald-400 font-bold">+${extra.price.toFixed(2)}</span>
                              </label>
                            );
                          })}
                        </div>
                      </section>
                    )}

                    {selectedItem.availableExtras && selectedItem.availableExtras.length > 0 && <hr className="border-white/10" />}

                    {/* Salsas Aparte */}
                    {selectedItem.availableSauces && selectedItem.availableSauces.length > 0 && (
                      <section>
                        <h3 className="font-bold text-[10px] uppercase tracking-[0.2em] text-white/50 mb-3">Salsas Aparte</h3>
                        <div className="grid grid-cols-2 gap-2.5">
                          {selectedItem.availableSauces.map((sauce) => {
                            const isChecked = adminSelectedSauces.includes(sauce);
                            return (
                              <button
                                key={sauce}
                                type="button"
                                onClick={() => toggleSauce(sauce)}
                                className={`px-3 py-2.5 rounded-xl border text-xs font-bold transition-all text-center cursor-pointer ${
                                  isChecked
                                    ? 'bg-white text-black border-white'
                                    : 'bg-[#141414] text-white/80 border-white/10 hover:border-white/30'
                                }`}
                              >
                                {sauce}
                              </button>
                            );
                          })}
                        </div>
                      </section>
                    )}

                    {selectedItem.availableSauces && selectedItem.availableSauces.length > 0 && <hr className="border-white/10" />}
                  </>
                )}

                {manualTicketItems.length > 0 && (
                  <section>
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="font-bold text-[10px] uppercase tracking-[0.2em] text-white/50">Productos en el ticket</h3>
                      <span className="text-[10px] font-mono text-emerald-400">{manualTicketItems.length} artículo{manualTicketItems.length > 1 ? 's' : ''}</span>
                    </div>
                    <div className="space-y-2">
                      {manualTicketItems.map((line) => (
                        <div
                          key={line.id}
                          className="flex items-center justify-between gap-3 rounded-xl border border-white/10 bg-[#141414] p-3"
                        >
                          <div>
                            <p className="text-sm font-bold text-white">{line.item.name}</p>
                            <p className="text-[10px] text-white/50 font-mono">
                              {line.quantity} x €{line.unitPrice.toFixed(2)}
                              {line?.customization?.extras?.length > 0 ? ` • ${line.customization.extras.map((extra) => extra?.name).filter(Boolean).join(', ')}` : ''}
                            </p>
                          </div>
                          <button
                            type="button"
                            onClick={() => setManualTicketItems((prev) => prev.filter((item) => item.id !== line.id))}
                            className="text-red-300 hover:text-red-200 p-2 rounded-lg hover:bg-red-500/10 cursor-pointer"
                            aria-label={`Eliminar ${line.item.name}`}
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </section>
                )}

                {/* Observaciones */}
                <section>
                  <h3 className="font-bold text-[10px] uppercase tracking-[0.2em] text-white/50 mb-3">Observaciones</h3>
                  <textarea
                    value={adminOrderNotes}
                    onChange={(e) => setAdminOrderNotes(e.target.value)}
                    placeholder="Ej: La carne bien hecha, alergia al sésamo, servilletas extra..."
                    className="w-full h-24 rounded-xl bg-[#141414] p-3 text-xs text-white border border-white/10 focus:border-white/40 outline-none resize-none transition-all placeholder:text-white/30 font-mono"
                  />
                </section>
              </div>

              {/* Footer */}
              <div className="p-6 border-t border-white/10 bg-[#0A0A0A] flex items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                  <div className="flex items-center border border-white/20 rounded-xl overflow-hidden bg-[#141414]">
                    <button
                      type="button"
                      onClick={() => setAdminOrderQuantity((q) => Math.max(1, q - 1))}
                      className="p-2 hover:bg-white/10 text-white cursor-pointer"
                    >
                      <Minus className="w-4 h-4" />
                    </button>
                    <span className="px-3 font-mono font-bold text-sm text-white">{adminOrderQuantity}</span>
                    <button
                      type="button"
                      onClick={() => setAdminOrderQuantity((q) => q + 1)}
                      className="p-2 hover:bg-white/10 text-white cursor-pointer"
                    >
                      <Plus className="w-4 h-4" />
                    </button>
                  </div>

                  <div>
                    <span className="text-[10px] uppercase tracking-widest text-white/40 block">Total</span>
                    <span className="font-mono font-bold text-xl text-emerald-400">${displayTotal.toFixed(2)}</span>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={addCurrentSelectionToTicket}
                    className="border border-white/15 bg-[#141414] text-white font-bold text-[10px] uppercase tracking-widest px-5 py-3.5 hover:border-white/35 transition-all cursor-pointer rounded-sm"
                  >
                    Añadir al ticket
                  </button>
                  <button
                    type="button"
                    onClick={handleCreateOrder}
                    className="bg-white text-black font-bold text-xs uppercase tracking-widest px-8 py-3.5 hover:bg-white/90 transition-all active:scale-95 shadow-md cursor-pointer rounded-sm"
                  >
                    CREAR PEDIDO
                  </button>
                </div>
              </div>
            </div>
          </div>
        );
      })()}
      
      {/* Date Report Modal */}
      {selectedReportData && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="bg-[#111111] border border-white/10 rounded-2xl w-full max-w-3xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="p-6 border-b border-white/10 flex items-center justify-between">
              <div>
                <h3 className="font-bold text-xl text-white">Informe Diario</h3>
                <p className="text-sm text-emerald-400 font-mono mt-1">{selectedReportData.dateLabel}</p>
              </div>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => {
                    const printContents = document.getElementById('report-printable-area')?.innerHTML;
                    if (printContents) {
                      const originalContents = document.body.innerHTML;
                      document.body.innerHTML = printContents;
                      window.print();
                      document.body.innerHTML = originalContents;
                      window.location.reload(); 
                    }
                  }}
                  className="flex items-center gap-2 px-4 py-2 bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 rounded-full text-xs font-bold uppercase tracking-widest hover:bg-emerald-500 hover:text-white transition-all cursor-pointer"
                >
                  <Printer className="w-4 h-4" /> PDF
                </button>
                <a
                  href={`mailto:${activeUser?.email || ''}?subject=Informe de Ventas - ${selectedReportData.dateLabel}&body=Adjuntamos o detallamos el informe de ventas del día ${selectedReportData.dateLabel}.`}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-500/10 text-blue-400 border border-blue-500/30 rounded-full text-xs font-bold uppercase tracking-widest hover:bg-blue-500 hover:text-white transition-all cursor-pointer"
                >
                  <Mail className="w-4 h-4" /> Enviar
                </a>
                <button
                  type="button"
                  onClick={() => setSelectedReportDate(null)}
                  className="p-2 bg-white/5 hover:bg-white/10 rounded-full text-white cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>
            
            <div id="report-printable-area" className="flex-1 overflow-y-auto p-6 space-y-8 bg-black print:bg-white print:text-black">
              {/* Resumen General */}
              <div>
                <h4 className="text-white/40 text-xs font-bold uppercase tracking-widest mb-4 print:text-black/50">Resumen General</h4>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="bg-[#1a1a1a] p-4 rounded-xl border border-white/5 print:bg-gray-100 print:text-black">
                    <p className="text-[10px] text-white/40 uppercase tracking-widest print:text-black/50">Ventas Totales</p>
                    <p className="text-2xl font-bold font-mono text-emerald-400 print:text-black">€{selectedReportData.totalSold.toFixed(2)}</p>
                  </div>
                  <div className="bg-[#1a1a1a] p-4 rounded-xl border border-white/5 print:bg-gray-100 print:text-black">
                    <p className="text-[10px] text-white/40 uppercase tracking-widest print:text-black/50">Pedidos</p>
                    <p className="text-2xl font-bold font-mono text-white print:text-black">{selectedReportData.totalOrders}</p>
                  </div>
                  <div className="bg-[#1a1a1a] p-4 rounded-xl border border-white/5 print:bg-gray-100 print:text-black">
                    <p className="text-[10px] text-white/40 uppercase tracking-widest print:text-black/50">Ticket Medio</p>
                    <p className="text-2xl font-bold font-mono text-white print:text-black">€{selectedReportData.avgTicket.toFixed(2)}</p>
                  </div>
                  <div className="bg-[#1a1a1a] p-4 rounded-xl border border-white/5 print:bg-gray-100 print:text-black">
                    <p className="text-[10px] text-white/40 uppercase tracking-widest print:text-black/50">Más Vendido</p>
                    <p className="text-xl font-bold text-emerald-400 leading-tight print:text-black line-clamp-2">
                       {selectedReportData.bestSeller?.name || 'N/A'}
                    </p>
                  </div>
                </div>
              </div>

              {/* Por canal de venta */}
              <div>
                <h4 className="text-white/40 text-xs font-bold uppercase tracking-widest mb-4 print:text-black/50">Por Canal de Venta</h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="bg-[#1a1a1a] p-4 rounded-xl border border-white/5 flex items-center justify-between print:bg-gray-100">
                    <div>
                      <p className="text-sm font-bold text-white print:text-black">En Mesa</p>
                      <p className="text-[10px] text-white/50 print:text-black/50 font-mono">{selectedReportData.pedidosMesa} pedidos</p>
                    </div>
                    <p className="text-lg font-bold font-mono text-white print:text-black">€{selectedReportData.totalMesa.toFixed(2)}</p>
                  </div>
                  <div className="bg-[#1a1a1a] p-4 rounded-xl border border-white/5 flex items-center justify-between print:bg-gray-100">
                    <div>
                      <p className="text-sm font-bold text-white print:text-black">Para Llevar</p>
                      <p className="text-[10px] text-white/50 print:text-black/50 font-mono">{selectedReportData.pedidosLlevar} pedidos</p>
                    </div>
                    <p className="text-lg font-bold font-mono text-white print:text-black">€{selectedReportData.totalLlevar.toFixed(2)}</p>
                  </div>
                  <div className="bg-[#1a1a1a] p-4 rounded-xl border border-white/5 flex items-center justify-between print:bg-gray-100">
                    <div>
                      <p className="text-sm font-bold text-white print:text-black">Domicilio</p>
                      <p className="text-[10px] text-white/50 print:text-black/50 font-mono">{selectedReportData.pedidosDelivery} pedidos</p>
                    </div>
                    <p className="text-lg font-bold font-mono text-white print:text-black">€{selectedReportData.totalDelivery.toFixed(2)}</p>
                  </div>
                </div>
              </div>

              {/* Por Producto */}
              <div>
                <h4 className="text-white/40 text-xs font-bold uppercase tracking-widest mb-4 print:text-black/50">Ventas por Producto</h4>
                <div className="bg-[#1a1a1a] rounded-xl border border-white/5 p-4 print:bg-transparent print:border-none print:p-0">
                  <div className="grid grid-cols-12 text-[10px] font-bold text-white/30 uppercase tracking-widest pb-3 border-b border-white/10 mb-3 print:text-black/50">
                    <div className="col-span-6">Producto</div>
                    <div className="col-span-2 text-center">Unidades</div>
                    <div className="col-span-4 text-right">Total</div>
                  </div>
                  <div className="space-y-3">
                    {selectedReportData.products.length > 0 ? selectedReportData.products.map((prod, idx) => (
                      <div key={idx} className="grid grid-cols-12 items-center">
                        <div className="col-span-6 text-sm text-white print:text-black font-semibold truncate pr-2">{prod.name}</div>
                        <div className="col-span-2 text-center text-sm font-mono text-white/60 print:text-black/70">{prod.units}</div>
                        <div className="col-span-4 text-right text-sm font-mono text-emerald-400 print:text-black font-bold">€{prod.revenue.toFixed(2)}</div>
                      </div>
                    )) : (
                      <p className="text-center text-sm text-white/40">Sin datos de productos</p>
                    )}
                  </div>
                </div>
              </div>
            </div>
            
            <div className="p-4 border-t border-white/10 bg-[#0A0A0A] print:hidden">
              <button 
                onClick={() => setSelectedReportDate(null)}
                className="w-full bg-white/5 hover:bg-white/10 text-white font-bold text-xs uppercase tracking-widest py-3 rounded-xl transition-all cursor-pointer"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
