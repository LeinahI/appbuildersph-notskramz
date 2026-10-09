import { forwardRef, useEffect, useRef, useState, type PointerEvent as ReactPointerEvent, type ReactNode } from 'react';
import { DISCLAIMER } from '@ugatan/shared';
import { L } from '../config/labels';
import { PHONE_MODEL } from '../config/models';
import { packagePercent } from '../lib/download-progress';
import type { LayaState } from '../lib/laya';
import type { MemoryFit, PhoneAiState } from '../lib/llm';
import { NATIVE_AI, NATIVE_MODEL_BYTES } from '../lib/native-llm';

interface HelpDialogProps {
  ai: PhoneAiState;
  /** Laya, the phone's matcher for questions keyword is not sure of. Loads after Gemma. */
  laya?: LayaState;
  /** Whether this phone has the memory for the model. A phone without it is never offered the download. */
  fit?: MemoryFit;
  onPrepareAi: () => void;
}

/** How far a downward drag on the handle must go before the sheet closes. */
const SWIPE_CLOSE_PX = 90;

function Icon({ children, className = 'size-5' }: { children: ReactNode; className?: string }) {
  return (
    <svg className={className} viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='1.7' strokeLinecap='round' strokeLinejoin='round' aria-hidden='true'>
      {children}
    </svg>
  );
}

const MicIcon = () => (
  <Icon>
    <rect x='9' y='3' width='6' height='11' rx='3' />
    <path d='M5.5 11a6.5 6.5 0 0 0 13 0M12 17.5V21' />
  </Icon>
);
const CameraIcon = () => (
  <Icon>
    <path d='M4 8.5A1.5 1.5 0 0 1 5.5 7h2l1.3-2h6.4l1.3 2h2A1.5 1.5 0 0 1 20 8.5v9a1.5 1.5 0 0 1-1.5 1.5h-13A1.5 1.5 0 0 1 4 17.5v-9Z' />
    <circle cx='12' cy='13' r='3.3' />
  </Icon>
);
const LeafIcon = () => (
  <Icon>
    <path d='M5 19c0-8 5-13 14-14 0 9-5 14-13 14' />
    <path d='M5 19c2-4 5-7 9-9' />
  </Icon>
);
const WifiIcon = () => (
  <Icon>
    <path d='M3.5 9.5a12 12 0 0 1 17 0M6.5 12.8a8 8 0 0 1 11 0M9.4 16a4 4 0 0 1 5.2 0' />
    <circle cx='12' cy='19' r='.9' fill='currentColor' />
  </Icon>
);
const BookIcon = () => (
  <Icon>
    <path d='M4 5.5A1.5 1.5 0 0 1 5.5 4H11v15H5.5A1.5 1.5 0 0 0 4 20.5v-15ZM20 5.5A1.5 1.5 0 0 0 18.5 4H13v15h5.5a1.5 1.5 0 0 1 1.5 1.5v-15Z' />
  </Icon>
);
const ChipIcon = () => (
  <Icon>
    <rect x='7' y='7' width='10' height='10' rx='2' />
    <path d='M10 3v2M14 3v2M10 19v2M14 19v2M3 10h2M3 14h2M19 10h2M19 14h2' />
  </Icon>
);
const ChevronIcon = () => (
  <Icon className='size-5 shrink-0 transition-transform group-open:rotate-180'>
    <path d='m6 9 6 6 6-6' />
  </Icon>
);

function StepCard({ n, title, icons, children }: { n: number; title: string; icons: ReactNode; children: ReactNode }) {
  return (
    <li className='flex gap-3 rounded-2xl border border-sprout-line bg-paper p-3.5'>
      <span className='grid size-8 shrink-0 place-items-center rounded-full bg-leaf text-sm font-bold text-white' aria-hidden='true'>{n}</span>
      <div className='grid min-w-0 flex-1 gap-1.5'>
        <div className='flex items-center justify-between gap-2'>
          <h3 className='m-0 text-[0.9375rem] font-bold leading-5 text-ink'>{title}</h3>
          <span className='flex shrink-0 items-center gap-1 text-leaf'>{icons}</span>
        </div>
        <p className='m-0 text-sm leading-6 text-mist'>{children}</p>
      </div>
    </li>
  );
}

