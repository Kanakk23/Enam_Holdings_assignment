import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  findings,
  networkMatches,
  conversationPrompts,
} from "../src/investigation.mjs";
import { people, matchPeople } from "../src/domain.mjs";
import { refreshTicker } from "../server/sources.mjs";
const seed = JSON.parse(readFileSync("public/data/seed.json"));
test("findings answer a margins/cash question with comparable evidence pairs", () => {
  const f = findings(
    "INFY",
    seed.facts,
    seed.documents,
    "margins cash conversion",
  );
  assert.deepEqual(
    f.map((x) => x.metric),
    ["operating_margin", "free_cash_flow", "fcf_conversion"],
  );
  assert.match(f[0].text, /-0.10 pp/);
  assert.match(f[1].text, /-2.83%/);
  assert.ok(f.every((x) => x.current.documentId && x.prior.documentId));
});
test("conflicting figures are excluded from the findings and unseen tickers have no invented answer", () => {
  const f = seed.facts.find(
    (f) => f.metric === "operating_margin" && f.period === "FY2027-Q2",
  );
  const bad = { ...f, id: "conflict", value: "22" };
  const docs = structuredClone(seed.documents);
  const doc = docs.find((d) => d.id === f.documentId);
  doc.passages.find((p) => p.id === f.passageId).text += " 22";
  assert.ok(
    !findings("INFY", [...seed.facts, bad], docs, "margins").some(
      (r) => r.metric === "operating_margin",
    ),
  );
  assert.deepEqual(findings("UNSEEN", seed.facts, seed.documents), []);
});
test("natural network question matches technology finance expertise and preserves relationship type", () => {
  const hits = networkMatches("Who can help me understand IT margins?", people);
  assert.ok(
    hits.some((p) => p.sector === "Technology" && /Finance/.test(p.role)),
  );
  assert.equal(networkMatches("Mira Shah", people)[0].name, "Mira Shah");
  assert.equal(
    networkMatches("Mira Shah", people)[0].relationship,
    "Employment overlap only",
  );
  assert.equal(
    matchPeople("INFY", "Technology", people, "cash conversion")[0].role,
    "Finance controller",
  );
  assert.notDeepEqual(
    conversationPrompts("cash conversion"),
    conversationPrompts("customer demand"),
  );
});
test("source page context contains the literal reviewed excerpt and surrounding explanation", () => {
  const d = seed.documents.find((d) => d.title.includes("FY2027 Q2"));
  const p = d.passages.find((p) => p.id === "q2-revenue");
  assert.ok(p.context.length > 1000);
  assert.match(p.context, /5,145/);
});
test("refresh preserves independent source failures instead of substituting zero market prices", async () => {
  const original = global.fetch;
  global.fetch = async () => new Response("Unavailable", { status: 503 });
  try {
    const r = await refreshTicker("TESTREFRESH");
    assert.equal(r.market, null);
    assert.equal(r.filings, null);
    assert.equal(r.errors.length, 2);
  } finally {
    global.fetch = original;
  }
});
test("refresh calculates EOD signal from prior sessions and parses dated original filing links", async () => {
  const original = global.fetch;
  const ts = Array.from({ length: 25 }, (_, i) => 1577836800 + i * 86400),
    close = ts.map((_, i) => 100 + i),
    volume = ts.map((_, i) => (i === 24 ? 40 : 10));
  global.fetch = async (url) =>
    String(url).includes("finance.yahoo")
      ? Response.json({
          chart: {
            result: [
              {
                timestamp: ts,
                indicators: {
                  adjclose: [{ adjclose: close }],
                  quote: [{ volume }],
                },
              },
            ],
          },
        })
      : new Response(
          '<div id="company-announcements-tab"><li><a href="https://www.bseindia.com/file.pdf">Earnings transcript</a><time datetime="2026-11-12T10:00:00Z"></time></li></div>',
        );
  try {
    const r = await refreshTicker("REFRESHFIXTURE");
    assert.equal(r.errors.length, 0);
    assert.equal(r.market.volumeRatio, 4);
    assert.equal(r.market.close, 124);
    assert.equal(r.filings.length, 1);
    assert.equal(r.filings[0].priority, "Review");
  } finally {
    global.fetch = original;
  }
});
test("topic relevance alone cannot invent sector relevance for an unseen company", () => {
  assert.deepEqual(
    matchPeople("UNSEEN", "Unknown", people, "margins and cash conversion"),
    [],
  );
});
