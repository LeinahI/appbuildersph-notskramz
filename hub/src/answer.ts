import {
  CHAT_HISTORY_TURNS,
  cropOfChat,
  findViolations,
  notesToExplain,
  type AskRequest,
  type AskResponse,
  type ChatTurn,
  type Crop,
  type KnowledgeEntry,
} from '@ugatan/shared';
import type { ExplainResult, Explainer } from './explain/index.js';
import type { Logger } from './log.js';
import type { Matcher } from './matchers/index.js';

export const MAX_TEXT_CHARS = 2000;
export const MAX_BODY_BYTES = 16 * 1024;

const CROPS: readonly string[] = ['rice', 'corn', 'any'];

/** Returns the request, or a message saying what is wrong with it. */
export function parseAskRequest(value: unknown): AskRequest | string {
  if (typeof value !== 'object' || value === null) return 'Body must be a JSON object.';
  const v = value as Record<string, unknown>;
  if (typeof v.uid !== 'string' || v.uid.length === 0 || v.uid.length > 64) return 'uid must be a string of 1 to 64 characters.';
  if (typeof v.crop !== 'string' || !CROPS.includes(v.crop)) return 'crop must be "rice", "corn", or "any".';
  if (typeof v.text !== 'string' || v.text.trim().length === 0) return 'text is required.';
  if (v.text.length > MAX_TEXT_CHARS) return `text must be at most ${MAX_TEXT_CHARS} characters.`;
  const history = parseHistory(v.history);
  if (typeof history === 'string') return history;
  return { uid: v.uid, crop: v.crop as Crop | 'any', text: v.text, ...(history.length ? { history } : {}) };
}

/** Earlier turns of the chat. Optional. Only the last few are kept, since the model reads no more than that. */
function parseHistory(value: unknown): ChatTurn[] | string {
  if (value === undefined) return [];
  const bad = `history must be a list of { question, reply } strings of at most ${MAX_TEXT_CHARS} characters.`;
  if (!Array.isArray(value)) return bad;
  const turns: ChatTurn[] = [];
  for (const t of value.slice(-CHAT_HISTORY_TURNS)) {
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
}

/**
 * Runs matching, then the explanation, and returns what the phone needs. Every step is logged.
 *
 * The matcher (keyword, Laya, or hybrid) decides which problem it is and whether it is sure. The explainer
 * (Gemma) only puts that decision into Taglish: a sure match gets the top note only, a match that is not sure
 * gets the candidates and is told so. With no match there is nothing to explain, so Gemma replies to what the
 * farmer said instead (a greeting, a complaint, or a report with no sign) and asks what they see.
 */
export async function answerQuestion(req: AskRequest, deps: AnswerDeps): Promise<AskResponse> {
  const { matcher, explainer, knowledge, logger } = deps;
  // The farmer never picks a crop, so the chat says which one it is: "palay" two messages ago still counts.
  const crop = req.crop === 'any' ? cropOfChat(req.text, req.history) : req.crop;
  logger.write({ event: 'question', uid: req.uid, crop, text: req.text });
  const outcome = await matcher.match(req.text, crop);
  logger.write({
    event: 'match',
    uid: req.uid,
    matcher: matcher.name,
    ids: outcome.ids,
    clear: outcome.clear,
    // Kept so the team can check Gemma's English against the farmer's words.
    ...(outcome.english ? { english: outcome.english } : {}),
  });

  if (outcome.ids.length === 0) {
    // "No signs" is a greeting or a complaint, not a crop problem the hub failed on.
    if (!outcome.noSigns) logger.write({ event: 'escalation', uid: req.uid, reason: 'no-match' });
  } else if (!outcome.clear) {
    logger.write({ event: 'escalation', uid: req.uid, reason: 'not-sure' });
  }

  const byId = new Map(knowledge.map((e) => [e.id, e]));
  const entries = outcome.ids.map((id) => byId.get(id)).filter((e): e is KnowledgeEntry => e !== undefined);

  let status: AskResponse['explanationStatus'] = 'unavailable';
  let explanation: string | null = null;
  const chat = entries.length === 0;
  let run: (() => Promise<ExplainResult>) | null;
  if (!chat) {
    run = () =>
      explainer.explain({
        text: req.text,
        crop,
        entries: notesToExplain(entries, outcome.clear),
        clear: outcome.clear,
      });
  } else {
    const chatWith = explainer.chat?.bind(explainer);
    run = chatWith ? () => chatWith({ text: req.text, history: req.history ?? [] }) : null;
  }

  if (!run) {
    // No model to reply. The phone shows its own "no match, call the agriculturist" line.
    logger.write({ event: 'explanation', uid: req.uid, status: 'skipped-no-match', chars: 0 });
  } else {
    try {
      const result = await run();
      if (result.status === 'ok' && result.text?.trim()) {
        if (findViolations(result.text).length === 0) {
          status = 'ok';
          explanation = result.text.trim();
        } else {
          // Guardrail: a brand name or dosage never leaves the hub.
          status = 'blocked';
        }
      }
    } catch (err) {
      logger.write({ event: 'error', where: chat ? 'chat' : 'explain', message: err instanceof Error ? err.message : String(err) });
    }
    logger.write({ event: 'explanation', uid: req.uid, status: chat ? `chat-${status}` : status, chars: explanation?.length ?? 0 });
  }

  return {
    uid: req.uid,
    matcher: matcher.name,
    matchIds: outcome.ids,
    clear: outcome.clear,
    explanationStatus: status,
    explanation,
  };
}
