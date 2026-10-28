"""Builds the rules and privacy pages in Italian, English, German and French.

Run from the repo root:  python3 scripts/legal_pages.py
Italian:  public/regole.html, public/privacy.html
Others:   public/<lang>/rules.html, public/<lang>/privacy.html
Edit the texts here, not the generated HTML.
"""
from pathlib import Path

PUBLIC = Path(__file__).resolve().parent.parent / "public"
VERSION = {"it": "Versione del 28 ottobre 2026", "en": "Version of 28 October 2026",
           "de": "Version vom 28. Oktober 2026", "fr": "Version du 28 octobre 2026"}
TODO = {
    "email": {"it": "[email di contatto]", "en": "[contact email]", "de": "[Kontakt-E-Mail]", "fr": "[e-mail de contact]"},
    "owner": {"it": "[nome e cognome o società]", "en": "[full name or company]", "de": "[Vor- und Nachname oder Firma]", "fr": "[nom et prénom ou société]"},
    "address": {"it": "[indirizzo]", "en": "[address]", "de": "[Adresse]", "fr": "[adresse]"},
}


def todo(kind, lang):
    return f'<span class="todo">{TODO[kind][lang]}</span>'


def path(lang, page):  # page: "rules" | "privacy"
    if lang == "it":
        return "regole.html" if page == "rules" else "privacy.html"
    return f"{lang}/{page}.html"


def href(from_lang, to_lang, page):
    up = "" if from_lang == "it" else "../"
    return up + path(to_lang, page)


HELP = {
    "it": ("<p><strong>Se qualcuno è in pericolo adesso</strong>, chiama il <strong>112</strong>.</p>"
           "<p>Se sei tu a stare male puoi parlarne subito, gratis e in modo anonimo:</p><ul>"
           "<li>Svizzera: <strong>143</strong> Telefono Amico, <strong>147</strong> per i giovani</li>"
           "<li>Italia: <strong>02 2327 2327</strong> Telefono Amico Italia</li>"
           "<li>Germania: <strong>0800 111 0 111</strong> TelefonSeelsorge, <strong>116 111</strong> per i giovani</li>"
           "<li>Austria: <strong>142</strong> Telefonseelsorge, <strong>147</strong> per i giovani</li>"
           "<li>Francia: <strong>3114</strong></li>"
           '<li>Altri paesi: <a href="https://findahelpline.com">findahelpline.com</a></li></ul>'),
    "en": ("<p><strong>If someone is in danger right now</strong>, call <strong>112</strong> (<strong>911</strong> in the US, <strong>999</strong> in the UK).</p>"
           "<p>If you're the one struggling, you can talk to someone now, for free and anonymously:</p><ul>"
           "<li>Switzerland: <strong>143</strong> Die Dargebotene Hand, <strong>147</strong> for young people</li>"
           "<li>Italy: <strong>02 2327 2327</strong> Telefono Amico Italia</li>"
           "<li>Germany: <strong>0800 111 0 111</strong> TelefonSeelsorge, <strong>116 111</strong> for young people</li>"
           "<li>Austria: <strong>142</strong> Telefonseelsorge, <strong>147</strong> for young people</li>"
           "<li>France: <strong>3114</strong></li>"
           "<li>UK: <strong>116 123</strong> Samaritans · US: <strong>988</strong></li>"
           '<li>Other countries: <a href="https://findahelpline.com">findahelpline.com</a></li></ul>'),
    "de": ("<p><strong>Wenn jemand gerade in Gefahr ist</strong>, ruf die <strong>112</strong> an.</p>"
           "<p>Wenn es dir selbst schlecht geht, kannst du sofort mit jemandem reden, gratis und anonym:</p><ul>"
           "<li>Schweiz: <strong>143</strong> Die Dargebotene Hand, <strong>147</strong> für Jugendliche</li>"
           "<li>Deutschland: <strong>0800 111 0 111</strong> TelefonSeelsorge, <strong>116 111</strong> Nummer gegen Kummer</li>"
           "<li>Österreich: <strong>142</strong> Telefonseelsorge, <strong>147</strong> Rat auf Draht</li>"
           "<li>Italien: <strong>02 2327 2327</strong> Telefono Amico Italia</li>"
           "<li>Frankreich: <strong>3114</strong></li>"
           '<li>Andere Länder: <a href="https://findahelpline.com">findahelpline.com</a></li></ul>'),
    "fr": ("<p><strong>Si quelqu'un est en danger maintenant</strong>, appelle le <strong>112</strong>.</p>"
           "<p>Si c'est toi qui vas mal, tu peux en parler tout de suite, gratuitement et anonymement :</p><ul>"
           "<li>Suisse : <strong>143</strong> La Main Tendue, <strong>147</strong> pour les jeunes</li>"
           "<li>France : <strong>3114</strong> numéro national de prévention du suicide</li>"
           "<li>Italie : <strong>02 2327 2327</strong> Telefono Amico Italia</li>"
           "<li>Allemagne : <strong>0800 111 0 111</strong> TelefonSeelsorge</li>"
           "<li>Autriche : <strong>142</strong> Telefonseelsorge</li>"
           '<li>Autres pays : <a href="https://findahelpline.com">findahelpline.com</a></li></ul>'),
}

