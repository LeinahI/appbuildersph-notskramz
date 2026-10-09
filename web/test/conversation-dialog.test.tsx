import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import { ConversationDialog } from '../src/components/ConversationDialog';
import { L } from '../src/config/labels';

describe('conversation dialog', () => {
  it('provides the screenshot layout with native close and an explicit new-chat action', () => {
    const onNewConversation = vi.fn();
    const html = renderToStaticMarkup(createElement(ConversationDialog, {
      items: [], labels: L, locale: 'tl-PH', onNewConversation, onSelect: vi.fn(),
    }));
    expect(html).toContain('id="ugatan-history-dialog"');
    expect(html).toContain('aria-labelledby="ugatan-history-heading"');
    expect(html).toContain('Mga usapan');
    expect(html).toContain('Bagong usapan');
    expect(html).toContain('method="dialog"');
    expect(html).toContain('Wala pang tanong.');
    expect(html).toContain('Teksto lamang ang naka-save.');
    expect(onNewConversation).not.toHaveBeenCalled();
  });

  it('renders long saved questions as buttons without losing their text', () => {
    const text = 'May batik sa dahon ng palay. '.repeat(30);
    const html = renderToStaticMarkup(createElement(ConversationDialog, {
      items: [{
        uid: 'saved', crop: 'any', text, status: 'queued',
        createdAt: '2026-10-09T08:00:00.000Z', matchIds: [], clear: false,
      }],
      labels: L, locale: 'tl-PH', onNewConversation: vi.fn(), onSelect: vi.fn(),
    }));
    expect(html).toContain(text);
    expect(html).toContain('1 tanong · Naka-save sa device');
    expect(html).not.toContain('<textarea');
  });
});
