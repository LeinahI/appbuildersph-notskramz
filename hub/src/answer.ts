import {
  findViolations,
  type AskRequest,
  type AskResponse,
  type Crop,
  type KnowledgeEntry,
} from '@ugatan/shared';
import type { Explainer } from './explain/index.js';
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
  return { uid: v.uid, crop: v.crop as Crop | 'any', text: v.text };
}

export interface AnswerDeps {
  matcher: Matcher;
  explainer: Explainer;
  knowledge: readonly KnowledgeEntry[];
  logger: Logger;
}

/** Runs matching, then the explanation, and returns what the phone needs. Every step is logged. */
export async function answerQuestion(req: AskRequest, deps: AnswerDeps): Promise<AskResponse> {
  const { matcher, explainer, knowledge, logger } = deps;
  logger.write({ event: 'question', uid: req.uid, crop: req.crop, text: req.text });

  const outcome = await matcher.match(req.text, req.crop);
  logger.write({ event: 'match', uid: req.uid, matcher: matcher.name, ids: outcome.ids, clear: outcome.clear });

  if (outcome.ids.length === 0) {
    logger.write({ event: 'escalation', uid: req.uid, reason: 'no-match' });
  } else if (!outcome.clear) {
    logger.write({ event: 'escalation', uid: req.uid, reason: 'not-sure' });
  }

  const byId = new Map(knowledge.map((e) => [e.id, e]));
  const entries = outcome.ids.map((id) => byId.get(id)).filter((e): e is KnowledgeEntry => e !== undefined);

  let status: AskResponse['explanationStatus'] = 'unavailable';
  let explanation: string | null = null;
  try {
    const result = await explainer.explain({ text: req.text, crop: req.crop, entries });
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
    logger.write({ event: 'error', where: 'explain', message: err instanceof Error ? err.message : String(err) });
  }
  logger.write({ event: 'explanation', uid: req.uid, status, chars: explanation?.length ?? 0 });

  return {
    uid: req.uid,
    matcher: matcher.name,
    matchIds: outcome.ids,
    clear: outcome.clear,
    explanationStatus: status,
    explanation,
  };
}
