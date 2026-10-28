import { useEffect, useState } from "react";
import { clearGiphyKey, getGiphyKey, saveGiphyKey, searchGiphy } from "../lib/giphy.js";

const MESSAGES = {
  badkey: "La chiave GIPHY non funziona.",
  ratelimit: "Troppe ricerche in poco tempo. Riprova tra un minuto.",
  network: "GIPHY non risponde. Controlla la connessione e riprova.",
};

// Search GIPHY stickers or GIFs. kind: "stickers" | "gifs"
export default function GiphyPicker({ kind, selected, onSelect }) {
  const [key, setKey] = useState(getGiphyKey);
  const [keyDraft, setKeyDraft] = useState("");
  const [query, setQuery] = useState("");
  const [debounced, setDebounced] = useState("");
  const [state, setState] = useState({ status: "idle", items: [] });

  useEffect(() => { setQuery(""); setDebounced(""); setState({ status: "idle", items: [] }); }, [kind]);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(query), 350);
    return () => clearTimeout(t);
  }, [query]);

  useEffect(() => {
    if (!key) return;
    const ctrl = new AbortController();
    setState((s) => ({ ...s, status: "loading" }));
    searchGiphy({ kind, query: debounced, key, signal: ctrl.signal })
      .then((items) => setState({ status: "done", items }))
      .catch((e) => { if (e.name !== "AbortError") setState({ status: e.code || "network", items: [] }); });
    return () => ctrl.abort();
  }, [kind, debounced, key]);

  const applyKey = () => {
    const k = keyDraft.trim();
    if (!k) return;
    saveGiphyKey(k);
    setKey(k);
    setKeyDraft("");
  };

  if (!key) {
    return (
      <div className="pickrow">
        <div className="keybox">
          <span>Per cercare su GIPHY serve una <b>chiave gratuita</b>. Creala su{" "}
            <a href="https://developers.giphy.com/dashboard/" target="_blank" rel="noopener noreferrer">developers.giphy.com</a>{" "}
            (Create an API Key → API) e incollala qui.</span>
          <div className="keyrow">
            <input value={keyDraft} onChange={(e) => setKeyDraft(e.target.value)} onKeyDown={(e) => e.key === "Enter" && applyKey()}
              autoComplete="off" placeholder="Incolla la chiave GIPHY" aria-label="Chiave GIPHY" />
            <button onClick={applyKey}>Usa</button>
          </div>
        </div>
        <span className="attrib">POWERED BY GIPHY</span>
      </div>
    );
  }

  const q = debounced.trim();
  let body;
  if (state.status === "loading" && !state.items.length) body = <p className="gmsg">Carico…</p>;
  else if (state.status === "badkey") body = (
    <p className="gmsg">{MESSAGES.badkey}{" "}
      <button className="pick" onClick={() => { clearGiphyKey(); setKey(""); }}>Inserisci un'altra chiave</button></p>
  );
  else if (MESSAGES[state.status]) body = <p className="gmsg">{MESSAGES[state.status]}</p>;
  else if (!state.items.length) body = <p className="gmsg">{q ? `Nessun risultato per «${q}». Prova con un'altra parola.` : "Nessun risultato."}</p>;
  else body = state.items.map((g) => (
    <button key={g.id} className={`gitem${kind === "gifs" ? " gif" : ""}${selected?.v === g.v ? " on" : ""}`}
      aria-label={g.title || "Risultato GIPHY"} onClick={() => onSelect(g)}>
      <img src={g.thumb} alt="" loading="lazy" />
    </button>
  ));

  return (
    <div className="pickrow">
      <input id="gq" type="search" value={query} onChange={(e) => setQuery(e.target.value)} autoComplete="off"
        placeholder={kind === "gifs" ? "Cerca una GIF" : "Cerca uno sticker"} aria-label="Cerca su GIPHY" />
      <div className="ggrid">{body}</div>
      <span className="attrib">POWERED BY GIPHY</span>
    </div>
  );
}
