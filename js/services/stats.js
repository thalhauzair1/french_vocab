/* Progress statistics and streaks (derived from stored data, never stored separately). */
FV.stats = (() => {
  const { dayKey, addDays, startOfDay } = FV.util;
  const S = () => FV.storage.state;

  function streaks() {
    const activity = S().activity;
    const active = (d) => (activity[dayKey(d)] || 0) > 0;

    // Current streak counts back from today (or yesterday, if today isn't done yet).
    let current = 0;
    let cursor = startOfDay();
    if (!active(cursor)) cursor = addDays(cursor, -1);
    while (active(cursor)) { current++; cursor = addDays(cursor, -1); }

    let longest = 0;
    let run = 0;
    let prev = null;
    Object.keys(activity).filter((k) => activity[k] > 0).sort().forEach((key) => {
      const [y, m, d] = key.split('-').map(Number);
      const date = new Date(y, m - 1, d);
      run = prev && dayKey(addDays(prev, 1)) === key ? run + 1 : 1;
      longest = Math.max(longest, run);
      prev = date;
    });
    return { current, longest: Math.max(longest, current), reviewedToday: active(startOfDay()) };
  }

  function summary() {
    const vocab = S().vocab;
    const reviews = S().reviews;
    const { todaysItems } = FV.srs;
    const today = todaysItems(vocab, S().settings.newPerDay);
    return {
      total: vocab.length,
      personal: vocab.filter((v) => v.source === 'user').length,
      builtinAdded: vocab.filter((v) => v.source === 'builtin').length,
      wordsReviewed: vocab.filter((v) => v.reviewCount > 0).length,
      reviewsCompleted: reviews.length,
      correctReviews: reviews.filter((r) => r.correct).length,
      mastered: vocab.filter(FV.srs.isMastered).length,
      learned: vocab.filter((v) => v.reviewCount > 0 && v.interval >= 3).length,
      needingReview: vocab.filter((v) => v.reviewCount > 0 && (v.lastResult === 'incorrect' || FV.srs.isDue(v))).length,
      dueToday: today.all.length,
      today,
      ...streaks(),
    };
  }

  /** Reviews per day for the last n days, oldest first. */
  function dailyReviews(days = 14) {
    const activity = S().activity;
    const out = [];
    for (let i = days - 1; i >= 0; i--) {
      const date = addDays(startOfDay(), -i);
      out.push({ date, key: dayKey(date), count: activity[dayKey(date)] || 0 });
    }
    return out;
  }

  /** Scheduled reviews for the next n days (overdue items count as today). */
  function forecast(days = 7) {
    const start = startOfDay();
    const out = Array.from({ length: days }, (_, i) => ({ date: addDays(start, i), count: 0 }));
    S().vocab.forEach((v) => {
      if (!v.nextReviewAt || !v.reviewCount) return;
      const offset = Math.max(0, Math.round((startOfDay(new Date(v.nextReviewAt)) - start) / FV.util.DAY));
      if (offset < days) out[offset].count++;
    });
    return out;
  }

  function byLevel() {
    const counts = {};
    S().vocab.forEach((v) => {
      const level = v.level || 'Unleveled';
      counts[level] = counts[level] || { total: 0, mastered: 0 };
      counts[level].total++;
      if (FV.srs.isMastered(v)) counts[level].mastered++;
    });
    return counts;
  }

  return { streaks, summary, dailyReviews, forecast, byLevel };
})();
