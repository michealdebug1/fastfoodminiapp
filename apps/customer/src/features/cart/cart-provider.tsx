"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useReducer,
  useRef,
  type ReactNode,
} from "react";
import type { Product, ProductOptionValue } from "@/features/menu/types";
import { CartContext, type CartContextValue } from "./cart-context";
import { cartReducer, initialCartState } from "./cart-reducer";
import { readStoredCart, writeStoredCart } from "./cart-storage";
import { calculateCartTotals } from "./lib/pricing";

interface CartProviderProps {
  children: ReactNode;
  /** Prevents stale product ids from a previous menu surviving in storage. */
  validProductIds: readonly string[];
}

export function CartProvider({
  children,
  validProductIds,
}: CartProviderProps) {
  const [state, dispatch] = useReducer(cartReducer, initialCartState);
  const hasHydrated = useRef(false);

  useEffect(() => {
    if (hasHydrated.current) return;
    hasHydrated.current = true;
    dispatch({
      type: "hydrate",
      lines: readStoredCart(validProductIds),
    });
  }, [validProductIds]);

  useEffect(() => {
    if (!state.isHydrated) return;
    writeStoredCart(state.lines);
  }, [state.isHydrated, state.lines]);

  const totals = useMemo(
    () => calculateCartTotals(state.lines),
    [state.lines],
  );

  const addItem = useCallback(
    (
      product: Pick<Product, "id" | "priceUzs">,
      optionValueIds: readonly string[],
      selectedValues: readonly ProductOptionValue[],
    ) => {
      dispatch({
        type: "add",
        productId: product.id,
        optionValueIds,
        unitPriceUzs:
          product.priceUzs +
          selectedValues.reduce((total, value) => total + value.priceDelta, 0),
      });
    },
    [],
  );

  const setQuantity = useCallback((lineKey: string, quantity: number) => {
    dispatch({ type: "setQuantity", lineKey, quantity });
  }, []);

  const removeItem = useCallback((lineKey: string) => {
    dispatch({ type: "remove", lineKey });
  }, []);

  const clearCart = useCallback(() => {
    dispatch({ type: "clear" });
  }, []);

  const value = useMemo<CartContextValue>(
    () => ({
      lines: state.lines,
      itemCount: totals.itemCount,
      subtotalUzs: totals.subtotalUzs,
      isHydrated: state.isHydrated,
      addItem,
      setQuantity,
      removeItem,
      clearCart,
    }),
    [
      state.lines,
      state.isHydrated,
      totals.itemCount,
      totals.subtotalUzs,
      addItem,
      setQuantity,
      removeItem,
      clearCart,
    ],
  );

  return <CartContext value={value}>{children}</CartContext>;
}
