import type { AskRequest, AskResponse, TranscribeRequest, TranscribeResponse } from '@ugatan/shared';
import { db } from './db';

const PROBE_TIMEOUT_MS = 2500;
// A photo is read on the hub's CPU (about 30 s), and the first one may wait for the model to load.
const ASK_TIMEOUT_MS = 180_000;

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
      const body: AskRequest = {
        uid: q.uid,
        crop: q.crop,
        text: q.text,
        ...(q.history?.length ? { history: q.history } : {}),
        ...(q.sessionId ? { sessionId: q.sessionId } : {}),
        ...(q.symptomId ? { symptomId: q.symptomId } : {}),
        ...(q.image ? { image: q.image } : {}),
      };
      const res = await fetch(`${hubUrl}/ask`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(ASK_TIMEOUT_MS),
      });
      if (res.status === 400 || res.status === 413) {
        // The hub refused the request itself, so retrying it would fail the same way. The question is closed with a note.
        await db.questions.update(q.id!, {
          status: 'answered',
          explanation: null,
          explanationStatus: 'unavailable',
          answeredAt: new Date().toISOString(),
          lastError: `Hub: ${res.status}`,
        });
        failed++;
        continue;
      }
      if (!res.ok) throw new Error(`Hub returned ${res.status}`);
      const data = (await res.json()) as AskResponse;
      await db.questions.update(q.id!, {
        status: 'answered',
        explanation: data.explanation,
        explanationStatus: data.explanationStatus,
        matcher: data.matcher,
        hubMatchIds: data.matchIds,
        hubClear: data.clear,
        hubMatchedOn: data.matchedOn ?? [],
        ...(data.photo ? { photo: data.photo, photoSigns: data.photoSigns ?? null } : {}),
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

/** What the hub can read besides text, from its health check. Null when the hub does not answer. */
export interface HubCapabilities {
  vision: boolean;
  voice: boolean;
  /** The hub serves the phone's Gemma files. */
  phoneModel: boolean;
  /** The hub serves Laya's bundle to phones, with the team's confidence threshold. */
  phoneLaya: boolean;
  /** The hub serves the Android app's native model (gemma-4-E2B-it.litertlm). */
  phoneLitert: boolean;
  layaThreshold: number | null;
  /** The hub answers with its AI (Gemma), not with the matched notes only. */
  explainer: boolean;
}

export async function hubCapabilities(hubUrl: string): Promise<HubCapabilities | null> {
  if (!hubUrl) return null;
  try {
    const res = await fetch(`${hubUrl}/health`, { signal: AbortSignal.timeout(PROBE_TIMEOUT_MS) });
    if (!res.ok) return null;
    const info = (await res.json()) as {
      ok?: boolean;
      matcher?: string;
      explainer?: string;
      vision?: string;
      voice?: string;
      phoneModel?: string;
      phoneLaya?: string;
      phoneLitert?: string;
      layaThreshold?: number;
    };
    // Only an Ugatan hub: another service on the same address (a router page) is not a hub.
    if (info.ok !== true || typeof info.matcher !== 'string') return null;
    const threshold = typeof info.layaThreshold === 'number' ? info.layaThreshold : null;
    return {
      explainer: typeof info.explainer === 'string' && info.explainer !== 'off',
      vision: info.vision === 'on',
      voice: info.voice === 'on',
      phoneModel: info.phoneModel === 'on',
      phoneLaya: info.phoneLaya === 'on' && threshold !== null,
      phoneLitert: info.phoneLitert === 'on',
      layaThreshold: threshold,
    };
  } catch {
    return null;
  }
}

/** A recording takes about as long to write down as it took to say, plus the first load of the model. */
const TRANSCRIBE_TIMEOUT_MS = 120_000;

/** Sends a recording (base64 16 kHz PCM) to the hub and returns what it wrote down. Throws when the hub cannot be reached. */
export async function transcribeOnHub(hubUrl: string, audio: string): Promise<TranscribeResponse> {
  const res = await fetch(`${hubUrl}/transcribe`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ audio } satisfies TranscribeRequest),
    signal: AbortSignal.timeout(TRANSCRIBE_TIMEOUT_MS),
  });
  if (!res.ok) throw new Error(`Hub returned ${res.status}`);
  return (await res.json()) as TranscribeResponse;
}
