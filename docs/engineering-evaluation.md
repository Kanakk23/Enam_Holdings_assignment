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
| `npm test` | 152 passing tests | Financial invariants, source restrictions, generic extraction, routing/cache isolation, failure handling and claim guards. Controlled responses are not live accuracy. |
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

The same twelve questions, five issuers and three fresh trials were retained across three revisions. Baseline Site source: `08a49cfcf86fd3e48257003c7837fa422fafbe57`; intermediate: `0311f67dcb8c71620c6be7ee09d62e263c3b96dd`; v3 application code: `1ef752a837909c2c0d443cba21ad3b61c1bad52b`. The targeted release closure described below changes a bounded routing/guard rule; its nine-trial results are separate from this full-suite score.

The plan and rubric are in `evals/live-experiment-plan.md` and `evals/live-review-rubric.md`. The two held-out transcript excerpts are identified originals; this benchmark does not perform blind ticker discovery, PDF downloads or PDF parsing. The HAVELLS missing-margin case is a zero-call retrieval-level abstention check. The arithmetic case checks zero-call handoff, not calculation accuracy.

<!-- LIVE_RESULTS_START -->
| Measure | Baseline v1 | Availability v2 | Safety v3 |
| --- | --- | --- | --- |
| Rubric-passing outcomes, including control routes | 18/36 | 24/36 | 24/36 |
| Displayed notes | 18 | 28 | 20 |
| Fully supported/scoped displayed notes | 15/18 | 18/28 | 18/20 |
| Cases passing all three trials | 5/12 | 6/12 | 6/12 |
| Endpoint median / p95 | 0.577s / 12.434s | 0.817s / 2.954s | 0.621s / 4.909s |
| Provider attempts / failures | 53 / 15 | 48 / 0 | 42 / 2 |

These are 108 actual full-suite trials, not 108 independent companies. Endpoint timings exclude retrieval, PDF work and the one-minute request spacing. All variants retained zero-call controls and fresh-engine cache misses.

| Case | Baseline passes | v2 passes | v3 passes |
| --- | --- | --- | --- |
| infy-margin | 0/3 | 3/3 | 3/3 |
| infy-guidance | 0/3 | 2/3 | 0/3 |
| infy-cash | 0/3 | 2/3 | 1/3 |
| infy-arithmetic | 3/3 | 3/3 | 3/3 |
| persistent-cash | 3/3 | 3/3 | 3/3 |
| persistent-cause | 2/3 | 0/3 | 0/3 |
| persistent-guidance | 0/3 | 1/3 | 2/3 |
| tataconsum-revenue | 3/3 | 3/3 | 3/3 |
| tataconsum-risk | 1/3 | 1/3 | 1/3 |
| tataconsum-missing | 0/3 | 0/3 | 2/3 |
| dabur-growth | 3/3 | 3/3 | 3/3 |
| havells-missing-margin | 3/3 | 3/3 | 3/3 |

The paired gate did not block v3 against baseline or v2. Against baseline the per-case mean delta was +0.1667, 95% CI [-0.1117, 0.445]; against v2 it was +0.0000, 95% CI [-0.2019, 0.2019]. These wide intervals and related cases do not establish broad improvement. No case was dropped or quarantined.

The v3 guard improved support among returned notes, but reduced availability and did not improve the overall rubric count over v2. Guidance and causal questions were often withheld. One returned cash sentence still asserted an unsupported movement. These are unresolved v3 failures, retained in the raw records rather than scored as successes.

A targeted release closure completed three affected questions, three trials each. It does not replace this full-suite table. Source commit `5bf44b6c97419336b38120fae7c69883a1b8e7f6` returned six notes, all six supported/scoped in coding-agent review: cash-conversion facts 3/3 and original causal quotations 3/3. Guidance synthesis remained withheld 0/3. The nine trials used twelve provider calls; each causal quotation used one small-model call. Cash coverage remains partial and does not fully explain the latest-quarter movement. See `evals/live-closure-{raw,review,summary}.json`. There is no fresh full-twelve-case score for this release closure.
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

The release closure also broadens the numeric guard to nonliteral multi-value directional language such as “fell to” and “down from”. A plain single-topic why question with exactly one explicit past-change explanation can use a small literal selection, preserving the original qualification instead of rewriting it as fact. Future, explicit-period, comparative and multi-source questions retain the analytical route. The generic rule is tested on an unseen issuer; only the Persistent cause case qualifies in this fixed twelve-case corpus.

