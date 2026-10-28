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
import { feedLanguages, lang, setFeedLanguages, t, tn } from "./i18n/index.js";


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
  const [feedLangs, setFeedLangs] = useState(feedLanguages); // languages of the problems in your feed
  const [postsVersion, setPostsVersion] = useState(0); // bumps when you delete or post, so the profile reloads
  const feedRef = useRef(null);
  const problemsRef = useRef(problems);
  problemsRef.current = problems;
  const meRef = useRef(null);
  meRef.current = me;

  const say = useCallback((msg) => setToast({ msg, n: Date.now() }), []);
  const close = useCallback(() => setSheet(null), []);
  const oops = useCallback(() => say(t("toast.saveFail")), [say]);

  // ───────── Loading ─────────
  const refresh = useCallback(async () => {
    try {
      const { problems: ps, users: us } = await api.loadFeed(userId, { category, langs: feedLangs });
      dispatch({ type: "setFeed", problems: ps, users: us });
      setLoadError(false);
    } catch {
      setLoadError(true);
      say(t("toast.loadFail"));
    }
  }, [userId, say, category, feedLangs]);

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
          if (p.author === meRef.current) say(t("toast.newReply", { user: meme.author }));
        } catch { /* it will show up on the next refresh */ }
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [say]);

  // ───────── Your stickers ─────────
  const addStickers = async (stickers, msg) => {
    say(t("toast.savingStickers"));
    const saved = [];
    for (const st of stickers) {
      try { saved.push(await api.saveSticker(st)); } catch { /* skip the ones that fail */ }
    }
    if (!saved.length) { say(t("toast.stickerSaveFail")); return; }
    dispatch({ type: "addStickers", stickers: [...saved].reverse() });
    setLastAdded(saved[saved.length - 1]);
    say(msg || tn("toast.stickersAdded", saved.length));
  };
  const fromGallery = async () => {
    try {
      const stickers = await pickStickers();
      if (stickers.length) await addStickers(stickers);
    } catch {
      say(t("toast.galleryFail"));
    }
  };
  const fromClipboard = async () => {
    try {
      const st = await pasteSticker();
      if (st) await addStickers([st], t("toast.pasted"));
      else say(t("toast.noImage"));
    } catch {
      say(t("toast.clipboardFail"));
    }
  };

  const savedSet = useMemo(() => new Set(myStickers.filter((s) => !s.example).map((st) => st.v)), [myStickers]);
  const toggleSave = async (sticker) => {
    if (savedSet.has(sticker.v)) {
      askRemoveSticker(sticker);
    } else {
      const clean = api.cleanSticker(sticker);
      dispatch({ type: "addStickers", stickers: [clean] });
      say(t("toast.saved"));
      api.saveSticker(clean).catch(oops);
    }
  };
  const askRemoveSticker = (sticker) => setAsk({
    title: t("ask.removeSticker"),
    text: t("ask.removeStickerText"),
    confirm: t("ask.remove"),
    run: () => removeSticker(sticker),
  });
  const askDelete = (t) => {
    setMore(null);
    setAsk(t.kind === "problem" ? {
      title: t("ask.deleteProblem"),
      text: t("ask.deleteProblemText"),
      confirm: t("delete"), run: () => doDelete(t),
    } : {
      title: t("ask.deleteReply"),
      text: t("ask.deleteReplyText"),
      confirm: t("delete"), run: () => doDelete(t),
    });
  };
  const removeSticker = (st) => {
    dispatch({ type: "removeSticker", v: st.v });
    say(t("toast.removed"));
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
    say(t("toast.publishing"));
    try {
      const { id, sticker: stored } = await api.createReply(pid, caption, sticker);
      dispatch({ type: "addReply", pid, meme: { id, author: me, stars: 0, starred: false, sticker: stored, caption } });
      if (stored.giphy && stored.type === "img" && !savedSet.has(stored.v)) {
        dispatch({ type: "addStickers", stickers: [stored] });
        api.saveSticker(stored).catch(() => {});
      }
      setFocus({ pid, mid: id, n: nextId() });
      setPostsVersion((n) => n + 1);
      say(stored.type === "gif" ? t("toast.gifPublished") : t("toast.stickerPublished"));
    } catch (e) {
      say(api.explainError(e, t("toast.publishFail")));
    }
  };

  const publishProblem = async (text, cat, postLang) => {
    setSheet(null);
    try {
      const row = await api.createProblem(text, cat, postLang);
      dispatch({ type: "addProblem", problem: { id: row.id, author: me, time: t("time.now"), stars: 0, starred: false, text, category: cat, lang: postLang, memes: [] } });
      setPostsVersion((n) => n + 1);
      setView("feed");
      setTimeout(() => feedRef.current?.scrollToProblem(row.id), 50);
      say(t("toast.problemPublished"));
    } catch (e) {
      say(api.explainError(e, t("toast.publishFail")));
    }
  };

  const saveProfile = async (data) => {
    setSheet(null);
    dispatch({ type: "updateProfile", user: me, data });
    try {
      await api.updateProfile(userId, data);
      say(t("toast.profileUpdated"));
    } catch (e) {
      say(api.explainError(e, t("toast.saveFail")));
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
      say(t("toast.reportSent"));
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
      say(t("toast.blocked", { user: who }));
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
      say(t("toast.deleted"));
    } catch { oops(); }
  };

  const unblock = async (b) => {
    try { await api.unblockUser(b.id); say(t("toast.unblocked", { user: b.username })); refresh(); } catch { oops(); }
  };

  const deleteAccount = async () => {
    try { await api.deleteAccount(); } catch { say(t("toast.deleteAccountFail")); }
  };

  const replyTo = sheet?.kind === "reply" ? problems.find((p) => p.id === sheet.pid) : null;
  const topInset = insets.top + TOPBAR_HEIGHT;

  if (gate) {
    return (
      <TermsGate banned={gate === "banned"} onSignOut={signOut}
        onAccept={async () => {
          try { await api.acceptTerms(); setGate(null); } catch { say(t("toast.saveFailShort")); }
        }} />
    );
  }

  if (!me || !loaded) {
    return (
      <View style={[st.app, st.center]}>
        {loadError ? (
          <View style={{ alignItems: "center", gap: 14, padding: 24 }}>
            <Text style={st.centerTxt}>{t("app.unreachable")}</Text>
            <Pressable style={st.retry} onPress={() => { setLoadError(false); refresh(); }}><Text style={st.retryTxt}>{t("retry")}</Text></Pressable>
            <Pressable onPress={signOut}><Text style={st.link}>{t("signOut")}</Text></Pressable>
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
            <Feed key={`feed-${category}-${feedLangs.join()}`} showLang={feedLangs.length > 1 ? lang() : null} ref={feedRef} me={me} problems={problems} users={users} dispatch={act} focus={focus} topInset={topInset}
              refreshing={refreshing} onRefresh={async () => { setRefreshing(true); await refresh(); setRefreshing(false); }}
              onReply={(pid) => { setLastAdded(null); setSheet({ kind: "reply", pid }); }}
              onUser={(u) => openProfile(u, true)} onMore={setMore} savedSet={savedSet} onToggleSave={toggleSave} />
          ) : (
            <View style={[st.center, { flex: 1, paddingTop: topInset, paddingHorizontal: 32, gap: 14 }]}>
              {category ? (
                <>
                  <Text style={st.emptyTitle}>{t("app.emptyCatTitle")}</Text>
                  <Text style={st.centerTxt}>{t("app.emptyCatBody")}</Text>
                  <Pressable style={st.retry} onPress={() => setSheet({ kind: "problem" })}><Text style={st.retryTxt}>{t("app.tellOne")}</Text></Pressable>
                </>
              ) : (
                <>
                  <Text style={st.emptyTitle}>{t("app.emptyTitle")}</Text>
                  <Text style={st.centerTxt}>{t("app.emptyBody")}</Text>
                  <Pressable style={st.retry} onPress={() => setSheet({ kind: "problem" })}><Text style={st.retryTxt}>{t("app.tellFirst")}</Text></Pressable>
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
          <Text style={[st.tabTxt, view === "feed" && { color: C.fg }]}>{t("tab.home")}</Text>
        </Pressable>
        <Pressable style={({ pressed }) => [st.plus, pressed && { opacity: 0.85 }]} onPress={() => setSheet({ kind: "problem" })} accessibilityLabel={t("tab.new")}>
          <Text style={st.plusTxt}>+</Text>
        </Pressable>
        <Pressable style={st.tab} onPress={() => openProfile(me, false)} accessibilityRole="tab"
          accessibilityState={{ selected: view === "profile" && profileUser === me }}>
          <View style={view === "profile" && profileUser === me ? st.avOn : null}><Avatar users={users} user={me} size={24} /></View>
          <Text style={[st.tabTxt, view === "profile" && profileUser === me && { color: C.fg }]}>{t("tab.profile")}</Text>
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
      <ConfirmSheet visible={!!blockTarget} title={t("ask.block", { user: blockTarget })} danger confirm={t("ask.blockConfirm")}
        text={t("ask.blockText")}
        onClose={() => setBlockTarget(null)} onConfirm={doBlock} />
      <SettingsSheet visible={settings} loadBlocked={api.loadBlocked} onUnblock={unblock} onClose={() => setSettings(false)}
        onSignOut={() => { setSettings(false); signOut(); }} onDeleteAccount={deleteAccount}
        onFeedLanguages={async (list) => setFeedLangs(await setFeedLanguages(list))} />
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
