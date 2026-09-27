/*
 * Native-speaker recordings from Lingua Libre (hosted on Wikimedia Commons, CC BY-SA).
 * Real human recordings, found by exact filename match (no AI involved).
 * Downloaded recordings are stored in IndexedDB so they play offline.
 */
FV.nativeAudio = (() => {
  const API = 'https://commons.wikimedia.org/w/api.php';
  const PREFIX = 'LL-Q150 (fra)-'; // Lingua Libre, language Q150 = French
  const RECHECK_MS = 30 * 24 * 60 * 60 * 1000;
  const inflight = new Map();

  const S = () => FV.storage.state;
  const index = () => S().nativeAudio;

  function clean(text) {
    return String(text || '').normalize('NFC')
      .replace(/[’‘]/g, "'")
      .replace(/…/g, '')
      .replace(/\s*[?!.]+\s*$/, '')
      .replace(/\s+/g, ' ')
      .trim();
  }
  const key = (text) => clean(text).toLowerCase();
  const storeId = (text) => 'n:' + key(text);

  /** Try the exact text first, then without a leading article ("le pain" → "pain"). */
  function variants(text) {
    const t = clean(text);
    const out = [t];
    const m = t.match(/^(le |la |les |un |une |des |du |l')(.+)$/i);
    if (m) out.push(m[2]);
    return [...new Set(out)];
  }

  // CirrusSearch uses Lucene regex syntax.
  const escapeRegex = (s) => s.replace(/[.?+*|{}[\]()"\\#@&<>~/]/g, '\\$&');

  // Wikimedia rate-limits bursts, so calls are queued, spaced out, and retried on HTTP 429.
  // The gap between calls grows when Wikimedia says "slow down" and shrinks back as calls succeed.
  const MIN_GAP_MS = 700;
  const MAX_GAP_MS = 8000;
  let gap = MIN_GAP_MS;
  let lastCall = 0;
  let chain = Promise.resolve();
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  const HEADERS = { 'Api-User-Agent': 'MotsFrenchRevision/1.1 (offline French vocabulary app)' };

  function api(params) {
    const run = async () => {
      const wait = lastCall + gap - Date.now();
      if (wait > 0) await sleep(wait);
      const url = API + '?' + new URLSearchParams({ ...params, format: 'json', origin: '*' });
      for (let attempt = 0; ; attempt++) {
        lastCall = Date.now();
        const res = await fetch(url, { headers: HEADERS });
        if (res.status === 429) {
          gap = Math.min(MAX_GAP_MS, gap * 2);
          if (attempt < 3) { await sleep(2000 * (attempt + 1) ** 2); continue; }
        } else {
          gap = Math.max(MIN_GAP_MS, Math.round(gap * 0.85));
        }
        if (!res.ok) throw new Error('Wikimedia request failed: ' + res.status);
        const data = await res.json();
        if (data.error) throw new Error(data.error.info || 'Wikimedia error');
        return data;
      }
    };
    const p = chain.then(run, run);
    chain = p.catch(() => {});
    return p;
  }

  /** Find native recordings for a word/phrase. Returns [{ title, speaker, url, page, license }]. */
  async function search(text, limit = 8, { deep = true } = {}) {
    const results = [];
    const seen = new Set();
    const collect = (data, word) => {
      const suffix = `-${word}.wav`.toLowerCase();
      (data.query?.search || []).forEach((s) => {
        const title = s.title.replace(/^File:/, '').normalize('NFC');
        if (seen.has(title) || !title.startsWith(PREFIX) || !title.toLowerCase().endsWith(suffix)) return;
        const speaker = title.slice(PREFIX.length, title.length - suffix.length);
        if (!speaker) return;
        seen.add(title);
        // A hyphen in the "speaker" part usually means a longer compound word (e.g. "coupe-pain").
        results.push({ title, speaker, word, exact: !speaker.includes('-') });
      });
    };
    for (const word of variants(text)) {
      if (!word) continue;
      // Cheap phrase search first; the expensive (heavily rate-limited) regex search only if it misses.
      collect(await api({
        action: 'query', list: 'search', srnamespace: '6', srlimit: '50',
        srsearch: `intitle:"LL-Q150 (fra)" intitle:"${word.replace(/"/g, '')}"`,
      }), word);
      if (deep && !results.some((r) => r.exact)) {
        const regex = await api({
          action: 'query', list: 'search', srnamespace: '6', srlimit: '40',
          srsearch: `intitle:"LL-Q150 (fra)" intitle:/-${escapeRegex(word)}\\.wav/i`,
        }).catch(() => null); // regex search is often throttled; the phrase results still count
        if (regex) collect(regex, word);
      }
      if (results.some((r) => r.exact)) break;
    }
    // Uncertain matches (maybe a compound like "coupe-pain") only when nothing exact exists.
    const exact = results.filter((r) => r.exact);
    const top = (exact.length ? exact : results).slice(0, limit);
    if (!top.length) return [];

    const info = await api({
      action: 'query', prop: 'imageinfo', iiprop: 'url|extmetadata', iiextmetadatafilter: 'LicenseShortName',
      titles: top.map((r) => 'File:' + r.title).join('|'),
    });
    const pages = Object.values(info.query?.pages || {});
    top.forEach((r) => {
      const page = pages.find((p) => p.title.normalize('NFC') === 'File:' + r.title);
      const ii = page && page.imageinfo && page.imageinfo[0];
      if (!ii) return;
      r.url = ii.url;
      r.page = ii.descriptionurl;
      r.license = (ii.extmetadata && ii.extmetadata.LicenseShortName && ii.extmetadata.LicenseShortName.value) || 'CC BY-SA 4.0';
    });
    return top.filter((r) => r.url);
  }

  async function download(url) {
    const res = await fetch(url);
    if (!res.ok) throw new Error('Download failed: ' + res.status);
    return res.blob();
  }

  async function save(text, rec, blob) {
    await FV.audioStore.put(storeId(text), blob);
    index()[key(text)] = {
      speaker: rec.speaker, title: rec.title, page: rec.page, license: rec.license, savedAt: new Date().toISOString(),
    };
    FV.storage.save();
  }

  /** Download a specific recording (chosen by the user) and use it for this text. */
  async function use(text, rec) {
    const blob = await download(rec.url);
    await save(text, rec, blob);
    return blob;
  }

  /** Find and save the best recording. Resolves to the Blob, or null if none exists. */
  function fetchBest(text) {
    const k = key(text);
    if (inflight.has(k)) return inflight.get(k);
    const p = (async () => {
      const recs = await search(text, 3, { deep: false });
      if (!recs.length) {
        index()[k] = { missing: true, checkedAt: new Date().toISOString() };
        FV.storage.save();
        return null;
      }
      return use(text, recs[0]);
    })();
    inflight.set(k, p);
    p.finally(() => inflight.delete(k)).catch(() => {});
    return p;
  }

  function info(text) {
    const entry = index()[key(text)];
    return entry && !entry.missing ? entry : null;
  }

  function shouldLookup(text) {
    const entry = index()[key(text)];
    if (!entry) return true;
    if (entry.missing) return Date.now() - new Date(entry.checkedAt).getTime() > RECHECK_MS;
    return false;
  }

  async function getCached(text) {
    if (!info(text)) return null;
    const blob = await FV.audioStore.get(storeId(text)).catch(() => null);
    if (!blob) { // index restored from a backup without the audio itself
      delete index()[key(text)];
      FV.storage.save();
    }
    return blob || null;
  }

  async function remove(text) {
    await FV.audioStore.remove(storeId(text)).catch(() => {});
    delete index()[key(text)];
    FV.storage.save();
  }

  async function clearAll() {
    await Promise.all(Object.keys(index()).map((k) => FV.audioStore.remove('n:' + k).catch(() => {})));
    S().nativeAudio = {};
    FV.storage.save();
  }

  const savedCount = () => Object.values(index()).filter((e) => !e.missing).length;

  /** Download recordings for many words. onProgress({done, total, found, missing, failed}). */
  async function bulk(texts, { onProgress, isCancelled } = {}) {
    const queue = [...new Set(texts.map(clean))].filter((t) => shouldLookup(t));
    const stats = { done: 0, total: queue.length, found: 0, missing: 0, failed: 0 };
    onProgress && onProgress(stats);
    const worker = async () => {
      while (queue.length && !(isCancelled && isCancelled())) {
        const text = queue.shift();
        try {
          const blob = await fetchBest(text);
          if (blob) stats.found++; else stats.missing++;
        } catch (err) {
          stats.failed++;
        }
        stats.done++;
        onProgress && onProgress(stats);
      }
    };
    await Promise.all([worker(), worker()]); // API calls are queued anyway; two workers overlap downloads
    return stats;
  }

  return { search, use, fetchBest, info, shouldLookup, getCached, remove, clearAll, savedCount, bulk, key };
})();
