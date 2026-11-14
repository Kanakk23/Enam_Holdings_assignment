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
2. Open one event. Inspect the original exchange wording, then follow its operating question into research.
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

The literal parser extracted DABUR's explicitly consolidated revenue YoY growth from its quarter-ended-March header and management passage. It abstained on HAVELLS because consolidation was absent from the chosen quotation. Reported revenue growth is its own percentage metric; it is never substituted for revenue or constant-currency growth. These two cases establish a narrow real-source extraction/abstention behaviour, not general financial-table accuracy, a complete unseen-company comparison, or live LLM quality. NSE retrieval was an independent evaluation source; the application's discovered-URL proxy was not silently relaxed.
