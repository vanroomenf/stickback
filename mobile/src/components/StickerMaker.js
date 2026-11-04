// Make a sticker from a photo, like WhatsApp's sticker maker:
//   Cutout  – shape of the sticker (circle, rounded, heart, star, whole photo) and white border;
//             the photo moves with one finger and zooms with two
//   Text    – words on top: font, colour, style; drag, pinch to resize, twist to rotate
//   Add     – emoji or one of your stickers on top, same gestures
//   Draw    – draw with your finger, in colour
// Undo takes back the last change. The result is a transparent 512×512 picture saved to your stickers.
// Automatic subject cutout (like Photos) needs the installed app and comes with the native build.
import { memo, useEffect, useMemo, useRef, useState } from "react";
import { Animated, Image, Modal, PanResponder, Platform, Pressable, ScrollView, Text, TextInput, View, useWindowDimensions } from "react-native";
import MaskedView from "@react-native-masked-view/masked-view";
import Svg, { Circle, Path, Rect } from "react-native-svg";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { captureRef } from "react-native-view-shot";
import { ImageManipulator, SaveFormat } from "expo-image-manipulator";
import { t } from "../i18n/index.js";
import { F, useStyles, useTheme } from "../theme.js";
import { StickerImage } from "./ui.js";

const WEB = Platform.OS === "web";
// heart and star need a real mask, which only exists on the phone
const SHAPES = WEB ? ["circle", "rounded", "whole"] : ["circle", "rounded", "heart", "star", "whole"];
const TOOLS = ["cutout", "text", "add", "draw"];
const COLORS = ["#FFFFFF", "#111111", "#F0441F", "#FFC53D", "#34C759", "#2F80ED", "#FF5FA2", "#8E5CFF"];
const WIDTHS = [4, 8, 14];
const EMOJI = ["😂", "😭", "🤣", "😅", "🙃", "😳", "😱", "🫠", "💀", "🤡", "👀", "🙈", "🔥", "💯", "✨", "❤️",
  "👍", "👎", "🙏", "🤦", "🤷", "😎", "🥲", "😤", "😡", "🥳", "🤯", "🤢", "😴", "🫣", "👻", "💩"];
const FONTS = [
  ["bold", F.display],
  ["serif", Platform.select({ ios: "Georgia-Bold", android: "serif", default: "Georgia, serif" })],
  ["hand", Platform.select({ ios: "MarkerFelt-Wide", android: "casual", default: "'Comic Sans MS', cursive" })],
  ["mono", Platform.select({ ios: "Menlo-Bold", android: "monospace", default: "monospace" })],
];
const fontOf = (k) => (FONTS.find(([n]) => n === k) ?? FONTS[0])[1];

// Shape outlines in a 100×100 box
const starPath = (() => {
  const pts = [];
  for (let i = 0; i < 10; i++) {
    const r = i % 2 ? 22 : 49;
    const a = -Math.PI / 2 + (i * Math.PI) / 5;
    pts.push(`${(50 + r * Math.cos(a)).toFixed(1)} ${(53 + r * Math.sin(a)).toFixed(1)}`);
  }
  return `M${pts.join(" L")} Z`;
})();
const HEART = "M50 90 C 22 70, 3 52, 3 31 C 3 15, 15 5, 29 5 C 39 5, 46 11, 50 19 C 54 11, 61 5, 71 5 C 85 5, 97 15, 97 31 C 97 52, 78 70, 50 90 Z";
function ShapeSvg({ shape, size, fill, stroke, strokeWidth = 0 }) {
  const common = { fill, stroke, strokeWidth, strokeLinejoin: "round" };
  return (
    <Svg width={size} height={size} viewBox="0 0 100 100" style={{ overflow: "visible" }}>
      {shape === "circle" && <Circle cx={50} cy={50} r={50} {...common} />}
      {shape === "rounded" && <Rect x={0} y={0} width={100} height={100} rx={20} {...common} />}
      {shape === "heart" && <Path d={HEART} {...common} />}
      {shape === "star" && <Path d={starPath} {...common} />}
    </Svg>
  );
}

