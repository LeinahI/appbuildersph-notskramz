import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import LandingPage from '../src/pages/LandingPage';

vi.mock('../src/landing/useBenchmarks', () => ({
  useBenchmarks: () => ({ data: { status: 'missing', items: [] }, loading: false }),
}));

describe('Landing page', () => {
  it('renders chat CTAs and stack section headings', () => {
    const html = renderToStaticMarkup(
      createElement(MemoryRouter, null, createElement(LandingPage)),
    );
    expect(html).toContain('href="/chat"');
    expect(html).toContain('Ask now!');
    expect(html).toContain('Open chat');
    expect(html).toContain('id="stack"');
    expect(html).toContain('Transparent stack');
    expect(html).toContain('Frontend');
    expect(html).toContain('Backend');
    expect(html).toContain('AI models');
    expect(html).toContain('Mobile');
    expect(html).toContain('id="benchmarks"');
    expect(html).toContain('benchmark:landing');
  });
});
