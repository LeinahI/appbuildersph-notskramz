import { Link } from 'react-router-dom';
import { motion } from 'motion/react';
import { DISCLAIMER } from '@ugatan/shared';

export function LandingFooter() {
  return (
    <footer className='landing-footer'>
      <div className='landing-shell'>
        <div className='landing-footer-panel'>
          <h2>Ready to describe what you see?</h2>
          <p>Open the farmer chat — no sign-in. Guidance only; confirm with a local agriculturist.</p>
          <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} className='inline-block'>
            <Link className='landing-cta' to='/chat'>
              Go to chat
            </Link>
          </motion.div>
          <p className='landing-footnote'>{DISCLAIMER}</p>
        </div>
      </div>
    </footer>
  );
}
