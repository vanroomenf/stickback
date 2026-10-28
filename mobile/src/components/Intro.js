// Three quick screens the first time you open Stickback: post, reply with stickers, give stars
import { useRef, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, useWindowDimensions, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { exampleStickers } from "../data.js";
import { t } from "../i18n/index.js";
import { C, F } from "../theme.js";
import { Primary, StarButton, StickerCard } from "./ui.js";

export default function Intro({ onDone }) {
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();
  const pager = useRef(null);
  const [page, setPage] = useState(0);
  const [stars, setStars] = useState({ p: false, r: true });
  const visual = Math.min(width - 64, height * 0.34, 300);
  const sticker = exampleStickers()[1];

  const slides = [
    {
      title: t("intro.1.title"), body: t("intro.1.body"),
      art: (
        <View style={[st.problem, { width: visual }]}>
          <Text style={st.handle}>@giulia · 2 h</Text>
          <Text style={st.ptext}>{t("intro.1.example")}</Text>
        </View>
      ),
    },
    {
      title: t("intro.2.title"), body: t("intro.2.body"),
      art: <StickerCard meme={{ id: 3, caption: t("intro.2.caption"), sticker }} size={visual * 0.82} />,
    },
    {
      title: t("intro.3.title"), body: t("intro.3.body"),
      art: (
        <View style={{ flexDirection: "row", gap: 16, alignItems: "center" }}>
          <StarButton big on={stars.p} count={stars.p ? 129 : 128} label={t("feed.likeProblem")} onToggle={() => setStars((s) => ({ ...s, p: !s.p }))} />
          <StarButton on={stars.r} count={stars.r ? 42 : 41} label={t("feed.likeReply")} onToggle={() => setStars((s) => ({ ...s, r: !s.r }))} />
        </View>
      ),
    },
  ];
  const last = page === slides.length - 1;
  const go = (i) => { pager.current?.scrollTo({ x: i * width, animated: true }); setPage(i); };

  return (
    <View style={[st.wrap, { paddingTop: insets.top + 12, paddingBottom: insets.bottom + 20 }]}>
      <View style={st.top}>
        <Text style={st.logo}>Stick<Text style={{ color: C.accent }}>back</Text></Text>
        {!last && <Pressable onPress={onDone} hitSlop={10}><Text style={st.skip}>{t("intro.skip")}</Text></Pressable>}
      </View>

      <ScrollView ref={pager} horizontal pagingEnabled showsHorizontalScrollIndicator={false} style={{ flex: 1 }}
        onMomentumScrollEnd={(e) => setPage(Math.round(e.nativeEvent.contentOffset.x / width))} scrollEventThrottle={16}>
        {slides.map((s, i) => (
          <View key={i} style={[st.slide, { width }]}>
            <View style={[st.art, { height: visual + 20 }]}>{s.art}</View>
            <Text style={st.step}>{i + 1} / {slides.length}</Text>
            <Text style={st.title}>{s.title}</Text>
            <Text style={st.body}>{s.body}</Text>
          </View>
        ))}
      </ScrollView>

      <View style={st.bottom}>
        <View style={st.dots}>
          {slides.map((_, i) => <View key={i} style={[st.dot, page === i && st.dotOn]} />)}
        </View>
        <Primary label={last ? t("intro.start") : t("intro.next")} onPress={() => (last ? onDone() : go(page + 1))} />
      </View>
    </View>
  );
}

const st = StyleSheet.create({
  wrap: { flex: 1, backgroundColor: C.bg },
  top: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 24, minHeight: 36 },
  logo: { color: C.fg, fontFamily: F.display, fontSize: 22, letterSpacing: -0.5 },
  skip: { color: C.muted, fontFamily: F.semi, fontSize: 15 },
  slide: { paddingHorizontal: 32, justifyContent: "center", gap: 12 },
  art: { alignItems: "center", justifyContent: "center", marginBottom: 16 },
  step: { color: C.accent, fontFamily: F.bold, fontSize: 13, letterSpacing: 0.8 },
  title: { color: C.fg, fontFamily: F.display, fontSize: 30, lineHeight: 34, letterSpacing: -0.6 },
  body: { color: C.muted, fontFamily: F.body, fontSize: 16, lineHeight: 23 },
  problem: { backgroundColor: C.surface, borderWidth: 1, borderColor: C.line, borderRadius: 18, padding: 18, gap: 10, transform: [{ rotate: "-2deg" }] },
  handle: { color: C.muted, fontFamily: F.semi, fontSize: 13 },
  ptext: { color: C.fg, fontFamily: F.display, fontSize: 21, lineHeight: 25 },
  bottom: { paddingHorizontal: 24, gap: 18 },
  dots: { flexDirection: "row", gap: 7, justifyContent: "center" },
  dot: { width: 7, height: 7, borderRadius: 4, backgroundColor: C.line },
  dotOn: { width: 22, backgroundColor: C.accent },
});