function FeatureCard({ icon, title, badge, children }: { icon: ReactNode; title: string; badge?: string; children: ReactNode }) {
  return (
    <div className='grid gap-1.5 rounded-2xl bg-sprout p-3.5'>
      <div className='flex items-center gap-2.5'>
        <span className='grid size-9 shrink-0 place-items-center rounded-xl bg-leaf-soft text-leaf'>{icon}</span>
        <h3 className='m-0 min-w-0 flex-1 text-[0.9375rem] font-bold leading-5 text-ink'>{title}</h3>
        {badge && <span className='shrink-0 rounded-full border border-sprout-line bg-paper px-2.5 py-0.5 text-xs font-semibold leading-4 text-leaf'>{badge}</span>}
      </div>
      <p className='m-0 text-sm leading-6 text-mist'>{children}</p>
    </div>
  );
}

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <div className='rounded-xl bg-sprout px-3 py-2'>
      <dt className='text-xs font-semibold leading-4 text-mist'>{label}</dt>
      <dd className='m-0 text-sm font-bold leading-5 text-ink'>{value}</dd>
    </div>
  );
}

export const HelpDialog = forwardRef<HTMLDialogElement, HelpDialogProps>(function HelpDialog(
  { ai, laya, fit = 'unknown', onPrepareAi },
  ref,
) {
  const [setupOpen, setSetupOpen] = useState(false);
  // Open the setup module by itself while it has something to report, so progress and errors are never hidden.
  useEffect(() => {
    if (ai.status === 'loading' || ai.status === 'error') setSetupOpen(true);
  }, [ai.status]);

  // The bar only ever goes up, even when a later file raises the expected total.
  const peak = useRef(0);
  const percent = ai.status === 'ready'
    ? 100
    : packagePercent([{ expected: NATIVE_AI ? NATIVE_MODEL_BYTES : PHONE_MODEL.downloadBytes, bytes: ai.bytes, ready: false }]);
  peak.current = ai.status === 'loading' ? Math.max(peak.current, percent) : percent;
  const shown = peak.current;

  const stateLabel = {
    idle: fit === 'too-small' ? 'Hindi magagamit' : 'Hindi pa handa',
    loading: 'Naghahanda',
    ready: 'Handa na',
    error: 'May error',
  }[ai.status];
  const stateTone = ai.status === 'ready'
    ? 'border-sprout-line bg-leaf-soft text-leaf'
    : ai.status === 'error' || fit === 'too-small'
      ? 'border-[#d9b25a] bg-warn text-ink'
      : 'border-rule bg-paper text-mist';

  // Swipe the handle (or the title bar) down to close. The sheet follows the finger and springs back if released early.
  const drag = useRef<{ startY: number; dy: number } | null>(null);
  function dialogOf(event: ReactPointerEvent<HTMLElement>) {
    return event.currentTarget.closest('dialog') as HTMLDialogElement;
  }
  function onDragStart(event: ReactPointerEvent<HTMLElement>) {
    if ((event.target as HTMLElement).closest('button')) return;
    drag.current = { startY: event.clientY, dy: 0 };
    event.currentTarget.setPointerCapture(event.pointerId);
    dialogOf(event).style.transition = 'none';
  }
  function onDragMove(event: ReactPointerEvent<HTMLElement>) {
    if (!drag.current) return;
    drag.current.dy = Math.max(0, event.clientY - drag.current.startY);
    dialogOf(event).style.transform = `translateY(${drag.current.dy}px)`;
  }
  function onDragEnd(event: ReactPointerEvent<HTMLElement>) {
    if (!drag.current) return;
    const { dy } = drag.current;
    drag.current = null;
    const dialog = dialogOf(event);
    dialog.style.transition = '';
    dialog.style.transform = '';
    if (dy > SWIPE_CLOSE_PX) dialog.close();
  }
  const dragHandlers = { onPointerDown: onDragStart, onPointerMove: onDragMove, onPointerUp: onDragEnd, onPointerCancel: onDragEnd };

  return (
    <dialog
      id='ugatan-help-dialog'
      ref={ref}
      className='chat-sheet'
      aria-labelledby='ugatan-help-heading'
      aria-describedby='ugatan-help-description'
      onClick={(event) => {
        // A tap on the dimmed area (the dialog box itself, outside its content) closes the sheet.
        if (event.target === event.currentTarget) event.currentTarget.close();
      }}
    >
      <div className='touch-none' {...dragHandlers}>
        <div className='chat-sheet-grip' aria-hidden='true' />
        <div className='chat-sheet-head'>
          <div className='min-w-0'>
            <h2 id='ugatan-help-heading' className='m-0 text-xl font-bold tracking-tight'>Paano gamitin</h2>
            <p id='ugatan-help-description' className='m-0 text-sm leading-6 text-mist'>Gabay sa pag-aalaga ng palay at mais.</p>
          </div>
          <form method='dialog'>
            <button type='submit' className='chat-icon-button bg-sprout' aria-label='Isara ang tulong' title='Isara ang tulong'>
              <Icon><path d='m6 6 12 12M6 18 18 6' /></Icon>
            </button>
          </form>
        </div>
      </div>

      <div className='chat-sheet-body grid content-start gap-5 pb-4'>
        <section aria-labelledby='ugatan-help-steps'>
          <h3 id='ugatan-help-steps' className='sr-only'>Tatlong hakbang</h3>
          <ol className='m-0 grid list-none gap-2.5 p-0'>
            <StepCard
              n={1}
              title='Ilarawan o kuhanan'
              icons={<><LeafIcon /><MicIcon /><CameraIcon /></>}
            >
              Ilarawan ang pananim at mga senyales na napansin.
            </StepCard>
            <StepCard
              n={2}
              title='Ipadala'
              icons={
                <span className='grid size-7 place-items-center rounded-full bg-leaf text-white'>
                  <Icon className='size-4'><path d='M12 19V5m0 0-6 6m6-6 6 6' /></Icon>
                </span>
              }
            >
              Pindutin ang pataas na arrow para ipadala ang tanong.
            </StepCard>
            <StepCard n={3} title='Suriin ang gabay' icons={<BookIcon />}>
              Basahin ang gabay at ihambing sa iyong pananim.
            </StepCard>
          </ol>
        </section>

        <section aria-labelledby='ugatan-help-features' className='grid gap-2.5'>
          <h3 id='ugatan-help-features' className='m-0 text-xs font-semibold uppercase tracking-wide text-mist'>Mikropono, kamera at hub</h3>
          <FeatureCard icon={<MicIcon />} title='Mikropono'>
            Gawing teksto ang iyong sinabi. Ang hub ang nagsusulat nito sa Wi-Fi ng hub, walang internet; kung wala ka sa Wi-Fi ng hub, i-type ang tanong.
          </FeatureCard>
          <FeatureCard icon={<CameraIcon />} title='Kamera'>
            Magdagdag ng litrato ng pananim; binabasa ito ng AI sa device kapag handa na, o ng hub kung nasa Wi-Fi ka nito.
          </FeatureCard>
          <FeatureCard icon={<WifiIcon />} title='Lokal na hub' badge='Offline / Lokal na Wi-Fi'>
            Walang internet na kailangan. Kumonekta lang sa Wi-Fi ng hub para sa boses, larawan at pagpapadala ng tanong.
          </FeatureCard>
        </section>

        <details
          className='group rounded-2xl border border-sprout-line bg-paper'
          open={setupOpen}
          onToggle={(event) => setSetupOpen(event.currentTarget.open)}
        >
          <summary className='flex min-h-14 cursor-pointer list-none items-center gap-3 rounded-2xl px-3.5 py-2.5 [&::-webkit-details-marker]:hidden'>
            <span className='grid size-9 shrink-0 place-items-center rounded-xl bg-leaf-soft text-leaf'><ChipIcon /></span>
            <span className='grid min-w-0 flex-1'>
              <span id='ugatan-local-ai-heading' className='text-[0.9375rem] font-bold leading-5 text-ink'>Offline AI</span>
              <span className='text-xs leading-4 text-mist'>Opsyonal na dagdag na paliwanag</span>
            </span>
            <span className={`shrink-0 rounded-full border px-2.5 py-0.5 text-xs font-semibold leading-4 ${stateTone}`}>{stateLabel}</span>
            <ChevronIcon />
          </summary>

          <section className='grid gap-3 border-t border-rule px-3.5 pb-3.5 pt-3' aria-labelledby='ugatan-local-ai-heading'>
            <p className='m-0 text-sm leading-6 text-mist'>
              Magagamit na ang nakahandang gabay kahit hindi ito ihanda. Hindi kailangan ng internet: ang hub ang nagbibigay ng model sa Wi-Fi nito sa unang paghahanda, mga 5 GB. Kumonekta sa Wi-Fi ng hub at maglaan ng sapat na espasyo.
            </p>
            <dl className='m-0 grid grid-cols-2 gap-2'>
              <Fact label='Kailangang espasyo' value='~5 GB libre' />
              <Fact label='Koneksyon' value='Wi-Fi ng hub' />
            </dl>

            {fit === 'unknown' && ai.status === 'idle' && (
              <p className='m-0 text-sm leading-6 text-mist'>
                Hindi masabi ng browser kung sapat ang memorya ng cellphone mo. Kailangan ng mga {PHONE_MODEL.minMemoryGb} GB. Kung magsara ang pahina habang naghahanda, gamitin na lang ang nakahandang gabay.
              </p>
            )}

            {ai.status === 'loading' && (
              <div className='grid gap-1.5'>
                <div className='flex items-baseline justify-between gap-3 text-sm'>
                  <span className='font-semibold'>Ugatan AI</span>
                  <span className='font-semibold tabular-nums text-leaf'>{shown}%</span>
                </div>
                <div
                  className='h-2.5 overflow-hidden rounded-full bg-sprout-line'
                  role='progressbar'
                  aria-label='Pag-download ng Ugatan AI'
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-valuenow={shown}
                >
                  <div className='h-full rounded-full bg-leaf transition-[width] duration-300' style={{ width: `${shown}%` }} />
                </div>
              </div>
            )}

            <div role='status' className='text-sm leading-6 text-leaf'>
              {fit === 'too-small' && ai.status === 'idle' && (
                <p className='m-0'>
                  Kulang ang memorya ng cellphone na ito para sa AI (kailangan ng mga {PHONE_MODEL.minMemoryGb} GB). Gumagana pa rin ang nakahandang gabay, sa Tagalog, kahit walang internet.
                </p>
              )}
              {ai.status === 'loading' && <p className='m-0'>Nagda-download at naghahanda. Maghintay muna.</p>}
              {ai.status === 'ready' && <p className='m-0'>Handa na ang AI. Maaari ka nang magtanong.{ai.device && <span className='block text-mist'>{L.phoneAiDevice} {ai.device}.</span>}</p>}
              {laya && laya.status === 'loading' && <p className='m-0'>Inihahanda pa ang natitirang bahagi ng Ugatan AI.</p>}
              {laya && laya.status === 'error' && <p className='m-0'>Hindi buong naihanda ang Ugatan AI, pero gagana pa rin ito.{laya.error && <span className='block text-mist'>{laya.error}</span>}</p>}
              {ai.status === 'error' && <p className='m-0'>Hindi maihanda ang AI ngayon. Magagamit pa rin ang gabay. I-reload ang pahina kung gusto mong subukan muli.{ai.error && <span className='block text-mist'>{ai.error}</span>}</p>}
            </div>

            {fit !== 'too-small' && ai.status === 'idle' && (
              <button type='button' className='btn min-h-12 w-full !rounded-full' onClick={onPrepareAi}>{L.phoneAiPrepare}</button>
            )}
          </section>
        </details>
      </div>

      <p role='note' className='m-0 flex shrink-0 items-start gap-2.5 border-t border-[#d9b25a] bg-warn px-5 pt-3 text-sm leading-5 text-ink sm:px-6' style={{ paddingBottom: 'calc(12px + env(safe-area-inset-bottom))' }}>
        <span className='mt-px grid size-6 shrink-0 place-items-center rounded-full bg-[#f3dca0] text-[#6b4a05]'><LeafIcon /></span>
        <span><strong className='font-bold'>Gabay lamang, hindi tiyak na diagnosis.</strong> {DISCLAIMER}</span>
      </p>
    </dialog>
  );
});
