export type ProductAccent = "yellow" | "tomato" | "cream" | "basil";

export interface MenuCategory {
  id: string;
  name: string;
}

export interface ProductOptionValue {
  id: string;
  name: string;
  priceDelta: number;
}

export interface ProductOptionGroup {
  id: string;
  name: string;
  isRequired: boolean;
  minSelections: number;
  maxSelections: number | null;
  values: readonly ProductOptionValue[];
}

export interface Product {
  id: string;
  categoryId: string | null;
  name: string;
  description: string;
  priceUzs: number;
  imageUrl: string | null;
  isFeatured: boolean;
  accent: ProductAccent;
  options: readonly ProductOptionGroup[];
}

export interface RestaurantInfo {
  id: string;
  name: string;
  address: string | null;
  phone: string | null;
  currency: "UZS";
  pickupEnabled: boolean;
  minimumOrderAmount: number;
  workingHours: unknown;
}

export interface MenuCatalog {
  categories: readonly MenuCategory[];
  products: readonly Product[];
  restaurant: RestaurantInfo;
}
