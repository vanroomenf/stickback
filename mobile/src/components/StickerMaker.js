// Make a sticker from a photo, like WhatsApp: pick a shape, move and zoom the photo with your fingers,
// white sticker border, optional text. The result is a transparent picture (512×512) saved to your stickers.
import { useEffect, useMemo, useRef, useState } from "react";
import { Animated, Image, Modal, PanResponder, Platform, Pressable, ScrollView, Text, TextInput, View, useWindowDimensions } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { captureRef } from "react-native-view-shot";
import { ImageManipulator, SaveFormat } from "expo-image-manipulator";
import { t } from "../i18n/index.js";
import { F, useStyles, useTheme } from "../theme.js";

const SHAPES = ["circle", "rounded", "whole"];

export default function StickerMaker({ source, onCancel, onDone }) {
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const { C } = useTheme();
  const st = useStyles(makeStyles);
  const S = Math.min(width - 40, 340); // the sticker on screen
  const [shape, setShape] = useState("circle");
  const [outline, setOutline] = useState(true);
  const [text, setText] = useState("");
  const [ink, setInk] = useState("white"); // text colour
  const [busy, setBusy] = useState(false);
  const shot = useRef(null);

  // Photo position and zoom, changed with one finger (move) and two fingers (zoom)
  const pos = useRef(new Animated.ValueXY({ x: 0, y: 0 })).current;
  const zoom = useRef(new Animated.Value(1)).current;
  const g = useRef({ x: 0, y: 0, z: 1, startX: 0, startY: 0, startZ: 1, startDist: 0 }).current;
  useEffect(() => {
    pos.setValue({ x: 0, y: 0 }); zoom.setValue(1);
    Object.assign(g, { x: 0, y: 0, z: 1 });
  }, [source, pos, zoom, g]);

  const dist = (touches) => Math.hypot(touches[0].pageX - touches[1].pageX, touches[0].pageY - touches[1].pageY);
  const pan = useMemo(() => PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onMoveShouldSetPanResponder: () => true,
    onPanResponderGrant: () => { g.startX = g.x; g.startY = g.y; g.startZ = g.z; g.startDist = 0; },
    onPanResponderMove: (e, s) => {
      const touches = e.nativeEvent.touches;
      if (touches.length >= 2) {
        const d = dist(touches);
        if (!g.startDist) { g.startDist = d; g.startZ = g.z; return; }
        g.z = Math.max(0.5, Math.min(5, g.startZ * (d / g.startDist)));
        zoom.setValue(g.z);
      } else {
        g.x = g.startX + s.dx; g.y = g.startY + s.dy;
        pos.setValue({ x: g.x, y: g.y });
      }
    },
    onPanResponderRelease: () => { g.startDist = 0; },
  }), [g, pos, zoom]);
  // Zoom with buttons too (handy on a computer, and for small steps)
  const step = (k) => { g.z = Math.max(0.5, Math.min(5, g.z * k)); Animated.spring(zoom, { toValue: g.z, useNativeDriver: true }).start(); };

  if (!source) return null;

  // The photo fills the shape (cover); "whole" shows all of it (contain)
  const inner = shape === "whole" ? S : S * 0.9;
  const ratio = source.width && source.height ? source.width / source.height : 1;
  const cover = shape !== "whole";
  const imgW = cover ? (ratio >= 1 ? inner * ratio : inner) : (ratio >= 1 ? inner : inner * ratio);
  const imgH = cover ? (ratio >= 1 ? inner : inner / ratio) : (ratio >= 1 ? inner / ratio : inner);
  const border = outline && shape !== "whole" ? Math.round(S * 0.04) : 0;
  const radius = shape === "circle" ? inner / 2 : shape === "rounded" ? inner * 0.2 : 0;

  const save = async () => {
    setBusy(true);
    try {
      const uri = Platform.OS === "web" ? await captureWeb(shot.current, S) : await captureRef(shot, { format: "png", quality: 1, result: "tmpfile", width: 512, height: 512 });
      const out = await (await ImageManipulator.manipulate(uri).resize({ width: 512, height: 512 }).renderAsync())
        .saveAsync({ format: Platform.OS === "web" ? SaveFormat.PNG : SaveFormat.WEBP, compress: 0.9, base64: true });
      const mime = Platform.OS === "web" ? "image/png" : "image/webp";
      onDone({ type: "img", v: `data:${mime};base64,${out.base64}` });
    } catch {
      onDone(null);
    } finally {
      setBusy(false);
    }
  };

  const textStyle = ink === "white"
    ? { color: "#FFFFFF", textShadowColor: "rgba(0,0,0,0.85)" }
    : { color: "#111111", textShadowColor: "rgba(255,255,255,0.95)" };

  return (
    <Modal visible animationType="slide" presentationStyle="fullScreen" onRequestClose={onCancel}>
      <View style={[st.wrap, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
        <View style={st.bar}>
          <Pressable onPress={onCancel} style={st.barBtn} accessibilityRole="button"><Text style={st.cancel}>{t("cancel")}</Text></Pressable>
          <Text style={st.title}>{t("maker.title")}</Text>
          <Pressable onPress={save} disabled={busy} style={st.barBtn} accessibilityRole="button">
            <Text style={[st.done, busy && { opacity: 0.4 }]}>{busy ? t("wait") : t("save")}</Text>
          </Pressable>
        </View>

        <ScrollView contentContainerStyle={st.body} keyboardShouldPersistTaps="handled" scrollEnabled={false}>
          {/* the checkerboard shows what will be transparent */}
          <View style={[st.canvas, { width: S, height: S }]} {...pan.panHandlers}>
            <Checker size={S} />
            <View ref={shot} collapsable={false} style={{ width: S, height: S, alignItems: "center", justifyContent: "center", backgroundColor: "transparent" }}>
              <View style={{
                width: inner, height: inner, borderRadius: radius, overflow: "hidden", alignItems: "center", justifyContent: "center",
                borderWidth: border, borderColor: "#FFFFFF", backgroundColor: shape === "whole" ? "transparent" : "#FFFFFF",
              }}>
                <Animated.View style={{ transform: [{ translateX: pos.x }, { translateY: pos.y }, { scale: zoom }] }}>
                  <Image source={{ uri: source.uri }} style={{ width: imgW, height: imgH }} resizeMode="cover" />
                </Animated.View>
              </View>
              {!!text.trim() && (
                <Text style={[st.overlay, { fontSize: S * (text.length > 14 ? 0.1 : 0.13), bottom: S * 0.06 }, textStyle]} numberOfLines={2}>
                  {text.trim()}
                </Text>
              )}
            </View>
          </View>
          <View style={st.zoomRow}>
            <Text style={st.hint}>{t("maker.hint")}</Text>
            <Pressable onPress={() => step(1 / 1.15)} style={st.zoomBtn} accessibilityRole="button" accessibilityLabel={t("maker.zoomOut")}><Text style={st.zoomTxt}>−</Text></Pressable>
            <Pressable onPress={() => step(1.15)} style={st.zoomBtn} accessibilityRole="button" accessibilityLabel={t("maker.zoomIn")}><Text style={st.zoomTxt}>+</Text></Pressable>
          </View>

          <Text style={st.lab}>{t("maker.shape")}</Text>
          <View style={st.chips}>
            {SHAPES.map((k) => (
              <Pressable key={k} onPress={() => setShape(k)} style={[st.chip, shape === k && st.chipOn]} accessibilityRole="radio" accessibilityState={{ selected: shape === k }}>
                <Text style={[st.chipTxt, shape === k && { color: C.bg }]}>{t(`maker.${k}`)}</Text>
              </Pressable>
            ))}
            {shape !== "whole" && (
              <Pressable onPress={() => setOutline(!outline)} style={[st.chip, outline && st.chipOn]} accessibilityRole="checkbox" accessibilityState={{ checked: outline }}>
                <Text style={[st.chipTxt, outline && { color: C.bg }]}>{t("maker.outline")}</Text>
              </Pressable>
            )}
          </View>

          <Text style={st.lab}>{t("maker.text")}</Text>
          <TextInput value={text} onChangeText={setText} maxLength={28} placeholder={t("maker.textPh")} placeholderTextColor={C.muted}
            style={st.input} returnKeyType="done" />
          {!!text.trim() && (
            <View style={st.chips}>
              {[["white", t("maker.white")], ["black", t("maker.black")]].map(([k, l]) => (
                <Pressable key={k} onPress={() => setInk(k)} style={[st.chip, ink === k && st.chipOn]} accessibilityRole="radio" accessibilityState={{ selected: ink === k }}>
                  <Text style={[st.chipTxt, ink === k && { color: C.bg }]}>{l}</Text>
                </Pressable>
              ))}
            </View>
          )}
        </ScrollView>
      </View>
    </Modal>
  );
}

// On the web the capture library paints a white background: draw it ourselves, transparent
async function captureWeb(el, size) {
  const { default: html2canvas } = await import("html2canvas-pro");
  const canvas = await html2canvas(el, { backgroundColor: null, useCORS: true, scale: 512 / size, logging: false });
  return canvas.toDataURL("image/png");
}

// Grey squares behind the sticker, like in photo editors, to show the transparent parts
function Checker({ size }) {
  const { C } = useTheme();
  const n = 12;
  const cell = size / n;
  const a = C.dark ? "#2B2521" : "#ECE4DD";
  const b = C.dark ? "#201B18" : "#F8F2EC";
  return (
    <View pointerEvents="none" style={{ position: "absolute", width: size, height: size, flexDirection: "row", flexWrap: "wrap", borderRadius: 20, overflow: "hidden" }}>
      {Array.from({ length: n * n }, (_, i) => (
        <View key={i} style={{ width: cell, height: cell, backgroundColor: (Math.floor(i / n) + i) % 2 ? a : b }} />
      ))}
    </View>
  );
}

const makeStyles = (C) => ({
  wrap: { flex: 1, backgroundColor: C.bg },
  bar: { flexDirection: "row", alignItems: "center", paddingHorizontal: 8, minHeight: 52 },
  barBtn: { minWidth: 76, minHeight: 44, justifyContent: "center", paddingHorizontal: 12 },
  title: { flex: 1, textAlign: "center", color: C.fg, fontFamily: F.bold, fontSize: 17 },
  cancel: { color: C.muted, fontFamily: F.medium, fontSize: 16 },
  done: { color: C.fg, fontFamily: F.bold, fontSize: 16, textAlign: "right" },
  body: { paddingHorizontal: 20, paddingTop: 8, paddingBottom: 24, gap: 12, alignItems: "stretch" },
  canvas: { alignSelf: "center", alignItems: "center", justifyContent: "center" },
  overlay: { position: "absolute", left: 8, right: 8, textAlign: "center", fontFamily: F.display, letterSpacing: -0.5, textShadowOffset: { width: 0, height: 0 }, textShadowRadius: 6 },
  zoomRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  hint: { flex: 1, color: C.muted, fontFamily: F.body, fontSize: 13 },
  zoomBtn: { width: 44, height: 40, borderRadius: 12, backgroundColor: C.raised, alignItems: "center", justifyContent: "center" },
  zoomTxt: { color: C.fg, fontFamily: F.bold, fontSize: 20 },
  lab: { color: C.muted, fontFamily: F.semi, fontSize: 12, letterSpacing: 0.6, marginTop: 4 },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  chip: { borderRadius: 999, minHeight: 38, paddingHorizontal: 15, justifyContent: "center", backgroundColor: C.raised },
  chipOn: { backgroundColor: C.fg },
  chipTxt: { color: C.fg, fontFamily: F.medium, fontSize: 14 },
  input: { backgroundColor: C.raised, borderRadius: 14, paddingHorizontal: 14, paddingVertical: 13, color: C.fg, fontFamily: F.medium, fontSize: 16 },
});
