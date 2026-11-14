# FINN engineering evaluation

The executable evaluation separates deterministic contract correctness from live model quality. Do not describe fixture results as real-company AI accuracy.

## Reproduce

- `npm test` runs financial calculation, extraction, routing, network, provenance, security and recovery contracts.
- `node scripts/evaluate-financials.mjs` runs twelve synthetic cases three times. The cases use fictional issuers in three sectors; their figures are illustrative, never displayed as company research.
- Results: `evals/contract-results.json` and JSONL. The baseline represents the previous absence of automatic extraction. Three positive fixtures now produce accepted records; the negative fixtures remain rejected. Twelve cases are too small to establish population-level accuracy or a statistically demonstrated improvement.
- `npm run build && node scripts/verify-build.mjs` verifies the shipped Worker and investor-facing API boundaries.

## Automatic actuals

`POST /api/financials` accepts the same ticker and primary-document envelope as research. It first extracts explicit prose without an LLM. If fewer than two actuals are available, a bounded structured extraction uses the existing small-model route with fallback. The model proposes at most six records. Validation independently checks literal quotation, local metric/value/unit binding, one reporting period, explicit consolidation and adjustment scope. Guidance, YTD, mixed-period quotations, and ambiguous table columns are withheld. Accepted records are labelled machine-checked rather than manually reviewed. Generic numerical code performs comparisons; incompatible records remain separate.

The endpoint has an 18-second total budget, seven-second individual extraction attempts, the same provider reservations/cooldowns, and a source/configuration/user-keyed cache. The investor can read passages while extraction runs. Research synthesis remains a separate, user-scoped request, capped at three provider attempts and thirty seconds; extraction attempts get seven seconds and reasoning ten, preserving fallback time. Timeouts trigger a thirty-second cooldown. Provider limits are per Worker isolate, not a durable global quota.

When `AI_LOG_USAGE=true`, backend logs include purpose, route, duration, provider-reported token usage when supplied, cache hits, approximate reservations, rejection reasons and failure codes. They exclude keys, original passages and private network records. Token reservations are estimates, not a dollar-cost bill. Provider/model details are not returned to the investor UI.

## Remaining limits

The parser intentionally supports a narrow explicit-prose contract. It is not a general table-layout or OCR solution. Source discovery and indexing are generic but publisher restrictions, missing period context and partial excerpts may prevent extraction. Live model financial quality requires separately reviewed held-out real documents. The synthetic suite does not establish citation entailment for free-form analysis. The current UI explains data gaps rather than inventing figures.

## Three-minute phone demonstration

1. Brief: open the archived shortlist. Explain the selection reason, dates and coverage limits; routine disclosures remain available.
2. Open one event. Inspect the original exchange wording, then open company fundamentals. Filing-specific terms remain in the original exchange filing; Pull uses annual reports and raw transcripts.
3. INFY: inspect the current/prior evidence pair, deterministic change, and the completed-commitments filter. Open FY27 targets remain open.
4. Open evidence: the supporting passage is first; expand surrounding context and open the original page.
5. Open a synthetic contact: distinguish role relevance, dated experience, known contact and inferred overlap.
6. Enter an unseeded ticker with accessible originals. Let discovery/indexing/research/automatic actual extraction run; inspect missing evidence honestly.
7. Show evaluation results and a recovery contract, distinguishing fixtures from production observations.

## Submission steps requiring original material or an audience decision

- Export original coding-agent/LLM conversations and replace the placeholder in `docs/submission-email.md`. A reconstruction of this work is not an original export.
- Review source/history for secrets before changing the GitHub repository to public as required by the brief.
- Arrange evaluator access and test from an account outside the owner allowlist. Publishing an updated private build does not grant evaluator access.
- Send the covering email only after checking the links and attaching original sessions. No email has been sent by this workflow.

## Real primary-source checks, 14 November

