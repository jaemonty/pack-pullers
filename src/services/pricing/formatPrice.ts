
export function formatPrice(value: number | null | undefined, currency: string): string {
  if (value == null || !Number.isFinite(value)) return "Price unavailable";
  if (currency === "AUD") return `A$${value.toFixed(2)}`;
  if (currency === "USD") return `$${value.toFixed(2)}`;
  return `${currency} ${value.toFixed(2)}`;
}

