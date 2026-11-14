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
  const topics = /cash|conversion/i.test(question)
    ? ["fcf_conversion", "free_cash_flow", "operating_margin", "revenue"]
    : /margin/i.test(question) ? ["operating_margin", "free_cash_flow", "fcf_conversion", "revenue"]
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

export function investigationQuestion(question="") {
 if(/cash|conversion/i.test(question))return "Which working-capital or accounting movements explain the cash-conversion change, and does management provide evidence that it will reverse?";
 if(/margin/i.test(question))return "Which disclosed costs, pricing or utilisation movements explain the margin change, and which are recurring?";
 if(/guidance|deliver|promis/i.test(question))return "What changed in management’s target, and what comparable actuals can establish delivery for a completed period?";
 return question || "Which public operating evidence would test this disclosure’s assumptions?";
}

export function investigationBrief(ticker,facts,documents,question='') {
 const rows=findings(ticker,facts,documents,question);if(!rows.length)return {rows,question:investigationQuestion(question),explanation:null};
 const topic=rows[0], period=topic.period;
 const query=topic.metric==='operating_margin'?/margin|cost|utili[sz]ation|pricing/i:/cash|working.capital|receivable|inventor/i;
 const candidates=documents.filter(d=>d.ticker===ticker&&d.period===period).flatMap(document=>document.passages.map(p=>({...p,document})));
 let explanation=null;
 for(const p of candidates){const text=String(p.context||p.text).replace(/\s+/g,' ').trim();const sentences=text.split(/(?<=[.!?])\s+/);const i=sentences.findIndex(s=>query.test(s)&&/due to|driven by|reflect|headwind|tailwind|contribut|because|impact|improv|declin/i.test(s)&&!/\?|analyst\s*:/i.test(s));if(i>=0){const quote=sentences.slice(Math.max(0,i-1),i+2).join(' ');if(quote.length<=1200){explanation={...p,text:quote};break;}}}
 const next=/guidance|deliver|promis/i.test(question)?investigationQuestion(question):topic.metric==='revenue'?`What explains the revenue movement in ${period}, and what evidence do pricing, customer demand and product mix provide?`:topic.metric==='operating_margin'?`What explains ${topic.text}, and which disclosed cost or pricing effects are recurring?`:`What explains ${topic.text}, and which working-capital movements should be tested in the next report?`;
 return {rows,question:next,explanation};
}
