# Istruzioni per ChatGPT: completare e verificare "Daniel Home" sulla TV

Ciao ChatGPT. Questo file ti passa il lavoro sulla Home personalizzata della TV di Daniel. Leggilo tutto prima di toccare il codice. Daniel vuole che **implementi e verifichi sulla TV** tutto quello che qui è segnato come "DA FARE TU". Le parti già fatte non vanno rifatte: vanno solo installate e controllate.

Rispondi a Daniel in italiano. Quando una cosa non è verificata sulla TV, diglielo chiaramente: non dire che funziona se non l'hai visto funzionare.

---

## 0. Contesto e regole fisse

**La TV**
- Modello: Hisense 55E7LE.
- Sistema: VIDAA U09.60, firmware V0000.09.60A.Q0707.
- La SystemUI gira su **Cobalt**, il motore web di YouTube per TV. Lo schermo logico è 1920×1080.

**I file**
- Cartella del progetto sul PC: `C:\path\to\Cloud-TV-Vidaa-Hisense\`.
- Si lavora **sempre in questa cartella**. Non creare cartelle di versione nuove.
- File principale: `native-home.js`, versione **`daniel-home-1.0`**.
  - Avvolge `self._V_M_.launcher` e sostituisce solo il componente della rotta `/Launcher`.
  - Un solo file e nessun server.
- Immagini: `daniel-home-assets\` (`wallpapers\`, `wallpapers\thumbs\`, `app-icons\`, `avatars\`).
  - Sulla TV il codice le cerca in `APPS/daniel-home-assets/...`. Vedi `CONFIG.WALL_BASE`, `APP_ICON_BASE` e `AVATAR_BASE`.
- Suoni sorgente: `suoni\*.wav`. Nel codice sono già incorporati come data URI dentro `SOUNDS`.
- Strumenti:
  - `strumenti\ricevi_dati_tv.py` riceve sul PC i dati inviati dalla TV, porta 8765.
  - I file ricevuti finiscono in `strumenti\dati-tv\`.

**Regole di codice (obbligatorie)**
1. Solo **ES5**: niente `let`/`const`, arrow function, template string, classi o `async`.
   - Controlla con `npx -y acorn@8.11.3 --ecma5 --silent native-home.js`.
2. Vue 2 con `render(h)` scritto a mano. Niente template e niente file .vue.
3. Niente CSS Grid, `gap`, `object-fit`, né `box-sizing` usato per dimensionare. Si usano coordinate assolute su tela 1920×1080: helper `abs(x, y, w, h)` e `px()`.
4. **Non inventare API VIDAA.**
   - Ogni chiamata nuova a `sdk`, `_V_M_` o `_V_SDK_` deve venire dal codice originale della TV, cioè dai dati in `strumenti\dati-tv\`, oppure da una prova fatta sulla TV.
   - Le API già verificate sono:
     - `sdk.me.req('app-service').getData('getAppList',{sceneCode:'launcher'})`
     - `sdk.apc.start(...)`
     - `sdk.me.req('all-inputs').getData('getAllInputsData')` e `.invoke('changeSourceTo', id, 'launcher')`
     - `self._V_M_.setting().page.settings({from:'launcher'})`
     - `sdk.key.beforeKeydownDispatch` e `sdk.key.beforeKeyupDispatch`
     - `sdk.message.on(...)`
5. **L'aspetto non si cambia.** Daniel vuole che Liquid Glass, colori, spaziature e animazioni restino identici. Ogni ottimizzazione deve essere invisibile. Se un cambiamento si vede, chiedi prima a Daniel.
6. Non riportare indietro le ottimizzazioni della sezione 2. Leggi le regole di `SECTION` prima di modificare qualsiasi funzione `r...`.

---

## 1. Installazione e controllo versione (DA FARE TU, per primo)

1. Installa sulla TV il nuovo `native-home.js` con lo stesso metodo usato finora.
2. Copia sulla TV la cartella `daniel-home-assets\wallpapers\`.
   - Gli sfondi sono stati **rielaborati per la TV**: neri più profondi, contrasto +8%, colore +15%, nitidezza leggera, JPEG qualità 95 senza sottocampionamento del colore.
   - Gli originali sono in `daniel-home-assets\wallpapers-originali\`. **Non** copiarli sulla TV.
3. Sulla TV apri **Impostazioni › Supporto › Servizi della TV**. In alto, nella sezione "Questa Home", deve comparire **Versione daniel-home-1.0**.
   - Se compare un'altra versione, la TV sta caricando un file vecchio. Daniel ha detto che "non vede più le animazioni", e la prima cosa da escludere è proprio questa.
4. Nella stessa riga leggi `scala` e la risoluzione (es. `1920×1080`). Annotale per la sezione 7.

---

## 2. Fluidità: cosa è già stato fatto e cosa devi verificare

Daniel dice che sulla TV la Home "lagga un po', specialmente nei menu". Vuole che sia **circa il doppio più fluida** e senza scatti.

### 2.1 Già fatto (non rifarlo)

**a) Zone memorizzate (`SECTION`).**
- Prima ogni tasto ridisegnava l'intera Home: sfondo, Home, barra laterale e impostazioni.
- Ora ogni zona è un componente separato:
  - sfondo `rWallpaper`
  - schermata `rScreen`
  - pannelli sovrapposti `rOverlay`
  - avviso `rToast`
- Anche ogni riquadro e ogni riga è un componente separato: `rAppTile`, `rCmdTile`, `rRow`, `rChip` sono "memorizzati". Il disegno vero è in `_rAppTile`, `_rCmdTile`, `_rRow` e `_rChip`.
- Una riga si ridisegna solo se cambia la sua "firma" (`sig`, calcolata da `sigOf(o)`): fuoco, testo, valore, posizione. Spostare il fuoco ridisegna 2 elementi invece di tutti.
- Misure nel browser con la CPU rallentata 6 volte (mediana per tasto). L'aspetto è identico al pixel: confronto automatico prima/dopo, unica differenza l'orologio.

  | Zona | Prima | Dopo |
  |---|---|---|
  | Barra laterale | 19,6 ms | 5–9 ms |
  | Impostazioni | 12–16 ms | 6–10 ms |
  | App | 31–33 ms | 15–20 ms |
  | Pannello rapido | 18–22 ms | 6–9 ms |
  | Dock della Home | 17 ms | 15 ms (circa uguale) |

**Regole di `SECTION` (importantissime):**
- Una funzione memorizzata (`_rRow`, `_rAppTile`…) deve dipendere **solo** dagli argomenti che riceve, oppure da dati reattivi che legge lei stessa, come `this.prefs`, `this.tint` o `this.bright`. Vue registra queste letture e la ridisegna quando cambiano.
- Se aggiungi un campo all'oggetto `o` di `rRow` che cambia l'aspetto, deve essere un valore semplice (stringa, numero, booleano o array di stringhe), così entra nella firma. Un oggetto annidato entra nella firma solo con `appId`, `id`, `ssid` o `sourceId`.
- Se una funzione render della Home legge `this.hf` (fuoco della Home), si ridisegna a ogni freccia. Non spostare letture di fuoco dentro funzioni che oggi non le hanno.

**b) Frecce tenute premute.** Se il fotogramma precedente non è ancora stato disegnato, la ripetizione della freccia viene saltata (`vm._busy` in `_codexKey`). Così sulla TV lenta il fuoco non continua a correre dopo che si lascia il tasto.

**c) Suoni pre‑decodificati.** `Sound.preload()` parte 4 secondi dopo l'avvio, così il primo tasto non aspetta la decodifica del suono.

**d) Misure sulla TV.** In **Servizi della TV** ci sono:
- "Lavoro per tasto: media X ms, massimo Y ms": il tempo JavaScript per ogni tasto, fino al ridisegno.
- "Misura la fluidità (6 secondi)": premi OK, poi muoviti con le frecce. Alla fine vedi i fotogrammi al secondo e quanti "scatti" ci sono stati, cioè fotogrammi oltre 50 ms.

### 2.2 DA FARE TU: misurare sulla TV e, se serve, ottimizzare ancora

1. Sulla TV, con la versione 1.0, fai "Misura la fluidità" in quattro situazioni:
   - Home sul dock
   - barra laterale aperta
   - Impostazioni
   - schermata App
2. Annota fps, scatti e "Lavoro per tasto". **Obiettivo: almeno 50 fps mentre ci si muove, al massimo 2 scatti in 6 secondi e lavoro per tasto sotto i 30 ms.**
3. Interpreta i numeri:
   - **Lavoro per tasto alto (oltre 40 ms)** vuol dire che il collo di bottiglia è JavaScript.
     - Memorizza altre zone con lo stesso schema `SECTION`: per esempio la barra in alto `rTopBar`, oppure il dock come zona a sé.
     - Evita di creare oggetti grandi a ogni render.
   - **Lavoro per tasto basso ma fps bassi o tanti scatti** vuol dire che il collo di bottiglia è il disegno di Cobalt: ombre sfocate grandi, gradienti, testo con ombra.
     - Fai questa prova per capirlo: in console o con una build di prova, imposta temporaneamente `boxShadow: 'none'` sulle ombre grandi (quelle con sfocatura oltre 20 px) e rimisura.
     - Se gli fps salgono molto, sostituisci le ombre sfocate con **immagini PNG di ombra pre‑calcolate**: un `div` dietro l'elemento con `backgroundImage` di un'ombra morbida generata al PC, stessa forma e stessa opacità. Così l'aspetto resta identico e Cobalt disegna solo un'immagine.
     - Fai lo stesso con `textShadow` sui titoli grandi, se serve.
   - Le transizioni devono animare solo `transform` e `opacity` dove possibile. `box-shadow` e `background-color` animati costano di più. Le card della Home usano già una dissolvenza in `opacity` tra due livelli di ombra: è lo schema da copiare.
4. Dopo ogni modifica rimisura e confronta con i numeri annotati. Scrivi i numeri prima/dopo in `CONSEGNA.md`.

---

## 3. Tasto con le tre lineette (menu)

### 3.1 Nella Home (fatto in parte)
Daniel vuole che le tre lineette, nella Home, aprano **la barra laterale**, cioè lo stesso menu che si apre con OK sulla foto profilo.

**Già fatto**
- Il codice del tasto non è noto, perché `CONFIG.KEYS.SIDEBAR` è vuoto.
- Ora, se nella Home arriva un tasto sconosciuto, compare l'avviso "Tasto N: premilo di nuovo per usarlo come menu". Premendolo una seconda volta entro 6 secondi diventa il tasto del menu e la barra si apre.
- Il codice viene salvato in `prefs.menuKeys` (`offerMenuKey`).

**DA FARE TU**
1. Sulla TV, nella Home, premi le tre lineette.
   - Se compare l'avviso, il tasto arriva alla Home. Leggi il codice in **Servizi della TV › Tasti ricevuti (tutti)** e **scrivilo fisso** in `CONFIG.KEYS.SIDEBAR`, es. `SIDEBAR: [codice]`, così funziona anche dopo un reset.
   - Se **non** compare nulla, perché si apre il menu originale VIDAA o non succede niente, il tasto viene intercettato prima di `sdk.key.beforeKeydownDispatch`. Allora:
     1. Guarda in **Servizi della TV › Eventi** se compare una riga `rotta  /Launcher > /QualcosaDiQuickSetting`, quando premi il tasto dalla Home.
     2. Se compare, metti quella rotta in `CONFIG.QUICK_ROUTES`, es. `QUICK_ROUTES: [/QuickSetting/i]`.
        - Il codice installato in `mounted` usa `this.$router.beforeEach`.
        - Quando la rotta corrisponde, annulla la navigazione e apre il nostro pannello: dalla Home in modalità normale, da un'app in modalità app.
        - **Nella Home le tre lineette devono aprire la barra laterale, non il pannello rapido.** Per farlo, nel ramo `hit` di `beforeEach` chiama `v.openSidebar()` quando `fp` è `/Launcher` e `v._inApp` è falso.
     3. Se non compare né il tasto né la rotta, cerca nei dati della TV (`strumenti\dati-tv\`, file `modulo-*.js`, `albero.txt` e `info.json`) chi gestisce il tasto menu.
        - Cerca stringhe come `menu`, `MENU`, `quick`, `QuickSetting`, `shortcut` e i codici dei tasti.
        - Aggancia quella funzione con lo stesso schema usato per il launcher: avvolgi la factory del modulo in `_V_M_` e sostituisci il componente della rotta, come fanno `wrap` e `control.componentFactory` in fondo al file.

### 3.2 Dentro le app (Netflix, YouTube…) (DA FARE TU)
Daniel vuole che le tre lineette dentro un'app aprano il **pannello Impostazioni rapide** a sinistra, quello già pronto (`rQuick`).

**Situazione attuale**
- `_codexKeyLog` apre il pannello con il tasto menu quando la Home non è attiva oppure quando `vm._inApp` è vero, cioè dopo `launch()`.
- Il pannello si disegna in un livello separato sopra tutto (`ensurePortal`): un'istanza Vue su `document.body` con `zIndex` 2147483000.
- **Non è verificato** che i tasti arrivino alla SystemUI mentre un'app è in primo piano. Non è verificato nemmeno che la SystemUI venga disegnata sopra l'app.

**Passi**
1. Apri Netflix, premi le tre lineette, poi torna alla Home. Guarda **Servizi della TV › Tasti ricevuti (tutti)**: le righe con " app?" sono quelle arrivate mentre eri in un'app.
2. Casi possibili:
   - **Il tasto arriva** ma il pannello non si vede: la SystemUI non è visibile sopra l'app.
     - Nei dati della TV cerca come la SystemUI mostra il suo menu rapido originale sopra le app: rotta, modulo e funzione di "show" della finestra.
     - Usa **quel** meccanismo: sostituisci il componente della rotta del menu rapido originale con un componente che disegna `vm.rQuick(h)`, con `qsInApp = true`.
   - **Il tasto non arriva** e si apre il menu rapido originale VIDAA: usa `CONFIG.QUICK_ROUTES` (vedi 3.1), oppure sostituisci il componente di quella rotta.
3. Il pannello deve chiudersi:
   - con Indietro dalla prima pagina
   - con le tre lineette
   - da solo dopo 15 secondi senza tasti (`qsArmIdle`)
4. Se non si riesce in alcun modo, scrivi a Daniel esattamente cosa hai provato e cosa hai visto. Non lasciarlo credere che funzioni.

---

## 4. Animazioni (accensione e ritorno alla Home)

Daniel dice che **non vede più** né l'animazione di accensione (saluto "Buongiorno/Buonasera" scritto a mano sopra lo sfondo sfocato) né quella del **tasto Home** (ritorno da un'app con lo sfondo sfocato che torna nitido in circa 2 s, stile Apple).

### 4.1 Già fatto: più segnali di riserva e registro eventi
Prima l'animazione di ritorno partiva solo da `activated` (keep-alive di Vue), e il saluto solo da `mounted` o dal messaggio `o2n://sdk/str-resuming`. Se la SystemUI non smonta mai la rotta `/Launcher` mentre gira un'app, `activated` non arriva mai e non si vede niente.

