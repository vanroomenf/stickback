// The iPhone-only extras (see ios/StickbackNativeModule.swift). In Expo Go, on Android and on the web
// the module isn't there: everything answers "not available" and the app uses its usual way.
import { Platform } from "react-native";
import { requireOptionalNativeModule } from "expo-modules-core";

const native = Platform.OS === "ios" ? requireOptionalNativeModule("StickbackNative") : null;

export const hasNative = !!native;

export function canCutOut() {
  try { return !!native?.canCutOut(); } catch { return false; }
}

// → { found: false } or { found: true, uri, width, height, outlinedUri, outlinedWidth, outlinedHeight }
export function cutOutSubject(uri) {
  return native.cutOutSubject(uri);
}

// Copies a sticker file (file://…) as a transparent PNG
export function copyStickerFile(uri) {
  return native.copySticker(uri);
}
