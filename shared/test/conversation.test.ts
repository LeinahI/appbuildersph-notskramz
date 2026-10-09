import { describe, expect, it } from 'vitest';
import {
  carriesNotice,
  isFinalAnswer,
  isSmallTalk,
  limitQuestions,
  mentionsTreatment,
  nextFollowUps,
  routeFor,
  sessionNotes,
  sessionText,
  smallTalkReply,
} from '../src/index';

describe('small talk and routing', () => {
  it.each(['hello po', 'Kumusta po?', 'magandang umaga', 'maari niyo ba ako tulungan', 'salamat po', 'paalam', 'good morning'])(
    'treats "%s" as small talk',
    (text) => {
      expect(isSmallTalk(text)).toBe(true);
      expect(routeFor(text, false)).toBe('chat');
    },
  );

  it.each(['bat ganyan response mo, kausapin mo ako', 'hindi ka nakakatulong'])('treats the complaint "%s" as small talk', (text) => {
    expect(routeFor(text, false)).toBe('chat');
  });

  it('sends a message with a symptom to matching, even when it starts with a greeting', () => {
    expect(isSmallTalk('hello po, may butas ang dahon')).toBe(true);
    expect(routeFor('hello po, may butas ang dahon', true)).toBe('match');
  });

  it.each(['may butas po siya', 'Dilaw ang dahon', 'kailan mag-aani?'])('sends "%s" to matching', (text) => {
    expect(isSmallTalk(text)).toBe(false);
    expect(routeFor(text, false)).toBe('match');
  });

  it('answers small talk with one question, or none for thanks', () => {
    expect(smallTalkReply('maari niyo ba ako tulungan')).toBe('Opo, ano po ang problema sa palay o mais ninyo?');
    expect(smallTalkReply('hello po').match(/\?/g)).toHaveLength(1);
    expect(smallTalkReply('salamat po')).not.toContain('?');
    expect(smallTalkReply('bat ganyan response mo')).toMatch(/^Pasensya na po/);
  });
});

describe('the session description the matcher reads', () => {
  it('keeps symptom notes and drops small talk, so a greeting does not change the match', () => {
    const hasSign = (text: string) => /butas|dahon/.test(text);
    expect(sessionNotes(['hello po', 'may butas sa dahon', 'salamat po', 'may butas po siya'], hasSign)).toEqual([
      'may butas sa dahon',
      'may butas po siya',
    ]);
  });

  it('joins every note, oldest first, so a short follow-up still carries the crop and the problem', () => {
    const text = sessionText(['may mali sa palay ko', 'may butas po siya']);
    expect(text).toBe('may mali sa palay ko. may butas po siya');
  });

  it('keeps the newest notes when the text runs past the limit', () => {
    const notes = Array.from({ length: 10 }, (_, i) => `sintomas ${i} ${'x'.repeat(200)}`);
    const text = sessionText(notes);
    expect(text.length).toBeLessThanOrEqual(1000);
    expect(text).toContain('sintomas 9');
    expect(text).not.toContain('sintomas 0 ');
  });
});

describe('one question per reply', () => {
  it('keeps the first question and drops the rest', () => {
    expect(limitQuestions('Ano ang kulay? Ilan ang apektado? Kailan nagsimula?')).toBe('Ano ang kulay?');
  });

  it('keeps statements around the first question', () => {
    expect(limitQuestions('Mukhang uod ang sanhi. Ano ang kulay ng uod? Ilan ang nakita mo?')).toBe(
      'Mukhang uod ang sanhi. Ano ang kulay ng uod?',
    );
  });

  it('keeps numbered steps and line breaks, and does not touch a reply with no question', () => {
    const steps = '1. Tingnan ang base.\n2. Alisin ang apektadong dahon.\n3. Tawagan ang agriculturist kung kumalat.';
    expect(limitQuestions(steps)).toBe(steps);
  });

  it('keeps one question when it is spread over lines', () => {
    expect(limitQuestions('Sige po.\nAno po ang nakikita?\nAnong kulay?')).toBe('Sige po.\nAno po ang nakikita?');
  });
});

describe('when the pesticide notice applies', () => {
  it.each(['Mag-spray ng tubig sa palayan', 'Kontrolin ang kuhol', 'Gamutin ang tanim'])('flags "%s" as treatment', (text) => {
    expect(mentionsTreatment(text)).toBe(true);
  });

  it.each(['Tingnan ang base ng mga halaman', 'Ano po ang nakikita ninyo sa dahon?', 'Walang anuman po'])(
    'does not flag "%s"',
    (text) => {
      expect(mentionsTreatment(text)).toBe(false);
    },
  );

  it('carries the notice for a clear match, and for treatment text only', () => {
    expect(carriesNotice(true, null)).toBe(true);
    expect(carriesNotice(false, 'Ano po ang nakikita ninyo?')).toBe(false);
    expect(carriesNotice(false, 'Mag-spray po kayo sa gilid.')).toBe(true);
  });
});

describe('follow-ups before the best answer', () => {
  it('counts questions with no clear match and resets on a clear match', () => {
    let n = 0;
    n = nextFollowUps(n, 'ask');
    expect(isFinalAnswer(n)).toBe(false);
    n = nextFollowUps(n, 'small');
    expect(n).toBe(1);
    n = nextFollowUps(n, 'ask');
    expect(isFinalAnswer(n)).toBe(true);
    n = nextFollowUps(n, 'clear');
    expect(n).toBe(0);
    expect(isFinalAnswer(n)).toBe(false);
  });
});