Ora ci sono questi segnali:

| Segnale | Cosa fa |
|---|---|
| `activated` | come prima |
| `homeShown(motivo)` | punto unico che fa partire l'animazione di ritorno, con antirimbalzo di 3 s |
| `visibilitychange` | la pagina torna visibile dopo `launch()`: ritorno Home. Torna visibile dopo più di 20 s nascosta senza app: saluto |
| `focus` della finestra | dopo `launch()` vale come ritorno Home |
| `$router.beforeEach` | il passaggio da un'altra rotta a `/Launcher` dopo `launch()` vale come ritorno Home |
| battito ogni 2 s (`heartbeat`) | un buco di oltre 20 s tra due battiti vuol dire che la TV era sospesa (standby rapido): fa partire il saluto, oppure il ritorno se eri in un'app |
| `CONFIG.KEYS.HOME` | se ci metti il codice del tasto Home, premerlo dentro un'app fa partire l'animazione nell'istante giusto |

Tutto viene scritto nel registro `control.events`. Lo vedi in **Servizi della TV › Eventi** e finisce anche nei dati inviati al PC (`info.json` → `eventi`).

### 4.2 DA FARE TU: verificare ogni caso sulla TV
Per ogni caso annota quali righe compaiono in **Eventi** e se l'animazione si vede:

