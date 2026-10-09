import type { Crop } from '@ugatan/shared';

export interface MatchOutcome {
  /** Knowledge ids, best first. */
  ids: string[];
  /** False when the matcher is not sure. */
  clear: boolean;
}

/** A matcher turns a farmer's description into knowledge ids. Keyword and Laya both implement it. */
export interface Matcher {
  readonly name: 'keyword' | 'laya';
  match(text: string, crop: Crop | 'any'): Promise<MatchOutcome>;
}
