import { useRef } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { useGSAP } from '@gsap/react';

gsap.registerPlugin(useGSAP, ScrollTrigger);

const STACK = [
  {
    title: 'Frontend',
    items: ['React 18 + Vite PWA', 'Tailwind CSS 4', 'Dexie (IndexedDB chats)', 'React Router + TanStack Query'],
  },
  {
    title: 'Backend',
    items: ['hub — Node crop Q&A on the LAN', 'ws — Go DDD API on Postgres 16', 'Admin auth, QR invites, audit', 'PII encrypted at rest'],
  },
  {
    title: 'AI models',
    items: [
      'Gemma 4 E2B GGUF Q4_0 (hub explain)',
      'Gemma 4 E2B ONNX (photo / voice / phone)',
      'Laya matcher (optional hybrid)',
      'Keyword matcher + Web Speech (browser)',
    ],
  },
  {
    title: 'Mobile',
    items: ['Capacitor 8 Android APK', 'First-run /setup from hub Wi-Fi', 'LiteRT on-device when away from hub', 'Camera + mic permissions'],
  },
] as const;

export function LandingStack() {
  const root = useRef<HTMLElement>(null);

  useGSAP(
    () => {
      if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
      gsap.from('.landing-stack-card', {
        scrollTrigger: { trigger: root.current, start: 'top 82%' },
        y: 24,
        opacity: 0,
        duration: 0.55,
        stagger: 0.08,
        ease: 'power2.out',
      });
    },
    { scope: root },
  );

  return (
    <section ref={root} className='landing-section landing-shell' id='stack' aria-labelledby='landing-stack-title'>
      <h2 id='landing-stack-title'>Transparent stack</h2>
      <p className='landing-section-lead'>
        What powers Ugatan end to end. Model licenses and library pins are listed in{' '}
        <code className='text-sm'>docs/DISCLOSURE.md</code> in the repository.
      </p>
      <div className='landing-stack-grid'>
        {STACK.map((group) => (
          <article key={group.title} className='landing-stack-card'>
            <h3>{group.title}</h3>
            <ul>
              {group.items.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </article>
        ))}
      </div>
    </section>
  );
}
