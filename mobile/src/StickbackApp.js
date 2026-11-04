import { useCallback, useEffect, useMemo, useReducer, useRef, useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { initialState, reducer } from "./store.js";
import * as api from "./lib/api.js";
import { supabase } from "./lib/supabase.js";
import { pasteSticker, pickPhoto } from "./lib/stickers.js";
import StickerMaker from "./components/StickerMaker.js";
import { nextId } from "./lib/util.js";
import { F, useStyles, useTheme } from "./theme.js";
import Feed from "./components/Feed.js";
import Profile from "./components/Profile.js";
import { EditProfileSheet, ProblemSheet, ReplySheet } from "./components/Sheets.js";
import { Avatar, HomeIcon, PlusIcon, Primary, Toast } from "./components/ui.js";
import { ConfirmSheet, MoreSheet, ReportSheet, SettingsSheet, TermsGate } from "./components/Safety.js";
import { FeedHeader, TOPBAR_HEIGHT } from "./components/Social.js";
import { feedLanguages, lang, setFeedLanguages, t, tn } from "./i18n/index.js";
import { detectLanguage } from "./i18n/detect.js";
import { getPushToken, onNotificationOpen, pushPermission } from "./lib/push.js";


export default function StickbackApp({ userId }) {
  const insets = useSafeAreaInsets();
  const { C, cat } = useTheme();
  const st = useStyles(makeStyles);
  const [pageCat, setPageCat] = useState(null); // category of the problem on screen: the header takes its colour
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
  const [feedMode, setFeedMode] = useState("foryou"); // "foryou" | "following"
  const [followMissing, setFollowMissing] = useState(false);
  const [feedLangs, setFeedLangs] = useState(feedLanguages); // languages of the problems in your feed
  const [postsVersion, setPostsVersion] = useState(0); // bumps when you delete or post, so the profile reloads
  const [pushAsk, setPushAsk] = useState(false); // "want to know when people reply?" after your first post
  const pushToken = useRef(null);
  const paging = useRef({ more: false, busy: false });
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
      const { problems: ps, users: us, more, missing } = await api.loadFeed(userId, { category, langs: feedLangs, mode: feedMode });
      setFollowMissing(!!missing);
      dispatch({ type: "setFeed", problems: ps, users: us });
      paging.current = { more, busy: false };
      setLoadError(false);
    } catch {
      setLoadError(true);
      say(t("toast.loadFail"));
    }
  }, [userId, say, category, feedLangs, feedMode]);

  useEffect(() => { refresh(); }, [refresh]);

  // Next page when you get near the end of the feed
  const loadMore = useCallback(async () => {
    const pg = paging.current;
    if (!pg.more || pg.busy) return;
    pg.busy = true;
    try {
      const { problems: ps, users: us, more } = await api.loadFeed(userId, { category, langs: feedLangs, mode: feedMode, skip: problemsRef.current.length });
      dispatch({ type: "appendFeed", problems: ps, users: us });
      paging.current = { more, busy: false };
    } catch {
      pg.busy = false; // try again on the next scroll
    }
  }, [userId, category, feedLangs, feedMode]);

  // ───────── Push notifications ─────────
  const savePush = useCallback(async (ask) => {
    try {
      const token = await getPushToken({ ask });
      if (!token) return;
      pushToken.current = token;
      await api.savePushToken(token, lang());
    } catch { /* no notifications on this phone; the app works the same */ }
  }, []);
  // already allowed: refresh this phone's token (and language) quietly
  useEffect(() => { if (me && !gate) savePush(false); }, [me, gate, savePush]);

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
  // + : pick a photo and turn it into a sticker. From the reply sheet, that sheet closes while you
  // make the sticker (iPhone shows one window at a time) and comes back with the new sticker selected.
  const [maker, setMaker] = useState(null); // { uri, width, height, returnTo }
  const backTo = (r) => { if (r) setTimeout(() => setSheet(r), 320); };
  const fromGallery = async (returnTo = null) => {
    if (returnTo) { setSheet(null); await new Promise((ok) => setTimeout(ok, 280)); }
    let picked = null;
    try { picked = await pickPhoto(); } catch { say(t("toast.galleryFail")); }
    if (!picked) { backTo(returnTo); return; }
    if (picked.sticker) { await addStickers([picked.sticker]); backTo(returnTo); return; }
    setMaker({ ...picked.image, returnTo });
  };
  const makerDone = async (sticker) => {
    const r = maker?.returnTo;
    setMaker(null);
    if (sticker) await addStickers([sticker], t("toast.stickerCreated"));
    else say(t("toast.stickerSaveFail"));
    backTo(r);
  };
  const makerCancel = () => { const r = maker?.returnTo; setMaker(null); backTo(r); };
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
  // Tapping a notification opens that problem and reply
  const openFromNotification = useCallback(async ({ pid, mid }) => {
    if (!problemsRef.current.some((p) => p.id === pid)) {
      try {
        const { problem, users: us } = await api.loadOneProblem(userId, pid);
        if (!problem) return;
        dispatch({ type: "setUsers", users: us });
        dispatch({ type: "addProblem", problem });
      } catch { return; }
    }
    setView("feed");
    setTimeout(() => feedRef.current?.scrollToProblem(pid), 60);
    setFocus({ pid, mid, n: nextId() });
  }, [userId]);
  useEffect(() => onNotificationOpen(openFromNotification), [openFromNotification]);

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

  const publishProblem = async (text, cat) => {
    setSheet(null);
    // the language is recognised from the text; when unsure, the app's language
    const postLang = detectLanguage(text, lang());
    try {
      const row = await api.createProblem(text, cat, postLang);
      dispatch({ type: "addProblem", problem: { id: row.id, author: me, time: t("time.now"), stars: 0, starred: false, text, category: cat, lang: postLang, closesAt: Date.now() + api.OPEN_FOR, memes: [] } });
      // the right moment to offer notifications: you're waiting for replies
      pushPermission().then((p) => { if (p === "ask") setTimeout(() => setPushAsk(true), 1200); }).catch(() => {});
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

  // this phone stops getting notifications for the account you leave
  const signOut = async () => {
    if (pushToken.current) await api.removePushToken(pushToken.current).catch(() => {});
    await supabase.auth.signOut();
  };

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

  // The same functions on every render, so the feed doesn't redraw for nothing; they always call the latest code
  const latest = useRef({});
  latest.current = { act, toggleSave, openProfile, loadMore, refresh };
  const feedFns = useMemo(() => ({
    dispatch: (a) => latest.current.act(a),
    onToggleSave: (sticker) => latest.current.toggleSave(sticker),
    onUser: (u) => latest.current.openProfile(u, true),
    onReply: (pid) => { setLastAdded(null); setSheet({ kind: "reply", pid }); },
    onEndReached: () => latest.current.loadMore(),
    onPage: (p) => setPageCat(p.category),
    onRefresh: async () => { setRefreshing(true); await latest.current.refresh(); setRefreshing(false); },
  }), []);

  latest.current.profile = { goToProblem, fromGallery, fromClipboard, askRemoveSticker, feedMode };
  const profileFns = useMemo(() => ({
    onBack: () => setView("feed"),
    onGo: (...a) => latest.current.profile.goToProblem(...a),
    onEdit: () => setSheet({ kind: "edit" }),
    onAddStickers: () => latest.current.profile.fromGallery(),
    onPaste: () => latest.current.profile.fromClipboard(),
    onRemoveSticker: (sk) => latest.current.profile.askRemoveSticker(sk),
    onSettings: () => setSettings(true),
    say,
    onOpenUser: (pr) => {
      dispatch({ type: "setUsers", users: { [pr.username]: { id: pr.id, name: pr.name, bio: pr.bio } } });
      latest.current.openProfile(pr.username, true);
    },
    onFollowChange: () => { if (latest.current.profile.feedMode === "following") latest.current.refresh(); },
  }), [say]);

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
            <Primary label={t("retry")} onPress={() => { setLoadError(false); refresh(); }} />
            <Pressable onPress={signOut}><Text style={st.link}>{t("signOut")}</Text></Pressable>
          </View>
        ) : <ActivityIndicator color={C.muted} />}
      </View>
    );
  }

  return (
    <View style={st.app}>
      <View style={{ flex: 1 }}>
        <View style={[StyleSheet.absoluteFill, view !== "feed" && st.hidden]} pointerEvents={view === "feed" ? "auto" : "none"}>
          {problems.length ? (
            <Feed key={`feed-${feedMode}-${category}-${feedLangs.join()}`} ref={feedRef} me={me} problems={problems} users={users} focus={focus} topInset={topInset}
              refreshing={refreshing} onRefresh={feedFns.onRefresh} onEndReached={feedFns.onEndReached} onPage={feedFns.onPage}
              dispatch={feedFns.dispatch} onReply={feedFns.onReply} onUser={feedFns.onUser} onMore={setMore} savedSet={savedSet} onToggleSave={feedFns.onToggleSave} />
          ) : (
            <View style={[st.center, { flex: 1, paddingTop: topInset, paddingHorizontal: 32, gap: 14 }]}>
              {feedMode === "following" ? (
                <>
                  <Text style={st.emptyTitle}>{t("feed.followingEmptyTitle")}</Text>
                  <Text style={st.centerTxt}>{followMissing ? t("feed.followingMissing") : t("feed.followingEmptyBody")}</Text>
                </>
              ) : category ? (
                <>
                  <Text style={st.emptyTitle}>{t("app.emptyCatTitle")}</Text>
                  <Text style={st.centerTxt}>{t("app.emptyCatBody")}</Text>
                  <Primary label={t("app.tellOne")} onPress={() => setSheet({ kind: "problem" })} />
                </>
              ) : (
                <>
                  <Text style={st.emptyTitle}>{t("app.emptyTitle")}</Text>
                  <Text style={st.centerTxt}>{t("app.emptyBody")}</Text>
                  <Primary label={t("app.tellFirst")} onPress={() => setSheet({ kind: "problem" })} />
                </>
              )}
            </View>
          )}
          <FeedHeader topInset={insets.top} category={category} onCategory={setCategory} mode={feedMode} onMode={setFeedMode}
            tone={problems.length ? cat(pageCat ?? problems[0].category) : { bg: C.bg, fg: C.fg, muted: C.muted, line: C.line }} />
        </View>
        {profileUser && (
          // kept on screen but hidden while you're on the feed: coming back to it is instant
          <View style={[StyleSheet.absoluteFill, view !== "profile" && st.off]} pointerEvents={view === "profile" ? "auto" : "none"}
            accessibilityElementsHidden={view !== "profile"} importantForAccessibility={view === "profile" ? "auto" : "no-hide-descendants"}>
            <Profile key={profileUser} me={me} user={profileUser} users={users} problems={problems} myStickers={myStickers}
              topInset={insets.top} showBack={profileBack} loadPosts={loadPosts} postsVersion={postsVersion} onMore={setMore}
              {...profileFns} />
          </View>
        )}
      </View>

      <View style={[st.tabbar, { paddingBottom: Math.max(insets.bottom, 8) }]}>
        <Pressable style={st.tab} onPress={() => setView("feed")} accessibilityRole="tab" accessibilityLabel={t("tab.home")}
          accessibilityState={{ selected: view === "feed" }}>
          <HomeIcon color={C.fg} filled={view === "feed"} />
        </Pressable>
        <Pressable style={({ pressed }) => [st.plus, pressed && { opacity: 0.8 }]} onPress={() => setSheet({ kind: "problem" })}
          accessibilityRole="button" accessibilityLabel={t("tab.new")}>
          <PlusIcon color={C.onAccent} size={21} weight={2.4} />
        </Pressable>
        <Pressable style={st.tab} onPress={() => openProfile(me, false)} accessibilityRole="tab" accessibilityLabel={t("tab.profile")}
          accessibilityState={{ selected: view === "profile" && profileUser === me }}>
          <View style={[st.avRing, view === "profile" && profileUser === me && { borderColor: C.fg }]}>
            <Avatar users={users} user={me} size={28} />
          </View>
        </Pressable>
      </View>

      <Toast toast={toast} />

      <ReplySheet visible={!!replyTo} problem={replyTo} myStickers={myStickers} lastAdded={lastAdded} onClose={close}
        onPublish={(r) => publishReply(replyTo.id, r)} onAddStickers={() => fromGallery({ kind: "reply", pid: replyTo.id })} onPaste={fromClipboard} />
      {maker && <StickerMaker source={maker} onCancel={makerCancel} onDone={makerDone} />}
      <ProblemSheet visible={sheet?.kind === "problem"} onClose={close} onPublish={publishProblem} />
      <MoreSheet target={more} me={me} onClose={() => setMore(null)}
        onReport={() => { setReportTarget(more); setMore(null); }}
        onBlock={() => { setBlockTarget(more.author); setMore(null); }}
        onDelete={() => askDelete(more)} />
      <ConfirmSheet visible={pushAsk} title={t("push.title")} text={t("push.ask")} confirm={t("push.enable")}
        onClose={() => setPushAsk(false)} onConfirm={async () => { setPushAsk(false); await savePush(true); }} />
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

const makeStyles = (C) => ({
  app: { flex: 1, backgroundColor: C.bg },
  center: { alignItems: "center", justifyContent: "center" },
  centerTxt: { color: C.muted, fontFamily: F.body, fontSize: 15, lineHeight: 22, textAlign: "center" },
  emptyTitle: { color: C.fg, fontFamily: F.bold, fontSize: 24, letterSpacing: -0.5, textAlign: "center" },
  link: { color: C.muted, fontFamily: F.medium, fontSize: 15, textDecorationLine: "underline", padding: 10 },
  hidden: { opacity: 0 },
  off: { opacity: 0, transform: [{ translateX: 10000 }] },
  tabbar: { flexDirection: "row", alignItems: "center", justifyContent: "space-around", borderTopWidth: StyleSheet.hairlineWidth, borderColor: C.line, backgroundColor: C.bg, paddingTop: 8 },
  tab: { width: 60, height: 46, alignItems: "center", justifyContent: "center" },
  avRing: { borderRadius: 18, borderWidth: 1.5, borderColor: "transparent", padding: 2 },
  plus: { width: 54, height: 40, borderRadius: 12, backgroundColor: C.accent, alignItems: "center", justifyContent: "center" },
});
