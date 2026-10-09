import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import { ConversationDialog } from '../src/components/ConversationDialog';
import { L } from '../src/config/labels';

const props = { labels: L, locale: 'tl-PH', onNewConversation: vi.fn(), onQuickStart: vi.fn(), onSelect: vi.fn() };

describe('conversation dialog', () => {
  it('shows an inviting empty state with quick starts and a compact privacy footer', () => {
    const onNewConversation = vi.fn();
    const html = renderToStaticMarkup(createElement(ConversationDialog, { ...props, items: [], onNewConversation }));
    expect(html).toContain('id="ugatan-history-dialog"');
    expect(html).toContain('aria-labelledby="ugatan-history-heading"');
    expect(html).toContain('Mga usapan');
    expect(html).toContain('Bagong usapan');
    expect(html).toContain('method="dialog"');
    expect(html).toContain('Walang nakaraang usapan');
    for (const prompt of L.historyQuickStarts) expect(html).toContain(prompt);
    expect(html).toContain('Naka-save lamang sa device na ito');
    // Nothing to search yet.
    expect(html).not.toContain('type="search"');
    expect(onNewConversation).not.toHaveBeenCalled();
  });

  it('groups saved questions by day, newest first, with search', () => {
    const now = new Date();
    const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const html = renderToStaticMarkup(createElement(ConversationDialog, {
      ...props,
      items: [
        { uid: 'a', crop: 'any', text: 'unang tanong', status: 'answered', createdAt: yesterday.toISOString(), matchIds: [], clear: false },
        { uid: 'b', crop: 'any', text: 'huling tanong', status: 'queued', createdAt: now.toISOString(), matchIds: [], clear: false },
      ],
    }));
    expect(html).toContain('type="search"');
    expect(html).toContain('Ngayon');
    expect(html).toContain('Kahapon');
    expect(html.indexOf('huling tanong')).toBeLessThan(html.indexOf('unang tanong'));
    expect(html).not.toContain('Walang nakaraang usapan');
  });

  it('renders long saved questions as buttons without losing their text', () => {
    const text = 'May batik sa dahon ng palay. '.repeat(30);
    const html = renderToStaticMarkup(createElement(ConversationDialog, {
      ...props,
      items: [{
        uid: 'saved', crop: 'any', text, status: 'queued',
        createdAt: '2026-01-05T08:00:00.000Z', matchIds: [], clear: false,
      }],
    }));
    expect(html).toContain(text);
    expect(html).toContain('Mas nauna');
    expect(html).not.toContain('<textarea');
  });
});
