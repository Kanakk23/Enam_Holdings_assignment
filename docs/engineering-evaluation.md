# FINN engineering evaluation

FINN separates source-linked arithmetic, extraction quality and live-model quality. Passing deterministic checks is not a live AI accuracy score.

## Current implementation

| Capability | Behaviour | Boundary |
| --- | --- | --- |
| Primary-source discovery | Locate original annual reports/raw call transcripts through a directory, then crawl the issuer website for permitted originals. | Directory prose is never financial evidence. Eight issuer pages, four waves, a 42-second recovery budget and an hour of cached links. Dynamic websites can return no usable links. |
| PDF indexing | PDF.js extracts exact passages and uses text coordinates to preserve annual-statement columns. Adjacent small-cap/font fragments are joined by their physical spacing. | Text PDFs only; 25 MB and 300 pages. Older browser indexes are invalidated after parser changes. Scanned pages require OCR and remain unsupported. |
| Automatic actuals | Extract explicit prose plus aligned annual profit-and-loss rows for revenue, PBT and group PAT. Keep value, units, period, consolidation, page, quotation and header evidence. | Table support requires two or three explicit 31 March columns, explicit INR units, one consolidation basis, and an unambiguous row. Restated/adjusted/segment layouts abstain. Framework is labelled unspecified when it is not extracted. |
| Arithmetic | Decimal calculations compare compatible periods, units, basis and scope. INR lakh/crore/million conversions are deterministic. | No currency conversion or invented missing inputs; PAT is the total group result, not silently the parent-attributable result. |
| Research | Simple questions select literal evidence. Analytical questions use a reasoning model followed by a separate small-model claim check. | The verifier checks entailment, direction, period, subject, negation, certainty and forecast versus actual. Model verification is fallible; live quality must be measured. |
| Connected investigation | Preserve the originating event, show a verified change, expose management's stated explanation, formulate a question and carry it into contact preparation. | Management's explanation is an attributed passage, not independently proven causality. Filing terms remain in the original announcement; Pull uses only annual reports/raw transcripts. |
| Network | Known versus inferred relationships, overlap dates, role-specific expertise, dated experience and question-specific prompts. | Profiles are synthetic. An unfamiliar issuer can produce explicitly labelled functional matches; company/sector fit is not fabricated. |

Issuer recovery prefers a compact consolidated statement where available. One original containing a usable comparison is sufficient to continue; the investor does not wait for a second large download. Redirects share an 18-second download deadline. Unsupported documents remain available externally.

## Automated and real-document checks

| Evidence | Observed result | Scope |
| --- | --- | --- |
| `npm test` | 150 passing tests | Financial invariants, source restrictions, generic extraction, routing/cache isolation, failure handling and claim guards. Controlled responses are not live accuracy. |
| Built-Worker smoke | Pass | Bundled assets/dependencies, real financial/research endpoints, malformed requests, client-key rejection, private evaluation authorization and 404. |
| Investor/render checks | Pass | Source controls and financial presentation; no secret/provider configuration in investor scripts. Browser/physical-device checks are separate. |
| Two held-out annual statement layouts | 72/72 repeated contract checks, zero model calls | Twelve checked facts and twelve corrupt-input cases, each three times; six compatible annual changes. |
| Synthetic answer-period contract | 48/48, versus frozen previous validator 33/48 | Sixteen correlated cases, three times; not synthesis or verifier accuracy. |
| Synthetic final claim-scope contract | 27/27, versus frozen intermediate validator 15/27 | Nine small product-boundary cases, three times; not live generation. |

Reproduce:

```sh
npm test
npm run build
node scripts/verify-build.mjs
node scripts/verify-finance-render.mjs
node scripts/verify-model-render.mjs
node scripts/evaluate-primary-tables.mjs
node scripts/evaluate-answer-periods.mjs
node scripts/evaluate-claim-scope.mjs
python scripts/check-release-secrets.py
```

No DABUR or VGUARD financial answers are in the production seed. `evals/annual-table-cases.json` retains original URLs, PDF hashes, coordinate-preserving text, physical/printed pages and manually checked expected values.

| Original | Physical page | Printed page | Periods and figures |
| --- | --- | --- | --- |
| Dabur consolidated financial-statements component of its 2025–26 annual report | 12 | 411 | FY2026 / FY2025 revenue, PBT and group PAT |
| V-Guard annual report 2023–24 | 259 | 257 | FY2024 / FY2023 revenue, PBT and group PAT |

V-Guard is an explicitly historical source, demonstrating a second layout/industry rather than current 2026 coverage. The previous prose-only validator passed 36/72 by abstaining on every table, including positive cases. The candidate's twelve values and six changes match the checked originals. Millisecond local processing timings exclude download and PDF parsing. Two documents with correlated values do not establish all-company coverage.

## Repeated hosted model experiment

The same twelve questions, five issuers and three fresh trials were retained across three revisions. Baseline Site source: `08a49cfcf86fd3e48257003c7837fa422fafbe57`; intermediate: `0311f67dcb8c71620c6be7ee09d62e263c3b96dd`; final application code: `1ef752a837909c2c0d443cba21ad3b61c1bad52b`. Later release commits may change documentation/evaluation artifacts while preserving this measured application code.

The plan and rubric are in `evals/live-experiment-plan.md` and `evals/live-review-rubric.md`. The two held-out transcript excerpts are identified originals; this benchmark does not perform blind ticker discovery, PDF downloads or PDF parsing. The HAVELLS missing-margin case is a zero-call retrieval-level abstention check. The arithmetic case checks zero-call handoff, not calculation accuracy.

