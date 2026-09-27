/*
 * Vocabulary repository: the data model, CRUD for "My Vocabulary",
 * the built-in database index, search, and review recording.
 */
FV.vocab = (() => {
  const { uid, slug, stripAccents } = FV.util;
  const S = () => FV.storage.state;

  const EDITABLE = ['french', 'english', 'exampleFrench', 'exampleEnglish', 'category', 'level', 'type'];
  const TYPES = ['word', 'expression', 'phrase'];
  const LEVELS = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'];

  function inferType(french) {
    const text = String(french).trim();
    const withoutArticle = text.replace(/^(le|la|les|un|une|des|du|l')\s*/i, '');
    if (!/\s/.test(withoutArticle)) return 'word';
    if (/[?!.]$/.test(text) || text.split(/\s+/).length >= 4) return 'phrase';
    return 'expression';
  }

  /* ---------- Built-in database index ---------- */
  const builtinList = [];
  const builtinById = new Map();
  const builtinCategories = []; // { level, category, key, items }

  FV.BUILTIN_DATA.forEach((group) => {
    const entry = { level: group.level, category: group.category, key: `${group.level}|${group.category}`, items: [] };
    group.items.forEach(([french, english, exampleFrench, exampleEnglish, type]) => {
      const item = {
        id: 'b-' + slug(`${group.level}-${group.category}-${french}`),
        french, english, exampleFrench, exampleEnglish,
        category: group.category, level: group.level,
        type: type || inferType(french),
        source: 'builtin', isFavorite: false, audio: 'tts',
      };
      builtinList.push(item);
      builtinById.set(item.id, item);
      entry.items.push(item);
    });
    builtinCategories.push(entry);
  });

  function blankProgress() {
    return {
      lastReviewedAt: null, nextReviewAt: null, firstReviewedAt: null,
      reviewCount: 0, correctCount: 0, incorrectCount: 0,
      interval: 0, successStreak: 0, lastResult: null, difficulty: null,
    };
  }

  /* ---------- Queries ---------- */
  const mine = () => S().vocab;
  const findMine = (id) => S().vocab.find((v) => v.id === id);
  const addedCopyOf = (builtinId) => S().vocab.find((v) => v.builtinId === builtinId);

  /** Look up any item by id: a user item, or a built-in (returning the user's copy if added). */
  function get(id) {
    const own = findMine(id);
    if (own) return own;
    const b = builtinById.get(id);
    if (!b) return null;
    return addedCopyOf(id) || { ...b, added: false };
  }

  const isInMyVocab = (item) => !!item && !!findMine(item.id);

  /** "All" = my vocabulary + built-in items not yet added. */
  function allItems() {
    const addedIds = new Set(S().vocab.map((v) => v.builtinId).filter(Boolean));
    // Hide built-ins the user already typed in themselves, so words don't appear twice.
    const ownFrench = new Set(S().vocab.map((v) => FV.util.normalize(v.french)));
    const notAdded = builtinList
      .filter((b) => !addedIds.has(b.id) && !ownFrench.has(FV.util.normalize(b.french)))
      .map((b) => ({ ...b, added: false }));
    return S().vocab.concat(notAdded);
  }

  function builtinItems() {
    return builtinList.map((b) => addedCopyOf(b.id) || { ...b, added: false });
  }

  function categories() {
    const names = new Set(builtinCategories.map((c) => c.category));
    S().vocab.forEach((v) => v.category && names.add(v.category));
    return [...names].sort((a, b) => a.localeCompare(b));
  }

  const fold = (text) => stripAccents(String(text || '').toLowerCase());

  /** Case- and accent-insensitive search across French, English, examples and category. */
  function search(list, query) {
    const q = fold(query).trim();
    if (!q) return list;
    return list.filter((item) =>
      fold(item.french).includes(q) || fold(item.english).includes(q) ||
      fold(item.exampleFrench).includes(q) || fold(item.exampleEnglish).includes(q) ||
      fold(item.category).includes(q));
  }

  /* ---------- Mutations ---------- */
  function clean(fields) {
    const out = {};
    EDITABLE.forEach((key) => {
      if (fields[key] !== undefined) out[key] = String(fields[key] || '').trim();
    });
    if (out.type !== undefined && !TYPES.includes(out.type)) out.type = inferType(out.french || '');
    return out;
  }

  function create(fields) {
    const data = clean(fields);
    const item = {
      id: uid('u'),
      french: '', english: '', exampleFrench: '', exampleEnglish: '',
      category: 'My Words', level: '', type: inferType(data.french || ''),
      ...data,
      isFavorite: !!fields.isFavorite,
      source: fields.source || 'user',
      builtinId: fields.builtinId || null,
      audio: 'tts', audioId: null,
      createdAt: new Date().toISOString(),
      ...blankProgress(),
    };
    if (!item.category) item.category = 'My Words';
    S().vocab.push(item);
    FV.storage.save();
    return item;
  }

  /** Edits content only; scheduling and review history are preserved. */
  function update(id, fields) {
    const item = findMine(id);
    if (!item) return null;
    Object.assign(item, clean(fields), { updatedAt: new Date().toISOString() });
    if (!item.category) item.category = 'My Words';
    FV.storage.save();
    return item;
  }

  function remove(id) {
    const idx = S().vocab.findIndex((v) => v.id === id);
    if (idx === -1) return;
    const [item] = S().vocab.splice(idx, 1);
    if (item.audioId) FV.audioStore.remove(item.audioId).catch(() => {});
    FV.storage.save();
  }

  function addBuiltin(builtinId, { save = true } = {}) {
    const existing = addedCopyOf(builtinId);
    if (existing) return existing;
    const b = builtinById.get(builtinId);
    if (!b) return null;
    const item = {
      id: uid('u'),
      french: b.french, english: b.english, exampleFrench: b.exampleFrench, exampleEnglish: b.exampleEnglish,
      category: b.category, level: b.level, type: b.type,
      isFavorite: false, source: 'builtin', builtinId: b.id,
      audio: 'tts', audioId: null,
      createdAt: new Date().toISOString(),
      ...blankProgress(),
    };
    S().vocab.push(item);
    if (save) FV.storage.save();
    return item;
  }

  function addCategory(level, category) {
    const entry = builtinCategories.find((c) => c.level === level && c.category === category);
    if (!entry) return 0;
    let count = 0;
    entry.items.forEach((b) => {
      if (!addedCopyOf(b.id)) { addBuiltin(b.id, { save: false }); count++; }
    });
    FV.storage.save();
    return count;
  }

  /** Favoriting a built-in that isn't in My Vocabulary adds it first. Returns the stored item. */
  function toggleFavorite(id) {
    let item = findMine(id);
    if (!item && builtinById.has(id)) item = addBuiltin(id);
    if (!item) return null;
    item.isFavorite = !item.isFavorite;
    FV.storage.save();
    return item;
  }

  function setAudio(id, audioId) {
    const item = findMine(id);
    if (!item) return;
    item.audioId = audioId;
    item.audio = audioId ? 'recording' : 'tts';
    FV.storage.save();
  }

  /** Apply a review result: schedule the item and append to the history log. */
  function recordReview(id, { questionType, correct, rating }) {
    const item = findMine(id);
    if (!item) return null;
    const now = new Date();
    const scheduled = FV.srs.schedule(item, rating, now);
    Object.assign(item, scheduled, {
      lastReviewedAt: now.toISOString(),
      firstReviewedAt: item.firstReviewedAt || now.toISOString(),
      reviewCount: (item.reviewCount || 0) + 1,
      correctCount: (item.correctCount || 0) + (correct ? 1 : 0),
      incorrectCount: (item.incorrectCount || 0) + (correct ? 0 : 1),
      lastResult: correct ? 'correct' : 'incorrect',
      difficulty: rating,
    });
    const state = S();
    state.reviews.push({
      id: uid('r'), vocabId: item.id, at: now.toISOString(), questionType,
      correct: !!correct, rating, nextReviewAt: item.nextReviewAt,
    });
    const key = FV.util.dayKey(now);
    state.activity[key] = (state.activity[key] || 0) + 1;
    FV.storage.save();
    return item;
  }

  return {
    TYPES, LEVELS, inferType,
    builtinList, builtinCategories, builtinById,
    mine, get, findMine, isInMyVocab, addedCopyOf, allItems, builtinItems, categories, search,
    create, update, remove, addBuiltin, addCategory, toggleFavorite, setAudio, recordReview,
  };
})();
