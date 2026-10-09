import { describe, expect, it } from 'vitest';
import type { KnowledgeEntry } from '@ugatan/shared';
import { answerQuestion, parseAskRequest } from '../src/answer';
import { ConversationStore, MAX_SESSIONS, SESSION_TTL_MS, type Session } from '../src/conversation/state';
import type { ChatInput, ExplainInput, Explainer } from '../src/explain/index';
import type { LogEvent } from '../src/log';
import { loadKnowledge } from '../src/knowledge';
import { createKeywordMatcher } from '../src/matchers/keyword';
import type { MatchOutcome, Matcher } from '../src/matchers/index';

const knowledge: KnowledgeEntry[] = loadKnowledge(new URL('../../knowledge/', import.meta.url));
const quiet = { write(_event: LogEvent) {} };

/** A matcher that answers from a script, and records the description it was asked to match. */
function scriptedMatcher(answer: (call: number) => MatchOutcome) {
  const seen: { text: string; crop: string }[] = [];
  const matcher: Matcher = {
    name: 'laya',
    async match(text, crop) {
      seen.push({ text, crop });
      return answer(seen.length - 1);
    },
  };
  return { matcher, seen };
}

/** An explainer that records what it was asked, and replies with a fixed text. */
function recordingExplainer(explanation = 'Tingnan ang dahon.') {
  const explains: ExplainInput[] = [];
  const chats: ChatInput[] = [];
  const explainer: Explainer = {
    name: 'gemma',
    async explain(input) {
      explains.push(input);
      return { status: 'ok', text: explanation };
    },
    async chat(input) {
      chats.push(input);
      return { status: 'ok', text: 'Ano po ang nakikita ninyo?' };
    },
  };
  return { explainer, explains, chats };
}

const noMatch: MatchOutcome = { ids: [], clear: false };

describe('small talk never reaches the matcher', () => {
  it('answers a request for help in the chat', async () => {
    const { matcher, seen } = scriptedMatcher(() => ({ ids: ['rice-blast'], clear: true }));
    const { explainer, chats } = recordingExplainer();
    const res = await answerQuestion({ uid: 'h1', crop: 'any', text: 'maari niyo ba ako tulungan' }, { matcher, explainer, knowledge, logger: quiet });
    expect(seen).toEqual([]);
    expect(chats).toHaveLength(1);
    expect(res.matchIds).toEqual([]);
    expect(res.explanation).toBe('Ano po ang nakikita ninyo?');
  });

  it('still matches a greeting that comes with a symptom', async () => {
    const { matcher, seen } = scriptedMatcher(() => noMatch);
    const { explainer } = recordingExplainer();
    await answerQuestion({ uid: 'h2', crop: 'any', text: 'hello po, may butas sa dahon' }, { matcher, explainer, knowledge, logger: quiet });
    expect(seen).toHaveLength(1);
  });
});

