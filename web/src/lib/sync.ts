import type { AskRequest, AskResponse } from '@ugatan/shared';
import { db } from './db';

const PROBE_TIMEOUT_MS = 2500;
const ASK_TIMEOUT_MS = 90_000;

/** True when the hub answers its health check. Fails quietly off the hub's Wi-Fi. */
export async function hubReachable(hubUrl: string): Promise<boolean> {
  if (!hubUrl) return false;
  try {
    const res = await fetch(`${hubUrl}/health`, { signal: AbortSignal.timeout(PROBE_TIMEOUT_MS) });
    return res.ok;
  } catch {
    return false;
  }
}

/** Sends every queued question to the hub. Questions that fail stay queued for the next try. */
export async function syncQueue(hubUrl: string): Promise<{ sent: number; failed: number; reachable: boolean }> {
  if (!(await hubReachable(hubUrl))) return { sent: 0, failed: 0, reachable: false };

  const pending = await db.questions.where('status').equals('queued').toArray();
  let sent = 0;
  let failed = 0;
  for (const q of pending) {
    try {
      const body: AskRequest = { uid: q.uid, crop: q.crop, text: q.text };
      const res = await fetch(`${hubUrl}/ask`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(ASK_TIMEOUT_MS),
      });
      if (!res.ok) throw new Error(`Hub returned ${res.status}`);
      const data = (await res.json()) as AskResponse;
      await db.questions.update(q.id!, {
        status: 'answered',
        explanation: data.explanation,
        explanationStatus: data.explanationStatus,
        matcher: data.matcher,
        hubMatchIds: data.matchIds,
        hubClear: data.clear,
        answeredAt: new Date().toISOString(),
        lastError: undefined,
      });
      sent++;
    } catch (err) {
      failed++;
      await db.questions.update(q.id!, { lastError: err instanceof Error ? err.message : String(err) });
    }
  }
  return { sent, failed, reachable: true };
}
