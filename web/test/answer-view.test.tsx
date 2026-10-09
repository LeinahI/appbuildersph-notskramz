import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { DISCLAIMER, findViolations, matchKeywords } from '@ugatan/shared';
import { AnswerView } from '../src/components/AnswerView';
import { KNOWLEDGE } from '../src/config/knowledge';
import { LABELS } from '../src/config/labels';
import { SYMPTOM_TILE } from '../src/symptoms';

/** Visible text of the rendered HTML, with tags removed and entities decoded. */
function visibleText(html: string): string {
  return html
    .replace(/<[^>]+>/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&#x27;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/\s+/g, ' ')
    .trim();
}

describe('rendered answers pass the pesticide guardrail', () => {
  it.each(KNOWLEDGE.map((e) => [e.id, e] as const))('%s: clear match', (_id, entry) => {
    const html = renderToStaticMarkup(
      createElement(AnswerView, { matches: [entry], clear: true, labels: LABELS.tl }),
    );
    const text = visibleText(html);
    expect(findViolations(text)).toEqual([]);
    expect(text.endsWith(DISCLAIMER)).toBe(true);
  });

  it.each(KNOWLEDGE.map((e) => [e.id, e] as const))('%s: not-sure match', (_id, entry) => {
    const html = renderToStaticMarkup(
      createElement(AnswerView, { matches: [entry], clear: false, labels: LABELS.tl }),
    );
    const text = visibleText(html);
    expect(text).toContain('Hindi tiyak. Tawagan ang lokal na agriculturist');
    expect(findViolations(text)).toEqual([]);
    expect(text.endsWith(DISCLAIMER)).toBe(true);
  });

  it('shows "not sure, call the agriculturist" when nothing matches', () => {
    const html = renderToStaticMarkup(
      createElement(AnswerView, { matches: [], clear: false, labels: LABELS.tl }),
    );
    const text = visibleText(html);
    expect(text).toContain('Walang malinaw na tugma');
    expect(text.endsWith(DISCLAIMER)).toBe(true);
  });

  it('never renders an AI explanation that names a brand or gives a dosage', () => {
    const html = renderToStaticMarkup(
      createElement(AnswerView, {
        matches: [KNOWLEDGE[0]],
        clear: true,
        labels: LABELS.tl,
        explanation: 'Gamitin ang Karate, 2 ml kada litro.',
        explanationStatus: 'phone',
      }),
    );
    const text = visibleText(html);
    expect(text).not.toContain('Karate');
    expect(text).toContain('Hindi naipakita ang paliwanag');
    expect(text.endsWith(DISCLAIMER)).toBe(true);
  });

  it('renders a safe AI explanation above the disclaimer', () => {
    const html = renderToStaticMarkup(
      createElement(AnswerView, {
        matches: [KNOWLEDGE[0]],
        clear: true,
        labels: LABELS.tl,
        explanation: 'Tingnan ang base ng mga halaman para sa maliliit na insekto.',
        explanationStatus: 'ok',
      }),
    );
    const text = visibleText(html);
    expect(text).toContain('Tingnan ang base ng mga halaman');
    expect(text.endsWith(DISCLAIMER)).toBe(true);
  });

  it('matches each entry from its own keywords without a guardrail violation', () => {
    for (const entry of KNOWLEDGE) {
      const result = matchKeywords(entry.keywords[0], entry.crop, KNOWLEDGE);
      expect(result.matches.map((m) => m.entry.id)).toContain(entry.id);
    }
  });

  it.each([
    ['en', LABELS.en, 'Signs', 'Steps', 'Consult an expert now if:'],
    ['ceb', LABELS.ceb, 'Mga timailhan', 'Mga lakang', 'Pakigsulti dayon sa eksperto kung:'],
  ] as const)(
    'renders %s interface headings without translating safety content',
    (_language, labels, signs, steps, consult) => {
      const html = renderToStaticMarkup(
        createElement(AnswerView, {
          matches: [KNOWLEDGE[0]],
          clear: true,
          labels,
        }),
      );
      const text = visibleText(html);
      expect(text).toContain(signs);
      expect(text).toContain(steps);
      expect(text).toContain(consult);
      expect(text.endsWith(DISCLAIMER)).toBe(true);
      expect(findViolations(text)).toEqual([]);
    },
  );
});

describe('symptom picture list', () => {
  it.each(KNOWLEDGE.map((e) => [e.id] as const))('has a tile for %s', (id) => {
    expect(SYMPTOM_TILE[id]).toBeDefined();
    expect(SYMPTOM_TILE[id].labelTl.length).toBeGreaterThan(0);
  });
});
