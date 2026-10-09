// Guardrail: the app never names pesticide brands or gives dosages.
// Applied to curated notes (in validation and tests) and to every AI explanation before it is shown.

/** Brand names and common active ingredients sold for rice and corn in the Philippines. */
export const PESTICIDE_NAMES: readonly string[] = [
  'Karate', 'Cymbush', 'Cypermethrin', 'Lambda-cyhalothrin', 'Bifenthrin', 'Fastac',
  'Lannate', 'Methomyl', 'Furadan', 'Carbofuran', 'Dursban', 'Chlorpyrifos',
  'Engea', 'Virtako', 'Ampligo', 'Coragen', 'Prevathon', 'Chlorantraniliprole',
  'Fipronil', 'Emamectin', 'Imidacloprid', 'Confidor', 'Actara', 'Thiamethoxam',
  'Buprofezin', 'Bispyribac', 'Ridomil', 'Amistar', 'Azoxystrobin', 'Propiconazole',
  'Kasumin', 'Kasugamycin', 'Validamycin', 'Mancozeb', 'Antracol', 'Carbendazim',
  'Tricyclazole', 'Isoprothiolan', 'Orthene', 'Acephate', 'Glyphosate', 'Paraquat',
  'Sevin', 'Padan', 'Cartap', 'Malathion', 'Fenobucarb',
];

const escapeRegExp = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const NAME_RE = new RegExp(`\\b(?:${PESTICIDE_NAMES.map(escapeRegExp).join('|')})\\b`, 'i');

/** Number followed by a measure unit, such as "2 ml", "100 g", "3kg". */
const NUMBER_UNIT_RE =
  /\b\d+(?:[.,]\d+)?\s*(?:ml|mls|cc|mg|mgs|mcg|milligrams?|micrograms?|l|lt|lit|liters?|litro|litros|g|gr|grams?|gramo|gramos|kg|kgs|kilo|kilos|kilogram|kilograms|oz|tbsp|tsp)\b/i;

/** Spoon measures, with or without a number, such as "isang kutsara". */
const SPOON_RE = /\b(?:kutsara|kutsarita|tablespoons?|teaspoons?)\b/i;

export interface GuardViolation {
  kind: 'brand' | 'dosage';
  match: string;
}

export function findViolations(text: string): GuardViolation[] {
  const violations: GuardViolation[] = [];
  const brand = text.match(NAME_RE);
  if (brand) violations.push({ kind: 'brand', match: brand[0] });
  const dosage = text.match(NUMBER_UNIT_RE) ?? text.match(SPOON_RE);
  if (dosage) violations.push({ kind: 'dosage', match: dosage[0] });
  return violations;
}

export function isSafeText(text: string): boolean {
  return findViolations(text).length === 0;
}
