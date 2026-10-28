// Everything the app reads from and writes to Supabase.
import { decode } from "base64-arraybuffer";
import { supabase } from "./supabase.js";
import { ago } from "./util.js";

const PROFILE = "id, username, name, bio";

// Only the fields a sticker needs, nothing local
export const cleanSticker = ({ type, v, thumb, giphy }) => ({ type, v, ...(thumb ? { thumb } : {}), ...(giphy ? { giphy: true } : {}) });

const fail = (error) => { if (error) throw error; };

// ───────── Feed ─────────
export async function loadFeed(uid) {
  const { data, error } = await supabase
    .from("problems")
    .select(`id, text, created_at, winner_reply_id,
      author:profiles!problems_author_id_fkey(${PROFILE}),
      problem_stars(count),
      replies!replies_problem_id_fkey(id, caption, sticker, created_at,
        author:profiles!replies_author_id_fkey(${PROFILE}),
        reply_stars(count))`)
    .order("created_at", { ascending: false })
    .limit(60);
  fail(error);

  const pids = data.map((p) => p.id);
  const rids = data.flatMap((p) => p.replies.map((r) => r.id));
  const [myP, myR] = await Promise.all([
    pids.length ? supabase.from("problem_stars").select("problem_id").eq("user_id", uid).in("problem_id", pids) : { data: [] },
    rids.length ? supabase.from("reply_stars").select("reply_id").eq("user_id", uid).in("reply_id", rids) : { data: [] },
  ]);
  fail(myP.error); fail(myR.error);
  const starredP = new Set(myP.data.map((x) => x.problem_id));
  const starredR = new Set(myR.data.map((x) => x.reply_id));

  const users = {};
  const keep = (pr) => { if (pr) users[pr.username] = { id: pr.id, name: pr.name, bio: pr.bio }; return pr?.username ?? "?"; };

  const problems = data.map((p) => ({
    id: p.id,
    author: keep(p.author),
    time: ago(p.created_at),
    text: p.text,
    winner: p.winner_reply_id,
    stars: p.problem_stars?.[0]?.count ?? 0,
    starred: starredP.has(p.id),
    memes: [...p.replies]
      .sort((a, b) => a.created_at.localeCompare(b.created_at))
      .map((r) => toReply(r, keep, starredR.has(r.id))),
  }));
  return { problems, users };
}

function toReply(r, keep, starred) {
  return {
    id: r.id,
    author: keep(r.author),
    caption: r.caption,
    sticker: r.sticker,
    stars: r.reply_stars?.[0]?.count ?? 0,
    starred,
  };
}

// One reply with its author, for replies that arrive live
export async function loadReply(id) {
  const { data, error } = await supabase
    .from("replies")
    .select(`id, problem_id, caption, sticker, created_at, author:profiles!replies_author_id_fkey(${PROFILE}), reply_stars(count)`)
    .eq("id", id)
    .single();
  fail(error);
  return data;
}
export const replyFromRow = (row, keep) => toReply(row, keep, false);

// ───────── Actions ─────────
export async function setProblemStar(pid, on) {
  const q = supabase.from("problem_stars");
  const { error } = on ? await q.insert({ problem_id: pid }) : await q.delete().eq("problem_id", pid).eq("user_id", (await me()).id);
  if (error && error.code !== "23505") throw error; // already starred is fine
}

export async function setReplyStar(rid, on) {
  const q = supabase.from("reply_stars");
  const { error } = on ? await q.insert({ reply_id: rid }) : await q.delete().eq("reply_id", rid).eq("user_id", (await me()).id);
  if (error && error.code !== "23505") throw error;
}

export async function pickWinner(pid, rid) {
  const { error } = await supabase.from("problems").update({ winner_reply_id: rid }).eq("id", pid);
  fail(error);
}

export async function createProblem(text) {
  const { data, error } = await supabase.from("problems").insert({ text }).select("id, created_at").single();
  fail(error);
  return data;
}

export async function createReply(pid, caption, sticker) {
  const uploaded = await ensureUploaded(sticker);
  const { data, error } = await supabase
    .from("replies")
    .insert({ problem_id: pid, caption, sticker: cleanSticker(uploaded) })
    .select("id")
    .single();
  fail(error);
  return { id: data.id, sticker: cleanSticker(uploaded) };
}

export async function updateProfile(uid, { name, bio }) {
  const { error } = await supabase.from("profiles").update({ name, bio }).eq("id", uid);
  fail(error);
}

export async function loadMyProfile(uid) {
  const { data, error } = await supabase.from("profiles").select(PROFILE).eq("id", uid).single();
  fail(error);
  return data;
}

async function me() {
  const { data } = await supabase.auth.getUser();
  return data.user;
}

// ───────── Sticker collection ─────────
export async function loadSavedStickers() {
  const { data, error } = await supabase.from("saved_stickers").select("id, sticker").order("created_at", { ascending: false });
  fail(error);
  return data.map((row) => ({ ...row.sticker, sid: row.id }));
}

export async function saveSticker(sticker) {
  const uploaded = await ensureUploaded(sticker);
  const clean = cleanSticker(uploaded);
  const { error } = await supabase.from("saved_stickers").insert({ sticker: clean });
  if (error && error.code !== "23505") throw error; // already in your collection
  return clean;
}

export async function removeSavedSticker(v) {
  const { error } = await supabase.from("saved_stickers").delete().eq("sticker->>v", v);
  fail(error);
}

// Images picked or pasted on the phone are data URIs: upload them to Storage first,
// so everyone can see them and they don't weigh on the database
export async function ensureUploaded(sticker) {
  if (!sticker.v.startsWith("data:")) return sticker;
  const m = /^data:([^;]+);base64,(.*)$/s.exec(sticker.v);
  if (!m) throw new Error("Immagine non valida");
  const [, mime, b64] = m;
  const ext = { "image/webp": "webp", "image/png": "png", "image/gif": "gif", "image/jpeg": "jpg" }[mime] || "webp";
  const uid = (await me()).id;
  const path = `${uid}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
  const { error } = await supabase.storage.from("stickers").upload(path, decode(b64), { contentType: mime, upsert: false });
  fail(error);
  const { data } = supabase.storage.from("stickers").getPublicUrl(path);
  return { type: "img", v: data.publicUrl };
}
