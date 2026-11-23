import {
  CART_STORAGE_KEY,
  CART_STORAGE_VERSION,
  MAX_ITEM_QUANTITY,
} from "@/lib/constants";
import { getCartLineKey } from "./cart-reducer";
import type { CartLine } from "./types";

interface StoredCart {
  version: number;
  lines: CartLine[];
}

interface ParsedLine {
  productId: string;
  quantity: number;
  optionValueIds: string[];
  unitPriceUzs: number;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function parseLine(value: unknown): ParsedLine | null {
  if (!isRecord(value)) return null;

  const { productId, quantity, optionValueIds, unitPriceUzs } = value;

  if (
    typeof productId !== "string" ||
    typeof quantity !== "number" ||
    !Number.isInteger(quantity) ||
    quantity < 1 ||
    quantity > MAX_ITEM_QUANTITY ||
    typeof unitPriceUzs !== "number" ||
    !Number.isSafeInteger(unitPriceUzs) ||
    unitPriceUzs < 0 ||
    !Array.isArray(optionValueIds) ||
    !optionValueIds.every((id) => typeof id === "string")
  ) {
    return null;
  }

  return {
    productId,
    quantity,
    optionValueIds,
    unitPriceUzs,
  };
}

/**
 * Reads and validates the persisted cart. Corrupt or stale payloads degrade to
 * an empty cart rather than crashing the Mini App.
 */
export function readStoredCart(
  validProductIds: readonly string[],
): CartLine[] {
  if (typeof window === "undefined") return [];

  try {
    const raw = window.localStorage.getItem(CART_STORAGE_KEY);
    if (!raw) return [];

    const parsed: unknown = JSON.parse(raw);
    if (
      !isRecord(parsed) ||
      parsed.version !== CART_STORAGE_VERSION ||
      !Array.isArray(parsed.lines)
    ) {
      return [];
    }

    const validIds = new Set(validProductIds);
    const merged = new Map<string, CartLine>();

    for (const value of parsed.lines) {
      const line = parseLine(value);
      if (!line || !validIds.has(line.productId)) continue;

      const optionValueIds = [...new Set(line.optionValueIds)].sort();
      const key = getCartLineKey(line.productId, optionValueIds);
      const existing = merged.get(key);
      merged.set(key, {
        productId: line.productId,
        optionValueIds,
        unitPriceUzs: line.unitPriceUzs,
        quantity: Math.min(
          (existing?.quantity ?? 0) + line.quantity,
          MAX_ITEM_QUANTITY,
        ),
      });
    }

    return [...merged.values()];
  } catch {
    return [];
  }
}

export function writeStoredCart(lines: readonly CartLine[]): void {
  if (typeof window === "undefined") return;

  const payload: StoredCart = {
    version: CART_STORAGE_VERSION,
    lines: [...lines],
  };

  try {
    window.localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(payload));
  } catch {
    // Private mode or a full quota: the in-memory cart still works.
  }
}
