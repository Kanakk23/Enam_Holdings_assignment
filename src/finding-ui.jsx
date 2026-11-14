import React from "react";
import { findings, investigationQuestion } from "./investigation.mjs";
import { periodLabel } from "./finance.mjs";
export function ResearchFinding({
  ticker,
  facts,
  documents,
  question,
  onSource,
}) {
  const rows = findings(ticker, facts, documents, question);
  if (!rows.length) return null;
  return (
    <section className="research-finding" aria-label="Evidence-led findings">
      <h3>What changed</h3>
      <p className="subtle">
        {periodLabel(rows[0].period)} · Calculated from reviewed primary
        evidence
      </p>
      <ul>
        {rows.map((r) => (
          <li key={r.metric}>
            <strong>{r.text}</strong>
            <div>
              <button onClick={() => onSource(r.current)}>
                Current source · p. {r.current.page}
              </button>
              <button onClick={() => onSource(r.prior)}>
                Prior source · p. {r.prior.page}
              </button>
            </div>
          </li>
        ))}
      </ul>
      <div className="next-question"><h4>Question to resolve</h4><p>{investigationQuestion(question)}</p></div>
      <p>
        These comparisons establish the movement, not its cause. Check
        management’s explanation and the accounting basis before drawing a
        conclusion.
      </p>
    </section>
  );
}
