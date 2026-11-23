/**
 * Tiny class-name joiner. Keeps conditional styling readable without pulling in
 * a utility dependency for the few cases we need.
 */
export function cn(
  ...values: ReadonlyArray<string | false | null | undefined>
): string {
  return values.filter(Boolean).join(" ");
}
