import { detectCrop } from './crop.js';
import { normalize } from './keyword.js';
import { INJECTION_REPLY, isInjectionAttempt } from './rails.js';

/** Where a question goes: to the matcher (a symptom), or to the chat (small talk or off-topic, nothing to match). */
export type Route = 'match' | 'chat';

/**
 * What a question came to, for counting follow-ups. "done" is a final answer after the follow-ups ran out (a best
 * guess, or "could not match, call the agriculturist"): like a clear match, it closes the problem.
 */
export type TurnOutcome = 'clear' | 'ask' | 'small' | 'done';

/** Two follow-up questions in a row with no clear match. After that the app gives its best answer and says what is uncertain. */
export const MAX_FOLLOW_UPS = 2;

/** The matcher reads the farmer's symptom messages joined together, up to this many characters, newest kept. */
export const SESSION_TEXT_CHARS = 1000;

/** The question a reply falls back to when the model's question only repeats the farmer's words. */
const DEFAULT_QUESTION = 'Ano po ang nakikita ninyo sa dahon, tangkay, o uhay?';
/** Said first when the farmer describes a whole field or many plants going bad. */
const URGENT_LINE = 'Tawagan po agad ang lokal na agriculturist.';

const GREETING = /\b(hello|helo|hi|hey|hallo|kumusta|kamusta|musta|magandang (umaga|hapon|gabi|tanghali|araw)|good (morning|afternoon|evening|day))\b/;
const HELP = /\b(tulungan|tulong|matulungan|makatulong|help)\b/;
/** "May tanong ako", "pwede magtanong": the farmer wants to ask something, and has not yet. */
const ASK = /\b(may (tanong|itatanong|kailangan|sasabihin)|magtanong|itatanong|pwede magtanong)\b/;
const THANKS = /\b(salamat|salamuch|thank|thanks|thx|tnx|ty)\b/;
const FAREWELL =
  /\b(paalam|bye|goodbye|babay|ingat|see you|later|good night|hanggang sa muli|una na ako|alis na ako|aalis na ako|tapos na ako)\b/;
/** "ok", "sige", "oo": the farmer heard the last reply. Nothing new to answer. */
const ACK = /^(ok|okay|k|oo|opo|sige|sige po|sige na|sige na po|ayos|noted|gets|copy)$/;
/** Questions about the assistant itself: who it is, what it does. */
const IDENTITY =
  /\b(sino ka|sino po kayo|ano ka|ano po kayo|pangalan mo|pangalan niyo|pangalan ninyo|name mo|name niyo|ikaw ba ay tao|tao ka ba|robot ka|bot ka|ano ang ginagawa mo|anong ginagawa mo|kaya mong gawin|para saan ka|ano ang alam mo|sino gumawa|ai ka|unsa ka|kinsa ka|who are you|what are you|what can you do|your name)\b/;
/** A lone interjection or keyboard mash: "hmm", "lol", "ok", "asdf qwer". */
const INTERJECTION = /^(hm+|huh|ha+|lol|haha+|hehe+|ok|okay|oo|a+|uh+|ah+|eh+|asdf|qwer|xyz)( (asdf|qwer|xyz))?$/;
/** Complaints about the last answer, and insults. They are talked through, not matched. */
const COMPLAINT =
  /\b(response mo|sagot mo|kausapin|ayusin mo|hindi ka|hindi mo|ulitin mo|di ka|bat ganyan|bat ganun|bakit ganun|bakit ganyan|paulit ulit|mali ka|ang gulo|magulo ka|sayang|hindi yan ang|not helping|bobo|tanga|useless|walang kwenta|walang silbi|sinungaling)\b/;
/**
 * Topics that are not a rice or corn problem: other crops, health, medicine, legal, money, time, general knowledge,
 * harvest and planting, and pesticide dose or brand asks. They go to the chat, so an old diagnosis is never reused.
 */
