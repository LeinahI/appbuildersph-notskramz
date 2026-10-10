import { Children, isValidElement, type ReactElement, type ReactNode } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AdminApp, adminPage } from '../src/admin/AdminApp';
import { AdminDialog } from '../src/admin/AdminDialog';
import { RegistrationDialog } from '../src/admin/RegistrationDialog';
import { QrInvitation } from '../src/admin/UserPanel';
import { A } from '../src/admin/copy';
import { setDisplayPreferences, resetDisplayPreferences } from '../src/config/displayPreferences';
import { emptyDraft, fields, hasDraft, optional, toRegisterBody, validateDraft } from '../src/admin/registration';
import * as ws from '../src/config/ws';
import { WsApiError, type UserDTO } from '../src/lib/ws-api';
import { sileo } from 'sileo';

const hooks = vi.hoisted(() => ({ slots: [] as unknown[], index: 0, effects: [] as (() => void)[] }));
const api = vi.hoisted(() => ({ registerUser: vi.fn() }));
vi.mock('../src/lib/ws-api', async (importOriginal) => ({
  ...await importOriginal<typeof import('../src/lib/ws-api')>(),
  registerUser: api.registerUser,
}));
vi.mock('react', async (importOriginal) => ({
  ...await importOriginal<typeof import('react')>(),
  useEffect: (effect: () => void) => { hooks.effects.push(effect); },
  useRef: () => ({ current: null }),
  useState: (initial: unknown) => {
    const index = hooks.index++;
    if (!(index in hooks.slots)) hooks.slots[index] = typeof initial === 'function' ? initial() : initial;
    return [hooks.slots[index], (value: unknown) => {
      hooks.slots[index] = typeof value === 'function' ? value(hooks.slots[index]) : value;
    }];
  },
}));

const complete = {
  fullName: 'QA farmer', birthDate: '1980-05-01', phone: '', line1: 'Purok 3', barangay: 'Test barangay',
  municipality: 'Test town', province: 'Test province', consent: true,
};
const savedUser: UserDTO = {
  id: 'u-1', role: 'user', status: 'pending', fullName: 'QA farmer', createdAt: '2026-10-10T00:00:00Z',
  birthDate: '1980-05-01', address: { line1: 'Purok 3', line2: '', barangay: 'Test barangay', city: 'Test town', province: 'Test province', postalCode: '' },
};
const onClose = vi.fn();
function wizard() { hooks.index = 0; return RegistrationDialog({ onClose }); }
function find(node: ReactNode, matches: (element: ReactElement) => boolean): ReactElement {
  for (const child of Children.toArray(node)) {
    if (!isValidElement(child)) continue;
    if (matches(child)) return child;
    try { return find(child.props.children, matches); } catch { /* Look in the next sibling. */ }
  }
  throw new Error('Missing element');
}
function button(node: ReactNode, text: string) {
  return find(node, (element) => element.type === 'button' && element.props.children === text);
}
function fillDraft() {
  // Method cards include icons and descriptions, so select their displayed title.
  const manual = find(wizard(), (element) => element.type === 'button' && renderToStaticMarkup(element).includes(A.manualHint));
  manual.props.onClick();
  for (const { key } of fields) {
    find(wizard(), (element) => element.props.id === 'registration-' + key).props.onChange({ target: { value: complete[key] } });
  }
  find(wizard(), (element) => element.props.id === 'registration-consent').props.onChange({ target: { checked: true } });
}
function submitReview() {
  find(wizard(), (element) => element.type === 'form').props.onSubmit({ preventDefault: vi.fn() });
}
beforeEach(() => {
  hooks.slots = []; hooks.index = 0; hooks.effects = []; onClose.mockClear(); api.registerUser.mockReset();
  vi.stubGlobal('requestAnimationFrame', vi.fn());
});
describe('admin presentation cleanup', () => {
  it.each(['overview', 'users', 'qr', 'activity'])('removes development indicators on %s', (page) => {
    vi.stubGlobal('window', { location: { hash: '#' + page } });
    expect(renderToStaticMarkup(AdminApp())).not.toMatch(/UI preview|Front.?end only|This preview|admin-preview-|API is not connected/i);
  });
  it.each(['', '#login', '#unknown'])('routes the legacy login %s to the canonical staff login', (hash) => {
    const replace = vi.fn();
    vi.stubGlobal('window', { location: { hash, replace } });
    const html = renderToStaticMarkup(AdminApp());
    expect(html).not.toContain('<input');
    expect(html).toContain('href="/admin/login"');
    hooks.effects[1]();
    expect(replace).toHaveBeenCalledWith('/admin/login');
  });
  it('removes the draft-only banner while preserving registration and consent', () => {
    expect(renderToStaticMarkup(wizard())).not.toContain('Draft only.');
    fillDraft();
    const html = renderToStaticMarkup(wizard());
    expect(html).not.toContain('This preview');
    expect(html).toContain(A.consent);
  });
});
afterEach(() => vi.unstubAllGlobals());

