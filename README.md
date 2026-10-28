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

La cartella `mobile/` contiene Stickback come app vera, fatta con **Expo** (SDK 58) e React Native. Ha le stesse funzioni del sito: feed, risposte con sticker e GIF, stelle, sticker personali, salvataggio degli sticker degli altri e ricerca GIPHY. In più può aprire la galleria e incollare uno sticker copiato.

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

L'app in `mobile/` usa **Supabase** per account, problemi, risposte, stelle, sticker salvati e caricati, e risposte in tempo reale. La versione web della stessa app è su **https://vanroomenf.github.io/stickback/app/**. Il sito principale resta il prototipo con dati di esempio.

Configurazione, una volta sola:

1. Supabase → **SQL Editor** → **New query**: incolla tutto `supabase/migrations/0001_stickback.sql` e premi **Run**. Crea tabelle, regole di sicurezza (RLS), lo spazio `stickers` per le immagini e il tempo reale.
2. Per provare senza email di conferma: **Authentication → Sign In / Providers → Email** e disattiva **Confirm email**. Prima del lancio va riattivato.
3. URL e chiave pubblica sono in `mobile/src/config.js`. La chiave secret / service_role non va mai nell'app.

Regole di sicurezza principali: per leggere bisogna aver fatto l'accesso; ognuno pubblica, mette stelle e salva sticker solo a nome proprio; il testo dei problemi non si modifica dopo la pubblicazione; ognuno carica immagini solo nella propria cartella.

## Sicurezza e moderazione

