import { appendFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';

// Pilot log. One JSON line per event, one file per day. Holds no personal data:
// no IP address, no device or user-agent string, no names. The question text is kept
// so the team can label it later. Farmers should not type their names.
export type LogEvent =
  | { event: 'question'; uid: string; crop: string; text: string }
  | { event: 'match'; uid: string; matcher: string; ids: string[]; clear: boolean }
  | { event: 'escalation'; uid: string; reason: 'no-match' | 'not-sure' }
  | { event: 'explanation'; uid: string; status: string; chars: number }
  | { event: 'error'; where: string; message: string };

export interface Logger {
  write(entry: LogEvent): void;
}

export function fileLogger(dir: string, now: () => Date = () => new Date()): Logger {
  mkdirSync(dir, { recursive: true });
  return {
    write(entry) {
      const ts = now();
      const file = join(dir, `${ts.toISOString().slice(0, 10)}.jsonl`);
      appendFileSync(file, `${JSON.stringify({ ts: ts.toISOString(), ...entry })}\n`, 'utf8');
    },
  };
}

/** Logger for tests and quiet runs. */
export const silentLogger: Logger = { write() {} };
