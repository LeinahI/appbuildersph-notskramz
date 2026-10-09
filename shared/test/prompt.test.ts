import { describe, expect, it } from 'vitest';
import {
  CHAT_FINAL,
  CHAT_UNMATCHED,
  DESCRIBE_SYSTEM_PROMPT,
  MATCH_HELP,
  MATCH_NOT_SURE,
  MATCH_SURE,
  NO_SIGNS,
  NO_SPEECH,
  OTHER_CROP,
  PHOTO_SYSTEM_PROMPT,
  TRANSCRIBE_PROMPT,
  SYSTEM_PROMPT,
  askLine,
  buildChatMessages,
  buildDescribeMessages,
  buildMessages,
  buildPhotoMessages,
  chatGuide,
  looksEnglish,
  chatSystemPrompt,
  guideFor,
  notesToExplain,
  photoOutcome,
  transcriptText,
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

describe('photo reading', () => {
  it('asks the model to fill in a form from what it can see, with no diagnosis', () => {
    expect(PHOTO_SYSTEM_PROMPT).toContain('fill in a short form');
    expect(PHOTO_SYSTEM_PROMPT).toContain('Pick only what you can clearly see');
    expect(PHOTO_SYSTEM_PROMPT).toContain('Write the plant on the first line');
    expect(PHOTO_SYSTEM_PROMPT).toContain('Do not name any disease, pest, or cause');
    expect(buildPhotoMessages('ano ang mali', 'any')[1]!.content).toContain('First line, the plant, judged by its leaves: rice (thin grass-like leaves in clumps) / corn (');
  });

  it('keeps the system prompt fixed and puts the crop and the farmer note in the user message', () => {
    const [system, user] = buildPhotoMessages('Palay ito', 'rice');
    expect(system!.content).toBe(PHOTO_SYSTEM_PROMPT);
    expect(user!.content).toContain("Crop: rice\nFarmer's note: Palay ito");
    expect(buildPhotoMessages('  ', 'any')[1]!.content).toContain("Farmer's note: (none)");
  });

  it('reads the answer: signs, not rice or corn, or nothing to see', () => {
    expect(photoOutcome('Brown spots on a leaf.')).toEqual({ kind: 'signs', english: 'Brown spots on a leaf.' });
    expect(photoOutcome(`  ${OTHER_CROP}`)).toEqual({ kind: 'not-plant' });
    expect(photoOutcome(NO_SIGNS)).toEqual({ kind: 'no-signs' });
    expect(photoOutcome('')).toEqual({ kind: 'no-signs' });
    expect(photoOutcome(null)).toEqual({ kind: 'no-signs' });
    // The model may add a trailing period or words after the fixed answer.
    expect(photoOutcome('Not rice or corn')).toEqual({ kind: 'not-plant' });
    expect(photoOutcome('No signs visible.')).toEqual({ kind: 'no-signs' });
    // A sentence first, then the fixed answer: still nothing to match on.
    expect(photoOutcome('Green leaves are visible on a long stalk. No signs.')).toEqual({ kind: 'no-signs' });
    expect(photoOutcome('A person holding a phone. Not rice or corn.')).toEqual({ kind: 'not-plant' });
    // Real signs that merely mention the words are kept.
    expect(photoOutcome('Brown spots with no signs of insects.')).toEqual({ kind: 'signs', english: 'Brown spots with no signs of insects.' });
  });
});

describe('speech transcription', () => {
  it('asks for the words as spoken, in the language spoken, with a fixed answer for silence', () => {
    for (const lang of ['Tagalog', 'Taglish', 'Cebuano (Bisaya)', 'English']) expect(TRANSCRIBE_PROMPT).toContain(lang);
    expect(TRANSCRIBE_PROMPT).toContain('Do not translate');
    expect(TRANSCRIBE_PROMPT).toContain('Only output the transcription');
    expect(TRANSCRIBE_PROMPT).toContain(`output exactly: ${NO_SPEECH}`);
  });

  it('cleans the answer into one line of text', () => {
    expect(transcriptText('  May butas ang dahon\nng mais  ')).toBe('May butas ang dahon ng mais');
    expect(transcriptText('"Dilaw ang palay ko."')).toBe('Dilaw ang palay ko.');
  });

  it('gives nothing for silence or an empty answer', () => {
    expect(transcriptText(NO_SPEECH)).toBeNull();
    expect(transcriptText('no speech')).toBeNull();
    expect(transcriptText('  ')).toBeNull();
    expect(transcriptText(null)).toBeNull();
    // Real words that happen to include the phrase are kept.
    expect(transcriptText('There was no speech from the radio, only rain on the rice.')).not.toBeNull();
  });

  it('keeps the text within the question limit', () => {
    expect(transcriptText('a'.repeat(3000))!.length).toBe(2000);
    expect(transcriptText('a'.repeat(50), 10)).toBe('a'.repeat(10));
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

describe('buildChatMessages', () => {
  it("replies in the farmer's language, never names a problem, and asks what they see", () => {
    const [system] = buildChatMessages('hey');
    expect(system!.role).toBe('system');
    expect(system!.content).toContain('Reply directly to what the farmer just said');
    expect(system!.content).toContain('Never name or guess a pest or disease yourself');
    expect(system!.content).toContain('Never name pesticide brands and never give dosages');
  });

  it('puts the last four turns before the new message, with long replies cut', () => {
    const history = Array.from({ length: 6 }, (_, i) => ({ question: `q${i}`, reply: i === 5 ? 'x'.repeat(1000) : `r${i}` }));
    const messages = buildChatMessages(' kausapin mo ako ', history);
    expect(messages.map((m) => m.role)).toEqual(['system', 'user', 'assistant', 'user', 'assistant', 'user', 'assistant', 'user', 'assistant', 'user']);
    expect(messages[1]!.content).toBe('q2');
    expect(messages[8]!.content.length).toBeLessThan(410);
    expect(messages[9]!.content).toContain('The farmer now says: kausapin mo ako');
    expect(messages[9]!.content).toMatch(/^Reply language: Tagalog/);
  });

  it('tells the reply which language to use, from the last longer message when this one is short', () => {
    const last = (text: string, history: { question: string; reply: string }[] = []) => buildChatMessages(text, history).at(-1)!.content;
    expect(last('unsaon pagtanom og humay?')).toContain('Reply language: Cebuano (Bisaya)');
    expect(last('how do i plant rice in the dry season?')).toContain('Reply language: English');
    expect(last('paano po magtanim ng palay?')).toContain('Reply language: Tagalog');
    // "Oo" says nothing about the language; the farmer's last longer message does.
    expect(last('oo', [{ question: 'naay ulod sa dahon sa akong humay', reply: 'x' }])).toContain('Reply language: Cebuano (Bisaya)');
    expect(buildMessages('naay ulod sa dahon sa akong humay', 'rice', [])[1]!.content).toContain('Reply language: Cebuano (Bisaya)');
  });

  it('tells the reply the crop the chat names, and that notes are context only', () => {
    const messages = buildChatMessages('naay mga butang sa dahon sa humay', [], undefined, { crop: 'rice', notes: ['may kuhol sa palayan'] });
    const user = messages[messages.length - 1]!.content;
    expect(user).toContain("The farmer's crop is rice (palay, humay)");
    expect(user).toContain('never mais or corn');
    // A guide is about palay, even in a chat that named corn before.
    const guide = guideFor('paano magtanim ng palay?')!;
    expect(buildChatMessages('paano magtanim?', [], undefined, { crop: 'corn', guide }).at(-1)!.content).toContain("The farmer's crop is rice");
    expect(user).toContain('What the farmer said earlier about the crop:');
    expect(chatSystemPrompt()).toContain('They are only context');
    expect(chatSystemPrompt()).toContain('Never repeat the farmer');
  });
});

describe('what the chat is told about the turn', () => {
  const blast = {
    id: 'rice-blast',
    crop: 'rice' as const,
    name: 'Rice blast',
    keywords: [],
    signs: ['Diamond-shaped lesions'],
    actions: ['Avoid heavy nitrogen'],
    callExpertIf: 'Lesions reach the panicle neck',
    reviewedBy: '',
    reviewedOn: '',
  };
  const userOf = (opts: Parameters<typeof buildChatMessages>[3]) => buildChatMessages('ano ang gagawin ko?', [], undefined, opts).at(-1)!.content;

  it('says "no match" only when the farmer described signs that did not match', () => {
    expect(userOf({})).not.toContain(CHAT_UNMATCHED);
    expect(userOf({ final: true })).not.toContain(CHAT_FINAL);
    expect(userOf({ unmatched: true })).toContain(CHAT_UNMATCHED);
    expect(userOf({ unmatched: true, final: true })).toContain(CHAT_FINAL);
  });

  it('gives a follow-up question the notes of the problem already named', () => {
    const user = userOf({ diagnosis: blast });
    expect(user).toContain('the most likely problem is Rice blast');
    expect(user).toContain('Suggested actions: Avoid heavy nitrogen');
    expect(user).toContain('If the farmer complains about the answer, do not repeat it');
    expect(user).toContain('Never guess a yes or no');
  });

  it('tells the explainer to name the problem first and to use farm words', () => {
    expect(SYSTEM_PROMPT).toContain('start with one short sentence that names the problem');
    expect(SYSTEM_PROMPT).toContain('panicle = uhay');
    expect(SYSTEM_PROMPT).toContain('diamond-shaped = hugis diyamante');
    expect(SYSTEM_PROMPT).toContain('never "crop"');
  });
});

describe('an answer to a photo', () => {
  it("keeps the photo line apart from the farmer's words, so the reply stays in the farmer's language", () => {
    const [system, user] = buildMessages('ano ang mali', 'corn', [], { photo: 'Corn plant. Ragged holes in the whorl.' });
    expect(user!.content).toContain("Farmer's description: ano ang mali\nSeen in the farmer's photo (written by the app in English): Corn plant.");
    expect(system!.content).toContain('never from the photo line');
    expect(buildMessages('may butas', 'corn', [])[1]!.content).not.toContain("farmer's photo");
  });
});

describe('the question after an unsure photo', () => {
  const faw = {
    id: 'fall-armyworm', crop: 'corn' as const, name: 'Fall armyworm', keywords: [], reviewedBy: '', reviewedOn: '', callExpertIf: '',
    signs: ['Ragged holes in leaves, with sawdust-like droppings in the whorl'], actions: [],
  };

  it('tells the model which sign to ask about, only when the match is not sure', () => {
    const unsure = buildMessages('ano ang mali', 'corn', [faw], { sure: false, askAbout: 'Ragged holes in leaves' })[1]!.content;
    expect(unsure).toContain("Your one question asks whether the farmer sees this sign, in simple words in the farmer's language: Ragged holes in leaves.");
    const sure = buildMessages('ano ang mali', 'corn', [faw], { sure: true, askAbout: 'Ragged holes in leaves' })[1]!.content;
    expect(sure).not.toContain('Your one question');
  });
});

describe('a natural reply that follows the chat', () => {
  const bug = {
    id: 'rice-bug', crop: 'rice' as const, name: 'Rice bug', keywords: [], reviewedBy: '', reviewedOn: '', callExpertIf: '',
    signs: ['Slender brown bugs on the grain heads'], actions: ['Remove weeds around the field'],
  };
  const blast = { ...bug, id: 'rice-blast', name: 'Rice blast', signs: ['Neck of the grain head turns black'] };

  it('offers the possible problems as choices in its one question', () => {
    const user = buildMessages('uhay po', 'rice', [bug, blast], { sure: false, askChoices: [bug.signs[0]!, blast.signs[0]!] })[1]!.content;
    expect(user).toContain(MATCH_NOT_SURE);
    expect(user).toContain('pick which of these they see');
    expect(user).toContain('Slender brown bugs on the grain heads / Neck of the grain head turns black');
    expect(askLine(null, ['one sign'])).toContain("whether the farmer sees this sign, in simple words in the farmer's language: one sign");
  });

  it('gives first steps when the farmer asks what to do before the match is sure', () => {
    const user = buildMessages('uhay po', 'rice', [bug, blast], { sure: false, help: true })[1]!.content;
    expect(user).toContain(MATCH_HELP);
    expect(user).not.toContain(MATCH_NOT_SURE);
    expect(SYSTEM_PROMPT).toContain('If the match is marked help');
    // A sure match is never a help reply.
    expect(buildMessages('uhay po', 'rice', [bug], { sure: true, help: true })[1]!.content).toContain(MATCH_SURE);
  });

  it('sees the last turns, so it never asks the same thing twice', () => {
    const history = [{ question: 'uhay po', reply: 'Ano po ang kulay ng mga batik sa gilid ng dahon?' }];
    const user = buildMessages('may kagat po e', 'rice', [bug], { sure: false, history })[1]!.content;
    expect(user).toContain('Do not ask again anything you already asked here');
    expect(user).toContain('You: Ano po ang kulay ng mga batik sa gilid ng dahon?');
    expect(user.indexOf('Earlier in this chat')).toBeLessThan(user.indexOf("Farmer's description"));
    expect(buildMessages('may kagat', 'rice', [bug])[1]!.content).not.toContain('Earlier in this chat');
  });

  it('answers a growing question from its guide', () => {
    const guide = guideFor('paano magtanim ng palay?')!;
    const user = buildChatMessages('paano magtanim ng palay?', [], undefined, { guide }).at(-1)!.content;
    expect(user).toContain(chatGuide(guide));
    expect(user).toContain('Guide: How to grow rice, from seed to harvest');
    expect(user).toContain('short numbered steps');
    // The guide replaces the "no match" line: there was no sign to match.
    expect(buildChatMessages('x', [], undefined, { guide, unmatched: true }).at(-1)!.content).not.toContain(CHAT_UNMATCHED);
  });
});

describe('the reply language', () => {
  it('tells English from Tagalog, Taglish, and Cebuano', () => {
    for (const text of ['how do i control weeds in my rice field?', 'when should i plant rice?', 'what should i do']) expect(looksEnglish(text)).toBe(true);
    for (const text of ['paano po magtanim ng palay?', 'how to control ang damo sa palay', 'unsaon pagtanom og humay', 'ok', 'uhay po']) {
      expect(looksEnglish(text)).toBe(false);
    }
    // The app's own English photo note does not make a Tagalog message English.
    expect(looksEnglish("ano po ito [The farmer's photo shows, in the app's English: holes in the leaves]")).toBe(false);
  });

  it("gives a Tagalog speaker the note's reviewed Tagalog steps, and an English speaker English only", () => {
    const bug = {
      id: 'rice-bug', crop: 'rice' as const, name: 'Rice bug', keywords: [], reviewedBy: '', reviewedOn: '', callExpertIf: '',
      signs: ['Slender brown bugs on the grain heads'], actions: ['Remove weeds around the field'],
      translations: { tl: { signs: ['Payat na kayumangging surot sa uhay'], actions: ['Alisin ang damo sa paligid ng palayan'], callExpertIf: '' } },
    };
    expect(buildMessages('may surot sa uhay', 'rice', [bug], { sure: true })[1]!.content).toContain('Tagalog steps: Alisin ang damo sa paligid ng palayan');
    expect(buildMessages('there are bugs on the grain heads of my rice', 'rice', [bug], { sure: true })[1]!.content).not.toContain('Tagalog steps');
    // A "not sure" reply gives no steps, so it needs none.
    expect(buildMessages('may surot', 'rice', [bug], { sure: false })[1]!.content).not.toContain('Tagalog steps');
    const guide = guideFor('how do i control weeds in my rice field?')!;
    expect(chatGuide(guide, 'en')).not.toMatch(/(Tagalog|Cebuano) steps:/);
    expect(chatGuide(guide)).toContain('Tagalog steps:');
    expect(chatGuide(guide, 'ceb')).toContain('Cebuano steps: Andama ug patag-a og maayo ang yuta');
  });

  it("gives a Bisaya speaker the note's reviewed Cebuano steps", () => {
    const bug = {
      id: 'rice-bug', crop: 'rice' as const, name: 'Rice bug', keywords: [], reviewedBy: '', reviewedOn: '', callExpertIf: '',
      signs: ['Slender brown bugs on the grain heads'], actions: ['Remove weeds around the field'],
      translations: {
        tl: { signs: ['x'], actions: ['Alisin ang damo sa paligid ng palayan'], callExpertIf: '' },
        ceb: { signs: ['x'], actions: ['Kuhaa ang sagbot palibot sa basakan'], callExpertIf: '' },
      },
    };
    const user = buildMessages('naay insekto sa uhay sa akong humay', 'rice', [bug], { sure: true })[1]!.content;
    expect(user).toContain('Cebuano steps: Kuhaa ang sagbot palibot sa basakan');
    expect(user).not.toContain('Tagalog steps');
    expect(SYSTEM_PROMPT).toContain('Cebuano (Bisaya)');
  });
});
