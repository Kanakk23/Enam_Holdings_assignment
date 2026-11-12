# Verification and demo

## Automated checks

`npm test`: 17 deterministic checks passed. They cover missing/negative growth bases, volume baselines, timestamp windows, preserved routine disclosures, threshold changes, synthetic colleague overlap constraints, ticker validation, discovery excluding summaries, proxy URL restrictions, API malformed/missing inputs, exact-passage provenance, and strict finite snapshot JSON.

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

No physical iPhone/Android, assistive-technology user study or exhaustive accessibility certification was performed. No live model call or statistical model regression verdict is claimed. The synthesis adapter remains disabled because no user-provided free-tier key or model-evaluation baseline was available.

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
| Pull | Company question retrieves linked original passages; opening a passage preserves document/page identity | Extractive evidence, not verified financial analysis |
| Unseen symbol | Valid new ticker triggers the same discovery and PDF extraction pipeline | Source must be accessible and text-readable; scans require OCR |
| Network | Company/sector matches appear inside research and filing details; a known/inferred path exposes role-date evidence | Entire fixture is synthetic; overlap never confirms acquaintance |
| Source | Original URL, period, page and retrieval date are reachable and Back retains context | Original layout governs table interpretation |

## Remaining work before a strong final challenge submission

Add source-verified quarterly metrics and guidance comparisons; evaluate concise synthesis on unseen and conflicting documents; replace bounded filing-directory coverage with a complete exchange ingestion path; add a refresh/deploy cadence; and prepare the requested covering note and original build-history material. The repository and preview are implementation milestones, not a claim that every challenge opportunity has been completed.