describe('matching reads the whole chat, not the last message', () => {
  it('matches "may butas po siya" on what the farmer said before, and keeps the crop', async () => {
    const { matcher, seen } = scriptedMatcher(() => noMatch);
    const { explainer } = recordingExplainer();
    const deps = { matcher, explainer, knowledge, logger: quiet, conversations: new ConversationStore() };
    await answerQuestion({ uid: 'c1', crop: 'any', text: 'may mali sa palay ko', sessionId: 's1' }, deps);
    await answerQuestion({ uid: 'c2', crop: 'any', text: 'may butas po siya', sessionId: 's1' }, deps);
    expect(seen[1]).toEqual({ text: 'may mali sa palay ko. may butas po siya', crop: 'rice' });
  });

  it('leaves a greeting out of the description', async () => {
    const { matcher, seen } = scriptedMatcher(() => noMatch);
    const { explainer } = recordingExplainer();
    const deps = { matcher, explainer, knowledge, logger: quiet, conversations: new ConversationStore() };
    await answerQuestion({ uid: 'g1', crop: 'any', text: 'may butas sa dahon', sessionId: 's2' }, deps);
    await answerQuestion({ uid: 'g2', crop: 'any', text: 'hello po', sessionId: 's2' }, deps);
    await answerQuestion({ uid: 'g3', crop: 'any', text: 'may butas po siya', sessionId: 's2' }, deps);
    expect(seen.map((s) => s.text)).toEqual(['may butas sa dahon', 'may butas sa dahon. may butas po siya']);
  });

  it('keeps chats apart: one chat never reads another chat\'s notes', async () => {
    const { matcher, seen } = scriptedMatcher(() => noMatch);
    const { explainer } = recordingExplainer();
    const deps = { matcher, explainer, knowledge, logger: quiet, conversations: new ConversationStore() };
    await answerQuestion({ uid: 'k1', crop: 'any', text: 'may butas po siya', sessionId: 'chat-a' }, deps);
    await answerQuestion({ uid: 'k2', crop: 'any', text: 'may mali sa mais', sessionId: 'chat-b' }, deps);
    expect(seen[1]).toEqual({ text: 'may mali sa mais', crop: 'corn' });
  });

  it('reads the chat from the phone history when the hub has no record of it', async () => {
    const { matcher, seen } = scriptedMatcher(() => noMatch);
    const { explainer } = recordingExplainer();
    const history = [{ question: 'may mali sa palay ko', reply: 'Ano po ang nakikita ninyo?' }];
    await answerQuestion(
      { uid: 'r1', crop: 'any', text: 'may butas po siya', sessionId: 'lost', history },
      { matcher, explainer, knowledge, logger: quiet, conversations: new ConversationStore() },
    );
    expect(seen[0]).toEqual({ text: 'may mali sa palay ko. may butas po siya', crop: 'rice' });
  });

  it('names the symptom words the top match was found on', async () => {
    const { explainer } = recordingExplainer();
    const res = await answerQuestion(
      { uid: 'm1', crop: 'rice', text: 'brown planthopper kumpol sa palayan' },
      { matcher: createKeywordMatcher(knowledge), explainer, knowledge, logger: quiet },
    );
    expect(res.matchIds[0]).toBe('bph');
    expect(res.matchedOn).toEqual(expect.arrayContaining(['brown planthopper', 'kumpol']));
  });
});

describe('follow-up questions', () => {
  it('asks one question at a time, then gives its best guess after two questions with no clear match', async () => {
    const { matcher } = scriptedMatcher(() => ({ ids: ['rice-blast', 'bph'], clear: false }));
    const { explainer, explains } = recordingExplainer();
    const deps = { matcher, explainer, knowledge, logger: quiet, conversations: new ConversationStore() };
    for (const [i, text] of ['may batik sa dahon', 'may batik pa rin', 'may batik pa rin ang dahon'].entries()) {
      await answerQuestion({ uid: `f${i}`, crop: 'rice', text, sessionId: 'f' }, deps);
    }
    expect(explains[0]!.bestGuess).toBe(false);
    expect(explains[0]!.entries.map((e) => e.id)).toEqual(['rice-blast', 'bph']);
    expect(explains[2]!.bestGuess).toBe(true);
    expect(explains[2]!.entries.map((e) => e.id)).toEqual(['rice-blast']);
  });

  it('tells the chat to stop asking after two questions with no match', async () => {
    const { matcher } = scriptedMatcher(() => noMatch);
    const { explainer, chats } = recordingExplainer();
    const deps = { matcher, explainer, knowledge, logger: quiet, conversations: new ConversationStore() };
    for (const [i, text] of ['may kakaiba sa palay', 'may kakaiba pa rin sa palay', 'kakaiba pa rin talaga ang palay'].entries()) {
      await answerQuestion({ uid: `n${i}`, crop: 'rice', text, sessionId: 'n' }, deps);
    }
    expect(chats.map((c) => c.final)).toEqual([false, false, true]);
    expect(chats[2]!.notes).toEqual(['may kakaiba sa palay', 'may kakaiba pa rin sa palay']);
  });

  it('starts counting again after a clear match', async () => {
    const { matcher } = scriptedMatcher((call) => (call === 2 ? { ids: ['rice-blast'], clear: true } : { ids: ['rice-blast', 'bph'], clear: false }));
    const { explainer, explains } = recordingExplainer();
    const deps = { matcher, explainer, knowledge, logger: quiet, conversations: new ConversationStore() };
    for (const [i, text] of ['may batik', 'may batik pa', 'may batik na may spindle', 'may ibang batik na kulay kayumanggi sa dulo ng dahon'].entries()) {
      await answerQuestion({ uid: `s${i}`, crop: 'rice', text, sessionId: 's' }, deps);
    }
    expect(explains[3]!.bestGuess).toBe(false);
    expect(explains[3]!.entries.map((e) => e.id)).toEqual(['rice-blast', 'bph']);
  });

  it('keeps one question in the reply when the model asks several', async () => {
    const { matcher } = scriptedMatcher(() => ({ ids: ['rice-blast'], clear: true }));
    const { explainer } = recordingExplainer('Ano ang kulay? Ilan ang apektado?');
    const res = await answerQuestion({ uid: 'q1', crop: 'rice', text: 'may batik' }, { matcher, explainer, knowledge, logger: quiet });
    // A sure match always names the problem, even when the model left the name out.
    expect(res.explanation).toBe('Malamang Rice blast po ito. Ano ang kulay?');
  });
});

