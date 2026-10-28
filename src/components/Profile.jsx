import { useState } from "react";
import { ME } from "../data.js";
import { orderReplies } from "../store.js";
import { fmt } from "../lib/util.js";
import { Avatar, CrownIcon, StarIcon, StickerCard, StickerThumb } from "./ui.jsx";

export default function Profile({ user, users, problems, myStickers, showBack, onBack, onGo, onEdit }) {
  const [tab, setTab] = useState("problemi");
  const me = user === ME;
  const info = users[user] || { name: user, bio: "Qui solo per gli sticker." };

  const probs = problems.filter((p) => p.author === user);
  const replies = problems.flatMap((p) => p.memes.filter((m) => m.author === user).map((m) => ({ p, m })));
  const stars = probs.reduce((a, p) => a + p.stars, 0) + replies.reduce((a, r) => a + r.m.stars, 0);
  const crowns = replies.filter((r) => r.p.winner === r.m.id).length;
  const tabs = [["problemi", "Problemi"], ["risposte", "Risposte"], ...(me ? [["sticker", "Sticker"]] : [])];

  return (
    <>
      <div className="phead">
        {showBack && <button className="back" onClick={onBack}>‹ Indietro</button>}
        {!me && <span className="ttl">@{user}</span>}
      </div>
      <div className="pinfo">
        <Avatar users={users} user={user} className="bigav" />
        <div><h2 className="pname">{info.name}</h2><div className="phandle">@{user}</div></div>
      </div>
      {info.bio && <p className="bio">{info.bio}</p>}
      {me && <button className="editbtn" onClick={onEdit}>Modifica profilo</button>}

      <div className="stats">
        <div className="stat"><b>{probs.length}</b><span>Problemi</span></div>
        <div className="stat"><b>{replies.length}</b><span>Risposte</span></div>
        <div className="stat"><b>{fmt(stars)}</b><span>Stelle</span></div>
        <div className="stat gold"><b>{crowns}</b><span>Corone</span></div>
      </div>

      <div className="ptabs" role="tablist">
        {tabs.map(([k, l]) => (
          <button key={k} role="tab" aria-selected={tab === k} className={tab === k ? "on" : ""} onClick={() => setTab(k)}>{l}</button>
        ))}
      </div>

      {tab === "problemi" && (probs.length ? (
        <div className="plist">
          {probs.map((p) => (
            <button key={p.id} className="pitem" onClick={() => onGo(p.id)}>
              <span className="t">{p.text}</span>
              <span className="m">
                <span><StarIcon filled /> {fmt(p.stars)}</span>
                <span>{p.memes.length} risposte</span>
                <span>{p.time}</span>
                <span className="thumbs">{orderReplies(p).slice(0, 3).map((m) => <StickerCard key={m.id} meme={m} />)}</span>
              </span>
            </button>
          ))}
        </div>
      ) : (
        <p className="pempty">{me ? <>Non hai ancora raccontato nessun problema.<br />Tocca + in basso per iniziare.</> : "Nessun problema ancora."}</p>
      ))}

      {tab === "risposte" && (replies.length ? (
        <div className="rgrid">
          {replies.map(({ p, m }) => (
            <button key={m.id} className="ritem" onClick={() => onGo(p.id, m.id)}>
              <StickerCard meme={m} />
              <span className="m">
                <span className="s"><StarIcon filled size={13} /> {fmt(m.stars)}</span>
                {p.winner === m.id && <span className="s"><CrownIcon /> Migliore</span>}
              </span>
              <span className="on">su: {p.text}</span>
            </button>
          ))}
        </div>
      ) : <p className="pempty">Nessuna risposta ancora.</p>)}

      {tab === "sticker" && (
        <>
          <div className="sgrid">
            {myStickers.map((st, i) => <div key={i} className="stile"><span className="tin"><StickerThumb sticker={st} /></span></div>)}
            <label className="addtile" htmlFor="fileIn" tabIndex={0}
              onKeyDown={(e) => { if (e.key === "Enter") document.getElementById("fileIn").click(); }}>
              <span className="tin"><b>+</b>Aggiungi</span>
            </label>
          </div>
          <p className="note">Aggiungi i tuoi sticker dalla galleria del telefono, oppure incolla un'immagine copiata. Restano salvati su questo telefono e li ritrovi ogni volta che rispondi. Quelli che trovi già qui sono esempi da GIPHY.</p>
        </>
      )}
    </>
  );
}
