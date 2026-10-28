import { nextId } from "./lib/util.js";
import { emoji } from "./lib/stickers.js";

// The person using the app
export const ME = "tu";

const reply = (author, stars, e, caption) => ({
  id: nextId(), author, stars, starred: false, sticker: emoji(e), caption,
});

// Example content for the prototype
export function seed() {
  const users = {
    tu: { name: "Tu", bio: "Colleziono figuracce e sticker. Rispondo sempre, anche quando non dovrei." },
    "marti.rossi": { name: "Martina", bio: "Lo shopping online è il mio cardio." },
    luca_02: { name: "Luca", bio: "Quinta liceo. Sopravvivo." },
    "sofi.vb": { name: "Sofia", bio: "Cerco lavoro, trovo figuracce." },
    "dani.ferr": { name: "Daniele", bio: "Saluto tutti per sicurezza." },
  };

  const problems = [
    { id: 1, author: "marti.rossi", time: "2 h", stars: 842, starred: false, winner: null,
      text: "Mia madre ha trovato il pacco di Zalando che avevo nascosto sotto il letto.",
      memes: [
        reply("fede.gallo", 203, "🤡", "ho nascosto il pacco ma non la mail di conferma"),
        reply("teo_b", 128, "😳", "io che torno a casa e il pacco è sul tavolo"),
        reply("chiaraaa", 94, "👀", "tua madre con lo scontrino in mano"),
        reply("nico.vrd", 61, "💀", "già morto dentro"),
      ] },
    { id: 2, author: "luca_02", time: "5 h", stars: 517, starred: false, winner: null,
      text: "Il prof ha detto «domani interrogo a caso» e io sono il primo dell’elenco.",
      memes: [
        reply("ire.m", 154, "🫠", "io alle 2 dopo «solo un episodio»"),
        reply("tu", 45, "🤡", "il mio piano: ammalarmi alle 7:30"),
        reply("pietro.z", 87, "🤯", "il mio cervello alle 23:58"),
        reply("giada.r", 66, "🙃", "a caso. sempre io però"),
      ] },
    { id: 3, author: "tu", time: "ieri", stars: 96, starred: false, winner: null,
      text: "Ho mandato un vocale di 4 minuti alla chat sbagliata.",
      memes: [
        reply("sara.lll", 58, "🙈", "l’hanno già sentito in 12"),
        reply("marco_t", 41, "😭", "quando vedi le spunte blu"),
        reply("bea.f", 33, "💀", "addio dignità"),
      ] },
    { id: 4, author: "sofi.vb", time: "1 g", stars: 1203, starred: false, winner: null,
      text: "Al colloquio mi hanno chiesto dove mi vedo tra 5 anni e ho risposto «a casa mia».",
      memes: [
        reply("tu", 131, "🥲", "onestà: 10. assunzione: 0"),
        reply("andre.c", 110, "😬", "il silenzio subito dopo"),
        reply("lori_", 72, "😎", "non hai torto però"),
      ] },
    { id: 5, author: "dani.ferr", time: "2 g", stars: 388, starred: false, winner: null,
      text: "Ho salutato una persona che in realtà salutava quello dietro di me.",
      memes: [
        reply("vale.p", 140, "🥲", "ora fingo di sistemarmi i capelli"),
        reply("ste.94", 88, "🙃", "saluto con sicurezza. non era per me"),
        reply("ali.rss", 76, "😵", "io per il resto della giornata"),
      ] },
  ];
  problems[0].winner = problems[0].memes[0].id;
  problems[3].winner = problems[3].memes[0].id;

  const myStickers = ["🤡", "💀", "🫠", "😭", "🙃", "😳", "🥲", "👀"].map(emoji);

  return { users, problems, myStickers };
}

// Replies that arrive a few seconds after you post, to show notifications in the prototype
export const fakeReplies = () => [
  { delay: 3500, bump: 4, meme: reply("giuli.04", 3, "😭", "perché è successo anche a me") },
  { delay: 7500, bump: 7, meme: reply("ale_mrt", 5, "🔥", "è già troppo tardi") },
];
