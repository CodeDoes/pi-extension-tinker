/**
 * Tinker model catalog.
 *
 * Source: https://tinker-docs.thinkingmachines.ai/tinker/models/
 * Refresh: refresh pricing and `:peft:` rows against that page.
 *
 * Numbers are informational; `cost.input`/`output`/`cacheRead` only drive
 * usage reporting, not billing.
 */

import type { Model, ThinkingLevelMap } from "@earendil-works/pi-ai";

const TINKER_BASE_URL = "https://tinker.thinkingmachines.dev/services/tinker-prod/oai/api/v1";

/**
 * Internal entry. The pi-ai shape (`Model<"openai-completions">`) is
 * derived below from this — keeps the table compact.
 *
 * `category` controls `reasoning`:
 *   Hybrid     -> emits reasoning on chat-completions (Tinker default)
 *   Reasoning  -> always emits reasoning
 *   Base       -> raw continuation, no reasoning
 */
type Raw = {
	category: "Hybrid" | "Reasoning" | "Base";
	vision: boolean;
	base: string;
	ctxtok: number;
	in: number;
	cache: number;
	out: number;
	peft?: boolean;
};

const ROWS: Raw[] = [
	// Inkling (Thinking Machines' first open-weights model)
	{ category: "Hybrid", vision: true, base: "thinkingmachines/Inkling", ctxtok: 65536, in: 1.87, cache: 0.374, out: 4.68 },
	{ category: "Hybrid", vision: true, base: "thinkingmachines/Inkling", ctxtok: 262144, in: 3.74, cache: 0.748, out: 9.36, peft: true },

	// NVIDIA Nemotron-3 (MoE Hybrid)
	{ category: "Hybrid", vision: false, base: "nvidia/NVIDIA-Nemotron-3-Ultra-550B-A55B-BF16", ctxtok: 65536, in: 1.66, cache: 0.332, out: 4.15 },
	{ category: "Hybrid", vision: false, base: "nvidia/NVIDIA-Nemotron-3-Ultra-550B-A55B-BF16", ctxtok: 262144, in: 3.32, cache: 0.664, out: 8.30, peft: true },
	{ category: "Hybrid", vision: false, base: "nvidia/NVIDIA-Nemotron-3-Super-120B-A12B-BF16", ctxtok: 65536, in: 0.38, cache: 0.076, out: 0.96 },
	{ category: "Hybrid", vision: false, base: "nvidia/NVIDIA-Nemotron-3-Super-120B-A12B-BF16", ctxtok: 262144, in: 0.76, cache: 0.152, out: 1.92, peft: true },
	{ category: "Hybrid", vision: false, base: "nvidia/NVIDIA-Nemotron-3-Nano-30B-A3B-BF16", ctxtok: 65536, in: 0.13, cache: 0.026, out: 0.33 },

	// Moonshot Kimi-K2.6 (Hybrid + Vision)
	{ category: "Hybrid", vision: true, base: "moonshotai/Kimi-K2.6", ctxtok: 32768, in: 1.47, cache: 0.294, out: 3.66 },
	{ category: "Hybrid", vision: true, base: "moonshotai/Kimi-K2.6", ctxtok: 131072, in: 5.15, cache: 1.03, out: 12.81, peft: true },

	// Qwen 3.5 / 3.6 (Hybrid + Vision, plus a couple Base rows)
	{ category: "Hybrid", vision: true, base: "Qwen/Qwen3.6-35B-A3B", ctxtok: 65536, in: 0.36, cache: 0.072, out: 0.89 },
	{ category: "Hybrid", vision: true, base: "Qwen/Qwen3.6-27B", ctxtok: 65536, in: 1.24, cache: 0.248, out: 3.73 },
	{ category: "Hybrid", vision: true, base: "Qwen/Qwen3.5-397B-A17B", ctxtok: 65536, in: 2.00, cache: 0.40, out: 5.00 },
	{ category: "Hybrid", vision: true, base: "Qwen/Qwen3.5-397B-A17B", ctxtok: 262144, in: 4.00, cache: 0.80, out: 10.00, peft: true },
	{ category: "Base", vision: false, base: "Qwen/Qwen3.5-35B-A3B-Base", ctxtok: 65536, in: 0.36, cache: 0.072, out: 0.89 },
	{ category: "Hybrid", vision: true, base: "Qwen/Qwen3.5-9B", ctxtok: 65536, in: 0.44, cache: 0.088, out: 1.33 },
	{ category: "Base", vision: false, base: "Qwen/Qwen3.5-9B-Base", ctxtok: 65536, in: 0.44, cache: 0.088, out: 1.33 },
	{ category: "Hybrid", vision: true, base: "Qwen/Qwen3.5-4B", ctxtok: 65536, in: 0.22, cache: 0.044, out: 0.67 },
	{ category: "Hybrid", vision: false, base: "Qwen/Qwen3-8B", ctxtok: 32768, in: 0.13, cache: 0.026, out: 0.40 },

	// OpenAI gpt-oss (Reasoning)
	{ category: "Reasoning", vision: false, base: "openai/gpt-oss-120b", ctxtok: 32768, in: 0.18, cache: 0.036, out: 0.44 },
	{ category: "Reasoning", vision: false, base: "openai/gpt-oss-120b", ctxtok: 131072, in: 0.63, cache: 0.126, out: 1.54, peft: true },
	{ category: "Reasoning", vision: false, base: "openai/gpt-oss-20b", ctxtok: 32768, in: 0.12, cache: 0.024, out: 0.30 },

	// DeepSeek-V3.1
	{ category: "Hybrid", vision: false, base: "deepseek-ai/DeepSeek-V3.1", ctxtok: 32768, in: 1.13, cache: 0.226, out: 2.81 },
];

