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

## Free operation and optional model

The default product makes **zero model API calls**. React, Vite, Lucide, PDF.js, IBM Plex Sans, decimal.js, requests, Beautiful Soup, pypdf and yfinance are free/open-source dependencies. Public sites can restrict access or change markup. There is no Firecrawl dependency, paid search API or paid market-data feed.

**Connect a key in the website:** open **AI setup** in the top bar → choose **Groq**, **OpenRouter** or **Gemini** → paste the key → **Test & connect**. The connection check makes one short completion request. Then run a company question in Research. For a newly imported PDF, choose **Synthesize indexed evidence** after indexing finishes. AI answers include buttons that open the numbered source passages.

The key remains in React memory in the current tab, passes over HTTPS through FINN's server to the selected provider, and is not saved to localStorage, sessionStorage, a database or Git. Reloading clears it. Closing the setup dialog preserves the connected key until reload or **Disconnect AI**. Questions and up to four retrieved primary-source passages are sent to that provider; synthetic network profiles are excluded. Do not paste a key into the chat, source files, or a `VITE_` variable.

Groq defaults to `openai/gpt-oss-120b`, with `openai/gpt-oss-20b` and `llama-3.3-70b-versatile` also available. OpenRouter defaults to `openrouter/free`; the server rejects models that are neither that free router nor a `:free` model. Gemini retains `gemini-3.1-flash-lite`. Use Groq on its free plan, or Gemini on a free-tier project without billing. FINN cannot inspect account billing settings or guarantee continuing free quotas. There is no automatic retry, provider switch, paid fallback, model search or grounding request. Timeouts, quota/authentication failures, incomplete responses and missing/invalid citation references fall back to exact passages. Citation checks validate reference numbers, not whether a claim is entailed by its source.

For an operator-managed server key, copy `.env.example` to the ignored `.env.local`, set `ENABLE_FREE_MODEL=true`, `AI_PROVIDER`, `AI_MODEL`, and the matching `GROQ_API_KEY`, `OPENROUTER_API_KEY` or `GEMINI_API_KEY`; restart the local server. Local values are now passed to the development Worker only. For hosted deployment, configure these names as server runtime variables/secrets and redeploy; a local `.env.local` does not configure the hosted site. No production key is configured by this commit. Existing Gemini-only environment setups remain supported when `AI_PROVIDER` is absent.

Provider references: [Groq API and limits](https://console.groq.com/docs/rate-limits), [OpenRouter free models](https://openrouter.ai/collections/free-models), [Gemini pricing](https://ai.google.dev/gemini-api/docs/pricing). No valid key was provided and no authenticated live synthesis or model-quality evaluation is claimed.

No paid plan or service was purchased. Hosting availability is subject to the account's existing Sites access. The app can run locally without that hosting service.

## Deliberate limits

- The filing directory snapshot contains up to five recent links per portfolio company, not an exhaustive exchange feed. Some BSE PDF requests returned HTTP 403 in this environment. FINN retains the original link and reports download failures.
- The initial financial comparison cache contains 37 manually reviewed Infosys records and eight explicit guidance statements. The generic evidence form supports additional companies; automatic financial table extraction is not implemented. Missing EBITDA/PBT/PAT figures remain gaps. There is no investment verdict or composite management score.
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

Unseen-symbol discovery now attempts two listed original PDFs automatically. Publisher restrictions can still prevent extraction. Choose another original, or use the per-source downloaded-PDF input after checking its identity. The fallback is browser-local and does not certify publisher authenticity. Automatic financial table extraction and live model evaluation remain unfinished.

A covering-email draft is in docs/submission-email.md. Repository visibility, evaluator access and original AI-session export links must be resolved before submitting; no email has been sent.
