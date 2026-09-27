/* Microphone recording (MediaRecorder). Used to record your own pronunciation. */
FV.recorder = (() => {
  const MAX_MS = 15000;

  const supported = () => !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia && window.MediaRecorder);

  function pickType() {
    const types = ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4', 'audio/ogg;codecs=opus'];
    return types.find((t) => MediaRecorder.isTypeSupported && MediaRecorder.isTypeSupported(t)) || '';
  }

  /**
   * Start recording. Returns { stop(): Promise<Blob>, cancel() }.
   * Recording stops by itself after 15 seconds; stop() still returns the audio.
   */
  async function start() {
    const stream = await navigator.mediaDevices.getUserMedia({
      audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
    });
    const type = pickType();
    const rec = new MediaRecorder(stream, type ? { mimeType: type } : undefined);
    const chunks = [];
    rec.ondataavailable = (e) => { if (e.data && e.data.size) chunks.push(e.data); };
    const finished = new Promise((resolve) => {
      rec.onstop = () => {
        stream.getTracks().forEach((t) => t.stop());
        resolve(new Blob(chunks, { type: rec.mimeType || type || 'audio/webm' }));
      };
    });
    rec.start();
    const timer = setTimeout(() => { if (rec.state === 'recording') rec.stop(); }, MAX_MS);
    return {
      stop() {
        clearTimeout(timer);
        if (rec.state !== 'inactive') rec.stop();
        return finished;
      },
      cancel() {
        clearTimeout(timer);
        if (rec.state !== 'inactive') rec.stop();
      },
    };
  }

  return { supported, start, MAX_MS };
})();