<!-- LIVE_RESULTS_START -->
Final v3 run is in progress. Completed baseline and intermediate raw results/reviews are retained; the final table is filled only after all final trials and evidence reviews finish.
<!-- LIVE_RESULTS_END -->

“Fully supported displayed notes” requires all material claims and their financial scope/attribution to meet the rubric. A valid citation or a returned note alone does not pass. Safe generic withholding on an answerable case is a usefulness failure. A specific, accurate explanation of missing supplied evidence can pass as appropriate abstention. The baseline risk-case utility label was corrected on consistency review; that amendment and its reason are retained in its review file.

Labels are **coding-agent evidence review, not independent human annotation**. Another reviewer can inspect the complete answers and supplied evidence. There is no verifier-recall estimate because rejected drafts are not retained. Repetitions are averaged within each case for paired comparisons; they are not thirty-six independent companies. All failures and the critical missing-margin case remain; nothing was quarantined.

The runs are sequential on external free services, under uncontrolled quota/availability conditions, and bundle several related changes. They cannot isolate the causal effect of one policy or establish a general model ranking. Twelve related questions across five issuers are a small sample. A gate that does not block regression is not proof of general reliability.

## What the failures changed

| Observed failure | Final behaviour and tradeoff |
| --- | --- |
| Gemini reasoning timed out, returned 503/429, and consumed fallback reservations | Prefer responsive Groq reasoning; retain the existing alternative, bounded attempts and cooldowns. This improves availability without adding providers. |
| One invalid proposed quotation erased valid selections | Validate selections independently. Return original literal bytes and a partial warning; an entirely invalid selection still withholds. |
| Annual guidance announced at Q1/Q2 was framed as a quarterly target | Require an explicit annual horizon when annual evidence and a quarterly call are mentioned together. Conservative rejection can remove otherwise understandable wording. |
| A cash sentence called 111% a decline after 106% and mixed a quarter with a full-year aggregate | Generated numerical movements defer to the deterministic comparison. Models can describe period-specific facts; they do not compute or narrate cross-period arithmetic. |
| A management explanation was asserted as proven causality, with attribution attached only to the forecast | Require explicit attribution on the causal explanation itself; source-specific explanations stay separate. |
| Absence from one excerpt became absence from an entire transcript; another retrieved passage contradicted a missing-value claim | Scope absence to supplied evidence. Its independent verifier also receives the other retrieved context, which can invalidate a claim but cannot replace cited support. |
| Gemini accounting recorded visible candidate tokens without total/thought usage | Use complete reported total usage, including thoughts, for reconciliation. Incomplete/unknown usage keeps its reservation. Earlier traces are labelled incomplete lower bounds. |

These are generic constraints, not company-specific answers. Original sources and deterministic comparisons remain accessible when a generated note fails. The verifier remains fallible; these guards cover observed patterns rather than proving all financial language safe.

`node scripts/replay-live-guards.mjs evals/live-intermediate-raw.json` rechecks recorded displayed claims with final deterministic guards, making zero provider calls. Its output is explicitly an **offline replay**, not a fresh final-version generation benchmark.

## Efficiency and reliability

The default backend routes small literal selection to Groq GPT-OSS 20B, interpretation to GPT-OSS 120B with Gemini Flash recovery, and a separate small-model verification to the other available provider where possible. No writer retry is bought for invalid evidence. Models receive bounded original passages, not the whole repository or network. Whole-passage packing preserves reference IDs and excludes omitted evidence from validation; partial coverage is visible and cached only briefly.

Research permits three provider attempts in thirty seconds, with ten-second reasoning and seven-second selection/verification requests. Financial extraction has eighteen seconds. Cache/coalescing keys include source content, question, engine/prompt/configuration version, credentials and trusted user scope. Successful work lasts thirty minutes; partial coverage one minute. Model quota/authentication/timeouts cause bounded cooldowns. Arithmetic, annual-table extraction, source matching and network matching use zero LLM calls.

Fresh engine instances deliberately disable answer-cache reuse in the repeated benchmark; zero cache hits there are expected. Cache correctness and scope/invalidation are exercised separately in controlled tests. Per-isolate counters/caches are not a durable global provider quota coordinator.

The earlier v1/v2 traces retained Gemini candidate counts but not total/thought counts. Their recorded token figures are incomplete lower bounds, not complete cost or token-saving measurements. Failed/unreported usage is unknown, not zero. Final accounting uses the provider's reported total where valid; [Gemini's documented usage metadata](https://aistudio.google.com/api-reference/generate-content) includes prompt, thoughts and candidates. No paid-cost invoice or dollar savings are inferred.

Private traces retain route/stage/count/timing/usage/rejection metadata. Investor responses omit these details, credentials and provider setup. Network profiles do not enter prompts. The temporary fixed-case evaluation endpoint is owner-only and is disabled before external release; source code tests cover its disabled/unauthorized 404 behaviour.

## Investor demonstration and boundaries

The [three-minute phone demo](verification.md) connects an event, a compatible change, original evidence and a synthetic person. A typed DABUR query has recovered the issuer original and displayed automatic annual comparisons without manual figures. Source navigation preserved dates, units, selected values, period/basis and investigation context. These are responsive-layout/functional observations, not a physical-device or assistive-technology study.

Older changing-version hosted walkthroughs are retained in `evals/hosted-smoke-2026-11-14.json`; the repeated experiment above supersedes their status as the main model-quality evidence. The small suite still leaves broad OCR/table coverage, lexical retrieval recall, independent financial annotation, unattended refresh publication and durable multi-user storage unresolved.

See [release checklist](release-checklist.md) for evaluator access, required repository visibility and original AI-session sharing. A reconstructed build log does not satisfy the original-session requirement. The covering email is drafted; it has not been sent.
