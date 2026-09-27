/* Practice picker and the review-session screen (questions, flashcards, results). */
FV.views = FV.views || {};

(() => {
  const { h, clear } = FV.util;
  const C = FV.components;

  const picker = { source: 'due', size: null, category: '' };

  const SOURCES = [
    { id: 'due', label: 'Due today' },
    { id: 'all', label: 'All my words' },
    { id: 'random', label: 'Random' },
    { id: 'favorites', label: 'Favorites' },
    { id: 'difficult', label: 'Difficult' },
    { id: 'category', label: 'Category' },
  ];

  function poolFor(source, category) {
    const mine = FV.vocab.mine();
    switch (source) {
      case 'favorites': return mine.filter((v) => v.isFavorite);
      case 'difficult': return mine.filter((v) => v.incorrectCount > 0 || v.difficulty === 'again' || v.difficulty === 'hard');
      case 'category': return mine.filter((v) => v.category === category);
      default: return mine;
    }
  }

  function queueFor(source, category, size) {
    const settings = FV.storage.state.settings;
    const pool = poolFor(source, category);
    const mode = source === 'due' ? 'due' : source === 'random' ? 'random' : 'all';
    return FV.srs.buildQueue(pool, { mode, size, newPerDay: settings.newPerDay });
  }

  /* ================= Practice picker ================= */
  FV.views.practice = (root, { query }) => {
    const mine = FV.vocab.mine();
    if (query.cat) { picker.source = 'category'; picker.category = query.cat; }
    if (picker.size === null) picker.size = FV.session.sizeSetting();

    root.appendChild(h('header', { class: 'page-head' },
      h('h1', null, 'Practice'),
      h('p', { class: 'muted' }, 'Choose what to practice and how.')));

    if (!mine.length) {
      root.appendChild(C.EmptyState('🎯', 'No words to practice yet',
        'Add your own words or pick some from the built-in categories first.',
        h('div', { class: 'btn-row center' },
          h('a', { class: 'btn btn-primary', href: '#/add' }, '+ Add Word'),
          h('a', { class: 'btn btn-secondary', href: '#/vocab?tab=builtin' }, 'Browse built-in'))));
      return;
    }

    const categories = [...new Set(mine.map((v) => v.category))].sort();
    if (!picker.category || !categories.includes(picker.category)) picker.category = categories[0];

    const countEl = h('span', { class: 'muted' });
    const updateCount = () => {
      const n = queueFor(picker.source, picker.category, picker.size).length;
      countEl.textContent = `${n} item${n === 1 ? '' : 's'} selected`;
    };

    // Source selector
    const categorySelect = h('select', {
      class: 'select', 'aria-label': 'Category',
      onchange: (e) => { picker.category = e.target.value; updateCount(); },
    }, categories.map((c) => h('option', { value: c, selected: c === picker.category }, c)));
    categorySelect.hidden = picker.source !== 'category';

    const sourceSeg = h('div', { class: 'segmented wrap', role: 'radiogroup', 'aria-label': 'What to practice' },
      SOURCES.map((s) => h('button', {
        type: 'button', role: 'radio', 'aria-checked': String(picker.source === s.id),
        class: 'seg' + (picker.source === s.id ? ' active' : ''),
        onclick: (e) => {
          picker.source = s.id;
          sourceSeg.querySelectorAll('.seg').forEach((b) => { b.classList.remove('active'); b.setAttribute('aria-checked', 'false'); });
          e.currentTarget.classList.add('active');
          e.currentTarget.setAttribute('aria-checked', 'true');
          categorySelect.hidden = s.id !== 'category';
          updateCount();
        },
      }, s.label)));

    const sizeSeg = h('div', { class: 'segmented', role: 'radiogroup', 'aria-label': 'Number of questions' },
      [10, 20, 30, 'all'].map((n) => h('button', {
        type: 'button', role: 'radio', 'aria-checked': String(picker.size === n),
        class: 'seg' + (picker.size === n ? ' active' : ''),
        onclick: (e) => {
          picker.size = n;
          sizeSeg.querySelectorAll('.seg').forEach((b) => { b.classList.remove('active'); b.setAttribute('aria-checked', 'false'); });
          e.currentTarget.classList.add('active');
          e.currentTarget.setAttribute('aria-checked', 'true');
          updateCount();
        },
      }, n === 'all' ? 'All' : String(n))));

    root.appendChild(h('section', { class: 'card' },
      h('div', { class: 'field-label' }, 'Words'),
      sourceSeg,
      categorySelect,
      h('div', { class: 'field-label' }, 'Questions'),
      sizeSeg,
      h('div', { class: 'picker-count' }, countEl)));
    updateCount();

    // Mode grid
    const grid = h('div', { class: 'mode-grid' });
    Object.entries(FV.questions.MODES).forEach(([mode, info]) => {
      grid.appendChild(h('button', {
        type: 'button', class: 'mode-card',
        onclick: () => {
          const items = queueFor(picker.source, picker.category, picker.size);
          if (!items.length && picker.source === 'due') {
            FV.util.toast('Nothing due — switched to random words');
            FV.session.start({ items: queueFor('random', null, picker.size), mode, label: 'Random Practice' });
            return;
          }
          const src = SOURCES.find((s) => s.id === picker.source);
          const isCat = picker.source === 'category';
          const level = isCat ? (FV.vocab.mine().find((v) => v.category === picker.category) || {}).level : null;
          FV.session.start({
            items: isCat ? FV.util.shuffle(items) : items, mode,
            label: isCat ? picker.category : src.label,
            category: isCat ? picker.category : null, level,
          });
        },
      },
      h('span', { class: 'mode-icon', 'aria-hidden': 'true' }, info.icon),
      h('span', { class: 'mode-name' }, info.label),
      h('span', { class: 'mode-desc muted' }, info.desc)));
    });
    root.appendChild(h('section', { class: 'section' }, h('h2', { class: 'section-title' }, 'Mode'), grid));
  };

  /* ================= Session ================= */
  FV.views.session = (root) => {
    const session = FV.session.current;
    if (!session) {
      FV.app.go('#/practice');
      return;
    }

    let keyHandler = null;
    let touchCleanup = null;
    const setKeys = (fn) => { keyHandler = fn; };
    const onKey = (e) => {
      if (!keyHandler || e.ctrlKey || e.metaKey || e.altKey) return;
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'SELECT') return;
      // Let focused buttons handle Enter/Space themselves (avoids double answers).
      if (e.target.tagName === 'BUTTON' && (e.key === 'Enter' || e.key === ' ')) return;
      if ((e.key === 'u' || e.key === 'U') && session.index > 0 && session.index < session.items.length) { undo(); return; }
      keyHandler(e);
    };
    document.addEventListener('keydown', onKey);

    const top = h('div', { class: 'session-top' });
    const stage = h('div', { class: 'session-stage' });
    root.appendChild(top);
    root.appendChild(stage);

    function renderTop() {
      clear(top);
      const total = session.items.length;
      const done = Math.min(session.index, total);
      top.appendChild(h('div', { class: 'session-bar' },
        h('button', {
          type: 'button', class: 'icon-btn', 'aria-label': 'End session',
          onclick: async () => {
            if (session.index > 0 && session.index < total) {
              const ok = await FV.util.confirmDialog({ title: 'End this session?', message: 'Answers so far are saved.', confirmLabel: 'End session' });
              if (!ok) return;
            }
            if (session.index > 0) renderSummary();
            else { FV.session.end(); FV.app.go('#/practice'); }
          },
        }, '✕'),
        h('div', { class: 'session-progress', role: 'progressbar', 'aria-valuemin': '0', 'aria-valuemax': String(total), 'aria-valuenow': String(done) },
          h('span', { style: { width: `${(done / total) * 100}%` } })),
        h('div', { class: 'session-count' }, `${Math.min(done + 1, total)} / ${total}`)));
      if (session.index > 0 && session.index < total) {
        top.appendChild(h('button', {
          type: 'button', class: 'btn btn-link undo-btn', title: 'Undo last answer (U)',
          onclick: undo,
        }, '↶ Undo last answer'));
      }
      top.appendChild(h('div', { class: 'session-label muted' },
        `${session.label} · ${FV.questions.MODES[session.mode].label}`));
    }

    function next() {
      if (touchCleanup) { touchCleanup(); touchCleanup = null; }
      if (session.index >= session.items.length) { renderSummary(); return; }
      renderTop();
      clear(stage);
      const item = session.items[session.index];
      if (session.mode.startsWith('flash')) renderFlashcard(item);
      else renderQuestion(item);
    }

    let ratedIndex = -1;
    function rate(rating, { correct, questionType, status }) {
      if (ratedIndex === session.index) return; // ignore double taps
      ratedIndex = session.index;
      FV.audio.stop();
      FV.session.answer({ rating, correct, questionType, status });
      next();
    }

    function undo() {
      if (!FV.session.undo()) return;
      ratedIndex = -1;
      FV.util.toast('Last answer undone');
      next();
    }

    const buzz = (pattern) => { try { navigator.vibrate && navigator.vibrate(pattern); } catch (e) { /* unsupported */ } };

    /* ---------- Flashcards ---------- */
    function renderFlashcard(item) {
      const ratingArea = h('div', { class: 'flash-controls' });
      const flashType = session.mode;
      const card = C.Flashcard(item, {
        reverse: flashType === 'flash-en',
        onFlip: () => {
          clear(ratingArea);
          ratingArea.appendChild(h('div', { class: 'muted center small-print' }, 'How well did you remember it?'));
          ratingArea.appendChild(C.RatingButtons(item, (r) => rate(r, { correct: r !== 'again', questionType: flashType, status: r })));
          ratingArea.appendChild(h('div', { class: 'muted center small-print swipe-hint' }, 'Swipe ← Again · Good →'));
        },
      });
      ratingArea.appendChild(h('button', { class: 'btn btn-primary btn-block btn-lg', onclick: () => card.flip() }, 'Show answer'));
      stage.appendChild(card);
      stage.appendChild(ratingArea);
      setTimeout(() => card.focus({ preventScroll: true }), 30);
      if (flashType === 'flash' && FV.storage.state.settings.autoplay) FV.audio.playItem(item);

      setKeys((e) => {
        if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); card.flip(); }
        else if (card.isFlipped() && /^[1-4]$/.test(e.key)) {
          const r = FV.srs.RATINGS[Number(e.key) - 1];
          rate(r, { correct: r !== 'again', questionType: flashType, status: r });
        }
      });

      // Swipe support once the answer is visible.
      let startX = null;
      let dx = 0;
      const onStart = (e) => { if (card.isFlipped()) { startX = e.touches[0].clientX; dx = 0; } };
      const onMove = (e) => {
        if (startX === null) return;
        dx = e.touches[0].clientX - startX;
        card.style.transform = `translateX(${dx}px) rotate(${dx / 30}deg)`;
      };
      const onEnd = () => {
        if (startX === null) return;
        startX = null;
        card.style.transform = '';
        if (dx > 80) rate('good', { correct: true, questionType: flashType, status: 'good' });
        else if (dx < -80) rate('again', { correct: false, questionType: flashType, status: 'again' });
      };
      card.addEventListener('touchstart', onStart, { passive: true });
      card.addEventListener('touchmove', onMove, { passive: true });
      card.addEventListener('touchend', onEnd);
      touchCleanup = () => {
        card.removeEventListener('touchstart', onStart);
        card.removeEventListener('touchmove', onMove);
        card.removeEventListener('touchend', onEnd);
      };
    }

    /* ---------- Drill questions ---------- */
    function renderQuestion(item) {
      const question = FV.questions.build(item, session.mode, FV.vocab.mine());
      const feedback = h('div', { class: 'feedback', 'aria-live': 'polite' });

      const qEl = C.ReviewQuestion(question, {
        onAnswered: (result) => showFeedback(result),
      });
      stage.appendChild(qEl);
      stage.appendChild(feedback);

      setKeys((e) => {
        if (/^[1-4]$/.test(e.key) && !qEl.classList.contains('answered')) {
          const opt = qEl.querySelector(`.answer-option[data-key="${e.key}"]`);
          if (opt) opt.click();
        }
      });

      function showFeedback(result) {
        let correct = result.status !== 'wrong';
        clear(feedback);
        const statusEl = h('div', { class: 'feedback-status ' + result.status });
        const setStatus = () => {
          statusEl.className = 'feedback-status ' + (correct ? (result.status === 'close' ? 'close' : 'correct') : 'wrong');
          statusEl.textContent = correct
            ? (result.status === 'close' ? '≈ Almost — counted as correct' : '✓ Correct!')
            : (result.skipped ? 'Here is the answer' : '✗ Not quite');
        };
        setStatus();
        feedback.appendChild(statusEl);
        if (result.note) feedback.appendChild(h('div', { class: 'feedback-note' }, result.note));
        if (!correct && result.given && question.input === 'text') {
          feedback.appendChild(h('div', { class: 'feedback-given muted' }, 'You wrote: ', h('s', null, result.given)));
        }

        feedback.appendChild(h('div', { class: 'answer-reveal' },
          h('div', { class: 'reveal-main' },
            h('div', null,
              h('div', { class: 'reveal-fr', lang: 'fr' }, item.french),
              h('div', { class: 'reveal-en' }, item.english)),
            C.AudioButton(item)),
          item.exampleFrench ? h('div', { class: 'reveal-example' },
            h('div', { lang: 'fr' }, item.exampleFrench, ' ', C.AudioButton(item.exampleFrench, { compact: true })),
            h('div', { class: 'muted' }, item.exampleEnglish || '')) : null));

        const suggested = () => (correct ? (result.status === 'close' ? 'hard' : 'good') : 'again');
        const ratingWrap = h('div', { class: 'rating-wrap' });
        const renderRating = () => {
          clear(ratingWrap);
          ratingWrap.appendChild(h('div', { class: 'muted center small-print' }, 'How well did you remember it?'));
          ratingWrap.appendChild(C.RatingButtons(item, (r) => rate(r, { correct, questionType: question.type, status: result.status }), { suggested: suggested() }));
        };
        renderRating();

        if (!correct && question.input === 'text' && !result.skipped) {
          feedback.appendChild(h('button', {
            type: 'button', class: 'btn btn-link override',
            onclick: (e) => { correct = true; setStatus(); renderRating(); e.currentTarget.remove(); },
          }, 'I was right — count it'));
        }
        feedback.appendChild(ratingWrap);

        buzz(correct ? 12 : [40, 60, 40]);
        if (FV.storage.state.settings.autoplay && question.type !== 'listen-fr' && question.type !== 'listen-meaning') FV.audio.playItem(item);

        setKeys((e) => {
          if (/^[1-4]$/.test(e.key)) {
            e.preventDefault();
            rate(FV.srs.RATINGS[Number(e.key) - 1], { correct, questionType: question.type, status: result.status });
          } else if (e.key === 'Enter') {
            e.preventDefault();
            rate(suggested(), { correct, questionType: question.type, status: result.status });
          }
        });
        setTimeout(() => ratingWrap.querySelector('.suggested')?.focus({ preventScroll: true }), 30);
        feedback.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }
    }

    /* ---------- Summary ---------- */
    function renderSummary() {
      setKeys(null);
      clear(top);
      clear(stage);
      const results = session.results;
      const correct = results.filter((r) => r.correct).length;
      const difficult = FV.session.difficultItems();

      stage.appendChild(h('div', { class: 'summary' },
        h('div', { class: 'summary-icon', 'aria-hidden': 'true' }, correct === results.length ? '🏆' : '🎉'),
        h('h1', null, 'Review Complete!'),
        h('div', { class: 'progress-grid three' },
          C.ProgressCard(results.length === 1 ? 'word reviewed' : 'words reviewed', results.length),
          C.ProgressCard('correct', correct, { accent: true }),
          C.ProgressCard('incorrect', results.length - correct)),
        difficult.length ? h('div', { class: 'summary-difficult' },
          h('h2', { class: 'section-title' }, 'Words to work on'),
          h('div', { class: 'list' }, difficult.map((item) => C.VocabularyCard(item)))) : null,
        h('div', { class: 'btn-col' },
          difficult.length ? h('button', {
            class: 'btn btn-primary btn-block btn-lg',
            onclick: () => FV.session.start({ items: FV.util.shuffle(difficult), mode: session.mode, label: 'Difficult Words' }),
          }, 'Review Difficult Words') : null,
          h('button', {
            class: 'btn ' + (difficult.length ? 'btn-secondary' : 'btn-primary') + ' btn-block btn-lg',
            onclick: () => { FV.session.end(); FV.app.go('#/'); },
          }, 'Done'))));
    }

    next();

    return () => {
      document.removeEventListener('keydown', onKey);
      if (touchCleanup) touchCleanup();
    };
  };
})();
