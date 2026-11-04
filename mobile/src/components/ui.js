import { useEffect, useRef, useState } from "react";
import {
  Animated, KeyboardAvoidingView, Modal, PanResponder, Platform, Pressable, ScrollView, StyleSheet, Text, View,
} from "react-native";
import { Image } from "expo-image";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Svg, { Circle, Path } from "react-native-svg";
import { t } from "../i18n/index.js";
import { F, useStyles, useTheme } from "../theme.js";
import { fmt, initialOf } from "../lib/util.js";

// ───────── Icons (stroke 1.8, 24 grid) ─────────
const STAR = "M12 3.5l2.6 5.3 5.8.8-4.2 4.1 1 5.8L12 16.8l-5.2 2.7 1-5.8-4.2-4.1 5.8-.8z";

export function StarIcon({ filled, size = 20, color, fill }) {
  return (
    <Svg viewBox="0 0 24 24" width={size} height={size}>
      <Path d={STAR} fill={filled ? fill ?? color : "none"} stroke={filled ? fill ?? color : color} strokeWidth={1.8} strokeLinejoin="round" />
    </Svg>
  );
}

export function SaveIcon({ saved, color, size = 21 }) {
  return (
    <Svg viewBox="0 0 24 24" width={size} height={size}>
      <Path d="M6.5 3.5h11v17L12 16.6 6.5 20.5z" fill={saved ? color : "none"} stroke={color} strokeWidth={1.8} strokeLinejoin="round" />
    </Svg>
  );
}

export function HomeIcon({ color, filled = true, size = 26 }) {
  return (
    <Svg viewBox="0 0 24 24" width={size} height={size}>
      <Path d="M4 10.4L12 4l8 6.4V20h-5.2v-5.6H9.2V20H4z" fill={filled ? color : "none"} stroke={color} strokeWidth={filled ? 0 : 1.8} strokeLinejoin="round" />
    </Svg>
  );
}

export function PlusIcon({ color, size = 20, weight = 2.3 }) {
  return (
    <Svg viewBox="0 0 24 24" width={size} height={size}>
      <Path d="M12 5v14M5 12h14" stroke={color} strokeWidth={weight} strokeLinecap="round" />
    </Svg>
  );
}

export function MoreIcon({ color, size = 20 }) {
  return (
    <Svg viewBox="0 0 24 24" width={size} height={size}>
      <Circle cx={5} cy={12} r={1.8} fill={color} /><Circle cx={12} cy={12} r={1.8} fill={color} /><Circle cx={19} cy={12} r={1.8} fill={color} />
    </Svg>
  );
}

export function MenuIcon({ color, size = 24 }) {
  return (
    <Svg viewBox="0 0 24 24" width={size} height={size}>
      <Path d="M4 7h16M4 12h16M4 17h16" stroke={color} strokeWidth={1.9} strokeLinecap="round" />
    </Svg>
  );
}

