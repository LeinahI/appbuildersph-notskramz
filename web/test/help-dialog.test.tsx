import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import { DISCLAIMER } from '@ugatan/shared';
import { HelpDialog } from '../src/components/HelpDialog';
import { phoneAiFit, type MemoryFit, type PhoneAiStatus } from '../src/lib/llm';

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
    expect(html).toContain('5 GB');
    expect(html).not.toMatch(/Gemma|Laya/);
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
    expect(html).toContain('binabasa ito ng AI sa device');
    expect(html).not.toContain('Hindi pa magagamit ang larawan');
    expect(html).toContain('Ang hub ang nagsusulat nito sa Wi-Fi ng hub, walang internet');
    expect(html).toContain('hindi tiyak na diagnosis');
    expect(html).toContain(DISCLAIMER);
  });
});

describe('phone AI and device memory', () => {
  const render = (fit: MemoryFit) =>
    renderToStaticMarkup(createElement(HelpDialog, { ai: { status: 'idle', device: '', progress: '', error: '' }, fit, onPrepareAi: vi.fn() }));

  it('reads the memory the browser reports', () => {
    expect(phoneAiFit(8)).toBe('fits');
    expect(phoneAiFit(4)).toBe('too-small');
    expect(phoneAiFit(2)).toBe('too-small');
    expect(phoneAiFit(undefined)).toBe('unknown');
    expect(phoneAiFit(0)).toBe('unknown');
  });

  it('never offers the download on a phone without the memory, and points to the notes', () => {
    const html = render('too-small');
    expect(html).not.toContain('Ihanda ang AI');
    expect(html).toContain('Kulang ang memorya');
    expect(html).toContain('nakahandang gabay');
  });

  it('offers it with a warning when the browser does not say', () => {
    const html = render('unknown');
    expect(html).toContain('Ihanda ang AI');
    expect(html).toContain('Hindi masabi ng browser');
  });

  it('offers it plainly on a phone with the memory', () => {
    const html = render('fits');
    expect(html).toContain('Ihanda ang AI');
    expect(html).not.toContain('Hindi masabi ng browser');
  });
});
