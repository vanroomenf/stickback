// What the app shows: problems with their replies, the people in them, and your sticker collection.
// Changes are applied here right away (so the app feels instant) and sent to Supabase in parallel.
import { exampleStickers } from "./data.js";

export const initialState = () => ({ problems: [], users: {}, myStickers: exampleStickers(), loaded: false });

const mapProblem = (state, pid, fn) => ({
  ...state,
  problems: state.problems.map((p) => (p.id === pid ? fn(p) : p)),
});

const toggle = (o) => ({ ...o, starred: !o.starred, stars: o.stars + (o.starred ? -1 : 1) });

const withoutExamplesOf = (list, stickers) => {
  const seen = new Set(stickers.map((st) => st.v));
  return list.filter((st) => !seen.has(st.v));
};

export function reducer(state, a) {
  switch (a.type) {
    case "setFeed":
      return { ...state, problems: a.problems, users: { ...state.users, ...a.users }, loaded: true };
    case "setUsers":
      return { ...state, users: { ...state.users, ...a.users } };
    case "starProblem":
      return mapProblem(state, a.pid, toggle);
    case "starReply":
      return mapProblem(state, a.pid, (p) => ({
        ...p,
        memes: p.memes.map((m) => (m.id === a.mid ? toggle(m) : m)),
      }));
    case "addReply":
      return mapProblem(state, a.pid, (p) =>
        p.memes.some((m) => m.id === a.meme.id) ? p : { ...p, memes: [...p.memes, a.meme] });
    case "addProblem":
      return { ...state, problems: [a.problem, ...state.problems.filter((p) => p.id !== a.problem.id)] };
    case "setSaved":
      // your saved stickers first, then the GIPHY examples you haven't saved
      return { ...state, myStickers: [...a.stickers, ...withoutExamplesOf(exampleStickers(), a.stickers)] };
    case "addStickers": {
      const fresh = a.stickers.map(({ example, ...st }) => st);
      return { ...state, myStickers: [...fresh, ...withoutExamplesOf(state.myStickers, fresh)] };
    }
    case "removeSticker":
      return { ...state, myStickers: state.myStickers.filter((st) => st.v !== a.v) };
    case "updateProfile":
      return { ...state, users: { ...state.users, [a.user]: { ...state.users[a.user], ...a.data } } };
    default:
      return state;
  }
}

// Most stars first
export const orderReplies = (p) => [...p.memes].sort((a, b) => b.stars - a.stars);