const OFF_TOPIC =
  /\b(kangkong|kamatis|talong|saging|niyog|gulay|okra|sili|ampalaya|pechay|repolyo|sitaw|kalabasa|mangga|patatas|kamote|camote|bawang|sibuyas|mani|gamot|gamutin|ubo|sipon|lagnat|nilalagnat|paracetamol|biogesic|iinumin|inumin|doktor|ospital|tiyan|masakit ang ulo|masakit ang tiyan|reklamo|karapatan|bawal|magkano|presyo|sahod|loan|bangko|bitcoin|pera|utang|oras|panahon|bukas|presidente|pangulo|sino si|pinakamalaking|adobo|recipe|balita|eleksyon|mag ani|anihan|magtanim|binhi|karate|furadan|pesticide|pestisidyo|insecticide|pamatay|dosage|dosis|ml|mg|litro|kutsara|brand)\b/;

/** Another crop. Its problems are not rice or corn problems, so the chat answers them, even with a yellow leaf. */
const OTHER_CROP =
  /\b(kangkong|kamatis|talong|saging|niyog|gulay|okra|sili|ampalaya|pechay|repolyo|sitaw|kalabasa|mangga|patatas|kamote|camote|bawang|sibuyas|mani|lubi|petsay|pipino|upo|patola|luya|monggo|mongo|ube|balinghoy|cassava|kamoteng kahoy|malunggay|kamunggay|cacao|tomato|tomatoes|eggplant|banana|coconut|onion|garlic|cabbage|pepper|chili|mango|squash|peanut|sweet potato|vegetable|vegetables)\b/;
/** General "other crops" / not rice or corn — no named vegetable required. */
const OTHER_CROP_GENERAL =
  /\b(maliban sa (?:mga )?(?:palay|mais)|bukod sa (?:mga )?(?:palay|mais)|hindi (?:mga )?(?:palay|mais)|ibang (?:pananim|halaman|tanim|taniman|crop|crops)|(?:pananim|halaman|tanim|crop|crops) (?:na )?(?:maliban|bukod) sa (?:mga )?(?:palay|mais)|other crops?|crops? other than (?:rice|corn)|besides (?:rice|corn))\b/;
/**
 * Plant parts and symptom words. A message with one of these describes a problem, even when it also says "tulong"
 * or "salamat", so it goes to matching. Crop names are left out on purpose: "presyo ng palay" is not a symptom.
 */
const SYMPTOM_WORD =
  /\b(dahon|tangkay|uhay|leeg|gilid|punla|butil|ugat|bunga|batik|guhit|butas|sira|tuyo|natuyo|natutuyo|tuyong|nalanta|nalalanta|nalalantang|lanta|dilaw|kulubot|bulok|nabubulok|kayumanggi|kulay|puti|kahel|itim|uod|kuhol|insekto|langgam|bulate|higad|itlog|amag|pulbos|mantsa|namatay|namamatay|patay|nabali|nasunog|nasusunog|sawdust|tunnel|kumalat|kumakalat|bumabagsak|bumagsak|lumalabas|kinain|kumpol|pinutol|maputla|hungkag|spot|spots|stripe|leaf|leaves|stem|panicle|hole|frass|whorl|diamond|pink)\b/;

/** A person hurt or poisoned: pesticide breathed in, swallowed, or in the eyes, a snakebite, vomiting after spraying. */
const EMERGENCY =
  /\b(nalanghap|natalsikan|nalason|nakalunok|nakainom ng|nakakain ng lason|ahas|nasusuka|nagsusuka|hindi makahinga|nawalan ng malay|sick after spraying|poisoned)\b/;
/** Complaints, land, loans, insurance, subsidies, and other questions for an office, not a crop helper. */
const OFFICE =
  /\b(reklamo|magreklamo|karapatan|demanda|magdemanda|kaso|abogado|cloa|titulo|buwis|insurance|subsidy|subsidiya|ayuda|rsbsa|landbank|loan|mangutang|utang|pautang|bayaran|ninakaw|miyembro|kooperatiba|training|seminar|opisina|munisipyo|mag report|libreng binhi)\b/;
/**
 * Growing questions: planting, harvest, seed, fertilizer, watering, storage. The knowledge base covers pests and
 * diseases only, and a small model guesses these (it once told a rice farmer to keep the soil dry).
 */
const CROP_CARE =
  /\b(mag ani|mag aani|anihin|aanihin|anihan|pag aani|magtanim|itanim|pagtatanim|magtransplant|transplant|binhi|buto na itatanim|variety|barayti|abono|mag abono|pataba|fertilizer|magdilig|pagdidilig|patubig|patuyuin|magpatuyo|imbak|mag imbak|araro|ektarya|plant rice|plant corn|harvest|seed|seeds|buto|itatanim|itanom|pagtanom|klima|climate|tag init|tag ulan|tagulan|summer|dry season|wet season|(?:magandang|maganda|pinakamagandang|angkop na|best) (?:pananim|itanim|crop|variety|seed)|(?:anong|ano ang|unsa|unsang) (?:pananim|itanim|itanom)|what (?:to|should i) plant|which (?:crop|variety))\b/;
