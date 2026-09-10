import { create } from "zustand";

/** Controls the slide-out fly-cart so any "add to cart" button can open it. */
interface CartUiStore {
  isOpen: boolean;
  setOpen: (open: boolean) => void;
  openCart: () => void;
  closeCart: () => void;
}

export const useCartUi = create<CartUiStore>((set) => ({
  isOpen: false,
  setOpen: (isOpen) => set({ isOpen }),
  openCart: () => set({ isOpen: true }),
  closeCart: () => set({ isOpen: false }),
}));
