# Verification and phone demo

This file describes the current release. The [engineering evaluation](engineering-evaluation.md) contains results, raw evidence links and limits; [build history](build-history.md) records earlier implementation stages. Historical Git versions preserve the earlier checks.

## Reproduce

```sh
npm ci
npm test
npm run build
node scripts/verify-build.mjs
node scripts/verify-finance-render.mjs
node scripts/verify-model-render.mjs
node scripts/evaluate-primary-tables.mjs
node scripts/evaluate-answer-periods.mjs
python scripts/check-release-secrets.py
```

| Check | What it establishes | What it does not establish |
| --- | --- | --- |
| 152 automated tests | Financial comparability, generated arithmetic properties, source restrictions, retrieval, network paths, model routing, cache isolation, failure recovery and claim guards | Broad financial-research accuracy |
| Built-Worker smoke | Self-contained assets and ESM dependencies; real bundled financial/research endpoints; input rejection and private evaluation authorization | Hosting access for a non-owner |
| Investor bundle/render checks | Source-reference controls remain; provider names, keys, setup controls and endpoints are absent from investor scripts | An exhaustive accessibility audit |
| Two held-out annual statement layouts | Twelve checked values, six changes, rejection of twelve corrupt-input cases; 72/72 repeated contract checks, zero LLM calls | OCR, arbitrary tables, all NSE issuers or current V-Guard coverage |
| Answer-contract regressions | 48/48 checks on sixteen synthetic scope/number/period cases repeated three times | A live synthesis or verifier-accuracy score |
| Repeated hosted model experiment | Same twelve questions across five issuers, three fresh trials per variant; real responses, failures, timing and usage retained | Blind source discovery, independent human grading, all-company accuracy or verifier recall |
| Release pattern scan | Redacted checks of source/history and current client outputs; no matched credential patterns | A security certification or a guarantee that every kind of secret is absent |

Three full runs (108 trials) and a separate nine-trial closure are retained. The closure yielded six supported/scoped notes; three guidance answers remained withheld. This is not a new full-suite accuracy score.

The hosted experiment's final review and aggregation are in `evals/live-*-review.json`, `evals/live-*-summary.json` and the engineering report. Do not substitute fixture pass rates for those live findings.

## Observed browser behaviour

Desktop and 390 CSS-pixel phone layouts have been walked through using the actual app. Evidence opens at the selected passage/value, returning preserves company/period/basis and the originating event, and synthetic contact preparation carries the investigation question. A typed DABUR query recovered an original annual statement and displayed source-linked revenue/PBT/PAT comparisons without manual figures. This is functional responsive-layout QA, not a physical iPhone/Android test.

Earlier issuer checks also discovered originals for HCLTECH, indexed an issuer-hosted Coforge transcript through PDF.js, and surfaced publisher failures for inaccessible sources. Failures retain the original links and recovery controls. A directory link is not itself financial evidence.

Owner-authenticated hosted model trials supplement these interface checks. Provider success is not automatically a correct answer. The raw outputs and evidence-reviewed labels retain both unsupported outputs and safe-but-unhelpful withholding.

## Three-minute phone demo

1. **0:00–0:30:** Open Brief. Identify a leading event, its date and priority reason. Show that routine items stay available in the archive.
2. **0:30–1:10:** Open the connected company investigation. Inspect a compatible current/prior change, its deterministic formula and management's attributed explanation. Keep an open full-year target open.
3. **1:10–1:35:** Tap a source. Verify the original quotation/value, page, reporting period and units. Return with context preserved.
4. **1:35–2:00:** Open a suggested synthetic contact. Explain its question-specific relevance, dated experience, known relationship or inferred employment overlap, and limits.
5. **2:00–2:40:** Enter DABUR without manually entering figures. Use the discovered original and supported annual columns. If the publisher is unavailable, show the labelled cached/held-out extraction record and state that limitation.
6. **2:40–3:00:** Show the engineering evaluation, including one rejection/failure and repeated live results. Distinguish the zero-call extraction checks from model quality.

## Acceptance boundaries

| Workflow | Observable result | Deliberate limit |
| --- | --- | --- |
| Push | Filters affect records; leading items explain priority; routine archive remains; review state persists | Bounded directory sample, no exhaustive exchange feed or background push delivery |
| EOD signal | Threshold changes affect signals; observation is excluded from the twenty-session volume baseline; actual session shown | Last complete session, no intraday trading feed |
| Pull | Primary evidence, supported automatic actuals and compatible comparisons; original sources stay usable if analysis fails | Lexical retrieval and bounded text-PDF/table support; incomplete evidence is explicit |
| Unseen ticker | Same generic discovery, issuer recovery, PDF indexing and financial validation | Source must be accessible and text-readable; no ticker-specific answer fallback |
| Network | Embedded and direct search, question/role/date relevance, known versus inferred paths | Clearly synthetic; overlap does not establish acquaintance or current inside knowledge |
| AI | Small selection, selective stronger reasoning, separate verification, bounded recovery, caching and backend-only keys | Verifier remains fallible; generated numerical comparisons defer to deterministic calculations |
| Submission | Reproducible private source/build/evaluation and prepared covering note | Public repository/demo access and original-session sharing require the owner's access decision |

No physical-device study, assistive-technology user study, exhaustive accessibility certification, global quota scheduler or production multi-tenant assessment was performed.
