'use client';

import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import type { CartItem } from '@/types';

interface CartState {
  items: CartItem[];
  isOpen: boolean;
}

interface CartActions {
  // Mutations
  addItem: (item: Omit<CartItem, 'cartItemId'>) => void;
  removeItem: (cartItemId: string) => void;
  updateQuantity: (cartItemId: string, quantity: number) => void;
  clearCart: () => void;
  setOpen: (open: boolean) => void;
  // Server sync (call after login to merge/replace with server cart)
  syncFromServer: (serverItems: CartItem[]) => void;
}

interface CartSelectors {
  totalItems: () => number;
  totalPrice: () => number;
  findByVariant: (productId: string, variantId: string | null) => CartItem | undefined;
}

export type CartStore = CartState & CartActions & CartSelectors;

export const useCartStore = create<CartStore>()(
  persist(
    (set, get) => ({
      items: [],
      isOpen: false,

      addItem: (newItem) => {
        set((state) => {
          const existing = state.items.find(
            (i) => i.productId === newItem.productId && i.variantId === newItem.variantId,
          );

          if (existing) {
            const merged = Math.min(
              existing.quantity + newItem.quantity,
              existing.maxQuantity,
            );
            return {
              items: state.items.map((i) =>
                i.cartItemId === existing.cartItemId
                  ? { ...i, quantity: merged }
                  : i,
              ),
            };
          }

          return {
            items: [
              ...state.items,
              { ...newItem, cartItemId: crypto.randomUUID() },
            ],
          };
        });
      },

      removeItem: (cartItemId) =>
        set((state) => ({
          items: state.items.filter((i) => i.cartItemId !== cartItemId),
        })),

      updateQuantity: (cartItemId, quantity) => {
        if (quantity <= 0) {
          get().removeItem(cartItemId);
          return;
        }
        set((state) => ({
          items: state.items.map((i) =>
            i.cartItemId === cartItemId
              ? { ...i, quantity: Math.min(quantity, i.maxQuantity) }
              : i,
          ),
        }));
      },

      clearCart: () => set({ items: [] }),

      setOpen: (open) => set({ isOpen: open }),

      syncFromServer: (serverItems) => set({ items: serverItems }),

      totalItems: () =>
        get().items.reduce((sum, i) => sum + i.quantity, 0),

      totalPrice: () =>
        get().items.reduce((sum, i) => sum + i.price * i.quantity, 0),

      findByVariant: (productId, variantId) =>
        get().items.find(
          (i) => i.productId === productId && i.variantId === variantId,
        ),
    }),
    {
      name: 'cart-storage',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({ items: state.items }),
    },
  ),
);

// ── Selectors ─────────────────────────────────────────────────────────────────
export const useCartItems = () => useCartStore((s) => s.items);
export const useCartCount = () => useCartStore((s) => s.totalItems());
export const useCartTotal = () => useCartStore((s) => s.totalPrice());
export const useCartOpen = () => useCartStore((s) => s.isOpen);
