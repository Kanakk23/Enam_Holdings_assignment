import test from "node:test";
import assert from "node:assert/strict";
import { configuredModels, modelCompletion, serverModels } from "../server/models.mjs";
import { createResearchEngine, checkedExtraction, checkedAnswer, researchTask, sourceInputs } from "../server/research-engine.mjs";
import worker from "../server/worker.mjs";
const fakeKey = "test-only-placeholder-key";
const enabled = { ENABLE_FREE_MODEL: "true", GROQ_API_KEY: fakeKey, GEMINI_API_KEY: fakeKey };
const quote = "Management discussed operating cash generation and its outlook in the original report.";
const passages = (count = 2) => Array.from({ length: count }, (_, i) => ({ page: i + 1, text: quote, document: { id: `d${i}`, ticker: "UNSEEN", type: "Earnings-call transcript", title: `Original call ${i}`, period: "FY2027-Q2", passages: [{ page: i + 1, text: quote }] } }));
const query = (question = "What did management say about cash?", count = 2, scope = "owner") => ({ ticker: "UNSEEN", question, passages: passages(count), scope });
const response = (provider, text, finish) => Response.json(provider === "gemini" ? { candidates: [{ finishReason: finish || "STOP", content: { parts: [{ text }] } }] } : { choices: [{ finish_reason: finish || "stop", message: { content: text } }] });
function recordingFetcher(seen, intercept) {
  return async (url, options) => {
    const payload = JSON.parse(options.body), provider = url.includes("groq.com") ? "groq" : "gemini";
    const input = JSON.parse(provider === "groq" ? payload.messages[1].content : payload.contents[0].parts[0].text);
    const structured = !!(payload.response_format || payload.generationConfig?.responseMimeType);
    const entry = { url, options, payload, input, provider, structured }; seen.push(entry);
    if (intercept) { const value = await intercept(entry, seen.length); if (value) return value; }
    const output = input.claims ? JSON.stringify({items:input.claims.map(c=>({index:c.index,verdict:"supported",reason:"Fixture verdict"}))}) : structured ? JSON.stringify({ items: [{ reference: input.passages[0].reference, quote, topic: "cash" }] }) : `Management described cash generation, but delivery needs matching subsequent results. [${input.passages[0].reference}]`;
    return response(provider, output);
  };
}

