import { assertValidEntries, type KnowledgeEntry } from '@ugatan/shared';

// Loaded at build time from /knowledge. Each JSON file is one problem.
const files = import.meta.glob('../../../knowledge/*.json', { eager: true, import: 'default' }) as Record<
  string,
  KnowledgeEntry
>;

export const KNOWLEDGE: KnowledgeEntry[] = Object.keys(files)
  .sort()
  .map((path) => files[path]);

// Fail the build early if a knowledge file is malformed or breaks the guardrail.
assertValidEntries(KNOWLEDGE);

export const KNOWLEDGE_BY_ID = new Map(KNOWLEDGE.map((e) => [e.id, e]));
