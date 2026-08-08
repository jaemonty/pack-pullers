
"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { enabledPricingProviders, formatPrice, getPricingProvider, loadPricing, type PricingSnapshot } from "../src/services/pricing";

type Product = { id: string; name: string; type: string; year: string; image: string; enabled: boolean; imageTreatment?: string };
type Finish = "nonfoil" | "foil";
type Card = {
  id: string; oracleId: string; name: string; fullName: string; set: string; setName: string;
  collectorNumber: string; collectorNumberNumeric: number; rarity: string; typeLine: string;
  oracleText: string; treatment: string; eligibleFinishes: Finish[]; image: string | null;
  smallImage: string | null; prices: { usd: string | null; usdFoil: string | null }; scryfall: string;
};
type CardData = { generatedAt: string; printingCount: number; officialSource: string; cards: Card[] };

const rarityLabel = (rarity: string) => rarity.charAt(0).toUpperCase() + rarity.slice(1);
const finishLabel = (finish: Finish) => finish === "foil" ? "Traditional / special foil" : "Non-foil";
const elapsedLabel = (isoDate: string) => {
  const minutes = Math.max(0, Math.floor((Date.now() - Date.parse(isoDate)) / 60_000));
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.floor(minutes / 60);
  return hours < 24 ? `${hours}h ago` : `${Math.floor(hours / 24)}d ago`;
};
const cachedAudRate = () => {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem("pack-pullers-aud-rate");
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return Date.now() - parsed.at < 86_400_000 && Number.isFinite(parsed.rate) ? parsed.rate : null;
  } catch { return null; }
};

