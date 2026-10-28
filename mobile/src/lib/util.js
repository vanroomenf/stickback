import { localeTag, t } from "../i18n/index.js";

let uid = 1000;
export const nextId = () => ++uid;

// Short number for counters: 1203 → "1,2k"
export const fmt = (n) => (n >= 1000 ? (n / 1000).toLocaleString(localeTag(), { maximumFractionDigits: 1 }) + "k" : String(n));

// Stable hue per username, for avatars
export const hue = (s) => [...s].reduce((a, c) => (a * 31 + c.charCodeAt(0)) % 360, 7);

// Small stable tilt per reply, so stickers look hand-placed
export const rot = (id) => ((id * 7) % 9 - 4) * 1.2 + "deg";

export const nameOf = (users, u) => users[u]?.name || u;
export const initialOf = (users, u) => nameOf(users, u)[0].toUpperCase();

// "now", "5 min", "2 h", "3 d" (in the app's language), or a short date
export function ago(iso) {
  const s = (Date.now() - new Date(iso).getTime()) / 1000;
  if (s < 60) return t("time.now");
  if (s < 3600) return t("time.min", { n: Math.floor(s / 60) });
  if (s < 86400) return t("time.h", { n: Math.floor(s / 3600) });
  if (s < 604800) return t("time.d", { n: Math.floor(s / 86400) });
  return new Date(iso).toLocaleDateString(localeTag(), { day: "numeric", month: "short" });
}

// "GG/MM/AAAA" → age in whole years, or null if the date isn't valid
export function ageFrom(text) {
  const m = /^(\d{1,2})[./-](\d{1,2})[./-](\d{4})$/.exec(text.trim());
  if (!m) return null;
  const [d, mo, y] = [Number(m[1]), Number(m[2]), Number(m[3])];
  const born = new Date(y, mo - 1, d);
  if (born.getFullYear() !== y || born.getMonth() !== mo - 1 || born.getDate() !== d) return null;
  const now = new Date();
  if (born > now || y < 1900) return null;
  let age = now.getFullYear() - y;
  if (now.getMonth() < mo - 1 || (now.getMonth() === mo - 1 && now.getDate() < d)) age--;
  return age;
}

export const MIN_AGE = 16;
export const TERMS_VERSION = "2026-10";
