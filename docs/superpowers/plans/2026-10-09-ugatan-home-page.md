# Ugatan Home Page Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement the Figma Home frame as Ugatan's responsive, mobile-first frontend with complete Tagalog, English, and Cebuano/Bisaya interface localization while preserving all existing local matching, safety, storage, phone-AI, and hub behavior.

**Architecture:** Keep `App` as the single state and workflow owner, and add one controlled `HomePage` presentation component for the Figma shell. A typed translation map supplies all interface copy; existing answer and history components receive labels explicitly. Figma SVGs and Fontsource variable fonts are bundled into the PWA, with no router, UI kit, icon library, i18n framework, backend work, or data migration.

**Tech Stack:** React 18.3, TypeScript 5.6, Vite 5.4, Tailwind CSS 4.3, Vitest 2.1, Dexie 4.4, vite-plugin-pwa 0.21, pnpm 10.

## Global Constraints

- Implement Figma file `y0NjRXQf011WO4POLFHpmQ`, frame `Home` (`1:2`), with its 1166 x 1113 reference canvas and centered 520 px app shell.
- Mobile phone is the priority: verify 390 x 844, 768 x 1024, 1166 x 1113, and 1440 x 900.
- Make frontend changes only. Do not modify `hub/`, `shared/`, `knowledge/`, model loading, inference, APIs, or database schema.
- Preserve `matchKeywords`, `buildMessages`, IndexedDB records, hub requests, phone-AI behavior, guardrail checks, and the exact required pesticide disclaimer.
- Never add pesticide brands or dosages. Every rendered answer must still end with: “Kumpirmahin sa lokal na agriculturist bago gumamit ng anumang pesticide.”
- Interface languages are `tl`, `en`, and `ceb`; Tagalog is the default. Interface selection must not claim to change knowledge-note or AI-response language.
- Camera/photo controls must disclose that the feature is forthcoming and perform no capture, file, upload, recognition, inference, or network work.
- Use pnpm 10 and Node 20+. Never use npm.
- Do not add a router, UI library, icon library, i18n package, or state-management package.
- Figma SVGs must be downloaded through the Figma asset workflow and stored locally; no temporary Figma URL may remain in source.
- Use Fontsource variable packages `@fontsource-variable/manrope@5.3.0` and `@fontsource-variable/dm-sans@5.3.0`; these bundle local WOFF2 assets and have no package dependencies.
- Do not commit or push unless the user explicitly authorizes it. Every commit step below is a gate: skip it when authorization is absent.
- Preserve unrelated working-tree changes, especially existing edits to `Home.md` and untracked documentation.

## File Structure

### Create

- `web/src/components/HomePage.tsx` — controlled, presentation-only Figma home shell and composer.
- `web/test/labels.test.ts` — language validation, persistence fallback, and locale mapping.
- `web/test/home-page.test.tsx` — server-rendered semantics, translated copy, asset references, and disabled-send checks.
- `web/test/queue-list.test.tsx` — localized queue status rendering.
- `web/test/app.test.tsx` — final home composition and removal of superseded primary controls.
- `web/public/home/history.svg`
- `web/public/home/brand-leaf.svg`
- `web/public/home/new-chat.svg`
- `web/public/home/help.svg`
- `web/public/home/hero-leaf.svg`
- `web/public/home/hero-check.svg`
- `web/public/home/photo-card.svg`
- `web/public/home/privacy.svg`
- `web/public/home/photo-composer.svg`
- `web/public/home/send.svg`
- `docs/agent-notes/2026-10-09-ugatan-home-page-implementation.md` — required final task note.

### Modify

- `web/src/config/labels.ts:1-40` — typed three-language interface copy and safe preference helpers.
- `web/src/components/AnswerView.tsx:1-66` — accept translated interface labels while keeping curated answer content and disclaimer unchanged.
- `web/src/components/QueueList.tsx:1-18` — accept labels and locale.
- `web/src/App.tsx:1-250` — retain workflows, select language, submit across rice and corn, and compose the new home/advanced views.
- `web/src/main.tsx:1-10` — load bundled variable fonts.
- `web/src/index.css:1-49` — Figma tokens, shared focus rules, shell sizing, and responsive safeguards.
- `web/vite.config.ts:1-31` — precache SVG and WOFF2 assets.
- `web/package.json` and `pnpm-lock.yaml` — pin the two zero-dependency Fontsource packages.
- `web/test/answer-view.test.tsx` — pass labels and assert translated interface headings without weakening guardrail assertions.
- `Home.md` — index the required implementation note, newest first.

### Deliberately unchanged

- `shared/src/answer.ts` and all guardrail files
- `web/src/lib/db.ts`, `web/src/lib/llm.ts`, and `web/src/lib/sync.ts`
- `hub/`, `knowledge/`, and `eval/`

---

## Execution preflight

Before Task 1, run `git status --short` and `git diff --name-only -- hub shared knowledge eval`. Keep that output as the baseline for the execution session. Existing changes belong to the user: do not stage, revert, overwrite, or count them as changes from this plan.

---

### Task 1: Typed interface localization

**Files:**
- Create: `web/test/labels.test.ts`
- Modify: `web/src/config/labels.ts:1-40`

**Interfaces:**
- Produces: `UiLanguage = 'tl' | 'en' | 'ceb'`
- Produces: `Labels`, `LABELS: Record<UiLanguage, Labels>`, and backward-compatible `L = LABELS.tl`
- Produces: `isUiLanguage(value: string): value is UiLanguage`
- Produces: `loadUiLanguage(storage?): UiLanguage`, `saveUiLanguage(language, storage?): void`
- Produces: `localeFor(language): 'tl-PH' | 'en-PH' | 'ceb-PH'`
- Consumes: browser `localStorage` only; no server, database, or model state

- [ ] **Step 1: Write the failing localization tests**

Create `web/test/labels.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import {
  DEFAULT_UI_LANGUAGE,
  LABELS,
  UI_LANGUAGES,
  isUiLanguage,
  loadUiLanguage,
  localeFor,
  saveUiLanguage,
} from '../src/config/labels';

function memoryStorage(initial?: string) {
  const values = new Map<string, string>();
  if (initial !== undefined) values.set('ugatan.ui-language', initial);
  return {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => {
      values.set(key, value);
    },
  };
}

describe('interface labels', () => {
  it('defines exactly the same keys in every language', () => {
    const expected = Object.keys(LABELS.tl).sort();
    for (const language of UI_LANGUAGES) {
      expect(Object.keys(LABELS[language]).sort()).toEqual(expected);
    }
  });

  it('contains the three interface languages and Philippine locales', () => {
    expect(UI_LANGUAGES).toEqual(['tl', 'en', 'ceb']);
    expect(localeFor('tl')).toBe('tl-PH');
    expect(localeFor('en')).toBe('en-PH');
    expect(localeFor('ceb')).toBe('ceb-PH');
  });

  it('loads a valid saved preference and falls back to Tagalog', () => {
    expect(loadUiLanguage(memoryStorage('ceb'))).toBe('ceb');
    expect(loadUiLanguage(memoryStorage('invalid'))).toBe(DEFAULT_UI_LANGUAGE);
    expect(loadUiLanguage({ getItem: () => { throw new Error('blocked'); } })).toBe(DEFAULT_UI_LANGUAGE);
  });

  it('saves a preference and ignores blocked storage', () => {
    const storage = memoryStorage();
    saveUiLanguage('en', storage);
    expect(loadUiLanguage(storage)).toBe('en');
    expect(() => saveUiLanguage('ceb', { setItem: () => { throw new Error('blocked'); } })).not.toThrow();
  });

  it('rejects values outside the supported language union', () => {
    expect(isUiLanguage('tl')).toBe(true);
    expect(isUiLanguage('ceb')).toBe(true);
    expect(isUiLanguage('es')).toBe(false);
  });
});
```

- [ ] **Step 2: Run the focused test and verify the missing exports fail**

Run:

```powershell
pnpm.cmd --filter @ugatan/web test -- labels.test.ts
```