1. **Accensione a freddo** (stacca e riattacca la corrente). Atteso:
   - `Home caricata daniel-home-1.0` e poi `saluto di accensione attivo`.
   - Il saluto si vede e resta finché premi OK.
2. **Accensione dallo standby** (spegni con il telecomando, aspetta 30 s, riaccendi). Atteso: `risveglio dallo standby`, oppure `messaggio str-resuming`, e poi il saluto.
3. **Tasto Home da Netflix** (apri Netflix dalla Home, aspetta 10 s, premi Home). Atteso: una tra `activated`, `Home di nuovo visibile …` e `rotta … > /Launcher`, poi `animazione ritorno Home`, e l'animazione si vede.
4. **Tasto Home da YouTube e da un ingresso HDMI**: come il caso 3.

Se in un caso **non compare nessun evento utile**, cerca nei dati della TV il messaggio che la SystemUI riceve in quei momenti e collegalo a `homeShown()` o a `startIntro()`. Il ritorno alla Home dopo un'app potrebbe passare da `sdk.message` o dagli eventi di `app-service`. Usa solo nomi trovati nel codice della TV.

Se compare `animazione ritorno Home` ma **non si vede nulla**:
- Controlla `info.json` → `css.filter`. Se è `false`, Cobalt non supporta `filter: blur()`.
  - In quel caso l'effetto si riduce a dissolvenza e zoom: è giusto, ma più debole.
  - Per riavere la sfocatura **senza filtri CSS**, genera al PC una copia sfocata di ogni sfondo, per esempio `wallpapers\blur\nome.jpg` a 480×270 ingrandita, con sfocatura gaussiana di circa 12 px a quella risoluzione.
  - Nel render di `fxKind === 'app'`, metti l'immagine sfocata sopra lo sfondo nitido e falla sparire con una transizione di `opacity` di 1500 ms, curva `cubic-bezier(0.25,0.1,0.25,1)`.
  - Fai lo stesso per lo sfondo del saluto di accensione.
