/* Review session state: which items, which mode, results so far. UI lives in views/practice.js. */
FV.session = (() => {
  let current = null;
  const S = () => FV.storage.state;

  function sizeSetting() {
    const size = S().settings.reviewSize;
    return size === 'all' ? 'all' : Number(size) || 20;
  }

  /** Start a session with an explicit list of items. */
  function start({ items, mode = 'random', label = 'Practice', category = null, level = null }) {
    if (!items.length) {
      FV.util.toast('No words to practice here yet');
      return false;
    }
    current = {
      id: FV.util.uid('s'), mode, label, category, level,
      items, index: 0, results: [], startedAt: new Date().toISOString(),
    };
    if (category) {
      S().meta.lastCategory = { category, level };
      FV.storage.save();
    }
    FV.app.go('#/session');
    return true;
  }

  function startDue(mode = S().settings.reviewMode || 'random', size = sizeSetting()) {
    const items = FV.srs.buildQueue(FV.vocab.mine(), { mode: 'due', size, newPerDay: S().settings.newPerDay });
    if (!items.length) {
      FV.util.toast('Nothing due right now — try a random drill');
      return false;
    }
    return start({ items, mode, label: "Today's Review" });
  }

  function startRandom(mode = 'random', size = sizeSetting()) {
    const items = FV.srs.buildQueue(FV.vocab.mine(), { mode: 'random', size });
    return start({ items, mode, label: 'Random Practice' });
  }

  function startCategory(category, level, mode = 'random', size = sizeSetting()) {
    const pool = FV.vocab.mine().filter((v) => v.category === category && (!level || !v.level || v.level === level));
    const items = FV.srs.buildQueue(pool, { mode: 'all', size });
    return start({ items: FV.util.shuffle(items), mode, label: category, category, level });
  }

  /** Record the answer for the current item and advance. */
  function answer({ correct, rating, questionType, status }) {
    if (!current) return;
    const item = current.items[current.index];
    const before = { ...item };
    FV.vocab.recordReview(item.id, { questionType, correct, rating });
    const reviews = S().reviews;
    current.results.push({ itemId: item.id, correct, rating, status, before, reviewId: reviews[reviews.length - 1].id });
    current.index++;
  }

  /** Undo the last answer: restores the word's schedule and removes the review from history. */
  function undo() {
    if (!current || !current.results.length) return false;
    const last = current.results.pop();
    const item = FV.vocab.findMine(last.itemId);
    if (item) {
      Object.keys(item).forEach((k) => { if (!(k in last.before)) delete item[k]; });
      Object.assign(item, last.before);
    }
    const state = S();
    const idx = state.reviews.findIndex((r) => r.id === last.reviewId);
    if (idx !== -1) {
      const [review] = state.reviews.splice(idx, 1);
      const day = FV.util.dayKey(review.at);
      if (state.activity[day] > 0) state.activity[day]--;
      if (!state.activity[day]) delete state.activity[day];
    }
    FV.storage.save();
    current.index--;
    return true;
  }

  function difficultItems() {
    if (!current) return [];
    const ids = new Set(current.results.filter((r) => !r.correct || r.rating === 'again' || r.rating === 'hard').map((r) => r.itemId));
    return current.items.filter((i) => ids.has(i.id));
  }

  return {
    get current() { return current; },
    end() { current = null; },
    start, startDue, startRandom, startCategory, answer, undo, difficultItems, sizeSetting,
  };
})();
