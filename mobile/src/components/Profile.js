import { useEffect, useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, Text, useWindowDimensions, View } from "react-native";
import { fmt, timeLeft } from "../lib/util.js";
import { F, useStyles, useTheme } from "../theme.js";
import { t, tn } from "../i18n/index.js";
import { Avatar, BackIcon, MenuIcon, MoreIcon, PasteIcon, PlusIcon, Secondary, StarIcon, StickerCard, StickerImage } from "./ui.js";
import { orderReplies } from "../store.js";

export default function Profile({ me: myName, user, users, problems, myStickers, showBack, onBack, onGo, onEdit, onAddStickers, onPaste, onRemoveSticker, onSettings, onMore, topInset, loadPosts, postsVersion }) {
  const [tab, setTab] = useState("problemi");
  const { width } = useWindowDimensions();
  const { C } = useTheme();
  const st = useStyles(makeStyles);
  const me = user === myName;
  const info = users[user] || { name: user, bio: t("profile.defaultBio") };

  // Everything this person posted, also what's too old for the feed; the feed's copy is shown while it loads
  const [posts, setPosts] = useState(null);
  useEffect(() => {
    let live = true;
    loadPosts?.().then((ps) => { if (live) setPosts(ps); }).catch(() => {});
    return () => { live = false; };
  }, [loadPosts, postsVersion]);
  const all = posts ?? problems;

  const probs = all.filter((p) => p.author === user);
  const replies = all.flatMap((p) => p.memes.filter((m) => m.author === user).map((m) => ({ p, m })));
  const stars = probs.reduce((a, p) => a + p.stars, 0) + replies.reduce((a, r) => a + r.m.stars, 0);
  const tabs = [["problemi", t("profile.problems")], ["risposte", t("profile.replies")], ...(me ? [["sticker", t("profile.stickers")]] : [])];

  const inner = Math.min(width, 560) - 40;
  const half = (inner - 14) / 2;
  const tile = (inner - 20) / 3;

  return (
    <ScrollView style={{ backgroundColor: C.bg }} contentContainerStyle={[st.wrap, { paddingTop: topInset + 6 }]}>
      <View style={st.top}>
        {showBack && (
          <Pressable onPress={onBack} style={st.iconBtn} accessibilityRole="button" accessibilityLabel={t("profile.back").replace("‹", "").trim()}>
            <BackIcon color={C.fg} />
          </Pressable>
        )}
        <Text style={st.handleTop} numberOfLines={1}>{user}</Text>
        {me ? (
          <Pressable onPress={onSettings} style={st.iconBtn} accessibilityRole="button" accessibilityLabel={t("profile.settings")}>
            <MenuIcon color={C.fg} />
          </Pressable>
        ) : (
          <Pressable onPress={() => onMore({ kind: "user", author: user })} style={st.iconBtn} accessibilityRole="button" accessibilityLabel={t("profile.reportBlock")}>
            <MoreIcon color={C.fg} />
          </Pressable>
        )}
      </View>

      <View style={st.head}>
        <Avatar users={users} user={user} size={84} />
        <View style={st.stats}>
          {[[probs.length, t("profile.problems")], [replies.length, t("profile.replies")], [fmt(stars), t("profile.stars")]].map(([v, l]) => (
            <View key={l} style={st.stat}>
              <Text style={st.statNum}>{v}</Text>
              <Text style={st.statLbl} numberOfLines={1}>{l}</Text>
            </View>
          ))}
        </View>
      </View>
      <View style={{ gap: 3 }}>
        <Text style={st.name}>{info.name}</Text>
        {!!info.bio && <Text style={st.bio}>{info.bio}</Text>}
      </View>
      {me && <Secondary label={t("profile.edit")} onPress={onEdit} />}

      <View style={st.tabs}>
        {tabs.map(([k, l]) => (
          <Pressable key={k} style={st.tab} onPress={() => setTab(k)} accessibilityRole="tab" accessibilityState={{ selected: tab === k }}>
            <Text style={[st.tabTxt, tab === k && st.tabOn]}>{l}</Text>
            <View style={[st.under, tab === k && { backgroundColor: C.fg }]} />
          </Pressable>
        ))}
      </View>

      {tab === "problemi" && (probs.length ? (
        <View>
          {probs.map((p, i) => {
            const left = timeLeft(p.closesAt);
            return (
              <Pressable key={p.id} style={({ pressed }) => [st.row, i < probs.length - 1 && st.rowLine, pressed && { opacity: 0.7 }]} onPress={() => onGo(p.id, null, p)}>
                <View style={{ flex: 1, gap: 6 }}>
                  <Text style={st.rowText}>{p.text}</Text>
                  <Text style={st.rowMeta}>
                    {tn("profile.starsCount", p.stars, { n: fmt(p.stars) })} · {p.time}{left ? ` · ${left.closed ? t("profile.closed") : t("profile.open")}` : ""}
                  </Text>
                </View>
                <View style={st.thumbs}>
                  {orderReplies(p).slice(0, 2).map((m, k) => (
                    <View key={m.id} style={{ marginLeft: k ? -14 : 0 }}><StickerCard meme={m} size={44} compact /></View>
                  ))}
                </View>
                {me && (
                  <Pressable onPress={() => onMore({ kind: "problem", id: p.id, author: p.author })} style={st.rowMore}
                    accessibilityRole="button" accessibilityLabel={t("more.deleteProblem")}>
                    <MoreIcon color={C.muted} size={18} />
                  </Pressable>
                )}
              </Pressable>
            );
          })}
        </View>
      ) : posts === null ? <ActivityIndicator color={C.muted} style={{ paddingVertical: 28 }} />
        : <Text style={st.empty}>{me ? t("profile.emptyMine") : t("profile.empty")}</Text>)}

      {tab === "risposte" && (replies.length ? (
        <View style={st.rgrid}>
          {replies.map(({ p, m }) => (
            <Pressable key={m.id} style={{ width: half, gap: 8 }} onPress={() => onGo(p.id, m.id, p)}>
              <StickerCard meme={m} size={half} />
              <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                <StarIcon filled={m.starred} size={15} color={C.fg} fill={C.accent} />
                <Text style={st.small}>{fmt(m.stars)}</Text>
                {me && (
                  <Pressable onPress={() => onMore({ kind: "reply", id: m.id, pid: p.id, author: m.author })} style={[st.rowMore, { marginLeft: "auto" }]}
                    accessibilityRole="button" accessibilityLabel={t("more.deleteReply")}>
                    <MoreIcon color={C.muted} size={18} />
                  </Pressable>
                )}
              </View>
              <Text style={st.small} numberOfLines={2}>{t("profile.on", { text: p.text })}</Text>
            </Pressable>
          ))}
        </View>
      ) : <Text style={st.empty}>{t("profile.noReplies")}</Text>)}

      {tab === "sticker" && (
        <>
          <View style={st.sgrid}>
            <Pressable style={[st.add, { width: tile, height: tile }]} onPress={onAddStickers} accessibilityRole="button" accessibilityLabel={t("profile.addGallery")}>
              <PlusIcon color={C.fg} size={24} />
              <Text style={st.addTxt}>{t("profile.gallery")}</Text>
            </Pressable>
            <Pressable style={[st.add, { width: tile, height: tile }]} onPress={onPaste} accessibilityRole="button" accessibilityLabel={t("profile.pasteLabel")}>
              <PasteIcon color={C.fg} />
              <Text style={st.addTxt}>{t("profile.paste")}</Text>
            </Pressable>
            {myStickers.map((sk) => (
              <View key={sk.v} style={[st.tile, { width: tile, height: tile }]}>
                <StickerImage sticker={sk} thumb style={{ width: "80%", height: "80%" }} />
                <Pressable style={st.rm} hitSlop={8} onPress={() => onRemoveSticker(sk)} accessibilityRole="button" accessibilityLabel={t("feed.unsave")}>
                  <Text style={st.rmTxt}>×</Text>
                </Pressable>
              </View>
            ))}
          </View>
          <Text style={st.note}>{t("profile.note")}</Text>
        </>
      )}
    </ScrollView>
  );
}

