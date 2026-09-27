/* Vocabulary browser, word detail page, and add/edit form. */
FV.views = FV.views || {};

(() => {
  const { h, clear, debounce, formatDate, relativeDue } = FV.util;
  const C = FV.components;

  const TABS = [
    { id: 'all', label: 'All' },
    { id: 'my', label: 'My Words' },
    { id: 'builtin', label: 'Built-in' },
    { id: 'favorites', label: 'Favorites' },
    { id: 'due', label: 'Due Today' },
  ];
  const PAGE = 60;

  // Remembered between visits so going back to the list keeps your place.
  const listState = { tab: 'all', q: '', cat: '', level: '' };

  /* ================= Pronunciation helpers ================= */
  const SOURCE_ICONS = { user: '🎙', native: '🇫🇷', tts: '🔊', none: '⚠' };

  function sourceLine(item) {
    const line = h('div', { class: 'audio-source muted' });
    const fill = () => {
      const info = FV.audio.sourceInfo(item);
      clear(line);
      line.append(`${SOURCE_ICONS[info.kind]} ${info.label}`);
      if (info.kind === 'none') line.append(' — ', h('a', { href: '#/settings' }, 'fix in Settings'));
    };
    fill();
    FV.audio.ready.then(fill); // the voice list loads asynchronously
    line.refresh = fill;
    return line;
  }

  /** "Pronunciation" (where the audio comes from) and "Practice speaking" (record & compare) cards. */
  function pronunciationCards(root, item, { inMine, rerender }) {
    const info = FV.audio.sourceInfo(item);
    const native = FV.nativeAudio.info(item.french);
    const results = h('div', { class: 'native-results' });

    const findBtn = h('button', {
      class: 'btn btn-secondary btn-sm',
      onclick: async () => {
        if (navigator.onLine === false) { FV.util.toast('Connect to the internet to search recordings'); return; }
        findBtn.disabled = true;
        findBtn.textContent = 'Searching…';
        clear(results);
        try {
          renderResults(await FV.nativeAudio.search(item.french, 8));
        } catch (err) {
          results.appendChild(h('p', { class: 'muted small-print' }, 'Could not reach Wikimedia right now. Try again in a minute.'));
        }
        findBtn.disabled = false;
        findBtn.textContent = '🔎 Find native recordings';
      },
    }, '🔎 Find native recordings');

    function renderResults(recs) {
      clear(results);
      if (!recs.length) {
        results.appendChild(h('p', { class: 'muted small-print' },
          'No native recording found for this exact word or phrase. ' +
          (inMine ? 'You can record one yourself, or keep text-to-speech.' : 'Text-to-speech will be used.')));
        return;
      }
      results.appendChild(h('ul', { class: 'native-list' }, recs.map((rec) => {
        const inUse = native && native.title === rec.title;
        return h('li', null,
          h('button', {
            type: 'button', class: 'btn-audio compact', 'aria-label': `Preview recording by ${rec.speaker}`,
            onclick: (e) => { e.preventDefault(); FV.audio.playSource(rec.url); },
          }, h('span', { class: 'audio-icon', 'aria-hidden': 'true' }, '▶')),
          h('div', { class: 'native-meta' },
            h('div', { class: 'native-speaker' }, rec.speaker),
            h('div', { class: 'muted small-print' }, `“${rec.word}” · ${rec.license}`)),
          inUse ? h('span', { class: 'chip chip-good' }, '✓ In use') : h('button', {
            type: 'button', class: 'btn btn-primary btn-sm',
            onclick: async (e) => {
              const b = e.currentTarget;
              b.disabled = true;
              b.textContent = 'Saving…';
              try {
                await FV.nativeAudio.use(item.french, rec);
                if (inMine && item.audioId) { // choosing a native recording replaces your own
                  await FV.audioStore.remove(item.audioId).catch(() => {});
                  FV.vocab.setAudio(item.id, null);
                }
                FV.util.toast('Native recording saved for offline use');
                rerender();
              } catch (err) {
                FV.util.toast('Download failed — try again');
                b.disabled = false;
                b.textContent = 'Use this';
              }
            },
          }, 'Use this'));
      })));
      results.appendChild(h('p', { class: 'muted small-print' }, 'Recordings by Lingua Libre volunteers, via Wikimedia Commons.'));
    }

    const saveUserAudio = async (blob, message) => {
      try {
        const audioId = 'a-' + item.id;
        await FV.audioStore.put(audioId, blob);
        FV.vocab.setAudio(item.id, audioId);
        FV.util.toast(message);
        rerender();
      } catch (err) {
        FV.util.toast('Could not save the recording');
      }
    };
    const fileInput = h('input', {
      type: 'file', accept: 'audio/*', hidden: true,
      onchange: (e) => {
        const file = e.target.files[0];
        if (!file) return;
        if (file.size > 5 * 1024 * 1024) { FV.util.toast('Please choose a file under 5 MB'); return; }
        saveUserAudio(file, 'Audio file attached');
      },
    });

    const credit = info.kind === 'native'
      ? h('p', { class: 'muted small-print' }, 'Recorded by ', h('strong', null, info.native.speaker), ' · ',
        info.native.page ? h('a', { href: info.native.page, target: '_blank', rel: 'noopener' }, 'Lingua Libre') : 'Lingua Libre',
        ` · ${info.native.license}`)
      : null;

    root.appendChild(h('section', { class: 'card' },
      h('div', { class: 'field-label' }, 'Pronunciation'),
      h('div', { class: 'source-now' }, h('span', { 'aria-hidden': 'true' }, SOURCE_ICONS[info.kind]), ' ', info.label),
      credit,
      h('div', { class: 'btn-row' },
        findBtn,
        inMine ? C.RecordButton((blob) => saveUserAudio(blob, 'Your recording is saved'), { label: '🎙 Record my own' }) : null,
        inMine ? h('button', { class: 'btn btn-ghost btn-sm', onclick: () => fileInput.click() }, '⬆ Upload file') : null,
        inMine && item.audioId ? h('button', {
          class: 'btn btn-ghost btn-sm',
          onclick: async () => {
            await FV.audioStore.remove(item.audioId).catch(() => {});
            FV.vocab.setAudio(item.id, null);
            rerender();
          },
        }, 'Remove my recording') : null,
        !item.audioId && native ? h('button', {
          class: 'btn btn-ghost btn-sm',
          onclick: async () => { await FV.nativeAudio.remove(item.french); rerender(); },
        }, 'Remove native recording') : null),
      fileInput,
      results));

    // Practice speaking: record yourself, then compare with the model pronunciation.
    let attempt = null;
    const compare = h('div', { class: 'btn-row compare-row' });
    const renderCompare = () => {
      clear(compare);
      compare.appendChild(C.RecordButton((blob) => { attempt = blob; renderCompare(); FV.audio.playSource(blob); },
        { label: attempt ? '🎙 Try again' : '🎙 Record yourself', className: 'btn btn-primary btn-sm' }));
      if (attempt) {
        compare.appendChild(h('button', { class: 'btn btn-secondary btn-sm', onclick: () => FV.audio.playSource(attempt) }, '▶ You'));
        compare.appendChild(h('button', { class: 'btn btn-secondary btn-sm', onclick: () => FV.audio.playItem(item) }, '▶ Model'));
        compare.appendChild(h('button', {
          class: 'btn btn-ghost btn-sm',
          onclick: async () => {
            if (!(await FV.audio.playItem(item))) return;
            await new Promise((r) => setTimeout(r, 400));
            FV.audio.playSource(attempt);
          },
        }, '⇄ Model, then you'));
      }
    };
    renderCompare();
    root.appendChild(h('section', { class: 'card' },
      h('div', { class: 'field-label' }, 'Practice speaking'),
      h('p', { class: 'muted small-print' }, 'Record yourself saying it, then compare with the model. Nothing is saved or uploaded.'),
      compare));
  }

  /* ================= Vocabulary list ================= */
  FV.views.vocabList = (root, { query }) => {
    if (query.tab) {
      // A link to a specific tab starts from a clean filter unless it names a category.
      listState.tab = query.tab;
      listState.cat = query.cat || '';
      listState.level = query.level || '';
    }
    if (query.q !== undefined) listState.q = query.q;

    root.appendChild(h('header', { class: 'page-head row' },
      h('h1', null, 'Vocabulary'),
      h('a', { class: 'btn btn-primary', href: '#/add' }, '+ Add Word')));

    const searchInput = h('input', {
      type: 'search', class: 'search-input', placeholder: 'Search vocabulary...', value: listState.q,
      'aria-label': 'Search vocabulary',
      oninput: debounce((e) => { listState.q = e.target.value; renderResults(); }, 120),
    });
    root.appendChild(h('div', { class: 'search-wrap' }, h('span', { class: 'search-icon', 'aria-hidden': 'true' }, '🔍'), searchInput));

    const tabs = h('div', { class: 'tabs', role: 'tablist', 'aria-label': 'Vocabulary filter' });
    const renderTabs = () => {
      clear(tabs);
      TABS.forEach((t) => tabs.appendChild(h('button', {
        type: 'button', role: 'tab', 'aria-selected': String(listState.tab === t.id),
        class: 'tab' + (listState.tab === t.id ? ' active' : ''),
        onclick: () => { listState.tab = t.id; listState.cat = ''; listState.level = ''; renderTabs(); renderFilters(); renderResults(); },
      }, t.label)));
    };
    root.appendChild(tabs);

    const filters = h('div', { class: 'filters' });
    root.appendChild(filters);
    const results = h('div', { class: 'results' });
    root.appendChild(results);

    function renderFilters() {
      clear(filters);
      const cats = FV.vocab.categories();
      filters.appendChild(h('select', {
        class: 'select', 'aria-label': 'Filter by category',
        onchange: (e) => { listState.cat = e.target.value; listState.level = ''; renderResults(); },
      },
      h('option', { value: '' }, 'All categories'),
      cats.map((c) => h('option', { value: c, selected: c === listState.cat }, c))));
    }

    function baseList() {
      const mine = FV.vocab.mine();
      switch (listState.tab) {
        case 'my': return mine.slice().sort((a, b) => b.createdAt.localeCompare(a.createdAt));
        case 'builtin': return FV.vocab.builtinItems();
        case 'favorites': return mine.filter((v) => v.isFavorite);
        case 'due': return FV.srs.todaysItems(mine, FV.storage.state.settings.newPerDay).all;
        default: return FV.vocab.allItems();
      }
    }

    function renderResults() {
      clear(results);
      const browsingCategories = listState.tab === 'builtin' && !listState.cat && !listState.q.trim();
      if (browsingCategories) { renderCategoryGrid(); return; }

      let list = baseList();
      if (listState.cat) list = list.filter((v) => v.category === listState.cat);
      if (listState.level) list = list.filter((v) => v.level === listState.level);
      list = FV.vocab.search(list, listState.q);

      if (listState.tab === 'builtin' && listState.cat) renderCategoryHeader();

      if (!list.length) {
        const empty = {
          my: ['📝', 'No words yet', 'Words you add — or add from the built-in list — appear here.'],
          favorites: ['☆', 'No favorites yet', 'Tap the star on any word to save it here.'],
          due: ['🎉', 'Nothing due today', 'Come back tomorrow, or practice anything you like.'],
        }[listState.tab] || ['🔍', 'No matches', 'Try a different search or category.'];
        results.appendChild(C.EmptyState(...empty,
          listState.tab === 'my' ? h('a', { class: 'btn btn-primary', href: '#/add' }, '+ Add Word') : null));
        return;
      }

      results.appendChild(h('div', { class: 'result-count muted' }, `${list.length} item${list.length === 1 ? '' : 's'}`));
      const container = h('div', { class: 'list' });
      results.appendChild(container);
      let shown = 0;
      const more = h('button', { class: 'btn btn-secondary btn-block', onclick: () => showMore() }, 'Show more');
      const showMore = () => {
        list.slice(shown, shown + PAGE).forEach((item) => container.appendChild(C.VocabularyCard(item, { onChange: renderResults })));
        shown += PAGE;
        if (shown >= list.length) more.remove();
        else if (!more.isConnected) results.appendChild(more);
      };
      showMore();
    }

    function renderCategoryHeader() {
      const entry = FV.vocab.builtinCategories.find((c) => c.category === listState.cat && (!listState.level || c.level === listState.level));
      const entries = FV.vocab.builtinCategories.filter((c) => c.category === listState.cat && (!listState.level || c.level === listState.level));
      const items = entries.flatMap((e) => e.items);
      const remaining = items.filter((b) => !FV.vocab.addedCopyOf(b.id)).length;
      const inMine = items.length - remaining;
      results.appendChild(h('div', { class: 'category-head card' },
        h('button', { class: 'btn btn-link back-link', onclick: () => { listState.cat = ''; listState.level = ''; renderFilters(); renderResults(); } }, '← All categories'),
        h('h2', null, (entry && listState.level ? listState.level + ' → ' : '') + listState.cat),
        h('div', { class: 'muted' }, `${items.length} items · ${inMine} in My Vocabulary`),
        h('div', { class: 'btn-row' },
          remaining ? h('button', {
            class: 'btn btn-primary',
            onclick: () => {
              let n = 0;
              entries.forEach((e) => { n += FV.vocab.addCategory(e.level, e.category); });
              FV.util.toast(`Added ${n} item${n === 1 ? '' : 's'} to My Vocabulary`);
              renderResults();
            },
          }, `+ Add all (${remaining})`) : h('span', { class: 'chip chip-good' }, '✓ All added'),
          inMine ? h('button', {
            class: 'btn btn-secondary',
            onclick: () => FV.session.startCategory(listState.cat, listState.level || (entry && entry.level)),
          }, 'Practice') : null)));
    }

    function renderCategoryGrid() {
      ['A1', 'A2', 'B1'].forEach((level) => {
        const cats = FV.vocab.builtinCategories.filter((c) => c.level === level);
        results.appendChild(h('h2', { class: 'section-title level-title' }, h('span', { class: 'chip chip-level' }, level),
          { A1: ' Beginner', A2: ' Elementary', B1: ' Intermediate' }[level]));
        results.appendChild(h('div', { class: 'category-grid' },
          cats.map((c) => C.CategoryCard({
            level, category: c.category, count: c.items.length,
            added: c.items.filter((b) => FV.vocab.addedCopyOf(b.id)).length,
          }, () => {
            listState.cat = c.category;
            listState.level = level;
            FV.storage.state.meta.lastCategory = { category: c.category, level };
            FV.storage.save();
            renderFilters();
            renderResults();
            window.scrollTo(0, 0);
          }))));
      });
    }

    renderTabs();
    renderFilters();
    renderResults();
  };

  /* ================= Word detail ================= */
  FV.views.wordDetail = (root, { id, query }) => {
    const item = FV.vocab.get(decodeURIComponent(id));
    if (!item) {
      root.appendChild(C.EmptyState('🤷', 'Word not found', 'It may have been deleted.',
        h('a', { class: 'btn btn-primary', href: '#/vocab' }, 'Back to vocabulary')));
      return;
    }
    const inMine = FV.vocab.isInMyVocab(item);
    const rerender = () => FV.app.refresh();

    root.appendChild(h('div', { class: 'detail-nav' },
      h('button', { class: 'btn btn-link back-link', onclick: () => history.length > 1 ? history.back() : FV.app.go('#/vocab') }, '← Back'),
      inMine ? h('a', { class: 'btn btn-link', href: `#/edit/${encodeURIComponent(item.id)}` }, 'Edit') : null));

    if (query.saved) {
      root.appendChild(h('div', { class: 'banner success', role: 'status' }, '✓ Saved to My Vocabulary'));
    }

    // Main card
    let speed = FV.storage.state.settings.audioRate || 1;
    const speedSeg = h('div', { class: 'segmented small', role: 'radiogroup', 'aria-label': 'Playback speed' },
      [0.75, 1, 1.25].map((s) => h('button', {
        type: 'button', role: 'radio', class: 'seg' + (s === speed ? ' active' : ''), 'aria-checked': String(s === speed),
        onclick: (e) => {
          speed = s;
          speedSeg.querySelectorAll('.seg').forEach((b) => { b.classList.remove('active'); b.setAttribute('aria-checked', 'false'); });
          e.currentTarget.classList.add('active');
          e.currentTarget.setAttribute('aria-checked', 'true');
          play({ speed });
        },
      }, `${s}×`)));

    const source = sourceLine(item);
    // Playing can download a native recording, which changes the source label.
    const play = (opts) => FV.audio.playItem(item, opts).then((r) => { source.refresh(); return r; });
    const listenBtn = h('button', {
      type: 'button', class: 'btn-audio large',
      onclick: () => play({ speed }),
    }, h('span', { class: 'audio-icon', 'aria-hidden': 'true' }, '▶'), h('span', null, 'Listen'));

    const repeatBtn = h('button', {
      type: 'button', class: 'btn btn-secondary btn-sm', title: 'Play three times',
      onclick: async () => {
        for (let i = 0; i < 3; i++) {
          const played = await play({ speed });
          if (!played) break; // interrupted, or no audio available
          await new Promise((r) => setTimeout(r, 500));
        }
      },
    }, '🔁 Repeat ×3');

    root.appendChild(h('section', { class: 'card word-hero' },
      h('div', { class: 'word-chips' },
        C.Chip(item.type), item.level ? C.Chip(item.level, 'chip-level') : null, C.Chip(item.category),
      ),
      h('div', { class: 'word-fr', lang: 'fr' }, item.french),
      h('div', { class: 'word-en' }, item.english),
      h('div', { class: 'word-audio' }, listenBtn, speedSeg, repeatBtn),
      source));

    if (item.exampleFrench) {
      root.appendChild(h('section', { class: 'card' },
        h('div', { class: 'field-label' }, 'Example'),
        h('div', { class: 'example-row' },
          h('div', null,
            h('div', { class: 'example-fr', lang: 'fr' }, item.exampleFrench),
            h('div', { class: 'muted' }, item.exampleEnglish || '')),
          C.AudioButton(item.exampleFrench, { compact: true }))));
    }

    // Actions
    if (!inMine) {
      root.appendChild(h('div', { class: 'btn-col' },
        h('button', {
          class: 'btn btn-primary btn-block btn-lg',
          onclick: () => {
            const added = FV.vocab.addBuiltin(item.id);
            FV.util.toast('Added to My Vocabulary');
            history.replaceState(null, '', `#/word/${encodeURIComponent(added.id)}`);
            FV.app.render();
          },
        }, '+ Add to My Vocabulary')));
      root.appendChild(h('p', { class: 'muted center small-print' }, 'Built-in word · add it to include it in your reviews.'));
      pronunciationCards(root, item, { inMine: false, rerender });
      return;
    }

    root.appendChild(h('div', { class: 'action-row' },
      h('button', {
        class: 'btn btn-primary',
        onclick: () => {
          const others = FV.util.shuffle(FV.vocab.mine().filter((v) => v.category === item.category && v.id !== item.id)).slice(0, 9);
          FV.session.start({ items: [item, ...others], mode: 'random', label: item.category, category: item.category, level: item.level });
        },
      }, '🎯 Practice Now'),
      C.FavoriteButton(item.isFavorite, () => { FV.vocab.toggleFavorite(item.id); rerender(); },
        { label: item.isFavorite ? 'Favorited' : 'Add Favorite' })));

    // Review status
    const accuracy = item.reviewCount ? Math.round((item.correctCount / item.reviewCount) * 100) + '%' : '—';
    root.appendChild(h('section', { class: 'card' },
      h('div', { class: 'field-label' }, 'Review status'),
      h('dl', { class: 'stat-list' },
        h('div', null, h('dt', null, 'Status'), h('dd', null,
          FV.srs.isNew(item) ? 'New — not reviewed yet' : FV.srs.isMastered(item) ? 'Mastered' : FV.srs.isDue(item) ? 'Due now' : 'Learning')),
        h('div', null, h('dt', null, 'Next review'), h('dd', null, FV.srs.isNew(item) ? 'In your next review' : relativeDue(item.nextReviewAt))),
        h('div', null, h('dt', null, 'Reviews'), h('dd', null, String(item.reviewCount || 0))),
        h('div', null, h('dt', null, 'Correct / incorrect'), h('dd', null, `${item.correctCount || 0} / ${item.incorrectCount || 0}`)),
        h('div', null, h('dt', null, 'Accuracy'), h('dd', null, accuracy)),
        h('div', null, h('dt', null, 'Last reviewed'), h('dd', null, formatDate(item.lastReviewedAt))),
        h('div', null, h('dt', null, 'Added'), h('dd', null, `${formatDate(item.createdAt)} · ${item.source === 'builtin' ? 'built-in' : 'my word'}`)))));

    // History
    const history_ = FV.storage.state.reviews.filter((r) => r.vocabId === item.id).slice(-8).reverse();
    if (history_.length) {
      root.appendChild(h('section', { class: 'card' },
        h('div', { class: 'field-label' }, 'Recent reviews'),
        h('ul', { class: 'history-list' }, history_.map((r) => h('li', null,
          h('span', { class: r.correct ? 'ok' : 'bad', 'aria-label': r.correct ? 'correct' : 'incorrect' }, r.correct ? '✓' : '✗'),
          h('span', null, (FV.questions.MODES[r.questionType] || { label: r.questionType }).label),
          h('span', { class: `chip rating-chip rating-${r.rating}` }, FV.srs.RATING_LABELS[r.rating]),
          h('span', { class: 'muted' }, formatDate(r.at)))))));
    }

    pronunciationCards(root, item, { inMine: true, rerender });

    root.appendChild(h('div', { class: 'danger-zone' },
      h('button', {
        class: 'btn btn-ghost danger-text',
        onclick: async () => {
          const ok = await FV.util.confirmDialog({
            title: `Delete “${item.french}”?`,
            message: 'It will be removed from My Vocabulary. Past review history is kept in your statistics.',
            confirmLabel: 'Delete', danger: true,
          });
          if (!ok) return;
          FV.vocab.remove(item.id);
          FV.util.toast('Deleted');
          FV.app.go('#/vocab');
        },
      }, 'Delete word')));
  };

  /* ================= Add / edit form ================= */
  FV.views.wordForm = (root, { id }) => {
    const editing = id ? FV.vocab.findMine(decodeURIComponent(id)) : null;
    if (id && !editing) {
      root.appendChild(C.EmptyState('🤷', 'Word not found', null, h('a', { class: 'btn btn-primary', href: '#/vocab' }, 'Back')));
      return;
    }
    const v = editing || {};

    root.appendChild(h('div', { class: 'detail-nav' },
      h('button', { class: 'btn btn-link back-link', onclick: () => history.back() }, '← Cancel')));
    root.appendChild(h('header', { class: 'page-head' }, h('h1', null, editing ? 'Edit Word' : 'Add Word')));

    const field = (label, input, hint) => h('label', { class: 'field' },
      h('span', { class: 'field-label' }, label), input, hint ? h('span', { class: 'field-hint muted' }, hint) : null);

    const french = h('input', { class: 'input input-fr', name: 'french', required: true, lang: 'fr', autocomplete: 'off', value: v.french || '', placeholder: 'e.g. se débrouiller' });
    const english = h('input', { class: 'input', name: 'english', required: true, autocomplete: 'off', value: v.english || '', placeholder: 'e.g. to manage / get by' });
    const exFr = h('textarea', { class: 'input', name: 'exampleFrench', rows: '2', lang: 'fr', placeholder: 'e.g. Je me débrouille bien en français.' }, v.exampleFrench || '');
    const exEn = h('textarea', { class: 'input', name: 'exampleEnglish', rows: '2', placeholder: 'e.g. I manage well in French.' }, v.exampleEnglish || '');
    const listId = 'cat-options';
    const category = h('input', { class: 'input', name: 'category', list: listId, autocomplete: 'off', value: v.category || '', placeholder: 'My Words' });
    const datalist = h('datalist', { id: listId }, FV.vocab.categories().map((c) => h('option', { value: c })));
    const level = h('select', { class: 'select', name: 'level' },
      h('option', { value: '' }, '— None —'),
      FV.vocab.LEVELS.map((l) => h('option', { value: l, selected: v.level === l }, l)));
    const type = h('select', { class: 'select', name: 'type' },
      h('option', { value: 'auto', selected: !editing }, 'Auto-detect'),
      FV.vocab.TYPES.map((t) => h('option', { value: t, selected: editing && v.type === t }, t[0].toUpperCase() + t.slice(1))));

    const error = h('div', { class: 'form-error', role: 'alert' });
    let addAnother = false;

    const form = h('form', {
      class: 'card form', novalidate: true,
      onsubmit: async (e) => {
        e.preventDefault();
        const data = {
          french: french.value, english: english.value, exampleFrench: exFr.value, exampleEnglish: exEn.value,
          category: category.value.trim() || 'My Words', level: level.value,
          type: type.value === 'auto' ? FV.vocab.inferType(french.value) : type.value,
        };
        if (!data.french.trim() || !data.english.trim()) {
          error.textContent = 'French and English are both required.';
          (data.french.trim() ? english : french).focus();
          return;
        }
        if (!editing) {
          const norm = FV.util.normalize(data.french);
          const dup = FV.vocab.mine().find((x) => FV.util.normalize(x.french) === norm);
          if (dup) {
            const ok = await FV.util.confirmDialog({
              title: 'Already in your list',
              message: `“${dup.french}” (${dup.english}) is already in My Vocabulary. Save another copy?`,
              confirmLabel: 'Save anyway',
            });
            if (!ok) return;
          }
        }
        const saved = editing ? FV.vocab.update(editing.id, data) : FV.vocab.create(data);
        if (addAnother && !editing) {
          // Quick entry: keep category/level/type, clear the rest.
          addAnother = false;
          [french, english, exFr, exEn].forEach((el) => { el.value = ''; });
          error.textContent = '';
          FV.util.toast(`Saved “${saved.french}” — add the next one`);
          french.focus();
          return;
        }
        history.replaceState(null, '', '#/vocab');
        FV.app.go(`#/word/${encodeURIComponent(saved.id)}?saved=1`);
      },
    },
    field('French word or phrase *', h('div', { class: 'input-with-btn' }, french,
      h('button', {
        type: 'button', class: 'btn-audio compact', title: 'Preview pronunciation', 'aria-label': 'Preview pronunciation',
        onclick: () => french.value.trim() && FV.audio.playItem({ french: french.value.trim() }),
      }, h('span', { class: 'audio-icon' }, '▶')))),
    C.AccentBar(french),
    field('English meaning *', english, 'Separate alternatives with “/”, e.g. big / tall'),
    field('Example sentence (French)', exFr),
    field('English translation', exEn),
    field('Category', h('div', null, category, datalist)),
    h('div', { class: 'field-row' }, field('Level', level), field('Type', type)),
    error,
    h('div', { class: 'btn-col' },
      h('button', { type: 'submit', class: 'btn btn-primary btn-block btn-lg' }, 'Save'),
      editing ? null : h('button', {
        type: 'submit', class: 'btn btn-secondary btn-block', onclick: () => { addAnother = true; },
      }, 'Save & add another')));

    root.appendChild(form);
    if (!editing) setTimeout(() => french.focus(), 50);
  };
})();
