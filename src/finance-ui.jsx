import React, { useState } from "react";
import { ArrowUpRight, Check, FileText } from "lucide-react";
import {
  metrics,
  units,
  accountingBases,
  percentageMetrics,
  number,
  accepted,
  canonical,
  sourceProof,
  sourcePassage,
  periodEnd,
  periodLabel,
  offsetPeriod,
  resolveFact,
  compareFacts,
  assessGuidance,
  displayNumber,
  displayChange,
  validateRecord,
} from "./finance.mjs";
function Source({ record, onSource, children }) {
  return (
    <button className="citation-button" onClick={() => onSource(record)}>
      {children || (
        <>
          Evidence · p. {record.page} <ArrowUpRight size={13} />
        </>
      )}
    </button>
  );
}
function Change({ current, prior, relation, onSource }) {
  const result =
    current.status === "ok" && prior.status === "ok"
      ? compareFacts(current.fact, prior.fact, relation)
      : { status: "missing", reason: prior.reason || current.reason };
  return (
    <details className="calculation">
      <summary>{displayChange(result)}</summary>
      <div>
        <p>
          {result.status === "ok"
            ? result.changeUnit === "pp"
              ? "Current minus prior percentage. Shown in percentage points."
              : "(Current ÷ prior − 1) × 100. Shown as percentage growth."
            : result.reason || "Comparable evidence is unavailable."}
        </p>
        {current.fact && (
          <Source record={current.fact} onSource={onSource}>
            Current · {periodLabel(current.fact.period)}
          </Source>
        )}
        {prior.fact && (
          <Source record={prior.fact} onSource={onSource}>
            Prior · {periodLabel(prior.fact.period)}
          </Source>
        )}
        {prior.status === "conflict" &&
          prior.facts.map((f) => (
            <Source key={f.id} record={f} onSource={onSource}>
              {f.value} {f.unit} · p. {f.page}
            </Source>
          ))}
      </div>
    </details>
  );
}
export function FinancialAnalysis({
  ticker,
  facts,
  guidance,
  documents,
  onSource,
  onRemove,
  context = {},
  onContext = () => {},
}) {
  const own = facts.filter(
    (f) => f.ticker === ticker && accepted(f) && sourceProof(f, documents),
  );
  const periods = [...new Set(own.map((f) => f.period))].sort(
    (a, b) => periodEnd(b).localeCompare(periodEnd(a)) || b.localeCompare(a),
  );
  const [selected, setPeriod] = useState(context.period || ""),
    [chosenAccounting, setAccounting] = useState(context.accounting || ""),
    [chosenBasis, setBasis] = useState(context.basis || "consolidated"),
    [chosenCurrency, setCurrency] = useState(context.currency || ""),
    [scope, setScope] = useState(context.scope || "reported"),
    [guidanceMetric, setGuidanceMetric] = useState(
      context.guidanceMetric || "revenue_cc_growth",
    );
  const remember = (field, value, setter) => {
    setter(value);
    onContext({ [field]: value });
  };
  const period = periods.includes(selected) ? selected : periods[0];
  const currentFacts = own.filter((f) => f.period === period);
  const accountings = [...new Set(currentFacts.map((f) => f.accounting))].sort(
    (a, b) =>
      currentFacts.filter((f) => f.accounting === b).length -
      currentFacts.filter((f) => f.accounting === a).length,
  );
  const accounting = accountings.includes(chosenAccounting)
    ? chosenAccounting
    : accountings[0];
  const bases = [
    ...new Set(
      currentFacts
        .filter((f) => f.accounting === accounting)
        .map((f) => f.basis),
    ),
  ];
  const basis = bases.includes(chosenBasis) ? chosenBasis : bases[0];
  const currencies = [
    ...new Set(
      currentFacts
        .filter(
          (f) =>
            f.accounting === accounting &&
            f.basis === basis &&
            !percentageMetrics.has(f.metric),
        )
        .map((f) => canonical(f).currency),
    ),
  ];
  const currency = currencies.includes(chosenCurrency)
    ? chosenCurrency
    : currencies[0];
  const lookup = (metric, p) =>
    resolveFact(
      facts,
      {
        ticker,
        metric,
        period: p,
        basis,
        accounting,
        scope: metric === "revenue_cc_growth" ? "constant_currency" : scope,
        ...(!percentageMetrics.has(metric) && currency ? { currency } : {}),
      },
      documents,
    );
  const rows = Object.keys(metrics).map((metric) => ({
    metric,
    current: lookup(metric, period),
  }));
  const ready = rows.filter((r) => r.current.status !== "missing");
  const gaps = rows.filter(
    (r) =>
      ["revenue", "ebitda", "pbt", "pat"].includes(r.metric) &&
      r.current.status === "missing",
  );
  const [ledgerMode, setLedgerMode] = useState(context.ledgerMode || "all");
  const ledgerAll = guidance
    .filter((g) => g.ticker === ticker && g.metric === guidanceMetric)
    .sort((a, b) => (b.issuedAt || "").localeCompare(a.issuedAt || ""));
  const ledger = ledgerAll
    .filter(
      (g) =>
        ledgerMode === "all" ||
        (ledgerMode === "completed"
          ? periodEnd(g.targetPeriod) <= new Date().toISOString().slice(0, 10)
          : periodEnd(g.targetPeriod) > new Date().toISOString().slice(0, 10)),
    )
    .slice(0, 4);
  const latest = ledgerAll[0],
    priorGuidance = ledgerAll.find(
      (g) =>
        g.id !== latest?.id &&
        g.targetPeriod === latest?.targetPeriod &&
        g.scope === latest?.scope &&
        g.accounting === latest?.accounting &&
        g.basis === latest?.basis &&
        g.unit === latest?.unit &&
        sourceProof(g, documents),
    );
  if (!own.length && !guidance.some((g) => g.ticker === ticker))
    return (
      <section className="financial-panel">
        <h3>Comparable actuals not established</h3>
        <p className="market-provenance">
          Automatic extraction accepts explicit period, units and basis only. Inspect a source passage to verify or add an actual.
        </p>
      </section>
    );
  return (
    <section
      className="financial-panel"
      aria-label="Source-checked financial analysis"
    >
      <div className="section-line">
        <h3>Reported performance</h3>
        <span className="label">Primary-source actuals</span>
      </div>
      {period && (
        <>
          <div className="analysis-controls">
            <label>
              Reporting period
              <select
                value={period}
                onChange={(e) => remember("period", e.target.value, setPeriod)}
              >
                {periods.map((p) => (
                  <option value={p} key={p}>
                    {periodLabel(p)}
                  </option>
                ))}
              </select>
            </label>
            {accountings.length > 1 && (
              <label>
                Statement basis
                <select
                  value={accounting}
                  onChange={(e) =>
                    remember("accounting", e.target.value, setAccounting)
                  }
                >
                  {accountings.map((a) => (
                    <option key={a}>{a}</option>
                  ))}
                </select>
              </label>
            )}
            {bases.length > 1 && (
              <label>
                Consolidation
                <select
                  value={basis}
                  onChange={(e) => remember("basis", e.target.value, setBasis)}
                >
                  {bases.map((b) => (
                    <option key={b}>{b}</option>
                  ))}
                </select>
              </label>
            )}
            {currencies.length > 1 && (
              <label>
                Currency
                <select
                  value={currency}
                  onChange={(e) =>
                    remember("currency", e.target.value, setCurrency)
                  }
                >
                  {currencies.map((c) => (
                    <option key={c}>{c}</option>
                  ))}
                </select>
              </label>
            )}
          </div>
          <div className="analysis-basis">
            <span>
              {accounting} · {basis} ·{" "}
              {scope === "reported" ? "Reported" : "Adjusted"}
              {currency ? " · " + currency : ""}
            </span>
            <button
              className="text-button"
              onClick={() =>
                remember(
                  "scope",
                  scope === "reported" ? "adjusted" : "reported",
                  setScope,
                )
              }
            >
              Show {scope === "reported" ? "adjusted" : "reported"}
            </button>
          </div>
          <table className="financial-table" role="table">
            <caption className="sr-only">
              {ticker} {periodLabel(period)} reported figures and calculated
              changes
            </caption>
            <thead>
              <tr>
                <th scope="col">Metric</th>
                <th scope="col">Reported</th>
                <th scope="col">QoQ</th>
                <th scope="col">YoY</th>
              </tr>
            </thead>
            <tbody>
              {ready.map(({ metric, current }) => (
                <tr key={metric}>
                  <th scope="row">
                    {metrics[metric]}
                    {metric === "pat" && <small>Total after-tax profit</small>}
                  </th>
                  <td className="current-figure">
                    {current.status === "conflict" ? (
                      <details>
                        <summary>Conflicting figures</summary>
                        {current.facts.map((f) => (
                          <Source key={f.id} record={f} onSource={onSource}>
                            {f.value} {f.unit}
                          </Source>
                        ))}
                      </details>
                    ) : (
                      <>
                        <strong>
                          {current.fact.rounded ? "≈ " : ""}
                          {displayNumber(current.fact.value, current.fact.unit)}
                        </strong>
                        {current.fact.unit !== "%" && (
                          <small>{current.fact.unit}</small>
                        )}
                        <Source record={current.fact} onSource={onSource} />
                      </>
                    )}
                  </td>
                  <td data-label="QoQ">
                    {period.includes("-Q") ? (
                      <Change
                        current={current}
                        prior={lookup(metric, offsetPeriod(period, -1))}
                        relation="qoq"
                        onSource={onSource}
                      />
                    ) : (
                      <span className="unverified">Annual</span>
                    )}
                  </td>
                  <td data-label="YoY">
                    <Change
                      current={current}
                      prior={lookup(
                        metric,
                        offsetPeriod(period, period.includes("-Q") ? -4 : -1),
                      )}
                      relation="yoy"
                      onSource={onSource}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {!ready.length && (
            <p className="notice">
              No reviewed {scope} figures are available on this basis. Change
              the adjustment view or reporting period.
            </p>
          )}
          {gaps.length > 0 && (
            <details className="coverage-gaps">
              <summary>{gaps.length} headline figures not verified</summary>
              <p>
                {gaps.map((r) => metrics[r.metric]).join(" · ")}. EBITDA is not
                inferred from operating profit. Figures on another statement or
                adjustment basis stay separate.
              </p>
            </details>
          )}
          <p className="analysis-note">
            Open a change to inspect its formula and sources. Margin and
            growth-rate changes use percentage points (pp). N/M marks a zero or
            negative comparison base; Rounded means source precision is
            insufficient. Currency conversion is not assumed.
          </p>
        </>
      )}
      <div className="guidance-ledger">
        {guidance.some(g=>g.ticker===ticker && ["within","above","below"].includes(assessGuidance(g,facts,documents).status)) && <button className="button secondary" onClick={()=>remember("ledgerMode","completed",setLedgerMode)}>Inspect completed commitments</button>}
        <label className="ledger-mode">
          View commitments
          <select
            aria-label="Guidance period status"
            value={ledgerMode}
            onChange={(e) =>
              remember("ledgerMode", e.target.value, setLedgerMode)
            }
          >
            <option value="all">All statements</option>
            <option value="open">Open targets</option>
            <option value="completed">Completed target periods</option>
          </select>
        </label>
        {latest && priorGuidance && sourceProof(latest, documents) && (
          <div className="guidance-revision">
            <h3>Latest guidance revision</h3>
            <p>
              For {periodLabel(latest.targetPeriod)}: {priorGuidance.lower}–
              {priorGuidance.upper} → {latest.lower}–{latest.upper}{" "}
              {latest.unit}. This compares explicit ranges on the same basis; it
              is not a delivery verdict.
            </p>
            <Source record={latest} onSource={onSource}>
              Latest statement
            </Source>
            <Source record={priorGuidance} onSource={onSource}>
              Previous statement
            </Source>
          </div>
        )}
        <div className="section-line">
          <h3>Guidance versus delivery</h3>
          <label className="sr-only" htmlFor="guidance-metric">
            Guidance metric
          </label>
          <select
            id="guidance-metric"
            value={guidanceMetric}
            onChange={(e) =>
              remember("guidanceMetric", e.target.value, setGuidanceMetric)
            }
          >
            <option value="revenue_cc_growth">Revenue growth · CC</option>
            <option value="operating_margin">Operating margin</option>
          </select>
        </div>
        <p className="market-provenance">
          The last four statements are assessed against their target periods. A
          quarterly result cannot settle a full-year commitment.
        </p>
        {ledger.length ? (
          ledger.map((g) => {
            const v = assessGuidance(g, facts, documents);
            return (
              <article className="guidance-row" key={g.id}>
                <div className="guidance-date">
                  <strong>{periodLabel(g.issuedPeriod)}</strong>
                  <small>{g.issuedAt}</small>
                </div>
                <div className="guidance-statement">
                  <span>For {periodLabel(g.targetPeriod)}</span>
                  <strong>
                    {g.lower}–{g.upper}
                    {g.unit === "%" ? "%" : " " + g.unit}
                  </strong>
                  <small>
                    {g.scope === "constant_currency"
                      ? "Constant currency"
                      : g.scope === "unspecified"
                        ? "Adjustment basis unspecified"
                        : g.scope === "adjusted"
                          ? "Adjusted"
                          : "Reported"}{" "}
                    · {g.accounting}
                  </small>
                  <Source record={g} onSource={onSource}>
                    Management statement <ArrowUpRight size={13} />
                  </Source>
                </div>
                <div className="guidance-result">
                  <span className={"verdict " + v.status}>{v.label}</span>
                  {v.actual ? (
                    <>
                      <strong>
                        {displayNumber(v.actual.value, v.actual.unit)}
                      </strong>
                      <Source record={v.actual} onSource={onSource}>
                        Management-reported actual <ArrowUpRight size={13} />
                      </Source>
                    </>
                  ) : (
                    <small>
                      {v.status === "not-due"
                        ? `Year ends ${periodEnd(g.targetPeriod)}`
                        : v.reason}
                    </small>
                  )}
                </div>
              </article>
            );
          })
        ) : (
          <p className="notice">
            No reviewed guidance is recorded for this metric. Record an explicit
            statement from an original transcript.
          </p>
        )}
      </div>
      {own.some((f) => f.review === "user_checked") && (
        <details className="coverage-gaps">
          <summary>Your reviewed figures</summary>
          {own
            .filter((f) => f.review === "user_checked")
            .map((f) => (
              <div className="reviewed-fact" key={f.id}>
                <span>
                  {metrics[f.metric]} · {periodLabel(f.period)} · {f.value}{" "}
                  {f.unit}
                </span>
                <button
                  className="text-button"
                  onClick={() => onRemove("figure", f.id)}
                >
                  Remove
                </button>
              </div>
            ))}
        </details>
      )}
      {guidance.some(
        (g) => g.ticker === ticker && g.review === "user_checked",
      ) && (
        <details className="coverage-gaps">
          <summary>Your reviewed guidance</summary>
          {guidance
            .filter((g) => g.ticker === ticker && g.review === "user_checked")
            .map((g) => (
              <div className="reviewed-fact" key={g.id}>
                <span>
                  {metrics[g.metric]} · {periodLabel(g.targetPeriod)} ·{" "}
                  {g.lower}–{g.upper}
                  {g.unit}
                </span>
                <button
                  className="text-button"
                  onClick={() => onRemove("guidance", g.id)}
                >
                  Remove
                </button>
              </div>
            ))}
        </details>
      )}
    </section>
  );
}
export function RecordEvidence({ document, passage, onSave }) {
  const [draft, setDraft] = useState({
    kind: "figure",
    metric: "revenue",
    value: "",
    lower: "",
    upper: "",
    unit: "INR crore",
    period: document.reportPeriod || "",
    basis: "consolidated",
    accounting:
      document.type === "Earnings-call transcript"
        ? "Issuer commentary"
        : "Ind AS",
    scope: "reported",
    issuedAt: document.publishedAt?.slice(0, 10) || "",
    checked: false,
  });
  const [message, setMessage] = useState("");
  const set = (key, value) => setDraft((d) => ({ ...d, [key]: value }));
  const percent = percentageMetrics.has(draft.metric);
  const metricChange = (metric) =>
    setDraft((d) => ({
      ...d,
      metric,
      unit: percentageMetrics.has(metric)
        ? "%"
        : d.unit === "%"
          ? "INR crore"
          : d.unit,
      scope:
        metric === "revenue_cc_growth"
          ? "constant_currency"
          : d.scope === "constant_currency"
            ? "reported"
            : d.scope,
    }));
  function submit(e) {
    e.preventDefault();
    if (!draft.checked) {
      setMessage(
        "Check the value and reporting basis in the original document first.",
      );
      return;
    }
    const record = {
      id: crypto.randomUUID(),
      ticker: document.ticker,
      metric: draft.metric,
      unit: percent ? "%" : draft.unit,
      basis: draft.basis,
      accounting: draft.accounting,
      scope:
        draft.metric === "revenue_cc_growth"
          ? "constant_currency"
          : draft.scope,
      documentId: document.id,
      page: passage.page,
      passageId: passage.id,
      review: "user_checked",
      reviewedAt: new Date().toISOString(),
      ...(draft.kind === "figure"
        ? { value: draft.value, period: draft.period }
        : {
            lower: draft.lower,
            upper: draft.upper,
            targetPeriod: draft.period,
            issuedPeriod: document.reportPeriod || "",
            issuedAt: draft.issuedAt,
            issueDateBasis: "User-checked statement date",
          }),
    };
    const error = validateRecord(draft.kind, record, [document]);
    if (error) {
      setMessage(error);
      return;
    }
    if (draft.kind === "figure") record.value = number(record.value).toString();
    else {
      record.lower = number(record.lower).toString();
      record.upper = number(record.upper).toString();
    }
    onSave(draft.kind, record);
    setMessage(
      "Saved in this browser. Return to research to inspect the comparison.",
    );
    set("checked", false);
  }
  return (
    <details className="record-evidence">
      <summary>
        <FileText size={16} /> Record a figure or guidance{" "}
        <ArrowUpRight size={15} />
      </summary>
      <form onSubmit={submit}>
        <h3>Keep the evidence attached</h3>
        <p>
          Record an explicitly stated figure after checking the original page
          and column headers. This comparison workspace uses a March financial
          year-end.
        </p>
        <div className="record-grid">
          <label>
            Record type
            <select
              value={draft.kind}
              onChange={(e) => set("kind", e.target.value)}
            >
              <option value="figure">Reported actual</option>
              <option value="guidance">Explicit guidance range</option>
            </select>
          </label>
          <label>
            Metric
            <select
              value={draft.metric}
              onChange={(e) => metricChange(e.target.value)}
            >
              {Object.entries(metrics).map(([key, label]) => (
                <option key={key} value={key}>
                  {label}
                </option>
              ))}
            </select>
          </label>
          {draft.kind === "figure" ? (
            <label>
              Literal value
              <input
                value={draft.value}
                onChange={(e) => set("value", e.target.value)}
                required
              />
            </label>
          ) : (
            <>
              <label>
                Range lower
                <input
                  value={draft.lower}
                  onChange={(e) => set("lower", e.target.value)}
                  required
                />
              </label>
              <label>
                Range upper
                <input
                  value={draft.upper}
                  onChange={(e) => set("upper", e.target.value)}
                  required
                />
              </label>
              <label>
                Statement date
                <input
                  type="date"
                  value={draft.issuedAt}
                  onChange={(e) => set("issuedAt", e.target.value)}
                  required
                />
              </label>
            </>
          )}
          <label>
            Units
            <select
              value={percent ? "%" : draft.unit}
              onChange={(e) => set("unit", e.target.value)}
              disabled={percent}
            >
              {Object.keys(units)
                .filter((u) => (percent ? u === "%" : u !== "%"))
                .map((u) => (
                  <option key={u}>{u}</option>
                ))}
            </select>
          </label>
          <label>
            {draft.kind === "guidance" ? "Target period" : "Reporting period"}
            <input
              value={draft.period}
              placeholder="FY2027-Q2 or FY2026"
              onChange={(e) => set("period", e.target.value.toUpperCase())}
              required
            />
          </label>
          <label>
            Consolidation
            <select
              value={draft.basis}
              onChange={(e) => set("basis", e.target.value)}
            >
              <option value="consolidated">Consolidated</option>
              <option value="standalone">Standalone</option>
            </select>
          </label>
          <label>
            Statement basis
            <select
              value={draft.accounting}
              onChange={(e) => set("accounting", e.target.value)}
            >
              {accountingBases.map((a) => (
                <option key={a}>{a}</option>
              ))}
            </select>
          </label>
          <label>
            Adjustment basis
            <select
              value={
                draft.metric === "revenue_cc_growth"
                  ? "constant_currency"
                  : draft.scope
              }
              disabled={draft.metric === "revenue_cc_growth"}
              onChange={(e) => set("scope", e.target.value)}
            >
              <option value="reported">Reported</option>
              <option value="adjusted">Adjusted</option>
              {draft.kind === "guidance" && (
                <option value="unspecified">Not specified in statement</option>
              )}
              <option value="constant_currency">Constant currency</option>
            </select>
          </label>
        </div>
        <label className="review-confirm">
          <input
            type="checkbox"
            checked={draft.checked}
            onChange={(e) => set("checked", e.target.checked)}
          />
          I checked the value, period, currency, consolidation and adjustment
          basis in the original document.
        </label>
        {message && (
          <p className="notice" role="status">
            {message}
          </p>
        )}
        <button className="button primary">
          <Check size={15} /> Save reviewed evidence
        </button>
      </form>
    </details>
  );
}
