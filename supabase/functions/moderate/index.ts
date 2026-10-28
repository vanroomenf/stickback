// Stickback image and text filter (Supabase Edge Function "moderate").
//
// The database calls this function right after someone posts a problem, a reply or saves an
// uploaded sticker (see migrations/0003_image_filter.sql). It receives only the table name and the
// row id, loads the row itself, and asks OpenAI's free moderation model to check the text and the
// image. If the content is flagged, it is hidden (or removed from the sticker collection) and a
// report from "filtro automatico" lands in the moderators' queue.
//
// When a reply passes the check, the author of the problem gets a push notification on their
// phones (tokens in public.push_tokens, sent through Expo's push service), in their language.
//
// Secrets (Edge Functions → Secrets): OPENAI_API_KEY.
// SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are provided by Supabase automatically.

import { createClient } from "npm:@supabase/supabase-js@2";

const sb = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
const OPENAI_KEY = Deno.env.get("OPENAI_API_KEY") ?? "";

type Sticker = { type: "img" | "gif"; v: string; giphy?: boolean };

// OpenAI category → the report reasons used in the app
function reasonFor(categories: Record<string, boolean>): string {
  const on = (prefix: string) => Object.entries(categories).some(([k, v]) => v && k.startsWith(prefix));
  if (on("self-harm")) return "autolesionismo";
  if (on("sexual")) return "sessuale";
  if (on("hate") || on("violence")) return "odio";
  if (on("harassment")) return "bullismo";
  if (on("illicit")) return "altro";
  return "altro";
}