These are generic constraints, not company-specific answers. Original sources and deterministic comparisons remain accessible when a generated note fails. The verifier remains fallible; these guards cover observed patterns rather than proving all financial language safe.

`node scripts/replay-live-guards.mjs evals/live-intermediate-raw.json` rechecks recorded displayed claims with final deterministic guards, making zero provider calls. Its output is explicitly an **offline replay**, not a fresh final-version generation benchmark.

## Efficiency and reliability

The default backend routes small literal selection to Groq GPT-OSS 20B, interpretation to GPT-OSS 120B with Gemini Flash recovery, and a separate small-model verification to the other available provider where possible. No writer retry is bought for invalid evidence. Models receive bounded original passages, not the whole repository or network. Whole-passage packing preserves reference IDs and excludes omitted evidence from validation; partial coverage is visible and cached only briefly.

Research permits three provider attempts in thirty seconds, with ten-second reasoning and seven-second selection/verification requests. Financial extraction has eighteen seconds. Cache/coalescing keys include source content, question, engine/prompt/configuration version, credentials and trusted user scope. Successful work lasts thirty minutes; partial coverage one minute. Model quota/authentication/timeouts cause bounded cooldowns. Arithmetic, annual-table extraction, source matching and network matching use zero LLM calls.

Fresh engine instances deliberately disable answer-cache reuse in the repeated benchmark; zero cache hits there are expected. Cache correctness and scope/invalidation are exercised separately in controlled tests. A final hosted repeated Infosys request recorded one extraction call followed by zero calls and one cache hit; `evals/hosted-cache-2026-11-15.json` retains that observation. It demonstrates one retained isolate, not global persistence. Per-isolate counters/caches are not a durable global provider quota coordinator.

The earlier v1/v2 traces retained Gemini candidate counts but not total/thought counts. Their recorded token figures are incomplete lower bounds, not complete cost or token-saving measurements. Failed/unreported usage is unknown, not zero. Final accounting uses the provider's reported total where valid; [Gemini's documented usage metadata](https://aistudio.google.com/api-reference/generate-content) includes prompt, thoughts and candidates. No paid-cost invoice or dollar savings are inferred.

Private traces retain route/stage/count/timing/usage/rejection metadata. Investor responses omit these details, credentials and provider setup. Network profiles do not enter prompts. The temporary fixed-case evaluation endpoint is owner-only and is disabled before external release; source code tests cover its disabled/unauthorized 404 behaviour.

## Investor demonstration and boundaries

The [three-minute phone demo](verification.md) connects an event, a compatible change, original evidence and a synthetic person. A typed DABUR query has recovered the issuer original and displayed automatic annual comparisons without manual figures. Source navigation preserved dates, units, selected values, period/basis and investigation context. These are responsive-layout/functional observations, not a physical-device or assistive-technology study.

Older changing-version hosted walkthroughs are retained in `evals/hosted-smoke-2026-11-14.json`; the repeated experiment above supersedes their status as the main model-quality evidence. The small suite still leaves broad OCR/table coverage, lexical retrieval recall, independent financial annotation, unattended refresh publication and durable multi-user storage unresolved.

See [release checklist](release-checklist.md) for evaluator access, required repository visibility and original AI-session sharing. A reconstructed build log does not satisfy the original-session requirement. The covering email is drafted; it has not been sent.


## Final release verification

Source `ebdcc5227a7730b6dfed0a6b82b500f225b6c6df` is deployed with environment revision 11. FINN hosting access was explicitly changed to public on 15 November 2026 (access revision 2); the owner also made the GitHub repository public, verified with an unauthenticated API request. Visitor-browser access has not been independently verified; the command-line client received HTTP 403/1010. Evaluation is disabled, owner-only evaluation identifiers are removed, and the production worker log records HTTP 404 for `/ops/evaluation`. Source navigation and preserved Back context were checked in the hosted investor interface. Filing refresh completed eighteen checks, while market refresh was unavailable for all eighteen; the interface now explicitly retains and dates prior closes. This is a recorded provider/source limitation, not a successful fresh-market update. Screenshots are in `docs/screenshots/`. See `evals/release-deployment-verification.json` for deployment and route-closure evidence.
