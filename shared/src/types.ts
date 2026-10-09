export type Crop = 'rice' | 'corn';

/** One curated problem. Lives in knowledge/<id>.json. */
export interface KnowledgeEntry {
  /** Stable slug. Must equal the file name without ".json". */
  id: string;
  crop: Crop;
  /** Display name, shown to farmers. */
  name: string;
  /** English and Tagalog words farmers use. Lowercase. Matched as whole words or phrases. */
  keywords: string[];
  /** What the farmer can see in the field. */
  signs: string[];
  /** Field steps. Must never name a pesticide brand or give a dosage. */
  actions: string[];
  /** When to call the agriculturist right away. */
  callExpertIf: string;
  /** Agronomist who signed off. Empty until review. */
  reviewedBy: string;
  /** ISO date (YYYY-MM-DD) of the review. Empty until review. */
  reviewedOn: string;
}

export interface KeywordMatch {
  entry: KnowledgeEntry;
  /** Number of distinct keywords found in the description. */
  score: number;
}

export interface KeywordResult {
  /** Best matches first, at most the requested limit. */
  matches: KeywordMatch[];
  /** False when nothing matched or the top two entries tie. */
  clear: boolean;
}
