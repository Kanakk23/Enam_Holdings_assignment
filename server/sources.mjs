import {issuerSources} from './issuer-discovery.mjs';
const decode = (s) =>
  s
    .replace(/&amp;/g, "&")
    .replace(/&#39;/g, "'")
    .replace(/&quot;/g, '"');
export function publicUrl(value) {
  try {
    const u = new URL(value);
    return (
      u.protocol === "https:" &&
      !u.username &&
      !u.password &&
      (!u.port || u.port === "443") &&
      /^[a-z][a-z0-9.-]*\.[a-z]{2,}$/i.test(u.hostname) &&
      !/(^|\.)(localhost|local|internal|test|invalid)$/i.test(u.hostname)
    );
  } catch {
    return false;
  }
}
export function sourceLinks(html, ticker) {
  const links = [];
  for (const a of html.matchAll(/<a\b([^>]*)>([\s\S]*?)<\/a>/gi)) {
    const href = a[1].match(/\bhref\s*=\s*["']([^"']+)["']/i)?.[1];
    const text = a[2]
      .replace(/<[^>]*>/g, " ")
      .replace(/\s+/g, " ")
      .trim();
    const kind = /^Annual Report\s+20\d{2}$/i.test(text)
      ? "Annual report"
      : /^Transcript$/i.test(text)
        ? "Earnings-call transcript"
        : null;
    if (!href || !kind) continue;
    const url = decode(href);
    if (
      !publicUrl(url) ||
      new URL(url).hostname.endsWith("screener.in") ||
      !(/\.pdf(?:\?|$)/i.test(url) || /AnnPdfOpen\.aspx/i.test(url))
    )
      continue;
    const previous = html.slice(Math.max(0, a.index - 600), a.index);
    const date = [...previous.matchAll(/>([A-Z][a-z]{2} 20\d{2})<\/div>/g)].at(
      -1,
    )?.[1];
    links.push({
      ticker,
      url,
      type: kind,
      title: `${ticker} · ${kind === "Annual report" ? text : `Earnings-call transcript${date ? " · " + date : ""}`}`,
      period:
        kind === "Annual report"
          ? text.replace("Annual Report ", "")
          : date || "See original transcript",
    });
  }
  return [
    ...links.filter((x) => x.type === "Annual report").slice(0, 1),
    ...links.filter((x) => x.type !== "Annual report").slice(0, 3),
  ];
}
const discoveryCache = new Map();
export async function discover(ticker, {recover=false}={}) {
  const cacheKey=ticker+(recover?":recovery":"");
  const cached = discoveryCache.get(cacheKey);
  if (cached && cached.expires > Date.now()) return cached.sources;
  const response = await fetch(
    `https://www.screener.in/company/${encodeURIComponent(ticker)}/consolidated/`,
    {
      headers: { "User-Agent": "FINN public investor document discovery" },
      signal: AbortSignal.timeout(20000),
    },
  );
  if (!response.ok)
    throw Error(
      "Document discovery is temporarily unavailable. Try again or use the documented official-PDF import.",
    );
  const html=await response.text();
  const listed=sourceLinks(html,ticker);
  const extra=recover ? (await issuerSources(html,ticker,{allowedUrl:publicUrl})).sources : [];
  const sources=[...new Map([...extra,...listed].map(s=>[s.url,s])).values()];
  if (discoveryCache.size > 100) discoveryCache.clear();
  discoveryCache.set(cacheKey, { sources, expires: Date.now() + 3600000 });
  return sources;
}
export async function download(source) {
  let url = source;const deadline=Date.now()+18000;
  for (let n = 0; n < 4; n++) {
    if (!publicUrl(url))
      throw Error("Only public HTTPS document sources are allowed.");
    const r = await fetch(url, {
      redirect: "manual",
      signal: AbortSignal.timeout(Math.max(1,deadline-Date.now())),
    });
    if (r.status >= 300 && r.status < 400) {
      url = new URL(r.headers.get("location"), url).href;
      continue;
    }
    if (!r.ok)
      throw Error(
        `The original document returned ${r.status}. Try another listed source.`,
      );
    const reader = r.body.getReader(),
      chunks = [];
    let size = 0;
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      size += value.length;
      if (size > 25000000) {
        await reader.cancel();
        throw Error("This PDF exceeds the 25 MB prototype limit.");
      }
      chunks.push(value);
    }
    const bytes = new Uint8Array(size);
    let offset = 0;
    for (const chunk of chunks) {
      bytes.set(chunk, offset);
      offset += chunk.length;
    }
    if (new TextDecoder().decode(bytes.slice(0, 5)) !== "%PDF-")
      throw Error("The source did not return a readable PDF.");
    return bytes;
  }
  throw Error("Too many document redirects.");
}