/** Is the crop safe to eat? The notes cannot say, and a spray residue makes a wrong yes dangerous. */
const EAT = /\b(kainin|kakainin|makakain|ligtas kainin|safe to eat|edible)\b/;
/** Medicine and health asks. The app is not a doctor, so it never answers them with a medicine or a dose. */
const HEALTH =
  /\b(buntis|allergy|paracetamol|biogesic|iinumin|inumin|ubo|inuubo|sipon|lagnat|nilalagnat|masakit ang|sakit ng (ulo|tiyan|likod)|sugat|kagat ng lamok|doktor|ospital|nahihilo)\b/;
/** Asks for a pesticide, its brand, or how much of it to use. Only the agriculturist answers these. */
const PESTICIDE_ASK =
  /\b(pesticide|pesticides|pestisidyo|insecticide|fungicide|herbicide|pamatay|spray|ispray|karate|furadan|brand|dosage|dosis|ml|kutsara|litro|tangke|gamot|tambal|lason|kemikal)\b/;

/**
 * Replies that never go to the model, because a wrong word there costs more than a stiff one: a pesticide or dose
 * ask, a health ask, another crop, and who the assistant is. Null for everything else. Only used for messages the
 * chat answers (see routeFor); a message with a sign in it is matched instead.
 */
export function fixedReply(text: string): string | null {
  const t = ` ${normalize(text)} `;
  // The input rail comes first: a message that tries to change the helper's rules never reaches the model.
  if (isInjectionAttempt(text)) return INJECTION_REPLY;
  if (EMERGENCY.test(t) && / (aso|pusa|kalabaw|baka|kambing|baboy|manok|hayop|alaga) /.test(t)) {
    return 'Emergency po ito. Dalhin po agad ang hayop sa pinakamalapit na beterinaryo o sa Municipal Agriculture Office. Kung lason o pesticide ang nakain, dalhin ang lalagyan o label nito.';
  }
  if (EMERGENCY.test(t)) {
    return 'Emergency po ito. Pumunta po agad sa pinakamalapit na health center o ospital, o tumawag sa 911. Kung pesticide ang dahilan, hugasan ang balat o mata ng malinis na tubig nang ilang minuto at dalhin ang label ng pesticide sa doktor.';
  }
  if (/ (saan|nasaan|where) /.test(t) && / (ospital|hospital|health center|klinika|clinic) /.test(t)) {
    return 'Hindi ko po alam kung saan ang pinakamalapit na ospital. Magtanong po sa barangay o sa health center, at tumawag sa 911 kung emergency.';
  }
  if (HEALTH.test(t)) {
    return 'Hindi po ako doktor, kaya hindi ako makakapagbigay ng gamot o dosis. Magpakonsulta po sa doktor o sa health center. Nandito lang po ako para sa problema ng palay at mais.';
  }
  if (PESTICIDE_ASK.test(t)) {
    return 'Hindi po ako nagbibigay ng pangalan o dosis ng pesticide. Ang lokal na agriculturist po ang makakapagsabi kung ano ang ligtas at tama para sa bukid ninyo. Kung may nakikita po kayong sira sa palay o mais, ilarawan po ninyo at aalamin ko ang posibleng problema.';
  }
  // Thanks and goodbyes get a warm line and no question, so the chat can end.
  if (!text.includes('?') && !SYMPTOM_WORD.test(t)) {
    if (FAREWELL.test(t)) return 'Ingat po kayo! Balikan po ninyo ako kung may makita pa kayong problema sa palay o mais.';
    if (THANKS.test(t)) return 'Walang anuman po. Balikan po ninyo ako kung may makita pa kayong problema sa palay o mais.';
  }
  if (ACK.test(t.trim())) return 'Sige po. Sabihin lang po ninyo kung may iba pa kayong nakikita sa palay o mais.';
  if (isGibberish(t)) return 'Hindi ko po naintindihan. Ano po ang nakikita ninyo sa dahon, tangkay, o uhay ng palay o mais?';
  if (OFFICE.test(t)) {
    return 'Hindi ko po ito masasagot nang tama. Para sa reklamo, lupa, pautang, insurance, ayuda, o RSBSA, magtanong po sa Municipal Agriculture Office (MAO), sa inyong kooperatiba, o sa barangay. Nandito po ako para sa problema ng palay at mais.';
  }
  if (CROP_CARE.test(t)) {
    return 'Ang alam ko po ay mga peste at sakit ng palay at mais, kaya hindi ko po masasagot nang tama ang tungkol sa pagtatanim, pag-aani, abono, o patubig. Magtanong po sa lokal na agriculturist o sa Municipal Agriculture Office.';
  }
  const crop = OTHER_CROP.exec(t)?.[1];
  if (crop) {
    return `Palay at mais lang po ang alam kong problema, kaya hindi ko po masasagot ang tungkol sa ${crop}. Para sa ${crop}, kumonsulta po sa lokal na agriculturist.`;
  }
  if (OTHER_CROP_GENERAL.test(t)) {
    return 'Palay at mais lang po ang alam kong problema, kaya hindi ko po masasagot ang tungkol sa ibang pananim. Para sa ibang pananim, kumonsulta po sa lokal na agriculturist.';
  }
  if (EAT.test(t)) {
    return 'Hindi ko po masasabi kung ligtas itong kainin. Itanong po muna sa lokal na agriculturist, lalo na kung nag-spray kayo kamakailan.';
  }
  if (IDENTITY.test(t)) {
    return 'Ako po si Ugatan, katulong ninyo sa problema ng palay at mais. Ilarawan po ninyo ang nakikita ninyo sa dahon, tangkay, o uhay, at sasabihin ko ang posibleng problema at ang mga hakbang.';
  }
  // "May tanong ako": after topic guardrails, so "magtanong … maliban sa palay" is not mistaken for a soft ask.
  if (ASK.test(t) && !SYMPTOM_WORD.test(t) && !OFF_TOPIC.test(t)) {
    return 'Opo, ano po ang itatanong ninyo tungkol sa palay o mais?';
  }
  return null;
}