const makeStyles = (C) => ({
  wrap: { paddingHorizontal: 20, paddingBottom: 32, gap: 16, maxWidth: 600, width: "100%", alignSelf: "center" },
  top: { flexDirection: "row", alignItems: "center", gap: 4, minHeight: 44, marginRight: -10 },
  handleTop: { flex: 1, color: C.fg, fontFamily: F.bold, fontSize: 21, letterSpacing: -0.5 },
  iconBtn: { width: 44, height: 44, alignItems: "center", justifyContent: "center", marginLeft: -6 },
  head: { flexDirection: "row", alignItems: "center", gap: 18 },
  stats: { flex: 1, flexDirection: "row" },
  stat: { flex: 1, alignItems: "center", gap: 2 },
  statNum: { color: C.fg, fontFamily: F.bold, fontSize: 19 },
  statLbl: { color: C.muted, fontFamily: F.body, fontSize: 13 },
  name: { color: C.fg, fontFamily: F.semi, fontSize: 16 },
  bio: { color: C.fg, fontFamily: F.body, fontSize: 15, lineHeight: 21, opacity: 0.86 },
  tabs: { flexDirection: "row", borderBottomWidth: 1, borderColor: C.line, marginHorizontal: -20, paddingHorizontal: 20, marginTop: 2 },
  tab: { flex: 1, alignItems: "center", paddingTop: 10, minHeight: 44, justifyContent: "space-between" },
  tabTxt: { color: C.muted, fontFamily: F.medium, fontSize: 14 },
  tabOn: { color: C.fg, fontFamily: F.bold },
  under: { height: 2, alignSelf: "stretch", marginTop: 10, marginBottom: -1, backgroundColor: "transparent" },
  row: { flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 14 },
  rowLine: { borderBottomWidth: 1, borderColor: C.line },
  rowText: { color: C.fg, fontFamily: F.semi, fontSize: 16, lineHeight: 21 },
  rowMeta: { color: C.muted, fontFamily: F.body, fontSize: 13 },
  rowMore: { width: 36, height: 44, alignItems: "center", justifyContent: "center", marginRight: -8 },
  thumbs: { flexDirection: "row" },
  small: { color: C.muted, fontFamily: F.body, fontSize: 13 },
  rgrid: { flexDirection: "row", flexWrap: "wrap", gap: 14 },
  sgrid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  tile: { borderRadius: 18, backgroundColor: C.raised, alignItems: "center", justifyContent: "center" },
  add: { borderRadius: 18, borderWidth: 1.5, borderStyle: "dashed", borderColor: C.muted, alignItems: "center", justifyContent: "center", gap: 6 },
  addTxt: { color: C.fg, fontFamily: F.medium, fontSize: 13 },
  rm: { position: "absolute", top: 6, right: 6, width: 24, height: 24, borderRadius: 12, backgroundColor: C.fg, alignItems: "center", justifyContent: "center" },
  rmTxt: { color: C.bg, fontSize: 16, lineHeight: 18, fontFamily: F.bold },
  note: { color: C.muted, fontFamily: F.body, fontSize: 13, lineHeight: 19 },
  empty: { color: C.muted, fontFamily: F.body, fontSize: 15, lineHeight: 22, textAlign: "center", paddingVertical: 32 },
});