Seconda migrazione: `supabase/migrations/0002_moderation.sql` (da eseguire nell'SQL Editor dopo la prima).

- **Età minima 16 anni**: alla registrazione l'app chiede la data di nascita (non viene salvata) e l'accettazione delle regole. Gli account creati prima lo confermano al primo accesso. Senza conferma non si può pubblicare.
- **Segnala** (menu ⋯ su problemi, risposte e profili) con motivo; dopo 3 segnalazioni da persone diverse il contenuto si nasconde da solo.
- **Blocca**: i due utenti non vedono più i contenuti l'uno dell'altro e non possono rispondersi. Sblocco da Profilo → Impostazioni.
- **Filtro parole**: tabella `blocked_terms` (si modifica dal Table Editor).
- **Elimina** i propri problemi e risposte; **elimina account** da Impostazioni.
- **Regole** e **privacy**: `public/regole.html` e `public/privacy.html`, pubblicate su https://vanroomenf.github.io/stickback/regole.html e /privacy.html. Prima del lancio vanno completati i campi evidenziati (titolare e contatto).

**Come moderare** (dalla dashboard di Supabase):
1. SQL Editor → `select * from moderation.queue;` mostra le segnalazioni, le aperte per prime, con contenuto, autore e numero di segnalazioni.
2. Per nascondere: Table Editor → `problems` o `replies` → `hidden = true` (oppure eliminare la riga).
3. Per sospendere un utente: `profiles` → `banned = true`.
4. Chiudere la segnalazione: `reports` → `status = 'risolta'` o `'respinta'`.

## Filtro automatico (immagini e testo)

Ogni nuovo problema, risposta e sticker salvato viene controllato dal modello di moderazione gratuito di OpenAI, tramite la Edge Function `supabase/functions/moderate`. Se viene segnalato, il contenuto viene nascosto (o tolto dalla raccolta) e compare in `moderation.queue` come "filtro automatico". Gli sticker di GIPHY non vengono controllati, perché sono già filtrati da GIPHY.

Configurazione:
1. Crea una chiave su platform.openai.com → API keys.
2. Supabase → Edge Functions → Deploy a new function → Via Editor: nome `moderate`, incolla `supabase/functions/moderate/index.ts`, Deploy. Nei dettagli della funzione disattiva "Verify JWT".
3. Edge Functions → Secrets: aggiungi `OPENAI_API_KEY`.
4. SQL Editor: esegui `supabase/migrations/0003_image_filter.sql`.

## Feed e categorie

Migrazione `supabase/migrations/0004_social.sql`.

- **Un feed unico** ordinato con un punteggio che mescola problemi recenti, stelle e problemi che hanno ancora poche risposte, così nessuno resta senza (`feed_for_you`).
- **Categorie**: Scuola, Lavoro, Famiglia, Amore, Amici, Altro. Si sceglie quando si pubblica e si filtra dal feed.

## Lingue

L'app in `mobile/` è in **italiano, inglese, tedesco e francese**. Segue la lingua del telefono; per tutte le altre lingue usa l'inglese. Si può anche scegliere a mano da Profilo → Impostazioni → Lingua.

- Testi: `mobile/src/i18n/it.js` (riferimento), `en.js`, `de.js`, `fr.js`. Ogni file ha le stesse chiavi; nel codice si usa `t("chiave")`.
- Numeri di aiuto nelle segnalazioni: scelti in base al paese del telefono (Svizzera, Italia, Germania, Austria, Francia, Regno Unito, Stati Uniti), altrimenti findahelpline.com. Sono in `mobile/src/i18n/index.js`.
- Regole e privacy in 4 lingue: si generano con `python3 scripts/legal_pages.py` (i testi stanno nello script). Italiano in `public/regole.html` e `public/privacy.html`, le altre in `public/en/`, `public/de/`, `public/fr/`.
- **Post nella tua lingua** (migrazione `supabase/migrations/0005_languages.sql`): ogni problema ha una lingua, riconosciuta in automatico dal testo sul telefono (`mobile/src/i18n/detect.js`); se il testo è troppo corto o ambiguo si usa la lingua dell'app. Il feed mostra solo i problemi nella lingua dell'app; da Impostazioni → Lingue dei post se ne possono aggiungere altre. I problemi pubblicati prima della migrazione sono segnati come italiani. Finché la migrazione non è eseguita, l'app mostra tutte le lingue.
- Il testo che chiede il permesso per le foto è tradotto in `mobile/locales/`; vale nell'app installata dagli store, non in Expo Go.

## Tempo limite, notifiche, password e benvenuto

Migrazione `supabase/migrations/0006_week_and_push.sql`.

- **Una settimana per rispondere**: dopo 7 giorni un problema si chiude (il database rifiuta nuove risposte) ed esce dal feed; resta visibile nei profili. Sotto ogni problema c'è il tempo che resta.
- **Feed infinito**: il feed carica 20 problemi alla volta e prende i successivi quando arrivi in fondo.
- **Notifiche push** quando qualcuno risponde a un tuo problema, nella lingua di chi le riceve. Le manda la Edge Function `moderate` dopo che la risposta ha passato il filtro (tramite il servizio push di Expo). L'app chiede il permesso dopo il primo problema pubblicato. Serve l'ID del progetto Expo in `app.json` (`extra.eas.projectId`). In Expo Go funzionano solo su iPhone; su Android serve la versione installabile.
- **Password dimenticata**: dall'accesso, l'app manda un codice per email e si sceglie la nuova password. Su Supabase il modello email "Reset Password" deve contenere `{{ .Token }}`.
- **Benvenuto**: tre schermate alla prima apertura (racconta, rispondi con uno sticker, dai le stelle).

## Prossimi passi per l'app negli store

- **Condividi → Stickback anche su iPhone**: con una Share Extension nell'app nativa.
- **Esportare gli sticker su WhatsApp**: WhatsApp accetta pacchetti di sticker solo da app native (iOS e Android), con almeno 3 sticker per pacchetto in formato WEBP 512×512 e un'icona del pacchetto. Stickback potrà creare un pacchetto con i tuoi sticker e aggiungerlo a WhatsApp con un tocco.
- **Chiave GIPHY SDK** per usare la finestra di ricerca già pronta di GIPHY.
