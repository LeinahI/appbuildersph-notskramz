import { findViolations } from './guard.js';
import type { KeywordResult } from './types.js';

/** Every answer ends with this line. Exact text from the project spec. */
export const DISCLAIMER = 'Kumpirmahin sa lokal na agriculturist bago gumamit ng anumang pesticide.';

export const NO_MATCH_TEXT = 'Walang malinaw na tugma. Tawagan ang lokal na agriculturist o technician ng DA.';
export const NOT_SURE_TEXT = 'Hindi tiyak. Tawagan ang lokal na agriculturist bago kumilos.';

export interface ComposeInput {
  result: KeywordResult;
  /** Taglish explanation from the AI, if any. Dropped when it breaks the guardrail. */
  explanation?: string | null;
}

export interface ComposedAnswer {
  /** Plain text for display or logs. Always ends with DISCLAIMER. */
  text: string;
  /** False when the explanation was missing or dropped. */
  explanationUsed: boolean;
  /** True when an explanation was received but blocked by the guardrail. */
  explanationBlocked: boolean;
}

/**
 * Builds the answer a farmer sees. The curated notes always come first.
 * The AI explanation is shown only if it passes the pesticide guardrail.
 */
export function composeAnswer({ result, explanation }: ComposeInput): ComposedAnswer {
  const lines: string[] = [];

  if (result.matches.length === 0) {
    lines.push(NO_MATCH_TEXT);
  } else if (!result.clear) {
    lines.push(NOT_SURE_TEXT);
  }

  for (const { entry } of result.matches) {
    lines.push('', entry.name, 'Mga senyales:', ...entry.signs.map((s) => `- ${s}`));
    lines.push('Mga hakbang:', ...entry.actions.map((a, i) => `${i + 1}. ${a}`));
    lines.push(`Kumonsulta agad kung: ${entry.callExpertIf}`);
  }

  let explanationUsed = false;
  let explanationBlocked = false;
  const ai = explanation?.trim();
  if (ai) {
    if (findViolations(ai).length === 0) {
      lines.push('', 'Paliwanag:', ai);
      explanationUsed = true;
    } else {
      explanationBlocked = true;
    }
  }

  lines.push('', DISCLAIMER);
  return { text: lines.join('\n').trim(), explanationUsed, explanationBlocked };
}
