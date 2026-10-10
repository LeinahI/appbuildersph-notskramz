import { AUDIO_SAMPLE_RATE, MAX_AUDIO_SECONDS } from '@ugatan/shared';
import { EndOfSpeech, FRAME_SECONDS, rms, trimToSpeech } from './speech';

/** Quiet after speech that ends the recording by itself. */
const END_PAUSE_SECONDS = 1.2;
/** The recording ends when nothing at all is said for this long. */
const NO_SPEECH_SECONDS = 8;

/** True when this browser can record from the microphone. Browsers allow it on localhost and https only. */
export function canRecord(): boolean {
  return typeof navigator !== 'undefined' && !!navigator.mediaDevices?.getUserMedia && typeof MediaRecorder !== 'undefined';
}

/**
 * 16-bit little-endian PCM of these samples (floats between -1 and 1), base64 encoded: the form the hub reads
 * from POST /transcribe. Louder samples are clipped, not wrapped. At most 30 seconds are kept.
 */
export function pcm16Base64(samples: Float32Array): string {
  const count = Math.min(samples.length, MAX_AUDIO_SECONDS * AUDIO_SAMPLE_RATE);
  const view = new DataView(new ArrayBuffer(count * 2));
  for (let i = 0; i < count; i++) {
    const s = Math.max(-1, Math.min(1, samples[i]!));
    view.setInt16(i * 2, Math.round(s < 0 ? s * 32768 : s * 32767), true);
  }
  const bytes = new Uint8Array(view.buffer);
  let binary = '';
  // Blocks keep the argument list of fromCharCode short.
  for (let i = 0; i < bytes.length; i += 0x8000) binary += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return btoa(binary);
}

/** Decodes what MediaRecorder wrote (webm, ogg, or mp4) and resamples it to 16 kHz mono, as the hub's audio model reads it. */
async function toMono16k(blob: Blob): Promise<Float32Array> {
  const context = new AudioContext();
  let decoded: AudioBuffer;
  try {
    decoded = await context.decodeAudioData(await blob.arrayBuffer());
  } finally {
    void context.close();
  }
  const offline = new OfflineAudioContext(1, Math.max(1, Math.ceil(decoded.duration * AUDIO_SAMPLE_RATE)), AUDIO_SAMPLE_RATE);
  const source = offline.createBufferSource();
  source.buffer = decoded;
  // A one-channel destination mixes stereo down to mono.
  source.connect(offline.destination);
  source.start();
  return (await offline.startRendering()).getChannelData(0);
}

export interface Recorder {
  /**
   * Stops recording and returns the speech as base64 PCM for the hub, with the silence cut off and a quiet voice
   * raised. Null when the recording holds no speech, so the app can say so without asking the hub.
   */
  stop(): Promise<string | null>;
  /** Stops recording and throws the audio away. */
  cancel(): void;
}

/**
 * Starts recording from the microphone. `onLimit` runs when the 30-second limit ends the recording, and
 * `onPause` runs when the farmer has spoken and then paused for a moment, or has said nothing for a few seconds; the
 * caller then calls stop() as usual. `onLevel` gets the mic level (0 to 1) for the listening screen.
 * Rejects when the microphone is missing or the farmer refuses it.
 */
export async function startRecorder(
  onLimit: () => void,
  onPause: () => void = () => {},
  onLevel: (level: number) => void = () => {},
): Promise<Recorder> {
  const stream = await navigator.mediaDevices.getUserMedia({ audio: { channelCount: 1, echoCancellation: true, noiseSuppression: true } });
  const recorder = new MediaRecorder(stream);
  const chunks: Blob[] = [];
  recorder.ondataavailable = (e) => {
    if (e.data.size > 0) chunks.push(e.data);
  };
  const stopped = new Promise<void>((resolve) => {
    recorder.onstop = () => resolve();
  });
  const release = () => {
    clearTimeout(timer);
    clearInterval(watcher);
    void meter.close();
    stream.getTracks().forEach((t) => t.stop());
  };

  // Watch the level, so the recording ends by itself when the farmer stops talking.
  const meter = new AudioContext();
  const analyser = meter.createAnalyser();
  analyser.fftSize = 2048;
  meter.createMediaStreamSource(stream).connect(analyser);
  const frame = Math.round(meter.sampleRate * FRAME_SECONDS);
  const window = new Float32Array(analyser.fftSize);
  const end = new EndOfSpeech(END_PAUSE_SECONDS);
  let paused = false;
  let frames = 0;
  const watcher = setInterval(() => {
    analyser.getFloatTimeDomainData(window);
    const level = rms(window, window.length - frame);
    // About -50 dB is silence and -10 dB is loud speech.
    onLevel(Math.max(0, Math.min(1, (20 * Math.log10(level || 1e-6) + 50) / 40)));
    frames++;
    const done = end.push(level) || (!end.heard && frames * FRAME_SECONDS >= NO_SPEECH_SECONDS);
    if (!paused && done) {
      paused = true;
      if (recorder.state === 'recording') recorder.stop();
      onPause();
    }
  }, FRAME_SECONDS * 1000);
  // A little under the limit, so the hub never gets more than 30 seconds.
  const timer = setTimeout(() => {
    if (recorder.state === 'recording') {
      recorder.stop();
      onLimit();
    }
  }, MAX_AUDIO_SECONDS * 1000 - 300);
  // Timeslice so chunks accumulate during recording; a bare start()+stop() often yields an empty blob.
  recorder.start(250);

  return {
    async stop() {
      if (recorder.state === 'recording') {
        try {
          recorder.requestData();
        } catch {
          /* some browsers throw if idle */
        }
        recorder.stop();
      }
      await stopped;
      release();
      if (chunks.length === 0) return null;
      const speech = trimToSpeech(await toMono16k(new Blob(chunks, { type: recorder.mimeType || 'audio/webm' })), AUDIO_SAMPLE_RATE);
      return speech ? pcm16Base64(speech) : null;
    },
    cancel() {
      if (recorder.state === 'recording') recorder.stop();
      release();
    },
  };
}
