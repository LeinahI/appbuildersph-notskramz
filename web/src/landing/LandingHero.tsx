import { useRef } from 'react';
import { Link } from 'react-router-dom';
import gsap from 'gsap';
import { useGSAP } from '@gsap/react';
import { motion } from 'motion/react';

gsap.registerPlugin(useGSAP);

const CARDS = [
  { title: 'Field chat', body: 'Describe signs in Tagalog, Taglish, or Cebuano. Notes stay on the phone.' },
  { title: 'Photo + voice', body: 'Optional photo reading and speech on the hub Wi-Fi — no cloud AI API.' },
  { title: 'Offline notes', body: 'Curated pest and disease cards work even when the hub is out of reach.' },
] as const;

export function LandingHero() {
  const root = useRef<HTMLElement>(null);

  useGSAP(
    () => {
      const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      if (reduce) return;
      gsap.from('.landing-hero-copy > *', { y: 28, opacity: 0, duration: 0.7, stagger: 0.08, ease: 'power2.out' });
      gsap.from('.landing-float-card', { y: 40, opacity: 0, duration: 0.75, stagger: 0.12, delay: 0.15, ease: 'power3.out' });
    },
    { scope: root },
  );

  return (
    <section ref={root} className='landing-hero landing-shell' id='top' aria-labelledby='landing-hero-title'>
      <div className='landing-hero-grid'>
        <div className='landing-hero-copy'>
          <p className='m-0 mb-3 text-sm font-semibold uppercase tracking-[0.14em] text-leaf'>Ugatan</p>
          <h1 id='landing-hero-title'>
            Field guidance for <span>palay</span> and <span>mais</span>
          </h1>
          <p className='landing-hero-lead'>
            Offline Taglish advisor for Filipino rice and corn farmers. Match what you see to curated notes, then check
            any AI explanation before you act.
          </p>
          <div className='landing-hero-actions'>
            <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
              <Link className='landing-cta' to='/chat'>
                Ask now!
              </Link>
            </motion.div>
            <a className='landing-cta landing-cta--ghost' href='#stack'>
              See the stack
            </a>
          </div>
        </div>
        <div className='landing-float-cards' aria-hidden='true'>
          {CARDS.map((card) => (
            <article key={card.title} className='landing-float-card'>
              <strong>{card.title}</strong>
              <p>{card.body}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
