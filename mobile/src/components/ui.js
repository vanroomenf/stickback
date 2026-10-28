import { useEffect, useRef, useState } from "react";
import {
  Animated, KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, StyleSheet, Text, View,
} from "react-native";
import { Image } from "expo-image";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Svg, { Path } from "react-native-svg";
import { C, F } from "../theme.js";
import { fmt, hue, initialOf, rot } from "../lib/util.js";

const STAR = "M12 2.8l2.8 5.8 6.3.9-4.6 4.4 1.1 6.3L12 17.2l-5.6 3 1.1-6.3-4.6-4.4 6.3-.9z";

export function StarIcon({ filled, size = 16, color }) {
  return (
    <Svg viewBox="0 0 24 24" width={size} height={size}>
      <Path d={STAR} fill={filled ? color : "none"} stroke={filled ? "none" : color} strokeWidth={2} strokeLinejoin="round" />
    </Svg>
  );
}

export function SaveIcon({ saved, color }) {
  const book = "M6 3h12a1 1 0 0 1 1 1v17l-7-4.5L5 21V4a1 1 0 0 1 1-1z";
  return saved ? (
    <Svg viewBox="0 0 24 24" width={17} height={17}>
      <Path d={book} fill={color} />
      <Path d="M8.6 9.6l2.3 2.3 4.5-4.6" fill="none" stroke={C.accent} strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  ) : (
    <Svg viewBox="0 0 24 24" width={17} height={17}>
      <Path d={book} fill="none" stroke={color} strokeWidth={2} strokeLinejoin="round" />
      <Path d="M12 7.5v6M9 10.5h6" stroke={color} strokeWidth={2} strokeLinecap="round" />
    </Svg>
  );
}

export function HomeIcon({ color }) {
  return (
    <Svg viewBox="0 0 24 24" width={24} height={24}>
      <Path d="M4 10.5 12 4l8 6.5V20h-5.5v-6h-5v6H4z" fill={color} />
    </Svg>
  );
}

export function StarButton({ on, count, label, big, onToggle }) {
  const scale = useRef(new Animated.Value(1)).current;
  const press = () => {
    if (!on) {
      scale.setValue(1);
      Animated.sequence([
        Animated.timing(scale, { toValue: 1.45, duration: 140, useNativeDriver: true }),
        Animated.spring(scale, { toValue: 1, useNativeDriver: true }),
      ]).start();
    }
    onToggle();
  };
  const color = on ? C.accentInk : C.muted;
  return (
    <Pressable onPress={press} accessibilityRole="button" accessibilityLabel={label} accessibilityState={{ selected: on }}
      hitSlop={6} style={[s.star, big && s.starBig, on && s.starOn]}>
      <Animated.View style={{ transform: [{ scale }] }}>
        <StarIcon filled={on} size={big ? 22 : 16} color={color} />
      </Animated.View>
      <Text style={[s.starNum, big && s.starNumBig, on && { color: C.accentInk }]}>{fmt(count)}</Text>
    </Pressable>
  );
}

export function Avatar({ users, user, size = 26 }) {
  return (
    <View style={[s.avatar, { width: size, height: size, borderRadius: size / 2, backgroundColor: `hsl(${hue(user)}, 55%, 45%)` }]}>
      <Text style={[s.avatarTxt, { fontSize: size * 0.45 }]}>{initialOf(users, user)}</Text>
    </View>
  );
}

// Sticker or GIF image; GIFs and animated WebP play automatically
export function StickerImage({ sticker, style, thumb }) {
  return (
    <Image source={{ uri: thumb ? sticker.thumb || sticker.v : sticker.v }} style={style}
      contentFit={sticker.type === "gif" && !thumb ? "contain" : "contain"} transition={120} autoplay />
  );
}

// A reply: your text on top, the sticker or GIF below, kept separate
export function StickerCard({ meme, size, placeholder, compact }) {
  const gif = meme.sticker.type === "gif";
  const pad = compact ? 0 : size * 0.06;
  return (
    <View style={[s.card, { width: size, height: size, borderRadius: compact ? 8 : 16 }]}>
      {!compact && (
        <Text numberOfLines={3} style={[s.caption, { fontSize: Math.max(11, size * 0.066), paddingHorizontal: pad, paddingTop: pad },
          placeholder && { color: C.muted }]}>{meme.caption}</Text>
      )}
      <View style={[s.stk, gif ? { backgroundColor: C.gifBg, marginTop: compact ? 0 : size * 0.03 } : { padding: pad, paddingTop: compact ? 0 : size * 0.02 }]}>
        <StickerImage sticker={meme.sticker} thumb={compact}
          style={[{ width: "100%", height: "100%" }, !gif && !compact && { transform: [{ rotate: rot(meme.id) }] }]} />
      </View>
    </View>
  );
}

