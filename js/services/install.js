/*
 * "Install app" support.
 * - Chrome / Edge / Android: the browser fires `beforeinstallprompt`; we keep it and
 *   show it when the user taps Install.
 * - iPhone / iPad: there is no install event, so we show "Share → Add to Home Screen" steps.
 */
FV.install = (() => {
  let deferred = null;
  const listeners = new Set();
  const notify = () => listeners.forEach((fn) => fn(mode()));

  // Registered as early as possible: the event can fire before the app has rendered.
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferred = e;
    notify();
  });
  window.addEventListener('appinstalled', () => {
    deferred = null;
    FV.util.toast('Mots is installed. Open it from your home screen');
    notify();
  });

  function isStandalone() {
    return window.matchMedia('(display-mode: standalone)').matches || navigator.standalone === true;
  }

  /**
   * 'installed' – already running as an installed app
   * 'prompt'    – the browser can show its own install dialog
   * 'ios'       – iPhone/iPad: show Add to Home Screen steps
   * 'none'      – this browser can't install (or needs its own menu)
   */
  function mode() {
    if (isStandalone()) return 'installed';
    if (deferred) return 'prompt';
    if (FV.audio.device() === 'ios') return 'ios';
    return 'none';
  }

  /** Show the browser's install dialog. Resolves true if the user accepted. */
  async function prompt() {
    if (!deferred) return false;
    const event = deferred;
    deferred = null; // the event can only be used once
    event.prompt();
    const { outcome } = await event.userChoice.catch(() => ({ outcome: 'dismissed' }));
    notify();
    return outcome === 'accepted';
  }

  const DISMISS_DAYS = 30;
  function dismissed() {
    const at = FV.storage.state.meta.installDismissedAt;
    return !!at && Date.now() - new Date(at).getTime() < DISMISS_DAYS * FV.util.DAY;
  }
  function dismiss() {
    FV.storage.state.meta.installDismissedAt = new Date().toISOString();
    FV.storage.save();
    notify();
  }

  const onChange = (fn) => { listeners.add(fn); return () => listeners.delete(fn); };

  return { mode, prompt, dismissed, dismiss, onChange, isStandalone };
})();
