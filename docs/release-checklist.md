# Submission release checklist

## Prepared

- Working Push, Pull and embedded/direct synthetic Network workflows.
- Generic primary-source recovery and bounded automatic financial extraction, with deterministic comparisons.
- Backend-only keys, routing, caching, quotas, failure recovery and independently checked analytical claims.
- Reproducible tests, source provenance and raw repeated live trials with evidence-review labels and limitations.
- Original **Enam Labs** conversation located in the owner's signed-in account; see [original-session record](ai-session-record.md).
- [Covering email draft](submission-email.md). No email has been sent.
- Source/history credential-pattern scan and investor-bundle check; see `evals/release-secret-scan.json`. This is a bounded pattern scan, not a security certification.

## Operator route closure

The release environment sets `AI_EVALUATION_ENABLED=false` and removes the evaluation owner identifiers. Connection diagnostics remain disabled. Environment revision 11 is deployed. The production worker log confirms `/ops/evaluation` returned HTTP 404; see `evals/release-deployment-verification.json`. Credentials remain backend secrets.

## Submission access and remaining actions

| Item | Current state | Required action |
| --- | --- | --- |
| FINN demo | Public; hosting access revision 2 | The owner explicitly requested public access on 15 November. The live browser page loads. An anonymous command-line request returned HTTP 403/1010, so access from a separate visitor browser remains unverified in this environment. |
| Assignment repository | Public | Changed by the owner; verified through repository metadata and an unauthenticated GitHub API request (HTTP 200). |
| Original AI build session | Original conversation found; no public share/export created | Review the original and create an official share/export. A public link exposes the original prompts and replies. A reconstructed build log does not qualify. |
| Covering email | Draft only | Insert the actual accessible links, verify them, then explicitly authorize sending or send it yourself. |

The owner explicitly authorized making FINN and the repository public. The original conversation has not been shared publicly. No billing settings or paid plan changes were made. Public use shares the backend free-tier allowance.

## Final review

Check the same demo from a non-owner session; confirm that source evidence and synthetic-data labels are visible; verify every email link; include the measured failures and scope limits alongside successes. Source access can still vary with publisher availability and provider quotas.
