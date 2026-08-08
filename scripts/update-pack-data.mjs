import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const root = process.cwd();
const manifest = JSON.parse(await readFile(path.join(root, "data/products/the-hobbit-collector.json"), "utf8"));
const headers = {
  "User-Agent": "PackPullers/0.2 (local static card reference)",
  Accept: "application/json;q=0.9,*/*;q=0.8",
};

async function fetchSet(setCode) {
  let url = `https://api.scryfall.com/cards/search?q=set%3A${setCode.toLowerCase()}&order=set&unique=prints`;
  const cards = [];
  while (url) {
    const response = await fetch(url, { headers });
    if (!response.ok) throw new Error(`Scryfall returned ${response.status} for ${setCode}`);
    const page = await response.json();
    cards.push(...page.data);
    url = page.next_page || null;
    if (url) await new Promise((resolve) => setTimeout(resolve, 120));
  }
  return cards;
}

function finishesFor(rule, rarity) {
  if (rule === "foil-only") return ["foil"];
  if (rule === "nonfoil-only") return ["nonfoil"];
  if (rule === "scene-by-rarity") return ["common", "uncommon"].includes(rarity) ? ["foil"] : ["nonfoil", "foil"];
  if (rule === "booster-fun-by-rarity") return rarity === "uncommon" ? ["foil"] : ["nonfoil", "foil"];
  return ["nonfoil", "foil"];
}

function imageFor(card, size) {
  if (card.image_uris) return card.image_uris[size] || card.image_uris.normal;
  return card.card_faces?.find((face) => face.image_uris)?.image_uris?.[size] || null;
}

const sourceCards = (await Promise.all(manifest.setCodes.map(fetchSet))).flat();
const cards = [];
for (const card of sourceCards) {
  const number = Number.parseInt(card.collector_number, 10);
  const rule = manifest.eligibility.find((entry) => entry.set.toLowerCase() === card.set && number >= entry.from && number <= entry.to);
  if (!rule) continue;
  cards.push({
    id: card.id,
    oracleId: card.oracle_id,
    name: card.name,
    fullName: card.name,
    set: card.set.toUpperCase(),
    setName: card.set_name,
    collectorNumber: card.collector_number,
    collectorNumberNumeric: number,
    rarity: card.rarity,
    typeLine: card.type_line,
    oracleText: card.oracle_text || card.card_faces?.map((face) => `${face.name} — ${face.oracle_text || ""}`).join("\n\n") || "",
    treatment: rule.treatment,
    eligibleFinishes: finishesFor(rule.finishRule, card.rarity),
    image: imageFor(card, "normal"),
    smallImage: imageFor(card, "small"),
    prices: { usd: card.prices?.usd || null, usdFoil: card.prices?.usd_foil || null },
    scryfall: card.scryfall_uri,
  });
}

cards.sort((a, b) => a.set.localeCompare(b.set) || a.collectorNumberNumeric - b.collectorNumberNumeric);
const output = {
  product: manifest.id,
  generatedAt: new Date().toISOString(),
  officialSource: manifest.officialSource,
  printingCount: cards.length,
  cards,
};
await mkdir(path.join(root, "public/data/generated"), { recursive: true });
await writeFile(path.join(root, "public/data/generated/the-hobbit-collector.json"), `${JSON.stringify(output, null, 2)}\n`);
console.log(`Wrote ${cards.length} eligible printings.`);
