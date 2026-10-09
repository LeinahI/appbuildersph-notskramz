import { NO_SIGNS, OTHER_CROP, buildChatMessages, buildDescribeMessages, buildMessages, type Crop } from '@ugatan/shared';
import type { ChatHistoryItem } from 'node-llama-cpp';
import { trimToSentence } from './gemma.js';
import type { ChatInput, Describer, ExplainInput, ExplainResult, Explainer } from './index.js';
import { oneAtATime } from './queue.js';

export interface GemmaLlamaCppExplainerOptions {
  /** Gemma 4 GGUF file, for example E:/models/gemma-4-E2B-it-GGUF/gemma-4-E2B-it-Q4_0.gguf. Nothing is downloaded. */
  modelPath: string;
  /** Cap on the generated answer. */
  maxNewTokens: number;
  /** Word limit the prompt asks for. */
  maxWords: number;
}

/** Cap on the plain-English description. Two short sentences fit well inside it. */
const DESCRIBE_MAX_TOKENS = 80;
/** Cap on a chat reply. The prompt asks for under 60 words. */
const CHAT_MAX_TOKENS = 120;

/**
 * Taglish explanation from a local Gemma 4 GGUF model through llama.cpp, on the GPU when there is one
 * (Vulkan or CUDA, picked by node-llama-cpp). Same prompt as the ONNX route. The hub still runs the
 * pesticide guardrail on the result.
 *
 * The same model also describes: it puts the farmer's words into plain English for the matcher (Describer).
 */
export async function createGemmaLlamaCppExplainer(opts: GemmaLlamaCppExplainerOptions): Promise<Explainer & Describer> {
  // Imported here so a hub that never uses Gemma does not load llama.cpp.
  const { getLlama, LlamaChatSession, Gemma4ChatWrapper } = await import('node-llama-cpp');
  const llama = await getLlama({ gpu: 'auto' });
  // auto puts as many layers on the GPU as fit and runs the rest on the CPU, so a smaller card still works.
  const model = await llama.loadModel({ modelPath: opts.modelPath, gpuLayers: 'auto' });
  // The prompt plus a short answer fits well inside 2048 tokens. One sequence per job, so each keeps its own cached system prompt.
  const context = await model.createContext({ contextSize: 2048, sequences: 3 });

  // The system prompt is the same for every question. Keeping one session on one sequence lets llama.cpp
  // reuse its cached prefix, so each question only reads the farmer's part of the prompt.
  const system = buildMessages('', 'any', [], { maxWords: opts.maxWords })[0]!.content;
  const session = new LlamaChatSession({
    contextSequence: context.getSequence(),
    systemPrompt: system,
    // Same as enable_thinking: false on the ONNX route.
    chatWrapper: new Gemma4ChatWrapper({ reasoning: false }),
  });
  const describeSession = new LlamaChatSession({
    contextSequence: context.getSequence(),
    systemPrompt: buildDescribeMessages('', 'any')[0]!.content,
    chatWrapper: new Gemma4ChatWrapper({ reasoning: false }),
  });

  const chatSystem = buildChatMessages('')[0]!.content;
  const chatSession = new LlamaChatSession({
    contextSequence: context.getSequence(),
    systemPrompt: chatSystem,
    chatWrapper: new Gemma4ChatWrapper({ reasoning: false }),
  });

  // One model on one GPU: explaining, describing, and chatting share the queue.
  const enqueue = oneAtATime();

  async function generate({ text, crop, entries, clear, bestGuess, photo }: ExplainInput, maxTokens = opts.maxNewTokens): Promise<string> {
    // The matcher's verdict goes in the user message, so the cached system prompt stays the same.
    const [, user] = buildMessages(text, crop, entries, { maxWords: opts.maxWords, sure: clear, bestGuess, photo });
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

  async function describe(text: string, crop: Crop | 'any', maxTokens = DESCRIBE_MAX_TOKENS): Promise<string | null> {
    const [, user] = buildDescribeMessages(text, crop);
    describeSession.resetChatHistory();
    const result = await describeSession.promptWithMeta(user!.content, {
      maxTokens,
      temperature: 0,
      budgets: { thoughtTokens: 0 },
    });
    const english = result.responseText.trim();
    // Nothing to match on. The matcher then matches nothing instead of words Gemma made up.
    if (english.startsWith(NO_SIGNS.slice(0, -1))) return NO_SIGNS;
    if (english.startsWith(OTHER_CROP.slice(0, -1))) return OTHER_CROP;
    return english || null;
  }

  async function chat({ text, history, ...options }: ChatInput): Promise<string> {
    // The earlier turns are set as the session's history, so the reply follows the conversation.
    const [, ...turns] = buildChatMessages(text, history, undefined, options);
    const question = turns.pop()!.content;
    const items: ChatHistoryItem[] = [{ type: 'system', text: chatSystem }];
    for (const t of turns) items.push(t.role === 'user' ? { type: 'user', text: t.content } : { type: 'model', response: [t.content] });
    chatSession.setChatHistory(items);
    const result = await chatSession.promptWithMeta(question, {
      maxTokens: CHAT_MAX_TOKENS,
      temperature: 0,
      budgets: { thoughtTokens: 0 },
    });
    const reply = result.responseText.trim();
    return result.stopReason === 'maxTokens' ? trimToSentence(reply) : reply;
  }

  // Warm-up, so the first farmer's question does not pay for loading the GPU kernels.
  await generate({ text: 'Dilaw ang dahon', crop: 'any', entries: [], clear: false }, 8);
  await describe('Dilaw ang dahon', 'any', 8);

  return {
    name: 'gemma',
    describe: (text, crop) => enqueue(() => describe(text, crop)),
    async explain(input): Promise<ExplainResult> {
      const text = await enqueue(() => generate(input));
      return text ? { status: 'ok', text } : { status: 'unavailable', text: null };
    },
    async chat(input): Promise<ExplainResult> {
      const text = await enqueue(() => chat(input));
      return text ? { status: 'ok', text } : { status: 'unavailable', text: null };
    },
  };
}