/**
 * Punctuation, numbers, keyboard mashing, or a lone "hmm" or "lol": nothing to answer. A word with no vowel
 * ("jdjdjd", "xyz") is mashing too.
 */
function isGibberish(padded: string): boolean {
  const t = padded.trim();
  if (t === '') return true;
  if (INTERJECTION.test(t) && !ACK.test(t)) return true;
  return t.split(' ').every((w) => /^\d+$/.test(w) || !/[aeiou]/.test(w));
}

/**
 * Greetings, thanks, goodbyes, requests for help, questions about the assistant, complaints, and interjections. They
 * name no sign of a problem by themselves. A message with a symptom in it is never small talk (see routeFor).
 */
export function isSmallTalk(text: string): boolean {
  const t = ` ${normalize(text)} `;
  // Punctuation only ("???") has nothing to match on, so it is small talk too.
  if (t.trim() === '') return text.trim() !== '';
  return [GREETING, HELP, ASK, THANKS, FAREWELL, IDENTITY, COMPLAINT].some((re) => re.test(t)) || ACK.test(t.trim()) || isGibberish(t);
}

/** True for a message about a topic that is not a rice or corn problem. */
export function isOffTopic(text: string): boolean {
  const t = ` ${normalize(text)} `;
  return (
    OFF_TOPIC.test(t) ||
    OTHER_CROP_GENERAL.test(t) ||
    [PESTICIDE_ASK, HEALTH, EMERGENCY, OFFICE, CROP_CARE, EAT].some((re) => re.test(t))
  );
}

/**
 * Small talk and off-topic messages go to the chat, and everything else goes to matching. `hasSign` is true when the
 * message contains a keyword from the knowledge base, which settles it: "hello po, may butas ang dahon" is a symptom.
 */
