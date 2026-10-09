import { A } from './copy';

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
  if (draft.age.trim() && (!Number.isInteger(Number(draft.age)) || Number(draft.age) < 0)) {
    errors.age = A.ageInvalid;
  }
  if (!draft.consent) errors.consent = A.consentRequired;
  return errors;
}

export function hasDraft(draft: Draft): boolean {
  return draft.consent || fields.some(({ key }) => draft[key].trim().length > 0);
}
