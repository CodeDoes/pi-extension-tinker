/**
 * Tinker (Thinking Machines) provider extension for pi-coding-agent.
 *
 * Uses Tinker's OpenAI-compatible chat-completions endpoint:
 *   POST https://tinker.thinkingmachines.dev/services/tinker-prod/oai/api/v1/chat/completions
 *
 * Auth: TINKER_API_KEY env var (Bearer).
 *
 * Usage:
 *   export TINKER_API_KEY=...
 *   pi -e ./pi-extension-tinker
 *   /model                                       -> pick a tinker/* model
 *   /model tinker:0034d8c9-...:train:0/...       -> switch to a training checkpoint
 *
 * `model.id` flows to Tinker's `model` parameter:
 *   - Catalog id    "tinker/<hf-path>"    -> <hf-path>
 *   - Arbitrary id   "tinker:<rest>"       -> "tinker://<rest>"  (training checkpoints)
 */

import {
	type Api,
	type Context,
	openAICompletionsApi,
	type Model,
	type SimpleStreamOptions,
} from "@earendil-works/pi-ai/compat";
import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";
import { TINKER_MODELS } from "./models.ts";

const TINKER_BASE_URL = "https://tinker.thinkingmachines.dev/services/tinker-prod/oai/api/v1";

/**
 * Resolve `model.id` to the value Tinker's `model` parameter expects.
 *
 * Catalog ids like `tinker/thinkingmachines/Inkling` strip the `tinker/` prefix;
 * arbitrary ids like `tinker:0034d8c9-...:train:0/sampler_weights/000100`
 * (used with `/model` for training checkpoints) reassemble into
 * `tinker://0034d8c9-...:train:0/sampler_weights/000100`.
 *
 * Exported so the test harness can pin this translation down.
 */
export function toWireModelId(id: string): string {
	// Checkpoint form: `tinker:<rest>` where <rest> may contain slashes.
	// Re-assemble to the `tinker://<rest>` shape the docs use.
	if (id.startsWith("tinker:")) {
		return `tinker://${id.slice("tinker:".length)}`;
	}
	// Catalog form: `tinker/<hf-path>` -> strip the prefix.
	const slash = id.indexOf("/");
	if (slash === -1 || id.slice(0, slash) !== "tinker") {
		throw new Error(
			`Invalid Tinker model id "${id}". Expected "tinker/<hf-path>" or "tinker:<ckpt-path>".`,
		);
	}
	const tail = id.slice(slash + 1);
	if (tail.length === 0) {
		throw new Error(`Empty Tinker model id "${id}".`);
	}
	return tail;
}

/**
 * Route the active model through Tinker's OpenAI-Completions implementation.
 *
 * Ponytail: pi-ai already speaks OpenAI Chat Completions, including reasoning
 * models that emit a `reasoning_content` field. The only Tinker-specific needs
 * are the base URL and the `model` string. Everything else (tools, temperature,
 * reasoning_effort string via thinkingLevelMap, etc.) just works.
 */
export function streamTinker(model: Model<Api>, context: Context, options?: SimpleStreamOptions) {
	const wireId = toWireModelId(model.id);
	const requestModel: Model<"openai-completions"> = {
		...model,
		id: wireId,
		api: "openai-completions",
		baseUrl: TINKER_BASE_URL,
	} as Model<"openai-completions">;
	return openAICompletionsApi().streamSimple(requestModel, context, options);
}

export default function (pi: ExtensionAPI) {
	pi.registerProvider("tinker", {
		name: "Tinker (Thinking Machines)",
		baseUrl: TINKER_BASE_URL,
		apiKey: "$TINKER_API_KEY",
		authHeader: true,
		models: Object.values(TINKER_MODELS) as Model<Api>[],
		streamSimple: streamTinker as unknown as Parameters<typeof pi.registerProvider>[1]["streamSimple"],
	});
}