export function routeFor(text: string, hasSign: boolean): Route {
  // Even with a keyword in it, a message that tries to override the rules is not a symptom report.
  if (isInjectionAttempt(text)) return 'chat';
  const t = ` ${normalize(text)} `;
  // "May itim na batik ang mangga" has a rice keyword, but it is about a mango. Naming palay or mais too keeps it a match.
  if (OTHER_CROP.test(t) && !detectCrop(text)) return 'chat';
  if (OTHER_CROP_GENERAL.test(t)) return 'chat';
  // "Anong gamot sa kuhol?" names a pest, but it asks for a pesticide: it gets the fixed pesticide line, not a match.
  if (PESTICIDE_ASK.test(t) && isQuestion(text)) return 'chat';
  if (hasSign) return 'match';
  // A plant part or a symptom word is a problem, even when the message also says "tulong" or "salamat".
  if (SYMPTOM_WORD.test(t)) return 'match';
  return isSmallTalk(text) || isOffTopic(text) ? 'chat' : 'match';
}

/**
 * The reply for small talk or an off-topic message when no model answers. The model's own chat reply is used when
 * there is one. Each line asks at most one question.
 */
export function smallTalkReply(text: string): string {
  const t = ` ${normalize(text)} `;
  if (t.trim() === '') return 'Hindi ko po naintindihan. Ano po ang nakikita ninyo sa palay o mais?';
  const fixed = fixedReply(text);
  if (fixed) return fixed;
  if (THANKS.test(t) || FAREWELL.test(t)) return 'Walang anuman po. Balikan po ninyo ako kung may makita pa kayo sa palay o mais.';
  if (COMPLAINT.test(t)) return 'Pasensya na po. Sabihin po ninyo kung ano ang nakikita ninyo sa palay o mais para matulungan ko kayo.';
  if (HELP.test(t)) return 'Opo, ano po ang problema sa palay o mais ninyo?';
  if (ASK.test(t)) return 'Opo, ano po ang itatanong ninyo tungkol sa palay o mais?';
  if (INTERJECTION.test(t.trim())) return 'Hindi ko po naintindihan. Ano po ang nakikita ninyo sa palay o mais?';
  if (isOffTopic(text)) return 'Palay at mais lang po ang alam kong problema. Kumonsulta po sa lokal na agriculturist para sa iba. Ano po ang nakikita ninyo sa palay o mais?';
  return 'Magandang araw po! Ano po ang nakikita ninyo sa palay o mais?';
}

/**
 * The farmer's messages that describe a symptom, oldest first. Small talk and off-topic messages are left out, so
 * "hello po" or "magkano ang presyo" never changes the match. `hasSign` tells the matcher's keywords apart from chat.
 */
export function sessionNotes(questions: readonly string[], hasSign: (text: string) => boolean): string[] {
  return questions.filter((q) => routeFor(q, hasSign(q)) === 'match').map((q) => q.trim());
}

/** A message that opens with a question word: "ano ang gagawin ko?", "pwede bang kainin?", "paano ito nangyari". */
const QUESTION_OPENER = /^ (ano|anong|paano|bakit|pwede|puwede|pede|kailan|ilan|ilang|saan|gaano|sino|unsa|unsaon|ngano|asa|what|how|why|when|can|is|does|should) /;

/**
 * True when, after the app has named a problem, the farmer's message is about that answer and not a new sign:
 * "ano ang gagawin ko?", "ano ang sanhi?", "pwede bang kainin?", "hindi ko alam". Such a message is answered from
 * the named problem's notes. Matching it again would only repeat the last answer, or worse, read the old notes
 * as a new problem. `hasSign` is true when the message has a keyword from the knowledge base: that is a new sign.
 */
export function isAboutLastAnswer(text: string, hasSign: boolean): boolean {
  if (hasSign) return false;
  const t = ` ${normalize(text)} `;
  if (OTHER_CROP.test(t) || OTHER_CROP_GENERAL.test(t)) return false;
  // A short detail ("sa tangkay din po", "may batik sa dahon") adds to the problem already named. A longer report
  // with no keyword is still matched, since Laya may read it as a new problem.
  return isQuestion(text) || !SYMPTOM_WORD.test(t) || contentWords(text).length <= 3;
}

/**
 * A question that names no sign: "babalik ba ito next season?", "ano ang gagawin ko?". Matching it again on the
 * open notes only repeats the last reply, so the chat answers it instead. `hasSign` is a knowledge-base keyword.
 */
export function isQuestionWithoutSign(text: string, hasSign: boolean): boolean {
  if (hasSign) return false;
  const t = ` ${normalize(text)} `;
  return isQuestion(text) && !SYMPTOM_WORD.test(t) && !OTHER_CROP.test(t) && !OTHER_CROP_GENERAL.test(t);
}

