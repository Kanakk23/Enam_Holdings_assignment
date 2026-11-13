import { getDocument, GlobalWorkerOptions } from "pdfjs-dist";
import workerUrl from "pdfjs-dist/build/pdf.worker.min.mjs?url";
GlobalWorkerOptions.workerSrc = workerUrl;
export async function indexPdf(source, onProgress, suppliedBytes) {
  let bytes = suppliedBytes;
  if (!bytes) {
    const response = await fetch(
      `/api/document?ticker=${encodeURIComponent(source.ticker)}&url=${encodeURIComponent(source.url)}`,
    );
    if (!response.ok) {
      let detail;
      try {
        detail = await response.json();
      } catch {}
      throw Error(detail?.error || "The original PDF is unavailable.");
    }
    bytes = new Uint8Array(await response.arrayBuffer());
  }
  if (
    bytes.length > 25000000 ||
    new TextDecoder().decode(bytes.slice(0, 5)) !== "%PDF-"
  )
    throw Error("Choose an original PDF under 25 MB.");
  const hash = await crypto.subtle.digest("SHA-256", bytes);
  const sha256 = Array.from(new Uint8Array(hash))
    .map((x) => x.toString(16).padStart(2, "0"))
    .join("");
  const pdf = await getDocument({ data: bytes, isEvalSupported: false })
    .promise;
  const passages = [];
  const pageCount = pdf.numPages;
  const total = Math.min(pageCount, 300);
  try {
    for (let n = 1; n <= total; n++) {
      if (n % 10 === 1)
        onProgress(`Reading ${source.ticker} · page ${n} of ${total}…`);
      const page = await pdf.getPage(n);
      const content = await page.getTextContent();
      let text = "";
      for (const item of content.items)
        if (item.str) text += item.str + (item.hasEOL ? "\n" : " ");
      const blocks = text.split(/(?<=[.!?])\s+/).map((t) => t.trim());
      for (let i = 0; i < blocks.length; i++)
        if (
          /revenue|cash flow|operating margin|guidance|outlook|capital expenditure|growth/i.test(
            blocks[i],
          ) &&
          blocks[i].length > 80
        ) {
          const quote = blocks.slice(Math.max(0, i - 1), i + 2).join(" ");
          passages.push({
            page: n,
            text: quote.slice(0, 1200),
            score: (
              quote.match(/guidance|outlook|margin|cash flow|revenue/gi) || []
            ).length,
          });
          if (passages.length > 80)
            passages.sort((a, b) => b.score - a.score).splice(60);
        }
      page.cleanup();
    }
  } finally {
    await pdf.destroy();
  }
  if (!passages.length)
    throw Error(
      "No readable financial passages were found. A scanned PDF may need OCR; FINN has not invented an answer.",
    );
  return {
    ...source,
    userProvided: !!suppliedBytes,
    id: sha256.slice(0, 16),
    sha256,
    pageCount,
    partial: pageCount > total,
    period: source.period || "See original document",
    retrievedAt: new Date().toISOString(),
    passages: passages
      .sort((a, b) => b.score - a.score)
      .slice(0, 24)
      .map((p, i) => ({ ...p, id: `${sha256.slice(0, 16)}:${p.page}:${i}` })),
  };
}