- Controlla anche che le preferenze non abbiano `homeFx: false`, `bootIntro: false` o `reducedMotion: true`. Si trovano in Personalizzazione › Suoni e animazioni.

---

## 5. Suoni (DA FARE TU)
Daniel dice che i suoni **non si sentono ancora** sulla TV.

**Cosa c'è**
- `Sound` usa Web Audio: `AudioContext`, `decodeAudioData`, `createBufferSource`, e `GainNode` quando c'è.
- Se manca `GainNode`, la copia del suono viene scalata nel volume. In ultima istanza usa `new Audio(dataURI)`.
- Suoni disponibili (WAV 48 kHz mono 16 bit, già incorporati in `SOUNDS`) e dove partono:

  | Suono | Quando parte |
  |---|---|
  | `move` | frecce |
  | `select` | OK |
  | `back` | Indietro |
  | `intro` | quando il saluto inizia a scriversi, circa 2,4 s dopo l'accensione |
  | `home` | ritorno dalla Home |
  | `saverIn` / `saverOut` | salvaschermo |

- Diagnosi: Personalizzazione › Suoni e animazioni › **Prova i suoni**. Scrive a schermo il metodo usato e gli errori. Gli stessi dati sono in `control.soundInfo()` e in `info.json` → `suoni`.

**Passi**
1. Premi "Prova i suoni" e leggi il risultato.
   - "AudioContext assente": Cobalt di questa TV non ha Web Audio. Passa al punto 2.
   - Il risultato dice "riusciti" ma non senti nulla: l'audio esce su un canale che la TV non mixa con l'app (la SystemUI). Passa al punto 2.
2. Nei dati della TV (`modulo-*.js`) cerca come la SystemUI originale fa i suoni dei tasti. Cerca `sound`, `beep`, `keyTone`, `playSound`, `audio`, `.wav`, `.mp3`, `h5vcc`. Se esiste un'API di sistema, usa quella:
   - aggiungi in `Sound` un metodo `viaSystem(name, vol)` tentato **per primo**
   - salva i file dei suoni dove la TV li può leggere, es. `APPS/daniel-home-assets/sounds/` copiando `suoni\*.wav`
