/* Local persistent storage (localStorage). All app data lives in one JSON document. */
FV.storage = (() => {
  const KEY = 'fvr-data-v1';

  function defaults() {
    return {
      version: 1,
      vocab: [],        // My Vocabulary (user-entered + added built-ins)
      reviews: [],      // review history log (never deleted on edit)
      grammar: { favorites: {}, reviewed: {} },
      activity: {},     // { 'YYYY-MM-DD': reviewCount }
      nativeAudio: {},  // { wordKey: { speaker, title, page, license } | { missing, checkedAt } } — blobs live in IndexedDB
      settings: {
        reviewSize: 20,
        newPerDay: 10,
        reviewMode: 'random', // question type used by "Start Review"
        audioRate: 1,
        audioSource: 'native', // native (recordings first) | tts
        autoNative: true,      // download native recordings automatically when online
        voiceURI: '',          // '' = best available French voice
        autoplay: true,        // play pronunciation when an answer is revealed
        theme: 'system', // system | light | dark
        reminders: { enabled: false, preset: 'evening', time: '19:00' },
      },
      meta: { lastCategory: null, lastReminderDate: null, createdAt: new Date().toISOString() },
    };
  }

  /** Fill in any keys missing from older saved data. */
  function merge(base, saved) {
    const out = { ...base, ...saved };
    for (const key of ['grammar', 'settings', 'meta']) {
      out[key] = { ...base[key], ...(saved[key] || {}) };
    }
    out.settings.reminders = { ...base.settings.reminders, ...((saved.settings || {}).reminders || {}) };
    out.vocab = Array.isArray(saved.vocab) ? saved.vocab : [];
    out.reviews = Array.isArray(saved.reviews) ? saved.reviews : [];
    out.activity = saved.activity || {};
    out.nativeAudio = saved.nativeAudio || {};
    return out;
  }

  let state = load();

  function load() {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) return merge(defaults(), JSON.parse(raw));
    } catch (err) {
      console.warn('Could not read saved data', err);
    }
    return defaults();
  }

  function save() {
    try {
      localStorage.setItem(KEY, JSON.stringify(state));
    } catch (err) {
      console.error('Could not save data', err);
      FV.util.toast('⚠ Could not save — storage may be full');
    }
  }

  function replace(data) {
    state = merge(defaults(), data);
    save();
  }

  function resetProgress() {
    // Keep the vocabulary list itself but clear all scheduling + history.
    state.vocab.forEach((item) => {
      Object.assign(item, {
        lastReviewedAt: null, nextReviewAt: null, firstReviewedAt: null, reviewCount: 0,
        correctCount: 0, incorrectCount: 0, interval: 0, successStreak: 0, lastResult: null,
      });
    });
    state.reviews = [];
    state.activity = {};
    state.grammar.reviewed = {};
    state.meta.lastCategory = null;
    save();
  }

  return {
    get state() { return state; },
    save, replace, resetProgress, defaults,
  };
})();