Expected: FAIL because `DEFAULT_UI_LANGUAGE`, `LABELS`, and the preference helpers do not exist.

- [ ] **Step 3: Replace the static label object with typed language data**

Replace `web/src/config/labels.ts` with the code in Steps 3a-3c as one file.

#### Step 3a: Types, language options, and Tagalog copy

```ts
export const UI_LANGUAGES = ['tl', 'en', 'ceb'] as const;
export type UiLanguage = (typeof UI_LANGUAGES)[number];

export const DEFAULT_UI_LANGUAGE: UiLanguage = 'tl';
export const LANGUAGE_OPTIONS: readonly { value: UiLanguage; label: string }[] = [
  { value: 'tl', label: 'Tagalog' },
  { value: 'en', label: 'English' },
  { value: 'ceb', label: 'Cebuano / Bisaya' },
];

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
  voiceStop: 'Tapos na',
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
  newConversationLabel: 'Bagong usapan',
  guideLabel: 'Gabay sa bukid',
  demoLabel: 'Demo',
  helpLabel: 'Tulong',
  heroEyebrow: 'KASAMA MO SA BUKID',
  heroTitleLine1: 'Kumusta,',
  heroTitleLine2: 'ano ang maitutulong?',
  heroDescription: 'Magtanong tungkol sa iyong pananim. Ilarawan ang iyong napansin.',
  photoCardTitle: 'Larawan — paparating',
  photoCardDescription: 'Hindi pa available sa demo',
  suggestionsHeading: 'PUWEDE MONG ITANONG',
  suggestionYellow: 'Bakit naninilaw ang mga dahon?',
  suggestionSpots: 'Ano ang gagawin sa may batik na dahon?',
  supportedCrops: 'Palay at mais. Walang account.',
  composerPlaceholder: 'Ilarawan o itanong ang iyong napansin...',
  photoButton: 'Larawan',
  languageLabel: 'Wika ng interface',
  sendLabel: 'Ipadala ang tanong',
  demoDisclaimer: 'Demo lamang · Hindi pa aktuwal na AI diagnosis.',
  photoUnavailable: 'Paparating pa ang feature para sa larawan. Ilarawan muna ang iyong napansin.',
  advancedSummary: 'Mga setting at sync',
  helpAnnouncement: 'Ilarawan ang mga senyales sa pananim, o pumili ng halimbawang tanong.',
};

export type Labels = {
  [Key in keyof typeof tl]: (typeof tl)[Key] extends (...args: infer Args) => string
    ? (...args: Args) => string
    : string;
};
```

#### Step 3b: English and Cebuano/Bisaya copy

```ts
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
  voiceStop: 'Stop',
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
  newConversationLabel: 'New conversation',
  guideLabel: 'Field guide',
  demoLabel: 'Demo',
  helpLabel: 'Help',
  heroEyebrow: 'WITH YOU IN THE FIELD',
  heroTitleLine1: 'Hello,',
  heroTitleLine2: 'how can we help?',
  heroDescription: 'Ask about your crop. Describe what you noticed.',
  photoCardTitle: 'Photo — coming soon',
  photoCardDescription: 'Not available in this demo yet',
  suggestionsHeading: 'QUESTIONS YOU CAN ASK',
  suggestionYellow: 'Why are the leaves turning yellow?',
  suggestionSpots: 'What should I do about spotted leaves?',
  supportedCrops: 'Rice and corn. No account needed.',
  composerPlaceholder: 'Describe or ask about what you noticed...',
  photoButton: 'Photo',
  languageLabel: 'Interface language',
  sendLabel: 'Send question',
  demoDisclaimer: 'Demo only · Not an actual AI diagnosis yet.',
  photoUnavailable: 'Photo support is coming later. For now, describe what you noticed.',
  advancedSummary: 'Settings and sync',
  helpAnnouncement: 'Describe the signs on the crop, or choose an example question.',
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
  voiceStop: 'Hunong',
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
  newConversationLabel: 'Bag-ong panag-istorya',
  guideLabel: 'Giya sa uma',
  demoLabel: 'Demo',
  helpLabel: 'Tabang',
  heroEyebrow: 'KAUBAN NIMO SA UMA',
  heroTitleLine1: 'Kumusta,',
  heroTitleLine2: 'unsa ang among ikatabang?',
  heroDescription: 'Pangutana bahin sa imong tanom. Ihulagway ang imong namatikdan.',
  photoCardTitle: 'Hulagway — umaabot pa',
  photoCardDescription: 'Wala pa kini sa demo',
  suggestionsHeading: 'MAHIMO NIMONG IPANGUTANA',
  suggestionYellow: 'Nganong nangadilaw ang mga dahon?',
  suggestionSpots: 'Unsay buhaton sa dahon nga adunay mga batik?',
  supportedCrops: 'Humay ug mais. Walay account.',
  composerPlaceholder: 'Ihulagway o ipangutana ang imong namatikdan...',
  photoButton: 'Hulagway',
  languageLabel: 'Pinulongan sa interface',
  sendLabel: 'Ipadala ang pangutana',
  demoDisclaimer: 'Demo lamang · Dili pa aktuwal nga AI diagnosis.',
  photoUnavailable: 'Ang feature sa hulagway umaabot pa. Ihulagway una ang imong namatikdan.',
  advancedSummary: 'Mga setting ug sync',
  helpAnnouncement: 'Ihulagway ang mga timailhan sa tanom, o pagpili og pananglit nga pangutana.',
};
```

#### Step 3c: Exports and safe preference helpers

```ts
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
```

- [ ] **Step 4: Run the localization test**

Run: `pnpm.cmd --filter @ugatan/web test -- labels.test.ts`

Expected: PASS, 5 tests.

- [ ] **Step 5: Run the web type/build gate**

Run: `pnpm.cmd --filter @ugatan/web build`

Expected: PASS. The compatibility export `L` keeps existing components compiling until Task 2 migrates visible labels.

- [ ] **Step 6: Commit only when explicitly authorized**

```powershell
git add web/src/config/labels.ts web/test/labels.test.ts
git commit -m 'feat(web): add interface localization'
```

If commits have not been authorized, skip this step and continue with the files unstaged.

---
### Task 2: Localize existing answer and history views

**Files:**
- Modify: `web/src/components/AnswerView.tsx:1-66`
- Modify: `web/src/components/QueueList.tsx:1-18`
- Modify: `web/test/answer-view.test.tsx`
- Create: `web/test/queue-list.test.tsx`

**Interfaces:**
- Consumes: `Labels` and `LABELS` from Task 1
- Changes: `AnswerViewProps` gains `labels: Labels`
- Changes: `QueueList` gains `labels: Labels` and `locale: string`
- Preserves: shared `DISCLAIMER`, `NO_MATCH_TEXT`, `NOT_SURE_TEXT`, and guardrail filtering

- [ ] **Step 1: Extend the answer tests before changing the component**

In `web/test/answer-view.test.tsx`, import `LABELS`:

```ts
import { LABELS } from '../src/config/labels';
```

Add `labels: LABELS.tl` to every existing `AnswerView` render. Then add:

```ts
it.each([
  ['en', LABELS.en, 'Signs', 'Steps', 'Consult an expert now if:'],
  ['ceb', LABELS.ceb, 'Mga timailhan', 'Mga lakang', 'Pakigsulti dayon sa eksperto kung:'],
] as const)('renders %s interface headings without translating safety content', (_language, labels, signs, steps, consult) => {
  const html = renderToStaticMarkup(
    createElement(AnswerView, {
      matches: [KNOWLEDGE[0]],
      clear: true,
      labels,
    }),
  );
  const text = visibleText(html);
  expect(text).toContain(signs);
  expect(text).toContain(steps);
  expect(text).toContain(consult);
  expect(text.endsWith(DISCLAIMER)).toBe(true);
  expect(findViolations(text)).toEqual([]);
});
```

Create `web/test/queue-list.test.tsx`:

