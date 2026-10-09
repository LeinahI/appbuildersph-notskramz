import { describe, expect, it } from 'vitest';
import {
  DEFAULT_UI_LANGUAGE,
  LABELS,
  UI_LANGUAGES,
  isUiLanguage,
  loadUiLanguage,
  localeFor,
  saveUiLanguage,
} from '../src/config/labels';

function memoryStorage(initial?: string) {
  const values = new Map<string, string>();
  if (initial !== undefined) values.set('ugatan.ui-language', initial);
  return {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => {
      values.set(key, value);
    },
  };
}

describe('interface labels', () => {
  it('defines exactly the same keys in every language', () => {
    const expected = Object.keys(LABELS.tl).sort();
    for (const language of UI_LANGUAGES) {
      expect(Object.keys(LABELS[language]).sort()).toEqual(expected);
    }
  });

  it('contains the three interface languages and Philippine locales', () => {
    expect(UI_LANGUAGES).toEqual(['tl', 'en', 'ceb']);
    expect(localeFor('tl')).toBe('tl-PH');
    expect(localeFor('en')).toBe('en-PH');
    expect(localeFor('ceb')).toBe('ceb-PH');
  });

  it('loads a valid saved preference and falls back to Tagalog', () => {
    expect(loadUiLanguage(memoryStorage('ceb'))).toBe('ceb');
    expect(loadUiLanguage(memoryStorage('invalid'))).toBe(DEFAULT_UI_LANGUAGE);
    expect(loadUiLanguage({ getItem: () => { throw new Error('blocked'); } })).toBe(DEFAULT_UI_LANGUAGE);
  });

  it('saves a preference and ignores blocked storage', () => {
    const storage = memoryStorage();
    saveUiLanguage('en', storage);
    expect(loadUiLanguage(storage)).toBe('en');
    expect(() => saveUiLanguage('ceb', { setItem: () => { throw new Error('blocked'); } })).not.toThrow();
  });

  it('rejects values outside the supported language union', () => {
    expect(isUiLanguage('tl')).toBe(true);
    expect(isUiLanguage('ceb')).toBe(true);
    expect(isUiLanguage('es')).toBe(false);
  });
});
