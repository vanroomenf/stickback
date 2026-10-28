let uid = 1000;
export const nextId = () => ++uid;

// Short number for counters: 1203 → "1,2k"
export const fmt = (n) => (n >= 1000 ? (n / 1000).toFixed(1).replace(".", ",") + "k" : String(n));

// Stable hue per username, for avatars
export const hue = (s) => [...s].reduce((a, c) => (a * 31 + c.charCodeAt(0)) % 360, 7);

// Small stable tilt per reply, so stickers look hand-placed
export const rot = (id) => ((id * 7) % 9 - 4) * 1.2 + "deg";

export const nameOf = (users, u) => users[u]?.name || u;
export const initialOf = (users, u) => nameOf(users, u)[0].toUpperCase();

// "adesso", "5 min", "2 h", "3 g", or a short date
export function ago(iso) {
  const s = (Date.now() - new Date(iso).getTime()) / 1000;
  if (s < 60) return "adesso";
  if (s < 3600) return `${Math.floor(s / 60)} min`;
  if (s < 86400) return `${Math.floor(s / 3600)} h`;
  if (s < 604800) return `${Math.floor(s / 86400)} g`;
  return new Date(iso).toLocaleDateString("it-IT", { day: "numeric", month: "short" });
}
