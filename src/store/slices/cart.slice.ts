import { create } from "zustand";

const DEFAULT_TAX_RATE = 0.14;

interface ProductLike {
  id: string | number;
  name: string;
  price: number;
  isTaxable?: boolean;
  taxRate?: number; // percent, e.g. 14 for 14%
}

export interface CartItem {
  product: ProductLike;
  quantity: number;
}

interface CartState {
  items: CartItem[];
  prices: Record<string, number>; // optional exact prices per product id
  addOrUpdateItem: (
    product: ProductLike,
    quantity: number,
    exactPrice?: number,
  ) => void;
  removeItem: (productId: string | number) => void;
  clearCart: () => void;
  getSubtotal: () => number;
  getTax: () => number;
  getTotal: () => number;
}

export const useCartStore = create<CartState>((set, get) => ({
  items: [],
  prices: {},

  addOrUpdateItem: (product, quantity, exactPrice) => {
    set((state) => {
      const exists = state.items.find(
        (i) => `${i.product.id}` === `${product.id}`,
      );
      let items = state.items;

      if (quantity <= 0) {
        items = items.filter((i) => `${i.product.id}` !== `${product.id}`);
      } else if (exists) {
        items = items.map((i) =>
          `${i.product.id}` === `${product.id}` ? { ...i, quantity } : i,
        );
      } else {
        items = [...items, { product, quantity }];
      }

      const prices = { ...state.prices };
      if (exactPrice !== undefined) prices[`${product.id}`] = exactPrice;

      return { items, prices };
    });
  },

  removeItem: (productId) => {
    set((state) => ({
      items: state.items.filter((i) => `${i.product.id}` !== `${productId}`),
    }));
  },

  clearCart: () => set({ items: [], prices: {} }),

  getSubtotal: () => {
    const { items, prices } = get();
    return items.reduce((sum, item) => {
      const itemPrice =
        prices[`${item.product.id}`] ?? item.product.price * item.quantity;
      return sum + itemPrice;
    }, 0);
  },

  getTax: () => {
    const { items, prices } = get();
    return items.reduce((sum, item) => {
      if (!item.product.isTaxable) return sum;

      const itemPrice =
        prices[`${item.product.id}`] ?? item.product.price * item.quantity;

      const rate =
        item.product.taxRate !== undefined
          ? item.product.taxRate / 100
          : DEFAULT_TAX_RATE;

      return sum + itemPrice * rate;
    }, 0);
  },

  getTotal: () => {
    const s = get().getSubtotal();
    const t = get().getTax();
    return s + t;
  },
}));
