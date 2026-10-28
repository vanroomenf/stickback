// A sticker is { type: "emoji" | "img" | "gif", v: string, thumb?: string, giphy?: boolean }
export const emoji = (v) => ({ type: "emoji", v });

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
      resolve({ type: "img", v: c.toDataURL("image/png") });
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