// Bottom sheet used for replying, posting and editing the profile
export function Sheet({ visible, title, onClose, children }) {
  const insets = useSafeAreaInsets();
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={s.backdrop}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} accessibilityLabel="Chiudi" />
        <View style={[s.sheet, { paddingBottom: Math.max(insets.bottom, 16) + 6 }]}>
          <View style={s.sheetHead}>
            <Text style={s.sheetTitle}>{title}</Text>
            <Pressable onPress={onClose} hitSlop={10}><Text style={s.ghost}>Annulla</Text></Pressable>
          </View>
          <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ gap: 14, paddingBottom: 4 }}>
            {children}
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

export function Toast({ toast }) {
  const insets = useSafeAreaInsets();
  const opacity = useRef(new Animated.Value(0)).current;
  const [msg, setMsg] = useState("");
  useEffect(() => {
    if (!toast) return;
    setMsg(toast.msg);
    Animated.timing(opacity, { toValue: 1, duration: 180, useNativeDriver: true }).start();
    const t = setTimeout(() => Animated.timing(opacity, { toValue: 0, duration: 250, useNativeDriver: true }).start(), 2300);
    return () => clearTimeout(t);
  }, [toast, opacity]);
  return (
    <Animated.View pointerEvents="none" style={[s.toast, { top: insets.top + 56, opacity }]}>
      <Text style={s.toastTxt} numberOfLines={1}>{msg}</Text>
    </Animated.View>
  );
}

export function Primary({ label, onPress, disabled }) {
  return (
    <Pressable onPress={onPress} disabled={disabled} accessibilityRole="button"
      style={({ pressed }) => [s.primary, disabled && { opacity: 0.4 }, pressed && { opacity: 0.85 }]}>
      <Text style={s.primaryTxt}>{label}</Text>
    </Pressable>
  );
}

export const s = StyleSheet.create({
  star: { flexDirection: "row", alignItems: "center", gap: 5, backgroundColor: C.surface, borderWidth: 1, borderColor: C.line, borderRadius: 99, paddingVertical: 5, paddingHorizontal: 11 },
  starBig: { flexDirection: "column", gap: 1, paddingVertical: 8, paddingHorizontal: 10, borderRadius: 14, minWidth: 54 },
  starOn: { backgroundColor: C.accent, borderColor: C.accent },
  starNum: { color: C.fg, fontFamily: F.bold, fontSize: 14 },
  starNumBig: { fontSize: 12 },
  avatar: { alignItems: "center", justifyContent: "center" },
  avatarTxt: { color: "#fff", fontFamily: F.bold },
  card: { backgroundColor: C.surface, borderWidth: 1, borderColor: C.line, overflow: "hidden" },
  caption: { color: C.fg, fontFamily: F.semi, lineHeight: undefined },
  stk: { flex: 1 },
  backdrop: { flex: 1, justifyContent: "flex-end", backgroundColor: "rgba(8,6,12,0.6)" },
  sheet: { backgroundColor: C.surface, borderTopLeftRadius: 22, borderTopRightRadius: 22, borderTopWidth: 1, borderColor: C.line, paddingHorizontal: 20, paddingTop: 18, maxHeight: "94%", gap: 14 },
  sheetHead: { flexDirection: "row", alignItems: "center" },
  sheetTitle: { flex: 1, color: C.fg, fontFamily: F.display, fontSize: 20 },
  ghost: { color: C.muted, fontFamily: F.medium, fontSize: 14 },
  toast: { position: "absolute", alignSelf: "center", backgroundColor: C.fg, borderRadius: 99, paddingVertical: 9, paddingHorizontal: 14, maxWidth: "90%", zIndex: 50 },
  toastTxt: { color: C.bg, fontFamily: F.semi, fontSize: 13 },
  primary: { backgroundColor: C.accent, borderRadius: 14, paddingVertical: 14, alignItems: "center" },
  primaryTxt: { color: C.accentInk, fontFamily: F.bold, fontSize: 15 },
});
