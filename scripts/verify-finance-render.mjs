import { createServer } from "vite";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { readFile } from "node:fs/promises";
import assert from "node:assert/strict";
// Server rendering checks data presentation only. This is not browser or visual QA.
const server = await createServer({
  configFile: false,
  optimizeDeps: { noDiscovery: true, include: [] },
  server: { middlewareMode: true },
  appType: "custom",
});
try {
  const { FinancialAnalysis, RecordEvidence } = await server.ssrLoadModule(
    "/src/finance-ui.jsx",
  );
  const seed = JSON.parse(await readFile("public/data/seed.json", "utf8"));
  const props = {
    ticker: "INFY",
    facts: seed.facts,
    guidance: seed.guidance,
    documents: seed.documents,
    onSource: () => {},
    onRemove: () => {},
  };
  const latest = renderToStaticMarkup(
    React.createElement(FinancialAnalysis, props),
  );
  assert.match(latest, /5,145.00/);
  assert.match(latest, /\+1.24%/);
  assert.match(latest, /-0.10 pp/);
  assert.match(latest, /Within range/);
  assert.match(latest, /Target period still open/);
  assert.match(latest, /3.1%/);
  const annual = renderToStaticMarkup(
    React.createElement(FinancialAnalysis, {
      ...props,
      context: { period: "FY2026", accounting: "Ind AS" },
    }),
  );
  for (const value of ["1,78,650.00", "39,995.00", "29,474.00"])
    assert.ok(annual.includes(value));
  assert.match(annual, /Total after-tax profit/);
  const adjusted = renderToStaticMarkup(
    React.createElement(FinancialAnalysis, {
      ...props,
      context: { period: "FY2026-Q4", scope: "adjusted" },
    }),
  );
  assert.match(adjusted, /-0.30 pp/);
  const unseen = renderToStaticMarkup(
    React.createElement(FinancialAnalysis, { ...props, ticker: "UNSEEN" }),
  );
  assert.match(unseen, /Build a financial comparison/);
  assert.doesNotMatch(unseen, /Within range/);
  const d = seed.documents.find((d) => d.reportPeriod === "FY2027-Q2");
  const form = renderToStaticMarkup(
    React.createElement(RecordEvidence, {
      document: d,
      passage: d.passages[0],
      onSave: () => {},
    }),
  );
  assert.match(form, /Save reviewed evidence/);
  assert.match(form, /March/);
  assert.match(form, /Issuer commentary/);
  console.log(
    "Server-rendered finance checks passed: quarterly arithmetic, annual totals, adjusted comparison, guidance states, unseen company and evidence form. Visual verification remains separate.",
  );
} finally {
  await server.close();
}
