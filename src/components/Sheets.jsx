import { useEffect, useMemo, useRef, useState } from "react";
import { nextId } from "../lib/util.js";
import GiphyPicker from "./GiphyPicker.jsx";
import { Sheet, StickerCard, StickerThumb } from "./ui.jsx";

const SOURCES = [["mine", "I miei"], ["stickers", "Sticker GIPHY"], ["gifs", "GIF"]];

export function ReplySheet({ problem, myStickers, lastAdded, onClose, onPublish }) {
  const previewId = useMemo(nextId, []);
  const [caption, setCaption] = useState("");
  const [sticker, setSticker] = useState(myStickers[0]);
  const [src, setSrc] = useState("mine");
  const capRef = useRef(null);

  useEffect(() => { capRef.current?.focus(); }, []);
  // A sticker you just uploaded or pasted becomes the selected one
  useEffect(() => { if (lastAdded) { setSticker(lastAdded); setSrc("mine"); } }, [lastAdded]);

  const text = caption.trim();
  const publish = () => { if (text) onPublish({ id: previewId, sticker, caption: text }); };

  return (
    <Sheet title="Rispondi" onClose={onClose}>
      <p className="sheet-sub">a: {problem.text}</p>
      <div className="preview">
        <StickerCard placeholder={!text} meme={{ id: previewId, sticker, caption: text || "Il tuo testo appare qui, sopra lo sticker" }} />
      </div>
      <div className="field">
        <label htmlFor="cap">Il tuo testo</label>
        <input id="cap" ref={capRef} maxLength={50} autoComplete="off" placeholder="Es. io dopo aver letto questo"
          value={caption} onChange={(e) => setCaption(e.target.value)} onKeyDown={(e) => e.key === "Enter" && publish()} />
      </div>

      <div className="srcseg" role="tablist" aria-label="Da dove prendere lo sticker">
        {SOURCES.map(([k, l]) => (
          <button key={k} role="tab" aria-selected={src === k} className={src === k ? "on" : ""} onClick={() => setSrc(k)}>{l}</button>
        ))}
      </div>

      {src === "mine" ? (
        <div className="pickrow">
          <div className="chips">
            <label className="chip add" htmlFor="fileIn" tabIndex={0} aria-label="Carica uno sticker dal telefono"
              onKeyDown={(e) => { if (e.key === "Enter") document.getElementById("fileIn").click(); }}>+</label>
            {myStickers.map((st, i) => (
              <button key={i} className={`chip${st === sticker ? " on" : ""}`} aria-label={`Sticker ${i + 1}`} onClick={() => setSticker(st)}>
                <StickerThumb sticker={st} />
              </button>
            ))}
          </div>
          <p className="small">Tocca + per aggiungere i tuoi sticker dalla galleria, oppure incolla un'immagine copiata. Restano salvati su questo telefono. Gli sticker GIPHY che usi finiscono qui da soli.</p>
        </div>
      ) : (
        <GiphyPicker kind={src} selected={sticker} onSelect={setSticker} />
      )}

      <button className="primary" disabled={!text} onClick={publish}>Pubblica</button>
    </Sheet>
  );
}

export function ProblemSheet({ onClose, onPublish }) {
  const [text, setText] = useState("");
  const ref = useRef(null);
  useEffect(() => { ref.current?.focus(); }, []);
  return (
    <Sheet title="Racconta il tuo problema" onClose={onClose}>
      <p className="sheet-sub">Una frase basta. Gli altri potranno risponderti solo con uno sticker o una GIF, più il loro testo.</p>
      <div className="field">
        <label htmlFor="probText">Cosa ti è successo?</label>
        <textarea id="probText" ref={ref} maxLength={140} rows={3} value={text} onChange={(e) => setText(e.target.value)}
          placeholder="Es. Ho chiamato la prof «mamma» davanti a tutta la classe" />
        <span className="chars">{text.length} / 140</span>
      </div>
      <button className="primary" disabled={!text.trim()} onClick={() => onPublish(text.trim())}>Pubblica</button>
    </Sheet>
  );
}

export function EditProfileSheet({ profile, onClose, onSave }) {
  const [name, setName] = useState(profile.name);
  const [bio, setBio] = useState(profile.bio);
  return (
    <Sheet title="Modifica profilo" onClose={onClose}>
      <div className="field">
        <label htmlFor="edName">Nome</label>
        <input id="edName" maxLength={30} autoComplete="off" value={name} onChange={(e) => setName(e.target.value)} />
      </div>
      <div className="field">
        <label htmlFor="edBio">Bio</label>
        <textarea id="edBio" maxLength={100} rows={2} value={bio} onChange={(e) => setBio(e.target.value)} />
      </div>
      <button className="primary" onClick={() => onSave({ name: name.trim() || "Tu", bio: bio.trim() })}>Salva</button>
    </Sheet>
  );
}