RULES = {
    "it": dict(title="Regole della community", body=lambda L: f"""
  <p class="lead">Su Stickback racconti una figuraccia e gli altri ti rispondono con uno sticker. Si ride <strong>con</strong> le persone, non <strong>delle</strong> persone. Queste regole valgono per problemi, risposte, sticker caricati, nomi utente e bio.</p>
  <h2>Chi può usare Stickback</h2>
  <ul>
    <li>Devi avere <strong>almeno 16 anni</strong>.</li>
    <li>Un account per persona. Non fingere di essere qualcun altro.</li>
  </ul>
  <h2>Cosa non è ammesso</h2>
  <ul>
    <li><strong>Bullismo e molestie</strong>: prendere di mira una persona, insultarla, umiliarla o minacciarla, anche "per scherzo".</li>
    <li><strong>Persone riconoscibili</strong>: nomi e cognomi, foto, scuola, indirizzo o qualsiasi dettaglio che faccia capire di chi si parla, se quella persona non è d'accordo. Racconta le <em>tue</em> figuracce.</li>
    <li><strong>Odio e violenza</strong>: contenuti contro persone per origine, religione, genere, orientamento sessuale, disabilità o altre caratteristiche; incitare alla violenza.</li>
    <li><strong>Contenuti sessuali</strong> espliciti, e qualsiasi contenuto sessuale che riguardi minori.</li>
    <li><strong>Autolesionismo e suicidio</strong> presentati come qualcosa da imitare o da deridere.</li>
    <li><strong>Attività illegali</strong>, droghe, armi, truffe.</li>
    <li><strong>Spam</strong>: pubblicità, link sospetti, messaggi ripetuti.</li>
    <li><strong>Immagini di altri</strong> che non hai il diritto di usare, se il titolare chiede di toglierle.</li>
  </ul>
  <h2>Come si interviene</h2>
  <ul>
    <li>Ogni problema e ogni risposta ha il menu <strong>⋯</strong> con <strong>Segnala</strong> e <strong>Blocca</strong>. La segnalazione è anonima.</li>
    <li>Un contenuto segnalato da più persone viene nascosto subito, in attesa che un moderatore lo controlli.</li>
    <li>Testi e immagini nuovi vengono controllati da un filtro automatico; le parole offensive più gravi vengono bloccate.</li>
    <li>I moderatori controllano le segnalazioni, di solito entro 24 ore, e possono togliere contenuti o sospendere account.</li>
    <li>Chi viola le regole più volte, o in modo grave, perde l'account.</li>
  </ul>
  <div class="card">{HELP['it']}</div>
  <h2>Contatti</h2>
  <p>Per segnalazioni urgenti o domande sulla moderazione scrivi a {todo('email', L)}.</p>""",
        footer='Leggi anche l\'<a href="{privacy}">informativa sulla privacy</a>.'),
    "en": dict(title="Community rules", body=lambda L: f"""
  <p class="lead">On Stickback you share an awkward moment and people reply with a sticker. We laugh <strong>with</strong> people, not <strong>at</strong> them. These rules apply to problems, replies, uploaded stickers, usernames and bios.</p>
  <h2>Who can use Stickback</h2>
  <ul>
    <li>You must be <strong>at least 16 years old</strong>.</li>
    <li>One account per person. Don't pretend to be someone else.</li>
  </ul>
  <h2>What isn't allowed</h2>
  <ul>
    <li><strong>Bullying and harassment</strong>: targeting, insulting, humiliating or threatening someone, even "as a joke".</li>
    <li><strong>Identifiable people</strong>: full names, photos, school, address or any detail that shows who you're talking about, unless that person agrees. Share <em>your own</em> awkward moments.</li>
    <li><strong>Hate and violence</strong>: content against people because of their origin, religion, gender, sexual orientation, disability or other characteristics; encouraging violence.</li>
    <li>Explicit <strong>sexual content</strong>, and any sexual content involving minors.</li>
    <li><strong>Self-harm and suicide</strong> presented as something to copy or to mock.</li>
    <li><strong>Illegal activities</strong>, drugs, weapons, scams.</li>
    <li><strong>Spam</strong>: ads, suspicious links, repeated messages.</li>
    <li><strong>Other people's images</strong> you don't have the right to use, if the owner asks for them to be removed.</li>
  </ul>
  <h2>How we act</h2>
  <ul>
    <li>Every problem and reply has a <strong>⋯</strong> menu with <strong>Report</strong> and <strong>Block</strong>. Reports are anonymous.</li>
    <li>Content reported by several people is hidden right away, until a moderator checks it.</li>
    <li>New texts and images are checked by an automatic filter; the most offensive words are blocked.</li>
    <li>Moderators review reports, usually within 24 hours, and can remove content or suspend accounts.</li>
    <li>Anyone who breaks the rules repeatedly, or seriously, loses their account.</li>
  </ul>
  <div class="card">{HELP['en']}</div>
  <h2>Contact</h2>
  <p>For urgent reports or questions about moderation, write to {todo('email', L)}.</p>""",
        footer='See also the <a href="{privacy}">privacy policy</a>.'),
    "de": dict(title="Community-Regeln", body=lambda L: f"""
  <p class="lead">Auf Stickback erzählst du von einem peinlichen Moment und die anderen antworten mit einem Sticker. Wir lachen <strong>mit</strong> den Leuten, nicht <strong>über</strong> sie. Diese Regeln gelten für Probleme, Antworten, hochgeladene Sticker, Benutzernamen und Bios.</p>
  <h2>Wer Stickback nutzen darf</h2>
  <ul>
    <li>Du musst <strong>mindestens 16 Jahre alt</strong> sein.</li>
    <li>Ein Konto pro Person. Gib dich nicht als jemand anderes aus.</li>
  </ul>
  <h2>Was nicht erlaubt ist</h2>
  <ul>
    <li><strong>Mobbing und Belästigung</strong>: jemanden gezielt angreifen, beleidigen, blossstellen oder bedrohen, auch «aus Spass».</li>
    <li><strong>Erkennbare Personen</strong>: Vor- und Nachnamen, Fotos, Schule, Adresse oder andere Details, die zeigen, um wen es geht, wenn die Person nicht einverstanden ist. Erzähl von <em>deinen eigenen</em> peinlichen Momenten.</li>
    <li><strong>Hass und Gewalt</strong>: Inhalte gegen Menschen wegen Herkunft, Religion, Geschlecht, sexueller Orientierung, Behinderung oder anderer Merkmale; Aufrufe zu Gewalt.</li>
    <li>Explizite <strong>sexuelle Inhalte</strong> und jegliche sexuellen Inhalte mit Minderjährigen.</li>
    <li><strong>Selbstverletzung und Suizid</strong>, dargestellt als etwas zum Nachmachen oder zum Lustigmachen.</li>
    <li><strong>Illegale Aktivitäten</strong>, Drogen, Waffen, Betrug.</li>
    <li><strong>Spam</strong>: Werbung, verdächtige Links, wiederholte Nachrichten.</li>
    <li><strong>Bilder anderer</strong>, die du nicht verwenden darfst, wenn die Rechteinhaber verlangen, dass sie entfernt werden.</li>
  </ul>
  <h2>Wie wir eingreifen</h2>
  <ul>
    <li>Jedes Problem und jede Antwort hat das Menü <strong>⋯</strong> mit <strong>Melden</strong> und <strong>Blockieren</strong>. Meldungen sind anonym.</li>
    <li>Inhalte, die von mehreren Personen gemeldet werden, werden sofort ausgeblendet, bis ein Moderationsteam sie prüft.</li>
    <li>Neue Texte und Bilder werden von einem automatischen Filter geprüft; die schlimmsten Beleidigungen werden blockiert.</li>
    <li>Das Moderationsteam prüft Meldungen meistens innerhalb von 24 Stunden und kann Inhalte entfernen oder Konten sperren.</li>
    <li>Wer mehrmals oder schwer gegen die Regeln verstösst, verliert sein Konto.</li>
  </ul>
  <div class="card">{HELP['de']}</div>
  <h2>Kontakt</h2>
  <p>Für dringende Meldungen oder Fragen zur Moderation schreib an {todo('email', L)}.</p>""",
        footer='Lies auch die <a href="{privacy}">Datenschutzerklärung</a>.'),
    "fr": dict(title="Règles de la communauté", body=lambda L: f"""
  <p class="lead">Sur Stickback, tu racontes un moment gênant et les autres te répondent avec un sticker. On rit <strong>avec</strong> les gens, pas <strong>des</strong> gens. Ces règles s'appliquent aux problèmes, réponses, stickers ajoutés, noms d'utilisateur et bios.</p>
  <h2>Qui peut utiliser Stickback</h2>
  <ul>
    <li>Tu dois avoir <strong>au moins 16 ans</strong>.</li>
    <li>Un compte par personne. Ne te fais pas passer pour quelqu'un d'autre.</li>
  </ul>
  <h2>Ce qui est interdit</h2>
  <ul>
    <li><strong>Harcèlement</strong> : cibler une personne, l'insulter, l'humilier ou la menacer, même « pour rire ».</li>
    <li><strong>Personnes reconnaissables</strong> : noms et prénoms, photos, école, adresse ou tout détail qui montre de qui on parle, si cette personne n'est pas d'accord. Raconte <em>tes propres</em> moments gênants.</li>
    <li><strong>Haine et violence</strong> : contenus contre des personnes à cause de leur origine, religion, genre, orientation sexuelle, handicap ou d'autres caractéristiques ; incitation à la violence.</li>
    <li><strong>Contenus sexuels</strong> explicites, et tout contenu sexuel impliquant des mineurs.</li>
    <li><strong>Automutilation et suicide</strong> présentés comme quelque chose à imiter ou dont se moquer.</li>
    <li><strong>Activités illégales</strong>, drogues, armes, arnaques.</li>
    <li><strong>Spam</strong> : pub, liens suspects, messages répétés.</li>
    <li><strong>Images d'autres personnes</strong> que tu n'as pas le droit d'utiliser, si le titulaire demande de les retirer.</li>
  </ul>
  <h2>Comment on intervient</h2>
  <ul>
    <li>Chaque problème et chaque réponse a le menu <strong>⋯</strong> avec <strong>Signaler</strong> et <strong>Bloquer</strong>. Le signalement est anonyme.</li>
    <li>Un contenu signalé par plusieurs personnes est masqué tout de suite, en attendant qu'un modérateur le vérifie.</li>
    <li>Les nouveaux textes et images sont vérifiés par un filtre automatique ; les mots les plus offensants sont bloqués.</li>
    <li>Les modérateurs vérifient les signalements, en général sous 24 heures, et peuvent retirer des contenus ou suspendre des comptes.</li>
    <li>Qui enfreint les règles plusieurs fois, ou gravement, perd son compte.</li>
  </ul>
  <div class="card">{HELP['fr']}</div>
  <h2>Contact</h2>
  <p>Pour un signalement urgent ou une question sur la modération, écris à {todo('email', L)}.</p>""",
        footer='Lis aussi la <a href="{privacy}">politique de confidentialité</a>.'),
}

