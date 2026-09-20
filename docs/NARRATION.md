# Tanzanian English narration

The selected narrator is Azure's `en-TZ-ElimuNeural`, a male Tanzanian English
voice. The recording request uses `en-TZ` and the voice's natural delivery,
without pitch changes, invented phonetic spellings, or a performed caricature.
The [Azure voice catalog](https://learn.microsoft.com/en-us/azure/ai-services/speech-service/language-support)
and [REST synthesis reference](https://learn.microsoft.com/en-us/azure/ai-services/speech-service/rest-text-to-speech)
were checked on 2026-09-20. Recordings still await an Azure Speech credential
and listening review; an empty runtime manifest does not mean audio exists.

## Authoring and credentials

`src/content/narration.ts` is the shared source of exact clip IDs and text used
by the game and generator. The generator bundles that TypeScript module in
memory with the existing Vite dependency; it does not install another SDK.
Only authored game text is sent to Azure during this build step. Browser
players do not receive the Azure credential or call Azure synthesis.

Add these **repository Actions secrets** in GitHub Settings → Secrets and
variables → Actions → New repository secret:

- `AZURE_SPEECH_KEY`: the key of an Azure Speech resource.
- `AZURE_SPEECH_REGION`: that resource's public Azure region ID, such as
  `eastus`. This is a region identifier, not a URL or voice locale.

Keep the key out of source files, chat, command-line arguments, and public
artifacts. Local generation accepts the same environment variable names from
an existing secure environment; the script does not load `.env` files.
It checks credential presence and the reviewed region allowlist before any
synthesis. Key values and Azure response bodies are not logged.

## Preview and generate

From the repository root after `npm ci`:

```sh
node scripts/generate-narration.mjs --dry-run
node scripts/generate-narration.mjs --dry-run --sample
```

These commands make no network requests or output recordings. The current
catalog has 77 unique clips and 10,866 text characters; the printed result is
authoritative if the catalog changes. Bounds are 128 clips, 40,000 total text
characters, and 3,000 per clip. This is a text-count preview, not a price quote.

Once the credentials are configured:

```sh
node scripts/generate-narration.mjs --sample
node scripts/generate-narration.mjs
```

The sample sends only `narrator-sample`. It writes under
`generated/narration/sample/` and produces `sample-manifest.json` with
`kind: "sample"` and `completeBatch: false`. It cannot be mistaken for the
full runtime manifest. Listen to this sample before generating the full
catalog when a voice audition is needed. A separate sample request is in
addition to that clip's request in a full batch.

Full generation stages files under `generated/narration/`. It sends one
sequential request per pending clip, with a 45-second timeout per response
and a 60-minute batch time budget. It requests 24 kHz, 96 kbit/s mono MP3,
checks complete MP3 frames, caps each response at 8 MiB, and records SHA-256
hashes. A successful batch creates this manifest contract:

```json
{
  "version": 1,
  "voice": "en-TZ-ElimuNeural",
  "locale": "en-TZ",
  "clips": [
    {
      "id": "narrator-sample",
      "text": "Exact authored text",
      "path": "audio/elimu/narrator-sample-<first12OfAudioSha256>.mp3",
      "sha256": "<fullAudioSha256>"
    }
  ],
  "generatedAt": "<ISO timestamp>"
}
```

`batch-state.json` additionally binds every clip to its exact text, voice,
SSML, and audio format. It contains request status and file receipts, never
the API key. No generation command writes to `public/` or to the runtime
manifest in `src/content/`.

## Resume and uncertain requests

Repeat the same command in the same staged directory to resume. Completed
clips are skipped only after their fingerprints, filenames, audio hashes,
sizes, and MP3 structure validate. Untouched `PENDING` clips can continue.
Every existing receipt is checked before another paid request is sent.
A changed catalog, missing or tampered audio, or a different voice/format
blocks generation rather than silently purchasing replacement recordings.

The durable `SUBMITTING` checkpoint is written **before** each POST. No POST
is retried automatically—not after a timeout, HTTP error, interrupted body,
invalid audio, or file failure. Such a clip remains `SUBMITTING` or
`UNCERTAIN`, and a later invocation stops before sending another request.
Azure synchronous synthesis has no stored task ID in this workflow from
which the script can retrieve a lost response. Preserve the receipts and
any audio, check Azure usage, and have the maintainer explicitly resolve the
uncertainty before commissioning a replacement. Do not clear a marker just
to make the command continue.

`generation.lock` excludes concurrent local runs. A crash can leave it
behind. Confirm the process has stopped, preserve the output, then remove
only that lock to inspect/resume; uncertainty markers remain binding.

## GitHub Actions and publication

The `Generate Tanzanian English narration` workflow supports manual dispatch
with `sample` (default) or `full`. A first full run can also use the exact
one-shot tag `narration-elimu-20260920-v1` before this workflow reaches the
default branch. Keep the tag immutable. No workflow was triggered as part
of writing the generator.

The workflow checks credentials before API calls, rejects reruns, serializes
all narration runs, and checks prior Actions jobs before synthesis. A fresh
dispatch is also refused if a previous paid synthesis step for the same
mode started. A failure before the paid step, such as missing credentials,
can be corrected with a new dispatch. Workflow permissions are read-only:
`contents: read` for checkout and `actions: read` for the duplicate-run guard.

The artifact step runs after success or failure so receipts and partial
recordings can be recovered. Download the original artifact into
`generated/narration/` to resume locally; do not start a fresh cloud batch to
replace partial work. Cancellation or infrastructure failure can prevent an
artifact upload, which requires manual billing/receipt review.

After a **complete** batch, independently verify every manifest clip against
the current catalog and audio hash, listen for pronunciation and truncation,
and check the game. Then copy the staged `audio/elimu/` files to
`public/audio/elimu/` and the complete staged `manifest.json` to
`src/content/narration-manifest.json`. Publish those together. Never copy a
sample manifest or publish a partially generated catalog.

Offline tests use fake credentials and injected responses. They cover
catalog bounds and escaping, credential/host guards, checkpoints before
POST, uncertain failures without retry, exact resume validation, concurrent
locks, audio rejection, and sample isolation. They do not verify Azure
availability, pronunciation, accent quality, or listening comfort.

## Verification on 2026-09-20

- Full unit suite: 140 tests passed. The final runtime and asset integrity
  checks also passed after playback cleanup changes.
- Production build and TypeScript checks passed. The recording dry run found
  77 clips and 10,866 text characters without contacting Azure.
- Independent runtime/caller review led to fixes for dialog-owned playback,
  visible field-book errors, and volume changes during a preview.
- Three focused browser tests passed together: shuffled question order,
  settings/field-book error visibility, and phone preview volume/close behavior.
  They use mocked device speech and a pending manifest, not generated Elimu audio.
  They skip hosted runs because the fixture intercepts local Vite source modules.
- Chromium settings were inspected at 1280 × 800 and 390 × 844. Functional
  controls remained readable and the inspected pages had no console errors.
  The local voice identified by this Windows browser was Microsoft David,
  English (United States); this was not an Elimu audition.
- The empty manifest remains deliberately pending. No paid synthesis,
  generated Elimu recording, or deployment has occurred. Actual pronunciation
  and physical iPhone/Android playback still need verification after generation.
