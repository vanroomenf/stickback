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
