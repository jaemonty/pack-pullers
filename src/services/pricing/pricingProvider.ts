
export type PricingCard = {
  id: string;
  prices?: { usd: string | null; usdFoil: string | null };
};

export type CardPrice = { nonfoil: number | null; foil: number | null };
export type PriceMap = Record<string, CardPrice>;

export interface PricingProvider {
  id: string;
  displayName: string;
  currency: string;
  enabled: boolean;
  getPrices(cards: PricingCard[]): Promise<PriceMap>;
}

export type PricingSnapshot = {
  provider: string;
  currency: string;
  fetchedAt: string;
  expiresAt: string;
  prices: PriceMap;
  status: "fresh" | "cached" | "snapshot" | "loading" | "error";
};

