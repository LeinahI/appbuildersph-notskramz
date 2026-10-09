import { readdirSync, readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import {
  LAST_RESORT,
  buildMessages,
  composeAnswer,
  findViolations,
  insectFacts,
  matchKeywords,
  systemPrompt,
  validateEntry,
  type KnowledgeEntry,
} from '../src/index';

const KNOWLEDGE_DIR = new URL('../../knowledge/', import.meta.url);
const KB: KnowledgeEntry[] = readdirSync(KNOWLEDGE_DIR)
  .filter((f) => f.endsWith('.json'))
  .sort()
  .map((f) => JSON.parse(readFileSync(new URL(f, KNOWLEDGE_DIR), 'utf8')) as KnowledgeEntry);
const byId = (id: string) => KB.find((e) => e.id === id)!;

/** Every problem in knowledge/ that is an insect. A new insect file must be added here, so it cannot ship without a profile. */
const INSECT_IDS = [
  'asiatic-corn-borer', 'bph', 'common-cutworm', 'corn-aphid', 'corn-armyworm', 'corn-earworm', 'corn-planthopper',
  'fall-armyworm', 'green-leafhopper', 'rice-armyworm', 'rice-black-bug', 'rice-bug', 'rice-caseworm', 'rice-leaffolder',
  'rice-whorl-maggot', 'stem-borer',
];

describe('insect profiles in knowledge/', () => {
  it('has a profile for every insect and none for the diseases or the snail', () => {
    expect(KB.filter((e) => e.insect).map((e) => e.id).sort()).toEqual(INSECT_IDS);
  });

  it.each(INSECT_IDS)('%s names the insect, its crop stage, and a natural enemy, and passes the guardrail', (id) => {
    const entry = byId(id);
    expect(validateEntry(entry, id)).toEqual([]);
    const facts = insectFacts(entry)!;
    expect(facts.identity).toMatch(/\(.+\)/);
    expect(facts.localNames.length).toBeGreaterThan(0);
    expect(facts.biological.length).toBeGreaterThan(0);
    expect(findViolations(JSON.stringify(entry.insect))).toEqual([]);
  });

  it('keeps the names the research confirmed for the insects the farmer is most likely to ask about', () => {
    expect(byId('rice-bug').insect!.localNames).toContain('Atangya');
    expect(byId('rice-black-bug').insect!.localNames).toContain('Itim na atangya');
    expect(byId('stem-borer').insect!.localNames.join(' ')).toContain('Aksip');
    expect(byId('rice-armyworm').insect!.localNames).toContain('Harabas');
    expect(byId('rice-bug').insect!.scientificName).toBe('Leptocorisa oratorius');
  });
});

describe('validateEntry with an insect profile', () => {
  const good = byId('rice-bug');

  it('accepts a complete profile', () => {
    expect(validateEntry(good, 'rice-bug')).toEqual([]);
  });

  it('rejects a profile with a missing scientific name, an unknown stage, or no natural enemies', () => {
    const bad = { ...good, insect: { ...good.insect!, scientificName: '', stages: ['harvest'], biological: [] } };
    const errors = validateEntry(bad, 'rice-bug');
    expect(errors).toContain('insect.scientificName is required');
    expect(errors.some((e) => e.startsWith('insect.stages must be'))).toBe(true);
    expect(errors).toContain('insect.biological must be a non-empty list of strings');
  });

  it('runs the pesticide guardrail over the profile text', () => {
    const bad = { ...good, insect: { ...good.insect!, biological: ['Spray Karate on the grain heads'] } };
    expect(validateEntry(bad, 'rice-bug').some((e) => e.startsWith('brand text "Karate"'))).toBe(true);
  });
});

describe('the insect answer', () => {
  it('has a last-resort line with protective gear that passes the guardrail', () => {
    expect(LAST_RESORT).toMatch(/guwantes/);
    expect(LAST_RESORT).toMatch(/PPE/);
    expect(findViolations(LAST_RESORT)).toEqual([]);
  });

  it('is composed offline with the names, crop stage, natural enemies, and the last resort, then the pesticide notice', () => {
    const entry = byId('rice-bug');
    const { text } = composeAnswer({ result: { matches: [{ entry, score: 2, hits: ['atangya'] }], clear: true } });
    expect(text).toContain('Kulisap: Rice bug (Leptocorisa oratorius)');
    expect(text).toContain('Tawag sa atin: Atangya, Dangaw (Ilocano)');
    expect(text).toContain('Inaatake: Palay: reproductive');
    expect(text).toContain('Likas na kalaban: Small wasps');
    expect(text).toContain(`Huling opsyon: ${LAST_RESORT}`);
    expect(text.trim().endsWith('Kumpirmahin sa lokal na agriculturist bago gumamit ng anumang pesticide.')).toBe(true);
    expect(findViolations(text)).toEqual([]);
  });

  it('leaves a disease answer exactly as it was', () => {
    const entry = byId('rice-blast');
    const { text } = composeAnswer({ result: { matches: [{ entry, score: 1, hits: [] }], clear: true } });
    expect(text).not.toContain('Kulisap');
    expect(text).not.toContain('Huling opsyon');
  });

  it('tells the model the insect line for an insect note and nothing extra for a disease note', () => {
    const insect = buildMessages('atangya sa palay', 'rice', [byId('rice-bug')])[1]!.content;
    expect(insect).toContain('Insect: Rice bug (Leptocorisa oratorius). Filipino names: Atangya, Dangaw (Ilocano).');
    expect(insect).toContain('Attacks: Palay: reproductive');
    expect(insect).toContain('Natural enemies: Small wasps');
    expect(buildMessages('batik sa dahon', 'rice', [byId('rice-blast')])[1]!.content).not.toContain('Insect:');
  });

  it('asks the model for the names, the stage, the damage, the steps, and spraying as a last option with protective gear', () => {
    const prompt = systemPrompt();
    expect(prompt).toContain('Insect line');
    expect(prompt).toContain('English name, its scientific name, and its Filipino names');
    expect(prompt).toContain('spraying is only the last option');
    expect(prompt).toContain('gloves, a mask, long sleeves, and boots');
    expect(prompt).toContain('Never name pesticide brands, active ingredients, or doses');
  });
});

describe('matching an insect by its name', () => {
  it('counts the local name double, so naming the insect settles a tie', () => {
    const r = matchKeywords('Maraming atangya sa palay namin, walang laman ang mga butil', 'any', KB);
    expect(r.matches[0]!.entry.id).toBe('rice-bug');
    expect(r.clear).toBe(true);
    expect(r.matches[0]!.hits).toContain('atangya');
  });

  it('matches the scientific name and a plural', () => {
    expect(matchKeywords('Leptocorisa oratorius', 'any', KB).matches[0]!.entry.id).toBe('rice-bug');
    expect(matchKeywords('armyworms in the rice', 'rice', KB).matches[0]!.entry.id).toBe('rice-armyworm');
  });

  it('lets the longer name win: "itim na atangya" is the black bug, not the rice bug', () => {
    const r = matchKeywords('May itim na atangya sa palay', 'any', KB);
    expect(r.matches.map((m) => m.entry.id)).toEqual(['rice-black-bug']);
    expect(r.clear).toBe(true);
  });

  it('lets "fall armyworm" belong to the fall armyworm, not the plain armyworm', () => {
    const r = matchKeywords('fall armyworm', 'any', KB);
    expect(r.matches.map((m) => m.entry.id)).toEqual(['fall-armyworm']);
  });

  it('is not clear between the rice and corn armyworm when the crop is not known, and clear once it is', () => {
    expect(matchKeywords('harabas', 'any', KB).clear).toBe(false);
    expect(matchKeywords('harabas', 'rice', KB).matches[0]!.entry.id).toBe('rice-armyworm');
    expect(matchKeywords('harabas', 'corn', KB).matches[0]!.entry.id).toBe('corn-armyworm');
  });
});
