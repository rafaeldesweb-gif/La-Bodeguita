import {
  CartItem,
  MenuItem,
  Order,
  OrderStatus,
  getCartItemLineTotal,
} from "../types";
import { INITIAL_MENU } from "./initialMenu";

const roundMoney = (value: number) => Number(value.toFixed(2));

const randomFrom = <T>(items: T[], index: number) =>
  items[index % items.length];

const buildCartItem = (
  seed: number,
  item: MenuItem,
  quantity = 1,
): CartItem => {
  const extras = item.availableExtras.slice(
    0,
    (seed + 1) % (item.availableExtras.length + 1),
  );
  const extraTotal = extras.reduce((sum, extra) => sum + extra.price, 0);

  return {
    cartId: `${item.id}-${seed}-${Math.random().toString(36).slice(2, 8)}`,
    item,
    customization: {
      removals: seed % 2 === 0 ? ["Sin cebolla"] : [],
      extras,
      sauces:
        seed % 3 === 0 ? [item.availableSauces[0] || "Salsa Bodeguita"] : [],
      notes: seed % 2 === 0 ? "Sin tomate" : "",
    },
    unitPrice: roundMoney(item.price + extraTotal),
    quantity,
  };
};

const orderFactory = (
  seed: number,
  status: OrderStatus,
  minutesAgo: number,
): Order => {
  const itemsPool = INITIAL_MENU.filter((item) => item.category !== "bebidas");
  const beverage = randomFrom(
    INITIAL_MENU.filter((item) => item.category === "bebidas"),
    seed + 4,
  );
  const chosenA = randomFrom(itemsPool, seed);
  const chosenB = randomFrom(itemsPool, seed + 2);
  const chosenC = randomFrom(INITIAL_MENU, seed + 5);

  const orderItems: CartItem[] = [
    buildCartItem(seed, chosenA, 1 + (seed % 2)),
    buildCartItem(seed + 1, chosenB, (seed % 3) + 1),
    buildCartItem(seed + 2, beverage, 1),
    buildCartItem(seed + 3, chosenC, 1),
  ];

  const total = roundMoney(
    orderItems.reduce((sum, item) => sum + getCartItemLineTotal(item), 0),
  );

  const customerNames = [
    "Mesa 4",
    "Carlos M.",
    "Ana R.",
    "Mesa 2",
    "Luis P.",
    "Javi S.",
    "Sofía G.",
    "Rappi Customer",
    "UberEats Customer",
  ];
  const locationMap = [
    "Mesa 4 - Presencial",
    "Delivery - Calle Mayor 15",
    "Pickup - Para Llevar",
    "Mesa 7 - Terraza",
    "UberEats #UB-8801",
    "Rappi #RP-9912",
  ];

  return {
    id: `#${1000 + seed}`,
    createdAt: `Hace ${minutesAgo}m`,
    timestamp: Date.now() - minutesAgo * 60 * 1000,
    type:
      minutesAgo % 3 === 0
        ? "Delivery"
        : minutesAgo % 2 === 0
          ? "Pickup"
          : "Table",
    locationDetail: randomFrom(locationMap, seed),
    status,
    total,
    customerName: randomFrom(customerNames, seed),
    items: orderItems,
  };
};

export const INITIAL_ORDERS: Order[] = [];
