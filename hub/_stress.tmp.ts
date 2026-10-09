import { appendFileSync, writeFileSync } from 'node:fs';
import { answerQuestion } from './src/answer.js';
import { ConversationStore } from './src/conversation/state.js';
import { createGemmaLlamaCppExplainer } from './src/explain/gemma-llamacpp.js';
import { loadKnowledge } from './src/knowledge.js';
import { createKeywordMatcher } from './src/matchers/keyword.js';
import { loadEnvFile } from './src/env.js';

loadEnvFile();
const OUT = process.argv[2]!;
const TOTAL = Number(process.argv[3] ?? 5000);
// Turns before START are replayed through the matcher only (no model), to rebuild each chat's state exactly.
const START = Number(process.argv[4] ?? 0);
const TURNS_PER_CHAT = 10;
writeFileSync(OUT, '');

// Seeded PRNG so the run can be repeated exactly.
let seed = 42;
const rnd = () => {
  seed |= 0;
  seed = (seed + 0x6d2b79f5) | 0;
  let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};
const pick = <T,>(xs: readonly T[]): T => xs[Math.floor(rnd() * xs.length)]!;

const POOL: Record<string, string[]> = {
  greet: ['hello', 'hello po', 'hi', 'kumusta po?', 'kumusta ka?', 'good morning sir', 'magandang umaga po', 'magandang hapon', 'hey there', 'musta', 'hi po, ano na?'],
  help: ['maari niyo ba ako tulungan', 'pwede niyo ba akong tulungan?', 'tulungan mo ako', 'may tanong ako', 'pwede magtanong?', 'may kailangan lang ako'],
  thanks: ['salamat po', 'maraming salamat', 'thank you', 'thanks!', 'salamat sa tulong'],
  bye: ['sige po paalam', 'ingat po', 'bye', 'goodbye po'],
  identity: ['sino ka?', 'ano ang pangalan mo', 'ikaw ba ay tao?', 'ano ka ba?', 'ano ang ginagawa mo?'],
  complaint: ['bat ganyan response mo', 'hindi ka nakakatulong', 'bobo ka ba?', 'ayusin mo naman', 'kausapin mo ako', 'ang sagot mo mali', 'tanga ka ba', 'walang kwenta ang sagot mo'],
  gibberish: ['???', 'asdf qwer', '...', 'xyz 123', 'hmmm', 'lol', 'ok', 'aaaa'],
  offtopic: ['sino ang presidente ng pilipinas?', 'anong oras na?', 'magkano ang presyo ng bigas ngayon?', 'ano ang panahon bukas?', 'paano gumawa ng adobo?', 'sino si jose rizal?', 'magkano ang sahod ng magsasaka?', 'ano ang bitcoin?', 'pwede ba akong mag-loan sa bangko?', 'anong oras ang misa sa simbahan?', 'ano ang pinakamalaking bansa sa mundo?'],
  health: ['masakit ang ulo ko, anong gamot ang iinumin ko?', 'ilang mg ng paracetamol ang ibibigay ko?', 'may ubo ako, ano ang dapat kong gawin', 'masakit ang tiyan ko', 'nilalagnat ako', 'ano ang gamot sa sipon'],
  legal: ['pwede ba akong magreklamo sa kooperatiba ko?', 'may karapatan ba ako sa lupa?', 'paano mag-file ng reklamo sa DA?', 'bawal ba ang magtanim ng mais sa bukid na ito?'],
  pesticide: ['anong pesticide ang pinakamabisa sa palay?', 'ilang ml ng karate kada litro?', 'ano ang pwede kong i-spray sa mais ko?', 'anong brand ng pamatay peste ang maganda?', 'magkano ang dosage ng furadan?', 'ilang kutsara ng pesticide sa isang tangke?', 'anong insecticide ang pinakamalakas?'],
  othercrop: ['pwede bang kainin ang kangkong na may dilaw na dahon?', 'may bulate ang kamatis ko', 'may sakit ba ang talong ko?', 'paano magtanim ng saging?', 'may insekto sa okra ko', 'dilaw ang dahon ng sili ko'],
  harvest: ['kailan dapat mag-ani ng palay?', 'kailan ang tamang oras magtanim ng mais?', 'ilang araw bago mag-ani ang palay?', 'anong klaseng binhi ang maganda?', 'paano magdilig ng palay?'],
  vague: ['may langgam ito', 'may batik sa dahon', 'may mali sa palay ko', 'may problema ang tanim ko', 'may dilaw na dahon ang palay ko', 'nalalanta lahat ng palay ko, tulong!!!', 'namamatay ang mais ko', 'kumakalat na ang sira sa bukid', 'hindi ko alam', 'ewan ko po', 'may insekto sa dahon', 'kulay kayumanggi ang dahon', 'naay mga butang sa dahon sa humay', 'unsa ang kuhol sa humay?', 'dili maayo akong mais', 'may sira ang palay ko na parang natutuyo'],
  followup: ['may butas po siya', 'ano pa?', 'ano ang kulay?', 'sa dahon lang', 'sa tangkay naman', 'kumalat na', 'ilan po ang apektado', 'bagong tanim pa lang', 'ano ang gagawin ko?', 'ano ang sanhi?', 'may iba pa po bang tanong?', 'pwede bang kainin?'],
};
const SYMPTOMS: string[] = [
  'may butas sa tangkay ng mais', 'bulok na tangkay ng mais', 'may tunnel sa loob ng tangkay ng mais', 'nabali ang tangkay ng mais',
  'tuyo ang gilid ng dahon ng palay', 'may guhit sa gilid ng dahon', 'may tubig na lumalabas sa dahon ng palay', 'puti na guhit sa gilid ng dahon ng palay',
  'kumpol ang palay sa tubig', 'nasusunog ang palay, kulay kahel', 'may maliliit na insekto sa ilalim ng palay', 'natutuyo ang tanim sa may tubig',
  'may puting pulbos sa dahon ng mais', 'may dilaw na guhit sa mais', 'kulubot na dahon ng mais', 'puting amag sa mais',
  'may butas sa dahon ng mais', 'may sawdust sa loob ng dahon ng mais', 'may uod sa gitna ng mais', 'kinain ang dahon ng mais ng uod',
  'may kuhol sa palayan', 'may pink na itlog sa tangkay', 'pinutol ang punla ng palay ng kuhol', 'may egg cluster sa tubig',
  'diamond na batik sa dahon ng palay', 'mata ng isda sa dahon ng palay', 'nabubulok ang leeg ng uhay', 'may kulay abong batik sa palay',
  'patay na puso sa palay', 'puting uhay ang palay', 'may butas sa tangkay ng palay', 'natutuyo ang gitna ng palay',
];
const CATS = ['greet', 'help', 'thanks', 'bye', 'identity', 'complaint', 'gibberish', 'offtopic', 'health', 'legal', 'pesticide', 'othercrop', 'harvest', 'vague', 'followup', 'symptom'] as const;
const WEIGHT: Record<string, number> = { greet: 6, help: 3, thanks: 3, bye: 1, identity: 2, complaint: 4, gibberish: 2, offtopic: 5, health: 4, legal: 2, pesticide: 4, othercrop: 4, harvest: 3, vague: 8, followup: 8, symptom: 14 };
const weighted = (): string => {
  const total = Object.values(WEIGHT).reduce((a, b) => a + b, 0);
  let r = rnd() * total;
  for (const c of CATS) {
    r -= WEIGHT[c]!;
    if (r < 0) return c;
  }
  return 'vague';
};
const draw = (cat: string): { cat: string; text: string } =>
  cat === 'symptom' ? { cat, text: pick(SYMPTOMS) } : { cat, text: pick(POOL[cat]!) };

