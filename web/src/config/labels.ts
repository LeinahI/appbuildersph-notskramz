export const UI_LANGUAGES = ['tl', 'en', 'ceb'] as const;
export type UiLanguage = (typeof UI_LANGUAGES)[number];

export const DEFAULT_UI_LANGUAGE: UiLanguage = 'tl';

const tl = {
  appName: 'Ugatan',
  tagline: 'Payo sa bukid, kahit walang signal. Ang AI ay tumatakbo sa iyong device.',
  crop: 'Pananim',
  cropRice: 'Palay (rice)',
  cropCorn: 'Mais (corn)',
  cropAny: 'Pareho',
  describe: 'Ilarawan ang nakikita mo sa pananim',
  describePlaceholder: 'Hal. May mga bilog na bahagi ng palay na nagiging kayumanggi at natutuyo',
  look: 'Tingnan',
  voiceStart: 'Magsalita',
  voiceStop: 'Itigil ang pag-record',
  voiceListening: 'Nakikinig… Magsalita tungkol sa iyong pananim.',
  voiceUnavailable: 'Hindi suportado ng browser ang voice input. I-type muna ang iyong tanong.',
  voiceError: 'Hindi magamit ang mikropono. Suriin ang pahintulot o i-type ang iyong tanong.',
  voiceHint: 'Ang voice input ay gumagamit ng internet. Ang pag-type ay gumagana offline.',
  symptomsHeading: 'Piliin ang nakikita mo',
  symptomsHint: 'I-tap ang larawan kung hindi ka sigurado sa salita.',
  matchesHeading: 'Mga tugma sa offline na knowledge base',
  signsHeading: 'Mga senyales',
  stepsHeading: 'Mga hakbang',
  consultHeading: 'Kumonsulta agad kung:',
  aiHeading: 'Paliwanag ng AI',
  aiWaiting: 'Ipapadala sa hub pagdating sa Wi-Fi ng hub. Makikita ang paliwanag dito.',
  aiBlocked: 'Hindi naipakita ang paliwanag dahil hindi ito pumasa sa safety check.',
  aiNone: 'Walang paliwanag ang hub na ito.',
  aiRequestError: 'Hindi makuha ang paliwanag ng AI. Naka-save pa rin ang tanong.',
  phoneAiHeading: 'AI sa device',
  phoneAiIdle: 'Hindi pa handa',
  phoneAiLoading: 'Naghahanda...',
  phoneAiReady: 'Handa',
  phoneAiError: 'May error',
  phoneAiErrorDetail: 'Hindi magamit ang AI sa device ngayon.',
  phoneAiPrepare: 'Ihanda ang AI',
  phoneAiDevice: 'Tumatakbo sa',
  hubHeading: 'Hub sa barangay o kooperatiba',
  hubUrlLabel: 'Address ng hub',
  hubOnline: 'Konektado sa hub',
  hubOffline: 'Walang hub sa paligid. Ipapadala kapag nakarating ka sa Wi-Fi ng hub.',
  hubSyncNow: 'Ipadala ngayon',
  hubSent: (count: number) => `Naipadala ang ${count} tanong sa hub.`,
  queueHeading: 'Mga tanong',
  queued: 'Naka-pila',
  answered: 'Nasagot',
  saveError: 'Hindi ma-save ang tanong sa device.',
  nothingYet: 'Wala pang tanong.',
  footer: 'Gabay lamang ito. Kumpirmahin sa lokal na agriculturist, BPI, o PhilRice bago gumamit ng anumang pesticide.',
  historyLabel: 'Mga nakaraang usapan',
  closeHistory: 'Isara ang mga nakaraang usapan',
  newConversationLabel: 'Bagong usapan',
  helpLabel: 'Tulong',
  introTitle: 'Ugatan AI',
  introDescription: 'Lokal na katuwang sa pag-aalaga ng palay at mais. Ilarawan ang iyong napansin para makatanggap ng gabay.',
  composerPlaceholder: 'Ilarawan o itanong ang iyong napansin...',
  photoButton: 'Larawan',
  sendLabel: 'Ipadala ang tanong',
  photoUnavailable: 'Paparating pa ang feature para sa larawan. Ilarawan muna ang iyong napansin.',
};

export type Labels = {
  [Key in keyof typeof tl]: (typeof tl)[Key] extends (...args: infer Args) => string
    ? (...args: Args) => string
    : string;
};

