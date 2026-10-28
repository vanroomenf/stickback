import { useCallback, useEffect, useReducer, useState } from "react";
import { ME, fakeReplies, seed } from "./data.js";
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

  const publishReply = (pid, { id, sticker, caption }) => {
    dispatch({ type: "addReply", pid, meme: { id, author: ME, stars: 1, starred: true, sticker, caption } });
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
            onUser={(u) => openProfile(u, true)} />
        </div>
        <section className={`view profile${view === "profile" ? "" : " off"}`} aria-label="Profilo">
          {view === "profile" && (
            <Profile key={profileUser} user={profileUser} users={users} problems={problems} myStickers={myStickers}
              showBack={profileBack} onBack={() => setView("feed")} onGo={goToProblem}
              onEdit={() => setSheet({ kind: "edit" })} />
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
