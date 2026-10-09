import {
  MAX_HISTORY_TURNS,
  MAX_IMAGE_CHARS,
  NOT_SURE_TEXT,
  NO_MATCH_TEXT,
  cropOfChat,
  detectCrop,
  findViolations,
  fixedReply,
  isAboutLastAnswer,
  isQuestionWithoutSign,
  isFinalAnswer,
  isInjectionAttempt,
  isOffTopic,
  isSmallTalk,
  keywordHits,
  matchKeywords,
  notesForMatch,
  notesToExplain,
  photoOutcome,
  routeFor,
  sessionText,
  smallTalkReply,
  tidyReply,
  ungroundedProblems,
  withProblemName,
  type AskRequest,
  type AskResponse,
  type ChatTurn,
  type Crop,
  type KnowledgeEntry,
  type PhotoStatus,
  type Route,
  type TurnOutcome,
} from '@ugatan/shared';
import { ConversationStore, sessionAfter, sessionBefore, withReply } from './conversation/state.js';
import type { ExplainResult, Explainer, ImageDescriber } from './explain/index.js';
import { readPhoto } from './image.js';
import type { Logger } from './log.js';
import type { MatchOutcome, Matcher } from './matchers/index.js';

export const MAX_TEXT_CHARS = 2000;
/** Largest request without a photo. */
export const MAX_BODY_BYTES = 16 * 1024;
/** Largest request with a photo: the base64 photo plus the JSON around it. */
export const MAX_IMAGE_BODY_BYTES = MAX_IMAGE_CHARS + MAX_BODY_BYTES;
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
  if (v.symptomId !== undefined && (typeof v.symptomId !== 'string' || v.symptomId.length === 0 || v.symptomId.length > MAX_SESSION_ID_CHARS)) {
    return `symptomId must be a string of 1 to ${MAX_SESSION_ID_CHARS} characters.`;
  }
  if (v.image !== undefined && (typeof v.image !== 'string' || v.image.length === 0 || v.image.length > MAX_IMAGE_CHARS)) {
    return `image must be a base64 JPEG of at most ${MAX_IMAGE_CHARS} characters.`;
  }
  const history = parseHistory(v.history);
  if (typeof history === 'string') return history;
  return {
    uid: v.uid,
    crop: v.crop as Crop | 'any',
    text: v.text,
    ...(history.length ? { history } : {}),
    ...(typeof v.sessionId === 'string' ? { sessionId: v.sessionId } : {}),
    ...(typeof v.symptomId === 'string' ? { symptomId: v.symptomId } : {}),
    ...(typeof v.image === 'string' ? { image: v.image } : {}),
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
  /** Reads photos. Without it, a photo is ignored and the question is answered from the farmer's words. */
  imageDescriber?: ImageDescriber;
}

/** What a photo adds to a question. */
interface PhotoRead {
  status: PhotoStatus;
  /** Plain English signs, only when status is "ok". */
  signs: string | null;
}

/**
 * Reads the photo that came with a question. The description feeds matching and nothing else: it is never shown
 * as advice, and it goes through the pesticide guardrail like every other model text. Any failure leaves the
 * question to be answered from the farmer's words alone.
 */
