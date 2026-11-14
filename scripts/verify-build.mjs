import assert from "node:assert/strict";
import { pathToFileURL } from "node:url";
import path from "node:path";
const { default: worker } = await import(
  pathToFileURL(path.resolve("dist/server/index.js"))
);
const call = (url, options, env = {}) =>
  worker.fetch(new Request("https://finn.example" + url, options), env);
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
assert.deepEqual(health, { ok: true });
const research = await (
  await call("/api/research", {
    method: "POST",
    body: JSON.stringify({ ticker: "INFY", question: "cash generation" }),
  })
).json();
assert.equal(research.mode, "extractive");
assert.ok(research.passages[0].document.url);
assert.equal((await call("/api/model/test", { method: "POST", body: "{}" })).status, 404);
assert.equal((await call("/api/research", { method: "POST", body: JSON.stringify({ ticker: "INFY", ai: { apiKey: "client-key-placeholder" } }) })).status, 400);
const savedFetch = globalThis.fetch;
try {
  const seen = [];
  globalThis.fetch = async (url, options) => {
    seen.push(url);
    assert.equal(options.headers.Authorization, "Bearer test-only-placeholder-key");
    assert.equal(options.redirect, "manual");
    const input = JSON.parse(JSON.parse(options.body).messages[1].content);
    return Response.json({ choices: [{ finish_reason: "stop", message: { content: JSON.stringify({ items: [{ reference: input.passages[0].reference, quote: input.passages[0].text.slice(0, 180), topic: "cash" }] }) } }] });
  };
  const synthesized = await (await call("/api/research", {
    method: "POST", body: JSON.stringify({ ticker: "INFY", question: "cash generation" }),
  }, { ENABLE_FREE_MODEL: "true", GROQ_API_KEY: "test-only-placeholder-key" })).json();
  assert.equal(synthesized.mode, "model");
  assert.equal(synthesized.answerKind, "selected-evidence");
  assert.equal(synthesized.provider, undefined); assert.equal(synthesized.model, undefined); assert.equal(synthesized.stats, undefined);
  assert.ok(!JSON.stringify(synthesized).includes("test-only-placeholder-key"));
  assert.equal(seen.length, 1); assert.ok(seen[0].startsWith("https://api.groq.com/"));
} finally { globalThis.fetch = savedFetch; }
try {
  const {default:isolated}=await import(pathToFileURL(path.resolve('dist/server/index.js')).href+'?structured-research');
  let calls=0;
  globalThis.fetch=async(url,options)=>{
    const payload=JSON.parse(options.body),input=JSON.parse(payload.messages[1].content);calls++;
    const content=input.outputFormat==='claims'
      ? {claims:[{text:'Management attributed weaker margins to freight costs.',references:[1]}]}
      : {items:input.claims.map(c=>({index:c.index,verdict:'supported',reason:'Matches the attributed source statement'}))};
    if(input.outputFormat==='claims')assert.equal(payload.response_format.json_schema.name,'research_claims');
    return Response.json({choices:[{finish_reason:'stop',message:{content:JSON.stringify(content)}}]});
  };
  const doc={id:'structured-build',ticker:'STRUCTURED',title:'Synthetic build fixture',type:'Earnings-call transcript',url:'https://issuer.example/transcript.pdf',period:'FY2026-Q4',passages:[{page:1,text:'Management attributed weaker margins to freight costs.'}]};
  const result=await(await isolated.fetch(new Request('https://finn.example/api/research',{method:'POST',body:JSON.stringify({ticker:'STRUCTURED',question:'Why did margins change?',documents:[doc]})}),{ENABLE_FREE_MODEL:'true',GROQ_API_KEY:'test-only-placeholder-key'})).json();
  assert.equal(result.answerKind,'analysis');assert.match(result.answer,/freight costs/);assert.equal(calls,2);assert.equal(result.stats,undefined);
  console.log('Packaged structured synthesis and independent verification passed.');
} finally {globalThis.fetch=savedFetch;}
assert.equal((await call("/missing-file.js")).status, 404);
console.log(
  "Built Worker verified: page, bundled assets, strict snapshot, extractive API, backend routing/synthesis fixtures, client-key rejection, credential redaction, provenance and 404.",
);
// Exercise the shipped financial path, not the modular development handler.
const financial = await call('/api/financials',{method:'POST',body:JSON.stringify({ticker:'INFY'})});
assert.equal(financial.status,200);assert.ok(Array.isArray((await financial.json()).facts));
const literalDoc={id:'build-literal',ticker:'UNSEEN',title:'Clearly synthetic build fixture',type:'Annual report',url:'https://issuer.example/report.pdf',period:'FY2026',passages:[{page:1,text:'For FY2026 consolidated revenue was INR 1,200 crore. For FY2025 consolidated revenue was INR 1,000 crore.'}]};
const literalResult=await (await call('/api/financials',{method:'POST',body:JSON.stringify({ticker:'UNSEEN',documents:[literalDoc]})})).json();assert.equal(literalResult.facts.length,2);
const invalidFinancial=await call('/api/financials',{method:'POST',body:'{bad'});assert.equal(invalidFinancial.status,400);
console.log('Packaged financial endpoint: seeded, unseen literal extraction and invalid input verified.');

const {readFileSync}=await import('node:fs');
const {pdfRows,tablePassages}=await import('../src/financial-tables.mjs');
for(const c of JSON.parse(readFileSync('evals/annual-table-cases.json')).cases){
 const doc={id:c.sha256,ticker:c.ticker,title:'Held-out real primary statement',type:c.type,url:c.url,period:c.expected[0].period,passages:tablePassages(pdfRows(c.items),c.page)};
 const result=await(await call('/api/financials',{method:'POST',body:JSON.stringify({ticker:c.ticker,documents:[doc]})})).json();
 assert.equal(result.facts.length,c.expected.length,c.ticker+' packaged real-table extraction');
 for(const e of c.expected)assert.ok(result.facts.some(f=>f.metric===e.metric&&f.period===e.period&&f.value===e.value&&f.unit===e.unit));
}
console.log('Packaged real-table extraction: DABUR and VGUARD facts, periods and units verified.');
