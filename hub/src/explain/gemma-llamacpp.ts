import { buildMessages } from '@ugatan/shared';
import { trimToSentence } from './gemma.js';
import type { ExplainInput, ExplainResult, Explainer } from './index.js';
import { oneAtATime } from './queue.js';

export interface GemmaLlamaCppExplainerOptions {
  /** Gemma 4 GGUF file, for example E:/models/gemma-4-E2B-it-GGUF/gemma-4-E2B-it-Q4_0.gguf. Nothing is downloaded. */
  modelPath: string;
  /** Cap on the generated answer. */
  maxNewTokens: number;
  /** Word limit the prompt asks for. */
  maxWords: number;
}

/**
 * Taglish explanation from a local Gemma 4 GGUF model through llama.cpp, on the GPU when there is one
 * (Vulkan or CUDA, picked by node-llama-cpp). Same prompt as the ONNX route. The hub still runs the
 * pesticide guardrail on the result.
 */
export async function createGemmaLlamaCppExplainer(opts: GemmaLlamaCppExplainerOptions): Promise<Explainer> {
  // Imported here so a hub that never uses Gemma does not load llama.cpp.
  const { getLlama, LlamaChatSession, Gemma4ChatWrapper } = await import('node-llama-cpp');
  const llama = await getLlama({ gpu: 'auto' });
  // auto puts as many layers on the GPU as fit and runs the rest on the CPU, so a smaller card still works.
  const model = await llama.loadModel({ modelPath: opts.modelPath, gpuLayers: 'auto' });
  // The prompt plus a short answer fits well inside 2048 tokens.
  const context = await model.createContext({ contextSize: 2048 });

  // The system prompt is the same for every question. Keeping one session on one sequence lets llama.cpp
  // reuse its cached prefix, so each question only reads the farmer's part of the prompt.
  const system = buildMessages('', 'any', [], opts.maxWords)[0]!.content;
  const session = new LlamaChatSession({
    contextSequence: context.getSequence(),
    systemPrompt: system,
    // Same as enable_thinking: false on the ONNX route.
    chatWrapper: new Gemma4ChatWrapper({ reasoning: false }),
  });

  const enqueue = oneAtATime();

  async function generate({ text, crop, entries }: ExplainInput, maxTokens = opts.maxNewTokens): Promise<string> {
    const [, user] = buildMessages(text, crop, entries, opts.maxWords);
    // Each question stands alone. Only the system prompt carries over.
    session.resetChatHistory();
    const result = await session.promptWithMeta(user!.content, {
      maxTokens,
      temperature: 0,
      budgets: { thoughtTokens: 0 },
    });
    const answer = result.responseText.trim();
    return result.stopReason === 'maxTokens' ? trimToSentence(answer) : answer;
  }

  // Warm-up, so the first farmer's question does not pay for loading the GPU kernels.
  await generate({ text: 'Dilaw ang dahon', crop: 'any', entries: [] }, 8);

  return {
    name: 'gemma',
    async explain(input): Promise<ExplainResult> {
      const text = await enqueue(() => generate(input));
      return text ? { status: 'ok', text } : { status: 'unavailable', text: null };
    },
  };
}
