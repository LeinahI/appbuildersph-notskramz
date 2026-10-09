import { loadConfig } from './config.js';
import { loadEnvFile } from './env.js';
import { createGemmaExplainer } from './explain/gemma.js';
import { createGemmaLlamaCppExplainer } from './explain/gemma-llamacpp.js';
import { offExplainer, type Explainer } from './explain/index.js';
import { fileLogger } from './log.js';
import { createKeywordMatcher } from './matchers/keyword.js';
import { createHybridMatcher, type Describe } from './matchers/hybrid.js';
import { createLayaMatcher } from './matchers/laya.js';
import type { Matcher } from './matchers/index.js';
import { loadKnowledge } from './knowledge.js';
import { createHubServer } from './server.js';
import { ConversationStore } from './conversation/state.js';

async function main(): Promise<void> {
  loadEnvFile();
  const config = loadConfig();
  const knowledge = loadKnowledge(new URL('../../knowledge/', import.meta.url));
  const logger = fileLogger(config.logDir);

  // Gemma loads first, so the hybrid matcher can use it to put Tagalog, Cebuano, and reworded questions into English.
  let explainer: Explainer = offExplainer;
  let describe: Describe | undefined;
  if (config.explainer === 'gemma') {
    try {
      if (config.gemmaRuntime === 'llamacpp') {
        const gemma = await createGemmaLlamaCppExplainer({
          modelPath: config.gemmaGguf!,
          maxNewTokens: config.gemmaMaxNewTokens,
          maxWords: config.gemmaMaxWords,
        });
        explainer = gemma;
        describe = gemma.describe;
      } else {
        // The ONNX route takes 12 s or more per call, too slow to also describe before matching.
        explainer = await createGemmaExplainer({
          modelDir: config.gemmaModelDir!,
          dtype: config.gemmaDtype,
          device: config.gemmaDevice,
          maxNewTokens: config.gemmaMaxNewTokens,
          maxWords: config.gemmaMaxWords,
        });
      }
    } catch (err) {
      // The explanation is optional. Keep answering with the matched notes only.
      const message = err instanceof Error ? err.message : String(err);
      logger.write({ event: 'error', where: 'gemma-load', message });
      console.warn(`Gemma failed to load, answering without an AI explanation: ${message}`);
    }
  }

  // Keyword matching is always loaded. It is the fallback if Laya is off or fails.
  const keyword = createKeywordMatcher(knowledge);
  let matcher: Matcher = keyword;
  if (config.matcher === 'laya' || config.matcher === 'hybrid') {
    try {
      const laya = await createLayaMatcher(knowledge, {
        cacheDir: config.layaCache,
        modelDir: config.layaModelDir,
        confidenceThreshold: config.layaConfidenceThreshold!,
        device: config.layaDevice,
      });
      matcher =
        config.matcher === 'hybrid'
          ? createHybridMatcher(keyword, laya, { describe, englishKeyword: createKeywordMatcher(knowledge, { minScore: 2 }) })
          : laya;
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      logger.write({ event: 'error', where: 'laya-load', message });
      if (!config.layaFallbackToKeyword) throw err;
      console.warn(`Laya failed to load, using keyword matching: ${message}`);
    }
  }

  const server = createHubServer({
    matcher,
    explainer,
    knowledge,
    logger,
    // One store for the whole hub: each phone chat keeps its notes here between questions.
    conversations: new ConversationStore(),
    info: { matcher: matcher.name, explainer: explainer.name },
  });
  server.listen(config.port, config.host, () => {
    console.log(`Ugatan hub listening on http://${config.host}:${config.port} (matcher: ${matcher.name}, explainer: ${explainer.name})`);
  });
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
