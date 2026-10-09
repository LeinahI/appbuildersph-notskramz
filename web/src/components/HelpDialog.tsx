import { forwardRef } from 'react';
import { DISCLAIMER } from '@ugatan/shared';
import { L } from '../config/labels';
import type { PhoneAiState } from '../lib/llm';

interface HelpDialogProps {
  ai: PhoneAiState;
  onPrepareAi: () => void;
}

export const HelpDialog = forwardRef<HTMLDialogElement, HelpDialogProps>(function HelpDialog(
  { ai, onPrepareAi },
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
      <p className='my-4 text-sm leading-6 text-mist'>Mikropono: gawing teksto ang iyong sinabi; maaaring kailangan ng internet. Hindi pa magagamit ang pagsusuri ng larawan.</p>
      <section className='border-t border-rule pt-4' aria-labelledby='ugatan-local-ai-heading'>
        <h3 id='ugatan-local-ai-heading' className='m-0 text-sm font-bold'>Dagdag na paliwanag ng AI</h3>
        <p className='mb-3 mt-2 text-sm leading-6 text-mist'>Opsyonal ito; magagamit na ang nakahandang gabay. Sa unang paghahanda, kailangan ng internet at humigit-kumulang 3.1 GB na download. Gumamit ng Wi-Fi. Ihanda muli pagkatapos i-reload; maaaring kailanganing i-download muli.</p>
        <div role='status' className='text-sm leading-6 text-leaf'>
          {ai.status === 'loading' && <p className='my-3'>Nagda-download at naghahanda. Maghintay muna.</p>}
          {ai.status === 'ready' && <p className='my-3'>Handa na ang AI. Maaari ka nang magtanong.</p>}
          {ai.status === 'error' && <p className='my-3'>Hindi maihanda ang AI ngayon. Magagamit pa rin ang gabay.</p>}
        </div>
        {ai.status === 'idle' && (
          <button type='button' className='btn min-h-12 w-full' onClick={onPrepareAi}>{L.phoneAiPrepare}</button>
        )}
      </section>
      <p className='mb-0 mt-4 border-t border-rule pt-4 text-sm leading-6 text-mist'>Gabay lamang, hindi tiyak na diagnosis. {DISCLAIMER}</p>
    </dialog>
  );
});