const refreshCache = new Map();
export async function refreshTicker(ticker) {
  const saved = refreshCache.get(ticker);
  if (saved && saved.until > Date.now()) return saved.value;
  const result = {
    ticker,
    checkedAt: new Date().toISOString(),
    market: null,
    filings: null,
    errors: [],
  };
  await Promise.all([
    (async () => {
      try {
        const r = await fetch(
          `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(ticker + ".NS")}?range=3mo&interval=1d&includeAdjustedClose=true`,
          { signal: AbortSignal.timeout(15000) },
        );
        if (!r.ok) throw Error(`Market source returned ${r.status}`);
        const j = (await r.json()).chart?.result?.[0];
        const closes = j?.indicators?.adjclose?.[0]?.adjclose,
          volume = j?.indicators?.quote?.[0]?.volume;
        if (!closes || !volume)
          throw Error("Adjusted market series unavailable");
        const indiaDate = new Intl.DateTimeFormat("en-CA", {
          timeZone: "Asia/Kolkata",
          year: "numeric",
          month: "2-digit",
          day: "2-digit",
        }).format(new Date());
        const indiaTime = new Intl.DateTimeFormat("en-GB", {
          timeZone: "Asia/Kolkata",
          hour: "2-digit",
          minute: "2-digit",
          hour12: false,
        }).format(new Date());
        const days = j.timestamp
          .map((t, i) => ({ t, c: closes[i], v: volume[i] }))
          .filter(
            (x) =>
              Number.isFinite(x.c) &&
              x.c > 0 &&
              Number.isFinite(x.v) &&
              (new Date(x.t * 1000).toISOString().slice(0, 10) < indiaDate ||
                (new Date(x.t * 1000).toISOString().slice(0, 10) ===
                  indiaDate &&
                  indiaTime >= "15:45")),
          );
        if (days.length < 22)
          throw Error("Insufficient complete prior sessions");
        const last = days.at(-1),
          prior = days.at(-2),
          avg = days.slice(-21, -1).reduce((n, d) => n + d.v, 0) / 20;
        result.market = {
          close: last.c,
          change: (last.c / prior.c - 1) * 100,
          session: new Date(last.t * 1000).toISOString().slice(0, 10),
          volume: last.v,
          volumeRatio: avg > 0 ? last.v / avg : null,
          provider: "Yahoo Finance",
          basis: "provider-adjusted history",
        };
      } catch (e) {
        result.errors.push(e.message);
      }
    })(),
    (async () => {
      try {
        const r = await fetch(
          `https://www.screener.in/company/${encodeURIComponent(ticker)}/consolidated/`,
          { signal: AbortSignal.timeout(15000) },
        );
        if (!r.ok) throw Error(`Filing directory returned ${r.status}`);
        const html = await r.text();
        const section = html.split(/id=["']company-announcements-tab["']/)[1];
        if (!section) throw Error("Filing directory structure changed");
        result.filings = [];
        for (const m of section.matchAll(/<li\b[^>]*>([\s\S]*?)<\/li>/gi)) {
          const a = m[1].match(
              /<a[^>]*href=["'](https:\/\/(?:www\.)?bseindia\.com\/[^"']+)["'][^>]*>([\s\S]*?)<\/a>/i,
            ),
            date = m[1].match(/datetime=["']([^"']+)["']/);
          if (!a || !date || !Number.isFinite(Date.parse(date[1]))) continue;
          const title = decode(
            a[2]
              .replace(/<[^>]*>/g, " ")
              .replace(/\s+/g, " ")
              .trim(),
          );
          const raw = decode(a[1]);
          const id = Array.from(
            new Uint8Array(
              await crypto.subtle.digest(
                "SHA-256",
                new TextEncoder().encode(raw),
              ),
            ),
          )
            .map((x) => x.toString(16).padStart(2, "0"))
            .join("")
            .slice(0, 16);
          const routine =
            /newspaper|certificate|trading window|investor meet|loss of share/i.test(
              title,
            );
          result.filings.push({
            id,
            ticker,
            title,
            date: date[1].slice(0, 10),
            publishedAt: date[1],
            url: raw,
            sourceType: "BSE filing",
            historical: false,
            priority: routine ? "Routine" : "Review",
            rank: routine ? 9 : /results|transcript/i.test(title) ? 0 : 4,
            description:
              "Original disclosure located; its financial impact has not been verified.",
            question:
              "What does the original disclosure establish, and what needs verification?",
          });
          if (result.filings.length === 5) break;
        }
      } catch (e) {
        result.errors.push(e.message);
      }
    })(),
  ]);
  if (refreshCache.size > 100) refreshCache.clear();
  refreshCache.set(ticker, { until: Date.now() + 300000, value: result });
  return result;
}

// Operator-supplied recovery URL: narrow exchange archive, ticker-bound filename.
export function officialRecoveryUrl(value,ticker) {
 try {const u=new URL(value);const escaped=ticker.replace(/[.*+?^${}()|[\]\\]/g,"\\$&");return publicUrl(value)&&u.hostname==="nsearchives.nseindia.com"&&!u.search&&new RegExp("^/corporate/"+escaped+"[0-9]*_[A-Za-z0-9_.-]+\\.pdf$","i").test(u.pathname);}catch{return false;}
}
