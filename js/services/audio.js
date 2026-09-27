/*
 * Audio service. For a vocabulary item the order of preference is:
 *   1. the user's own recording (recorded or uploaded)
 *   2. a native-speaker recording (Lingua Libre, saved for offline use)
 *   3. the best French text-to-speech voice on the device
 * It never reads French with a non-French voice.
 */
FV.audio = (() => {
  const synth = window.speechSynthesis || null;
  let voices = [];            // French voices, best first
  let currentUtterance = null; // kept referenced: Chrome drops events for GC'd utterances
  let currentAudio = null;
  let keepAlive = null;
  let warnedNoVoice = false;
  let playToken = 0;           // bumped by every new playback; stale fallbacks check it and give up
  const listeners = new Set();

  // Apple's novelty voices sound terrible for learning.
  const NOVELTY = /albert|bad news|bahh|bells|boing|bubbles|cellos|deranged|good news|hysterical|jester|organ|superstar|trinoids|whisper|wobble|zarvox|grandma|grandpa|rocko|eddy|flo\b|reed|sandy|shelley/i;

  function describe(v) {
    const natural = /natural|neural/i.test(v.name);
    const google = /google/i.test(v.name);
    const premium = /premium|enhanced|siri/i.test(v.name);
    const online = v.localService === false || /online/i.test(v.name);
    const quality = natural ? 'Natural' : google ? 'High quality' : premium ? 'Enhanced' : 'Standard';
    const region = (v.lang.split(/[-_]/)[1] || '').toUpperCase();
    const shortName = v.name
      .replace(/^(Microsoft|Google|Apple)\s+/i, '')
      .replace(/\s*\(.*?\)\s*/g, ' ')
      .replace(/\s*-\s*(French|Français).*$/i, '')
      .replace(/\s*Online\s*/i, ' ')
      .trim() || v.name;
    return { natural, google, premium, online, quality, region, shortName };
  }

  function score(v) {
    const d = describe(v);
    let s = d.natural ? 50 : d.google ? 40 : d.premium ? 35 : 10;
    if (/^fr[-_]FR/i.test(v.lang)) s += 6;
    else if (/^fr[-_](CA|BE|CH)/i.test(v.lang)) s += 2;
    if (NOVELTY.test(v.name)) s -= 40;
    if (!d.online) s += 1;
    return s;
  }

  function loadVoices() {
    if (!synth) return;
    voices = synth.getVoices().filter((v) => /^fr\b|^fr[-_]/i.test(v.lang)).sort((a, b) => score(b) - score(a));
    listeners.forEach((fn) => fn(voices));
  }

  /** Resolves once the voice list has loaded (or after a short timeout — some browsers never fire the event). */
  const ready = new Promise((resolve) => {
    if (!synth) { resolve(); return; }
    loadVoices();
    if (voices.length) resolve();
    synth.addEventListener?.('voiceschanged', () => { loadVoices(); resolve(); });
    setTimeout(resolve, 1500);
  });

  const settings = () => FV.storage.state.settings;
  const rate = () => settings().audioRate || 1;
  const ttsSupported = () => !!synth;
  const frenchVoices = () => voices;
  const hasFrenchVoice = () => voices.length > 0;
  const onVoicesChanged = (fn) => { listeners.add(fn); return () => listeners.delete(fn); };

  /** The voice that will be used: the user's choice if usable, else the best available. */
  function chooseVoice() {
    if (!voices.length) return null;
    const offline = navigator.onLine === false;
    const usable = (v) => !(offline && describe(v).online);
    const preferred = voices.find((v) => v.voiceURI === settings().voiceURI);
    if (preferred && usable(preferred)) return preferred;
    return voices.find(usable) || null;
  }

  /** Stop whatever is playing (and cancel any playback that is still loading). */
  function stopAll() {
    playToken++;
    stop();
  }

  function stop() {
    clearInterval(keepAlive);
    if (synth && (synth.speaking || synth.pending)) synth.cancel();
    if (currentAudio) {
      currentAudio.pause();
      currentAudio = null;
    }
  }

  function noVoiceNotice() {
    if (warnedNoVoice) return;
    warnedNoVoice = true;
    FV.util.toast('No French voice on this device — see Settings → Audio');
  }

  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

  /** Speak French text with a French TTS voice. Resolves true if something was spoken. */
  async function speak(text, opts = {}) {
    const token = opts.token || ++playToken;
    if (!synth) {
      FV.util.toast('Text-to-speech is not supported in this browser');
      return false;
    }
    await ready;
    if (token !== playToken) return false;
    const wasBusy = synth.speaking || synth.pending || currentAudio;
    stop();
    if (wasBusy) await sleep(60); // Chrome can silently drop speech queued right after cancel()
    if (token !== playToken) return false;
    const voice = opts.voice || chooseVoice();
    if (!voice) { noVoiceNotice(); return false; }

    return new Promise((resolve) => {
      const u = new SpeechSynthesisUtterance(text);
      u.voice = voice;
      u.lang = voice.lang;
      u.rate = opts.speed || rate();
      currentUtterance = u;
      let settled = false;
      const done = (ok) => {
        if (settled) return;
        settled = true;
        clearInterval(keepAlive);
        resolve(ok);
      };
      u.onend = () => done(true);
      u.onerror = (e) => {
        // An online voice fails without a connection: retry once with a local French voice.
        if (!opts.retried && !['interrupted', 'canceled'].includes(e.error) && describe(voice).online) {
          const local = voices.find((v) => !describe(v).online);
          if (local) {
            settled = true;
            clearInterval(keepAlive);
            speak(text, { ...opts, voice: local, retried: true, token }).then(resolve);
            return;
          }
        }
        done(false);
      };
      synth.speak(u);
      // Chrome's Google voices stop after ~15 s unless nudged.
      if (describe(voice).google && text.length > 120) {
        keepAlive = setInterval(() => {
          if (!synth.speaking) { clearInterval(keepAlive); return; }
          synth.pause();
          synth.resume();
        }, 10000);
      }
    });
  }

  /** Play an audio Blob or URL. Resolves 'ended', 'interrupted' or 'error'. */
  function playSource(source, speed = rate(), token = ++playToken) {
    if (token !== playToken) return Promise.resolve('interrupted');
    stop();
    return new Promise((resolve) => {
      const isBlob = source instanceof Blob;
      const url = isBlob ? URL.createObjectURL(source) : source;
      const audio = new Audio(url);
      audio.playbackRate = speed;
      audio.preservesPitch = true;
      currentAudio = audio;
      let settled = false;
      const done = (result) => {
        if (settled) return;
        settled = true;
        if (isBlob) URL.revokeObjectURL(url);
        if (currentAudio === audio) currentAudio = null;
        resolve(result);
      };
      audio.onended = () => done('ended');
      audio.onerror = () => done('error');
      audio.onpause = () => { if (!audio.ended) done('interrupted'); };
      audio.play().catch((err) => done(err && err.name === 'AbortError' ? 'interrupted' : 'error'));
    });
  }

  /** Where this item's audio will come from (for display). */
  function sourceInfo(item) {
    if (item.audioId) return { kind: 'user', label: 'Your recording' };
    if (settings().audioSource !== 'tts') {
      const native = FV.nativeAudio.info(item.french);
      if (native) return { kind: 'native', label: `Native speaker · ${native.speaker}`, native };
    }
    const voice = chooseVoice();
    if (voice) {
      const d = describe(voice);
      return { kind: 'tts', label: `Text-to-speech · ${d.shortName}${d.quality !== 'Standard' ? ` (${d.quality})` : ''}` };
    }
    return { kind: 'none', label: 'No French voice available' };
  }

  /** Play a vocabulary item using the best available source. */
  async function playItem(item, opts = {}) {
    const token = ++playToken;
    const stale = () => token !== playToken;
    const speed = opts.speed || rate();
    // A source "worked" unless it errored; an interruption means the user started something else.
    const tryBlob = async (blob) => blob && (await playSource(blob, speed, token)) !== 'error';

    if (item.audioId) {
      const blob = await FV.audioStore.get(item.audioId).catch(() => null);
      if (stale()) return false;
      if (await tryBlob(blob)) return true;
    }
    const s = settings();
    if (s.audioSource !== 'tts') {
      const blob = await FV.nativeAudio.getCached(item.french);
      if (stale()) return false;
      if (await tryBlob(blob)) return true;

      if (s.autoNative && navigator.onLine !== false && FV.nativeAudio.shouldLookup(item.french)) {
        await ready;
        if (chooseVoice()) {
          // Speak now, fetch a native recording in the background for next time.
          FV.nativeAudio.fetchBest(item.french).catch(() => {});
        } else {
          const fetched = await FV.nativeAudio.fetchBest(item.french).catch(() => null);
          if (stale()) return false;
          if (await tryBlob(fetched)) return true;
        }
      }
    }
    if (stale()) return false;
    return speak(item.french, { speed, token });
  }

  return {
    ready, speak, playItem, playSource, stop: stopAll, sourceInfo,
    ttsSupported, hasFrenchVoice, frenchVoices, chooseVoice, describe, onVoicesChanged,
  };
})();
