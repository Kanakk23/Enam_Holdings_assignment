const stop = new Set([
  "what",
  "the",
  "and",
  "did",
  "does",
  "say",
  "about",
  "primary",
  "documents",
  "company",
  "reported",
  "with",
  "from",
  "that",
  "this",
  "how",
  "would",
  "could",
  "should",
  "explain",
  "investigate",
]);
const normalize = (s) =>
  String(s || "")
    .toLowerCase()
    .replace(/\bfy(\d{2})\b/g, "fy20$1")
    .replace(/\b(revenues|margins|profits|flows)\b/g, (w) => w.slice(0, -1));
function dateFor(d) {
  if (d.publishedAt) return d.publishedAt.slice(0, 10);
  const ys = (d.reportPeriod || d.period || d.title || "").match(/20\d{2}/g);
  return ys ? Math.max(...ys.map(Number)) + "-03-31" : "0000-01-01";
}
export function passagesFor(documents, query) {
  const words = [
    ...new Set(
      (normalize(query).match(/fy20\d{2}|20\d{2}|[a-z]{3,}/g) || []).filter(
        (w) => !stop.has(w),
      ),
    ),
  ];
  const latest = Math.max(0, ...documents.map((d) => +dateFor(d).slice(0, 4)));
  const ranked = documents
    .flatMap((document) =>
      document.passages.map((p) => {
        const haystack = normalize(
          [
            p.text,
            p.section,
            document.title,
            document.reportPeriod,
            document.period,
          ].join(" "),
        );
        const matches = words.filter((w) => haystack.includes(w)).length;
        return {
          ...p,
          document,
          matches,
          score:
            matches * 4 +
            Math.max(
              0,
              8 - (latest - Number(dateFor(document).slice(0, 4))) * 4,
            ),
        };
      }),
    )
    .filter((p) => !words.length || p.matches > 0)
    .sort(
      (a, b) =>
        b.score - a.score ||
        dateFor(b.document).localeCompare(dateFor(a.document)),
    );
  const used = new Map();
  return ranked
    .filter((p) => {
      const count = used.get(p.document.id) || 0;
      if (count >= (documents.length === 1 ? 4 : 2)) return false;
      used.set(p.document.id, count + 1);
      return true;
    })
    .slice(0, 4);
}
