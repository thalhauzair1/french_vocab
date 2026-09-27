/* Import / export: CSV for vocabulary, JSON for a full backup (including review history). */
FV.io = (() => {
  const HEADER = ['French', 'English', 'Example French', 'Example English', 'Category', 'Level', 'Type'];

  function csvEscape(value) {
    const text = String(value ?? '');
    return /[",\n\r]/.test(text) ? '"' + text.replace(/"/g, '""') + '"' : text;
  }

  function exportCSV() {
    const rows = FV.vocab.mine().map((v) =>
      [v.french, v.english, v.exampleFrench, v.exampleEnglish, v.category, v.level, v.type].map(csvEscape).join(','));
    // BOM so Excel opens accented characters correctly.
    return '﻿' + [HEADER.join(','), ...rows].join('\r\n');
  }

  /** RFC-4180-style parser (quoted fields, escaped quotes, newlines in quotes). */
  function parseCSV(text) {
    const rows = [];
    let row = [];
    let field = '';
    let inQuotes = false;
    text = text.replace(/^﻿/, '');
    for (let i = 0; i < text.length; i++) {
      const c = text[i];
      if (inQuotes) {
        if (c === '"' && text[i + 1] === '"') { field += '"'; i++; }
        else if (c === '"') inQuotes = false;
        else field += c;
      } else if (c === '"') inQuotes = true;
      else if (c === ',') { row.push(field); field = ''; }
      else if (c === '\n' || c === '\r') {
        if (c === '\r' && text[i + 1] === '\n') i++;
        row.push(field); rows.push(row); row = []; field = '';
      } else field += c;
    }
    if (field || row.length) { row.push(field); rows.push(row); }
    return rows.filter((r) => r.some((cell) => cell.trim()));
  }

  /** Returns { added, skipped }. Rows already in My Vocabulary (same French + English) are skipped. */
  function importCSV(text) {
    const rows = parseCSV(text);
    if (rows.length && rows[0][0].trim().toLowerCase() === 'french') rows.shift();
    const key = (fr, en) => FV.util.normalize(fr) + '|' + FV.util.normalize(en);
    const existing = new Set(FV.vocab.mine().map((v) => key(v.french, v.english)));
    let added = 0;
    let skipped = 0;
    rows.forEach(([french, english, exampleFrench, exampleEnglish, category, level, type]) => {
      if (!french || !english || existing.has(key(french, english))) { skipped++; return; }
      FV.vocab.create({
        french, english, exampleFrench, exampleEnglish,
        category: category || 'My Words',
        level: (level || '').toUpperCase(),
        type: (type || '').toLowerCase() || FV.vocab.inferType(french),
      });
      existing.add(key(french, english));
      added++;
    });
    return { added, skipped };
  }

  function exportBackup() {
    return JSON.stringify({ app: 'french-vocab-revision', exportedAt: new Date().toISOString(), data: FV.storage.state }, null, 2);
  }

  function importBackup(text) {
    const parsed = JSON.parse(text);
    const data = parsed && parsed.data ? parsed.data : parsed;
    if (!data || !Array.isArray(data.vocab)) throw new Error('Not a valid backup file');
    FV.storage.replace(data);
    return data.vocab.length;
  }

  return { exportCSV, importCSV, parseCSV, exportBackup, importBackup };
})();
