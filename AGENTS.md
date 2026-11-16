# Notes for agents

This project has one source of truth for how to work on it: **[`CLAUDE.md`](CLAUDE.md)**. Read it first.

Short version:
- `home/native-home.js` is the launcher — **ES5 only**, Vue 2.7 render functions, loaded into the Hisense VIDAA SystemUI.
- The user is non-technical and Italian — reply in Italian, plainly, and never claim something works on the TV until you have verified it on the TV.
- Never commit real secrets (TV IP, audio token, local paths). `config.json` is git-ignored; only `config.example.json` is committed.
- Keep the look identical; keep a working restore path at all times.
