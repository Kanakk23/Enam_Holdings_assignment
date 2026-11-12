# Product and interface decisions

FINN serves an investor opening their phone before a meeting or between research tasks. Its central loop is disclosure → question → evidence → relevant experience. The brief decides what deserves a closer look; the research view makes the original document easy to inspect; the network gives the investor a reason to speak with someone.

## Interaction model

We considered three models: a conversational research assistant, a company-first terminal, and a daily brief with linked investigations. Conversation is flexible but hides evidence and offers a weak daily starting point. A terminal supports deep research but asks the investor to select a company before noticing changes. The brief provides a reason to return, while company research and People remain directly accessible. It is the chosen model.

## Visual direction

A dark terminal and a light research desk were plausible directions. We selected the research desk because FINN asks for sustained document reading and frequent phone use. Cool paper, ink text, quiet separators, a restrained blue action colour and amber review status make sources and actions easy to distinguish. Colour carries state rather than decoration.

The domain is filings, reporting periods, operating assumptions, source passages, management commentary and professional experience. The signature is the visible paper trail: an item leads to a question, a numbered excerpt opens a page-specific source, and an experience match explains its relevance and uncertainty. No decorative charts, generic metric tiles, stock imagery, gradients or animated page entrances are needed.

IBM Plex Sans is self-hosted. Reading text is 14–16 px; 12 px is the metadata floor in most desktop contexts, with compact 10–11 px metadata on narrow screens. Headings use weight, measure and spacing rather than display effects. Numeric rows use tabular figures, INR formatting and consistent decimals. Controls generally provide at least 44 px targets. The page uses one prominent first disclosure and quieter following rows rather than an equal-weight card grid.

## Essential screens

| Screen | Primary action | Content order | Context and secondary actions |
| --- | --- | --- | --- |
| Brief | Investigate a disclosure | Title, time/company filters, coverage, priority items, collapsed routine items, threshold signals, EOD rows | Reviewed state and filters persist while inspecting details |
| Filing detail | Read original or research question | Publication metadata, reason to investigate, original filing link, relevant indexed evidence, research action, people | A rule-based reason is clearly a research prompt, not a summary of an unread PDF |
| Research | Find evidence for a company question | Symbol entry, question, coverage, relevant people, source excerpts | Unknown symbols enter document discovery; original PDFs must be readable |
| Source | Verify a passage | Document identity/period, original link, PDF page, exact quote, retrieval date | Internal Back returns to the prior view and scroll position |
| Person | Assess whether a conversation would help | Role/tenure, relevance, relationship path and uncertainty, preparation prompts | Solid segment means supplied acquaintance; dashed segment is an inferred overlap |
| People | Find experience | Search, synthetic-data disclosure, matching roles/tenures | Opens the same person detail used inside research |
| Preferences | Change scope/thresholds | Price and volume thresholds, date range | Native modal dialog, Escape handling and focus return |

On a phone, navigation becomes three fixed bottom destinations. The opening viewport presents the current scope and the lead disclosure. Tables remain compact rows with company, price and change, while supporting names and dates sit beneath. Research and source passages use the full reading width. Desktop adds a persistent portfolio sidebar and wider source sheet; extra space serves text measure rather than additional decorative panels.

## Trust and restraint

Annual-report periods are not publication dates. Report indexing dates are labelled; filing timestamps come from the directory's linked disclosure records. Market rows show the last complete close, not the newest row with missing prices. Snapshot coverage is bounded and visible. A failed source is not evidence that no event occurred.

Contact matching is deterministic: same company, then sector, with explicit relationships separately recorded. Employment overlap establishes only a possible colleague path. All identities, roles and relationships in the prototype are synthetic. No real contacts were collected or scraped.

## Next work

The remaining gaps are automatic financial extraction beyond the reviewed sample, complete refreshed exchange coverage, and live model evaluation. The comparison workspace now calculates from source-reviewed inputs and refuses incompatible or unresolved records. These data-quality improvements should precede more screen types.


## Financial comparison extension

The research screen adds a statement table rather than metric tiles. A period selector and explicit statement/consolidation/currency controls establish the comparison context. Values link to source pages; QoQ/YoY changes disclose their formulas and evidence pairs. On narrow screens each metric becomes a two-column row with the value above the two change labels. There is no decorative chart.

The guidance history uses four dated rows. Each separates the quarter in which management spoke from the period the target covers. Open target years remain unjudged. A completed range receives a result only when metric, period, currency, consolidation, statement basis and adjustments match. Unqualified adjustment treatment stays unresolved.

The source reader offers a collapsed evidence-recording form. It requires literal number support and an explicit source check; it is a review workflow, not an implication that the model verified the number. Comparison controls are retained when opening evidence and returning. Short reviewed table-cell extracts identify their omitted columns and link to the full original layout.

This extension retains the existing type, colour and spacing system. Server rendering was checked. A fresh visual/mobile browser pass is still needed because automatic approval review blocked the browser session at its usage limit.
