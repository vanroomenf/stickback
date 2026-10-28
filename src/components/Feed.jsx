import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { ME } from "../data.js";
import { orderReplies } from "../store.js";
import { Avatar, CrownIcon, SaveIcon, StarButton, StickerCard } from "./ui.jsx";

const GAP = 12;

function ProblemScreen({ p, first, users, dispatch, onReply, onUser, focusMid, savedSet, onToggleSave }) {
  const mine = p.author === ME;
  const carRef = useRef(null);
  const [index, setIndex] = useState(0);

  // Keep the order stable while you star things; it only changes when replies or the winner change.
  const orderKey = `${p.memes.length}|${p.winner}`;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const ordered = useMemo(() => orderReplies(p).map((m) => m.id), [orderKey]);
  const byId = Object.fromEntries(p.memes.map((m) => [m.id, m]));
  const memes = ordered.map((id) => byId[id]).filter(Boolean);

  const updateIndex = () => {
    const car = carRef.current;
    const card = car?.querySelector(".meme-card");
    if (!card) return;
    setIndex(Math.min(Math.round(car.scrollLeft / (card.offsetWidth + GAP)), memes.length - 1));
  };

  // Jump to a specific reply (after publishing, picking a winner, or coming from the profile)
  useLayoutEffect(() => {
    if (!focusMid) return;
    const car = carRef.current;
    const card = car?.querySelector(`[data-mid="${focusMid.mid}"]`);
    if (card) car.scrollLeft = card.offsetLeft - 20;
    updateIndex();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [focusMid]);

  // After the author picks a winner, show it (it moves to the first place)
  const mounted = useRef(false);
  useLayoutEffect(() => {
    if (!mounted.current) { mounted.current = true; return; }
    carRef.current.scrollLeft = 0;
    updateIndex();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [p.winner]);

  const step = (dir) => {
    const car = carRef.current;
    const card = car?.querySelector(".meme-card");
    if (card) car.scrollBy({ left: dir * (card.offsetWidth + GAP), behavior: "smooth" });
  };

  return (
    <section className="screen" data-pid={p.id}>
      <header className="problem">
        <div className="pmeta">
          <button className="ulink" onClick={() => onUser(p.author)}>
            <Avatar users={users} user={p.author} />
            <span className="handle">@{p.author}</span>
          </button>
          <span>·</span><span>{p.time}</span>
          {mine && <span className="yours">Il tuo problema</span>}
        </div>
        <div className="prow">
          <h2 className="ptext">{p.text}</h2>
          <StarButton big on={p.starred} count={p.stars} label="Mi piace questo problema"
            onToggle={() => dispatch({ type: "starProblem", pid: p.id })} />
        </div>
      </header>

      <div className="cwrap">
        <div className="carousel" ref={carRef} onScroll={updateIndex}>
          {memes.length ? memes.map((m) => (
            <article className="meme-card" key={m.id} data-mid={m.id}
              onDoubleClick={(e) => {
                if (!e.target.closest("button") && !m.starred) dispatch({ type: "starReply", pid: p.id, mid: m.id });
              }}>
              <StickerCard meme={m} />
              <div className="meme-meta">
                <button className="who" onClick={() => onUser(m.author)}>@{m.author}</button>
                {p.winner === m.id && <span className="win" title="Scelta dall’autore"><CrownIcon /> Migliore</span>}
                {mine && p.winner !== m.id && (
                  <button className="pick" onClick={() => dispatch({ type: "pickWinner", pid: p.id, mid: m.id })}>
                    <CrownIcon /> Scegli
                  </button>
                )}
                {m.author !== ME && m.sticker.type !== "emoji" && (
                  <button className={`savebtn${savedSet.has(m.sticker.v) ? " on" : ""}`} aria-pressed={savedSet.has(m.sticker.v)}
                    aria-label={savedSet.has(m.sticker.v) ? "Togli dai tuoi sticker" : "Salva nei tuoi sticker"}
                    onClick={() => onToggleSave(m.sticker)}>
                    <SaveIcon saved={savedSet.has(m.sticker.v)} />
                  </button>
                )}
                <StarButton on={m.starred} count={m.stars} label="Mi piace questa risposta"
                  onToggle={() => dispatch({ type: "starReply", pid: p.id, mid: m.id })} />
              </div>
            </article>
          )) : (
            <div className="empty"><div><strong>Ancora nessuna risposta</strong>
              Gli sticker arriveranno qui. Ti avvisiamo appena qualcuno risponde.</div></div>
          )}
        </div>
        <button className="cnav prev" aria-label="Risposta precedente" onClick={() => step(-1)}>‹</button>
        <button className="cnav next" aria-label="Risposta successiva" onClick={() => step(1)}>›</button>
      </div>

      <footer className="actions">
        <span className="count"><b>{memes.length ? index + 1 : 0}</b> / {memes.length} risposte</span>
        <button className="reply" onClick={() => onReply(p.id)}>Rispondi</button>
      </footer>
      {first && <p className="hint"><span>↓</span> Scorri giù per il prossimo problema · di lato per le risposte</p>}
    </section>
  );
}

export default function Feed({ problems, users, dispatch, onReply, onUser, focus, active, savedSet, onToggleSave }) {
  const feedRef = useRef(null);

  // Scroll the feed to a problem when asked (new post, or tap from the profile)
  useLayoutEffect(() => {
    if (!focus?.scrollFeed) return;
    const s = feedRef.current?.querySelector(`.screen[data-pid="${focus.pid}"]`);
    if (s) feedRef.current.scrollTop = s.offsetTop;
  }, [focus]);

  // Arrow keys on a computer: ↑↓ problems, ←→ replies
  useEffect(() => {
    if (!active) return;
    const onKey = (e) => {
      if (document.querySelector(".backdrop") || /INPUT|TEXTAREA/.test(document.activeElement?.tagName)) return;
      const feed = feedRef.current;
      const i = Math.round(feed.scrollTop / feed.clientHeight);
      if (e.key === "ArrowDown" || e.key === "ArrowUp") {
        e.preventDefault();
        feed.scrollTo({ top: (i + (e.key === "ArrowDown" ? 1 : -1)) * feed.clientHeight, behavior: "smooth" });
      }
      if (e.key === "ArrowRight" || e.key === "ArrowLeft") {
        feed.children[i]?.querySelector(e.key === "ArrowRight" ? ".next" : ".prev")?.click();
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [active]);

  return (
    <main className="feed" ref={feedRef}>
      {problems.map((p, i) => (
        <ProblemScreen key={p.id} p={p} first={i === 0} users={users} dispatch={dispatch}
          onReply={onReply} onUser={onUser} focusMid={focus?.pid === p.id && focus.mid ? focus : null}
          savedSet={savedSet} onToggleSave={onToggleSave} />
      ))}
    </main>
  );
}
