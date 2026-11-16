# Daniel Home 1.7: tutto il design "Ultimate TV OS" nel codice

Data: 16 novembre 2026. Parte dalla 1.6 installata (copia in `strumenti\tv-1.7\native-home-1.6-prima.js`).

> **Stato:** provata sul PC (prove in memoria + foto del simulatore con Edge). **Da installare e provare sulla TV.**

Anteprime di tutte le schermate: `anteprime\v1.7\` (`00-tutte.jpg` le mostra insieme).

## Cosa cambia, tavola per tavola

| Tavola | Prima | 1.7 |
|---|---|---|
| 00 Linguaggio | Fuoco 1.06, nessun accento | Fuoco **1.14** con riflesso in diagonale, accento arancione `#F08A5D` (interruttori, Connetti), 180 ms |
| 11 Home | Titolo sottile 76 px, pulsante "Mostra sfondo" al centro | Titolo **96 px grassetto**; niente pulsante: dalla barra in alto ▲ ancora mostra solo lo sfondo (scritta in basso a destra); rimbalzo di 6 px a fine riga |
| 12 / 42 Barra laterale | (1.6) | Invariata dalla 1.6: la Home si stringe a destra |
| 14 / 43 Nascondi app | (1.6) | Invariata dalla 1.6 |
| 15 Sorgenti | Pannello laterale | **Schermata a schede** in vetro (3 per riga), pallino verde col segnale, scheda selezionata bianca; si apre da barra in alto, barra laterale e Centro di controllo |
| 20 / 44 Impostazioni | Pagine che cambiavano di colpo, "Sì/No" scritti | La pagina nuova **scorre da destra** (indietro da sinistra, 360 ms), l'icona grande cambia in dissolvenza con zoom, **interruttori a levetta** arancioni |
| 21 Regolazioni | Solo "◀ ▶" nella riga | Il menu si ritira e compare **la barra in basso** con il valore, per vedere l'effetto sull'immagine |
| 30 / 42 Centro di controllo | "Impostazioni rapide" a sinistra | **Pannello a destra** con intestazione, **4 pulsanti tondi** (Sorgenti, Wi‑Fi, Bluetooth, Timer) che spuntano in cascata, Immagine, Suono, Connessione, Retroilluminazione, Tutte le impostazioni |
| 31 / 46 Volume | Capsula spenta | **Capsula del design accesa** (alta, numero in basso), entra in 240 ms ed esce in 400 ms |
| 03 Apertura app | Puntini | OK abbassa l'icona per 100 ms, il **logo respira**, dopo 4 s compare **la linea di attesa**, dopo 10 s la finestra "**X non risponde**" con Riprova |
| 04 / 02 Ritorno e accensione | Home che sale tutta insieme | Le **icone arrivano in cascata** (40 ms l'una) |
| 41 Cambio sezione | Contenuto dal basso | Il contenuto arriva **dal lato** della scheda scelta (±40 px, 420 ms) |
| 45 Tastiera Wi‑Fi | Connetti blu | Connetti **arancione**, l'ultima lettera resta visibile 0,7 s prima di diventare pallino, **il campo scuote** se la password è sbagliata |
| 32 Salvaschermo | Ora 148 px sottile | Ora 160 px come nel design |
| 33 Sfondi | Titolo sottile | Titolo in grassetto |
| Barra laterale | "Impostazioni rapide" | "Centro di controllo" |

## Differenze dal design (non si possono fare o ho scelto di non farle)

- **Pulsante "Spegni" nel Centro di controllo:** nel codice e nei dati della TV non c'è nessun modo di spegnere la TV dalla Home. Al suo posto c'è **Sorgenti** (dentro le app restano Wi‑Fi, Bluetooth e Timer).
- **Animazione di spegnimento (tavola 48):** per lo stesso motivo non si può agganciare.
- **Saluto al risveglio dallo standby:** il design lo voleva solo all'accensione a freddo. Sulla TV quasi ogni accensione è un risveglio, quindi l'ho lasciato: altrimenti non lo vedresti quasi mai. Si cambia con una riga.
- **Volume:** la nostra capsula è accesa, ma l'indicatore VIDAA non si può spegnere: compaiono tutti e due.
- **Tre lineette dentro le app:** dipendono da come la TV passa il tasto (vedi 1.2), non dal design.
- **Lastre di vetro mentre le icone caricano (tavola 49):** non fatte, la TV non dice alla Home quando un'immagine è pronta.
- **Scelta di un valore (tavola 21, elenco con la spunta):** resta una pagina che scorre, non un pannello a destra.

## Prove sul PC

- `strumenti\tv-1.6\prova-1.6.js` (Node + Vue 2.7 in memoria): **25 controlli superati**, prova casuale da 2500 tasti senza errori.
- Foto con Edge di 16 schermate (`simulatore.html?raw=1&scena=...`, scene nuove: `app`, `impostazioni`, `immagine`, `regola`, `rapide`, `sorgenti`, `cerca`, `sfondi`, `salvaschermo`, `volume`, `finestra`, `apertura`).
- Nel simulatore il Centro di controllo registra un errore "network": è la lettura dello stato Wi‑Fi della TV, che nel simulatore non esiste. Sulla TV la stessa lettura si faceva già entrando in Connessione.

**Non verificato:** fluidità sulla TV (fuoco a 1.14 e cascate), pulsanti tondi con i dati veri di Bluetooth e Timer.

## Ripristino

Rimettere `strumenti\tv-1.7\native-home-1.6-prima.js` al posto di `native-home.js` e reinstallare, oppure `node tv12.cjs ripristina`.

## 1.7.1 (16 novembre 2026, dopo la prova sulla TV)

- **Prima icona del dock tagliata a sinistra:** con l'ingrandimento a 1.14 il riquadro usciva di 18 px dalla zona visibile del dock (che lasciava 14 px). Ora i margini sono 26 px per lato. Verificato con la foto del simulatore.
- **Volume doppio:** la capsula è di nuovo spenta di serie (una volta, `migr171`), resta l'indicatore VIDAA. La capsula che copre quella VIDAA richiede la foto dell'indicatore originale per conoscerne posizione e misure.
- **Blocco subito dopo l'installazione (pannelli aperti, tasti fermi):** non si riproduce nella Home, né all'accensione col saluto né premendo OK subito. Succede quando `attiva` ricarica tutta l'interfaccia mentre sulla TV è aperto il browser. D'ora in poi si installa con `installa` + `conferma` (senza ricaricare) e poi si spegne e riaccende la TV.
- **Suoni:** il codice dei suoni è identico alla 1.6 e l'altoparlante nativo risponde (12 suoni riusciti, 0 errori dopo la riaccensione). Da capire con una prova sulla TV.
- Installatore: accetta la 1.7 come base e i numeri di versione a tre cifre.