describe('registration validation', () => {
  it.each(['1950-01-31', '1980-05-01', '2008-10-10'])('accepts birth date %s with complete details and consent', (birthDate) => {
    expect(validateDraft({ ...complete, birthDate }, '2026-10-10')).toEqual({});
  });
  it.each(['2026-02-31', '10/05/1980', 'not a date', '2026-10-11', '1800-01-01'])('rejects birth date %s', (birthDate) => {
    expect(validateDraft({ ...complete, birthDate }, '2026-10-10').birthDate).toBe(A.birthDateInvalid);
  });
  it('leaves the minimum age to ws and checks an optional phone only when given', () => {
    // ws rejects under-18 users; the form does not keep its own copy of that rule.
    expect(validateDraft({ ...complete, birthDate: '2015-01-01' }, '2026-10-10')).toEqual({});
    expect(validateDraft({ ...complete, phone: '0917 123 4567' }, '2026-10-10')).toEqual({});
    expect(validateDraft({ ...complete, phone: 'call me' }, '2026-10-10').phone).toBe(A.phoneInvalid);
  });
  it('requires consent and every field except phone', () => {
    expect(Object.keys(validateDraft(emptyDraft()))).toHaveLength(fields.length - optional.size + 1);
    expect(validateDraft({ ...complete, province: '   ', consent: false }, '2026-10-10')).toEqual({ province: A.required, consent: A.consentRequired });
    expect(hasDraft(emptyDraft())).toBe(false);
    expect(hasDraft(complete)).toBe(true);
  });
  it('builds the ws request from the draft', () => {
    const now = new Date('2026-10-10T01:02:03Z');
    expect(toRegisterBody({ ...complete, fullName: '  QA farmer ' }, now)).toEqual({
      fullName: 'QA farmer', birthDate: '1980-05-01', phone: undefined,
      address: { line1: 'Purok 3', line2: '', barangay: 'Test barangay', city: 'Test town', province: 'Test province', postalCode: '' },
      consentAt: '2026-10-10T01:02:03.000Z',
    });
  });
});

