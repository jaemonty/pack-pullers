import assert from "node:assert/strict";
import test from "node:test";

async function render() {
  const workerUrl = new URL("../dist/server/index.js", import.meta.url);
  workerUrl.searchParams.set("test", `${process.pid}-${Date.now()}`);
  const { default: worker } = await import(workerUrl.href);
  return worker.fetch(new Request("http://localhost/", { headers: { accept: "text/html" } }), {
    ASSETS: { fetch: async () => new Response("Not found", { status: 404 }) },
  }, { waitUntil() {}, passThroughOnException() {} });
}

test("server-renders the Pack Pullers homepage", async () => {
  const response = await render();
  assert.equal(response.status, 200);
  const html = await response.text();
  assert.match(html, /<title>Pack Pullers \| Choose Your Adventure<\/title>/i);
  assert.match(html, /PACK LIBRARY/);
  assert.match(html, /Celestial booster vending machine/);
  assert.match(html, /HOW IT WORKS/);
  assert.match(html, /particleField/);
  assert.match(html, /cloudFloor/);
  assert.doesNotMatch(html, /codex-preview|Building your site|react-loading-skeleton/i);
});

test("homepage source retains accessible controls and exact-card integration", async () => {
  const source = await import("node:fs/promises").then(({ readFile }) => readFile(new URL("../app/page.tsx", import.meta.url), "utf8"));
  assert.match(source, /aria-label="Previous booster"/);
  assert.match(source, /aria-label="Next booster"/);
  assert.match(source, /buildMtgMateCardUrl/);
  assert.match(source, /Go to top of page/);
  assert.match(source, /Go to bottom of page/);
});

