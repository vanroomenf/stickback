import { useCallback, useEffect, useMemo, useReducer, useRef, useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { initialState, reducer } from "./store.js";
import * as api from "./lib/api.js";
import { supabase } from "./lib/supabase.js";
import { pasteSticker, pickStickers } from "./lib/stickers.js";
import { nextId } from "./lib/util.js";
import { C, F } from "./theme.js";
import Feed from "./components/Feed.js";
import Profile from "./components/Profile.js";
import { EditProfileSheet, ProblemSheet, ReplySheet } from "./components/Sheets.js";
import { Avatar, HomeIcon, Toast } from "./components/ui.js";
import { ConfirmSheet, MoreSheet, ReportSheet, SettingsSheet, TermsGate } from "./components/Safety.js";
import { FeedHeader, TOPBAR_HEIGHT } from "./components/Social.js";


export default function StickbackApp({ userId }) {
  const insets = useSafeAreaInsets();
  const [state, dispatch] = useReducer(reducer, null, initialState);
  const { problems, users, myStickers, loaded } = state;

  const [me, setMe] = useState(null); // your username
  const [view, setView] = useState("feed");
  const [profileUser, setProfileUser] = useState(null);
  const [profileBack, setProfileBack] = useState(false);
  const [sheet, setSheet] = useState(null); // { kind: "reply", pid } | { kind: "problem" } | { kind: "edit" }
  const [focus, setFocus] = useState(null);
  const [toast, setToast] = useState(null);
  const [lastAdded, setLastAdded] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const [loadError, setLoadError] = useState(false);
  const [gate, setGate] = useState(null); // "terms" | "banned" | null
  const [more, setMore] = useState(null); // { kind: "problem" | "reply" | "user", id?, pid?, author }
  const [reportTarget, setReportTarget] = useState(null);
  const [blockTarget, setBlockTarget] = useState(null);
  const [ask, setAsk] = useState(null); // "are you sure?" before deleting: { title, text, confirm, run }
  const [settings, setSettings] = useState(false);
  const [category, setCategory] = useState(null);
  const [postsVersion, setPostsVersion] = useState(0); // bumps when you delete or post, so the profile reloads
  const feedRef = useRef(null);
  const problemsRef = useRef(problems);
  problemsRef.current = problems;
  const meRef = useRef(null);
  meRef.current = me;

  const say = useCallback((msg) => setToast({ msg, n: Date.now() }), []);
  const close = useCallback(() => setSheet(null), []);
  const oops = useCallback(() => say("Non sono riuscito a salvare. Controlla la connessione e riprova."), [say]);

  // ───────── Loading ─────────
  const refresh = useCallback(async () => {
    try {
      const { problems: ps, users: us } = await api.loadFeed(userId, { category });
      dispatch({ type: "setFeed", problems: ps, users: us });
      setLoadError(false);
    } catch {
      setLoadError(true);
      say("Non riesco a caricare i problemi. Controlla la connessione.");
    }
  }, [userId, say, category]);

  useEffect(() => { refresh(); }, [refresh]);

  useEffect(() => {
    (async () => {
      try {
        const profile = await api.loadMyProfile(userId);
        dispatch({ type: "setUsers", users: { [profile.username]: { id: profile.id, name: profile.name, bio: profile.bio } } });
        setMe(profile.username);
        setProfileUser(profile.username);
        setGate(profile.banned ? "banned" : profile.terms_accepted_at ? null : "terms");
      } catch {
        setLoadError(true);
      }
      api.loadSavedStickers().then((stickers) => dispatch({ type: "setSaved", stickers })).catch(() => {});
    })();
  }, [userId]);

  // New replies appear live, with a notice when they are for one of your problems
  useEffect(() => {
    const channel = supabase
      .channel("replies-live")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "replies" }, async ({ new: row }) => {
        const p = problemsRef.current.find((x) => x.id === row.problem_id);
        if (!p || p.memes.some((m) => m.id === row.id)) return;
        try {
          const full = await api.loadReply(row.id);
          const us = {};
          const keep = (pr) => { if (pr) us[pr.username] = { id: pr.id, name: pr.name, bio: pr.bio }; return pr?.username ?? "?"; };
          const meme = api.replyFromRow(full, keep);
          if (meme.author === meRef.current) return; // your own reply is already on screen
          dispatch({ type: "setUsers", users: us });
          dispatch({ type: "addReply", pid: p.id, meme });
          if (p.author === meRef.current) say(`@${meme.author} ha risposto al tuo problema`);
        } catch { /* it will show up on the next refresh */ }
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [say]);

  // ───────── Your stickers ─────────
  const addStickers = async (stickers, msg) => {
    say("Salvo gli sticker…");
    const saved = [];
    for (const st of stickers) {
      try { saved.push(await api.saveSticker(st)); } catch { /* skip the ones that fail */ }
    }
    if (!saved.length) { say("Non sono riuscito a salvare lo sticker. Riprova."); return; }
    dispatch({ type: "addStickers", stickers: [...saved].reverse() });
    setLastAdded(saved[saved.length - 1]);
    say(msg || (saved.length === 1 ? "Sticker aggiunto" : `${saved.length} sticker aggiunti`));
  };
  const fromGallery = async () => {
    try {
      const stickers = await pickStickers();
      if (stickers.length) await addStickers(stickers);
    } catch {
      say("Non riesco ad aprire la galleria. Controlla i permessi di Stickback nelle impostazioni.");
    }
  };
  const fromClipboard = async () => {
    try {
      const st = await pasteSticker();
      if (st) await addStickers([st], "Sticker incollato");
      else say("Negli appunti non c'è un'immagine. Copia prima uno sticker.");
    } catch {
      say("Non riesco a leggere gli appunti.");
    }
  };

  const savedSet = useMemo(() => new Set(myStickers.filter((s) => !s.example).map((st) => st.v)), [myStickers]);
  const toggleSave = async (sticker) => {
    if (savedSet.has(sticker.v)) {
      askRemoveSticker(sticker);
    } else {
      const clean = api.cleanSticker(sticker);
      dispatch({ type: "addStickers", stickers: [clean] });
      say("Salvato nei tuoi sticker");
      api.saveSticker(clean).catch(oops);
    }
  };
  const askRemoveSticker = (sticker) => setAsk({
    title: "Togliere questo sticker?",
    text: "Non lo troverai più tra i tuoi sticker. Le risposte in cui l'hai già usato restano come sono.",
    confirm: "Togli",
    run: () => removeSticker(sticker),
  });
  const askDelete = (t) => {
    setMore(null);
    setAsk(t.kind === "problem" ? {
      title: "Eliminare il problema?",
      text: "Sparisce per tutti, insieme a tutte le risposte che ha ricevuto. Non si può annullare.",
      confirm: "Elimina", run: () => doDelete(t),
    } : {
      title: "Eliminare la risposta?",
      text: "Sparisce per tutti, con le stelle che ha ricevuto. Non si può annullare.",
      confirm: "Elimina", run: () => doDelete(t),
    });
  };
  const removeSticker = (st) => {
    dispatch({ type: "removeSticker", v: st.v });
    say("Tolto dai tuoi sticker");
    if (!st.example) api.removeSavedSticker(st.v).catch(oops);
  };

  // ───────── Stars (instant on screen, then saved) ─────────
  const act = (a) => {
    dispatch(a);
    if (a.type === "starProblem") {
      const p = problemsRef.current.find((x) => x.id === a.pid);
      api.setProblemStar(a.pid, !p.starred).catch(() => { dispatch(a); oops(); });
    } else if (a.type === "starReply") {
      const m = problemsRef.current.find((x) => x.id === a.pid)?.memes.find((x) => x.id === a.mid);
      api.setReplyStar(a.mid, !m.starred).catch(() => { dispatch(a); oops(); });
    }
  };

  // ───────── Navigation ─────────
  const openProfile = (u, fromFeed) => {
    setProfileUser(u);
    setProfileBack(fromFeed && u !== me);
    setView("profile");
  };
  const profileId = users[profileUser]?.id;
  const loadPosts = useCallback(async () => {
    const { problems: ps, users: us } = await api.loadUserPosts(userId, profileId);
    dispatch({ type: "setUsers", users: us });
    return ps;
  }, [userId, profileId]);
  const goToProblem = (pid, mid, problem) => {
    // older problems from a profile aren't in the feed: put them on top so you can open them
    if (problem && !problemsRef.current.some((p) => p.id === pid)) dispatch({ type: "addProblem", problem });
    setView("feed");
    setTimeout(() => feedRef.current?.scrollToProblem(pid), 30);
    setFocus({ pid, mid, n: nextId() });
  };

  // ───────── Posting ─────────
  const publishReply = async (pid, { sticker, caption }) => {
    setSheet(null);
    say("Pubblico…");
    try {
      const { id, sticker: stored } = await api.createReply(pid, caption, sticker);
      dispatch({ type: "addReply", pid, meme: { id, author: me, stars: 0, starred: false, sticker: stored, caption } });
      if (stored.giphy && stored.type === "img" && !savedSet.has(stored.v)) {
        dispatch({ type: "addStickers", stickers: [stored] });
        api.saveSticker(stored).catch(() => {});
      }
      setFocus({ pid, mid: id, n: nextId() });
      setPostsVersion((n) => n + 1);
      say(stored.type === "gif" ? "GIF pubblicata" : "Sticker pubblicato");
    } catch (e) {
      say(api.explainError(e, "Non sono riuscito a pubblicare. Controlla la connessione e riprova."));
    }
  };

  const publishProblem = async (text, cat) => {
    setSheet(null);
    try {
      const row = await api.createProblem(text, cat);
      dispatch({ type: "addProblem", problem: { id: row.id, author: me, time: "adesso", stars: 0, starred: false, text, category: cat, memes: [] } });
      setPostsVersion((n) => n + 1);
      setView("feed");
      setTimeout(() => feedRef.current?.scrollToProblem(row.id), 50);
      say("Problema pubblicato");
    } catch (e) {
      say(api.explainError(e, "Non sono riuscito a pubblicare. Controlla la connessione e riprova."));
    }
  };

  const saveProfile = async (data) => {
    setSheet(null);
    dispatch({ type: "updateProfile", user: me, data });
    try {
      await api.updateProfile(userId, data);
      say("Profilo aggiornato");
    } catch (e) {
      say(api.explainError(e, "Non sono riuscito a salvare. Controlla la connessione e riprova."));
      refresh();
    }
  };

  const signOut = () => supabase.auth.signOut();

  // ───────── Safety: report, block, delete ─────────
  const removeLocally = (fn) => dispatch({ type: "setFeed", problems: fn(problemsRef.current), users: {} });

  const sendReport = async (reason, details) => {
    const t = reportTarget;
    try {
      await api.report({
        problemId: t.kind === "problem" ? t.id : null,
        replyId: t.kind === "reply" ? t.id : null,
        userId: users[t.author]?.id ?? null,
        reason, details,
      });
      setReportTarget(null);
      // what you reported disappears for you right away
      if (t.kind === "problem") removeLocally((ps) => ps.filter((p) => p.id !== t.id));
      if (t.kind === "reply") removeLocally((ps) => ps.map((p) => ({ ...p, memes: p.memes.filter((m) => m.id !== t.id) })));
      say("Segnalazione inviata. Grazie!");
    } catch { oops(); }
  };

  const doBlock = async () => {
    const who = blockTarget;
    const uid = users[who]?.id;
    if (!uid) return;
    try {
      await api.blockUser(uid);
      setBlockTarget(null);
      removeLocally((ps) => ps.filter((p) => p.author !== who).map((p) => ({ ...p, memes: p.memes.filter((m) => m.author !== who) })));
      if (view === "profile" && profileUser === who) setView("feed");
      say(`@${who} è bloccato`);
    } catch { oops(); }
  };

  const doDelete = async (t) => {
    setMore(null);
    try {
      if (t.kind === "problem") {
        await api.deleteProblem(t.id);
        removeLocally((ps) => ps.filter((p) => p.id !== t.id));
      } else {
        await api.deleteReply(t.id);
        removeLocally((ps) => ps.map((p) => ({ ...p, memes: p.memes.filter((m) => m.id !== t.id) })));
      }
      setPostsVersion((n) => n + 1);
      say("Eliminato");
    } catch { oops(); }
  };

  const unblock = async (b) => {
    try { await api.unblockUser(b.id); say(`@${b.username} sbloccato`); refresh(); } catch { oops(); }
  };

  const deleteAccount = async () => {
    try { await api.deleteAccount(); } catch { say("Non sono riuscito a eliminare l'account. Riprova."); }
  };

  const replyTo = sheet?.kind === "reply" ? problems.find((p) => p.id === sheet.pid) : null;
  const topInset = insets.top + TOPBAR_HEIGHT;

  if (gate) {
    return (
      <TermsGate banned={gate === "banned"} onSignOut={signOut}
        onAccept={async () => {
          try { await api.acceptTerms(); setGate(null); } catch { say("Non sono riuscito a salvare. Riprova."); }
        }} />
    );
  }

  if (!me || !loaded) {
    return (
      <View style={[st.app, st.center]}>
        {loadError ? (
          <View style={{ alignItems: "center", gap: 14, padding: 24 }}>
            <Text style={st.centerTxt}>Non riesco a raggiungere Stickback. Controlla la connessione.</Text>
            <Pressable style={st.retry} onPress={() => { setLoadError(false); refresh(); }}><Text style={st.retryTxt}>Riprova</Text></Pressable>
            <Pressable onPress={signOut}><Text style={st.link}>Esci</Text></Pressable>
          </View>
        ) : <ActivityIndicator color={C.accent} />}
      </View>
    );
  }

  return (
    <View style={st.app}>
      <View style={{ flex: 1 }}>
        <View style={[StyleSheet.absoluteFill, view !== "feed" && st.hidden]} pointerEvents={view === "feed" ? "auto" : "none"}>
          {problems.length ? (
            <Feed key={`feed-${category}`} ref={feedRef} me={me} problems={problems} users={users} dispatch={act} focus={focus} topInset={topInset}
              refreshing={refreshing} onRefresh={async () => { setRefreshing(true); await refresh(); setRefreshing(false); }}
              onReply={(pid) => { setLastAdded(null); setSheet({ kind: "reply", pid }); }}
              onUser={(u) => openProfile(u, true)} onMore={setMore} savedSet={savedSet} onToggleSave={toggleSave} />
          ) : (
            <View style={[st.center, { flex: 1, paddingTop: topInset, paddingHorizontal: 32, gap: 14 }]}>
              {category ? (
                <>
                  <Text style={st.emptyTitle}>Niente in questa categoria</Text>
                  <Text style={st.centerTxt}>Nessun problema recente qui. Racconta il primo!</Text>
                  <Pressable style={st.retry} onPress={() => setSheet({ kind: "problem" })}><Text style={st.retryTxt}>Racconta un problema</Text></Pressable>
                </>
              ) : (
                <>
                  <Text style={st.emptyTitle}>Ancora nessun problema</Text>
                  <Text style={st.centerTxt}>Sei tra i primi. Racconta una figuraccia: gli altri ti risponderanno con uno sticker.</Text>
                  <Pressable style={st.retry} onPress={() => setSheet({ kind: "problem" })}><Text style={st.retryTxt}>Racconta il primo problema</Text></Pressable>
                </>
              )}
            </View>
          )}
          <FeedHeader topInset={insets.top} category={category} onCategory={setCategory} />
        </View>
        {view === "profile" && profileUser && (
          <View style={StyleSheet.absoluteFill}>
            <Profile key={profileUser} me={me} user={profileUser} users={users} problems={problems} myStickers={myStickers}
              topInset={insets.top} showBack={profileBack} onBack={() => setView("feed")} onGo={goToProblem}
              onEdit={() => setSheet({ kind: "edit" })} onAddStickers={fromGallery} onPaste={fromClipboard}
              onRemoveSticker={askRemoveSticker} onSettings={() => setSettings(true)} onMore={setMore}
              loadPosts={loadPosts} postsVersion={postsVersion} />
          </View>
        )}
      </View>

      <View style={[st.tabbar, { paddingBottom: Math.max(insets.bottom, 10) }]}>
        <Pressable style={st.tab} onPress={() => setView("feed")} accessibilityRole="tab" accessibilityState={{ selected: view === "feed" }}>
          <HomeIcon color={view === "feed" ? C.fg : C.muted} />
          <Text style={[st.tabTxt, view === "feed" && { color: C.fg }]}>Home</Text>
        </Pressable>
        <Pressable style={({ pressed }) => [st.plus, pressed && { opacity: 0.85 }]} onPress={() => setSheet({ kind: "problem" })} accessibilityLabel="Racconta un problema">
          <Text style={st.plusTxt}>+</Text>
        </Pressable>
        <Pressable style={st.tab} onPress={() => openProfile(me, false)} accessibilityRole="tab"
          accessibilityState={{ selected: view === "profile" && profileUser === me }}>
          <View style={view === "profile" && profileUser === me ? st.avOn : null}><Avatar users={users} user={me} size={24} /></View>
          <Text style={[st.tabTxt, view === "profile" && profileUser === me && { color: C.fg }]}>Profilo</Text>
        </Pressable>
      </View>

      <Toast toast={toast} />

      <ReplySheet visible={!!replyTo} problem={replyTo} myStickers={myStickers} lastAdded={lastAdded} onClose={close}
        onPublish={(r) => publishReply(replyTo.id, r)} onAddStickers={fromGallery} onPaste={fromClipboard} />
      <ProblemSheet visible={sheet?.kind === "problem"} onClose={close} onPublish={publishProblem} />
      <MoreSheet target={more} me={me} onClose={() => setMore(null)}
        onReport={() => { setReportTarget(more); setMore(null); }}
        onBlock={() => { setBlockTarget(more.author); setMore(null); }}
        onDelete={() => askDelete(more)} />
      <ConfirmSheet visible={!!ask} title={ask?.title ?? ""} text={ask?.text ?? ""} confirm={ask?.confirm ?? ""} danger
        onClose={() => setAsk(null)} onConfirm={async () => { const run = ask.run; setAsk(null); await run(); }} />
      <ReportSheet target={reportTarget} onClose={() => setReportTarget(null)} onSend={sendReport} />
      <ConfirmSheet visible={!!blockTarget} title={`Bloccare @${blockTarget}?`} danger confirm="Blocca"
        text="Non vedrete più i problemi e le risposte l'uno dell'altro, e non potrà più risponderti. Non riceverà nessuna notifica. Puoi sbloccarlo dalle Impostazioni."
        onClose={() => setBlockTarget(null)} onConfirm={doBlock} />
      <SettingsSheet visible={settings} loadBlocked={api.loadBlocked} onUnblock={unblock} onClose={() => setSettings(false)}
        onSignOut={() => { setSettings(false); signOut(); }} onDeleteAccount={deleteAccount} />
      <EditProfileSheet visible={sheet?.kind === "edit"} profile={users[me] || { name: "", bio: "" }} onClose={close} onSave={saveProfile} />
    </View>
  );
}

const st = StyleSheet.create({
  app: { flex: 1, backgroundColor: C.bg },
  center: { alignItems: "center", justifyContent: "center" },
  centerTxt: { color: C.muted, fontFamily: F.medium, fontSize: 15, lineHeight: 21, textAlign: "center" },
  emptyTitle: { color: C.fg, fontFamily: F.display, fontSize: 24, textAlign: "center" },
  retry: { backgroundColor: C.accent, borderRadius: 14, paddingVertical: 12, paddingHorizontal: 18 },
  retryTxt: { color: C.accentInk, fontFamily: F.bold, fontSize: 15 },
  link: { color: C.muted, fontFamily: F.semi, fontSize: 14, textDecorationLine: "underline" },
  hidden: { opacity: 0 },
  topbar: { position: "absolute", top: 0, left: 0, right: 0, flexDirection: "row", alignItems: "center", gap: 10, paddingHorizontal: 16, paddingBottom: 10, backgroundColor: C.bg },
  logo: { color: C.fg, fontFamily: F.display, fontSize: 21, letterSpacing: -0.4 },
  tabbar: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", borderTopWidth: 1, borderColor: C.line, backgroundColor: C.bg, paddingTop: 8, paddingHorizontal: 36 },
  tab: { alignItems: "center", gap: 3, minWidth: 60 },
  tabTxt: { color: C.muted, fontFamily: F.semi, fontSize: 11 },
  avOn: { borderRadius: 14, borderWidth: 2, borderColor: C.accent },
  plus: { width: 54, height: 40, borderRadius: 14, backgroundColor: C.accent, alignItems: "center", justifyContent: "center" },
  plusTxt: { color: C.accentInk, fontSize: 26, fontFamily: F.bold, lineHeight: 30 },
});
