// A sticker is { type: "img" | "gif", v: string, thumb?: string, giphy?: boolean, example?: boolean }
// (type "emoji" is still drawn, for anything saved by older versions)

// A GIPHY sticker or GIF from its id. GIPHY asks apps to show its media from its own servers.
export const giphy = (id, type = "img", file = "giphy.webp") => ({
  type,
  giphy: true,
  v: `https://media.giphy.com/media/${id}/${file}`,
  thumb: `https://media.giphy.com/media/${id}/200w.webp`,
});

// Turn an image file (gallery upload or paste) into a sticker, shrunk to 320px so it stays light.
export function fileToSticker(file) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      const k = Math.min(1, 320 / Math.max(img.width, img.height));
      const c = document.createElement("canvas");
      c.width = Math.round(img.width * k);
      c.height = Math.round(img.height * k);
      c.getContext("2d").drawImage(img, 0, 0, c.width, c.height);
      URL.revokeObjectURL(url);
      // WebP keeps the transparent background and is much lighter; fall back to PNG where WebP can't be written
      const webp = c.toDataURL("image/webp", 0.9);
      resolve({ type: "img", v: webp.startsWith("data:image/webp") ? webp : c.toDataURL("image/png") });
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("unreadable image"));
    };
    img.src = url;
  });
}

export async function filesToStickers(files) {
  const out = [];
  for (const f of [...files].filter((f) => f.type.startsWith("image/"))) {
    try { out.push(await fileToSticker(f)); } catch { /* skip unreadable files */ }
  }
  return out;
}
