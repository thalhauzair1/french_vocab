/* Grammar notecards: browse, search, favorite, mark as reviewed. */
FV.views = FV.views || {};

(() => {
  const { h, clear, stripAccents, formatDate, debounce } = FV.util;
  const C = FV.components;
  const listState = { q: '', filter: 'all' };
  const fold = (t) => stripAccents(String(t).toLowerCase());

  function cardText(card) {
    const parts = [card.title, card.group, card.summary];
    card.blocks.forEach((b) => {
      if (b.text) parts.push(b.text);
      if (b.rows) parts.push(b.head.join(' '), b.rows.flat().join(' '));
      if (b.items) parts.push(b.items.flat().join(' '));
    });
    return fold(parts.join(' '));
  }

  FV.views.grammarList = (root) => {
    root.appendChild(h('header', { class: 'page-head' },
      h('h1', null, 'Grammar'),
      h('p', { class: 'muted' }, 'Short reference cards for quick revision.')));

    root.appendChild(h('div', { class: 'search-wrap' },
      h('span', { class: 'search-icon', 'aria-hidden': 'true' }, '🔍'),
      h('input', {
        type: 'search', class: 'search-input', placeholder: 'Search grammar topics...', value: listState.q,
        'aria-label': 'Search grammar topics',
        oninput: debounce((e) => { listState.q = e.target.value; renderList(); }, 120),
      })));

    const filters = [['all', 'All'], ['favorites', 'Favorites'], ['unreviewed', 'Not reviewed'], ['reviewed', 'Reviewed']];
    const tabs = h('div', { class: 'tabs', role: 'tablist' });
    const renderTabs = () => {
      clear(tabs);
      filters.forEach(([id, label]) => tabs.appendChild(h('button', {
        type: 'button', role: 'tab', 'aria-selected': String(listState.filter === id),
        class: 'tab' + (listState.filter === id ? ' active' : ''),
        onclick: () => { listState.filter = id; renderTabs(); renderList(); },
      }, label)));
    };
    root.appendChild(tabs);

    const list = h('div', { class: 'grammar-list' });
    root.appendChild(list);

    function renderList() {
      clear(list);
      const g = FV.storage.state.grammar;
      const q = fold(listState.q.trim());
      const cards = FV.GRAMMAR.filter((card) => {
        if (listState.filter === 'favorites' && !g.favorites[card.id]) return false;
        if (listState.filter === 'reviewed' && !g.reviewed[card.id]) return false;
        if (listState.filter === 'unreviewed' && g.reviewed[card.id]) return false;
        return !q || cardText(card).includes(q);
      });
      const reviewed = FV.GRAMMAR.filter((c) => g.reviewed[c.id]).length;
      list.appendChild(h('div', { class: 'result-count muted' }, `${reviewed} of ${FV.GRAMMAR.length} cards reviewed`));
      if (!cards.length) {
        list.appendChild(C.EmptyState('📘', 'No cards here', listState.filter === 'favorites' ? 'Star a card to keep it here.' : 'Try a different search.'));
        return;
      }
      let group = null;
      cards.forEach((card) => {
        if (card.group !== group) {
          group = card.group;
          list.appendChild(h('h2', { class: 'section-title' }, group));
        }
        list.appendChild(C.GrammarCard(card, { compact: true, onChange: renderList }));
      });
    }

    renderTabs();
    renderList();
  };

  FV.views.grammarDetail = (root, { id }) => {
    const index = FV.GRAMMAR.findIndex((c) => c.id === id);
    const card = FV.GRAMMAR[index];
    if (!card) {
      root.appendChild(C.EmptyState('📘', 'Card not found', null, h('a', { class: 'btn btn-primary', href: '#/grammar' }, 'All grammar cards')));
      return;
    }
    const g = FV.storage.state.grammar;
    const reviewedAt = g.reviewed[card.id];

    root.appendChild(h('div', { class: 'detail-nav' },
      h('a', { class: 'btn btn-link back-link', href: '#/grammar' }, '← Grammar')));
    root.appendChild(C.GrammarCard(card));

    root.appendChild(h('div', { class: 'action-row' },
      h('button', {
        class: 'btn ' + (reviewedAt ? 'btn-secondary' : 'btn-primary'),
        onclick: () => {
          if (reviewedAt) delete g.reviewed[card.id];
          else g.reviewed[card.id] = new Date().toISOString();
          FV.storage.save();
          if (!reviewedAt) FV.util.toast('Marked as reviewed ✓');
          FV.app.refresh();
        },
      }, reviewedAt ? `✓ Reviewed ${formatDate(reviewedAt)}` : 'Mark as reviewed'),
      C.FavoriteButton(!!g.favorites[card.id], () => { C.toggleGrammarFavorite(card.id); FV.app.refresh(); },
        { label: g.favorites[card.id] ? 'Favorited' : 'Favorite' })));

    const prev = FV.GRAMMAR[index - 1];
    const next = FV.GRAMMAR[index + 1];
    root.appendChild(h('nav', { class: 'pager', 'aria-label': 'Grammar cards' },
      prev ? h('a', { class: 'btn btn-ghost', href: `#/grammar/${prev.id}` }, '← ' + prev.title) : h('span'),
      next ? h('a', { class: 'btn btn-ghost', href: `#/grammar/${next.id}` }, next.title + ' →') : h('span')));
  };
})();
