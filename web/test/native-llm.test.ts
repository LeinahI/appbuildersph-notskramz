import { describe, expect, it } from 'vitest';
import { buildChatMessages, buildMessages } from '@ugatan/shared';
import { toNativeRequest } from '../src/lib/native-llm';

describe('messages for the native model on the phone', () => {
  it('splits [system, earlier turns, question] into the system prompt, the turns, and the prompt', () => {
    const request = toNativeRequest([
      { role: 'system', content: 'You help farmers.' },
      { role: 'user', content: 'Dilaw ang dahon' },
      { role: 'assistant', content: 'Saan po ang dilaw?' },
      { role: 'user', content: 'Sa dulo po' },
    ]);
    expect(request).toEqual({
      system: 'You help farmers.',
      turns: [
        { role: 'user', text: 'Dilaw ang dahon' },
        { role: 'model', text: 'Saan po ang dilaw?' },
      ],
      prompt: 'Sa dulo po',
    });
  });

  it('keeps the app prompts whole: the explain prompt and a chat with history', () => {
    const explain = toNativeRequest(buildMessages('patay na puso', 'any', [], { sure: false }));
    expect(explain.system.length).toBeGreaterThan(100);
    expect(explain.prompt).toContain('patay na puso');
    expect(explain.turns).toEqual([]);

    const chat = toNativeRequest(buildChatMessages('Kumusta po', [{ question: 'Dilaw ang dahon', reply: 'Saan po?' }]));
    expect(chat.prompt).toContain('Kumusta po');
    expect(chat.turns.map((t) => t.role)).toEqual(['user', 'model']);
  });
});
