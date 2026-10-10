import { Children, isValidElement, type ReactElement, type ReactNode } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AdminApp, Login, adminPage } from '../src/admin/AdminApp';
import { AdminDialog } from '../src/admin/AdminDialog';
import { RegistrationDialog, QrInvitation } from '../src/admin/RegistrationDialog';
import { A } from '../src/admin/copy';
import { setDisplayPreferences, resetDisplayPreferences } from '../src/config/displayPreferences';
import { emptyDraft, fields, hasDraft, validateDraft } from '../src/admin/registration';
import * as ws from '../src/config/ws';
import { sileo } from 'sileo';

const hooks = vi.hoisted(() => ({ slots: [] as unknown[], index: 0, effects: [] as (() => void)[] }));
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

const complete = { fullName: 'QA farmer', age: '23', barangay: 'Test barangay', municipality: 'Test town', province: 'Test province', consent: true };
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
  hooks.slots = []; hooks.index = 0; hooks.effects = []; onClose.mockClear();
  vi.stubGlobal('requestAnimationFrame', vi.fn());
});
afterEach(() => vi.unstubAllGlobals());

describe('registration validation with age 18+', () => {
  it.each(['18', '23', '75'])('accepts age %s with complete details and consent', (age) => {
    expect(validateDraft({ ...complete, age })).toEqual({});
  });
  it.each(['0', '12', '15', '17'])('rejects underage %s', (age) => {
    expect(validateDraft({ ...complete, age }).age).toBe(A.ageUnderage);
  });
  it.each(['-1', '1.5', 'not a number', 'Infinity'])('rejects invalid numeric age %s', (age) => {
    expect(validateDraft({ ...complete, age }).age).toBe(A.ageInvalid);
  });
  it('requires consent and complete address fields', () => {
    expect(Object.keys(validateDraft(emptyDraft()))).toHaveLength(6);
    expect(validateDraft({ ...complete, province: '   ', consent: false })).toEqual({ province: A.required, consent: A.consentRequired });
    expect(hasDraft(emptyDraft())).toBe(false);
    expect(hasDraft(complete)).toBe(true);
  });
  it('maps draft age to RegisterBody birthDate and address', async () => {
    const { draftToRegisterBody } = await import('../src/admin/registration');
    const body = draftToRegisterBody(complete, new Date(Date.UTC(2026, 9, 10)));
    expect(body.birthDate).toBe('2003-01-01');
    expect(body.address.line1).toBe('Test barangay');
    expect(body.address.city).toBe('Test town');
    expect(body.address.province).toBe('Test province');
    expect(body.fullName).toBe('QA farmer');
    expect(body.consentAt).toBeTruthy();
  });
});

describe('admin pages and backend boundaries', () => {
  it.each(['login', 'overview', 'users', 'qr', 'activity'])('supports the %s page', (page) => {
    expect(adminPage('#' + page)).toBe(page);
    vi.stubGlobal('window', { location: { hash: '#' + page } });
    const html = renderToStaticMarkup(<AdminApp />);
    expect(html).not.toMatch(/Carla|Elena|Juan Dela|UG-001|18 or older|Simulate/);
    expect(html).not.toContain('figma.com/api/mcp/asset');
    if (page !== 'login') expect(html).toContain(A.previewNotice);
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
  it('sends an already-signed-in preview login to the SPA /admin/overview shell', () => {
    const replace = vi.fn();
    vi.stubGlobal('window', { location: { replace, hash: '#login' } });
    const token = vi.spyOn(ws, 'loadAdminToken').mockReturnValue('jwt-token');
    Login();
    for (const effect of hooks.effects) effect();
    expect(replace).toHaveBeenCalledWith('/admin/overview');
    token.mockRestore();
  });
  it('collects admin email and password for ws login', () => {
    const view = Login();
    expect(find(view, (element) => element.props.id === 'admin-email').props.disabled).toBe(false);
    expect(find(view, (element) => element.props.id === 'admin-password').props.disabled).toBe(false);
    expect(button(view, A.signIn).props.disabled).toBe(false);
    const toggle = find(view, (element) => element.type === 'button' && element.props['aria-label'] === A.showPassword);
    expect(toggle.props['aria-pressed']).toBe(false);
    expect(find(toggle, (element) => element.type === 'svg').props['aria-hidden']).toBe(true);
    toggle.props.onClick();
    hooks.index = 0;
    const shown = Login();
    expect(find(shown, (element) => element.props.id === 'admin-password').props.type).toBe('text');
    expect(find(shown, (element) => element.props['aria-label'] === A.hidePassword).props['aria-pressed']).toBe(true);
    expect(renderToStaticMarkup(view)).toContain(A.email);
    expect(renderToStaticMarkup(view)).not.toContain('admin-preview-link');
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
    expect(A.loginDescription).toBe('For Ugatan hub administrators.');
  });
  it('never presents a fake QR or enables access mutations', () => {
    const html = renderToStaticMarkup(<QrInvitation />);
    expect(html).toContain(A.qrUnavailable);
    expect(html).not.toMatch(/<canvas|data:image|14:46|Simulate/);
    expect(html).not.toContain('Regenerate QR');
    for (const action of [A.generateQr, A.downloadQr]) {
      expect(button(QrInvitation(), action).props.disabled).toBe(true);
    }
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
    button(wizard(), A.previewRecord).props.onClick();
    expect(wizard().props.drawer).toBe('right');
    find(wizard(), (element) => typeof element.props.onQr === 'function').props.onQr();
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
    expect(find(view, (element) => element.props.id === 'registration-age').props.min).toBe(18);
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
  it('rejects under-18 before review and keeps the draft editable', () => {
    fillDraft();
    find(wizard(), (element) => element.props.id === 'registration-age').props.onChange({ target: { value: '15' } });
    submitReview();
    expect(renderToStaticMarkup(wizard())).toContain(A.ageUnderage);
    expect(renderToStaticMarkup(wizard())).not.toContain(A.confirm);
    expect(find(wizard(), (element) => element.props.id === 'registration-age').props.value).toBe('15');
  });
  it('reviews a valid draft with confirm enabled and opens draft QR preview', () => {
    fillDraft();
    submitReview();
    expect(renderToStaticMarkup(wizard())).toContain(complete.fullName);
    expect(button(wizard(), A.confirm).props.disabled).toBe(false);
    button(wizard(), A.previewRecord).props.onClick();
    expect(renderToStaticMarkup(wizard())).toContain(A.recordPreviewNotice);
    expect(renderToStaticMarkup(wizard())).toContain(complete.fullName);
    const record = find(wizard(), (element) => typeof element.props.onQr === 'function');
    record.props.onQr();
    expect(renderToStaticMarkup(wizard())).toContain(A.qrUnavailable);
    expect(renderToStaticMarkup(wizard())).not.toContain('UG-001');
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
    const html = renderToStaticMarkup(Login());
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
