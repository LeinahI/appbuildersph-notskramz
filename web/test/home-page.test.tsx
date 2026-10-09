import { Children, createElement, isValidElement, type ReactElement, type ReactNode } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { HomePage, type HomePageProps } from '../src/components/HomePage';
import { VoiceInput } from '../src/components/VoiceInput';
import { L } from '../src/config/labels';

function props(text = ''): HomePageProps {
  return {
    labels: L,
    text,
    notice: '',
    onTextChange: () => {},
    onSubmit: () => {},
    onHistory: () => {},
    onHelp: () => {},
    onNewConversation: () => {},
    onPhoto: () => {},
    onNotice: () => {},
  };
}

describe('Ugatan home page', () => {
  it('renders the concise Tagalog introduction and supplied icon without a language selector', () => {
    const html = renderToStaticMarkup(createElement(HomePage, props()));
    expect(html).toContain('Ugatan AI');
    expect(html).toContain('Lokal na katuwang sa pag-aalaga ng palay at mais.');
    expect(html).toContain('src="/UgatanLogoIcon.svg"');
    expect(html).not.toContain('Kumusta,');
    expect(html).not.toContain('<select');
    expect(html).not.toContain('ugatan-language');
    expect(html).toContain('<form');
    expect(html).toContain('<textarea');
  });

  it('uses the supplied logo and has no removed home-page clutter', () => {
    const html = renderToStaticMarkup(createElement(HomePage, props()));
    expect(html).toContain('src="/UgatanLogo.png"');
    expect(html).not.toContain('Gabay sa bukid');
    expect(html).not.toContain('Demo');
    expect(html).not.toContain('paparating');
    expect(html).not.toContain('PUWEDE MONG ITANONG');
    expect(html).not.toContain('Mga setting at sync');
    expect(html).not.toContain('figma.com/api/mcp/asset');
  });

  it('disables send for blank input and enables it for text', () => {
    const blank = renderToStaticMarkup(createElement(HomePage, props()));
    const filled = renderToStaticMarkup(createElement(HomePage, props('Nanilaw ang dahon')));
    const blankSend = blank.match(/<button[^>]*aria-label=.[^>]*Ipadala ang tanong[^>]*>/)?.[0];
    const filledSend = filled.match(/<button[^>]*aria-label=.[^>]*Ipadala ang tanong[^>]*>/)?.[0];
    expect(blankSend).toContain('disabled=""');
    expect(filledSend).not.toContain('disabled=""');
  });

  it('labels the icon-only camera, microphone, history, new-chat, help, and send actions', () => {
    const html = renderToStaticMarkup(createElement(HomePage, props()));
    for (const label of ['Mga usapan', 'Bagong usapan', 'Larawan', 'Magsalita', 'Ipadala ang tanong', 'Tulong']) {
      expect(html).toContain(`aria-label="${label}"`);
    }
    expect(html).toContain('aria-pressed="false"');
  });

  it('shows the chat content in place of the welcome screen and only shows explicit notices', () => {
    const html = renderToStaticMarkup(createElement(HomePage, {
      ...props(),
      children: createElement('p', {}, 'Existing answer'),
      notice: 'The microphone is unavailable.',
    }));
    expect(html).toContain('Existing answer');
    expect(html).not.toContain('Lokal na katuwang sa pag-aalaga ng palay at mais.');
    expect(html).toContain('role="status">The microphone is unavailable.');
  });
});

vi.mock('react', async (importOriginal) => ({
  ...await importOriginal<typeof import('react')>(),
  useRef: () => ({ current: null }),
  useEffect: () => {},
}));

afterEach(() => vi.unstubAllGlobals());

function findElement(node: ReactNode, matches: (element: ReactElement) => boolean): ReactElement | undefined {
  for (const child of Children.toArray(node)) {
    if (!isValidElement(child)) continue;
    if (matches(child)) return child;
    const found = findElement(child.props.children, matches);
    if (found) return found;
  }
}

describe('chat composer interactions', () => {
  it.each([
    { name: 'desktop Enter', desktop: true, shift: false, composing: false, text: 'yellow leaves', sends: true },
    { name: 'desktop Shift+Enter', desktop: true, shift: true, composing: false, text: 'yellow leaves', sends: false },
    { name: 'IME composition', desktop: true, shift: false, composing: true, text: 'yellow leaves', sends: false },
    { name: 'mobile Enter', desktop: false, shift: false, composing: false, text: 'yellow leaves', sends: false },
    { name: 'blank desktop Enter', desktop: true, shift: false, composing: false, text: '  ', sends: false },
  ])('handles $name without accidental submission', ({ desktop, shift, composing, text, sends }) => {
    vi.stubGlobal('window', { matchMedia: () => ({ matches: desktop }) });
    const onSubmit = vi.fn();
    const page = HomePage({ ...props(text), onSubmit });
    const input = findElement(page, (element) => element.props.id === 'ugatan-question');
    const preventDefault = vi.fn();
    input?.props.onKeyDown({
      key: 'Enter',
      shiftKey: shift,
      nativeEvent: { isComposing: composing },
      preventDefault,
    });
    expect(input).toBeDefined();
    expect(onSubmit).toHaveBeenCalledTimes(sends ? 1 : 0);
    expect(preventDefault).toHaveBeenCalledTimes(desktop && !shift && !composing ? 1 : 0);
  });

  it('appends voice transcription to the draft without sending it', () => {
    const onTextChange = vi.fn();
    const onSubmit = vi.fn();
    const page = HomePage({ ...props('  yellow leaves  '), onTextChange, onSubmit });
    const voice = findElement(page, (element) => element.type === VoiceInput);
    voice?.props.onTranscript('on the rice plant');
    expect(voice).toBeDefined();
    expect(onTextChange).toHaveBeenCalledWith('yellow leaves on the rice plant');
    expect(onSubmit).not.toHaveBeenCalled();
  });
});

it('connects the Tulong button to opening its dialog', () => {
  const onHelp = vi.fn();
  const page = HomePage({ ...props(), onHelp });
  const help = findElement(page, (element) => element.props['aria-label'] === 'Tulong');
  expect(help?.props['aria-haspopup']).toBe('dialog');
  expect(help?.props['aria-controls']).toBe('ugatan-help-dialog');
  help?.props.onClick();
  expect(onHelp).toHaveBeenCalledOnce();
});

it('identifies the new-chat control as opening the existing chat dialog', () => {
  const onNewConversation = vi.fn();
  const page = HomePage({ ...props(), onNewConversation });
  const newChat = findElement(page, (element) => element.props['aria-label'] === 'Bagong usapan');
  expect(newChat?.props['aria-haspopup']).toBe('dialog');
  expect(newChat?.props['aria-controls']).toBe('ugatan-history-dialog');
  newChat?.props.onClick();
  expect(onNewConversation).toHaveBeenCalledOnce();
});
