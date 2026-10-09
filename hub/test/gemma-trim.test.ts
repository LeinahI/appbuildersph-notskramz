import { describe, expect, it } from 'vitest';
import { trimToSentence } from '../src/explain/gemma';

describe('trimToSentence', () => {
  it('cuts a capped answer back to the last full sentence', () => {
    expect(trimToSentence('1. Iwasan ang sobrang nitrogen.\n2. Ayusin ang drainage.\n3. Pumili ng lumalaba')).toBe(
      '1. Iwasan ang sobrang nitrogen.\n2. Ayusin ang drainage.',
    );
  });

  it('keeps the text when there is no sentence boundary worth cutting at', () => {
    expect(trimToSentence('Isang mahabang pangungusap na walang tuldok')).toBe('Isang mahabang pangungusap na walang tuldok');
    expect(trimToSentence('Oo. tapos ang isang napakahabang bahagi na hindi natapos')).toContain('napakahabang');
  });
});
