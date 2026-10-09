import { describe, expect, it } from 'vitest';
import {
  CHAT_FINAL,
  CHAT_UNMATCHED,
  DESCRIBE_SYSTEM_PROMPT,
  MATCH_NOT_SURE,
  MATCH_SURE,
  NO_SIGNS,
  NO_SPEECH,
  OTHER_CROP,
  PHOTO_SYSTEM_PROMPT,
  TRANSCRIBE_PROMPT,
  SYSTEM_PROMPT,
  buildChatMessages,
  buildDescribeMessages,
  buildMessages,
  buildPhotoMessages,
  chatSystemPrompt,
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
    expect(buildPhotoMessages('ano ang mali', 'any')[1]!.content).toContain('First line, the plant: corn / rice /');
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
    expect(messages[9]!.content).toBe('kausapin mo ako');
  });

  it('tells the reply the crop the chat names, and that notes are context only', () => {
    const messages = buildChatMessages('naay mga butang sa dahon sa humay', [], undefined, { crop: 'rice', notes: ['may kuhol sa palayan'] });
    const user = messages[messages.length - 1]!.content;
    expect(user).toContain("The farmer's crop is rice (palay)");
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
