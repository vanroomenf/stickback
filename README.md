# Stickback

**Racconta un problema. Ti rispondono solo con sticker.**

Stickback è un social in cui qualcuno posta una situazione imbarazzante o un problema in una frase, e gli altri possono rispondere in un solo modo: con uno sticker preso dalla propria raccolta e una didascalia.

Il nome unisce *sticker* e *clapback*, cioè la risposta pronta e ironica.

## Come funziona

- **Feed verticale**: scorri in giù per passare da un problema all'altro, come su TikTok o Reels.
- **Risposte in orizzontale**: scorri di lato per vedere gli sticker di risposta, uno per schermata.
- **Rispondi con i tuoi sticker**: scrivi il tuo testo e scegli uno sticker dalla tua raccolta. Il testo sta sopra, come un messaggio, e lo sticker sotto: restano separati, il testo non viene stampato sull'immagine.
- **Stelle**: metti una stella sia al problema sia alle singole risposte. Doppio tap su uno sticker per mettere la stella al volo.
- **Corona**: l'autore del problema sceglie la risposta migliore, che va in cima.
- **Profilo**: nome, bio, statistiche (problemi, risposte, stelle, corone) e tre schede: i tuoi problemi, le tue risposte, i tuoi sticker.

## Prototipo

Il prototipo cliccabile è in [`prototype/index.html`](prototype/index.html). È un singolo file HTML senza dipendenze: si apre direttamente nel browser.

Per provarlo online puoi attivare GitHub Pages (Settings → Pages → branch `main`) e aprire `https://vanroomenf.github.io/stickback/prototype/`.

Nel prototipo:
- i dati sono di esempio e restano solo in memoria (si azzerano ricaricando la pagina);
- gli sticker di esempio sono emoji; con **+** puoi caricare immagini vere (meglio PNG o WEBP con sfondo trasparente, come gli sticker di WhatsApp);
- puoi incollare uno sticker copiato (Ctrl/Cmd+V) mentre l'app è aperta;
- quando posti un problema arrivano due risposte simulate, per vedere le notifiche.

## Note per l'app vera

**Sticker da WhatsApp.** iOS e Android non permettono a un'altra app di leggere la raccolta di sticker di WhatsApp. Le strade praticabili sono:
- copia e incolla (su iPhone: tieni premuto lo sticker → Copia);
- condivisione verso Stickback dal menu "Condividi" del telefono (share extension su iOS, intent di condivisione su Android);
- importazione dalla galleria o dai file.

**Feed.** Va ordinato in modo che i problemi nuovi ricevano risposte: mescolare post recenti con poche risposte, post molto votati e post degli amici.

**Moderazione.** Le immagini caricate dagli utenti richiedono un tasto "Segnala" e un filtro automatico sulle immagini.

**Lancio.** Conviene partire da una nicchia (una scuola, un'università, un tema) invece che da tutti.

## Nome: verifiche da completare

Una prima ricerca non ha trovato app o social chiamati Stickback. Il nome compare in settori lontani (una linea di strisce adesive Velcro, una mod di Minecraft, un fumetto su Webtoon). Prima del lancio restano da controllare:

- [ ] domini `stickback.app` / `stickback.com`
- [ ] marchi su [TMview](https://www.tmdn.org/tmview) e [USPTO](https://tmsearch.uspto.gov), classi 9 e 42
- [ ] handle `@stickback` su Instagram e TikTok
- [ ] nome libero su App Store e Google Play
