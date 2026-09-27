/* Progress dashboard: counts, streaks, reviews-per-day chart, level breakdown. */
FV.views = FV.views || {};

FV.views.progress = (root) => {
  const { h } = FV.util;
  const C = FV.components;
  const s = FV.stats.summary();

  root.appendChild(h('header', { class: 'page-head row' },
    h('h1', null, 'Progress'),
    h('a', { class: 'btn btn-ghost', href: '#/settings' }, '⚙ Settings')));

  root.appendChild(h('div', { class: 'progress-grid two' },
    C.ProgressCard('current streak', `${s.current} day${s.current === 1 ? '' : 's'}`, { icon: '🔥', accent: true }),
    C.ProgressCard('longest streak', `${s.longest} day${s.longest === 1 ? '' : 's'}`, { icon: '🏅' })));

  root.appendChild(h('h2', { class: 'section-title' }, 'Vocabulary'));
  root.appendChild(h('div', { class: 'progress-grid three' },
    C.ProgressCard('total in My Vocabulary', s.total),
    C.ProgressCard('personal words', s.personal),
    C.ProgressCard('built-in added', s.builtinAdded),
    C.ProgressCard('words mastered', s.mastered, { sub: '21+ day interval' }),
    C.ProgressCard('need review', s.needingReview, { sub: 'due or last missed' }),
    C.ProgressCard('due today', s.dueToday)));

  root.appendChild(h('h2', { class: 'section-title' }, 'Reviews'));
  const accuracy = s.reviewsCompleted ? Math.round((s.correctReviews / s.reviewsCompleted) * 100) + '%' : '—';
  root.appendChild(h('div', { class: 'progress-grid three' },
    C.ProgressCard('words reviewed', s.wordsReviewed),
    C.ProgressCard('reviews completed', s.reviewsCompleted),
    C.ProgressCard('accuracy', accuracy)));

  const past = FV.stats.dailyReviews(14);
  const pastTotal = past.reduce((a, d) => a + d.count, 0);
  const fmt = (d, opts) => d.toLocaleDateString(undefined, opts);
  root.appendChild(barChart({
    title: 'Reviews per day',
    sub: `Last 14 days · ${pastTotal} review${pastTotal === 1 ? '' : 's'}`,
    bars: past.map((d, i) => ({
      count: d.count,
      highlight: i === past.length - 1,
      axis: (past.length - 1 - i) % 3 === 0 ? (i === past.length - 1 ? 'Today' : fmt(d.date, { day: 'numeric', month: 'numeric' })) : null,
      tip: `${fmt(d.date, { weekday: 'short', day: 'numeric', month: 'short' })}: ${d.count} review${d.count === 1 ? '' : 's'}`,
    })),
  }));

  const ahead = FV.stats.forecast(7);
  const aheadTotal = ahead.reduce((a, d) => a + d.count, 0);
  root.appendChild(barChart({
    title: 'Coming up',
    sub: `Reviews scheduled for the next 7 days · ${aheadTotal} total (overdue items count as today)`,
    bars: ahead.map((d, i) => ({
      count: d.count,
      highlight: i === 0,
      axis: i === 0 ? 'Today' : i === 1 ? 'Tmrw' : fmt(d.date, { weekday: 'short' }),
      tip: `${i === 0 ? 'Today' : fmt(d.date, { weekday: 'long', day: 'numeric', month: 'short' })}: ${d.count} due`,
    })),
  }));

  // Level breakdown
  const levels = FV.stats.byLevel();
  const keys = Object.keys(levels).sort();
  if (keys.length) {
    root.appendChild(h('section', { class: 'card' },
      h('h2', { class: 'card-title' }, 'Mastered by level'),
      keys.map((level) => {
        const { total, mastered } = levels[level];
        const pct = total ? Math.round((mastered / total) * 100) : 0;
        return h('div', { class: 'level-row' },
          h('span', { class: 'level-name' }, level),
          h('div', { class: 'meter', role: 'img', 'aria-label': `${mastered} of ${total} mastered` }, h('span', { style: { width: pct + '%' } })),
          h('span', { class: 'level-count muted' }, `${mastered}/${total}`));
      })));
  }

  const g = FV.storage.state.grammar;
  root.appendChild(h('section', { class: 'card' },
    h('h2', { class: 'card-title' }, 'Grammar'),
    h('p', { class: 'muted' }, `${Object.keys(g.reviewed).length} of ${FV.GRAMMAR.length} grammar cards reviewed · ${Object.keys(g.favorites).length} favorited`)));

  /** Single-series bar chart with rounded bar tops and a hover/focus tooltip per bar. */
  function barChart({ title, sub, bars }) {
    const max = Math.max(4, ...bars.map((d) => d.count));
    const niceMax = Math.ceil(max / 4) * 4;
    const W = 360; const H = 170; const padL = 26; const padB = 24; const padT = 10;
    const plotW = W - padL - 6; const plotH = H - padB - padT;
    const step = plotW / bars.length;
    const barW = Math.min(bars.length > 10 ? 16 : 28, step - 4);
    const NS = 'http://www.w3.org/2000/svg';
    const svg = document.createElementNS(NS, 'svg');
    svg.setAttribute('viewBox', `0 0 ${W} ${H}`);
    svg.setAttribute('class', 'chart');
    svg.setAttribute('role', 'img');
    svg.setAttribute('aria-label', `${title}. ${sub}`);
    const el = (tag, attrs, text) => {
      const n = document.createElementNS(NS, tag);
      Object.entries(attrs).forEach(([k, v]) => n.setAttribute(k, v));
      if (text !== undefined) n.textContent = text;
      svg.appendChild(n);
      return n;
    };

    [0, niceMax / 2, niceMax].forEach((v) => {
      const y = padT + plotH - (v / niceMax) * plotH;
      el('line', { x1: padL, x2: W - 6, y1: y, y2: y, class: 'chart-grid' });
      el('text', { x: padL - 6, y: y + 4, class: 'chart-axis', 'text-anchor': 'end' }, String(v));
    });

    const tooltip = h('div', { class: 'chart-tooltip', role: 'status' });
    tooltip.hidden = true;
    const wrap = h('div', { class: 'chart-wrap' });

    bars.forEach((d, i) => {
      const cx = padL + step * i + step / 2;
      const bh = d.count ? Math.max(3, (d.count / niceMax) * plotH) : 0;
      const y = padT + plotH - bh;
      if (bh) {
        // Rounded top, square baseline.
        const r = Math.min(4, barW / 2, bh);
        const x = cx - barW / 2;
        el('path', {
          class: 'chart-bar' + (d.highlight ? ' today' : ''),
          d: `M${x},${y + bh} V${y + r} Q${x},${y} ${x + r},${y} H${x + barW - r} Q${x + barW},${y} ${x + barW},${y + r} V${y + bh} Z`,
        });
      }
      if (d.axis) el('text', { x: cx, y: H - 6, class: 'chart-axis', 'text-anchor': 'middle' }, d.axis);
      // Hit target covers the full column, larger than the bar.
      const hit = el('rect', { x: cx - step / 2, y: padT, width: step, height: plotH, class: 'chart-hit', tabindex: '0' });
      hit.setAttribute('aria-label', d.tip);
      const show = () => {
        tooltip.textContent = d.tip;
        tooltip.hidden = false;
        tooltip.style.left = `${(cx / W) * 100}%`;
        // Keep the tooltip inside the card near the edges.
        const shift = cx > W * 0.7 ? '-100%' : cx < W * 0.3 ? '0%' : '-50%';
        tooltip.style.transform = `translate(${shift}, -100%)`;
        hit.classList.add('hover');
      };
      const hide = () => { tooltip.hidden = true; hit.classList.remove('hover'); };
      hit.addEventListener('mouseenter', show);
      hit.addEventListener('focus', show);
      hit.addEventListener('mouseleave', hide);
      hit.addEventListener('blur', hide);
      hit.addEventListener('touchstart', show, { passive: true });
    });

    wrap.appendChild(svg);
    wrap.appendChild(tooltip);
    return h('section', { class: 'card' },
      h('h2', { class: 'card-title' }, title),
      h('p', { class: 'muted small-print' }, sub),
      wrap);
  }
};