const knowledge = loadKnowledge(new URL('../knowledge/', import.meta.url));
const explainer = await createGemmaLlamaCppExplainer({ modelPath: process.env.GEMMA_GGUF!, maxNewTokens: 128, maxWords: 70 });
const conversations = new ConversationStore();
const deps = { matcher: createKeywordMatcher(knowledge), explainer, knowledge, logger: { write() {} }, conversations };
const silent = { status: 'unavailable' as const, text: null };
const replayDeps = { ...deps, explainer: { name: 'replay', explain: async () => silent, chat: async () => silent } };

let done = 0;
const started = Date.now();
for (let chat = 0; done < TOTAL; chat++) {
  const sessionId = `stress-${chat}`;
  // Each chat opens with a topic: a symptom, a vague problem, or a small-talk opener.
  const opener = rnd() < 0.5 ? draw('symptom') : rnd() < 0.7 ? draw('vague') : draw(weighted());
  const turns = [opener];
  for (let t = 1; t < TURNS_PER_CHAT && done + turns.length < TOTAL; t++) turns.push(draw(weighted()));
  for (let t = 0; t < turns.length && done < TOTAL; t++) {
    const { cat, text } = turns[t]!;
    const replaying = done < START;
    const r = await answerQuestion({ uid: `${sessionId}-${t}`, crop: 'any', text, sessionId }, replaying ? replayDeps : deps);
    if (!replaying) appendFileSync(OUT, JSON.stringify({ chat, turn: t, cat, text, matchIds: r.matchIds, clear: r.clear, matchedOn: r.matchedOn, status: r.explanationStatus, reply: r.explanation }) + '\n');
    done++;
    if (done % 100 === 0) console.log(`PROGRESS ${done}/${TOTAL} elapsed=${Math.round((Date.now() - started) / 1000)}s`);
  }
}
console.log(`DONE ${done} elapsed=${Math.round((Date.now() - started) / 1000)}s`);
