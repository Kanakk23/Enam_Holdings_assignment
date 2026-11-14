# FINN

A mobile-first research brief for an Indian public-markets investor. Move from a portfolio disclosure to original evidence and a relevant person, with the limits of each source visible.

## Run locally

Requires Node 22+ and Python 3.12+ for ingestion.

```sh
npm ci
npm run dev
```

Vite serves both the interface and the development API. The shipped snapshot works without an API key. Document discovery needs an internet connection. Browser PDF extraction is loaded only when a document is selected.

```sh
npm test
npm run build
```

The build produces a self-contained Worker ESM at `dist/server/index.js`. It serves the client assets itself; no undocumented asset binding is needed. `.openai/hosting.json` identifies the private hosted preview. To deploy elsewhere, use a Worker-compatible runtime with that entry point.

## What is implemented

- **Push:** 18-company portfolio, a cached set of recent BSE filing links, an exact rolling 24-hour window, company/date filters, transparent rule-based prioritisation, collapsed routine disclosures and persisted review status.
- **Triggered EOD signals:** configurable close-to-close move and volume multiple, with the current observation excluded from the prior 20-session volume baseline. Missing closes are excluded; prices show their actual session.
- **Pull:** original annual reports and earnings-call transcripts, scoped evidence retrieval, PDF-page references and original links. Infosys now includes reviewed quarterly/annual figures, calculated comparable-period changes, separate reported/adjusted views, and a four-call guidance ledger. Additional research companies are Coforge, Persistent Systems and Tata Consumer Products.
- **Unseen tickers:** enter a valid NSE symbol. FINN discovers original annual-report and raw-transcript links from Screener's document directory, then automatically attempts up to two discovered primary PDFs through a restricted proxy and extracts its text in the browser. No ticker-to-answer lookup table. Availability depends on the original publisher.
- **Network:** 36 clearly synthetic profiles, company/sector experience matching within research and filing details, direct network search, and explicit known-contact versus inferred colleague-overlap paths.
- **Trust:** historical report periods, publication/indexing distinction, source retrieval date, incomplete and unavailable-source states, and an explicitly labelled extractive default.

## Refresh source data

```sh
python -m venv .venv
.venv/bin/pip install -r requirements.txt
.venv/bin/python scripts/ingest.py --bootstrap --market --filings
.venv/bin/python scripts/ingest.py --extras
.venv/bin/python scripts/ingest.py --ticker HCLTECH
```

To import an original issuer/exchange PDF when a directory link is unavailable:

```sh
.venv/bin/python scripts/ingest.py --ticker SYMBOL --url 'https://issuer.example/original-report.pdf' --title 'Issuer annual report 2025–26'
```

The URL above is a usage placeholder, not a real source. On Windows, use `.venv\Scripts\python` and `.venv\Scripts\pip`.

`.github/workflows/ingest.yml` exposes the same generic ingestion through a manual GitHub Actions workflow. It consumes the account's included Actions minutes; it is not scheduled automatically. A changed repository snapshot must be rebuilt and redeployed to update the hosted snapshot. Browser-imported excerpts persist in that browser only, up to eight documents, and do not change the shared repository.

## Free operation and backend model routing

The snapshot works without model keys. React, Vite, Lucide, PDF.js, IBM Plex Sans, decimal.js and the ingestion libraries are free/open-source. There is no Firecrawl, paid search API or paid market-data feed dependency.

API keys, provider selection and model routing are backend concerns. The investor interface has no API-key field, provider controls or model names. Requests containing client-side credentials or routing overrides are rejected. The public health response reveals only service health.

| Work | Backend route | Why |
| --- | --- | --- |
| Short evidence extraction | Groq `openai/gpt-oss-20b` | A bounded structured-output task; no large writer model needed |
| Comparisons, guidance, narrative versus numbers | Gemini `gemini-3.8-flash` | Reserve a stronger model for questions that require reasoning across sources |
| Extraction when Groq is unavailable | Gemini `gemini-3.5-flash-lite` | A small alternative with a free tier |
| Reasoning when Gemini is unavailable | Groq `openai/gpt-oss-120b` | A stronger alternative within the same free-plan account |
| Arithmetic, filing priority and contact/relationship matching | Code | Reproducible results and zero model calls |

