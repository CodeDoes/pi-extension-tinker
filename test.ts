/**
 * Smoke test: catalog shape + model-id translation.
 *
 *   npx tsx test.ts
 *
 * Does not hit the network. With TINKER_API_KEY set, the OptionalOptional block
 * at the bottom will run a real chat-completions request against Tinker.
 */
import { TINKER_MODELS } from "./models.ts";
import { toWireModelId } from "./index.ts";

const ids = Object.keys(TINKER_MODELS);
if (ids.length < 18) throw new Error(`expected >=18 catalog rows, got ${ids.length}`);

const expected = [
	"tinker/thinkingmachines/Inkling",
	"tinker/thinkingmachines/Inkling:peft:262144",
	"tinker/moonshotai/Kimi-K2.6",
	"tinker/Qwen/Qwen3.5-397B-A17B",
	"tinker/Qwen/Qwen3.5-397B-A17B:peft:262144",
	"tinker/openai/gpt-oss-120b",
	"tinker/openai/gpt-oss-120b:peft:131072",
	"tinker/deepseek-ai/DeepSeek-V3.1",
];
for (const id of expected) {
	if (!TINKER_MODELS[id]) throw new Error(`missing catalog entry: ${id}`);
}

const inkling = TINKER_MODELS["tinker/thinkingmachines/Inkling"];
if (!inkling.reasoning) throw new Error("Inkling should be reasoning=true (Hybrid)");
if (inkling.api !== "openai-completions") throw new Error("api should be openai-completions");
if (!inkling.input.includes("image")) throw new Error("Inkling should accept image input");

const fourB = TINKER_MODELS["tinker/Qwen/Qwen3.5-4B"];
if (fourB.contextWindow !== 65536) throw new Error(`Qwen3.5-4B ctx: got ${fourB.contextWindow}`);

const wireCatalog = toWireModelId("tinker/thinkingmachines/Inkling");
if (wireCatalog !== "thinkingmachines/Inkling") throw new Error(`catalog wire id: got "${wireCatalog}"`);

const wireCheckpoint = toWireModelId(
	"tinker:0034d8c9-0a88-52a9-b2b7-bce7cb1e6fef:train:0/sampler_weights/000080",
);
const expectedWire = "tinker://0034d8c9-0a88-52a9-b2b7-bce7cb1e6fef:train:0/sampler_weights/000080";
if (wireCheckpoint !== expectedWire) throw new Error(`wire id mismatch: got "${wireCheckpoint}"`);

console.log(`OK: ${ids.length} models, sample wire ids:`);
for (const id of ids.slice(0, 3)) console.log(`  ${id} -> ${toWireModelId(id)}`);
console.log(`  tinker:<uuid>:... -> ${wireCheckpoint}`);

// Optional: real network probe if TINKER_API_KEY is set.
if (process.env.TINKER_API_KEY) {
	const { streamTinker } = await import("./index.ts");
	const { TINKER_MODELS: CAT } = await import("./models.ts");
	const m = CAT["tinker/thinkingmachines/Inkling"];
	const stream = streamTinker(m as never, {
		messages: [{ role: "user", content: "Reply with the word PONG.", timestamp: Date.now() }],
	} as never, { apiKey: process.env.TINKER_API_KEY, maxTokens: 32 });
	let text = "";
	for await (const ev of stream) {
		if (ev.type === "text_delta") text += ev.delta;
		else if (ev.type === "error") throw new Error(`Stream error: ${ev.error.errorMessage}`);
		else if (ev.type === "done") break;
	}
	console.log(`Live response: ${text.trim()}`);
}
