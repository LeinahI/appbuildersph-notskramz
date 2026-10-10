import { A } from './copy';
import type { RegisterBody } from '../lib/ws-api';

export const fields = [
  { key: 'fullName', label: A.fullName },
  { key: 'birthDate', label: A.birthDate },
  { key: 'phone', label: A.phone },
  { key: 'line1', label: A.line1 },
  { key: 'barangay', label: A.barangay },
  { key: 'municipality', label: A.municipality },
  { key: 'province', label: A.province },
] as const;
export type Field = (typeof fields)[number]['key'];
export type Draft = Record<Field, string> & { consent: boolean };
export type DraftErrors = Partial<Record<Field | 'consent', string>>;
export type Method = 'manual' | 'scan';

/** Optional fields; every other field must be filled in. */
export const optional: ReadonlySet<Field> = new Set<Field>(['phone']);

export function emptyDraft(): Draft {
  return { fullName: '', birthDate: '', phone: '', line1: '', barangay: '', municipality: '', province: '', consent: false };
}

/** Local calendar date as YYYY-MM-DD, the format `<input type="date">` and ws use. */
export function isoDate(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

function validBirthDate(value: string, today: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [y, m, d] = value.split('-').map(Number) as [number, number, number];
  const date = new Date(y, m - 1, d);
  // Rejects 2026-02-31 and the like, which Date would roll over.
  return date.getFullYear() === y && date.getMonth() === m - 1 && date.getDate() === d && y >= 1900 && value <= today;
}

/** The minimum age is ws's rule; the form only checks that the date is real and not in the future. */
export function validateDraft(draft: Draft, today = isoDate(new Date())): DraftErrors {
  const errors: DraftErrors = {};
  for (const { key } of fields) {
    if (!optional.has(key) && !draft[key].trim()) errors[key] = A.required;
  }
  if (draft.birthDate.trim() && !validBirthDate(draft.birthDate.trim(), today)) errors.birthDate = A.birthDateInvalid;
  if (draft.phone.trim() && !/^[+\d][\d\s-]{6,19}$/.test(draft.phone.trim())) errors.phone = A.phoneInvalid;
  if (!draft.consent) errors.consent = A.consentRequired;
  return errors;
}

export function hasDraft(draft: Draft): boolean {
  return draft.consent || fields.some(({ key }) => draft[key].trim().length > 0);
}

/** The ws request body. Consent time is when staff confirm, since that is when the user agreed in front of them. */
export function toRegisterBody(draft: Draft, now = new Date()): RegisterBody {
  return {
    fullName: draft.fullName.trim(),
    birthDate: draft.birthDate.trim(),
    phone: draft.phone.trim() || undefined,
    address: {
      line1: draft.line1.trim(),
      line2: '',
      barangay: draft.barangay.trim(),
      city: draft.municipality.trim(),
      province: draft.province.trim(),
      postalCode: '',
    },
    consentAt: now.toISOString(),
  };
}
