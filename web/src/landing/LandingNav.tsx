import { Link } from 'react-router-dom';

const LINKS = [
  { href: '#features', label: 'Features' },
  { href: '#stack', label: 'Stack' },
  { href: '#benchmarks', label: 'Benchmarks' },
  { href: '#faq', label: 'FAQ' },
] as const;

export function LandingNav() {
  return (
    <header className='landing-nav'>
      <div className='landing-shell landing-nav-inner'>
        <a className='landing-brand' href='#top'>
          <img src='/UgatanLogoIcon.svg' alt='' width={32} height={32} />
          Ugatan
        </a>
        <ul className='landing-nav-links'>
          {LINKS.map((link) => (
            <li key={link.href}>
              <a href={link.href}>{link.label}</a>
            </li>
          ))}
        </ul>
        <Link className='landing-cta' to='/chat'>
          Open chat
        </Link>
      </div>
    </header>
  );
}