export default function Home() {
  const [products, setProducts] = useState<Product[]>([]);
  const [selectedProductIndex, setSelectedProductIndex] = useState(0);
  const [previewProduct, setPreviewProduct] = useState<Product | null>(null);
  const [view, setView] = useState<"machine" | "database">("machine");
  const [data, setData] = useState<CardData | null>(null);
  const [loading, setLoading] = useState(false);
  const [query, setQuery] = useState("");
  const [rarity, setRarity] = useState("all");
  const [treatment, setTreatment] = useState("all");
  const [finish, setFinish] = useState("all");
  const [sort, setSort] = useState("value-desc");
  const [viewMode, setViewMode] = useState<"list" | "grid">("list");
  const [selectedCard, setSelectedCard] = useState<Card | null>(null);
  const [audRate, setAudRate] = useState<number | null>(cachedAudRate);
  const [pricingProviderId, setPricingProviderId] = useState(() => {
    if (typeof window === "undefined") return "scryfall";
    const saved = localStorage.getItem("pack-pullers-pricing-provider");
    return saved && enabledPricingProviders.some((provider) => provider.id === saved) ? saved : "scryfall";
  });
  const [pricing, setPricing] = useState<PricingSnapshot | null>(null);

  useEffect(() => {
    Promise.all([
      fetch("data/products/index.json").then((response) => response.json()),
      Promise.resolve<"list" | "grid">(localStorage.getItem("pack-pullers-view") === "grid" ? "grid" : "list"),
    ]).then(([loadedProducts, savedView]) => { setProducts(loadedProducts); setViewMode(savedView); });
    fetch("https://open.er-api.com/v6/latest/USD")
      .then((response) => response.json())
      .then((result) => { if (result.rates?.AUD) { setAudRate(result.rates.AUD); localStorage.setItem("pack-pullers-aud-rate", JSON.stringify({ rate: result.rates.AUD, at: Date.now() })); } })
      .catch(() => undefined);
  }, []);

  useEffect(() => {
    if (!data) return;
    return loadPricing(pricingProviderId, data.cards, data.generatedAt, setPricing);
  }, [data, pricingProviderId]);

  const selectedProduct = products[selectedProductIndex];
  const cycleProduct = (direction: number) => {
    if (!products.length) return;
    setSelectedProductIndex((current) => (current + direction + products.length) % products.length);
  };

  const openDatabase = async () => {
    if (!selectedProduct?.enabled) { setPreviewProduct(selectedProduct || null); return; }
    setView("database");
    if (data) return;
    setLoading(true);
    try { setData(await fetch("data/generated/the-hobbit-collector.json").then((response) => response.json())); }
    finally { setLoading(false); }
  };

  const treatments = useMemo(() => [...new Set(data?.cards.map((card) => card.treatment) || [])].sort(), [data]);
  const selectedProvider = getPricingProvider(pricingProviderId);
  const providerPrice = useCallback((card: Card, cardFinish: Finish) => pricing?.prices[card.id]?.[cardFinish] ?? null, [pricing]);
  const changePricingProvider = (providerId: string) => {
    setPricingProviderId(providerId);
    localStorage.setItem("pack-pullers-pricing-provider", providerId);
  };
  const filteredCards = useMemo(() => {
    const needle = query.trim().toLowerCase();
    const matches = (data?.cards || []).filter((card) => {
      const matchesQuery = !needle || `${card.name} ${card.fullName} ${card.collectorNumber} ${card.set}`.toLowerCase().includes(needle);
      return matchesQuery && (rarity === "all" || card.rarity === rarity) && (treatment === "all" || card.treatment === treatment) && (finish === "all" || card.eligibleFinishes.includes(finish as Finish));
    });
    const bestPrice = (card: Card) => Math.max(...card.eligibleFinishes.map((item) => providerPrice(card, item) ?? -1));
    return matches.sort((a, b) => sort === "value-desc" ? bestPrice(b) - bestPrice(a) : sort === "name" ? a.name.localeCompare(b.name) : a.set.localeCompare(b.set) || a.collectorNumberNumeric - b.collectorNumberNumeric);
  }, [data, query, rarity, treatment, finish, sort, providerPrice]);

  const chaseCards = useMemo(() => {
    const cards = data?.cards || [];
    const headliner = cards.find((card) => card.treatment === "Gleaming Gold headliner");
    const priced = cards.flatMap((card) => card.eligibleFinishes.map((eligibleFinish) => ({ card, finish: eligibleFinish, price: providerPrice(card, eligibleFinish), headliner: false }))).filter((entry) => entry.price !== null && entry.card.id !== headliner?.id).sort((a, b) => (b.price ?? -1) - (a.price ?? -1));
    return [...(headliner ? [{ card: headliner, finish: "foil" as Finish, price: null, headliner: true }] : []), ...priced].slice(0, 3);
  }, [data, providerPrice]);

  const changeViewMode = (mode: "list" | "grid") => { setViewMode(mode); localStorage.setItem("pack-pullers-view", mode); };
  const clearFilters = () => { setQuery(""); setRarity("all"); setTreatment("all"); setFinish("all"); };
  const aud = (price: number | null) => price != null && audRate ? `â‰ˆ ${formatPrice(price * audRate, "AUD")} converted` : "AUD conversion unavailable";
  const pricingMeta = pricing ? `${selectedProvider.displayName} â€¢ ${pricing.status === "fresh" ? "updated" : pricing.status === "snapshot" ? "included snapshot" : pricing.status === "error" ? "refresh unavailable" : "cached"} ${elapsedLabel(pricing.fetchedAt)}` : `${selectedProvider.displayName} â€¢ loading prices`;

  if (view === "database") {
    return <main className="databasePage">
      <header className="databaseHero">
        <div className="referenceCloud referenceCloudOne" /><div className="referenceCloud referenceCloudTwo" />
        <button className="backButton" type="button" onClick={() => setView("machine")}>â† VENDING MACHINE</button>
        <div className="databasePack"><img src="assets/hobbit-collector-booster-blue.png" alt="The Hobbit Collector Booster" /></div>
        <div className="databaseHeading">
          <p>PACK PULLER DATABASE</p><h1>THE HOBBIT</h1><h2>Collector Booster</h2>
          <div className="databaseStats"><span><b>{data?.printingCount || "â€”"}</b> eligible printings</span><span><b>15</b> cards per pack</span><span><b>{audRate ? audRate.toFixed(2) : "â€”"}</b> USD â†’ AUD</span></div>
        </div>
      </header>

      {loading ? <div className="databaseLoading"><i /><p>Consulting the archivesâ€¦</p></div> : data && <div className="databaseShell">
        <section className="chaseSection" aria-labelledby="chase-title">
          <div className="sectionTitle"><p>THE TREASURE HOARD</p><h2 id="chase-title">CHASE CARDS</h2><span>Highest priced eligible printing + finish</span></div>
          <div className="chaseGrid">{chaseCards.map(({ card, finish: cardFinish, price, headliner }, index) => <button className={`chaseCard chase${index + 1}`} key={`${card.id}-${cardFinish}`} onClick={() => setSelectedCard(card)}>
            <b className="rank">#{index + 1}</b>{headliner && <b className="headlinerBadge">â‰ˆ500 MADE</b>}<img src={card.image || "assets/card-back.svg"} alt={card.name} /><div><strong>{card.name}</strong><span>{card.treatment} Â· {finishLabel(cardFinish)}</span><em>{headliner ? "ULTRA-RARE HEADLINER" : formatPrice(price, pricing?.currency || selectedProvider.currency)}</em><small>{price != null ? aud(price) : "Market price not yet available"}</small></div>
          </button>)}</div>
        </section>

        <section className="pullsSection" aria-labelledby="pulls-title">
          <div className="sectionTitle pullsTitle"><div><p>CHECK YOUR PACK</p><h2 id="pulls-title">ALL POSSIBLE PULLS</h2></div><span>{filteredCards.length} of {data.printingCount} printings</span></div>
          <div className="filterBar">
            <label className="searchBox"><span>âŒ•</span><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search card name or collector number" /></label>
            <select aria-label="Rarity" value={rarity} onChange={(event) => setRarity(event.target.value)}><option value="all">All rarities</option><option value="common">Common</option><option value="uncommon">Uncommon</option><option value="rare">Rare</option><option value="mythic">Mythic</option></select>
            <select aria-label="Treatment" value={treatment} onChange={(event) => setTreatment(event.target.value)}><option value="all">All treatments</option>{treatments.map((item) => <option key={item}>{item}</option>)}</select>
            <select aria-label="Finish" value={finish} onChange={(event) => setFinish(event.target.value)}><option value="all">All finishes</option><option value="nonfoil">Non-foil</option><option value="foil">Foil</option></select>
            <select aria-label="Sort cards" value={sort} onChange={(event) => setSort(event.target.value)}><option value="value-desc">Value: high to low</option><option value="collector">Collector number</option><option value="name">Card name</option></select>
            <button className="clearButton" type="button" onClick={clearFilters}>Clear</button>
          </div>
          <div className="databaseTools"><label className="pricingSelector"><span>PRICE SOURCE</span><select aria-label="Price source" value={pricingProviderId} onChange={(event) => changePricingProvider(event.target.value)}>{enabledPricingProviders.map((provider) => <option key={provider.id} value={provider.id}>{provider.displayName} Â· {provider.currency}</option>)}</select><small>{pricingMeta}</small></label><div className="viewSwitch"><button className={viewMode === "list" ? "active" : ""} onClick={() => changeViewMode("list")}>â˜· Compact</button><button className={viewMode === "grid" ? "active" : ""} onClick={() => changeViewMode("grid")}>â–¦ Grid</button></div></div>
          <div className={viewMode === "list" ? "cardList" : "cardGrid"}>{filteredCards.map((card) => {
            const prices = card.eligibleFinishes.map((eligibleFinish) => providerPrice(card, eligibleFinish)).filter((price): price is number => price != null);
            const best = prices.length ? Math.max(...prices) : null;
            return <button className="cardEntry" key={card.id} onClick={() => setSelectedCard(card)}>
              <img src={card.smallImage || "assets/card-back.svg"} alt="" loading="lazy" />
              <div className="cardIdentity"><strong>{card.name}</strong><span>{card.set} #{card.collectorNumber} Â· {rarityLabel(card.rarity)}</span><small>{card.treatment}</small></div>
              <div className="finishTags">{card.eligibleFinishes.map((item) => <span key={item}>{item === "foil" ? "FOIL" : "NON-FOIL"}</span>)}</div>
              <div className="cardPrice"><b>{formatPrice(best, pricing?.currency || selectedProvider.currency)}</b><span>{aud(best)}</span></div>
            </button>;
          })}</div>
          {!filteredCards.length && <div className="emptyState"><b>No cards found</b><span>Try clearing a filter or changing your search.</span></div>}
          <footer className="dataNote">Eligibility verified against <a href={data.officialSource} target="_blank" rel="noreferrer">Wizardsâ€™ Collector Booster collation</a>. Card data and images from Scryfall. Prices shown from {selectedProvider.displayName} in {pricing?.currency || selectedProvider.currency}; AUD figures are currency conversions, not Australian market prices.</footer>
        </section>
      </div>}

      {selectedCard && <section className="cardDialog" role="dialog" aria-modal="true" aria-labelledby="card-dialog-title"><button className="dialogBackdrop" aria-label="Close card details" onClick={() => setSelectedCard(null)} /><div className="cardDialogPanel"><button className="dialogClose" onClick={() => setSelectedCard(null)}>Ã—</button><img src={selectedCard.image || "assets/card-back.svg"} alt={selectedCard.name} /><div><p>{selectedCard.set} #{selectedCard.collectorNumber}</p><h2 id="card-dialog-title">{selectedCard.name}</h2><h3>{selectedCard.typeLine}</h3><div className="detailPills"><span>{rarityLabel(selectedCard.rarity)}</span><span>{selectedCard.treatment}</span>{selectedCard.eligibleFinishes.map((item) => <span key={item}>{finishLabel(item)}</span>)}</div><p className="oracleText">{selectedCard.oracleText}</p><a className="scryfallLink" href={selectedCard.scryfall} target="_blank" rel="noreferrer">VIEW ON SCRYFALL â†—</a></div></div></section>}
    </main>;
  }

  return <main className="world">
    <div className="stars" aria-hidden="true" /><div className="cloud cloudOne" aria-hidden="true" /><div className="cloud cloudTwo" aria-hidden="true" /><div className="cloud cloudThree" aria-hidden="true" /><div className="cloud cloudFour" aria-hidden="true" />
    <section className="hero" aria-labelledby="site-title"><header className="brandPlaque"><span className="brandSpark">âœ¦</span><p>THE CELESTIAL ARCADE</p><h1 id="site-title">PACK<br />PULLERS</h1><div className="brandRibbon">CHOOSE YOUR ADVENTURE</div></header>
      <div className="machine" aria-label="Celestial booster vending machine"><div className="machineTopGlow" /><div className="displayBay"><div className="bayLights"><i /><i /><i /><i /><i /></div><div className="slotRail" />
        {selectedProduct && <><button className="packArrow packArrowLeft" onClick={() => cycleProduct(-1)} aria-label="Previous booster">â€¹</button><button className={`packButton ${selectedProduct.imageTreatment || ""}`} key={selectedProduct.id} onClick={openDatabase} aria-label={`Choose ${selectedProduct.name} ${selectedProduct.type}`}><span className="packAura" /><img src={selectedProduct.image} alt={`${selectedProduct.name} ${selectedProduct.type} pack`} /></button><button className="packArrow packArrowRight" onClick={() => cycleProduct(1)} aria-label="Next booster">â€º</button></>}
        <div className="selectorDots" aria-label="Choose a booster">{products.map((product, index) => <button key={product.id} className={index === selectedProductIndex ? "active" : ""} onClick={() => setSelectedProductIndex(index)} aria-label={`Show ${product.name}`}><span /><small>{product.name === "The Hobbit" ? "HOB" : "MSH"}</small></button>)}</div>
        <div className="bayCaption"><strong>{selectedProduct?.name || "CHOOSE A BOOSTER"}</strong><span>{selectedProduct?.type} Â· {selectedProduct?.year}</span></div></div>
        <aside className="machinePanel"><div className="panelLabel">SELECT A<br />BOOSTER</div><div className="arcaneButton"><span>âœ¦</span></div><div className="coinSlot"><i /><b /></div><div className="flameMark">â™ </div></aside><button className="chooseButton" disabled={!selectedProduct} onClick={openDatabase}><span>{selectedProduct?.enabled ? "PUSH TO CHOOSE" : "PREVIEW PACK"}</span></button><div className="machineFeet"><i /><i /></div>
      </div></section>
    <aside className="instructions"><h2><span /> HOW IT WORKS <span /></h2><ol><li><b>1</b><span>Choose the pack</span></li><li><b>2</b><span>Open it in real life</span></li><li><b>3</b><span>Find your pulls here</span></li><li><b>4</b><span>Mark what you got</span></li></ol></aside><aside className="tip"><small>NEW HERE?</small><strong>Tap the booster to begin</strong></aside>
    {previewProduct && <section className="packPreviewDialog" role="dialog" aria-modal="true" aria-labelledby="preview-pack-title"><button className="dialogBackdrop" aria-label="Close preview" onClick={() => setPreviewProduct(null)} /><div className="packPreviewPanel"><button className="dialogClose" onClick={() => setPreviewProduct(null)}>Ã—</button><img className={previewProduct.imageTreatment || ""} src={previewProduct.image} alt={`${previewProduct.name} ${previewProduct.type}`} /><div><p>PACK PREVIEW</p><h2 id="preview-pack-title">{previewProduct.name}</h2><h3>{previewProduct.type}</h3><p>Pack switching is ready. The Marvel pull database will be added in a later pass.</p><button onClick={() => setPreviewProduct(null)}>TRY ANOTHER PACK</button></div></div></section>}
  </main>;
}

