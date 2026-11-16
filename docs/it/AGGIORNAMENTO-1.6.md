# Daniel Home 1.6: animazioni dal progetto "Ultimate TV OS"

Data: 16 novembre 2026. Parte dal `native-home.js` presente in cartella (versione interna `daniel-home-1.5`). Copia di quella versione: `strumenti\tv-1.6\native-home-1.5-prima.js`.

> **Stato:** provata sul PC (in memoria con Vue 2.7). **Non installata e non provata sulla TV.** Installazione con la stessa procedura della 1.2 (`AGGIORNAMENTO-1.2.md`, passi 2–7).

Progetto grafico di riferimento: canvas "Ultimate TV OS" (tavole 12, 14, 10, 42, 43, 46, 49).

## Cosa cambia

| Dove | Prima | 1.6 |
|---|---|---|
| **Barra laterale** | Si apriva sopra la Home: copriva le prime icone e il titolo dello sfondo spariva. | Tutta la Home (titolo, dock, HDMI) si stringe al 75% e scivola a destra mentre la barra entra da fuori schermo. Nessuna icona sparisce. Apertura 460 ms con la molla, chiusura 340 ms. Velo dietro più leggero. |
| **Nascondi app: entrata** | Gli occhi comparivano di colpo. | Gli occhi spuntano a onda (15 ms l'uno, molla 320 ms). L'app nascosta prende l'occhio sbarrato e si spegne al 32% (prima 50%). |
| **Nascondi app: "Fine"** | Le app nascoste sparivano e la griglia saltava. | Fase 1 (260 ms): occhi e app nascoste si rimpiccioliscono e svaniscono, i tasti sono ignorati. Fase 2 (360 ms): le altre app scivolano nei posti liberi. I riquadri della griglia ora si posizionano con `transform`, quindi lo spostamento non ricalcola la pagina. |
| **Saluto all'accensione** | Scritta "a tubo di vetro" lucida. | Bianco pieno, tratto uniforme e tondo, come l'"hello" di iPhone (stesso font Sacramento, ingrossato). Immagini 420 px di altezza, scrittura da sinistra a destra come prima. |
| **Avvisi** | Comparivano di colpo, al centro in alto, sopra il titolo dello sfondo. | In alto a destra sotto l'orologio (non coprono più il titolo), scendono in 320 ms con la molla. |
| **Finestre** (es. Spegnere?) | Partivano da 0.96. | Partono da 0.92 e crescono con la molla in 280 ms. |
| Versione | `daniel-home-1.5` | `daniel-home-1.6` |

Non toccati, perché già decisi sulla TV: animazione di ritorno alla Home leggera della 1.2 (senza sfocature), durate del fuoco (120 ms), salvaschermo, apertura app. Nella Home il dock era già centrato e senza nome sotto l'app.

## Prove sul PC

`strumenti\tv-1.6\prova-1.6.js` (Node + Vue 2.7 in memoria, 18 app finte): **25 controlli superati, 0 falliti**.

- Barra laterale: Home a 0.75 e spostata di 490 px, molla 460 ms, chiusura 340 ms, pannello smontato solo a fine uscita.
- Nascondi app: 18 occhi con ritardi 0, 15, 30… ms; 2 app nascoste al 32%; fase 1 e fase 2 con i tempi giusti; 16 app dopo "Fine"; avviso "2 app nascoste".
- Avviso con animazione di entrata, finestra da 0.92, saluto nuovo caricato.
- Prova casuale da 2500 tasti: nessuna eccezione, registro errori vuoto.
- Sintassi valida; le righe nuove sono ES5.

Anteprime in `anteprime\v1.6\` (foto del simulatore con Edge a 1920×1080): Home, barra laterale aperta, Nascondi app, dopo "Fine", saluto, avviso. Si rifanno con `simulatore.html?raw=1&scena=home|barra|nascondi|riordinata|saluto|avviso`.

**Non verificato:** la fluidità sulla TV. La Home che si stringe muove un solo livello con `transform`: va guardato sulla TV che non scatti (Servizi della TV › Misura la fluidità, con la barra aperta e chiusa più volte).

Simulatore nel browser: `strumenti\tv-1.6\simulatore.html` (dalla cartella "OS definitivo TV": `python -m http.server 8790`, poi `http://localhost:8790/strumenti/tv-1.6/simulatore.html`; frecce, Invio = OK, Backspace = Indietro).

## Ripristino

Rimettere `strumenti\tv-1.6\native-home-1.5-prima.js` al posto di `native-home.js`, oppure `node tv12.cjs ripristina` sulla TV.
