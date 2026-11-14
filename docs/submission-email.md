Subject: IIT Kanpur – Founding AI Engineer - 2027

Draft only. Before sending: arrange evaluator access, make the reviewed repository public, and add the ORIGINAL AI session export/share links. This file is not a substitute for those sessions.

Hello,

I built FINN around a connected investigation: a portfolio disclosure leads to primary evidence, comparable financial movements, and someone with relevant experience in the investor's network.

Prototype: https://finn-research-brief.kanakxaviers123.chatgpt.site (currently owner-private; evaluator access must be arranged)
Repository: https://github.com/Kanakk23/Enam_Holdings_assignment (currently private)
AI build sessions: [Add original exports/share links before submission]

The prototype includes an 18-company brief with configurable EOD thresholds, primary-document discovery for arbitrary NSE symbols, source-linked comparisons and guidance assessment, and a clearly synthetic network. The comparison and evidence-review logic is generic; the reviewed financial cache is currently concentrated on Infosys. Additional company sources are included, with narrower coverage.

I chose deterministic decimal calculations and explicit basis/period matching for numerical claims. A backend router uses Groq GPT-OSS 20B for structured evidence extraction and Gemini 3.8 Flash for cross-document reasoning, with Gemini Flash-Lite and Groq GPT-OSS 120B as bounded fallbacks. Keys and model choices are absent from the interface. Source/query caching, chunk limits and cooldowns reduce repeat calls; arithmetic and network matching use no LLM. Both backend keys passed authenticated access checks. Groq generation and the stronger fallback responded; Gemini generation timed out in the tested request. A full financial-quality evaluation remains unfinished. The selected models have free tiers; no paid service subscription was purchased.

React and PDF.js run in the browser; a Worker serves the app and restricts primary-PDF retrieval to discovered source URLs. Yahoo EOD data and exchange-link metadata refresh on demand in bounded requests, with five-minute server caching. Partial failures retain previous observations and remain visible. Filings are a bounded directory sample, not a complete exchange feed.

Contacts are fictional demonstration inputs. Real deployments would require tenant-scoped access controls, consented imports, provenance and deletion controls. Public reports can go to an inference provider; private relationship data should remain outside those requests. Browser-local prototype data is not a multi-user backend.

I deliberately left out trading, real-time alerts, unrestricted web answers and general table-layout extraction. Automatic extraction now proposes explicit prose actuals, validates their quotation, metric/value binding, period and accounting basis, and feeds deterministic comparisons. The regression suite compares the actual previous validator with the candidate across 15 synthetic cases repeated three times (36/45 to 45/45 checks). Packaged-Worker smoke tests exercise the financial endpoint, and an explicit official-NSE recovery path has downloaded two unseeded issuers’ PDFs. These checks do not establish real-company AI accuracy. Next I would expand reviewed coverage, evaluate extraction and synthesis on unseen documents, and add durable private storage and an unattended refresh/publication pipeline.

Regards,
Kanak Khandelwal
IIT Kanpur, graduating May 2027
