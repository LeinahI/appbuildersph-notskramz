import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { loadConfig } from '../src/config';

describe('loadConfig', () => {
  it('defaults to keyword matching with no explainer and a LAN-wide listener', () => {
    const c = loadConfig({}, '/repo/hub');
    expect(c.matcher).toBe('keyword');
    expect(c.explainer).toBe('off');
    expect(c.host).toBe('0.0.0.0');
    expect(c.port).toBe(8787);
    expect(c.layaPassMark).toBeNull();
    expect(c.layaFallbackToKeyword).toBe(true);
  });

  it('refuses Laya until a pass mark is set', () => {
    expect(() => loadConfig({ HUB_MATCHER: 'laya' }, '/repo/hub')).toThrow(/LAYA_PASS_MARK/);
  });

  it('refuses Laya until a confidence threshold is set', () => {
    expect(() => loadConfig({ HUB_MATCHER: 'laya', LAYA_PASS_MARK: '0.7' }, '/repo/hub')).toThrow(
      /LAYA_CONFIDENCE_THRESHOLD/,
    );
  });

  it('accepts Laya once both team decisions are set', () => {
    const c = loadConfig(
      { HUB_MATCHER: 'laya', LAYA_PASS_MARK: '0.7', LAYA_CONFIDENCE_THRESHOLD: '0.5' },
      '/repo/hub',
    );
    expect(c.matcher).toBe('laya');
    expect(c.layaPassMark).toBe(0.7);
    expect(c.layaConfidenceThreshold).toBe(0.5);
  });

  it('treats hybrid like Laya: both team decisions are required', () => {
    expect(() => loadConfig({ HUB_MATCHER: 'hybrid' }, '/repo/hub')).toThrow(/hybrid needs LAYA_PASS_MARK/);
    expect(() => loadConfig({ HUB_MATCHER: 'hybrid', LAYA_PASS_MARK: '0.7' }, '/repo/hub')).toThrow(
      /LAYA_CONFIDENCE_THRESHOLD/,
    );
    const c = loadConfig({ HUB_MATCHER: 'hybrid', LAYA_PASS_MARK: '0.7', LAYA_CONFIDENCE_THRESHOLD: '0.5' }, '/repo/hub');
    expect(c.matcher).toBe('hybrid');
  });

  it('rejects an unknown matcher or explainer', () => {
    expect(() => loadConfig({ HUB_MATCHER: 'bert' })).toThrow(/HUB_MATCHER/);
    expect(() => loadConfig({ HUB_EXPLAINER: 'cloud' })).toThrow(/HUB_EXPLAINER/);
  });

  it('refuses the gemma explainer without a model file for its runtime', () => {
    expect(() => loadConfig({ HUB_EXPLAINER: 'gemma' }, '/repo/hub')).toThrow(/GEMMA_GGUF/);
    expect(() => loadConfig({ HUB_EXPLAINER: 'gemma', GEMMA_RUNTIME: 'onnx' }, '/repo/hub')).toThrow(/GEMMA_MODEL_DIR/);
    expect(() => loadConfig({ GEMMA_RUNTIME: 'tpu' })).toThrow(/GEMMA_RUNTIME/);
  });

  it('keeps photo reading off unless HUB_VISION=on, and then needs the ONNX folder', () => {
    expect(loadConfig({}, '/repo/hub').vision).toBe(false);
    expect(() => loadConfig({ HUB_VISION: 'on' }, '/repo/hub')).toThrow(/GEMMA_MODEL_DIR/);
    expect(() => loadConfig({ HUB_VISION: 'yes' }, '/repo/hub')).toThrow(/HUB_VISION/);
    const c = loadConfig({ HUB_VISION: 'on', GEMMA_MODEL_DIR: '/models/gemma' }, '/repo/hub');
    expect(c.vision).toBe(true);
    expect(c.visionMaxNewTokens).toBe(64);
    expect(loadConfig({ HUB_VISION: 'on', GEMMA_MODEL_DIR: '/m', VISION_MAX_NEW_TOKENS: '32' }, '/repo/hub').visionMaxNewTokens).toBe(32);
  });

  it('keeps speech reading off unless HUB_VOICE=on, and then needs the ONNX folder', () => {
    expect(loadConfig({}, '/repo/hub').voice).toBe(false);
    expect(() => loadConfig({ HUB_VOICE: 'on' }, '/repo/hub')).toThrow(/GEMMA_MODEL_DIR/);
    expect(() => loadConfig({ HUB_VOICE: 'true' }, '/repo/hub')).toThrow(/HUB_VOICE/);
    const c = loadConfig({ HUB_VOICE: 'on', GEMMA_MODEL_DIR: '/models/gemma' }, '/repo/hub');
    expect(c.voice).toBe(true);
    expect(c.vision).toBe(false);
    expect(c.voiceMaxNewTokens).toBe(192);
    expect(loadConfig({ HUB_VOICE: 'on', GEMMA_MODEL_DIR: '/m', VOICE_MAX_NEW_TOKENS: '64' }, '/repo/hub').voiceMaxNewTokens).toBe(64);
  });

  it('reads the photo and speech weight variants, which default to the Gemma one', () => {
    const base = { HUB_VOICE: 'on', GEMMA_MODEL_DIR: '/m' };
    expect(loadConfig(base, '/repo/hub')).toMatchObject({ multimodalDtype: 'q4f16', audioDtype: null });
    expect(loadConfig({ ...base, GEMMA_DTYPE: 'q4' }, '/repo/hub').multimodalDtype).toBe('q4');
    expect(loadConfig({ ...base, GEMMA_DTYPE: 'q4', MULTIMODAL_DTYPE: 'quantized' }, '/repo/hub').multimodalDtype).toBe('quantized');
    expect(loadConfig({ ...base, AUDIO_DTYPE: 'fp32' }, '/repo/hub').audioDtype).toBe('fp32');
  });

  it('reads the Gemma settings, with llama.cpp and short answers as the default', () => {
    const c = loadConfig({ HUB_EXPLAINER: 'gemma', GEMMA_GGUF: '/models/gemma.gguf' }, '/repo/hub');
    expect(c.explainer).toBe('gemma');
    expect(c.gemmaRuntime).toBe('llamacpp');
    expect(c.gemmaGguf).toBe(resolve('/repo/hub', '/models/gemma.gguf'));
    expect(c.gemmaMaxNewTokens).toBe(128);
    expect(c.gemmaMaxWords).toBe(70);
    expect(() => loadConfig({ GEMMA_MAX_NEW_TOKENS: '0' })).toThrow(/GEMMA_MAX_NEW_TOKENS/);
    expect(() => loadConfig({ GEMMA_MAX_WORDS: '2.5' })).toThrow(/GEMMA_MAX_WORDS/);
  });

  it('reads the ONNX route settings', () => {
    const c = loadConfig({ HUB_EXPLAINER: 'gemma', GEMMA_RUNTIME: 'onnx', GEMMA_MODEL_DIR: '/models/gemma' }, '/repo/hub');
    expect(c.gemmaRuntime).toBe('onnx');
    expect(c.gemmaModelDir).toBe(resolve('/repo/hub', '/models/gemma'));
    expect(c.gemmaDtype).toBe('q4f16');
    expect(c.gemmaDevice).toBe('cpu');
  });

  it('runs Laya on WebGPU by default and accepts cpu', () => {
    expect(loadConfig({}).layaDevice).toBe('webgpu');
    expect(loadConfig({ LAYA_DEVICE: 'cpu' }).layaDevice).toBe('cpu');
    expect(() => loadConfig({ LAYA_DEVICE: 'dml' })).toThrow(/LAYA_DEVICE/);
  });

  it('puts the Laya cache under LAYA_CACHE, resolved from the working folder', () => {
    const c = loadConfig({ LAYA_CACHE: 'cache/laya' }, '/repo/hub');
    expect(c.layaCache.replace(/\\/g, '/')).toMatch(/\/repo\/hub\/cache\/laya$/);
  });

  it('rejects a port that is not a number', () => {
    expect(() => loadConfig({ HUB_PORT: 'eighty' })).toThrow(/HUB_PORT/);
  });
});