describe('admin pages and backend boundaries', () => {
  it.each(['login', 'overview', 'users', 'qr', 'activity'])('supports the %s page', (page) => {
    expect(adminPage('#' + page)).toBe(page);
    vi.stubGlobal('window', { location: { hash: '#' + page } });
    const html = renderToStaticMarkup(<AdminApp />);
    expect(html).not.toMatch(/Carla|Elena|Juan Dela|UG-001|18 or older|Simulate/);
    expect(html).not.toContain('figma.com/api/mcp/asset');
    if (page !== 'login') {
      expect(html).toContain(A.logout);
      expect(html).toContain(A.checking);
      expect(html).not.toMatch(/UI preview|Frontend only/);
    }
  });
  it('falls back to login for unknown fragments', () => {
    expect(adminPage('#admin-main')).toBe('login');
    expect(adminPage('#not-a-page')).toBe('login');
  });
  it('keeps unknown statistics separate from zero and empty records', () => {
    vi.stubGlobal('window', { location: { hash: '#overview' } });
    const html = renderToStaticMarkup(<AdminApp />);
    expect((html.match(/aria-label="Counts are not available yet"/g) ?? []).length).toBe(4);
    expect(html).toContain('—');
    expect(html).not.toContain('Hub is online');
  });
  it('uses English copy for admin pages, dialogs, and validation', () => {
    expect(A.overview).toBe('Overview');
    expect(A.help).toBe('Help');
    expect(A.fullName).toBe('Full name');
    expect(A.required).toBe('Complete this field.');
    expect(A.consentRequired).toBe('User consent is required.');
    expect(A.confirm).toBe('Confirm and save');
    expect(A.discardTitle).toBe('Discard this draft?');
    expect(A.helpSteps[0]).toBe('Choose manual entry or ID scan and ask for the user’s consent.');
    expect(A.qrPolicy).toBe('Single-use · Valid for 24 hours');
  });
  it('never presents a sample QR: a pending user without an invitation can only generate one', () => {
    const html = renderToStaticMarkup(<QrInvitation user={savedUser} />);
    expect(html).toContain(A.qrUnavailable);
    expect(html).not.toMatch(/<canvas|data:image|Simulate/);
    hooks.index = 0;
    const view = QrInvitation({ user: savedUser });
    expect(button(view, A.generateQr).props.disabled).toBe(false);
    expect(() => button(view, A.regenerateQr)).toThrow();
  });
  it('does not offer an invitation to a revoked user', () => {
    hooks.index = 0;
    const view = QrInvitation({ user: { ...savedUser, status: 'revoked' } });
    expect(button(view, A.generateQr).props.disabled).toBe(true);
    expect(renderToStaticMarkup(view)).toContain(A.qrNotPending);
  });
  it('uses native dialog cancellation with a labelled heading', () => {
    const close = vi.fn();
    const view = AdminDialog({ id: 'test-dialog', title: A.help, onClose: close, children: null });
    const preventDefault = vi.fn();
    view.props.onCancel({ preventDefault });
    expect(preventDefault).toHaveBeenCalled();
    expect(close).toHaveBeenCalledOnce();
    expect(view.props['aria-labelledby']).toBe('test-dialog-heading');
  });
});

