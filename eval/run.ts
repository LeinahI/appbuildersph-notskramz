// Scores keyword matching and Laya side by side on eval/descriptions.csv.
// Run from the hub folder: pnpm eval [-- --file descriptions-paraphrase.csv]
// Laya's default bundle is about 1.69 GB. The run downloads it only with --allow-download,
// or uses a local bundle when LAYA_MODEL_DIR is set.
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { loadConfig } from '../hub/src/config.js';
import { loadEnvFile } from '../hub/src/env.js';
import { loadKnowledge } from '../hub/src/knowledge.js';
import { createKeywordMatcher } from '../hub/src/matchers/keyword.js';
import { createHybridMatcher } from '../hub/src/matchers/hybrid.js';
import { createLayaMatcher } from '../hub/src/matchers/laya.js';
import type { Matcher } from '../hub/src/matchers/index.js';
import { parseEvalCsv, type EvalRow, type Lang } from './lib/csv.js';
import { outcomeFor, rate, scoreRun, type Prediction, type Report } from './lib/score.js';

const here = new URL('.', import.meta.url);
const allowDownload = process.argv.includes('--allow-download');
// --file <name> scores another labeled CSV in eval/ (default descriptions.csv).
const fileFlag = process.argv.indexOf('--file');
const csvName = fileFlag >= 0 ? (process.argv[fileFlag + 1] ?? 'descriptions.csv') : 'descriptions.csv';
// Same hub/.env the hub reads, so LAYA_MODEL_DIR is set once per machine. Shell variables win.
loadEnvFile();
const config = loadConfig({ ...process.env, HUB_MATCHER: 'keyword' }, process.cwd());

const passMarkRaw = process.env.LAYA_PASS_MARK?.trim();
const passMark = passMarkRaw ? Number(passMarkRaw) : null;
const thresholdRaw = process.env.LAYA_CONFIDENCE_THRESHOLD?.trim();
// Without a threshold, Laya's raw top answer counts as clear. The report says so.
const confidenceThreshold = thresholdRaw ? Number(thresholdRaw) : 0;

const rows: EvalRow[] = parseEvalCsv(readFileSync(new URL(csvName, here), 'utf8'));
const knowledge = loadKnowledge(new URL('../knowledge/', here));

async function predictAll(matcher: Matcher): Promise<Prediction[]> {
  const out: Prediction[] = [];
  for (const row of rows) out.push(await matcher.match(row.text, 'any'));
  return out;
}

function printReport(title: string, report: Report): void {
  const langs: Lang[] = ['en', 'tl', 'taglish'];
  const line = (label: string, t: Report['overall']) =>
    `${label.padEnd(9)} ${String(t.total).padStart(5)} ${rate(t.correct, t.total).padStart(9)} ${rate(t.wrong, t.total).padStart(9)} ${rate(t.notSure, t.total).padStart(9)}`;
  console.log(`\n${title}`);
  console.log(`${'lang'.padEnd(9)} ${'rows'.padStart(5)} ${'correct'.padStart(9)} ${'wrong'.padStart(9)} ${'not sure'.padStart(9)}`);
  for (const l of langs) console.log(line(l, report.byLang[l]));
  console.log(line('all', report.overall));
}

async function main() {
  const keywordMatcher = createKeywordMatcher(knowledge);
  const keywordPredictions = await predictAll(keywordMatcher);
  const keywordReport = scoreRun(rows, keywordPredictions);
  printReport(`Keyword matching, ${rows.length} labeled descriptions`, keywordReport);

  const results: Record<string, unknown> = { rows: rows.length, keyword: keywordReport };
  const runs: { key: 'laya' | 'hybrid'; report: Report; predictions: Prediction[] }[] = [];

  const layaAllowed = Boolean(config.layaModelDir) || allowDownload;
  if (!layaAllowed) {
    console.log('\nLaya skipped. Set LAYA_MODEL_DIR to a local bundle, or pass --allow-download (about 1.69 GB).');
  } else {
    try {
      const laya = await createLayaMatcher(knowledge, {
        cacheDir: config.layaCache,
        modelDir: config.layaModelDir,
        confidenceThreshold,
      });
      const note = thresholdRaw ? '' : ' (not set, raw top answer counts as clear)';
      const layaPredictions = await predictAll(laya);
      const layaReport = scoreRun(rows, layaPredictions);
      results.laya = layaReport;
      results.layaConfidenceThreshold = confidenceThreshold;
      printReport(`Laya, confidence threshold ${confidenceThreshold}${note}`, layaReport);
      runs.push({ key: 'laya', report: layaReport, predictions: layaPredictions });

      // Keyword first, Laya only where keyword is not sure. Same rule applies to it below.
      const hybridPredictions = await predictAll(createHybridMatcher(keywordMatcher, laya));
      const hybridReport = scoreRun(rows, hybridPredictions);
      results.hybrid = hybridReport;
      printReport(`Hybrid (keyword first, then Laya), confidence threshold ${confidenceThreshold}${note}`, hybridReport);
      runs.push({ key: 'hybrid', report: hybridReport, predictions: hybridPredictions });
    } catch (err) {
      console.log(`\nLaya failed to load: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  // Adoption rule from the business plan: a Laya-based matcher stays on the hub only if it beats keyword
  // matching on the labeled set and fails safe on unclear descriptions. The pass mark is the team's call.
  if (passMark === null || !Number.isFinite(passMark)) {
    console.log('\nNo LAYA_PASS_MARK set. No pass or fail verdict. Set it before the labeled test.');
  } else {
    const verdicts: Record<string, unknown> = {};
    for (const { key, report, predictions } of runs) {
      const rate_ = report.overall.total ? report.overall.correct / report.overall.total : 0;
      const beatsKeyword = report.overall.correct > keywordReport.overall.correct;
      // Fails safe: on "none" rows, the matcher must not give a clear answer.
      const clearWrongOnNone = rows.filter(
        (r, i) => r.expectedId === 'none' && outcomeFor(r.expectedId, predictions[i]) === 'wrong',
      ).length;
      const passes = rate_ >= passMark && beatsKeyword && clearWrongOnNone === 0;
      verdicts[key] = {
        passMark,
        correctRate: rate_,
        correct: report.overall.correct,
        keywordCorrect: keywordReport.overall.correct,
        wrong: report.overall.wrong,
        clearWrongOnNone,
        passes,
      };
      console.log(
        `\n${key} vs pass mark ${passMark}: correct ${(rate_ * 100).toFixed(1)}%, ` +
          `keyword correct ${keywordReport.overall.correct}/${rows.length}, wrong ${report.overall.wrong}, ` +
          `clear wrong on "none" rows ${clearWrongOnNone}. ${passes ? 'PASS' : 'FAIL'}`,
      );
    }
    results.verdict = verdicts;
  }

  const outDir = new URL('results/', here);
  mkdirSync(outDir, { recursive: true });
  const outFile = join(outDir.pathname.replace(/^\/([A-Za-z]:)/, '$1'), `run-${new Date().toISOString().replace(/[:.]/g, '-')}.json`);
  writeFileSync(outFile, JSON.stringify(results, null, 2), 'utf8');
  console.log(`\nWrote ${resolve(outFile)}`);
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