3. Daniel sta creando un **suono di accensione** suo, che metterà in `suoni\`. Specifiche concordate: 4–6 secondi, WAV o MP3, mono va bene, finale sfumato.
   - Quando c'è, convertilo in WAV 48 kHz mono 16 bit e mettilo in `SOUNDS.intro` come data URI, oppure come file se usi l'API di sistema.
   - Oggi `intro` parte a circa 2,4 s, quando il saluto inizia a scriversi. Chiedi a Daniel se lo vuole a 0 s.
4. Verifica: con i suoni attivi, ogni freccia deve fare **un solo** suono, mai doppio. Tienili leggeri: la TV è lenta e un suono non deve rallentare il ridisegno.

---

## 6. Collegare davvero le impostazioni (DA FARE TU)

Oggi le voci del pannello rapido e delle Impostazioni a schermo intero **non cambiano la TV**: le modifiche restano salvate solo nella Home (`prefs.qsLocal`) e in basso c'è una nota che lo dice. Le liste Wi‑Fi e Bluetooth sono vuote.

### 6.1 Dati della TV
1. Sul PC avvia `strumenti\ricevi_dati_tv.py`: mostra l'indirizzo del PC.
2. Sulla TV, in **Servizi della TV**, inserisci l'indirizzo del PC e premi **Invia i dati della TV al PC**.
3. Nei file ricevuti trovi:
   - le rotte
   - il sorgente di ogni modulo `_V_M_`, compreso `setting`
   - il sorgente delle rotte delle impostazioni originali
   - gli alberi di `sdk`, `_V_M_` e `_V_SDK_`
   - gli script della SystemUI
4. Da lì trova **come il menu Impostazioni originale legge e scrive ogni voce**.

### 6.2 Contratti da riempire
**`SETTINGS_MAP`** (riga `var SETTINGS_MAP = {}`):
```js
SETTINGS_MAP['pictureMode'] = {
  get: function (sdk) { /* ritorna il valore attuale, es. 'Standard' */ },
  set: function (sdk, value) { /* scrive; ritorna false se fallisce */ }
};
```
- Chiavi del pannello rapido (`QUICK`):
  - **Immagine:** `pictureMode`, `backlight`, `brightness`, `contrast`, `colorSaturation`, `sharpness`, `aiEnergy`, `aiPicture`, `aspectRatio`
  - **Ripristino immagine:** `pictureReset`
  - **Suono:** `soundMode`, `soundApply`, `dolbyAtmos`, `autoVolume`
  - **Ripristino suono:** `soundReset`
  - **Connessione:** `bluetooth`, `btAutoPair`
- Le opzioni mostrate devono essere quelle **vere** della TV:
  - **Modalità immagine:** Dinamica, Standard, Risparmio energetico, Cinema, Filmmaker, Sport. Se la TV ne ha altre o con altri nomi, usa quelle della TV.
  - **Modalità audio:** Standard, Teatro, Musica, Dialogo, Notte fonda, Sport.
- Le **Impostazioni a schermo intero** (`SETTINGS_TREE`) usano le stesse chiavi dove coincidono. Collega anche le altre voci di ogni categoria. Daniel vuole che **nessuna voce rimandi al vecchio pannello VIDAA**: l'unica eccezione è la riga "Apri impostazioni originali VIDAA".
- **Proporzioni:** su alcune sorgenti è bloccata su Automatico. Se la TV la blocca, mostra la riga disattivata con valore "Automatico", senza errore.

**`TV_NET`** (rete e Bluetooth), con le firme già usate dall'interfaccia:
```
wifiStatus(sdk, cb)              cb({ connected: bool, ssid: '...', type: 'wifi'|'ethernet' })
wifiScan(sdk, cb)                cb([{ ssid, secure: bool, signal: 0..4, current: bool }])
wifiConnect(sdk, ssid, pwd, cb)  cb(null se ok, altrimenti testo dell'errore)
btGet(sdk) -> bool               btSet(sdk, on)
btScan(sdk, cb)                  cb([{ id, name, connected: bool, paired: bool }])
btConnect(sdk, id, cb)           cb(null o errore)
```
Appena una funzione è collegata, le schermate si riempiono da sole:
- **Pannello rapido** › Connessione › Mostra reti, poi la tastiera della password, poi Connetti.
- **Impostazioni** › Connessione › Rete › Reti Wi‑Fi disponibili. Si apre a schermo intero, con la stessa tastiera in grande.
- Lo stesso vale per Dispositivi Bluetooth.

### 6.3 Verifiche con un contenuto vero (Daniel le può fare con te)
Avvia una serie su Netflix e, mentre va, apri il pannello rapido con le tre lineette:

| Voce | Cosa deve succedere davvero |
|---|---|
| Modalità immagine | l'immagine di Netflix cambia subito, es. Cinema più caldo e Dinamica più acceso |
| Retroilluminazione 80 → 20 | lo schermo diventa più scuro |
| Luminosità, Contrasto, Saturazione, Nitidezza | cambio visibile; i valori riletti dal menu originale coincidono |
| Ripristina modalità corrente | i valori tornano quelli di fabbrica della modalità |
| Ottimizzazione immagine IA / Modalità energia IA | lo stato riletto dal menu originale coincide |
| Proporzioni | cambia il formato, oppure resta bloccata se la sorgente non lo permette |
| Modalità audio | il suono cambia, es. Dialogo con le voci più in avanti |
| Applica a: tutte le sorgenti | passando a HDMI la modalità resta la stessa |
| Dolby Atmos / Volume automatico | lo stato riletto dal menu originale coincide |
| Wi‑Fi | scegli una rete, password, Connetti: la TV si connette e la riga mostra "Connessa" in verde |
| Bluetooth | le cuffie si collegano e la riga mostra "Connesso" |

Ogni valore scritto va **riletto** dal menu originale VIDAA, per essere sicuri che sia lo stesso.

---

## 7. Contrasto: sulla TV i colori sono più spenti delle anteprime (in parte fatto)

Daniel vede sulla TV un'immagine più sbiadita delle anteprime.

**Fatto**
- Gli sfondi sono stati rielaborati per la TV (vedi sezione 1).
- Le copie sono in qualità alta e senza sottocampionamento del colore. Questo toglie la perdita di colore del JPEG ed evita le bande nei cieli.

**DA FARE TU**
1. Controlla la riga "Versione" in Servizi della TV.
   - Se la risoluzione è **1280×720** o `scala` è diversa da 1, la SystemUI disegna a 720p e poi ingrandisce: tutto diventa più morbido e meno contrastato.
   - Cerca nei dati della TV se si può far disegnare la SystemUI a 1920×1080, con un meta viewport, un'impostazione di Cobalt o una della SystemUI. Scrivi a Daniel cosa hai trovato.
2. Su molte TV la modalità immagine della TV si applica anche ai menu. Prova sulla Home le modalità Standard, Dinamica e Filmmaker, e la retroilluminazione, e annota la differenza. Dillo a Daniel: se l'interfaccia sembra sbiadita solo in certe modalità, la causa è l'impostazione della TV, non la Home.
3. Se dopo questi passi i colori sono ancora spenti, alza ancora gli sfondi con lo script in sezione 9: contrasto 1,12 e colore 1,22. Confronta con Daniel e non andare oltre senza il suo OK.

---

## 8. Impostazioni a schermo intero: reti, Bluetooth e password (fatto, da verificare)
- **Impostazioni › Connessione › Rete › Reti Wi‑Fi disponibili** e **Impostazioni › Connessione › Dispositivi Bluetooth** aprono ora pagine **a schermo intero**, nello stesso stile delle Impostazioni: grande icona a sinistra e lista a destra. Prima aprivano il pannello laterale.
- La password si scrive con una **tastiera grande a schermo intero**.
- Codice: livello delle impostazioni `kind: 'qs'`, metodo `openQsLevel(id, st)`, render in `rSettings` (ramo `kind === 'qs'`), tasti in `keySettings`.
- **La tastiera è stata rifatta** per pannello e schermo intero (`rKbField`, `rKb`, `kbLayout`):
  - campo con lucchetto e contatore dei caratteri
  - tasti in vetro chiaro
  - riga dei comandi con icone: maiuscole, `#+=`/ABC, spazio, cancella, mostra/nascondi
  - un pulsante principale **Connetti** blu, attivo da 8 caratteri
  - la scritta "Indietro per annullare" è stata tolta
- Spostandosi in su e in giù si va al tasto più vicino in verticale.
- Verifica sulla TV che i tasti si leggano bene da 3 metri e che non ci siano scatti.

---

## 8 bis. Indicatore del volume in vetro (fatto, DA COLLEGARE)
Daniel vuole un indicatore del volume **suo**, in vetro arrotondato come il resto della Home, sia nella Home sia dentro Netflix, Prime Video e le altre app, al posto di quello originale VIDAA.

**Fatto**
- `rVolume`: capsula verticale in vetro sul lato destro, 84×380, angoli completamente tondi.
  - Il numero del volume è in alto.
  - Il riempimento bianco sale dal basso.
  - L'altoparlante in basso cambia icona a seconda del livello: `vol0` muto, `vol1`, `vol2`, `vol3`. Nella parte coperta dal riempimento diventa scuro.
- Entra con dissolvenza e scivolamento, poi sparisce 2,2 s dopo l'ultimo tasto.
- Nella Home si disegna nell'albero normale. Dentro le app si disegna nel livello `ensurePortal`, lo stesso del pannello rapido.
- Tasti riconosciuti:
  - `CONFIG.KEYS.VOL_UP` [175, 447], `VOL_DOWN` [174, 448] e `VOL_MUTE` [173, 449]: codici Cobalt e codici standard TV.
  - Anche i nomi `AudioVolumeUp`, `AudioVolumeDown` e `AudioVolumeMute`.
  - Ogni pressione scrive `tasto volume <codice>` nel registro Eventi.
- Interruttore in Personalizzazione › Telecomando: "Indicatore del volume in vetro" (`prefs.volHud`).
- **Finché `TV_VOL.get` è null l'indicatore non compare**, per non mostrare numeri inventati. Oggi quindi sulla TV si vede ancora quello originale.

**DA FARE TU**
1. Premi Volume +, Volume − e Muto nella Home e dentro Netflix. Controlla in **Eventi** che arrivi `tasto volume …` e annota i codici. Se sono diversi da quelli in `CONFIG.KEYS.VOL_*`, aggiungili.
2. Nei dati della TV trova come la SystemUI legge e cambia il volume e lo stato muto. Cerca `volume`, `Volume`, `mute`, `setVolume`, `getVolume`, `audio-service`. Riempi:
   ```
   TV_VOL.get(sdk) -> 0..100    TV_VOL.set(sdk, n)    TV_VOL.getMute(sdk) -> bool    TV_VOL.setMute(sdk, bool)
   ```
3. Scegli la modalità:
   - **`TV_VOL.takeover = true`** (quella che vuole Daniel): la Home consuma il tasto, cambia lei il volume con `set` o `setMute` e mostra solo il suo indicatore. Così quello originale non compare più. Va bene solo se il volume cambia davvero e subito, anche tenendo premuto il tasto.
   - `takeover = false`: il volume lo cambia la TV, la Home rilegge il valore e mostra la sua capsula. Se compare anche l'indicatore originale, cerca nella SystemUI il componente o la rotta dell'OSD del volume e nascondilo, sostituendo il componente come per il launcher.
4. Verifica, nella Home, dentro Netflix, dentro Prime Video e su un ingresso HDMI:
   - il numero coincide con il volume reale
   - Muto mostra "–" e l'altoparlante barrato
   - tenendo premuto il tasto il riempimento sale in modo fluido
   - la capsula sparisce dopo circa 2 s
   - nessun doppio indicatore
5. Se dentro le app la capsula non si vede, vale lo stesso discorso del pannello rapido (sezione 3.2): bisogna usare il meccanismo con cui la SystemUI disegna sopra le app.

## 9. Utilità

**Rigenerare gli sfondi "per TV"** (Python 3 con Pillow e numpy). Parti sempre da `wallpapers-originali\` e scrivi in `wallpapers\`:
```python
import os, glob, numpy as np
from PIL import Image, ImageFilter
SRC, OUT, CONTRASTO, COLORE = 'wallpapers-originali', 'wallpapers', 1.08, 1.15
for f in glob.glob(os.path.join(SRC, '*.jpg')):
    x = np.asarray(Image.open(f).convert('RGB')).astype(np.float32) / 255
    bp = 3 / 255; x = np.clip((x - bp) / (1 - bp), 0, 1)
    l = 0.2126*x[...,0] + 0.7152*x[...,1] + 0.0722*x[...,2]; m = l.mean()
    lc = np.clip(m + (l - m) * CONTRASTO, 0, 1)
    y = np.clip(x * np.where(l > 1e-4, lc / np.maximum(l, 1e-4), 1)[..., None], 0, 1)
    l2 = (0.2126*y[...,0] + 0.7152*y[...,1] + 0.0722*y[...,2])[..., None]
    y = np.clip(l2 + (y - l2) * COLORE, 0, 1)
    o = Image.fromarray((y * 255 + 0.5).astype(np.uint8)).filter(ImageFilter.UnsharpMask(radius=1.4, percent=35, threshold=2))
    o.save(os.path.join(OUT, os.path.basename(f)), quality=95, subsampling=0, optimize=True)
```

**Diagnosi dalla console della TV**, se hai accesso:
- `__CODEX_NATIVE_HOME__.version`
- `.events`
- `.keyLog`
- `.perf`
- `.soundInfo()`
- `.errors`
- `.vm`, l'istanza della Home

---

## 10. Lista finale da spuntare con Daniel
- [ ] Sulla TV la versione è `daniel-home-1.0`.
- [ ] Fluidità: almeno 50 fps e al massimo 2 scatti in 6 s in Home, barra laterale, Impostazioni e App. Numeri prima/dopo scritti in `CONSEGNA.md`.
- [ ] Tre lineette nella Home: aprono la barra laterale (codice fisso in `CONFIG.KEYS.SIDEBAR`).
- [ ] Tre lineette dentro Netflix e YouTube: aprono il pannello Impostazioni rapide, che si chiude con Indietro, con le tre lineette e da solo dopo 15 s.
- [ ] Saluto all'accensione: si vede sia a freddo sia dallo standby.
- [ ] Animazione del tasto Home: si vede tornando da Netflix, YouTube e HDMI. Mai all'accensione.
- [ ] Suoni: si sentono, uno solo per tasto; il suono di accensione è quello di Daniel, se l'ha fornito.
- [ ] Ogni voce del pannello rapido cambia davvero la TV, verificato con la tabella 6.3.
- [ ] Wi‑Fi e Bluetooth: liste vere, password e Connetti funzionano, sia dal pannello sia a schermo intero.
- [ ] Impostazioni a schermo intero: nessuna voce apre il vecchio pannello VIDAA, tranne "Apri impostazioni originali VIDAA".
- [ ] Colori: Daniel conferma che sulla TV sono vivi come nelle anteprime.
- [ ] Volume: capsula in vetro nella Home e dentro le app, numero giusto, niente indicatore originale doppio.
- [ ] Collaudo da prodotto finito (sezione 11) superato.
- [ ] `CONSEGNA.md` aggiornato con cosa è verificato, cosa è da collegare e cosa è da verificare.

---

## 11. Collaudo "da prodotto finito" (DA FARE TU sulla TV, voce per voce)
Daniel vuole un software per TV che si potrebbe vendere: nessun blocco, nessuno scatto, niente di strano. Ecco cosa è già stato collaudato nel browser e cosa devi rifare **sulla TV vera**.

### 11.1 Già collaudato nel browser (versione 1.0)
- **Visita automatica**:
  - ogni categoria delle Impostazioni, con OK su ogni riga e su ogni riga del sottolivello, poi Indietro
  - ogni pagina del pannello rapido
  - Wi‑Fi e Bluetooth con dati di prova
  - tastiera
  - volume nella Home e dentro un'app
- **Prova a tasti casuali**: 2.500 tasti a caso (frecce, OK, Indietro, menu) su Home, App, Impostazioni e Sfondi, con aperture di app e ritorni alla Home in mezzo. Risultato: nessun errore e la Home sempre visibile alla fine.
- **Raffica**: 60 frecce nello stesso istante. Nessun errore e nessun fuoco "impazzito".
- **15 cicli** "apri app, torna alla Home" di fila. Nessun errore e il numero di elementi della pagina resta stabile, quindi niente perdite di memoria.
- **Casi limite**: nessuna app installata; il servizio app che risponde con un errore; `localStorage` vietato; nessun audio (`AudioContext` e `Audio` assenti). In tutti i casi la Home resta usabile e senza errori di pagina.
- **Difetto trovato e corretto**: dopo molti "apri app / Home" velocissimi la Home poteva restare nascosta sotto il velo dell'animazione. Ora:
  - l'animazione riparte sempre
  - c'è una rete di sicurezza in `heartbeat` che dopo 6 s riporta la Home visibile e scrive `sicurezza: Home ripristinata` negli Eventi
- **Aspetto**: confronto al pixel con la versione 0.9 su Home, dock, App e Impostazioni. Identico, a parte l'orologio.

### 11.2 Da collaudare sulla TV (scrivi l'esito di ogni riga in `CONSEGNA.md`)
| Area | Prova | Atteso |
|---|---|---|
| Avvio | accensione a freddo, 5 volte | saluto ogni volta, poi Home con dock e app giuste |
| Standby | spegni e riaccendi dopo 30 s, poi dopo 10 min | saluto, nessuna Home "vuota", orologio giusto |
| App | apri 10 app diverse dalla Home | si aprono tutte al primo OK, nessun doppio avvio |
| Ritorno | tasto Home da 5 app diverse | animazione di ritorno ogni volta, fuoco sull'app da cui torni |
| Tasti | tieni premuta una freccia 5 s su dock, App, Impostazioni e barra laterale | scorre fluido, si ferma subito quando lasci |
| Tasti | OK tenuto premuto | apre una volta sola |
| Tasti | Indietro da ogni schermata | torna sempre al livello sopra, mai bloccato |
| Menu | tre lineette nella Home e dentro Netflix | barra laterale nella Home, pannello rapido nell'app |
| Pannello rapido | ogni voce, avanti e indietro | nessuna voce "morta"; quelle non collegate lo dicono in basso |
| Impostazioni | ogni categoria e sottopagina | nessuna pagina vuota né testo tagliato; Indietro funziona |
| Rete | Wi‑Fi sbagliato e poi giusto | messaggio di errore chiaro, poi "Connessa" |
| Volume | +, − e Muto in Home e app | capsula in vetro con numero giusto, nessun doppione |
| Suoni | frecce, OK, Indietro, accensione | si sentono, mai doppi, volume giusto |
| Salvaschermo | aspetta il tempo impostato | entra ed esce senza scatti |
| Sfondi | cambia sfondo e presentazione | dissolvenza morbida, colori vivi |
| Memoria | dopo 1 ora di uso (Home, app, Home…) | stessa fluidità dell'inizio ("Misura la fluidità" uguale) |
| Errori | Servizi della TV › errori (`__CODEX_NATIVE_HOME__.errors`) | vuoto dopo tutte le prove |
| Lingua | tutti i testi | in italiano, senza errori di battitura, niente testo che esce dai riquadri |

Per ogni riga che non passa: correggi, ripeti la prova e scrivi a Daniel cosa hai cambiato. **Non cambiare l'aspetto senza chiedere.**

---

## 12. Versione 1.1 (15 novembre 2026)

Leggi prima `AGGIORNAMENTO-1.1.md`. In breve:

- **Volume**
  - `isVolKey()` e `watchVolume()`: un tasto sconosciuto che cambia il volume vero (`biz.volume`) viene ricordato in `prefs.volKeys`.
  - I tasti del volume non vengono mai consumati e non entrano mai in `prefs.menuKeys`.
  - `CONFIG.VOL_VERIFIED` diventa `true` quando `tv11.cjs codici` ha letto i codici veri.
- **Tasto Home**: l'animazione di accensione parte solo con `control.introPlayed` falso (primo avvio) o con `o2n://sdk/str-resuming`. Una Home ricreata usa `playAppReturn`.
- **Suoni**: prima l'helper nativo `http://127.0.0.1:8772/<token>/play/<nome>/<percento>`, poi Web Audio. `soundInfo().nativo` dice quale dei due è attivo.
- **Installazione**: usa solo `tv-update/tv11.cjs`. Non riscrivere a mano la Home sulla TV.
- **Diagnosi**: il risultato di `node tv11.cjs diagnosi` contiene `keyLog`, eventi e `perf`. Va letto prima di ogni modifica.
