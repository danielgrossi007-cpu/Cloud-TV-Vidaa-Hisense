# OS definitivo TV — consegna

## Versione 1.7 (16 novembre 2026, provata sul PC: da installare)

Tutto il design "Ultimate TV OS" nel codice: Sorgenti a schede, Centro di controllo a destra con pulsanti tondi, interruttori a levetta, barra di regolazione, capsula del volume, fuoco 1.14 con riflesso, pagine che scorrono, icone in cascata, apertura app con logo che respira e "non risponde". Dettagli e differenze in `AGGIORNAMENTO-1.7.md`, foto in `anteprime\v1.7\`.

## Versione 1.6 (16 novembre 2026, installata e confermata sulla TV)

Dettagli in `AGGIORNAMENTO-1.6.md`. Parte dalla `daniel-home-1.5` presente in cartella (copia in `strumenti\tv-1.6\native-home-1.5-prima.js`).

| Punto | Stato |
|---|---|
| Barra laterale: la Home si stringe a destra invece di essere coperta | Fatto, provato in memoria. Da guardare sulla TV (fluidità). |
| Nascondi app: occhi a onda, app nascoste al 32%, "Fine" con riordino animato | Fatto, provato in memoria. |
| Saluto bianco a tratto tondo, stile "hello" di iPhone | Fatto. Da vedere sulla TV. |
| Avvisi che scendono dall'alto, finestre da 0.92 | Fatto. |
| Prova casuale da 2500 tasti | Nessun errore (PC). |

## Versione 1.1 (15 novembre 2026, preparata: NON ancora installata sulla TV)

Dettagli e procedura in `AGGIORNAMENTO-1.1.md`.

| Punto | Stato |
|---|---|
| Volume + apriva il menu | Corretto e provato sul PC. Sulla TV va provato. I tasti del volume non diventano mai tasto del menu, passano sempre alla TV e vengono riconosciuti da soli guardando il volume vero. |
| Capsula del volume in vetro | Provata sul PC (Home e sopra un'app). Sulla TV va provata. |
| Tasto Home rifaceva l'animazione di accensione | Corretto e provato sul PC: torna la correzione `introPlayed` della 0.9, persa nella 1.0. Sulla TV va provato. |
| Suoni | Preparato: usa l'altoparlante nativo locale verificato il 12/11 (porta 8772). Se si sente va confermato sulla TV. |
| Impostazioni native di ChatGPT | Mantenute: la 1.1 parte dalla 1.0 installata. |
| Installazione | Strumenti `tv11.cjs` con diagnosi in sola lettura, backup, guardiano di 15 minuti e ripristino. |

## Aggiornamento del 15 novembre 2026

- `native-home.js` 1.0 integra ora le voci native di Immagine, Suono, Accessibilità, Sistema e Canali, oltre al pannello rapido, alla scansione Wi‑Fi/Bluetooth e alla lettura del volume. I componenti grafici originali del progetto sono rimasti invariati.
- Il codice è stato verificato come ES5 e con prove locali di lettura/scrittura, opzioni native, scansione Wi‑Fi e gestione dell'assenza delle API. Le prove precedenti sulla TV avevano confermato scrittura e rilettura di luminosità e contrasto, poi ripristinate. Gli altri collegamenti richiedono una nuova prova sulla TV.
- L'indicatore del volume legge le API trovate nei dati della TV; la sostituzione dell'indicatore originale resta disattivata finché non si verifica che il cambio volume funzioni dal telecomando.
- **Installata sulla TV il 15 novembre 2026.** La SystemUI ha caricato `daniel-home-1.0` nella rotta `/0/Launcher`, senza errori JavaScript iniziali. Risoluzione 1920×1080, scala 1. Sono state copiate e controllate 111 risorse: 33 sfondi elaborati, 33 miniature, icone app e avatar. Gli sfondi originali non sono stati copiati. Il file precedente è salvato in `/APPS/codex-home10-1794767846295-home10/previous-app.js`; il controllo di ripristino ha confermato l'installazione (`committed`).
- **Ancora da collaudare sulla TV:** fluidità nelle quattro schermate, tre lineette dentro Netflix/YouTube, suoni udibili, tutte le impostazioni native, connessione Wi‑Fi/Bluetooth, indicatore del volume dentro le app, avvio a freddo e standby. La sostituzione dell'indicatore volume originale resta disattivata fino alla prova del cambio volume.

File principale: `native-home.js` (versione interna 1.0). Si aggiorna sempre questa cartella, senza crearne altre.

## Versione 1.0 (15 novembre 2026)

Per completare e verificare tutto sulla TV c'è **`ISTRUZIONI_CHATGPT.md`**: va dato a ChatGPT così com'è.

| Cosa | Stato |
|---|---|
| **Più fluida, aspetto identico.** Ogni zona (sfondo, schermata, pannelli) e ogni riga o riquadro si ridisegna solo se cambia: spostare il fuoco ridisegna 2 elementi invece di tutti. Nel browser con CPU rallentata: barra laterale e pannello rapido circa 2,5 volte meno lavoro per tasto, Impostazioni e App circa 1,7 volte, dock circa uguale. Confronto al pixel con la 0.9 identico. Le frecce tenute premute non accumulano più ritardo e i suoni sono decodificati in anticipo. | Fatto, da misurare sulla TV (Servizi della TV › Misura la fluidità) |
| **Tre lineette nella Home:** la prima volta premile due volte di fila e diventano il tasto che apre la barra laterale. | Fatto, da provare |
| **Tre lineette dentro le app** (pannello rapido): dipende da come la TV passa il tasto. Ora c'è il registro tasti completo e l'aggancio al menu originale. | ChatGPT (istruzioni, sezione 3) |
| **Animazione di accensione e del tasto Home:** aggiunti più segnali (standby, visibilità, rotte, tasto Home) e un registro Eventi per capire cosa arriva sulla TV. Corretto un caso in cui la Home poteva restare nascosta. | Fatto, da verificare (sezione 4) |
| **Wi‑Fi, Bluetooth e password a schermo intero** dentro Impostazioni › Connessione, nello stile delle Impostazioni grandi. | Fatto, liste vuote finché non è collegata la rete |
| **Tastiera della password rifatta:** campo con lucchetto e contatore, tasti in vetro, riga di comandi con icone, pulsante Connetti blu. Tolta la scritta "Indietro per annullare". | Fatto |
| **Colori più vivi sulla TV:** 33 sfondi rifatti (neri più profondi, contrasto +8%, colore +15%, qualità alta). Originali in `daniel-home-assets\wallpapers-originali\`. | Fatto |
| **Indicatore del volume in vetro** (capsula arrotondata a destra, nella Home e dentro le app) | Fatto, compare quando ChatGPT collega il volume (sezione 8 bis) |
| **Suoni sulla TV** | ChatGPT (sezione 5) |
| **Impostazioni collegate davvero alla TV** | ChatGPT (sezione 6) |
| **Collaudo automatico:** 2.500 tasti a caso, nessuna app, servizio app in errore, memoria vietata, nessun audio, 15 cicli app-Home: nessun errore. | Fatto nel browser; collaudo sulla TV nella sezione 11 |

Anteprime in `anteprime\v1.0\`.

## Versione 0.9

| Cosa | Dove |
|------|------|
| **Nascondi app al centro**: ora è un tasto centrato in una riga sua, tra la barra delle preferite e la griglia (24 px sopra, 32 px sotto). Navigazione in colonna: preferite ↓ Nascondi app ↓ griglia, e torna alla stessa app quando risali. In modalità nascondi la spiegazione sta a sinistra sulla stessa riga. | App |
| **Niente app tagliata nella barra**: la barra delle preferite mostra solo le 6 app che entrano per intero; se ce ne sono altre compare una piccola freccia discreta sul bordo (‹ o ›). | App |
| **Ritorno alla Home col tasto Home (da Netflix ecc.)**, stile Apple: appena apri un'app la Home si prepara già nascosta, così al ritorno non si vede lo stacco della TV. Dal nero si passa in un attimo a un vetro scuro molto sfocato con i colori del tuo sfondo; la sfocatura si scioglie piano, lo sfondo si assesta e la Home emerge da sfocata a nitida (circa 2 s). Niente cerchi o effetti grafici. **Non parte all'accensione.** Frame in `anteprime/transizione-home/`, codice da leggere in `transizione-home.js`. | Home |
| **Suoni**: ricampionati a 48 kHz (prima erano a 11/22 kHz, frequenze che il motore della TV potrebbe rifiutare), funzionano anche se la TV non ha il controllo del volume nel Web Audio (volume applicato ai suoni stessi), e se la decodifica fallisce si passa all'altro metodo. Nuova voce **"Prova i suoni"**: suona e ti dice a schermo se la TV lo ha accettato o l'errore preciso. | Personalizzazione > Suoni e animazioni |
| **Più fluida, stessa grafica**: gli scorrimenti (dock, griglia App, liste delle Impostazioni e della barra laterale) ora si muovono con trasformazioni gestite dalla scheda grafica invece di ricalcolare la pagina a ogni fotogramma; l'alone bianco attorno all'app selezionata compare in dissolvenza invece di essere ridisegnato a ogni fotogramma. Confronto pixel per pixel prima/dopo: identico. | Ovunque |

| **Invia i dati della TV al PC** (per collegare tutte le impostazioni vere): sul PC avvia `strumenti\ricevi_dati_tv.py` (doppio clic), scrive l'indirizzo da usare. Sulla TV: Impostazioni › Supporto › Servizi della TV › Indirizzo del PC, poi **Invia i dati della TV al PC**. I file arrivano in `strumenti\dati-tv\`. Solo lettura, non cambia nulla sulla TV. Nella stessa pagina: **tasti ricevuti mentre eri fuori dalla Home** (serve a capire se il tasto con le tre lineette arriva quando sei in Netflix). | Impostazioni › Supporto |
| **Suoni lo-fi** (approvati): freccia, OK, Indietro e salvaschermo sono a strati come una base lo-fi (colpetto ovattato, basso caldo, pad, piano elettrico, fruscio di vinile ed eco morbida); accensione e Home sono accordi di piano elettrico chill. Volume generale più basso. Il suono della freccia non si ripete più due volte. I file per ascoltarli sono in `suoni\`. | Ovunque |
| **Impostazioni rapide** (nuovo): pannello Liquid Glass a sinistra con Immagine (modalità, retroilluminazione, luminosità, contrasto, colore, nitidezza, ripristino, IA, proporzioni), Suono (modalità, sorgenti, Dolby Atmos, volume automatico, ripristino), Connessione (rete attuale, Mostra reti con tastiera password, AirPlay e HomeKit, Bluetooth e dispositivi) e in fondo "Apri impostazioni originali VIDAA". Si apre dalla barra laterale, con i tre trattini, e dentro le app. Wi‑Fi e Bluetooth di Impostazioni › Connessione aprono questi pannelli. **Ancora da collegare alla TV:** i valori per ora restano salvati nella Home e le liste reti/Bluetooth sono vuote finché non mi mandi i dati della TV (Servizi della TV › Invia i dati della TV al PC, con `strumenti\ricevi_dati_tv.py` acceso). Le anteprime Wi‑Fi/BT in `anteprime\impostazioni-rapide\` usano reti finte. | Barra laterale, tasto menu, dentro le app |
Da verificare sulla TV: se senti i suoni (se no, dimmi cosa scrive "Prova i suoni"); che la Home riceva la "pausa" quando apri un'app (se la TV non la manda, l'animazione parte solo al ritorno, con un attimo di Home visibile prima).

## Versione 0.8

| Cosa | Dove |
|------|------|
| **Sfondi animati**: ogni sfondo ha anche una versione animata, leggera (solo movimenti e dissolvenze, niente video): nebbia che scorre sui paesaggi, stelle che brillano sugli sfondi dello spazio, luci sfocate che salgono sulle città, riflessi sull'acqua, neve sulla Patagonia, macchie di luce sugli astratti; sotto, lo sfondo si muove piano (zoom lento). | Sfondi > selettore in alto a destra **Sfondi / Sfondi animati** |
| **Avatar nuovi**: solo le 25 foto della tua cartella `avatar` (le vecchie sono state tolte). | Menu laterale > profilo, o Personalizzazione > Avatar |
| **10 sfondi nuovi**: Alba dalla Terra, Dune del Sahara, Fiordo del sole di mezzanotte, Fiumi d'Islanda, Foresta sottomarina, Giardino dei coralli, Golden Gate all'ora blu, Hawaii all'alba, Hong Kong notturna, Patagonia di ghiaccio. | Sfondi |

Da verificare sulla TV: le animazioni CSS sugli sfondi (se la TV non le supporta, lo sfondo resta fermo, senza errori). Con "Animazioni ridotte" attivo gli sfondi animati restano fermi.

## Versione 0.7
Cartelle: `daniel-home-assets/` (sfondi, icone app, avatar), `suoni/` (i suoni in .wav, già incorporati nel js: servono solo se vuoi ascoltarli), `anteprime/` (screenshot dal browser).

## Novità

| # | Cosa | Dove |
|---|------|------|
| 1 | **Nascondi app** (non le elimina): tasto "Nascondi app" sopra la griglia di App. OK su un'app la nasconde/mostra, "Fine" o Indietro salva. Anche da Impostazioni > Applicazioni > (app) > "Nascosta in Tutte le app". | App |
| 2 | **Menu laterale alleggerito**: Cerca app, Home, App, TV in diretta, Sorgenti, Store VIDAA, Browser, Sfondi, Impostazioni + App più usate. Niente più voci doppie. | Sidebar |
| 3 | **Bug telecomando** (Home che apre gli avatar e viceversa): era l'OK ripetuto o lo stesso OK che apriva il pannello e attivava una voce. Ora l'auto-ripetizione dell'OK è ignorata e per 350 ms dopo l'apertura di un pannello l'OK non attiva nulla. | Ovunque |
| 4 | **Tasto menu (tre linee) → menu laterale**: dalla guida VIDAA il tasto Menu è un "tasto di sistema" che la TV di solito non passa alle app. Ho aggiunto il riconoscimento del tasto Menu e in più **"Impara tasto"**: Impostazioni > Personalizzazione > Telecomando > "Tasto per aprire il menu laterale", poi premi il tasto che vuoi (tre linee se arriva, altrimenti un tasto colorato o un altro). | Personalizzazione |
| 5 | **Animazione ritorno Home**: sfondo che parte zoomato e sfocato e si mette a fuoco, contenuto che entra con zoom e dissolvenza, suono "home". | Home |
| 6 | **Suoni stile Apple**: spostamento, OK, indietro, ritorno home, accensione, salvaschermo. Attivabili e con volume (basso/medio/alto). | Personalizzazione > Suoni e animazioni |
| 7 | **Salvaschermo**: dopo 5/10/15/30/60 minuti senza tasti (o disattivato): sfondo con lento zoom, orologio grande, data in italiano, nome dello sfondo. Entra ed esce con animazione; qualsiasi tasto lo chiude. "Prova il salvaschermo" per vederlo subito. | Personalizzazione > Suoni e animazioni |
| 8 | **Animazione di accensione** (rifatta): dal nero della TV nascono i colori del tuo sfondo (come inchiostro nell'acqua), si fondono nello sfondo vero leggermente sfocato, poi il saluto in vetro trasparente si scrive da solo: Buongiorno (5–12), Buon pomeriggio (12–18), Buonasera (18–5). Resta lì con "Premi OK" finché non premi OK: allora il saluto sale e svanisce, lo sfondo si mette a fuoco e compaiono le icone. Frame in `anteprime/accensione/` (01–12 accensione, 13–17 dopo OK). | Personalizzazione > Suoni e animazioni |
| 9 | **Immagine: Dinamica e Dinamica AI** aggiunte alle modalità, più l'interruttore "Ottimizzazione immagine AI". | Impostazioni > Immagine |
| 10 | **Servizi della TV**: pagina che elenca quello che la TV espone (lettura soltanto, non cambia nulla). Mi serve per collegare le impostazioni vere. | Impostazioni > Supporto |

## Risposte alle tue domande

- **App Store VIDAA personalizzabile?** No. È un'app di sistema separata: dalla Home possiamo solo aprirlo, non cambiarne la grafica.
- **Rendere più fluide Prime, YouTube, Netflix, Disney+, RaiPlay, Mediaset, Paramount?** No dalla Home: quando un'app è aperta gira lei, con il suo motore, e la nostra Home è in pausa. Si può solo evitare che la Home pesi (all'apertura di un'app timer e animazioni si fermano).
- **Personalizzazione o Sfondi?** Sfondi (nel menu laterale) = scegli l'immagine di sfondo. Personalizzazione (in Impostazioni) = tutto il resto della Home: nome, avatar, dock, suoni, animazioni, salvaschermo, tasto menu.
- **Impostazioni che cambiano davvero con la nostra grafica**: la grafica c'è e i valori si salvano, ma per scriverli sulla TV mi servono i nomi veri dei servizi. Apri **Impostazioni > Supporto > Servizi della TV**, fai una foto alle pagine e mandamela: collego le voci una per una. Finché non sono collegate, le voci restano nella Home e non cambiano la TV (non apro più il menu VIDAA, come chiesto, tranne le voci senza grafica che lo propongono con un avviso).
- **Icone sfocate o non centrate**: sono le app che non hanno un'icona mia, per cui la TV usa la sua immagine originale allungata. Mandami il nome esatto di quelle app (o le icone) e le aggiungo nel formato giusto.

## Stato

| Operativo (provato nel browser) | Da collegare | Da verificare sulla TV |
|---|---|---|
| Nascondi app, sidebar, filtri OK ripetuto | Scrittura vera delle impostazioni (serve foto Servizi della TV) | Suoni su Cobalt (WebAudio o audio HTML) |
| Animazioni Home, accensione con saluto, salvaschermo | Icone delle app ancora senza icona personalizzata | Sfocatura (se la TV non la supporta resta solo lo zoom, senza errori) |
| Impara tasto per il menu laterale | | Se il tasto Menu (tre linee) arriva alla Home |
| Modalità immagine Dinamica / Dinamica AI (salvate nella Home) | | Animazione al risveglio dallo standby |
| Pagina Servizi della TV | | Salvaschermo: funziona solo mentre è aperta la Home, non durante un'app o un film |

Nessun errore JavaScript nelle prove; codice ES5 verificato.

Font del saluto: Sacramento (Google Fonts, licenza SIL Open Font License), incorporato nel file.
