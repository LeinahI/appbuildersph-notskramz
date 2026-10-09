import { normalize } from './keyword.js';

/** The language a reply's curated steps are given in: English, Tagalog (and Taglish), or Cebuano (Bisaya). */
export type ReplyLanguage = 'en' | 'tl' | 'ceb';

/** Common English words. */
const ENGLISH_WORDS = new Set(
  'a an and are at be best can control do does field for from get grow has have how i in is it many much my of on our plant plants rice rid should the there this to water we weed weeds what when where which why will with you your'.split(' '),
);
/** Words only a Tagalog or Cebuano message has. */
const FILIPINO_WORD =
  / (ang|ng|mga|sa|po|ko|ba|na|ay|kung|paano|ano|anong|kailan|bakit|palay|humay|mais|at|naman|lang|din|rin|ito|yung|dito|kasi|pwede|sana|unsa|unsaon|nga|og|ug) /;
/**
 * Words a Cebuano (Bisaya) message has and a Tagalog one does not: "unsa", "unsaon", "kanus-a", "ngano", "naa",
 * "dili", "akong", "humay", "basakan", "buhaton", "tabangi".
 */
const CEBUANO_WORD =
  / (unsa|unsay|unsaon|unsang|kanusa|ngano|nganong|naa|naay|adunay|aduna|dili|wala koy|kini|kana|gyud|jud|pud|usab|akong|imong|among|nako|nimo|niini|humay|basakan|tanom|sagbot|buhaton|himuon|tabangi|tabang|palihug|karon|unya|og|ug|kaayo|amping|maayo|nindot|bitaw|ilaga|liso|anihon|nangalaya|nalaya|nadalag|lungag|ulod) /;

/** True when the farmer wrote in English. Taglish and Cebuano count as not English. */
export function looksEnglish(text: string): boolean {
  const t = padded(text);
  const words = t.trim().split(' ').filter(Boolean);
  if (words.length < 3 || FILIPINO_WORD.test(t)) return false;
  return words.filter((w) => ENGLISH_WORDS.has(w)).length / words.length >= 0.4;
}

/** True when the farmer wrote in Cebuano (Bisaya): two Cebuano words, or one in a short message. */
export function looksCebuano(text: string): boolean {
  const t = padded(text);
  const words = t.trim().split(' ').filter(Boolean);
  let hits = 0;
  for (const w of words) if (CEBUANO_WORD.test(` ${w} `)) hits++;
  // Two-word markers ("kanus a", "sa akong") are not single words.
  if (/ (kanus a|sa akong|mao ni|mao na|wala koy|ako ang) /.test(t)) hits++;
  return hits >= 2 || (hits === 1 && words.length <= 4);
}

/**
 * The language of the farmer's own words, for picking the curated steps the model copies and the steps shown with
 * no model. The app's own bracketed photo note, which is English, is ignored.
 */
export function replyLanguage(text: string): ReplyLanguage {
  if (looksCebuano(text)) return 'ceb';
  return looksEnglish(text) ? 'en' : 'tl';
}

function padded(text: string): string {
  return ` ${normalize(text.replace(/\[[^\]]*\]/g, ' '))} `;
}

/**
 * The language to reply in, for a chat: the farmer's message decides, unless it is too short to tell ("oo", "sige
 * po"), when their last longer message does.
 */
export function chatLanguage(text: string, earlier: readonly string[] = []): ReplyLanguage {
  const long = (t: string) => normalize(t).split(' ').filter(Boolean).length >= 4;
  if (long(text) || looksCebuano(text)) return replyLanguage(text);
  const last = [...earlier].reverse().find(long);
  return last ? replyLanguage(last) : replyLanguage(text);
}

/** The line that tells the model which language to reply in. A 2B model drifts to Tagalog without it. */
export function replyLanguageLine(lang: ReplyLanguage): string {
  if (lang === 'en') return 'Reply language: English. The farmer wrote in English, so reply only in English.';
  if (lang === 'ceb') return 'Reply language: Cebuano (Bisaya). Reply only in Cebuano, never in Tagalog: say humay for rice, basakan for the rice field.';
  return 'Reply language: Tagalog (Taglish is fine if the farmer mixes in English).';
}
