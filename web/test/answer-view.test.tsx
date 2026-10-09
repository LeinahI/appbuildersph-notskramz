import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { DISCLAIMER, findViolations, matchKeywords } from '@ugatan/shared';
import { AnswerView } from '../src/components/AnswerView';
import { KNOWLEDGE } from '../src/config/knowledge';
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
    const html = renderToStaticMarkup(createElement(AnswerView, { matches: [entry], clear: true }));
    const text = visibleText(html);
    expect(findViolations(text)).toEqual([]);
    expect(text.endsWith(DISCLAIMER)).toBe(true);
  });

  it.each(KNOWLEDGE.map((e) => [e.id, e] as const))('%s: not-sure match', (_id, entry) => {
    const html = renderToStaticMarkup(createElement(AnswerView, { matches: [entry], clear: false }));
    const text = visibleText(html);
    expect(text).toContain('Hindi tiyak. Tawagan ang lokal na agriculturist');
    expect(findViolations(text)).toEqual([]);
    // Not sure gives no treatment advice, so it carries no pesticide notice and no notes.
    expect(text).not.toContain(DISCLAIMER);
    expect(text).not.toContain('Mga hakbang');
  });

  it('shows "not sure, call the agriculturist" when nothing matches, without the notice', () => {
    const html = renderToStaticMarkup(createElement(AnswerView, { matches: [], clear: false }));
    const text = visibleText(html);
    expect(text).toContain('Walang malinaw na tugma');
    expect(text).not.toContain(DISCLAIMER);
  });

  it('never renders an AI explanation that names a brand or gives a dosage', () => {
    const html = renderToStaticMarkup(
      createElement(AnswerView, {
        matches: [KNOWLEDGE[0]],
        clear: true,
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
});

describe('one response, and the notice only on treatment', () => {
  it('answers a greeting with its reply, with no match line, no Tugma card, and no notice', () => {
    const html = renderToStaticMarkup(
      createElement(AnswerView, { matches: [], clear: false, fallback: 'Opo, ano po ang problema sa palay o mais ninyo?' }),
    );
    const text = visibleText(html);
    expect(text).toContain('Opo, ano po ang problema sa palay o mais ninyo?');
    expect(text).not.toContain('Walang malinaw na tugma');
    expect(text).not.toContain('Tugma');
    expect(text).not.toContain(DISCLAIMER);
  });

  it('shows a match as Tugma only when it is sure, and names the symptom it matched on', () => {
    const bph = KNOWLEDGE.find((e) => e.id === 'bph')!;
    const sure = visibleText(
      renderToStaticMarkup(createElement(AnswerView, { matches: [bph], clear: true, matchedOn: ['kumpol'], explanation: null, explanationStatus: 'unavailable' })),
    );
    expect(sure).toContain('Dahil sa: "kumpol"');
    const unsure = visibleText(
      renderToStaticMarkup(createElement(AnswerView, { matches: [bph], clear: false, matchedOn: ['kumpol'], explanation: 'Ano po ang kulay?', explanationStatus: 'ok' })),
    );
    expect(unsure).not.toContain('Tugma');
    expect(unsure).not.toContain('Dahil sa');
  });

  it('shows one question in place of the "not sure" line when the model has written one', () => {
    const text = visibleText(
      renderToStaticMarkup(
        createElement(AnswerView, {
          matches: [KNOWLEDGE[0]],
          clear: false,
          explanation: 'Hindi pa malinaw kung alin. Ano po ang kulay ng batik?',
          explanationStatus: 'ok',
        }),
      ),
    );
    expect(text).toContain('Ano po ang kulay ng batik?');
    expect(text).not.toContain('Hindi tiyak.');
    expect(text).not.toContain(DISCLAIMER);
  });

  it('keeps the notice on a chat reply that gives treatment advice', () => {
    const text = visibleText(
      renderToStaticMarkup(
        createElement(AnswerView, { matches: [], clear: false, explanation: 'Mag-spray po kayo sa gilid ng palayan.', explanationStatus: 'ok' }),
      ),
    );
    expect(text.endsWith(DISCLAIMER)).toBe(true);
  });
});

describe('symptom picture list', () => {
  it.each(KNOWLEDGE.map((e) => [e.id] as const))('has a tile for %s', (id) => {
    expect(SYMPTOM_TILE[id]).toBeDefined();
    expect(SYMPTOM_TILE[id].labelTl.length).toBeGreaterThan(0);
  });
});
