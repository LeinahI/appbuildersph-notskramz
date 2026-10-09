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
};

export function symptomTile(id: string): { icon: string; labelTl: string } {
  return SYMPTOM_TILE[id] ?? { icon: '🌱', labelTl: '' };
}
