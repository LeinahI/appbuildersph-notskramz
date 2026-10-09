import { transcriptText, type TranscribeResponse } from '@ugatan/shared';
import { readAudio } from './audio.js';
import type { AudioTranscriber } from './explain/index.js';
import type { Logger } from './log.js';

/** Returns the request's audio field, or a message saying what is wrong with the request. */
export function parseTranscribeRequest(value: unknown): string | { audio: string } {
  if (typeof value !== 'object' || value === null) return 'Body must be a JSON object.';
  const { audio } = value as Record<string, unknown>;
  if (typeof audio !== 'string' || audio.length === 0) return 'audio is required.';
  return { audio };
}

/**
 * Writes down what the farmer said. The words go back to the phone's question box and nowhere else, and the log
 * keeps only the length of the text, not the words. A recording the hub cannot read is answered, not thrown.
 */
export async function transcribeSpeech(
  audio: string,
  deps: { transcriber?: AudioTranscriber; logger: Logger },
): Promise<TranscribeResponse> {
  const { transcriber, logger } = deps;
  if (!transcriber) return { status: 'unavailable', text: null };
  const read = readAudio(audio);
  if ('error' in read) {
    logger.write({ event: 'voice', status: 'unreadable', reason: read.error });
    return { status: 'unreadable', text: null };
  }
  const started = Date.now();
  try {
    const text = transcriptText(await transcriber.transcribe(read.samples));
    const ms = Date.now() - started;
    if (!text) {
      logger.write({ event: 'voice', status: 'empty', seconds: read.seconds, ms });
      return { status: 'empty', text: null };
    }
    logger.write({ event: 'voice', status: 'ok', seconds: read.seconds, chars: text.length, ms });
    return { status: 'ok', text };
  } catch (err) {
    logger.write({ event: 'error', where: 'voice', message: err instanceof Error ? err.message : String(err) });
    return { status: 'unreadable', text: null };
  }
}