/** Ends in "?" or opens with a question word. */
function isQuestion(text: string): boolean {
  return text.trim().endsWith('?') || QUESTION_OPENER.test(` ${normalize(text)} `);
}

/**
 * The earlier notes that still belong with the new message. A message that names the other crop starts a new
 * problem: "may dilaw na guhit sa mais" after notes about palay is not read together with them.
 */
export function notesForMatch(notes: readonly string[], text: string): string[] {
  const crop = detectCrop(text);
  if (!crop) return [...notes];
  const earlier = [...notes].reverse().map(detectCrop).find((c) => c !== null);
  return earlier && earlier !== crop ? [] : [...notes];
}

/**
 * The description the matcher reads: every symptom note so far, joined, newest kept when they run past
 * SESSION_TEXT_CHARS. Matching on this (not the last message alone) lets "may butas po siya" mean what the
 * farmer said two messages earlier.
 */
export function sessionText(notes: readonly string[]): string {
  const kept: string[] = [];
  let size = 0;
  for (let i = notes.length - 1; i >= 0; i--) {
    const note = notes[i]!.trim();
    if (!note) continue;
    if (kept.length > 0 && size + note.length > SESSION_TEXT_CHARS) break;
    kept.unshift(note);
    size += note.length + 2;
  }
  return kept.join('. ');
}

/** Each sentence of a reply, with its own punctuation and spacing. Line breaks (numbered steps) are kept. */
function sentencesOf(text: string): string[][] {
  // No lookbehind, so older Safari still parses the bundle.
  return text.split('\n').map((line) => line.match(/[^.?!]*[.?!]+\s*|[^.?!]+$/g) ?? [line]);
}

/**
 * Keeps at most one question in a reply. Sentences that end in "?" after the first one are dropped, so a model
 * that asks three things still asks one. Line breaks (numbered steps) are kept.
 */
