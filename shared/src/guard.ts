// Guardrail: the app never names pesticide brands or gives dosages.
// Applied to curated notes (in validation and tests) and to every AI explanation before it is shown.

/** Brand names and common active ingredients sold for rice and corn in the Philippines. */
export const PESTICIDE_NAMES: readonly string[] = [
  'Karate', 'Cymbush', 'Cypermethrin', 'Lambda-cyhalothrin', 'Lambda cyhalothrin', 'Bifenthrin', 'Fastac',
  'Lannate', 'Methomyl', 'Furadan', 'Carbofuran', 'Dursban', 'Chlorpyrifos',
  'Engea', 'Virtako', 'Ampligo', 'Coragen', 'Prevathon', 'Chlorantraniliprole',
  'Fipronil', 'Emamectin', 'Imidacloprid', 'Confidor', 'Actara', 'Thiamethoxam',
  'Buprofezin', 'Bispyribac', 'Ridomil', 'Amistar', 'Azoxystrobin', 'Propiconazole',
  'Kasumin', 'Kasugamycin', 'Validamycin', 'Mancozeb', 'Antracol', 'Carbendazim',
  'Tricyclazole', 'Isoprothiolane', 'Isoprothiolan', 'Orthene', 'Acephate', 'Glyphosate', 'Paraquat',
  'Sevin', 'Padan', 'Cartap', 'Malathion', 'Fenobucarb', 'Diazinon', 'Dimethoate', 'Triazophos',
];

const escapeRegExp = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const NAME_RE = new RegExp(`\\b(?:${PESTICIDE_NAMES.map(escapeRegExp).join('|')})\\b`, 'i');

/** Number followed by a measure unit, such as "2 ml", "100 g", "3kg". */
/**
 * A quantity followed by a measure unit: "2 ml", "100 g", "dalawang litro", "two milliliters". Number words count too,
 * so spelling the number out does not get a dose past the guard.
 */
const QUANTITY =
  '(?:\\d+(?:[.,]\\d+)?|isa|isang|dalawa|dalawang|tatlo|tatlong|apat|limang|lima|anim|pito|walo|siyam|sampu|sampung|kalahati|kalahating|one|two|three|four|five|six|seven|eight|nine|ten|half)';
const UNIT =
  'ml|mls|cc|mg|mgs|mcg|milligrams?|micrograms?|milliliters?|millilitres?|l|lt|lit|liters?|litres?|litro|litros|g|gr|grams?|gramo|gramos|kg|kgs|kilo|kilos|kilogram|kilograms|oz|ounces?|tbsp|tsp';
const NUMBER_UNIT_RE = new RegExp(`\\b${QUANTITY}\\s*(?:${UNIT})\\b`, 'i');

/** Spoon measures, with or without a number, such as "isang kutsara" or "kutsarang". */
const SPOON_RE = /\b(?:kutsar\w*|tablespoons?|teaspoons?)\b/i;

/**
 * Other ways to say how much: concentration (ppm), bottle caps, drops, cups, sachets, and a mix rate per tank
 * even when the number is left out ("kada tangke"). Llama Guard sorts risky advice by category, not by one wording,
 * and a model that cannot write "2 ml" will write "dalawang takip".
 */
const EXTRA_UNIT =
  'ppm|caps?|capfuls?|takip|patak|drops?|tasa|cups?|sachets?|sachet|baso|glass(?:es)?|pinch|dakot|tablets?|tableta';
const EXTRA_DOSE_RE = new RegExp(`\\b${QUANTITY}\\s*(?:${EXTRA_UNIT})\\b`, 'i');
const MIX_RATE_RE = /\b(?:kada|bawat|per|sa isang|sa bawat|every)\s+(?:tangke|tank|knapsack|sprayer|drum|balde|pail)\b/i;

export interface GuardViolation {
  kind: 'brand' | 'dosage';
  match: string;
}

export function findViolations(text: string): GuardViolation[] {
  const violations: GuardViolation[] = [];
  const brand = text.match(NAME_RE);
  if (brand) violations.push({ kind: 'brand', match: brand[0] });
  const dosage = text.match(NUMBER_UNIT_RE) ?? text.match(SPOON_RE) ?? text.match(EXTRA_DOSE_RE) ?? text.match(MIX_RATE_RE);
  if (dosage) violations.push({ kind: 'dosage', match: dosage[0] });
  return violations;
}

export function isSafeText(text: string): boolean {
  return findViolations(text).length === 0;
}
