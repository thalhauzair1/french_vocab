# Mots — French Vocabulary Revision

A simple, offline-first app for this loop: **add → listen → practice → review → remember**.
It has no AI features, needs no accounts and has no dependencies.

## Run it

- **Quickest:** double-click `index.html`. Everything works from disk.
- **To install it as an app with offline caching:** double-click `start-server.bat`, which needs Python. It opens http://localhost:8080. From there, use your browser's "Install app" option.

All data is kept in your browser's local storage on this device. Use **Settings → Import / Export** to back it up.

## Pronunciation

Each word plays the first source available, in this order:

1. **Your own recording.** Record it with your microphone on the word's page, or upload an audio file.
2. **A native speaker's recording** from [Lingua Libre](https://lingualibre.org) (Wikimedia Commons, free licences). The app downloads one the first time you play a word while online and keeps it for offline use. You can also download recordings for all your words at once in **Settings → Audio**, or pick a different speaker with **Find native recordings** on the word's page.
3. **Your device's French text-to-speech voice.** The best one is chosen automatically, and you can change it in Settings. The app never reads French with an English voice.

For the best text-to-speech, install a French voice (Windows: Settings → Time & language → Speech → Add voices → Français), or use Microsoft Edge, which has natural-sounding French voices.

Each word's page also has **Practice speaking**: record yourself, then compare with the model pronunciation. These recordings are never saved or uploaded.

## Project layout

| Path | Responsibility |
|---|---|
| `js/core/` | Helpers (`util`), local storage (`storage`), IndexedDB for recordings (`audio-store`) |
| `js/data/` | Built-in vocabulary (A1–B1, 34 categories, 425 items) and 21 grammar cards |
| `js/models/vocab.js` | Vocabulary data model, CRUD, built-in index, search, recording reviews |
| `js/services/srs.js` | **Spaced-repetition algorithm.** Pure functions you can swap out without touching the UI |
| `js/services/` | Audio (voice choice and fallbacks), native recordings (`native-audio`), microphone (`recorder`), question building and answer checking, stats and streaks, sessions, reminders, CSV/JSON import and export |
| `js/ui/components.js` | Reusable components: VocabularyCard, Flashcard, AudioButton, ReviewQuestion, AnswerOption, GrammarCard, CategoryCard, ProgressCard |
| `js/views/` | Screens: Home, Vocabulary, Practice and Session, Grammar, Progress, Settings |

## Review intervals

Again → 10 min · Hard → 1 day · Good → 3 days · Easy → 7 days. After that, each successful review multiplies the interval (Hard ×1.2, Good ×2.5, Easy ×4, capped at 1 year). A word counts as *mastered* once its interval reaches 21 days or more.

## CSV format

```
French,English,Example French,Example English,Category,Level,Type
```
