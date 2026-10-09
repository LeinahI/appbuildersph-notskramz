// Symptom picture list. One tile per knowledge entry. Icons are placeholders until
// agronomist-approved field photos are added to web/public/symptoms/.
export const SYMPTOM_TILE: Record<string, { icon: string; labelTl: string }> = {
  bph: { icon: '🌾', labelTl: 'Nasunog na palay, may kumpol na insekto sa paanan' },
  'rice-blast': { icon: '🍂', labelTl: 'May mga diamond na batik sa dahon' },
  'bacterial-leaf-blight': { icon: '💧', labelTl: 'May guhit sa gilid ng dahon, natutuyo' },
  'stem-borer': { icon: '🐛', labelTl: 'Patay na puso o puting uhay' },
  'golden-apple-snail': { icon: '🐌', labelTl: 'Pinutol ang punla, may pink na itlog' },
  'fall-armyworm': { icon: '🌽', labelTl: 'Butas sa dahon ng mais, may sawdust sa loob' },
  'asiatic-corn-borer': { icon: '🎋', labelTl: 'Bulok o nabaling tangkay ng mais' },
  'downy-mildew': { icon: '🍃', labelTl: 'Dilaw o puting guhit, may puting pulbos sa ilalim' },
  'rice-bug': { icon: '🐞', labelTl: 'Maliliit o walang laman ang butil, mabaho ang palayan' },
  'rice-black-bug': { icon: '⚫', labelTl: 'Itim na bug sa paanan, namumulang kayumanggi ang dahon' },
  'green-leafhopper': { icon: '🦗', labelTl: 'Bansot at dilaw-kahel na palay, berdeng insektong tumatalon' },
  'rice-leaffolder': { icon: '📜', labelTl: 'Nakabilot ang dahon, may puting guhit' },
  'rice-caseworm': { icon: '✂️', labelTl: 'Putol ang dulo ng dahon, may lumulutang na supot' },
  'rice-armyworm': { icon: '🐛', labelTl: 'Putol ang uhay, ubos ang dahon sa gabi' },
  'rice-whorl-maggot': { icon: '🪰', labelTl: 'Maliliit na butas at puting guhit sa gilid ng dahon' },
  'corn-planthopper': { icon: '🌽', labelTl: 'Bansot at nangingitim na mais, malagkit ang dahon' },
  'corn-earworm': { icon: '🌽', labelTl: 'Uod sa dulo ng mais, kinain ang buhok at butil' },
  'corn-armyworm': { icon: '🐛', labelTl: 'Ubos ang dahon ng mais hanggang gitnang ugat' },
  'corn-aphid': { icon: '🫧', labelTl: 'Maliliit na insekto sa tassel, malagkit at may langgam' },
  'common-cutworm': { icon: '✂️', labelTl: 'Putol sa lupa ang batang mais, may puwang sa hanay' },
};

export function symptomTile(id: string): { icon: string; labelTl: string } {
  return SYMPTOM_TILE[id] ?? { icon: '🌱', labelTl: '' };
}
