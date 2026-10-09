import type { Crop } from './types.js';

/** One earlier exchange in the same chat, so the model can answer what the farmer is saying now. */
export interface ChatTurn {
  question: string;
  /** What the app showed as the reply. */
  reply: string;
}

/**
 * How many earlier turns the hub accepts from the phone. The hub keeps the farmer's symptom notes for the whole
 * chat, and only the last few turns go into the model's prompt.
 */
export const MAX_HISTORY_TURNS = 30;

/**
 * Longest photo the hub accepts, as base64 characters. The phone shrinks a photo to about 1024 px on its long
 * side before sending, which is a few hundred KB.
 */
export const MAX_IMAGE_CHARS = 1_400_000;

/**
 * The phone model's Hugging Face repo name. The phone never downloads from Hugging Face: it asks the hub for
 * /models/<this>/<file>, and the hub serves the files from its own GEMMA_MODEL_DIR over the local Wi-Fi.
 */
export const PHONE_MODEL_REPO = 'onnx-community/gemma-4-E2B-it-ONNX';

/**
 * Where the hub serves the Android app's native model (PHONE_LITERT_FILE, Gemma 4 E2B for LiteRT-LM): /models/<this>.
 * The app runs it on the phone's CPU (or GPU) natively, so it does not need WebGPU.
 */
export const PHONE_LITERT_PATH = 'litert/gemma-4-E2B-it.litertlm';

/** Where the hub serves its Laya bundle (LAYA_MODEL_DIR) to phones: /models/<this>/<file>. */
export const PHONE_LAYA_PATH = 'laya';

/** Longest side, in pixels, of a photo the hub will decode. The phone sends less; this stops oversized files. */
export const MAX_IMAGE_SIDE = 4096;

/** How the hub read the photo that came with a question. Absent when the question had no photo. */
export type PhotoStatus =
  /** The hub described signs on the plant and matched on them together with the farmer's words. */
  | 'ok'
  /** The photo is not of rice or corn. */
  | 'not-plant'
  /** The photo shows a rice or corn plant but no clear sign, or is too unclear. */
  | 'no-signs'
  /** The photo could not be decoded, or the description failed the guardrail. */
  | 'unreadable'
  /** This hub cannot read photos. The question was answered from the farmer's words alone. */
  | 'unavailable';

/** POST /ask on the village hub. Body. */
export interface AskRequest {
  /** Client-generated id. Lets the phone match the answer to its queued question. */
  uid: string;
  crop: Crop | 'any';
  /** Farmer's description, in Tagalog, Taglish, or English. */
  text: string;
  /** Earlier turns of this chat, oldest first. Optional. The hub reads the farmer's notes from them when it has no record of the chat. */
  history?: ChatTurn[];
  /** Id of this chat (one per "Bagong usapan"). The hub keeps the chat's notes under it, so every reply reads the whole chat. */
  sessionId?: string;
  /** The knowledge id of a symptom picture the farmer tapped. The hub takes it as the match, instead of matching the label. */
  symptomId?: string;
  /**
   * A photo of the plant: JPEG, base64 encoded, with no "data:" prefix. The hub's vision model writes down the
   * signs it sees, and matching reads them together with `text`. The photo never decides the problem by itself.
   */
  image?: string;
}

/** POST /ask on the village hub. Response. The phone shows its own curated notes plus this explanation. */
export interface AskResponse {
  uid: string;
  /** Which matcher ran on the hub. */
  matcher: 'keyword' | 'laya' | 'hybrid';
  /** Knowledge ids the hub matched, best first. Empty for small talk and when nothing matched. */
  matchIds: string[];
  /** False when the hub is not sure. */
  clear: boolean;
  /** The symptom words the top match was found on, so the app can say why it matched. Empty when none were found. */
  matchedOn: string[];
  /** "ok": explanation generated. "blocked": guardrail dropped it. "unavailable": no explainer on this hub. */
  explanationStatus: 'ok' | 'blocked' | 'unavailable';
  /**
   * Taglish explanation of the matched notes. With no match, Gemma's reply to what the farmer said instead.
   * Null when not available. Already guarded on the hub.
   */
  explanation: string | null;
  /** How the photo was read. Absent when the question came without a photo. */
  photo?: PhotoStatus;
  /** The signs the hub saw in the photo, in plain English, so the app can show what was read. Null unless `photo` is "ok". */
  photoSigns?: string | null;
}

/** Sample rate of the speech the phone sends to POST /transcribe, and the rate the hub's audio model reads. */
export const AUDIO_SAMPLE_RATE = 16000;

/** Longest recording the hub transcribes, in seconds. The audio model reads at most 30 seconds. */
export const MAX_AUDIO_SECONDS = 30;

/** Shortest recording the hub transcribes, in seconds. Anything shorter is a tap, not speech. */
export const MIN_AUDIO_SECONDS = 0.3;

/** Longest `audio` field, in base64 characters: 30 seconds of 16-bit samples at 16 kHz. */
export const MAX_AUDIO_CHARS = Math.ceil((MAX_AUDIO_SECONDS * AUDIO_SAMPLE_RATE * 2) / 3) * 4;

/** POST /transcribe on the village hub. Body. */
export interface TranscribeRequest {
  /** Speech as 16-bit little-endian PCM, mono, 16 kHz, base64 encoded. */
  audio: string;
}

/** How the hub read a recording. */
export type TranscribeStatus =
  /** `text` holds what the farmer said. */
  | 'ok'
  /** The recording had no speech the hub could write down. */
  | 'empty'
  /** The recording could not be read, or the model failed. */
  | 'unreadable'
  /** This hub cannot transcribe speech. */
  | 'unavailable';

/** POST /transcribe on the village hub. Response. The phone puts `text` in the question box for the farmer to check. */
export interface TranscribeResponse {
  status: TranscribeStatus;
  /** What the farmer said, as written text. Null unless `status` is "ok". */
  text: string | null;
}
