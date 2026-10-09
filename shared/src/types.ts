export type Crop = 'rice' | 'corn';

/** When in the crop's life an insect attacks. Seedling and tillering count as vegetative; flowering, silking, and tasseling as reproductive. */
export type GrowthStage = 'vegetative' | 'reproductive' | 'ripening';

/**
 * What a farmer asking "what insect is this?" is told, for a problem that is an insect. Optional: diseases and the
 * golden apple snail have none. Every name here comes from a source in docs/agent-notes (PhilRice, DA, UPLB), never
 * from memory. A local name that only one source gives is still listed, but a name nobody sourced is left out.
 */
export interface InsectProfile {
  /** Common English name, such as "Rice bug". */
  commonName: string;
  /** Latin name. Where sources disagree on the species, the genus with "sp." is used. */
  scientificName: string;
  /** Filipino and regional names, such as Atangya, Harabas, or Aksip. */
  localNames: string[];
  /** Growth stages the insect attacks, in plant order. */
  stages: GrowthStage[];
  /** The stage in plain words, such as "from flowering to the milk stage". */
  stageNote: string;
  /** Natural enemies and bio-controls a farmer can protect or use. Never a pesticide. */
  biological: string[];
}

/** A language the card text is translated into. English is the source in the entry itself. */
export type CardLanguage = 'tl' | 'ceb';

/**
 * The card's farmer-facing text in another language, shown on the phone with no model. Same items in the same order
 * as the English. Drafted translations count as unreviewed until the entry's reviewedBy is set.
 */
export interface EntryTranslation {
  signs: string[];
  actions: string[];
  callExpertIf: string;
  /** Required when the entry has an insect profile. */
  stageNote?: string;
  /** Required when the entry has an insect profile. Same items as insect.biological. */
  biological?: string[];
}

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
  /** Field steps. Must never name a pesticide brand or give a dosage. For an insect these are the cultural and mechanical controls. */
  actions: string[];
  /** When to call the agriculturist right away. */
  callExpertIf: string;
  /** Present when the problem is an insect. Adds its names, growth stage, and natural enemies to the answer. */
  insect?: InsectProfile;
  /** Tagalog and Cebuano text for the card. Matching and the model prompts still use the English. */
  translations?: Partial<Record<CardLanguage, EntryTranslation>>;
  /** Agronomist who signed off. Empty until review. */
  reviewedBy: string;
  /** ISO date (YYYY-MM-DD) of the review. Empty until review. */
  reviewedOn: string;
}

export interface KeywordMatch {
  entry: KnowledgeEntry;
  /** Number of keywords found in the description. A hit on an insect's own name counts double. */
  score: number;
  /** The keywords found, as written in the note. The app shows them as the symptom the match was made on. */
  hits: string[];
}

export interface KeywordResult {
  /** Best matches first, at most the requested limit. */
  matches: KeywordMatch[];
  /** False when nothing matched or the top two entries tie. */
  clear: boolean;
}