const routingCases = [
  ["What does the company do?", "extract"], ["Summarise the revenue mix", "extract"], ["What did management say about cash?", "extract"],
  ["Show the operating margin passages", "extract"], ["Business segments", "extract"], ["Revenue and cash generation", "extract"],
  ["What are the primary document highlights?", "extract"], ["Management outlook", "extract"], ["What is reported about debt?", "extract"], ["Describe customer segments", "extract"],
  ["Compare guidance with delivery", "reason"], ["Narrative versus numbers", "reason"], ["What was promised and delivered?", "reason"],
  ["Bull and bear case", "reason"], ["Why did margins change?", "reason"], ["Compare the last four quarters", "reason"],
  ["How has cash quality evolved?", "reason"], ["Discuss the balance sheet", "reason"], ["What changed?", "reason"],
  ["Investigate conflicting sources", "reason"], ["Multi-year trajectory", "reason"], ["Explain leverage risks", "reason"],
  ["What is cash conversion?", "reason"], ["Management guidance", "reason"], ["Quarter-over-quarter commentary", "reason"],
  ["Calculate YoY growth", "calculation"], ["Compute the cash conversion ratio", "calculation"], ["Work out the margin change", "calculation"],
  ["Calculate revenue growth", "calculation"], ["Calculate the percentage change", "calculation"],
];
test("routing policy: 30 ordinary, analytical and arithmetic questions remain stable across three trials", () => {
  for (let trial = 0; trial < 3; trial++) for (const [q, expected] of routingCases) assert.equal(researchTask(q), expected, q);
});
test("configuration is server-only and excludes deprecated, unknown and paid-only models", () => {
  assert.deepEqual(configuredModels({ GROQ_API_KEY: fakeKey }), {});
  const c = configuredModels(enabled);
  assert.equal(c.extract.model, "openai/gpt-oss-20b"); assert.equal(c.reason.model, "gemini-3.8-flash");
  assert.equal(c.reasonFallback.model, "openai/gpt-oss-120b"); assert.equal(c.extractFallback.model, "gemini-3.5-flash-lite");
  for (const bad of [{ GROQ_EXTRACT_MODEL: "llama-3.1-8b-instant" }, { GEMINI_REASON_MODEL: "gemini-3.1-pro-preview" }, { GEMINI_REASON_MODEL: "https://evil.example" }, { GROQ_API_KEY: "bad\nkey" }])
    assert.throws(() => configuredModels({ ...enabled, ...bad }));
});
test("routine evidence extraction uses one small Groq call and quotes validated originals", async () => {
  const seen = [], result = await createResearchEngine({ fetcher: recordingFetcher(seen) }).research(query(), enabled);
  assert.equal(result.kind, "selected-evidence"); assert.match(result.answer, /\[1\]/); assert.ok(result.answer.includes(quote));
  assert.equal(seen.length, 1); assert.equal(seen[0].payload.model, "openai/gpt-oss-20b");
  assert.equal(seen[0].payload.response_format.json_schema.strict, true);
});
test("short complex research uses Gemini and an independent small-model verifier", async () => {
  const seen = [], result = await createResearchEngine({ fetcher: recordingFetcher(seen) }).research(query("Compare guidance and delivery"), enabled);
  assert.equal(result.kind, "analysis"); assert.equal(seen.length, 2);
  assert.ok(seen[0].url.includes("gemini-3.8-flash:generateContent"));
});
test("larger research reserves a call for independent verification", async () => {
  const seen = [], result = await createResearchEngine({ fetcher: recordingFetcher(seen) }).research(query("Compare the last four quarters", 8), enabled);
  assert.equal(result.kind, "analysis"); assert.equal(seen.length, 2);
  assert.equal(seen[0].structured,false); assert.equal(seen[0].input.passages.length,8);
  assert.equal(seen[1].structured,true); assert.ok(seen[1].input.claims.length);
  assert.ok(result.stats.calls <= 3);
});
test("arithmetic, missing keys and empty evidence make zero provider requests", async () => {
  let calls = 0; const engine = createResearchEngine({ fetcher: async () => { calls++; throw Error("unexpected"); } });
  assert.equal((await engine.research(query("Calculate YoY growth"), enabled)).stats.calls, 0);
  assert.equal((await engine.research(query(), {})).stats.calls, 0);
  assert.equal((await engine.research({ ...query(), passages: [] }, enabled)).stats.calls, 0);
  assert.equal(calls, 0);
});
test("identical research, including a simultaneous request, reuses work without consuming quota", async () => {
  const seen = [], engine = createResearchEngine({ fetcher: recordingFetcher(seen) });
  const results = await Promise.all([engine.research(query(), enabled), engine.research(query(), enabled)]);
  assert.equal(seen.length, 1); assert.equal(results[0].answer, results[1].answer);
  const cached = await engine.research(query(), enabled);
  assert.equal(cached.stats.calls, 0); assert.equal(cached.stats.cacheHits, 1); assert.equal(seen.length, 1);
});
test("cache invalidates across identity, source content, model configuration and expiry", async () => {
  let time = 0; const seen = [], engine = createResearchEngine({ fetcher: recordingFetcher(seen), now: () => time });
  await engine.research(query(), enabled);
  await engine.research(query(undefined, 2, "another-owner"), enabled); assert.equal(seen.length, 2);
  const changed = query(); changed.passages[0].text += " New filing text.";
  await engine.research(changed, enabled); assert.equal(seen.length, 3);
  await engine.research(query(), { ...enabled, GROQ_API_KEY: "rotated-test-placeholder-key" }); assert.equal(seen.length, 4);
  time += 31 * 60 * 1000; await engine.research(query(), enabled); assert.equal(seen.length, 5);
});
test("complex fallback uses the stronger Groq model after Gemini quota failure", async () => {
  const seen = [], engine = createResearchEngine({ fetcher: recordingFetcher(seen, entry => entry.provider === "gemini" ? new Response(fakeKey, { status: 429 }) : null) });
  const result = await engine.research(query("Compare guidance"), enabled);
  assert.equal(result.kind, "analysis"); assert.equal(seen.length, 3);
  assert.equal(seen[1].payload.model, "openai/gpt-oss-120b");
});
test("routine fallback uses Gemini Lite and a quota cooldown prevents repeated failing calls", async () => {
  const seen = [], engine = createResearchEngine({ fetcher: recordingFetcher(seen, entry => entry.provider === "groq" ? new Response(fakeKey, { status: 429 }) : null) });
  const first = await engine.research(query(), enabled); assert.equal(first.kind, "selected-evidence");
  assert.ok(seen[1].url.includes("gemini-3.5-flash-lite"));
  await engine.research(query("Show cash excerpts"), enabled);
  assert.equal(seen.filter(s => s.provider === "groq").length, 1);
});
test("local token reservations stop calls before the provider limit is consumed", async () => {
  const seen = [], engine = createResearchEngine({ fetcher: recordingFetcher(seen) });
  const result = await engine.research(query(), { ENABLE_FREE_MODEL: "true", GROQ_API_KEY: fakeKey, GROQ_TOKENS_PER_MINUTE: "1" });
  assert.equal(seen.length, 0); assert.equal(result.answer, undefined); assert.ok(result.warning);
});
test("verification fallback preserves the three-call cap", async () => {
  const seen = [], engine = createResearchEngine({ fetcher: recordingFetcher(seen, entry => entry.provider === "groq" ? new Response("quota", { status: 429 }) : null) });
  const result = await engine.research(query("Compare guidance across four quarters", 8), enabled);
  assert.equal(seen.length, 3); assert.equal(result.kind, "analysis");
  assert.equal(seen[2].structured, true); assert.ok(seen[2].url.includes("gemini-3.5-flash-lite"));
});
test("the investigation deadline prevents further calls after a slow extraction", async () => {
  let time = 0;
  const seen = [], engine = createResearchEngine({ now: () => time, fetcher: recordingFetcher(seen, () => { time += 31000; }) });
  const result = await engine.research(query("Compare guidance across four quarters", 8), enabled);
  assert.equal(seen.length, 1); assert.equal(result.answer, undefined); assert.ok(result.warning);
});
test("invalid extraction cannot paraphrase evidence, invent a reference, or trigger a stronger rewrite", async () => {
  const sources = sourceInputs(passages());
  for (const text of ["bad JSON", '{"items":{}}', JSON.stringify({ items: [{ reference: 9, quote, topic: "cash" }] }), JSON.stringify({ items: [{ reference: 1, quote: "Invented financial claim about the business", topic: "cash" }] })])
    assert.throws(() => checkedExtraction(text, sources));
  const seen = [], result = await createResearchEngine({ fetcher: recordingFetcher(seen, e => response(e.provider, '{"items":[{"reference":99,"quote":"Unsupported original quotation that is invented","topic":"cash"}]}')) }).research(query(), enabled);
  assert.equal(result.answer, undefined); assert.equal(seen.length, 1);
});
test("unsupported citations and invented numerical claims are withheld", () => {
  const sources = sourceInputs(passages());
  for (const value of ["Unsupported statement", "Claim [99]", "Revenue grew 999%. [1]"])
    assert.throws(() => checkedAnswer(value, sources));
  assert.ok(checkedAnswer("The original report discusses cash. [1]", sources));
});
test("empty and truncated completions are withheld without another model call", async () => {
  for (const [text, finish] of [["", "stop"], ["Incomplete", "length"]]) {
    const seen = [], result = await createResearchEngine({ fetcher: recordingFetcher(seen, e => response(e.provider, text, finish)) }).research(query(), enabled);
    assert.equal(result.answer, undefined); assert.equal(seen.length, 1);
  }
});
for (const status of [400, 401, 402, 403, 404, 429, 500]) test(`provider ${status} safely falls back to sources with one configured provider`, async () => {
  const seen = [], result = await createResearchEngine({ fetcher: recordingFetcher(seen, () => new Response(fakeKey, { status })) }).research(query(), { ENABLE_FREE_MODEL: "true", GROQ_API_KEY: fakeKey });
  assert.equal(result.answer, undefined); assert.ok(!JSON.stringify(result).includes(fakeKey)); assert.equal(seen.length, 1);
});
test("network errors, malformed provider JSON and redirected credentials fail safely", async () => {
  for (const fetcher of [async () => { throw Error(fakeKey); }, async () => new Response(fakeKey), async (_, options) => { assert.equal(options.redirect, "manual"); return new Response(null, { status: 307, headers: { Location: "https://evil.example" } }); }])
    await assert.rejects(modelCompletion({ ...serverModels.extract, apiKey: fakeKey }, "system", "input", { fetcher }), e => !e.message.includes(fakeKey));
});
test("model request contracts stay bounded and exclude searches, tools, network profiles and key-bearing URLs", async () => {
  const seen = [], engine = createResearchEngine({ fetcher: recordingFetcher(seen) });
  await engine.research(query(), enabled); await engine.research(query("Compare guidance"), enabled);
  for (const s of seen) {
    assert.ok(!s.url.includes(fakeKey)); assert.equal(s.options.redirect, "manual");
    assert.ok(s.options.signal); assert.ok(!s.options.body.includes(fakeKey));
    assert.equal(s.payload.tools, undefined); assert.equal(s.payload.plugins, undefined);
    assert.ok((s.payload.max_completion_tokens || s.payload.generationConfig.maxOutputTokens) <= 1600);
    assert.ok((s.input.passages||s.input.claims.flatMap(c=>c.evidence)).every(p => p.text.length <= 1800));
  }
});
test("unsupported document types are not sent to providers", async () => {
  const seen = [], input = query(); input.passages.forEach(p => p.document.type = "Broker note");
  const result = await createResearchEngine({ fetcher: recordingFetcher(seen) }).research(input, enabled);
  assert.equal(seen.length, 0); assert.equal(result.answer, undefined);
});
const fixture = { documents: passages(1).map(p => p.document) };
const assetEnv = { ASSETS: { fetch: async () => Response.json(fixture) } };
const request = (body, path = "/api/research", headers) => new Request(`https://finn.example${path}`, { method: "POST", body: JSON.stringify(body), headers });
test("frontend provider controls and credential submissions are rejected before research", async () => {
  for (const extra of [{ ai: { apiKey: fakeKey } }, { apiKey: fakeKey }, { provider: "groq" }, { model: "openai/gpt-oss-120b" }])
    assert.equal((await worker.fetch(request({ ticker: "UNSEEN", ...extra }), assetEnv)).status, 400);
  assert.equal((await worker.fetch(request({}, "/api/model/test"), assetEnv)).status, 404);
  const health = await (await worker.fetch(new Request("https://finn.example/api/health"), { ...assetEnv, ...enabled })).json();
  assert.deepEqual(health, { ok: true });
});
test("research API uses server secrets and strips provider/model/cache/usage metadata", async t => {
  const original = globalThis.fetch, seen = []; globalThis.fetch = recordingFetcher(seen); t.after(() => { globalThis.fetch = original; });
  const response = await worker.fetch(request({ ticker: "UNSEEN", question: "cash" }), { ...assetEnv, ...enabled });
  const result = await response.json(); assert.equal(result.mode, "model"); assert.ok(result.answer);
  for (const key of ["provider", "model", "stats", "stages", "apiKey"]) assert.equal(result[key], undefined);
  assert.ok(!JSON.stringify(result).includes(fakeKey)); assert.equal(response.headers.get("cache-control"), "no-store");
});
test("foreign-origin and oversized research requests are rejected", async () => {
  assert.equal((await worker.fetch(request({ ticker: "UNSEEN" }, "/api/research", { origin: "https://evil.example" }), assetEnv)).status, 403);
  assert.equal((await worker.fetch(request({ question: "x".repeat(400001) }), assetEnv)).status, 413);
});
test("browser-indexed unseen originals use the same engine and retain verification limits", async t => {
  const original = globalThis.fetch; globalThis.fetch = recordingFetcher([]); t.after(() => { globalThis.fetch = original; });
  const doc = { ...fixture.documents[0], id: "imported", ticker: "NEWCO", url: "https://issuer.example/original.pdf" };
  const result = await (await worker.fetch(request({ ticker: "NEWCO", question: "cash", documents: [doc] }), { ...assetEnv, ...enabled })).json();
  assert.equal(result.mode, "model"); assert.equal(result.documents[0].browserSupplied, true); assert.match(result.sourceWarning, /not independently verified/);
  for (const bad of [{ ...doc, type: "Broker research" }, { ...doc, ticker: "OTHER" }, { ...doc, url: "https://localhost/private" }, { ...doc, passages: [{ page: -1, text: quote }] }])
    assert.equal((await worker.fetch(request({ ticker: "NEWCO", documents: [bad] }), assetEnv)).status, 400);
});