async function readPhotoSigns(req: AskRequest, note: string, crop: Crop | 'any', deps: AnswerDeps): Promise<PhotoRead> {
  const { imageDescriber, logger } = deps;
  if (!imageDescriber) return { status: 'unavailable', signs: null };
  const photo = readPhoto(req.image!);
  if ('error' in photo) {
    logger.write({ event: 'photo', uid: req.uid, status: 'unreadable', reason: photo.error });
    return { status: 'unreadable', signs: null };
  }
  const started = Date.now();
  try {
    const outcome = photoOutcome(await imageDescriber.describeImage(photo.bytes, note, crop));
    const ms = Date.now() - started;
    if (outcome.kind === 'not-plant') {
      logger.write({ event: 'photo', uid: req.uid, status: 'not-plant', ms });
      return { status: 'not-plant', signs: null };
    }
    if (outcome.kind === 'no-signs') {
      logger.write({ event: 'photo', uid: req.uid, status: 'no-signs', ms });
      return { status: 'no-signs', signs: null };
    }
    if (findViolations(outcome.english).length > 0) {
      // A brand name or dosage never reaches the matcher or the phone.
      logger.write({ event: 'photo', uid: req.uid, status: 'unreadable', reason: 'guardrail', ms });
      return { status: 'unreadable', signs: null };
    }
    logger.write({ event: 'photo', uid: req.uid, status: 'ok', english: outcome.english, ms });
    return { status: 'ok', signs: outcome.english };
  } catch (err) {
    logger.write({ event: 'error', where: 'photo', message: err instanceof Error ? err.message : String(err) });
    return { status: 'unreadable', signs: null };
  }
}

/** The farmer's words with what the photo showed. Photos that show nothing useful add a short note for the chat reply only. */
function withPhoto(text: string, photo: PhotoRead): string {
  const said = text.replace(/[.\s]+$/, '');
  if (photo.status === 'ok') return `${said}. ${photo.signs}`;
  if (photo.status === 'not-plant') return `${text} [The farmer sent a photo, but it does not show rice or corn.]`;
  if (photo.status === 'no-signs') return `${text} [The farmer sent a photo, but it shows no clear sign of a problem.]`;
  return text;
}

/**
 * Runs routing, matching, then the reply, and returns what the phone needs. Every step is logged.
 *
 * 1. Small talk and off-topic messages (a greeting, thanks, a complaint, another crop, health, prices) go to the chat.
 *    A pesticide or dose ask, a health ask, another crop, and "who are you" get a fixed reply, not the model's.
 * 2. A symptom is matched on everything the farmer has said about the problem still open, not on the last message
 *    alone. A clear match or a final answer closes the problem, so the next sign starts fresh. After the app named a
 *    problem, a question with no new sign ("ano ang gagawin ko?") is answered by the chat from that problem's notes.
 * 3. The matcher (keyword, Laya, or hybrid) decides which problem it is and whether it is sure. The explainer
 *    (Gemma) only puts that decision into Taglish. A sure match gets the top note only. A match that is not
 *    sure asks one question. After two questions with no clear match, the reply gives the best answer and says
 *    what is uncertain.
 * 4. With no match there is nothing to explain, so Gemma replies to the whole chat and asks what the farmer sees.
 *
 * Requests for one chat run one at a time, and a request id that was already answered gets the same answer again.
 */
export async function answerQuestion(req: AskRequest, deps: AnswerDeps): Promise<AskResponse> {
  const { conversations } = deps;
  if (!conversations || !req.sessionId) return answerOnce(req, deps);
  const sessionId = req.sessionId;
  return conversations.exclusive(sessionId, async () => {
    // A request sent twice (the phone retries after a dropped reply) is answered from memory, not counted twice.
    const earlier = conversations.get(sessionId)?.replies.find((r) => r.uid === req.uid);
    if (earlier) return earlier.response;
    return answerOnce(req, deps);
  });
}

