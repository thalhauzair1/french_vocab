/* Builds drill questions from vocabulary items and checks typed answers. */
FV.questions = (() => {
  const { normalize, stripAccents, levenshtein, shuffle, pick } = FV.util;

  const MODES = {
    flash: { label: 'Flashcards', icon: '🃏', desc: 'See French, tap to reveal the meaning' },
    'flash-en': { label: 'Reverse Flashcards', icon: '🔁', desc: 'See English, recall the French' },
    'fr-en': { label: 'French → English', icon: '🇫🇷', desc: 'See French, give the meaning' },
    'en-fr': { label: 'English → French', icon: '✍️', desc: 'See English, type the French' },
    'listen-fr': { label: 'Listening → French', icon: '👂', desc: 'Hear it, type what you heard' },
    'listen-meaning': { label: 'Listening → Meaning', icon: '🎧', desc: 'Hear it, choose the meaning' },
    mc: { label: 'Multiple Choice', icon: '☑️', desc: 'Pick the right meaning from 4' },
    cloze: { label: 'Phrase Completion', icon: '🧩', desc: 'Fill the missing word in a sentence' },
    random: { label: 'Random Drill', icon: '🔀', desc: 'A mix of all question types' },
  };

  const STOPWORDS = new Set(['le', 'la', 'les', 'un', 'une', 'des', 'du', 'de', 'se', 'à', 'au', 'aux', 'en', 'et', 'il', 'ne', 'pas', 'ça', 'est']);
  const WORD_RE = /[A-Za-zÀ-ÖØ-öø-ÿœŒæÆ]+/g;

  const canListen = (item) => FV.audio.ttsSupported() || !!item.audioId;

  /* ---------- Phrase completion ---------- */
  function commonPrefix(a, b) {
    let i = 0;
    while (i < a.length && i < b.length && a[i] === b[i]) i++;
    return i;
  }

  /** Find the word in the example sentence that corresponds to the item (handles conjugation). */
  function clozeData(item) {
    const sentence = item.exampleFrench || '';
    if (!sentence) return null;
    const targets = (item.french.toLowerCase().match(WORD_RE) || []).filter((w) => w.length >= 3 && !STOPWORDS.has(w));
    if (!targets.length) return null;
    let best = null;
    let m;
    WORD_RE.lastIndex = 0;
    while ((m = WORD_RE.exec(sentence))) {
      const token = m[0];
      const lower = stripAccents(token.toLowerCase());
      if (lower.length < 3 || STOPWORDS.has(token.toLowerCase())) continue;
      for (const t of targets) {
        const tt = stripAccents(t);
        const needed = Math.max(3, Math.min(tt.length, Math.ceil(tt.length * 0.6)));
        const score = lower === tt ? 100 : commonPrefix(lower, tt);
        if ((lower === tt || score >= needed) && (!best || score > best.score)) {
          best = { token, index: m.index, score };
        }
      }
    }
    if (!best) return null;
    return {
      before: sentence.slice(0, best.index),
      after: sentence.slice(best.index + best.token.length),
      answer: best.token,
    };
  }

  function clozeDistractors(answer, pool) {
    const words = new Set();
    const ans = answer.toLowerCase();
    shuffle(pool).forEach((item) => {
      (item.exampleFrench || '').match(WORD_RE)?.forEach((w) => {
        const lw = w.toLowerCase();
        if (w.length >= 4 && lw !== ans && !STOPWORDS.has(lw)) words.add(lw);
      });
    });
    // Prefer distractors of similar length so the answer doesn't stand out.
    return shuffle([...words]).sort((a, b) => Math.abs(a.length - ans.length) - Math.abs(b.length - ans.length)).slice(0, 3);
  }

  /* ---------- Multiple-choice meanings ---------- */
  function meaningChoices(item, pool) {
    const seen = new Set([normalize(item.english)]);
    const candidates = shuffle(pool.filter((p) => p.id !== item.id));
    const sameCat = candidates.filter((p) => p.category === item.category);
    const sameType = candidates.filter((p) => p.type === item.type);
    const out = [];
    for (const p of [...sameCat, ...sameType, ...candidates]) {
      const key = normalize(p.english);
      if (seen.has(key)) continue;
      seen.add(key);
      out.push(p.english);
      if (out.length === 3) break;
    }
    return shuffle([item.english, ...out]);
  }

  /* ---------- Build ---------- */
  function build(item, mode, pool) {
    const distractorPool = pool.length >= 8 ? pool : pool.concat(FV.vocab.builtinList);
    let type = mode;
    if (mode === 'random') {
      const options = ['fr-en', 'en-fr', 'mc'];
      if (canListen(item)) options.push('listen-fr', 'listen-meaning');
      if (clozeData(item)) options.push('cloze');
      type = pick(options);
    }
    if ((type === 'listen-fr' || type === 'listen-meaning') && !canListen(item)) type = type === 'listen-fr' ? 'en-fr' : 'mc';

    const q = { item, type };
    switch (type) {
      case 'flash':
      case 'flash-en':
        break;
      case 'fr-en':
        q.prompt = item.french; q.ask = 'What does this mean?'; q.answer = item.english; q.input = 'text';
        q.choices = meaningChoices(item, distractorPool); // shown if the user asks for choices
        break;
      case 'en-fr':
        q.prompt = item.english; q.ask = 'Type the French'; q.answer = item.french; q.input = 'text'; q.lang = 'fr';
        break;
      case 'listen-fr':
        q.ask = 'Type what you hear'; q.answer = item.french; q.input = 'text'; q.lang = 'fr'; q.autoplay = true;
        break;
      case 'listen-meaning':
        q.ask = 'What does it mean?'; q.answer = item.english; q.input = 'choice'; q.autoplay = true;
        q.choices = meaningChoices(item, distractorPool);
        break;
      case 'mc':
        q.prompt = item.french; q.ask = 'Choose the meaning'; q.answer = item.english; q.input = 'choice';
        q.choices = meaningChoices(item, distractorPool);
        break;
      case 'cloze': {
        const c = clozeData(item);
        if (!c) return build(item, 'mc', pool);
        // Lowercase every choice so a capitalised sentence-initial answer doesn't give itself away.
        const answer = c.answer.toLowerCase();
        q.cloze = c; q.ask = 'Complete the sentence'; q.answer = answer; q.input = 'choice';
        q.choices = shuffle([answer, ...clozeDistractors(answer, distractorPool.concat(FV.vocab.builtinList))]);
        break;
      }
      default:
        throw new Error('Unknown question type ' + type);
    }
    return q;
  }

  /* ---------- Checking ---------- */
  const ARTICLE_RE = /^(le |la |les |l'|un |une |des |du |de la |de l')/;
  const EN_LEAD_RE = /^(to |the |a |an |some )/;

  function tolerance(len) {
    return len >= 10 ? 2 : len >= 5 ? 1 : 0;
  }

  function checkFrench(input, answer) {
    const a = normalize(answer).replace(/…/g, '').trim();
    const b = normalize(input);
    if (!b) return { status: 'wrong' };
    if (a === b) return { status: 'correct' };
    const a2 = stripAccents(a);
    const b2 = stripAccents(b);
    if (a2 === b2) return { status: 'close', note: 'Watch the accents!' };
    if (a2.replace(ARTICLE_RE, '') === b2 && a2 !== b2) {
      return { status: 'close', note: `Don't forget the article: ${answer}` };
    }
    if (levenshtein(a2, b2) <= tolerance(a2.length)) return { status: 'close', note: 'Small spelling mistake.' };
    return { status: 'wrong' };
  }

  function englishAlternatives(answer) {
    const noParens = answer.replace(/\([^)]*\)/g, ' ');
    const parts = noParens.split(/\/|;|,|\bor\b/).concat([noParens, answer]);
    return [...new Set(parts.map((p) => normalize(p).replace(EN_LEAD_RE, '').trim()).filter(Boolean))];
  }

  function checkEnglish(input, answer) {
    const b = normalize(input).replace(EN_LEAD_RE, '').trim();
    if (!b) return { status: 'wrong' };
    const alts = englishAlternatives(answer);
    if (alts.includes(b)) return { status: 'correct' };
    if (alts.some((a) => levenshtein(a, b) <= tolerance(a.length))) return { status: 'close', note: 'Small spelling mistake.' };
    return { status: 'wrong' };
  }

  function check(question, input) {
    if (question.input === 'choice') {
      return { status: input === question.answer ? 'correct' : 'wrong' };
    }
    return question.lang === 'fr' ? checkFrench(input, question.answer) : checkEnglish(input, question.answer);
  }

  return { MODES, build, check, clozeData, canListen };
})();
