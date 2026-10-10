import type { RegisterBody } from '../lib/ws-api';
import { A } from './copy';

/** Matches ws domain MinAge — farmers under 18 cannot be registered. */
export const MIN_AGE = 18;

export const fields = [
  { key: 'fullName', label: A.fullName },
  { key: 'age', label: A.age },
  { key: 'barangay', label: A.barangay },
  { key: 'municipality', label: A.municipality },
  { key: 'province', label: A.province },
] as const;
export type Field = (typeof fields)[number]['key'];
export type Draft = Record<Field, string> & { consent: boolean };
export type DraftErrors = Partial<Record<Field | 'consent', string>>;
export type Method = 'manual' | 'scan';

export function emptyDraft(): Draft {
  return { fullName: '', age: '', barangay: '', municipality: '', province: '', consent: false };
}

export function validateDraft(draft: Draft): DraftErrors {
  const errors: DraftErrors = {};
  for (const { key } of fields) {
    if (!draft[key].trim()) errors[key] = A.required;
  }
  if (draft.age.trim()) {
    const n = Number(draft.age);
    if (!Number.isInteger(n) || n < 0) errors.age = A.ageInvalid;
    else if (n < MIN_AGE) errors.age = A.ageUnderage;
  }
  if (!draft.consent) errors.consent = A.consentRequired;
  return errors;
}

export function hasDraft(draft: Draft): boolean {
  return draft.consent || fields.some(({ key }) => draft[key].trim().length > 0);
}

/**
 * Maps the AdminApp age-only draft to ws RegisterBody.
 * birthDate is Jan 1 of (UTC year − age) — age-only record keeping.
 */
export function draftToRegisterBody(draft: Draft, now = new Date()): RegisterBody {
  const age = Number(draft.age);
  const year = now.getUTCFullYear() - age;
  const barangay = draft.barangay.trim();
  return {
    fullName: draft.fullName.trim(),
    birthDate: `${year}-01-01`,
    address: {
      line1: barangay,
      line2: '',
      barangay,
      city: draft.municipality.trim(),
      province: draft.province.trim(),
      postalCode: '',
    },
    consentAt: draft.consent ? now.toISOString() : undefined,
  };
}
