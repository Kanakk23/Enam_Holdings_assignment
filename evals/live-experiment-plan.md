# Availability experiment

Baseline: deployed Site source `08a49cfcf86fd3e48257003c7837fa422fafbe57`, suite `live-12x3-v1`. Leave that deployment frozen until all 36 trial records have been downloaded.

Candidate: the same twelve case IDs, questions, source corpus and review rubric, each repeated three times under `live-12x3-v2`. The version change starts a distinct browser run; it does not remove or rename cases.

Proposed changes, motivated by the first completed baseline trial set:

1. Prefer the responsive Groq reasoning route, with the existing Gemini reasoning route retained as a fallback. A backend-only preference can explicitly select either order. No new models or paid services.
2. Fit reasoning inputs to the available provider reservation budget by retaining the largest prefix of complete original passages. Preserve reference IDs, never substitute generated summaries, warn on partial coverage, and cache partial coverage only briefly.
3. Reconcile reservations only against actual reported input/output token usage. Unknown usage remains reserved. This is quota accounting, not a dollar-cost claim.
4. Retain independently literal evidence selections when another proposed quotation fails validation. Invalid excerpts remain withheld; an entirely invalid selection still fails without buying another model call.
5. Route missing-evidence/comparison questions to reasoning. When a document period is unknown, forbid invented fiscal labels rather than suppressing a source-supported qualitative explanation.
6. Use a separate small verifier, normally on the other available provider, within the unchanged three-attempt and thirty-second investigation bounds. Do not retry an invalid analytical draft with another writer.

Primary observations: question usefulness, supported displayed claims, period/basis preservation, expected abstention, note availability, stage latency, calls, cache hits and reported tokens. Compare paired cases after averaging repetitions within each case. Retain all failed trials and the critical missing-margin case; do not quarantine it.

The two runs happen sequentially on external free services. Provider conditions are not randomized or controlled, and this bundles several related improvements. A difference cannot establish the isolated causal effect of one change. Five issuers and twelve related questions do not establish broad financial-research accuracy. Labels are coding-agent evidence review, not independent human annotation.

## Final safety revision (declared while v2 is still running)

Keep v2 deployed and unmodified until all 36 rows are saved. Its early outputs exposed annual guidance framed as quarterly, a backwards numeric cash-conversion movement, an unattributed causal sentence, and absence inferred from a local excerpt.

A third full run, `live-12x3-v3`, will use the same twelve case IDs/questions/source corpus and three fresh trials each. The final revision keeps the availability changes and adds:

- Explicit annual guidance horizons; model-written numeric movements defer to the existing deterministic comparison.
- Explicit management attribution for causal explanations.
- Absence claims restricted to retrieved evidence, with the verifier receiving all supplied context when absence is asserted. Other context can invalidate a claim, not replace its cited support.
- Gemini quota accounting from reported total tokens, including thoughts; incomplete accounting does not authorize a refund.

The writer and verifier prompts state those boundaries. The small synthetic claim-scope suite and zero-call replay of recorded outputs test the new deterministic guards separately. They must not be described as fresh live synthesis.

Retain all three full runs. Compare final against both the original baseline and intermediate v2, with the original question-usefulness rubric and unchanged critical missing-margin case. This is a sequence of related engineering revisions under uncontrolled external service conditions, not a randomized experiment or a model leaderboard. Any fresh failures remain in the record.
