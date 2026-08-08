
import type { PriceMap, PricingCard, PricingProvider } from "./pricingProvider";

/**
 * Disabled until MTG Mate provides an approved API or structured product feed.
 * A future adapter needs a stable printing identifier (Scryfall ID, set code +
 * collector number, or SKU), finish-specific AUD prices, and update timestamps.
 * Deliberately does not scrape storefront HTML.
 */
export class MTGMatePricingProvider implements PricingProvider {
  id = "mtg-mate";
  displayName = "MTG Mate";
  currency = "AUD";
  enabled = false;

  async getPrices(cards: PricingCard[]): Promise<PriceMap> {
    void cards;
    throw new Error("MTG Mate pricing requires an approved API or data feed.");
  }
}

