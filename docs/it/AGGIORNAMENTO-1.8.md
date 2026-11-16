# Daniel Home 1.8: Centro di controllo e volume anche dentro le app

Data: 16 novembre 2026. Parte dalla 1.7.1 (copia della 1.7 in `strumenti\tv-1.7\native-home-1.7-prima.js`).

> **Stato:** provata sul PC (prove in memoria e con una pagina finta della TV, foto del simulatore). **Da installare e provare sulla TV.**

## La causa dei problemi dentro Netflix e del volume invisibile

Dai registri della TV: quando apri un'app la SystemUI **distrugge la Home** e la ricrea quando torni (evento "Home caricata" a ogni ritorno).

- Dentro Netflix non restava niente di nostro: l'aggancio della pagina delle tre lineette trovava la Home vuota e lasciava passare il menu VIDAA (registro delle 06:30: `/4/appControl > /13/setting/quickSetting`, nessuna sostituzione).
- La capsula del volume si disegnava in un livello legato alla **prima** Home: dopo il primo ritorno da un'app quel livello guardava una Home che non c'era più, quindi la capsula non si vedeva mai.

## Cosa cambia

| Problema | 1.8 |
|---|---|
| Tre lineette dentro Netflix/YouTube aprono il menu VIDAA | Nuovo **livello permanente** (nasce una volta, figlio della radice della SystemUI, sopravvive alla Home). Quando la TV va sulla pagina `…/setting/quickSetting` sopra un'app, la rotta prosegue (così la TV dà schermo e tasti alla SystemUI) ma al posto del menu VIDAA c'è una pagina vuota e sopra il **nostro Centro di controllo**. Frecce e OK lo comandano, Indietro (o di nuovo le tre lineette) lo chiude e si torna all'app, il tasto Home lo chiude e va alla Home. Si chiude da solo dopo 15 s. Nella Home le tre lineette aprono il pannello della Home come prima. |
| Volume: la nostra capsula non si vede, quella VIDAA sì | La capsula la disegna il livello permanente, **nella Home e dentro le app**. Dentro le app, se la TV non passa il tasto, il volume si legge 4 volte al secondo e la capsula compare comunque con il valore vero. Capsula di nuovo accesa (una volta, `migr18`). |
| Indicatore VIDAA sotto la nostra capsula | Al primo tasto del volume la Home cerca nella pagina il riquadro VIDAA che mostra lo stesso numero, lo **nasconde** con una regola CSS e ricorda come trovarlo (evento "indicatore VIDAA trovato e nascosto" con misure e posizione). Se non è nella pagina (disegnato dalla TV fuori dalla SystemUI) l'evento dice "non trovato": allora serve la capsula più grande che lo copre, con le misure lette sulla TV. |
| Prima icona tagliata a sinistra | (1.7.1) margini del dock 26 px per lato. |
| Luce bianca dentro l'icona a fuoco | Tolto il riflesso in diagonale sulle app. Tolta anche la striscia di luce che scorreva sulla schermata di apertura e sul ritorno. |
| Scritta "▲ ancora dalla barra in alto: solo lo sfondo" | Tolta (▲ dalla barra in alto mostra ancora solo lo sfondo). |
| Sfondi: la miniatura ingrandita esce dal riquadro | Zona delle miniature più alta (30 px di margine), ingrandimento 1.1 come le card di Apple TV. |
| Ritorno alla Home uguale a prima | Come la tavola 04: vetro con i colori dello sfondo (la miniatura dello sfondo ingrandita, già sfocata, niente filtri dal vivo) che si assesta e si scioglie in 0,7 s mentre le icone arrivano in cascata; **il fuoco torna sull'app appena chiusa**. |
| Versione | `daniel-home-1.8` |

## Installazione

Si installa **senza ricaricare** l'interfaccia (`installa` + `conferma`), poi si stacca la spina della TV per 30 secondi. Lo standby non basta: al risveglio la TV riprende la Home già in memoria (per questo dopo lo standby si vedeva ancora la 1.7: l'evento "Home caricata" viene dalla Home vecchia ricreata, non da un file nuovo).

## Prove sul PC

