/* Home screen: today's workload, quick actions, progress, continue learning. */
FV.views = FV.views || {};

FV.views.home = (root) => {
  const { h } = FV.util;
  const { ProgressCard, EmptyState } = FV.components;
  const state = FV.storage.state;
  const stats = FV.stats.summary();
  const { all } = stats.today;
  const words = all.filter((i) => i.type === 'word').length;
  const phrases = all.length - words;
  const hour = new Date().getHours();

  root.appendChild(h('header', { class: 'page-head' },
    h('h1', { class: 'greeting', lang: 'fr' }, hour >= 18 ? 'Bonsoir !' : 'Bonjour !'),
    h('p', { class: 'muted' }, stats.current > 0
      ? `🔥 ${stats.current}-day streak${stats.reviewedToday ? ' — nice work today!' : ' — review today to keep it going'}`
      : 'Ready to revise some French?')));

  if (!state.vocab.length) {
    root.appendChild(h('section', { class: 'card onboarding' },
      h('h2', null, 'Start your word list'),
      h('p', { class: 'muted' }, 'Add a French word you want to remember, or pick words from the built-in categories.'),
      h('div', { class: 'btn-row' },
        h('a', { class: 'btn btn-primary', href: '#/add' }, '+ Add Word'),
        h('a', { class: 'btn btn-secondary', href: '#/vocab?tab=builtin' }, 'Browse built-in words'))));
  } else {
    const review = h('section', { class: 'card review-card' },
      h('div', { class: 'review-card-label' }, "Today's Review"),
      h('div', { class: 'review-card-count' },
        h('span', { class: 'big-number' }, String(all.length)),
        h('span', null, all.length === 1 ? ' item' : ' items')),
      all.length
        ? h('div', { class: 'review-card-split muted' },
          `${words} word${words === 1 ? '' : 's'} due · ${phrases} phrase${phrases === 1 ? '' : 's'} due`)
        : h('div', { class: 'review-card-split muted' }, 'All caught up for today 🎉'),
      all.length
        ? h('button', { class: 'btn btn-primary btn-block btn-lg', onclick: () => FV.session.startDue() }, 'Start Review')
        : h('button', { class: 'btn btn-secondary btn-block', onclick: () => FV.session.startRandom() }, 'Practice random words'));
    root.appendChild(review);
  }

  // One-time tip when the device can't pronounce French well.
  const tipSlot = h('div');
  root.appendChild(tipSlot);
  FV.audio.ready.then(() => {
    if (!tipSlot.isConnected || state.meta.voiceTipDismissed || !FV.audio.ttsSupported() || FV.audio.hasFrenchVoice()) return;
    tipSlot.appendChild(h('section', { class: 'notice warn tip-card' },
      h('div', null,
        h('strong', null, '🔊 No French voice on this device. '),
        'Words will use native-speaker recordings (downloaded when online). Install a French voice for everything else.'),
      h('div', { class: 'btn-row tight' },
        h('a', { class: 'btn btn-secondary btn-sm', href: '#/settings' }, 'Audio settings'),
        h('button', {
          class: 'btn btn-ghost btn-sm',
          onclick: () => { state.meta.voiceTipDismissed = true; FV.storage.save(); tipSlot.remove(); },
        }, 'Dismiss'))));
  });

  root.appendChild(h('section', { class: 'section' },
    h('h2', { class: 'section-title' }, 'Quick Actions'),
    h('div', { class: 'quick-actions' },
      h('a', { class: 'quick-action', href: '#/add' }, h('span', { class: 'qa-icon', 'aria-hidden': 'true' }, '＋'), 'Add Word'),
      h('a', { class: 'quick-action', href: '#/practice' }, h('span', { class: 'qa-icon', 'aria-hidden': 'true' }, '🎯'), 'Practice'),
      h('a', { class: 'quick-action', href: '#/grammar' }, h('span', { class: 'qa-icon', 'aria-hidden': 'true' }, '📘'), 'Grammar'))));

  root.appendChild(h('section', { class: 'section' },
    h('h2', { class: 'section-title' }, 'Progress'),
    h('div', { class: 'progress-grid three' },
      ProgressCard('day streak', stats.current, { icon: '🔥' }),
      ProgressCard('words learned', stats.learned, { icon: '📚' }),
      ProgressCard('due today', stats.dueToday, { icon: '⏰' }))));

  const last = state.meta.lastCategory;
  if (last) {
    const pool = FV.vocab.mine().filter((v) => v.category === last.category);
    root.appendChild(h('section', { class: 'section' },
      h('h2', { class: 'section-title' }, 'Continue Learning'),
      h('div', { class: 'card continue-card' },
        h('div', null,
          h('div', { class: 'continue-title' }, last.category),
          h('div', { class: 'muted' }, `${last.level ? last.level + ' · ' : ''}${pool.length} word${pool.length === 1 ? '' : 's'} in My Vocabulary`)),
        h('div', { class: 'btn-row' },
          pool.length ? h('button', { class: 'btn btn-primary', onclick: () => FV.session.startCategory(last.category, last.level) }, 'Practice') : null,
          h('a', { class: 'btn btn-secondary', href: `#/vocab?tab=${last.level ? 'builtin' : 'my'}&cat=${encodeURIComponent(last.category)}${last.level ? '&level=' + last.level : ''}` }, 'Browse')))));
  } else if (state.vocab.length) {
    root.appendChild(h('section', { class: 'section' },
      h('h2', { class: 'section-title' }, 'Continue Learning'),
      EmptyState('🧭', 'Pick a category', 'Practice a category and it will show up here.',
        h('a', { class: 'btn btn-secondary', href: '#/vocab?tab=builtin' }, 'Browse categories'))));
  }
};
