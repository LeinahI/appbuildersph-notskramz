import { resolve } from 'node:path';

export type MatcherName = 'keyword' | 'laya' | 'hybrid';
export type ExplainerName = 'off' | 'gemma';
export type GemmaRuntime = 'llamacpp' | 'onnx';
export type LayaDevice = 'webgpu' | 'cpu';

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
  /** Where Laya runs (LAYA_DEVICE). webgpu is the default and falls back to cpu if it does not work. */
  layaDevice: LayaDevice;
  /** How Gemma runs (GEMMA_RUNTIME). llamacpp uses the GPU and is the default. onnx is the slower CPU route. */
  gemmaRuntime: GemmaRuntime;
  /** Gemma 4 GGUF file (GEMMA_GGUF). Required for the llamacpp runtime. */
  gemmaGguf: string | null;
  /** Local Gemma 4 ONNX folder (GEMMA_MODEL_DIR). Required for the onnx runtime. */
  gemmaModelDir: string | null;
  /** ONNX weight variant (GEMMA_DTYPE), onnx runtime only. q4f16 is the default. */
  gemmaDtype: string;
  /** onnxruntime device (GEMMA_DEVICE), onnx runtime only. cpu is the tested route. */
  gemmaDevice: string;
  /** Cap on generated tokens per answer (GEMMA_MAX_NEW_TOKENS). */
  gemmaMaxNewTokens: number;
  /** Word limit the prompt asks for (GEMMA_MAX_WORDS). Shorter than the phone's 150 to save time. */
  gemmaMaxWords: number;
  /** Read photos with the local Gemma 4 ONNX vision model (HUB_VISION=on). Needs GEMMA_MODEL_DIR. Off by default. */
  vision: boolean;
  /** Cap on the generated description of a photo (VISION_MAX_NEW_TOKENS). */
  visionMaxNewTokens: number;
  /** Transcribe recordings with the local Gemma 4 ONNX audio model (HUB_VOICE=on). Needs GEMMA_MODEL_DIR. Off by default. */
  voice: boolean;
  /** Cap on the generated transcript (VOICE_MAX_NEW_TOKENS). */
  voiceMaxNewTokens: number;
  /** ONNX weight variant for photo and speech reading (MULTIMODAL_DTYPE). Defaults to GEMMA_DTYPE. quantized is more exact and needs about 3 GB more memory. */
  multimodalDtype: string;
  /** ONNX weight variant for the audio encoder alone (AUDIO_DTYPE), when it should differ from the rest. Null leaves it with the rest. */
  audioDtype: string | null;
  /** Folder for the pilot logs (JSON lines). Keep it off git. */
  logDir: string;
}

const MATCHERS: readonly MatcherName[] = ['keyword', 'laya', 'hybrid'];
const EXPLAINERS: readonly ExplainerName[] = ['off', 'gemma'];
const GEMMA_RUNTIMES: readonly GemmaRuntime[] = ['llamacpp', 'onnx'];
const LAYA_DEVICES: readonly LayaDevice[] = ['webgpu', 'cpu'];

function optionalNumber(name: string, raw: string | undefined): number | null {
  const trimmed = raw?.trim();
  if (!trimmed) return null;
  const n = Number(trimmed);
  if (!Number.isFinite(n)) throw new Error(`${name} must be a number. Got "${trimmed}".`);
  return n;
}

function positiveInteger(name: string, raw: string | undefined, fallback: number): number {
  const n = optionalNumber(name, raw) ?? fallback;
  if (!Number.isInteger(n) || n < 1) throw new Error(`${name} must be a positive whole number. Got "${raw}".`);
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

  const layaDevice = (env.LAYA_DEVICE ?? 'webgpu') as LayaDevice;
  if (!LAYA_DEVICES.includes(layaDevice)) {
    throw new Error(`LAYA_DEVICE must be one of ${LAYA_DEVICES.join(', ')}. Got "${layaDevice}".`);
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

  const gemmaRuntime = (env.GEMMA_RUNTIME ?? 'llamacpp') as GemmaRuntime;
  if (!GEMMA_RUNTIMES.includes(gemmaRuntime)) {
    throw new Error(`GEMMA_RUNTIME must be one of ${GEMMA_RUNTIMES.join(', ')}. Got "${gemmaRuntime}".`);
  }
  const gemmaGguf = env.GEMMA_GGUF ? resolve(cwd, env.GEMMA_GGUF) : null;
  const gemmaModelDir = env.GEMMA_MODEL_DIR ? resolve(cwd, env.GEMMA_MODEL_DIR) : null;
  if (explainer === 'gemma' && gemmaRuntime === 'llamacpp' && gemmaGguf === null) {
    throw new Error('HUB_EXPLAINER=gemma with GEMMA_RUNTIME=llamacpp needs GEMMA_GGUF, the Gemma 4 .gguf file.');
  }
  if (explainer === 'gemma' && gemmaRuntime === 'onnx' && gemmaModelDir === null) {
    throw new Error('HUB_EXPLAINER=gemma with GEMMA_RUNTIME=onnx needs GEMMA_MODEL_DIR, the folder of the Gemma 4 ONNX model.');
  }
  const gemmaMaxNewTokens = positiveInteger('GEMMA_MAX_NEW_TOKENS', env.GEMMA_MAX_NEW_TOKENS, 128);
  const gemmaMaxWords = positiveInteger('GEMMA_MAX_WORDS', env.GEMMA_MAX_WORDS, 70);

  const visionRaw = env.HUB_VISION ?? 'off';
  if (visionRaw !== 'on' && visionRaw !== 'off') {
    throw new Error(`HUB_VISION must be on or off. Got "${visionRaw}".`);
  }
  const vision = visionRaw === 'on';
  // Photos go through the ONNX model whichever route writes the explanation: the GGUF has no vision file.
  if (vision && gemmaModelDir === null) {
    throw new Error('HUB_VISION=on needs GEMMA_MODEL_DIR, the folder of the Gemma 4 ONNX model.');
  }
  const visionMaxNewTokens = positiveInteger('VISION_MAX_NEW_TOKENS', env.VISION_MAX_NEW_TOKENS, 64);

  const voiceRaw = env.HUB_VOICE ?? 'off';
  if (voiceRaw !== 'on' && voiceRaw !== 'off') {
    throw new Error(`HUB_VOICE must be on or off. Got "${voiceRaw}".`);
  }
  const voice = voiceRaw === 'on';
  // Speech goes through the ONNX model too: the GGUF has no audio file.
  if (voice && gemmaModelDir === null) {
    throw new Error('HUB_VOICE=on needs GEMMA_MODEL_DIR, the folder of the Gemma 4 ONNX model.');
  }
  const voiceMaxNewTokens = positiveInteger('VOICE_MAX_NEW_TOKENS', env.VOICE_MAX_NEW_TOKENS, 192);
  const multimodalDtype = env.MULTIMODAL_DTYPE?.trim() || env.GEMMA_DTYPE?.trim() || 'q4f16';
  const audioDtype = env.AUDIO_DTYPE?.trim() || null;

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
    layaDevice,
    gemmaRuntime,
    gemmaGguf,
    gemmaModelDir,
    gemmaDtype: env.GEMMA_DTYPE ?? 'q4f16',
    gemmaDevice: env.GEMMA_DEVICE ?? 'cpu',
    gemmaMaxNewTokens,
    gemmaMaxWords,
    vision,
    visionMaxNewTokens,
    voice,
    voiceMaxNewTokens,
    multimodalDtype,
    audioDtype,
    logDir: resolve(cwd, env.HUB_LOG_DIR ?? 'logs'),
  };
}
