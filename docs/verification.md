# Verification and demo

## Automated checks

`npm test`: 66 checks pass, including 3,300 generated property cases. The original 17 checks cover missing/negative growth bases, volume baselines, timestamp windows, preserved routine disclosures, threshold changes, synthetic colleague overlap constraints, ticker validation, discovery excluding summaries, proxy URL restrictions, API malformed/missing inputs, exact-passage provenance, and strict finite snapshot JSON.

`npm run build`: Vite production client and a standalone Worker ESM build. PDF.js is a lazy chunk; IBM Plex is self-hosted. The PDF worker is fetched only for PDF indexing.

`node scripts/verify-build.mjs`: exercises the built Worker without an asset binding. Checks the page, real bundled script, snapshot, default no-key research API, source provenance and unknown-file 404.

Python ingestion was run against real issuer PDFs and all 18 EOD symbols. BSE-link discovery captured 89 recent filing records, with per-company coverage in the snapshot. Seven source documents were indexed across Infosys, TCS, Coforge, Persistent Systems and Tata Consumer Products. Inaccessible original PDF URLs remain in the ingestion error log.

## Browser checks performed

- Actual desktop page and a 390 CSS-pixel iframe running the same app and media queries; this is responsive-layout QA, not a physical-device test.
- Phone navigation through research, a page-specific source reader, Back, an embedded contact, People search and an inferred colleague path.
- Preferences open as a native modal; Escape closes it and restores focus to the invoking control.
- Narrow-screen DOM check: no horizontal overflow (375 px content area inside a 390 px frame with a scrollbar).
- Generic discovery for an unseeded HCLTECH symbol returned original report/transcript choices. Those BSE-hosted documents are subject to publisher access limits; no unsupported company answer was filled in.
- Original Coforge October transcript downloaded and indexed through PDF.js in the browser, then appeared as page-specific exact excerpts. This verifies actual client PDF parsing, not a simulated progress state.

No physical iPhone/Android, assistive-technology user study or exhaustive accessibility certification was performed. No live model call or statistical model regression verdict is claimed. The original synthesis adapter was disabled because no user-provided free-tier key or model-evaluation baseline was available. See the API connection update below for the current setup.

## Three-minute phone demo

1. **0:00–0:40:** Open Brief. Show the current window and cached coverage. Open a prioritised disclosure and its BSE original link; explain why a transcript merits investigation and routine notices remain collapsed.
2. **0:40–1:35:** Open Research → COFORGE. Ask about margins or cash flow. Show exact passages from different calls, open a PDF-page source and return with context preserved.
3. **1:35–2:15:** Open a suggested person. Show role dates and the synthetic-data label. Search People for Mira Shah to demonstrate a known contact plus an explicitly inferred colleague overlap, rather than a fabricated friendship.
4. **2:15–2:40:** Return to Brief and show the EOD volume signal. Open Preferences, change the threshold, and show that the criterion is investor-controlled. Restore the demonstration value.
5. **2:40–3:00:** Enter an unseeded symbol and discover sources, or show Find more reports & transcripts → an issuer-hosted Coforge transcript → browser extraction. State the source-access and model limitations plainly.

## Acceptance boundaries

| Workflow | Observable result | Boundary |
| --- | --- | --- |
| Push | Window/company filter changes records; priority reasons are visible; routine records can be expanded; review status persists | Cached, bounded source coverage; no background notification delivery |
| EOD trigger | Changing thresholds changes qualifying signals with a displayed reason/session | Last complete available session, not intraday monitoring |
| Pull | Company question retrieves original passages; reviewed financial records support source-linked arithmetic and guidance comparisons | Financial coverage depends on reviewed records; no automatic table extraction; model synthesis requires a valid connected key |
| Unseen symbol | Valid new ticker triggers the same discovery and PDF extraction pipeline | Source must be accessible and text-readable; scans require OCR |
| Network | Company/sector matches appear inside research and filing details; a known/inferred path exposes role-date evidence | Entire fixture is synthetic; overlap never confirms acquaintance |
| Source | Original URL, period, page and retrieval date are reachable and Back retains context | Original layout governs table interpretation |

## Remaining work before a strong final challenge submission

