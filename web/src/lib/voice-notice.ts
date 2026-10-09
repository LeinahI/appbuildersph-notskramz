import type { Labels } from '../config/labels';

/**
 * Voice progress (recording, the hub writing it down) stays inline under the composer. Anything else the voice
 * button reports is a problem the farmer must read, so it shows as a toast that stays until dismissed.
 */
export function voiceNoticeIsInline(message: string, labels: Labels): boolean {
  return message === '' || message === labels.voiceRecording || message === labels.voiceWorking;
}
