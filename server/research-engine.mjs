import { ModelError, configuredModels, modelCompletion, researchInstructions, extractionInstructions } from "./models.mjs";
const engineVersion = "source-routing-v1";
export function researchTask(question) {
  const q = String(question).toLowerCase();
  if (/\b(calculate|compute|work out)\b/.test(q) && /\b(growth|yoy|qoq|ratio|conversion|change|percentage)\b/.test(q)) return "calculation";
  return /\b(compare|versus|vs\.?|promis\w*|deliver\w*|guidance|narrative|contradict\w*|conflict\w*|trajectory|multi.year|bull|bear|why|risk\w*|leverage|cash quality|cash conversion|balance sheet)\b|what (?:has )?changed|four quarters|4 quarters|year.over.year|quarter.over.quarter/.test(q) ? "reason" : "extract";
}
const modelLimit = (value, fallback, max) => Number.isFinite(Number(value)) && Number(value) > 0 ? Math.min(max, Math.floor(Number(value))) : fallback;
export function sourceInputs(passages, maxChars = 1800) {
  const seen = new Set();
  return passages.slice(0, 8).flatMap((p, i) => {
    const text = String(p.context || p.text || "").trim().slice(0, maxChars);
    if (!text || !["Annual report", "Earnings-call transcript"].includes(p.document?.type)) return [];
    const fingerprint = `${p.document.id}:${p.page}:${text}`;
    if (seen.has(fingerprint)) return [];
    seen.add(fingerprint);
    return [{ reference: i + 1, documentId: p.document.id, title: String(p.document.title).slice(0, 200), page: p.page,
      period: p.document.reportPeriod || p.document.period || "See original", text }];
  });
}
export function checkedExtraction(text, sources) {
  let output;
  try { output = JSON.parse(text); } catch { throw new ModelError("evidence"); }
  if (!Array.isArray(output?.items) || output.items.length > 4) throw new ModelError("evidence");
  const seen = new Set();
  return output.items.map(item => {
    const source = sources.find(p => p.reference === item?.reference);
    if (!source || typeof item.quote !== "string" || item.quote.length < 30 || item.quote.length > 700 || !source.text.includes(item.quote) || !["revenue", "margin", "cash", "guidance", "business", "other"].includes(item.topic)) throw new ModelError("evidence");
    return { reference: item.reference, quote: item.quote, topic: item.topic };
  }).filter(item => { const key = `${item.reference}:${item.quote}`; if (seen.has(key)) return false; seen.add(key); return true; });
}
const numericTokens = text => (text.match(/\d[\d,]*(?:\.\d+)?/g) || []).map(n => n.replaceAll(",", "").replace(/\.0+$/, ""));
export function checkedAnswer(answer, sources) {
  if (typeof answer !== "string" || answer.split(/\s+/).length > 220) throw new ModelError("citations");
  const refs = [...answer.matchAll(/\[(\d+)\]/g)].map(m => +m[1]);
  if (!refs.length || refs.some(n => !sources.some(p => p.reference === n))) throw new ModelError("citations");
  // Numerical invention is blocked. This does not prove semantic entailment.
  const allowed = new Set(sources.filter(p => refs.includes(p.reference)).flatMap(p => numericTokens(p.text)));
  if (numericTokens(answer.replace(/\[\d+\]/g, "")).some(n => !allowed.has(n))) throw new ModelError("numbers");
  return answer;
}
async function engineHash(value) {
  const bytes = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(JSON.stringify(value)));
  return [...new Uint8Array(bytes)].map(b => b.toString(16).padStart(2, "0")).join("");
}
export function createResearchEngine({ fetcher = (...args) => fetch(...args), now = () => Date.now() } = {}) {
  const memo = new Map(), pending = new Map(), usage = new Map(), cooldown = new Map();
  async function cached(key, work, stats) {
    const hit = memo.get(key);
    if (hit?.expires > now()) { stats.cacheHits++; memo.delete(key); memo.set(key, hit); return hit.value; }
    if (pending.has(key)) { stats.cacheHits++; return pending.get(key); }
    const task = Promise.resolve().then(work);
    pending.set(key, task);
    try {
      const value = await task;
      memo.set(key, { value, expires: now() + 30 * 60 * 1000 });
      while (memo.size > 64) memo.delete(memo.keys().next().value);
      return value;
    } finally { pending.delete(key); }
  }
  async function invoke(config, system, input, structured, env, stats) {
    const bucketKey = `${config.provider}:${config.model}`;
    if ((cooldown.get(bucketKey) || 0) > now()) throw new ModelError("cooldown");
    if (stats.calls >= 3 || now() >= stats.deadline) throw new ModelError("budget");
    // Approximate token reservations include output and conservative input overhead.
    const estimate = Math.ceil(new TextEncoder().encode(system + input).byteLength / 2) + config.maxTokens;
    let bucket = usage.get(config.provider);
    if (!bucket || now() - bucket.start >= 60000) { bucket = { start: now(), calls: 0, tokens: 0 }; usage.set(config.provider, bucket); }
    const rpm = modelLimit(env.AI_REQUESTS_PER_MINUTE, 6, 30);
    const tokenCap = config.provider === "groq" ? modelLimit(env.GROQ_TOKENS_PER_MINUTE, 7000, 8000) : modelLimit(env.GEMINI_TOKENS_PER_MINUTE, 18000, 50000);
    if (bucket.calls >= rpm || bucket.tokens + estimate > tokenCap) throw new ModelError("budget");
    bucket.calls++; bucket.tokens += estimate; stats.calls++; stats.reservedTokens += estimate;
    stats.stages.push({ provider: config.provider, model: config.model, purpose: structured ? "extract" : "reason" });
    try { return await modelCompletion(config, system, input, { structured, fetcher, timeoutMs: Math.max(1, Math.min(25000, stats.deadline - now())) }); }
    catch (error) {
      const duration = error.code === "quota" ? 60000 : ["authentication", "model"].includes(error.code) ? 10 * 60000 : error.code === "unavailable" ? 15000 : 0;
      if (duration) cooldown.set(bucketKey, now() + duration);
      throw error;
    }
  }
  async function withFallback(choices, run) {
    let failure = new ModelError("configuration");
    for (const config of choices.filter(Boolean)) {
      try { return await run(config); }
      catch (error) {
        failure = error;
        // Invalid evidence/output gets withheld; it does not buy another reasoning call.
        if (["citations", "numbers", "evidence", "incomplete"].includes(error.code)) break;
      }
    }
    throw failure;
  }
  return {
    async research({ ticker, question, passages, scope = "private-owner" }, env = {}) {
      const stats = { calls: 0, cacheHits: 0, reservedTokens: 0, task: researchTask(question), stages: [], deadline: now() + 30000 };
      if (stats.task === "calculation") return { warning: "Use the source-linked financial comparison below. Arithmetic is calculated from reviewed figures, and missing or incomparable inputs remain unresolved.", stats };
      let configs;
      try { configs = configuredModels(env); } catch { return { stats, warning: "The research note is unavailable. Original source passages remain accessible." }; }
      if (!Object.keys(configs).length) return { stats };
      const sources = sourceInputs(passages);
      if (!sources.length) return { stats, warning: "No matching primary-source passages were found. Try a more specific question." };
      const namespace = await engineHash([engineVersion, scope, Object.entries(configs).map(([role, c]) => [role, c.model, c.apiKey])]);
      const normalizedQuestion = question.trim().replace(/\s+/g, " ").toLowerCase();
      const answerKey = await engineHash([namespace, ticker, normalizedQuestion, sources]);
      try {
        const result = await cached(answerKey, async () => {
          let records = [];
          // Simple questions use one small extraction call and no writer model.
          // Large reasoning contexts are reduced in at most two independent chunks.
          const mapFirst = stats.task === "extract" || sources.length > 4;
          if (mapFirst) {
            const chunks = stats.task === "extract" ? [sources.slice(0, 4)] : [sources.slice(0, 4), sources.slice(4, 8)];
            for (const chunk of chunks) {
              const key = await engineHash([namespace, "extract", normalizedQuestion, chunk]);
              try {
                const items = await cached(key, () => withFallback([configs.extract, configs.extractFallback], async config => {
                  // Preserve one attempt for the actual analytical answer after map-stage failures.
                  if (stats.task === "reason" && stats.calls >= 2) throw new ModelError("budget");
                  const raw = await invoke(config, extractionInstructions, JSON.stringify({ question, passages: chunk }), true, env, stats);
                  return checkedExtraction(raw, chunk);
                }), stats);
                records.push(...items);
              } catch (error) {
                if (stats.task === "extract") throw error;
                // Keep the original context available when compression is unavailable.
                records = []; break;
              }
            }
          }
          if (stats.task === "extract") {
            if (!records.length) throw new ModelError("evidence");
            const lines = []; let words = 0;
            for (const item of records.slice(0, 3)) {
              const count = item.quote.split(/\s+/).length;
              if (words + count > 180) continue;
              lines.push(`${item.quote} [${item.reference}]`); words += count;
            }
            if (!lines.length) throw new ModelError("evidence");
            return { answer: lines.join("\n\n"), kind: "selected-evidence" };
          }
          const selected = records.length ? sources.filter(source => records.some(item => item.reference === source.reference)).map(source => ({ ...source, text: records.filter(item => item.reference === source.reference).map(item => item.quote).join("\n") })) : sources;
          const answer = await withFallback([configs.reason, configs.reasonFallback], async config => {
            const raw = await invoke(config, researchInstructions, JSON.stringify({ question, passages: selected }), false, env, stats);
            return checkedAnswer(raw, selected);
          });
          return { answer, kind: "analysis" };
        }, stats);
        return { ...result, stats };
      } catch {
        return { stats, warning: "The research note could not complete. Original source passages remain accessible." };
      }
    },
  };
}
