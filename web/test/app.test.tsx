import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { afterEach, describe, expect, it, vi } from 'vitest';
import App from '../src/App';

afterEach(() => vi.unstubAllGlobals());

describe('App home composition', () => {
  it('renders the Tagalog home, help dialog, and separate history dialog', () => {
    const html = renderToStaticMarkup(createElement(App));
    expect(html).toContain('id="ugatan-question"');
    expect(html).toContain('src="/UgatanLogo.png"');
    expect(html).toContain('src="/UgatanLogoIcon.svg"');
    expect(html).toContain('aria-label="Tulong"');
    expect(html).toContain('id="ugatan-help-dialog"');
    expect(html).toContain('aria-labelledby="ugatan-history-heading"');
    expect(html).toContain('aria-label="Isara ang mga nakaraang usapan"');
    expect(html).not.toContain('id="ugatan-language"');
    expect(html).not.toContain('<select');
  });

  it('ignores a previously saved English interface preference', () => {
    const getItem = vi.fn(() => 'en');
    vi.stubGlobal('window', { localStorage: { getItem } });
    const html = renderToStaticMarkup(createElement(App));
    expect(html).toContain('Lokal na katuwang sa pag-aalaga ng palay at mais.');
    expect(html).toContain('aria-label="Ipadala ang tanong"');
    expect(html).not.toContain('Send question');
    expect(getItem).not.toHaveBeenCalledWith('ugatan.ui-language');
  });

  it('keeps removed settings, manual sync, and demo cards absent', () => {
    const html = renderToStaticMarkup(createElement(App));
    for (const removed of [
      'Mga setting at sync',
      'Address ng hub',
      'Ipadala ngayon',
      'Demo lamang',
      'Bakit naninilaw ang mga dahon?',
      'Palay (rice)',
      'Piliin ang nakikita mo',
    ]) {
      expect(html).not.toContain(removed);
    }
  });
});
