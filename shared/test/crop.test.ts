import { describe, expect, it } from 'vitest';
import { cropOfChat, detectCrop } from '../src/index';

describe('detectCrop', () => {
  it('reads rice and corn words in Tagalog, Cebuano, and English', () => {
    expect(detectCrop('may mali sa palay ko')).toBe('rice');
    expect(detectCrop('Ang humay nauga')).toBe('rice');
    expect(detectCrop('Dilaw ang dahon ng mais')).toBe('corn');
    expect(detectCrop('corn leaves have holes')).toBe('corn');
  });

  it('says nothing when no crop or both crops are named', () => {
    expect(detectCrop('may butas po')).toBeNull();
    expect(detectCrop('kangkong po')).toBeNull();
    expect(detectCrop('palay at mais')).toBeNull();
    // Whole words only: "maisip" is not corn.
    expect(detectCrop('hindi ko maisip')).toBeNull();
  });

  it('ignores negated or excluded crop words', () => {
    expect(detectCrop('maliban sa palay')).toBeNull();
    expect(detectCrop('maliban sa palay o mais')).toBeNull();
    expect(detectCrop('hindi palay')).toBeNull();
    expect(detectCrop('other than rice')).toBeNull();
    expect(detectCrop('may butas sa mais, hindi palay')).toBe('corn');
  });
});

describe('cropOfChat', () => {
  it('takes the crop from the newest message that names one', () => {
    const history = [
      { question: 'hello', reply: 'Kumusta?' },
      { question: 'may mali sa palay ko', reply: 'Ano ang nakikita mo?' },
    ];
    expect(cropOfChat('may butas po', history)).toBe('rice');
    expect(cropOfChat('sa mais naman, may butas', history)).toBe('corn');
    expect(cropOfChat('may butas po')).toBe('any');
  });
});
