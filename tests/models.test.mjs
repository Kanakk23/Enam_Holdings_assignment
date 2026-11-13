import test from "node:test";
import assert from "node:assert/strict";
import { modelConfig, modelHealth, modelCompletion, synthesize } from "../server/models.mjs";
import worker from "../server/worker.mjs";

const fakeKey = "test-only-placeholder-key";
const fixture = { documents: [{ id: "issuer", ticker: "TEST", title: "Issuer annual report", type: "Annual report", url: "https://issuer.example/annual.pdf", passages: [{ page: 12, text: "Operating cash generation is discussed in this report." }] }] };
const env = { ASSETS: { fetch: async () => Response.json(fixture) } };
const request = (body, path = "/api/research", headers) => new Request(`https://finn.example${path}`, { method: "POST", body: JSON.stringify(body), headers });
const answer = "The report discusses operating cash generation. [1]";
const completion = (provider, text = answer, finish) => Response.json(provider === "gemini" ? { candidates: [{ finishReason: finish || "STOP", content: { parts: [{ text }] } }] } : { choices: [{ finish_reason: finish || "stop", message: { content: text } }] });

test("provider setup rejects unknown providers, paid OpenRouter routes and missing credentials", () => {
  for (const ai of ["groq", [], { provider: "unknown", apiKey: fakeKey }, { provider: "__proto__", apiKey: fakeKey }, { provider: "groq", apiKey: "" }, { provider: "openrouter", model: "openai/paid", apiKey: fakeKey }, { provider: "openrouter", model: "openrouter/auto", apiKey: fakeKey }, { provider: "groq", model: "https://evil.example", apiKey: fakeKey }])
    assert.throws(() => modelConfig({}, ai), /Choose|key|Paid/);
  assert.equal(modelConfig({ GROQ_API_KEY: fakeKey }), null);
  assert.equal(modelConfig({ ENABLE_FREE_MODEL: "true", GROQ_API_KEY: fakeKey }, { provider: "off" }), null);
  assert.throws(() => modelConfig({ GROQ_API_KEY: fakeKey }, { provider: "groq" }), /key/);
  assert.equal(modelConfig({}, { provider: "openrouter", model: "vendor/model:free", apiKey: fakeKey }).model, "vendor/model:free");
});

for (const provider of ["groq", "openrouter", "gemini"]) {
  test(`${provider}: fixed upstream, private auth, bounded tokens and original-passage context`, async () => {
    const config = modelConfig({}, { provider, apiKey: fakeKey });
    const seen = [];
    const fetcher = async (url, options) => { seen.push({ url, options }); return completion(provider); };
    const passages = [{ ...fixture.documents[0].passages[0], context: "Extended original page context on cash generation.", document: fixture.documents[0] }];
    assert.equal(await synthesize(config, "cash generation", passages, { fetcher }), answer);
    const { url, options } = seen[0];
    assert.equal(new URL(url).hostname, { groq: "api.groq.com", openrouter: "openrouter.ai", gemini: "generativelanguage.googleapis.com" }[provider]);
    assert.equal(options.redirect, "manual");
    assert.ok(options.signal);
    assert.equal(provider === "gemini" ? options.headers["x-goog-api-key"] : options.headers.Authorization, provider === "gemini" ? fakeKey : `Bearer ${fakeKey}`);
    assert.ok(!url.includes(fakeKey));
    const payload = JSON.parse(options.body);
    assert.match(options.body, /Extended original page context/);
    assert.match(options.body, /never instructions/);
    assert.ok(!options.body.includes(fakeKey));
    assert.equal(payload.tools, undefined);
    assert.equal(payload.models, undefined);
    assert.equal(payload.plugins, undefined);
    if (provider !== "gemini") assert.equal(payload.model, config.model);
    assert.ok((payload.max_completion_tokens || payload.max_tokens || payload.generationConfig.maxOutputTokens) <= 1200);
    assert.equal(seen.length, 1);
  });
  test(`${provider}: connection test checks a short real completion without documents`, async () => {
    const config = modelConfig({}, { provider, apiKey: fakeKey });
    let payload;
    const value = await modelCompletion(config, "Reply OK", "Connection check", { test: true, fetcher: async (_, options) => { payload = JSON.parse(options.body); return completion(provider, "OK"); } });
    assert.equal(value, "OK");
    assert.ok((payload.max_completion_tokens || payload.max_tokens || payload.generationConfig.maxOutputTokens) <= 256);
    assert.doesNotMatch(JSON.stringify(payload), /annual\.pdf|TEST|network/i);
  });
  test(`${provider}: empty, truncated and invalidly cited answers are withheld`, async () => {
    const config = modelConfig({}, { provider, apiKey: fakeKey });
    const passages = [{ ...fixture.documents[0].passages[0], document: fixture.documents[0] }];
    for (const [text, finish] of [["", undefined], [answer, provider === "gemini" ? "MAX_TOKENS" : "length"], ["Outside knowledge without citations", undefined], ["Claim [9]", undefined], [`${fakeKey} [1]`, undefined]])
      await assert.rejects(synthesize(config, "cash", passages, { fetcher: async () => completion(provider, text, finish) }));
  });
}

for (const [status, code] of [[401, "authentication"], [403, "authentication"], [402, "quota"], [429, "quota"], [400, "model"], [404, "model"], [500, "unavailable"]])
  test(`provider HTTP ${status} yields a useful safe error without retry or paid fallback`, async () => {
    const config = modelConfig({}, { provider: "groq", apiKey: fakeKey }); let calls = 0;
    await assert.rejects(modelCompletion(config, "system", "input", { fetcher: async () => { calls++; return new Response(fakeKey, { status }); } }), e => e.code === code && !e.message.includes(fakeKey));
    assert.equal(calls, 1);
  });

