import type { ChatTurn } from './api.js';
import type { KnowledgeEntry } from './types.js';

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

/**
 * Shared by the phone model and the hub model. The app adds the disclaimer itself, so the model does not need to.
 * Only the word limit changes. The hub asks for a shorter answer because every token costs time there.
 *
 * Division of work: the matcher (keyword, Laya, or hybrid) decides which problem it is and whether it is sure.
 * The model only explains that decision. It never picks a problem of its own.
 */
export function systemPrompt(maxWords = 150): string {
  return `You are Ugatan, a helper for Filipino rice (palay) and corn (mais) farmers.
Reply in the language the farmer uses: Tagalog, Taglish, or English. Use "po" and "opo" when the farmer does.
A matching step has already chosen the reference notes for the farmer's description. Your job is to explain them, not to diagnose.
Talk about the crop the Crop line names. Never say palay or palayan for a corn question, and never say mais for a rice question.
Answer the farmer's question first, directly and briefly, in simple words. Base your answer ONLY on the reference notes, and never name a problem that is not in them.
If there are no reference notes, say you are not sure and advise the farmer to call the local municipal agriculturist or DA technician.
If the match is marked not sure, say in one sentence what is unclear, then ask ONE question about the signs that tell the possible problems apart. The app already shows a "not sure" line, so do not repeat it.
If the match is marked best guess, say it is the most likely problem but not certain, give its first steps, and ask no question.
Ask at most one question in the whole reply. Never ask for something the farmer already told you.
Do not open with an apology unless the farmer's request was refused.
Never name pesticide brands, active ingredients, or doses, even if the farmer asks. For pesticide questions, say to consult the local agriculturist.
If the farmer describes urgency, such as the whole field dying or many plants collapsing, tell them to call the agriculturist now.
Write plain text: no asterisks, no bold, no markdown.
Keep the answer under ${maxWords} words, using short numbered steps.`;
}

export const SYSTEM_PROMPT = systemPrompt();

export interface PromptOptions {
  /** Word limit for the answer. Defaults to 150, the phone's limit. */
  maxWords?: number;
  /** The matcher's verdict. False when it is not sure, so the notes are only possible matches. Defaults to true. */
  sure?: boolean;
  /** Set when the farmer has already been asked enough questions. The model then gives its best guess and asks nothing. */
  bestGuess?: boolean;
}

/** What the model is told about the matcher's verdict. Exported so the tests check the same wording. */
export const MATCH_SURE = 'Match: sure. Explain this problem to the farmer.';
export const MATCH_NOT_SURE =
  'Match: not sure. These are only possible problems. Do not say which one it is. Say what is unclear in one sentence, name the signs that tell them apart, and ask ONE question about which of those signs the farmer sees.';
export const MATCH_BEST_GUESS =
  'Match: best guess. The farmer has already been asked enough questions. Say this is the most likely problem but not certain, give its first steps, and ask no question.';

export function buildMessages(
  question: string,
  crop: string,
  refs: readonly KnowledgeEntry[],
  { maxWords, sure = true, bestGuess = false }: PromptOptions = {},
): ChatMessage[] {
  const refText = refs.length
    ? refs
        .map(
          (r) =>
            `- ${r.name}\n  Signs: ${r.signs.join('; ')}\n  Suggested actions: ${r.actions.join('; ')}\n  Call an expert if: ${r.callExpertIf}`,
        )
        .join('\n')
    : 'No matching reference notes.';
  const verdict = refs.length ? `${sure ? MATCH_SURE : bestGuess ? MATCH_BEST_GUESS : MATCH_NOT_SURE}\n` : '';

  return [
    { role: 'system', content: systemPrompt(maxWords) },
    {
      role: 'user',
      content: `Crop: ${crop}\nFarmer's description: ${question}\n\n${verdict}Reference notes:\n${refText}`,
    },
  ];
}

