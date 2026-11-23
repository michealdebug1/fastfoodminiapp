"use client";

import { useState } from "react";
import type { Product, RestaurantInfo } from "@/features/menu/types";
import { BottomNav } from "./bottom-nav";
import { CartBar } from "./cart-bar";
import { CartSheet } from "./cart-sheet";

interface ShopNavigationProps {
  products: readonly Product[];
  restaurant: RestaurantInfo;
}

/**
 * Client-only chrome for the storefront. Owning the sheet state here keeps the
 * cart bar, bottom navigation and dialog in sync without another context.
 */
export function ShopNavigation({ products, restaurant }: ShopNavigationProps) {
  const [isCartOpen, setIsCartOpen] = useState(false);

  return (
    <>
      <CartBar onOpen={() => setIsCartOpen(true)} />
      <BottomNav onOpenCart={() => setIsCartOpen(true)} />
      <CartSheet
        open={isCartOpen}
        onClose={() => setIsCartOpen(false)}
        products={products}
        restaurant={restaurant}
      />
    </>
  );
}