describe('registration draft interactions', () => {
  it('announces an explicitly discarded draft without claiming registration succeeded', () => {
    const success = vi.spyOn(sileo, 'success');
    fillDraft();
    wizard().props.onClose();
    button(wizard(), A.discard).props.onClick();
    expect(success).toHaveBeenCalledWith(expect.objectContaining({ title: 'Draft discarded' }));
    expect(onClose).toHaveBeenCalledOnce();
    success.mockRestore();
    sileo.clear();
  });

  it('keeps every registration step in the same right-hand drawer', () => {
    expect(wizard().props.drawer).toBe('right');
    fillDraft();
    expect(wizard().props.drawer).toBe('right');
    submitReview();
    expect(wizard().props.drawer).toBe('right');
    wizard().props.onClose();
    expect(wizard().props.drawer).toBe('right');
    expect(button(wizard(), A.discard)).toBeDefined();
  });
  it('separates the right drawer header from its scrollable content without changing other dialogs', () => {
    const content = <p>Drawer content</p>;
    const drawer = AdminDialog({ id: 'drawer-test', title: A.detailsTitle, drawer: 'right', onClose, children: content });
    expect(drawer.props.className).toContain('admin-drawer-right');
    expect(drawer.props['aria-labelledby']).toBe('drawer-test-heading');
    expect(find(drawer, (element) => element.props.className === 'admin-drawer-content').props.children).toBe(content);
    const modal = AdminDialog({ id: 'help-test', title: A.help, onClose, children: content });
    expect(modal.props.className).toBe('admin-dialog');
    const navigation = AdminDialog({ id: 'menu-test', title: A.menuTitle, drawer: 'left', onClose, children: content });
    expect(navigation.props.className).toContain('admin-drawer-left');
    expect(navigation.props.className).not.toContain('admin-drawer-right');
  });
  it('routes Escape through discard protection and retains entered values when dismissed', () => {
    fillDraft();
    const drawer = AdminDialog(wizard().props);
    const preventDefault = vi.fn();
    drawer.props.onCancel({ preventDefault });
    expect(preventDefault).toHaveBeenCalledOnce();
    expect(onClose).not.toHaveBeenCalled();
    expect(wizard().props.drawer).toBe('right');
    button(wizard(), A.keepDraft).props.onClick();
    expect(find(wizard(), (element) => element.props.id === 'registration-fullName').props.value).toBe(complete.fullName);
  });
  it('returns the drawer content to the top and focuses its heading on a step change', () => {
    const drawer = AdminDialog({ id: 'step-test', title: A.reviewTitle, drawer: 'right', onClose, children: null });
    const body = find(drawer, (element) => element.props.className === 'admin-drawer-content') as ReactElement & { ref: { current: unknown } | null };
    const heading = find(drawer, (element) => element.type === 'h2') as ReactElement & { ref: { current: unknown } };
    expect(body.ref).not.toBeNull();
    const scroll = { scrollTop: 200 };
    const focus = vi.fn();
    body.ref!.current = scroll;
    heading.ref.current = { focus };
    hooks.effects.at(-1)?.();
    expect(scroll.scrollTop).toBe(0);
    expect(focus).toHaveBeenCalledOnce();
  });
  it('starts with an unchecked consent and no sample values', () => {
    const manual = find(wizard(), (element) => element.type === 'button' && renderToStaticMarkup(element).includes(A.manualHint));
    manual.props.onClick();
    const view = wizard();
    expect(find(view, (element) => element.props.id === 'registration-consent').props.checked).toBe(false);
    expect(find(view, (element) => element.props.id === 'registration-birthDate').props.type).toBe('date');
    expect(find(view, (element) => element.props.id === 'registration-phone').props.required).toBe(false);
    for (const { key } of fields) expect(find(view, (element) => element.props.id === 'registration-' + key).props.value).toBe('');
  });
  it('blocks review until fields and consent are valid', () => {
    const manual = find(wizard(), (element) => element.type === 'button' && renderToStaticMarkup(element).includes(A.manualHint));
    manual.props.onClick(); submitReview();
    const html = renderToStaticMarkup(wizard());
    expect(html).toContain(A.consentRequired);
    expect(html).toContain('role="alert"');
    expect(html).not.toContain(A.confirm);
  });
  it('reviews a draft and preserves edits before saving', () => {
    fillDraft(); submitReview();
    expect(renderToStaticMarkup(wizard())).toContain(complete.fullName);
    button(wizard(), A.edit).props.onClick();
    expect(find(wizard(), (element) => element.props.id === 'registration-birthDate').props.value).toBe(complete.birthDate);
    expect(find(wizard(), (element) => element.props.id === 'registration-consent').props.checked).toBe(true);
    expect(api.registerUser).not.toHaveBeenCalled();
  });
  it('saves through ws, then shows the saved record and its QR step', async () => {
    api.registerUser.mockResolvedValue(savedUser);
    const success = vi.spyOn(sileo, 'success');
    fillDraft(); submitReview();
    await button(wizard(), A.confirm).props.onClick();
    expect(api.registerUser).toHaveBeenCalledWith(expect.objectContaining({ fullName: 'QA farmer', birthDate: '1980-05-01' }));
    const html = renderToStaticMarkup(wizard());
    expect(html).toContain(A.savedNotice);
    expect(html).toContain('u-1');
    expect(success).toHaveBeenCalledWith(expect.objectContaining({ title: A.savedTitle }));
    button(wizard(), A.openQr).props.onClick();
    expect(renderToStaticMarkup(wizard())).toContain(A.qrUnavailable);
    // A saved record has no draft left to discard.
    wizard().props.onClose();
    expect(onClose).toHaveBeenCalledOnce();
    success.mockRestore();
    sileo.clear();
  });
  it('keeps the draft and explains a duplicate or rejected record', async () => {
    api.registerUser.mockRejectedValue(new WsApiError(409, 'user already registered'));
    fillDraft(); submitReview();
    await button(wizard(), A.confirm).props.onClick();
    expect(renderToStaticMarkup(wizard())).toContain(A.duplicate);
    api.registerUser.mockRejectedValue(new WsApiError(400, 'user must be at least 18 years old'));
    await button(wizard(), A.confirm).props.onClick();
    expect(renderToStaticMarkup(wizard())).toContain('User must be at least 18 years old.');
    expect(renderToStaticMarkup(wizard())).toContain(complete.fullName);
  });
  it('requires explicit discard and preserves the draft when cancelled', () => {
    fillDraft();
    wizard().props.onClose();
    expect(button(wizard(), A.discard)).toBeDefined();
    expect(onClose).not.toHaveBeenCalled();
    button(wizard(), A.keepDraft).props.onClick();
    expect(find(wizard(), (element) => element.props.id === 'registration-fullName').props.value).toBe(complete.fullName);
    wizard().props.onClose();
    button(wizard(), A.discard).props.onClick();
    expect(onClose).toHaveBeenCalledOnce();
  });
  it('discloses missing ID reading and offers manual entry without accepting an image', () => {
    const scan = find(wizard(), (element) => element.type === 'button' && renderToStaticMarkup(element).includes(A.scanHint));
    scan.props.onClick();
    expect(renderToStaticMarkup(wizard())).toContain(A.scanUnavailable);
    expect(renderToStaticMarkup(wizard())).not.toContain('type="file"');
    expect(button(wizard(), A.scanAction).props.disabled).toBe(true);
    expect(button(wizard(), A.review).props.disabled).toBe(true);
    button(wizard(), A.scanFallback).props.onClick();
    expect(button(wizard(), A.review).props.disabled).toBe(false);
    expect(find(wizard(), (element) => element.props.id === 'registration-consent').props.checked).toBe(false);
  });
});

