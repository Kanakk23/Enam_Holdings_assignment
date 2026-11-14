import React from "react";
import { findings, investigationQuestion, investigationBrief } from "./investigation.mjs";
import { periodLabel } from "./finance.mjs";
export function ResearchFinding({
  ticker,
  facts,
  documents,
  question,
  onSource,
  onPassage,
}) {
  const brief=investigationBrief(ticker,facts,documents,question);
  const rows=brief.rows;
  if (!rows.length) return null;
  return (
    <section className="research-finding" aria-label="Evidence-led findings">
      <h3>What changed</h3>
      <p className="subtle">
        {periodLabel(rows[0].period)} · Calculated from source-linked
        figures
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
      {brief.explanation && <div className="management-explanation"><h4>Management’s explanation</h4><blockquote>{brief.explanation.text}</blockquote><button className="text-button" onClick={()=>onPassage?.(brief.explanation)}>Check the passage · p. {brief.explanation.page}</button><p className="subtle">Management’s account, not independently established causality.</p></div>}
      <div className="next-question"><h4>Question to resolve</h4><p>{brief.question}</p></div>
      <p>
        These comparisons establish the movement, not its cause. Check
        management’s explanation and the accounting basis before drawing a
        conclusion.
      </p>
    </section>
  );
}