Extend the reviewed metrics to automated extraction and additional companies; evaluate concise synthesis on unseen and conflicting documents; replace bounded filing-directory coverage with a complete exchange ingestion path; add a refresh/deploy cadence; and prepare the requested covering note and original build-history material. The repository and preview are implementation milestones, not a claim that every challenge opportunity has been completed.


## Financial extension verification — November 13, 2026

The extension adds generated-input checks for reporting-unit equivalence, common-scale invariance of growth, identity comparisons, period-offset roundtrips, and order-independent conflict detection. Across these properties, 3,300 generated cases run per suite execution. Regression cases cover non-positive bases, reported/adjusted mismatches, incompatible accounting/currency/periods, rounded figures, invalid dates, missing source IDs and long repeating calculated decimals.

Every reviewed seed value and guidance bound is checked against its selected source excerpt, document identity and page range. A completed FY26 constant-currency guidance range resolves to a matched annual management-reported actual. FY27 targets remain open; margin guidance with unclear adjustment treatment is not judged.

`node scripts/verify-finance-render.mjs` checks server-rendered output for quarterly figures and calculated changes, annual consolidated totals, an adjusted-period comparison, source-linked guidance states, the unseen-company empty state and the evidence form. This is not a browser interaction test. The production Worker artifact is also checked with `scripts/verify-build.mjs`.

The latest browser attempt was rejected by automatic approval review because the session usage limit was reached. No alternate browser or headless workaround was used. The previous prototype's browser checks remain historical evidence only; the new financial layouts need a fresh visual and interaction pass.

Live model synthesis remains disabled: there is no configured model key. No paid API call or live model quality evaluation was performed.

For the updated phone demo, open Research → INFY. Inspect Q2 FY27, open a change and its sources, then select FY26 / Ind AS to inspect annual totals. Compare reported versus adjusted Q4 FY26 margins and the four-call revenue-guidance ledger. Open a source and demonstrate the generic reviewed-record form. The selected period and basis should be retained on return.

## Investor workflow revision — 13 November 2026

43 automated tests pass, including 3,300 generated arithmetic/conflict cases. New checks cover source-paired findings, exclusion of conflicting figures, empty answers for unseen symbols, natural network search, topic-sensitive recommendations, retained full-page context and independent refresh failures. Production build, standalone Worker checks and server-rendered finance checks pass. Browser checks use a 390 CSS-pixel iframe rather than a physical device.

The phone walkthrough verified that margins/cash comparisons appear on the first viewport, their links open original-page text, completed commitments exclude unfinished targets, and the previously failing natural network query returns relevant experience. A network query is a lexical/synonym match, not general semantic reasoning.

The live portfolio refresh completed all 18 market and filing checks in this browser. A fresh DIXON attempt discovered original documents, attempted two PDF imports, then exposed the publisher 403 and local-copy recovery controls. Unseen-company financial extraction was not completed. Browser review caught a topic-ranking bug that could suggest an unrelated sector for an unknown ticker; the role bonus now requires a company/sector match and a regression test covers it.


## API connection update

Groq, OpenRouter and Gemini now share a bounded server-side synthesis adapter. AI setup accepts a password-masked key, tests one short completion, and retains a successful session configuration only in React memory. The key is not persisted to browser storage or rendered markup. Disconnect removes the session key; reload clears it. Operator environment secrets remain an alternative, and the local development server now forwards its non-client-prefixed environment values.

The 23 new deterministic integration tests exercise fixed provider destinations, authentication headers, bounded prompts/tokens, absence of external tools, free-only OpenRouter routing, safe authentication/quota/model/network errors, no retry or paid fallback, empty/truncated/invalidly cited output, request limits, same-origin checks and credential redaction. They also verify default zero-call behaviour, source preservation after failure, and unseen browser-indexed evidence with explicit unverified-text provenance. The entire suite has 66 checks, including the existing 3,300 generated financial cases. Provider responses in these integration tests are controlled fixtures; they do not establish real model accuracy.

`node scripts/verify-model-render.mjs` checks server-rendered password controls, provider choices, no rendered credential, session/privacy copy and citation buttons. `node scripts/verify-build.mjs` exercises the standalone production Worker. A fresh browser inspection of the API setup was blocked by the browser URL security policy; no alternate browser path was used. No valid user key was available for authenticated live completion or statistical model comparison. These remain explicit verification limits.
