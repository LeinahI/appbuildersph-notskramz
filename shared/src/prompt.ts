import type { KnowledgeEntry } from './types.js';

export interface ChatMessage {
  role: 'system' | 'user';
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
If the match is marked not sure, or there are no reference notes, say you are not sure and advise the farmer to call the local municipal agriculturist or DA technician.
Never name pesticide brands and never give dosages, even if the farmer asks.
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
  'Match: not sure. These are only possible problems. Say you are not sure, name the signs that tell them apart, and advise calling the local agriculturist.';

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

export const DESCRIBE_SYSTEM_PROMPT = `You turn a Filipino farmer's report about a rice (palay, humay) or corn (mais) crop into plain English.
The farmer may write in Tagalog, Taglish, Cebuano (Bisaya), English, or a mix.
Write only what the farmer sees: which part of the plant, colors, shapes, spots, stripes, holes, insects, worms, snails, eggs, droppings, and when it happens.
Keep every detail. Add nothing the farmer did not say.
Do not name any pest or disease, and do not give advice.
Answer with one or two short English sentences and nothing else.
If the farmer names no sign at all, answer exactly: ${NO_SIGNS}
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