/**
 * The notes the model explains. A sure match explains only the top problem, so the model cannot drift to the
 * runner-up. A match that is not sure keeps every candidate, so the model can say how to tell them apart.
 */
export function notesToExplain<T>(entries: readonly T[], sure: boolean): T[] {
  return sure ? entries.slice(0, 1) : [...entries];
}

/**
 * The model's second job, before matching: put the farmer's words into plain English signs, so keyword
 * matching and Laya (an English model) can read questions in Tagalog, Taglish, Cebuano (Bisaya), or English.
 * It translates and does not diagnose. The matcher still decides.
 */
/** The describe answer when the farmer gave no sign to match on. */
export const NO_SIGNS = 'No signs.';
/** The describe answer when the report is about a plant that is not rice or corn, such as kangkong. */
export const OTHER_CROP = 'Not rice or corn.';

export const DESCRIBE_SYSTEM_PROMPT = `You turn a Filipino farmer's report about a rice (palay, humay) or corn (mais) crop into plain English.
The farmer may write in Tagalog, Taglish, Cebuano (Bisaya), English, or a mix.
Write only what the farmer sees: which part of the plant, colors, shapes, spots, stripes, holes, insects, worms, snails, eggs, droppings, and when it happens.
Keep every detail, and say rice or corn when the farmer names the crop. Add nothing the farmer did not say.
Do not name any pest or disease, and do not give advice.
Answer with one or two short English sentences and nothing else.
If the report is about a plant that is not rice or corn (for example kangkong, kamatis, talong, saging, niyog, gulay), answer exactly: ${OTHER_CROP}
If the farmer names no sign at all, answer exactly: ${NO_SIGNS}
Questions that report no sign, such as "pwede ba itong kainin?", "kailan mag-aani?", or "salamat", also get: ${NO_SIGNS}
"Something is wrong with my crop", "hindi maganda ang tubo", "may problema ang palay ko", and "dili maayo akong mais" name no sign. Never invent a sign such as pale, yellow, or spots.

Farm words you may see:
Tagalog: palay = rice plant; uhay = grain head (panicle); suwi, usbong = tiller, shoot; tangkay = stem, stalk; gilid = edge; dulo = tip; ilalim = underside; leeg = neck; kulisap, insekto = insects; uod, higad = worm, caterpillar; kuhol, suso = snail; itlog = eggs; punla = seedling; amag = mold; bansot, pandak = stunted, short; maputla = pale; hungkag, walang laman = empty; bunutin, hilahin = pull out.
Cebuano (Bisaya): humay = rice plant (not corn); mais = corn; uhay = grain head (panicle); tukog, punoan = stalk, stem; kilid = edge; tumoy = tip; tunga = middle; ilawom = underside; liog = neck; ulod = worm, caterpillar; kuhol = snail; itlog = eggs; semilya = seedling; lungag = hole; agianan = tunnel, channel; nabali = broken; nauga = dried; nadalag = turned yellow; luspad = pale; mubo = short, stunted; agup-op = mold; tulbok, mantsa = spots; buntag = morning; gatas = milk; walay sulod = empty; ibton = pull out.`;

export function buildDescribeMessages(question: string, crop: string): ChatMessage[] {
  return [
    { role: 'system', content: DESCRIBE_SYSTEM_PROMPT },
    { role: 'user', content: `Crop: ${crop}\nFarmer's report: ${question}` },
  ];
}

/**
 * The model's third job: talk with the farmer when there is nothing to explain. A greeting, a complaint about the
 * last answer, or a report that names no sign gets a reply to what the farmer actually said, not a canned line.
 * It still never diagnoses: with no match there is no note to explain, so it asks what the farmer sees instead.
 */
