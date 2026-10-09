import { describe, expect, it } from 'vitest';
import { leadParagraphs } from '../src/lib/answer-lead';

describe('leadParagraphs', () => {
  it('keeps the prose and drops the numbered steps the card lists itself', () => {
    const reply = 'Ang problema ay Golden apple snail.\n\n1. Kunin ang mga kuhol.\n2. Ayusin ang tubig.';
    expect(leadParagraphs(reply)).toEqual(['Ang problema ay Golden apple snail.']);
  });

  it('drops a line that only introduces a dropped list', () => {
    expect(leadParagraphs('May kuhol.\nGawin ito:\n- Pulutin\n- Sirain')).toEqual(['May kuhol.']);
  });

  it('keeps a colon line that introduces prose', () => {
    expect(leadParagraphs('Tandaan: bantayan ang tubig.')).toEqual(['Tandaan: bantayan ang tubig.']);
  });

  it('is empty when the reply is only a list', () => {
    expect(leadParagraphs('1. Isa\n2. Dalawa')).toEqual([]);
  });
});