```tsx
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { QueueList } from '../src/components/QueueList';
import { LABELS } from '../src/config/labels';

const item = {
  id: 1,
  uid: 'question-1',
  crop: 'any' as const,
  text: 'Why are the leaves yellow?',
  createdAt: '2026-10-09T08:00:00.000Z',
  status: 'queued' as const,
  matchIds: [],
  clear: false,
};

describe('question history', () => {
  it('renders localized status text', () => {
    const english = renderToStaticMarkup(
      createElement(QueueList, { items: [item], labels: LABELS.en, locale: 'en-PH' }),
    );
    const cebuano = renderToStaticMarkup(
      createElement(QueueList, { items: [item], labels: LABELS.ceb, locale: 'ceb-PH' }),
    );
    expect(english).toContain('Queued');
    expect(cebuano).toContain('Nakapila');
  });

  it('renders the localized empty state', () => {
    const html = renderToStaticMarkup(
      createElement(QueueList, { items: [], labels: LABELS.en, locale: 'en-PH' }),
    );
    expect(html).toContain('No questions yet.');
  });
});
```

- [ ] **Step 2: Run the focused tests and verify the prop contract fails**

Run: `pnpm.cmd --filter @ugatan/web test -- answer-view.test.tsx queue-list.test.tsx`

Expected: FAIL because `AnswerView` and `QueueList` do not accept the new label and locale props.

- [ ] **Step 3: Replace AnswerView with the localized prop contract**

Replace `web/src/components/AnswerView.tsx`:

```tsx
import {
  DISCLAIMER,
  NOT_SURE_TEXT,
  NO_MATCH_TEXT,
  findViolations,
  type KnowledgeEntry,
} from '@ugatan/shared';
import type { Labels } from '../config/labels';

export interface AnswerViewProps {
  matches: readonly KnowledgeEntry[];
  clear: boolean;
  labels: Labels;
  explanation?: string | null;
  explanationStatus?: 'ok' | 'blocked' | 'unavailable' | 'phone';
  waitingForHub?: boolean;
}

export function AnswerView({
  matches,
  clear,
  labels,
  explanation,
  explanationStatus,
  waitingForHub,
}: AnswerViewProps) {
  const explanationText = explanation?.trim() ?? '';
  const explanationSafe = explanationText !== '' && findViolations(explanationText).length === 0;
  const blocked = explanationStatus === 'blocked' || (explanationText !== '' && !explanationSafe);

  return (
    <section className='grid gap-3' aria-live='polite'>
      {matches.length === 0 && <p className='m-0 rounded-lg bg-warn p-2.5'>{NO_MATCH_TEXT}</p>}
      {matches.length > 0 && !clear && <p className='m-0 rounded-lg bg-warn p-2.5'>{NOT_SURE_TEXT}</p>}
      {matches.map((entry) => (
        <article key={entry.id} className='mt-3 border-t border-rule pt-3'>
          <h3 className='mb-1.5 text-base font-bold'>{entry.name}</h3>
          <p className='mt-2 mb-0.5 font-semibold text-label'>{labels.signsHeading}</p>
          <ul className='mb-1.5 list-disc pl-5'>
            {entry.signs.map((sign) => <li key={sign}>{sign}</li>)}
          </ul>
          <p className='mt-2 mb-0.5 font-semibold text-label'>{labels.stepsHeading}</p>
          <ol className='mb-1.5 list-decimal pl-5'>
            {entry.actions.map((action) => <li key={action}>{action}</li>)}
          </ol>
          <p className='text-[0.85rem]'><strong>{labels.consultHeading}</strong> {entry.callExpertIf}</p>
        </article>
      ))}
      <div>
        <p className='mt-2 mb-0.5 font-semibold text-label'>{labels.aiHeading}</p>
        {explanationSafe && <p className='m-0 whitespace-pre-wrap leading-[1.5]'>{explanationText}</p>}
        {!explanationSafe && blocked && <p className='text-[0.85rem] text-muted'>{labels.aiBlocked}</p>}
        {!explanationSafe && !blocked && waitingForHub && <p className='text-[0.85rem] text-muted'>{labels.aiWaiting}</p>}
        {!explanationSafe && !blocked && explanationStatus === 'unavailable' && (
          <p className='text-[0.85rem] text-muted'>{labels.aiNone}</p>
        )}
      </div>
      <p className='mb-0 border-t-2 border-leaf pt-2.5 font-semibold'>{DISCLAIMER}</p>
    </section>
  );
}
```

- [ ] **Step 4: Replace QueueList with localized status and date formatting**

Replace `web/src/components/QueueList.tsx`:

```tsx
import type { Labels } from '../config/labels';
import type { QueuedQuestion } from '../lib/db';

interface QueueListProps {
  items: QueuedQuestion[];
  labels: Labels;
  locale: string;
}

export function QueueList({ items, labels, locale }: QueueListProps) {
  if (items.length === 0) return <p className='text-[0.85rem] text-muted'>{labels.nothingYet}</p>;
  return (
    <ul className='m-0 grid list-none gap-2.5 p-0'>
      {items.map((question) => (
        <li key={question.uid} className='border-b border-rule pb-2'>
          <div className='text-[0.85rem] text-muted'>
            {new Date(question.createdAt).toLocaleString(locale)} ·{' '}
            {question.status === 'answered' ? labels.answered : labels.queued}
          </div>
          <div>{question.text}</div>
        </li>
      ))}
    </ul>
  );
}
```

- [ ] **Step 5: Run the focused tests**

Run: `pnpm.cmd --filter @ugatan/web test -- answer-view.test.tsx queue-list.test.tsx`

Expected: PASS. The existing pesticide-brand, dosage, no-match, not-sure, and exact-disclaimer assertions must remain present and passing.

- [ ] **Step 6: Commit only when explicitly authorized**

```powershell
git add web/src/components/AnswerView.tsx web/src/components/QueueList.tsx web/test/answer-view.test.tsx web/test/queue-list.test.tsx
git commit -m 'feat(web): localize answer and history chrome'
```

If commits have not been authorized, skip this step.

---

### Task 3: Bundle Figma assets, fonts, and visual tokens

**Files:**
- Create: ten SVG files under `web/public/home/` listed in the file map
- Modify: `web/package.json`
- Modify: `pnpm-lock.yaml`
- Modify: `web/src/main.tsx:1-10`
- Modify: `web/src/index.css:1-49`
- Modify: `web/vite.config.ts:1-31`

**Interfaces:**
- Produces: stable public asset paths under `/home/*.svg`
- Produces: Tailwind font families `font-sans` and `font-display`
- Preserves: existing token names used by AnswerView and the advanced controls
- Uses: Fontsource variable packages and local WOFF2 output

- [ ] **Step 1: Download the exact Figma SVGs through the Figma asset workflow**

Load the `figma-design-to-code` skill, then call `download_assets` with file key `y0NjRXQf011WO4POLFHpmQ` and node ID `1:2`.

Download the returned SVG URLs immediately and save them by their Figma node IDs:

| Figma node | Size | Local file |
| --- | ---: | --- |
| `1:8` | 24 x 24 | `web/public/home/history.svg` |
| `1:12` | 27 x 27 | `web/public/home/brand-leaf.svg` |
| `1:19` | 24 x 24 | `web/public/home/new-chat.svg` |
| `1:34` | 16 x 16 | `web/public/home/help.svg` |
| `1:44` | 47 x 47 | `web/public/home/hero-leaf.svg` |
| `1:48` | 15 x 15 | `web/public/home/hero-check.svg` |
| `1:61` | 27 x 27 | `web/public/home/photo-card.svg` |
| `1:93` | 18 x 18 | `web/public/home/privacy.svg` |
| `1:114` | 23 x 23 | `web/public/home/photo-composer.svg` |
| `1:123` | 23 x 23 | `web/public/home/send.svg` |

Do not edit SVG paths or root dimensions. Do not use the exported screenshot as an application asset.

- [ ] **Step 2: Verify all ten assets are local and non-empty**

Run:

```powershell
$assets = Get-ChildItem -LiteralPath 'web/public/home' -Filter '*.svg'
if ($assets.Count -ne 10) { throw ('Expected 10 SVG assets, found {0}' -f $assets.Count) }
$empty = $assets | Where-Object Length -eq 0
if ($empty) { throw ('Empty SVG assets: {0}' -f ($empty.Name -join ', ')) }
rg -n 'figma.com/api/mcp/asset' web/src web/public
```

