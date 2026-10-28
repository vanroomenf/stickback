// All app data lives in one reducer: problems, replies, users and your sticker collection.

const mapProblem = (state, pid, fn) => ({
  ...state,
  problems: state.problems.map((p) => (p.id === pid ? fn(p) : p)),
});

const toggle = (o) => ({ ...o, starred: !o.starred, stars: o.stars + (o.starred ? -1 : 1) });

export function reducer(state, a) {
  switch (a.type) {
    case "starProblem":
      return mapProblem(state, a.pid, toggle);
    case "starReply":
      return mapProblem(state, a.pid, (p) => ({
        ...p,
        memes: p.memes.map((m) => (m.id === a.mid ? toggle(m) : m)),
      }));
    case "pickWinner":
      return mapProblem(state, a.pid, (p) => ({ ...p, winner: a.mid }));
    case "addReply":
      return mapProblem(state, a.pid, (p) => ({ ...p, memes: [...p.memes, a.meme], stars: p.stars + (a.bump || 0) }));
    case "addProblem":
      return { ...state, problems: [a.problem, ...state.problems] };
    case "addStickers":
      return { ...state, myStickers: [...a.stickers, ...state.myStickers] };
    case "updateProfile":
      return { ...state, users: { ...state.users, [a.user]: { ...state.users[a.user], ...a.data } } };
    default:
      return state;
  }
}

// Winner first, then most stars
export const orderReplies = (p) =>
  [...p.memes].sort((a, b) => (b.id === p.winner) - (a.id === p.winner) || b.stars - a.stars);
