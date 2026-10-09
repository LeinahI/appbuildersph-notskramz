import { resolve } from 'node:path';

export type MatcherName = 'keyword' | 'laya' | 'hybrid';
export type ExplainerName = 'off' | 'gemma';

export interface HubConfig {
  host: string;
  port: number;
  /** Which matcher answers questions on the hub. Keyword matching is the default and the fallback. Hybrid asks keyword first, then Laya. */
  matcher: MatcherName;
  /** Which explainer writes the Taglish answer. "off" is the default. */
  explainer: ExplainerName;
  /** Where Laya keeps its downloaded weights (LAYA_CACHE). */
  layaCache: string;
  /** Local Laya bundle folder. When set, Laya downloads nothing. */
  layaModelDir: string | null;
  /** Required before the hub will use Laya. The team sets it before the labeled test. */
  layaPassMark: number | null;
  /** Required before the hub will use Laya. Below this confidence the hub says "not sure". */
  layaConfidenceThreshold: number | null;
  /** If Laya fails to load, answer with keyword matching instead of stopping the hub. */
  layaFallbackToKeyword: boolean;
  /** Local Gemma 4 ONNX folder (GEMMA_MODEL_DIR). Required when the explainer is gemma. */
  gemmaModelDir: string | null;
  /** ONNX weight variant (GEMMA_DTYPE). q4f16 is the default. */
  gemmaDtype: string;
  /** onnxruntime device (GEMMA_DEVICE). cpu is the tested route. */
  gemmaDevice: string;
  /** Cap on generated tokens per answer (GEMMA_MAX_NEW_TOKENS). */
  gemmaMaxNewTokens: number;
  /** Folder for the pilot logs (JSON lines). Keep it off git. */
  logDir: string;
}

const MATCHERS: readonly MatcherName[] = ['keyword', 'laya', 'hybrid'];
const EXPLAINERS: readonly ExplainerName[] = ['off', 'gemma'];

function optionalNumber(name: string, raw: string | undefined): number | null {
  const trimmed = raw?.trim();
  if (!trimmed) return null;
  const n = Number(trimmed);
  if (!Number.isFinite(n)) throw new Error(`${name} must be a number. Got "${trimmed}".`);
  return n;
}

export function loadConfig(env: NodeJS.ProcessEnv = process.env, cwd: string = process.cwd()): HubConfig {
  const matcher = (env.HUB_MATCHER ?? 'keyword') as MatcherName;
  if (!MATCHERS.includes(matcher)) {
    throw new Error(`HUB_MATCHER must be one of ${MATCHERS.join(', ')}. Got "${matcher}".`);
  }

  const explainer = (env.HUB_EXPLAINER ?? 'off') as ExplainerName;
  if (!EXPLAINERS.includes(explainer)) {
    throw new Error(`HUB_EXPLAINER must be one of ${EXPLAINERS.join(', ')}. Got "${explainer}".`);
  }

  const layaPassMark = optionalNumber('LAYA_PASS_MARK', env.LAYA_PASS_MARK);
  const layaConfidenceThreshold = optionalNumber('LAYA_CONFIDENCE_THRESHOLD', env.LAYA_CONFIDENCE_THRESHOLD);

  if (matcher === 'laya' || matcher === 'hybrid') {
    // Both values are team decisions. Refuse to start with Laya until they are set.
    if (layaPassMark === null) {
      throw new Error(`HUB_MATCHER=${matcher} needs LAYA_PASS_MARK, set by the team before the labeled test.`);
    }
    if (layaConfidenceThreshold === null) {
      throw new Error(`HUB_MATCHER=${matcher} needs LAYA_CONFIDENCE_THRESHOLD, set by the team from the labeled test.`);
    }
  }

  const gemmaModelDir = env.GEMMA_MODEL_DIR ? resolve(cwd, env.GEMMA_MODEL_DIR) : null;
  if (explainer === 'gemma' && gemmaModelDir === null) {
    throw new Error('HUB_EXPLAINER=gemma needs GEMMA_MODEL_DIR, the folder of the Gemma 4 ONNX model.');
  }
  const gemmaMaxNewTokens = optionalNumber('GEMMA_MAX_NEW_TOKENS', env.GEMMA_MAX_NEW_TOKENS) ?? 150;
  if (!Number.isInteger(gemmaMaxNewTokens) || gemmaMaxNewTokens < 1) {
    throw new Error(`GEMMA_MAX_NEW_TOKENS must be a positive whole number. Got "${env.GEMMA_MAX_NEW_TOKENS}".`);
  }

  const port = Number(env.HUB_PORT ?? 8787);
  if (!Number.isInteger(port) || port < 0 || port > 65535) {
    throw new Error(`HUB_PORT must be a port number. Got "${env.HUB_PORT}".`);
  }

  return {
    host: env.HUB_HOST ?? '0.0.0.0',
    port,
    matcher,
    explainer,
    // LAYA_CACHE replaces the whole Laya cache root. It is used as-is.
    layaCache: resolve(cwd, env.LAYA_CACHE ?? '.laya-cache'),
    layaModelDir: env.LAYA_MODEL_DIR ? resolve(cwd, env.LAYA_MODEL_DIR) : null,
    layaPassMark,
    layaConfidenceThreshold,
    layaFallbackToKeyword: (env.HUB_LAYA_FALLBACK ?? 'keyword') === 'keyword',
    gemmaModelDir,
    gemmaDtype: env.GEMMA_DTYPE ?? 'q4f16',
    gemmaDevice: env.GEMMA_DEVICE ?? 'cpu',
    gemmaMaxNewTokens,
    logDir: resolve(cwd, env.HUB_LOG_DIR ?? 'logs'),
  };
}
