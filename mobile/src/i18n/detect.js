// Guesses whether a short text is Italian, English, German or French, on the phone, with no service.
// Counts common little words and typical letters; when unsure it returns the fallback (the app's language).

const WORDS = {
  it: `il lo la gli le un una uno di da del della dei delle al alla nel nella che non per con su mi ti si ci è ho ha hai
    sono era ero mia mio tuo tua suo sua ma anche come quando perché dopo prima ancora sempre tutto tutti tutta
    io tu lui lei noi voi loro questo questa quello quella oggi ieri domani prof mamma papà scuola casa ciao
    stato stata fatto detto messo andato mai più poi già molto troppo cosa chi dove`,
  en: `the a an and of to in is was were i you he she it we they my your his her our their me him them this that
    these those at on for with from by not but so just when after before because have has had did do does got
    been am are be what who where why how all very too again today yesterday mom dad school home teacher class
    accidentally then into out up`,
  de: `der die das den dem des ein eine einen einem einer und ist war bin hat habe hatte ich du er sie es wir ihr
    mein meine dein deine sein seine nicht nicht kein keine mit von zu im in am auf für aus bei nach vor weil dass
    aber auch noch schon immer heute gestern morgen mama papa schule lehrer lehrerin klasse wieder ganz sehr mich
    mir dich dir sich was wer wo wie habe hab bus zug`,
  fr: `le la les un une des du de et est était suis ai as a avait je tu il elle on nous vous ils elles mon ma mes
    ton ta tes son sa ses ne pas plus que qui dans sur pour avec par mais aussi encore toujours aujourd'hui hier
    demain maman papa école prof classe devant toute tout tous très trop quand après avant parce j'ai c'est moi toi
    lui leur au aux en cette ce`,
};
const SETS = Object.fromEntries(Object.entries(WORDS).map(([k, v]) => [k, new Set(v.split(/\s+/).filter(Boolean))]));

// Letters and endings that point to one language
const HINTS = {
  de: [/[äöüß]/g, /\b\w+(ung|keit|lich|chen|sch\w*)\b/g],
  fr: [/[çêëîïôûœ]/g, /\b(j|l|d|c|qu|n|m|t|s)'/g, /\b\w+(eux|aux|tion|ment)\b/g],
  it: [/\b\w+(zione|mente|ato|ata|uto|ito|ino|ina|etto|etta)\b/g, /\b\w+[aeiou]\b/g],
  en: [/\b\w+(ing|ed|ly)\b/g, /\b\w+'(s|t|m|re|ve|ll|d)\b/g],
};

export function detectLanguage(text, fallback = "en") {
  const clean = text.toLowerCase().replace(/[’`]/g, "'");
  const words = clean.match(/[\p{L}']+/gu) || [];
  if (!words.length) return fallback;
  const score = { it: 0, en: 0, de: 0, fr: 0 };
  for (const w of words) {
    for (const k of Object.keys(score)) {
      if (SETS[k].has(w)) score[k] += 2;
      else if (w.includes("'") && SETS[k].has(w.split("'")[0] + "'")) score[k] += 1;
    }
  }
  for (const [k, patterns] of Object.entries(HINTS)) {
    for (const re of patterns) score[k] += Math.min(3, (clean.match(re) || []).length) * (k === "it" && re === HINTS.it[1] ? 0.3 : 1);
  }
  const ranked = Object.entries(score).sort((a, b) => b[1] - a[1]);
  const [[best, top], [, second]] = ranked;
  // not enough clues, or too close to call: trust the app's language
  if (top < 2 || top - second < 1) return fallback;
  return best;
}
