# Backend model routing

FINN spends model calls on evidence selection and interpretation. It calculates financial changes and matches network experience in code. Provider configuration and credentials are server concerns; the investor sees findings, citations and incomplete-result warnings.

## Tasks

| Task | Preferred route | Recovery | Reason |
| --- | --- | --- | --- |
| Literal evidence selection | Groq GPT-OSS 20B | Gemini Flash-Lite | A small structured selection with mechanically checked quotations needs no rewriting pass. |
| Interpretation across sources | Groq GPT-OSS 120B | Gemini Flash | Prefer the route that responded during the live availability experiment. This is not a claim that it is universally the better model. |
| Analytical claim verification | Separate small model, normally on the other available provider | Other configured small verifier within the same attempt budget | Check complete claims for support, period, subject, basis, certainty and attribution before display. |
| Annual statement/prose actuals | Deterministic validated parsing first | Bounded structured extraction when configured | Values still need original quotation, period, units, consolidation and unambiguous basis. |
| Arithmetic, event ranking and network matching | Deterministic code | Explain unavailable/incomparable inputs | No generated figures, invented relationship paths or model arithmetic. |

`server/models.mjs` pins the allowlist. The current defaults are GPT-OSS 20B/120B and Gemini 3.5 Flash-Lite/3.8 Flash. The backend-only `AI_REASON_PRIMARY` can explicitly select `groq` or `gemini`; its default is Groq. No model search, browsing, URL-context, execution or agent tools are enabled. Models receive low/minimal reasoning settings appropriate to their task and bounded output caps. No paid-only fallback is selected.

Provider model availability and free allowances can change. The live traces establish which routes actually answered on 14–15 November 2026; they do not establish a general model ranking. Earlier documentation chose Gemini first. The repeated baseline exposed timeouts, 503s and 429s; the experiment preserves those failures rather than discarding them.

## Evidence and execution

1. Validate ticker, question and bounded primary-document inputs. Reject client keys, provider instructions and arbitrary remote document addresses.
2. Explicit arithmetic questions route to the financial comparison, with zero model calls. Other questions retrieve at most eight analytical or four extraction passages from annual reports and raw transcripts.
3. Keep original page text around the relevant passage, remove duplicate source/page contexts and retain reference IDs. Extraction uses at most 1,800 characters per passage; analytical context uses 1,200. Table metadata is not duplicated in prompts.
4. A plain single-topic why question with exactly one explicit past-change explanation can use literal selection; multi-source, future and explicit-period questions keep the analytical route. Literal selections must occur in the original text, allowing whitespace differences caused by PDF line wrapping. Invalid selections are withheld individually. No valid items means no generated answer. The UI receives the original bytes and a warning when other items were withheld.
5. Analytical input keeps the largest ordered prefix of complete passages that fits the available provider reservation. It does not replace evidence with a generated summary. Omitted passages cannot validate the answer. Partial coverage is explicit and is cached briefly.
6. A structured analytical draft contains at most four complete claims and numbered references. Deterministic checks reject unknown references, invented numbers, unsupported fiscal labels, lost cumulative durations/adjusted qualifiers, and composite causal explanations across different sources. Absence claims must explicitly refer to supplied evidence; their verifier also receives the other retrieved context to catch contradictions. A separate verifier then checks semantic support. Only retained complete claims are rendered; incomplete verification withholds the analysis.
7. Provider availability, timeout, quota or model access failures can use the relevant allowlisted fallback. Invalid evidence does not buy another writer call. Source passages remain available even when synthesis fails.

Management's explanation is attributed evidence, not proof of causality. Unknown document periods stay unresolved; a source-supported qualitative explanation can use “the quoted period”. A successful quotation is not automatically a financial ledger record. The independent verifier is fallible; see the [engineering report](engineering-evaluation.md) and retained raw trials.

## Time, quotas and cache

- Research: at most three provider attempts in thirty seconds. Individual reasoning requests have ten seconds; selection and verification have seven. Financial extraction has eighteen seconds overall.
- Default per-isolate reservation limits: six calls/provider/minute, 7,000 estimated Groq tokens/minute and 18,000 Gemini tokens/minute. Backend overrides are bounded. These are FINN's admission limits, not a promise of the provider account's actual entitlement.
- Reserve conservative input bytes plus the output cap before calling. Reconcile only when the provider reports complete valid usage. Gemini output accounting uses reported total minus input, including thoughts; incomplete visible-candidate-only counts do not authorize a refund. Unknown/timeout usage remains reserved; it is never assumed free or zero.
- Quota failure cools down the model for one minute; authentication/model errors for ten minutes; timeout/unavailability for thirty seconds. No immediate retry loop.
- A 64-entry in-memory LRU caches successful work for thirty minutes; partial-coverage answers for one minute. Identical in-flight work coalesces.
- Keys hash evidence, question, ticker, engine/prompt version, configuration, credential fingerprint and trusted user scope. Changed inputs/configuration invalidate work. Raw keys are never cache identifiers or response fields.

These controls are per Worker isolate. They do not globally coordinate all concurrent visitors or provider account traffic. A public production service would need a shared limiter, durable private cache and an appropriate access model. Reported tokens are not a dollar-cost invoice. No subscription or credits were purchased.

## Keys, privacy and operator access

Hosting stores `GROQ_API_KEY` and `GEMINI_API_KEY` as server secrets; `ENABLE_FREE_MODEL=true` enables generation. Local `npm run configure:ai` accepts hidden terminal input into Git-ignored `.env.local`. Hosted secrets cannot be read back into this checkout. There are no investor-facing setup controls, route names or provider endpoints in the client bundle.

Use a Groq Free account and a Gemini project without billing enabled. An allowlisted model having a free tier cannot prevent charges on an independently funded provider project; FINN cannot inspect billing status. Exhausted or unavailable service leaves source evidence usable.

Only bounded public-document excerpts and the investor's question go to the providers. Network profiles remain outside prompts. The prototype's synthetic profiles are clearly labelled. Free-tier provider data policies require care with confidential questions; this arrangement is not suitable for private investor documents or real relationship data without an appropriate data agreement.

`AI_LOG_USAGE=true` logs safe route/stage metadata, counts, timings, reported usage and failures. It excludes credentials, question text, source passages and profile identities. `/api/model/test` is removed. Optional connection diagnostics perform authenticated metadata checks and return no configuration to the health response; the flag is disabled after use.

A separate `/ops/evaluation` route was temporarily enabled for the owner to run twelve fixed questions three times, with a fresh engine per trial and at least one minute between requests. It rejects arbitrary prompts, model choices and keys. This route must be disabled before evaluator release. It is not part of the investor navigation.

## Verification

Controlled tests cover routing, both explicit preference orders, malformed output, independent verification, literal partial success, source/configuration/user cache separation, token reconciliation, fallback budgets and timeouts. Packaged-Worker smoke checks exercise the actual bundled endpoints and scan investor scripts for secret/provider leakage.

The repeated live evaluation uses exactly the same twelve questions and sources for baseline and candidate, with all failures retained. See `evals/live-experiment-plan.md`, `evals/live-review-rubric.md` and the engineering report. This small related set across five issuers does not establish all-company accuracy, verifier recall or production-scale quota safety.