Analytical contexts go to the reasoning model and then to a separate small-model claim verifier. Straightforward research returns selected original evidence without another model rewrite. Generated analysis rejects invalid references and unsupported numerical tokens. These checks do not prove semantic entailment.

The engine retrieves up to eight relevant passages, caps each context at 1,800 characters, and limits each uncached investigation to three provider attempts, including fallback attempts. Successful extraction/results are cached for 30 minutes in a bounded in-memory cache, keyed by evidence, query, model configuration and authenticated scope. Simultaneous identical requests share work. Source or credential changes invalidate the cache. Quota/authentication failures create short cooldowns instead of repeated retries. The cache and reservations are per Worker isolate; they are not a durable cache or a global account quota manager.

### Configure server keys

Use a **Groq Free account** and a **Gemini free-tier project without billing attached**. The allowlist contains free-tier models; it cannot detect whether the account associated with a key has enabled paid billing. Provider quotas and model availability remain authoritative. No credit purchase, plan upgrade, paid-only model or search-grounding call is made by FINN.

Locally, run:

```sh
npm run configure:ai
npm run dev
```

The terminal prompts for both keys without echo and writes the ignored `.env.local` with restricted file permissions. It makes no API request. Alternatively, copy `.env.example` to `.env.local`, add `GROQ_API_KEY` and `GEMINI_API_KEY`, and set `ENABLE_FREE_MODEL=true`. Never use a `VITE_` prefix for secrets.

For the hosted app, open **ChatGPT → Sites → FINN → More actions → Settings** and add `GROQ_API_KEY` and `GEMINI_API_KEY` as secrets in the runtime environment controls. Keep `ENABLE_FREE_MODEL=true`, save, then redeploy to apply the environment revision. The local setup command does not configure hosted secrets. Both hosted keys have now passed authenticated model-list checks. Groq generation has run successfully; Gemini generation timed out in the tested request, so a full model-quality evaluation remains outstanding.

Only the question and retrieved annual-report/transcript passages reach the models; network profiles and relationship data stay out. Gemini free-tier inputs may be used to improve Google's products, so this prototype sends public document evidence only. Private investor notes and real network data need a different data-processing arrangement. Optional `AI_LOG_USAGE=true` logs only task/model/call-count/token-reservation metadata on the backend, never keys, source text, identities or questions.

