import { createElement, createRef } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import { ConfirmDialog } from '../src/components/ConfirmDialog';
import { L } from '../src/config/labels';

describe('ConfirmDialog', () => {
  it('renders the shared chat-history dialog with title, body, and actions', () => {
    const html = renderToStaticMarkup(
      createElement(ConfirmDialog, {
        ref: createRef<HTMLDialogElement>(),
        copy: {
          title: L.deleteConversationConfirmTitle,
          body: L.deleteConversationConfirmBody,
          confirm: L.deleteConversationConfirmYes,
          cancel: L.deleteConversationConfirmNo,
        },
        onConfirm: vi.fn(),
      }),
    );
    expect(html).toContain('class="chat-history max-w-md"');
    expect(html).toContain('Burahin ang usapan?');
    expect(html).toContain('Mawawala ang usapan na ito sa device na ito.');
    expect(html).toContain('Burahin');
    expect(html).toContain('Hindi muna');
    expect(html).toContain('method="dialog"');
  });
});
