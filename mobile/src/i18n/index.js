// Languages: the app follows the phone's language (Italian, English, German or French),
// uses English for every other language, and can be changed by hand in Settings.
import AsyncStorage from "@react-native-async-storage/async-storage";
import { getLocales } from "expo-localization";
import it from "./it.js";
import en from "./en.js";
import de from "./de.js";
import fr from "./fr.js";

const DICTS = { it, en, de, fr };
export const LANGUAGES = [["it", "Italiano"], ["en", "English"], ["de", "Deutsch"], ["fr", "Français"]];
const KEY = "stickback.lang";

const phoneLocales = () => { try { return getLocales(); } catch { return []; } };
const fromPhone = () => phoneLocales().map((l) => l.languageCode).find((c) => DICTS[c]) || "en";

let current = fromPhone();
let chosen = null; // null = same as the phone
const listeners = new Set();

export const lang = () => current;
export const chosenLanguage = () => chosen;
// The phone's country, for local help numbers ("CH", "IT", …)
export const region = () => (phoneLocales()[0]?.regionCode || "").toUpperCase();

// Called once at start, before the first screen
export async function loadLanguage() {
  try {
    const saved = await AsyncStorage.getItem(KEY);
    if (saved && DICTS[saved]) { chosen = saved; current = saved; }
  } catch { /* keep the phone's language */ }
}

// code = "it" | "en" | "de" | "fr", or null to follow the phone again
export async function setLanguage(code) {
  chosen = code && DICTS[code] ? code : null;
  current = chosen || fromPhone();
  try { chosen ? await AsyncStorage.setItem(KEY, chosen) : await AsyncStorage.removeItem(KEY); } catch { /* fine */ }
  listeners.forEach((fn) => fn(current));
}
export function onLanguageChange(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

// t("toast.newReply", { user: "luca" }) → "@luca ha risposto al tuo problema"
export function t(key, vars) {
  let s = DICTS[current][key] ?? en[key] ?? key;
  if (vars) for (const [k, v] of Object.entries(vars)) s = s.split(`{${k}}`).join(String(v));
  return s;
}
// Singular or plural: tn("toast.stickersAdded", 3)
export const tn = (key, n, vars) => t(`${key}.${n === 1 ? "one" : "other"}`, { n, ...vars });

// For dates and numbers
export const localeTag = () => ({ it: "it-IT", en: "en-GB", de: "de-CH", fr: "fr-CH" })[current];

// Rules and privacy pages in the right language
const SITE = "https://vanroomenf.github.io/stickback";
export const rulesUrl = () => (current === "it" ? `${SITE}/regole.html` : `${SITE}/${current}/rules.html`);
export const privacyUrl = () => (current === "it" ? `${SITE}/privacy.html` : `${SITE}/${current}/privacy.html`);

// Free, anonymous helplines by country, shown when someone reports self-harm
const HELPLINES = {
  CH: { emergency: "112", lines: [["143", { it: "Telefono Amico", de: "Die Dargebotene Hand", fr: "La Main Tendue", en: "Die Dargebotene Hand" }], ["147", "Pro Juventute", true]] },
  IT: { emergency: "112", lines: [["02 2327 2327", "Telefono Amico Italia"]] },
  DE: { emergency: "112", lines: [["0800 111 0 111", "TelefonSeelsorge"], ["116 111", "Nummer gegen Kummer", true]] },
  AT: { emergency: "112", lines: [["142", "Telefonseelsorge"], ["147", "Rat auf Draht", true]] },
  FR: { emergency: "112", lines: [["3114", { fr: "Numéro national de prévention du suicide", en: "National suicide prevention line", it: "Numero nazionale di prevenzione del suicidio", de: "Nationale Suizidpräventionsnummer" }]] },
  GB: { emergency: "999", lines: [["116 123", "Samaritans"]] },
  US: { emergency: "911", lines: [["988", "988 Suicide & Crisis Lifeline"]] },
};
export function helplines() {
  const h = HELPLINES[region()];
  if (!h) return { emergency: "112", lines: [] };
  return {
    emergency: h.emergency,
    lines: h.lines.map(([number, name, youth]) => ({
      number, youth: !!youth,
      name: typeof name === "string" ? name : name[current] || name.en,
    })),
  };
}
