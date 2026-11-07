/* App shell: hash router, navigation state, theme, and startup. */
FV.app = (() => {
  const { clear } = FV.util;
  const view = () => document.getElementById('view');

  const ROUTES = [
    { pattern: /^$/, view: 'home', nav: 'home' },
    { pattern: /^home$/, view: 'home', nav: 'home' },
    { pattern: /^vocab$/, view: 'vocabList', nav: 'vocab' },
    { pattern: /^word\/(.+)$/, view: 'wordDetail', nav: 'vocab' },
    { pattern: /^add$/, view: 'wordForm', nav: 'vocab' },
    { pattern: /^edit\/(.+)$/, view: 'wordForm', nav: 'vocab' },
    { pattern: /^practice$/, view: 'practice', nav: 'practice' },
    { pattern: /^session$/, view: 'session', nav: 'practice' },
    { pattern: /^grammar$/, view: 'grammarList', nav: 'grammar' },
    { pattern: /^grammar\/(.+)$/, view: 'grammarDetail', nav: 'grammar' },
    { pattern: /^progress$/, view: 'progress', nav: 'progress' },
    { pattern: /^settings$/, view: 'settings', nav: 'settings' },
  ];

  let cleanup = null;

  function parseHash() {
    const raw = location.hash.replace(/^#\/?/, '');
    const [path, qs] = raw.split('?');
    return { path: decodeURIComponent(path || ''), query: Object.fromEntries(new URLSearchParams(qs || '')) };
  }

  function render() {
    const { path, query } = parseHash();
    const route = ROUTES.find((r) => r.pattern.test(path)) || ROUTES[0];
    const match = path.match(route.pattern) || [];
    if (typeof cleanup === 'function') cleanup();
    cleanup = null;
    FV.audio.stop();

    document.querySelectorAll('.nav-item').forEach((a) => {
      const active = a.dataset.nav === route.nav;
      a.classList.toggle('active', active);
      if (active) a.setAttribute('aria-current', 'page');
      else a.removeAttribute('aria-current');
    });
    document.body.dataset.view = route.view;

    const root = clear(view());
    try {
      cleanup = FV.views[route.view](root, { id: match[1], query });
    } catch (err) {
      console.error(err);
      root.appendChild(FV.components.EmptyState('⚠️', 'Something went wrong', String(err.message || err),
        FV.util.h('a', { class: 'btn btn-primary', href: '#/' }, 'Go home')));
    }
    if (!(history.state && history.state.keepScroll)) window.scrollTo(0, 0);
  }

  /** Re-render the current view in place (keeps scroll position). */
  function refresh() {
    const y = window.scrollY;
    render();
    window.scrollTo(0, y);
  }

  function go(hash) {
    if (location.hash === hash) render();
    else location.hash = hash;
  }

  function applyTheme() {
    const theme = FV.storage.state.settings.theme;
    if (theme === 'light' || theme === 'dark') document.documentElement.dataset.theme = theme;
    else delete document.documentElement.dataset.theme;
  }

  function start() {
    applyTheme();
    document.querySelectorAll('[data-icon]').forEach((el) => {
      el.appendChild(FV.components.Icon(el.dataset.icon, { size: 22 }));
    });
    window.addEventListener('hashchange', render);
    render();
    FV.reminders.start();
    if ('serviceWorker' in navigator && /^https?:$/.test(location.protocol)) {
      navigator.serviceWorker.register('sw.js').catch((err) => console.warn('Service worker not registered', err));
    }
  }

  return { start, render, refresh, go, applyTheme };
})();

document.addEventListener('DOMContentLoaded', FV.app.start);
