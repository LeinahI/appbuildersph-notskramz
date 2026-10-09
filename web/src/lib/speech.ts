/**
 * Small signal helpers for the microphone. They run on the phone before a recording goes to the hub, so the hub's
 * audio model reads speech and not seconds of silence: it is faster, and the model is less likely to make up
 * words from room noise.
 */

/** Length of one frame the helpers measure, in seconds. */
export const FRAME_SECONDS = 0.02;

/** Silence kept before and after the speech, so a soft first or last word is not cut. */
const PAD_SECONDS = 0.25;
/** A frame is speech when it is this many times louder than the room noise. */
const SPEECH_OVER_NOISE = 3;
/** Never call a frame speech below this level (about -46 dB), however quiet the room is. */
const MIN_SPEECH_RMS = 0.005;
/** The quietest part of the recording (its 10th percentile) stands for the room noise. */
const NOISE_PERCENTILE = 0.1;
/** Speech shorter than this, in seconds, is a bump or a click. */
const MIN_SPEECH_SECONDS = 0.15;
/** The loudest sample is raised toward this level when the recording is quiet. */
const TARGET_PEAK = 0.9;
/** Most gain applied, so room noise is not blown up when the farmer is far from the phone. */
const MAX_GAIN = 8;

/** Root mean square of a block of samples. */
export function rms(samples: Float32Array, start = 0, end = samples.length): number {
  let sum = 0;
  for (let i = start; i < end; i++) sum += samples[i]! * samples[i]!;
  return end > start ? Math.sqrt(sum / (end - start)) : 0;
}

/** The level a frame must pass to count as speech, from the room noise in these frame levels. */
export function speechThreshold(levels: readonly number[]): number {
  if (levels.length === 0) return MIN_SPEECH_RMS;
  const sorted = [...levels].sort((a, b) => a - b);
  const noise = sorted[Math.floor((sorted.length - 1) * NOISE_PERCENTILE)]!;
  return Math.max(noise * SPEECH_OVER_NOISE, MIN_SPEECH_RMS);
}

/**
 * Cuts the silence from the start and end of a recording and raises a quiet one. Returns null when there is no
 * speech in it, so the app can say so without asking the hub. Silence between words is kept.
 */
export function trimToSpeech(samples: Float32Array, sampleRate: number): Float32Array | null {
  const frame = Math.max(1, Math.round(sampleRate * FRAME_SECONDS));
  const frames = Math.floor(samples.length / frame);
  if (frames === 0) return null;
  const levels = Array.from({ length: frames }, (_, i) => rms(samples, i * frame, (i + 1) * frame));
  const threshold = speechThreshold(levels);
  const loud = levels.map((l) => l > threshold);

  // Speech starts at the first run of loud frames long enough to be a word, and ends at the last such run.
  const minRun = Math.max(1, Math.round(MIN_SPEECH_SECONDS / FRAME_SECONDS));
  let first = -1;
  let last = -1;
  for (let i = 0, run = 0; i < frames; i++) {
    run = loud[i] ? run + 1 : 0;
    if (run === minRun && first < 0) first = i - minRun + 1;
    if (run >= minRun) last = i;
  }
  if (first < 0) return null;

  const pad = Math.round(PAD_SECONDS * sampleRate);
  const start = Math.max(0, first * frame - pad);
  const end = Math.min(samples.length, (last + 1) * frame + pad);
  const cut = samples.slice(start, end);

  let peak = 0;
  for (const s of cut) peak = Math.max(peak, Math.abs(s));
  const gain = peak > 0 && peak < TARGET_PEAK ? Math.min(MAX_GAIN, TARGET_PEAK / peak) : 1;
  if (gain > 1) for (let i = 0; i < cut.length; i++) cut[i] = cut[i]! * gain;
  return cut;
}

/**
 * Tells when the farmer has finished speaking, so the app can stop recording by itself. Feed it one level (RMS) per
 * frame. It learns the room noise from the first half second, waits for speech, then reports `done` after a pause.
 */
export class EndOfSpeech {
  private readonly calibration: number[] = [];
  private readonly calibrationFrames = Math.round(0.5 / FRAME_SECONDS);
  private threshold = MIN_SPEECH_RMS;
  private speechFrames = 0;
  private quietFrames = 0;
  private heardSpeech = false;

  /** `pauseSeconds` of quiet after speech ends the recording. */
  constructor(private readonly pauseSeconds = 1.6) {}

  /** True once speech has been heard. */
  get heard(): boolean {
    return this.heardSpeech;
  }

  /** Takes the level of the next frame. Returns true when the recording should stop now. */
  push(level: number): boolean {
    if (this.calibration.length < this.calibrationFrames) {
      this.calibration.push(level);
      if (this.calibration.length === this.calibrationFrames) this.threshold = speechThreshold(this.calibration);
      // A farmer who starts talking at once still counts: loud frames while calibrating are speech.
      if (level <= Math.max(this.threshold, MIN_SPEECH_RMS * 4)) return false;
    }
    if (level > this.threshold) {
      this.speechFrames++;
      this.quietFrames = 0;
      if (this.speechFrames >= Math.round(MIN_SPEECH_SECONDS / FRAME_SECONDS)) this.heardSpeech = true;
      return false;
    }
    if (!this.heardSpeech) return false;
    this.quietFrames++;
    return this.quietFrames * FRAME_SECONDS >= this.pauseSeconds;
  }
}
