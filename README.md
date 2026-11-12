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
- **Pull:** indexed original annual reports and earnings-call transcripts, scoped questions, exact retrieved passages, PDF page references and original links. Additional research companies are Coforge, Persistent Systems and Tata Consumer Products.
- **Unseen tickers:** enter a valid NSE symbol. FINN discovers original annual-report and raw-transcript links from Screener's document directory, then downloads a selected primary PDF through a restricted proxy and extracts its text in the browser. No ticker-to-answer lookup table. Availability depends on the original publisher.
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

The default product makes **zero model API calls**. React, Vite, Lucide, PDF.js, IBM Plex Sans, requests, Beautiful Soup, pypdf and yfinance are free/open-source dependencies. Public sites can restrict access or change markup. There is no Firecrawl dependency, paid search API or paid market-data feed.

An optional Gemini synthesis adapter is implemented server-side but disabled. It requires both `ENABLE_FREE_MODEL=true` and `GEMINI_API_KEY`. Use it only with a Gemini free-tier project with no billing attached. FINN cannot inspect your provider billing settings. Free quota depends on the project/model; a quota or network failure falls back to exact excerpts. No model key was provided and no live synthesis call was made during this build. See [Google's current pricing](https://ai.google.dev/gemini-api/docs/pricing) and [rate-limit documentation](https://ai.google.dev/gemini-api/docs/rate-limits). Search grounding is not used.

No paid plan or service was purchased. Hosting availability is subject to the account's existing Sites access. The app can run locally without that hosting service.

## Deliberate limits

- The filing directory snapshot contains up to five recent links per portfolio company, not an exhaustive exchange feed. Some BSE PDF requests returned HTTP 403 in this environment. FINN retains the original link and reports download failures.
- Extraction preserves source text but does not verify financial table column alignment. It does not produce a verified quarterly Revenue/EBITDA/PBT/PAT comparison, investment verdict, or four-quarter promises-versus-delivery score.
- The initial annual reports for Infosys and TCS are historical 2024–25 documents. Their period is visible, and they are not presented as the latest results.
- Browser PDF indexing accepts up to 25 MB and reads at most 300 pages. Python ingestion also limits downloads to 25 MB. Scanned PDFs need a later OCR step. Retrieval is lexical and can miss relevant passages.
- Network records are fictional; sector experience is a reason to investigate, not evidence that a contact knows current company facts or unpublished information.
- Data and preferences are browser-local. This is a single-user prototype, without a shared account database or scheduled notifications.
- Live model quality has not been evaluated. Deterministic tests verify retrieval/provenance and error handling, not whether a model's financial analysis is correct.

See [design decisions](docs/design.md), [data provenance](docs/data-provenance.md), [verification and demo](docs/verification.md), and [build history](docs/build-history.md).
