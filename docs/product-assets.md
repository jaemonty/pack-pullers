# Product asset and data status

Pack Pullers deliberately shows a labelled placeholder when final pack art or an eligibility dataset is unavailable. Placeholder products are selectable for interface preview, but cannot open a card database.

| Product | Pack art | Card data |
| --- | --- | --- |
| The Hobbit Collector Booster | Final supplied artwork | Ready |
| The Hobbit Play Booster | Needed | Needed |
| The Hobbit Box Topper | Needed | Needed |
| TMNT Collector Booster | Needed | Needed |
| TMNT Play Booster | Needed | Needed |
| Marvel Collector Booster | Temporary artwork | Needed |

Final pack artwork should be a tightly cropped transparent PNG or WebP. Add the image under `public/assets/`, update the product's `image` and `artStatus` in `public/data/products/index.json`, and add a real product eligibility dataset before setting `enabled` to `true`.

Do not reuse the Hobbit Collector card list for another product: each pack needs its own verified collation or eligibility source.
