import { describe, expect, it } from 'vitest';
import {
  carriesNotice,
  fixedReply,
  isQuestionWithoutSign,
  withProblemName,
  isAboutLastAnswer,
  isFinalAnswer,
  isOffTopic,
  isSmallTalk,
  limitQuestions,
  mentionsTreatment,
  nextFollowUps,
  notesForMatch,
  routeFor,
  sessionNotes,
  sessionText,
  smallTalkReply,
  tidyReply,
} from '../src/index';

describe('tidying a model reply', () => {
  it('drops an apology the farmer did not earn, and keeps the answer', () => {
    expect(tidyReply('Pasensya na po. Ano po ang nakikita ninyo sa palay?', 'may mali sa palay ko')).toBe(
      'Ano po ang nakikita ninyo sa palay?',
    );
  });

  it('keeps the apology when the farmer complained', () => {
    const reply = 'Pasensya na po. Ano po ang nakikita ninyo sa dahon?';
    expect(tidyReply(reply, 'bat ganyan response mo, kausapin mo ako')).toBe(reply);
  });

  it('gives a complaint an apology even when the model did not, and keeps the reply', () => {
    const tidied = tidyReply('Mabuti naman po. Ano po ang problema ninyo?', 'bat ganyan response mo, kausapin mo ako');
    expect(tidied).toMatch(/^Pasensya na po\. Mabuti naman po/);
  });

  it('keeps the explanation of a match when the farmer complains about it', () => {
    const tidied = tidyReply('Ang butas sa dahon ay maaaring fall armyworm.', 'mali ang sagot mo. may butas sa dahon ng mais');
    expect(tidied).toBe('Pasensya na po. Ang butas sa dahon ay maaaring fall armyworm.');
  });

  it('drops a question that only repeats the farmer, and asks what they see instead', () => {
    expect(tidyReply('May uod po ba sa gitna ng mais?', 'may uod sa gitna ng mais')).toBe(
      'Ano po ang nakikita ninyo sa dahon, tangkay, o uhay?',
    );
    expect(tidyReply('Masakit po ba ang ulo ninyo? Mag-pahinga po kayo.', 'masakit ang ulo ko')).toBe(
      'Mag-pahinga po kayo. Ano po ang nakikita ninyo sa dahon, tangkay, o uhay?',
    );
    // Adding the crop, or another form of the same word, still repeats the farmer.
    expect(tidyReply('May guhit po ba sa gilid ng dahon ng mais?', 'may guhit sa gilid ng dahon')).not.toContain('May guhit');
    expect(tidyReply('Nalanta po ba lahat ng palay ninyo?', 'nalalanta lahat ng palay ko')).not.toContain('Nalanta po ba');
  });

  it('keeps a question that asks for something new', () => {
    expect(tidyReply('Ano po ang kulay ng mga itlog na nakita ninyo?', 'may kuhol sa palayan')).toBe(
      'Ano po ang kulay ng mga itlog na nakita ninyo?',
    );
  });

  it('starts a reply to a field going bad with a call to the agriculturist', () => {
    const tidied = tidyReply('Nalanta po ba ang lahat ng palay ninyo?', 'nalalanta lahat ng palay ko, tulong!!!');
    expect(tidied.startsWith('Tawagan po agad ang lokal na agriculturist.')).toBe(true);
    expect(tidied.match(/\?/g)).toHaveLength(1);
  });

  it('keeps one question, and the reply is unchanged otherwise', () => {
    expect(tidyReply('Opo, tutulungan ko kayo. Ano po ang kulay? Ilan po?', 'maari niyo ba ako tulungan')).toBe(
      'Opo, tutulungan ko kayo. Ano po ang kulay?',
    );
  });
});

describe('off-topic questions go to the chat, never to an old diagnosis', () => {
  it.each([
    'paano mag-file ng reklamo sa DA?',
    'magkano ang presyo ng bigas ngayon?',
    'anong oras na?',
    'sino ang presidente ng pilipinas?',
    'may bulate ang kamatis ko',
    'ilang ml ng karate kada litro?',
    'kailan dapat mag-ani ng palay?',
    'masakit ang ulo ko, anong gamot?',
  ])('routes "%s" to the chat', (text) => {
    expect(isOffTopic(text) || isSmallTalk(text)).toBe(true);
    expect(routeFor(text, false)).toBe('chat');
  });

  it('still matches a symptom even when it names another crop', () => {
    expect(routeFor('may butas sa dahon ng mais', true)).toBe('match');
  });

  it.each(['lol', 'hmmm', 'may tanong ako', 'may kailangan lang ako', 'bobo ka ba?', '???'])('routes "%s" to the chat', (text) => {
    expect(routeFor(text, false)).toBe('chat');
  });

  it('answers a question about the assistant itself, and a bare question mark with a question', () => {
    expect(smallTalkReply('ano ang pangalan mo')).toMatch(/Ugatan/);
    expect(smallTalkReply('???')).toMatch(/Hindi ko po naintindihan/);
  });
});

