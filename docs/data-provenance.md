# Data provenance

The authoritative source manifest is `public/data/seed.json`. Each research document records its original URL, SHA-256, reporting period, retrieval timestamp, PDF page count and exact extracted passages. The complete original PDFs are linked, not stored in Git. Bootstrap manifests are source locations, not prewritten company answers.

## Source boundaries

- **Market:** Yahoo Finance through yfinance, NSE symbols with `.NS`. Missing-close rows are removed before selecting the last and preceding closes. Change is `(close / prior close - 1) × 100`. Volume is compared to the preceding 20 available price-session observations. Data are provider-adjusted history; there is no claim of exchange-certified or real-time prices.
- **Push:** recent corporate disclosure links in Screener's company document directory, pointing to BSE originals. Only title, linked publication timestamp and original URL are ingested. Third-party narrative summaries are not used. Up to five recent records per company are captured; coverage status is recorded per ticker.
- **Pull:** original issuer or exchange annual reports and raw earnings-call transcripts. Screener is a link directory, not an analytical source. AI summaries, broker notes, recordings and news are excluded by the discovery selectors. The explicit CLI URL option is an operator import: the operator must supply a genuine primary document for the stated ticker.
- **Network:** a 36-profile synthetic fixture in `src/domain.mjs`. Its employment dates and explicit acquaintances are demonstration inputs. An inferred colleague path requires the same employer and overlapping dates with an explicitly known demo contact.

HTTP failures are retained under `errors`. Some BSE PDFs denied this environment with 403; issuer-hosted documents supplied usable evidence for the initial research workflows. HTTP errors are never replaced with generated financial facts.

The shipped snapshot is dated November 12, 2026. It includes older reporting periods, and must be refreshed for later demonstrations. This is intentionally separate from the market session date and from disclosure publication timestamps.

## Processing limits

Python extraction selects up to 18 financially relevant page excerpts per document. The browser extracts up to 24 passages from the first 300 pages of a selected PDF. The original layout remains authoritative for tables. An excerpt is evidence of what the source says, not independent confirmation of management's claim.

Research defaults to lexical passage retrieval. Optional model synthesis receives only numbered source passages and the question, with instructions to cite claims and avoid outside company knowledge. Prompt instructions are not a factual-verification guarantee; live model evaluation is still required.

Browser imports are saved locally, with a maximum of eight imported documents. No personal contacts or uploaded private documents are sent to a model in this prototype. The PDF proxy accepts only a source URL rediscovered for the requested company. It rejects non-public-form HTTPS URLs and checks redirects and a 25 MB bound. This is not a general-purpose URL fetch endpoint.


## Reviewed financial inputs

`scripts/reviewed-evidence.json` contains 37 source-reviewed Infosys records, eight explicit guidance ranges and six issuer document manifests. It is a cached, reviewed dataset. `src/finance.mjs` contains company-independent decimal arithmetic, currency-unit normalization, period matching, conflict detection and guidance assessment. No ticker-specific financial-answer branch is used.

The annual table was checked against the original report layout (PDF page 33, printed page 64), including standalone versus consolidated columns and total after-tax profit versus attributable profit. Its short numeric extracts reproduce selected cells; omitted growth columns are identified. Five transcripts provide management-reported quarterly and annual figures. The last four calls supply the guidance history; the older Q2 FY26 call supplies comparison evidence.

Quarterly transcript figures use the `Issuer commentary` statement basis. That label does not certify IFRS/Ind AS reconciliation. The annual financial table uses its explicitly stated Ind AS basis. Adjusted and reported figures remain distinct, and the labour-code treatment is identified in the relevant passage metadata. Coarsely rounded source figures withhold precise growth calculations.

`node scripts/import-reviewed-evidence.mjs` validates source hashes/identities, document types, page references, literal numeric support, periods and review metadata before importing the cache. These checks support provenance; human review remains responsible for the meaning and column selection. Browser-entered records are separately labelled `user_checked` and retained locally until removed or browser storage is cleared. The comparison calendar currently supports March year-end fiscal periods.

Client and server retrieval share the same implementation. It considers source section metadata and report dates, withholds unrelated matches and limits repeated passages from one document. An index date does not make an old reporting period current.

## Investor workflow revision

Reviewed excerpts now include the extracted text of their original PDF page, in addition to the small literal cell/quote used by the validator. The page context is not manually rewritten; the original PDF remains authoritative for table layout. The opening findings use the same source/basis/conflict guards as the detailed comparisons and state movements without inferring their causes.

Discovery automatically attempts up to two listed primary PDFs, preferring issuer hosts. A source failure remains explicit; the user may select another source or index a locally downloaded original for that listed source. This recovery asks the user to attest the file identity. Its hash proves byte identity only, not publisher authenticity. Upload bytes remain in the browser, are limited to 25 MB, and do not go to a model. There is no control bypass or invented source.

Portfolio refresh makes separate market and filing checks per symbol, up to three symbols concurrently. Per-symbol results are cached in Worker memory for five minutes. It uses Yahoo adjusted closes from complete sessions (today only after 15:45 IST) and the preceding 20 observations for volume. Failures preserve old observations; successful checks replace only that source's data. Browser-local refreshed snapshots persist until storage is cleared. A fully successful refresh advances the overall snapshot date; a partial refresh records individual errors and its attempt time. There is no background notification guarantee.

Real deployment policy: each investor owns a tenant-scoped network; import only consented, necessary role/relationship metadata; default to deleting raw contact imports after parsing, with a proposed 30-day maximum retry retention. Retain derived records until the investor deletes them or closes the workspace; provide export/deletion and per-record provenance. Enforce ownership server-side and encrypt persisted records. These are proposed production controls, not claims that the browser-local prototype implements a private multi-tenant service. No private contacts are included in model prompts.
