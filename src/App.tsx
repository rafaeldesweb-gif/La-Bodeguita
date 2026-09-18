import React, { useState, useEffect, useMemo } from "react";
import {
  MenuItem,
  CartItem,
  CartItemCustomization,
  Order,
  OrderStatus,
  getCartItemLineTotal,
  getOrderTotal,
} from "./types";
import { INITIAL_MENU } from "./data/initialMenu";
import { INITIAL_ORDERS } from "./data/initialOrders";
import { TopNavBar } from "./components/TopNavBar";
import { HeroSection } from "./components/HeroSection";
import { FeaturedProducts } from "./components/FeaturedProducts";
import { MenuCatalog } from "./components/MenuCatalog";
import { CustomizationModal } from "./components/CustomizationModal";
import { CartSidebar } from "./components/CartSidebar";
import { CustomerOrderTracker } from "./components/CustomerOrderTracker";
import { BodeAdminDashboard } from "./components/BodeAdminDashboard";
import { BodeBotWidget } from "./components/BodeBotWidget";
import { Footer } from "./components/Footer";
import { CustomerAuthPage } from "./components/CustomerAuthPage";
import { AdminAuthPage } from "./components/AdminAuthPage";
import { supabase } from "./lib/supabase";
import {
  createOrder,
  fetchAdminEmail,
  fetchMenu,
  fetchOrders,
  removeMenuItem,
  saveMenuItem,
  seedMenu,
  updateAdminEmail,
  updateOrderStatus,
} from "./lib/database";

const APP_EMAIL = "rafaeldesweb@gmail.com";
const ADMIN_SESSION_KEY = "bodeguita_admin_session";
const USER_REGISTRY_KEY = "bodeguita_registered_users";
const ACTIVE_USER_KEY = "bodeguita_active_user";

interface RegisteredUser {
  id: string;
  name: string;
  email: string;
  generatedKey: string;
  profileImage?: string;
  status: "pending" | "active";
  confirmationToken: string;
  createdAt: string;
  role?: "customer" | "admin";
  phone?: string;
  address?: string;
}

const generateAccessKey = () =>
  `BODE-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
const generateConfirmationToken = () =>
  Math.random().toString(36).slice(2, 12).toUpperCase();
const normalizeOrderStatus = (status: unknown): OrderStatus => {
  if (
    status === "NUEVOS" ||
    status === "EN PREPARACIÓN" ||
    status === "LISTOS" ||
    status === "ENTREGADOS"
  ) {
    return status;
  }

  return "NUEVOS";
};

const readPersistentState = <T,>(storageKey: string, fallback: T): T => {
  if (typeof window === "undefined") return fallback;

  try {
    const saved = window.localStorage.getItem(storageKey);
    if (!saved) return fallback;

    const parsed = JSON.parse(saved) as T;
    return parsed ?? fallback;
  } catch {
    return fallback;
  }
};

const normalizeOrders = (value: unknown): Order[] => {
  if (!Array.isArray(value) || value.length === 0) {
    return INITIAL_ORDERS;
  }

  const normalized = value.filter(
    (entry): entry is Partial<Order> => !!entry && typeof entry === "object",
  );

  if (normalized.length === 0) {
    return INITIAL_ORDERS;
  }

  return normalized.map((entry, index) => {
    const items = Array.isArray(entry.items)
      ? entry.items.filter(
          (item): item is CartItem => !!item && typeof item === "object",
        )
      : [];
    const normalizedTotal = getOrderTotal(items);
    const total =
      items.length > 0
        ? normalizedTotal
        : typeof entry.total === "number"
          ? entry.total
          : 0;

    return {
      id: typeof entry.id === "string" ? entry.id : `#${Date.now()}-${index}`,
      createdAt:
        typeof entry.createdAt === "string" ? entry.createdAt : "Ahora mismo",
      timestamp:
        typeof entry.timestamp === "number" ? entry.timestamp : Date.now(),
      type:
        entry.type === "Delivery" || entry.type === "Pickup"
          ? entry.type
          : "Table",
      locationDetail:
        typeof entry.locationDetail === "string"
          ? entry.locationDetail
          : "Mesa principal",
      items,
      total,
      status: normalizeOrderStatus(entry.status),
      customerName:
        typeof entry.customerName === "string" ? entry.customerName : undefined,
    };
  });
};

const readFileAsDataUrl = (file: File) =>
  new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () =>
      reject(new Error("No se pudo leer la imagen seleccionada."));
    reader.readAsDataURL(file);
  });
