import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { SymptomArt, SCENE_IDS } from '../src/components/SymptomArt';
import { SymptomPicker } from '../src/components/SymptomPicker';
import { KNOWLEDGE } from '../src/config/knowledge';
import { LABELS, L } from '../src/config/labels';
import { SYMPTOM_TILE } from '../src/symptoms';

const render = (labels = L, compact = false) =>
  renderToStaticMarkup(createElement(SymptomPicker, { labels, onPick: () => {}, compact }));

describe('symptom picker', () => {
  it('opens on the rice tab with one card per rice problem, each with a picture, title, cue, and plant-part badge', () => {
    const html = render();
    const rice = KNOWLEDGE.filter((e) => e.crop === 'rice');
    expect((html.match(/<li/g) ?? []).length).toBe(rice.length);
    expect((html.match(/<svg viewBox="0 0 160 120"/g) ?? []).length).toBe(rice.length);
    expect(html).toContain('Piliin ang nakikita mo');
    expect(html).toContain('I-tap ang larawan kung hindi ka sigurado sa salita.');
    expect(html).toContain('Diamond na batik');
    expect(html).toContain('Hugis-diamond sa dahon');
    // Corn cards are behind the other tab.
    expect(html).not.toContain('Butas sa dahon ng mais');
  });

  it('has an accessible crop tab list and plant-part filter', () => {
    const html = render();
    expect(html).toContain('role="tablist"');
    expect(html).toMatch(/role="tab"[^>]*aria-selected="true"[^>]*>.*Palay/);
    expect(html).toMatch(/role="tab"[^>]*aria-selected="false"[^>]*tabindex="-1"[^>]*>.*Mais/);
    expect(html).toContain('role="tabpanel"');
    expect(html).toMatch(/aria-pressed="true"[^>]*>Lahat</);
    for (const label of ['Dahon', 'Tangkay', 'Uhay/Butil', 'Peste']) expect(html).toContain(`>${label}</button>`);
  });

  it('makes every tab, chip, and card at least 48px tall', () => {
    const html = render();
    expect((html.match(/min-h-12/g) ?? []).length).toBeGreaterThanOrEqual(7);
  });

  it('turns into a one-row strip inside the composer tray, so the chat keeps its room', () => {
    const tray = render(L, true);
    expect(tray).toContain('snap-x');
    expect(tray).not.toContain('grid-cols-2 gap-3');
    expect(tray).not.toContain('I-tap ang larawan');
    expect(render(L, false)).toContain('grid-cols-2 gap-3');
  });

  it.each(Object.keys(LABELS) as (keyof typeof LABELS)[])('renders in %s', (language) => {
    const html = render(LABELS[language]);
    expect(html).toContain(LABELS[language].cropTabRice);
    expect(html).toContain(LABELS[language].partAll);
  });
});

describe('symptom card data', () => {
  it.each(KNOWLEDGE.map((e) => [e.id] as const))('describes %s for a card', (id) => {
    const tile = SYMPTOM_TILE[id]!;
    expect(tile.titleTl.length).toBeGreaterThan(0);
    expect(tile.cueTl.length).toBeGreaterThan(0);
    expect(['dahon', 'tangkay', 'uhay']).toContain(tile.part);
    expect(SCENE_IDS()).toContain(id);
  });

  it('draws an offline picture for every problem', () => {
    for (const { id } of KNOWLEDGE) expect(renderToStaticMarkup(createElement(SymptomArt, { id }))).toContain('<svg');
  });
});
