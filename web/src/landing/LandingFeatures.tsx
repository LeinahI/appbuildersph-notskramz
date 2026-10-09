import { useRef } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { useGSAP } from '@gsap/react';
import { motion } from 'motion/react';

gsap.registerPlugin(useGSAP, ScrollTrigger);

const FEATURES = [
  {
    title: 'Offline knowledge',
    body: 'Keyword matching over curated pest and disease notes — no account, no internet required for the cards.',
  },
  {
    title: 'Hub AI on the LAN',
    body: 'On hub Wi-Fi, Gemma explains in Taglish and can read photos or voice. Answers never name pesticide brands or dosages.',
  },
  {
    title: 'Phone-first Android',
    body: 'Capacitor APK with first-run setup from the hub. Chats stay in IndexedDB on the device.',
  },
] as const;

export function LandingFeatures() {
  const root = useRef<HTMLElement>(null);

  useGSAP(
    () => {
      if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
      gsap.from('.landing-feature-card', {
        scrollTrigger: { trigger: root.current, start: 'top 80%' },
        y: 36,
        opacity: 0,
        duration: 0.65,
        stagger: 0.12,
        ease: 'power2.out',
      });
    },
    { scope: root },
  );

  return (
    <section ref={root} className='landing-section landing-shell' id='features' aria-labelledby='landing-features-title'>
      <h2 id='landing-features-title'>Everything you need in the field</h2>
      <p className='landing-section-lead'>
        Monitoring signs, matching problems, and acting with a local agriculturist — not a black-box diagnosis.
      </p>
      <div className='landing-feature-grid'>
        {FEATURES.map((feature) => (
          <motion.article key={feature.title} className='landing-feature-card' whileHover={{ y: -4 }}>
            <h3>{feature.title}</h3>
            <p>{feature.body}</p>
          </motion.article>
        ))}
      </div>
    </section>
  );
}
