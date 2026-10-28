import { useCallback, useEffect, useMemo, useReducer, useState } from "react";
import { ME, fakeReplies, saveStickers, seed } from "./data.js";
import { reducer } from "./store.js";
import { filesToStickers } from "./lib/stickers.js";
import { nextId } from "./lib/util.js";
import Feed from "./components/Feed.jsx";
import Profile from "./components/Profile.jsx";
import { EditProfileSheet, ProblemSheet, ReplySheet } from "./components/Sheets.jsx";
import { Avatar, HomeIcon, Toast } from "./components/ui.jsx";

export default function App() {
  const [state, dispatch] = useReducer(reducer, null, seed);
  const { problems, users, myStickers } = state;

  const [view, setView] = useState("feed");               // "feed" | "profile"
  const [profileUser, setProfileUser] = useState(ME);
  const [profileBack, setProfileBack] = useState(false);
  const [sheet, setSheet] = useState(null);                // { kind: "reply", pid } | { kind: "problem" } | { kind: "edit" }
  const [focus, setFocus] = useState(null);                // where the feed should jump to
  const [toast, setToast] = useState(null);
  const [lastAdded, setLastAdded] = useState(null);

  const say = useCallback((msg) => setToast({ msg, n: Date.now() }), []);
  const closeSheet = useCallback(() => setSheet(null), []);

  const openProfile = (u, fromFeed) => {
    setProfileUser(u);
    setProfileBack(fromFeed && u !== ME);
    setView("profile");
  };
  const goToProblem = (pid, mid) => {
    setView("feed");
    setFocus({ pid, mid, scrollFeed: true, n: nextId() });
  };

  // Your stickers: upload from the gallery or paste a copied image
  const addFiles = useCallback(async (files) => {
    const stickers = await filesToStickers(files);
    if (!stickers.length) { say("Questa immagine non si apre. Prova con un PNG o WEBP."); return; }
    dispatch({ type: "addStickers", stickers: stickers.reverse() });
    setLastAdded(stickers[0]);
    say(stickers.length === 1 ? "Sticker aggiunto" : `${stickers.length} sticker aggiunti`);
  }, [say]);

  // Stickers shared from another app ("Share → Stickback" on Android) wait in a cache for us
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (!params.has("shared")) return;
    window.history.replaceState(null, "", window.location.pathname);
    (async () => {
      try {
        const cache = await caches.open("stickback-shared");
        const keys = await cache.keys();
        const blobs = [];
        for (const k of keys) {
          const res = await cache.match(k);
          if (res) blobs.push(await res.blob());
          await cache.delete(k);
        }
        if (!blobs.length) { say("Non è arrivato nessuno sticker. Prova a condividerlo di nuovo."); return; }
        const stickers = await filesToStickers(blobs);
        if (!stickers.length) { say("Questo file non è un'immagine. Condividi uno sticker o una foto."); return; }
        dispatch({ type: "addStickers", stickers: stickers.reverse() });
        setView("profile");
        setProfileUser(ME);
        say(stickers.length === 1 ? "Sticker aggiunto da un'altra app" : `${stickers.length} sticker aggiunti da un'altra app`);
      } catch {
        say("Non sono riuscito a leggere lo sticker condiviso.");
      }
    })();
  }, [say]);

  // Keep your stickers on this phone
  useEffect(() => {
    if (!saveStickers(myStickers)) say("Il telefono non ha più spazio per altri sticker caricati.");
  }, [myStickers, say]);

  useEffect(() => {
    const onPaste = (e) => {
      const files = [...(e.clipboardData?.files || [])];
      if (!files.length) return;
      e.preventDefault();
      addFiles(files);
    };
    document.addEventListener("paste", onPaste);
    return () => document.removeEventListener("paste", onPaste);
  }, [addFiles]);

  // Save someone else's sticker into yours, like on WhatsApp (tap again to remove it)
  const savedSet = useMemo(() => new Set(myStickers.map((st) => st.v)), [myStickers]);
  const toggleSave = (sticker) => {
    if (savedSet.has(sticker.v)) {
      dispatch({ type: "removeSticker", v: sticker.v });
      say("Tolto dai tuoi sticker");
    } else {
      const { id: _gid, title: _t, ...keep } = sticker;
      dispatch({ type: "addStickers", stickers: [keep] });
      say("Salvato nei tuoi sticker");
    }
  };

  const publishReply = (pid, { id, sticker, caption }) => {
    dispatch({ type: "addReply", pid, meme: { id, author: ME, stars: 1, starred: true, sticker, caption } });
    // A GIPHY sticker you use goes into "I miei", like recent stickers on WhatsApp
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
    setFocus({ pid, scrollFeed: true, n: nextId() });
    say("Problema pubblicato");
    // Simulated replies, to show what notifications feel like
    fakeReplies().forEach(({ delay, bump, meme }) =>
      setTimeout(() => {
        dispatch({ type: "addReply", pid, meme, bump });
        say(`@${meme.author} ha risposto al tuo problema`);
      }, delay));
  };

  const replyTo = sheet?.kind === "reply" ? problems.find((p) => p.id === sheet.pid) : null;

  return (
    <div className="app">
      <div className="views">
        <div className={`view${view === "feed" ? "" : " off"}`}>
          <div className="topbar">
            <span className="logo">Stick<b>back</b></span>
            <span className="proto">Prototipo</span>
          </div>
          <Feed problems={problems} users={users} dispatch={dispatch} focus={focus} active={view === "feed"}
            onReply={(pid) => { setLastAdded(null); setSheet({ kind: "reply", pid }); }}
            onUser={(u) => openProfile(u, true)} savedSet={savedSet} onToggleSave={toggleSave} />
        </div>
        <section className={`view profile${view === "profile" ? "" : " off"}`} aria-label="Profilo">
          {view === "profile" && (
            <Profile key={profileUser} user={profileUser} users={users} problems={problems} myStickers={myStickers}
              showBack={profileBack} onBack={() => setView("feed")} onGo={goToProblem}
              onEdit={() => setSheet({ kind: "edit" })}
              onRemoveSticker={(v) => { dispatch({ type: "removeSticker", v }); say("Tolto dai tuoi sticker"); }} />
          )}
        </section>
      </div>

      <nav className="tabbar">
        <button className={`tab${view === "feed" ? " on" : ""}`} onClick={() => setView("feed")}><HomeIcon />Home</button>
        <button className="plus" aria-label="Racconta un problema" onClick={() => setSheet({ kind: "problem" })}>+</button>
        <button className={`tab${view === "profile" && profileUser === ME ? " on" : ""}`} onClick={() => openProfile(ME, false)}>
          <Avatar users={users} user={ME} />Profilo
        </button>
      </nav>

      <input type="file" id="fileIn" accept="image/*" multiple hidden
        onChange={(e) => { addFiles(e.target.files); e.target.value = ""; }} />
      <Toast toast={toast} />

      {replyTo && (
        <ReplySheet problem={replyTo} myStickers={myStickers} lastAdded={lastAdded} onClose={closeSheet}
          onPublish={(r) => publishReply(replyTo.id, r)} />
      )}
      {sheet?.kind === "problem" && <ProblemSheet onClose={closeSheet} onPublish={publishProblem} />}
      {sheet?.kind === "edit" && (
        <EditProfileSheet profile={users[ME]} onClose={closeSheet}
          onSave={(data) => { dispatch({ type: "updateProfile", user: ME, data }); setSheet(null); say("Profilo aggiornato"); }} />
      )}
    </div>
  );
}
