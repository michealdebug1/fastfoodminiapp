import type { CartLine, CartTotals } from "../types";

export function calculateCartTotals(
  lines: readonly CartLine[],
): CartTotals {
  return lines.reduce<CartTotals>(
    (totals, line) => ({
      itemCount: totals.itemCount + line.quantity,
      subtotalUzs: totals.subtotalUzs + line.unitPriceUzs * line.quantity,
    }),
    { itemCount: 0, subtotalUzs: 0 },
  );
}
