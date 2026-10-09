/**
 * Laya's input and output for one choice question, for the phone. Ported from @receptron/laya 0.1.2
 * (dist/sequence.js and dist/laya.js, MIT, receptron), which runs on onnxruntime-node and so cannot load in a
 * browser. Only the parts a choice question uses are here; the layout, temperatures, and rounding are unchanged, so
 * the phone gets the same answer the hub does for the same text.
 */

/** Special token ids the sequence needs. */
export interface SpecialIds {
  cls: number;
  sep: number;
  mask: number;
  pad: number;
  maskTok: string;
}

/** laya_config.json, the fields a choice question reads. */
export interface LayaConfig {
  max_len: number;
  head_max_len: number;
  temperature: number[];
  temperature_by_options: Record<string, number>;
}

/** Laya's question types; a choice question is type 0. */
const CHOICE = 0;

/** Python's json.dumps(obj, ensure_ascii=False): ", " / ": " separators, insertion key order. */
export function pyJsonDumps(v: unknown): string {
  if (v === null || v === undefined) return 'null';
  if (typeof v === 'string') return JSON.stringify(v);
  if (typeof v === 'number') return Number.isInteger(v) ? String(v) : JSON.stringify(v);
  if (typeof v === 'boolean') return v ? 'true' : 'false';
  if (Array.isArray(v)) return '[' + v.map(pyJsonDumps).join(', ') + ']';
  return (
    '{' +
    Object.entries(v as Record<string, unknown>)
      .map(([k, x]) => `${JSON.stringify(k)}: ${pyJsonDumps(x)}`)
      .join(', ') +
    '}'
  );
}

function sizeBucket(k: number): string {
  if (k <= 2) return '2';
  if (k <= 5) return '3-5';
  if (k <= 10) return '6-10';
  return '11+';
}

/** Jev-style confidence: 1 - normalized entropy of the answer distribution. */
export function confidenceFromProbs(p: readonly number[]): number {
  const k = p.length;
  if (k < 2) return 1;
  let ent = 0;
  for (const x of p) ent -= x * Math.log(Math.max(x, 1e-12));
  return 1 - ent / Math.log(k);
}

export function softmax(z: readonly number[]): number[] {
  const zmax = Math.max(...z);
  const e = z.map((v) => Math.exp(v - zmax));
  const sum = e.reduce((a, b) => a + b, 0);
  return e.map((v) => v / sum);
}

const round4 = (x: number) => Math.round(x * 1e4) / 1e4;

/**
 * rl_common.build_sequence for a choice question:
 *   [CLS] choice question: instructions [SEP] [MASK] opt0 [MASK] opt1 ... [SEP] state [SEP]
 * Returns the ids and the position of each option's [MASK] marker. Repeated option texts count once, as in Laya.
 */
export function buildChoiceSequence(
  encode: (text: string) => number[],
  ids: SpecialIds,
  state: unknown,
  instructions: string,
  options: readonly string[],
  maxLen: number,
  headMaxLen: number,
): { ids: number[]; markers: number[]; options: string[] } {
  const scrub = (s: string) => s.split(ids.maskTok).join(' ');
  const opts = Object.keys(Object.fromEntries(options.map((o) => [o, null])));
  let headIds = encode(`choice question: ${scrub(instructions)}`);
  let optIds = opts.map((o) => [ids.mask, ...encode(' ' + scrub(o)).slice(0, 48)]);
  const total = (xs: number[][]) => xs.reduce((s, o) => s + o.length, 0);
  let optBudget = headMaxLen - total(optIds);
  if (optBudget < 16) {
    // Too many or too long options: shrink every option text evenly.
    const per = Math.max(4, Math.floor((headMaxLen - 16) / Math.max(1, optIds.length)));
    optIds = optIds.map((o) => o.slice(0, per));
    optBudget = headMaxLen - total(optIds);
  }
  headIds = headIds.slice(0, Math.max(8, optBudget));
  const seq = [ids.cls, ...headIds, ids.sep];
  const markers: number[] = [];
  for (const o of optIds) {
    markers.push(seq.length);
    seq.push(...o);
  }
  seq.push(ids.sep);
  const room = Math.max(0, maxLen - seq.length - 1);
  const serialized = typeof state === 'string' ? state : pyJsonDumps(state);
  const st = encode(scrub(serialized)).slice(0, room);
  seq.push(...st, ids.sep);
  return { ids: seq.slice(0, maxLen), markers: markers.filter((m) => m < maxLen), options: opts };
}

/** The model's inputs for one choice sequence, batch size one. */
export function choiceInputs(ids: readonly number[], markers: readonly number[]) {
  return {
    input_ids: { data: BigInt64Array.from(ids, (v) => BigInt(v)), dims: [1, ids.length] },
    attention_mask: { data: new BigInt64Array(ids.length).fill(1n), dims: [1, ids.length] },
    marker_pos: { data: BigInt64Array.from(markers, (v) => BigInt(v)), dims: [1, markers.length] },
    marker_mask: { data: new Uint8Array(markers.length).fill(1), dims: [1, markers.length] },
    qtype: { data: BigInt64Array.from([BigInt(CHOICE)]), dims: [1] },
  };
}

/** Each option's probability and Laya's confidence, from the logits of a choice question with `k` options. */
export function readChoice(logits: Float32Array, k: number, config: LayaConfig): { probabilities: number[]; confidence: number } {
  const temp = config.temperature_by_options[`choice:${sizeBucket(k)}`] ?? config.temperature[CHOICE] ?? 1;
  const p = softmax(Array.from(logits.subarray(0, k), (v) => v / temp));
  return { probabilities: p.map(round4), confidence: round4(confidenceFromProbs(p)) };
}
