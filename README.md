# FINN

FINN is a mobile-first research brief for an Indian public-markets investor: move from a portfolio disclosure to primary evidence, a comparable financial change and a relevant person to consult.

Prototype: https://finn-research-brief.kanakxaviers123.chatgpt.site

The hosted app and repository remain private during release preparation. Evaluator access and original-session sharing are explicit owner decisions; see [release checklist](docs/release-checklist.md).

## What works

| Workflow | Behaviour |
| --- | --- |
| Push | An 18-company portfolio, rolling 24-hour/date/company filters, explained event priority, a separate routine archive and saved review state. Every distinct critical event remains available. |
| EOD signals | Configurable close-to-close and volume thresholds. The current observation is excluded from its previous twenty-session volume baseline. Prices show their actual session. |
| Pull | Original annual reports and raw earnings-call transcripts, retrieved page passages, source-linked figures, compatible-period changes, and a guidance ledger that keeps unfinished targets open. |
| Unseen NSE ticker | Generic source discovery, bounded issuer-site recovery, restricted PDF retrieval, browser PDF.js indexing and automatic financial validation. No ticker-to-answer lookup. |
| Investigation | Preserve the originating event, management's attributed explanation, an unresolved question, and that question in contact preparation. |
| Network | 36 clearly synthetic profiles, direct search and embedded recommendations. Explain company/sector/role fit, dated experience, known relationships and inferred employment overlaps. |

The shared financial cache contains 37 reviewed Infosys records and eight guidance statements. Additional indexed sources cover TCS, Coforge, Persistent Systems and Tata Consumer Products. Automatic actual extraction is generic: supported prose and explicit annual-statement columns can feed comparisons for another company without manual figures. Missing or ambiguous evidence stays unresolved.

## Run locally

Node 22+ is required. Python 3.12+ is used for optional ingestion.

```sh
npm ci
npm run dev
```

Vite serves the interface and development API. The snapshot, numerical comparisons and network work without a model key. Source discovery needs internet access; PDF.js loads only when indexing a PDF.

```sh
npm test
npm run build
node scripts/verify-build.mjs
```

The build emits a standalone Worker ESM at `dist/server/index.js`, including its client assets. `.openai/hosting.json` identifies the retained hosted project. A Worker-compatible runtime can run the same artifact; the app is not tied to this chat's browser state.

## Backend AI configuration

Use a Groq Free account and a Gemini project without billing enabled. Locally:

```sh
npm run configure:ai
npm run dev
```

The terminal accepts hidden key input and writes Git-ignored `.env.local` with restricted permissions. Alternatively copy `.env.example`, set `GROQ_API_KEY`, `GEMINI_API_KEY` and `ENABLE_FREE_MODEL=true`. Never prefix secrets with `VITE_`.

Hosted keys are server secrets in FINN's Sites runtime environment. Save environment changes and redeploy to apply them; local configuration does not update hosting. The current hosted keys have authenticated and generated outputs. Their values cannot be read back into this checkout.

| Work | Default route |
| --- | --- |
| Literal evidence selection | Groq GPT-OSS 20B; Gemini Flash-Lite fallback |
| Analytical interpretation | Groq GPT-OSS 120B; Gemini Flash fallback |
| Independent analytical verification | Separate small model, normally on the other available provider |
| Financial arithmetic, supported table parsing, filing priority and network paths | Code, zero LLM calls |

Groq became the preferred reasoning route after the live availability experiment. This is not a universal model-quality ranking. An explicit backend `AI_REASON_PRIMARY=gemini` remains supported. Keys, model names, provider controls and execution traces are absent from the investor interface; client credential/routing overrides are rejected.

Research has three attempts and thirty seconds overall, with ten-second reasoning and seven-second selection/verification requests. Financial extraction has eighteen seconds. Original evidence survives quota, timeout and validation failures. A sixty-four-entry in-memory cache coalesces identical work and retains successful answers for thirty minutes; partial-coverage notes for one minute. Evidence, query, configuration, credentials, prompt version and trusted user scope invalidate cached work.

Admission limits default to six calls/provider/minute, 7,000 estimated Groq tokens/minute and 18,000 Gemini tokens/minute. These are per-isolate FINN limits, not provider entitlements or global account-wide enforcement. Complete reported usage reconciles reservations; unknown usage remains reserved. Gemini accounting includes reported thought tokens. No credits, subscription upgrades, paid search or paid-only model fallbacks are purchased.

