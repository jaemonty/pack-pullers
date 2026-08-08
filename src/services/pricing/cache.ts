
import type { PriceMap, PricingSnapshot } from "./pricingProvider";

export const PRICE_CACHE_TTL = 6 * 60 * 60 * 1000;
const CACHE_PREFIX = "pack-pullers-pricing-v1";

const storageKey = (provider: string) => `${CACHE_PREFIX}:${provider}`;

export function readPriceCache(provider: string, cardIds: string[]): PricingSnapshot | null {
  try {
    const raw = localStorage.getItem(storageKey(provider));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as PricingSnapshot;
    if (!parsed.prices || !cardIds.every((id) => id in parsed.prices)) return null;
    return { ...parsed, status: Date.parse(parsed.expiresAt) > Date.now() ? "fresh" : "cached" };
  } catch {
    return null;
  }
}

export function writePriceCache(provider: string, currency: string, prices: PriceMap): PricingSnapshot {
  const fetchedAt = new Date();
  const snapshot: PricingSnapshot = {
    provider,
    currency,
    fetchedAt: fetchedAt.toISOString(),
    expiresAt: new Date(fetchedAt.getTime() + PRICE_CACHE_TTL).toISOString(),
    prices,
    status: "fresh",
  };
  try { localStorage.setItem(storageKey(provider), JSON.stringify(snapshot)); } catch { /* storage is optional */ }
  return snapshot;
}

