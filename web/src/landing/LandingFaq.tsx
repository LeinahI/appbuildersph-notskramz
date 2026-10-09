import { useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { DISCLAIMER } from '@ugatan/shared';

const FAQ = [
  {
    q: 'Does Ugatan work offline?',
    a: 'Yes for curated notes and keyword matching. Hub Gemma explain, photo, and hub voice need the hub on the LAN. Browser voice uses the Web Speech API and usually needs the internet.',
  },
  {
    q: 'Does it recommend pesticides?',
    a: `No. Answers never name brands or dosages. Treatment advice ends with: ${DISCLAIMER}`,
  },
  {
    q: 'What about the microphone?',
    a: 'In the browser, SpeechRecognition writes words into the composer. On the Android app with hub voice on, the hub’s ONNX audio model transcribes over hub Wi-Fi.',
  },
] as const;

export function LandingFaq() {
  const [open, setOpen] = useState<number | null>(0);

  return (
    <section className='landing-section landing-shell' id='faq' aria-labelledby='landing-faq-title'>
      <h2 id='landing-faq-title'>Frequently asked questions</h2>
      <p className='landing-section-lead'>Short answers for judges, co-ops, and farmers.</p>
      <div className='landing-faq'>
        {FAQ.map((item, index) => {
          const isOpen = open === index;
          return (
            <div key={item.q} className='landing-faq-item' data-open={isOpen ? 'true' : 'false'}>
              <button
                type='button'
                aria-expanded={isOpen}
                onClick={() => setOpen(isOpen ? null : index)}
              >
                {item.q}
                <span aria-hidden='true'>v</span>
              </button>
              <AnimatePresence initial={false}>
                {isOpen && (
                  <motion.div
                    className='landing-faq-answer'
                    key='content'
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.28, ease: 'easeOut' }}
                  >
                    <p>{item.a}</p>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          );
        })}
      </div>
    </section>
  );
}
