import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { createElement, type ReactNode } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';
import App from '../src/App';

afterEach(() => vi.unstubAllGlobals());

function renderApp() {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return renderToStaticMarkup(
    createElement(
      QueryClientProvider,
      { client },
      createElement(MemoryRouter, null, createElement(App) as ReactNode),
    ),
  );
}

describe('App home composition', () => {
  it('renders the Tagalog home, help dialog, and separate history dialog', () => {
    const html = renderApp();
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
    const html = renderApp();
    expect(html).toContain('Lokal na katuwang sa pag-aalaga ng palay at mais.');
    expect(html).toContain('aria-label="Ipadala ang tanong"');
    expect(html).not.toContain('Send question');
    expect(getItem).not.toHaveBeenCalledWith('ugatan.ui-language');
  });

  it('keeps the existing flow reachable: symptom picker, photo, and voice, with no sign-in or log-out', () => {
    const html = renderApp();
    expect(html).toContain('Piliin ang nakikita mo');
    expect(html).toContain('aria-label="Larawan"');
    expect(html).toContain('aria-label="Magsalita"');
    expect(html).toContain('type="file"');
    // Farmers never sign in: the chat and its history live in the phone's own storage.
    expect(html).not.toContain('Mag-log out');
    expect(html).not.toContain('Mag-sign in');
  });

  it('keeps the removed prototype controls and demo cards absent', () => {
    const html = renderApp();
    for (const removed of ['Mga setting at sync', 'Demo lamang', 'Bakit naninilaw ang mga dahon?', 'Palay (rice)']) {
      expect(html).not.toContain(removed);
    }
  });
});
