# Meshy test animal batch

Amy requested these animals on 2026-09-20. The nine species complete the
planned ten-species roster alongside the supplied zebra. This is an asset
test batch, not nine completed educational encounters.

The GitHub environment `MESHY_API_KEY` contains the secret `MESHY_API_KEY`.
The key is passed only to the generation step and only to Meshy's API as an
Authorization header. It is never placed in the browser, source, assets,
artifacts, or logged request/response bodies.

`scripts/meshy-test-animals.json` records the species prompts. Each model
uses Meshy T2 Smart Topology (target 4,000 triangles) followed by Meshy 7.1
2K texturing. Meshy's published estimate is 5 + 10 = 15 credits per animal,
135 for the batch. The runner checks API credit balance first, completes
the elephant as a pipeline pilot, then uses three workers for the remainder.
No automatic rigging, animation purchases, credit purchases, or retries of
chargeable requests are performed.

The workflow runs only when the explicit tag
`meshy-savanna-tests-20260920-v1` is pushed. Subsequent commits do not run it.
GitHub job reruns are deliberately skipped, preventing accidental repeat
billing. The generation step ends before the job timeout so the final
artifact step has time to preserve models and state.

The artifact `meshy-savanna-test-animals` retains the downloaded GLBs,
`manifest.json`, and `batch-state.json` with prompts, task IDs, status,
reported consumption, file hashes and sizes. No signed download URLs are
retained. Files are also downloaded locally for durable project storage.

If interrupted, download the state artifact and resume explicitly with
`node scripts/generate-test-animals.mjs --resume path/to/batch-state.json`
inside a trusted environment with the same secret. Existing task IDs are
polled instead of submitted again. A saved submission timestamp without an
ID is ambiguous: reconcile against Meshy's task list before proceeding;
do not clear the marker or restart an empty batch. A task that failed on
Meshy's side is retained for inspection, not automatically regenerated.

Documentation checked: https://docs.meshy.ai/en/api/text-to-3d,
https://docs.meshy.ai/en/api/balance, https://docs.meshy.ai/en/api/pricing.
The generated animals are static test assets. Anatomy, topology and
species-specific motion still need review.
