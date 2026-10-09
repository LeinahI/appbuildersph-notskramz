import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const shared = readFileSync(new URL('../src/index.css', import.meta.url), 'utf8');
const preferences = readFileSync(new URL('../src/display-preferences.css', import.meta.url), 'utf8');
const admin = readFileSync(new URL('../src/admin/admin.css', import.meta.url), 'utf8');
function tokens(css: string) {
  return Object.fromEntries([...css.matchAll(/--color-([a-z-]+):\s*(#[a-f\d]{6})/gi)].map((match) => [match[1], match[2]]));
}
function luminance(hex: string) {
  const rgb = hex.slice(1).match(/../g)!.map((channel) => {
    const n = parseInt(channel, 16) / 255;
    return n <= .04045 ? n / 12.92 : ((n + .055) / 1.055) ** 2.4;
  });
  return rgb[0] * .2126 + rgb[1] * .7152 + rgb[2] * .0722;
}
function ratio(a: string, b: string) {
  const values = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (values[0] + .05) / (values[1] + .05);
}
describe('display style coverage', () => {
  it('keeps preference dialog geometry independent of text scaling with scrollable content', () => {
    const frame = preferences.match(/:is\(#ugatan-display-dialog, #admin-display\)\s*\{([^}]+)\}/)?.[1];
    expect(frame).toBeDefined();
    expect(frame).toMatch(/height:\s*min\(\d+px,\s*calc\(100dvh/);
    expect(frame).not.toMatch(/\b(?:rem|em)\b/);
    expect(frame).toContain('overflow: hidden');
    expect(preferences).toContain(':is(#ugatan-display-dialog, #admin-display)[open]');
    const content = preferences.match(/:is\(#ugatan-display-dialog, #admin-display\) > \.display-preferences\s*\{([^}]+)\}/)?.[1];
    expect(content).toContain('min-height: 0');
    expect(content).toContain('overflow-y: auto');
  });
  it('keeps normal-size foreground tokens readable on every shared surface', () => {
    const color = tokens(shared);
    for (const foreground of ['ink', 'mist', 'muted', 'label', 'leaf']) {
      for (const background of ['canvas', 'paper', 'surface', 'sprout', 'leaf-soft', 'warn']) {
        expect(ratio(color[foreground], color[background]), foreground + ' on ' + background).toBeGreaterThanOrEqual(4.5);
      }
    }
    expect(ratio('#ffffff', color.leaf)).toBeGreaterThanOrEqual(4.5);
    expect(ratio(color.line, color.paper)).toBeGreaterThanOrEqual(3);
  });
  it('uses a high-contrast palette and scalable admin typography', () => {
    const color = tokens(preferences);
    for (const foreground of ['ink', 'mist', 'muted', 'label', 'leaf']) {
      for (const background of ['canvas', 'paper', 'surface', 'sprout', 'leaf-soft']) {
        expect(ratio(color[foreground], color[background])).toBeGreaterThanOrEqual(7);
      }
    }
    expect(admin).not.toMatch(/font-size:\s*\d+px/);
    expect(preferences).toContain("font-size: 125%");
    expect(preferences).toContain("font-size: 150%");
    expect(preferences).toContain('@media (forced-colors: active)');
    expect(shared).toContain('@media (prefers-reduced-motion: reduce)');
  });
});
