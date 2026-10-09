import { describe, expect, it } from 'vitest';
import { L } from '../src/config/labels';
import { voiceNoticeIsInline } from '../src/lib/voice-notice';

describe('voice notices', () => {
  it('keeps recording and transcription progress inline', () => {
    expect(voiceNoticeIsInline('', L)).toBe(true);
    expect(voiceNoticeIsInline(L.voiceRecording, L)).toBe(true);
    expect(voiceNoticeIsInline(L.voiceWorking, L)).toBe(true);
  });

  it('sends voice problems to a toast', () => {
    for (const message of [L.voiceDenied, L.voiceFailed, L.voiceEmpty, L.voiceUnavailable]) {
      expect(voiceNoticeIsInline(message, L)).toBe(false);
    }
  });
});
