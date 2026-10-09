import type { KnowledgeEntry } from './types.js';

export interface ChatMessage {
  role: 'system' | 'user';
  content: string;
}

/** Shared by the phone model and the hub model. The app adds the disclaimer itself, so the model does not need to. */
export const SYSTEM_PROMPT = `You are Ugatan, a helper for Filipino rice (palay) and corn (mais) farmers.
Answer in simple Taglish. Base your answer ONLY on the reference notes provided.
If no reference note clearly matches, say you are not sure and advise the farmer to call the local municipal agriculturist or DA technician.
Never name pesticide brands and never give dosages, even if the farmer asks.
Keep the answer under 150 words, using short numbered steps.`;

export function buildMessages(question: string, crop: string, refs: readonly KnowledgeEntry[]): ChatMessage[] {
  const refText = refs.length
    ? refs
        .map(
          (r) =>
            `- ${r.name}\n  Signs: ${r.signs.join('; ')}\n  Suggested actions: ${r.actions.join('; ')}\n  Call an expert if: ${r.callExpertIf}`,
        )
        .join('\n')
    : 'No matching reference notes.';

  return [
    { role: 'system', content: SYSTEM_PROMPT },
    {
      role: 'user',
      content: `Crop: ${crop}\nFarmer's description: ${question}\n\nReference notes:\n${refText}`,
    },
  ];
}
