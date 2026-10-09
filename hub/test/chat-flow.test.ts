import { beforeAll, describe, expect, it } from 'vitest';
import { findViolations, type AskResponse, type KnowledgeEntry } from '@ugatan/shared';
import { answerQuestion } from '../src/answer';
import { ConversationStore } from '../src/conversation/state';
import type { Describer, Explainer } from '../src/explain/index';
import { createGemmaLlamaCppExplainer } from '../src/explain/gemma-llamacpp';
import { loadKnowledge } from '../src/knowledge';
import { createKeywordMatcher } from '../src/matchers/keyword';

// A whole farmer chat through the real Gemma GGUF on llama.cpp. Only runs with a local file (GEMMA_GGUF).
const modelPath = process.env.GEMMA_GGUF;

const knowledge: KnowledgeEntry[] = loadKnowledge(new URL('../../knowledge/', import.meta.url));
const quiet = { write() {} };

describe.skipIf(!modelPath)('a farmer chat with a local Gemma model', () => {
  let explainer: Explainer & Describer;
  let deps: { matcher: ReturnType<typeof createKeywordMatcher>; explainer: Explainer; knowledge: KnowledgeEntry[]; logger: typeof quiet; conversations: ConversationStore };
  let counter = 0;

  beforeAll(async () => {
    explainer = await createGemmaLlamaCppExplainer({ modelPath: modelPath!, maxNewTokens: 128, maxWords: 70 });
    deps = { matcher: createKeywordMatcher(knowledge), explainer, knowledge, logger: quiet, conversations: new ConversationStore() };
  }, 180_000);

  /** One farmer message in the chat with this sessionId. */
  function say(sessionId: string, text: string, crop: 'rice' | 'corn' | 'any' = 'any'): Promise<AskResponse> {
    return answerQuestion({ uid: `${sessionId}-${counter++}`, crop, text, sessionId }, deps);
  }

  /** A reply asks at most one question and names no pesticide. */
  function expectOneQuestionAndSafe(reply: string | null): void {
    expect(reply).not.toBeNull();
    expect((reply!.match(/\?/g) ?? []).length).toBeLessThanOrEqual(1);
    expect(findViolations(reply!)).toEqual([]);
    expect(reply).not.toContain('**');
  }

  it('greets, helps, and keeps one chat going without matching small talk', async () => {
    const chat = 'chat-greeting';
    const hi = await say(chat, 'hello po');
    expect(hi.matchIds).toEqual([]);
    expect(hi.explanationStatus).toBe('ok');
    expectOneQuestionAndSafe(hi.explanation);

    const help = await say(chat, 'maari niyo ba ako tulungan');
    expect(help.matchIds).toEqual([]);
    expect(help.explanationStatus).toBe('ok');
    expectOneQuestionAndSafe(help.explanation);
  }, 120_000);

  it('answers a follow-up with what the farmer already said, one question at a time', async () => {
    const chat = 'chat-followup';
    await say(chat, 'may mali sa palay ko');
    const followUp = await say(chat, 'may butas po siya');
    expect(followUp.explanationStatus).toBe('ok');
    expectOneQuestionAndSafe(followUp.explanation);
    // The crop the farmer named stays on rice: the reply never switches to corn.
    expect(followUp.explanation).not.toMatch(/\bmais\b/i);
  }, 120_000);

  it('explains a clear corn match on corn, with the symptom it matched on', async () => {
    const res = await say('chat-corn', 'may butas sa dahon ng mais');
    expect(res.matchIds[0]).toBe('fall-armyworm');
    expect(res.matchedOn).toContain('butas sa dahon');
    expect(res.explanationStatus).toBe('ok');
    expectOneQuestionAndSafe(res.explanation);
    expect(res.explanation).not.toMatch(/\bpalay/i);
  }, 120_000);
});
