import { passagesFor } from "../src/retrieval.mjs";
import { discover, download, refreshTicker, publicUrl, officialRecoveryUrl } from "./sources.mjs";
import { ModelError, probeConfiguredAccess } from "./models.mjs";
import { createResearchEngine, researchTask } from "./research-engine.mjs";
const researchEngine = createResearchEngine();
const json = (data, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "no-store",
    },
  });
const valid = (t) => /^[A-Z0-9][A-Z0-9&-]{0,24}$/.test(t);
async function requestJson(request) {
  const reader = request.body?.getReader();
  if (!reader) throw new ModelError("request", "Expected a JSON request.", 400);
  const chunks = []; let size = 0;
  try {
    for (;;) {
      const { value, done } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > 400000) {
        await reader.cancel();
        throw new ModelError("request", "The research request is too large. Use fewer indexed documents.", 413);
      }
      chunks.push(value);
    }
    const bytes = new Uint8Array(size); let offset = 0;
    for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.byteLength; }
    const body = JSON.parse(new TextDecoder().decode(bytes));
    if (!body || typeof body !== "object" || Array.isArray(body)) throw Error();
    return body;
  } catch (e) {
    if (e instanceof ModelError) throw e;
    throw new ModelError("request", "Expected a valid JSON object.", 400);
  } finally { reader.releaseLock(); }
}
function browserDocuments(input, ticker, seed) {
  if (input == null) return [];
  if (!Array.isArray(input) || input.length > 8)
    throw new ModelError("evidence", "Use up to eight browser-indexed documents.", 400);
  return input.filter(d => !seed.some(s => s.id === d?.id)).map(d => {
    if (!d || d.ticker !== ticker || !publicUrl(d.url) || !["Annual report", "Earnings-call transcript"].includes(d.type) || !Array.isArray(d.passages) || d.passages.length > 24)
      throw new ModelError("evidence", "Research accepts only indexed annual reports and raw earnings-call transcripts for this ticker.", 400);
    return {
      id: String(d.id || "browser-document").slice(0, 100), ticker,
      title: String(d.title || d.type).slice(0, 200), type: d.type, url: d.url,
      period: String(d.period || "See original").slice(0, 100),
      userProvided: !!d.userProvided, browserSupplied: true,
      partial: !!d.partial,
      passages: d.passages.map(p => {
        if (!p || !Number.isInteger(p.page) || p.page < 1 || p.page > 10000 || typeof p.text !== "string" || p.text.length > 6000)
          throw new ModelError("evidence", "An indexed passage is invalid. Re-import its original document.", 400);
        if(p.table && (JSON.stringify(p.table).length>7000 || typeof p.table!=="object"))throw new ModelError("evidence","Invalid table evidence.",400);
        return { ...(p.table?{table:p.table}:{}), page: p.page, text: p.text, id: String(p.id || "").slice(0, 100) };
      }),
    };
  });
}
export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (request.method === "POST" && request.headers.get("origin") && request.headers.get("origin") !== url.origin)
      return json({ error: "Requests must originate from FINN." }, 403);
    if (url.pathname === "/api/refresh") {
      const t = (url.searchParams.get("ticker") || "").toUpperCase();
      if (!valid(t)) return json({ error: "Invalid ticker" }, 400);
      return json(await refreshTicker(t));
    }
    if (url.pathname === "/api/health") {
      if (env.AI_CONNECTION_DIAGNOSTICS === "true") {
        try { console.info(JSON.stringify({ event: "model_access_probe", checks: await probeConfiguredAccess(env) })); }
        catch { console.info(JSON.stringify({ event: "model_access_probe", failure: "configuration" })); }
      }
      return json({ ok: true });
    }
    if (url.pathname.startsWith("/api/model/")) return json({ error: "Not found" }, 404);
    if (url.pathname === "/api/discover" || url.pathname === "/api/document") {
      const ticker = (url.searchParams.get("ticker") || "").toUpperCase();
      if (!valid(ticker))
        return json({ error: "Enter a valid NSE ticker." }, 400);
      try {
        const source = url.searchParams.get("url");
        const recovery = url.pathname === "/api/document" && officialRecoveryUrl(source,ticker);
        const sources = recovery ? [] : await discover(ticker,{recover:url.searchParams.get("recover")==="1"});
        if (url.pathname === "/api/discover") return json({ ticker, sources });
        if (!recovery && !sources.some((s) => s.url === source) && !(await discover(ticker,{recover:true})).some(s=>s.url===source))
          return json(
            {
              error:
                "This URL is not an annual report or raw transcript listed for the selected company.",
            },
            403,
          );
        return new Response(await download(source), {
          headers: {
            "Content-Type": "application/pdf",
            "Cache-Control": "private, max-age=3600",
            "X-Content-Type-Options": "nosniff",
          },
        });
      } catch (e) {
        return json({ error: e.message }, 502);
      }
    }
    if (["/api/research", "/api/financials"].includes(url.pathname) && request.method === "POST") {
      let body;
      try {
        body = await requestJson(request);
      } catch (e) {
        return json({ error: e.message }, e.status || 400);
      }
      if (!body || typeof body !== "object" || Array.isArray(body))
        return json({ error: "Expected a JSON object." }, 400);
      if (Object.keys(body).some(key => !["ticker", "question", "documents"].includes(key)))
        return json({ error: "Research accepts a ticker, a question and indexed documents." }, 400);
      const ticker = String(body.ticker || "").toUpperCase();
      if (!valid(ticker)) return json({ error: "Invalid NSE ticker" }, 400);
      const seed = await env.ASSETS.fetch(
        new Request(new URL("/data/seed.json", url)),
      );
      const data = await seed.json();
      let documents;
      try {
        const indexed = data.documents.filter((d) => d.ticker === ticker);
        documents = [...indexed, ...browserDocuments(body.documents, ticker, data.documents)];
      } catch (e) { return json({ error: e.message }, e.status || 400); }
      if (!documents.length)
        return json(
          {
            error: `No primary documents have been indexed for ${ticker}. Run the free ingestion workflow with this ticker, or import an official report using the documented CLI. No company answer has been invented.`,
            ticker,
            sourceDiscovery: `https://www.nseindia.com/companies-listing/corporate-filings-annual-reports?symbol=${encodeURIComponent(ticker)}&tabIndex=equity`,
          },
          422,
        );
      if (url.pathname === "/api/financials") {
        const result = await researchEngine.financial({ticker, passages:[...documents.flatMap(document=>document.passages.filter(p=>p.table).map(p=>({...p,document}))),...passagesFor(documents,"revenue operating margin free cash flow consolidated standalone",{limit:8})].slice(0,8), scope:request.headers.get("oai-authenticated-user-id")||"owner-private-service"},env);
        if(env.AI_LOG_USAGE === "true") console.info(JSON.stringify({event:"financial_usage",...result.stats,rejections:result.rejections}));
        return json({facts:result.facts, message:result.facts.length ? "Automatically extracted; literal evidence checks passed. Verify accounting interpretation in the original." : "No unambiguous financial actuals could be extracted. Original evidence remains available."});
      }
      const question = String(
        body.question || "Growth, margins and cash generation",
      ).slice(0, 600);
      const passages = passagesFor(documents, question, { limit: researchTask(question) === "reason" ? 8 : 4 });
      const base = {
        ticker, question, documents, passages, mode: "extractive",
        ...(documents.some(d => d.browserSupplied) ? {
          sourceWarning: "Includes text extracted in this browser. The server has not independently verified the PDF's contents or identity.",
        } : {}),
      };
      const result = await researchEngine.research({
        ticker, question, passages,
        scope: request.headers.get("oai-authenticated-user-id") || "owner-private-service",
      }, env);
      if (env.AI_LOG_USAGE === "true") console.info(JSON.stringify({
        event: "research_usage", calls: result.stats.calls, cacheHits: result.stats.cacheHits,
        reservedTokens: result.stats.reservedTokens, task: result.stats.task, stages: result.stats.stages,
        failureCode: result.stats.failureCode, failureDetail: result.stats.failureDetail, validationWithheld: result.stats.validationWithheld,
      }));
      // Only investor-facing output is returned. Keys, routes, models and budget traces stay on the server.
      return json({ ...base, ...(result.answer ? { mode: "model", answer: result.answer, answerKind: result.kind } : {}), ...(result.warning ? { warning: result.warning } : {}) });
    }
    return env.ASSETS.fetch(request);
  },
};