const sendMailto = (recipients: string, subject: string, body: string) => {
  const href = `mailto:${recipients}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;

  try {
    const link = document.createElement("a");
    link.href = href;
    link.style.display = "none";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  } catch {
    window.location.href = href;
  }
};

export function App() {
  const [activeTab, setActiveTab] = useState<
    "home" | "menu" | "my-orders" | "admin"
  >("menu");
  const [registeredUsers, setRegisteredUsers] = useState<RegisteredUser[]>(
    () => {
      if (typeof window === "undefined") return [];
      const saved = localStorage.getItem(USER_REGISTRY_KEY);
      return saved ? JSON.parse(saved) : [];
    },
  );
  const [activeUser, setActiveUser] = useState<RegisteredUser | null>(() => {
    if (typeof window === "undefined") return null;
    const raw = localStorage.getItem(ACTIVE_USER_KEY);
    return raw ? JSON.parse(raw) : null;
  });
  const [isAdminAuthenticated, setIsAdminAuthenticated] = useState<boolean>(
    () => {
      if (typeof window === "undefined") return false;
      const sessionFlag = localStorage.getItem(ADMIN_SESSION_KEY) === "true";
      return sessionFlag && !!localStorage.getItem(ACTIVE_USER_KEY);
    },
  );
  const [isAdminAccessModalOpen, setIsAdminAccessModalOpen] =
    useState<boolean>(false);
  const [allowedAdminEmail, setAllowedAdminEmail] = useState(
    "rafael_o_maitin@yahoo.es",
  );
  const [adminAccessInput, setAdminAccessInput] = useState<string>("");
  const [showAdminAccessKey, setShowAdminAccessKey] = useState<boolean>(false);
  const [userName, setUserName] = useState<string>("");
  const [userEmail, setUserEmail] = useState<string>("");
  const [registerStatus, setRegisterStatus] = useState<string>("");
  const [confirmationLink, setConfirmationLink] = useState<string>("");

  // Menu State
  const [menu, setMenu] = useState<MenuItem[]>(() =>
    readPersistentState("bodeguita_menu", INITIAL_MENU),
  );

  // Orders State (shared between customer and BodeAdmin kitchen)
  const [orders, setOrders] = useState<Order[]>(() => {
    const stored = readPersistentState("bodeguita_orders", INITIAL_ORDERS);
    const normalized = normalizeOrders(stored);
    const hasActiveSeedOrders = normalized.some((order) =>
      ["NUEVOS", "EN PREPARACIÓN", "LISTOS"].includes(order.status),
    );

    if (
      hasActiveSeedOrders &&
      !window.localStorage.getItem("bodeguita_orders")
    ) {
      return INITIAL_ORDERS.filter((order) => order.status === "ENTREGADOS");
    }

    return normalized;
  });

  // Cart State
  const [cart, setCart] = useState<CartItem[]>(() =>
    readPersistentState("bodeguita_cart", []),
  );

  const [isCartOpen, setIsCartOpen] = useState<boolean>(false);
  const [hasReadyOrderNotification, setHasReadyOrderNotification] =
    useState<boolean>(false);

  // Customization Modal State
  const [customizationItem, setCustomizationItem] = useState<MenuItem | null>(
    null,
  );
  const [isCustomizationOpen, setIsCustomizationOpen] =
    useState<boolean>(false);

  // Admin Presence State
  const [isAnyAdminOnline, setIsAnyAdminOnline] = useState<boolean>(false);

  useEffect(() => {
    if (!supabase) return;
    const channel = supabase.channel('admin-presence');
    
    channel.on('presence', { event: 'sync' }, () => {
      const state = channel.presenceState();
      let adminOnline = false;
      for (const id in state) {
        const presences = state[id] as any[];
        if (presences.some(p => p.role === 'admin')) {
          adminOnline = true;
          break;
        }
      }
      setIsAnyAdminOnline(adminOnline);
    });

    channel.subscribe(async (status) => {
      if (status === 'SUBSCRIBED') {
        if (isAdminAuthenticated && activeUser) {
          await channel.track({ user_id: activeUser.id, role: 'admin' });
        }
      }
    });

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [isAdminAuthenticated, activeUser]);

  useEffect(() => {
    if (!supabase) return;
    const ordersChannel = supabase
      .channel("orders-updates")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "orders" },
        () => {
          fetchOrders()
            .then((remoteOrders) => {
              setOrders(remoteOrders);
            })
            .catch(console.error);
        },
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(ordersChannel);
    };
  }, []);

  const salesSummary = useMemo(() => {
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const deliveredOrders = orders.filter(
      (order) =>
        order.status === "ENTREGADOS" &&
        order.timestamp >= todayStart.getTime(),
    );

    const sourceOrders =
      deliveredOrders.length > 0
        ? deliveredOrders
        : orders.filter((order) => order.status === "ENTREGADOS");
    const totalSold = sourceOrders.reduce((sum, order) => sum + order.total, 0);
    const avgTicket =
      sourceOrders.length > 0 ? totalSold / sourceOrders.length : 0;

    const productMap = new Map<
      string,
      { name: string; units: number; revenue: number }
    >();

    sourceOrders.forEach((order) => {
      if (!Array.isArray(order.items)) return;
      order.items.forEach((item) => {
        if (!item?.item) return;
        const key = item.item.id;
        const current = productMap.get(key) ?? {
          name: item.item.name || "Desconocido",
          units: 0,
          revenue: 0,
        };
        current.units += item.quantity || 1;
        current.revenue += getCartItemLineTotal(item);
        productMap.set(key, current);
      });
    });

    const bestSellers = [...productMap.values()].sort(
      (a, b) => b.units - a.units || b.revenue - a.revenue,
    );

    return {
      date: new Date().toLocaleDateString("es-ES", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
      }),
      totalSold,
      avgTicket,
      bestSellers,
    };
  }, [orders]);

  useEffect(() => {
    try {
      localStorage.setItem("bodeguita_menu", JSON.stringify(menu));
    } catch (e) {
      console.warn("Could not save menu to localStorage", e);
    }
  }, [menu]);

  useEffect(() => {
    try {
      // Optimizacion: Si hay muchos pedidos, guardamos solo los más recientes para no exceder la cuota local
      const ordersToSave = orders.length > 50 ? orders.slice(0, 50) : orders;
      localStorage.setItem("bodeguita_orders", JSON.stringify(ordersToSave));
    } catch (e) {
      console.warn("Could not save orders to localStorage", e);
    }
  }, [orders]);

  useEffect(() => {
    try {
      localStorage.setItem("bodeguita_cart", JSON.stringify(cart));
    } catch (e) {
      console.warn("Could not save cart to localStorage", e);
    }
  }, [cart]);

  useEffect(() => {
    try {
      localStorage.setItem(USER_REGISTRY_KEY, JSON.stringify(registeredUsers));
    } catch (e) {
      console.warn("Could not save registry to localStorage", e);
    }
  }, [registeredUsers]);

  useEffect(() => {
    if (activeUser) {
      localStorage.setItem(ACTIVE_USER_KEY, JSON.stringify(activeUser));
    } else {
      localStorage.removeItem(ACTIVE_USER_KEY);
    }
  }, [activeUser]);

  useEffect(() => {
    localStorage.setItem(ADMIN_SESSION_KEY, String(isAdminAuthenticated));
  }, [isAdminAuthenticated]);

  useEffect(() => {
    if (!supabase) return;

    void fetchAdminEmail()
      .then(setAllowedAdminEmail)
      .catch((error) =>
        console.warn(
          "No se pudo cargar el correo de Control de pedidos:",
          error,
        ),
      );

    const syncSession = async (
      session: Awaited<
        ReturnType<typeof supabase.auth.getSession>
      >["data"]["session"],
    ) => {
      if (!session) {
        setIsAdminAuthenticated(false);
        setActiveUser(null);
        return;
      }

      let { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("full_name, phone, role")
        .eq("id", session.user.id)
        .single();

      if (profileError || !profile) {
        if (profileError?.code === "PGRST116" || !profile) {
          // Si el perfil no existe, intentar crearlo con los datos que guardamos en signIn
          const newRole = session.user.user_metadata.role || "customer";
          const newProfile = {
            id: session.user.id,
            full_name:
              session.user.user_metadata.full_name ||
              session.user.email?.split("@")[0] ||
              "Usuario",
            phone: session.user.user_metadata.phone || null,
            role: newRole,
          };

          const { error: insertError } = await supabase
            .from("profiles")
            .insert([newProfile]);

          if (!insertError) {
            profile = newProfile;
            profileError = null;
          } else {
            console.error(
              "No se pudo crear el perfil automáticamente:",
              insertError,
            );
            setIsAdminAuthenticated(false);
            setActiveUser(null);
            setRegisterStatus(
              "Tu usuario se creó pero la tabla de perfiles parece tener restricciones de seguridad (RLS).",
            );
            return;
          }
        } else {
          console.error("Error al cargar el perfil:", profileError);
          setIsAdminAuthenticated(false);
          setActiveUser(null);
          setRegisterStatus("No se pudo cargar tu perfil de usuario.");
          return;
        }
      }

      const user: RegisteredUser = {
        id: session.user.id,
        name:
          profile.full_name ||
          session.user.user_metadata.full_name ||
          session.user.email ||
          "Administrador",
        email: session.user.email || "",
        generatedKey: "Acceso seguro con Supabase",
        profileImage: session.user.user_metadata.avatar_url,
        status: "active",
        confirmationToken: "",
        createdAt: session.user.created_at,
        role: profile.role,
        phone: profile.phone ?? undefined,
      };

      setActiveUser(user);
      const isAuthorizedAdmin = profile.role === "admin";
      setIsAdminAuthenticated(isAuthorizedAdmin);
      setRegisteredUsers((previous) => [
        user,
        ...previous.filter((entry) => entry.id !== user.id),
      ]);

      try {
        const [remoteMenu, remoteOrders] = await Promise.all([
          fetchMenu(),
          fetchOrders(),
        ]);
        if (remoteMenu.length === 0) {
          await seedMenu(INITIAL_MENU);
          setMenu(INITIAL_MENU);
        } else {
          setMenu(remoteMenu);
        }
        setOrders(remoteOrders);
        setActiveTab(isAuthorizedAdmin ? "admin" : "menu");
      } catch (error) {
        console.error("No se pudo cargar la información de Supabase:", error);
      }
    };

    void supabase.auth
      .getSession()
      .then(({ data }) => syncSession(data.session));
    const { data: listener } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        void syncSession(session);
      },
    );

    return () => listener.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (activeTab === "admin" && !isAdminAuthenticated) {
      setActiveTab(activeUser ? "menu" : "menu");
    }
    if (activeUser?.role === "customer" && activeTab === "home") {
      setActiveTab("menu");
    }
  }, [activeTab, activeUser, isAdminAuthenticated]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const confirm = params.get("confirm");
    const userId = params.get("userId");
    const token = params.get("token");

    if (confirm === "true" && userId && token) {
      const user = registeredUsers.find(
        (entry) => entry.id === userId && entry.confirmationToken === token,
      );
      if (user) {
        const activatedUser = { ...user, status: "active" as const };
        const snapshot = orders.filter(
          (order) => order.status !== "ENTREGADOS",
        );
        void saveSessionSnapshot("session_start", snapshot);
        setOrders([]);
        setHasReadyOrderNotification(false);
        setRegisteredUsers((prev) =>
          prev.map((entry) => (entry.id === userId ? activatedUser : entry)),
        );
        setActiveUser(activatedUser);
        setIsAdminAuthenticated(true);
        setIsAdminAccessModalOpen(false);
        setActiveTab("admin");
        window.history.replaceState({}, "", window.location.pathname);
      }
    }
  }, [registeredUsers]);

  useEffect(() => {
    const handleBeforeUnload = () => {
      if (!activeUser) return;

      const subject = `Resumen final de ventas - ${salesSummary.date}`;
      const lines = [
        "Resumen final de ventas",
        `Fecha: ${salesSummary.date}`,
        `Total vendido: ${salesSummary.totalSold.toFixed(2)} €`,
        `Ticket promedio: ${salesSummary.avgTicket.toFixed(2)} €`,
        "",
        "Más vendido a menos vendido:",
        ...salesSummary.bestSellers.map(
          (item, index) =>
            `${index + 1}. ${item.name} - ${item.units} uds - ${item.revenue.toFixed(2)} €`,
        ),
      ];
      const body = lines.join("\n");
      const recipients = `${activeUser.email},${APP_EMAIL}`;
      sendMailto(recipients, subject, body);
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [activeUser, salesSummary]);

  // Handlers
  const handleOpenCustomization = (item: MenuItem) => {
    setCustomizationItem(item);
    setIsCustomizationOpen(true);
  };

  const handleAddToCartDirect = (item: MenuItem) => {
    const cartId = `${item.id}-direct-${Date.now()}`;
    const newCartItem: CartItem = {
      cartId,
      item,
      customization: {
        removals: [],
        extras: [],
        sauces: [],
        notes: "",
      },
      unitPrice: item.price,
      quantity: 1,
    };
    setCart((prev) => [...prev, newCartItem]);
    setIsCartOpen(true);
  };

  const handleAddToCartFromModal = (
    item: MenuItem,
    customization: CartItemCustomization,
    unitPrice: number,
    quantity: number,
  ) => {
    const cartId = `${item.id}-custom-${Date.now()}`;
    const newCartItem: CartItem = {
      cartId,
      item,
      customization,
      unitPrice,
      quantity,
    };
    setCart((prev) => [...prev, newCartItem]);
    setIsCartOpen(true);
  };

  const handleUpdateCartQuantity = (cartId: string, delta: number) => {
    setCart(
      (prev) =>
        prev
          .map((item) => {
            if (item.cartId === cartId) {
              const newQty = item.quantity + delta;
              return newQty > 0 ? { ...item, quantity: newQty } : null;
            }
            return item;
          })
          .filter(Boolean) as CartItem[],
    );
  };

  const handleRemoveFromCart = (cartId: string) => {
    setCart((prev) => prev.filter((item) => item.cartId !== cartId));
  };

  const handleCheckout = async (
    orderType: "Table" | "Delivery" | "Pickup",
    locationDetail: string,
    customerName: string,
  ) => {
    if (!activeUser) {
      alert("Debes iniciar sesión antes de hacer un pedido.");
      return;
    }

    const total = getOrderTotal(cart);
    const newOrder: Order = {
      id: `#${Math.floor(1000 + Math.random() * 9000)}`,
      createdAt: "Ahora mismo",
      timestamp: Date.now(),
      type: orderType,
      locationDetail,
      customerName,
      items: [...cart],
      total,
      status: "NUEVOS",
    };

    try {
      if (orderType === "Delivery" && activeUser.address !== locationDetail) {
        if (supabase) {
          await supabase
            .from("profiles")
            .update({ address: locationDetail })
            .eq("id", activeUser.id);
        }
        setActiveUser((prev) =>
          prev ? { ...prev, address: locationDetail } : prev,
        );
      }

      const savedOrder = await createOrder(newOrder, activeUser.id);
      setOrders((prev) => [savedOrder, ...prev]);
      setCart([]);
      setIsCartOpen(false);
      handleSetActiveTab("my-orders");
    } catch (error) {
      console.error("No se pudo crear el pedido en Supabase:", error);
      alert(
        "No se pudo guardar el pedido. Comprueba tu conexión e inténtalo de nuevo.",
      );
    }
  };

  const handleCustomerRegister = async ({
    name,
    email,
    phone,
    password,
  }: {
    name: string;
    email: string;
    phone: string;
    password: string;
  }) => {
    if (!supabase) return "Supabase no está configurado.";
    const { error } = await supabase.auth.signUp({
      email: email.trim().toLowerCase(),
      password,
      options: {
        data: {
          full_name: name.trim(),
          phone: phone.trim(),
          plain_password: password,
        },
        emailRedirectTo: window.location.origin,
      },
    });
    if (error) return error.message;
    return "Te hemos enviado un correo de confirmación. Confírmalo y vuelve a iniciar sesión.";
  };

  const handleCustomerLogin = async ({
    email,
    password,
  }: {
    email: string;
    password: string;
  }) => {
    if (!supabase) return "Supabase no está configurado.";
    const { error } = await supabase.auth.signInWithPassword({
      email: email.trim().toLowerCase(),
      password,
    });
    if (error) {
      if (error.message.includes("Email not confirmed")) {
        return "Por favor, confirma tu correo electrónico antes de iniciar sesión.";
      }
      if (error.message.includes("Invalid login credentials")) {
        return "Correo o contraseña incorrectos.";
      }
      return error.message;
    }
    return null;
  };

  const handleCustomerLogout = async () => {
    if (!supabase) return;
    const { error } = await supabase.auth.signOut({ scope: "local" });
    if (error) {
      console.error("No se pudo cerrar la sesión del cliente:", error);
      alert("No se pudo cerrar la sesión. Inténtalo de nuevo.");
      return;
    }
    setCart([]);
    setOrders([]);
    setActiveTab("home");
  };

  const handleUpdateOrderStatus = async (
    orderId: string,
    nextStatus: OrderStatus,
  ) => {
    const currentOrder = orders.find((o) => o.id === orderId);

    if (
      currentOrder &&
      currentOrder.status === "EN PREPARACIÓN" &&
      nextStatus === "LISTOS"
    ) {
      setHasReadyOrderNotification(true);
    }

    try {
      const savedOrder = await updateOrderStatus(orderId, nextStatus);
      setOrders((prev) =>
        prev.map((order) => (order.id === orderId ? savedOrder : order)),
      );
    } catch (error) {
      console.error("No se pudo actualizar el pedido en Supabase:", error);
      alert("No se pudo actualizar el estado del pedido.");
    }
  };

  const handleClearDelivered = async () => {
    const deliveredOrders = orders.filter((o) => o.status === "ENTREGADOS");
    if (deliveredOrders.length === 0) return;

    // Actualización local rápida e inmediata
    setOrders((prev) =>
      prev.map((o) => (o.status === "ENTREGADOS" ? { ...o, status: "ARCHIVADOS" } : o))
    );

    // Actualización silenciosa en background sin colgar UI
    for (const order of deliveredOrders) {
      try {
        await updateOrderStatus(order.id, "ARCHIVADOS");
      } catch (error) {
        console.error("No se pudo archivar (silencioso):", error);
      }
    }
  };

  const handleSetActiveTab = (tab: "home" | "menu" | "my-orders" | "admin") => {
    if (activeUser?.role === "customer" && !["menu", "my-orders"].includes(tab))
      return;
    if (!activeUser && tab === "my-orders") {
      setActiveTab("home");
      return;
    }
    if (tab === "my-orders") {
      setHasReadyOrderNotification(false);
    }
    setActiveTab(tab);
  };

  const handleCreateManualOrder = async (newOrder: Order) => {
    if (!activeUser) return;
    try {
      const savedOrder = await createOrder(newOrder, activeUser.id);
      setOrders((prev) => [savedOrder, ...prev]);
    } catch (error) {
      console.error("No se pudo crear el pedido manual en Supabase:", error);
      alert("No se pudo guardar el pedido.");
    }
  };

  const handleUpdateMenuItemPrice = async (
    itemId: string,
    newPrice: number,
  ) => {
    const item = menu.find((entry) => entry.id === itemId);
    if (!item) return;
    const updatedItem = { ...item, price: newPrice };
    try {
      await saveMenuItem(updatedItem);
      setMenu((prev) =>
        prev.map((entry) => (entry.id === itemId ? updatedItem : entry)),
      );
    } catch (error) {
      console.error("No se pudo actualizar el precio en Supabase:", error);
      alert("No se pudo actualizar el precio.");
    }
  };

  const handleAddMenuItem = async (newItem: MenuItem) => {
    try {
      await saveMenuItem(newItem);
      setMenu((prev) => [newItem, ...prev]);
    } catch (error) {
      console.error("No se pudo añadir el producto en Supabase:", error);
      alert("No se pudo añadir el producto.");
    }
  };

  const handleUpdateMenuItem = async (
    itemId: string,
    updatedItem: MenuItem,
  ) => {
    try {
      await saveMenuItem(updatedItem);
      setMenu((prev) =>
        prev.map((entry) => (entry.id === itemId ? updatedItem : entry)),
      );
    } catch (error) {
      console.error("No se pudo actualizar el producto en Supabase:", error);
      alert("No se pudo actualizar el producto.");
    }
  };

  const handleDeleteMenuItem = async (itemId: string) => {
    try {
      await removeMenuItem(itemId);
      setMenu((prev) => prev.filter((entry) => entry.id !== itemId));
    } catch (error) {
      console.error("No se pudo eliminar el producto en Supabase:", error);
      alert("No se pudo eliminar el producto.");
    }
  };

  const handleAdminRegister = async ({
    name,
    email,
    password,
  }: {
    name: string;
    email: string;
    password: string;
  }): Promise<string | null> => {
    if (!supabase) return "Supabase no está configurado.";

    const normalizedEmail = email.trim().toLowerCase();
    if (!normalizedEmail) return "Introduce el correo.";
    if (!name.trim()) return "Introduce tu nombre.";
    if (!password || password.length < 8)
      return "La contraseña debe tener al menos 8 caracteres.";

    const isMainAdmin = normalizedEmail === allowedAdminEmail.toLowerCase();
    const roleToAssign = isMainAdmin ? "admin" : "customer";

    const { error } = await supabase.auth.signUp({
      email: normalizedEmail,
      password,
      options: {
        data: {
          full_name: name.trim(),
          role: roleToAssign,
          plain_password: password,
        },
        emailRedirectTo: window.location.origin,
      },
    });

    if (error) {
      console.error("Error al registrar administrador:", error);
      if (
        error.message.includes("already registered") ||
        error.message.includes("already been registered")
      ) {
        return 'Este correo ya está registrado. Usa "Iniciar sesión" en su lugar.';
      }
      return `Error: ${error.message}`;
    }

    if (isMainAdmin) {
      return "Cuenta creada. Revisa tu correo de confirmación y luego inicia sesión.";
    } else {
      return (
        "Tu solicitud de acceso fue recibida. Primero confirma tu correo. Luego, el administrador (" +
        allowedAdminEmail +
        ") debe aprobarte desde su panel."
      );
    }
  };

  const handleAdminLogin = async (
    loginName: string,
    loginEmail: string,
    loginPassword: string,
  ): Promise<string | null> => {
    if (!supabase) return "Supabase no está configurado.";

    const email = loginEmail.trim().toLowerCase();
    if (!email) return "Introduce el correo del administrador.";
    if (!loginPassword) return "Introduce la contraseña.";

    // Sign in with email + password against Supabase Auth
    const { data: signInData, error: signInError } =
      await supabase.auth.signInWithPassword({
        email,
        password: loginPassword,
      });

    if (signInError) {
      console.error("Error de inicio de sesión admin:", signInError);
      if (signInError.message.includes("Email not confirmed")) {
        return "Tu correo no ha sido confirmado. Por favor, revisa tu bandeja de entrada.";
      }
      if (signInError.message.includes("Invalid login credentials")) {
        return "Correo o contraseña incorrectos.";
      }
      return signInError.message;
    }

    if (!signInData.user)
      return "No se pudo obtener la información del usuario.";

    // Verify admin role in the profiles table
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", signInData.user.id)
      .single();

    if (profileError || !profile) {
      await supabase.auth.signOut();
      return "No se encontró un perfil de administrador para este usuario.";
    }

    if (profile.role === "customer") {
      await supabase.auth.signOut();
      return "Tu usuario ya está registrado, pero tu solicitud aún está pendiente de aprobación por el administrador principal.";
    }

    if (profile.role !== "admin") {
      await supabase.auth.signOut();
      return "Este usuario no tiene permisos de administrador.";
    }

    // Update profile name just in case they provided it
    if (loginName.trim()) {
      await supabase
        .from("profiles")
        .update({ full_name: loginName.trim() })
        .eq("id", signInData.user.id);
    }

    // Success — close the modal
    setIsAdminAccessModalOpen(false);
    return null;
  };

  const handleUpdateAllowedAdminEmail = async (email: string) => {
    try {
      await updateAdminEmail(email);
      setAllowedAdminEmail(email.trim().toLowerCase());
      return true;
    } catch (error) {
      console.error(
        "No se pudo actualizar el correo de Control de pedidos:",
        error,
      );
      alert("No se pudo actualizar el correo autorizado.");
      return false;
    }
  };

  // Legacy handleRegisterUser kept for backward compatibility with old modal (disabled with {false &&})
  const handleRegisterUser = async (event: React.FormEvent) => {
    event.preventDefault();
    setRegisterStatus(
      "Usa el nuevo formulario de registro de Control de Pedidos.",
    );
  };

  const handleAdminLogout = async () => {
    if (hasPendingOrders) {
      alert(
        pendingOrdersMessage ||
          "No puedes cerrar sesión porque tienes tickets pendientes.",
      );
      return;
    }

    const snapshot = orders.filter((order) => order.status !== "ENTREGADOS");
    await saveSessionSnapshot("logout", snapshot);
    setOrders([]);
    setHasReadyOrderNotification(false);
    if (supabase) await supabase.auth.signOut();
    setIsAdminAuthenticated(false);
    setActiveUser(null);
    setAdminAccessInput("");
    setActiveTab("home");
  };

  const handleUpdateAdminProfile = (updates: {
    name?: string;
    email?: string;
    generatedKey?: string;
    profileImage?: string;
  }) => {
    if (!activeUser) return;

    const updatedUser = {
      ...activeUser,
      ...updates,
    };

    setRegisteredUsers((prev) =>
      prev.map((entry) => (entry.id === activeUser.id ? updatedUser : entry)),
    );
    setActiveUser(updatedUser);

    const recipients = `${updatedUser.email},${APP_EMAIL}`;
    const subject = encodeURIComponent(
      `Actualización de acceso Administrador - ${updatedUser.name}`,
    );
    const lines = [
      "Se ha actualizado la cuenta de acceso a Administrador.",
      `Nombre: ${updatedUser.name}`,
      `Correo: ${updatedUser.email}`,
      `Clave: ${updatedUser.generatedKey}`,
      "",
      "Cambios aplicados correctamente en el panel de administración.",
    ];
    const body = encodeURIComponent(lines.join("\n"));

    if (typeof window !== "undefined") {
      sendMailto(
        recipients,
        `Actualización de acceso Administrador - ${updatedUser.name}`,
        lines.join("\n"),
      );
    }
  };

  const activeOrdersCount = orders.filter(
    (o) => ["NUEVOS", "EN PREPARACIÓN", "LISTOS"].includes(o.status),
  ).length;
  const pendingStatuses = useMemo(
    () =>
      (["NUEVOS", "EN PREPARACIÓN", "LISTOS"] as OrderStatus[]).filter(
        (status) => orders.some((order) => order.status === status),
      ),
    [orders],
  );
  const hasPendingOrders = pendingStatuses.length > 0;
  const pendingOrdersMessage = hasPendingOrders
    ? `No puedes cerrar sesión porque tienes tickets pendientes en la columna${pendingStatuses.length > 1 ? "s" : ""}: ${pendingStatuses.join(", ")}.`
    : "";

  const totalCartCount = cart.reduce((acc, it) => acc + it.quantity, 0);
  const orderedCustomerOrders = useMemo(
    () =>
      [...orders].filter(o => o.status !== "ARCHIVADOS").sort((a, b) => {
        const ranking: Record<OrderStatus, number> = {
          LISTOS: 0,
          "EN PREPARACIÓN": 1,
          NUEVOS: 2,
          ENTREGADOS: 3,
          ARCHIVADOS: 4,
        };

        return ranking[a.status] - ranking[b.status];
      }),
    [orders],
  );

  const saveSessionSnapshot = async (
    event: "logout" | "session_start",
    snapshotOrders: Order[] = orders,
  ) => {
    try {
      await fetch("/api/session/reset", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          event,
          userId: activeUser?.id ?? "anonymous",
          userName: activeUser?.name ?? "Sin usuario",
          orders: snapshotOrders,
        }),
      });
    } catch (error) {
      console.warn("No se pudo guardar la sesión en MySQL:", error);
    }
  };

  return (
    <div className="min-h-screen bg-[#0A0A0A] text-[#E0E0E0] flex flex-col font-sans selection:bg-white selection:text-black">
      {/* Top Navigation */}
      <TopNavBar
        activeTab={activeTab}
        setActiveTab={handleSetActiveTab}
        cartCount={totalCartCount}
        toggleCart={() => setIsCartOpen(!isCartOpen)}
        activeOrdersCount={activeOrdersCount}
        isAdminAuthenticated={isAdminAuthenticated}
        isAuthenticated={Boolean(activeUser)}
        userRole={activeUser?.role}
        userName={activeUser?.name}
        onOpenAdminAccess={() => setIsAdminAccessModalOpen(true)}
        onCustomerLogout={handleCustomerLogout}
        hasReadyOrderNotification={hasReadyOrderNotification}
        isAnyAdminOnline={isAnyAdminOnline}
      />

      {/* Main Content Views */}
      <main className="flex-grow">
        {activeTab === "home" && !activeUser && (
          <CustomerAuthPage
            onRegister={handleCustomerRegister}
            onLogin={handleCustomerLogin}
            onBack={() => handleSetActiveTab("menu")}
          />
        )}

        {activeTab === "home" && activeUser?.role === "admin" && (
          <div className="flex flex-col gap-12">
            <HeroSection
              onOrderNow={() => setActiveTab("menu")}
              onViewMenu={() => setActiveTab("menu")}
              showLiveStatus
            />
            <FeaturedProducts
              items={menu.filter((item) => item.isFeatured).slice(0, 3)}
              onOpenCustomization={handleOpenCustomization}
              onAddToCartDirect={handleAddToCartDirect}
              onViewAll={() => setActiveTab("menu")}
            />
          </div>
        )}

        {activeTab === "menu" && (
          <div className="px-6 md:px-16 py-12">
            <MenuCatalog
              items={menu}
              onOpenCustomization={handleOpenCustomization}
              onAddToCartDirect={handleAddToCartDirect}
              isAuthenticated={Boolean(activeUser)}
              onGoToAuth={() => setActiveTab("home")}
            />
          </div>
        )}

        {activeTab === "my-orders" && (
          <div className="px-6 md:px-16 py-12">
            <CustomerOrderTracker
              orders={orderedCustomerOrders}
              onGoToMenu={() => setActiveTab("menu")}
            />
          </div>
        )}

        {activeTab === "admin" && isAdminAuthenticated && (
          <BodeAdminDashboard
            activeUser={activeUser}
            orders={orders}
            onUpdateOrderStatus={handleUpdateOrderStatus}
            onClearDelivered={handleClearDelivered}
            onCreateManualOrder={handleCreateManualOrder}
            menuItems={menu}
            onAddMenuItem={handleAddMenuItem}
            onUpdateMenuItem={handleUpdateMenuItem}
            onDeleteMenuItem={handleDeleteMenuItem}
            onUpdateMenuItemPrice={handleUpdateMenuItemPrice}
            onLogoutAdmin={handleAdminLogout}
            onUpdateAdminProfile={handleUpdateAdminProfile}
            allowedAdminEmail={allowedAdminEmail}
            onUpdateAllowedAdminEmail={handleUpdateAllowedAdminEmail}
            salesSummary={salesSummary}
            hasPendingOrders={hasPendingOrders}
            pendingOrdersMessage={pendingOrdersMessage}
          />
        )}
      </main>

      {/* Customization Modal */}
      <CustomizationModal
        item={customizationItem}
        isOpen={isCustomizationOpen}
        onClose={() => setIsCustomizationOpen(false)}
        onAddToCart={handleAddToCartFromModal}
      />

      {/* Cart Drawer */}
      <CartSidebar
        cart={cart}
        isOpen={isCartOpen}
        onClose={() => setIsCartOpen(false)}
        onUpdateQuantity={handleUpdateCartQuantity}
        onRemoveItem={handleRemoveFromCart}
        onCheckout={handleCheckout}
        canCheckout={Boolean(activeUser) && isAnyAdminOnline}
        activeUser={activeUser}
        isAdminOnline={isAnyAdminOnline}
      />

      {/* BodeBot AI Assistant */}
      <BodeBotWidget menu={menu} />

      {/* Footer */}
      {activeTab !== "admin" && activeUser?.role !== "customer" && (
        <Footer setActiveTab={handleSetActiveTab} />
      )}

      {isAdminAccessModalOpen && (
        <AdminAuthPage
          allowedEmail={allowedAdminEmail}
          onRegister={handleAdminRegister}
          onLogin={handleAdminLogin}
          onBack={() => setIsAdminAccessModalOpen(false)}
        />
      )}

      {false && isAdminAccessModalOpen && (
        <div className="fixed inset-0 z-[120] bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-[#141414] border border-white/10 rounded-2xl p-6 shadow-2xl">
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="text-[10px] uppercase tracking-[0.25em] text-white/40">
                  Acceso
                </p>
                <h3 className="text-xl font-bold text-white">Administrador</h3>
              </div>
              <button
                type="button"
                onClick={() => setIsAdminAccessModalOpen(false)}
                className="text-white/60 hover:text-white cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4">
              <form onSubmit={handleRegisterUser} className="space-y-3">
                <div>
                  <label className="block text-[10px] uppercase tracking-[0.25em] text-white/40 mb-2">
                    Nombre
                  </label>
                  <input
                    type="text"
                    required
                    value={userName}
                    onChange={(e) => setUserName(e.target.value)}
                    placeholder="Ej: Rafael García"
                    className="w-full p-3 rounded-xl border border-white/10 bg-[#0A0A0A] text-white outline-none focus:border-white/30"
                  />
                </div>

                <div>
                  <label className="block text-[10px] uppercase tracking-[0.25em] text-white/40 mb-2">
                    Correo
                  </label>
                  <input
                    type="email"
                    required
                    value={userEmail}
                    onChange={(e) => setUserEmail(e.target.value)}
                    placeholder="tuemail@ejemplo.com"
                    className="w-full p-3 rounded-xl border border-white/10 bg-[#0A0A0A] text-white outline-none focus:border-white/30"
                  />
                </div>

                <button
                  type="submit"
                  className="w-full bg-white text-black font-bold text-xs uppercase tracking-widest py-3 rounded-sm hover:bg-white/90 transition-all cursor-pointer"
                >
                  Solicitar acceso seguro
                </button>
              </form>

              <div className="border-t border-white/10 pt-4">
                <label className="block text-[10px] uppercase tracking-[0.25em] text-white/40 mb-2">
                  Correo del administrador
                </label>
                <div className="relative">
                  <input
                    type="email"
                    value={adminAccessInput}
                    onChange={(e) => setAdminAccessInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        handleAdminLogin(userName, adminAccessInput, "");
                      }
                    }}
                    placeholder="admin@ejemplo.com"
                    className="w-full p-3 pr-12 rounded-xl border border-white/10 bg-[#0A0A0A] text-white outline-none focus:border-white/30"
                  />
                  <button
                    type="button"
                    onClick={() => setShowAdminAccessKey((prev) => !prev)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] uppercase tracking-[0.2em] text-white/60 hover:text-white cursor-pointer"
                  >
                    {showAdminAccessKey ? "Ocultar" : "Ver"}
                  </button>
                </div>

                <button
                  type="button"
                  onClick={handleAdminLogin}
                  className="mt-4 w-full bg-emerald-500 text-black font-bold text-xs uppercase tracking-widest py-3 rounded-sm hover:bg-emerald-400 transition-all cursor-pointer"
                >
                  Enviar enlace de acceso
                </button>
              </div>

              {registerStatus && (
                <div className="mt-3 space-y-2">
                  <p className="text-[11px] text-amber-300">{registerStatus}</p>
                  {confirmationLink && (
                    <a
                      href={confirmationLink}
                      target="_blank"
                      rel="noreferrer"
                      className="block break-all text-[11px] text-emerald-300 underline underline-offset-2"
                    >
                      {confirmationLink}
                    </a>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean; error: Error | null }
> {
  state = { hasError: false, error: null as Error | null };

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  render() {
    if (this.state.hasError) {
      return (
        <div
          style={{
            color: "red",
            padding: "20px",
            background: "black",
            minHeight: "100vh",
            fontFamily: "monospace",
          }}
        >
          <h2>Oops, hubo un error de código:</h2>
          <pre>{this.state.error?.message}</pre>
          <pre>{this.state.error?.stack}</pre>
        </div>
      );
    }
    // @ts-ignore
    return this.props.children;
  }
}

export default function AppWrapper() {
  return (
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  );
}
