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
export async function discover(ticker) {
  const cached = discoveryCache.get(ticker);
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
  const sources = sourceLinks(await response.text(), ticker);
  if (discoveryCache.size > 100) discoveryCache.clear();
  discoveryCache.set(ticker, { sources, expires: Date.now() + 3600000 });
  return sources;
}
export async function download(source) {
  let url = source;
  for (let n = 0; n < 4; n++) {
    if (!publicUrl(url))
      throw Error("Only public HTTPS document sources are allowed.");
    const r = await fetch(url, {
      redirect: "manual",
      signal: AbortSignal.timeout(25000),
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
