/*
 * Spaced-repetition service. Pure functions only — no UI or storage access —
 * so the algorithm can be replaced without touching anything else.
 *
 * Intervals (days):
 *   Again → 10 minutes, interval resets to 0
 *   Hard  → 1 day   (then ×1.2 of the previous interval)
 *   Good  → 3 days  (then ×2.5)
 *   Easy  → 7 days  (then ×4)
 */
FV.srs = (() => {
  const { startOfDay, addDays, endOfDay } = FV.util;

  const RATINGS = ['again', 'hard', 'good', 'easy'];
  const RATING_LABELS = { again: 'Again', hard: 'Hard', good: 'Good', easy: 'Easy' };
  const AGAIN_MINUTES = 10;
  const MAX_INTERVAL = 365;
  const MASTERED_INTERVAL = 21;

  function nextInterval(prev, rating) {
    switch (rating) {
      case 'again': return 0;
      case 'hard': return prev > 0 ? Math.max(1, Math.round(prev * 1.2)) : 1;
      case 'good': return prev > 0 ? Math.max(3, Math.round(prev * 2.5)) : 3;
      case 'easy': return prev > 0 ? Math.max(7, Math.round(prev * 4)) : 7;
      default: throw new Error('Unknown rating ' + rating);
    }
  }

  /** Returns the scheduling fields to merge into the item after a review. */
  function schedule(item, rating, now = new Date()) {
    const interval = Math.min(MAX_INTERVAL, nextInterval(item.interval || 0, rating));
    const nextReviewAt = rating === 'again'
      ? new Date(now.getTime() + AGAIN_MINUTES * 60000)
      : addDays(startOfDay(now), interval);
    return {
      interval,
      nextReviewAt: nextReviewAt.toISOString(),
      successStreak: rating === 'again' ? 0 : (item.successStreak || 0) + 1,
    };
  }

  function previewLabel(item, rating) {
    const interval = Math.min(MAX_INTERVAL, nextInterval(item.interval || 0, rating));
    if (rating === 'again') return `${AGAIN_MINUTES} min`;
    if (interval < 30) return `${interval}d`;
    if (interval < 365) return `${Math.round(interval / 30)}mo`;
    return '1y';
  }

  const isNew = (item) => !item.reviewCount;
  const isMastered = (item) => (item.interval || 0) >= MASTERED_INTERVAL;
  const isDue = (item, now = new Date()) => !!item.nextReviewAt && new Date(item.nextReviewAt) <= now;
  const isDueToday = (item) => !!item.nextReviewAt && new Date(item.nextReviewAt) <= endOfDay();

  /**
   * Today's workload: every scheduled item due today plus a limited
   * number of never-reviewed items (so bulk-adding a category doesn't swamp you).
   */
  function todaysItems(items, newPerDay) {
    const todayStart = startOfDay();
    const due = items.filter((i) => !isNew(i) && isDueToday(i));
    const introducedToday = items.filter((i) => i.firstReviewedAt && new Date(i.firstReviewedAt) >= todayStart).length;
    const newAllowance = Math.max(0, newPerDay - introducedToday);
    const fresh = items.filter(isNew).sort((a, b) => a.createdAt.localeCompare(b.createdAt)).slice(0, newAllowance);
    return { due, fresh, all: due.concat(fresh) };
  }

  /**
   * Build an ordered review queue.
   *  mode 'due'    → previously incorrect first, then most overdue, then new items
   *  mode 'random' → random selection from the whole pool
   *  mode 'all'    → the whole pool, weakest first
   */
  function buildQueue(items, { mode = 'due', size = 20, newPerDay = 10 } = {}) {
    let queue;
    if (mode === 'random') {
      queue = FV.util.shuffle(items);
    } else if (mode === 'all') {
      queue = items.slice().sort((a, b) => weakness(b) - weakness(a));
    } else {
      const { due, fresh } = todaysItems(items, newPerDay);
      const failed = due.filter((i) => i.lastResult === 'incorrect');
      const rest = due.filter((i) => i.lastResult !== 'incorrect')
        .sort((a, b) => a.nextReviewAt.localeCompare(b.nextReviewAt));
      queue = failed.concat(rest, fresh);
    }
    return size === 'all' ? queue : queue.slice(0, size);
  }

  /** Higher = needs more practice. */
  function weakness(item) {
    const wrong = item.incorrectCount || 0;
    const right = item.correctCount || 0;
    return (wrong + 1) / (right + wrong + 2) + (isNew(item) ? 0.3 : 0) - Math.min(item.interval || 0, 60) / 120;
  }

  return { RATINGS, RATING_LABELS, schedule, previewLabel, isNew, isMastered, isDue, isDueToday, todaysItems, buildQueue };
})();
