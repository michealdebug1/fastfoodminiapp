import { Manrope, Nunito } from "next/font/google";

/**
 * Display face: rounded, confident and a little playful — used for headings,
 * prices and the wordmark. Body face: quiet and highly legible at small sizes.
 * Latin Extended covers Uzbek characters such as oʻ/gʻ; Cyrillic covers Russian.
 */
const nunito = Nunito({
  subsets: ["latin", "latin-ext", "cyrillic"],
  variable: "--font-nunito",
  display: "swap",
});

const manrope = Manrope({
  subsets: ["latin", "latin-ext", "cyrillic"],
  variable: "--font-manrope",
  display: "swap",
});

export const fontVariables = `${nunito.variable} ${manrope.variable}`;
