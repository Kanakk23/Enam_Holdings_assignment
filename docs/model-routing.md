# Backend model routing

The challenge's page 4 treats cheap extraction, selective stronger reasoning, caching and chunking as examples of good engineering judgment. Multiple models are an efficiency choice, not an additional investor-facing feature.

## Tasks and choices

| Task | Primary | Fallback | Design rationale |
| --- | --- | --- | --- |
| Select literal financial/business evidence | Groq GPT-OSS 20B | Gemini 3.5 Flash-Lite | Structured selection is smaller than writing a research note. Exact quotes can be checked mechanically. |
| Interpret guidance, compare accounts across periods, discuss narrative versus results | Gemini 3.8 Flash | Groq GPT-OSS 120B | Reserve a stronger model for synthesis across several sources. |
| Financial arithmetic and comparability | Decimal calculations | Withhold result if inputs are missing/incompatible | Models do not compute growth, convert currencies or resolve statement-basis conflicts. |
| Filing priority and network relationships | Deterministic rules and supplied role dates | Explicit missing/uncertain states | No model credits or personal-profile transmission are required. |

These choices are hypotheses based on documented capabilities and constraints. No live financial-analysis benchmark has established that any of these models is the best. Models are pinned and allowlisted on the server. The retired Llama free-tier routes and paid-only Gemini Pro route are excluded. The Gemini reasoning route uses low thinking; extraction uses minimal thinking. Groq uses low reasoning effort. No search, URL-context, code-execution, grounding or agent tools are enabled.

Sources checked on 14 November 2026: [Groq supported models](https://console.groq.com/docs/models), [strict structured output support](https://console.groq.com/docs/structured-outputs), [deprecations](https://console.groq.com/docs/deprecations), [free-plan limits](https://console.groq.com/docs/rate-limits), [Gemini pricing](https://ai.google.dev/gemini-api/docs/pricing), [Gemini 3.8 Flash](https://ai.google.dev/gemini-api/docs/models/gemini-3.8-flash), and [thinking levels](https://ai.google.dev/gemini-api/docs/thinking).

## Execution

1. Validate the request. Accept only ticker, question and bounded browser-indexed primary documents. Reject client credentials and routing instructions.
2. Choose the task in code. Explicit arithmetic requests bypass models. Analytical prompts receive up to eight relevant passages; ordinary evidence questions receive four.
3. Remove duplicate source/page text and cap each passage at 1,800 characters. No model sees the full repository, network profiles or unrelated company documents.
4. A short ordinary question makes one structured extraction request. Each returned quote must occur verbatim in its numbered input. The interface receives up to three original extracts, within 180 words, with source-reference buttons. There is no separate rewriting call.
5. A short analytical question goes directly to the stronger model. For more than four retrieved passages, at most two four-passage extraction chunks first reduce the context. Invalid or unavailable compression can leave the original context available for reasoning within the same request budget.
6. The reasoning output must contain valid references and cannot introduce numerical tokens absent from cited text. This does not establish semantic entailment or repair ambiguous financial-table layout. Unsupported output is withheld.
7. Provider availability/quota failures permit only the relevant allowlisted fallback. Invalid evidence, truncated output, invented numbers and citation failures do not trigger another writer call. Original source passages remain accessible.

Quote extraction does not automatically add financial records to the reviewed ledger. Financial-table automation remains separate unfinished work; a quotation without a trustworthy period, unit and statement basis is insufficient for arithmetic.

## Bounds and caching

- At most three provider attempts per investigation, including failed attempts and fallbacks; a 30-second model-work deadline bounds the whole sequence, with each individual request capped at 25 seconds or the remaining budget.
- A bounded 64-entry, 30-minute LRU cache holds successful answers and extraction results in Worker memory. An in-flight map coalesces identical concurrent requests.
- Cache keys hash the original bounded evidence, question, ticker, prompt/routing version, backend model configuration, credentials and authenticated user scope. Only hashes appear as cache keys. The platform's trusted user header supplies scope; the existing owner-private service boundary covers identity-less operator requests.
- New source content, changed questions, changed credentials/model settings, cache expiry or deployment produces fresh work. Ordinary source refresh does not blindly regenerate every answer.
- Conservative token reservations include estimated input and the output cap before each request. Defaults are six calls per provider per minute, 7,000 estimated tokens/minute for Groq and 18,000 for Gemini, configurable downward or within bounded maxima on the backend.
- Quota failures cause a one-minute model cooldown; authentication/model errors cause ten minutes; availability failures cause fifteen seconds. There is no immediate retry loop.
- Output caps include reasoning tokens. Hitting a limit is an incomplete result, not a successful note.

Caches, request reservations and cooldowns are per isolate. They are not a durable queue or a globally enforced provider quota. Provider limits apply at the account/project level and can vary. Multi-instance production needs a shared limiter and private durable cache, rather than claiming these local counters cover every request globally.

## Keys and privacy

Only `GROQ_API_KEY` and `GEMINI_API_KEY` server secrets are used. `ENABLE_FREE_MODEL=true` opts into calls. The local `npm run configure:ai` command collects keys in a terminal without echo and saves the Git-ignored `.env.local`; it does not configure hosted runtime secrets. No provider/key controls are shipped to investors. `/api/model/test` has been removed, health exposes no configuration, and response serializers omit routing, credentials and budget traces.

Use Groq Free and a Gemini project without billing enabled. The server cannot inspect a key's billing arrangement; an allowlist of models that have free tiers cannot stop a separately funded provider account from billing normal usage. FINN does not buy credits, upgrade plans or choose paid-only alternatives.

Provider inputs contain the investor's question and bounded public-document excerpts. The network remains outside model prompts. Gemini's free-tier policy allows product improvement from submitted content: private notes and real personal profiles should not be submitted under this prototype arrangement. Questions must not contain confidential investor information. A real deployment needs the corresponding privacy/consent agreements and access model before expanding data scope.

Optional server logs show task, model, number of calls, cache hits and estimated reservations. They omit questions, tickers, profile identities, document contents and credentials. Model configuration is documented here for engineering review, rather than shown as product controls.

## Validation boundary

The tests repeat 30 task-routing cases three times and exercise both provider fallbacks, cache/deduplication, scope separation, source invalidation, bounds and source-preserving failures using controlled responses. The production build checks backend-only credentials and scans client bundles for provider/model identifiers and removed setup controls. This validates orchestration and data boundaries, not real model accuracy, measured latency or dollar savings. Both hosted keys have since passed authenticated model-list checks. A live paired quality evaluation on unseen issuers, missing evidence and conflicting periods is still needed; Gemini generation timed out in the tested request.


## Live access diagnostics

`AI_CONNECTION_DIAGNOSTICS=true` temporarily makes the private deployment's health handler query authenticated model-list endpoints and write redacted results to backend logs. The health response itself remains `{ok:true}`. Metadata checks do not generate model tokens. Results are cached for five minutes per backend credential configuration, and the flag is disabled after checking. `AI_LOG_USAGE` separately enables safe outcome categories, upstream HTTP statuses and counts; full prompts, response text and credentials are excluded.

Long-page context is centred on the matched source passage rather than always taking the first 1,800 characters. If a reviewed table label is not contiguous original prose, query terms select a bounded window of original page text. Whitespace-only quotation differences are resolved to the original source bytes; numerical or punctuation changes still fail validation.
