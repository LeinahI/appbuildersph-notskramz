import {
  MAX_HISTORY_TURNS,
  NOT_SURE_TEXT,
  NO_MATCH_TEXT,
  cropOfChat,
  findViolations,
  isFinalAnswer,
  keywordHits,
  limitQuestions,
  matchKeywords,
  notesToExplain,
  routeFor,
  sessionText,
  smallTalkReply,
  type AskRequest,
  type AskResponse,
  type ChatTurn,
  type Crop,
  type KnowledgeEntry,
  type TurnOutcome,
} from '@ugatan/shared';
import { ConversationStore, sessionAfter, sessionBefore } from './conversation/state.js';
import type { ExplainResult, Explainer } from './explain/index.js';
import type { Logger } from './log.js';
import type { MatchOutcome, Matcher } from './matchers/index.js';

export const MAX_TEXT_CHARS = 2000;
export const MAX_BODY_BYTES = 16 * 1024;
const MAX_SESSION_ID_CHARS = 64;

const CROPS: readonly string[] = ['rice', 'corn', 'any'];

/** Returns the request, or a message saying what is wrong with it. */
export function parseAskRequest(value: unknown): AskRequest | string {
  if (typeof value !== 'object' || value === null) return 'Body must be a JSON object.';
  const v = value as Record<string, unknown>;
  if (typeof v.uid !== 'string' || v.uid.length === 0 || v.uid.length > 64) return 'uid must be a string of 1 to 64 characters.';
  if (typeof v.crop !== 'string' || !CROPS.includes(v.crop)) return 'crop must be "rice", "corn", or "any".';
  if (typeof v.text !== 'string' || v.text.trim().length === 0) return 'text is required.';
  if (v.text.length > MAX_TEXT_CHARS) return `text must be at most ${MAX_TEXT_CHARS} characters.`;
  if (v.sessionId !== undefined && (typeof v.sessionId !== 'string' || v.sessionId.length === 0 || v.sessionId.length > MAX_SESSION_ID_CHARS)) {
    return `sessionId must be a string of 1 to ${MAX_SESSION_ID_CHARS} characters.`;
  }
  const history = parseHistory(v.history);
  if (typeof history === 'string') return history;
  return {
    uid: v.uid,
    crop: v.crop as Crop | 'any',
    text: v.text,
    ...(history.length ? { history } : {}),
    ...(typeof v.sessionId === 'string' ? { sessionId: v.sessionId } : {}),
  };
}

/** Earlier turns of the chat, oldest first. Optional. Only the last few are kept. */
function parseHistory(value: unknown): ChatTurn[] | string {
  if (value === undefined) return [];
  const bad = `history must be a list of { question, reply } strings of at most ${MAX_TEXT_CHARS} characters.`;
  if (!Array.isArray(value)) return bad;
  const turns: ChatTurn[] = [];
  for (const t of value.slice(-MAX_HISTORY_TURNS)) {
    if (typeof t !== 'object' || t === null) return bad;
    const { question, reply } = t as Record<string, unknown>;
    if (typeof question !== 'string' || typeof reply !== 'string') return bad;
    if (question.length > MAX_TEXT_CHARS || reply.length > MAX_TEXT_CHARS) return bad;
    turns.push({ question, reply });
  }
  return turns;
}

export interface AnswerDeps {
  matcher: Matcher;
  explainer: Explainer;
  knowledge: readonly KnowledgeEntry[];
  logger: Logger;
  /** Chats kept between questions. Without it, each question is read from its own history only. */
  conversations?: ConversationStore;
}

/**
 * Runs routing, matching, then the reply, and returns what the phone needs. Every step is logged.
 *
 * 1. Small talk (a greeting, thanks, a complaint, a request for help) goes to the chat, not to matching.
 * 2. A symptom is matched on everything the farmer has said in the chat so far, not on the last message alone.
 * 3. The matcher (keyword, Laya, or hybrid) decides which problem it is and whether it is sure. The explainer
 *    (Gemma) only puts that decision into Taglish. A sure match gets the top note only. A match that is not
 *    sure asks one question. After two questions with no clear match, the reply gives the best answer and says
 *    what is uncertain.
 * 4. With no match there is nothing to explain, so Gemma replies to the whole chat and asks what the farmer sees.
 */
