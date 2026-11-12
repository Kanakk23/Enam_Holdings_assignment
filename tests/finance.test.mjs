import test from "node:test";
import assert from "node:assert/strict";
import fc from "fast-check";
import Decimal from "decimal.js";
import { readFile } from "node:fs/promises";
import {
  number,
  accepted,
  canonical,
  compareFacts,
  resolveFact,
  assessGuidance,
  periodEnd,
  offsetPeriod,
  quoteContainsNumber,
  validateRecord,
  displayNumber,
  sourceProof,
} from "../src/finance.mjs";
const doc = {
  id: "doc",
  type: "Annual report",
  passages: [
    {
      id: "p3",
      page: 3,
      text: "Illustrative test evidence: 1200, 100, 80, 20, 22, 21. This is not real company data.",
    },
  ],
};
const fact = (value, extra = {}) => ({
  id: "test",
  ticker: "TEST",
  metric: "revenue",
  value: String(value),
  unit: "INR crore",
  period: "FY2026-Q2",
  basis: "consolidated",
  accounting: "IFRS",
  scope: "reported",
  review: "source_checked",
  documentId: "doc",
  page: 3,
  passageId: "p3",
  ...extra,
});
test("financial parser rejects ambiguity and supports Indian grouping/accounting negatives", () => {
  assert.equal(number("1,23,456.78").toString(), "123456.78");
  assert.equal(number("(1,234.50)").toString(), "-1234.5");
  for (const s of [
    "1,23",
    "2.3.4",
    "NaN",
    "Infinity",
    "1e8",
    "100 cr",
    "(−2)",
    "1,000,00",
    "",
  ])
    assert.equal(number(s), null, s);
});
test("canonical value survives reporting-unit conversion across generated positive values", () =>
  fc.assert(
    fc.property(fc.integer({ min: 1, max: 1e9 }), (n) => {
      assert.ok(
        canonical(fact(n)).value.eq(
          canonical(fact(n * 10, { unit: "INR million" })).value,
        ),
      );
      assert.ok(
        canonical(fact(n)).value.eq(
          canonical(
            fact(new Decimal(n).div(100).toString(), { unit: "INR billion" }),
          ).value,
        ),
      );
    }),
    { numRuns: 1000 },
  ));
test("growth is invariant to common scale and mixed compatible reporting units", () =>
  fc.assert(
    fc.property(
      fc.integer({ min: 1, max: 1e7 }),
      fc.integer({ min: 1, max: 1e7 }),
      fc.integer({ min: 1, max: 1000 }),
      (a, b, k) => {
        const current = fact(a),
          previous = fact(b, { period: "FY2026-Q1" }),
          original = compareFacts(current, previous, "qoq");
        assert.equal(
          original.change,
          compareFacts(
            { ...current, value: String(a * k) },
            { ...previous, value: String(b * k) },
            "qoq",
          ).change,
        );
        assert.equal(
          original.change,
          compareFacts(
            { ...current, value: String(a * 10), unit: "INR million" },
            previous,
            "qoq",
          ).change,
        );
      },
    ),
    { numRuns: 1000 },
  ));
test("unchanged values yield zero growth throughout the valid positive domain", () =>
  fc.assert(
    fc.property(fc.integer({ min: 1, max: 1e12 }), (n) =>
      assert.equal(
        compareFacts(fact(n), fact(n, { period: "FY2025-Q2" })).change,
        "0",
      ),
    ),
    { numRuns: 500 },
  ));
test("different currencies, accounting, consolidation, adjustments or periods are refused", () => {
  const a = fact(100),
    b = fact(80, { period: "FY2025-Q2" });
  for (const extra of [
    { unit: "USD million" },
    { basis: "standalone" },
    { accounting: "Ind AS" },
    { scope: "adjusted" },
    { period: "FY2025" },
    { period: "FY2024-Q2" },
  ])
    assert.equal(compareFacts(a, { ...b, ...extra }).status, "incomparable");
  for (const v of [0, -50])
    assert.equal(
      compareFacts(a, { ...b, value: String(v) }).status,
      "not-meaningful",
    );
});
test("margin changes use percentage points, including negative margins", () => {
  const a = fact(21, { metric: "operating_margin", unit: "%" }),
    b = { ...a, value: "20", period: "FY2025-Q2" };
  assert.equal(compareFacts(a, b).change, "1");
  assert.equal(compareFacts(a, b).changeUnit, "pp");
  assert.equal(
    compareFacts({ ...a, value: "-2" }, { ...b, value: "-5" }).change,
    "3",
  );
});
test("quarter offsets roundtrip through fiscal-year boundaries", () =>
  fc.assert(
    fc.property(
      fc.integer({ min: 2010, max: 2090 }),
      fc.integer({ min: 1, max: 4 }),
      fc.integer({ min: -16, max: 16 }),
      (y, q, n) => {
        const p = `FY${y}-Q${q}`;
        assert.equal(offsetPeriod(offsetPeriod(p, n), -n), p);
      },
    ),
    { numRuns: 500 },
  ));
