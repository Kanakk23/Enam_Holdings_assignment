# Reproducible evaluation tools

These three unchanged Python standard-library scripts come from Alireza Rezvani's MIT-licensed Agent Regression Evals:

https://github.com/alirezarezvani/claude-skills/tree/08cd8a9fc86cc370e2c0d448e8171fbcfdbc5a30/engineering/agent-regression-evals/skills/agent-regression-evals

The upstream copyright and permission notice are retained in `LICENSE`. No API keys, external libraries or model calls are required. The tools grade our recorded evidence-review labels; they do not independently establish financial correctness.

From the repository root, after labels/raw results are present:

```sh
node scripts/review-live-research.mjs evals/live-baseline-review.json
node scripts/review-live-research.mjs evals/live-intermediate-review.json
node scripts/review-live-research.mjs evals/live-final-review.json
node scripts/verify-live-trajectories.mjs evals/live-baseline-raw.json evals/live-intermediate-raw.json evals/live-final-raw.json
python evals/tools/trajectory_checker.py --spec evals/live-trajectory-spec.json --results evals/live-final.jsonl --output json
python evals/tools/flake_detector.py --results evals/live-final.jsonl --k 3 --output json
python evals/tools/regression_gate.py --baseline evals/live-baseline.jsonl --candidate evals/live-final.jsonl --output json
python evals/tools/regression_gate.py --baseline evals/live-intermediate.jsonl --candidate evals/live-final.jsonl --output json
```

Flake detection exits 2 when outcomes vary; retain and report those cases rather than hiding them. The paired gate averages repetitions within each case. Keep all twelve cases and the critical missing-margin case. No quarantine is used. An unblocked gate on a small related suite does not prove broad reliability.
