# Stickback

**Racconta un problema. Ti rispondono solo con sticker.**

Stickback è un social in cui qualcuno posta una situazione imbarazzante o un problema in una frase, e gli altri possono rispondere in un solo modo: con uno sticker preso dalla propria raccolta e una didascalia.

Il nome unisce *sticker* e *clapback*, cioè la risposta pronta e ironica.

## Come funziona

- **Feed verticale**: scorri in giù per passare da un problema all'altro, come su TikTok o Reels.
- **Risposte in orizzontale**: scorri di lato per vedere gli sticker di risposta, uno per schermata.
- **Rispondi con i tuoi sticker**: scrivi il tuo testo e scegli uno sticker dalla tua raccolta. Il testo sta sopra, come un messaggio, e lo sticker sotto: restano separati, il testo non viene stampato sull'immagine.
- **Sticker e GIF da GIPHY**: oltre ai tuoi sticker puoi cercare sticker e GIF su GIPHY direttamente dalla finestra di risposta.
- **Salva gli sticker degli altri**: accanto alla stella di ogni risposta c'è un pulsante per salvare quello sticker tra i tuoi, come su WhatsApp. Si toglie con un altro tocco, o dalla scheda Sticker del profilo.
- **Condividi → Stickback**: su Android, dopo aver aggiunto Stickback alla schermata Home, Stickback compare nel menu Condividi di qualsiasi app (app di sticker, galleria, browser). Lo sticker condiviso finisce subito tra i tuoi.
- **Stelle**: metti una stella sia al problema sia alle singole risposte. Doppio tap su uno sticker per mettere la stella al volo.
- **Corona**: l'autore del problema sceglie la risposta migliore, che va in cima.
- **Profilo**: nome, bio, statistiche (problemi, risposte, stelle, corone) e tre schede: i tuoi problemi, le tue risposte, i tuoi sticker.

## Prototipo

Versione online: **https://vanroomenf.github.io/stickback/**

L'app è scritta in **React** con **Vite**. Ogni modifica caricata su `main` viene costruita e pubblicata da sola su GitHub Pages in un paio di minuti (workflow in `.github/workflows/pages.yml`).

### Avviarla sul computer

```bash
npm install
npm run dev      # apre l'app su http://localhost:5173
npm run build    # crea la versione da pubblicare in dist/
```

### Struttura

- `src/App.jsx`: schermate, finestre e navigazione
- `src/store.js`: tutti i dati dell'app e le azioni (stelle, risposte, corona, nuovi problemi)
- `src/data.js`: contenuti di esempio
- `src/components/Feed.jsx`: feed verticale e risposte in orizzontale
- `src/components/Profile.jsx`: pagina profilo
- `src/components/Sheets.jsx`: finestre per rispondere, raccontare un problema e modificare il profilo
- `src/components/GiphyPicker.jsx` e `src/lib/giphy.js`: ricerca di sticker e GIF su GIPHY
- `src/config.js`: chiave GIPHY dell'app

### Cosa sapere

- I dati sono di esempio e restano solo in memoria: si azzerano ricaricando la pagina.
- Gli sticker di esempio sono emoji; con **+** puoi caricare immagini vere (meglio PNG o WEBP con sfondo trasparente) oppure incollarne una copiata.
- Quando posti un problema arrivano due risposte simulate, per vedere le notifiche.
- I tuoi sticker (caricati, incollati, condivisi da altre app o salvati dalle risposte) restano salvati sul telefono. GIF e WEBP piccoli restano animati.
- La condivisione da altre app passa da `public/manifest.webmanifest` (share target) e `public/sw.js`. Funziona solo su Android con Chrome, dopo "Aggiungi a schermata Home": iPhone non permette ai siti di comparire nel menu Condividi.
- La ricerca GIPHY usa la chiave in `src/config.js`. Se è vuota, l'app chiede di incollare una chiave, che resta salvata solo su quel telefono o browser.

## Note per l'app vera

