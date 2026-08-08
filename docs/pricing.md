
# Pack Pullers pricing providers

The card browser reads all prices through the shared provider contract in
`src/services/pricing/pricingProvider.ts`. Scryfall is currently the only
enabled public provider. Its collection endpoint is called in batches of no
more than 75 unique Scryfall card IDs, and responses are cached in localStorage
for six hours.

## Adding MTG Mate

`MTGMatePricingProvider` is intentionally disabled and does not scrape the
storefront. Enabling it requires an approved API or structured product feed
that provides:

- a stable printing identifier, ideally Scryfall ID or set code plus collector number;
- separate foil and nonfoil prices;
- prices in AUD; and
- a reliable update timestamp.

Once such a source is available, implement `getPrices`, set `enabled = true`,
and the existing selector, cache, formatting, sorting, and chase-card ranking
will consume it without card UI changes.

