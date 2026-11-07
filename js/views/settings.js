/* Settings: review size, audio, reminders, theme, import/export, reset. */
FV.views = FV.views || {};

FV.views.settings = (root) => {
  const { h, clear, download, toast, confirmDialog, dayKey } = FV.util;
  const settings = FV.storage.state.settings;
  const save = () => FV.storage.save();

  const section = (title, ...children) => FV.components.Section(title, h('div', { class: 'card settings-section' }, ...children));
  const row = (label, control, hint) => h('div', { class: 'setting-row' },
    h('div', null, h('div', { class: 'setting-label' }, label), hint ? h('div', { class: 'muted small-print' }, hint) : null),
    control);

  function segmented(options, value, onChange, label) {
    const seg = h('div', { class: 'segmented small', role: 'radiogroup', 'aria-label': label },
      options.map(([val, text]) => h('button', {
        type: 'button', role: 'radio', class: 'seg' + (String(val) === String(value) ? ' active' : ''),
        'aria-checked': String(String(val) === String(value)),
        onclick: (e) => {
          seg.querySelectorAll('.seg').forEach((b) => { b.classList.remove('active'); b.setAttribute('aria-checked', 'false'); });
          e.currentTarget.classList.add('active');
          e.currentTarget.setAttribute('aria-checked', 'true');
          onChange(val);
        },
      }, text)));
    return seg;
  }

  function select(options, value, onChange, label) {
    return h('select', { class: 'select compact', 'aria-label': label, onchange: (e) => onChange(e.target.value) },
      options.map(([val, text]) => h('option', { value: val, selected: String(val) === String(value) }, text)));
  }

  root.appendChild(FV.components.PageHead('Settings', { sub: 'Everything is stored on this device.' }));

  /* Review */
  root.appendChild(section('Review',
    row('Default review size', select([[10, '10'], [20, '20'], [30, '30'], ['all', 'All due']], settings.reviewSize,
      (v) => { settings.reviewSize = v === 'all' ? 'all' : Number(v); save(); }, 'Default review size')),
    row('New words per day', select([[5, '5'], [10, '10'], [20, '20'], [50, '50']], settings.newPerDay,
      (v) => { settings.newPerDay = Number(v); save(); }, 'New words per day'), 'Never-reviewed words added to each day’s review'),
    row('Review question type', select(Object.entries(FV.questions.MODES).map(([k, m]) => [k, m.label]), settings.reviewMode || 'random',
      (v) => { settings.reviewMode = v; save(); }, 'Review question type'), 'Used by “Start Review” on the Home screen')));

  /* Audio */
  const SAMPLE = 'Bonjour ! Je me débrouille bien en français.';
  const switchInput = (checked, onChange, label) => h('input', {
    type: 'checkbox', class: 'switch', checked, 'aria-label': label,
    onchange: (e) => onChange(e.target.checked),
  });


  const voiceSelect = h('select', {
    class: 'select compact voice-select', 'aria-label': 'French voice',
    onchange: (e) => { settings.voiceURI = e.target.value; save(); renderVoiceHelp(); FV.audio.speak(SAMPLE); },
  });
  const voiceHelp = h('div', { class: 'voice-help' });

  function fillVoices() {
    clear(voiceSelect);
    const voices = FV.audio.frenchVoices();
    voiceSelect.appendChild(h('option', { value: '' }, voices.length ? 'Automatic (best available)' : 'No French voice found'));
    voices.forEach((v) => {
      const d = FV.audio.describe(v);
      voiceSelect.appendChild(h('option', { value: v.voiceURI, selected: v.voiceURI === settings.voiceURI },
        `${d.shortName} · ${d.region || 'FR'} · ${d.quality}${d.online ? ' · online' : ''}`));
    });
    voiceSelect.disabled = !voices.length;
    renderVoiceHelp();
  }

  function renderVoiceHelp() {
    clear(voiceHelp);
    if (!FV.audio.ttsSupported()) {
      voiceHelp.appendChild(h('div', { class: 'notice warn' }, 'This browser has no text-to-speech. Native recordings and your own recordings still work.'));
      return;
    }
    const voices = FV.audio.frenchVoices();
    const best = FV.audio.chooseVoice();
    if (!voices.length) {
      voiceHelp.appendChild(h('div', { class: 'notice warn' },
        h('strong', null, 'No French voice is installed on this device. '),
        'Words with a native recording still play; everything else stays silent rather than being read with an English accent.',
        FV.components.VoiceSetupSteps()));
    } else if (!voices.some((v) => FV.audio.describe(v).quality !== 'Standard')) {
      const desktopNotEdge = !/Edg\//.test(navigator.userAgent) && ['windows', 'mac'].includes(FV.audio.device());
      voiceHelp.appendChild(h('div', { class: 'notice' },
        'Your French voice is standard quality. For more natural speech, download a better one:',
        FV.components.VoiceSetupSteps(),
        desktopNotEdge ? h('p', { class: 'small-print' }, 'Or use Microsoft Edge, which has very natural French voices when online.') : null));
    } else if (best) {
      const d = FV.audio.describe(best);
      voiceHelp.appendChild(h('div', { class: 'notice ok' }, `✓ Using ${d.shortName} (${d.quality}${d.online ? ', needs internet — a local voice is used offline' : ''})`));
    }
  }

  // Native recordings: bulk download for My Vocabulary
  const nativeStatus = h('div', { class: 'muted small-print' });
  const bar = h('span');
  const meter = h('div', { class: 'meter bulk-meter' }, bar);
  meter.hidden = true;
  let running = false;
  let cancelled = false;
  const pending = () => FV.vocab.mine().filter((v) => !v.audioId && FV.nativeAudio.shouldLookup(v.french)).length;
  const bulkBtn = h('button', { class: 'btn btn-secondary btn-sm' });
  const updateNative = () => {
    const n = pending();
    if (!running) {
      bulkBtn.textContent = n ? `⬇ Download for My Vocabulary (${n})` : '✓ All words checked';
      bulkBtn.disabled = !n;
    }
    const saved = FV.nativeAudio.savedCount();
    if (!running) nativeStatus.textContent = `${saved} native recording${saved === 1 ? '' : 's'} saved on this device for offline use.`;
  };
  bulkBtn.addEventListener('click', async () => {
    if (running) { cancelled = true; bulkBtn.textContent = 'Stopping…'; return; }
    if (navigator.onLine === false) { toast('Connect to the internet first'); return; }
    running = true;
    cancelled = false;
    meter.hidden = false;
    bulkBtn.textContent = '■ Stop';
    const words = FV.vocab.mine().filter((v) => !v.audioId).map((v) => v.french);
    const stats = await FV.nativeAudio.bulk(words, {
      isCancelled: () => cancelled,
      onProgress: (st) => {
        bar.style.width = `${st.total ? (st.done / st.total) * 100 : 100}%`;
        nativeStatus.textContent = `${st.done} / ${st.total} checked · ${st.found} found · ${st.missing} not available` +
          (st.failed ? ` · ${st.failed} failed (Wikimedia busy — run again later)` : '');
      },
    });
    running = false;
    meter.hidden = true;
    toast(`${stats.found} native recording${stats.found === 1 ? '' : 's'} downloaded`);
    updateNative();
    nativeStatus.textContent += ` Last run: ${stats.found} found, ${stats.missing} not available${stats.failed ? `, ${stats.failed} failed` : ''}.`;
  });
  updateNative();

  root.appendChild(section('Audio',
    h('p', { class: 'muted small-print' },
      'Words play your own recording first, then a native speaker’s recording, then your device’s French voice.'),
    row('Native-speaker recordings', segmented([['native', 'Use when available'], ['tts', 'Off']], settings.audioSource,
      (v) => { settings.audioSource = v; save(); }, 'Native recordings'),
    'Real people from Lingua Libre (Wikimedia Commons, CC BY-SA)'),
    row('Auto-download while online', switchInput(settings.autoNative, (v) => { settings.autoNative = v; save(); }, 'Auto-download native recordings'),
      'Looks up a native recording the first time you play a word'),
    h('div', { class: 'setting-block' },
      h('div', { class: 'btn-row' }, bulkBtn,
        h('button', {
          class: 'btn btn-ghost btn-sm',
          onclick: async () => {
            const ok = await confirmDialog({ title: 'Delete downloaded recordings?', message: 'They can be downloaded again later.', confirmLabel: 'Delete', danger: true });
            if (!ok) return;
            await FV.nativeAudio.clearAll();
            updateNative();
            toast('Native recordings deleted');
          },
        }, 'Delete downloads')),
      meter, nativeStatus),
    row('Text-to-speech voice', voiceSelect),
    voiceHelp,
    row('Playback speed', segmented([[0.75, '0.75×'], [1, '1×'], [1.25, '1.25×']], settings.audioRate,
      (v) => { settings.audioRate = v; save(); FV.audio.speak(SAMPLE); }, 'Playback speed')),
    row('Auto-play pronunciation', switchInput(settings.autoplay, (v) => { settings.autoplay = v; save(); }, 'Auto-play pronunciation'),
      'Play the word when a flashcard or answer is shown'),
    row('Test', h('div', { class: 'btn-row tight' },
      h('button', { class: 'btn btn-secondary btn-sm', onclick: () => FV.audio.speak(SAMPLE) }, '▶ Voice'),
      h('button', { class: 'btn btn-secondary btn-sm', onclick: () => FV.audio.playItem({ french: 'bonjour' }) }, '▶ “bonjour”')))));

  fillVoices();
  const offVoices = FV.audio.onVoicesChanged(fillVoices);

  /* Reminders */
  const r = settings.reminders;
  const permission = FV.reminders.supported() ? Notification.permission : 'unsupported';
  const timeInput = h('input', {
    type: 'time', class: 'input compact', value: r.time, 'aria-label': 'Custom reminder time',
    onchange: (e) => { r.time = e.target.value || '19:00'; FV.storage.state.meta.lastReminderDate = null; save(); },
  });
  timeInput.hidden = r.preset !== 'custom';
  const reminderBody = h('div', null,
    row('Time', segmented([['morning', 'Morning'], ['afternoon', 'Afternoon'], ['evening', 'Evening'], ['custom', 'Custom']], r.preset,
      (v) => {
        r.preset = v;
        timeInput.hidden = v !== 'custom';
        FV.storage.state.meta.lastReminderDate = null;
        save();
      }, 'Reminder time')),
    h('div', { class: 'setting-row end' }, timeInput),
    h('p', { class: 'muted small-print' },
      'Morning 08:00 · Afternoon 14:00 · Evening 19:00. Reminders appear only if you haven’t reviewed that day. ',
      'Browsers can only show them while the app is open (or installed and running in the background).'),
    row('Test', h('button', { class: 'btn btn-secondary btn-sm', onclick: () => FV.reminders.notify() }, 'Send test')));
  reminderBody.hidden = !r.enabled;

  const toggle = h('input', {
    type: 'checkbox', class: 'switch', checked: r.enabled, 'aria-label': 'Enable reminders',
    onchange: async (e) => {
      r.enabled = e.target.checked;
      save();
      reminderBody.hidden = !r.enabled;
      if (r.enabled) {
        const result = await FV.reminders.requestPermission();
        if (result === 'denied') toast('Notifications are blocked — in-app reminders only');
        if (result === 'unsupported') toast('Notifications not supported — in-app reminders only');
        FV.reminders.check();
      }
    },
  });
  root.appendChild(section('Reminders',
    row('Daily revision reminder', toggle, permission === 'denied' ? 'Notifications are blocked in your browser settings' : null),
    reminderBody));

  /* Appearance */
  root.appendChild(section('Appearance',
    row('Theme', segmented([['system', 'System'], ['light', 'Light'], ['dark', 'Dark']], settings.theme,
      (v) => { settings.theme = v; save(); FV.app.applyTheme(); }, 'Theme'))));

  /* Data */
  const csvInput = h('input', {
    type: 'file', accept: '.csv,text/csv', hidden: true,
    onchange: async (e) => {
      const file = e.target.files[0];
      if (!file) return;
      try {
        const { added, skipped } = FV.io.importCSV(await file.text());
        toast(`Imported ${added} word${added === 1 ? '' : 's'}${skipped ? ` · ${skipped} skipped` : ''}`);
      } catch (err) {
        toast('Could not read that CSV file');
      }
      e.target.value = '';
    },
  });
  const backupInput = h('input', {
    type: 'file', accept: '.json,application/json', hidden: true,
    onchange: async (e) => {
      const file = e.target.files[0];
      if (!file) return;
      const ok = await confirmDialog({
        title: 'Restore backup?', message: 'This replaces ALL current vocabulary, progress and settings with the backup.',
        confirmLabel: 'Restore', danger: true,
      });
      if (ok) {
        try {
          const n = FV.io.importBackup(await file.text());
          FV.app.applyTheme();
          toast(`Restored ${n} words`);
          FV.app.refresh();
        } catch (err) {
          toast('That file is not a valid backup');
        }
      }
      e.target.value = '';
    },
  });

  root.appendChild(section('Import / Export',
    h('p', { class: 'muted small-print' }, 'CSV columns: French, English, Example French, Example English, Category, Level, Type'),
    csvInput, backupInput,
    h('div', { class: 'btn-grid' },
      h('button', {
        class: 'btn btn-secondary',
        onclick: () => {
          if (!FV.vocab.mine().length) { toast('No vocabulary to export yet'); return; }
          download(`french-vocabulary-${dayKey()}.csv`, FV.io.exportCSV(), 'text/csv;charset=utf-8');
        },
      }, '⬇ Export vocabulary (CSV)'),
      h('button', { class: 'btn btn-secondary', onclick: () => csvInput.click() }, '⬆ Import vocabulary (CSV)'),
      h('button', {
        class: 'btn btn-secondary',
        onclick: () => download(`french-revision-backup-${dayKey()}.json`, FV.io.exportBackup(), 'application/json'),
      }, '⬇ Full backup (JSON)'),
      h('button', { class: 'btn btn-secondary', onclick: () => backupInput.click() }, '⬆ Restore backup')),
    h('p', { class: 'muted small-print' }, 'The full backup also includes review history, streaks and settings. Attached audio recordings are not included.')));

  /* Danger zone */
  root.appendChild(section('Danger zone',
    row('Reset progress', h('button', {
      class: 'btn btn-danger btn-sm',
      onclick: async () => {
        const ok = await confirmDialog({
          title: 'Reset all progress?', message: 'Your words are kept, but review history, schedules and streaks are cleared. This cannot be undone.',
          confirmLabel: 'Reset progress', danger: true,
        });
        if (ok) { FV.storage.resetProgress(); toast('Progress reset'); }
      },
    }, 'Reset'), 'Keeps your words'),
    row('Delete everything', h('button', {
      class: 'btn btn-danger btn-sm',
      onclick: async () => {
        const ok = await confirmDialog({
          title: 'Delete all data?', message: 'All vocabulary, progress and settings will be permanently removed. Consider exporting a backup first.',
          confirmLabel: 'Delete everything', danger: true,
        });
        if (ok) {
          FV.storage.replace(FV.storage.defaults());
          FV.audioStore.clear().catch(() => {});
          FV.app.applyTheme();
          toast('All data deleted');
          FV.app.go('#/');
        }
      },
    }, 'Delete'), 'Words, progress and settings')));

  root.appendChild(h('p', { class: 'muted center small-print about' },
    'French Vocabulary Revision · works offline · your data stays on this device.'));

  return offVoices;
};
