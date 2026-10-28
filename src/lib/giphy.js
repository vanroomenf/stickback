import { GIPHY_KEY } from "../config.js";
import { storage } from "./util.js";

const KEY_STORE = "stickback.giphyKey";

export const getGiphyKey = () => GIPHY_KEY || storage.get(KEY_STORE) || "";
export const saveGiphyKey = (k) => storage.set(KEY_STORE, k);
export const clearGiphyKey = () => storage.remove(KEY_STORE);

export class GiphyError extends Error {
  constructor(code) {
    super(code);
    this.code = code; // "badkey" | "ratelimit" | "network"
  }
}

// kind: "stickers" | "gifs". Empty query → trending.
export async function searchGiphy({ kind, query, key, signal }) {
  const q = query.trim();
  const params = new URLSearchParams({ api_key: key, limit: "30", rating: "pg-13", lang: "it" });
  if (q) params.set("q", q);
  let res;
  try {
    res = await fetch(`https://api.giphy.com/v1/${kind}/${q ? "search" : "trending"}?${params}`, { signal });
  } catch (e) {
    if (e.name === "AbortError") throw e;
    throw new GiphyError("network");
  }
  if (res.status === 401 || res.status === 403) throw new GiphyError("badkey");
  if (res.status === 429) throw new GiphyError("ratelimit");
  if (!res.ok) throw new GiphyError("network");
  const { data = [] } = await res.json();
  return data
    .map((g) => {
      const im = g.images || {};
      const big = im.fixed_width || im.downsized || im.original || {};
      const small = im.fixed_width_small || big;
      return {
        type: kind === "gifs" ? "gif" : "img",
        giphy: true,
        id: g.id,
        title: g.title || "",
        v: big.webp || big.url,
        thumb: small.webp || small.url,
      };
    })
    .filter((g) => g.v);
}
