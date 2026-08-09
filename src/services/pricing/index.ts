import { readPriceCache, writePriceCache } from "./cache";
import { MTGMatePricingProvider } from "./mtgMatePricing";
import type { PriceMap, PricingCard, PricingProvider, PricingSnapshot } from "./pricingProvider";
import { ScryfallPricingProvider } from "./scryfallPricing";

export * from "./formatPrice";
export type { CardPrice, PriceMap, PricingProvider, PricingSnapshot } from "./pricingProvider";

const providers: PricingProvider[] = [new ScryfallPricingProvider(), new MTGMatePricingProvider()];
const refreshes = new Map<string, Promise<PricingSnapshot>>();

export const enabledPricingProviders = providers.filter((provider) => provider.enabled);
export const getPricingProvider = (id: string) => providers.find((provider) => provider.id === id) || enabledPricingProviders[0];

const embeddedPrices = (cards: PricingCard[]): PriceMap => Object.fromEntries(cards.map((card) => [card.id, {
  nonfoil: toNumber(card.prices?.usd),
  foil: toNumber(card.prices?.usdFoil),
}]));

const toNumber = (value?: string | null) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
};

export function loadPricing(
  providerId: string,
  cards: PricingCard[],
  generatedAt: string,
  onUpdate: (snapshot: PricingSnapshot) => void,
): () => void {
  const provider = getPricingProvider(providerId);
  const cardIds = [...new Set(cards.map((card) => card.id))];
  const cached = readPriceCache(provider.id, cardIds);
  let active = true;

  if (cached) onUpdate(cached);
  else onUpdate({
    provider: provider.id,
    currency: provider.currency,
    fetchedAt: generatedAt,
    expiresAt: generatedAt,
    prices: embeddedPrices(cards),
    status: "snapshot",
  });

  if (cached?.status === "fresh") return () => { active = false; };

  const signature = `${provider.id}:${cardIds.slice().sort().join(",")}`;
  let refresh = refreshes.get(signature);
  if (!refresh) {
    refresh = provider.getPrices(cards)
      .then((prices) => writePriceCache(provider.id, provider.currency, prices))
      .finally(() => refreshes.delete(signature));
    refreshes.set(signature, refresh);
  }
  refresh.then((snapshot) => { if (active) onUpdate(snapshot); }).catch(() => {
    if (!active) return;
    const fallback = cached || {
      provider: provider.id,
      currency: provider.currency,
      fetchedAt: generatedAt,
      expiresAt: generatedAt,
      prices: embeddedPrices(cards),
      status: "error" as const,
    };
    onUpdate({ ...fallback, status: cached ? "cached" : "error" });
  });
  return () => { active = false; };
}
