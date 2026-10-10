import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { primaryButton } from '../components/auth/fields';
import { loadHubUrl } from '../config/hub';
import { PHONE_LAYA_DOWNLOAD_BYTES, PHONE_MODEL } from '../config/models';
import { saveSetup } from '../config/setup';
import { packagePercent } from '../lib/download-progress';
import { phoneLaya, type LayaState } from '../lib/laya';
import { NO_GPU_MESSAGE, canUseWebGpu } from '../lib/gpu';
import { NATIVE_AI, NATIVE_MODEL_BYTES } from '../lib/native-llm';
import { phoneAi, phoneAiFit, type PhoneAiState } from '../lib/llm';
import { ensureHub } from '../lib/hub-discovery';
import { prepareModels } from '../lib/prepare';
import { type HubCapabilities } from '../lib/sync';

/** How often the connect step asks the hub again while the phone is not on its Wi-Fi. */
const POLL_MS = 3000;

type Hub = { status: 'checking' } | { status: 'offline' } | { status: 'online'; caps: HubCapabilities };

function Step({ n, title, state, children }: { n: number; title: string; state: 'todo' | 'active' | 'done'; children?: React.ReactNode }) {
  return (
    <li className={`rounded-2xl border p-4 ${state === 'active' ? 'border-leaf bg-white' : 'border-line bg-white/60'}`}>
      <div className="flex items-center gap-3">
        <span
          className={`grid size-8 shrink-0 place-items-center rounded-full text-sm font-bold ${
            state === 'done' ? 'bg-leaf text-white' : state === 'active' ? 'bg-sprout text-leaf' : 'bg-soft text-mist'
          }`}
          aria-hidden="true"
        >
          {state === 'done' ? '✓' : n}
        </span>
        <h2 className={`m-0 text-base font-semibold ${state === 'todo' ? 'text-mist' : 'text-ink'}`}>{title}</h2>
      </div>
      {state === 'active' && children ? <div className="mt-3 grid gap-3 text-[0.9375rem] leading-6">{children}</div> : null}
    </li>
  );
}

/** The download step's one line for Ugatan AI: a single bar for the whole package, so the number never starts over. */
function AiProgress({ percent, text, tone }: { percent: number; text: string; tone: 'busy' | 'ready' | 'error' }) {
  return (
    <div className="grid gap-2" role="status">
      <div className="flex items-baseline justify-between gap-3">
        <span className="font-semibold">Ugatan AI</span>
        <span className={`tabular-nums font-semibold ${tone === 'error' ? 'text-accent' : 'text-leaf'}`}>{percent}%</span>
      </div>
      <div
        className="h-2.5 overflow-hidden rounded-full bg-soft"
        role="progressbar"
        aria-label="Ugatan AI"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={percent}
      >
        <div className={`h-full rounded-full transition-[width] duration-300 ${tone === 'error' ? 'bg-accent' : 'bg-leaf'}`} style={{ width: `${percent}%` }} />
      </div>
      <p className={`m-0 text-sm ${tone === 'error' ? 'text-accent' : 'text-mist'}`}>{text}</p>
    </div>
  );
}

/**
 * First setup on the phone: 1. join the hub's Wi-Fi (the laptop), 2. download the AI from the hub, 3. a success alert.
 * It configures itself: the app finds the hub on the Wi-Fi it joined (no address to type) and starts the download.
 * A phone without the memory for the AI skips the download and keeps the offline notes. Nothing uses the internet.
 */
