import type { Crop } from '@ugatan/shared';

export interface MatchOutcome {
  /** Knowledge ids, best first. */
  ids: string[];
  /** False when the matcher is not sure. */
  clear: boolean;
  /** The plain-English description the match was made on, when Gemma described the question first. */
  english?: string;
  /** True when Gemma read the question and found no sign to match on, such as a greeting or a complaint. */
  noSigns?: boolean;
}

/** A matcher turns a farmer's description into knowledge ids. Keyword, Laya, and the hybrid of the two implement it. */
export interface Matcher {
  readonly name: 'keyword' | 'laya' | 'hybrid';
  match(text: string, crop: Crop | 'any'): Promise<MatchOutcome>;
}
