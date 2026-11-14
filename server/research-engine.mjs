import { financialInstructions, validateFinancialCandidates, proseCandidates } from "./financial-extraction.mjs";
import { ModelError, configuredModels, modelCompletion, researchInstructions, extractionInstructions } from "./models.mjs";
const engineVersion = "source-routing-v3";
export function researchTask(question) {
  const q = String(question).toLowerCase();
  if (/\b(calculate|compute|work out)\b/.test(q) && /\b(growth|yoy|qoq|ratio|conversion|change|percentage)\b/.test(q)) return "calculation";
  return /\b(compare|versus|vs\.?|promis\w*|deliver\w*|guidance|narrative|contradict\w*|conflict\w*|trajectory|multi.year|bull|bear|why|risk\w*|leverage|cash quality|cash conversion|balance sheet)\b|what (?:has )?changed|four quarters|4 quarters|year.over.year|quarter.over.quarter/.test(q) ? "reason" : "extract";
}
const modelLimit = (value, fallback, max) => Number.isFinite(Number(value)) && Number(value) > 0 ? Math.min(max, Math.floor(Number(value))) : fallback;
function focusedContext(passage, maxChars, question) {
  const quote = String(passage.text || "").trim();
  const original = String(passage.context || quote).trim();
  if (original.length <= maxChars) return original;
  const exact = quote ? original.indexOf(quote) : -1;
  if (exact >= 0 && quote.length <= maxChars) {
    const start = Math.max(0, Math.min(exact - Math.min(250, maxChars - quote.length), original.length - maxChars));
    return original.slice(start, start + maxChars);
  }
  // Some reviewed table-cell labels are not contiguous original prose. Keep original
  // page text and select its relevant window instead of treating a label as a quote.
  const ignored = new Set(["what", "when", "where", "company", "management", "select", "short", "original", "quotation", "documents", "about", "state", "available", "evidence", "compare", "across", "please", "return", "say"]);
  const terms = [...new Set((String(question || quote).toLowerCase().match(/[a-z]{4,}/g) || []).filter(word => !ignored.has(word)))];
  const lower = original.toLowerCase(), starts = new Set([0]);
  for (let start = 0; start < original.length; start += Math.floor(maxChars / 2)) starts.add(Math.min(start, original.length - maxChars));
  for (const term of terms) {
    let index = lower.indexOf(term);
    for (let count = 0; index >= 0 && count < 30; count++, index = lower.indexOf(term, index + term.length)) starts.add(Math.max(0, Math.min(index - 200, original.length - maxChars)));
  }
  let best = 0, bestScore = -1;
  for (const start of starts) {
    const window = lower.slice(start, start + maxChars);
    const score = terms.reduce((sum, term) => sum + (window.split(term).length - 1), 0);
    if (score > bestScore) { best = start; bestScore = score; }
  }
  return original.slice(best, best + maxChars);
}
export function sourceInputs(passages, maxChars = 1800, question = "") {
  const seen = new Set();
  return passages.slice(0, 8).flatMap((p, i) => {
    const text = focusedContext(p, maxChars, question);
    if (!text || !["Annual report", "Earnings-call transcript"].includes(p.document?.type)) return [];
    const fingerprint = `${p.document.id}:${p.page}:${p.context || text}`;
    if (seen.has(fingerprint)) return [];
    seen.add(fingerprint);
    return [{ reference: i + 1, documentId: p.document.id, passageId: p.id, title: String(p.document.title).slice(0, 200), page: p.page,
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
    if (!source || typeof item.quote !== "string" || item.quote.length < 30 || item.quote.length > 700 || !["revenue", "margin", "cash", "guidance", "business", "other"].includes(item.topic)) throw new ModelError("evidence");
    // PDF line wrapping can differ from the model's spacing. Match only literal
    // tokens with flexible whitespace, then return the original source bytes.
    const pattern = item.quote.trim().split(/\s+/).map(token => token.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("\\s+");
    const literal = source.text.includes(item.quote) ? item.quote : source.text.match(new RegExp(pattern, "u"))?.[0];
    if (!literal || literal.length > 700) throw new ModelError("evidence");
    return { reference: item.reference, quote: literal, topic: item.topic };
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
  for (const chunk of answer.matchAll(/([\s\S]*?)((?:\[\d+\]\s*)+)/g)) {
    const references=[...chunk[2].matchAll(/\[(\d+)\]/g)].map(m=>+m[1]);
    const evidence=sources.filter(s=>references.includes(s.reference)).map(s=>s.text).join(" ");
    const localNumbers=new Set(numericTokens(evidence));
    if(numericTokens(chunk[1]).some(n=>!localNumbers.has(n)))throw new ModelError("numbers");
    if(/permanently|guaranteed|all execution risks|risk.free|no risks/i.test(chunk[1]) && !evidence.toLowerCase().includes(chunk[1].trim().toLowerCase()))throw new ModelError("evidence");
    const words=chunk[1].toLowerCase().match(/[a-z]{5,}/g)||[];
    if(words.length && !words.some(w=>evidence.toLowerCase().includes(w)))throw new ModelError("evidence");
  }
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
    const stage = { provider: config.provider, model: config.model, purpose: structured === "financial" ? "financial" : structured ? "extract" : "reason" };
    stage.startedAt = now(); stats.stages.push(stage);
    try {
      const answer = await modelCompletion(config, system, input, { structured, fetcher, onUsage: usage => { stage.usage = usage; }, timeoutMs: Math.max(1, Math.min(structured ? 7000 : 10000, stats.deadline - now())) });
      stage.durationMs = now() - stage.startedAt; stage.outcome = "completed"; stage.outputCharacters = answer.length;
      return answer;
    }
    catch (error) {
      stage.durationMs = now() - stage.startedAt; stage.outcome = "failed"; stage.code = error.code || "unavailable";
      if (error.detail) stage.detail = error.detail;
      if (error.upstreamStatus) stage.upstreamStatus = error.upstreamStatus;
      const duration = error.code === "quota" ? 60000 : ["authentication", "model"].includes(error.code) ? 10 * 60000 : ["unavailable", "timeout"].includes(error.code) ? 30000 : 0;
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
    async financial({ticker, passages, scope = "private-owner"}, env = {}) {
      const stats={calls:0,cacheHits:0,reservedTokens:0,stages:[],deadline:now()+18000,task:"financial"};
      const sources=sourceInputs(passages,1800,"revenue operating margin free cash flow").map(s=>({...s,type:passages.find(p=>p.document?.id===s.documentId)?.document?.type}));
      const literal=validateFinancialCandidates(proseCandidates(sources),sources,ticker);
      if(literal.facts.length>=2)return {...literal,stats};
      let configs;try {configs=configuredModels(env);}catch{return {...literal,stats};}
      if(!configs.extract&&!configs.extractFallback)return {...literal,stats};
      try {
        const key=await engineHash(["financial-v1",scope,ticker,sources,Object.values(configs).map(c=>[c.model,c.apiKey])]);
        const result=await cached(key,()=>withFallback([configs.extract,configs.extractFallback],async config=>{
          const raw=await invoke(config,financialInstructions,JSON.stringify({passages:sources}),"financial",env,stats);
          let output;try {output=JSON.parse(raw);}catch{throw new ModelError("evidence");}
          if(!Array.isArray(output.facts)||output.facts.length>12)throw new ModelError("evidence");
          return validateFinancialCandidates(output.facts,sources,ticker);
        }),stats);
        return {facts:[...new Map([...literal.facts,...result.facts].map(f=>[f.id,f])).values()],rejections:result.rejections,stats};
      }catch(error){stats.failureCode=error.code||"unavailable";return {...literal,stats};}
    },
    async research({ ticker, question, passages, scope = "private-owner" }, env = {}) {
      const stats = { calls: 0, cacheHits: 0, reservedTokens: 0, task: researchTask(question), stages: [], deadline: now() + 30000 };
      if (stats.task === "calculation") return { warning: "Use the source-linked financial comparison below. Arithmetic is calculated from reviewed figures, and missing or incomparable inputs remain unresolved.", stats };
      let configs;
      try { configs = configuredModels(env); } catch { return { stats, warning: "The research note is unavailable. Original source passages remain accessible." }; }
      if (!Object.keys(configs).length) return { stats };
      const sources = sourceInputs(passages, 1800, question);
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
      } catch (error) {
        stats.failureCode = error.code || "unavailable";
        return { stats, warning: "The research note could not complete. Original source passages remain accessible." };
      }
    },
  };
}
