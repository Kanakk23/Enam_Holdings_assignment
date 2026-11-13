import React from "react";

export function ModelAnswer({ research, onSource }) {
  return <section className="model-answer" aria-labelledby="model-answer-title">
    <div className="section-line"><h3 id="model-answer-title">Research note</h3><span className="label">{research.answerKind === "selected-evidence" ? "SOURCE EXTRACTS" : "SOURCE-BASED ANALYSIS"}</span></div>
    <p className="subtle">{research.answerKind === "selected-evidence" ? "Selected directly from the original passages." : "Generated from the cited primary documents."} Check the cited originals before relying on a claim.</p>
    <div className="answer">{research.answer.split(/(\[\d+\])/g).map((text, i) => {
      const ref = /^\[(\d+)\]$/.exec(text);
      const passage = ref && research.passages[Number(ref[1]) - 1];
      return passage ? <button key={i} className="inline-citation" onClick={() => onSource(passage)} aria-label={`Open source passage ${ref[1]}`}>{text}</button> : <React.Fragment key={i}>{text}</React.Fragment>;
    })}</div>
  </section>;
}
