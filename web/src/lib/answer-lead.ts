const LIST_ITEM = /^\s*(?:\d+[.)]|[-•*])\s+/;

/**
 * The model's explanation without its numbered or bulleted steps. The diagnosis card lists the curated steps right
 * below, so the lead keeps only the prose: what the problem is and what the signs mean. A line that only introduces
 * a dropped list ("Gawin ito:") goes with it. Returns one string per paragraph.
 */
export function leadParagraphs(text: string): string[] {
  const kept: string[] = [];
  let droppedList = false;
  for (const line of text.split(/\r?\n/)) {
    if (LIST_ITEM.test(line)) {
      if (!droppedList && kept.length > 0 && kept[kept.length - 1]!.trim().endsWith(':')) kept.pop();
      droppedList = true;
      continue;
    }
    droppedList = false;
    kept.push(line);
  }
  return kept
    .join('\n')
    .split(/\n\s*\n/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean);
}
