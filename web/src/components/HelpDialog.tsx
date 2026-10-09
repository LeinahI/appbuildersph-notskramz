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
    <dialog id='ugatan-help-dialog' ref={ref} className='chat-history' aria-labelledby='ugatan-help-heading' aria-describedby='ugatan-help-description'>
      <div className='mb-3 flex items-center justify-between gap-4'>
        <h2 id='ugatan-help-heading' className='m-0 text-xl font-bold'>Paano gamitin ang Ugatan AI</h2>
        <form method='dialog'>
          <button type='submit' className='chat-icon-button' aria-label='Isara ang tulong' title='Isara ang tulong'>
            <svg className='size-5' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='1.7' strokeLinecap='round' aria-hidden='true'>
              <path d='m6 6 12 12M6 18 18 6' />
            </svg>
          </button>
        </form>
      </div>
      <p id='ugatan-help-description' className='mt-0 text-base leading-7 text-mist'>
        Katuwang mo ang Ugatan sa pag-aalaga ng palay at mais. Magsimula sa paglalarawan ng nakikita mo sa iyong pananim.
      </p>
      <ol className='my-6 grid list-decimal gap-5 pl-6 text-base leading-7 marker:font-bold marker:text-leaf'>
        <li className='pl-1'>
          <h3 className='m-0 text-base font-semibold'>Ilarawan ang problema.</h3>
          <p className='m-0 text-mist'>Sabihin ang pananim, mga senyales, at kung kailan nagsimula. Halimbawa: “May batik sa mga dahon ng palay. Tatlong araw ko na itong napapansin.”</p>
        </li>
        <li className='pl-1'>
          <h3 className='m-0 text-base font-semibold'>Ipadala ang tanong.</h3>
          <p className='m-0 text-mist'>Pindutin ang pataas na arrow sa kahon ng mensahe. Sa computer, puwede rin ang Enter; Shift + Enter para sa bagong linya.</p>
        </li>
        <li className='pl-1'>
          <h3 className='m-0 text-base font-semibold'>Basahin ang gabay.</h3>
          <p className='m-0 text-mist'>Ihambing ang mga senyales sa iyong pananim. Sundin ang mga hakbang at tingnan kung kailan kailangang kumonsulta sa agriculturist.</p>
        </li>
        <li className='pl-1'>
          <h3 className='m-0 text-base font-semibold'>Gamitin ang mga icon.</h3>
          <p className='m-0 text-mist'>Ang mikropono ay nagsusulat ng iyong sinabi. Payagan ang paggamit nito kapag tinanong ng browser; maaaring kailangan nito ng internet. Kung may hub, ang hub ang magsusulat kahit walang internet. Ang kamera ay nagdadagdag ng litrato ng pananim; ang hub ang bumabasa nito, kaya kailangan mong nasa Wi-Fi ng hub.</p>
        </li>
      </ol>
      <section className='rounded-2xl border border-sprout-line bg-sprout p-4' aria-labelledby='ugatan-local-ai-heading'>
        <h3 id='ugatan-local-ai-heading' className='m-0 text-base font-bold'>Dagdag na paliwanag mula sa lokal na AI</h3>
        <p className='mb-3 mt-2 text-sm leading-6 text-mist'>
          May nakahandang gabay kahit walang model na na-download. Kapag naka-install at na-load na ang app, magagamit ang gabay kahit walang internet. Para sa dagdag na paliwanag, maaari mong ihanda ang AI sa device mo.
        </p>
        <p className='my-3 text-sm leading-6 text-mist'>
          Kailangan ng internet at humigit-kumulang 3.1 GB na download sa unang paghahanda. Gumamit ng Wi-Fi at maglaan ng sapat na espasyo. Kapag handa na, magtanong sa chat. Kailangang ihanda muli ang AI kapag ni-reload ang pahina; hindi garantisadong mapapanatili ng browser ang download.
        </p>
        <div role='status' className='text-sm leading-6 text-leaf'>
          {ai.status === 'idle' && <p className='my-3'>Hindi pa handa ang AI sa device. Maaari ka nang gumamit ng nakahandang gabay.</p>}
          {ai.status === 'loading' && <p className='my-3'>Nagda-download at naghahanda. Maaaring abutin ng ilang minuto.{ai.progress && <span className='block text-mist'>{ai.progress}</span>}</p>}
          {ai.status === 'ready' && <p className='my-3'>Handa na ang AI. Isara ang tulong at ipadala ang iyong tanong.{ai.device && <span className='block text-mist'>{L.phoneAiDevice} {ai.device}.</span>}</p>}
          {ai.status === 'error' && <p className='my-3'>Hindi maihanda ang AI sa device na ito ngayon. Maaari mo pa ring gamitin ang nakahandang gabay. I-reload ang pahina kung gusto mong subukan muli.</p>}
        </div>
        {ai.status === 'idle' && (
          <button type='button' className='btn min-h-12' onClick={onPrepareAi}>{L.phoneAiPrepare}</button>
        )}
      </section>
      <p className='mb-1 mt-5 text-sm leading-6 text-mist'>Gabay lamang ang mga sagot, hindi tiyak na diagnosis. {DISCLAIMER}</p>
      <form method='dialog' className='mt-5'>
        <button type='submit' className='btn min-h-12 w-full'>Naiintindihan ko</button>
      </form>
    </dialog>
  );
});