describe('after the app named a problem', () => {
  const sure = { ids: ['rice-blast'], clear: true };

  it('answers "ano ang gagawin ko?" from the named problem, without matching the old notes again', async () => {
    const { matcher, seen } = scriptedMatcher(() => sure);
    const { explainer, chats } = recordingExplainer();
    const deps = { matcher, explainer, knowledge, logger: quiet, conversations: new ConversationStore() };
    await answerQuestion({ uid: 'd1', crop: 'any', text: 'may diamond na batik sa dahon ng palay', sessionId: 'd' }, deps);
    const res = await answerQuestion({ uid: 'd2', crop: 'any', text: 'ano ang gagawin ko?', sessionId: 'd' }, deps);
    expect(seen).toHaveLength(1);
    expect(res.matchIds).toEqual([]);
    expect(chats[0]!.diagnosis?.id).toBe('rice-blast');
    expect(chats[0]!.unmatched).toBe(false);
  });

  it('matches a new sign on its own, not mixed with the problem already answered', async () => {
    const { matcher, seen } = scriptedMatcher(() => sure);
    const { explainer } = recordingExplainer();
    const deps = { matcher, explainer, knowledge, logger: quiet, conversations: new ConversationStore() };
    await answerQuestion({ uid: 'n1', crop: 'any', text: 'may diamond na batik sa dahon ng palay', sessionId: 'n' }, deps);
    await answerQuestion({ uid: 'n2', crop: 'any', text: 'may kuhol sa palayan', sessionId: 'n' }, deps);
    expect(seen[1]!.text).toBe('may kuhol sa palayan');
  });

  it('starts a new problem when the farmer names the other crop', async () => {
    const { matcher, seen } = scriptedMatcher(() => ({ ids: ['rice-blast', 'bph'], clear: false }));
    const { explainer } = recordingExplainer();
    const deps = { matcher, explainer, knowledge, logger: quiet, conversations: new ConversationStore() };
    await answerQuestion({ uid: 'x1', crop: 'any', text: 'may batik sa dahon ng palay', sessionId: 'x' }, deps);
    await answerQuestion({ uid: 'x2', crop: 'any', text: 'may dilaw na guhit sa mais', sessionId: 'x' }, deps);
    expect(seen[1]).toEqual({ text: 'may dilaw na guhit sa mais', crop: 'corn' });
  });
});

