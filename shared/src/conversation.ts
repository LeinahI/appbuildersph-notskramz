import { detectCrop } from './crop.js';
import { guideFor, guideReply, type CareGuide } from './guides.js';
import { keywordHits, normalize } from './keyword.js';
import { looksCebuano, replyLanguage, type ReplyLanguage } from './language.js';
import { INJECTION_REPLY, isInjectionAttempt } from './rails.js';
import type { KnowledgeEntry } from './types.js';

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
const DEFAULT_QUESTION_CEB = 'Unsa ang inyong nakita sa dahon, punoan, o uhay?';
/** Said first when the farmer describes a whole field or many plants going bad. */
const URGENT_LINE = 'Tawagan po agad ang lokal na agriculturist.';
const URGENT_LINE_CEB = 'Tawagi dayon ang lokal nga agriculturist.';

/** Picks the Tagalog or the Cebuano (Bisaya) line, by the farmer's own words. */
function inLanguage(text: string): (tl: string, ceb: string) => string {
  const ceb = looksCebuano(text);
  return (tl, cebuano) => (ceb ? cebuano : tl);
}

const GREETING = /\b(hello|helo|hi|hey|hallo|kumusta|kamusta|musta|magandang (umaga|hapon|gabi|tanghali|araw)|good (morning|afternoon|evening|day))\b/;
const HELP = /\b(tulungan|tulong|matulungan|makatulong|help|tabang|tabangi|tabangan)\b/;
/** "May tanong ako", "pwede magtanong": the farmer wants to ask something, and has not yet. */
const ASK = /\b(may (tanong|itatanong|kailangan|sasabihin)|magtanong|itatanong|pwede magtanong)\b/;
const THANKS = /\b(salamat|salamuch|thank|thanks|thx|tnx|ty|daghang salamat)\b/;
const FAREWELL =
  /\b(paalam|bye|goodbye|babay|ingat|amping|see you|later|good night|hanggang sa muli|una na ako|alis na ako|aalis na ako|tapos na ako|mauna na ko|lakaw na ko)\b/;
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
/** A person who is sick: "may sakit po ang anak ko", "nilalagnat ako". Not a crop: "may sakit ang palay" is a crop problem. */
function isSickPerson(padded: string): boolean {
  const sick = / (may sakit|nagkasakit|nilalagnat|inuubo|masama ang pakiramdam|masakiton|nagsakit|gihilantan|giubo) /.test(padded);
  const person = / (anak|asawa|nanay|tatay|lola|lolo|kapatid|apo|misis|mister|baby|sanggol|pamilya|ako|akong anak) /.test(padded);
  const crop = / (palay|mais|humay|tanim|tanom|dahon|uhay|pananim|basakan|palayan) /.test(padded);
  return sick && person && !crop;
}

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
  const say = inLanguage(text);
  // The input rail comes first: a message that tries to change the helper's rules never reaches the model.
  if (isInjectionAttempt(text)) return INJECTION_REPLY;
  if (EMERGENCY.test(t) && / (aso|pusa|kalabaw|baka|kambing|baboy|manok|hayop|alaga) /.test(t)) {
    return say(
      'Emergency po ito. Dalhin po agad ang hayop sa pinakamalapit na beterinaryo o sa Municipal Agriculture Office. Kung lason o pesticide ang nakain, dalhin ang lalagyan o label nito.',
      'Emergency kini. Dad-a dayon ang hayop sa labing duol nga beterinaryo o sa Municipal Agriculture Office. Kung hilo o pesticide ang nakaon, dad-a ang sudlanan o label niini.',
    );
  }
  if (EMERGENCY.test(t)) {
    return say(
      'Emergency po ito. Pumunta po agad sa pinakamalapit na health center o ospital, o tumawag sa 911. Kung pesticide ang dahilan, hugasan ang balat o mata ng malinis na tubig nang ilang minuto at dalhin ang label ng pesticide sa doktor.',
      'Emergency kini. Adto dayon sa labing duol nga health center o ospital, o tawag sa 911. Kung pesticide ang hinungdan, hugasi ang panit o mata og limpyo nga tubig sulod sa pipila ka minuto ug dad-a ang label sa pesticide ngadto sa doktor.',
    );
  }
  if (/ (saan|nasaan|where) /.test(t) && / (ospital|hospital|health center|klinika|clinic) /.test(t)) {
    return say(
      'Hindi ko po alam kung saan ang pinakamalapit na ospital. Magtanong po sa barangay o sa health center, at tumawag sa 911 kung emergency.',
      'Wala ko kahibalo kung asa ang labing duol nga ospital. Pangutana sa barangay o sa health center, ug tawag sa 911 kung emergency.',
    );
  }
  // A sick person comes before the pesticide check, so "ano ang gamot sa anak ko?" never gets the pesticide line.
  if (HEALTH.test(t) || isSickPerson(t)) {
    return say(
      'Hindi po ako doktor, kaya hindi ako makakapagbigay ng gamot o dosis. Magpakonsulta po sa doktor o sa health center. Nandito lang po ako para sa problema ng palay at mais.',
      'Dili ko doktor, busa dili ko makahatag og tambal o dosis. Pakonsulta sa doktor o sa health center. Ania ra ko para sa problema sa humay ug mais.',
    );
  }
  if (PESTICIDE_ASK.test(t)) {
    return say(
      'Hindi po ako nagbibigay ng pangalan o dosis ng pesticide. Ang lokal na agriculturist po ang makakapagsabi kung ano ang ligtas at tama para sa bukid ninyo. Kung may nakikita po kayong sira sa palay o mais, ilarawan po ninyo at aalamin ko ang posibleng problema.',
      'Dili ko mohatag og ngalan o dosis sa pesticide. Ang lokal nga agriculturist ang makasulti kung unsa ang luwas ug sakto para sa inyong uma. Kung naa moy nakita nga daot sa humay o mais, isulti kini ug tan-awon nako ang posible nga problema.',
    );
  }
  // Thanks and goodbyes get a warm line and no question, so the chat can end.
  if (!text.includes('?') && !SYMPTOM_WORD.test(t)) {
    if (FAREWELL.test(t)) {
      return say(
        'Ingat po kayo! Balikan po ninyo ako kung may makita pa kayong problema sa palay o mais.',
        'Amping mo! Balik lang kung naa pay makita nga problema sa humay o mais.',
      );
    }
    if (THANKS.test(t)) {
      return say(
        'Walang anuman po. Balikan po ninyo ako kung may makita pa kayong problema sa palay o mais.',
        'Walay sapayan. Balik lang kung naa pay makita nga problema sa humay o mais.',
      );
    }
  }
  if (ACK.test(t.trim())) {
    return say('Sige po. Sabihin lang po ninyo kung may iba pa kayong nakikita sa palay o mais.', 'Sige. Isulti lang kung naa pay laing makita sa humay o mais.');
  }
  if (isGibberish(t)) {
    return say(
      'Hindi ko po naintindihan. Ano po ang nakikita ninyo sa dahon, tangkay, o uhay ng palay o mais?',
      'Wala ko kasabot. Unsa ang inyong nakita sa dahon, punoan, o uhay sa humay o mais?',
    );
  }
  if (OFFICE.test(t)) {
    return say(
      'Hindi ko po ito masasagot nang tama. Para sa reklamo, lupa, pautang, insurance, ayuda, o RSBSA, magtanong po sa Municipal Agriculture Office (MAO), sa inyong kooperatiba, o sa barangay. Nandito po ako para sa problema ng palay at mais.',
      'Dili nako matubag kini og tarong. Para sa reklamo, yuta, utang, insurance, ayuda, o RSBSA, pangutana sa Municipal Agriculture Office (MAO), sa inyong kooperatiba, o sa barangay. Ania ko para sa problema sa humay ug mais.',
    );
  }
  // A growing question with a guide (planting, water, fertilizer timing, harvest...) is answered from that guide.
  if (careGuideFor(text, false)) return null;
  if (CROP_CARE.test(t)) {
    // A growing question with no guide: corn, or which crop to plant. The answer depends on the place and season.
    return say(
      'Para sa tanong na ito tungkol sa pagtatanim, pag-aani, abono, o patubig, mas mabuting magtanong po sa lokal na agriculturist o sa Municipal Agriculture Office, dahil nakadepende ito sa inyong lugar at panahon. Para sa palay, maitatanong po ninyo sa akin kung paano magtanim, mag-abono, magpatubig, o mag-ani.',
      'Para niini nga pangutana bahin sa pagtanom, pag-ani, abono, o patubig, mas maayo nga mangutana sa lokal nga agriculturist o sa Municipal Agriculture Office, kay nagdepende kini sa inyong lugar ug panahon. Para sa humay, mahimo nimong pangutan-on nako kung unsaon pagtanom, pag-abono, pagpatubig, o pag-ani.',
    );
  }
  const crop = OTHER_CROP.exec(t)?.[1];
  if (crop) {
    return say(
      `Palay at mais lang po ang alam kong problema, kaya hindi ko po masasagot ang tungkol sa ${crop}. Para sa ${crop}, kumonsulta po sa lokal na agriculturist.`,
      `Humay ug mais lang ang akong nahibal-an nga problema, busa dili nako matubag ang bahin sa ${crop}. Para sa ${crop}, pakonsulta sa lokal nga agriculturist.`,
    );
  }
  if (OTHER_CROP_GENERAL.test(t)) {
    return say(
      'Palay at mais lang po ang alam kong problema, kaya hindi ko po masasagot ang tungkol sa ibang pananim. Para sa ibang pananim, kumonsulta po sa lokal na agriculturist.',
      'Humay ug mais lang ang akong nahibal-an nga problema, busa dili nako matubag ang bahin sa ubang tanom. Para sa ubang tanom, pakonsulta sa lokal nga agriculturist.',
    );
  }
  if (EAT.test(t)) {
    return say(
      'Hindi ko po masasabi kung ligtas itong kainin. Itanong po muna sa lokal na agriculturist, lalo na kung nag-spray kayo kamakailan.',
      'Dili nako masulti kung luwas kini kan-on. Pangutana una sa lokal nga agriculturist, ilabina kung bag-o lang mo nag-spray.',
    );
  }
  if (IDENTITY.test(t)) {
    return say(
      'Ako po si Ugatan, katulong ninyo sa palay at mais: sa mga peste at sakit, at sa pagtatanim, pag-aabono, patubig, at pag-aani ng palay. Ilarawan po ninyo ang nakikita ninyo sa dahon, tangkay, o uhay, o itanong kung paano gawin ang isang bagay, at ibibigay ko ang mga hakbang.',
      'Ako si Ugatan, inyong katabang sa humay ug mais: sa mga peste ug sakit, ug sa pagtanom, pag-abono, patubig, ug pag-ani sa humay. Isulti kung unsa ang inyong nakita sa dahon, punoan, o uhay, o pangutana kung unsaon pagbuhat sa usa ka butang, ug ihatag nako ang mga lakang.',
    );
  }
  // "May tanong ako": after topic guardrails, so "magtanong … maliban sa palay" is not mistaken for a soft ask.
  if (ASK.test(t) && !SYMPTOM_WORD.test(t) && !OFF_TOPIC.test(t)) {
    return say('Opo, ano po ang itatanong ninyo tungkol sa palay o mais?', 'Oo, unsa ang inyong pangutana bahin sa humay o mais?');
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
    [PESTICIDE_ASK, HEALTH, EMERGENCY, OFFICE, CROP_CARE, EAT].some((re) => re.test(t)) ||
    isSickPerson(t)
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
  // "Paano magtanim ng palay?", "kailan mag-abono?": a how-to question, answered from a guide, not matched.
  if (careGuideFor(text, hasSign)) return 'chat';
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
  const say = inLanguage(text);
  const notUnderstood = say('Hindi ko po naintindihan. Ano po ang nakikita ninyo sa palay o mais?', 'Wala ko kasabot. Unsa ang inyong nakita sa humay o mais?');
  if (t.trim() === '') return notUnderstood;
  const fixed = fixedReply(text);
  if (fixed) return fixed;
  const guide = careGuideFor(text, false);
  if (guide) return guideReply(guide, replyLanguage(text));
  if (THANKS.test(t) || FAREWELL.test(t)) {
    return say('Walang anuman po. Balikan po ninyo ako kung may makita pa kayo sa palay o mais.', 'Walay sapayan. Balik lang kung naa pay makita sa humay o mais.');
  }
  if (COMPLAINT.test(t)) {
    return say(
      'Pasensya na po. Sabihin po ninyo kung ano ang nakikita ninyo sa palay o mais para matulungan ko kayo.',
      'Pasayloa ko. Isulti kung unsa ang inyong nakita sa humay o mais aron matabangan ko kamo.',
    );
  }
  if (HELP.test(t)) return say('Opo, ano po ang problema sa palay o mais ninyo?', 'Oo, unsa ang problema sa inyong humay o mais?');
  if (ASK.test(t)) return say('Opo, ano po ang itatanong ninyo tungkol sa palay o mais?', 'Oo, unsa ang inyong pangutana bahin sa humay o mais?');
  if (INTERJECTION.test(t.trim())) return notUnderstood;
  if (isOffTopic(text)) {
    return say(
      'Palay at mais lang po ang alam kong problema. Kumonsulta po sa lokal na agriculturist para sa iba. Ano po ang nakikita ninyo sa palay o mais?',
      'Humay ug mais lang ang akong nahibal-an nga problema. Pakonsulta sa lokal nga agriculturist para sa uban. Unsa ang inyong nakita sa humay o mais?',
    );
  }
  return say('Magandang araw po! Ano po ang nakikita ninyo sa palay o mais?', 'Maayong adlaw! Unsa ang inyong nakita sa humay o mais?');
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
 * The rice-growing guide a message asks about, or null. A message with a knowledge-base keyword is a problem to
 * match, not a how-to. A report with a symptom word ("pagkatapos magtanim, nalalanta") is a problem too, unless it
 * is a question ("pwede na bang anihin, dilaw na ang butil?"). Another crop never gets a rice guide.
 */
export function careGuideFor(text: string, hasSign: boolean): CareGuide | null {
  if (hasSign || isInjectionAttempt(text)) return null;
  const t = ` ${normalize(text)} `;
  if ((OTHER_CROP.test(t) || OTHER_CROP_GENERAL.test(t)) && !detectCrop(text)) return null;
  if (SYMPTOM_WORD.test(t) && !isQuestion(text)) return null;
  return guideFor(text);
}

/** "Ano po ang pwedeng gawin ko?", "pa help naman", "paano ito mawawala?": the farmer wants steps, not another question. */
const HELP_ASK =
  /\b(ano (?:po )?(?:ba )?(?:ang |kaya ang |ba ang )?(?:pwede|puwede|pwedeng|puwedeng|dapat|gagawin|gawin|kailangan|kailangang|magagawa|solusyon|lunas|remedyo)|anong (?:pwede|puwede|pwedeng|puwedeng|dapat|gagawin|gawin|solusyon|lunas|remedyo|magagawa)|paano (?:po )?(?:ko |namin |natin )?(?:po )?(?:ito |iyan |yan |yun )?(?:aayusin|ayusin|maaayos|masolusyunan|mawawala|mawala|maiiwasan|maiwasan|labanan|lalabanan|kontrolin|kokontrolin|sugpuin|puksain|gagamutin|gamutin|tanggalin|aalisin|maililigtas|iligtas)|pa ?help|patulong|tulungan|tulong|help|what (?:should|can|do) i do|what to do|how (?:do i |can i |to )(?:fix|stop|control|treat|solve|get rid|save)|unsa(?:y| ang| akong| man ang)? (?:angay (?:nakong |nako )?)?(?:buhaton|himuon)|unsaon (?:pagpugong|pagsumpo|pagtangtang|pagwagtang|pagpatay|pag ayo|pagsulbad)|tabangi|tabangan|patabang)\b/;

/** True when the farmer asks what to do or asks for help. With a problem still open, the reply gives steps. */
export function isHelpAsk(text: string): boolean {
  return HELP_ASK.test(` ${normalize(text)} `);
}

/** A farmer's plant part, and the words a sign in the notes uses for it. */
const PARTS: readonly (readonly [RegExp, RegExp])[] = [
  [/ (uhay|butil|lugas|leeg|liog|panicle|grain|grains|bunga) /, /\b(panicle|grain|grains|neck|head|heads|ear|ears)\b/i],
  [/ (dahon|leaf|leaves) /, /\b(leaf|leaves)\b/i],
  [/ (tangkay|puno|punoan|tukog|stem|stalk|suwi|tiller|usbong) /, /\b(stem|stems|stalk|tiller|tillers|base|dead heart|dead hearts)\b/i],
  [/ (ugat|root|roots) /, /\broots?\b/i],
  [/ (punla|semilya|seedling|seedlings) /, /\bseedlings?\b/i],
];

/** The sign patterns for the plant parts the farmer named, in their own words. Empty when they named none. */
function partsNamed(farmerText: string): RegExp[] {
  const t = ` ${normalize(farmerText)} `;
  return PARTS.filter(([farmer]) => farmer.test(t)).map(([, sign]) => sign);
}

/**
 * Possible problems that fit where the farmer saw the trouble. "Uhay po" rules out a leaf-only disease, and "dilaw
 * ang dahon" a pest that only shows on the grain, so a "not sure" question or a first-steps reply is about a problem
 * that can be there. When none fits, or the farmer named no part, the list is kept as the matcher gave it.
 */
export function fitPlantPart<T extends { signs: readonly string[]; insect?: unknown }>(entries: readonly T[], farmerText: string): T[] {
  // "Wala pong insekto": an insect is not the answer, even when it is the only candidate left.
  const kept = NO_INSECT.test(` ${normalize(farmerText)} `) ? entries.filter((e) => !e.insect) : [...entries];
  const parts = partsNamed(farmerText);
  if (parts.length === 0) return kept;
  const fits = kept.filter((e) => e.signs.some((sign) => parts.some((p) => p.test(sign))));
  return fits.length > 0 ? fits : kept;
}

/** The farmer says there are no insects or worms. */
const NO_INSECT =
  / (wala|walang|walay|wala pong|wala po|no|without|there are no) (po |pong |ng |nga |any )?(insekto|kulisap|uod|ulod|higad|insect|insects|bug|bugs|worm|worms) /;

/**
 * The signs a "not sure" question offers the farmer as choices: one per possible problem (at most three), on the
 * plant part the farmer named when the notes have one, and not one the farmer already said. `round` is how many
 * questions were already asked about this problem, so the next question asks about a different sign.
 */
export function signChoices(entries: readonly KnowledgeEntry[], farmerText: string, round = 0): string[] {
  const parts = partsNamed(farmerText);
  const choices: string[] = [];
  for (const entry of entries.slice(0, 3)) {
    const said = new Set(keywordHits(entry, farmerText));
    const fresh = entry.signs.filter((sign) => {
      const hits = keywordHits(entry, sign);
      return hits.length === 0 || hits.some((k) => !said.has(k));
    });
    const pool = fresh.length ? fresh : entry.signs;
    const onPart = parts.length ? pool.filter((sign) => parts.some((p) => p.test(sign))) : [];
    // Asking again moves to the next sign on the same plant part, never to a part the farmer did not name.
    const ordered = onPart.length ? onPart : pool;
    const sign = ordered[round % ordered.length];
    if (sign && !choices.includes(sign)) choices.push(sign);
  }
  return choices;
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
  return kept.includes('?') ? kept : `${kept} ${looksCebuano(farmerText) ? DEFAULT_QUESTION_CEB : DEFAULT_QUESTION}`.trim();
}

/** True when two questions ask the same thing: most of their content words are the same. */
function sameQuestion(a: string[], b: string[]): boolean {
  if (a.length === 0 || b.length === 0) return false;
  const shared = a.filter((w) => b.some((x) => sameWord(w, x))).length;
  return shared / Math.max(a.length, b.length) >= 0.75;
}

/**
 * Drops a question the app already asked earlier in this chat ("Ano po ang kulay ng mga batik?" twice). Asking
 * again what the farmer could not or did not answer only goes in circles. A reply that is nothing but the repeated
 * question is kept as it is, so the farmer still gets an answer.
 */
export function dropRepeatedQuestions(text: string, earlierReplies: readonly string[]): string {
  const asked = earlierReplies.flatMap((reply) => sentencesOf(reply).flat().filter((s) => s.includes('?'))).map(contentWords);
  if (asked.length === 0) return text;
  let dropped = false;
  const kept = sentencesOf(text)
    .map((sentences) =>
      sentences
        .filter((sentence) => {
          if (!sentence.includes('?') || !asked.some((a) => sameQuestion(contentWords(sentence), a))) return true;
          dropped = true;
          return false;
        })
        .join('')
        .trim(),
    )
    .join('\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
  return dropped && kept ? kept : text;
}

const URGENT =
  /\b(lahat|buong|kalahati|karamihan|half|kumakalat|mabilis|namamatay|nalalanta|bumabagsak|emergency|wala nang natira|tanan|tibuok|katunga|nangamatay|mokaylap|nagkaylap|paspas)\b/;

/** The farmer describes a whole field or many plants going bad. Such a reply says to call the agriculturist now. */
export function isUrgent(text: string): boolean {
  const t = ` ${normalize(text)} `;
  // A help request ("tulong") still describes a problem. Only thanks and goodbyes are left out.
  return URGENT.test(t) && !THANKS.test(t) && !FAREWELL.test(t);
}

const APOLOGY_OPENER = /^(pasensya na po|pasensya na|pasensiya na po|paumanhin po|paumanhin|pasayloa ko|pasayloa|sorry po|sorry)[.!,]?\s+/i;
const APOLOGY_WORD = /\b(pasensya|pasensiya|paumanhin|pasayloa|sorry)\b/i;

/**
 * Tidies a model reply before the farmer sees it. An apology opener is removed unless the farmer complained, and a
 * complaint always gets one. Questions that repeat the farmer are dropped, and at most one question is kept. A
 * reply to a field going bad starts with "call the agriculturist now".
 */
export function tidyReply(raw: string, farmerText: string, { urgent = isUrgent(farmerText) }: { urgent?: boolean } = {}): string {
  let reply = limitQuestions(dropEchoQuestions(raw.trim(), farmerText));
  if (!reply) return smallTalkReply(farmerText);
  if (COMPLAINT.test(` ${normalize(farmerText)} `)) {
    // The sorry goes in front of the reply, so a complaint that also names a symptom keeps its explanation.
    if (!APOLOGY_WORD.test(reply)) reply = `${looksCebuano(farmerText) ? 'Pasayloa ko.' : 'Pasensya na po.'} ${reply}`;
  } else {
    reply = reply.replace(APOLOGY_OPENER, '').trim() || reply;
  }
  if (urgent && !/agriculturist/i.test(reply)) reply = `${looksCebuano(farmerText) ? URGENT_LINE_CEB : URGENT_LINE} ${reply}`;
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
export function withProblemName(reply: string, name: string, sure: boolean, lang: ReplyLanguage = 'tl'): string {
  const short = shortName(name);
  if (normalize(reply).includes(normalize(short))) return reply;
  if (lang === 'ceb') return `${sure ? 'Lagmit' : 'Posible nga'} ${short} kini. ${reply}`;
  if (lang === 'en') return `This is ${sure ? 'likely' : 'possibly'} ${short}. ${reply}`;
  return `${sure ? 'Malamang' : 'Posibleng'} ${short} po ito. ${reply}`;
}

const TREATMENT =
  /\b(spray|pestisidyo|pesticide|pesticides|insecticide|fungicide|herbicide|pamatay|gamot|gamutin|tratuhin|treatment|kontrolin|control|lason|kemikal|tambal|hilo)\b/;

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
