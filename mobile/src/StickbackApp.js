import { useCallback, useEffect, useMemo, useReducer, useRef, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { ME, fakeReplies, loadSavedStickers, saveStickers, seed } from "./data.js";
import { reducer } from "./store.js";
import { pasteSticker, pickStickers } from "./lib/stickers.js";
import { nextId } from "./lib/util.js";
import { C, F } from "./theme.js";
import Feed from "./components/Feed.js";
import Profile from "./components/Profile.js";
import { EditProfileSheet, ProblemSheet, ReplySheet } from "./components/Sheets.js";
import { Avatar, HomeIcon, Toast } from "./components/ui.js";

const TOPBAR = 52;

export default function StickbackApp() {
  const insets = useSafeAreaInsets();
  const [state, dispatch] = useReducer(reducer, null, seed);
  const { problems, users, myStickers } = state;

  const [view, setView] = useState("feed");
  const [profileUser, setProfileUser] = useState(ME);
  const [profileBack, setProfileBack] = useState(false);
  const [sheet, setSheet] = useState(null); // { kind: "reply", pid } | { kind: "problem" } | { kind: "edit" }
  const [focus, setFocus] = useState(null);
  const [toast, setToast] = useState(null);
  const [lastAdded, setLastAdded] = useState(null);
  const [loaded, setLoaded] = useState(false);
  const feedRef = useRef(null);

  const say = useCallback((msg) => setToast({ msg, n: Date.now() }), []);
  const close = useCallback(() => setSheet(null), []);

  // Your stickers live on the phone: load them once, then save on every change
  useEffect(() => {
    loadSavedStickers().then((stickers) => {
      if (stickers.length) dispatch({ type: "loadSaved", stickers });
      setLoaded(true);
    });
  }, []);
  useEffect(() => {
    if (!loaded) return;
    saveStickers(myStickers).then((ok) => { if (!ok) say("Il telefono non ha più spazio per altri sticker."); });
  }, [myStickers, loaded, say]);

  const addStickers = (stickers, msg) => {
    dispatch({ type: "addStickers", stickers: [...stickers].reverse() });
    setLastAdded(stickers[stickers.length - 1]);
    say(msg || (stickers.length === 1 ? "Sticker aggiunto" : `${stickers.length} sticker aggiunti`));
  };
  const fromGallery = async () => {
    try {
      const stickers = await pickStickers();
      if (stickers.length) addStickers(stickers);
    } catch {
      say("Non riesco ad aprire la galleria. Controlla i permessi di Stickback nelle impostazioni.");
    }
  };
  const fromClipboard = async () => {
    try {
      const st = await pasteSticker();
      if (st) addStickers([st], "Sticker incollato");
      else say("Negli appunti non c'è un'immagine. Copia prima uno sticker.");
    } catch {
      say("Non riesco a leggere gli appunti.");
    }
  };

  const savedSet = useMemo(() => new Set(myStickers.map((st) => st.v)), [myStickers]);
  const toggleSave = (sticker) => {
    if (savedSet.has(sticker.v)) {
      dispatch({ type: "removeSticker", v: sticker.v });
      say("Tolto dai tuoi sticker");
    } else {
      const { id: _id, title: _t, ...keep } = sticker;
      dispatch({ type: "addStickers", stickers: [keep] });
      say("Salvato nei tuoi sticker");
    }
  };

  const openProfile = (u, fromFeed) => {
    setProfileUser(u);
    setProfileBack(fromFeed && u !== ME);
    setView("profile");
  };
  const goToProblem = (pid, mid) => {
    setView("feed");
    setTimeout(() => feedRef.current?.scrollToProblem(pid), 30);
    setFocus({ pid, mid, n: nextId() });
  };

  const publishReply = (pid, { id, sticker, caption }) => {
    dispatch({ type: "addReply", pid, meme: { id, author: ME, stars: 1, starred: true, sticker, caption } });
    if (sticker.giphy && sticker.type === "img") {
      const { id: _gid, title: _t, ...keep } = sticker;
      dispatch({ type: "addStickers", stickers: [keep] });
    }
    setSheet(null);
    setFocus({ pid, mid: id, n: nextId() });
    say(sticker.type === "gif" ? "GIF pubblicata" : "Sticker pubblicato");
  };

  const publishProblem = (text) => {
    const pid = nextId();
    dispatch({ type: "addProblem", problem: { id: pid, author: ME, time: "adesso", stars: 0, starred: false, text, winner: null, memes: [] } });
    setSheet(null);
    setView("feed");
    setTimeout(() => feedRef.current?.scrollToProblem(pid), 50);
    say("Problema pubblicato");
    fakeReplies().forEach(({ delay, bump, meme }) =>
      setTimeout(() => {
        dispatch({ type: "addReply", pid, meme, bump });
        say(`@${meme.author} ha risposto al tuo problema`);
      }, delay));
  };

  const replyTo = sheet?.kind === "reply" ? problems.find((p) => p.id === sheet.pid) : null;
  const topInset = insets.top + TOPBAR;

  return (
    <View style={st.app}>
      <View style={{ flex: 1 }}>
        <View style={[StyleSheet.absoluteFill, view !== "feed" && st.hidden]} pointerEvents={view === "feed" ? "auto" : "none"}>
          <Feed ref={feedRef} problems={problems} users={users} dispatch={dispatch} focus={focus} topInset={topInset}
            onReply={(pid) => { setLastAdded(null); setSheet({ kind: "reply", pid }); }}
            onUser={(u) => openProfile(u, true)} savedSet={savedSet} onToggleSave={toggleSave} />
          <View style={[st.topbar, { paddingTop: insets.top + 10 }]} pointerEvents="box-none">
            <Text style={st.logo}>Stick<Text style={{ color: C.accent }}>back</Text></Text>
            <View style={st.proto}><Text style={st.protoTxt}>PROTOTIPO</Text></View>
          </View>
        </View>
        {view === "profile" && (
          <View style={StyleSheet.absoluteFill}>
            <Profile key={profileUser} user={profileUser} users={users} problems={problems} myStickers={myStickers}
              topInset={insets.top} showBack={profileBack} onBack={() => setView("feed")} onGo={goToProblem}
              onEdit={() => setSheet({ kind: "edit" })} onAddStickers={fromGallery} onPaste={fromClipboard}
              onRemoveSticker={(v) => { dispatch({ type: "removeSticker", v }); say("Tolto dai tuoi sticker"); }} />
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
        <Pressable style={st.tab} onPress={() => openProfile(ME, false)} accessibilityRole="tab"
          accessibilityState={{ selected: view === "profile" && profileUser === ME }}>
          <View style={view === "profile" && profileUser === ME ? st.avOn : null}><Avatar users={users} user={ME} size={24} /></View>
          <Text style={[st.tabTxt, view === "profile" && profileUser === ME && { color: C.fg }]}>Profilo</Text>
        </Pressable>
      </View>

      <Toast toast={toast} />

      <ReplySheet visible={!!replyTo} problem={replyTo} myStickers={myStickers} lastAdded={lastAdded} onClose={close}
        onPublish={(r) => publishReply(replyTo.id, r)} onAddStickers={fromGallery} onPaste={fromClipboard} />
      <ProblemSheet visible={sheet?.kind === "problem"} onClose={close} onPublish={publishProblem} />
      <EditProfileSheet visible={sheet?.kind === "edit"} profile={users[ME]} onClose={close}
        onSave={(data) => { dispatch({ type: "updateProfile", user: ME, data }); setSheet(null); say("Profilo aggiornato"); }} />
    </View>
  );
}

const st = StyleSheet.create({
  app: { flex: 1, backgroundColor: C.bg },
  hidden: { opacity: 0 },
  topbar: { position: "absolute", top: 0, left: 0, right: 0, flexDirection: "row", alignItems: "center", gap: 10, paddingHorizontal: 16, paddingBottom: 10, backgroundColor: C.bg },
  logo: { color: C.fg, fontFamily: F.display, fontSize: 21, letterSpacing: -0.4 },
  proto: { borderWidth: 1, borderColor: C.line, borderRadius: 99, paddingHorizontal: 7, paddingVertical: 2 },
  protoTxt: { color: C.muted, fontFamily: F.semi, fontSize: 10, letterSpacing: 0.8 },
  tabbar: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", borderTopWidth: 1, borderColor: C.line, backgroundColor: C.bg, paddingTop: 8, paddingHorizontal: 36 },
  tab: { alignItems: "center", gap: 3, minWidth: 60 },
  tabTxt: { color: C.muted, fontFamily: F.semi, fontSize: 11 },
  avOn: { borderRadius: 14, borderWidth: 2, borderColor: C.accent },
  plus: { width: 54, height: 40, borderRadius: 14, backgroundColor: C.accent, alignItems: "center", justifyContent: "center" },
  plusTxt: { color: C.accentInk, fontSize: 26, fontFamily: F.bold, lineHeight: 30 },
});
