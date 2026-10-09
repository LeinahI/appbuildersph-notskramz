// Replays farmer chats through the hub's answer pipeline, with the real Gemma GGUF and the hybrid (Laya) matcher,
// and prints every reply, so a person can read how the AI talks before and after a prompt change.
// Run from the hub folder: pnpm eval:chat [-- chat-questions.json]
// Each chat in the file is a list of farmer messages, sent one after another in the same conversation.
import { readFileSync } from 'node:fs';
import { NOT_SURE_TEXT, NO_MATCH_TEXT, smallTalkReply, type ChatTurn } from '../shared/src/index.js';
import { answerQuestion } from '../hub/src/answer.js';
import { loadConfig } from '../hub/src/config.js';
import { ConversationStore } from '../hub/src/conversation/state.js';
import { loadEnvFile } from '../hub/src/env.js';
import { createGemmaLlamaCppExplainer } from '../hub/src/explain/gemma-llamacpp.js';
import { loadKnowledge } from '../hub/src/knowledge.js';
import { createHybridMatcher } from '../hub/src/matchers/hybrid.js';
import { createKeywordMatcher } from '../hub/src/matchers/keyword.js';
import { createLayaMatcher } from '../hub/src/matchers/laya.js';

loadEnvFile();
const config = loadConfig();
if (!config.gemmaGguf) throw new Error('Set GEMMA_GGUF in hub/.env: this eval reads the real model replies.');
const file = new URL(process.argv.slice(2).find((a) => a !== '--') ?? 'chat-questions.json', new URL('.', import.meta.url));
const chats = JSON.parse(readFileSync(file, 'utf8')) as string[][];

const knowledge = loadKnowledge(new URL('../knowledge/', import.meta.url));
const gemma = await createGemmaLlamaCppExplainer({ modelPath: config.gemmaGguf, maxNewTokens: config.gemmaMaxNewTokens, maxWords: config.gemmaMaxWords });
const keyword = createKeywordMatcher(knowledge);
// Without Laya the hub answers with keyword matching, and so does this replay.
const matcher =
  config.layaModelDir && config.layaConfidenceThreshold !== null
    ? createHybridMatcher(
        keyword,
        await createLayaMatcher(knowledge, {
          cacheDir: config.layaCache,
          modelDir: config.layaModelDir,
          confidenceThreshold: config.layaConfidenceThreshold,
          device: 'cpu',
        }),
        { describe: gemma.describe, englishKeyword: createKeywordMatcher(knowledge, { minScore: 2 }) },
      )
    : keyword;
const conversations = new ConversationStore();
const byId = new Map(knowledge.map((e) => [e.id, e]));

for (const [n, chat] of chats.entries()) {
  const sessionId = `eval-chat-${n}`;
  // What the phone sends: every earlier question with the reply the farmer saw.
  const history: ChatTurn[] = [];
  console.log(`\n================ chat ${n + 1}`);
  for (const text of chat) {
    const started = Date.now();
    const res = await answerQuestion(
      { uid: `${sessionId}-${history.length}`, crop: 'any', text, sessionId, ...(history.length ? { history } : {}) },
      { matcher, explainer: gemma, knowledge, logger: { write() {} }, conversations },
    );
    const names = res.matchIds.map((id) => byId.get(id)?.name ?? id).join(', ');
    const shown = res.explanation ?? (res.matchIds.length ? (res.clear ? `[card: ${names}]` : NOT_SURE_TEXT) : smallTalkReply(text) || NO_MATCH_TEXT);
    const verdict = res.clear ? 'SURE' : res.matchIds.length ? 'NOT SURE' : 'no match';
    console.log(`\nFARMER: ${text}`);
    console.log(`  [${verdict}${names ? `: ${names}` : ''}] ${((Date.now() - started) / 1000).toFixed(1)}s`);
    console.log(`UGATAN: ${shown}`);
    history.push({ question: text, reply: shown });
  }
}
process.exit(0);