describe('fixed replies and the chat', () => {
  it('answers a pesticide dose ask with a fixed line, never the model', async () => {
    const { matcher, seen } = scriptedMatcher(() => noMatch);
    const { explainer, chats } = recordingExplainer();
    const res = await answerQuestion({ uid: 'p1', crop: 'any', text: 'ilang ml ng karate kada litro?' }, { matcher, explainer, knowledge, logger: quiet });
    expect(seen).toEqual([]);
    expect(chats).toEqual([]);
    expect(res.explanationStatus).toBe('ok');
    expect(res.explanation).toMatch(/Hindi po ako nagbibigay ng pangalan o dosis ng pesticide/);
  });

  it('never tells small talk that the problem could not be found, even after two failed questions', async () => {
    const { matcher } = scriptedMatcher(() => noMatch);
    const { explainer, chats } = recordingExplainer();
    const deps = { matcher, explainer, knowledge, logger: quiet, conversations: new ConversationStore() };
    for (const [i, text] of ['may kakaiba sa palay', 'may kakaiba pa rin sa palay', 'tulungan mo ako'].entries()) {
      await answerQuestion({ uid: `t${i}`, crop: 'rice', text, sessionId: 't' }, deps);
    }
    expect(chats[2]!.unmatched).toBe(false);
    expect(chats[2]!.final).toBe(false);
  });

  it('asks again after a final answer instead of repeating "call the agriculturist"', async () => {
    const { matcher } = scriptedMatcher(() => noMatch);
    const { explainer, chats } = recordingExplainer();
    const deps = { matcher, explainer, knowledge, logger: quiet, conversations: new ConversationStore() };
    for (const [i, text] of ['may kakaiba sa palay', 'may kakaiba pa rin', 'kakaiba talaga', 'may sira sa tangkay'].entries()) {
      await answerQuestion({ uid: `a${i}`, crop: 'rice', text, sessionId: 'a' }, deps);
    }
    expect(chats.map((c) => c.final)).toEqual([false, false, true, false]);
    expect(chats[3]!.notes).toEqual([]);
  });

  it("replaces a small-talk reply that breaks the guardrail with the app's own line", async () => {
    const { matcher } = scriptedMatcher(() => noMatch);
    const explainer: Explainer = {
      name: 'gemma',
      async explain() {
        return { status: 'ok', text: '' };
      },
      async chat() {
        return { status: 'ok', text: 'Gumamit po ng Furadan.' };
      },
    };
    const res = await answerQuestion({ uid: 'b1', crop: 'any', text: 'hello po' }, { matcher, explainer, knowledge, logger: quiet });
    expect(res.explanationStatus).toBe('ok');
    expect(res.explanation).not.toMatch(/Furadan/);
  });
});

describe('the conversation store', () => {
  const empty = (): Session => ({ questions: [], notes: [], turns: [], followUps: 0 });

  it('forgets a chat nobody has written to for a long time', () => {
    let now = 0;
    const store = new ConversationStore(() => now);
    store.put('idle', empty());
    expect(store.get('idle')).toBeDefined();
    now = SESSION_TTL_MS + 1;
    expect(store.get('idle')).toBeUndefined();
  });

  it('keeps at most MAX_SESSIONS chats, dropping the one nobody wrote to for longest', () => {
    const store = new ConversationStore();
    for (let i = 0; i <= MAX_SESSIONS; i++) store.put(`chat-${i}`, empty());
    expect(store.get('chat-0')).toBeUndefined();
    expect(store.get(`chat-${MAX_SESSIONS}`)).toBeDefined();
  });
});

describe('the sessionId in a request', () => {
  it('is accepted, and a sessionId that is too long is rejected', () => {
    const base = { uid: 'p1', crop: 'any', text: 'may butas' };
    expect(parseAskRequest({ ...base, sessionId: 'abc-123' })).toEqual({ ...base, sessionId: 'abc-123' });
    expect(typeof parseAskRequest({ ...base, sessionId: 'x'.repeat(65) })).toBe('string');
    expect(typeof parseAskRequest({ ...base, sessionId: 7 })).toBe('string');
  });
});