Expected: ten non-empty SVGs and no `rg` matches.

- [ ] **Step 3: Add the two pinned, zero-dependency variable-font packages**

Run:

```powershell
pnpm.cmd add --filter @ugatan/web @fontsource-variable/manrope@5.3.0 @fontsource-variable/dm-sans@5.3.0
```

Expected: `web/package.json` and `pnpm-lock.yaml` change; no unrelated dependency changes. Fontsource documents that default variable imports bundle normal variable faces with unicode-range based WOFF2 loading:

- <https://fontsource.org/docs/getting-started/variable>
- <https://www.npmjs.com/package/@fontsource-variable/manrope>
- <https://www.npmjs.com/package/@fontsource-variable/dm-sans>

- [ ] **Step 4: Load the fonts before application CSS**

Change the imports at the top of `web/src/main.tsx` to:

```tsx
import React from 'react';
import ReactDOM from 'react-dom/client';
import '@fontsource-variable/manrope';
import '@fontsource-variable/dm-sans';
import App from './App';
import './index.css';
```

Keep the existing `ReactDOM.createRoot` render block below those imports byte-for-byte unchanged.

- [ ] **Step 5: Replace the global token and base stylesheet**

Replace `web/src/index.css`:

```css
@import 'tailwindcss';

@theme {
  --font-sans: 'DM Sans Variable', system-ui, -apple-system, 'Segoe UI', sans-serif;
  --font-display: 'Manrope Variable', 'DM Sans Variable', system-ui, sans-serif;
  --color-field: #e9ede5;
  --color-canvas: #e9ede5;
  --color-surface: #fafbf7;
  --color-ink: #26392d;
  --color-leaf: #2b603e;
  --color-leaf-soft: #e4edd9;
  --color-sprout: #f1f5eb;
  --color-sprout-line: #dce6d1;
  --color-rule: #e1e6da;
  --color-line: #d9e1d1;
  --color-mist: #6f7c65;
  --color-muted: #75846b;
  --color-label: #395737;
  --color-warn: #fff6e0;
}

@layer base {
  :root {
    color-scheme: light;
    min-width: 320px;
    min-height: 100%;
  }

  html {
    min-height: 100%;
    background: #e9ede5;
  }

  body {
    @apply m-0 min-h-dvh overflow-x-hidden bg-canvas font-sans text-ink antialiased;
  }

  #root {
    min-height: 100dvh;
  }

  button,
  input,
  select,
  textarea {
    font: inherit;
  }

  button,
  select {
    @apply cursor-pointer;
  }

  :focus-visible {
    outline: 3px solid #6b8b50;
    outline-offset: 3px;
  }
}

@layer components {
  .card {
    @apply mb-3.5 grid gap-3 rounded-xl bg-white p-4 shadow-[0_1px_3px_rgba(0,0,0,0.06)];
  }

  .field {
    @apply grid gap-1.5 text-[0.95rem] font-semibold;
  }

  .input {
    @apply box-border max-w-full rounded-lg border border-line p-2.5;
  }

  .btn {
    @apply cursor-pointer rounded-lg bg-leaf px-4 py-2.5 font-semibold text-white disabled:cursor-default disabled:opacity-50;
  }

  .btn-secondary {
    @apply bg-leaf-soft text-leaf;
  }
}

@media (prefers-reduced-motion: reduce) {
  html {
    scroll-behavior: auto;
  }
}
```

- [ ] **Step 6: Include SVG and WOFF2 in the PWA precache**

In `web/vite.config.ts`, replace the current `globPatterns` line with:

```ts
globPatterns: ['**/*.{js,css,html,png,svg,woff2,webmanifest}'],
```

- [ ] **Step 7: Build and verify emitted font and icon files**

Run:

```powershell
pnpm.cmd --filter @ugatan/web build
$fonts = Get-ChildItem -LiteralPath 'web/dist/assets' -Filter '*.woff2'
if ($fonts.Count -eq 0) { throw 'No WOFF2 fonts were emitted' }
if (-not (Test-Path -LiteralPath 'web/dist/home/send.svg')) { throw 'Home SVGs were not copied' }
rg -n 'home/send.svg|woff2' web/dist/sw.js
```

Expected: build PASS, emitted WOFF2 files exist, all public SVGs are copied, and the generated service worker precache contains both asset types.

- [ ] **Step 8: Commit only when explicitly authorized**

```powershell
git add web/package.json pnpm-lock.yaml web/src/main.tsx web/src/index.css web/vite.config.ts web/public/home
git commit -m 'style(web): add Ugatan home assets and typography'
```

If commits have not been authorized, skip this step.

---

### Task 4: Build the controlled Figma Home presentation

**Files:**
- Create: `web/src/components/HomePage.tsx`
- Create: `web/test/home-page.test.tsx`

**Interfaces:**
- Consumes: `Labels`, `UiLanguage`, `LANGUAGE_OPTIONS`, and `isUiLanguage`
- Consumes: the ten stable `/home/*.svg` paths from Task 3
- Produces: `HomePage(props: HomePageProps)`
- Does not consume: matcher, database, phone-AI, hub, or backend modules

- [ ] **Step 1: Write the server-rendered home contract tests**

Create `web/test/home-page.test.tsx`:

```tsx
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { HomePage, type HomePageProps } from '../src/components/HomePage';
import { LABELS, type UiLanguage } from '../src/config/labels';

function props(language: UiLanguage, text = ''): HomePageProps {
  return {
    labels: LABELS[language],
    language,
    text,
    notice: '',
    onTextChange: () => {},
    onLanguageChange: () => {},
    onSubmit: () => {},
    onSuggestion: () => {},
    onHistory: () => {},
    onNewConversation: () => {},
    onHelp: () => {},
    onPhoto: () => {},
  };
}

describe('Ugatan home page', () => {
  it.each([
    ['tl', 'ano ang maitutulong?'],
    ['en', 'how can we help?'],
    ['ceb', 'unsa ang among ikatabang?'],
  ] as const)('renders the %s interface and selected language', (language, heading) => {
    const html = renderToStaticMarkup(createElement(HomePage, props(language)));
    expect(html).toContain(heading);
    expect(html).toMatch(new RegExp(`value=.${language}. selected`));
    expect(html).toContain('<form');
    expect(html).toContain('<textarea');
    expect(html).toContain('<select');
  });

  it('uses every local Figma icon and no temporary asset URL', () => {
    const html = renderToStaticMarkup(createElement(HomePage, props('tl')));
    expect((html.match(/\/home\//g) ?? []).length).toBe(10);
    expect(html).not.toContain('figma.com/api/mcp/asset');
  });

  it('disables send for blank input and enables it for text', () => {
    const blank = renderToStaticMarkup(createElement(HomePage, props('tl')));
    const filled = renderToStaticMarkup(createElement(HomePage, props('tl', 'Nanilaw ang dahon')));
    expect(blank).toMatch(/disabled/);
    expect(filled).not.toMatch(/disabled/);
  });

  it('labels every icon-only action', () => {
    const html = renderToStaticMarkup(createElement(HomePage, props('en')));
    expect(html).toMatch(/aria-label=.Previous conversations./);
    expect(html).toMatch(/aria-label=.New conversation./);
    expect(html).toMatch(/aria-label=.Send question./);
  });
});
```

- [ ] **Step 2: Run the focused test and verify the component is missing**

Run: `pnpm.cmd --filter @ugatan/web test -- home-page.test.tsx`

Expected: FAIL because `HomePage.tsx` does not exist.

- [ ] **Step 3: Create HomePage as one controlled presentation boundary**

Create `web/src/components/HomePage.tsx` from Steps 3a-3c.

#### Step 3a: Imports, props, and event handlers

