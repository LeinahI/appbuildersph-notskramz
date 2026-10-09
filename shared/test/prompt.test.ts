import { describe, expect, it } from 'vitest';
import { SYSTEM_PROMPT, buildMessages, systemPrompt } from '../src/index';

describe('buildMessages', () => {
  it('keeps the phone prompt at 150 words when no limit is given', () => {
    const [system] = buildMessages('Dilaw ang dahon', 'corn', []);
    expect(system!.content).toBe(SYSTEM_PROMPT);
    expect(SYSTEM_PROMPT).toContain('Keep the answer under 150 words');
  });

  it('changes only the word limit for the hub', () => {
    const [system] = buildMessages('Dilaw ang dahon', 'corn', [], 70);
    expect(system!.content).toBe(systemPrompt(70));
    expect(system!.content).toContain('Keep the answer under 70 words');
    expect(system!.content.replace('70 words', '150 words')).toBe(SYSTEM_PROMPT);
  });
});