PRIVACY = {
    "it": dict(title="Informativa sulla privacy", body=lambda L: f"""
  <p class="lead">Raccogliamo solo i dati che servono a far funzionare Stickback. Non vendiamo i tuoi dati e non mostriamo pubblicità.</p>
  <h2>Chi è responsabile</h2>
  <p>Titolare del trattamento: {todo('owner', L)}, {todo('address', L)}. Contatto per la privacy: {todo('email', L)}.</p>
  <h2>Quali dati usiamo e perché</h2>
  <div class="tablewrap"><table>
    <thead><tr><th>Dati</th><th>Perché</th></tr></thead>
    <tbody>
      <tr><td>Email e password (la password è salvata solo cifrata)</td><td>Creare l'account e farti accedere.</td></tr>
      <tr><td>Nome utente, nome e bio</td><td>Mostrare il tuo profilo agli altri utenti.</td></tr>
      <tr><td>Problemi, risposte, stelle, sticker caricati e salvati</td><td>Il funzionamento dell'app. Problemi, risposte e sticker usati nelle risposte sono visibili agli altri utenti registrati.</td></tr>
      <tr><td>Conferma di avere almeno 16 anni e accettazione delle regole</td><td>Rispettare l'età minima. La data di nascita viene controllata sul telefono e <strong>non viene salvata</strong>.</td></tr>
      <tr><td>Segnalazioni e utenti bloccati</td><td>Moderazione e sicurezza. Chi viene segnalato o bloccato non sa da chi.</td></tr>
      <tr><td>Testi e immagini nuovi</td><td>Vengono inviati al filtro automatico di moderazione di OpenAI per trovare contenuti vietati. Non vengono usati per addestrare modelli.</td></tr>
      <tr><td>Ricerche su GIPHY</td><td>Mostrarti sticker e GIF. La parola cercata viene inviata a GIPHY, non al tuo account.</td></tr>
    </tbody>
  </table></div>
  <p>Base giuridica: l'esecuzione del servizio che hai richiesto creando l'account e, per la moderazione, il legittimo interesse a mantenere la community sicura.</p>
  <h2>Chi tratta i dati per nostro conto</h2>
  <ul>
    <li><strong>Supabase</strong>: database, account e archivio delle immagini, su server in Europa.</li>
    <li><strong>OpenAI</strong>: filtro automatico di moderazione di testi e immagini.</li>
    <li><strong>GIPHY</strong>: ricerca e visualizzazione di sticker e GIF.</li>
    <li><strong>GitHub Pages</strong>: pubblicazione del sito e della versione web dell'app.</li>
  </ul>
  <h2>Per quanto tempo</h2>
  <p>Teniamo i dati finché hai l'account. Se lo elimini, cancelliamo profilo, problemi, risposte, stelle, sticker caricati, segnalazioni e blocchi. Possono restare per poco tempo nelle copie di sicurezza, che si aggiornano da sole.</p>
  <h2>I tuoi diritti</h2>
  <ul>
    <li><strong>Eliminare l'account</strong> in qualsiasi momento dall'app: Profilo → Impostazioni → Elimina account.</li>
    <li>Modificare nome e bio dal profilo, e cancellare i tuoi problemi e le tue risposte dal menu ⋯.</li>
    <li>Chiedere una copia dei tuoi dati, la correzione o la limitazione del trattamento, scrivendo a {todo('email', L)}.</li>
    <li>Presentare reclamo all'autorità di protezione dei dati: in Svizzera l'IFPDT, in Italia il Garante per la protezione dei dati personali.</li>
  </ul>
  <h2>Minori</h2>
  <p>Stickback è per chi ha almeno 16 anni. Se scopriamo che un account appartiene a una persona più giovane, lo eliminiamo.</p>""",
        footer='Leggi anche le <a href="{rules}">regole della community</a>.'),
    "en": dict(title="Privacy policy", body=lambda L: f"""
  <p class="lead">We only collect the data Stickback needs to work. We don't sell your data and we don't show ads.</p>
  <h2>Who is responsible</h2>
  <p>Controller: {todo('owner', L)}, {todo('address', L)}. Privacy contact: {todo('email', L)}.</p>
  <h2>What data we use and why</h2>
  <div class="tablewrap"><table>
    <thead><tr><th>Data</th><th>Why</th></tr></thead>
    <tbody>
      <tr><td>Email and password (the password is only stored encrypted)</td><td>Creating your account and logging you in.</td></tr>
      <tr><td>Username, name and bio</td><td>Showing your profile to other users.</td></tr>
      <tr><td>Problems, replies, stars, uploaded and saved stickers</td><td>Running the app. Problems, replies and stickers used in replies are visible to other registered users.</td></tr>
      <tr><td>Confirmation that you are at least 16 and accept the rules</td><td>Enforcing the minimum age. Your date of birth is checked on your phone and <strong>is not stored</strong>.</td></tr>
      <tr><td>Reports and blocked users</td><td>Moderation and safety. People who are reported or blocked don't know by whom.</td></tr>
      <tr><td>New texts and images</td><td>Sent to OpenAI's automatic moderation filter to find content that isn't allowed. They are not used to train models.</td></tr>
      <tr><td>GIPHY searches</td><td>Showing you stickers and GIFs. The search word is sent to GIPHY, not your account.</td></tr>
    </tbody>
  </table></div>
  <p>Legal basis: providing the service you asked for by creating an account and, for moderation, our legitimate interest in keeping the community safe.</p>
  <h2>Who processes data on our behalf</h2>
  <ul>
    <li><strong>Supabase</strong>: database, accounts and image storage, on servers in Europe.</li>
    <li><strong>OpenAI</strong>: automatic moderation of texts and images.</li>
    <li><strong>GIPHY</strong>: searching and showing stickers and GIFs.</li>
    <li><strong>GitHub Pages</strong>: hosting the website and the web version of the app.</li>
  </ul>
  <h2>How long</h2>
  <p>We keep your data as long as you have an account. If you delete it, we erase your profile, problems, replies, stars, uploaded stickers, reports and blocks. They may remain briefly in backups, which are overwritten automatically.</p>
  <h2>Your rights</h2>
  <ul>
    <li><strong>Delete your account</strong> at any time in the app: Profile → Settings → Delete account.</li>
    <li>Edit your name and bio from your profile, and delete your problems and replies from the ⋯ menu.</li>
    <li>Ask for a copy of your data, its correction or restriction, by writing to {todo('email', L)}.</li>
    <li>Complain to a data protection authority: in Switzerland the FDPIC, in the EU the authority of your country.</li>
  </ul>
  <h2>Minors</h2>
  <p>Stickback is for people aged 16 and over. If we find out an account belongs to someone younger, we delete it.</p>""",
        footer='See also the <a href="{rules}">community rules</a>.'),
    "de": dict(title="Datenschutzerklärung", body=lambda L: f"""
  <p class="lead">Wir sammeln nur die Daten, die Stickback zum Funktionieren braucht. Wir verkaufen deine Daten nicht und zeigen keine Werbung.</p>
  <h2>Wer verantwortlich ist</h2>
  <p>Verantwortlich: {todo('owner', L)}, {todo('address', L)}. Kontakt für Datenschutz: {todo('email', L)}.</p>
  <h2>Welche Daten wir nutzen und warum</h2>
  <div class="tablewrap"><table>
    <thead><tr><th>Daten</th><th>Warum</th></tr></thead>
    <tbody>
      <tr><td>E-Mail und Passwort (das Passwort wird nur verschlüsselt gespeichert)</td><td>Dein Konto erstellen und dich anmelden.</td></tr>
      <tr><td>Benutzername, Name und Bio</td><td>Dein Profil anderen zeigen.</td></tr>
      <tr><td>Probleme, Antworten, Sterne, hochgeladene und gespeicherte Sticker</td><td>Damit die App funktioniert. Probleme, Antworten und darin benutzte Sticker sind für andere registrierte Personen sichtbar.</td></tr>
      <tr><td>Bestätigung, dass du mindestens 16 bist und die Regeln akzeptierst</td><td>Das Mindestalter einhalten. Dein Geburtsdatum wird auf dem Handy geprüft und <strong>nicht gespeichert</strong>.</td></tr>
      <tr><td>Meldungen und blockierte Personen</td><td>Moderation und Sicherheit. Wer gemeldet oder blockiert wird, erfährt nicht, von wem.</td></tr>
      <tr><td>Neue Texte und Bilder</td><td>Werden an den automatischen Moderationsfilter von OpenAI geschickt, um verbotene Inhalte zu finden. Sie werden nicht zum Trainieren von Modellen verwendet.</td></tr>
      <tr><td>Suchen auf GIPHY</td><td>Dir Sticker und GIFs zeigen. Der Suchbegriff geht an GIPHY, nicht dein Konto.</td></tr>
    </tbody>
  </table></div>
  <p>Rechtsgrundlage: die Erbringung des Dienstes, den du mit deinem Konto angefordert hast, und für die Moderation unser berechtigtes Interesse an einer sicheren Community.</p>
  <h2>Wer Daten in unserem Auftrag bearbeitet</h2>
  <ul>
    <li><strong>Supabase</strong>: Datenbank, Konten und Bildspeicher, auf Servern in Europa.</li>
    <li><strong>OpenAI</strong>: automatische Moderation von Texten und Bildern.</li>
    <li><strong>GIPHY</strong>: Suche und Anzeige von Stickern und GIFs.</li>
    <li><strong>GitHub Pages</strong>: Veröffentlichung der Website und der Web-Version der App.</li>
  </ul>
  <h2>Wie lange</h2>
  <p>Wir behalten deine Daten, solange du ein Konto hast. Wenn du es löschst, löschen wir Profil, Probleme, Antworten, Sterne, hochgeladene Sticker, Meldungen und Blockierungen. Sie können kurz in Sicherungskopien bleiben, die automatisch überschrieben werden.</p>
  <h2>Deine Rechte</h2>
  <ul>
    <li><strong>Konto löschen</strong>, jederzeit in der App: Profil → Einstellungen → Konto löschen.</li>
    <li>Name und Bio im Profil ändern, und deine Probleme und Antworten über das Menü ⋯ löschen.</li>
    <li>Eine Kopie deiner Daten, ihre Berichtigung oder Einschränkung verlangen, per E-Mail an {todo('email', L)}.</li>
    <li>Beschwerde bei einer Datenschutzbehörde einreichen: in der Schweiz beim EDÖB, in der EU bei der Behörde deines Landes.</li>
  </ul>
  <h2>Minderjährige</h2>
  <p>Stickback ist ab 16 Jahren. Wenn wir erfahren, dass ein Konto einer jüngeren Person gehört, löschen wir es.</p>""",
        footer='Lies auch die <a href="{rules}">Community-Regeln</a>.'),
    "fr": dict(title="Politique de confidentialité", body=lambda L: f"""
  <p class="lead">Nous collectons seulement les données dont Stickback a besoin pour fonctionner. Nous ne vendons pas tes données et n'affichons pas de pub.</p>
  <h2>Qui est responsable</h2>
  <p>Responsable du traitement : {todo('owner', L)}, {todo('address', L)}. Contact pour la confidentialité : {todo('email', L)}.</p>
  <h2>Quelles données et pourquoi</h2>
  <div class="tablewrap"><table>
    <thead><tr><th>Données</th><th>Pourquoi</th></tr></thead>
    <tbody>
      <tr><td>E-mail et mot de passe (le mot de passe est seulement enregistré chiffré)</td><td>Créer ton compte et te connecter.</td></tr>
      <tr><td>Nom d'utilisateur, nom et bio</td><td>Montrer ton profil aux autres.</td></tr>
      <tr><td>Problèmes, réponses, étoiles, stickers ajoutés et enregistrés</td><td>Le fonctionnement de l'app. Les problèmes, réponses et stickers utilisés dans les réponses sont visibles par les autres utilisateurs inscrits.</td></tr>
      <tr><td>Confirmation d'avoir au moins 16 ans et acceptation des règles</td><td>Respecter l'âge minimum. Ta date de naissance est vérifiée sur ton téléphone et <strong>n'est pas enregistrée</strong>.</td></tr>
      <tr><td>Signalements et personnes bloquées</td><td>Modération et sécurité. Les personnes signalées ou bloquées ne savent pas par qui.</td></tr>
      <tr><td>Nouveaux textes et images</td><td>Envoyés au filtre de modération automatique d'OpenAI pour trouver les contenus interdits. Ils ne servent pas à entraîner des modèles.</td></tr>
      <tr><td>Recherches GIPHY</td><td>Te montrer des stickers et des GIF. Le mot cherché est envoyé à GIPHY, pas ton compte.</td></tr>
    </tbody>
  </table></div>
  <p>Base légale : l'exécution du service que tu as demandé en créant un compte et, pour la modération, notre intérêt légitime à garder la communauté sûre.</p>
  <h2>Qui traite les données pour nous</h2>
  <ul>
    <li><strong>Supabase</strong> : base de données, comptes et stockage des images, sur des serveurs en Europe.</li>
    <li><strong>OpenAI</strong> : modération automatique des textes et des images.</li>
    <li><strong>GIPHY</strong> : recherche et affichage des stickers et des GIF.</li>
    <li><strong>GitHub Pages</strong> : publication du site et de la version web de l'app.</li>
  </ul>
  <h2>Combien de temps</h2>
  <p>Nous gardons tes données tant que tu as un compte. Si tu le supprimes, nous effaçons ton profil, tes problèmes, réponses, étoiles, stickers ajoutés, signalements et blocages. Ils peuvent rester peu de temps dans les sauvegardes, qui sont écrasées automatiquement.</p>
  <h2>Tes droits</h2>
  <ul>
    <li><strong>Supprimer ton compte</strong> à tout moment dans l'app : Profil → Réglages → Supprimer le compte.</li>
    <li>Modifier ton nom et ta bio depuis ton profil, et supprimer tes problèmes et réponses avec le menu ⋯.</li>
    <li>Demander une copie de tes données, leur rectification ou la limitation du traitement, en écrivant à {todo('email', L)}.</li>
    <li>Déposer une plainte auprès d'une autorité de protection des données : en Suisse le PFPDT, en France la CNIL.</li>
  </ul>
  <h2>Mineurs</h2>
  <p>Stickback est réservé aux personnes de 16 ans et plus. Si nous découvrons qu'un compte appartient à une personne plus jeune, nous le supprimons.</p>""",
        footer='Lis aussi les <a href="{rules}">règles de la communauté</a>.'),
}

