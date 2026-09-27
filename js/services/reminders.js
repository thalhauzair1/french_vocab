/*
 * Local revision reminders using the browser Notification API.
 * Checks once a minute while the app is open (or installed and running in the background).
 */
FV.reminders = (() => {
  const PRESETS = { morning: '08:00', afternoon: '14:00', evening: '19:00' };
  const MESSAGE = '🇫🇷 Time for your French revision!';
  let timer = null;

  const settings = () => FV.storage.state.settings.reminders;
  const supported = () => 'Notification' in window;

  function reminderTime() {
    const r = settings();
    return r.preset === 'custom' ? r.time : PRESETS[r.preset] || PRESETS.evening;
  }

  async function requestPermission() {
    if (!supported()) return 'unsupported';
    if (Notification.permission === 'granted') return 'granted';
    return Notification.requestPermission();
  }

  async function notify() {
    const due = FV.stats.summary().dueToday;
    const body = due ? `${due} item${due === 1 ? '' : 's'} waiting for review.` : 'Keep your streak going.';
    FV.util.toast(MESSAGE);
    if (!supported() || Notification.permission !== 'granted') return;
    try {
      const reg = navigator.serviceWorker && (await navigator.serviceWorker.getRegistration());
      if (reg) reg.showNotification(MESSAGE, { body, icon: 'icons/icon.svg', tag: 'fvr-reminder' });
      else new Notification(MESSAGE, { body, icon: 'icons/icon.svg', tag: 'fvr-reminder' });
    } catch (err) {
      console.warn('Notification failed', err);
    }
  }

  function check() {
    const r = settings();
    if (!r.enabled) return;
    const now = new Date();
    const today = FV.util.dayKey(now);
    const meta = FV.storage.state.meta;
    if (meta.lastReminderDate === today) return;
    const [hh, mm] = reminderTime().split(':').map(Number);
    const at = new Date(now);
    at.setHours(hh, mm, 0, 0);
    if (now < at) return;
    meta.lastReminderDate = today;
    FV.storage.save();
    if (!FV.stats.streaks().reviewedToday) notify();
  }

  function start() {
    clearInterval(timer);
    timer = setInterval(check, 60 * 1000);
    check();
  }

  return { PRESETS, reminderTime, requestPermission, supported, start, check, notify };
})();
