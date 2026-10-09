import { findViolations } from './guard.js';
import type { KnowledgeEntry } from './types.js';

const ID_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

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

  const text = [e.name, e.callExpertIf, ...(Array.isArray(e.signs) ? e.signs : []), ...(Array.isArray(e.actions) ? e.actions : [])]
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
