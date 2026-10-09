export type Lang = 'en' | 'tl' | 'taglish';

export interface EvalRow {
  text: string;
  /** Knowledge id, or "none" when the description should get a "not sure" answer. */
  expectedId: string;
  lang: Lang;
}

/** Parses the labeled CSV (text, expectedId, lang). Handles quoted fields with commas and doubled quotes. */
export function parseEvalCsv(source: string): EvalRow[] {
  const rows: string[][] = [];
  let field = '';
  let row: string[] = [];
  let quoted = false;
  for (let i = 0; i < source.length; i++) {
    const c = source[i];
    if (quoted) {
      if (c === '"' && source[i + 1] === '"') {
        field += '"';
        i++;
      } else if (c === '"') {
        quoted = false;
      } else {
        field += c;
      }
    } else if (c === '"') {
      quoted = true;
    } else if (c === ',') {
      row.push(field);
      field = '';
    } else if (c === '\n' || c === '\r') {
      if (c === '\r' && source[i + 1] === '\n') i++;
      row.push(field);
      if (row.some((f) => f.trim() !== '')) rows.push(row);
      row = [];
      field = '';
    } else {
      field += c;
    }
  }
  row.push(field);
  if (row.some((f) => f.trim() !== '')) rows.push(row);

  const [header, ...body] = rows;
  if (!header || header.map((h) => h.trim()).join(',') !== 'text,expectedId,lang') {
    throw new Error('eval CSV header must be: text,expectedId,lang');
  }
  return body.map((cols, i) => {
    const [text, expectedId, lang] = cols.map((c) => c.trim());
    if (!text || !expectedId) throw new Error(`eval CSV row ${i + 2} is missing text or expectedId`);
    if (lang !== 'en' && lang !== 'tl' && lang !== 'taglish') {
      throw new Error(`eval CSV row ${i + 2}: lang must be en, tl, or taglish. Got "${lang}".`);
    }
    return { text, expectedId, lang };
  });
}
