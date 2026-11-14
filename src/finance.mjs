import Decimal from "decimal.js";
const D = Decimal.clone({ precision: 40, rounding: Decimal.ROUND_HALF_UP });
export const metrics = {
  revenue: "Revenue",
  revenue_yoy_growth: "Revenue YoY growth · reported",
  ebitda: "EBITDA",
  pbt: "Profit before tax",
  pat: "Profit after tax",
  operating_margin: "Operating margin",
  revenue_cc_growth: "Revenue YoY growth · CC",
  free_cash_flow: "Free cash flow",
  fcf_conversion: "FCF / net profit",
};
export const percentageMetrics = new Set([
  "revenue_yoy_growth",
  "operating_margin",
  "revenue_cc_growth",
  "fcf_conversion",
]);
export const units = {
  "INR crore": { currency: "INR", factor: "1", canonical: "INR crore" },
  "INR million": { currency: "INR", factor: "0.1", canonical: "INR crore" },
  "INR billion": { currency: "INR", factor: "100", canonical: "INR crore" },
  "USD million": { currency: "USD", factor: "1", canonical: "USD million" },
  "USD billion": { currency: "USD", factor: "1000", canonical: "USD million" },
  "%": { currency: "ratio", factor: "1", canonical: "%" },
};
export const accountingBases = [
  "IFRS",
  "Ind AS",
  "US GAAP",
  "Issuer commentary",
];
export function number(value) {
  if (typeof value !== "string" && typeof value !== "number") return null;
  let text = String(value).trim().replace(/−/g, "-");
  if (/^\([^()]+\)$/.test(text)) text = "-" + text.slice(1, -1);
  if (
    !/^[+-]?(?:\d+|\d{1,3}(?:,\d{3})+|\d{1,2}(?:,\d{2})*,\d{3})(?:\.\d+)?$/.test(
      text,
    ) ||
    text.length > 36
  )
    return null;
  try {
    const n = new D(text.replaceAll(",", ""));
    return n.isFinite() && n.abs().lte("1000000000000000000") ? n : null;
  } catch {
    return null;
  }
}
export function periodEnd(period) {
  const m = /^FY(20\d{2})(?:-Q([1-4]))?$/.exec(period || "");
  if (!m) return null;
  const y = +m[1],
    q = m[2] ? +m[2] : 4;
  return `${q === 4 ? y : y - 1}-${{ 1: "06-30", 2: "09-30", 3: "12-31", 4: "03-31" }[q]}`;
}
export function periodLabel(p) {
  const m = /^FY(20\d{2})(?:-Q([1-4]))?$/.exec(p || "");
  return m ? `${m[2] ? "Q" + m[2] + " · " : ""}FY${m[1].slice(2)}` : p;
}
export function offsetPeriod(p, n) {
  const m = /^FY(20\d{2})(?:-Q([1-4]))?$/.exec(p || "");
  if (!m) return null;
  if (!m[2]) return `FY${+m[1] + n}`;
  const serial = +m[1] * 4 + +m[2] - 1 + n;
  return `FY${Math.floor(serial / 4)}-Q${(serial % 4) + 1}`;
}
export function accepted(f) {
  return (
    ["source_checked", "user_checked", "machine_checked"].includes(f?.review) &&
    !!periodEnd(f.period) &&
    !!f.documentId &&
    Number.isInteger(f.page) &&
    f.page > 0 &&
    !!metrics[f.metric] &&
    !!units[f.unit] &&
    !!number(f.value) &&
    percentageMetrics.has(f.metric) === (f.unit === "%") &&
    ["consolidated", "standalone"].includes(f.basis) &&
    accountingBases.includes(f.accounting) &&
    ["reported", "adjusted", "constant_currency"].includes(f.scope)
  );
}
export function canonical(f) {
  const n = number(f?.value),
    u = units[f?.unit];
  return n && u
    ? { value: n.times(u.factor), unit: u.canonical, currency: u.currency }
    : null;
}
export function quoteContainsNumber(quote, value) {
  const target = number(value);
  if (!target) return false;
  return (
    quote.match(/(?:\(\s*)?[−+-]?\d(?:[\d,]*\d)?(?:\.\d+)?\)?/g) || []
  ).some((token) => number(token)?.eq(target));
}
export function sourcePassage(record, documents) {
  const d = documents.find((d) => d.id === record.documentId);
  if (!d || !["Annual report", "Earnings-call transcript"].includes(d.type))
    return null;
  const passage = d.passages.find(
    (p) =>
      p.page === record.page &&
      (!record.passageId || p.id === record.passageId),
  );
  return passage ? { ...passage, document: d } : null;
}
export function sourceProof(record, documents) {
  const p = sourcePassage(record, documents);
  return !!p && p.text.trim().length > 0 && (record.review !== "machine_checked" || (typeof record.quote === "string" && (p.context || p.text).replace(/\s+/g, " ").includes(record.quote.replace(/\s+/g, " ")) && quoteContainsNumber(record.quote, record.value)));
}
export function compareFacts(current, previous, relation = "yoy") {
  if (!accepted(current) || !accepted(previous))
    return { status: "missing", reason: "A source-checked figure is missing." };
  const a = canonical(current),
    b = canonical(previous);
  for (const k of ["ticker", "metric", "basis", "accounting", "scope"])
    if (current[k] !== previous[k])
      return {
        status: "incomparable",
        reason: `The ${k} differs between the figures.`,
      };
  if (a.currency !== b.currency)
    return {
      status: "incomparable",
      reason:
        "Different currencies or measurement units; no FX rate is assumed.",
    };
  const quarterly = current.period.includes("-Q");
  if (quarterly !== previous.period.includes("-Q"))
    return {
      status: "incomparable",
      reason: "Annual and quarterly figures cannot be compared.",
    };
  if (
    !["qoq", "yoy"].includes(relation) ||
    (!quarterly && relation === "qoq") ||
    previous.period !==
      offsetPeriod(
        current.period,
        relation === "qoq" ? -1 : quarterly ? -4 : -1,
      )
  )
    return {
      status: "incomparable",
      reason: "The periods do not form the selected QoQ or YoY window.",
    };
  if (current.rounded || previous.rounded)
    return {
      status: "insufficient-precision",
      reason:
        "A source figure is rounded. A precise percentage change is withheld.",
    };
  const absolute = a.value.minus(b.value).toString();
  if (a.currency === "ratio")
    return {
      status: "ok",
      change: absolute,
      changeUnit: "pp",
      absoluteChange: absolute,
      current: a.value.toString(),
      previous: b.value.toString(),
      unit: a.unit,
    };
  if (b.value.lte(0))
    return {
      status: "not-meaningful",
      reason: "A zero or negative base makes percentage growth misleading.",
      absoluteChange: absolute,
      unit: a.unit,
    };
  return {
    status: "ok",
    change: a.value.minus(b.value).div(b.value).times(100).toString(),
    changeUnit: "%",
    absoluteChange: absolute,
    current: a.value.toString(),
    previous: b.value.toString(),
    unit: a.unit,
  };
}
export function resolveFact(
  facts,
  filter,
  documents,
  asOf = new Date().toISOString().slice(0, 10),
) {
  const matches = facts.filter(
    (f) =>
      Object.entries(filter).every(([k, v]) =>
        k === "currency" ? canonical(f)?.currency === v : f[k] === v,
      ) &&
      accepted(f) &&
      sourceProof(f, documents) &&
      periodEnd(f.period) <= asOf &&
      (!f.reportedAt || f.reportedAt <= asOf) &&
      (!documents.find((d) => d.id === f.documentId)?.publishedAt ||
        documents.find((d) => d.id === f.documentId).publishedAt.slice(0, 10) <=
          asOf),
  );
  if (!matches.length)
    return {
      status: "missing",
      reason: "No reviewed figure on this period and basis is recorded.",
    };
  const first = canonical(matches[0]);
  if (
    matches.some((f) => {
      const n = canonical(f);
      return n.currency !== first.currency || !n.value.eq(first.value);
    })
  )
    return {
      status: "conflict",
      reason:
        "Reviewed sources disagree. Resolve the discrepancy before calculating.",
      facts: matches,
    };
  return { status: "ok", fact: matches[0], facts: matches };
}
export function validDate(value) {
  if (typeof value !== "string" || !/^20\d{2}-\d{2}-\d{2}$/.test(value))
    return false;
  const date = new Date(value + "T00:00:00Z");
  return (
    Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value
  );
}
export function assessGuidance(
  g,
  facts,
  documents,
  asOf = new Date().toISOString().slice(0, 10),
) {
  if (
    !g ||
    !["source_checked", "user_checked", "machine_checked"].includes(g.review) ||
    !periodEnd(g.targetPeriod) ||
    !sourceProof(g, documents) ||
    !validDate(g.issuedAt) ||
    g.issuedAt > asOf
  )
    return {
      status: "unreviewed",
      label: "Statement date or source not verified",
    };
  const low = number(g.lower),
    high = number(g.upper);
  if (!low || !high || low.gt(high))
    return { status: "unreviewed", label: "Invalid guidance range" };
  if (g.issuedAt > periodEnd(g.targetPeriod))
    return {
      status: "invalid-timing",
      label: "Statement after period end",
      reason: "A post-period statement cannot be treated as advance guidance.",
    };
  if (periodEnd(g.targetPeriod) > asOf)
    return {
      status: "not-due",
      label: "Target period still open",
      reason:
        "Quarterly progress cannot establish delivery against a full-year target.",
    };
  if (g.scope === "unspecified")
    return {
      status: "incomparable",
      label: "Adjustment basis unclear",
      reason:
        "The statement does not clearly specify reported versus adjusted treatment.",
    };
  const actual = resolveFact(
    facts,
    {
      ticker: g.ticker,
      metric: g.metric,
      period: g.targetPeriod,
      basis: g.basis,
      accounting: g.accounting,
      scope: g.scope,
    },
    documents,
    asOf,
  );
  if (actual.status !== "ok")
    return {
      status: actual.status,
      label:
        actual.status === "conflict"
          ? "Conflicting actuals"
          : "Actual not verified",
      reason: actual.reason,
    };
  const n = canonical(actual.fact),
    u = units[g.unit];
  if (!u || n.currency !== u.currency)
    return { status: "incomparable", label: "Different units" };
  if (actual.fact.rounded)
    return { status: "insufficient-precision", label: "Actual is rounded" };
  const v = n.value.div(u.factor);
  return {
    status: v.lt(low) ? "below" : v.gt(high) ? "above" : "within",
    label: v.lt(low)
      ? "Below range"
      : v.gt(high)
        ? "Above range"
        : "Within range",
    actual: actual.fact,
    value: v.toString(),
  };
}
export function displayNumber(value, unit) {
  const n = number(value);
  if (!n) return "—";
  const [whole, decimal] = n.toFixed(unit === "%" ? 1 : 2).split(".");
  const sign = whole.startsWith("-") ? "-" : "";
  const digits = whole.replace("-", ""),
    head = digits.slice(0, -3);
  const grouped = head
    ? head.replace(/\B(?=(\d{2})+(?!\d))/g, ",") + "," + digits.slice(-3)
    : digits;
  return `${sign}${grouped}${decimal ? "." + decimal : ""}${unit === "%" ? "%" : ""}`;
}
export function displayChange(r) {
  if (r.status !== "ok")
    return r.status === "not-meaningful"
      ? "N/M"
      : r.status === "insufficient-precision"
        ? "Rounded"
        : "—";
  let n;
  try {
    n = new D(r.change);
  } catch {
    return "—";
  }
  if (!n.isFinite()) return "—";
  return `${n.gt(0) ? "+" : ""}${n.toFixed(2)}${r.changeUnit === "pp" ? " pp" : "%"}`;
}
export function validateRecord(
  kind,
  r,
  documents,
  asOf = new Date().toISOString().slice(0, 10),
) {
  if (
    !["figure", "guidance"].includes(kind) ||
    !["source_checked", "user_checked", "machine_checked"].includes(r?.review)
  )
    return "The record needs explicit source review.";
  if (
    ![
      "reported",
      "adjusted",
      "constant_currency",
      ...(kind === "guidance" ? ["unspecified"] : []),
    ].includes(r.scope)
  )
    return "Check the adjustment basis.";
  const p = sourcePassage(r, documents);
  if (!p) return "The original primary-source passage is missing.";
  if (
    !metrics[r.metric] ||
    !units[r.unit] ||
    !accountingBases.includes(r.accounting) ||
    !["consolidated", "standalone"].includes(r.basis) ||
    percentageMetrics.has(r.metric) !== (r.unit === "%")
  )
    return "Check the metric, units and accounting basis.";
  const vals = kind === "guidance" ? [r.lower, r.upper] : [r.value];
  if (vals.some((v) => !quoteContainsNumber(p.text, v)))
    return "Every value must occur literally in the selected passage.";
  if (kind === "figure") {
    if (!accepted(r) || periodEnd(r.period) > asOf)
      return "Check the actual reporting period and review status.";
  } else if (
    !periodEnd(r.targetPeriod) ||
    !validDate(r.issuedAt) ||
    r.issuedAt > asOf ||
    r.issuedAt > periodEnd(r.targetPeriod) ||
    number(r.lower).gt(number(r.upper))
  )
    return "Guidance needs a valid range and a statement date before its target period ends.";
  return null;
}
