import { GIPHY_KEY } from "../config.js";
import { lang } from "../i18n/index.js";

export class GiphyError extends Error {
  constructor(code) {
    super(code);
    this.code = code; // "badkey" | "ratelimit" | "network"
  }
}

// kind: "stickers" | "gifs". Empty query → trending.
export async function searchGiphy({ kind, query, signal }) {
  const q = query.trim();
  const params = new URLSearchParams({ api_key: GIPHY_KEY, limit: "30", rating: "pg-13", lang: lang() });
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
      // Full size for the reply card: the original as WebP when it is light enough, otherwise a reduced version
      const orig = im.original || {};
      const light = orig.webp && Number(orig.webp_size || 0) < 3_000_000;
      const big = light ? orig.webp : (im.downsized_medium?.url || im.downsized?.url || orig.url || im.fixed_width?.url);
      const grid = im.fixed_width || im.fixed_width_small || {};
      return {
        type: kind === "gifs" ? "gif" : "img",
        giphy: true,
        id: g.id,
        title: g.title || "",
        v: big,
        thumb: grid.webp || grid.url || big,
      };
    })
    .filter((g) => g.v);
}
