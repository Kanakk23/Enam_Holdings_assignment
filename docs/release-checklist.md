# Submission release checklist

## Prepared privately

- Working Push, Pull and embedded/direct synthetic Network workflows.
- Generic primary-source recovery and bounded automatic financial extraction, with deterministic comparisons.
- Backend-only keys, routing, caching, quotas, failure recovery and independently checked analytical claims.
- Reproducible tests, source provenance and raw repeated live trials with evidence-review labels and limitations.
- Original **Enam Labs** conversation located in the owner's signed-in account; see [original-session record](ai-session-record.md).
- [Covering email draft](submission-email.md). No email has been sent.
- Source/history credential-pattern scan and investor-bundle check; see `evals/release-secret-scan.json`. This is a bounded pattern scan, not a security certification.

## Close before external access

Disable `AI_EVALUATION_ENABLED`, remove the evaluation owner identifiers, redeploy that environment revision, and verify `/ops/evaluation` returns 404. Connection diagnostics must remain disabled. Keep credentials as backend secrets.

## Owner access decisions

| Item | Current state | Required action |
| --- | --- | --- |
| FINN demo | Owner-private | Approve a public demo or name evaluator viewers. Test outside the owner allowlist after the change. A public demo can consume the backend free-tier quota. |
| Assignment repository | Private | Make the reviewed repository public, as the brief requires. This exposes the complete Git history as well as current files. The connected GitHub tools do not provide repository-administration changes. |
| Original AI build session | Original conversation found; no public share/export created | Review the original and create an official share/export. A public link exposes the original prompts and replies. A reconstructed build log does not qualify. |
| Covering email | Draft only | Insert the actual accessible links, verify them, then explicitly authorize sending or send it yourself. |

Access has not been widened as a side effect of deploying or evaluating. The app, repository and conversation are separate sharing decisions. No billing settings or paid plan changes were made.

## Final review

Check the same demo from a non-owner session; confirm that source evidence and synthetic-data labels are visible; verify every email link; include the measured failures and scope limits alongside successes. Source access can still vary with publisher availability and provider quotas.
