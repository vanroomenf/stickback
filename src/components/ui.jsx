import { useEffect, useState } from "react";
import { fmt, hue, initialOf, rot } from "../lib/util.js";

const STAR_PATH = "M12 2.8l2.8 5.8 6.3.9-4.6 4.4 1.1 6.3L12 17.2l-5.6 3 1.1-6.3-4.6-4.4 6.3-.9z";

export function StarIcon({ filled, size = 16 }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} aria-hidden="true">
      <path d={STAR_PATH} fill={filled ? "currentColor" : "none"} stroke={filled ? "none" : "currentColor"}
        strokeWidth="2" strokeLinejoin="round" />
    </svg>
  );
}

export function CrownIcon() {
  return (
    <svg viewBox="0 0 24 24" width="14" height="14" aria-hidden="true">
      <path d="M3 18h18l-1.6-10-4.9 4.4L12 5l-2.5 7.4L4.6 8z" fill="currentColor" />
    </svg>
  );
}

export function HomeIcon() {
  return (
    <svg viewBox="0 0 24 24" width="24" height="24" aria-hidden="true">
      <path d="M4 10.5 12 4l8 6.5V20h-5.5v-6h-5v6H4z" fill="currentColor" />
    </svg>
  );
}

export function StarButton({ on, count, label, big, onToggle }) {
  const [pop, setPop] = useState(false);
  return (
    <button
      className={`star${on ? " on" : ""}${big ? " big" : ""}${pop ? " pop" : ""}`}
      aria-pressed={on}
      aria-label={label}
      onClick={() => { if (!on) setPop(true); onToggle(); }}
      onAnimationEnd={() => setPop(false)}
    >
      <StarIcon filled={on} />
      <span>{fmt(count)}</span>
    </button>
  );
}

export function Avatar({ users, user, className = "avatar" }) {
  return <span className={className} style={{ "--h": hue(user) }}>{initialOf(users, user)}</span>;
}

export function StickerImage({ sticker }) {
  if (sticker.type === "emoji") return <span className="sticker">{sticker.v}</span>;
  return <img className={`sticker${sticker.type === "gif" ? " gif" : ""}`} src={sticker.v} alt="" />;
}

export function StickerThumb({ sticker }) {
  return sticker.type === "emoji" ? sticker.v : <img src={sticker.thumb || sticker.v} alt="" />;
}

// A reply: your text on top, the sticker or GIF below, kept separate
export function StickerCard({ meme, placeholder }) {
  return (
    <div className={`meme${meme.sticker.type === "gif" ? " gifcard" : ""}`} style={{ "--r": rot(meme.id) }}>
      <p className={`caption${placeholder ? " ph" : ""}`}>{meme.caption}</p>
      <div className="stk"><StickerImage sticker={meme.sticker} /></div>
    </div>
  );
}

export function Sheet({ label, title, onClose, children }) {
  useEffect(() => {
    const onKey = (e) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);
  return (
    <div className="backdrop" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="sheet" role="dialog" aria-label={label || title}>
        <div className="sheet-head">
          <h3>{title}</h3>
          <button className="ghost" onClick={onClose}>Annulla</button>
        </div>
        {children}
      </div>
    </div>
  );
}

export function Toast({ toast }) {
  const [show, setShow] = useState(false);
  useEffect(() => {
    if (!toast) return;
    setShow(true);
    const t = setTimeout(() => setShow(false), 2300);
    return () => clearTimeout(t);
  }, [toast]);
  return <div className={`toast${show ? " show" : ""}`} role="status">{toast?.msg}</div>;
}
