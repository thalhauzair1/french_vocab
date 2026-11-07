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
    const g0 = FV.storage.state.grammar;
    const reviewedCount = FV.GRAMMAR.filter((c) => g0.reviewed[c.id]).length;
    root.appendChild(C.PageHead('Grammar', {
      sub: `Short reference cards · ${reviewedCount} of ${FV.GRAMMAR.length} reviewed`,
    }));

    root.appendChild(h('div', { class: 'search-wrap' },
      C.Icon('search', { size: 18, className: 'search-icon' }),
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
      if (!cards.length) {
        list.appendChild(C.EmptyState(listState.filter === 'favorites' ? 'star' : 'search', 'No cards here',
          listState.filter === 'favorites' ? 'Star a card to keep it here.' : 'Try a different search.'));
        return;
      }
      const groups = [];
      cards.forEach((card) => {
        let last = groups[groups.length - 1];
        if (!last || last.name !== card.group) { last = { name: card.group, cards: [] }; groups.push(last); }
        last.cards.push(card);
      });
      groups.forEach(({ name, cards: gc }) => list.appendChild(C.Section(name,
        h('div', { class: 'list-group' }, gc.map((card) => C.GrammarCard(card, { compact: true, onChange: renderList }))))));
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
      C.BackLink('Grammar', () => FV.app.go('#/grammar')),
      C.FavoriteButton(!!g.favorites[card.id], () => { C.toggleGrammarFavorite(card.id); FV.app.refresh(); })));
    root.appendChild(C.GrammarCard(card));

    root.appendChild(h('div', { class: 'btn-col' },
      h('button', {
        class: 'btn btn-lg btn-block ' + (reviewedAt ? 'btn-secondary' : 'btn-primary'),
        onclick: () => {
          if (reviewedAt) delete g.reviewed[card.id];
          else g.reviewed[card.id] = new Date().toISOString();
          FV.storage.save();
          if (!reviewedAt) FV.util.toast('Marked as reviewed ✓');
          FV.app.refresh();
        },
      }, reviewedAt ? [C.Icon('check', { size: 18 }), `Reviewed ${formatDate(reviewedAt)}`] : 'Mark as reviewed')));

    const prev = FV.GRAMMAR[index - 1];
    const next = FV.GRAMMAR[index + 1];
    const pagerLink = (card_, dir) => h('a', { class: 'pager-link ' + dir, href: `#/grammar/${card_.id}` },
      h('span', { class: 'pager-dir' }, dir === 'prev' ? 'Previous' : 'Next'),
      h('span', { class: 'pager-title' }, card_.title));
    root.appendChild(h('nav', { class: 'pager', 'aria-label': 'Grammar cards' },
      prev ? pagerLink(prev, 'prev') : h('span'),
      next ? pagerLink(next, 'next') : h('span')));
  };
})();
