# Daniel Home 1.1: volume, tasto Home e suoni

Data: 15 novembre 2026. TV: Hisense 55E7LE, VIDAA U09.60, firmware `V0000.09.60A.Q0707`.

> **Stato:** la 1.1 è **preparata e provata sul PC**. **Non è ancora installata sulla TV.** Nessun problema va considerato risolto finché non viene provato sulla TV con i passi della sezione 4.

## 1. Cosa ho letto prima di intervenire

- `OS definitivo TV\native-home.js`: è la 1.0 **installata** (con le impostazioni native aggiunte dopo da ChatGPT/Codex).
- `CONSEGNA.md` e `ISTRUZIONI_CHATGPT.md`.
- Gli strumenti di collegamento in `Codex\2026-11-11\questo-tutta-la-chat-che-ho\work\tv-update\`:
  - `install-home10.cjs`, `activate-home10.cjs`, `root-job.cjs`, `publish.cjs`, `wait-result.cjs`, `native-helpers.cjs`, `restore-1.0.cjs`, `watchdog-1.0.cjs`;
  - i risultati `*.result.json`.
- Server, resoconti e prove audio in `Codex\2026-11-11\new-chat-2\work\vidaa-probe\`:
  - `server.cjs`, `build-probe.cjs`, `state.json`, `report.jsonl`;
  - `backups\activate-home10-….json` e `RECOVERY.md`;
  - le prove `native-audio-*` e `native-home-audio.c`.

### Come funziona il collegamento (ricostruito dagli script)

1. Il server sul PC (`server.cjs`, porta 8766) serve `index.html`, che sulla TV controlla `probe.js` ogni 4 secondi.
2. `build-probe.cjs` crea `probe.js`: un lavoro firmato che la TV esegue una sola volta e che si cancella da solo. I risultati tornano a `report.jsonl` in blocchi da 900 caratteri.
3. I lavori che devono scrivere la Home usano un pacchetto temporaneo (`root-job.cjs` + `package-builder.cjs`). Il pacchetto viene installato, esegue il lavoro con i permessi di amministratore e viene subito rimosso.
4. Il file nuovo arriva in blocchi da 300 KB, ognuno controllato con SHA-256.
5. Prima di sostituire la Home, il lavoro:
   - salva `previous-app.js` con il suo SHA-256, proprietario, permessi e contesto di sicurezza;
   - scrive `restore.cjs`;
   - avvia un **guardiano** che rimette la versione precedente dopo 15 minuti, se non riceve la conferma.
6. L'attivazione ricarica l'interfaccia tramite la sessione WebDriver locale della SystemUI (porta 4445, solo dentro la TV). Controlla poi versione, errori e risorse, e solo allora scrive la conferma.

## 2. Cause trovate (dai file, non ancora osservate sulla TV)

| Problema | Causa | Prova |
|---|---|---|
| Volume + apre il menu | Il codice vero del tasto Volume + **non è tra quelli previsti** (175/447, o il nome "VolumeUp"). Quindi la Home lo tratta come tasto sconosciuto. Nella 1.0, premere due volte un tasto sconosciuto lo trasforma nel "tasto del menu" (`prefs.menuKeys`). Da lì Volume + apre il menu e viene bloccato. | Codice 1.0: `offerMenuKey` e `volKey`. La lettura del volume (`biz.volume`) era già collegata, ma la capsula non compare mai, nemmeno nella Home: conferma che il tasto non viene riconosciuto. |
| Il tasto Home rifà l'animazione di accensione | Sulla TV la SystemUI **ricrea** la Home quando torni con il tasto Home, e la 1.0 a ogni nuova creazione fa partire il saluto di accensione. ChatGPT aveva corretto questo nella 0.9 (`control.introPlayed`), ma la correzione si è persa nella 1.0. | La 0.9 installata in `tv-update\native-home.js` aveva `if (!control.introPlayed) this.startIntro(); else this.playAppReturn();`, mentre la 1.0 ha solo `this.startIntro();`. |
| Suoni non udibili | Su questa TV il Web Audio di Cobalt non avanza: `currentTime` resta 0, come verificato il 12/11 in `state.json`. Il 12/11 era stato creato un piccolo programma nativo che suona dall'altoparlante (ALSA `sharespeakout`, solo su `127.0.0.1:8772`). La TV aveva confermato la scrittura dei campioni (`framesWritten`), **ma la 1.0 non lo usa più**. | `native-home-audio.c`, `native-sound-direct-play-…result.json`, `native-audio-flush-verify-…result.json` |

## 3. Cosa cambia nella 1.1

Base di partenza: la 1.0 **installata**, quindi con tutte le impostazioni native di ChatGPT.

**Volume**
- I tasti del volume **passano sempre alla TV** e non diventano mai tasto del menu.
- Riconoscimento automatico:
  - Per ogni tasto sconosciuto la Home legge il volume vero prima e dopo (`biz.volume.getMainVolumeState/getMainMuteState`).
  - Se il volume è cambiato, ricorda quel tasto come Volume +, Volume − o Muto (`prefs.volKeys`).
  - La prima pressione di un tasto sconosciuto non viene più bloccata.
- Una sola volta, all'avvio della 1.1, vengono azzerati i tasti del menu imparati con la 1.0, che potevano contenere Volume +. Le tre lineette si reimparano premendole due volte nella Home.
  - Se prima dell'installazione si leggono i codici veri (comando `codici`), l'azzeramento non serve: i codici vengono scritti nella Home.
- La capsula di vetro:
  - compare subito con il valore previsto e si corregge con il valore vero della TV dopo 180 ms e dopo 600 ms;
  - sta sempre nel livello sopra a tutto, quindi anche sopra Netflix o Prime Video aperti dal telecomando e non dalla Home.

**Tasto Home**
- L'animazione di accensione parte solo:
  - al primo avvio dell'interfaccia;
  - con il segnale di sistema `str-resuming` (uscita dallo standby).
- Quando la Home viene ricreata parte l'animazione di ritorno.
- Le pause lunghe (timer fermi) e il ritorno di visibilità non fanno più partire il saluto.

**Suoni**
- La Home prova prima l'altoparlante nativo locale. Se non risponde, usa Web Audio.
- Con l'altoparlante nativo attivo non decodifica più i suoni all'avvio: meno lavoro per la TV.

**Diagnosi**
- Ogni passaggio scrive un evento leggibile, per esempio "tasto volume riconosciuto", "Home ricaricata", "primo avvio", "messaggio str-resuming".

**Prove fatte sul PC (simulatore Vue 2.7 a 1920×1080)**
- Volume + premuto due volte: non diventa mai menu, la TV cambia il volume, la capsula compare in Home e sopra l'app.
- Un codice sconosciuto viene riconosciuto come volume alla prima pressione.
- Le tre lineette si imparano ancora con due pressioni.
- Home ricreata: animazione di ritorno, nessun saluto.
- Pausa di 60 s: nessun saluto.
- ES5 valido.
- Prova casuale ripetuta con app assenti, errori del servizio, memoria negata e audio assente: nessun errore nella pagina.

Anteprime in `anteprime\v1.1\`.

## 4. Procedura sulla TV (da fare insieme)

Strumenti: `tv-update\tv11.cjs`, `lib11.cjs`, `run11.json`, copiati anche in `OS definitivo TV\strumenti\tv-1.1\`. Riusano `build-probe.cjs`, le chiavi e `server.cjs` già usati per la 1.0.

1. `node tv11.cjs apri`: accende il server. Lascia aperta la finestra.
2. Sulla TV apri `http://192.168.1.100:8766/` e lascia la pagina aperta.
3. `node tv11.cjs diagnosi`: **solo lettura**. Raccoglie:
   - versione e tasti ricevuti;
   - `prefs.menuKeys` (per vedere se c'è Volume +);
   - il volume vero letto dalla TV;
   - lo stato dell'altoparlante nativo;
   - gli eventi e i millisecondi per tasto della 1.0.
4. Nella Home premi **Volume + tre volte, Volume − tre volte, Muto una volta**, poi `node tv11.cjs codici`. Salva i codici veri in `codici-volume.json`.
5. Se la diagnosi dice che l'altoparlante nativo non risponde: `node tv11.cjs suoni`.
6. `node tv11.cjs installa`:
   - controlla che sulla TV ci sia esattamente la 1.0 (SHA-256 `17b99087…`);
   - salva il backup in `/APPS/codex-home11-…-home11/previous-app.js`;
   - installa la 1.1;
   - arma il guardiano.
7. `node tv11.cjs attiva`: ricarica l'interfaccia, controlla la 1.1 e conferma. Se un controllo fallisce, il guardiano rimette la 1.0 da solo entro 15 minuti.
8. Prove fisiche:
   - Volume +/− e Muto nella Home e dentro Netflix;
   - tasto Home da Netflix;
   - un paio di tasti per sentire i suoni;
   - tre lineette due volte nella Home.
9. `node tv11.cjs verifica`: legge eventi e tempi e li confronta con la diagnosi.
10. `node tv11.cjs chiudi`, poi Ctrl+C sul server.

**Ripristino:** `node tv11.cjs ripristina` rimette la 1.0 dal backup e ricarica l'interfaccia. La Home originale VIDAA resta salvata in `/APPS/codex-home-20261111/original-app.js` e, sul PC, in `vidaa-probe\backups\`.

## 5. Ancora da verificare sulla TV

- Il codice reale di Volume +, Volume − e Muto (passo 4).
- Se l'indicatore originale del volume di VIDAA compare insieme alla capsula. Se succede, va valutato come nasconderlo: non è ancora stato studiato.
- Se l'altoparlante nativo è ancora installato e si avvia all'accensione (`/var/local/otaTest.sh`), e se il suono **si sente**. Il 12/11 la TV ha confermato la scrittura dei campioni, ma l'ascolto non è mai stato confermato.
- Se la capsula, che sta nel livello della SystemUI, è visibile sopra Netflix.
- L'animazione all'uscita dallo standby (dipende dal segnale `str-resuming`).
- I tempi per tasto della 1.1 confrontati con la 1.0. Sul PC, a CPU rallentata 6×, la 1.0 resta tra 6 e 20 ms per tasto; la 1.1 aggiunge solo una lettura del volume sui tasti sconosciuti.