const en: Labels = {
  appName: 'Ugatan',
  tagline: 'Field guidance even without a signal. AI runs on your device.',
  crop: 'Crop',
  cropRice: 'Rice',
  cropCorn: 'Corn',
  cropAny: 'Both',
  describe: 'Describe what you see on the crop',
  describePlaceholder: 'Example: round areas of the rice leaf are turning brown and drying',
  look: 'Check',
  voiceStart: 'Speak',
  voiceStop: 'Stop recording',
  voiceListening: 'Listening… Tell us about your crop.',
  voiceUnavailable: 'This browser does not support voice input. Type your question instead.',
  voiceError: 'The microphone is unavailable. Check its permission or type your question.',
  voiceHint: 'Voice input uses the internet. Typing works offline.',
  symptomsHeading: 'Choose what you see',
  symptomsHint: 'Tap a picture if you are unsure of the word.',
  matchesHeading: 'Matches from the offline knowledge base',
  signsHeading: 'Signs',
  stepsHeading: 'Steps',
  consultHeading: 'Consult an expert now if:',
  aiHeading: 'AI explanation',
  aiWaiting: 'This will be sent when the device reaches the hub Wi-Fi. The explanation will appear here.',
  aiBlocked: 'The explanation was hidden because it did not pass the safety check.',
  aiNone: 'This hub did not provide an explanation.',
  aiRequestError: 'The AI explanation could not be retrieved. The question is still saved.',
  phoneAiHeading: 'On-device AI',
  phoneAiIdle: 'Not prepared',
  phoneAiLoading: 'Preparing...',
  phoneAiReady: 'Ready',
  phoneAiError: 'Error',
  phoneAiErrorDetail: 'On-device AI is unavailable right now.',
  phoneAiPrepare: 'Prepare AI',
  phoneAiDevice: 'Running on',
  hubHeading: 'Barangay or cooperative hub',
  hubUrlLabel: 'Hub address',
  hubOnline: 'Connected to the hub',
  hubOffline: 'No hub is nearby. The question will be sent when this device reaches the hub Wi-Fi.',
  hubSyncNow: 'Send now',
  hubSent: (count: number) => `Sent ${count} question${count === 1 ? '' : 's'} to the hub.`,
  queueHeading: 'Questions',
  queued: 'Queued',
  answered: 'Answered',
  saveError: 'The question could not be saved on this device.',
  nothingYet: 'No questions yet.',
  footer: 'This is guidance only. Confirm with a local agriculturist, BPI, or PhilRice before using any pesticide.',
  historyLabel: 'Previous conversations',
  closeHistory: 'Close previous conversations',
  newConversationLabel: 'New conversation',
  helpLabel: 'Help',
  introTitle: 'Ugatan AI',
  introDescription: 'Your local companion for rice and corn. Describe what you noticed to get field guidance.',
  composerPlaceholder: 'Describe or ask about what you noticed...',
  photoButton: 'Photo',
  sendLabel: 'Send question',
  photoUnavailable: 'Photo support is coming later. For now, describe what you noticed.',
};

