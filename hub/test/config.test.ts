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

  it('puts the Laya cache under LAYA_CACHE, resolved from the working folder', () => {
    const c = loadConfig({ LAYA_CACHE: 'cache/laya' }, '/repo/hub');
    expect(c.layaCache.replace(/\\/g, '/')).toMatch(/\/repo\/hub\/cache\/laya$/);
  });

  it('rejects a port that is not a number', () => {
    expect(() => loadConfig({ HUB_PORT: 'eighty' })).toThrow(/HUB_PORT/);
  });
});
