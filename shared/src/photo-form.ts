import { keywordHits, normalize } from './keyword.js';
import { photoOutcome, type PhotoOutcome } from './prompt.js';
import type { KnowledgeEntry } from './types.js';

/** One choice on the photo form, and the sentence it adds to the description. Null adds nothing ("none"). */
type Choice = readonly [label: string, sentence: string | null];

interface FormQuestion {
  question: string;
  choices: readonly Choice[];
}

/** Picked on the plant question when the photo is not of rice or corn. */
const NOT_RICE_OR_CORN = 'not rice or corn';

/**
 * What the vision model is asked about a photo. A small vision model picks from choices far better than it follows
 * wording rules, so it fills in this form and the hub writes the description. Each sentence uses the knowledge
 * base's own keywords, so a photo is matched like a typed report. Every problem in the knowledge base can be
 * reached from at least one choice (checked in shared/test/photo-form.test.ts). No choice names a pest or disease.
 */
export const PHOTO_FORM: readonly FormQuestion[] = [
  {
    question: 'Which plant is it?',
    choices: [
      // Rice first: listed second, the model picked corn for every rice photo (eval/photo.ts, 2026-10-10).
      ['rice', 'Rice plant.'],
      ['corn', 'Corn plant.'],
      ['another plant', NOT_RICE_OR_CORN],
      ['no plant', NOT_RICE_OR_CORN],
      ['cannot tell', 'Plant.'],
    ],
  },
  {
    question: 'Holes or chewing?',
    choices: [
      ['ragged holes', 'Ragged holes in the leaves.'],
      ['small holes in a row', 'Small holes in a row across the leaves.'],
      ['tiny holes at the leaf edge', 'Tiny holes at the leaf edge.'],
      ['cut leaf tips', 'Cut leaf tips, cut as if with scissors.'],
      ['leaves eaten to the midrib', 'Leaves eaten down to the midrib.'],
      ['chewed silk or kernels', 'Chewed silk and damaged kernels at the tip of the ear.'],
      ['none', null],
    ],
  },
  {
    question: 'Where is the damage?',
    choices: [
      ['young leaves in the whorl', 'The damage is in the whorl, on the young leaves.'],
      ['older lower leaves', 'The damage is on the older lower leaves.'],
      ['leaf edges', 'The damage is along the leaf edges.'],
      ['grain heads', 'The damage is on the grain heads.'],
      ['ear tip or silk', 'The damage is at the tip of the ear.'],
      ['stem or stalk', 'The damage is on the stem.'],
      ['base of the plants', 'The damage is at the base of the plants.'],
      ['none', null],
    ],
  },
  {
    question: 'White, pale, or yellow marks on the leaves?',
    choices: [
      ['scraped white patches', 'Scraped white patches on the leaves.'],
      // The same scraping reads as leaffolder on rice and as fall armyworm on corn, so it carries both wordings.
      ['white see-through streaks', 'White see-through streaks, scraped patches where the leaf surface was eaten.'],
      ['yellow or white streaks along the leaf', 'Yellow or white streaks along the leaves.'],
      ['wet-looking stripes on the leaf edges', 'Water soaked stripes along the leaf edges, yellow then white.'],
      ['none', null],
    ],
  },
  {
    question: 'Spots on the leaves?',
    choices: [
      ['diamond-shaped spots with gray centers', 'Diamond shaped spots with gray centers and brown edges.'],
      ['other spots', 'Spots on the leaves.'],
      ['none', null],
    ],
  },
  {
    question: 'Droppings?',
    choices: [
      ['sawdust-like droppings', 'Sawdust like droppings.'],
      ['none', null],
    ],
  },
  {
    question: 'Insects, worms, snails, or eggs you can see?',
    choices: [
      ['caterpillar or worm', 'A caterpillar is visible.'],
      ['small brown insects at the base', 'Small brown insects at the base of the plants.'],
      ['small green insects', 'Small green insects that jump.'],
      ['black shield-shaped bugs', 'Black shield shaped bugs at the base.'],
      ['slender bugs on the grain heads', 'Slender brown bugs on the grain heads.'],
      ['clusters of soft bluish-green insects', 'Colonies in the whorl, insects on the tassel.'],
      ['snails', 'Snails are visible.'],
      ['pink egg clusters', 'Pink egg clusters on the stems.'],
      ['none', null],
    ],
  },
  {
    question: 'Dying, cut, or broken parts?',
    choices: [
      ['orange-brown burned patches', 'Circular patches of plants turn orange brown and look burned.'],
      ['white empty grain heads', 'Whiteheads: white and empty panicles.'],
      ['dead center shoot', 'Dead heart: the central shoot is dry.'],
      ['rolled or folded leaves', 'Rolled leaves, folded into a tube.'],
      ['broken stalks', 'Broken stalks.'],
      ['young plants cut at the base', 'Young plants cut at ground level, gaps in the rows.'],
      ['grain heads cut off', 'Panicles cut at the base, fallen panicles.'],
      ['twisted leaves', 'Twisted leaves that break in the wind.'],
      ['none', null],
    ],
  },
  {
    question: 'Mold or a sticky coating?',
    choices: [
      ['white fuzzy growth under the leaves', 'White fuzzy growth under the leaves.'],
      ['black sooty mold', 'Black sooty mold and honeydew.'],
      ['none', null],
    ],
  },
  {
    question: 'Color and size of the plants?',
    choices: [
      ['yellow-orange leaves', 'Yellow orange leaves.'],
      ['reddish-brown leaves', 'Reddish brown leaves.'],
      ['streaked, mottled leaves', 'Streaked leaves.'],
      ['stunted plants', 'Stunted plants.'],
      ['normal', null],
    ],
  },
  {
    question: 'Grains?',
    choices: [
      ['shriveled or empty grains', 'Shriveled grains, empty grains.'],
      ['none or not visible', null],
    ],
  },
];