// shortcut: Cebuano interface copy is developer-authored, replace after native-speaker review.
const ceb: Labels = {
  appName: 'Ugatan',
  tagline: 'Giya sa uma, bisan walay signal. Ang AI modagan sa imong device.',
  crop: 'Tanom',
  cropRice: 'Humay (rice)',
  cropCorn: 'Mais (corn)',
  cropAny: 'Pareho',
  describe: 'Ihulagway ang imong nakita sa tanom',
  describePlaceholder: 'Pananglitan: adunay lingin nga brown nga bahin sa dahon ug nauga',
  look: 'Tan-awa',
  voiceStart: 'Pagsulti',
  voiceStop: 'Hunonga ang pag-record',
  voiceListening: 'Nagpaminaw… Isulti ang bahin sa imong tanom.',
  voiceUnavailable: 'Dili suportado sa browser ang voice input. I-type una ang imong pangutana.',
  voiceError: 'Dili magamit ang mikropono. Susiha ang permiso o i-type ang imong pangutana.',
  voiceHint: 'Ang voice input naggamit og internet. Ang pag-type molihok offline.',
  symptomsHeading: 'Pilia ang imong nakita',
  symptomsHint: 'I-tap ang hulagway kon dili ka sigurado sa pulong.',
  matchesHeading: 'Mga tugma sa offline nga basihan sa kahibalo',
  signsHeading: 'Mga timailhan',
  stepsHeading: 'Mga lakang',
  consultHeading: 'Pakigsulti dayon sa eksperto kung:',
  aiHeading: 'Pasabot sa AI',
  aiWaiting: 'Ipadala kini sa hub inig-abot sa Wi-Fi sa hub. Makita dinhi ang pasabot.',
  aiBlocked: 'Wala gipakita ang pasabot kay wala kini makapasar sa safety check.',
  aiNone: 'Walay gihatag nga pasabot ang maong hub.',
  aiRequestError: 'Wala makuha ang pasabot sa AI. Naka-save gihapon ang pangutana.',
  phoneAiHeading: 'AI sa device',
  phoneAiIdle: 'Wala pa maandam',
  phoneAiLoading: 'Giandam...',
  phoneAiReady: 'Andam',
  phoneAiError: 'Adunay sayop',
  phoneAiErrorDetail: 'Dili magamit ang AI sa device karon.',
  phoneAiPrepare: 'Andama ang AI',
  phoneAiDevice: 'Nagdagan sa',
  hubHeading: 'Hub sa barangay o kooperatiba',
  hubUrlLabel: 'Address sa hub',
  hubOnline: 'Konektado sa hub',
  hubOffline: 'Walay hub sa duol. Ipadala ang pangutana inig-abot sa Wi-Fi sa hub.',
  hubSyncNow: 'Ipadala karon',
  hubSent: (count: number) => `Napadala ang ${count} ka pangutana sa hub.`,
  queueHeading: 'Mga pangutana',
  queued: 'Nakapila',
  answered: 'Natubag',
  saveError: 'Dili ma-save ang pangutana sa device.',
  nothingYet: 'Wala pay pangutana.',
  footer: 'Giya lamang kini. Kumpirmahi sa lokal nga agriculturist, BPI, o PhilRice una mogamit og bisan unsang pesticide.',
  historyLabel: 'Mga miaging panag-istorya',
  closeHistory: 'Sirad-i ang mga miaging panag-istorya',
  newConversationLabel: 'Bag-ong panag-istorya',
  helpLabel: 'Tabang',
  introTitle: 'Ugatan AI',
  introDescription: 'Lokal nga kauban sa pag-atiman sa humay ug mais. Ihulagway ang imong namatikdan aron makakuha og giya.',
  composerPlaceholder: 'Ihulagway o ipangutana ang imong namatikdan...',
  photoButton: 'Hulagway',
  sendLabel: 'Ipadala ang pangutana',
  photoUnavailable: 'Ang feature sa hulagway umaabot pa. Ihulagway una ang imong namatikdan.',
};

export const LABELS: Record<UiLanguage, Labels> = { tl, en, ceb };
export const L = LABELS.tl;

const STORAGE_KEY = 'ugatan.ui-language';
const LOCALES: Record<UiLanguage, 'tl-PH' | 'en-PH' | 'ceb-PH'> = {
  tl: 'tl-PH',
  en: 'en-PH',
  ceb: 'ceb-PH',
};

type ReadStorage = Pick<Storage, 'getItem'>;
type WriteStorage = Pick<Storage, 'setItem'>;

function browserStorage(): Storage | null {
  try {
    return typeof window === 'undefined' ? null : window.localStorage;
  } catch {
    return null;
  }
}

export function isUiLanguage(value: string): value is UiLanguage {
  return UI_LANGUAGES.includes(value as UiLanguage);
}

export function loadUiLanguage(storage: ReadStorage | null = browserStorage()): UiLanguage {
  try {
    const value = storage?.getItem(STORAGE_KEY);
    return value && isUiLanguage(value) ? value : DEFAULT_UI_LANGUAGE;
  } catch {
    return DEFAULT_UI_LANGUAGE;
  }
}

export function saveUiLanguage(
  language: UiLanguage,
  storage: WriteStorage | null = browserStorage(),
): void {
  try {
    storage?.setItem(STORAGE_KEY, language);
  } catch {
    // Storage can be blocked. Keep the in-memory selection for this visit.
  }
}

export function localeFor(language: UiLanguage): 'tl-PH' | 'en-PH' | 'ceb-PH' {
  return LOCALES[language];
}
