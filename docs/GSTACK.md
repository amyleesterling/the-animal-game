# gstack setup record

## Active integration

The repository uses gstack's **official instruction-only tier**: the upstream
agent digest is included in `AGENTS.md`. The project review and QA playbook in
`AGENT_FLEET.md` adapts relevant practices from its engineering review, code
review, and QA skills. This works immediately for any agent that reads the
repository instructions, with no global configuration changes.

Codex's native subagents supply scheduling, messaging, and parallel work.
gstack supplies the review discipline. These are distinct systems; this
delivery does not claim that gstack launched the fleet or that a full gstack
skill invocation completed.

| Source | Pinned value |
| --- | --- |
| Repository | https://github.com/garrytan/gstack |
| Commit | `a6b3a57512ca6d5c6aa5b68f74f736195021f96e` |
| Digest version | `1.87.4.0` |
| Package version | `1.87.4` |
| Inspected | 2026-09-19 |
| License | MIT; retained in `GSTACK_LICENSE.txt` |

Relevant pinned upstream files:

- [Instruction-only installation documentation](https://github.com/garrytan/gstack/blob/a6b3a57512ca6d5c6aa5b68f74f736195021f96e/README.md).
- [Official agent digest](https://github.com/garrytan/gstack/blob/a6b3a57512ca6d5c6aa5b68f74f736195021f96e/agents-digest/gstack-AGENTS.md).
- [Engineering review](https://github.com/garrytan/gstack/blob/a6b3a57512ca6d5c6aa5b68f74f736195021f96e/plan-eng-review/SKILL.md) and [review sections](https://github.com/garrytan/gstack/blob/a6b3a57512ca6d5c6aa5b68f74f736195021f96e/plan-eng-review/sections/review-sections.md).
- [Code review checklist](https://github.com/garrytan/gstack/blob/a6b3a57512ca6d5c6aa5b68f74f736195021f96e/review/checklist.md).
- [QA workflow](https://github.com/garrytan/gstack/blob/a6b3a57512ca6d5c6aa5b68f74f736195021f96e/qa/SKILL.md) and [browser QA patterns](https://github.com/garrytan/gstack/blob/a6b3a57512ca6d5c6aa5b68f74f736195021f96e/qa/sections/qa-patterns.md).

## Setup inspection

The source was cloned beside this project at
`../gstack-animal-game-tools` and inspected. Bun was unavailable. Upstream's
full Windows setup requires Bun, Node.js, and Git Bash or WSL, and builds its
bundled browser. A native full installation was therefore not performed.

No gstack browser binary, external review provider, telemetry, global hooks,
model override, memory service, or tunnel was enabled for this project. The
upstream `pair-agent` browser-sharing feature is separate from the native
Codex collaboration used here and was not started.

The current project does not depend on the sibling clone to run or build.
The retained digest, attribution, and playbook are version-controlled.

## Optional full installation later

Use the pinned upstream setup documentation when the complete skill suite is
needed. For Codex the documented host option is `./setup --host codex`.
Inspect the pinned setup before running it and deliberately choose its
installation destination: the normal command registers user-level skills.
Do not represent it as project-local merely because the checkout lives here.

On Windows, verify Bun, Node.js, and Git Bash first. Keep optional telemetry,
outside model calls, browser tunnels, and global hooks subject to the user's
existing preferences. After installation, verify generated Codex skills and
the browser binary separately. Record their actual health before promising
slash commands or a gstack browser QA run.

To upgrade this digest integration, inspect a specific upstream commit,
replace the copied digest from that commit, update this record and license
as needed, and review behavior changes. Do not silently track a moving branch.
