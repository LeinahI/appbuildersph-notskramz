import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import { QueueList } from '../src/components/QueueList';
import { LABELS } from '../src/config/labels';

const item = {
  id: 1,
  uid: 'question-1',
  crop: 'any' as const,
  text: 'Why are the leaves yellow?',
  createdAt: '2026-10-09T08:00:00.000Z',
  status: 'queued' as const,
  matchIds: [],
  clear: false,
};

describe('question history', () => {
  it('renders selectable saved questions with localized metadata', () => {
    const english = renderToStaticMarkup(
      createElement(QueueList, { items: [item], labels: LABELS.en, locale: 'en-PH', onSelect: vi.fn() }),
    );
    const cebuano = renderToStaticMarkup(
      createElement(QueueList, { items: [item], labels: LABELS.ceb, locale: 'ceb-PH', onSelect: vi.fn() }),
    );
    expect(english).toContain('Why are the leaves yellow?');
    expect(english).toContain('<button');
    expect(english).toContain('dateTime="2026-10-09T08:00:00.000Z"');
    // The hub status stays visible: queued questions still wait for the hub.
    expect(english).toContain('Queued');
    expect(cebuano).toContain('Nakapila');
  });

  it('opens the selected saved question without creating another record', () => {
    const onSelect = vi.fn();
    const list = QueueList({ items: [item], labels: LABELS.tl, locale: 'tl-PH', onSelect });
    const row = list.props.children[0];
    row.props.children.props.onClick();
    expect(onSelect).toHaveBeenCalledTimes(1);
    expect(onSelect).toHaveBeenCalledWith(item);
  });

  it('renders the localized empty state', () => {
    const html = renderToStaticMarkup(
      createElement(QueueList, { items: [], labels: LABELS.en, locale: 'en-PH', onSelect: vi.fn() }),
    );
    expect(html).toContain('No questions yet.');
  });
});
