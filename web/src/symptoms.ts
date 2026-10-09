// Symptom list. One plain-text line per knowledge entry, in the farmer's own words.
export const SYMPTOM_TILE: Record<string, { labelTl: string }> = {
  bph: { labelTl: 'Nasunog na palay, may kumpol na insekto sa paanan' },
  'rice-blast': { labelTl: 'May mga diamond na batik sa dahon' },
  'bacterial-leaf-blight': { labelTl: 'May guhit sa gilid ng dahon, natutuyo' },
  'stem-borer': { labelTl: 'Patay na puso o puting uhay' },
  'golden-apple-snail': { labelTl: 'Pinutol ang punla, may pink na itlog' },
  'fall-armyworm': { labelTl: 'Butas sa dahon ng mais, may sawdust sa loob' },
  'asiatic-corn-borer': { labelTl: 'Bulok o nabaling tangkay ng mais' },
  'downy-mildew': { labelTl: 'Dilaw o puting guhit, may puting pulbos sa ilalim' },
  'rice-bug': { labelTl: 'Maliliit o walang laman ang butil, mabaho ang palayan' },
  'rice-black-bug': { labelTl: 'Itim na bug sa paanan, namumulang kayumanggi ang dahon' },
  'green-leafhopper': { labelTl: 'Bansot at dilaw-kahel na palay, berdeng insektong tumatalon' },
  'rice-leaffolder': { labelTl: 'Nakabilot ang dahon, may puting guhit' },
  'rice-caseworm': { labelTl: 'Putol ang dulo ng dahon, may lumulutang na supot' },
  'rice-armyworm': { labelTl: 'Putol ang uhay, ubos ang dahon sa gabi' },
  'rice-whorl-maggot': { labelTl: 'Maliliit na butas at puting guhit sa gilid ng dahon' },
  'corn-planthopper': { labelTl: 'Bansot at nangingitim na mais, malagkit ang dahon' },
  'corn-earworm': { labelTl: 'Uod sa dulo ng mais, kinain ang buhok at butil' },
  'corn-armyworm': { labelTl: 'Ubos ang dahon ng mais hanggang gitnang ugat' },
  'corn-aphid': { labelTl: 'Maliliit na insekto sa tassel, malagkit at may langgam' },
  'common-cutworm': { labelTl: 'Putol sa lupa ang batang mais, may puwang sa hanay' },
};

export function symptomTile(id: string): { labelTl: string } {
  return SYMPTOM_TILE[id] ?? { labelTl: '' };
}