```tsx
import { useRef, type FormEvent, type ReactNode } from 'react';
import {
  LANGUAGE_OPTIONS,
  isUiLanguage,
  type Labels,
  type UiLanguage,
} from '../config/labels';

export interface HomePageProps {
  labels: Labels;
  language: UiLanguage;
  text: string;
  notice: string;
  children?: ReactNode;
  advanced?: ReactNode;
  onTextChange: (text: string) => void;
  onLanguageChange: (language: UiLanguage) => void;
  onSubmit: () => void;
  onSuggestion: (question: string) => void;
  onHistory: () => void;
  onNewConversation: () => void;
  onHelp: () => void;
  onPhoto: () => void;
}

export function HomePage(props: HomePageProps) {
  const textarea = useRef<HTMLTextAreaElement>(null);
  const { labels } = props;

  function submit(event: FormEvent) {
    event.preventDefault();
    if (props.text.trim()) props.onSubmit();
  }

  function help() {
    textarea.current?.focus();
    props.onHelp();
  }

  return (
    <div className='min-h-dvh bg-canvas'>
      <div className='relative mx-auto min-h-dvh w-full max-w-[520px] border-x border-[#dbe2d4] bg-surface shadow-[0_0_35px_rgba(43,66,43,0.04)]'>
```

#### Step 3b: Header, status row, and hero

Continue the same return value:

```tsx
        <header className='flex h-20 items-center justify-between border-b border-rule px-[18px] py-[14px]'>
          <button
            type='button'
            className='grid size-12 place-items-center rounded-xl'
            aria-label={labels.historyLabel}
            onClick={props.onHistory}
          >
            <span className='size-6'><img src='/home/history.svg' alt='' /></span>
          </button>
          <div className='flex min-h-12 items-center gap-1.5 px-1'>
            <span className='size-[27px]'><img src='/home/brand-leaf.svg' alt='' /></span>
            <span className='font-display text-[30px] font-extrabold tracking-[-1.6px] text-leaf'>
              ugatan<span className='text-[#8aa460]'>.</span>
            </span>
          </div>
          <button
            type='button'
            className='grid size-12 place-items-center rounded-full border border-[#e0e7d7] bg-[#edf2e7]'
            aria-label={labels.newConversationLabel}
            onClick={props.onNewConversation}
          >
            <span className='size-6'><img src='/home/new-chat.svg' alt='' /></span>
          </button>
        </header>

        <div className='flex min-h-12 items-center gap-[7px] px-[23px] pb-1.5 pt-2.5 text-xs text-[#67765c]'>
          <span className='size-1.5 rounded-full bg-[#81a266]' aria-hidden='true' />
          <span>{labels.guideLabel}</span>
          <span className='text-[#a0ac95]'>·</span>
          <span>{labels.demoLabel}</span>
          <button type='button' className='ml-auto flex min-h-9 items-center gap-1.5 px-[7px]' onClick={help}>
            {labels.helpLabel}
            <span className='size-4'><img src='/home/help.svg' alt='' /></span>
          </button>
        </div>

        <main className='px-4 pb-[250px] pt-12 min-[520px]:px-[29px]'>
          <section className='mx-auto flex max-w-[460px] flex-col items-center text-center'>
            <div className='relative h-[108px] w-28'>
              <span className='absolute inset-0 rotate-[-15deg] rounded-[55px] border border-dashed border-[#c7d5b7]' />
              <span className='absolute left-3.5 top-3 grid size-[84px] place-items-center rounded-full border border-[#dae5cd] bg-[#e9efdf]'>
                <span className='size-[47px]'><img src='/home/hero-leaf.svg' alt='' /></span>
              </span>
              <span className='absolute left-[84px] top-[67px] grid size-7 place-items-center rounded-full border-4 border-surface bg-leaf'>
                <span className='size-[15px]'><img src='/home/hero-check.svg' alt='' /></span>
              </span>
            </div>
            <p className='mb-0 mt-[22px] text-[10px] font-semibold tracking-[2px] text-[#7e8f6d]'>
              {labels.heroEyebrow}
            </p>
            <h1 className='mb-0 mt-[13px] font-display text-[clamp(1.8rem,8vw,2.0625rem)] font-extrabold leading-[1.35] tracking-[-1.2px] text-ink'>
              <span className='block'>{labels.heroTitleLine1}</span>
              <span className='block'>{labels.heroTitleLine2}</span>
            </h1>
            <p className='mb-0 mt-[15px] max-w-[360px] text-[17px] leading-[1.75] text-mist min-[520px]:text-lg'>
              {labels.heroDescription}
            </p>
```

Continue the section:

```tsx
            <button
              type='button'
              className='mt-[31px] flex min-h-[86px] w-full items-center gap-[13px] rounded-[14px] border border-sprout-line bg-sprout px-[15px] py-[17px] text-left'
              onClick={props.onPhoto}
            >
              <span className='grid size-12 shrink-0 place-items-center rounded-xl bg-leaf-soft'>
                <span className='size-[27px]'><img src='/home/photo-card.svg' alt='' /></span>
              </span>
              <span className='min-w-0'>
                <strong className='block text-base font-semibold leading-6 text-label'>{labels.photoCardTitle}</strong>
                <small className='block text-xs leading-[18px] text-muted'>{labels.photoCardDescription}</small>
              </span>
              <span className='ml-auto text-[25px] leading-none text-[#6b8b50]' aria-hidden='true'>+</span>
            </button>

            <h2 className='mb-0 mt-[26px] w-full text-left text-[10px] font-semibold tracking-[1.4px] text-[#8b977e]'>
              {labels.suggestionsHeading}
            </h2>
            <div className='mt-3 grid w-full gap-[9px]'>
              {[labels.suggestionYellow, labels.suggestionSpots].map((question) => (
                <button
                  key={question}
                  type='button'
                  className='flex min-h-[58px] items-center justify-between gap-3 rounded-[11px] border border-rule bg-white px-[15px] py-[14px] text-left text-base leading-6'
                  onClick={() => props.onSuggestion(question)}
                >
                  <span>{question}</span>
                  <span className='shrink-0 text-[21px] text-[#839273]' aria-hidden='true'>↗</span>
                </button>
              ))}
            </div>

            <p className='mb-0 mt-[25px] flex items-center justify-center gap-[7px] text-xs leading-[18px] text-[#8b967e]'>
              <span className='size-[18px]'><img src='/home/privacy.svg' alt='' /></span>
              {labels.supportedCrops}
            </p>
          </section>

          {props.children && <div className='mt-8'>{props.children}</div>}
          {props.advanced && <div className='mt-8'>{props.advanced}</div>}
        </main>
```

#### Step 3c: Fixed, safe-area-aware question composer

Finish the return value and component:

