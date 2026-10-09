import { afterEach, describe, expect, it, vi } from 'vitest';
import { sileo } from 'sileo';
import { notify } from '../src/components/ToastHost';

afterEach(() => { vi.restoreAllMocks(); sileo.clear(); });

describe('shared notification behavior', () => {
  it('provides localized dismissal and a generous reading time', () => {
    const info = vi.spyOn(sileo, 'info');
    const dismiss = vi.spyOn(sileo, 'dismiss');
    const id = notify({ title: 'Larawan', description: 'Ilarawan muna ang iyong pananim.' });
    const options = info.mock.calls[0][0];
    expect(options.duration).toBe(10000);
    expect(options.button?.title).toBe('Isara');
    options.button?.onClick();
    expect(dismiss).toHaveBeenCalledWith(id);
  });

  it('keeps errors until dismissed and does not expose raw exceptions', () => {
    const error = vi.spyOn(sileo, 'error');
    notify({ title: 'Voice input', description: 'Type your question instead.', type: 'error', language: 'en' });
    expect(error).toHaveBeenCalledWith(expect.objectContaining({
      duration: null, description: 'Type your question instead.',
      button: expect.objectContaining({ title: 'Close' }),
    }));
  });
});