export function chatSystemPrompt(maxWords = 60): string {
  return `You are Ugatan, a friendly helper for Filipino rice (palay, humay) and corn (mais) farmers. You are chatting with a farmer.
Reply directly to what the farmer just said, and answer their question first. Use the same language they used: Tagalog, Taglish, Cebuano (Bisaya), or English. Use "po" and "opo" when they do.
Use the earlier messages and the notes on what the farmer already said. Never ask again for something they already told you.
If they greet you, greet them back and ask what problem they see on their palay or mais. If they ask for help, say yes and ask what the problem is.
If they are unhappy with an earlier answer, say sorry in a few words and ask what they see on the plant.
No problem has been matched yet, so never name or guess a pest or disease.
Ask at most one question. When you ask about the crop, ask what they see: which part of the plant, the color, spots or stripes, holes, insects, worms, or snails, and since when.
If they already described signs, say you could not match them to a known rice or corn problem, and advise calling the local municipal agriculturist or DA technician.
If they ask about another plant (such as kangkong or kamatis) or another topic, answer kindly in one sentence that you only know rice and corn problems, and suggest the local agriculturist for that. Do not give advice about it.
If they thank you or say goodbye, answer warmly and briefly.
Never name pesticide brands and never give dosages, even if the farmer asks. For pesticide questions, say to consult the local agriculturist.
For health, medicine dosing, legal, or financial questions, give general information only, say a qualified person should decide, and give no doses.
Talk like a person. Plain text only: no lists, no headings, no asterisks. Keep the reply under ${maxWords} words.`;
}

/** How many earlier turns the chat reply sees. Enough for context, small enough for a 2048-token window. */
export const CHAT_HISTORY_TURNS = 4;
/** Earlier replies are cut to this length. The model needs their gist, not every step. */
const CHAT_TURN_CHARS = 400;
/** The farmer's earlier symptom messages the chat reply sees, newest kept, each cut to this length. */
const CHAT_NOTES = 8;
const CHAT_NOTE_CHARS = 300;

/** What the chat reply is told beyond the turns. Both go in the user message, so the cached system prompt stays the same. */
export interface ChatOptions {
  /** The farmer's earlier messages about the crop, oldest first. The reply uses them so it never asks twice. */
  notes?: readonly string[];
  /** Set after two questions in a row with no match. The reply then asks nothing and says what is uncertain. */
  final?: boolean;
}

/** What the chat reply is told after two questions with no match. Exported so the tests check the same wording. */
export const CHAT_FINAL =
  'You have already asked the farmer twice without a match. Do not ask another question. Say you could not match the problem, say what is still uncertain, and advise calling the local agriculturist or DA technician.';

function clip(text: string, max: number): string {
  const t = text.trim();
  return t.length > max ? `${t.slice(0, max).trimEnd()}...` : t;
}

/**
 * The chat as the model sees it: the system prompt, the last few turns, then what the farmer just said. With notes,
 * the new message comes after what the farmer said earlier, so the reply reads the whole chat.
 */
export function buildChatMessages(
  question: string,
  history: readonly ChatTurn[] = [],
  maxWords?: number,
  { notes = [], final = false }: ChatOptions = {},
): ChatMessage[] {
  const turns = history.slice(-CHAT_HISTORY_TURNS).flatMap((t): ChatMessage[] => [
    { role: 'user', content: clip(t.question, CHAT_TURN_CHARS) },
    { role: 'assistant', content: clip(t.reply, CHAT_TURN_CHARS) },
  ]);
  const said = notes
    .map((n) => n.trim())
    .filter(Boolean)
    .slice(-CHAT_NOTES)
    .map((n) => `- ${clip(n, CHAT_NOTE_CHARS)}`);
  const parts: string[] = [];
  if (said.length) parts.push(`What the farmer said earlier about the crop:\n${said.join('\n')}`);
  if (final) parts.push(CHAT_FINAL);
  const content = parts.length ? [...parts, `The farmer now says: ${question.trim()}`].join('\n\n') : question.trim();
  return [{ role: 'system', content: chatSystemPrompt(maxWords) }, ...turns, { role: 'user', content }];
}