**Sticker da WhatsApp.** iOS e Android non permettono a un'altra app di leggere la raccolta di sticker di WhatsApp. Le strade praticabili sono:
- su Android, importazione in blocco della cartella dove WhatsApp salva gli sticker ricevuti (file WEBP);
- su iPhone WhatsApp non permette di copiare gli sticker: si può fare uno screenshot, aprirlo in Foto, tenere premuto sullo sticker → Copia (iOS ritaglia il soggetto) e incollarlo in Stickback;
- importazione dalla galleria o dai file;
- un pulsante "Salva" sugli sticker usati nelle risposte, così gli sticker girano tra gli utenti dentro l'app;
- ricerca di sticker e GIF su GIPHY (già nel prototipo).

**Feed.** Va ordinato in modo che i problemi nuovi ricevano risposte: mescolare post recenti con poche risposte, post molto votati e post degli amici.

**Moderazione.** Le immagini caricate dagli utenti richiedono un tasto "Segnala" e un filtro automatico sulle immagini.

**Lancio.** Conviene partire da una nicchia (una scuola, un'università, un tema) invece che da tutti.

## Nome: verifiche da completare

Una prima ricerca non ha trovato app o social chiamati Stickback. Il nome compare in settori lontani (una linea di strisce adesive Velcro, una mod di Minecraft, un fumetto su Webtoon). Prima del lancio restano da controllare:

- [ ] domini `stickback.app` / `stickback.com`
- [ ] marchi su [TMview](https://www.tmdn.org/tmview) e [USPTO](https://tmsearch.uspto.gov), classi 9 e 42
- [ ] handle `@stickback` su Instagram e TikTok
- [ ] nome libero su App Store e Google Play

## App per telefono (React Native)

La cartella `mobile/` contiene Stickback come app vera, fatta con **Expo** (SDK 58) e React Native. Ha le stesse funzioni del sito: feed, risposte con sticker e GIF, stelle, corona, sticker personali salvati sul telefono, salvataggio degli sticker degli altri e ricerca GIPHY. In più può aprire la galleria e incollare uno sticker copiato.

Per provarla con **Expo Go**:

```bash
cd mobile
npm install
npx expo start          # stessa rete Wi-Fi del telefono
npx expo start --tunnel # se il telefono è su un'altra rete
```

Poi inquadra il QR code con la fotocamera (iPhone) o con l'app Expo Go (Android).

Struttura: `mobile/App.js` carica i font e avvia `mobile/src/StickbackApp.js`; le schermate sono in `mobile/src/components/`. `store.js`, `data.js` e la ricerca GIPHY sono le stesse del sito, adattate al telefono.

## Server (Supabase)

L'app in `mobile/` usa **Supabase** per account, problemi, risposte, stelle, corone, sticker salvati e caricati, e risposte in tempo reale. La versione web della stessa app è su **https://vanroomenf.github.io/stickback/app/**. Il sito principale resta il prototipo con dati di esempio.

Configurazione, una volta sola:

1. Supabase → **SQL Editor** → **New query**: incolla tutto `supabase/migrations/0001_stickback.sql` e premi **Run**. Crea tabelle, regole di sicurezza (RLS), lo spazio `stickers` per le immagini e il tempo reale.
2. Per provare senza email di conferma: **Authentication → Sign In / Providers → Email** e disattiva **Confirm email**. Prima del lancio va riattivato.
3. URL e chiave pubblica sono in `mobile/src/config.js`. La chiave secret / service_role non va mai nell'app.

Regole di sicurezza principali: per leggere bisogna aver fatto l'accesso; ognuno pubblica, mette stelle e salva sticker solo a nome proprio; solo l'autore sceglie la risposta migliore e il testo del problema non si modifica; ognuno carica immagini solo nella propria cartella.

## Prossimi passi per l'app negli store

- **Condividi → Stickback anche su iPhone**: con una Share Extension nell'app nativa.
- **Esportare gli sticker su WhatsApp**: WhatsApp accetta pacchetti di sticker solo da app native (iOS e Android), con almeno 3 sticker per pacchetto in formato WEBP 512×512 e un'icona del pacchetto. Stickback potrà creare un pacchetto con i tuoi sticker e aggiungerlo a WhatsApp con un tocco.
- **Chiave GIPHY SDK** per usare la finestra di ricerca già pronta di GIPHY.