let nextLayer = 1;

export default function StickerMaker({ source, myStickers = [], onCancel, onDone }) {
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const { C } = useTheme();
  const st = useStyles(makeStyles);
  const S = Math.min(width - 40, 340); // the sticker on screen
  const [shape, setShape] = useState("circle");
  const [outline, setOutline] = useState(true);
  const [tool, setTool] = useState("cutout");
  const [addTab, setAddTab] = useState("emoji");
  const [layers, setLayers] = useState([]); // text, emoji and stickers on top
  const [strokes, setStrokes] = useState([]); // drawing: { color, width, d }
  const [selected, setSelected] = useState(null);
  const [penColor, setPenColor] = useState(COLORS[2]);
  const [penWidth, setPenWidth] = useState(WIDTHS[1]);
  const [history, setHistory] = useState([]);
  const [busy, setBusy] = useState(false);
  const [capturing, setCapturing] = useState(false);
  const shot = useRef(null);

  // Every change goes through here so Undo can take it back (reads the latest state, also from gesture handlers)
  const now = useRef({});
  now.current = { layers, strokes, shape, outline };
  const snapshot = () => setHistory((h) => [...h.slice(-30), { ...now.current }]);
  const undo = () => setHistory((h) => {
    const prev = h[h.length - 1];
    if (!prev) return h;
    setLayers(prev.layers); setStrokes(prev.strokes); setShape(prev.shape); setOutline(prev.outline); setSelected(null);
    return h.slice(0, -1);
  });

  // ───────── Photo: move with one finger, zoom with two ─────────
  const pos = useRef(new Animated.ValueXY({ x: 0, y: 0 })).current;
  const zoom = useRef(new Animated.Value(1)).current;
  const g = useRef({ x: 0, y: 0, z: 1, sx: 0, sy: 0, sz: 1, d0: 0 }).current;
  useEffect(() => { pos.setValue({ x: 0, y: 0 }); zoom.setValue(1); Object.assign(g, { x: 0, y: 0, z: 1 }); }, [source, pos, zoom, g]);
  const photoPan = useMemo(() => PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onMoveShouldSetPanResponder: () => true,
    onPanResponderGrant: () => { g.sx = g.x; g.sy = g.y; g.sz = g.z; g.d0 = 0; setSelected(null); },
    onPanResponderMove: (e, s) => {
      const tt = e.nativeEvent.touches;
      if (tt.length >= 2) {
        const d = Math.hypot(tt[0].pageX - tt[1].pageX, tt[0].pageY - tt[1].pageY);
        if (!g.d0) { g.d0 = d; g.sz = g.z; return; }
        g.z = Math.max(0.5, Math.min(5, g.sz * (d / g.d0)));
        zoom.setValue(g.z);
      } else {
        g.x = g.sx + s.dx; g.y = g.sy + s.dy;
        pos.setValue({ x: g.x, y: g.y });
      }
    },
  }), [g, pos, zoom]);
  const step = (k) => { g.z = Math.max(0.5, Math.min(5, g.z * k)); Animated.spring(zoom, { toValue: g.z, useNativeDriver: true }).start(); };

  // ───────── Drawing ─────────
  const drawing = useRef(null);
  const [live, setLive] = useState(null); // the stroke under your finger
  const drawPan = useMemo(() => PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onMoveShouldSetPanResponder: () => true,
    onPanResponderGrant: (e) => {
      const { locationX: x, locationY: y } = e.nativeEvent;
      drawing.current = { pts: [[x, y]] };
      setLive(`M${x.toFixed(1)} ${y.toFixed(1)}`);
    },
    onPanResponderMove: (e) => {
      const d = drawing.current;
      if (!d) return;
      const { locationX: x, locationY: y } = e.nativeEvent;
      const [lx, ly] = d.pts[d.pts.length - 1];
      if (Math.hypot(x - lx, y - ly) < 2) return;
      d.pts.push([x, y]);
      setLive((p) => `${p} L${x.toFixed(1)} ${y.toFixed(1)}`);
    },
    onPanResponderRelease: () => {
      const d = drawing.current;
      drawing.current = null;
      setLive((p) => {
        if (p && d) {
          const dot = d.pts.length === 1 ? ` L${(d.pts[0][0] + 0.1).toFixed(1)} ${d.pts[0][1].toFixed(1)}` : "";
          fns.current.commitStroke(p + dot);
        }
        return null;
      });
    },
  }), []); // eslint-disable-line react-hooks/exhaustive-deps
  const pen = useRef({ penColor, penWidth });
  pen.current = { penColor, penWidth };
  const commitStroke = (d) => {
    snapshot();
    setStrokes((s) => [...s, { d, color: pen.current.penColor, width: pen.current.penWidth }]);
  };
  const fns = useRef({});
  fns.current = { commitStroke };

  // ───────── Layers on top ─────────
  const addLayer = (layer) => {
    snapshot();
    const id = nextLayer++;
    setLayers((ls) => [...ls, { id, x: 0, y: 0, scale: 1, rot: 0, ...layer }]);
    setSelected(id);
  };
  const updateLayer = (id, patch, withHistory = false) => {
    if (withHistory) snapshot();
    setLayers((ls) => ls.map((l) => (l.id === id ? { ...l, ...patch } : l)));
  };
  const removeLayer = (id) => { snapshot(); setLayers((ls) => ls.filter((l) => l.id !== id)); setSelected(null); };
  const sel = layers.find((l) => l.id === selected) ?? null;
  const selText = sel?.kind === "text" ? sel : null;

  if (!source) return null;

  // The photo fills the shape (cover); "whole" shows all of it (contain)
  const whole = shape === "whole";
  const inner = whole ? S : S * 0.86;
  const ratio = source.width && source.height ? source.width / source.height : 1;
  const imgW = whole ? (ratio >= 1 ? inner : inner * ratio) : (ratio >= 1 ? inner * ratio : inner);
  const imgH = whole ? (ratio >= 1 ? inner / ratio : inner) : (ratio >= 1 ? inner : inner / ratio);
  const border = outline && !whole ? S * 0.04 : 0;

  const photo = (
    <View style={{ width: inner, height: inner, alignItems: "center", justifyContent: "center", overflow: "hidden" }}>
      <Animated.View style={{ transform: [{ translateX: pos.x }, { translateY: pos.y }, { scale: zoom }] }}>
        <Image source={{ uri: source.uri }} style={{ width: imgW, height: imgH }} resizeMode="cover" />
      </Animated.View>
    </View>
  );
  let shaped = photo;
  if (!whole) {
    shaped = WEB
      ? <View style={{ width: inner, height: inner, borderRadius: shape === "circle" ? inner / 2 : inner * 0.2, overflow: "hidden" }}>{photo}</View>
      : <MaskedView style={{ width: inner, height: inner }} maskElement={<ShapeSvg shape={shape} size={inner} fill="#000" />}>{photo}</MaskedView>;
  }

  const save = async () => {
    setBusy(true);
    setSelected(null);
    setCapturing(true);
    await new Promise((ok) => setTimeout(ok, 60)); // let the selection frame disappear
    try {
      const uri = WEB ? await captureWeb(shot.current, S) : await captureRef(shot, { format: "png", quality: 1, result: "tmpfile", width: 512, height: 512 });
      const out = await (await ImageManipulator.manipulate(uri).resize({ width: 512, height: 512 }).renderAsync())
        .saveAsync({ format: WEB ? SaveFormat.PNG : SaveFormat.WEBP, compress: 0.9, base64: true });
      onDone({ type: "img", v: `data:${WEB ? "image/png" : "image/webp"};base64,${out.base64}` });
    } catch {
      onDone(null);
    } finally {
      setBusy(false);
      setCapturing(false);
    }
  };

  const chip = (on, label, onPress, key) => (
    <Pressable key={key ?? label} onPress={onPress} style={[st.chip, on && st.chipOn]} accessibilityRole="button" accessibilityState={{ selected: on }}>
      <Text style={[st.chipTxt, on && { color: C.bg }]}>{label}</Text>
    </Pressable>
  );
  const swatches = (value, onPick) => (
    <View style={st.swatches}>
      {COLORS.map((c) => (
        <Pressable key={c} onPress={() => onPick(c)} style={[st.swatch, { backgroundColor: c }, value === c && st.swatchOn]}
          accessibilityRole="button" accessibilityLabel={c} accessibilityState={{ selected: value === c }} />
      ))}
    </View>
  );

  return (
    <Modal visible animationType="slide" presentationStyle="fullScreen" onRequestClose={onCancel}>
      <View style={[st.wrap, { paddingTop: insets.top, paddingBottom: Math.max(insets.bottom, 8) }]}>
        <View style={st.bar}>
          <Pressable onPress={onCancel} style={st.barBtn} accessibilityRole="button"><Text style={st.cancel}>{t("cancel")}</Text></Pressable>
          <Text style={st.title}>{t("maker.title")}</Text>
          <Pressable onPress={save} disabled={busy} style={st.barBtn} accessibilityRole="button">
            <Text style={[st.done, busy && { opacity: 0.4 }]}>{busy ? t("wait") : t("save")}</Text>
          </Pressable>
        </View>

        {/* the canvas: checkerboard = transparent */}
        <View style={[st.canvas, { width: S, height: S }]}>
          <Checker size={S} />
          <View ref={shot} collapsable={false} style={{ width: S, height: S, backgroundColor: "transparent" }}>
            <View style={{ position: "absolute", width: S, height: S, alignItems: "center", justifyContent: "center" }} {...photoPan.panHandlers}>
              {border > 0 && (
                <View style={{ position: "absolute" }} pointerEvents="none">
                  <ShapeSvg shape={shape} size={inner} fill="#FFFFFF" stroke="#FFFFFF" strokeWidth={(border * 2 * 100) / inner} />
                </View>
              )}
              {shaped}
            </View>
            <Svg width={S} height={S} style={{ position: "absolute" }} pointerEvents="none">
              {strokes.map((s, i) => <Path key={i} d={s.d} stroke={s.color} strokeWidth={s.width} fill="none" strokeLinecap="round" strokeLinejoin="round" />)}
              {live && <Path d={live} stroke={penColor} strokeWidth={penWidth} fill="none" strokeLinecap="round" strokeLinejoin="round" />}
            </Svg>
            {layers.map((l) => (
              <Layer key={l.id} layer={l} S={S} selected={!capturing && selected === l.id} disabled={tool === "draw"}
                onSelect={() => setSelected(l.id)} onChange={(patch) => updateLayer(l.id, patch, true)} onRemove={() => removeLayer(l.id)} />
            ))}
            {tool === "draw" && <View style={{ position: "absolute", width: S, height: S }} {...drawPan.panHandlers} />}
          </View>
        </View>

        {/* tools */}
        <View style={st.tools}>
          {TOOLS.map((k) => (
            <Pressable key={k} onPress={() => { setTool(k); if (k === "draw") setSelected(null); }} style={[st.tool, tool === k && st.toolOn]}
              accessibilityRole="tab" accessibilityState={{ selected: tool === k }}>
              <Text style={[st.toolTxt, tool === k && { color: C.fg, fontFamily: F.bold }]}>{t(`maker.tool.${k}`)}</Text>
            </Pressable>
          ))}
          <Pressable onPress={undo} disabled={!history.length} style={[st.undo, !history.length && { opacity: 0.35 }]}
            accessibilityRole="button" accessibilityLabel={t("maker.undo")}>
            <Svg width={20} height={20} viewBox="0 0 24 24"><Path d="M9 7L4 12l5 5M4 12h11a5 5 0 0 1 0 10h-3" stroke={C.fg} strokeWidth={2} fill="none" strokeLinecap="round" strokeLinejoin="round" /></Svg>
          </Pressable>
        </View>

        <ScrollView style={{ flex: 1 }} contentContainerStyle={st.panel} keyboardShouldPersistTaps="handled">
          {tool === "cutout" && (
            <>
              <View style={st.chips}>{SHAPES.map((k) => chip(shape === k, t(`maker.${k}`), () => { snapshot(); setShape(k); }, k))}</View>
              {!whole && <View style={st.chips}>{chip(outline, t("maker.outline"), () => { snapshot(); setOutline(!outline); })}</View>}
              <View style={st.zoomRow}>
                <Text style={st.hint}>{t("maker.hint")}</Text>
                <Pressable onPress={() => step(1 / 1.15)} style={st.zoomBtn} accessibilityRole="button" accessibilityLabel={t("maker.zoomOut")}><Text style={st.zoomTxt}>−</Text></Pressable>
                <Pressable onPress={() => step(1.15)} style={st.zoomBtn} accessibilityRole="button" accessibilityLabel={t("maker.zoomIn")}><Text style={st.zoomTxt}>+</Text></Pressable>
              </View>
              <Text style={st.soon}>{t("maker.subjectSoon")}</Text>
            </>
          )}

          {tool === "text" && (
            <>
              <TextInput value={selText ? selText.text : ""} placeholder={t("maker.textPh")} placeholderTextColor={C.muted} maxLength={40}
                onChangeText={(v) => (selText ? updateLayer(selText.id, { text: v }) : v && addLayer({ kind: "text", text: v, font: "bold", color: "#FFFFFF", style: "shadow" }))}
                style={st.input} returnKeyType="done" submitBehavior="blurAndSubmit" />
              {selText && (
                <>
                  <View style={st.chips}>{FONTS.map(([k, ff]) => (
                    <Pressable key={k} onPress={() => updateLayer(selText.id, { font: k }, true)} style={[st.chip, selText.font === k && st.chipOn]} accessibilityRole="button">
                      <Text style={[st.chipTxt, { fontFamily: ff }, selText.font === k && { color: C.bg }]}>Aa</Text>
                    </Pressable>
                  ))}</View>
                  {swatches(selText.color, (c) => updateLayer(selText.id, { color: c }, true))}
                  <View style={st.chips}>{["shadow", "outline", "box"].map((k) => chip(selText.style === k, t(`maker.style.${k}`), () => updateLayer(selText.id, { style: k }, true), k))}</View>
                </>
              )}
              <Pressable onPress={() => addLayer({ kind: "text", text: t("maker.newText"), font: "bold", color: "#FFFFFF", style: "shadow" })} style={st.addBtn} accessibilityRole="button">
                <Text style={st.addTxt}>{t("maker.addText")}</Text>
              </Pressable>
              <Text style={st.hint}>{t("maker.layerHint")}</Text>
            </>
          )}

          {tool === "add" && (
            <>
              <View style={st.chips}>
                {chip(addTab === "emoji", t("maker.emoji"), () => setAddTab("emoji"))}
                {chip(addTab === "mine", t("maker.mine"), () => setAddTab("mine"))}
              </View>
              {addTab === "emoji" ? (
                <View style={st.grid}>
                  {EMOJI.map((e) => (
                    <Pressable key={e} onPress={() => addLayer({ kind: "emoji", char: e })} style={st.cell} accessibilityRole="button" accessibilityLabel={e}>
                      <Text style={{ fontSize: 30 }}>{e}</Text>
                    </Pressable>
                  ))}
                </View>
              ) : (
                <View style={st.grid}>
                  {myStickers.map((sk) => (
                    <Pressable key={sk.v} onPress={() => addLayer({ kind: "sticker", sticker: sk })} style={st.cell} accessibilityRole="button">
                      <StickerImage sticker={sk} thumb style={{ width: 44, height: 44 }} />
                    </Pressable>
                  ))}
                </View>
              )}
              <Text style={st.hint}>{t("maker.layerHint")}</Text>
            </>
          )}

          {tool === "draw" && (
            <>
              {swatches(penColor, setPenColor)}
              <View style={st.chips}>
                {WIDTHS.map((w, i) => (
                  <Pressable key={w} onPress={() => setPenWidth(w)} style={[st.chip, { width: 56, alignItems: "center" }, penWidth === w && st.chipOn]}
                    accessibilityRole="button" accessibilityLabel={t(`maker.width.${i}`)}>
                    <View style={{ width: w + 2, height: w + 2, borderRadius: w, backgroundColor: penWidth === w ? C.bg : C.fg }} />
                  </Pressable>
                ))}
              </View>
              <Text style={st.hint}>{t("maker.drawHint")}</Text>
            </>
          )}
        </ScrollView>
      </View>
    </Modal>
  );
}

