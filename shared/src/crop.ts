import type { ChatTurn } from './api.js';
import { normalize } from './keyword.js';
import type { Crop } from './types.js';

const CROP_WORDS: Record<Crop, readonly string[]> = {
  rice: ['palay', 'rice', 'humay', 'bigas', 'pinitpit'],
  corn: ['mais', 'corn', 'maize'],
};

/** The crop a message names, or null when it names none or both. "May butas ang palay" is rice. */
export function detectCrop(text: string): Crop | null {
  // Strip excluded/negated crops so "maliban sa palay" / "hindi mais" are not misread as rice/corn.
  const crop = '(?:palay|rice|humay|bigas|pinitpit|mais|corn|maize)';
  const cleaned = text
    .replace(new RegExp(`\\b(?:maliban|bukod|liban)\\s+sa\\s+(?:mga\\s+)?${crop}(?:\\s+o\\s+(?:mga\\s+)?${crop})?\\b`, 'gi'), ' ')
    .replace(new RegExp(`\\b(?:hindi|di|dili|not|except|other\\s+than)\\s+(?:mga\\s+)?${crop}\\b`, 'gi'), ' ');
  const padded = ` ${normalize(cleaned)} `;
  const named = (Object.keys(CROP_WORDS) as Crop[]).filter((crop) => CROP_WORDS[crop].some((w) => padded.includes(` ${w} `)));
  return named.length === 1 ? named[0]! : null;
}

/**
 * The crop a chat is about: the newest message that names one decides. The farmer never picks a crop, so a
 * follow-up like "may butas po" after "may mali sa palay ko" is still about rice, and is matched against rice only.
 */
export function cropOfChat(text: string, history: readonly ChatTurn[] = []): Crop | 'any' {
  for (const message of [text, ...history.map((t) => t.question).reverse()]) {
    const crop = detectCrop(message);
    if (crop) return crop;
  }
  return 'any';
}
