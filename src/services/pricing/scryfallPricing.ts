import type { PriceMap, PricingCard, PricingProvider } from "./pricingProvider";

type ScryfallCard = { id: string; prices?: { usd?: string | null; usd_foil?: string | null } };
type CollectionResponse = { data?: ScryfallCard[] };

const toNumber = (value?: string | null) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
};

export class ScryfallPricingProvider implements PricingProvider {
  id = "scryfall";
  displayName = "Scryfall";
  currency = "USD";
  enabled = true;

  async getPrices(cards: PricingCard[]): Promise<PriceMap> {
    const ids = [...new Set(cards.map((card) => card.id))];
    const prices: PriceMap = Object.fromEntries(ids.map((id) => [id, { nonfoil: null, foil: null }]));

    // Scryfall's collection endpoint accepts up to 75 identifiers per request.
    for (let index = 0; index < ids.length; index += 75) {
      const identifiers = ids.slice(index, index + 75).map((id) => ({ id }));
      const response = await fetch("https://api.scryfall.com/cards/collection", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ identifiers }),
      });
      if (!response.ok) throw new Error(`Scryfall pricing refresh failed (${response.status})`);
      const payload = await response.json() as CollectionResponse;
      for (const card of payload.data || []) {
        prices[card.id] = { nonfoil: toNumber(card.prices?.usd), foil: toNumber(card.prices?.usd_foil) };
      }
      if (index + 75 < ids.length) await new Promise((resolve) => setTimeout(resolve, 100));
    }
    return prices;
  }
}