async function check(text: string | null, sticker: Sticker | null) {
  const input: unknown[] = [];
  if (text) input.push({ type: "text", text });
  // GIPHY content is already rated by GIPHY; only images people upload are checked
  if (sticker && !sticker.giphy && sticker.v?.startsWith("http")) {
    input.push({ type: "image_url", image_url: { url: sticker.v } });
  }
  if (!input.length) return null;

  const res = await fetch("https://api.openai.com/v1/moderations", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${OPENAI_KEY}` },
    body: JSON.stringify({ model: "omni-moderation-latest", input }),
  });
  if (!res.ok) throw new Error(`OpenAI ${res.status}: ${await res.text()}`);
  const { results } = await res.json();
  const flagged = results.find((r: { flagged: boolean }) => r.flagged);
  return flagged ? { categories: flagged.categories as Record<string, boolean> } : { categories: null };
}

// ───────── Push notifications ─────────
const NOTIFY: Record<string, (user: string, caption: string) => { title: string; body: string }> = {
  it: (u, c) => ({ title: `@${u} ti ha risposto`, body: c ? `«${c}»` : "Guarda lo sticker che ti ha mandato" }),
  en: (u, c) => ({ title: `@${u} replied to you`, body: c ? `“${c}”` : "See the sticker they sent you" }),
  de: (u, c) => ({ title: `@${u} hat dir geantwortet`, body: c ? `«${c}»` : "Schau dir den Sticker an" }),
  fr: (u, c) => ({ title: `@${u} t'a répondu`, body: c ? `« ${c} »` : "Regarde le sticker qu'on t'a envoyé" }),
};

// Tell the author of the problem about a new reply. showCaption is false when the text couldn't be checked.
async function notifyReply(replyId: number, showCaption: boolean) {
  const { data } = await sb.from("replies")
    .select("id, caption, author_id, hidden, notified_at, author:profiles!replies_author_id_fkey(username), problem:problems!replies_problem_id_fkey(id, author_id, hidden)")
    .eq("id", replyId).maybeSingle();
  // deno-lint-ignore no-explicit-any
  const r = data as any;
  if (!r || r.hidden || r.notified_at || !r.problem || r.problem.hidden) return;
  const to = r.problem.author_id as string;
  if (to === r.author_id) return; // replying to yourself

  const { count } = await sb.from("blocks").select("*", { count: "exact", head: true })
    .or(`and(blocker_id.eq.${to},blocked_id.eq.${r.author_id}),and(blocker_id.eq.${r.author_id},blocked_id.eq.${to})`);
  if (count) return;

  // claim the reply first, so two calls never send twice
  const { data: claimed } = await sb.from("replies").update({ notified_at: new Date().toISOString() })
    .eq("id", replyId).is("notified_at", null).select("id");
  if (!claimed?.length) return;

  const { data: phones } = await sb.from("push_tokens").select("token, lang").eq("user_id", to);
  if (!phones?.length) return;

  const messages = phones.map((p: { token: string; lang: string }) => ({
    to: p.token,
    sound: "default",
    ...(NOTIFY[p.lang] ?? NOTIFY.en)(r.author?.username ?? "?", showCaption ? r.caption : ""),
    data: { pid: r.problem.id, mid: r.id },
  }));
  const res = await fetch("https://exp.host/--/api/v2/push/send", {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify(messages),
  });
  if (!res.ok) { console.error("push", res.status, await res.text()); return; }
  // forget phones that uninstalled the app or turned notifications off for good
  const { data: tickets } = await res.json();
  const gone = (tickets ?? [])
    .map((t: { status: string; details?: { error?: string } }, i: number) => t.status === "error" && t.details?.error === "DeviceNotRegistered" ? messages[i].to : null)
    .filter(Boolean);
  if (gone.length) await sb.from("push_tokens").delete().in("token", gone);
}

Deno.serve(async (req) => {
  if (req.method !== "POST") return new Response("Method not allowed", { status: 405 });

  let table = "", id = 0;
  try {
    ({ table, id } = await req.json());
  } catch {
    return new Response("Bad request", { status: 400 });
  }
  if (!["problems", "replies", "saved_stickers"].includes(table) || !Number.isInteger(id)) {
    return new Response("Bad request", { status: 400 });
  }

  // Never trust the caller: load the row, and skip anything already checked
  const cols = table === "problems" ? "id, text, moderated_at"
    : table === "replies" ? "id, caption, sticker, moderated_at"
    : "id, user_id, sticker, moderated_at";
  const { data } = await sb.from(table).select(cols).eq("id", id).maybeSingle();
  // deno-lint-ignore no-explicit-any
  const row = data as any;
  if (!row || row.moderated_at) return new Response("skip");

  const text = table === "problems" ? row.text : table === "replies" ? row.caption : null;
  const sticker = table === "problems" ? null : (row.sticker as Sticker);

  let verdict;
  try {
    if (!OPENAI_KEY) throw new Error("OPENAI_API_KEY missing");
    verdict = await check(text, sticker);
  } catch (e) {
    console.error(e);
    // stays unchecked (reports still work); the notification goes out without the text
    if (table === "replies") await notifyReply(id, false).catch(console.error);
    return new Response("moderation failed", { status: 502 });
  }

  if (verdict?.categories) {
    const reason = reasonFor(verdict.categories);
    const details = "Filtro automatico: " + Object.entries(verdict.categories).filter(([, v]) => v).map(([k]) => k).join(", ");
    if (table === "saved_stickers") {
      await sb.from("saved_stickers").delete().eq("id", id);
      await sb.from("reports").insert({ reported_user_id: row.user_id, reason, details, source: "filtro" });
    } else {
      await sb.from(table).update({ hidden: true }).eq("id", id);
      await sb.from("reports").insert({
        [table === "problems" ? "problem_id" : "reply_id"]: id, reason, details, source: "filtro",
      });
    }
  }
  if (table !== "saved_stickers" || !verdict?.categories) {
    await sb.from(table).update({ moderated_at: new Date().toISOString() }).eq("id", id);
  }
  if (table === "replies" && !verdict?.categories) await notifyReply(id, true).catch(console.error);
  return new Response(verdict?.categories ? "hidden" : "ok");
});
