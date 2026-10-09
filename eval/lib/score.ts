import type { EvalRow, Lang } from './csv.js';

/** What a matcher returned for one description. */
export interface Prediction {
  /** Knowledge ids, best first. */
  ids: string[];
  clear: boolean;
}

export type Outcome = 'correct' | 'wrong' | 'notSure';

export interface Tally {
  total: number;
  correct: number;
  wrong: number;
  notSure: number;
}

export interface Report {
  overall: Tally;
  byLang: Record<Lang, Tally>;
}

/**
 * One description, one outcome.
 * - expected "none": a "not sure" answer is correct (the safe answer). A clear answer is wrong.
 * - expected id: a "not sure" answer is counted as not sure (safe, not wrong). A clear top answer
 *   is correct only when it is the expected id.
 */
export function outcomeFor(expectedId: string, prediction: Prediction): Outcome {
  if (expectedId === 'none') return prediction.clear ? 'wrong' : 'correct';
  if (!prediction.clear || prediction.ids.length === 0) return 'notSure';
  return prediction.ids[0] === expectedId ? 'correct' : 'wrong';
}

function emptyTally(): Tally {
  return { total: 0, correct: 0, wrong: 0, notSure: 0 };
}

function add(t: Tally, outcome: Outcome): void {
  t.total++;
  if (outcome === 'correct') t.correct++;
  else if (outcome === 'wrong') t.wrong++;
  else t.notSure++;
}

/** Scores a matcher's predictions, row by row, overall and per language. */
export function scoreRun(rows: readonly EvalRow[], predictions: readonly Prediction[]): Report {
  if (rows.length !== predictions.length) throw new Error('rows and predictions must be the same length');
  const report: Report = {
    overall: emptyTally(),
    byLang: { en: emptyTally(), tl: emptyTally(), taglish: emptyTally(), ceb: emptyTally() },
  };
  rows.forEach((row, i) => {
    const outcome = outcomeFor(row.expectedId, predictions[i]);
    add(report.overall, outcome);
    add(report.byLang[row.lang], outcome);
  });
  return report;
}

export function rate(n: number, total: number): string {
  return total === 0 ? '-' : `${((100 * n) / total).toFixed(1)}%`;
}