export function limitQuestions(text: string): string {
  let asked = false;
  return sentencesOf(text)
    .map((sentences) =>
      sentences
        .filter((sentence) => {
          if (!sentence.includes('?')) return true;
          if (asked) return false;
          asked = true;
          return true;
        })
        .join('')
        .trim(),
    )
    .join('\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

/** Words that carry no meaning of their own in a question about a sign. */
const ECHO_STOP = new Set([
  'po', 'ba', 'ang', 'ng', 'sa', 'mga', 'may', 'ako', 'ko', 'kayo', 'ninyo', 'ikaw', 'ka', 'ito', 'na', 'ay', 'si', 'mo',
  'niyo', 'anong', 'ano', 'kung', 'bang', 'kailan', 'saan', 'bakit', 'sino', 'paano', 'ilan', 'ilang', 'din', 'rin', 'lang',
  'nga', 'pa', 'naman', 'nang', 'yung', 'ung', 'iyan', 'iyon', 'the', 'is',
  // The crop and the plant are always implied, so a question that adds only these still repeats the farmer.
  'palay', 'mais', 'humay', 'tanim', 'pananim', 'halaman', 'problema', 'nakikita', 'napansin', 'inyong', 'inyo',
]);

/** Two words count as the same in an echo check when one is a form of the other: "nalanta" and "nalalanta". */
function sameWord(a: string, b: string): boolean {
  return a === b || (a.length >= 4 && b.length >= 4 && a.slice(0, 4) === b.slice(0, 4));
}

function contentWords(text: string): string[] {
  return normalize(text)
    .split(' ')
    .filter((w) => w.length > 1 && !ECHO_STOP.has(w));
}

/** A question that only hands the farmer's own words back: "May uod po ba sa gitna ng mais?" after "may uod sa gitna ng mais". */
function isEchoQuestion(question: string, farmerText: string): boolean {
  const asked = contentWords(question);
  if (asked.length === 0 || asked.length > 4) return false;
  const said = contentWords(farmerText);
  return asked.every((w) => said.some((s) => sameWord(w, s)));
}

/**
 * Drops questions that repeat what the farmer just said. When that leaves no question, the default one is added, so
 * the reply still asks what the farmer sees.
 */
export function dropEchoQuestions(text: string, farmerText: string): string {
  let dropped = false;
  const kept = sentencesOf(text)
    .map((sentences) =>
      sentences
        .filter((sentence) => {
          if (!sentence.includes('?') || !isEchoQuestion(sentence, farmerText)) return true;
          dropped = true;
          return false;
        })
        .join('')
        .trim(),
    )
    .join('\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
  if (!dropped) return text;
  return kept.includes('?') ? kept : `${kept} ${DEFAULT_QUESTION}`.trim();
}

const URGENT = /\b(lahat|buong|kalahati|karamihan|half|kumakalat|mabilis|namamatay|nalalanta|bumabagsak|emergency|wala nang natira)\b/;

/** The farmer describes a whole field or many plants going bad. Such a reply says to call the agriculturist now. */
export function isUrgent(text: string): boolean {
  const t = ` ${normalize(text)} `;
  // A help request ("tulong") still describes a problem. Only thanks and goodbyes are left out.
  return URGENT.test(t) && !THANKS.test(t) && !FAREWELL.test(t);
}

const APOLOGY_OPENER = /^(pasensya na po|pasensya na|pasensiya na po|paumanhin po|paumanhin|sorry po|sorry)[.!,]?\s+/i;
const APOLOGY_WORD = /\b(pasensya|pasensiya|paumanhin|sorry)\b/i;

/**
 * Tidies a model reply before the farmer sees it. An apology opener is removed unless the farmer complained, and a
 * complaint always gets one. Questions that repeat the farmer are dropped, and at most one question is kept. A
 * reply to a field going bad starts with "call the agriculturist now".
 */
export function tidyReply(raw: string, farmerText: string): string {
  let reply = limitQuestions(dropEchoQuestions(raw.trim(), farmerText));
  if (!reply) return smallTalkReply(farmerText);
  if (COMPLAINT.test(` ${normalize(farmerText)} `)) {
    // The sorry goes in front of the reply, so a complaint that also names a symptom keeps its explanation.
    if (!APOLOGY_WORD.test(reply)) reply = `Pasensya na po. ${reply}`;
  } else {
    reply = reply.replace(APOLOGY_OPENER, '').trim() || reply;
  }
  if (isUrgent(farmerText) && !/agriculturist/i.test(reply)) reply = `${URGENT_LINE} ${reply}`;
  return reply;
}

/** The name a farmer would see for a problem: "Golden apple snail (kuhol)" is "Golden apple snail". */
function shortName(name: string): string {
  return name.split(/ \(| \/ /)[0]!.trim();
}

/**
 * Makes sure an answer that names a problem says which one. The card shows the name too, but a small model
 * sometimes writes only "neck rot" or "May kuhol", and the farmer should hear the problem's name in the reply.
 * `sure` is false for a best guess, which is said as likely, not certain.
 */
export function withProblemName(reply: string, name: string, sure: boolean): string {
  const short = shortName(name);
  if (normalize(reply).includes(normalize(short))) return reply;
  return `${sure ? 'Malamang' : 'Posibleng'} ${short} po ito. ${reply}`;
}

const TREATMENT =
  /\b(spray|pestisidyo|pesticide|pesticides|insecticide|fungicide|herbicide|pamatay|gamot|gamutin|tratuhin|treatment|kontrolin|control|lason|kemikal)\b/;

/** True when text gives treatment, control, or spraying advice. Such replies carry the pesticide notice. */
export function mentionsTreatment(text: string): boolean {
  return TREATMENT.test(` ${normalize(text)} `);
}

/**
 * The pesticide notice goes on a reply that gives treatment: a clear match (its steps are shown) or text that
 * advises spraying or control. Greetings, questions, and "not sure" replies do not carry it.
 */
export function carriesNotice(clearMatch: boolean, text?: string | null): boolean {
  return clearMatch || mentionsTreatment(text ?? '');
}

/** One more follow-up when the reply asked a question, none after a clear match or a final answer, and small talk changes nothing. */
export function nextFollowUps(count: number, outcome: TurnOutcome): number {
  if (outcome === 'clear' || outcome === 'done') return 0;
  if (outcome === 'ask') return count + 1;
  return count;
}

/** True once the app has asked MAX_FOLLOW_UPS questions with no clear match: give the best answer and say what is uncertain. */
export function isFinalAnswer(followUps: number): boolean {
  return followUps >= MAX_FOLLOW_UPS;
}
