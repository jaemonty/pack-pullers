import assert from "node:assert/strict";
import test from "node:test";
import { buildMtgMateCardUrl as url } from "../src/services/mtgmate.js";

test("single-faced nonfoil URL", () => assert.equal(url({ name: "Mox Amber", set: "HOC", collectorNumber: "96", finish: "nonfoil" }), "https://www.mtgmate.com.au/cards/Mox_Amber/HOC/96"));
test("double-faced foil URL preserves separator", () => assert.equal(url({ name: "The Arkenstone // Seek the Heart", set: "HOB", collectorNumber: "270", finish: "foil" }), "https://www.mtgmate.com.au/cards/The_Arkenstone_//_Seek_the_Heart/HOB/270:foil"));
test("foil suffix", () => assert.match(url({ name: "Smaug the Magnificent", set: "HOB", collectorNumber: "249", finish: "foil" }), /249:foil$/));
test("collector suffix is safely encoded", () => assert.match(url({ name: "Example Card", set: "TST", collectorNumber: "12a★", finish: "nonfoil" }), /12a%E2%98%85$/));

