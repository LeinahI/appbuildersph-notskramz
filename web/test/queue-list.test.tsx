import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
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
  it('renders localized status text', () => {
    const english = renderToStaticMarkup(
      createElement(QueueList, { items: [item], labels: LABELS.en, locale: 'en-PH' }),
    );
    const cebuano = renderToStaticMarkup(
      createElement(QueueList, { items: [item], labels: LABELS.ceb, locale: 'ceb-PH' }),
    );
    expect(english).toContain('Queued');
    expect(cebuano).toContain('Nakapila');
  });

  it('renders the localized empty state', () => {
    const html = renderToStaticMarkup(
      createElement(QueueList, { items: [], labels: LABELS.en, locale: 'en-PH' }),
    );
    expect(html).toContain('No questions yet.');
  });
});
