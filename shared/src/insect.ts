import type { Crop, GrowthStage, KnowledgeEntry } from './types.js';

/**
 * The chemical step of an insect answer. Spraying is the last option and only on the agriculturist's advice, with
 * protective gear. It names no product and gives no amount, so it passes the pesticide guardrail.
 */
export const LAST_RESORT =
  'Huling opsyon lamang ang pesticide, at sa payo lang ng lokal na agriculturist. Kung kailangan, magsuot ng guwantes, maskara, long sleeves, at botas (PPE), at huwag mag-spray pasalungat sa hangin.';

export const CROP_NAME: Record<Crop, string> = { rice: 'Palay', corn: 'Mais' };

export const STAGE_NAME: Record<GrowthStage, string> = {
  vegetative: 'vegetative (paglaki ng halaman)',
  reproductive: 'reproductive (pamumulaklak o pag-uuhay)',
  ripening: 'ripening (paghinog ng butil)',
};

/** The facts about the insect a farmer asked about, in the order the answer gives them. Null when the entry is not an insect. */
export interface InsectFacts {
  /** "Rice bug (Leptocorisa oratorius)" */
  identity: string;
  /** "Atangya, Dangaw" */
  localNames: string;
  /** "Palay: reproductive (pamumulaklak o pag-uuhay), from flowering to the milk stage" */
  attacks: string;
  /** Natural enemies, joined for one line. */
  biological: string;
}

export function insectFacts(entry: KnowledgeEntry): InsectFacts | null {
  const i = entry.insect;
  if (!i) return null;
  return {
    identity: `${i.commonName} (${i.scientificName})`,
    localNames: i.localNames.join(', '),
    attacks: `${CROP_NAME[entry.crop]}: ${i.stages.map((s) => STAGE_NAME[s]).join(', ')}; ${i.stageNote}`,
    biological: i.biological.join('; '),
  };
}
