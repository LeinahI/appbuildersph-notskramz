import { readdirSync, readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import {
  RICE_GUIDES,
  SCOUTING_GUIDE,
  careGuideFor,
  dropRepeatedQuestions,
  findViolations,
  fixedReply,
  guideFor,
  guideReply,
  fitPlantPart,
  isHelpAsk,
  looksCebuano,
  replyLanguage,
  matchKeywords,
  mentionsTreatment,
  routeFor,
  signChoices,
  smallTalkReply,
  dropRepeatedSteps,
  withProblemName,
  buildMessages,
  tidyReply,
  type KnowledgeEntry,
} from '../src/index';

const KNOWLEDGE_DIR = new URL('../../knowledge/', import.meta.url);
const KB: KnowledgeEntry[] = readdirSync(KNOWLEDGE_DIR)
  .filter((f) => f.endsWith('.json'))
  .sort()
  .map((f) => JSON.parse(readFileSync(new URL(f, KNOWLEDGE_DIR), 'utf8')) as KnowledgeEntry);
const byId = (id: string) => KB.find((e) => e.id === id)!;
const hasSign = (text: string) => matchKeywords(text, 'any', KB).matches.length > 0;

describe('rice growing guides', () => {
  it('never name a pesticide or give a dose, in English or Tagalog', () => {
    for (const guide of RICE_GUIDES) {
      for (const step of [...guide.steps, ...guide.stepsTl, guide.topic, guide.titleTl]) {
        expect(findViolations(step), `${guide.id}: ${step}`).toEqual([]);
      }
      expect(guide.stepsTl).toHaveLength(guide.steps.length);
    }
  });

  it('have unique ids and normalized keywords', () => {
    expect(new Set(RICE_GUIDES.map((g) => g.id)).size).toBe(RICE_GUIDES.length);
    for (const guide of RICE_GUIDES) {
      for (const k of guide.keywords) expect(k).toMatch(/^[a-z0-9]+( [a-z0-9]+)*$/);
    }
  });

  it.each([
    ['Paano po magtanim ng palay?', 'planting-overview'],
    ['when should i plant rice?', 'planting-overview'],
    ['paano magdilig ng palay?', 'water'],
    ['gaano kataas ang tubig sa palayan?', 'water'],
    ['kailan dapat mag-ani ng palay?', 'harvest'],
    ['pwede na bang anihin, dilaw na ang butil?', 'harvest'],
    ['gaano karaming abono ang ilalagay?', 'fertilizer'],
    ['kailan mag abono ng palay', 'fertilizer'],
    ['anong klaseng binhi ang maganda?', 'seed'],
    ['paano magpunla?', 'seedbed'],
    ['paano maglipat-tanim?', 'transplanting'],
    ['paano mawala ang damo sa palayan', 'weeds'],
    ['paano magbilad ng palay', 'drying-storage'],
    ['maraming daga sa palayan ko, ano gagawin?', 'rats'],
    ['unsaon pagtanom og humay?', 'planting-overview'],
    ['kanus-a mag-abono sa humay?', 'fertilizer'],
    ['kanus-a anihon ang humay?', 'harvest'],
    ['daghang ilaga sa akong basakan', 'rats'],
    ['unsaon paghawan sa sagbot?', 'weeds'],
  ])('"%s" is answered from the %s guide', (text, id) => {
    expect(careGuideFor(text, hasSign(text))?.id).toBe(id);
    expect(routeFor(text, hasSign(text))).toBe('chat');
    expect(fixedReply(text)).toBeNull();
    // With no model, the farmer still gets the guide's own steps.
    expect(smallTalkReply(text)).toBe(guideReply(guideFor(text)!, replyLanguage(text)));
  });

  it('leaves symptom reports, corn, and other crops alone', () => {
    // A report with a sign is a problem to match, not a how-to.
    expect(careGuideFor('Pagkatapos magtanim, nalalanta ang palay ko', false)).toBeNull();
    expect(routeFor('Pagkatapos magtanim, nalalanta ang palay ko', false)).toBe('match');
    // The guides are for palay. Corn growing questions still go to the agriculturist.
    expect(guideFor('kailan mag-ani ng mais?')).toBeNull();
    expect(fixedReply('kailan mag-ani ng mais?')).toMatch(/pagtatanim, pag-aani, abono, o patubig/);
    expect(careGuideFor('paano magtanim ng kamatis?', false)).toBeNull();
    expect(careGuideFor('hello po', false)).toBeNull();
  });

  it('send pesticide asks to the agriculturist before any guide', () => {
    expect(fixedReply('anong pamatay ng damo ang maganda?')).toMatch(/Hindi po ako nagbibigay ng pangalan o dosis/);
  });

  it('carry the pesticide notice only where they mention a herbicide or poison', () => {
    expect(mentionsTreatment(guideReply(guideFor('kailan mag-ani ng palay?')!))).toBe(false);
    expect(mentionsTreatment(guideReply(guideFor('paano mawala ang damo sa palayan')!))).toBe(true);
  });
});

describe('Bisaya (Cebuano)', () => {
  it('is told apart from Tagalog and English', () => {
    for (const text of ['unsaon pagtanom og humay?', 'naay ulod sa akong mais', 'unsa akong buhaton?', 'kanus-a mag-abono?', 'dili maayo akong humay']) {
      expect(looksCebuano(text), text).toBe(true);
    }
    for (const text of ['paano po magtanim ng palay?', 'ano po pwedeng gawin ko', 'uhay po', 'how do i plant rice', 'may butas ang dahon']) {
      expect(looksCebuano(text), text).toBe(false);
    }
  });

  it('gets the guide and the fixed lines in Bisaya', () => {
    expect(smallTalkReply('unsaon pagtanom og humay?')).toMatch(/^Mga lakang sa pagtanom og humay:\n1\. Pagpili og certified nga liso/);
    expect(fixedReply('salamat kaayo, amping')).toMatch(/^Amping mo!/);
    expect(fixedReply('unsa nga tambal sa ulod?')).toMatch(/Dili ko mohatag og ngalan o dosis sa pesticide/);
    expect(smallTalkReply('tabangi ko palihug')).toMatch(/^Oo, unsa ang problema/);
    for (const guide of RICE_GUIDES) {
      expect(guide.stepsCeb, guide.id).toHaveLength(guide.steps.length);
      for (const step of guide.stepsCeb) expect(findViolations(step), step).toEqual([]);
    }
  });

  it('asks for help in Bisaya', () => {
    for (const text of ['unsa akong buhaton', 'unsay angay buhaton?', 'unsaon pagpugong ani?', 'tabangi ko']) expect(isHelpAsk(text), text).toBe(true);
  });
});

describe('help asks', () => {
  it.each(['ano po pwedeng gawin ko', 'pa help naman po', 'Ano po ang dapat kong gawin?', 'paano ko ito aayusin?', 'what should i do', 'unsa akong buhaton'])(
    '"%s" asks for steps',
    (text) => expect(isHelpAsk(text)).toBe(true),
  );

  it.each(['uhay po', 'may kagat po e', 'salamat po', 'ano ang kulay ng dahon?'])('"%s" does not', (text) => {
    expect(isHelpAsk(text)).toBe(false);
  });

  it('has a field-check guide for when nothing is matched yet', () => {
    expect(SCOUTING_GUIDE.id).toBe('scouting');
  });
});

describe('where the farmer saw it', () => {
  it('keeps only the possible problems that show on that part of the plant', () => {
    const blb = byId('bacterial-leaf-blight');
    const bug = byId('rice-bug');
    expect(fitPlantPart([bug, blb], 'uhay po').map((e) => e.id)).toEqual(['rice-bug']);
    expect(fitPlantPart([bug, blb], 'naay ulod sa lugas').map((e) => e.id)).toEqual(['rice-bug']);
    // No part named, or nothing fits: the matcher's list stays.
    expect(fitPlantPart([bug, blb], 'may problema').map((e) => e.id)).toEqual(['rice-bug', 'bacterial-leaf-blight']);
    expect(fitPlantPart([blb], 'uhay po').map((e) => e.id)).toEqual(['bacterial-leaf-blight']);
  });
});

describe('the "not sure" question', () => {
  it('offers one sign per possible problem, on the plant part the farmer named', () => {
    const choices = signChoices([byId('rice-bug'), byId('rice-blast')], 'uhay po');
    expect(choices).toHaveLength(2);
    for (const sign of choices) expect(sign).toMatch(/panicle|grain|neck|head/i);
  });

  it('asks about a different sign the next time', () => {
    const entries = [byId('rice-blast')];
    expect(signChoices(entries, 'may batik', 1)).not.toEqual(signChoices(entries, 'may batik', 0));
  });

  it('drops a question the app already asked in this chat', () => {
    const earlier = ['Ano po ang kulay ng mga batik sa gilid ng dahon?'];
    expect(dropRepeatedQuestions('Sige po. Ano po ang kulay ng mga batik sa gilid ng dahon?', earlier)).toBe('Sige po.');
    // A new question stays.
    expect(dropRepeatedQuestions('May mabahong kulisap po ba sa uhay?', earlier)).toBe('May mabahong kulisap po ba sa uhay?');
    // A reply that is only the repeated question is kept, so the farmer still gets an answer.
    expect(dropRepeatedQuestions(earlier[0]!, earlier)).toBe(earlier[0]);
  });
});

describe('found in the made-up farmer questions', () => {
  it('sends a sick person to the doctor, never the pesticide line', () => {
    expect(fixedReply('may sakit po ang anak ko, ano po ang gamot?')).toMatch(/Hindi po ako doktor/);
    expect(fixedReply('nilalagnat po ako, anong gamot?')).toMatch(/Hindi po ako doktor/);
    // A sick crop is still a crop problem.
    expect(fixedReply('may sakit ang palay ko, anong gamot?')).toMatch(/pesticide/);
  });

  it('drops insects when the farmer says there are none', () => {
    const armyworm = byId('rice-armyworm');
    const blb = byId('bacterial-leaf-blight');
    expect(fitPlantPart([armyworm, blb], 'dilaw ang dahon. wala pong insekto').map((e) => e.id)).toEqual(['bacterial-leaf-blight']);
    expect(fitPlantPart([armyworm], 'wala pong insekto')).toEqual([]);
  });

  it('does not open a harvest how-to with "call now", even when "lahat" is in it', () => {
    expect(tidyReply('Pwede na po.', 'dilaw na po halos lahat ng butil', { urgent: false })).toBe('Pwede na po.');
    expect(tidyReply('Ano po ang nakikita ninyo?', 'lahat ng palay namamatay')).toMatch(/^Tawagan po agad/);
  });
});

describe('found when testing the app', () => {
  it('puts the name beside the local one instead of saying it twice', () => {
    expect(withProblemName('Ang pinaka-posibleng problema ay atangya.', 'Rice bug (atangya)', false)).toBe('Ang pinaka-posibleng problema ay atangya (Rice bug).');
    expect(withProblemName('Gawin ito.', 'Rice bug (atangya)', false)).toBe('Posibleng Rice bug po ito. Gawin ito.');
  });

  it('tells the model not to list the same steps again', () => {
    const history = [{ question: 'ano po pwedeng gawin ko', reply: 'Posibleng atangya.\n1. Magbunot ng damo.\n2. Silipin ang uhay.' }];
    expect(buildMessages('uhay po. may kagat po e', 'rice', [byId('rice-bug')], { sure: false, bestGuess: true, history })[1]!.content).toContain(
      'You already gave numbered steps above. Do not list them again',
    );
    expect(buildMessages('uhay po', 'rice', [byId('rice-bug')], { sure: false, history: [{ question: 'x', reply: 'Ano po?' }] })[1]!.content).not.toContain(
      'You already gave numbered steps',
    );
  });
});

describe('steps the farmer already got', () => {
  const earlier = ['Ang posibleng problema ay atangya. Ang mga unang hakbang ay ito:\n1. Magbunot ng damo sa palayan.\n2. Magtanim nang sabay.\n3. Silipin ang mga uhay.'];

  it('are not listed again; only the new step stays, numbered from 1', () => {
    const reply = 'Ang posibleng problema ay atangya. Ang mga unang hakbang ay ito:\n\n1. Magbunot ng damo sa palayan.\n2. Magtanim nang sabay.\n3. Silipin ang mga uhay.\n4. Saluhin sila sa lambat.\n\nTingnan ang butil.';
    expect(dropRepeatedSteps(reply, earlier)).toBe('Ang posibleng problema ay atangya. Ang mga unang hakbang ay ito:\n\n1. Saluhin sila sa lambat.\n\nTingnan ang butil.');
  });

  it('drop the intro line when no new step is left, and keep the rest', () => {
    const reply = 'Malamang atangya po ito. Ito ang gagawin:\n1. Magbunot ng damo sa palayan.\n2. Silipin ang mga uhay.\nTawagan ang agriculturist kung kumakalat.';
    expect(dropRepeatedSteps(reply, earlier)).toBe('Malamang atangya po ito.\nTawagan ang agriculturist kung kumakalat.');
    expect(dropRepeatedSteps('1. Bago ito.', earlier)).toBe('1. Bago ito.');
    expect(dropRepeatedSteps(reply, [])).toBe(reply);
  });
});