/** How each crop's leaves look, shown beside its name on the plant line. */
const PLANT_LOOKS: Record<string, string> = {
  rice: 'thin grass-like leaves in clumps',
  corn: 'broad flat leaves on one thick stalk',
};

/** Choices that add nothing. They are left out of the list the model copies from. */
const EMPTY = new Set(['none', 'normal', 'none or not visible']);

/**
 * The form as the vision model reads it: the plant on the first line, then the signs grouped under their questions.
 * The model copies the signs it sees, so a small model that ignores layout still gives an answer that can be read.
 */
export function photoFormText(form: readonly FormQuestion[] = PHOTO_FORM): string {
  const [plant, ...rest] = form;
  // Each crop is shown with how its leaves look: on 11 test photos the plant was read right 8 times this way,
  // against 4 with the bare names.
  const plants = plant!.choices
    .filter(([label]) => label !== 'cannot tell')
    .map(([label]) => (PLANT_LOOKS[label] ? `${label} (${PLANT_LOOKS[label]})` : label))
    .join(' / ');
  const groups = rest.map((q) => {
    const choices = q.choices.filter(([label]) => !EMPTY.has(label)).map(([label]) => `- ${label}`);
    return [q.question, ...choices].join('\n');
  });
  return [
    `First line, the plant, judged by its leaves: ${plants}`,
    'Then every sign from this list that you can clearly see, one per line, copied exactly:',
    '',
    groups.join('\n\n'),
  ].join('\n');
}

/** What a filled-in form says: the description, "not rice or corn", or no signs. Null when the answer is not a form. */
export type PhotoFormReading = { kind: 'signs'; english: string; picks: string[] } | { kind: 'not-plant' } | { kind: 'no-signs' } | null;

/**
 * Reads the vision model's answer. The plant comes from the first line when that line is a plant choice, and every
 * sign phrase from the list is found anywhere in the answer, whatever the layout. Longer phrases are taken first and
 * used up, so "grain heads" inside "white empty grain heads" is not counted again. "Another plant" counts only when
 * no sign was listed, so one wrong plant pick does not throw away a real reading. Null when the answer has no plant
 * line and fewer than two sign phrases, so the hub reads it as free text.
 */