export async function answerQuestion(req: AskRequest, deps: AnswerDeps): Promise<AskResponse> {
  const { matcher, explainer, knowledge, logger, conversations } = deps;
  const text = req.text.trim();
  const signed = (t: string) => matchKeywords(t, 'any', knowledge).matches.length > 0;

  // What the hub already holds for this chat: the farmer's notes, earlier questions, and the follow-up count.
  const before = sessionBefore(conversations, req.sessionId, req.history ?? [], signed);
  // The farmer never picks a crop: the newest message that names one decides, earlier chat included.
  const crop: Crop | 'any' =
    req.crop === 'any' ? cropOfChat(text, before.questions.map((question) => ({ question, reply: '' }))) : req.crop;
  const route = routeFor(text, signed(text));
  logger.write({ event: 'question', uid: req.uid, crop, text: req.text, route });

  // Small talk never reaches the matcher. A symptom is matched on the whole description so far.
  const description = sessionText([...before.notes, text]);
  let outcome: MatchOutcome = { ids: [], clear: false };
  if (route === 'match') {
    outcome = await matcher.match(description, crop);
    logger.write({
      event: 'match',
      uid: req.uid,
      matcher: matcher.name,
      ids: outcome.ids,
      clear: outcome.clear,
      // Kept so the team can check Gemma's English against the farmer's words.
      ...(outcome.english ? { english: outcome.english } : {}),
    });
  }

  if (route === 'match') {
    if (outcome.ids.length === 0) {
      // "No signs" is a greeting or a complaint, not a crop problem the hub failed on.
      if (!outcome.noSigns) logger.write({ event: 'escalation', uid: req.uid, reason: 'no-match' });
    } else if (!outcome.clear) {
      logger.write({ event: 'escalation', uid: req.uid, reason: 'not-sure' });
    }
  }

  const byId = new Map(knowledge.map((e) => [e.id, e]));
  const entries = outcome.ids.map((id) => byId.get(id)).filter((e): e is KnowledgeEntry => e !== undefined);
  const matched = route === 'match' && entries.length > 0;
  const clear = matched && outcome.clear;
  // Two questions in a row with no clear match: the reply gives its best answer and asks nothing more.
  const final = isFinalAnswer(before.followUps);
  const bestGuess = matched && !clear && final;

  let status: AskResponse['explanationStatus'] = 'unavailable';
  let explanation: string | null = null;
  let run: (() => Promise<ExplainResult>) | null;
  if (matched) {
    run = () =>
      explainer.explain({
        text: description,
        crop,
        entries: notesToExplain(entries, clear || bestGuess),
        clear,
        bestGuess,
      });
  } else {
    const chatWith = explainer.chat?.bind(explainer);
    // The phone's history is what the farmer saw, so it is preferred. The hub's own turns cover a chat it lost.
    run = chatWith
      ? () => chatWith({ text, history: req.history ?? before.turns, notes: before.notes, final })
      : null;
  }

  if (!run) {
    // No model to reply. The phone shows its own line for small talk or "no match, call the agriculturist".
    logger.write({ event: 'explanation', uid: req.uid, status: 'skipped-no-match', chars: 0 });
  } else {
    try {
      const result = await run();
      if (result.status === 'ok' && result.text?.trim()) {
        // The model may ask more than one question. The farmer gets one.
        const reply = limitQuestions(result.text);
        if (findViolations(reply).length === 0) {
          status = 'ok';
          explanation = reply;
        } else {
          // Guardrail: a brand name or dosage never leaves the hub.
          status = 'blocked';
        }
      }
    } catch (err) {
      logger.write({
        event: 'error',
        where: matched ? 'explain' : 'chat',
        message: err instanceof Error ? err.message : String(err),
      });
    }
    logger.write({
      event: 'explanation',
      uid: req.uid,
      status: matched ? status : `chat-${status}`,
      chars: explanation?.length ?? 0,
    });
  }

  // What the farmer saw this turn, kept with the chat for the next question.
  const outcomeKind: TurnOutcome = clear ? 'clear' : route === 'chat' ? 'small' : 'ask';
  if (conversations && req.sessionId) {
    const shown = explanation ?? (route === 'chat' ? smallTalkReply(text) : entries.length ? NOT_SURE_TEXT : NO_MATCH_TEXT);
    conversations.put(req.sessionId, sessionAfter(before, text, shown, outcomeKind));
  }

  return {
    uid: req.uid,
    matcher: matcher.name,
    matchIds: outcome.ids,
    clear: outcome.clear,
    // The symptom words the top note was found on, from the English when Gemma wrote it.
    matchedOn: matched ? keywordHits(entries[0]!, outcome.english ?? description) : [],
    explanationStatus: status,
    explanation,
  };
}