See [backend routing](docs/model-routing.md), [Groq limits](https://console.groq.com/docs/rate-limits) and [Gemini pricing](https://ai.google.dev/gemini-api/docs/pricing). The server cannot inspect whether a separately funded provider account has billing attached.

## Evidence and trust

Pull uses annual reports and raw call transcripts. Screener is a source-link directory; its prose is not research evidence. Source passages retain document identity, period, page and original URL. Browser-imported text has an authenticity warning; FINN does not certify an uploaded document's identity.

Literal selections must match original wording, allowing PDF whitespace differences. Analytical claims require valid citations, local number/period/basis checks and a separate support verifier. Annual guidance must retain its annual horizon, causal explanations need attribution, and generated numerical movements defer to deterministic comparisons. Missing evidence is scoped to retrieved passages, with other retrieved context available to contradict absence claims. Model verification can still be wrong; retained live trials document those failures.

Decimal calculations compare compatible periods, currency, units, consolidation and accounting/adjustment basis. INR lakh/crore/million conversions are deterministic; currency conversion and missing inputs are not invented. Group PAT is not silently treated as parent-attributable PAT. Explicit annual statement columns require unambiguous units, dates, basis and rows; restated/adjusted/segment ambiguities abstain.

Open Research → INFY for the reviewed example. Inspect a change, formula, current/prior sources and completed/open guidance. For another ticker, index a discovered original. **Record a figure or guidance** is a review/correction fallback, rather than the main extraction workflow. Browser-local figures and preferences persist in that browser.

Only the question and bounded public-document excerpts reach providers. Network records stay out of prompts. Free-tier provider data policies are unsuitable for confidential investor documents or real relationship data without an appropriate agreement. The prototype does not accept private network imports.

## Refresh and ingestion

The interface refreshes bounded filing-link metadata and Yahoo EOD observations on demand, with five-minute caching. Partial failures retain previous data and show readable coverage status. It is not an exhaustive exchange feed or an unattended notification service.

```sh
python -m venv .venv
.venv/bin/pip install -r requirements.txt
.venv/bin/python scripts/ingest.py --bootstrap --market --filings
.venv/bin/python scripts/ingest.py --extras
.venv/bin/python scripts/ingest.py --ticker HCLTECH
```

On Windows use `.venv\Scripts\python` and `.venv\Scripts\pip`. `--url` and `--title` allow an identified original issuer/exchange PDF when directory links fail. `.github/workflows/ingest.yml` exposes manual ingestion using included Actions minutes; it is not automatically scheduled. Repository snapshot updates need a rebuild/redeployment. Browser indexing persists up to eight documents locally and does not change the shared snapshot.

## Evaluation

The current suite has **152 passing tests**, plus packaged-Worker, investor-bundle and rendered-finance checks. Two held-out annual statement layouts produce twelve checked values and six changes with zero model calls; 72/72 repeated contract checks include corrupt-input rejections. Separate synthetic scope/period tests are not live-model accuracy scores.

The hosted model experiment retains three full runs of the same twelve questions across five issuers, three fresh trials per variant (108 trials). A separate nine-trial release closure checks the affected cases; it is not substituted into the full-suite score. Raw answers, supplied evidence, failures, timing, usage, evidence-review labels and paired comparisons are retained under `evals/`. Reviews are by the coding agent, not independent human annotation. Repetitions are averaged per case; they are not counted as independent companies. The benchmark excludes document discovery/download/PDF parsing, and the missing-margin case is a retrieval-level abstention check.

```sh
node scripts/evaluate-primary-tables.mjs
node scripts/evaluate-answer-periods.mjs
node scripts/evaluate-claim-scope.mjs
node scripts/evaluate-live-research.mjs
python scripts/check-release-secrets.py
```

The live script makes no calls without `--live` and locally configured keys. Hosting secrets are never exported for CLI evaluation. The temporary owner-only hosted evaluation route is disabled before release.

Read [engineering evaluation](docs/engineering-evaluation.md) for final measured results and their limitations, [verification and phone demo](docs/verification.md), [data provenance](docs/data-provenance.md), [design decisions](docs/design.md), [chronological build history](docs/build-history.md), and the [original-session record](docs/ai-session-record.md).

## Deliberate limits

- Filing coverage is a bounded directory sample. Publisher restrictions can prevent PDF downloads; original links and labelled recovery controls remain available.
- Browser PDF indexing accepts 25 MB and 300 pages. Scans need OCR. Lexical retrieval can miss relevant passages. Arbitrary table layouts and non-March financial calendars are not covered by the current contract.
- The two held-out table documents and five-issuer model suite do not establish all-company accuracy, verifier recall or reliable live source access everywhere.
- Network profiles are fictional. Employment overlap does not establish acquaintance, current expertise or unpublished knowledge.
- Records are browser-local. There is no durable multi-tenant database, global quota coordinator, unattended refresh publication, trading or real-time alert delivery.
