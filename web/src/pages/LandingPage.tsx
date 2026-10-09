import { LandingNav } from '../landing/LandingNav';
import { LandingHero } from '../landing/LandingHero';
import { LandingFeatures } from '../landing/LandingFeatures';
import { LandingStack } from '../landing/LandingStack';
import { LandingBenchmarks } from '../landing/LandingBenchmarks';
import { LandingFaq } from '../landing/LandingFaq';
import { LandingFooter } from '../landing/LandingFooter';
import '../landing.css';

/** Browser marketing page at `/`. Capacitor never mounts this route. */
export default function LandingPage() {
  return (
    <div className='landing'>
      <LandingNav />
      <main>
        <LandingHero />
        <LandingFeatures />
        <LandingStack />
        <LandingBenchmarks />
        <LandingFaq />
      </main>
      <LandingFooter />
    </div>
  );
}
