import type { KnowledgeEntry } from './types.js';

/** The question Laya answers for each description, on the hub and on the phone. */
export const LAYA_INSTRUCTIONS = "Which crop problem best matches the farmer's description of what they see in the field?";

/** Problem name without the parenthetical or alias: "Brown planthopper (BPH) / hopperburn" becomes "Brown planthopper". */
function shortName(name: string): string {
  return name.replace(/\s*\(.*?\)/g, '').replace(/\s*\/.*$/, '').trim();
}

/**
 * One option per knowledge entry, as plain text: the short name, then the English signs.
 * Do not put the id in the text. Laya fits all options of a question into 192 tokens and, when they
 * do not fit, silently cuts every option to an equal share (22 tokens for 8 options). An id prefix
 * used most of that share and the signs were cut off, so the model only saw names.
 */
export function problemOptions(entries: readonly KnowledgeEntry[]): { ids: string[]; texts: string[] } {
  return {
    ids: entries.map((e) => e.id),
    texts: entries.map((e) => `${shortName(e.name)}: ${e.signs.join('; ')}`),
  };
}
