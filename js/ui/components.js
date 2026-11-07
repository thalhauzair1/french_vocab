/* Reusable UI components. Each returns a DOM element. */
FV.components = (() => {
  const { h, relativeDue } = FV.util;

  /* ---------- Icons (inline SVG, stroke = currentColor) ---------- */
  const ICONS = {
    home: '<path d="M3.5 10.5 12 3.5l8.5 7V20a1 1 0 0 1-1 1H15v-6H9v6H4.5a1 1 0 0 1-1-1z"/>',
    book: '<path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H20v14H6.5A2.5 2.5 0 0 0 4 19.5z"/><path d="M4 19.5A2.5 2.5 0 0 0 6.5 22H20v-5"/>',
    target: '<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1" fill="currentColor"/>',
    text: '<path d="M5 6h14M5 12h9M5 18h12"/>',
    chart: '<path d="M5 20v-7M12 20V5M19 20v-11"/>',
    settings: '<path d="M4 7h9M17 7h3M4 17h3M11 17h9"/><circle cx="15" cy="7" r="2"/><circle cx="9" cy="17" r="2"/>',
    plus: '<path d="M12 5v14M5 12h14"/>',
    search: '<circle cx="11" cy="11" r="7"/><path d="m20 20-4-4"/>',
    play: '<path d="M8 5.5v13l10.5-6.5z" fill="currentColor" stroke="none"/>',
    star: '<path d="m12 3.5 2.6 5.4 5.9.8-4.3 4.1 1 5.8L12 16.8l-5.2 2.8 1-5.8-4.3-4.1 5.9-.8z"/>',
    starFill: '<path d="m12 3.5 2.6 5.4 5.9.8-4.3 4.1 1 5.8L12 16.8l-5.2 2.8 1-5.8-4.3-4.1 5.9-.8z" fill="currentColor"/>',
    mic: '<rect x="9" y="3" width="6" height="11" rx="3"/><path d="M5.5 11a6.5 6.5 0 0 0 13 0M12 17.5V21"/>',
    x: '<path d="M6 6l12 12M18 6 6 18"/>',
    chevronRight: '<path d="m9 6 6 6-6 6"/>',
    chevronLeft: '<path d="m15 6-6 6 6 6"/>',
    flame: '<path d="M12 3c.8 3 5 5.2 5 10a5 5 0 0 1-10 0c0-2.2 1-3.7 2.2-4.8.1 2 1 3 2.1 3.3C11 8.6 10.6 6 12 3z"/>',
    check: '<path d="m5 12.5 4.5 4.5L19 7.5"/>',
    repeat: '<path d="m17 2.5 3 3-3 3"/><path d="M4 11.5v-2a4 4 0 0 1 4-4h12"/><path d="m7 21.5-3-3 3-3"/><path d="M20 12.5v2a4 4 0 0 1-4 4H4"/>',
    cards: '<rect x="3" y="7" width="13" height="14" rx="2"/><path d="M8 3.5h11a2 2 0 0 1 2 2V17"/>',
    pen: '<path d="M4 20h4L19.5 8.5a2.1 2.1 0 0 0-3-3L5 17z"/><path d="m14.5 7.5 3 3"/>',
    headphones: '<path d="M4 15v-3a8 8 0 0 1 16 0v3"/><rect x="3" y="14" width="4.5" height="7" rx="1.5"/><rect x="16.5" y="14" width="4.5" height="7" rx="1.5"/>',
    list: '<path d="M10 6h10M10 12h10M10 18h10"/><circle cx="5" cy="6" r="1.3"/><circle cx="5" cy="12" r="1.3"/><circle cx="5" cy="18" r="1.3"/>',
    blank: '<rect x="3" y="7" width="18" height="10" rx="2.5"/><path d="M9 14.5h6"/>',
    shuffle: '<path d="M16 3.5h4.5V8M4 20 20.5 3.5M20.5 16v4.5H16M14.5 14.5l6 6M4 4l5 5"/>',
    translate: '<path d="M4 6h9M8.5 4v2c0 4-2 7.5-5 9M6 10c1.2 2.4 3.3 4.2 6 5"/><path d="m13 21 4-9.5 4 9.5M14.6 17.5h4.8"/>',
    trash: '<path d="M4 7h16M9 7V4.5h6V7M6.5 7l1 13h9l1-13"/>',
    edit: '<path d="M4 20h4L19.5 8.5a2.1 2.1 0 0 0-3-3L5 17z"/>',
    upload: '<path d="M12 15V4M7.5 8.5 12 4l4.5 4.5M5 15v4.5h14V15"/>',
    sparkle: '<path d="M12 3.5 13.8 10 20.5 12 13.8 14 12 20.5 10.2 14 3.5 12 10.2 10z"/>',
    undo: '<path d="M9 14 4 9l5-5"/><path d="M4 9h11a5 5 0 0 1 0 10h-3"/>',
    share: '<path d="M12 3v12M7.5 7.5 12 3l4.5 4.5"/><path d="M8 10H6.5A1.5 1.5 0 0 0 5 11.5v8A1.5 1.5 0 0 0 6.5 21h11a1.5 1.5 0 0 0 1.5-1.5v-8a1.5 1.5 0 0 0-1.5-1.5H16"/>',
    phone: '<rect x="6.5" y="2.5" width="11" height="19" rx="2.5"/><path d="M11 18.5h2"/>',
    addBox: '<rect x="4" y="4" width="16" height="16" rx="3"/><path d="M12 8.5v7M8.5 12h7"/>',
  };
  function Icon(name, { size = 20, className = '' } = {}) {
    const span = document.createElement('span');
    span.className = 'icon' + (className ? ' ' + className : '');
    span.setAttribute('aria-hidden', 'true');
    span.innerHTML = `<svg viewBox="0 0 24 24" width="${size}" height="${size}" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round">${ICONS[name] || ''}</svg>`;
    return span;
  }

  /* ---------- Layout helpers ---------- */
  /** Page title with optional subtitle and a trailing action. */
  function PageHead(title, { sub, action, lang } = {}) {
    return h('header', { class: 'page-head' },
      h('div', { class: 'page-head-text' },
        h('h1', { lang }, title),
        sub ? h('p', { class: 'page-sub' }, sub) : null),
      action || null);
  }

  /** Section with a heading and optional right-side link/button. */
  function Section(title, children, { action, className = '' } = {}) {
    return h('section', { class: 'section ' + className },
      title ? h('div', { class: 'section-head' }, h('h2', { class: 'section-title' }, title), action || null) : null,
      children);
  }

  /** One card holding several numbers side by side, separated by hairlines. */
  function StatStrip(stats) {
    return h('div', { class: 'stat-strip' },
      stats.map(({ value, label, icon, tone }) => h('div', { class: 'stat' + (tone ? ' ' + tone : '') },
        h('div', { class: 'stat-value' }, icon ? Icon(icon, { size: 18 }) : null, String(value)),
        h('div', { class: 'stat-label' }, label))));
  }

  /** Tappable row inside a .list-group. */
  function ListRow({ href, onClick, icon, title, sub, trailing, lang, chevron = true }) {
    const tag = href ? 'a' : 'button';
    return h(tag, { class: 'list-row', href, type: href ? null : 'button', onclick: onClick },
      icon ? h('span', { class: 'row-icon' }, Icon(icon)) : null,
      h('span', { class: 'row-main' },
        h('span', { class: 'row-title', lang }, title),
        sub ? h('span', { class: 'row-sub' }, sub) : null),
      trailing || null,
      chevron ? Icon('chevronRight', { size: 18, className: 'row-chevron' }) : null);
  }

  /** Back link used at the top of detail pages. */
  function BackLink(label, onClick) {
    return h('button', { type: 'button', class: 'back-link', onclick: onClick }, Icon('chevronLeft', { size: 18 }), label);
  }

  /* ---------- AudioButton ---------- */
  function AudioButton(source, { label = 'Listen', compact = false, speed, large = false } = {}) {
    const btn = h('button', {
      type: 'button',
      class: 'btn-audio' + (compact ? ' compact' : '') + (large ? ' large' : ''),
      'aria-label': compact ? `Listen: ${typeof source === 'string' ? source : source.french}` : null,
      title: 'Listen',
    }, h('span', { class: 'audio-icon' }, Icon('play', { size: large ? 18 : 14 })), compact ? null : h('span', null, label));
    btn.addEventListener('click', async (e) => {
      e.stopPropagation();
      e.preventDefault();
      btn.classList.add('playing');
      try {
        if (typeof source === 'string') await FV.audio.speak(source, { speed });
        else await FV.audio.playItem(source, { speed });
      } finally {
        setTimeout(() => btn.classList.remove('playing'), 300);
      }
    });
    return btn;
  }

  /* ---------- RecordButton ---------- */
  /** Toggles microphone recording; calls onRecorded(blob) when stopped. */
  function RecordButton(onRecorded, { label = '🎙 Record', className = 'btn btn-secondary btn-sm' } = {}) {
    let session = null;
    let tick = null;
    let started = 0;
    const btn = h('button', { type: 'button', class: className + ' btn-record' }, label);
    const reset = () => {
      clearInterval(tick);
      session = null;
      btn.classList.remove('recording');
      btn.disabled = false;
      btn.textContent = label;
    };
    btn.addEventListener('click', async (e) => {
      e.stopPropagation();
      e.preventDefault();
      if (session) {
        const s = session;
        clearInterval(tick);
        btn.disabled = true;
        btn.textContent = 'Saving…';
        const blob = await s.stop();
        reset();
        if (blob && blob.size) onRecorded(blob);
        return;
      }
      if (!FV.recorder.supported()) { FV.util.toast('Recording is not supported in this browser'); return; }
      FV.audio.stop();
      try {
        session = await FV.recorder.start();
      } catch (err) {
        FV.util.toast(err && err.name === 'NotAllowedError' ? 'Microphone access was blocked' : 'Could not access the microphone');
        return;
      }
      started = Date.now();
      btn.classList.add('recording');
      const update = () => {
        const elapsed = Date.now() - started;
        btn.textContent = `■ Stop · 0:${String(Math.floor(elapsed / 1000)).padStart(2, '0')}`;
        if (elapsed >= FV.recorder.MAX_MS && session) btn.click();
      };
      update();
      tick = setInterval(update, 250);
    });
    return btn;
  }

  /* ---------- FavoriteButton ---------- */
  function FavoriteButton(active, onToggle, { label } = {}) {
    const btn = h('button', {
      type: 'button', class: 'btn-fav' + (active ? ' active' : ''),
      'aria-pressed': String(!!active), 'aria-label': active ? 'Remove from favorites' : 'Add to favorites',
      title: active ? 'Remove from favorites' : 'Add to favorites',
    }, Icon(active ? 'starFill' : 'star'), label ? h('span', null, label) : null);
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      e.preventDefault();
      onToggle();
    });
    return btn;
  }

  function Chip(text, variant = '') {
    return h('span', { class: 'chip ' + variant }, text);
  }

  function statusChip(item) {
    if (!FV.vocab.isInMyVocab(item)) return null;
    if (FV.srs.isNew(item)) return Chip('New', 'chip-new');
    if (FV.srs.isDueToday(item)) return Chip('Due', 'chip-due');
    if (FV.srs.isMastered(item)) return Chip('Mastered', 'chip-good');
    return null;
  }

  /* ---------- VocabularyCard ---------- */
  /** A row in a .list-group: French + meaning, one status chip, then listen / favorite-or-add. */
  function VocabularyCard(item, { onChange, showCategory = false } = {}) {
    const inMine = FV.vocab.isInMyVocab(item);
    const status = statusChip(item);
    const card = h('a', { class: 'vocab-row', href: `#/word/${encodeURIComponent(item.id)}` },
      h('div', { class: 'vocab-row-main' },
        h('div', { class: 'vocab-fr', lang: 'fr' }, item.french),
        h('div', { class: 'vocab-en' }, item.english,
          showCategory ? h('span', { class: 'vocab-cat' }, ' · ' + item.category) : null)),
      status,
      h('div', { class: 'vocab-row-actions' },
        AudioButton(item, { compact: true }),
        inMine || item.isFavorite
          ? FavoriteButton(item.isFavorite, () => { FV.vocab.toggleFavorite(item.id); onChange && onChange(); })
          : h('button', {
            type: 'button', class: 'btn-add', title: 'Add to My Vocabulary', 'aria-label': `Add “${item.french}” to My Vocabulary`,
            onclick: (e) => {
              e.preventDefault(); e.stopPropagation();
              FV.vocab.addBuiltin(item.id);
              FV.util.toast(`Added “${item.french}” to My Vocabulary`);
              onChange && onChange();
            },
          }, Icon('plus', { size: 18 })),
      ),
    );
    return card;
  }

  /* ---------- CategoryCard ---------- */
  function CategoryCard({ level, category, count, added }, onClick) {
    const pct = count ? Math.round((added / count) * 100) : 0;
    return h('button', { type: 'button', class: 'category-card' + (pct === 100 ? ' complete' : ''), onclick: onClick },
      h('span', { class: 'category-name' }, category),
      h('span', { class: 'category-count' }, added ? `${added} of ${count} added` : `${count} words`),
      h('span', { class: 'meter thin', role: 'img', 'aria-label': `${pct}% added` }, h('span', { style: { width: pct + '%' } })),
    );
  }

  /* ---------- ProgressCard ---------- */
  function ProgressCard(label, value, { sub, icon, accent = false } = {}) {
    return h('div', { class: 'progress-card' + (accent ? ' accent' : '') },
      icon ? h('div', { class: 'progress-icon', 'aria-hidden': 'true' }, icon) : null,
      h('div', { class: 'progress-value' }, String(value)),
      h('div', { class: 'progress-label' }, label),
      sub ? h('div', { class: 'progress-sub muted' }, sub) : null,
    );
  }

  /* ---------- AnswerOption ---------- */
  function AnswerOption(text, onSelect, { lang } = {}) {
    return h('button', { type: 'button', class: 'answer-option', lang, onclick: () => onSelect(text) }, text);
  }

  /* ---------- RatingButtons ---------- */
  function RatingButtons(item, onRate, { suggested } = {}) {
    return h('div', { class: 'rating-row' },
      FV.srs.RATINGS.map((rating, i) => h('button', {
        type: 'button',
        class: `btn-rating rating-${rating}` + (suggested === rating ? ' suggested' : ''),
        onclick: () => onRate(rating),
        title: `Shortcut: ${i + 1}`,
      },
      h('span', { class: 'rating-label' }, FV.srs.RATING_LABELS[rating]),
      h('span', { class: 'rating-interval' }, FV.srs.previewLabel(item, rating)))),
    );
  }

  /* ---------- Flashcard ---------- */
  /** reverse: English on the front, French on the back. */
  function Flashcard(item, { onFlip, reverse = false } = {}) {
    let flipped = false;
    const front = reverse
      ? [h('div', { class: 'flash-hint muted' }, 'How do you say…'),
        h('div', { class: 'flash-en big' }, item.english),
        h('div', { class: 'flash-hint muted' }, 'Say it in French, then tap to check')]
      : [h('div', { class: 'flash-fr', lang: 'fr' }, item.french),
        AudioButton(item, { large: true }),
        h('div', { class: 'flash-hint muted' }, 'Tap to reveal')];
    const backHead = reverse
      ? [h('div', { class: 'flash-fr', lang: 'fr' }, item.french), h('div', { class: 'flash-en small' }, item.english)]
      : [h('div', { class: 'flash-fr small', lang: 'fr' }, item.french), h('div', { class: 'flash-en' }, item.english)];
    const card = h('div', { class: 'flashcard', tabindex: '0', role: 'button', 'aria-label': 'Flashcard — tap to reveal' },
      h('div', { class: 'flashcard-inner' },
        h('div', { class: 'flashcard-face flashcard-front' }, front),
        h('div', { class: 'flashcard-face flashcard-back' },
          backHead,
          item.exampleFrench ? h('div', { class: 'flash-example' },
            h('div', { lang: 'fr' }, item.exampleFrench),
            h('div', { class: 'muted' }, item.exampleEnglish || '')) : null,
          h('div', { class: 'flash-audio-row' },
            AudioButton(item),
            item.exampleFrench ? AudioButton(item.exampleFrench, { label: 'Sentence' }) : null),
        ),
      ),
    );
    const flip = () => {
      if (flipped) return;
      flipped = true;
      card.classList.add('flipped');
      card.setAttribute('aria-label', 'Flashcard — answer shown');
      // Reverse cards reveal the French only now, so that's when to hear it.
      if (reverse && FV.storage.state.settings.autoplay) FV.audio.playItem(item);
      onFlip && onFlip();
    };
    card.addEventListener('click', flip);
    card.flip = flip;
    card.isFlipped = () => flipped;
    return card;
  }

  /* ---------- ReviewQuestion ---------- */
  /**
   * Renders one drill question. Calls onAnswered({status, note, given}) exactly once.
   */
  function ReviewQuestion(question, { onAnswered }) {
    const { item, type } = question;
    let answered = false;
    const wrap = h('div', { class: 'question' });

    // Prompt
    const promptArea = h('div', { class: 'question-prompt' });
    promptArea.appendChild(h('div', { class: 'question-ask muted' }, question.ask));
    if (type === 'listen-fr' || type === 'listen-meaning') {
      promptArea.appendChild(AudioButton(item, { large: true, label: 'Listen' }));
      promptArea.appendChild(h('div', { class: 'speed-row' },
        AudioButton(item, { label: 'Slow', speed: 0.7 })));
    } else if (type === 'cloze') {
      promptArea.appendChild(h('div', { class: 'question-cloze', lang: 'fr' },
        question.cloze.before, h('span', { class: 'blank' }, '____'), question.cloze.after));
      if (item.exampleEnglish) promptArea.appendChild(h('div', { class: 'muted question-hint' }, item.exampleEnglish));
    } else {
      const isFr = type !== 'en-fr';
      promptArea.appendChild(h('div', { class: 'question-text' + (isFr ? ' fr' : ''), lang: isFr ? 'fr' : 'en' }, question.prompt));
      if (isFr) promptArea.appendChild(AudioButton(item));
    }
    wrap.appendChild(promptArea);

    const answerArea = h('div', { class: 'question-answer' });
    wrap.appendChild(answerArea);

    const finish = (result) => {
      if (answered) return;
      answered = true;
      wrap.classList.add('answered');
      onAnswered(result);
    };

    function renderChoices(choices, lang) {
      FV.util.clear(answerArea);
      const list = h('div', { class: 'answer-options' });
      choices.forEach((choice, i) => {
        const opt = AnswerOption(choice, (value) => {
          if (answered) return;
          const result = FV.questions.check({ ...question, input: 'choice' }, value);
          list.querySelectorAll('.answer-option').forEach((b) => {
            b.disabled = true;
            if (b.textContent === question.answer) b.classList.add('correct');
          });
          if (result.status !== 'correct') opt.classList.add('wrong');
          finish({ ...result, given: value });
        }, { lang });
        opt.dataset.key = String(i + 1);
        list.appendChild(opt);
      });
      answerArea.appendChild(list);
    }

    function renderTextInput() {
      const isFr = question.lang === 'fr';
      const input = h('input', {
        type: 'text', class: 'answer-input', autocomplete: 'off', autocapitalize: 'off', spellcheck: 'false',
        placeholder: isFr ? 'Type in French…' : 'Type the English meaning…', lang: isFr ? 'fr' : 'en',
        'aria-label': 'Your answer',
      });
      const submit = () => {
        if (answered) return;
        const value = input.value;
        if (!value.trim()) { input.focus(); return; }
        const result = FV.questions.check(question, value);
        input.disabled = true;
        input.classList.add(result.status === 'wrong' ? 'wrong' : 'correct');
        finish({ ...result, given: value });
      };
      const form = h('form', { class: 'answer-form', onsubmit: (e) => { e.preventDefault(); submit(); } },
        input,
        h('button', { type: 'submit', class: 'btn btn-primary' }, 'Check'));
      answerArea.appendChild(form);
      if (isFr) answerArea.appendChild(AccentBar(input));
      const extras = h('div', { class: 'answer-extras' });
      if (question.choices && type === 'fr-en') {
        extras.appendChild(h('button', { type: 'button', class: 'btn btn-link', onclick: () => renderChoices(question.choices) }, 'Show choices'));
      }
      extras.appendChild(h('button', {
        type: 'button', class: 'btn btn-link',
        onclick: () => { input.disabled = true; finish({ status: 'wrong', given: '', skipped: true }); },
      }, "I don't know"));
      answerArea.appendChild(extras);
      setTimeout(() => input.focus(), 50);
    }

    if (question.input === 'choice') renderChoices(question.choices, type === 'cloze' ? 'fr' : undefined);
    else renderTextInput();

    if (question.autoplay) setTimeout(() => FV.audio.playItem(item), 250);
    return wrap;
  }

  /** Buttons for typing French accented characters on keyboards without them. */
  function AccentBar(input) {
    const chars = ['é', 'è', 'ê', 'à', 'â', 'ç', 'ô', 'î', 'ï', 'ù', 'û', 'ë', 'œ'];
    return h('div', { class: 'accent-bar', 'aria-label': 'Insert accented letter' },
      chars.map((c) => h('button', {
        type: 'button', class: 'accent-key', tabindex: '-1',
        onmousedown: (e) => e.preventDefault(),
        onclick: () => {
          if (input.disabled) return;
          const start = input.selectionStart ?? input.value.length;
          const end = input.selectionEnd ?? input.value.length;
          input.value = input.value.slice(0, start) + c + input.value.slice(end);
          input.focus();
          input.setSelectionRange(start + 1, start + 1);
        },
      }, c)));
  }

  /* ---------- GrammarCard ---------- */
  function GrammarCard(card, { compact = false, onChange } = {}) {
    const g = FV.storage.state.grammar;
    const fav = !!g.favorites[card.id];
    const reviewedAt = g.reviewed[card.id];

    if (compact) {
      return h('a', { class: 'grammar-row', href: `#/grammar/${card.id}` },
        h('span', { class: 'grammar-status' + (reviewedAt ? ' done' : ''), title: reviewedAt ? 'Reviewed' : 'Not reviewed yet' },
          reviewedAt ? Icon('check', { size: 14 }) : null,
          h('span', { class: 'sr-only' }, reviewedAt ? 'Reviewed' : 'Not reviewed')),
        h('span', { class: 'grammar-row-main' },
          h('span', { class: 'grammar-row-title' }, card.title),
          h('span', { class: 'grammar-row-sub' }, card.summary)),
        FavoriteButton(fav, () => { toggleGrammarFavorite(card.id); onChange && onChange(); }));
    }

    const body = h('article', { class: 'grammar-card full' },
      h('div', { class: 'grammar-group muted' }, card.group),
      h('h2', null, card.title),
      h('p', { class: 'grammar-summary' }, card.summary));

    card.blocks.forEach((block) => {
      if (block.type === 'rule') body.appendChild(h('div', { class: 'g-rule' }, block.text));
      if (block.type === 'tip') body.appendChild(h('div', { class: 'g-tip' }, h('strong', null, 'Tip: '), block.text));
      if (block.type === 'table') {
        body.appendChild(h('div', { class: 'table-wrap' },
          h('table', { class: 'g-table' },
            h('thead', null, h('tr', null, block.head.map((c) => h('th', null, c)))),
            h('tbody', null, block.rows.map((row) => h('tr', null, row.map((c, i) => h(i === 0 ? 'th' : 'td', { lang: 'fr' }, c))))))));
      }
      if (block.type === 'examples') {
        body.appendChild(h('div', { class: 'g-examples' },
          h('div', { class: 'g-label' }, 'Examples'),
          block.items.map(([fr, en]) => h('div', { class: 'g-example' },
            h('div', null, h('div', { lang: 'fr', class: 'g-ex-fr' }, fr), h('div', { class: 'muted' }, en)),
            AudioButton(fr, { compact: true })))));
      }
    });
    return body;
  }

  function toggleGrammarFavorite(id) {
    const g = FV.storage.state.grammar;
    if (g.favorites[id]) delete g.favorites[id];
    else g.favorites[id] = true;
    FV.storage.save();
  }

  /* ---------- French voice setup ---------- */
  /** Numbered, device-specific steps for installing a French text-to-speech voice. */
  function VoiceSetupSteps() {
    const { name, steps } = FV.audio.voiceSetup();
    return h('div', { class: 'voice-steps' },
      h('div', { class: 'voice-steps-title' }, `How to add a French voice on ${name}`),
      h('ol', null, steps.map((s) => h('li', null, s))));
  }

  /** Dialog shown (once per visit) when a word can't be spoken because no French voice exists. */
  let voiceDialogShown = false;
  function showVoiceSetup() {
    if (voiceDialogShown || document.querySelector('.modal-overlay')) return;
    voiceDialogShown = true;
    FV.util.confirmDialog({
      title: 'No French voice on this device',
      message: 'Words with a native-speaker recording still play when you’re online. For everything else, install a free French voice:',
      body: VoiceSetupSteps(),
      confirmLabel: 'Got it',
      cancelLabel: null,
    });
  }

  /* ---------- Install app ---------- */
  /** Install via the browser dialog, or show Add to Home Screen steps on iPhone/iPad. */
  async function startInstall() {
    const mode = FV.install.mode();
    if (mode === 'prompt') {
      await FV.install.prompt();
      return;
    }
    if (mode !== 'ios') return;
    const step = (icon, ...text) => h('li', null, h('span', { class: 'install-step-icon' }, Icon(icon, { size: 18 })), h('span', null, ...text));
    FV.util.confirmDialog({
      title: 'Add Mots to your Home Screen',
      message: 'It then opens full-screen like an app, works offline, and Safari won’t clear your progress.',
      body: h('div', null,
        h('ol', { class: 'install-steps' },
          step('share', 'Tap the ', h('strong', null, 'Share'), ' button in Safari (bottom of the screen on iPhone, top on iPad).'),
          step('addBox', 'Scroll down and tap ', h('strong', null, 'Add to Home Screen'), '.'),
          step('check', 'Tap ', h('strong', null, 'Add'), ', then open Mots from your Home Screen.')),
        FV.storage.state.vocab.length
          ? h('p', { class: 'install-note' },
            'Your words don’t move over automatically on iPhone. Before installing, save a backup in Settings → Import / Export, then restore it inside the app.')
          : null),
      confirmLabel: 'Got it',
      cancelLabel: null,
    });
  }

  /** Home-screen card inviting the user to install. Updates itself when installability changes. */
  function InstallCard() {
    const slot = h('div', { class: 'install-slot' });
    const render = (mode) => {
      FV.util.clear(slot);
      if ((mode !== 'prompt' && mode !== 'ios') || FV.install.dismissed()) return;
      slot.appendChild(h('section', { class: 'install-card' },
        h('span', { class: 'row-icon' }, Icon('phone')),
        h('div', { class: 'install-card-text' },
          h('div', { class: 'install-card-title' }, 'Install the app'),
          h('div', { class: 'install-card-sub' }, 'One tap from your home screen, full-screen and offline.')),
        h('div', { class: 'install-card-actions' },
          h('button', { type: 'button', class: 'btn btn-primary btn-sm', onclick: startInstall }, 'Install'),
          h('button', {
            type: 'button', class: 'icon-btn install-close', 'aria-label': 'Not now', title: 'Not now',
            onclick: () => FV.install.dismiss(),
          }, Icon('x', { size: 18 })))));
    };
    render(FV.install.mode());
    slot.cleanup = FV.install.onChange(render);
    return slot;
  }

  function EmptyState(icon, title, text, action) {
    return h('div', { class: 'empty-state' },
      h('div', { class: 'empty-icon', 'aria-hidden': 'true' }, ICONS[icon] ? Icon(icon, { size: 28 }) : icon),
      h('h3', null, title),
      text ? h('p', { class: 'muted' }, text) : null,
      action || null);
  }

  return {
    Icon, PageHead, Section, StatStrip, ListRow, BackLink, AudioButton, statusChip, VoiceSetupSteps, showVoiceSetup, startInstall, InstallCard, RecordButton, FavoriteButton, Chip, VocabularyCard, CategoryCard, ProgressCard, AnswerOption,
    RatingButtons, Flashcard, ReviewQuestion, AccentBar, GrammarCard, toggleGrammarFavorite, EmptyState, relativeDue,
  };
})();
