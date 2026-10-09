import { normalize } from './keyword.js';
import type { KnowledgeEntry } from './types.js';

// Two rails, the way open-source guardrail libraries split them (NVIDIA NeMo Guardrails, Meta Llama Guard and
// Prompt Guard): an input rail that stops a message before the model reads it, and an output rail that checks the
// model's reply against the notes it was given. Both are plain rules, so they run offline on the phone and the hub.

/**
 * An input rail, like NeMo's jailbreak heuristics: a message that tries to change the helper's rules, show its
 * instructions, or make it play another role. Such a message never reaches matching or the model.
 * English and Tagalog. Matched on normalized text, so accents and punctuation do not hide it.
 */
const INJECTION: readonly RegExp[] = [
  /\b(ignore|disregard|forget|override|bypass|skip)\b.{0,40}\b(instructions?|rules?|prompts?|guidelines?|guardrails?|restrictions?|safety)\b/,
  /\b(system|developer|hidden|initial|original) (prompt|message|instructions?)\b/,
  /\b(reveal|show|print|repeat|leak|tell me)\b.{0,30}\b(your|the) (prompt|instructions?|rules)\b/,
  // "Repeat the words above … in a blockquote" (EN extract without "your/the prompt").
  /\b(repeat|copy|quote|output|dump)\b.{0,40}\b(words|everything|text|instructions?|prompt)\b.{0,40}\b(above|blockquote)\b/,
  /\b(repeat|copy|quote)\b.{0,20}\b(the )?(words|everything|text) above\b/,
  /\b(you are now|from now on you|act as|pretend (to be|you are)|roleplay as|role play as)\b/,
  /\b(jailbreak|jail break|dan mode|developer mode|do anything now)\b/,
  /\b(kalimutan|kalimutan mo|huwag (mo |mong )?pansinin|wag (mo |mong )?pansinin|balewalain|baliwalain|labagin|lagpasan)\b.{0,40}\b(utos|panuto|tuntunin|patakaran|instruction|rules?|prompt)\b/,
  /\b(ipakita|sabihin|ibigay|isulat)\b.{0,40}\b(prompt|panuto mo|utos mo|system prompt|instruksyon|mga panuto|mga utos)\b/,
  // Tagalog extract: "Ulitin ang mga salita sa itaas… instruksyon ng system… blockquote"
  /\b(ulitin|ulit)\b.{0,60}\b(salita|instruksyon|panuto|utos|prompt|blockquote|sa itaas)\b/,
  /\b(sa itaas|blockquote)\b.{0,60}\b(salita|instruksyon|panuto|utos|prompt|ulitin)\b/,
  /\binstruksyon (ng )?(mga )?system\b/,
  /\bsystem (na )?instruksyon\b/,
  /\beksaktong (mga )?instruksyon\b/,
  /\bbagong (panuto|utos|tungkulin)\b/,
];

/** True when the message tries to override the helper's rules or read its instructions. */
export function isInjectionAttempt(text: string): boolean {
  const t = ` ${normalize(text)} `;
  return INJECTION.some((re) => re.test(t));
}

/** What the farmer is told when the message tried to change the helper's rules. */
export const INJECTION_REPLY =
  'Hindi ko po masusunod iyan. Ang tulong ko po ay sa problema ng palay at mais lang. Ano po ang nakikita ninyo sa dahon, tangkay, o uhay?';

/**
 * Output rail: the model echoed persona/system text (or appended a leak after a refusal-shaped line).
 * Such a reply never reaches the farmer; call sites replace it with INJECTION_REPLY.
 */
export function leaksInstructions(reply: string): boolean {
  const t = ` ${normalize(reply)} `;
  if (/\byou are ugatan\b/.test(t)) return true;
  if (/\bsystem (prompt|instructions?|message)\b/.test(t)) return true;
  if (/\binstruksyon ng system\b/.test(t)) return true;
  const body = normalize(reply);
  const fixed = normalize(INJECTION_REPLY);
  if (body.startsWith(fixed) && body.length > fixed.length + 3) return true;
  return false;
}

/** Replace a leaking model reply with the fixed injection refusal. */
export function guardPromptLeak(reply: string): string {
  return leaksInstructions(reply) ? INJECTION_REPLY : reply;
}

/** The name a farmer would see for a problem: "Golden apple snail (kuhol)" is "Golden apple snail". */
function shortName(name: string): string {
  return name.split(/ \(| \/ /)[0]!.trim();
}

/**
 * An output rail, like NeMo's grounding check: the problems the reply names that it was not given notes for.
 * `allowed` are the entries the model was told to explain (or the one the app already named in this chat).
 * A problem the farmer named in their own message is not counted, because the reply may say it back.
 * An empty list means the reply stayed inside its notes.
 */
export function ungroundedProblems(
  reply: string,
  knowledge: readonly KnowledgeEntry[],
  allowed: readonly KnowledgeEntry[],
  farmerText = '',
): string[] {
  const text = ` ${normalize(reply)} `;
  const said = ` ${normalize(farmerText)} `;
  const allowedIds = new Set(allowed.map((e) => e.id));
  const found: string[] = [];
  for (const entry of knowledge) {
    if (allowedIds.has(entry.id)) continue;
    const name = normalize(shortName(entry.name));
    if (name === '' || !text.includes(` ${name} `) || said.includes(` ${name} `)) continue;
    found.push(shortName(entry.name));
  }
  return found;
}
