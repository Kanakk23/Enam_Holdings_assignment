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

## Reproduce the checks

```sh
npm test
npm run build
node scripts/verify-build.mjs
node scripts/verify-finance-render.mjs
node scripts/verify-model-render.mjs
node scripts/evaluate-review.mjs
node scripts/evaluate-primary-tables.mjs
```

The current suite has 131 passing tests. The built-Worker test exercises real financial endpoints, malformed input, frontend credential rejection, routing fixtures, asset handling and extraction from the two held-out statement layouts. It catches missing bundled dependencies, rather than only testing source imports.

The prior synthetic validator comparison remains 36/45 versus 45/45 checks over 15 cases repeated three times. Its scope is period/quotation contracts, not model quality.

## Held-out real annual statements

No DABUR or VGUARD financial answers are in the application seed. Evaluation inputs and manually checked expected values live only in `evals/annual-table-cases.json`. The layouts were extracted using the same PDF.js version as the browser. Original URLs, PDF hashes, physical/printed pages and periods are retained.

| Document | Physical PDF page | Printed page | Periods | Checked actuals |
| --- | --- | --- | --- | --- |
| Dabur consolidated financial-statements component of its 2025–26 annual report | 12 | 411 | FY2026 / FY2025 | Revenue, PBT and group PAT, both years |
| V-Guard annual report 2023–24 | 259 | 257 | FY2024 / FY2023 | Revenue, PBT and group PAT, both years |

V-Guard is an explicitly historical source. It demonstrates a second layout and industry, not current 2026 coverage.

`evaluate-primary-tables` runs 24 cases three times: twelve expected facts and twelve corrupt unit/basis/column/header/period cases. Candidate: **72/72**. The frozen previous prose-only validator passed **36/72** by withholding every table, including the negative cases. All twelve facts and six annual changes match the manually checked values; extraction used **zero provider calls**. Measured local processing is milliseconds and excludes download and PDF parsing.

Raw rows, repeated-trial stability, gate output and execution observations are under `evals/primary-table-*`. The gate passed without a regression. These are two source documents with correlated facts; the statistics do not establish performance across all companies or document layouts.

## Model efficiency and failure handling

Backend routing retains Groq GPT-OSS 20B for extraction, Gemini Flash for reasoning, and the existing Lite/120B fallbacks. Analytical answers now use a structured claims-and-reference-IDs schema and reserve a separate small-model verification call. The server renders citations; it does not depend on citation punctuation generated in free text. Unsupported claims are omitted; incomplete verification withholds the analysis while original evidence remains usable. Explicitly tentative interpretations remain labelled as inference. No provider selection, model names or credentials are presented in the investor interface.

Research is capped at three attempts and thirty seconds, with individual reasoning attempts of ten seconds and extraction/verification attempts of seven seconds. Financial extraction has an eighteen-second budget. Timeouts and quota failures cool down routes. Calculations, annual-table extraction, source matching and network matching use no LLM. Source/configuration/user-scoped caches avoid repeated valid model work; quotas remain per isolate, not a durable account-wide scheduler.

With `AI_LOG_USAGE=true`, backend traces retain purpose, route, duration, reported input/output tokens, cache hits, reservations, rejection reasons and failure codes. They exclude credentials, private network records and original source passages. Reservations are estimates, not a cost invoice.

## Live evaluation status

`node scripts/evaluate-live-research.mjs --live` supports twelve questions across five issuers and three trials using locally configured backend keys. It records answers, evidence, latency, calls and reported usage for manual review. The keys configured in hosting cannot be read back into local code.

The owner completed ChatGPT sign-in. Hosted checks on 14 November 2026 UTC reached both providers and exercised extraction, reasoning, fallback and verification. This was a diagnostic walkthrough across changing versions, not the full twelve-question, three-trial evaluation. It must not be presented as an accuracy or reliability percentage.

