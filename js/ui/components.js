/* Reusable UI components. Each returns a DOM element. */
FV.components = (() => {
  const { h, relativeDue } = FV.util;

  /* ---------- AudioButton ---------- */
  function AudioButton(source, { label = 'Listen', compact = false, speed, large = false } = {}) {
    const btn = h('button', {
      type: 'button',
      class: 'btn-audio' + (compact ? ' compact' : '') + (large ? ' large' : ''),
      'aria-label': compact ? `Listen: ${typeof source === 'string' ? source : source.french}` : null,
      title: 'Listen',
    }, h('span', { class: 'audio-icon', 'aria-hidden': 'true' }, '▶'), compact ? null : h('span', null, label));
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
    }, h('span', { 'aria-hidden': 'true' }, active ? '★' : '☆'), label ? h('span', null, label) : null);
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
  function VocabularyCard(item, { onChange } = {}) {
    const inMine = FV.vocab.isInMyVocab(item);
    const card = h('a', { class: 'vocab-card', href: `#/word/${encodeURIComponent(item.id)}` },
      h('div', { class: 'vocab-card-main' },
        h('div', { class: 'vocab-fr', lang: 'fr' }, item.french),
        h('div', { class: 'vocab-en' }, item.english),
        h('div', { class: 'vocab-meta' },
          Chip(item.category),
          item.level ? Chip(item.level, 'chip-level') : null,
          statusChip(item),
        ),
      ),
      h('div', { class: 'vocab-card-actions' },
        AudioButton(item, { compact: true }),
        inMine || item.isFavorite
          ? FavoriteButton(item.isFavorite, () => { FV.vocab.toggleFavorite(item.id); onChange && onChange(); })
          : h('button', {
            type: 'button', class: 'btn-add', title: 'Add to My Vocabulary',
            onclick: (e) => {
              e.preventDefault(); e.stopPropagation();
              FV.vocab.addBuiltin(item.id);
              FV.util.toast(`Added “${item.french}” to My Vocabulary`);
              onChange && onChange();
            },
          }, '+ Add'),
      ),
    );
    return card;
  }

  /* ---------- CategoryCard ---------- */
  function CategoryCard({ level, category, count, added }, onClick) {
    const pct = count ? Math.round((added / count) * 100) : 0;
    return h('button', { type: 'button', class: 'category-card', onclick: onClick },
      h('div', { class: 'category-card-top' },
        h('span', { class: 'category-name' }, category),
        level ? Chip(level, 'chip-level') : null),
      h('div', { class: 'category-count muted' }, `${count} items · ${added} added`),
      h('div', { class: 'meter', role: 'img', 'aria-label': `${pct}% added` }, h('span', { style: { width: pct + '%' } })),
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
      return h('a', { class: 'grammar-card compact', href: `#/grammar/${card.id}` },
        h('div', { class: 'grammar-card-head' },
          h('div', null,
            h('div', { class: 'grammar-group muted' }, card.group),
            h('h3', null, card.title)),
          h('div', { class: 'grammar-card-icons' },
            reviewedAt ? h('span', { class: 'reviewed-tick', title: 'Reviewed', 'aria-label': 'Reviewed' }, '✓') : null,
            FavoriteButton(fav, () => { toggleGrammarFavorite(card.id); onChange && onChange(); }))),
        h('p', { class: 'muted' }, card.summary));
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

  function EmptyState(icon, title, text, action) {
    return h('div', { class: 'empty-state' },
      h('div', { class: 'empty-icon', 'aria-hidden': 'true' }, icon),
      h('h3', null, title),
      text ? h('p', { class: 'muted' }, text) : null,
      action || null);
  }

  return {
    AudioButton, RecordButton, FavoriteButton, Chip, VocabularyCard, CategoryCard, ProgressCard, AnswerOption,
    RatingButtons, Flashcard, ReviewQuestion, AccentBar, GrammarCard, toggleGrammarFavorite, EmptyState, relativeDue,
  };
})();
