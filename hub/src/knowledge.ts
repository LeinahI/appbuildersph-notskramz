import { readdirSync, readFileSync } from 'node:fs';
import { assertValidEntries, type KnowledgeEntry } from '@ugatan/shared';

/** Reads every knowledge/<id>.json file in the folder and fails loudly if one is malformed. */
export function loadKnowledge(folder: URL): KnowledgeEntry[] {
  const entries = readdirSync(folder)
    .filter((f) => f.endsWith('.json'))
    .sort()
    .map((f) => JSON.parse(readFileSync(new URL(f, folder), 'utf8')) as KnowledgeEntry);
  assertValidEntries(entries);
  return entries;
}