export function readPhotoForm(raw: string | null | undefined, form: readonly FormQuestion[] = PHOTO_FORM): PhotoFormReading {
  const text = (raw ?? '').trim();
  if (!text) return null;
  const [plantQuestion, ...signQuestions] = form;
  // The plant line of a form is the choice alone ("corn", "Corn plant."). A sentence that only mentions rice or
  // corn ("Rice leaf with spots", "Not rice or corn.") is free text, not a pick.
  const firstLine = normalize(text.split(/\n|,/)[0]!).replace(/^\d+ /, '');
  // A plant line alone ("corn", "Corn plant.") is a pick. A plant word that starts a longer line ("Corn white
  // see-through streaks") is a pick only when sign phrases follow, since "Rice leaf with spots" is free text.
  const exactPlant = plantQuestion!.choices.find(([label]) => [firstLine, firstLine.replace(/ plant$/, '')].includes(normalize(label)));
  const leadingPlant = plantQuestion!.choices.find(([label]) => `${firstLine} `.startsWith(`${normalize(label)} `));

  let rest = ` ${normalize(text)} `;
  const picked: string[] = [];
  const choices = signQuestions
    .flatMap((q) => q.choices)
    .filter(([label, sentence]) => sentence !== null && !EMPTY.has(label))
    .sort((a, b) => b[0].length - a[0].length);
  for (const [label, sentence] of choices) {
    const phrase = ` ${normalize(label)} `;
    if (!rest.includes(phrase)) continue;
    rest = rest.split(phrase).join(' | ');
    picked.push(sentence!);
  }
  // Keep the form's order, so the description reads plant, damage, place, marks, and so on.
  const signs = sentences().filter((s) => picked.includes(s));

  // Without a plant line, one phrase in a sentence may be chance: it takes two copied phrases to read it as a form.
  const plantChoice = exactPlant ?? (signs.length > 0 ? leadingPlant : undefined);
  if (!plantChoice && signs.length < 2) return null;
  if (signs.length === 0) return plantChoice?.[1] === NOT_RICE_OR_CORN ? { kind: 'not-plant' } : { kind: 'no-signs' };
  const plant = plantChoice && plantChoice[1] !== NOT_RICE_OR_CORN ? plantChoice[1]! : 'Plant.';
  return { kind: 'signs', english: [plant, ...signs].join(' '), picks: signs };

  function sentences(): string[] {
    return signQuestions.flatMap((q) => q.choices.map(([, sentence]) => sentence)).filter((x): x is string => x !== null);
  }
}

/**
 * What the vision model's answer means: the form read into a description in the knowledge base's words, or, when
 * the answer is not a form, the answer read as free text.
 */
export function photoSignsOf(raw: string | null | undefined): PhotoOutcome {
  const form = readPhotoForm(raw);
  return form ?? photoOutcome(raw);
}

/**
 * Whether a photo alone is enough to be sure of a problem. The small vision model often picks a sign that is not
 * there, and one picked sign can carry several keywords of the same problem, so keyword counts are not independent
 * evidence. Sure needs at least two different picked signs that point to the problem, and more than point to any
 * other problem. On 31 labeled pest photos this cut sure-and-wrong answers from 18 to 2, and sure-and-right from 8 to 2:
 * the rest become "not sure" and a question, which the farmer's typed answer settles (eval/photo.ts, 2026-10-10).
 */
export function photoIsSure(problemId: string, picks: readonly string[], entries: readonly KnowledgeEntry[]): boolean {
  const support = (entry: KnowledgeEntry) => picks.filter((pick) => keywordHits(entry, pick).length > 0).length;
  const top = entries.find((e) => e.id === problemId);
  if (!top) return false;
  const own = support(top);
  return own >= 2 && entries.every((e) => e.id === problemId || e.crop !== top.crop || support(e) < own);
}
