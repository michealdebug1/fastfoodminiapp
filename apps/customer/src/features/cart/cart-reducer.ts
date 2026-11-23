import { MAX_ITEM_QUANTITY } from "@/lib/constants";
import type { CartLine } from "./types";

export interface CartState {
  lines: CartLine[];
  isHydrated: boolean;
}

export type CartAction =
  | { type: "hydrate"; lines: CartLine[] }
  | {
      type: "add";
      productId: string;
      optionValueIds: readonly string[];
      unitPriceUzs: number;
    }
  | { type: "setQuantity"; lineKey: string; quantity: number }
  | { type: "remove"; lineKey: string }
  | { type: "clear" };

export const initialCartState: CartState = {
  lines: [],
  isHydrated: false,
};

export function getCartLineKey(
  productId: string,
  optionValueIds: readonly string[],
) {
  return `${productId}:${[...optionValueIds].sort().join(",")}`;
}

/**
 * Pure cart transitions. The reducer owns every quantity rule, which keeps the
 * provider and UI free of business logic and makes the behaviour easy to test.
 */
export function cartReducer(state: CartState, action: CartAction): CartState {
  switch (action.type) {
    case "hydrate":
      return { lines: action.lines, isHydrated: true };

    case "add": {
      const lineKey = getCartLineKey(action.productId, action.optionValueIds);
      const existing = state.lines.find(
        (line) => getCartLineKey(line.productId, line.optionValueIds) === lineKey,
      );

      if (existing) {
        return {
          ...state,
          lines: state.lines.map((line) =>
            getCartLineKey(line.productId, line.optionValueIds) === lineKey
              ? {
                  ...line,
                  quantity: Math.min(
                    line.quantity + 1,
                    MAX_ITEM_QUANTITY,
                  ),
                  unitPriceUzs: action.unitPriceUzs,
                }
              : line,
          ),
        };
      }

      return {
        ...state,
        lines: [
          ...state.lines,
          {
            productId: action.productId,
            quantity: 1,
            optionValueIds: [...action.optionValueIds].sort(),
            unitPriceUzs: action.unitPriceUzs,
          },
        ],
      };
    }

    case "setQuantity": {
      const quantity = Math.min(
        Math.max(Math.trunc(action.quantity), 0),
        MAX_ITEM_QUANTITY,
      );

      if (quantity === 0) {
        return {
          ...state,
          lines: state.lines.filter(
            (line) =>
              getCartLineKey(line.productId, line.optionValueIds) !==
              action.lineKey,
          ),
        };
      }

      return {
        ...state,
        lines: state.lines.map((line) =>
          getCartLineKey(line.productId, line.optionValueIds) ===
          action.lineKey
            ? { ...line, quantity }
            : line,
        ),
      };
    }

    case "remove":
      return {
        ...state,
        lines: state.lines.filter(
          (line) =>
            getCartLineKey(line.productId, line.optionValueIds) !==
            action.lineKey,
        ),
      };

    case "clear":
      return { ...state, lines: [] };
  }
}
