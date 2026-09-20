# Animal game agent fleet

The fleet realizes the first coding assignment in `PROJECT_PLAN.md`: one
complete zebra encounter that establishes reusable foundations for the
ten-species expedition. Native Codex subagents run in parallel within the
same workspace. The gstack integration is documented in `GSTACK.md`.

## Ownership

| Role | Owns | Reviewable handoff |
| --- | --- | --- |
| Product and integration lead | Scope, app shell, UI, CSS, build configuration, integration, shared Kanban claim | Playable loop, commands, browser evidence, remaining gaps |
| World and animal engineer | `src/game/` implementation after shared contracts are agreed | Movement, encounter distance, behavior, photography, 3D specimen and cleanup |
| Content and save engineer | Species data, validation, progression, persistence and their logic tests | Cited zebra content, valid transitions, save/reload and corrupt-save behavior |
| Architecture and QA reviewer | `AGENTS.md`, fleet/tooling docs, acceptance plan, independent integrated review | Concrete findings, reproduction steps, verification and untested coverage |

The integrator owns `src/game/contracts.ts` and package/configuration changes.
Workers consult that contract and announce necessary changes before touching
another role's files. A role is a bounded assignment rather than a permanently
running agent. Additional agents must have useful independent work and an
explicit owner.

## Dispatch and handoff protocol

1. Inspect the existing shared GitHub Kanban card and claim it through the
   documented workflow. Subagents work under the parent claim.
2. Send each agent the scope, owned files, shared interfaces, non-goals, and
   acceptance criteria. Communicate that the filesystem is shared.
3. Workers inspect before editing, keep changes inside their ownership, and
   report contract conflicts promptly. Do not overwrite someone else's work.
4. Every handoff names changed files, commands actually run, results, known
   limitations, and any caller action required to integrate it.
5. The lead integrates. A different agent reviews the combined flow, because
   separately passing components can still fail at their boundaries.
6. Record the verified result and exact next step on the parent Kanban card.
   Do not infer a merge or deployment from a local build.

## Review gates adapted from gstack

These are this project's lightweight playbook, not a transcript of a full
upstream interactive skill run.

**Product gate:** Describe the first child's journey from entry to saved field
book. Keep the first coding assignment's zebra scope and Sophia's authorship.
Use existing product decisions instead of repeatedly requesting approval for
routine implementation details.

**Engineering gate:** Review architecture, code quality, tests, and performance.
Prefer explicit state transitions, browser-native storage and speech, and
plain Three.js. Challenge machinery that does not improve the zebra loop.
Map failure paths before the UI claims success.

**Code gate:** Trace every state value through all consumers. Prioritize lost
saves, unhandled asynchronous failures, invalid progression, leaked animation
loops, unreachable keyboard controls, and unsafe rendering. Report bugs with
specific source lines and observable impact. Separate demonstrated failures
from hypotheses and taste; do not manufacture a quota of findings.

**QA gate:** Orient from the actual rendered page, walk the full flow, inspect
screenshots, check browser errors, and test affected adjacent states. Record a
baseline, fix real issues, and repeat the affected path. See `V1_ACCEPTANCE.md`.

**Delivery gate:** Build and test results must refer to the integrated tree.
The handoff states which browsers/viewports were observed and which product
requirements remain. Public release still needs real child playtesting and
scientific review; automated checks do not stand in for either.

## Reusable task prompt

> Implement or review the bounded assignment below for Sophia's Wild World.
> Read AGENTS.md, docs/PROJECT_PLAN.md, docs/V1_ACCEPTANCE.md, and relevant
> existing source. You share the filesystem with other agents. Own only the
> named files; ask the coordinator before changing shared contracts or package
> configuration. Keep the current zebra scope, legibility, child privacy, and
> cited educational content. Report concrete changed files, checks actually
> run, results, integration instructions, and remaining risks. Do not create
> a duplicate Kanban card or claim a deployment, merge, scientific review, or
> user test that did not happen.