describe('display preference entry points and draft safety', () => {
  it('keeps display preferences out of the login page', () => {
    vi.stubGlobal('window', { location: { hash: '#login' } });
    const html = renderToStaticMarkup(AdminApp());
    expect(html).not.toContain('Text &amp; display');
    expect(html).not.toContain('Display preferences');
    expect(html).not.toContain('aria-controls="admin-display"');
  });
  it('opens a labelled display dialog from the desktop workspace', () => {
    vi.stubGlobal('window', { location: { hash: '#overview' } });
    let view = AdminApp();
    const control = find(view, (element) => element.type === 'button' && element.props['aria-controls'] === 'admin-display');
    expect(control.props.className).toBe('admin-nav-action');
    expect(renderToStaticMarkup(control)).toContain('Display preferences');
    expect(renderToStaticMarkup(control)).toContain('<svg');
    control.props.onClick();
    hooks.index = 0; view = AdminApp();
    expect(find(view, (element) => element.props.id === 'admin-display').props.title).toBe('Display preferences');
  });

  it('uses the same labelled icon and action in the mobile admin menu', () => {
    vi.stubGlobal('window', { location: { hash: '#overview' } });
    button(AdminApp(), A.menu).props.onClick();
    hooks.index = 0;
    const menu = find(AdminApp(), (element) => element.props.id === 'admin-menu');
    const control = find(menu, (element) => element.type === 'button' && element.props['aria-controls'] === 'admin-display');
    expect(renderToStaticMarkup(control)).toContain('Display preferences');
    expect(renderToStaticMarkup(control)).toContain('<svg');
    control.props.onClick();
    hooks.index = 0;
    expect(find(AdminApp(), (element) => element.props.id === 'admin-display').props.title).toBe('Display preferences');
  });
  it('keeps an in-progress registration when display preferences change', () => {
    fillDraft();
    const before = wizard();
    expect(renderToStaticMarkup(before)).not.toContain('Text &amp; display');
    expect(renderToStaticMarkup(before)).not.toContain('registration-display');
    setDisplayPreferences({ textSize: 'extra-large', textWeight: 'stronger', contrast: 'high' });
    expect(find(wizard(), (element) => element.props.id === 'registration-fullName').props.value).toBe(complete.fullName);
    submitReview();
    expect(renderToStaticMarkup(wizard())).toContain(complete.fullName);
    expect(onClose).not.toHaveBeenCalled();
    resetDisplayPreferences();
  });
});
