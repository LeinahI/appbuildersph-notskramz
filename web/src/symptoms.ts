// Symptom list. One entry per knowledge entry, in the farmer's own words.

/** Where on the plant the farmer sees the damage. Drives the badge on each card and the filter chips. */
export type PlantPart = 'dahon' | 'tangkay' | 'uhay';

export interface SymptomTile {
  /** The full sentence a farmer would say. This is the question sent when the card is tapped. */
  labelTl: string;
  /** Short card title. */
  titleTl: string;
  /** One short line that tells similar-looking cards apart. */
  cueTl: string;
  part: PlantPart;
  /** True when the farmer may also see the pest itself (insect, larva, or snail), so the Peste filter can find it. */
  pest: boolean;
}

export const SYMPTOM_TILE: Record<string, SymptomTile> = {
  bph: {
    labelTl: 'Nasunog na palay, may kumpol na insekto sa paanan',
    titleTl: 'Nasunog na palay',
    cueTl: 'Kumpol na insekto sa paanan',
    part: 'tangkay',
    pest: true,
  },
  'rice-blast': {
    labelTl: 'May mga diamond na batik sa dahon',
    titleTl: 'Diamond na batik',
    cueTl: 'Hugis-diamond sa dahon',
    part: 'dahon',
    pest: false,
  },
  'bacterial-leaf-blight': {
    labelTl: 'May guhit sa gilid ng dahon, natutuyo',
    titleTl: 'Guhit sa gilid ng dahon',
    cueTl: 'Natutuyo ang dahon',
    part: 'dahon',
    pest: false,
  },
  'stem-borer': {
    labelTl: 'Patay na puso o puting uhay',
    titleTl: 'Patay na puso',
    cueTl: 'Puting uhay, walang laman',
    part: 'uhay',
    pest: false,
  },
  'golden-apple-snail': {
    labelTl: 'Pinutol ang punla, may pink na itlog',
    titleTl: 'Pinutol na punla',
    cueTl: 'Pink na itlog sa tangkay',
    part: 'tangkay',
    pest: true,
  },
  'fall-armyworm': {
    labelTl: 'Butas sa dahon ng mais, may sawdust sa loob',
    titleTl: 'Butas sa dahon ng mais',
    cueTl: 'May sawdust sa loob',
    part: 'dahon',
    pest: true,
  },
  'asiatic-corn-borer': {
    labelTl: 'Bulok o nabaling tangkay ng mais',
    titleTl: 'Nabaling tangkay',
    cueTl: 'Bulok o butas ang tangkay',
    part: 'tangkay',
    pest: false,
  },
  'downy-mildew': {
    labelTl: 'Dilaw o puting guhit, may puting pulbos sa ilalim',
    titleTl: 'Dilaw o puting guhit',
    cueTl: 'Puting pulbos sa ilalim',
    part: 'dahon',
    pest: false,
  },
  'rice-bug': {
    labelTl: 'Maliliit o walang laman ang butil, mabaho ang palayan',
    titleTl: 'Walang laman ang butil',
    cueTl: 'Mabaho ang palayan',
    part: 'uhay',
    pest: true,
  },
  'rice-black-bug': {
    labelTl: 'Itim na bug sa paanan, namumulang kayumanggi ang dahon',
    titleTl: 'Itim na bug sa paanan',
    cueTl: 'Namumulang kayumanggi ang dahon',
    part: 'tangkay',
    pest: true,
  },
  'green-leafhopper': {
    labelTl: 'Bansot at dilaw-kahel na palay, berdeng insektong tumatalon',
    titleTl: 'Bansot, dilaw-kahel',
    cueTl: 'Berdeng insektong tumatalon',
    part: 'dahon',
    pest: true,
  },
  'rice-leaffolder': {
    labelTl: 'Nakabilot ang dahon, may puting guhit',
    titleTl: 'Nakabilot na dahon',
    cueTl: 'May puting guhit',
    part: 'dahon',
    pest: false,
  },
  'rice-caseworm': {
    labelTl: 'Putol ang dulo ng dahon, may lumulutang na supot',
    titleTl: 'Putol ang dulo ng dahon',
    cueTl: 'Lumulutang na supot sa tubig',
    part: 'dahon',
    pest: true,
  },
  'rice-armyworm': {
    labelTl: 'Putol ang uhay, ubos ang dahon sa gabi',
    titleTl: 'Putol na uhay',
    cueTl: 'Ubos ang dahon sa gabi',
    part: 'uhay',
    pest: true,
  },
  'rice-whorl-maggot': {
    labelTl: 'Maliliit na butas at puting guhit sa gilid ng dahon',
    titleTl: 'Maliliit na butas',
    cueTl: 'Puting guhit sa gilid',
    part: 'dahon',
    pest: false,
  },
  'corn-planthopper': {
    labelTl: 'Bansot at nangingitim na mais, malagkit ang dahon',
    titleTl: 'Bansot, nangingitim',
    cueTl: 'Malagkit ang dahon',
    part: 'dahon',
    pest: true,
  },
  'corn-earworm': {
    labelTl: 'Uod sa dulo ng mais, kinain ang buhok at butil',
    titleTl: 'Uod sa dulo ng mais',
    cueTl: 'Kinain ang buhok at butil',
    part: 'uhay',
    pest: true,
  },
  'corn-armyworm': {
    labelTl: 'Ubos ang dahon ng mais hanggang gitnang ugat',
    titleTl: 'Ubos ang dahon',
    cueTl: 'Gitnang ugat na lang',
    part: 'dahon',
    pest: true,
  },
  'corn-aphid': {
    labelTl: 'Maliliit na insekto sa tassel, malagkit at may langgam',
    titleTl: 'Insekto sa tassel',
    cueTl: 'Malagkit, may langgam',
    part: 'uhay',
    pest: true,
  },
  'common-cutworm': {
    labelTl: 'Putol sa lupa ang batang mais, may puwang sa hanay',
    titleTl: 'Putol sa lupa',
    cueTl: 'May puwang sa hanay',
    part: 'tangkay',
    pest: true,
  },
};

const UNKNOWN: SymptomTile = { labelTl: '', titleTl: '', cueTl: '', part: 'dahon', pest: false };

export function symptomTile(id: string): SymptomTile {
  return SYMPTOM_TILE[id] ?? UNKNOWN;
}