| Hosted check | Observed result | Review |
| --- | --- | --- |
| Infosys operating-margin question | Three literal extracts with original passage links | Values/qualifiers match cited passages. Different periods should be more visible beside each extract; one later general query selected overlapping quotations. |
| Persistent general research | Note withheld; original excerpts retained; financial extraction returned no comparable facts | A failed note, not a successful analytical answer. No missing financial figures were invented. |
| Persistent cash-conversion question | Live analytical note citing transcript page 9 | Matches management's unbilled-revenue explanation and preserves its forward-looking normalization qualifier. Citation opened the exact passage. No numerical comparison was established. Causal attribution could be clearer, and the source period remains explicitly unresolved. |
| Infosys combined margin/cash question | Earlier attempts were withheld for citation/numeric validation; a later attempt hit the conservative token reservation budget after another request | The source-linked comparisons remained usable. A subsequent note completed but failed human review on scope/basis; after adding those guards, an attempt again withheld the note before the structured-output change. The later structured run is assessed below. Availability remains unresolved. These failed attempts remain part of the record. |

Gemini Flash returned a 503 and multiple ten-second timeouts. Groq 120B generated fallback text; Gemini Lite and Groq 20B generated evidence selections. Successful generation is not evidence that every generated claim was correct. The server's three-attempt cap and thirty-second research deadline remain in force.

The walkthrough identified and fixed: free-text citation failures (replaced by structured claims), overlong/poorly formatted synthesis, fiscal labels mistaken for financial amounts, punctuation after citations mistaken for uncited content, and all-or-nothing numerical validation. Complete cited claims are now checked individually; only independently valid claims reach the separate verifier. Invalid claims are withheld and a partial-result warning is shown. Unknown references, unsupported periods and invented values remain rejected. Uncited trailing text and claims beyond a four-claim note budget are withheld; only complete cited claims can reach verification. A later Infosys note exposed verifier false acceptance: a nine-month conversion was presented as quarterly, and adjusted basis was omitted from a margin claim. These are recorded research-quality failures. Generic duration and adjusted-basis retention checks now guard such numerical claims before verification; semicolon fragments are normalized for display. This does not establish that all accounting qualifiers are covered.

`node scripts/evaluate-answer-periods.mjs` reproduces sixteen synthetic answer-contract cases repeated three times: frozen previous validator **33/48**, candidate **48/48**, with no pass-to-fail cases. The paired gate passed. This small, correlated contract suite does not measure stochastic synthesis, verifier precision/recall, or broad company coverage.

Sanitized observed traces and manually reviewed visible outcomes are retained in `evals/hosted-smoke-2026-11-14.json`. They contain no credentials or original conversation/session exports. A later structured-output Infosys run completed with two retained claims and a partial warning. The margin claim retained its adjusted basis. Human review still found an overbroad composite causal narrative. A conservative guard now withholds multi-source causal claims before verification; this sacrifices some analytical breadth while retaining source-specific findings. Its regression case reproduces the observed failure. The complete trace and earlier withheld attempts remain in the record. A successful earlier Persistent note and working extraction do not establish reliable multi-period synthesis. Full live quality evaluation remains unfinished; do not replace that limitation with deterministic test scores.

## Three-minute phone demonstration

1. Brief: inspect a leading archived event and its priority reason/date. Routine disclosures remain in the archive.
2. Open company fundamentals; the originating event remains available from research.
3. Inspect an Infosys cash/margin change, management's attributed passage and the specific unresolved question.
4. Open current/prior evidence and a synthetic contact; distinguish dated expertise from a known relationship.
5. Enter DABUR without manually entering figures. Original-document recovery and supported annual columns feed the comparison. Open the row and original PDF page.
6. Show the held-out extraction report and one rejected ambiguous/corrupt input. Distinguish it from the limited hosted AI checks and the unfinished full live evaluation.

## Remaining product boundaries

Broad OCR/table-layout coverage, unattended refresh publication and durable multi-user storage are later capabilities. User-provided browser text has a visible authenticity warning; the server does not certify an uploaded PDF's identity. Non-March fiscal calendars require explicit configuration.

## Submission material requiring the owner

- Original coding-agent/LLM conversation exports or original share links; reconstructed logs do not qualify.
- The required repository visibility and evaluator access decision, followed by a test outside the owner allowlist.
- Final covering email after verifying these links. No email has been sent.

Phone verification completed: a typed DABUR query recovered the issuer original, extracted the annual columns and displayed source-linked revenue/PBT/PAT comparisons without manual figures. Current/prior source navigation showed the original column dates and highlighted selected value. An Infosys margin question displayed the management passage and recurring-cost question. These were local functional checks. The later signed-in hosted checks and their limitations are described above.
