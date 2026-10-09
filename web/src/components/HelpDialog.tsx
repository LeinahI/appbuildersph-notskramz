import { forwardRef } from 'react';
import { DISCLAIMER } from '@ugatan/shared';
import { L } from '../config/labels';
import { PHONE_MODEL } from '../config/models';
import type { LayaState } from '../lib/laya';
import type { MemoryFit, PhoneAiState } from '../lib/llm';

interface HelpDialogProps {
  ai: PhoneAiState;
  /** Laya, the phone's matcher for questions keyword is not sure of. Loads after Gemma. */
  laya?: LayaState;
  /** Whether this phone has the memory for the model. A phone without it is never offered the download. */
  fit?: MemoryFit;
  onPrepareAi: () => void;
}

export const HelpDialog = forwardRef<HTMLDialogElement, HelpDialogProps>(function HelpDialog(
  { ai, laya, fit = 'unknown', onPrepareAi },
  ref,
) {
  return (
    <dialog id='ugatan-help-dialog' ref={ref} className='chat-dialog' aria-labelledby='ugatan-help-heading' aria-describedby='ugatan-help-description'>
      <div className='mb-3 flex items-center justify-between gap-3'>
        <h2 id='ugatan-help-heading' className='m-0 text-xl font-bold'>Paano gamitin</h2>
        <form method='dialog'>
          <button type='submit' className='chat-icon-button' aria-label='Isara ang tulong' title='Isara ang tulong'>
            <svg className='size-5' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='1.7' strokeLinecap='round' aria-hidden='true'>
              <path d='m6 6 12 12M6 18 18 6' />
            </svg>
          </button>
        </form>
      </div>
      <p id='ugatan-help-description' className='mt-0 text-sm leading-6 text-mist'>Gabay sa pag-aalaga ng palay at mais.</p>
      <ol className='my-4 grid list-decimal gap-3 pl-5 text-sm leading-6 marker:font-semibold marker:text-leaf'>
        <li className='pl-1'>Ilarawan ang pananim at mga senyales na napansin.</li>
        <li className='pl-1'>Pindutin ang pataas na arrow para ipadala ang tanong.</li>
        <li className='pl-1'>Basahin ang gabay at ihambing sa iyong pananim.</li>
      </ol>
      <p className='my-4 text-sm leading-6 text-mist'>
        Mikropono: gawing teksto ang iyong sinabi. Ang hub ang nagsusulat nito sa Wi-Fi ng hub, walang internet; kung wala ka sa Wi-Fi ng hub, i-type ang tanong.
        Kamera: magdagdag ng litrato ng pananim; binabasa ito ng AI sa device kapag handa na, o ng hub kung nasa Wi-Fi ka nito.
      </p>
      <section className='border-t border-rule pt-4' aria-labelledby='ugatan-local-ai-heading'>
        <h3 id='ugatan-local-ai-heading' className='m-0 text-sm font-bold'>Dagdag na paliwanag ng AI</h3>
        <p className='mb-3 mt-2 text-sm leading-6 text-mist'>
          Opsyonal ito; magagamit na ang nakahandang gabay. Hindi kailangan ng internet: ang hub ang nagbibigay ng model sa Wi-Fi nito sa unang paghahanda, mga 5 GB. Kumonekta sa Wi-Fi ng hub at maglaan ng sapat na espasyo.
        </p>
        {fit === 'unknown' && ai.status === 'idle' && (
          <p className='my-3 text-sm leading-6 text-mist'>
            Hindi masabi ng browser kung sapat ang memorya ng cellphone mo. Kailangan ng mga {PHONE_MODEL.minMemoryGb} GB. Kung magsara ang pahina habang naghahanda, gamitin na lang ang nakahandang gabay.
          </p>
        )}
        <div role='status' className='text-sm leading-6 text-leaf'>
          {fit === 'too-small' && ai.status === 'idle' && (
            <p className='my-3'>
              Kulang ang memorya ng cellphone na ito para sa AI (kailangan ng mga {PHONE_MODEL.minMemoryGb} GB). Gumagana pa rin ang nakahandang gabay, sa Tagalog, kahit walang internet.
            </p>
          )}
          {ai.status === 'loading' && <p className='my-3'>Nagda-download at naghahanda. Maghintay muna.</p>}
          {ai.status === 'ready' && <p className='my-3'>Handa na ang AI. Maaari ka nang magtanong.{ai.device && <span className='block text-mist'>{L.phoneAiDevice} {ai.device}.</span>}</p>}
          {laya && laya.status === 'loading' && <p className='my-3'>Inihahanda pa ang natitirang bahagi ng Ugatan AI.</p>}
          {laya && laya.status === 'error' && <p className='my-3'>Hindi buong naihanda ang Ugatan AI, pero gagana pa rin ito.{laya.error && <span className='block text-mist'>{laya.error}</span>}</p>}
          {ai.status === 'error' && <p className='my-3'>Hindi maihanda ang AI ngayon. Magagamit pa rin ang gabay. I-reload ang pahina kung gusto mong subukan muli.{ai.error && <span className='block text-mist'>{ai.error}</span>}</p>}
        </div>
        {fit !== 'too-small' && ai.status === 'idle' && (
          <button type='button' className='btn min-h-12 w-full' onClick={onPrepareAi}>{L.phoneAiPrepare}</button>
        )}
      </section>
      <p className='mb-0 mt-4 border-t border-rule pt-4 text-sm leading-6 text-mist'>Gabay lamang, hindi tiyak na diagnosis. {DISCLAIMER}</p>
    </dialog>
  );
});
