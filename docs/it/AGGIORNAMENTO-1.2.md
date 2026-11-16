# Daniel Home 1.2: suoni, volume, tre lineette, fluidità

Data: 15 novembre 2026. Parte dalla 1.1 e risponde alle prove fatte da Daniel sulla TV la sera del 15/11.

> **Stato:** preparata e provata sul PC. **Da installare e provare sulla TV.** Nulla è "risolto" finché non lo senti e lo vedi sulla TV.

## Cosa non andava e cosa cambia

| Problema visto sulla TV | Causa trovata | Correzione 1.2 |
|---|---|---|
| Il suono si sente due volte ("tutun tutun") | L'altoparlante nativo chiudeva il flusso audio a fine suono. Il chip audio MStar della TV, quando il flusso si ferma, ripete l'ultimo pezzetto rimasto nel buffer. Inoltre una Home ricreata poteva lasciare in ascolto anche la vecchia. | Nuovo altoparlante nativo: il flusso resta sempre aperto e riceve silenzio quando non suona nulla, quindi non c'è più un pezzetto da ripetere. Solo la Home attiva gestisce i tasti. Tra due suoni passano almeno 70 ms. |
| Suoni in ritardo | Dopo 1,5 s di pausa l'altoparlante chiudeva il dispositivo e lo riapriva al tasto dopo. Latenza fissata a 100 ms. | Il dispositivo resta aperto (si chiude solo dopo 10 minuti di silenzio). Latenza 60 ms. Mixer a 4 voci: un suono nuovo non taglia di colpo il precedente. |
| Suoni troppo forti, poco rilassanti | | 7 suoni nuovi, lo-fi: piano elettrico morbido, filtrato, molto più basso (da −27 a −21 dB). Il tasto freccia è un solo "tic" morbido. File in `suoni\1.2\`. |
| Capsula del volume sopra l'indicatore VIDAA | La TV mostra sempre il suo indicatore e non si può spegnere dalla Home. | Capsula spenta di serie (una volta, all'avvio della 1.2). Si può riaccendere in Impostazioni, ma compaiono tutti e due. I tasti del volume continuano a non diventare mai tasto del menu. |
| Tre lineette in Prime Video aprono il menu VIDAA | 1) La 1.1 aveva azzerato i tasti del menu (per togliere Volume +): le tre lineette vanno reimparate. 2) Il menu VIDAA è una pagina della TV, che la Home non riconosceva. | Premi le tre lineette **due volte nella Home** (una volta sola). Da lì, se dentro un'app le tre lineette aprono la pagina del menu VIDAA, la Home la riconosce (entro 1 s dal tasto), la blocca e apre il suo pannello. Ricorda la pagina per le volte dopo. |
| Animazione di ritorno non piace | | Nuova, leggera: il nero si scioglie in 0,4 s e la Home sale di poco al suo posto. Niente sfocature, niente zoom dello sfondo. |
| Scatti aprendo e chiudendo | Sfocature animate a schermo intero (fino a 48 px) e zoom dello sfondo: la TV le ridisegna a ogni fotogramma. Ombre molto larghe. Sfondi animati che girano anche mentre navighi. | Tolte tutte le sfocature animate. Ombre dimezzate. Le animazioni dello sfondo si fermano mentre usi il telecomando e ripartono 2,5 s dopo. Il velo per l'app si arma 0,7 s dopo l'apertura, così non pesa mentre l'app parte. Transizioni un po' più brevi. |

## Prove sul PC (simulatore Vue 2.7, 1920×1080)

- ES5 valido.
- Prova casuale da 2500 tasti + impostazioni + pannello rapido + 15 cicli app/Home, nelle varianti normale, senza audio, servizi in errore, memoria negata, senza app: nessun errore della pagina. Tempo per tasto: media circa 1 ms, massimo 12 ms (PC).
- Ritorno alla Home: nessun elemento con filtri CSS, animazione finita in 0,7 s. Anteprime in `anteprime\v1.2\`.
- Altoparlante 1.2: compilato e controllato sul PC; **non ancora provato sulla TV**.

## Installazione (strumenti in `strumenti\tv-1.2\`, da copiare in `tv-update`)

1. `python build-audio-12.py` compila l'altoparlante con lo Zig del 12/11.
2. `node tv11.cjs apri`, poi sulla TV apri `http://192.168.1.100:8766/`.
3. `node tv12.cjs stato` (solo lettura).
4. `node tv12.cjs suoni`: backup dei vecchi file, nuovo altoparlante e suoni. Se non risponde entro 6 s rimette da solo quelli di prima.
5. `node tv12.cjs installa`, poi **subito** `node tv12.cjs attiva`. Il guardiano rimette la versione precedente dopo 15 minuti senza conferma.
6. Prove: frecce (un solo tic, subito), OK, Indietro, Home da Netflix, volume, tre lineette due volte nella Home e poi dentro Prime Video.
7. `node tv12.cjs stato` per leggere tempi, tasti ed eventi.

Ripristino: `node tv12.cjs ripristina` (Home) e `node tv12.cjs suoni-indietro` (suoni).

## Ancora da verificare sulla TV

- Che il "tutun" sia sparito e il ritardo sia sotto i 100 ms percepiti.
- Che la pagina del menu VIDAA dentro le app venga davvero intercettata, e che il nostro pannello si veda sopra l'app.
- Fluidità reale: confrontare i millisecondi per tasto con la 1.0 (24,4 ms medi, massimo 159 ms).
