import { AUDIO_SAMPLE_RATE, MAX_AUDIO_SECONDS, MIN_AUDIO_SECONDS } from '@ugatan/shared';
import { decodeBase64 } from './image.js';

/**
 * Turns the phone's recording (16-bit little-endian PCM, mono, 16 kHz, base64) into the samples the audio model
 * reads, or says what is wrong with it. The length is checked here, so a huge or empty recording never reaches the model.
 */
export function readAudio(value: string): { samples: Float32Array; seconds: number } | { error: string } {
  const bytes = decodeBase64(value);
  if (!bytes) return { error: 'audio must be base64.' };
  if (bytes.length % 2 !== 0) return { error: 'audio must be 16-bit samples.' };
  const count = bytes.length / 2;
  const seconds = count / AUDIO_SAMPLE_RATE;
  if (seconds < MIN_AUDIO_SECONDS) return { error: `audio must be at least ${MIN_AUDIO_SECONDS} seconds long.` };
  if (seconds > MAX_AUDIO_SECONDS) return { error: `audio must be at most ${MAX_AUDIO_SECONDS} seconds long.` };
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const samples = new Float32Array(count);
  for (let i = 0; i < count; i++) samples[i] = view.getInt16(i * 2, true) / 32768;
  return { samples, seconds };
}
