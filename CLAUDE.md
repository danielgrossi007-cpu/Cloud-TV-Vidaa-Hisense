# Cloud TV (VIDAA): notes for Claude

This repo is a custom home screen for **Hisense VIDAA** TVs. The whole thing is one ES5 bundle, `home/native-home.js` (internal name **`daniel-home-1.8.1`**), that loads into the TV's SystemUI (a **Vue 2.7** app) and replaces its launcher route `/0/Launcher` with our liquid-glass home. The scripts in `tools/` connect to the TV, install, probe, screenshot and benchmark.

The owner is a non-technical Italian user. **Talk to them in Italian, plainly.** When something has not been checked on the real TV, say so — never claim it works because it works on the PC.

## Always

- **Keep the look identical.** Liquid-glass panels, the Claude-orange accent, spacing and animations are the point. Any optimization must be invisible. If a change would be visible, ask first.
- **ES5 only** in `home/native-home.js`. No `let`/`const`/arrow functions/`class` in code that runs on the TV — the SystemUI's engine is old. The bundle is built as Vue 2.7 render functions.
- **Never commit secrets.** The TV's real IP, the audio-helper token and local machine paths stay out of git. `config.json` is git-ignored; only `config.example.json` (placeholders) is committed. The repo ships `192.168.1.100` and `REPLACE_WITH_YOUR_AUDIO_TOKEN` as placeholders — keep it that way.
- **Never change the TV's picture, sound or network settings** to make something work. The launcher reads and writes native settings only where the user asked for it.
- **Always keep a way back.** Every install backs up the stock launcher and arms a watchdog. Never remove that path. Restoring the stock launcher must always work.
- **Verify on the TV before saying it is done.** PC tests (jsdom + a fake SystemUI) catch logic bugs; they do not prove the TV renders it, hears the sounds, or hits 60 fps. Read it back from the TV (`probe*`, `foto*`, the benchmark) and report honestly.
- **Only ever update `home/native-home.js`** — do not create parallel copies of the launcher. Per-version *backups* live under `tools/tv-*/` for reference.

## Installing it on the TV

The TV talks to the PC through a connection page served on the upload port (default `8766`), opened **in the TV's browser and kept in front**. The tools sign a job, the TV runs it, results come back to the PC.

1. `config.json` filled in (copy from `config.example.json`): `tvIp`, `uploadPort`, `audioToken`.
2. Open the connection page in the TV's browser and leave it in front. If the TV reloads its interface, that page stops and the watchdog restores the previous launcher after ~15 minutes — so install, then reload deliberately.
3. Turn the sound helper back on if needed (it stops when the TV is unplugged).
4. Install **without reloading** first: the installer's `installa` then `conferma` (confirm *before* the reload, because the reload kills the connection page).
5. Then reload the interface.
6. For a version change to fully take, **unplug the TV for ~30 seconds**. Standby is not enough — the TV resumes the home already in memory, so after standby you can still see the old version.

Restore: `node tools/tv-1.2/tv12.cjs ripristina`, or put back the previous version's saved copy and reinstall.

## The code (`home/native-home.js`)

- **Vue 2.7 render functions** inside the SystemUI. Route `/0/Launcher` is wrapped and its component replaced via an in-memory shell.
- **The permanent layer** (`control.layer`): a separate Vue root with `parent: vm.$root`, appended to `<body>` at a very high z-index. It survives the SystemUI destroying the launcher when an app opens. It draws:
  - the **volume capsule** (polls the volume ~4×/s so it shows even when the TV does not pass the volume key to the SystemUI), and
  - the **in-app Control Center** (when the TV routes to its quick-settings page over an app).
- **The persistent home**: the launcher route renders an empty shell (`.dh-shell`); the real home is mounted once (`ensureHome`) and moved in/out and shown/hidden (`attachHome`, `persistShow`/`persistHide`) instead of being rebuilt each time. A fallback renders the full home the old way if the shell can't be created.
- **Quick-menu replacement in apps**: when the route goes to the VIDAA quick-settings page on top of an app, the stock leaf component is swapped for an empty page and our Control Center is shown over it; Back / the menu key close it and return to the app; Home closes it and goes home.
- **Hiding the stock volume**: the stock indicator is `div.volume-bar` in the SystemUI. On the first volume key it is found, hidden with an injected CSS rule, and remembered. If it is drawn outside the SystemUI, the capsule is sized to cover it instead.
- **Launch / return FX**: the icon flies from the dock tile to the centre over a *pre-blurred* wallpaper and breathes; the app starts early; the launch screen holds ~1 s to cover loading, then the icon scales up and fades into the app. The return is the reverse, with focus landing back on the app just closed. **No loading bar, no "not responding" dialog** — a stuck launch just fades back to the home after ~8 s.
- **Migrations** (`migrNN`) run once to fix prefs from older versions (e.g. cleaning wrongly-learned menu routes, turning the capsule on).

## Sounds

UI sounds go through a **native audio helper** on the TV at `127.0.0.1:8772`, which expects the `audioToken`. It is started at boot by a hook that waits for the TV to be ready and restarts the helper if its port stops listening. Helper source and build are in `tools/tv-1.2/`. If the helper is down the UI stays silent instead of erroring.

## Performance

- Animate **only `transform` and `opacity`**. Never a live `backdrop-filter`/blur during motion — use **pre-blurred wallpaper images**.
- Target **60 fps** on a cheap, several-year-old TV, during animations and when opening panels.
- `tools/.../bench-page.js` + `tools/.../tv-bench.cjs` measure fps per step with `requestAnimationFrame` (fps, max gap, p95, frames over 20 ms, action time). Optimize the slow steps and re-measure; the persistent home is the main win.

## Adapting it to another TV / model

VIDAA specifics this build assumes (read-only probes confirm them per TV):

- Launcher route: `/0/Launcher`. App control: `/4/appControl`. Quick settings: `/13/setting/quickSetting`. Power dialog: `/11/PowerDialog`.
- Stock volume element: `div.volume-bar` in the SystemUI.
- The SystemUI is Vue 2.7 and destroys the launcher component when an app opens.

Confirm these with the read-only probes (`tools/.../probe*.cjs`, screenshots with `foto*.cjs`) before changing routes or selectors.

## Tests

- PC tests use Node + Vue 2.7 + jsdom with a fake SystemUI (router, keys): logic only. Run them before installing.
- Then verify on the TV: that the layer shows over Netflix, that arrow keys reach the SystemUI on the quick-settings page, the "stock volume found/hidden" event, sounds audible, launch/return smoothness and blur quality, and the fps benchmark.

## Restore / safety

The stock launcher is backed up on every install and never deleted. If anything is wrong, restore first, then diagnose. Do not change TV picture/sound/network settings to work around a bug.