test("unreviewed records, missing documents and wrong passage references do not enter calculations", () => {
  const a = fact(100);
  assert.equal(accepted({ ...a, review: "candidate" }), false);
  assert.equal(resolveFact([a], { ticker: "TEST" }, []).status, "missing");
  assert.equal(
    resolveFact([{ ...a, passageId: "wrong" }], { ticker: "TEST" }, [doc])
      .status,
    "missing",
  );
  assert.equal(accepted({ ...a, unit: "%" }), false);
});
test("conflicting values block calculation regardless of input order", () =>
  fc.assert(
    fc.property(
      fc.integer({ min: 1, max: 100000 }),
      fc.integer({ min: 1, max: 100000 }),
      (n, d) => {
        const a = fact(n),
          b = fact(n + d);
        assert.equal(
          resolveFact([a, b], { ticker: "TEST" }, [doc]).status,
          "conflict",
        );
        assert.equal(
          resolveFact([b, a], { ticker: "TEST" }, [doc]).status,
          "conflict",
        );
      },
    ),
    { numRuns: 300 },
  ));
const guide = () => ({
  ...fact(0, { metric: "operating_margin", unit: "%" }),
  targetPeriod: "FY2026",
  issuedAt: "2026-01-14",
  lower: "20",
  upper: "22",
});
test("open annual targets and quarterly actuals cannot produce an annual delivery verdict", () => {
  const g = guide();
  assert.equal(
    assessGuidance({ ...g, targetPeriod: "FY2027" }, [], [doc], "2026-11-12")
      .status,
    "not-due",
  );
  assert.equal(
    assessGuidance(
      g,
      [
        fact(21, {
          metric: "operating_margin",
          unit: "%",
          period: "FY2026-Q4",
        }),
      ],
      [doc],
      "2026-11-12",
    ).status,
    "missing",
  );
});
test("delivery range boundaries are inclusive on the identical period and basis", () => {
  for (const [v, status] of [
    ["20", "within"],
    ["22", "within"],
    ["19.99", "below"],
    ["22.01", "above"],
  ])
    assert.equal(
      assessGuidance(
        guide(),
        [fact(v, { metric: "operating_margin", unit: "%", period: "FY2026" })],
        [doc],
        "2026-11-12",
      ).status,
      status,
    );
  assert.equal(
    assessGuidance(
      guide(),
      [
        fact(21, {
          metric: "operating_margin",
          unit: "%",
          period: "FY2026",
          scope: "adjusted",
        }),
      ],
      [doc],
      "2026-11-12",
    ).status,
    "missing",
  );
});
test("post-period statements, missing dates, unclear adjustment basis and rounded actuals are not judged", () => {
  assert.equal(
    assessGuidance(
      { ...guide(), issuedAt: "2026-04-01" },
      [],
      [doc],
      "2026-11-12",
    ).status,
    "invalid-timing",
  );
  assert.equal(
    assessGuidance({ ...guide(), issuedAt: null }, [], [doc], "2026-11-12")
      .status,
    "unreviewed",
  );
  assert.equal(
    assessGuidance(
      { ...guide(), scope: "unspecified" },
      [],
      [doc],
      "2026-11-12",
    ).status,
    "incomparable",
  );
  assert.equal(
    compareFacts(fact(100), fact(80, { period: "FY2025-Q2", rounded: true }))
      .status,
    "insufficient-precision",
  );
});
test("recorded values must be present in evidence and must use a valid record type", () => {
  assert.equal(
    quoteContainsNumber(
      "Illustrative revenue 1,200.50 and margin 21.0%",
      "1200.5",
    ),
    true,
  );
  assert.equal(quoteContainsNumber("Illustrative revenue 1,200", "200"), false);
  assert.equal(validateRecord("figure", fact(100), [doc]), null);
  assert.match(validateRecord("figure", fact(99), [doc]), /literally/);
  assert.match(validateRecord("unknown", fact(100), [doc]), /review/);
});
test("currency selection preserves legitimate alternatives without performing an FX conversion", () => {
  const a = fact(100),
    b = fact(80, { unit: "USD million" });
  assert.equal(
    resolveFact([a, b], { ticker: "TEST", currency: "INR" }, [doc]).fact.unit,
    "INR crore",
  );
  assert.equal(
    resolveFact([a, b], { ticker: "TEST" }, [doc]).status,
    "conflict",
  );
});
test("formatter preserves large decimal figures without binary-number precision loss", () => {
  assert.equal(
    displayNumber("999999999999999999", "INR crore"),
    "9,99,99,99,99,99,99,99,999.00",
  );
  assert.equal(displayNumber("-123456.7", "INR crore"), "-1,23,456.70");
  assert.equal(periodEnd("FY2027-Q2"), "2026-09-30");
  assert.equal(periodEnd("FY2027"), "2027-03-31");
  assert.equal(periodEnd("FY2026-Q5"), null);
});
test("all reviewed-cache values, range bounds, source hashes and page references are traceable", async () => {
  const c = JSON.parse(
    await readFile(
      new URL("../scripts/reviewed-evidence.json", import.meta.url),
      "utf8",
    ),
  );
  assert.equal(c.facts.length, 37);
  assert.equal(c.guidance.length, 8);
  for (const d of c.documents) {
    assert.match(d.sha256, /^[a-f0-9]{64}$/);
    assert.equal(d.id, d.sha256.slice(0, 16));
    for (const p of d.passages) assert.ok(p.page > 0 && p.page <= d.pageCount);
  }
  for (const [kind, records] of [
    ["figure", c.facts],
    ["guidance", c.guidance],
  ])
    for (const r of records)
      assert.equal(
        validateRecord(kind, r, c.documents, "2026-11-13"),
        null,
        r.id,
      );
  const result = assessGuidance(
    c.guidance.find(
      (g) => g.issuedPeriod === "FY2026-Q3" && g.metric === "revenue_cc_growth",
    ),
    c.facts,
    c.documents,
    "2026-11-13",
  );
  assert.equal(result.status, "within");
  assert.equal(result.value, "3.1");
});
import { passagesFor } from "../src/retrieval.mjs";
test("retrieval considers financial section metadata and prefers recent equally relevant evidence", () => {
  const documents = [
    {
      id: "old",
      title: "Annual report 2024",
      period: "2024",
      passages: [{ page: 1, text: "Operating margin discussion" }],
    },
    {
      id: "new",
      title: "Quarterly call",
      publishedAt: "2026-10-23",
      reportPeriod: "FY2027-Q2",
      passages: [
        { page: 4, text: "at 21%", section: "Quarterly operating margin" },
      ],
    },
  ];
  assert.equal(
    passagesFor(documents, "What did management say about margins?")[0].document
      .id,
    "new",
  );
  assert.equal(passagesFor(documents, "semiconductor capacity").length, 0);
});
test("impossible dates and post-result guidance cannot pass evidence review", () => {
  assert.equal(
    validateRecord(
      "guidance",
      { ...guide(), issuedAt: "2026-02-30" },
      [doc],
      "2026-11-13",
    ),
    "Guidance needs a valid range and a statement date before its target period ends.",
  );
  assert.equal(
    validateRecord(
      "guidance",
      { ...guide(), issuedAt: "2026-04-01" },
      [doc],
      "2026-11-13",
    ),
    "Guidance needs a valid range and a statement date before its target period ends.",
  );
});
import { displayChange } from "../src/finance.mjs";
test("long repeating calculated growth rates are formatted without reusing source-input limits", () => {
  const result = compareFacts(
    fact("5145"),
    fact("5082", { period: "FY2026-Q1" }),
    "qoq",
  );
  assert.equal(displayChange(result), "+1.24%");
  assert.equal(
    displayChange(
      compareFacts(fact("928"), fact("955", { period: "FY2026-Q1" }), "qoq"),
    ),
    "-2.83%",
  );
});
