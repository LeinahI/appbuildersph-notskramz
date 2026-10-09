import { describe, expect, it } from 'vitest';
import {
  DESCRIBE_SYSTEM_PROMPT,
  MATCH_NOT_SURE,
  MATCH_SURE,
  NO_SIGNS,
  SYSTEM_PROMPT,
  buildDescribeMessages,
  buildMessages,
  notesToExplain,
  systemPrompt,
} from '../src/index';

describe('buildDescribeMessages', () => {
  it('asks for plain English signs from any of the four languages, with no diagnosis', () => {
    for (const lang of ['Tagalog', 'Taglish', 'Cebuano (Bisaya)', 'English']) expect(DESCRIBE_SYSTEM_PROMPT).toContain(lang);
    expect(DESCRIBE_SYSTEM_PROMPT).toContain('Do not name any pest or disease');
    expect(DESCRIBE_SYSTEM_PROMPT).toContain(`answer exactly: ${NO_SIGNS}`);
    expect(DESCRIBE_SYSTEM_PROMPT).toContain('humay = rice plant (not corn)');
    expect(DESCRIBE_SYSTEM_PROMPT).toContain('Never invent a sign');
  });

  it('keeps the system prompt fixed and puts the question in the user message', () => {
    const [system, user] = buildDescribeMessages('Naay ulod sa mais', 'corn');
    expect(system!.content).toBe(DESCRIBE_SYSTEM_PROMPT);
    expect(user!.content).toBe("Crop: corn\nFarmer's report: Naay ulod sa mais");
  });
});

describe('buildMessages', () => {
  it('keeps the phone prompt at 150 words when no limit is given', () => {
    const [system] = buildMessages('Dilaw ang dahon', 'corn', []);
    expect(system!.content).toBe(SYSTEM_PROMPT);
    expect(SYSTEM_PROMPT).toContain('Keep the answer under 150 words');
  });

  it('changes only the word limit for the hub', () => {
    const [system] = buildMessages('Dilaw ang dahon', 'corn', [], { maxWords: 70 });
    expect(system!.content).toBe(systemPrompt(70));
    expect(system!.content).toContain('Keep the answer under 70 words');
    expect(system!.content.replace('70 words', '150 words')).toBe(SYSTEM_PROMPT);
  });
});

describe('matcher verdict in the prompt', () => {
  const entry = {
    id: 'rice-blast',
    crop: 'rice' as const,
    name: 'Rice blast',
    keywords: ['blast'],
    signs: ['Diamond-shaped spots'],
    actions: ['Check the field'],
    callExpertIf: 'It spreads fast',
    reviewedBy: '',
    reviewedOn: '',
  };

  it('tells the model to explain, not to diagnose', () => {
    expect(SYSTEM_PROMPT).toContain('not to diagnose');
    expect(SYSTEM_PROMPT).toContain('marked not sure');
  });

  it('marks a sure match by default', () => {
    const [, user] = buildMessages('May batik', 'rice', [entry]);
    expect(user!.content).toContain(MATCH_SURE);
    expect(user!.content).not.toContain(MATCH_NOT_SURE);
  });

  it('marks a match that is not sure', () => {
    const [, user] = buildMessages('May batik', 'rice', [entry], { sure: false });
    expect(user!.content).toContain(MATCH_NOT_SURE);
    expect(user!.content).not.toContain(MATCH_SURE);
  });

  it('adds no verdict when there are no notes', () => {
    const [, user] = buildMessages('May batik', 'rice', [], { sure: true });
    expect(user!.content).not.toMatch(/^Match:/m);
    expect(user!.content).toContain('No matching reference notes.');
  });

  it('keeps the system prompt the same whatever the verdict, so the hub can cache it', () => {
    const [a] = buildMessages('x', 'rice', [entry], { maxWords: 70, sure: true });
    const [b] = buildMessages('y', 'corn', [], { maxWords: 70, sure: false });
    expect(a!.content).toBe(b!.content);
  });
});

describe('notesToExplain', () => {
  it('keeps only the top note for a sure match', () => {
    expect(notesToExplain(['a', 'b'], true)).toEqual(['a']);
  });

  it('keeps every candidate when the match is not sure', () => {
    expect(notesToExplain(['a', 'b'], false)).toEqual(['a', 'b']);
    expect(notesToExplain([], false)).toEqual([]);
  });
});