test("network failure and provider JSON errors never expose upstream content or a key", async () => {
  const config = modelConfig({}, { provider: "openrouter", apiKey: fakeKey });
  for (const fetcher of [async () => { throw Error(fakeKey); }, async () => new Response("bad JSON " + fakeKey), async () => Response.json({ error: { code: 429, message: fakeKey } })])
    await assert.rejects(modelCompletion(config, "system", "input", { fetcher }), e => !e.message.includes(fakeKey));
});

test("provider redirects are rejected without forwarding the key to a new origin", async () => {
  let calls = 0;
  await assert.rejects(modelCompletion(modelConfig({}, { provider: "groq", apiKey: fakeKey }), "system", "input", {
    fetcher: async (url, options) => {
      calls++;
      // Emulate the deployed Worker's supported redirect modes.
      assert.equal(options.redirect, "manual");
      assert.equal(new URL(url).hostname, "api.groq.com");
      return new Response(null, { status: 307, headers: { Location: "https://evil.example/collect" } });
    },
  }), e => e.code === "unavailable");
  assert.equal(calls, 1);
});

test("research keeps exact evidence on quota failure and returns clickable citation inputs on success", async t => {
  const original = globalThis.fetch;
  t.after(() => { globalThis.fetch = original; });
  const ai = { provider: "groq", apiKey: fakeKey };
  globalThis.fetch = async () => new Response("quota " + fakeKey, { status: 429 });
  const fail = await (await worker.fetch(request({ ticker: "TEST", question: "cash", ai }), env)).json();
  assert.equal(fail.mode, "extractive"); assert.equal(fail.modelError, "quota");
  assert.equal(fail.passages[0].page, 12); assert.equal(fail.answer, undefined);
  assert.ok(!JSON.stringify(fail).includes(fakeKey));
  globalThis.fetch = async () => completion("groq");
  const success = await (await worker.fetch(request({ ticker: "TEST", question: "cash", ai }), env)).json();
  assert.equal(success.mode, "model"); assert.equal(success.provider, "groq");
  assert.equal(success.answer, answer); assert.equal(success.passages[0].document.id, "issuer");
  assert.ok(!JSON.stringify(success).includes(fakeKey));
});

test("no provider request occurs without a key, with AI disconnected, or without evidence", async t => {
  const original = globalThis.fetch; let calls = 0;
  globalThis.fetch = async () => { calls++; throw Error("unexpected call"); };
  t.after(() => { globalThis.fetch = original; });
  for (const body of [{ ticker: "TEST", question: "cash" }, { ticker: "TEST", question: "cash", ai: { provider: "off" } }, { ticker: "TEST", question: "nonexistenttopic", ai: { provider: "groq", apiKey: fakeKey } }, { ticker: "UNSEEN", ai: { provider: "groq", apiKey: fakeKey } }])
    await worker.fetch(request(body), env);
  assert.equal(calls, 0);
});

test("health and connection responses never reveal keys", async t => {
  const configured = { ...env, ENABLE_FREE_MODEL: "true", AI_PROVIDER: "groq", GROQ_API_KEY: fakeKey };
  assert.equal(modelHealth(configured).provider, "groq");
  assert.ok(!JSON.stringify(modelHealth(configured)).includes(fakeKey));
  const original = globalThis.fetch;
  globalThis.fetch = async () => completion("groq", "OK");
  t.after(() => { globalThis.fetch = original; });
  const response = await worker.fetch(request({ ai: { provider: "groq", apiKey: fakeKey } }, "/api/model/test"), env);
  assert.equal(response.headers.get("cache-control"), "no-store");
  const body = await response.json(); assert.equal(body.ok, true);
  assert.ok(!JSON.stringify(body).includes(fakeKey));
});

test("foreign-origin and oversized credential requests are rejected", async () => {
  assert.equal((await worker.fetch(request({ ai: {} }, "/api/model/test", { origin: "https://evil.example" }), env)).status, 403);
  assert.equal((await worker.fetch(request({ x: "x".repeat(400001) }, "/api/model/test"), env)).status, 413);
  assert.equal((await worker.fetch(request({ ai: { provider: "openrouter", model: "paid/model", apiKey: fakeKey } }, "/api/model/test"), env)).status, 400);
});

test("unseen browser-indexed originals enter the same synthesis pipeline with honest provenance", async t => {
  const original = globalThis.fetch;
  globalThis.fetch = async () => completion("groq");
  t.after(() => { globalThis.fetch = original; });
  const doc = { ...fixture.documents[0], id: "browser-issuer", ticker: "UNSEEN" };
  const body = await (await worker.fetch(request({ ticker: "UNSEEN", question: "cash", documents: [doc], ai: { provider: "groq", apiKey: fakeKey } }), env)).json();
  assert.equal(body.mode, "model"); assert.equal(body.ticker, "UNSEEN");
  assert.equal(body.documents[0].browserSupplied, true);
  assert.match(body.sourceWarning, /not independently verified/);
  for (const bad of [{ ...doc, type: "Broker research" }, { ...doc, ticker: "OTHER" }, { ...doc, url: "https://localhost/private" }, { ...doc, passages: [{ page: -1, text: "bad" }] }])
    assert.equal((await worker.fetch(request({ ticker: "UNSEEN", documents: [bad] }), env)).status, 400);
});