```tsx
        <div className='fixed bottom-0 left-1/2 z-20 w-full max-w-[520px] -translate-x-1/2 bg-gradient-to-b from-transparent from-0% to-surface to-[10%] px-3 pb-[calc(10px+env(safe-area-inset-bottom))] pt-4 min-[520px]:px-[22px]'>
          <form
            className='rounded-[22px] border border-line bg-white px-[15px] pb-2.5 pt-[15px] shadow-[0_3px_7.5px_rgba(49,71,46,0.03)]'
            onSubmit={submit}
          >
            <label className='sr-only' htmlFor='ugatan-question'>{labels.describe}</label>
            <textarea
              ref={textarea}
              id='ugatan-question'
              className='block min-h-[62px] max-h-[150px] w-full resize-y border-0 bg-transparent px-[3px] py-0.5 text-[17px] leading-[1.55] text-ink outline-none placeholder:text-[#8a9480]'
              rows={2}
              value={props.text}
              placeholder={labels.composerPlaceholder}
              onChange={(event) => props.onTextChange(event.target.value)}
            />
            <div className='flex min-h-[58px] items-center gap-3.5 pt-2.5'>
              <button
                type='button'
                className='flex min-h-12 shrink-0 items-center gap-2 rounded-full bg-[#f3f6ef] px-3 py-[9px] text-sm font-medium text-[#596f4e]'
                onClick={props.onPhoto}
              >
                <span className='size-[23px]'><img src='/home/photo-composer.svg' alt='' /></span>
                {labels.photoButton}
              </button>
              <label className='sr-only' htmlFor='ugatan-language'>{labels.languageLabel}</label>
              <select
                id='ugatan-language'
                className='min-h-12 min-w-0 max-w-[132px] rounded-lg border-0 bg-transparent px-1 text-xs text-[#737d6b]'
                value={props.language}
                onChange={(event) => {
                  if (isUiLanguage(event.target.value)) props.onLanguageChange(event.target.value);
                }}
              >
                {LANGUAGE_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>{option.label}</option>
                ))}
              </select>
              <button
                type='submit'
                className='ml-auto grid size-12 shrink-0 place-items-center rounded-full bg-leaf disabled:cursor-default disabled:opacity-40'
                aria-label={labels.sendLabel}
                disabled={!props.text.trim()}
              >
                <span className='size-[23px]'><img src='/home/send.svg' alt='' /></span>
              </button>
            </div>
          </form>
          <p className='m-0 min-h-[28px] px-2 pt-2.5 text-center text-xs leading-[18px] text-[#8f9785]' aria-live='polite'>
            {props.notice || labels.demoDisclaimer}
          </p>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Run the focused presentation tests**

Run: `pnpm.cmd --filter @ugatan/web test -- home-page.test.tsx`

Expected: PASS, 4 tests.

- [ ] **Step 5: Run the web build**

Run: `pnpm.cmd --filter @ugatan/web build`

Expected: PASS with no missing asset, JSX, Tailwind, or TypeScript error.

- [ ] **Step 6: Commit only when explicitly authorized**

```powershell
git add web/src/components/HomePage.tsx web/test/home-page.test.tsx
git commit -m 'feat(web): add responsive Ugatan home view'
```

If commits have not been authorized, skip this step.

---

### Task 5: Integrate HomePage with the existing frontend workflows

**Files:**
- Modify: `web/src/App.tsx:1-250`
- Create: `web/test/app.test.tsx`

**Interfaces:**
- Consumes: `HomePage`, `LABELS`, language preference helpers, localized `AnswerView`, and localized `QueueList`
- Reuses unchanged: `matchKeywords`, `buildMessages`, `notesToExplain`, `db`, `phoneAi`, `hubReachable`, and `syncQueue`
- Sets matcher crop scope to existing `'any'` so the Figma page supports both rice and corn without adding a crop control
- Produces no backend, schema, model, API, or knowledge-base change

- [ ] **Step 1: Write the App composition test**

Create `web/test/app.test.tsx`:

```tsx
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import App from '../src/App';

describe('App home composition', () => {
  it('renders the Figma home, language selector, and collapsed existing tools', () => {
    const html = renderToStaticMarkup(createElement(App));
    expect(html).toContain('id=ugatan-question');
    expect(html).toContain('id=ugatan-language');
    expect(html).toContain('Mga setting at sync');
    expect(html).toContain('Bakit naninilaw ang mga dahon?');
  });

  it('does not expose the removed crop and symptom-picker controls', () => {
    const html = renderToStaticMarkup(createElement(App));
    expect(html).not.toContain('Palay (rice)');
    expect(html).not.toContain('Piliin ang nakikita mo');
  });
});
```

- [ ] **Step 2: Run the focused App test and verify the old page fails**

Run: `pnpm.cmd --filter @ugatan/web test -- app.test.tsx`

Expected: FAIL because the old App has neither `ugatan-question` nor the localized collapsed settings summary.

- [ ] **Step 3: Replace App while preserving its data and safety workflows**

Replace `web/src/App.tsx` with the code from Steps 3a-3d.

#### Step 3a: Imports, types, and state

```tsx
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  buildMessages,
  matchKeywords,
  notesToExplain,
  type KnowledgeEntry,
} from '@ugatan/shared';
import { AnswerView } from './components/AnswerView';
import { HomePage } from './components/HomePage';
import { QueueList } from './components/QueueList';
import { KNOWLEDGE } from './config/knowledge';
import {
  LABELS,
  loadUiLanguage,
  localeFor,
  saveUiLanguage,
  type UiLanguage,
} from './config/labels';
import { PHONE_MODEL } from './config/models';
import { DEFAULT_HUB_URL, loadHubUrl, saveHubUrl } from './config/hub';
import { db, newId, type QueuedQuestion } from './lib/db';
import { phoneAi, type PhoneAiState } from './lib/llm';
import { hubReachable, syncQueue } from './lib/sync';

interface Current {
  id?: number;
  text: string;
  entries: KnowledgeEntry[];
  clear: boolean;
}

