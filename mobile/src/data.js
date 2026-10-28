import { nextId } from "./lib/util.js";
import { giphy } from "./lib/stickers.js";
import AsyncStorage from "@react-native-async-storage/async-storage";

// The person using the app
export const ME = "tu";

const reply = (author, stars, sticker, caption) => ({
  id: nextId(), author, stars, starred: false, sticker, caption,
});
const S = (id, file) => giphy(id, "img", file);
const G = (id) => giphy(id, "gif");

const SAVED = "stickback.myStickers";

// Your stickers are kept on the phone with AsyncStorage
export async function loadSavedStickers() {
  try {
    const list = JSON.parse((await AsyncStorage.getItem(SAVED)) || "[]");
    return Array.isArray(list) ? list.filter((st) => st && st.v) : [];
  } catch {
    return [];
  }
}

// Resolves false when the phone has no room left
export async function saveStickers(list) {
  try {
    await AsyncStorage.setItem(SAVED, JSON.stringify(list.filter((st) => !st.example)));
    return true;
  } catch {
    return false;
  }
}

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
        reply("fede.gallo", 203, S("fYZMXUJOlNEF7zNqwo"), "ho nascosto il pacco ma non la mail di conferma"),
        reply("teo_b", 128, S("tsyWj6suQo0PQcYopK"), "io che torno a casa e il pacco è sul tavolo"),
        reply("chiaraaa", 94, G("H5C8CevNMbpBqNqFjl"), "tua madre con lo scontrino in mano"),
        reply("nico.vrd", 61, S("xUA7b4nXsKuuWgvgek"), "già morto dentro"),
      ] },
    { id: 2, author: "luca_02", time: "5 h", stars: 517, starred: false, winner: null,
      text: "Il prof ha detto «domani interrogo a caso» e io sono il primo dell’elenco.",
      memes: [
        reply("ire.m", 154, S("it84LturxPTLV7m5nu"), "io alle 2 dopo «solo un episodio»"),
        reply("tu", 45, S("XHV0PSHohFOK31C2W2"), "il mio piano: ammalarmi alle 7:30"),
        reply("pietro.z", 87, G("75ZaxapnyMp2w"), "il mio cervello alle 23:58"),
        reply("giada.r", 66, S("JQeGekyFs3oZR2RbnJ"), "a caso. sempre io però"),
      ] },
    { id: 3, author: "tu", time: "ieri", stars: 96, starred: false, winner: null,
      text: "Ho mandato un vocale di 4 minuti alla chat sbagliata.",
      memes: [
        reply("sara.lll", 58, S("hTmIgczpw0wo3iEZox"), "l’hanno già sentito in 12"),
        reply("marco_t", 41, G("WF7boIogNoMYfyEMfJ"), "quando vedi le spunte blu"),
        reply("bea.f", 33, S("3NhnuUcicuqvWOwwyo"), "addio dignità"),
      ] },
    { id: 4, author: "sofi.vb", time: "1 g", stars: 1203, starred: false, winner: null,
      text: "Al colloquio mi hanno chiesto dove mi vedo tra 5 anni e ho risposto «a casa mia».",
      memes: [
        reply("tu", 131, S("5vaSWRP4iRf8IrMs5l"), "onestà: 10. assunzione: 0"),
        reply("andre.c", 110, G("11R5KYi6ZdP8Z2"), "il silenzio subito dopo"),
        reply("lori_", 72, S("Iac9qAo63lEixtljSA"), "non hai torto però"),
      ] },
    { id: 5, author: "dani.ferr", time: "2 g", stars: 388, starred: false, winner: null,
      text: "Ho salutato una persona che in realtà salutava quello dietro di me.",
      memes: [
        reply("vale.p", 140, S("tOshx058GgKFmp6C9x"), "ora fingo di sistemarmi i capelli"),
        reply("ste.94", 88, G("YWlGwTLmlwZ1qdh9Rq"), "saluto con sicurezza. non era per me"),
        reply("ali.rss", 76, S("tr4TTyG4BjxfDioymO"), "io per il resto della giornata"),
      ] },
  ];
  problems[0].winner = problems[0].memes[0].id;
  problems[3].winner = problems[3].memes[0].id;

  // A few examples from GIPHY; your saved stickers are loaded from the phone right after start
  const examples = [
    S("7tjJBKwoDBxoj6nsrV"), S("9dpRdBxidjDOBt3NpM"), S("tr4TTyG4BjxfDioymO"), S("gF92QJVGxi3IZDVzDy"),
    S("Xnc4pmKdiS9bLzsMRk"), S("3oKIPuWIyL38g3pWSs"), S("DflFs8DrNVZNXFdkh8", "giphy-downsized-medium.gif"), S("WeE0UodPY4iAgwRpLK"),
  ].map((st) => ({ ...st, example: true }));
  const myStickers = examples;

  return { users, problems, myStickers };
}

// Replies that arrive a few seconds after you post, to show notifications in the prototype
export const fakeReplies = () => [
  { delay: 3500, bump: 4, meme: reply("giuli.04", 3, S("WeE0UodPY4iAgwRpLK"), "perché è successo anche a me") },
  { delay: 7500, bump: 7, meme: reply("ale_mrt", 5, S("6St8Iw8OkwC0JW9Mub"), "è già troppo tardi") },
];