describe('a symptom with a chat word still goes to matching', () => {
  it.each(['Tulong po, nalalanta ang palay ko', 'salamat po, nalalanta ang palay ko', 'Mali ang sagot mo, may butas sa dahon', 'Pagkatapos magtanim, nalalanta ang palay ko', 'sa panahon ng tag-init, dilaw ang dahon ng mais'])(
    'routes "%s" to matching',
    (text) => {
      expect(routeFor(text, false)).toBe('match');
    },
  );

  it.each(['pwede bang kainin ang kangkong na may dilaw na dahon?', 'magkano ang presyo ng palay', 'may bulate ang kamatis ko'])(
    'routes "%s" to the chat',
    (text) => {
      expect(routeFor(text, false)).toBe('chat');
    },
  );
});

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

  it.each(['may butas po siya', 'Dilaw ang dahon', 'may problema ang tanim ko'])('sends "%s" to matching', (text) => {
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

describe('fixed replies', () => {
  it('never hands a pesticide, dose, or brand ask to the model', () => {
    for (const ask of ['ilang ml ng karate kada litro?', 'anong brand ng pamatay peste ang maganda?', 'ilang kutsara ng pesticide sa isang tangke?', 'ano ang pwede kong i-spray sa mais ko?']) {
      expect(routeFor(ask, false)).toBe('chat');
      expect(fixedReply(ask)).toMatch(/Hindi po ako nagbibigay ng pangalan o dosis ng pesticide/);
    }
  });

  it('sends health asks to the doctor, with no medicine or dose', () => {
    for (const ask of ['nilalagnat ako', 'ilang mg ng paracetamol ang ibibigay ko?', 'masakit ang tiyan ko', 'masakit ang ulo ko, anong gamot ang iinumin ko?']) {
      expect(fixedReply(ask)).toMatch(/doktor/);
    }
  });

  it('names the other crop, and says who the assistant is', () => {
    expect(fixedReply('dilaw ang dahon ng sili ko')).toMatch(/tungkol sa sili/);
    expect(fixedReply('ano ang ginagawa mo?')).toMatch(/Ako po si Ugatan/);
    expect(fixedReply('ano po name niyo')).toMatch(/Ako po si Ugatan/);
    expect(smallTalkReply('sino ka?')).toMatch(/Ako po si Ugatan/);
  });

  it('sends a poisoned or hurt farmer to the health center now', () => {
    for (const text of ['nalanghap ko ang pesticide, nahihilo ako', 'natalsikan ng pesticide ang mata ko', 'kinagat ako ng ahas sa bukid', 'i feel sick after spraying']) {
      expect(fixedReply(text)).toMatch(/^Emergency po ito/);
    }
  });

  it('sends land, loan, complaint, and subsidy questions to the agriculture office', () => {
    for (const text of ['pwede ba akong magreklamo sa kooperatiba ko?', 'paano mag-apply sa RSBSA?', 'paano mangutang sa Landbank?', 'may ayuda ba sa magsasaka?']) {
      expect(routeFor(text, false)).toBe('chat');
      expect(fixedReply(text)).toMatch(/Municipal Agriculture Office/);
    }
  });

  it('ends the chat warmly on thanks or goodbye, with no question', () => {
    for (const text of ['ingat po', 'salamat po', 'sige salamat bye', 'una na ako', 'tnx']) {
      expect(fixedReply(text)).not.toBeNull();
      expect(fixedReply(text)).not.toContain('?');
    }
    expect(fixedReply('salamat, pero ano ang gagawin ko?')).toBeNull();
  });

  it('says it did not understand mashing, and answers "ok" without that', () => {
    for (const text of ['...', 'xyz 123', 'jdjdjd', 'lol', '123', '!!!']) expect(fixedReply(text)).toMatch(/Hindi ko po naintindihan/);
    for (const text of ['ok', 'sige', 'oo']) expect(fixedReply(text)).toMatch(/^Sige po/);
    for (const text of ['sige', 'jdjdjd', 'xyz 123']) expect(routeFor(text, false)).toBe('chat');
  });

  it('leaves palay planting, harvest, fertilizer, and watering to the model and its guide, not a fixed line', () => {
    for (const text of ['paano magdilig ng palay?', 'kailan dapat mag-ani ng palay?', 'gaano karaming abono ang ilalagay?', 'anong klaseng binhi ang maganda?', 'when should i plant rice?']) {
      expect(routeFor(text, false)).toBe('chat');
      expect(fixedReply(text)).toBeNull();
    }
  });

  it('answers planting and climate questions as crop care, even after a "not sure" reply and a correction', () => {
    // Which seed to use for palay has a guide.
    for (const text of ['Ano ang magandang itanim na mga seed sa klimang tag init', 'what seeds are best for summer?']) {
      expect(routeFor(text, false)).toBe('chat');
      expect(fixedReply(text)).toBeNull();
    }
    // Which crop to plant has none: the agriculturist knows the place and the season.
    for (const text of [
      'hindi ito problema, at nagtatanong ako kung ano ang magandang pananim sa klimang tag init',
      'anong pananim ang bagay sa tag ulan',
    ]) {
      expect(routeFor(text, false)).toBe('chat');
      expect(fixedReply(text)).toMatch(/pagtatanim, pag-aani, abono, o patubig/);
    }
    // A plain mention of the crop ("pananim") in a symptom report is still a symptom.
    expect(routeFor('may sira ang pananim ko, may butas sa dahon', false)).toBe('match');
    expect(fixedReply('may sira ang pananim ko, dilaw ang dahon')).toBeNull();
  });

  it('says to call the agriculturist now when half the field is hit', () => {
    expect(tidyReply('Ano po ang nakikita ninyo?', 'mga kalahati na ng bukid')).toMatch(/^Tawagan po agad ang lokal na agriculturist/);
  });

  it('asks for the question when the farmer says they have one', () => {
    expect(fixedReply('may tanong ako')).toBe('Opo, ano po ang itatanong ninyo tungkol sa palay o mais?');
  });

  it('refuses general other-crop asks even when the farmer says magtanong', () => {
    const text = 'pwede ba ako magtanong tungkol sa pananim maliban sa palay o mais';
    expect(routeFor(text, false)).toBe('chat');
    expect(fixedReply(text)).toMatch(/ibang pananim/);
    expect(fixedReply(text)).not.toMatch(/ano po ang itatanong/);
  });

  it('leaves greetings, help, and complaints to the model', () => {
    for (const text of ['hello po', 'tulungan mo ako', 'bat ganyan response mo', 'test']) expect(fixedReply(text)).toBeNull();
  });
});

describe('after the app named a problem', () => {
  it('reads a question or a remark with no new sign as about that answer', () => {
    for (const text of ['ano ang gagawin ko?', 'ano ang kulay?', 'pwede bang kainin?', 'may iba pa po bang tanong?', 'hindi ko alam', 'may mali sa palay ko']) {
      expect(isAboutLastAnswer(text, false)).toBe(true);
    }
  });

  it('reads a new sign as a new problem', () => {
    expect(isAboutLastAnswer('may kuhol sa palayan', true)).toBe(false);
    expect(isAboutLastAnswer('may maliliit na butas sa tangkay at natutuyo ang dulo ng dahon', false)).toBe(false);
    expect(isAboutLastAnswer('sa tangkay din po', false)).toBe(true);
    expect(isAboutLastAnswer('may bulate ang kamatis ko', false)).toBe(false);
  });

  it('starts fresh when the farmer names the other crop', () => {
    expect(notesForMatch(['tuyo ang gilid ng dahon ng palay', 'may guhit'], 'may dilaw na guhit sa mais')).toEqual([]);
    expect(notesForMatch(['may butas sa dahon ng mais'], 'may dumi rin sa mais')).toEqual(['may butas sa dahon ng mais']);
    expect(notesForMatch(['may butas sa dahon'], 'may butas po sa mais')).toEqual(['may butas sa dahon']);
  });

  it('a final answer resets the follow-up count like a clear match', () => {
    expect(nextFollowUps(2, 'done')).toBe(0);
  });
});

describe('naming the problem in an answer', () => {
  it('adds the name when the model left it out, and leaves it when it is there', () => {
    expect(withProblemName('Ang problema ay bulok na leeg ng uhay.', 'Rice blast', true)).toBe('Malamang Rice blast po ito. Ang problema ay bulok na leeg ng uhay.');
    expect(withProblemName('May kuhol at itlog.', 'Golden apple snail (kuhol)', false)).toMatch(/^Posibleng Golden apple snail po ito/);
    expect(withProblemName('Rice blast ang problema.', 'Rice blast', true)).toBe('Rice blast ang problema.');
  });

  it('counts "paulit-ulit ka" and "mali ka" as complaints that get a sorry', () => {
    expect(tidyReply('Ano po ang nakikita ninyo?', 'paulit-ulit ka')).toMatch(/^Pasensya na po/);
    expect(tidyReply('Ano po ang nakikita ninyo?', 'mali ka')).toMatch(/^Pasensya na po/);
  });
});

describe('chats 9 and 10 of the 20-chat run', () => {
  it('reads another crop as another crop, even with a rice keyword in it', () => {
    expect(routeFor('may itim na batik ang mangga', true)).toBe('chat');
    expect(routeFor('may itim na batik ang palay, hindi ang mangga', true)).toBe('match');
  });

  it('never guesses whether the crop is safe to eat', () => {
    expect(fixedReply('pwede bang kainin ang ani?')).toMatch(/Hindi ko po masasabi kung ligtas itong kainin/);
    expect(routeFor('pwede bang kainin ang ani?', false)).toBe('chat');
  });

  it('answers "what can you do" and a sore back with fixed lines', () => {
    expect(fixedReply('ano ang kaya mong gawin?')).toMatch(/Ako po si Ugatan/);
    expect(fixedReply('masakit ang likod ko sa pagtatanim')).toMatch(/doktor/);
    expect(fixedReply('may sugat ako sa paa')).toMatch(/doktor/);
  });
});

describe('chat 11 of the 20-chat run', () => {
  it('sends a pesticide question that names a pest to the fixed pesticide line', () => {
    expect(routeFor('unsa nga tambal sa ulod?', true)).toBe('chat');
    expect(fixedReply('unsa nga tambal sa ulod?')).toMatch(/pesticide/);
    expect(routeFor('nag spray na ako pero may uod pa rin', true)).toBe('match');
  });

  it('does not re-match a question that names no sign', () => {
    expect(isQuestionWithoutSign('babalik ba ito next season?', false)).toBe(true);
    expect(isQuestionWithoutSign('may butas po ba sa dahon?', false)).toBe(false);
  });
});

describe('chats 14 and 15 of the 20-chat run', () => {
  it('knows other crops by their English and Cebuano names', () => {
    expect(routeFor('my tomato leaves are curling', true)).toBe('chat');
    expect(fixedReply('my tomato leaves are curling')).toMatch(/tungkol sa tomato/);
    expect(fixedReply('may uod ang lubi')).toMatch(/tungkol sa lubi/);
    expect(routeFor('hindi maganda ang tubo ng palay', false)).toBe('match');
    // "Kulay kape" is a color and "sa gabi" is night time, not coffee or taro.
    expect(routeFor('kulay kape ang mga insekto sa puno ng palay', true)).toBe('match');
    expect(routeFor('kumakain ang uod sa gabi', true)).toBe('match');
  });

  it('sends free seed from the DA to the office, and knows "unsa ka" and "later"', () => {
    expect(fixedReply('paano kumuha ng libreng binhi sa DA?')).toMatch(/Municipal Agriculture Office/);
    expect(fixedReply('unsa ka?')).toMatch(/Ako si Ugatan, inyong katabang/);
    expect(fixedReply('later')).toMatch(/^Ingat po kayo/);
  });
});

describe('chat 16 of the 20-chat run', () => {
  it('answers "where is the hospital" with where to ask, not with "I am not a doctor"', () => {
    expect(fixedReply('saan ang pinakamalapit na ospital?')).toMatch(/Hindi ko po alam kung saan ang pinakamalapit na ospital/);
  });
});

describe('chat 19 of the 20-chat run', () => {
  it('sends a poisoned animal to the vet', () => {
    expect(fixedReply('nakakain ng lason ang aso ko')).toMatch(/beterinaryo/);
    expect(fixedReply('nalanghap ko ang pesticide')).toMatch(/health center/);
  });
});
