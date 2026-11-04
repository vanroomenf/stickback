import { forwardRef, useEffect, useImperativeHandle, useMemo, useRef, useState } from "react";
import { FlatList, Pressable, RefreshControl, StyleSheet, Text, View } from "react-native";
import { orderReplies } from "../store.js";
import { F, useTheme } from "../theme.js";
import { Avatar, MoreIcon, Primary, SaveIcon, StarButton, StickerCard } from "./ui.js";
import { categoryLabel } from "../lib/api.js";
import { t } from "../i18n/index.js";
import { timeLeft } from "../lib/util.js";

const GAP = 10;
const PAD = 12; // inside each reply card
const SIDE = 20;

function ProblemScreen({ me, p, first, height, width, users, dispatch, onReply, onUser, onMore, focusMid, savedSet, onToggleSave }) {
  const mine = p.author === me;
  const left = timeLeft(p.closesAt);
  const tone = useTheme().cat(p.category);
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

  // the card is its caption (up to 3 lines), the sticker and a row of actions
  // cardW is the sticker; the card adds its padding around it
  const cardW = Math.max(110, Math.min(width * 0.62, carH - 160));
  const step = cardW + PAD * 2 + GAP;

  // Where each reply stops when you swipe: the first sits on the left, the last on the right,
  // every reply in between is centred on the screen
  const n = memes.length;
  const full = cardW + PAD * 2;
  const maxX = Math.max(0, SIDE * 2 + n * full + (n - 1) * GAP - width);
  const offsets = memes.map((_, i) => {
    if (i === 0) return 0;
    if (i === n - 1) return maxX;
    return Math.min(maxX, Math.max(0, SIDE + i * step - (width - full) / 2));
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
      <View style={[st.card, { width: cardW + PAD * 2, backgroundColor: tone.card }]}>
        <Pressable onPress={() => doubleTap(m)} accessibilityHint={t("feed.doubleTap")}>
          <StickerCard meme={m} size={cardW} ink={tone.fg} muted={tone.muted} />
        </Pressable>
        <View style={st.meta}>
          <Pressable style={{ flex: 1, minWidth: 0, minHeight: 44, justifyContent: "center" }} onPress={() => onUser(m.author)}>
            <Text style={[st.who, { color: tone.muted }]} numberOfLines={1}>{m.author}</Text>
          </Pressable>
          {m.author !== me && (
            <Pressable onPress={() => onToggleSave(m.sticker)} hitSlop={4} style={st.iconBtn}
              accessibilityLabel={saved ? t("feed.unsave") : t("feed.save")} accessibilityState={{ selected: saved }}>
              <SaveIcon saved={saved} color={tone.fg} />
            </Pressable>
          )}
          <Pressable style={st.iconBtn} onPress={() => onMore({ kind: "reply", id: m.id, pid: p.id, author: m.author })}
            accessibilityLabel={t("feed.replyMore")}>
            <MoreIcon color={tone.muted} size={18} />
          </Pressable>
          <StarButton on={m.starred} count={m.stars} label={t("feed.likeReply")} color={tone.fg}
            onToggle={() => dispatch({ type: "starReply", pid: p.id, mid: m.id })} />
        </View>
      </View>
    );
  };

  // the full 140 characters must fit without pushing the replies off the screen
  const size = p.text.length <= 60 ? st.ptext : p.text.length <= 100 ? st.ptextLong : st.ptextLonger;
  return (
    <View style={[st.screen, { height, backgroundColor: tone.bg }]}>
      <View style={st.problem}>
        <View style={st.pmeta}>
          <Pressable style={st.ulink} onPress={() => onUser(p.author)} accessibilityRole="link">
            <Avatar users={users} user={p.author} size={32} tone={{ bg: tone.fg, fg: tone.bg }} />
            <Text style={[st.handle, { color: tone.fg }]} numberOfLines={1}>{p.author}</Text>
          </Pressable>
          <Text style={[st.muted, { color: tone.muted }]} numberOfLines={1}>{p.time} · {categoryLabel(p.category)}</Text>
          <Pressable style={st.more} onPress={() => onMore({ kind: "problem", id: p.id, author: p.author })}
            accessibilityLabel={t("feed.problemMore")}>
            <MoreIcon color={tone.muted} />
          </Pressable>
        </View>
        <Text style={[size, { color: tone.fg }]}>{p.text}</Text>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
          <StarButton on={p.starred} count={p.stars} label={t("feed.likeProblem")} color={tone.fg} size={22} textSize={15}
            onToggle={() => dispatch({ type: "starProblem", pid: p.id })} />
          {mine && <Text style={[st.yours, { color: tone.muted }]}>{t("feed.yours")}</Text>}
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
          <View style={[st.empty, { width: cardW, height: cardW * 0.9, marginLeft: SIDE, borderColor: tone.muted }]}>
            <Text style={[st.emptyTitle, { color: tone.fg }]}>{t("feed.noReplies")}</Text>
            <Text style={[st.emptyTxt, { color: tone.muted }]}>{t("feed.noRepliesBody")}</Text>
          </View>
        ))}
      </View>

      <View style={st.actions}>
        <Text style={[st.left, { color: tone.muted }]} numberOfLines={1}>{left?.text ?? ""}</Text>
        {!left?.closed && (
          <Primary label={t("feed.reply")} onPress={() => onReply(p.id)} tone={{ bg: tone.fg, fg: tone.bg }} style={st.reply} />
        )}
      </View>
      {first && <Text style={[st.hint, { color: tone.muted }]}>{t("feed.swipeHint")}</Text>}
    </View>
  );
}

