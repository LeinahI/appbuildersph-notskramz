import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { parseEvalCsv } from '../../eval/lib/csv';
import { createKeywordMatcher } from '../src/matchers/keyword';
import { loadKnowledge } from '../src/knowledge';

// Known English gaps. The keyword list does not yet cover these English descriptions.
// Each entry is a real miss from eval/descriptions.csv, kept visible rather than tuned away.
// A gap may come back "not sure", never as a confident wrong answer.
const KNOWN_ENGLISH_GAPS: ReadonlySet<string> = new Set(['stem-borer']);

const rows = parseEvalCsv(readFileSync(new URL('../../eval/descriptions.csv', import.meta.url), 'utf8'));
const knowledge = loadKnowledge(new URL('../../knowledge/', import.meta.url));
const matcher = createKeywordMatcher(knowledge);

describe('keyword matcher on the labeled examples', () => {
  for (const entry of knowledge) {
    it(`${entry.id}: its Tagalog and Taglish examples match as the top answer`, async () => {
      const examples = rows.filter((r) => r.expectedId === entry.id && r.lang !== 'en');
      expect(examples.length).toBeGreaterThan(0);
      for (const ex of examples) {
        const r = await matcher.match(ex.text, 'any');
        expect(r.ids[0], ex.text).toBe(entry.id);
      }
    });

    it(`${entry.id}: its English examples match, or are a documented gap`, async () => {
      const examples = rows.filter((r) => r.expectedId === entry.id && r.lang === 'en');
      for (const ex of examples) {
        const r = await matcher.match(ex.text, 'any');
        if (KNOWN_ENGLISH_GAPS.has(entry.id)) {
          expect(r.ids[0] === entry.id || !r.clear, ex.text).toBe(true);
        } else {
          expect(r.ids[0], ex.text).toBe(entry.id);
        }
      }
    });
  }

  it('never answers a labeled description confidently with the wrong entry', async () => {
    for (const row of rows.filter((r) => r.expectedId !== 'none')) {
      const r = await matcher.match(row.text, 'any');
      if (r.clear) expect(r.ids[0], row.text).toBe(row.expectedId);
    }
  });

  it('answers the "none" descriptions with "not sure"', async () => {
    for (const row of rows.filter((r) => r.expectedId === 'none')) {
      const r = await matcher.match(row.text, 'any');
      expect(r.clear, row.text).toBe(false);
    }
  });
});