export default function App() {
  const crop = 'any' as const;
  const [language, setLanguage] = useState<UiLanguage>(loadUiLanguage);
  const [text, setText] = useState('');
  const [current, setCurrent] = useState<Current | null>(null);
  const [history, setHistory] = useState<QueuedQuestion[]>([]);
  const [ai, setAi] = useState<PhoneAiState>({ status: 'idle', device: '', progress: '', error: '' });
  const [hubUrl, setHubUrl] = useState(loadHubUrl);
  const [hubOnline, setHubOnline] = useState<boolean | null>(null);
  const [notice, setNotice] = useState('');
  const [currentRecord, setCurrentRecord] = useState<QueuedQuestion | null>(null);
  const advanced = useRef<HTMLDetailsElement>(null);
  const historyHeading = useRef<HTMLHeadingElement>(null);
  const labels = LABELS[language];
  const locale = localeFor(language);
```

#### Step 3b: Existing effects, sync, and ask flow

```tsx
  const refresh = useCallback(async () => {
    try {
      const recent = await db.questions.orderBy('id').reverse().limit(20).toArray();
      setHistory(recent);
      if (current?.id !== undefined) {
        setCurrentRecord((await db.questions.get(current.id)) ?? null);
      }
    } catch {
      // IndexedDB can be blocked. The immediate offline answer still works.
    }
  }, [current?.id]);

  useEffect(() => phoneAi.subscribe(setAi), []);

  useEffect(() => {
    saveUiLanguage(language);
    document.documentElement.lang = language;
  }, [language]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const syncNow = useCallback(async () => {
    const result = await syncQueue(hubUrl);
    setHubOnline(result.reachable);
    if (result.sent) setNotice(labels.hubSent(result.sent));
    await refresh();
  }, [hubUrl, labels, refresh]);

  useEffect(() => {
    if (!hubUrl) return;
    void syncNow();
    const onOnline = () => void syncNow();
    window.addEventListener('online', onOnline);
    return () => window.removeEventListener('online', onOnline);
  }, [hubUrl, syncNow]);

  async function ask(question: string, entries: KnowledgeEntry[], clear: boolean) {
    const trimmed = question.trim();
    setCurrent({ text: trimmed, entries, clear });
    setCurrentRecord(null);
    setNotice('');

    let id: number | undefined;
    try {
      id = await db.questions.add({
        uid: newId(),
        crop,
        text: trimmed,
        createdAt: new Date().toISOString(),
        status: 'queued',
        matchIds: entries.map((entry) => entry.id),
        clear,
      });
    } catch {
      setNotice(labels.saveError);
    }
    setCurrent((value) => (value ? { ...value, id } : value));

    if (phoneAi.ready && id !== undefined) {
      try {
        const raw = await phoneAi.generate(
          buildMessages(trimmed, crop, notesToExplain(entries, clear), { sure: clear }),
        );
        await db.questions.update(id, {
          status: 'answered',
          explanation: raw,
          explanationStatus: raw === null ? 'blocked' : 'phone',
          answeredAt: new Date().toISOString(),
        });
      } catch {
        setNotice(labels.aiRequestError);
      }
    } else if (hubUrl && (await hubReachable(hubUrl))) {
      await syncNow();
    }
    await refresh();
  }
```

#### Step 3c: Home actions and localized answer slot

```tsx
  function submitQuestion(question: string) {
    const trimmed = question.trim();
    if (!trimmed) return;
    setText(trimmed);
    const result = matchKeywords(trimmed, crop, KNOWLEDGE);
    void ask(
      trimmed,
      result.matches.map((match) => match.entry),
      result.clear,
    );
  }

  function newConversation() {
    setText('');
    setCurrent(null);
    setCurrentRecord(null);
    setNotice('');
  }

  function showHistory() {
    if (advanced.current) advanced.current.open = true;
    requestAnimationFrame(() => historyHeading.current?.focus());
  }

  function chooseLanguage(next: UiLanguage) {
    setLanguage(next);
    setNotice('');
  }

  const explanation = currentRecord?.explanation ?? null;
  const explanationStatus = currentRecord?.explanationStatus;
  const waitingForHub = !!currentRecord && currentRecord.status === 'queued' && !phoneAi.ready;
  const currentEntries = current?.entries ?? [];
  const aiLabel =
    ai.status === 'idle'
      ? labels.phoneAiIdle
      : ai.status === 'loading'
        ? labels.phoneAiLoading
        : ai.status === 'ready'
          ? labels.phoneAiReady
          : labels.phoneAiError;

  const answer = current ? (
    <section className='card'>
      <h2 className='mt-1 mb-2 text-[1.1rem] font-bold'>{labels.matchesHeading}</h2>
      <AnswerView
        matches={currentEntries}
        clear={current.clear}
        labels={labels}
        explanation={explanation}
        explanationStatus={explanationStatus}
        waitingForHub={waitingForHub}
      />
    </section>
  ) : null;
```

#### Step 3d: Collapsed existing tools and final composition

```tsx
  const advancedTools = (
    <details ref={advanced} className='rounded-xl border border-rule bg-white'>
      <summary className='min-h-12 cursor-pointer px-4 py-3 font-semibold text-label'>
        {labels.advancedSummary}
      </summary>
      <div className='grid gap-3 border-t border-rule p-4'>
        <section className='card'>
          <div className='flex items-center justify-between gap-3'>
            <div>
              <strong>{labels.phoneAiHeading}:</strong> {aiLabel}
              {ai.status === 'ready' && (
                <div className='text-[0.85rem] text-muted'>
                  {labels.phoneAiDevice} {ai.device}. {PHONE_MODEL.id.split('/')[1]}
                </div>
              )}
              {ai.status === 'error' && (
                <div className='text-[0.85rem] text-muted'>{labels.phoneAiErrorDetail}</div>
              )}
            </div>
            {(ai.status === 'idle' || ai.status === 'error') && (
              <button className='btn btn-secondary' type='button' onClick={() => phoneAi.load()}>
                {labels.phoneAiPrepare}
              </button>
            )}
          </div>
        </section>

        <section className='card'>
          <h2 className='mt-1 mb-2 text-[1.1rem] font-bold'>{labels.hubHeading}</h2>
          <label className='field'>
            {labels.hubUrlLabel}
            <input
              className='input'
              type='url'
              inputMode='url'
              placeholder={DEFAULT_HUB_URL || 'http://192.168.1.10:8787'}
              defaultValue={hubUrl}
              onBlur={(event) => {
                saveHubUrl(event.target.value);
                setHubUrl(event.target.value.trim().replace(/\/+$/, ''));
              }}
            />
          </label>
          {hubUrl && hubOnline !== null && (
            <p className='text-[0.85rem]'>{hubOnline ? labels.hubOnline : labels.hubOffline}</p>
          )}
          <button className='btn btn-secondary justify-self-start' type='button' onClick={() => void syncNow()} disabled={!hubUrl}>
            {labels.hubSyncNow}
          </button>
        </section>
```

Continue `advancedTools`, then return `HomePage`:

```tsx
        <section className='card'>
          <h2
            ref={historyHeading}
            className='mt-1 mb-2 text-[1.1rem] font-bold outline-none'
            tabIndex={-1}
          >
            {labels.queueHeading}
          </h2>
          <QueueList items={history} labels={labels} locale={locale} />
        </section>

        <footer className='text-center text-xs leading-5 text-muted'>{labels.footer}</footer>
      </div>
    </details>
  );

  return (
    <HomePage
      labels={labels}
      language={language}
      text={text}
      notice={notice}
      advanced={advancedTools}
      onTextChange={setText}
      onLanguageChange={chooseLanguage}
      onSubmit={() => submitQuestion(text)}
      onSuggestion={submitQuestion}
      onHistory={showHistory}
      onNewConversation={newConversation}
      onHelp={() => setNotice(labels.helpAnnouncement)}
      onPhoto={() => setNotice(labels.photoUnavailable)}
    >
      {answer}
    </HomePage>
  );
}
```

- [ ] **Step 4: Run the App and all web tests**

Run:

```powershell
pnpm.cmd --filter @ugatan/web test
pnpm.cmd --filter @ugatan/web build
```

Expected: both PASS. No test may remove or weaken the pesticide guardrail assertions.

- [ ] **Step 5: Confirm the implementation scope contains no backend change**

Run:

```powershell
git diff --name-only -- hub shared knowledge eval
```

Expected: no new output beyond the execution-preflight baseline. If the baseline already contained user changes in these paths, preserve them and verify this implementation added none.

- [ ] **Step 6: Commit only when explicitly authorized**

```powershell
git add web/src/App.tsx web/test/app.test.tsx
git commit -m 'feat(web): connect the Figma home to existing workflows'
```

If commits have not been authorized, skip this step.

---

### Task 6: Verify and tune responsive fidelity and accessibility

**Files:**
- Modify only if verification exposes an in-scope mismatch:
  - `web/src/components/HomePage.tsx`
  - `web/src/index.css`
  - `web/test/home-page.test.tsx`

**Interfaces:**
- Consumes: Figma frame `1:2` screenshot as the visual target
- Produces: verified phone, tablet, reference, and desktop layouts
- Preserves: all workflow code from Task 5

- [ ] **Step 1: Start the frontend without changing backend configuration**

Run in a persistent terminal:

```powershell
pnpm.cmd --filter @ugatan/shared build
pnpm.cmd --filter @ugatan/web dev -- --host 127.0.0.1 --port 4173
```

Expected: Vite serves `http://127.0.0.1:4173`. Do not start or modify the hub.

- [ ] **Step 2: Refresh the Figma visual target**

Load the `figma-design-to-code` skill, then call Figma `get_screenshot` for file `y0NjRXQf011WO4POLFHpmQ`, node `1:2`, with `maxDimension: 2000`. Keep the screenshot only as a comparison target; never add it to the application.

- [ ] **Step 3: Render and capture all required viewports**

Load the `browser:control-in-app-browser` skill and open `http://127.0.0.1:4173`. Capture:

| Viewport | Acceptance |
| --- | --- |
| 390 x 844 | Full-width shell; 16 px minimum gutters; no clipped translated text; composer above the bottom safe area |
| 768 x 1024 | 520 px centered shell with pale gutters |
| 1166 x 1113 | Matches Figma hierarchy, 520 px shell, 80 px header, 460 px content width, type scale, colors, and composer geometry |
| 1440 x 900 | Same centered 520 px composition; no desktop stretching |

At each viewport evaluate this browser expression:

```js
({
  viewport: [window.innerWidth, window.innerHeight],
  scrollWidth: document.documentElement.scrollWidth,
  clientWidth: document.documentElement.clientWidth,
  hasHorizontalOverflow: document.documentElement.scrollWidth > document.documentElement.clientWidth,
})
```

Expected: `hasHorizontalOverflow` is `false` at all four sizes.

- [ ] **Step 4: Tune only measured visual mismatches**

Compare the 1166 x 1113 capture side by side with Figma and enforce these measured values:

- App shell: 520 px maximum width, `#fafbf7` surface, `#e9ede5` outer canvas.
- Header: 80 px high, 18 px horizontal padding, 48 px controls.
- Status row: at least 48 px high, 23 px horizontal padding.
- Main reference content: 460 px wide inside 29 px gutters.
- Heading: Manrope 800, 33 px at the reference width, 1.35 line height, -1.2 px tracking.
- Body: DM Sans 400, 18 px reference size, approximately 31.5 px line height.
- Photo card: 86 px minimum height and 14 px radius.
- Suggestions: 58 px minimum height and 11 px radius.
- Composer: 520 px maximum outer width, 22 px reference gutters, 22 px card radius, 48 px action targets.
- Essential mobile helper text: at least 12 px.

If a value differs, change the corresponding Tailwind class in `HomePage.tsx` or token in `index.css`, capture again, and rerun:

```powershell
pnpm.cmd --filter @ugatan/web test -- home-page.test.tsx
pnpm.cmd --filter @ugatan/web build
```

Stop tuning once the measured values and screenshot hierarchy match; do not alter out-of-scope answer styling.

- [ ] **Step 5: Exercise all new home interactions in all three languages**

Use the browser to verify this sequence:

1. Blank composer: send is disabled.
2. Enter text: send becomes enabled; submitting creates the existing answer section.
3. Select each suggested question: it submits immediately and uses the selected interface copy.
4. Select English, reload, and confirm English remains selected and `document.documentElement.lang === 'en'`.
5. Select Cebuano, reload, and confirm Cebuano remains selected and `document.documentElement.lang === 'ceb'`.
6. Press Help: focus moves to `#ugatan-question` and the localized help notice appears.
7. Press either photo control: the localized forthcoming notice appears; verify there is no `input[type=file]` and no network request.
8. Press New conversation: the draft/current answer clears while the saved queue remains.
9. Press Previous conversations: the details element opens and focus moves to the queue heading.
10. Expand settings and sync: hub URL persistence, disabled empty-URL sync, and saved history still render.

Do not press Prepare AI during ordinary visual QA because it starts the existing multi-gigabyte model download. Record that retained pre-existing action as not exercised unless a cached model and explicit download approval are available.

- [ ] **Step 6: Verify keyboard and accessibility behavior**

Using keyboard only:

- Tab through history, new conversation, help, photo disclosure, both suggestions, composer photo, language select, send, and advanced summary.
- Confirm every focus indicator is visible and every target is at least 48 x 48 px.
- Confirm Enter submits the form only when text is nonblank.
- Confirm Space/Enter operate buttons and the details summary.
- Confirm English and Cebuano labels wrap instead of clipping.
- Confirm decorative SVGs have empty alt text while icon-only buttons have localized accessible names.
- Confirm no automatic animation occurs. If a browser scroll action is introduced during tuning, disable it under `prefers-reduced-motion: reduce`.

An actual mobile software keyboard cannot be proven from a desktop browser session. If no physical-device run is available, report that limitation rather than marking it verified.

- [ ] **Step 7: Audit every visible asset and temporary URL**

Run:

```powershell
$assets = Get-ChildItem -LiteralPath 'web/public/home' -Filter '*.svg'
$assets | Select-Object Name,Length
rg -n '/home/' web/src/components/HomePage.tsx
rg -n 'figma.com/api/mcp/asset|data:image' web/src web/public
```

Expected: ten non-empty files, ten intended call sites, and no temporary or embedded design assets.

- [ ] **Step 8: Commit visual corrections only when explicitly authorized**

```powershell
git add web/src/components/HomePage.tsx web/src/index.css web/test/home-page.test.tsx
git commit -m 'fix(web): match responsive Ugatan home reference'
```

If commits have not been authorized, skip this step.

---

### Task 7: Run release checks and record the implementation

**Files:**
- Create: `docs/agent-notes/2026-10-09-ugatan-home-page-implementation.md`
- Modify: `Home.md`

**Interfaces:**
- Consumes: completed frontend implementation and verification evidence
- Produces: factual project note and final completion report
- Does not deploy, commit, push, or change backend state

- [ ] **Step 1: Run the complete automated checks**

Run from the repository root:

```powershell
pnpm.cmd build
pnpm.cmd test
```

Expected: both PASS. `pnpm test` includes the root build and all workspace tests. There is no lint script; report lint as unavailable, not as passed.

- [ ] **Step 2: Run final static and scope checks**

```powershell
git diff --check
git diff --name-only -- hub shared knowledge eval
git status --short
```

Expected: `git diff --check` prints nothing; the backend/domain output is unchanged from the preflight baseline; status contains only intended home-page, test, asset, dependency-lock, and documentation files plus the user's pre-existing unrelated changes.

- [ ] **Step 3: Write the required Obsidian implementation note**

Create `docs/agent-notes/2026-10-09-ugatan-home-page-implementation.md` with factual results. If every planned check passes, use:

```markdown
# Ugatan home-page implementation

- Date: 2026-10-09
- Agent: Codex
- Status: done

## Task
Implement the responsive Figma Home frame with Tagalog, English, and Cebuano/Bisaya interface localization, without backend or model changes.

## What changed
- Rebuilt [web/src/App.tsx](../../web/src/App.tsx) around the responsive Figma Home presentation in [web/src/components/HomePage.tsx](../../web/src/components/HomePage.tsx).
- Added typed interface localization in [web/src/config/labels.ts](../../web/src/config/labels.ts).
- Localized [web/src/components/AnswerView.tsx](../../web/src/components/AnswerView.tsx) and [web/src/components/QueueList.tsx](../../web/src/components/QueueList.tsx).
- Added local Figma SVGs, bundled Manrope and DM Sans, responsive tokens, PWA caching, and focused tests.
- No backend, API, model, database-schema, matcher, guardrail, or knowledge-base code changed.

## Decisions
Kept one React page and the existing workflows. The app uses a full-width phone layout and a centered 520 px shell on larger screens. Photo actions disclose that the feature is forthcoming. Interface language does not change curated-note or AI-response language.

## Verification
- `pnpm build`: passed.
- `pnpm test`: passed.
- Browser checks: passed at 390 x 844, 768 x 1024, 1166 x 1113, and 1440 x 900.
- Keyboard navigation, localized controls, local assets, and horizontal overflow checks passed.
- No lint script exists.
- The existing Prepare AI action was not started during UI QA because it can download a multi-gigabyte model.

## Follow-ups
- Have a native Cebuano speaker review the interface copy.
- Verify the fixed composer with a physical mobile software keyboard.
```

If any check is not run or fails, change the note to `partial` and record the exact result instead of copying the successful wording.

- [ ] **Step 4: Index the note newest-first**

Add this line immediately below the explanatory paragraph under `## Agent notes` in `Home.md`:

```markdown
- [[2026-10-09-ugatan-home-page-implementation]] - implemented the responsive Figma Home UI with three interface languages and no backend changes
```

- [ ] **Step 5: Re-run documentation whitespace checks**

Run:

```powershell
git diff --check
Select-String -Path 'docs/agent-notes/2026-10-09-ugatan-home-page-implementation.md' -Pattern '[ \t]+$'
```

Expected: no output.

- [ ] **Step 6: Commit only when explicitly authorized**

```powershell
git add Home.md docs/agent-notes/2026-10-09-ugatan-home-page-implementation.md
git commit -m 'docs: record Ugatan home implementation'
```

If commits have not been authorized, skip this step.

- [ ] **Step 7: Report completion without overstating verification**

The final report must name:

- exact Figma frame `Home` (`1:2`);
- files changed and existing components reused;
- all wired interactions and the unavailable photo integration;
- automated commands and exact results;
- browser viewport, keyboard, and control checks actually completed;
- inferred responsive behavior;
- Code Connect's Starter/View-seat limitation;
- any unrun physical-device, model-download, or staging checks;
- confirmation that no backend or knowledge files changed.

---

## Plan completion criteria

The implementation is complete only when:

- the Figma Home hierarchy and all ten assets are rendered from local files;
- mobile, tablet, reference, and desktop layouts have no horizontal overflow;
- Tagalog, English, and Cebuano interface selections persist and update `html[lang]`;
- typed and suggested questions use the existing matcher and answer path;
- saved history, new conversation, help, unavailable-photo notice, hub settings, and sync remain intentional;
- every answer guardrail test still passes and the exact pesticide disclaimer remains last;
- `pnpm build`, `pnpm test`, and `git diff --check` pass;
- this implementation adds no change under `hub/`, `shared/`, `knowledge/`, or `eval/` beyond the recorded preflight baseline;
- the final note and completion report state all manual limitations honestly.
