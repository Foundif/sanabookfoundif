/**
 * Custom storefront cart — fully local (persisted in localStorage), no Shopify calls.
 * The previous Shopify Storefront cart implementation is preserved in
 * src/stores/cartStore.shopify.ts so it can be restored later.
 */
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import type { ShopifyProduct } from "@/lib/shopify";

export interface CartItem {
  lineId: string | null;
  product: ShopifyProduct;
  variantId: string;
  variantTitle: string;
  price: { amount: string; currencyCode: string };
  quantity: number;
  selectedOptions: Array<{ name: string; value: string }>;
}

interface CartStore {
  items: CartItem[];
  cartId: string | null;
  checkoutUrl: string | null;
  isLoading: boolean;
  isSyncing: boolean;
  addItem: (item: Omit<CartItem, "lineId">) => Promise<void>;
  updateQuantity: (variantId: string, quantity: number) => Promise<void>;
  removeItem: (variantId: string) => Promise<void>;
  clearCart: () => void;
  syncCart: () => Promise<void>;
  getCheckoutUrl: () => string | null;
}

export const useCartStore = create<CartStore>()(
  persist(
    (set, get) => ({
      items: [],
      cartId: null,
      checkoutUrl: "/checkout",
      isLoading: false,
      isSyncing: false,

      addItem: async (item) => {
        const items = get().items;
        const existing = items.find((i) => i.variantId === item.variantId);
        if (existing) {
          set({
            items: items.map((i) =>
              i.variantId === item.variantId ? { ...i, quantity: i.quantity + item.quantity } : i,
            ),
          });
        } else {
          set({ items: [...items, { ...item, lineId: item.variantId }] });
        }
      },

      updateQuantity: async (variantId, quantity) => {
        if (quantity <= 0) {
          await get().removeItem(variantId);
          return;
        }
        set({
          items: get().items.map((i) => (i.variantId === variantId ? { ...i, quantity } : i)),
        });
      },

      removeItem: async (variantId) => {
        set({ items: get().items.filter((i) => i.variantId !== variantId) });
      },

      clearCart: () => set({ items: [] }),
      getCheckoutUrl: () => "/checkout",
      syncCart: async () => {},
    }),
    {
      name: "sanabooks-cart",
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({ items: state.items }),
    },
  ),
);