const Feed = forwardRef(function Feed({ problems, topInset, refreshing, onRefresh, onEndReached, onPage, ...rest }, ref) {
  const listRef = useRef(null);
  const { cat, C } = useTheme();
  const [box, setBox] = useState({ w: 0, h: 0 });

  useImperativeHandle(ref, () => ({
    scrollToProblem(pid) {
      const i = problems.findIndex((p) => p.id === pid);
      if (i >= 0) listRef.current?.scrollToIndex({ index: i, animated: false });
    },
  }), [problems]);

  // tell the header which problem is on screen, so it takes its colour
  const pageRef = useRef(onPage);
  pageRef.current = onPage;
  const onViewable = useRef(({ viewableItems }) => {
    const top = viewableItems.find((v) => v.isViewable);
    if (top) pageRef.current?.(top.item);
  }).current;

  return (
    <View style={{ flex: 1, backgroundColor: problems[0] ? cat(problems[0].category).bg : C.bg }}
      onLayout={(e) => setBox({ w: e.nativeEvent.layout.width, h: e.nativeEvent.layout.height })}>
      {box.h > 0 && (
        <FlatList
          ref={listRef}
          data={problems}
          keyExtractor={(p) => String(p.id)}
          pagingEnabled
          showsVerticalScrollIndicator={false}
          getItemLayout={(_, i) => ({ length: box.h, offset: box.h * i, index: i })}
          renderItem={({ item, index }) => (
            <View style={{ paddingTop: topInset, backgroundColor: cat(item.category).bg }}>
              <ProblemScreen p={item} first={index === 0} height={box.h - topInset} width={box.w} {...rest}
                focusMid={rest.focus && rest.focus.pid === item.id && rest.focus.mid ? rest.focus : null} />
            </View>
          )}
          windowSize={3}
          onEndReached={onEndReached}
          onEndReachedThreshold={2}
          onViewableItemsChanged={onViewable}
          viewabilityConfig={{ itemVisiblePercentThreshold: 60 }}
          refreshControl={<RefreshControl refreshing={!!refreshing} onRefresh={onRefresh} tintColor={C.muted} progressViewOffset={topInset} />}
        />
      )}
    </View>
  );
});

export default Feed;

const st = StyleSheet.create({
  screen: { paddingTop: 18, paddingBottom: 14, gap: 12 },
  problem: { paddingHorizontal: SIDE, gap: 10 },
  pmeta: { flexDirection: "row", alignItems: "center", gap: 10 },
  ulink: { flexDirection: "row", alignItems: "center", gap: 10, flexShrink: 1, minHeight: 44 },
  handle: { fontFamily: F.semi, fontSize: 14, flexShrink: 1 },
  muted: { fontFamily: F.body, fontSize: 14, flexShrink: 1 },
  more: { marginLeft: "auto", width: 44, height: 44, alignItems: "center", justifyContent: "center", marginRight: -10 },
  ptext: { fontFamily: F.bold, fontSize: 28, lineHeight: 33, letterSpacing: -0.6 },
  ptextLong: { fontFamily: F.bold, fontSize: 24, lineHeight: 29, letterSpacing: -0.4 },
  ptextLonger: { fontFamily: F.bold, fontSize: 20, lineHeight: 25, letterSpacing: -0.3 },
  card: { borderRadius: 22, padding: PAD, paddingBottom: 2, gap: 4 },
  yours: { fontFamily: F.medium, fontSize: 13 },
  meta: { flexDirection: "row", alignItems: "center", gap: 0, minHeight: 44 },
  who: { fontFamily: F.body, fontSize: 14 },
  iconBtn: { width: 44, height: 44, alignItems: "center", justifyContent: "center" },
  empty: { borderWidth: 1.5, borderStyle: "dashed", borderRadius: 20, alignItems: "center", justifyContent: "center", padding: 24, gap: 6, opacity: 0.9 },
  emptyTitle: { fontFamily: F.bold, fontSize: 18, textAlign: "center" },
  emptyTxt: { fontFamily: F.body, fontSize: 14, lineHeight: 20, textAlign: "center" },
  actions: { paddingHorizontal: SIDE, flexDirection: "row", alignItems: "center", gap: 12 },
  left: { flex: 1, fontFamily: F.body, fontSize: 13 },
  reply: { minHeight: 46 },
  hint: { fontFamily: F.body, fontSize: 12, textAlign: "center", marginTop: -2, paddingHorizontal: SIDE },
});
