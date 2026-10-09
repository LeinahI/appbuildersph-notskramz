import { findViolations } from './guard.js';
import type { CardLanguage, EntryTranslation, KnowledgeEntry } from './types.js';

const ID_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const STAGES: readonly string[] = ['vegetative', 'reproductive', 'ripening'];

const isTextList = (value: unknown): value is string[] =>
  Array.isArray(value) && value.length > 0 && value.every((s) => typeof s === 'string' && s.trim() !== '');

/** Problems with the optional insect profile. Returns the profile's text too, so the guardrail checks it. */
function checkInsect(value: unknown, errors: string[]): string[] {
  if (value === undefined) return [];
  if (typeof value !== 'object' || value === null) {
    errors.push('insect must be an object');
    return [];
  }
  const i = value as Record<string, unknown>;
  for (const field of ['commonName', 'scientificName', 'stageNote'] as const) {
    if (typeof i[field] !== 'string' || !i[field].trim()) errors.push(`insect.${field} is required`);
  }
  for (const field of ['localNames', 'biological'] as const) {
    if (!isTextList(i[field])) errors.push(`insect.${field} must be a non-empty list of strings`);
  }
  if (!Array.isArray(i.stages) || i.stages.length === 0 || i.stages.some((s) => !STAGES.includes(s as string))) {
    errors.push(`insect.stages must be a non-empty list of: ${STAGES.join(', ')}`);
  }
  return [i.commonName, i.scientificName, i.stageNote, ...(isTextList(i.localNames) ? i.localNames : []), ...(isTextList(i.biological) ? i.biological : [])].filter(
    (s): s is string => typeof s === 'string',
  );
}

export const CARD_LANGUAGES: readonly CardLanguage[] = ['tl', 'ceb'];

const lengthOf = (value: unknown) => (Array.isArray(value) ? value.length : -1);

/**
 * Problems with the optional translations. Each language must carry the same signs, steps, and natural enemies as the
 * English, item for item, so a farmer never gets fewer steps in their language. Returns the text for the guardrail.
 */
function checkTranslations(e: Record<string, unknown>, errors: string[]): string[] {
  const value = e.translations;
  if (value === undefined) return [];
  if (typeof value !== 'object' || value === null) {
    errors.push('translations must be an object');
    return [];
  }
  const text: string[] = [];
  const insect = typeof e.insect === 'object' && e.insect !== null ? (e.insect as Record<string, unknown>) : null;
  for (const [lang, raw] of Object.entries(value)) {
    if (!CARD_LANGUAGES.includes(lang as CardLanguage)) {
      errors.push(`translations.${lang}: language must be one of ${CARD_LANGUAGES.join(', ')}`);
      continue;
    }
    if (typeof raw !== 'object' || raw === null) {
      errors.push(`translations.${lang} must be an object`);
      continue;
    }
    const t = raw as Record<string, unknown>;
    for (const field of ['signs', 'actions'] as const) {
      if (!isTextList(t[field])) errors.push(`translations.${lang}.${field} must be a non-empty list of strings`);
      else if (t[field].length !== lengthOf(e[field])) errors.push(`translations.${lang}.${field} must have one item per English item`);
    }
    if (typeof t.callExpertIf !== 'string' || !t.callExpertIf.trim()) errors.push(`translations.${lang}.callExpertIf is required`);
    if (insect) {
      if (typeof t.stageNote !== 'string' || !t.stageNote.trim()) errors.push(`translations.${lang}.stageNote is required for an insect`);
      if (!isTextList(t.biological)) errors.push(`translations.${lang}.biological must be a non-empty list of strings for an insect`);
      else if (t.biological.length !== lengthOf(insect.biological)) {
        errors.push(`translations.${lang}.biological must have one item per English item`);
      }
    } else if (t.stageNote !== undefined || t.biological !== undefined) {
      errors.push(`translations.${lang}: stageNote and biological belong only to an insect`);
    }
    for (const field of ['signs', 'actions', 'biological'] as const) if (isTextList(t[field])) text.push(...t[field]);
    for (const field of ['callExpertIf', 'stageNote'] as const) if (typeof t[field] === 'string') text.push(t[field]);
  }
  return text;
}

