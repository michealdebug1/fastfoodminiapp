export interface CartLine {
  productId: string;
  quantity: number;
  optionValueIds: readonly string[];
  /** Display-only price snapshot in UZS; checkout always uses database prices. */
  unitPriceUzs: number;
}

export interface CartTotals {
  itemCount: number;
  subtotalUzs: number;
}