// Map OpenAI's standard reasoning_effort strings through to themselves — Tinker
// accepts those strings verbatim (mapping internally to floats per docs).
const THINKING_LEVELS: ThinkingLevelMap = {
	minimal: "minimal",
	low: "low",
	medium: "medium",
	high: "high",
	xhigh: "xhigh",
};

const reasons = (c: Raw["category"]) => c !== "Base";

function buildEntry(r: Raw): Model<"openai-completions"> {
	const peftSuffix = r.peft ? `:peft:${r.ctxtok}` : "";
	const tinkerBaseModel = `${r.base}${peftSuffix}`;
	const ctxLabel = `${r.ctxtok / 1024}K`;
	const repoName = r.base.split("/").pop() ?? r.base;
	const id = `tinker/${tinkerBaseModel}`;
	const name = r.peft ? `${repoName} (${ctxLabel})` : repoName;
	const ctxBytes = r.ctxtok;
	const model: Model<"openai-completions"> = {
		id,
		name,
		api: "openai-completions",
		provider: "tinker",
		baseUrl: TINKER_BASE_URL,
		compat: {
			supportsStore: false,
			supportsDeveloperRole: false,
			supportsReasoningEffort: reasons(r.category),
			maxTokensField: "max_completion_tokens",
			thinkingFormat: "openai",
			supportsStrictMode: false,
			supportsLongCacheRetention: false,
		},
		reasoning: reasons(r.category),
		thinkingLevelMap: reasons(r.category) ? THINKING_LEVELS : undefined,
		input: r.vision ? (["text", "image"] as const) : (["text"] as const),
		cost: { input: r.in, output: r.out, cacheRead: r.cache, cacheWrite: 0 },
		// ponytail: maxTokens is a soft cap; Tinker accepts any max below ctxWindow.
		// Quarter of context as a sane default — well below all the docs' published sample limits.
		contextWindow: ctxBytes,
		maxTokens: Math.max(8192, Math.floor(ctxBytes / 4)),
	};
	return model;
}

export const TINKER_MODELS = Object.fromEntries(
	ROWS.map((r) => [buildEntry(r).id, buildEntry(r)] as const),
) as Record<string, Model<"openai-completions">>;
