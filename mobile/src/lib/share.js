// Send one of your stickers out of Stickback: the phone's share menu (WhatsApp, Telegram, Save to Photos, …)
// or the clipboard, to paste it in any chat.
import { Platform } from "react-native";
import * as Clipboard from "expo-clipboard";
import * as Sharing from "expo-sharing";
import { File, Paths } from "expo-file-system";
import { ImageManipulator, SaveFormat } from "expo-image-manipulator";

const MIME = { gif: "image/gif", webp: "image/webp", png: "image/png", jpg: "image/jpeg" };
const extOf = (url) => {
  const m = /\.(gif|webp|png|jpe?g)(?:[?#]|$)/i.exec(url);
  return m ? m[1].toLowerCase().replace("jpeg", "jpg") : "webp";
};

// The sticker as a file on the phone (stickers live online, apps want a file)
async function download(sticker) {
  const ext = extOf(sticker.v);
  const dest = new File(Paths.cache, `stickback-${Date.now()}.${ext}`);
  const file = await File.downloadFileAsync(sticker.v, dest, { idempotent: true });
  return { file, ext };
}

// Opens the share menu. Animated stickers and GIFs stay animated.
export async function shareSticker(sticker) {
  if (Platform.OS === "web") {
    if (navigator.share) await navigator.share({ url: sticker.v });
    else window.open(sticker.v, "_blank", "noopener");
    return;
  }
  if (!(await Sharing.isAvailableAsync())) throw new Error("sharing unavailable");
  const { file, ext } = await download(sticker);
  await Sharing.shareAsync(file.uri, { mimeType: MIME[ext], dialogTitle: "Stickback" });
}

// Copies it as a picture (PNG, with its transparent background), ready to paste in a chat
export async function copySticker(sticker) {
  if (Platform.OS === "web") {
    await Clipboard.setStringAsync(sticker.v);
    return;
  }
  const { file } = await download(sticker);
  const rendered = await ImageManipulator.manipulate(file.uri).renderAsync();
  const png = await rendered.saveAsync({ format: SaveFormat.PNG, base64: true });
  await Clipboard.setImageAsync(png.base64);
}
