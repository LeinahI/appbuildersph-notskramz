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
A matching step has already chosen the reference notes for the farmer's description. Your job is to explain them, not to diagnose.
Answer in simple Taglish. Base your answer ONLY on the reference notes provided, and never name a problem that is not in them.
If there are no reference notes, say you are not sure and advise the farmer to call the local municipal agriculturist or DA technician.
If the match is marked not sure, the app already tells the farmer it is not sure and to call the agriculturist, so do not repeat that. Name the signs that tell the possible problems apart, then ask the farmer one short question about what they see.
Never name pesticide brands and never give dosages, even if the farmer asks.
Write plain text: no asterisks, no bold, no markdown.
Keep the answer under ${maxWords} words, using short numbered steps.`;
}

export const SYSTEM_PROMPT = systemPrompt();

export interface PromptOptions {
  /** Word limit for the answer. Defaults to 150, the phone's limit. */
  maxWords?: number;
  /** The matcher's verdict. False when it is not sure, so the notes are only possible matches. Defaults to true. */
  sure?: boolean;
}

/** What the model is told about the matcher's verdict. Exported so the tests check the same wording. */
export const MATCH_SURE = 'Match: sure. Explain this problem to the farmer.';
export const MATCH_NOT_SURE =
  'Match: not sure. These are only possible problems. Do not say which one it is. Name the signs that tell them apart and ask the farmer which ones they see.';

export function buildMessages(
  question: string,
  crop: string,
  refs: readonly KnowledgeEntry[],
  { maxWords, sure = true }: PromptOptions = {},
): ChatMessage[] {
  const refText = refs.length
    ? refs
        .map(
          (r) =>
            `- ${r.name}\n  Signs: ${r.signs.join('; ')}\n  Suggested actions: ${r.actions.join('; ')}\n  Call an expert if: ${r.callExpertIf}`,
        )
        .join('\n')
    : 'No matching reference notes.';
  const verdict = refs.length ? `${sure ? MATCH_SURE : MATCH_NOT_SURE}\n` : '';

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
Keep every detail. Add nothing the farmer did not say.
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
Reply directly to what the farmer just said. Use the same language they used: Tagalog, Taglish, Cebuano (Bisaya), or English. Use the earlier messages for context.
If they greet you, greet them back and ask how their crop is doing.
If they are unhappy with an earlier answer, say sorry in a few words and explain that you need to know what they see on the plant to help.
No problem has been matched yet, so never name or guess a pest or disease.
Ask what they see: which part of the plant, the color, spots or stripes, holes, insects, worms, or snails, and since when.
If they already described signs, say you could not match them to a known rice or corn problem, ask for one more detail, and advise calling the local municipal agriculturist or DA technician.
If they ask about another plant (such as kangkong or kamatis) or another topic, answer kindly in one sentence that you only know rice and corn problems, and suggest the local agriculturist for that. Do not give advice about it.
If they thank you or say goodbye, answer warmly and briefly.
Never name pesticide brands and never give dosages, even if the farmer asks.
Talk like a person. Plain text only: no lists, no headings, no asterisks. Keep the reply under ${maxWords} words.`;
}

/** How many earlier turns the chat reply sees. Enough for context, small enough for a 2048-token window. */
export const CHAT_HISTORY_TURNS = 4;
/** Earlier replies are cut to this length. The model needs their gist, not every step. */
const CHAT_TURN_CHARS = 400;

function clip(text: string, max: number): string {
  const t = text.trim();
  return t.length > max ? `${t.slice(0, max).trimEnd()}...` : t;
}

/** The chat as the model sees it: the system prompt, the last few turns, then what the farmer just said. */
export function buildChatMessages(question: string, history: readonly ChatTurn[] = [], maxWords?: number): ChatMessage[] {
  const turns = history.slice(-CHAT_HISTORY_TURNS).flatMap((t): ChatMessage[] => [
    { role: 'user', content: clip(t.question, CHAT_TURN_CHARS) },
    { role: 'assistant', content: clip(t.reply, CHAT_TURN_CHARS) },
  ]);
  return [{ role: 'system', content: chatSystemPrompt(maxWords) }, ...turns, { role: 'user', content: question.trim() }];
}