async function answerOnce(req: AskRequest, deps: AnswerDeps): Promise<AskResponse> {
  const { matcher, explainer, knowledge, logger, conversations } = deps;
  const farmerText = req.text.trim();
  const signed = (t: string) => matchKeywords(t, 'any', knowledge).matches.length > 0;
  const byId = new Map(knowledge.map((e) => [e.id, e]));

  // What the hub already holds for this chat: the farmer's notes, earlier questions, and the follow-up count.
  const before = sessionBefore(conversations, req.sessionId, req.history ?? [], signed);
  const earlierTurns = before.questions.map((question) => ({ question, reply: '' }));
  // The input rail: a message that tries to override the rules is never matched, even with a photo or a tapped picture.
  const injection = isInjectionAttempt(farmerText);
  // A tapped symptom picture is a pick, so it always goes to matching, and its label is never matched as words.
  const picked = req.symptomId ? knowledge.find((e) => e.id === req.symptomId) : undefined;
  // A photo adds the signs it shows to what the farmer said. A tapped picture already is the pick, so its photo is not read.
  const photo =
    req.image && !picked && !injection
      ? await readPhotoSigns(req, farmerText, req.crop === 'any' ? cropOfChat(farmerText, earlierTurns) : req.crop, deps)
      : null;
  // What the matcher and the chat's notes read: the farmer's words, plus the photo's signs when it showed some.
  // A photo that showed nothing adds nothing here. The chat reply alone is told about it (`said`).
  const asked = photo?.status === 'ok' ? withPhoto(farmerText, photo) : farmerText;
  const said = photo ? withPhoto(farmerText, photo) : farmerText;
  // The farmer never picks a crop: the newest message that names one decides, earlier chat included.
  const crop: Crop | 'any' = req.crop === 'any' ? cropOfChat(asked, earlierTurns) : req.crop;
  // Signs read from a photo always go to matching, even when the keywords do not know the wording. A photo that
  // showed nothing, with no symptom in the farmer's words, has nothing to match: the chat replies instead.
  const photoShowedNothing = photo?.status === 'not-plant' || photo?.status === 'no-signs';
  let route: Route = injection
    ? 'chat'
    : picked || photo?.status === 'ok'
      ? 'match'
      : photoShowedNothing && !signed(asked)
        ? 'chat'
        : routeFor(asked, signed(asked));
  // The problem the app last named in this chat, if any. A message that names the other crop is not about it.
  const named = before.lastMatch ? byId.get(before.lastMatch) : undefined;
  const lastNamed = named && (detectCrop(asked) ?? named.crop) === named.crop ? named : undefined;
  // After a named problem, a question or remark with no new sign is about that answer. Matching it again would
  // repeat the last answer, so the chat answers it from the problem's notes.
  // A question with no sign is not re-matched either while a problem is still open: it would only get the same reply.
  const aboutAnswer = lastNamed ? isAboutLastAnswer(asked, signed(asked)) : isQuestionWithoutSign(asked, signed(asked));
  if (route === 'match' && !picked && photo?.status !== 'ok' && aboutAnswer) {
    route = 'chat';
  }
  logger.write({ event: 'question', uid: req.uid, crop, text: req.text, route });

  // Small talk never reaches the matcher. A symptom is matched on the open problem's notes and the new message.
  // A message that names the other crop starts a new problem.
  const notes = notesForMatch(before.notes, asked);
  const description = sessionText([...notes, asked]);
  let outcome: MatchOutcome = { ids: [], clear: false };
  if (picked && !injection) {
    outcome = { ids: [picked.id], clear: true };
    logger.write({ event: 'match', uid: req.uid, matcher: 'pick', ids: outcome.ids, clear: true });
  } else if (route === 'match') {
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

  const entries = outcome.ids.map((id) => byId.get(id)).filter((e): e is KnowledgeEntry => e !== undefined);
  const matched = route === 'match' && entries.length > 0;
  const clear = matched && outcome.clear;
  // Two questions in a row with no clear match: the reply gives its best answer and asks nothing more.
  const final = isFinalAnswer(before.followUps);
  const bestGuess = matched && !clear && final;
  // The farmer described signs and nothing matched. A message with no sign at all ("may problema ang palay ko") is not this.
  const unmatched = route === 'match' && !matched && !outcome.noSigns;
  // A pesticide or dose ask, a health ask, another crop, or "who are you": a fixed reply, never the model's.
  const fixed = route === 'chat' ? fixedReply(asked) : null;
  // The notes name the problem's crop, so a question that named none is still explained for the right crop.
  const explainCrop = crop === 'any' && entries.length && entries.every((e) => e.crop === entries[0]!.crop) ? entries[0]!.crop : crop;

  let status: AskResponse['explanationStatus'] = 'unavailable';
  let explanation: string | null = null;
  let run: (() => Promise<ExplainResult>) | null;
  if (fixed) {
    run = null;
  } else if (matched) {
    run = () =>
      explainer.explain({
        text: description,
        crop: explainCrop,
        entries: notesToExplain(entries, clear || bestGuess),
        clear,
        bestGuess,
      });
  } else {
    const chatWith = explainer.chat?.bind(explainer);
    // The phone's history is what the farmer saw, so it is preferred. The hub's own turns cover a chat it lost.
    run = chatWith
      ? () =>
          chatWith({
            text: said,
            history: req.history ?? before.turns,
            notes,
            unmatched,
            final: unmatched && final,
            crop,
            ...(lastNamed ? { diagnosis: lastNamed } : {}),
          })
      : null;
  }

  if (fixed) {
    status = 'ok';
    explanation = fixed;
    logger.write({ event: 'explanation', uid: req.uid, status: 'chat-fixed', chars: fixed.length });
  } else if (!run) {
    // No model to reply. The phone shows its own line for small talk or "no match, call the agriculturist".
    logger.write({ event: 'explanation', uid: req.uid, status: 'skipped-no-match', chars: 0 });
  } else {
    try {
      const result = await run();
      if (result.status === 'ok' && result.text?.trim()) {
        // The model may ask more than one question, repeat the farmer, or open with an apology the farmer did not earn.
        // A sure match or a best guess always says the problem's name.
        const tidied = tidyReply(result.text, asked);
        const reply = clear || bestGuess ? withProblemName(tidied, entries[0]!.name, clear) : tidied;
        // The output rail: the reply may name only the problems it was given notes for (the one just explained, or
        // the one the app already named in this chat). Anything else is a model guess and never leaves the hub.
        const given = matched ? notesToExplain(entries, clear || bestGuess) : lastNamed ? [lastNamed] : [];
        const ungrounded = ungroundedProblems(reply, knowledge, given, asked);
        if (ungrounded.length > 0) {
          logger.write({ event: 'guardrail', uid: req.uid, rail: 'grounding', names: ungrounded });
        }
        if (findViolations(reply).length === 0 && ungrounded.length === 0) {
          status = 'ok';
          explanation = reply;
        } else if (!matched && (isSmallTalk(asked) || isOffTopic(asked))) {
          // Guardrail: the model's words never leave the hub, but small talk still gets the app's own line.
          status = 'ok';
          explanation = smallTalkReply(asked);
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

  const response: AskResponse = {
    uid: req.uid,
    matcher: matcher.name,
    matchIds: outcome.ids,
    clear: outcome.clear,
    // The symptom words the top note was found on, from the English when Gemma wrote it.
    matchedOn: matched ? keywordHits(entries[0]!, outcome.english ?? description) : [],
    explanationStatus: status,
    explanation,
    ...(photo ? { photo: photo.status, photoSigns: photo.signs } : {}),
  };

  // What the farmer saw this turn, kept with the chat for the next question, and the answer kept for a retry.
  // A clear match or a final answer closes the problem. Small talk and a message with no sign change nothing.
  const outcomeKind: TurnOutcome = clear
    ? 'clear'
    : bestGuess || (unmatched && final)
      ? 'done'
      : matched || unmatched
        ? 'ask'
        : 'small';
  if (conversations && req.sessionId) {
    const shown = explanation ?? (route === 'chat' ? smallTalkReply(asked) : entries.length ? NOT_SURE_TEXT : NO_MATCH_TEXT);
    const named = clear || bestGuess ? entries[0]!.id : undefined;
    conversations.put(req.sessionId, withReply(sessionAfter({ ...before, notes }, asked, shown, outcomeKind, named), req.uid, response));
  }
  return response;
}