NAMES = [("it", "IT"), ("en", "EN"), ("de", "DE"), ("fr", "FR")]


def page(lang, kind):
    data = (RULES if kind == "rules" else PRIVACY)[lang]
    up = "" if lang == "it" else "../"
    switch = " · ".join(
        f'<b>{label}</b>' if code == lang else f'<a href="{href(lang, code, kind)}" hreflang="{code}">{label}</a>'
        for code, label in NAMES)
    footer = data["footer"].format(rules=href(lang, lang, "rules").split("/")[-1], privacy=href(lang, lang, "privacy").split("/")[-1])
    return f"""<!doctype html>
<html lang="{lang}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>{data['title']} · Stickback</title>
<meta name="theme-color" content="#1a1622">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,800&family=Figtree:wght@400;600&display=swap">
<link rel="stylesheet" href="{up}legal.css">
</head>
<body>
<main>
  <div class="top"><a class="logo" href="{up}./">Stick<b>back</b></a><nav class="langs" aria-label="Language">{switch}</nav></div>
  <h1>{data['title']}</h1>
  <p class="updated">{VERSION[lang]}</p>
{data['body'](lang)}

  <footer>{footer}</footer>
</main>
</body>
</html>
"""


for lang, _ in NAMES:
    for kind in ("rules", "privacy"):
        out = PUBLIC / path(lang, kind)
        out.parent.mkdir(parents=True, exist_ok=True)
        out.write_text(page(lang, kind), encoding="utf-8")
        print("wrote", out.relative_to(PUBLIC.parent))
