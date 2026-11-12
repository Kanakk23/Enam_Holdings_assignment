import test from "node:test";
import assert from "node:assert/strict";
import {
  growth,
  overlaps,
  volumeRatio,
  validTicker,
  filterEvents,
  matchPeople,
  passagesFor,
  portfolio,
} from "../src/domain.mjs";
test("growth refuses zero, negative and missing bases", () => {
  assert.equal(growth(120, 100), 20);
  assert.equal(growth(0, 100), -100);
  assert.equal(growth(2, 0), null);
  assert.equal(growth(2, -1), null);
  assert.equal(growth(null, 10), null);
});
test("volume observation excluded from its baseline", () => {
  assert.equal(volumeRatio([...Array(20).fill(10), 40]), 4);
  assert.equal(volumeRatio(Array(20).fill(10)), null);
});
test("employment boundaries require date overlap", () => {
  assert.equal(
    overlaps({ start: 2010, end: 2015 }, { start: 2016, end: 2020 }),
    false,
  );
  assert.equal(
    overlaps({ start: 2010, end: 2015 }, { start: 2015, end: 2020 }),
    true,
  );
});
test("ticker rejects traversal, URLs and payloads", () => {
  for (const t of ["../../foo", "https://foo", "<script>", "INFY.NS", ""])
    assert.equal(validTicker(t), false);
  assert.equal(validTicker("M&M"), true);
});
test("date window and company filters preserve qualifying routine items", () => {
  const events = [
    { id: 1, ticker: "A", date: "2025-01-01", priority: "Routine" },
    { id: 2, ticker: "A", date: "2025-02-01", priority: "Review" },
  ];
  assert.deepEqual(
    filterEvents(events, { from: "2025-01-01", to: "2025-01-31" }).map(
      (e) => e.id,
    ),
    [1],
  );
});
test("matching does not claim acquaintance from overlap", () => {
  const matches = matchPeople("X", "Unknown", [
    {
      company: "X",
      sector: "Unknown",
      relationship: "Employment overlap only",
    },
  ]);
  assert.equal(matches[0].relationship, "Employment overlap only");
  assert.equal(
    matchPeople("Z", "Other", [{ company: "X", sector: "Unknown" }]).length,
    0,
  );
});
test("retrieval preserves source passage and page", () => {
  const d = {
    id: "a",
    passages: [
      { text: "revenue rose", page: 3 },
      { text: "cash flow", page: 4 },
    ],
  };
  const r = passagesFor([d], "cash");
  assert.equal(r[0].page, 4);
  assert.equal(r[0].document.id, "a");
});
test("portfolio meets brief size", () => assert.equal(portfolio.length, 18));
import { marketSignals } from "../src/domain.mjs";
test("configurable market thresholds retain their reason and exclude missing data", () => {
  const result = marketSignals(
    {
      A: { close: 100, change: -6, volumeRatio: 1, session: "2026-11-11" },
      B: { close: 20, change: 1, volumeRatio: 2.1 },
      C: { close: NaN, change: 90 },
    },
    { price: 5, volume: 2 },
  );
  assert.deepEqual(
    result.map((x) => x.ticker),
    ["A", "B"],
  );
  assert.match(result[0].reasons[0], /-6.00%/);
  assert.equal(
    marketSignals(
      { A: { close: 100, change: 6, volumeRatio: 1 } },
      { price: 7, volume: 2 },
    ).length,
    0,
  );
});
import { connectionFor, people } from "../src/domain.mjs";
test("inferred network paths require a known bridge, same employer and real date overlap", () => {
  for (const p of people) {
    const path = connectionFor(p);
    if (p.relationship === "Known demo contact") {
      assert.equal(path.kind, "known");
      assert.equal(path.path.length, 2);
    } else {
      assert.equal(path.kind, "inferred");
      assert.equal(path.bridge.company, p.company);
      assert.ok(path.overlap.start <= path.overlap.end);
      assert.equal(path.path.length, 3);
    }
  }
  const p = {
    name: "Candidate",
    company: "A",
    start: 2022,
    end: 2024,
    relationship: "Employment overlap only",
  };
  assert.equal(
    connectionFor(p, [
      {
        name: "Bridge",
        company: "A",
        start: 2016,
        end: 2018,
        relationship: "Known demo contact",
      },
    ]).kind,
    "unknown",
  );
});
test("rolling window respects exact timestamp and timezone rather than calendar date", () => {
  const since = Date.now() - 86400000;
  const events = [
    {
      id: "old",
      ticker: "X",
      date: new Date(since).toISOString().slice(0, 10),
      publishedAt: new Date(since - 60000).toISOString(),
      priority: "Review",
    },
    {
      id: "new",
      ticker: "X",
      date: new Date().toISOString().slice(0, 10),
      publishedAt: new Date(since + 60000).toISOString(),
      priority: "Routine",
    },
  ];
  assert.deepEqual(
    filterEvents(events, { since }).map((x) => x.id),
    ["new"],
  );
});
