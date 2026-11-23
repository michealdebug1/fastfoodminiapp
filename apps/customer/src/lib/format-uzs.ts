export function formatUzs(amount: number, locale: string): string {
  const groupedAmount = String(Math.round(amount)).replace(
    /\B(?=(\d{3})+(?!\d))/g,
    "\u00a0",
  );
  const currency = locale === "ru" ? "сум" : "soʻm";

  return `${groupedAmount}\u00a0${currency}`;
}
