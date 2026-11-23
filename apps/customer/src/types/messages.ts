import type uz from "@/messages/uz.json";

/** Shape of the default catalog, used to keep data and UI keys in sync. */
export type Messages = typeof uz;

export type MenuCategoryId = keyof Messages["Menu"]["categories"];
export type ProductId = keyof Messages["Menu"]["products"];
export type ProductBadgeKey = keyof Messages["Menu"]["badges"];
