import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { VoiceInput } from '../src/components/VoiceInput';

describe('voice input', () => {
  it('renders nothing where the Web Speech API is missing (the test runs in Node, with no window)', () => {
    const html = renderToStaticMarkup(createElement(VoiceInput, { onTranscript: () => {} }));
    expect(html).toBe('');
  });
});
