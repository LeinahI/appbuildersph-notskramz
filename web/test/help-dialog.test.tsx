import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import { DISCLAIMER } from '@ugatan/shared';
import { HelpDialog } from '../src/components/HelpDialog';
import type { PhoneAiStatus } from '../src/lib/llm';

function renderHelp(status: PhoneAiStatus = 'idle', onPrepareAi = vi.fn()) {
  const html = renderToStaticMarkup(createElement(HelpDialog, {
    ai: { status, device: '', progress: '', error: '' },
    onPrepareAi,
  }));
  return { html, onPrepareAi };
}

describe('Tagalog help dialog', () => {
  it('explains the local workflow and exposes accessible native close controls', () => {
    const { html } = renderHelp();
    expect(html).toContain('id="ugatan-help-dialog"');
    expect(html).toContain('aria-labelledby="ugatan-help-heading"');
    expect(html).toContain('aria-describedby="ugatan-help-description"');
    expect(html).toContain('Ilarawan ang problema.');
    expect(html).toContain('Ipadala ang tanong.');
    expect(html).toContain('Basahin ang gabay.');
    expect(html).toContain('Gamitin ang mga icon.');
    expect(html).toContain('aria-label="Isara ang tulong"');
    expect((html.match(/method="dialog"/g) ?? []).length).toBe(2);
  });

  it('discloses the model download and does not prepare AI when the dialog renders', () => {
    const { html, onPrepareAi } = renderHelp();
    expect(html).toContain('3.1 GB');
    expect(html).toContain('internet');
    expect(html).toContain('Wi-Fi');
    expect(html).toContain('Ihanda ang AI');
    expect(onPrepareAi).not.toHaveBeenCalled();
  });

  it.each([
    ['loading', 'Nagda-download at naghahanda.'],
    ['ready', 'Handa na ang AI.'],
    ['error', 'Hindi maihanda ang AI sa device na ito ngayon.'],
  ] as const)('explains the %s state without exposing a duplicate prepare action', (status, message) => {
    const { html } = renderHelp(status);
    expect(html).toContain(message);
    expect(html).toContain('role="status"');
    expect(html).not.toContain('Ihanda ang AI');
  });

  it('states what the photo and voice controls need and preserves the exact pesticide disclaimer', () => {
    const { html } = renderHelp();
    expect(html).toContain('ang hub ang bumabasa nito');
    expect(html).not.toContain('Hindi pa magagamit ang larawan');
    expect(html).toContain('maaaring kailangan nito ng internet');
    expect(html).toContain('hindi tiyak na diagnosis');
    expect(html).toContain(DISCLAIMER);
  });
});