export function BackIcon({ color, size = 24 }) {
  return (
    <Svg viewBox="0 0 24 24" width={size} height={size}>
      <Path d="M15 5l-7 7 7 7" stroke={color} strokeWidth={2} fill="none" strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

export function PasteIcon({ color, size = 22 }) {
  return (
    <Svg viewBox="0 0 24 24" width={size} height={size}>
      <Path d="M9 4.5h6M8 4.5H6.5a1.5 1.5 0 0 0-1.5 1.5v13.5A1.5 1.5 0 0 0 6.5 21h11a1.5 1.5 0 0 0 1.5-1.5V6a1.5 1.5 0 0 0-1.5-1.5H16M9 3h6v3H9z" stroke={color} strokeWidth={1.8} fill="none" strokeLinejoin="round" strokeLinecap="round" />
    </Svg>
  );
}

// The app's mark: a lowercase s on tomato, with the corner peeling off like a sticker
export function AppMark({ size = 64 }) {
  return (
    <View style={{ width: size, height: size, borderRadius: size * 0.23, backgroundColor: "#F0441F", alignItems: "center", justifyContent: "center", overflow: "hidden" }}
      accessibilityRole="image" accessibilityLabel="Stickback">
      <Text style={{ color: "#FFFFFF", fontFamily: F.display, fontSize: size * 0.85, lineHeight: size * 0.95, marginTop: -size * 0.13, letterSpacing: -size * 0.03 }}>s</Text>
      <Svg viewBox="0 0 54 54" width={size * 0.3} height={size * 0.3} style={{ position: "absolute", top: 0, right: 0 }}>
        <Path d="M0 0h54v54z" fill="#C7300F" />
        <Path d="M0 0l54 54H10a10 10 0 0 1-10-10z" fill="#FFE2CC" />
      </Svg>
    </View>
  );
}

// The wordmark
export function Logo({ color, size = 23 }) {
  return <Text style={{ color, fontFamily: F.display, fontSize: size, letterSpacing: -size * 0.035 }}>stickback</Text>;
}

// ───────── Stars ─────────
// Plain icon + number; your star turns tomato and pops
export function StarButton({ on, count, label, onToggle, color, size = 20, textSize = 14 }) {
  const { C } = useTheme();
  const scale = useRef(new Animated.Value(1)).current;
  const press = () => {
    if (!on) {
      scale.setValue(1);
      Animated.sequence([
        Animated.timing(scale, { toValue: 1.35, duration: 130, useNativeDriver: true }),
        Animated.spring(scale, { toValue: 1, friction: 4, useNativeDriver: true }),
      ]).start();
    }
    onToggle();
  };
  const ink = color ?? C.fg;
  return (
    <Pressable onPress={press} accessibilityRole="button" accessibilityLabel={label} accessibilityState={{ selected: on }}
      hitSlop={6} style={({ pressed }) => [s.star, pressed && { opacity: 0.6 }]}>
      <Animated.View style={{ transform: [{ scale }] }}>
        <StarIcon filled={on} size={size} color={ink} fill={C.accent} />
      </Animated.View>
      <Text style={[s.starNum, { color: ink, fontSize: textSize }]}>{fmt(count)}</Text>
    </Pressable>
  );
}

// ───────── People ─────────
export function Avatar({ users, user, size = 30, tone }) {
  const { person } = useTheme();
  const { bg, fg } = tone ?? person(user);
  return (
    <View style={[s.avatar, { width: size, height: size, borderRadius: size / 2, backgroundColor: bg }]}>
      <Text style={{ color: fg, fontFamily: F.bold, fontSize: size * 0.44 }}>{initialOf(users, user)}</Text>
    </View>
  );
}

// ───────── Stickers ─────────
// Sticker or GIF image; GIFs and animated WebP play automatically
export function StickerImage({ sticker, style, thumb }) {
  return (
    <Image source={{ uri: thumb ? sticker.thumb || sticker.v : sticker.v }} style={style} recyclingKey={sticker.v}
      contentFit="contain" transition={100} cachePolicy="memory-disk" autoplay />
  );
}

// A reply: your text on top, the sticker or GIF below, never mixed.
// compact = just the image, for thumbnails.
export function StickerCard({ meme, size, placeholder, compact, ink, muted }) {
  const { C } = useTheme();
  const gif = meme.sticker.type === "gif";
  const box = (
    <View style={[{ width: size, height: size }, gif && { backgroundColor: C.gifBg, borderRadius: compact ? 6 : 16, overflow: "hidden" }]}>
      <StickerImage sticker={meme.sticker} thumb={compact} style={{ width: "100%", height: "100%" }} />
    </View>
  );
  if (compact) return box;
  return (
    <View style={{ width: size, gap: 10 }}>
      <Text numberOfLines={3} style={[s.caption, captionSize(meme.caption), { color: placeholder ? muted ?? C.muted : ink ?? C.fg }]}>{meme.caption}</Text>
      {box}
    </View>
  );
}

// Long captions get a smaller size, so all 50 characters fit in three lines
const captionSize = (text = "") =>
  text.length <= 24 ? { fontSize: 18, lineHeight: 23 } : text.length <= 38 ? { fontSize: 16, lineHeight: 21 } : { fontSize: 14.5, lineHeight: 19 };

// ───────── Sheets, toasts, buttons ─────────
// Bottom sheet: the page behind only dims, the sheet slides up on its own and follows your finger.
// Drag the top (handle and title) down to close it, or tap outside.
export function Sheet({ visible, title, onClose, children }) {
  const insets = useSafeAreaInsets();
  const st = useStyles(sheetStyles);
  const [mounted, setMounted] = useState(visible);
  const y = useRef(new Animated.Value(800)).current;
  const fade = useRef(new Animated.Value(0)).current;
  const height = useRef(600);
  const closeRef = useRef(onClose);
  closeRef.current = onClose;
  // keep showing the last content while it slides away
  const last = useRef({ title, children });
  if (visible) last.current = { title, children };

  // open: once the sheet is on screen, slide it in
  useEffect(() => {
    if (!visible || !mounted) return;
    y.setValue(height.current);
    Animated.parallel([
      Animated.timing(fade, { toValue: 1, duration: 200, useNativeDriver: true }),
      Animated.spring(y, { toValue: 0, damping: 26, stiffness: 260, mass: 0.9, useNativeDriver: true }),
    ]).start();
  }, [visible, mounted]); // eslint-disable-line react-hooks/exhaustive-deps
  // close: slide it away, then take it off screen
  useEffect(() => {
    if (visible) {
      setMounted(true);
    } else if (mounted) {
      Animated.parallel([
        Animated.timing(fade, { toValue: 0, duration: 180, useNativeDriver: true }),
        Animated.timing(y, { toValue: height.current, duration: 200, useNativeDriver: true }),
      ]).start(({ finished }) => { if (finished) setMounted(false); });
    }
  }, [visible]); // eslint-disable-line react-hooks/exhaustive-deps

  const pan = useRef(PanResponder.create({
    // the top of the sheet is only a handle: take the touch right away (the Annulla button still gets its taps)
    onStartShouldSetPanResponder: () => true,
    onMoveShouldSetPanResponder: (_, g) => g.dy > 4 && Math.abs(g.dy) > Math.abs(g.dx),
    onPanResponderMove: (_, g) => y.setValue(Math.max(0, g.dy)),
    onPanResponderRelease: (_, g) => {
      if (g.dy > Math.min(140, height.current * 0.3) || g.vy > 1.1) closeRef.current();
      else Animated.spring(y, { toValue: 0, damping: 24, stiffness: 300, useNativeDriver: true }).start();
    },
    onPanResponderTerminate: () => Animated.spring(y, { toValue: 0, useNativeDriver: true }).start(),
  })).current;

  if (!mounted) return null;
  const shown = visible ? { title, children } : last.current;
  return (
    <Modal visible transparent animationType="none" statusBarTranslucent onRequestClose={onClose}>
      <View style={StyleSheet.absoluteFill}>
        <Animated.View style={[StyleSheet.absoluteFill, st.scrim, { opacity: fade }]}>
          <Pressable style={StyleSheet.absoluteFill} onPress={onClose} accessibilityLabel={t("close")} />
        </Animated.View>
        <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={st.place} pointerEvents="box-none">
          <Animated.View onLayout={(e) => { height.current = e.nativeEvent.layout.height; }}
            style={[st.sheet, { paddingBottom: Math.max(insets.bottom, 16) + 6, transform: [{ translateY: y }] }]}>
            <View {...pan.panHandlers} style={st.drag}>
              <View style={st.grab} />
              <View style={st.head}>
                <Text style={st.title}>{shown.title}</Text>
                <Pressable onPress={onClose} hitSlop={10} style={st.cancel} accessibilityRole="button">
                  <Text style={st.cancelTxt}>{t("cancel")}</Text>
                </Pressable>
              </View>
            </View>
            <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ gap: 16, paddingBottom: 4 }}>
              {shown.children}
            </ScrollView>
          </Animated.View>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
}
const sheetStyles = (C) => ({
  scrim: { backgroundColor: C.scrim },
  place: { flex: 1, justifyContent: "flex-end" },
  sheet: { backgroundColor: C.bg, borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingHorizontal: 20, maxHeight: "92%", gap: 8,
    shadowColor: "#000", shadowOpacity: 0.12, shadowRadius: 20, shadowOffset: { width: 0, height: -4 }, elevation: 16 },
  drag: { paddingTop: 8, userSelect: "none", cursor: "grab" },
  grab: { alignSelf: "center", width: 40, height: 5, borderRadius: 3, backgroundColor: C.muted, opacity: 0.35, marginBottom: 6 },
  head: { flexDirection: "row", alignItems: "center", minHeight: 44 },
  title: { flex: 1, color: C.fg, fontFamily: F.bold, fontSize: 20, letterSpacing: -0.4 },
  cancel: { minHeight: 44, justifyContent: "center", paddingLeft: 12 },
  cancelTxt: { color: C.muted, fontFamily: F.medium, fontSize: 15 },
});

export function Toast({ toast }) {
  const insets = useSafeAreaInsets();
  const { C } = useTheme();
  const opacity = useRef(new Animated.Value(0)).current;
  const [msg, setMsg] = useState("");
  useEffect(() => {
    if (!toast) return;
    setMsg(toast.msg);
    Animated.timing(opacity, { toValue: 1, duration: 180, useNativeDriver: true }).start();
    const tm = setTimeout(() => Animated.timing(opacity, { toValue: 0, duration: 250, useNativeDriver: true }).start(), 2300);
    return () => clearTimeout(tm);
  }, [toast, opacity]);
  return (
    <Animated.View pointerEvents="none" style={[s.toast, { top: insets.top + 60, opacity, backgroundColor: C.fg }]}>
      <Text style={[s.toastTxt, { color: C.bg }]} numberOfLines={2}>{msg}</Text>
    </Animated.View>
  );
}

// The main button: an ink pill. tone = { bg, fg } to match a coloured page.
export function Primary({ label, onPress, disabled, tone, danger, style }) {
  const { C } = useTheme();
  const bg = danger ? C.danger : tone?.bg ?? C.fg;
  const fg = danger ? (C.dark ? "#1A0B05" : "#FFFFFF") : tone?.fg ?? C.bg;
  return (
    <Pressable onPress={onPress} disabled={disabled} accessibilityRole="button" accessibilityState={{ disabled: !!disabled }}
      style={({ pressed }) => [s.primary, { backgroundColor: bg }, disabled && { opacity: 0.35 }, pressed && { opacity: 0.8 }, style]}>
      <Text style={[s.primaryTxt, { color: fg }]}>{label}</Text>
    </Pressable>
  );
}

// A quiet button on the raised colour
export function Secondary({ label, onPress, style }) {
  const { C } = useTheme();
  return (
    <Pressable onPress={onPress} accessibilityRole="button"
      style={({ pressed }) => [s.secondary, { backgroundColor: C.raised }, pressed && { opacity: 0.7 }, style]}>
      <Text style={[s.secondaryTxt, { color: C.fg }]}>{label}</Text>
    </Pressable>
  );
}

const s = StyleSheet.create({
  star: { flexDirection: "row", alignItems: "center", gap: 6, minHeight: 44, paddingHorizontal: 4 },
  starNum: { fontFamily: F.semi },
  avatar: { alignItems: "center", justifyContent: "center" },
  caption: { fontFamily: F.semi, fontSize: 18, lineHeight: 23, letterSpacing: -0.2 },
  toast: { position: "absolute", alignSelf: "center", borderRadius: 999, paddingVertical: 10, paddingHorizontal: 16, maxWidth: "88%", zIndex: 50 },
  toastTxt: { fontFamily: F.semi, fontSize: 14, textAlign: "center" },
  primary: { borderRadius: 999, minHeight: 50, paddingHorizontal: 24, alignItems: "center", justifyContent: "center" },
  primaryTxt: { fontFamily: F.semi, fontSize: 16 },
  secondary: { borderRadius: 12, minHeight: 42, paddingHorizontal: 16, alignItems: "center", justifyContent: "center" },
  secondaryTxt: { fontFamily: F.semi, fontSize: 14 },
});