- `strumenti\tv-1.7\prova-1.8.js` (Node + Vue 2.7 + jsdom, SystemUI finta con router e tasti): **29 controlli superati**. Livello creato una volta sola anche dopo la ricreazione della Home; capsula accesa nella Home e nell'app; volume cambiato senza tasto; pagina VIDAA sostituita da quella vuota; frecce consumate dal pannello; Indietro e tre lineette chiudono e tornano a `/4/appControl`; tasto Home; nella Home la rotta è bloccata; indicatore VIDAA finto trovato e nascosto.
- `strumenti\tv-1.6\prova-1.6.js`: 25 controlli superati.
- Foto del simulatore: Home senza riflesso e senza scritta, Sfondi con la miniatura intera, capsula del volume sul livello.

## Da verificare sulla TV

- Che il livello si veda sopra Netflix (la SystemUI deve essere visibile sopra l'app quando è sulla pagina delle tre lineette: lo è per il menu VIDAA, quindi dovrebbe).
- Che la TV mandi le frecce alla SystemUI mentre è sulla pagina delle tre lineette.
- L'evento "indicatore VIDAA trovato/non trovato" dopo il primo tasto del volume.
- Che la pagina finta torni davvero all'app con "indietro" della TV (se no, si torna con `replace` verso la rotta dell'app).
- Suoni: il codice è uguale alla 1.6 e l'altoparlante risponde (39 suoni riusciti, 0 errori): da capire se si sentivano con la 1.6.

## Ripristino

`node tv12.cjs ripristina`, oppure rimettere la copia della versione precedente e reinstallare.

## Seconda parte (16/11, dopo la prova sulla TV delle 11:20)

Visto sulla TV: capsula del volume su Netflix ok; nella Home spuntano gli angolini di quella VIDAA; animazioni di apertura e ritorno brutte; suoni assenti; tutto troppo lento.

Letto sulla TV (sonda di sola lettura, `probe17*.cjs`, foto con `foto17.cjs`):
- Indicatore VIDAA = `div.volume-bar` della SystemUI, fisso a x 1776, y 300, 96×480. Si nasconde con CSS (`CONFIG.VIDAA_VOL`).
- Pagina delle tre lineette = `/13/setting/quickSetting` (foglia singola). Esiste anche `/11/PowerDialog` (finestra di spegnimento VIDAA).
- Altoparlante nativo dei suoni spento dopo che la TV è stata staccata (`ECONNREFUSED`): per questo non si sentono i suoni.
- La pagina di collegamento lavora solo se il browser è davanti: quando la TV ricarica l'interfaccia la pagina si ferma, la conferma non arriva e il guardiano rimette il file precedente dopo 15 minuti (successo alle 11:31: in memoria 1.8, file 1.7.1).

| Problema | Correzione |
|---|---|
| Lentezza | **Home permanente**: la rotta `/Launcher` mostra solo un guscio vuoto; la Home vera nasce una volta (livello fisso, z 500, sotto gli avvisi VIDAA) e viene solo mostrata o nascosta. Prima la SystemUI la distruggeva e ricostruiva a ogni ritorno da un'app. Se non si riesce a crearla, il guscio disegna la Home come prima. |
| Apertura app | L'icona vola piano dal dock al centro sopra lo **sfondo sfocato** e respira; l'app parte a 320 ms; quando l'app è partita la schermata resta ~1 s a coprire il caricamento, poi l'icona si allarga e svanisce sull'app. Niente più schermata col colore del marchio. |
| Ritorno alla Home | Sfondo sfocato con l'icona dell'app al centro, che **rientra nel suo posto del dock** mentre lo sfondo torna nitido. Parte subito (40 ms), finisce in 0,8 s. |
| Angolini VIDAA nella Home | Capsula 112×490 con angoli da 22 px sopra l'indicatore VIDAA (lo copre anche se la TV lo disegnasse); regola CSS attiva dall'avvio. Dock 200 px e più in basso (non tocca la capsula). |
| Saluto | Torna quello della 1.5: tubo di vetro trasparente, come "hello". |

Prove: `strumenti\tv-1.7\prova-1.8.js` (jsdom, SystemUI finta con guscio, router con `afterEach`): **41 superati** (Home non ricreata, nascosta nell'app, schermata di apertura sopra l'app mentre carica, ritorno sotto 1 s). `strumenti\tv-1.6\prova-1.6.js`: 25 superati.

Installazione (pagina della TV aperta e **davanti**): `node tv11.cjs suoni` (riaccende l'altoparlante), `node tv12.cjs installa`, `node tv12.cjs conferma` (conferma prima di ricaricare), poi ricarica dell'interfaccia (`probe17js.cjs` con `location.reload()`).