export default function SetupPage() {
  const navigate = useNavigate();
  // The hub the app found on this Wi-Fi. Starts with the last one used, or the build's address.
  const [hubUrl, setHubUrl] = useState(loadHubUrl);
  const fit = phoneAiFit();
  // Gemma runs only on the phone's GPU (WebGPU). Checked before offering the 5 GB download.
  const [gpu, setGpu] = useState<boolean | null>(null);
  useEffect(() => {
    // The Android app runs Gemma natively on the phone's CPU, so it needs no WebGPU.
    if (NATIVE_AI) setGpu(true);
    else void canUseWebGpu(PHONE_MODEL.gpu).then(setGpu);
  }, []);
  const [hub, setHub] = useState<Hub>({ status: 'checking' });
  const [ai, setAi] = useState<PhoneAiState>({ status: 'idle', device: '', progress: '', error: '' });
  const [laya, setLaya] = useState<LayaState>({ status: 'idle', device: '', progress: '', error: '' });
  const [started, setStarted] = useState(phoneAi.ready);
  const [finished, setFinished] = useState<null | 'ready' | 'skipped'>(null);
  const success = useRef<HTMLDialogElement>(null);

  useEffect(() => phoneAi.subscribe(setAi), []);
  useEffect(() => phoneLaya.subscribe(setLaya), []);

  // Step 1: look for the hub until the phone reaches it, so joining the Wi-Fi is all the farmer does. The search tries
  // the Wi-Fi's gateway and the usual hotspot addresses, and keeps the hub it finds.
  useEffect(() => {
    if (hub.status === 'online') return;
    let cancelled = false;
    const check = async () => {
      const found = await ensureHub();
      if (cancelled) return;
      if (found) setHubUrl(found.url);
      setHub(found ? { status: 'online', caps: found.caps } : { status: 'offline' });
    };
    void check();
    const timer = setInterval(() => void check(), POLL_MS);
    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, [hub.status]);

  const caps = hub.status === 'online' ? hub.caps : null;
  const layaOffered = caps?.phoneLaya === true && caps.layaThreshold !== null;
  // The hub offers the model this app runs: the native file for the Android app, the ONNX files for the browser.
  const hubHasModel = NATIVE_AI ? caps?.phoneLitert === true : caps?.phoneModel === true;
  const canDownload = hubHasModel && fit !== 'too-small' && gpu === true;

  // One percent for the whole package (both models), and it only ever goes up.
  const peak = useRef(0);
  const percent = packagePercent([
    { expected: NATIVE_AI ? NATIVE_MODEL_BYTES : PHONE_MODEL.downloadBytes, bytes: ai.bytes, ready: ai.status === 'ready' },
    ...(layaOffered ? [{ expected: PHONE_LAYA_DOWNLOAD_BYTES, bytes: laya.bytes, ready: laya.status === 'ready' || laya.status === 'error' }] : []),
  ]);
  peak.current = Math.max(peak.current, percent);
  const shown = peak.current;

  // Step 2 is done when Gemma is ready and Laya is ready, failed, or not offered.
  useEffect(() => {
    if (finished || ai.status !== 'ready') return;
    if (layaOffered && (laya.status === 'loading' || laya.status === 'idle')) return;
    saveSetup({ ai: 'ready', layaThreshold: layaOffered && laya.status === 'ready' ? caps!.layaThreshold : null, hubUrl });
    setFinished('ready');
  }, [ai.status, laya.status, layaOffered, finished, caps, hubUrl]);

  useEffect(() => {
    if (finished && success.current && !success.current.open) success.current.showModal();
  }, [finished]);

  function download() {
    setStarted(true);
    prepareModels(hubUrl, layaOffered ? caps!.layaThreshold : null);
  }

  // Found the hub and the phone can run the AI: the download starts on its own. A failed download waits for a tap.
  const autoStarted = useRef(false);
  useEffect(() => {
    if (autoStarted.current || started || finished || !canDownload || hub.status !== 'online') return;
    autoStarted.current = true;
    download();
  });

  function skip() {
    saveSetup({ ai: 'skipped', layaThreshold: null, hubUrl });
    setFinished('skipped');
  }

  function begin() {
    success.current?.close();
    navigate('/chat', { replace: true });
  }

  const connected = hub.status === 'online';
  const step2: 'todo' | 'active' | 'done' = finished ? 'done' : connected ? 'active' : 'todo';

  return (
    <div className="min-h-dvh bg-bg px-4 py-8 text-ink">
      <main className="mx-auto grid max-w-md gap-5">
        <header className="text-center">
          <img src="/UgatanLogoSprout.webp" alt="" className="mx-auto h-24 w-auto" />
          <h1 className="m-0 mt-3 text-2xl font-bold">Pag-setup ng Ugatan</h1>
          <p className="m-0 mt-1 text-mist">Isang beses lang. Hindi kailangan ng internet.</p>
        </header>

        <ol className="m-0 grid list-none gap-3 p-0">
          <Step n={1} title="Na-download ang app" state="done" />
          <Step n={2} title="Kumonekta sa Wi-Fi ng hub" state={connected ? 'done' : 'active'}>
            <p className="m-0">
              Buksan ang Wi-Fi ng cellphone at kumonekta sa hotspot ng laptop (ang hub). Pareho ito ng Wi-Fi kung saan mo
              na-download ang app.
            </p>
            <p className="m-0 text-mist" role="status">
              {hub.status === 'checking' ? 'Hinahanap ang hub...' : 'Hindi pa maabot ang hub. Susubukan ulit nang kusa.'}
            </p>
            <button type="button" className={primaryButton} onClick={() => setHub({ status: 'checking' })}>
              Subukan ulit
            </button>
          </Step>
          <Step n={3} title="I-download ang nilalaman" state={step2}>
            {fit === 'too-small' ? (
              <>
                <p className="m-0">
                  Kulang ang memorya ng cellphone na ito para sa AI (kailangan ng mga {PHONE_MODEL.minMemoryGb} GB). Gagana pa
                  rin ang offline na gabay, sa Tagalog, kahit walang internet.
                </p>
                <button type="button" className={primaryButton} onClick={skip}>
                  Ituloy nang walang AI
                </button>
              </>
            ) : gpu === false ? (
              <>
                <p className="m-0">{NO_GPU_MESSAGE}</p>
                <button type="button" className={primaryButton} onClick={skip}>
                  Ituloy nang walang AI
                </button>
              </>
            ) : gpu === null ? (
              <p className="m-0 text-mist" role="status">
                Sinusuri ang cellphone...
              </p>
            ) : !hubHasModel ? (
              <>
                <p className="m-0">Walang AI na maibibigay ang hub na ito. Gagana pa rin ang offline na gabay.</p>
                <button type="button" className={primaryButton} onClick={skip}>
                  Ituloy nang walang AI
                </button>
              </>
            ) : !started ? (
              <>
                <p className="m-0">
                  Ida-download ang Ugatan AI mula sa hub: mga {NATIVE_AI ? (layaOffered ? '4.3 GB' : '2.6 GB') : layaOffered ? '5 GB' : '3.4 GB'} lahat. Panatilihing bukas ang app at nakakonekta sa Wi-Fi ng hub. Maglaan ng sapat na espasyo.
                </p>
                {fit === 'unknown' ? (
                  <p className="m-0 text-mist">Hindi masabi ng cellphone kung sapat ang memorya nito. Kung magsara ang app, laktawan muna ito.</p>
                ) : null}
                <button type="button" className={primaryButton} onClick={download} disabled={!canDownload}>
                  I-download ang nilalaman
                </button>
              </>
            ) : (
              <>
                <AiProgress
                  percent={shown}
                  tone={ai.status === 'error' ? 'error' : 'busy'}
                  text={
                    ai.status === 'error'
                      ? 'Nabigo ang pag-download ng Ugatan AI.'
                      : shown >= 99
                        ? 'Inihahanda ang Ugatan AI...'
                        : 'Nagda-download ang Ugatan AI...'
                  }
                />
                {ai.status === 'error' ? (
                  <>
                    <p className="m-0 text-sm text-mist">
                      Siguraduhing nakakonekta pa rin sa Wi-Fi ng hub at may sapat na espasyo, saka subukan ulit. Gagana pa rin ang offline na gabay.
                    </p>
                    {ai.error ? <p className="m-0 break-words text-xs text-mist">Detalye: {ai.error}</p> : null}
                    <button type="button" className={primaryButton} onClick={download}>
                      Subukan ulit
                    </button>
                    <button type="button" className="mx-auto text-sm font-medium text-sage underline-offset-2 hover:underline" onClick={skip}>
                      Ituloy nang walang AI
                    </button>
                  </>
                ) : (
                  <p className="m-0 text-mist">Maaaring abutin ng ilang minuto. Huwag isara ang app.</p>
                )}
              </>
            )}
          </Step>
        </ol>

        {!finished ? (
          <button type="button" className="mx-auto text-sm font-medium text-sage underline-offset-2 hover:underline" onClick={skip}>
            Laktawan muna (offline na gabay lang)
          </button>
        ) : null}
      </main>

      <dialog
        ref={success}
        className="m-auto w-[min(92vw,24rem)] rounded-3xl border-0 p-6 text-center text-ink shadow-xl backdrop:bg-black/40"
        aria-labelledby="setup-success-title"
        onCancel={(e) => {
          e.preventDefault();
          begin();
        }}
      >
        <div className="mx-auto grid size-16 place-items-center rounded-full bg-leaf text-3xl font-bold text-white" aria-hidden="true">
          ✓
        </div>
        <h2 id="setup-success-title" className="m-0 mt-4 text-xl font-bold">
          Tapos na ang pag-setup!
        </h2>
        <p className="m-0 mt-2 leading-6 text-mist">
          {finished === 'ready'
            ? 'Na-download na ang AI. Magagamit mo na ang Ugatan kahit walang internet at kahit malayo sa hub.'
            : 'Handa na ang offline na gabay. Magagamit mo ito kahit walang internet. Maaari mong i-download ang AI mamaya mula sa Tulong.'}
        </p>
        <button type="button" className={`${primaryButton} mt-5`} onClick={begin} autoFocus>
          Simulan
        </button>
      </dialog>
    </div>
  );
}
