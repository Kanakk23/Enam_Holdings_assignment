import {
  accepted,
  sourceProof,
  resolveFact,
  periodEnd,
  offsetPeriod,
  compareFacts,
  displayChange,
  displayNumber,
  metrics,
} from "./finance.mjs";
export function findings(ticker, facts, documents, question = "") {
  const own = facts.filter(
    (f) =>
      f.ticker === ticker &&
      accepted(f) &&
      sourceProof(f, documents) &&
      periodEnd(f.period) <= new Date().toISOString().slice(0, 10),
  );
  const period = own
    .map((f) => f.period)
    .sort(
      (a, b) => periodEnd(b).localeCompare(periodEnd(a)) || b.localeCompare(a),
    )[0];
  const topics = /margin|cash|conversion/i.test(question)
    ? ["operating_margin", "free_cash_flow", "fcf_conversion", "revenue"]
    : ["revenue", "operating_margin", "free_cash_flow", "fcf_conversion"];
  return topics
    .flatMap((metric) => {
      const candidates = own.filter(
        (f) =>
          f.period === period &&
          f.metric === metric &&
          f.scope === "reported" &&
          f.basis === "consolidated",
      );
      const current = candidates[0];
      if (!current) return [];
      const query = {
        ticker,
        metric,
        period,
        basis: current.basis,
        accounting: current.accounting,
        scope: current.scope,
        currency:
          metric === "revenue" || metric === "free_cash_flow"
            ? current.unit.startsWith("USD")
              ? "USD"
              : "INR"
            : "ratio",
      };
      const now = resolveFact(facts, query, documents),
        prior = resolveFact(
          facts,
          {
            ...query,
            period: offsetPeriod(period, period.includes("-Q") ? -1 : -1),
          },
          documents,
        );
      if (now.status !== "ok" || prior.status !== "ok") return [];
      const change = compareFacts(
        now.fact,
        prior.fact,
        period.includes("-Q") ? "qoq" : "yoy",
      );
      if (change.status !== "ok") return [];
      return [
        {
          metric,
          period,
          current: now.fact,
          prior: prior.fact,
          text: `${metrics[metric]} ${displayNumber(now.fact.value, now.fact.unit)}${now.fact.unit === "%" ? "" : " " + now.fact.unit} · ${displayChange(change)} ${period.includes("-Q") ? "QoQ" : "YoY"}`,
        },
      ];
    })
    .slice(0, 3);
}
export function conversationPrompts(question = "", role = "") {
  if (/cash|conversion|margin|finance/i.test(question + " " + role))
    return [
      "Which public operating indicators explain the change in cash conversion or margins?",
      "Which accounting adjustments and working-capital movements should I check in the next report?",
    ];
  if (/sales|growth|revenue|customer/i.test(question + " " + role))
    return [
      "Which demand and customer indicators would test the growth commentary?",
      "What public disclosures would help distinguish pricing changes from volume changes?",
    ];
  return [
    "Which public operating indicators would test the assumptions in this disclosure?",
    "What execution constraints should I ask management about at the next results call?",
  ];
}
export function networkMatches(query, all) {
  const words =
    query
      .toLowerCase()
      .replace(/\bit\b|software|it services/g, "technology")
      .replace(/margins?|cash|conversion|profits?|accounts?/g, "finance")
      .match(/[a-z0-9&-]+/g) || [];
  const terms = [
    ...new Set(
      words.filter(
        (w) =>
          ![
            "who",
            "can",
            "help",
            "me",
            "understand",
            "with",
            "the",
            "a",
            "at",
            "in",
            "my",
            "network",
            "should",
            "i",
            "call",
            "about",
            "and",
            "of",
          ].includes(w),
      ),
    ),
  ];
  if (!terms.length) return all;
  return all
    .map((p) => ({
      p,
      score: terms.reduce(
        (n, t) =>
          n +
          (`${p.name} ${p.role} ${p.company} ${p.sector} ${p.expertise || ""}`
            .toLowerCase()
            .includes(t)
            ? 1
            : 0),
        0,
      ),
    }))
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score)
    .map((x) => x.p);
}
