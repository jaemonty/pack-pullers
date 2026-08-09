/** @typedef {{name:string,set:string,collectorNumber:string,finish:"foil"|"nonfoil"}} MtgMateCardIdentity */

/** @param {string} name */
export function slugifyMtgMateCardName(name) {
  return name.normalize("NFKC").trim().replace(/\s*\/\/\s*/g, "_//_").replace(/\s+/g, "_");
}

/** @param {MtgMateCardIdentity["finish"]} finish */
export function getMtgMateFinishSuffix(finish) {
  return finish === "foil" ? ":foil" : "";
}

/** @param {MtgMateCardIdentity} card */
export function buildMtgMateCardUrl(card) {
  return `https://www.mtgmate.com.au/cards/${slugifyMtgMateCardName(card.name)}/${encodeURIComponent(card.set.toUpperCase())}/${encodeURIComponent(card.collectorNumber)}${getMtgMateFinishSuffix(card.finish)}`;
}