/**
 * The entry with its card text in the farmer's language, when a translation exists. Anything else, including English,
 * gets the entry unchanged. The name, keywords, and insect names stay as written.
 */
export function localizeEntry(entry: KnowledgeEntry, language: string): KnowledgeEntry {
  const t: EntryTranslation | undefined = entry.translations?.[language as CardLanguage];
  if (!t) return entry;
  return {
    ...entry,
    signs: t.signs,
    actions: t.actions,
    callExpertIf: t.callExpertIf,
    ...(entry.insect
      ? { insect: { ...entry.insect, stageNote: t.stageNote ?? entry.insect.stageNote, biological: t.biological ?? entry.insect.biological } }
      : {}),
  };
}

/** Returns a list of problems. An empty list means the entry is valid. */
export function validateEntry(value: unknown, fileId?: string): string[] {
  const errors: string[] = [];
  if (typeof value !== 'object' || value === null) return ['entry must be a JSON object'];
  const e = value as Record<string, unknown>;

  const id = typeof e.id === 'string' ? e.id : '';
  if (!ID_RE.test(id)) errors.push(`id "${String(e.id)}" must be a lowercase slug`);
  if (fileId !== undefined && id !== fileId) errors.push(`id "${id}" must match the file name "${fileId}"`);
  if (e.crop !== 'rice' && e.crop !== 'corn') errors.push('crop must be "rice" or "corn"');
  if (typeof e.name !== 'string' || !e.name.trim()) errors.push('name is required');
  if (typeof e.callExpertIf !== 'string' || !e.callExpertIf.trim()) errors.push('callExpertIf is required');

  for (const field of ['keywords', 'signs', 'actions'] as const) {
    const list = e[field];
    if (!Array.isArray(list) || list.length === 0 || list.some((s) => typeof s !== 'string' || !s.trim())) {
      errors.push(`${field} must be a non-empty list of strings`);
    }
  }
  if (Array.isArray(e.keywords) && e.keywords.length < 2) {
    errors.push('keywords should include both English and Tagalog words');
  }

  if (typeof e.reviewedBy !== 'string') errors.push('reviewedBy must be a string (empty until reviewed)');
  if (typeof e.reviewedOn !== 'string') errors.push('reviewedOn must be a string (empty until reviewed)');
  if (typeof e.reviewedOn === 'string' && e.reviewedOn !== '' && !DATE_RE.test(e.reviewedOn)) {
    errors.push('reviewedOn must be YYYY-MM-DD or empty');
  }
  if (typeof e.reviewedBy === 'string' && e.reviewedBy.trim() && !e.reviewedOn) {
    errors.push('reviewedOn is required once reviewedBy is set');
  }

  const insectText = checkInsect(e.insect, errors);
  const translationText = checkTranslations(e, errors);

  const text = [e.name, e.callExpertIf, ...insectText, ...translationText, ...(Array.isArray(e.signs) ? e.signs : []), ...(Array.isArray(e.actions) ? e.actions : [])]
    .filter((s): s is string => typeof s === 'string')
    .join(' | ');
  for (const v of findViolations(text)) {
    errors.push(`${v.kind} text "${v.match}" is not allowed in notes`);
  }
  return errors;
}

/** Throws with every problem found, so a bad knowledge file fails the build. */
export function assertValidEntries(entries: readonly KnowledgeEntry[]): void {
  const seen = new Set<string>();
  const problems: string[] = [];
  for (const entry of entries) {
    for (const err of validateEntry(entry, entry.id)) problems.push(`${entry.id}: ${err}`);
    if (seen.has(entry.id)) problems.push(`${entry.id}: duplicate id`);
    seen.add(entry.id);
  }
  if (problems.length) throw new Error(`Invalid knowledge base:\n- ${problems.join('\n- ')}`);
}
