import { createContext } from "react";
import type { Product, ProductOptionValue } from "@/features/menu/types";
import type { CartLine } from "./types";

export interface CartContextValue {
  readonly lines: readonly CartLine[];
  readonly itemCount: number;
  readonly subtotalUzs: number;
  readonly isHydrated: boolean;
  addItem: (
    product: Pick<Product, "id" | "priceUzs">,
    optionValueIds: readonly string[],
    selectedValues: readonly ProductOptionValue[],
  ) => void;
  setQuantity: (lineKey: string, quantity: number) => void;
  removeItem: (lineKey: string) => void;
  clearCart: () => void;
}

export const CartContext = createContext<CartContextValue | null>(null);
