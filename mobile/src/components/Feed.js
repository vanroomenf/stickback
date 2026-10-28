import { forwardRef, useEffect, useImperativeHandle, useMemo, useRef, useState } from "react";
import { FlatList, Pressable, RefreshControl, StyleSheet, Text, View } from "react-native";
import { orderReplies } from "../store.js";
import { C, F } from "../theme.js";
import { Avatar, SaveIcon, StarButton, StickerCard } from "./ui.js";
import { CategoryBadge } from "./Social.js";
import { categoryLabel } from "../lib/api.js";

const GAP = 12;
const SIDE = 20;

function ProblemScreen({ me, p, first, height, width, users, dispatch, onReply, onUser, onMore, focusMid, savedSet, onToggleSave }) {
  const mine = p.author === me;
  const listRef = useRef(null);
  const [index, setIndex] = useState(0);
  const [carH, setCarH] = useState(0);
  const lastTap = useRef({ id: null, t: 0 });

  // Stable order while you star things; it only changes when new replies arrive
  const orderKey = `${p.memes.length}`;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const ordered = useMemo(() => orderReplies(p).map((m) => m.id), [orderKey]);
  const byId = Object.fromEntries(p.memes.map((m) => [m.id, m]));
  const memes = ordered.map((id) => byId[id]).filter(Boolean);

  const cardW = Math.max(120, Math.min(width * 0.78, carH - 50));
  const step = cardW + GAP;

  // Where each reply stops when you swipe: the first sits on the left, the last on the right,
  // every reply in between is centred on the screen
  const n = memes.length;
  const maxX = Math.max(0, SIDE * 2 + n * cardW + (n - 1) * GAP - width);
  const offsets = memes.map((_, i) => {
    if (i === 0) return 0;
    if (i === n - 1) return maxX;
    return Math.min(maxX, Math.max(0, SIDE + i * step - (width - cardW) / 2));
  });
  const nearest = (x) => offsets.reduce((best, o, i) => (Math.abs(o - x) < Math.abs(offsets[best] - x) ? i : best), 0);

  const goTo = (i) => {
    const k = Math.max(0, Math.min(i, n - 1));
    listRef.current?.scrollToOffset({ offset: offsets[k] ?? 0, animated: true });
    setIndex(k);
  };

  // Jump to a reply after publishing or when coming from the profile
  useEffect(() => {
    if (!focusMid || !carH) return;
    const i = memes.findIndex((m) => m.id === focusMid.mid);
    if (i >= 0) setTimeout(() => goTo(i), 60);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [focusMid, carH]);

  const doubleTap = (m) => {
    const now = Date.now();
    if (lastTap.current.id === m.id && now - lastTap.current.t < 300 && !m.starred) {
      dispatch({ type: "starReply", pid: p.id, mid: m.id });
    }
    lastTap.current = { id: m.id, t: now };
  };

  const renderCard = ({ item: m }) => {
    const saved = savedSet.has(m.sticker.v);
    return (
      <View style={{ width: cardW, gap: 9 }}>
        <Pressable onPress={() => doubleTap(m)} accessibilityHint="Tocca due volte per mettere la stella">
          <StickerCard meme={m} size={cardW} />
        </Pressable>
        <View style={st.meta}>
          <Pressable style={{ flex: 1, minWidth: 0 }} onPress={() => onUser(m.author)}>
            <Text style={st.who} numberOfLines={1}>@{m.author}</Text>
          </Pressable>
          {m.author !== me && (
            <Pressable onPress={() => onToggleSave(m.sticker)} hitSlop={6}
              accessibilityLabel={saved ? "Togli dai tuoi sticker" : "Salva nei tuoi sticker"}
              style={[st.save, saved && { backgroundColor: C.fg, borderColor: C.fg }]}>
              <SaveIcon saved={saved} color={saved ? C.bg : C.muted} />
            </Pressable>
          )}
          <Pressable style={st.moreSmall} hitSlop={8} onPress={() => onMore({ kind: "reply", id: m.id, pid: p.id, author: m.author })}
            accessibilityLabel="Altre azioni sulla risposta">
            <Text style={st.moreTxt}>⋯</Text>
          </Pressable>
          <StarButton on={m.starred} count={m.stars} label="Mi piace questa risposta"
            onToggle={() => dispatch({ type: "starReply", pid: p.id, mid: m.id })} />
        </View>
      </View>
    );
  };

  return (
    <View style={[st.screen, { height }]}>
      <View style={st.problem}>
        <View style={st.pmeta}>
          <Pressable style={st.ulink} onPress={() => onUser(p.author)}>
            <Avatar users={users} user={p.author} />
            <Text style={st.handle}>@{p.author}</Text>
          </Pressable>
          <Text style={st.muted}>· {p.time}</Text>
          {p.category && p.category !== "altro" && <CategoryBadge label={categoryLabel(p.category)} />}
          {mine && <View style={st.yours}><Text style={st.yoursTxt}>Il tuo problema</Text></View>}
          <Pressable style={st.more} hitSlop={10} onPress={() => onMore({ kind: "problem", id: p.id, author: p.author })}
            accessibilityLabel="Altre azioni sul problema">
            <Text style={st.moreTxt}>⋯</Text>
          </Pressable>
        </View>
        <View style={st.prow}>
          <Text style={st.ptext}>{p.text}</Text>
          <StarButton big on={p.starred} count={p.stars} label="Mi piace questo problema"
            onToggle={() => dispatch({ type: "starProblem", pid: p.id })} />
        </View>
      </View>

      <View style={{ flex: 1, justifyContent: "center" }} onLayout={(e) => setCarH(e.nativeEvent.layout.height)}>
        {carH > 0 && (memes.length ? (
          <FlatList
            ref={listRef}
            horizontal
            data={memes}
            keyExtractor={(m) => String(m.id)}
            renderItem={renderCard}
            showsHorizontalScrollIndicator={false}
            snapToOffsets={offsets}
            snapToStart
            snapToEnd
            decelerationRate="fast"
            disableIntervalMomentum
            contentContainerStyle={{ paddingHorizontal: SIDE, gap: GAP, alignItems: "center" }}
            onScroll={(e) => setIndex(nearest(e.nativeEvent.contentOffset.x))}
            scrollEventThrottle={32}
            nestedScrollEnabled
          />
        ) : (
          <View style={[st.empty, { width: cardW, height: cardW, marginLeft: SIDE }]}>
            <Text style={st.emptyTitle}>Ancora nessuna risposta</Text>
            <Text style={st.emptyTxt}>Gli sticker arriveranno qui. Ti avvisiamo appena qualcuno risponde.</Text>
          </View>
        ))}
      </View>

      <View style={st.actions}>
        <Text style={st.count}><Text style={{ color: C.fg, fontFamily: F.bold }}>{memes.length ? index + 1 : 0}</Text> / {memes.length} risposte</Text>
        <Pressable style={({ pressed }) => [st.reply, pressed && { opacity: 0.85 }]} onPress={() => onReply(p.id)}>
          <Text style={st.replyTxt}>Rispondi</Text>
        </Pressable>
      </View>
      {first && <Text style={st.hint}>↓ Scorri giù per il prossimo problema · di lato per le risposte</Text>}
    </View>
  );
}

const Feed = forwardRef(function Feed({ problems, topInset, refreshing, onRefresh, ...rest }, ref) {
  const listRef = useRef(null);
  const [box, setBox] = useState({ w: 0, h: 0 });

  useImperativeHandle(ref, () => ({
    scrollToProblem(pid) {
      const i = problems.findIndex((p) => p.id === pid);
      if (i >= 0) listRef.current?.scrollToIndex({ index: i, animated: false });
    },
  }), [problems]);

  return (
    <View style={{ flex: 1 }} onLayout={(e) => setBox({ w: e.nativeEvent.layout.width, h: e.nativeEvent.layout.height })}>
      {box.h > 0 && (
        <FlatList
          ref={listRef}
          data={problems}
          keyExtractor={(p) => String(p.id)}
          pagingEnabled
          showsVerticalScrollIndicator={false}
          getItemLayout={(_, i) => ({ length: box.h, offset: box.h * i, index: i })}
          renderItem={({ item, index }) => (
            <View style={{ paddingTop: topInset }}>
              <ProblemScreen p={item} first={index === 0} height={box.h - topInset} width={box.w} {...rest}
                focusMid={rest.focus && rest.focus.pid === item.id && rest.focus.mid ? rest.focus : null} />
            </View>
          )}
          windowSize={3}
          refreshControl={<RefreshControl refreshing={!!refreshing} onRefresh={onRefresh} tintColor={C.accent} progressViewOffset={topInset} />}
        />
      )}
    </View>
  );
});

export default Feed;

const st = StyleSheet.create({
  screen: { paddingTop: 8, paddingBottom: 12, gap: 14 },
  problem: { paddingHorizontal: SIDE, gap: 10 },
  pmeta: { flexDirection: "row", alignItems: "center", gap: 7, flexWrap: "wrap" },
  ulink: { flexDirection: "row", alignItems: "center", gap: 7 },
  handle: { color: C.fg, fontFamily: F.semi, fontSize: 13 },
  muted: { color: C.muted, fontFamily: F.body, fontSize: 13 },
  more: { marginLeft: "auto", paddingHorizontal: 6 },
  moreSmall: { paddingHorizontal: 2 },
  moreTxt: { color: C.muted, fontSize: 20, lineHeight: 22, fontFamily: F.bold },
  yours: { backgroundColor: C.accent, borderRadius: 99, paddingHorizontal: 8, paddingVertical: 2 },
  yoursTxt: { color: C.accentInk, fontFamily: F.bold, fontSize: 11 },
  prow: { flexDirection: "row", alignItems: "flex-start", gap: 12 },
  ptext: { flex: 1, color: C.fg, fontFamily: F.display, fontSize: 23, lineHeight: 27, letterSpacing: -0.3 },
  meta: { flexDirection: "row", alignItems: "center", gap: 8, minHeight: 32 },
  who: { color: C.muted, fontFamily: F.body, fontSize: 13 },
  save: { width: 34, height: 31, borderRadius: 99, backgroundColor: C.surface, borderWidth: 1, borderColor: C.line, alignItems: "center", justifyContent: "center" },
  empty: { borderWidth: 2, borderStyle: "dashed", borderColor: C.line, borderRadius: 16, alignItems: "center", justifyContent: "center", padding: 24, gap: 6 },
  emptyTitle: { color: C.fg, fontFamily: F.display, fontSize: 18, textAlign: "center" },
  emptyTxt: { color: C.muted, fontFamily: F.body, fontSize: 14, lineHeight: 20, textAlign: "center" },
  actions: { paddingHorizontal: SIDE, flexDirection: "row", alignItems: "center", gap: 12 },
  count: { color: C.muted, fontFamily: F.body, fontSize: 13 },
  reply: { marginLeft: "auto", backgroundColor: C.accent, borderRadius: 14, paddingVertical: 12, paddingHorizontal: 18 },
  replyTxt: { color: C.accentInk, fontFamily: F.bold, fontSize: 15 },
  hint: { color: C.muted, fontFamily: F.body, fontSize: 12, textAlign: "center", marginTop: -4, paddingHorizontal: SIDE },
});