See [routing and efficiency decisions](docs/model-routing.md), [Groq limits](https://console.groq.com/docs/rate-limits), [Groq structured outputs](https://console.groq.com/docs/structured-outputs), and [Gemini free-tier pricing](https://ai.google.dev/gemini-api/docs/pricing).

No paid plan or service was purchased. Hosting availability is subject to the account's existing Sites access. The app can run locally without that hosting service.

## Deliberate limits

- The filing directory snapshot contains up to five recent links per portfolio company, not an exhaustive exchange feed. Some BSE PDF requests returned HTTP 403 in this environment. FINN retains the original link and reports download failures.
- The initial financial comparison cache contains 37 manually reviewed Infosys records and eight explicit guidance statements. The generic evidence form supports additional companies; automatic extraction now supports explicitly bound prose actuals, with a bounded model proposal and deterministic validation. Aligned annual statement rows can now be extracted without model credits; ambiguous layouts remain unsupported. Missing EBITDA/PBT/PAT figures remain gaps. There is no investment verdict or composite management score.
- Infosys includes its 2025–26 annual report and five earnings-call transcripts covering Q2 FY26 through Q2 FY27. Older 2024–25 Infosys/TCS reports remain clearly dated. Source coverage is historical and bounded.
- Browser PDF indexing accepts up to 25 MB and reads at most 300 pages. Python ingestion also limits downloads to 25 MB. Scanned PDFs need a later OCR step. Retrieval is lexical and can miss relevant passages.
- Network records are fictional; sector experience is a reason to investigate, not evidence that a contact knows current company facts or unpublished information.
- Data and preferences are browser-local. This is a single-user prototype, without a shared account database or scheduled notifications.
- Live model quality has not been evaluated. Deterministic tests verify retrieval/provenance and error handling, not whether a model's financial analysis is correct.

## Financial evidence workflow

Open **Research → INFY** for the seeded example. Choose a reporting period and statement basis. Each figure links to its original page; each change expands to show its formula and the two sources. The annual Ind AS table separates total profit after tax from profit attributable to owners. The quarterly commentary is labelled `Issuer commentary`, not silently assigned an accounting standard.

The guidance ledger compares each target against a reviewed actual for that same period and basis. Open years, missing actuals, rounded values, unclear adjustments and conflicting records withhold a delivery conclusion. A lower guidance range is not an investment recommendation.

For another company, open an original passage and expand **Record a figure or guidance**. Enter the literal value, units, reporting/target period, consolidation and statement basis, then confirm the source check. Records persist in that browser. Values absent from the selected passage are rejected. The comparison calendar currently assumes a March financial year-end.

The reviewed seed is an input cache, separate from calculation logic. Re-import or validate it with:

```sh
node scripts/import-reviewed-evidence.mjs
node scripts/verify-finance-render.mjs
```

`verify-finance-render` checks server-rendered markup and data presentation; it is not browser or visual verification. See the dated verification notes for the subsequent investor walkthrough and API setup checks.

See [design decisions](docs/design.md), [data provenance](docs/data-provenance.md), [verification and demo](docs/verification.md), and [build history](docs/build-history.md).

## Updated investor workflow

Start at Brief → Continue an investigation for an explicitly archived Infosys case. The research view leads with comparable-period movements and current/prior evidence pairs, then question-aware network matches. The detailed financial table, completed/open guidance filters and revisions remain available below. Findings are calculated from reviewed inputs, not generated explanations of causality.

Open Coverage and freshness → Refresh portfolio sources for on-demand Yahoo EOD and filing-directory checks. Partial failures retain previous data and expose per-company errors. Successful results persist in that browser. This refresh does not require a Git commit or deployment; scheduled unattended publication is not implemented. Source coverage remains bounded.

Unseen-symbol discovery now attempts two listed original PDFs automatically. Publisher restrictions can still prevent extraction. Choose another original, or use the per-source downloaded-PDF input after checking its identity. The fallback is browser-local and does not certify publisher authenticity. Automatic financial extraction supports explicit prose and a bounded annual-statement table contract. Aligned annual profit-and-loss tables are now supported when their dates, units and consolidation are explicit. OCR, arbitrary table layouts and reviewed live model quality remain outside the verified scope.

A covering-email draft is in docs/submission-email.md. Repository visibility, evaluator access and original AI-session export links must be resolved before submitting; no email has been sent.

## Engineering verification update

Automatic actual extraction runs in the backend and feeds source-linked comparisons without manual entry when the evidence contract passes. Research attempts now reserve fallback time and cool down timed-out routes. The brief leads with up to five selected events while retaining every distinct critical event, including multiple events at one issuer. Routine disclosures remain in the archive. See [engineering evaluation](docs/engineering-evaluation.md) for commands, measured synthetic contract results, failure boundaries, and the phone demo. Fixture passes are not live financial accuracy.

The Worker is bundled through Vite from its ESM dependency graph. Build smoke checks exercise `/api/financials`, including an unseeded synthetic symbol, so missing modules cannot hide behind source-only tests. The review regression suite compares the previous validator to the candidate: 36/45 vs 45/45 checks across three repetitions of 15 synthetic cases. This small deterministic result does not establish live AI accuracy. Official NSE PDF recovery now accepts a ticker-bound archive URL when discovery links fail; both HAVELLS and DABUR downloads passed through the packaged endpoint.


## Completed investigation and extraction update

Automatic issuer-site recovery now supplements directory links. The browser preserves annual-statement columns, extracts comparable revenue/PBT/group PAT, and sends the original indexed evidence to the backend for validation. One usable two-year statement can complete a comparison. Old browser indexes are invalidated after parser changes.

Research retains the originating event, management's attributed explanation and a source-specific follow-up question. Analytical model output receives a separate claim-support check before display; incomplete verification returns source evidence. Owner sign-in is complete. Hosted extraction and a Persistent cash-conversion analysis were checked against their cited passages. Other requests were withheld or budget-limited; the full live evaluation and verifier precision/recall remain unfinished. See the dated engineering report for observed results and fixes.

Run `node scripts/evaluate-primary-tables.mjs` for two real held-out annual-statement layouts: 12 checked facts, six annual changes, 12 corrupted-input cases, three trials, zero model calls. The resulting 72/72 contract checks are not a live AI accuracy score. See [engineering evaluation](docs/engineering-evaluation.md) for provenance, observations, current limitations and submission steps.
