# pi-extension-tinker

Tinker (Thinking Machines) provider for [pi-coding-agent](https://github.com/earendil-works/pi).

Uses Tinker's OpenAI-compatible chat-completions endpoint, so the plugin is a thin
provider registration: catalog + base URL + a slash command for `tinker://...`
training checkpoints.

## Install

```sh
cd your-pi-workspace
pnpm add /absolute/path/to/pi-extension-tinker
```

## Use

```sh
export TINKER_API_KEY=...
pi -e ./node_modules/pi-extension-tinker
```

Then in pi:

```
/model                                                  # pick a tinker/* model
/model tinker:0034d8c9-...:train:0/sampler_weights/000100   # training checkpoint
```

`/model` accepts arbitrary `tinker:<rest>` ids because the stream wrapper
translates them to `tinker://<rest>` before sending.

## Why this exists

Tinker's `/services/tinker-prod/oai/api/v1/chat/completions` is OpenAI-compatible.
Rather than vendor a parallel OpenAI client or duplicate pi-ai's OpenAI-Completions
stream, this extension registers a provider that points `pi-ai`'s existing
implementation at the Tinker base URL. Catalog, command, and a one-line
`toWireModelId` translation are the only custom code.

## What it does NOT do

- Does not implement the Tinker SDK (training, sampling client, RL). Use
  `pip install tinker` for those.
- Does not poll a model registry or refresh the catalog — refresh
  `./models.ts` when the Tinker docs table changes.
- Does not proxy around the Tinker beta's rate limits — see
  https://tinker-docs.thinkingmachines.ai/tinker/compatible-apis/openai/

## Files

- `index.ts` — provider registration. `toWireModelId` handles both catalog
  ids (`tinker/<path>`) and checkpoint ids (`tinker:<rest>` → `tinker://<rest>`).
  Delegates to `openAICompletionsApi()` from `@earendil-works/pi-ai/compat`.
- `models.ts` — flat catalog derived from
  https://tinker-docs.thinkingmachines.ai/tinker/models/
- `test.ts` — smoke test (catalog shape + id translation). `npx tsx test.ts`.

## Tinker docs we're implementing against

- Models & Pricing: https://tinker-docs.thinkingmachines.ai/tinker/models/
- OpenAI-Compatible API: https://tinker-docs.thinkingmachines.ai/tinker/compatible-apis/openai/