test("long-page context retains the matched quotation instead of truncating it away", () => {
  const original = "Unrelated introductory text. ".repeat(100) + quote + " Surrounding source explanation.";
  const p = passages(1)[0]; p.context = original;
  const selected = sourceInputs([p], 1800, "cash generation");
  assert.ok(selected[0].text.includes(quote)); assert.ok(selected[0].text.length <= 1800);
  const table = { ...p, text: "A reviewed table-cell label", context: "Introduction. ".repeat(200) + "Cash generation and cash flow are explicitly discussed in this original passage." };
  const result = sourceInputs([table], 1800, "cash generation");
  assert.match(result[0].text, /Cash generation/); assert.ok(!result[0].text.includes(table.text));
});
test("authenticated metadata probes never generate tokens or put keys in URLs or results", async () => {
  const { probeModelAccess } = await import("../server/models.mjs");
  for (const config of [configuredModels(enabled).extract, configuredModels(enabled).reason]) {
    let count = 0;
    const result = await probeModelAccess(config, [config.model], { fetcher: async (url, options) => {
      count++; assert.equal(options.method, "GET"); assert.equal(options.redirect, "manual");
      assert.ok(!url.includes(fakeKey)); assert.equal(options.body, undefined);
      return Response.json(config.provider === "groq" ? { data: [{ id: config.model }] } : { models: [{ name: "models/" + config.model }] });
    } });
    assert.equal(result.authenticated, true); assert.equal(result.configuredModels[0].listed, true); assert.equal(count, 1);
    assert.ok(!JSON.stringify(result).includes(fakeKey));
  }
});

test("PDF whitespace differences recover original quote bytes without changing numbers or punctuation", () => {
  const text = "Operating cash\n\nflow was 100 million, as reported for this period.";
  const normalized = "Operating cash flow was 100 million, as reported for this period.";
  const sources = [{ reference: 1, text }];
  const records = checkedExtraction(JSON.stringify({ items: [{ reference: 1, quote: normalized, topic: "cash" }] }), sources);
  assert.equal(records[0].quote, text);
  assert.throws(() => checkedExtraction(JSON.stringify({ items: [{ reference: 1, quote: normalized.replace("100", "200"), topic: "cash" }] }), sources));
});
