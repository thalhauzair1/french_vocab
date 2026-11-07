/* Shared helpers: DOM building, dates, text normalisation, toasts and modals. */
window.FV = window.FV || {};

FV.util = (() => {
  /** Tiny element builder: h('div', {class: 'x', onclick: fn}, child, 'text') */
  function h(tag, props, ...children) {
    const el = document.createElement(tag);
    if (props) {
      for (const [key, value] of Object.entries(props)) {
        if (value === null || value === undefined || value === false) continue;
        if (key.startsWith('on') && typeof value === 'function') {
          el.addEventListener(key.slice(2).toLowerCase(), value);
        } else if (key === 'class') {
          el.className = value;
        } else if (key === 'html') {
          el.innerHTML = value;
        } else if (key === 'style' && typeof value === 'object') {
          Object.assign(el.style, value);
        } else if (key === 'dataset') {
          Object.assign(el.dataset, value);
        } else if (value === true) {
          el.setAttribute(key, '');
        } else {
          el.setAttribute(key, value);
        }
      }
    }
    appendChildren(el, children);
    return el;
  }

  function appendChildren(el, children) {
    for (const child of children.flat(Infinity)) {
      if (child === null || child === undefined || child === false) continue;
      el.appendChild(child instanceof Node ? child : document.createTextNode(String(child)));
    }
  }

  function clear(el) {
    while (el.firstChild) el.removeChild(el.firstChild);
    return el;
  }

  function uid(prefix = 'u') {
    return prefix + '-' + Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
  }

  function slug(text) {
    return String(text)
      .normalize('NFD').replace(/[̀-ͯ]/g, '')
      .toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  }

  /* ---------- Dates ---------- */
  const DAY = 24 * 60 * 60 * 1000;

  function startOfDay(date = new Date()) {
    const d = new Date(date);
    d.setHours(0, 0, 0, 0);
    return d;
  }

  function endOfDay(date = new Date()) {
    const d = new Date(date);
    d.setHours(23, 59, 59, 999);
    return d;
  }

  function addDays(date, days) {
    const d = new Date(date);
    d.setDate(d.getDate() + days);
    return d;
  }

  /** Local-date key like 2026-09-27 */
  function dayKey(date = new Date()) {
    const d = new Date(date);
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${d.getFullYear()}-${m}-${day}`;
  }

  function formatDate(iso) {
    if (!iso) return '—';
    return new Date(iso).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });
  }

  function relativeDue(iso) {
    if (!iso) return 'New';
    const due = new Date(iso);
    const now = new Date();
    if (due <= now) return 'Due now';
    const days = Math.round((startOfDay(due) - startOfDay(now)) / DAY);
    if (days === 0) {
      const mins = Math.max(1, Math.round((due - now) / 60000));
      return mins < 60 ? `in ${mins} min` : `in ${Math.round(mins / 60)} h`;
    }
    if (days === 1) return 'Tomorrow';
    return `in ${days} days`;
  }

  /* ---------- Text ---------- */
  function stripAccents(text) {
    return String(text).normalize('NFD').replace(/[̀-ͯ]/g, '');
  }

  /** Lowercase, unify apostrophes, drop punctuation, collapse whitespace. */
  function normalize(text) {
    return String(text || '')
      .toLowerCase()
      .replace(/[’‘`´]/g, "'")
      .replace(/œ/g, 'oe').replace(/æ/g, 'ae')
      .replace(/[.,!?;:«»"“”()\[\]…—–]/g, ' ')
      .replace(/-/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  function levenshtein(a, b) {
    if (a === b) return 0;
    if (!a.length) return b.length;
    if (!b.length) return a.length;
    let prev = Array.from({ length: b.length + 1 }, (_, i) => i);
    for (let i = 1; i <= a.length; i++) {
      const cur = [i];
      for (let j = 1; j <= b.length; j++) {
        cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
      }
      prev = cur;
    }
    return prev[b.length];
  }

  /* ---------- Arrays ---------- */
  function shuffle(list) {
    const arr = list.slice();
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  }

  function pick(list) {
    return list[Math.floor(Math.random() * list.length)];
  }

  function debounce(fn, wait = 150) {
    let t;
    return (...args) => {
      clearTimeout(t);
      t = setTimeout(() => fn(...args), wait);
    };
  }

  /* ---------- Toast & modal ---------- */
  let toastTimer;
  function toast(message) {
    let el = document.getElementById('toast');
    if (!el) {
      el = h('div', { id: 'toast', class: 'toast', role: 'status', 'aria-live': 'polite' });
      document.body.appendChild(el);
    }
    el.textContent = message;
    el.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => el.classList.remove('show'), 2200);
  }

  /** In-page confirmation dialog. Resolves true/false. */
  function confirmDialog({ title, message, body = null, confirmLabel = 'Confirm', cancelLabel = 'Cancel', danger = false }) {
    return new Promise((resolve) => {
      const close = (result) => {
        overlay.remove();
        document.removeEventListener('keydown', onKey);
        resolve(result);
      };
      const onKey = (e) => { if (e.key === 'Escape') close(false); };
      const overlay = h('div', { class: 'modal-overlay', onclick: (e) => { if (e.target === overlay) close(false); } },
        h('div', { class: 'modal', role: 'dialog', 'aria-modal': 'true', 'aria-label': title },
          h('h2', null, title),
          message ? h('p', { class: 'muted' }, message) : null,
          body,
          h('div', { class: 'modal-actions' },
            cancelLabel ? h('button', { class: 'btn btn-ghost', onclick: () => close(false) }, cancelLabel) : null,
            h('button', { class: 'btn ' + (danger ? 'btn-danger' : 'btn-primary'), onclick: () => close(true) }, confirmLabel)
          )
        )
      );
      document.addEventListener('keydown', onKey);
      document.body.appendChild(overlay);
      overlay.querySelector('.modal-actions .btn:last-child').focus();
    });
  }

  function download(filename, content, mime) {
    const blob = new Blob([content], { type: mime });
    const url = URL.createObjectURL(blob);
    const a = h('a', { href: url, download: filename });
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  return {
    h, clear, uid, slug, DAY, startOfDay, endOfDay, addDays, dayKey, formatDate, relativeDue,
    stripAccents, normalize, levenshtein, shuffle, pick, debounce, toast, confirmDialog, download,
  };
})();