Generic discovery found both HAVELLS and DABUR originals. Both first-choice BSE transcript downloads returned HTTP 403. Independently retrieved NSE archives of the actual issuer transcripts returned HTTP 200. Neither issuer had financial records in the application seed. The two inspected excerpts and their source/page metadata are in `evals/primary-cases.json`.

The literal parser extracted DABUR's explicitly consolidated revenue YoY growth from its quarter-ended-March header and management passage. It abstained on HAVELLS because consolidation was absent from the chosen quotation. Reported revenue growth is its own percentage metric; it is never substituted for revenue or constant-currency growth. These two cases establish a narrow real-source extraction/abstention behaviour, not general financial-table accuracy, a complete unseen-company comparison, or live LLM quality. The application now offers a separate, explicit recovery input for an HTTPS PDF on the exact NSE archive host with a filename bound to the selected ticker. Both example transcripts downloaded through the packaged `/api/document` endpoint with HTTP 200 (HAVELLS: 981,998 bytes, 9.26 s; DABUR: 339,900 bytes, 9.17 s). This is user-supplied recovery, not automatic alternate-source discovery, and downloaded identity/type still requires checking.

## Live model evaluation runner

`node scripts/evaluate-live-research.mjs` makes no calls. With locally configured backend keys, `node scripts/evaluate-live-research.mjs --live` runs twelve questions across five issuers, three independent trials, with at most one request per minute. It saves public evidence and answers plus latency, provider calls, reported tokens where available, and failure categories to `evals/live-review.json`. Credentials are never included. Review claim correctness, citation support and abstention before computing any accuracy score. This runner has been syntax-checked but its authenticated network run has not been completed here. Automatic approval review blocked the hosted authenticated smoke-check attempt because it contained a temporary site credential and document payloads; no successful hosted AI result is claimed for this revision.

The final local suite has 110 passing tests. The production Worker, finance renderer and frontend secret/provider scan also pass. The phone brief, research navigation and highlighted evidence screen were checked in the local preview. The deployment retains its owner-only audience; evaluator access and original session links remain submission steps.


## Review fixes and reproducible regression comparison

The production packaging bug was caused by manually concatenating modules and stripping imports. Vite now bundles the real Worker dependency graph. The packaged-artifact smoke test calls `/api/financials` for the reviewed seed, explicit prose from an unfamiliar synthetic ticker, and malformed input; it checks status and records rather than merely importing source modules.

`node scripts/evaluate-review.mjs` compares a frozen copy of the actual prior validator (`evals/review-baseline-validator.mjs`, copied unchanged from source commit `76207e11704da1a102343391a018971b10ea1113`) with the candidate on 15 synthetic cases, three repetitions each. The baseline passed 36/45 checks; the candidate passed 45/45. Three cases improved and none regressed: analyst-question rejection, explicit-quarter conflicts, and fiscal-year ranges. Raw rows and the gate result are in `evals/review-{baseline,candidate}.jsonl` and `evals/review-gate.json`. The gate passed, but the paired confidence interval includes zero; this small repeated deterministic suite is regression evidence, not statistically established population improvement or a live-model score.

Period parsing is shared between document indexing and extraction. Explicit quarter-ended dates take precedence over comparative quarter mentions. Bare quarter references cannot silently inherit a different document quarter. Fiscal ranges are normalised to the ending year. March year-end remains the assumption; non-March issuers need a fiscal-calendar configuration.

Research validation binds numerical claims to their local citation group and rejects some unsupported certainty. It does not prove semantic entailment, speaker identity outside the quoted span, or causality. Annual-report table/OCR extraction remains outside the reliable scope.

Critical event rules now take precedence over routine wording. Exact duplicate URLs are collapsed in the leading list, while distinct critical events at one issuer remain visible. A saved browser-local investigation appears before the filters. Contacts include role-specific synthetic expertise and the age/limits of their experience. Evidence focus matches the selected value and reporting period; when no supporting sentence can be isolated, the interface asks the user to inspect the original instead of highlighting a misleading fragment.
