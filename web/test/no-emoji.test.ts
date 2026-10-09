import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const SRC = join(__dirname, '..', 'src');

function sourceFiles(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) return sourceFiles(path);
    return /\.(tsx?|css)$/.test(entry.name) ? [path] : [];
  });
}

describe('interface text', () => {
  it('uses vector icons and typography, never emoji', () => {
    const found = sourceFiles(SRC).flatMap((file) =>
      readFileSync(file, 'utf8')
        .split(/\r?\n/)
        .flatMap((line, i) => (/\p{Extended_Pictographic}/u.test(line.replace(/[©®™]/g, '')) ? [`${file}:${i + 1}`] : [])),
    );
    expect(found).toEqual([]);
  });
});
