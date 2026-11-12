import assert from "node:assert/strict";
import { pathToFileURL } from "node:url";
import path from "node:path";
const { default: worker } = await import(
  pathToFileURL(path.resolve("dist/server/index.js"))
);
const call = (url, options) =>
  worker.fetch(new Request("https://finn.example" + url, options), {});
const page = await call("/");
assert.equal(page.status, 200);
assert.match(page.headers.get("content-type"), /text\/html/);
const html = await page.text();
const asset = html.match(/src="([^"]+\.js)"/)[1];
const script = await call(asset);
assert.equal(script.status, 200);
assert.ok((await script.text()).length > 1000);
const data = await (await call("/data/seed.json")).json();
assert.ok(data.documents.length >= 2);
assert.equal(Object.keys(data.market).length, 18);
const health = await (await call("/api/health")).json();
assert.equal(health.mode, "extractive");
const research = await (
  await call("/api/research", {
    method: "POST",
    body: JSON.stringify({ ticker: "INFY", question: "cash generation" }),
  })
).json();
assert.equal(research.mode, "extractive");
assert.ok(research.passages[0].document.url);
assert.equal((await call("/missing-file.js")).status, 404);
console.log(
  "Built Worker verified: page, bundled assets, strict snapshot, extractive API, provenance and 404.",
);