// One piece on top of the photo: drag it, pinch to resize, twist to rotate; tap to select
const Layer = memo(function Layer({ layer, S, selected, disabled, onSelect, onChange, onRemove }) {
  const { C } = useTheme();
  const pos = useRef(new Animated.ValueXY({ x: layer.x, y: layer.y })).current;
  const scale = useRef(new Animated.Value(layer.scale)).current;
  const rot = useRef(new Animated.Value(layer.rot)).current;
  const g = useRef({ ...layer, d0: 0, a0: 0, sScale: 1, sRot: 0, sx: 0, sy: 0 }).current;
  // follow Undo
  useEffect(() => {
    Object.assign(g, { x: layer.x, y: layer.y, scale: layer.scale, rot: layer.rot });
    pos.setValue({ x: layer.x, y: layer.y }); scale.setValue(layer.scale); rot.setValue(layer.rot);
  }, [layer.x, layer.y, layer.scale, layer.rot, g, pos, scale, rot]);
  const cb = useRef({ onSelect, onChange });
  cb.current = { onSelect, onChange };

  const pan = useMemo(() => PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onMoveShouldSetPanResponder: () => true,
    onPanResponderGrant: () => { cb.current.onSelect(); g.sx = g.x; g.sy = g.y; g.sScale = g.scale; g.sRot = g.rot; g.d0 = 0; },
    onPanResponderMove: (e, s) => {
      const tt = e.nativeEvent.touches;
      if (tt.length >= 2) {
        const dx = tt[1].pageX - tt[0].pageX, dy = tt[1].pageY - tt[0].pageY;
        const d = Math.hypot(dx, dy), a = Math.atan2(dy, dx);
        if (!g.d0) { g.d0 = d; g.a0 = a; g.sScale = g.scale; g.sRot = g.rot; return; }
        g.scale = Math.max(0.3, Math.min(6, g.sScale * (d / g.d0)));
        g.rot = g.sRot + (a - g.a0);
        scale.setValue(g.scale); rot.setValue(g.rot);
      } else if (!g.d0) {
        g.x = g.sx + s.dx; g.y = g.sy + s.dy;
        pos.setValue({ x: g.x, y: g.y });
      }
    },
    onPanResponderRelease: () => { g.d0 = 0; cb.current.onChange({ x: g.x, y: g.y, scale: g.scale, rot: g.rot }); },
  }), [g, pos, scale, rot]);

  const size = S * 0.12;
  let body;
  if (layer.kind === "emoji") body = <Text style={{ fontSize: size * 1.6 }}>{layer.char}</Text>;
  else if (layer.kind === "sticker") body = <StickerImage sticker={layer.sticker} style={{ width: S * 0.32, height: S * 0.32 }} />;
  else {
    const dark = ["#111111", "#2F80ED", "#8E5CFF"].includes(layer.color);
    const ts = layer.style === "box"
      ? { color: dark ? "#FFFFFF" : "#111111", backgroundColor: layer.color, paddingHorizontal: 10, paddingVertical: 2, borderRadius: 10, overflow: "hidden" }
      : { color: layer.color, textShadowColor: layer.style === "outline" ? (dark ? "#FFFFFF" : "#000000") : "rgba(0,0,0,0.55)",
        textShadowRadius: layer.style === "outline" ? 3 : 8, textShadowOffset: { width: 0, height: layer.style === "outline" ? 0 : 1 } };
    body = <Text style={[{ fontFamily: fontOf(layer.font), fontSize: size, textAlign: "center", maxWidth: S * 0.9 }, ts]}>{layer.text}</Text>;
  }

  const spin = rot.interpolate({ inputRange: [-100, 100], outputRange: ["-100rad", "100rad"] });
  return (
    <Animated.View pointerEvents={disabled ? "none" : "box-none"}
      style={{ position: "absolute", left: 0, top: 0, width: S, height: S, alignItems: "center", justifyContent: "center",
        transform: [{ translateX: pos.x }, { translateY: pos.y }, { rotate: spin }, { scale }] }}>
      <View {...pan.panHandlers} style={[{ padding: 6, borderRadius: 8, borderWidth: 1.5, borderStyle: "dashed", borderColor: selected ? C.fg : "transparent" }]}>
        {body}
        {selected && (
          <Pressable onPress={onRemove} hitSlop={10} style={{ position: "absolute", top: -12, right: -12, width: 26, height: 26, borderRadius: 13, backgroundColor: C.fg, alignItems: "center", justifyContent: "center" }}
            accessibilityRole="button" accessibilityLabel={t("delete")}>
            <Text style={{ color: C.bg, fontFamily: F.bold, fontSize: 16, lineHeight: 18 }}>×</Text>
          </Pressable>
        )}
      </View>
    </Animated.View>
  );
});

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
  canvas: { alignSelf: "center", marginTop: 4 },
  tools: { flexDirection: "row", alignItems: "center", paddingHorizontal: 16, marginTop: 14, borderBottomWidth: 1, borderColor: C.line },
  tool: { flex: 1, minHeight: 44, alignItems: "center", justifyContent: "center", borderBottomWidth: 2, borderColor: "transparent", marginBottom: -1 },
  toolOn: { borderColor: C.fg },
  toolTxt: { color: C.muted, fontFamily: F.medium, fontSize: 14 },
  undo: { width: 44, height: 44, alignItems: "center", justifyContent: "center" },
  panel: { paddingHorizontal: 20, paddingTop: 14, paddingBottom: 24, gap: 12 },
  zoomRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  hint: { flex: 1, color: C.muted, fontFamily: F.body, fontSize: 13, lineHeight: 18 },
  soon: { color: C.muted, fontFamily: F.body, fontSize: 13, lineHeight: 18, backgroundColor: C.raised, borderRadius: 12, padding: 12 },
  zoomBtn: { width: 44, height: 40, borderRadius: 12, backgroundColor: C.raised, alignItems: "center", justifyContent: "center" },
  zoomTxt: { color: C.fg, fontFamily: F.bold, fontSize: 20 },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  chip: { borderRadius: 999, minHeight: 38, paddingHorizontal: 15, justifyContent: "center", backgroundColor: C.raised },
  chipOn: { backgroundColor: C.fg },
  chipTxt: { color: C.fg, fontFamily: F.medium, fontSize: 14 },
  swatches: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  swatch: { width: 32, height: 32, borderRadius: 16, borderWidth: 1, borderColor: C.line },
  swatchOn: { borderWidth: 3, borderColor: C.fg },
  input: { backgroundColor: C.raised, borderRadius: 14, paddingHorizontal: 14, paddingVertical: 13, color: C.fg, fontFamily: F.medium, fontSize: 16 },
  addBtn: { alignSelf: "flex-start", borderRadius: 999, minHeight: 40, paddingHorizontal: 16, justifyContent: "center", borderWidth: 1.5, borderStyle: "dashed", borderColor: C.muted },
  addTxt: { color: C.fg, fontFamily: F.semi, fontSize: 14 },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  cell: { width: 52, height: 52, borderRadius: 12, backgroundColor: C.raised, alignItems: "center", justifyContent: "center" },
});
