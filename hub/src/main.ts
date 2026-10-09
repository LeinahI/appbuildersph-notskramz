import { loadConfig } from './config.js';
import { loadEnvFile } from './env.js';
import { offExplainer, type Explainer } from './explain/index.js';
import { fileLogger } from './log.js';
import { createKeywordMatcher } from './matchers/keyword.js';
import { createLayaMatcher } from './matchers/laya.js';
import type { Matcher } from './matchers/index.js';
import { loadKnowledge } from './knowledge.js';
import { createHubServer } from './server.js';

async function main(): Promise<void> {
  loadEnvFile();
  const config = loadConfig();
  const knowledge = loadKnowledge(new URL('../../knowledge/', import.meta.url));
  const logger = fileLogger(config.logDir);

  // Keyword matching is always loaded. It is the fallback if Laya is off or fails.
  const keyword = createKeywordMatcher(knowledge);
  let matcher: Matcher = keyword;
  if (config.matcher === 'laya') {
    try {
      matcher = await createLayaMatcher(knowledge, {
        cacheDir: config.layaCache,
        modelDir: config.layaModelDir,
        confidenceThreshold: config.layaConfidenceThreshold!,
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      logger.write({ event: 'error', where: 'laya-load', message });
      if (!config.layaFallbackToKeyword) throw err;
      console.warn(`Laya failed to load, using keyword matching: ${message}`);
    }
  }

  let explainer: Explainer = offExplainer;
  if (config.explainer === 'gemma-e4b') {
    // Pending: Gemma E4B route, after the runtime decision.
    throw new Error('HUB_EXPLAINER=gemma-e4b is not wired yet. Use HUB_EXPLAINER=off until the E4B route is decided.');
  }

  const server = createHubServer({
    matcher,
    explainer,
    knowledge,
    logger,
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
