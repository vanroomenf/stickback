import * as Clipboard from "expo-clipboard";
import * as ImagePicker from "expo-image-picker";
import { ImageManipulator, SaveFormat } from "expo-image-manipulator";

// A sticker is { type: "img" | "gif", v: string (URL or data URI), thumb?: string, giphy?: boolean, example?: boolean }

// A GIPHY sticker or GIF from its id. GIPHY asks apps to show its media from its own servers.
export const giphy = (id, type = "img", file = "giphy.webp") => ({
  type,
  giphy: true,
  v: `https://media.giphy.com/media/${id}/${file}`,
  thumb: `https://media.giphy.com/media/${id}/200w.webp`,
});

const MAX = 320;

// Shrink a picked or pasted image to 320px WebP, so many stickers fit on the phone
async function shrink(uri, width, height) {
  let ctx = ImageManipulator.manipulate(uri);
  if (Math.max(width || 0, height || 0) > MAX) {
    ctx = width >= height ? ctx.resize({ width: MAX }) : ctx.resize({ height: MAX });
  }
  const ref = await ctx.renderAsync();
  const out = await ref.saveAsync({ format: SaveFormat.WEBP, compress: 0.9, base64: true });
  return { type: "img", v: `data:image/webp;base64,${out.base64}` };
}

// Pick stickers from the phone's gallery. Small GIF and WebP files are kept as they are,
// so animated stickers keep moving.
export async function pickStickers() {
  const res = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ["images"],
    allowsMultipleSelection: true,
    selectionLimit: 10,
    base64: true,
    quality: 1,
  });
  if (res.canceled) return [];
  const out = [];
  for (const a of res.assets || []) {
    try {
      const mime = a.mimeType || "";
      const animated = mime === "image/gif" || mime === "image/webp";
      if (animated && a.base64 && (a.fileSize || 0) < 800_000) {
        out.push({ type: "img", v: `data:${mime};base64,${a.base64}` });
      } else {
        out.push(await shrink(a.uri, a.width, a.height));
      }
    } catch {
      // skip images that can't be read
    }
  }
  return out;
}

// Paste an image copied in another app (on iPhone: screenshot → Photos → hold the sticker → Copy)
export async function pasteSticker() {
  if (!(await Clipboard.hasImageAsync())) return null;
  const img = await Clipboard.getImageAsync({ format: "png" });
  if (!img?.data) return null;
  return shrink(img.data, img.size?.width, img.size?.height);
}
