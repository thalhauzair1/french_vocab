/* Home screen: today's workload, a compact progress strip, and where to go next. */
FV.views = FV.views || {};

FV.views.home = (root) => {
  const { h } = FV.util;
  const C = FV.components;
  const state = FV.storage.state;
  const stats = FV.stats.summary();
  const { all } = stats.today;
  const words = all.filter((i) => i.type === 'word').length;
  const phrases = all.length - words;
  const hour = new Date().getHours();
  const plural = (n, word) => `${n} ${word}${n === 1 ? '' : 's'}`;

  root.appendChild(C.PageHead(hour >= 18 ? 'Bonsoir !' : 'Bonjour !', {
    lang: 'fr',
    sub: stats.current > 0
      ? `${stats.current}-day streak${stats.reviewedToday ? ' · nice work today' : ' · review today to keep it going'}`
      : 'Ready to revise some French?',
  }));

  /* ---------- Today ---------- */
  if (!state.vocab.length) {
    root.appendChild(h('section', { class: 'card hero-card' },
      h('div', { class: 'hero-eyebrow' }, 'Get started'),
      h('h2', { class: 'hero-title' }, 'Build your word list'),
      h('p', { class: 'hero-text' }, 'Add a French word you want to remember, or pick ready-made words from the built-in categories.'),
      h('div', { class: 'btn-row' },
        h('a', { class: 'btn btn-primary', href: '#/vocab?tab=builtin' }, 'Browse categories'),
        h('a', { class: 'btn btn-ghost', href: '#/add' }, C.Icon('plus', { size: 18 }), 'Add a word'))));
  } else {
    const split = [words && plural(words, 'word'), phrases && plural(phrases, 'phrase')].filter(Boolean).join(' · ');
    root.appendChild(h('section', { class: 'card hero-card' + (all.length ? '' : ' done') },
      h('div', { class: 'hero-eyebrow' }, "Today's review"),
      h('div', { class: 'hero-count' },
        all.length
          ? [h('span', { class: 'big-number' }, String(all.length)), h('span', { class: 'hero-unit' }, all.length === 1 ? 'item due' : 'items due')]
          : h('span', { class: 'hero-title' }, 'All caught up')),
      h('p', { class: 'hero-text' }, all.length ? split : 'Nothing is due right now. Practise anything you like, or come back tomorrow.'),
      all.length
        ? h('button', { class: 'btn btn-primary btn-lg btn-block', onclick: () => FV.session.startDue() }, 'Start review')
        : h('button', { class: 'btn btn-secondary btn-lg btn-block', onclick: () => FV.session.startRandom() }, 'Practise random words')));
  }

  // Setup tip when the device has no French voice (shown until dismissed or a voice appears).
  const tipSlot = h('div');
  root.appendChild(tipSlot);
  const dismiss = () => { state.meta.voiceTipDismissed = true; FV.storage.save(); tipSlot.remove(); };
  // Some phones load their voice list late; hide the tip as soon as a French voice shows up.
  const offVoices = FV.audio.onVoicesChanged((voices) => { if (voices.length) tipSlot.remove(); });
  FV.audio.ready.then(() => {
    if (!tipSlot.isConnected || state.meta.voiceTipDismissed || !FV.audio.ttsSupported() || FV.audio.hasFrenchVoice()) return;
    const status = h('p', { class: 'voice-tip-status', role: 'status' });
    tipSlot.appendChild(h('section', { class: 'voice-tip' },
      h('div', { class: 'voice-tip-head' },
        h('span', { class: 'row-icon' }, C.Icon('headphones')),
        h('div', null,
          h('h2', { class: 'voice-tip-title' }, 'Set up a French voice'),
          h('p', { class: 'voice-tip-text' },
            'Your device has no French voice yet, so most words can’t be read aloud. It’s free and takes a minute.'))),
      C.VoiceSetupSteps(),
      status,
      h('div', { class: 'btn-row' },
        h('button', {
          class: 'btn btn-primary btn-sm',
          onclick: () => {
            if (FV.audio.recheckVoices()) {
              FV.util.toast('French voice found. You’re all set');
              FV.audio.speak('Bonjour !');
              tipSlot.remove();
            } else {
              status.textContent = 'Not found yet. Make sure you closed and reopened the browser after installing.';
            }
          },
        }, 'Check again'),
        h('button', { class: 'btn btn-ghost btn-sm', onclick: dismiss }, 'Not now'))));
  });

  if (!state.vocab.length) return offVoices;

  /* ---------- Progress at a glance ---------- */
  root.appendChild(C.Section('Your progress', C.StatStrip([
    { value: stats.current, label: 'day streak', icon: 'flame', tone: 'warm' },
    { value: stats.learned, label: 'words learned' },
    { value: stats.mastered, label: 'mastered' },
  ]), { action: h('a', { class: 'link-btn', href: '#/progress' }, 'See all') }));

  /* ---------- Keep going ---------- */
  const rows = [];
  const last = state.meta.lastCategory;
  if (last) {
    const pool = FV.vocab.mine().filter((v) => v.category === last.category);
    rows.push(C.ListRow({
      icon: 'cards',
      title: `Continue: ${last.category}`,
      sub: `${last.level ? last.level + ' · ' : ''}${plural(pool.length, 'word')} in your list`,
      onClick: pool.length ? () => FV.session.startCategory(last.category, last.level) : null,
      href: pool.length ? null : `#/vocab?tab=builtin&cat=${encodeURIComponent(last.category)}${last.level ? '&level=' + last.level : ''}`,
    }));
  }
  rows.push(C.ListRow({ icon: 'plus', title: 'Add a word', sub: 'Save something new you came across', href: '#/add' }));
  rows.push(C.ListRow({ icon: 'book', title: 'Browse categories', sub: `${FV.vocab.builtinItems().length} ready-made words, A1 to B1`, href: '#/vocab?tab=builtin' }));
  rows.push(C.ListRow({ icon: 'text', title: 'Grammar cards', sub: 'Short reference notes for quick revision', href: '#/grammar' }));
  root.appendChild(C.Section('Keep going', h('div', { class: 'list-group' }, rows)));
  return offVoices;
};
