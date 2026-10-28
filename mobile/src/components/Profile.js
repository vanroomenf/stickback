import { useEffect, useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, useWindowDimensions, View } from "react-native";
import { orderReplies } from "../store.js";
import { fmt, hue, initialOf } from "../lib/util.js";
import { C, F } from "../theme.js";
import { t } from "../i18n/index.js";
import { StarIcon, StickerCard, StickerImage } from "./ui.js";

export default function Profile({ me: myName, user, users, problems, myStickers, showBack, onBack, onGo, onEdit, onAddStickers, onPaste, onRemoveSticker, onSettings, onMore, topInset, loadPosts, postsVersion }) {
  const [tab, setTab] = useState("problemi");
  const { width } = useWindowDimensions();
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

  const inner = Math.min(width, 520) - 40;
  const half = (inner - 12) / 2;
  const tile = (inner - 30) / 4;

  return (
    <ScrollView contentContainerStyle={[st.wrap, { paddingTop: topInset + 12 }]}>
      <View style={st.phead}>
        {showBack && <Pressable onPress={onBack} hitSlop={8}><Text style={st.back}>{t("profile.back")}</Text></Pressable>}
        {!me && <Text style={st.ttl}>@{user}</Text>}
        {!me && (
          <Pressable style={{ marginLeft: "auto", paddingHorizontal: 6 }} hitSlop={10} onPress={() => onMore({ kind: "user", author: user })}
            accessibilityLabel={t("profile.reportBlock")}>
            <Text style={{ color: C.muted, fontSize: 22, fontFamily: F.bold }}>⋯</Text>
          </Pressable>
        )}
      </View>
      <View style={st.pinfo}>
        <View style={[st.bigav, { backgroundColor: `hsl(${hue(user)}, 60%, 48%)` }]}>
          <Text style={st.bigavTxt}>{initialOf(users, user)}</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={st.pname}>{info.name}</Text>
          <Text style={st.phandle}>@{user}</Text>
        </View>
      </View>
      {!!info.bio && <Text style={st.bio}>{info.bio}</Text>}
      {me && (
        <View style={{ flexDirection: "row", gap: 10 }}>
          <Pressable style={st.editbtn} onPress={onEdit}><Text style={st.editTxt}>{t("profile.edit")}</Text></Pressable>
          <Pressable style={st.editbtn} onPress={onSettings}><Text style={[st.editTxt, { color: C.muted }]}>{t("profile.settings")}</Text></Pressable>
        </View>
      )}

      <View style={st.stats}>
        {[[t("profile.problems"), probs.length], [t("profile.replies"), replies.length], [t("profile.stars"), fmt(stars)]].map(([l, v], i) => (
          <View key={l} style={st.stat}>
            <Text style={[st.statNum, i === 2 && { color: C.accent }]}>{v}</Text>
            <Text style={st.statLbl}>{l.toUpperCase()}</Text>
          </View>
        ))}
      </View>

      <View style={st.ptabs}>
        {tabs.map(([k, l]) => (
          <Pressable key={k} style={[st.ptab, tab === k && st.ptabOn]} onPress={() => setTab(k)} accessibilityRole="tab" accessibilityState={{ selected: tab === k }}>
            <Text style={[st.ptabTxt, tab === k && { color: C.fg }]}>{l}</Text>
          </Pressable>
        ))}
      </View>

      {tab === "problemi" && (probs.length ? probs.map((p) => (
        <Pressable key={p.id} style={st.pitem} onPress={() => onGo(p.id, null, p)}>
          <View style={{ flexDirection: "row", gap: 8 }}>
            <Text style={[st.pitemT, { flex: 1 }]}>{p.text}</Text>
            {me && <MoreBtn label={t("more.deleteProblem")} onPress={() => onMore({ kind: "problem", id: p.id, author: p.author })} />}
          </View>
          <View style={st.pitemM}>
            <StarIcon filled size={14} color={C.accent} />
            <Text style={st.small}>{fmt(p.stars)}</Text>
            <Text style={st.small}>{p.time}</Text>
            <View style={st.thumbs}>
              {orderReplies(p).slice(0, 3).map((m) => (
                <View key={m.id} style={{ marginLeft: -8 }}><StickerCard meme={m} size={34} compact /></View>
              ))}
            </View>
          </View>
        </Pressable>
      )) : posts === null && !probs.length ? <ActivityIndicator color={C.accent} style={{ paddingVertical: 28 }} /> : <Text style={st.pempty}>{me ? t("profile.emptyMine") : t("profile.empty")}</Text>)}

      {tab === "risposte" && (replies.length ? (
        <View style={st.rgrid}>
          {replies.map(({ p, m }) => (
            <Pressable key={m.id} style={{ width: half, gap: 6 }} onPress={() => onGo(p.id, m.id, p)}>
              <StickerCard meme={m} size={half} />
              <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                <StarIcon filled size={13} color={C.accent} />
                <Text style={st.gold}>{fmt(m.stars)}</Text>
                {me && <View style={{ marginLeft: "auto" }}><MoreBtn label={t("more.deleteReply")} onPress={() => onMore({ kind: "reply", id: m.id, pid: p.id, author: m.author })} /></View>}
              </View>
              <Text style={st.small} numberOfLines={2}>{t("profile.on", { text: p.text })}</Text>
            </Pressable>
          ))}
        </View>
      ) : <Text style={st.pempty}>{t("profile.noReplies")}</Text>)}

      {tab === "sticker" && (
        <>
          <View style={st.sgrid}>
            <Pressable style={[st.addtile, { width: tile, height: tile }]} onPress={onAddStickers} accessibilityLabel={t("profile.addGallery")}>
              <Text style={st.addPlus}>+</Text><Text style={st.addTxt}>{t("profile.gallery")}</Text>
            </Pressable>
            <Pressable style={[st.addtile, { width: tile, height: tile }]} onPress={onPaste} accessibilityLabel={t("profile.pasteLabel")}>
              <Text style={st.addPlus}>⧉</Text><Text style={st.addTxt}>{t("profile.paste")}</Text>
            </Pressable>
            {myStickers.map((sk) => (
              <View key={sk.v} style={[st.stile, { width: tile, height: tile }]}>
                <StickerImage sticker={sk} thumb style={{ width: "78%", height: "78%" }} />
                <Pressable style={st.rm} hitSlop={6} onPress={() => onRemoveSticker(sk)} accessibilityLabel={t("feed.unsave")}>
                  <Text style={st.rmTxt}>×</Text>
                </Pressable>
              </View>
            ))}
          </View>
          <Text style={st.note}>
            {t("profile.note")}
          </Text>
        </>
      )}
    </ScrollView>
  );
}

function MoreBtn({ label, onPress }) {
  return (
    <Pressable onPress={onPress} hitSlop={10} accessibilityLabel={label} style={{ paddingHorizontal: 4 }}>
      <Text style={{ color: C.muted, fontSize: 20, lineHeight: 20, fontFamily: F.bold }}>⋯</Text>
    </Pressable>
  );
}

const st = StyleSheet.create({
  wrap: { paddingHorizontal: 20, paddingBottom: 28, gap: 18, maxWidth: 560, width: "100%", alignSelf: "center" },
  phead: { flexDirection: "row", alignItems: "center", gap: 10, minHeight: 28 },
  back: { color: C.muted, fontFamily: F.medium, fontSize: 14 },
  ttl: { color: C.fg, fontFamily: F.bold, fontSize: 15 },
  pinfo: { flexDirection: "row", alignItems: "center", gap: 16 },
  bigav: { width: 76, height: 76, borderRadius: 38, alignItems: "center", justifyContent: "center", borderWidth: 3, borderColor: C.accent },
  bigavTxt: { color: "#fff", fontFamily: F.display, fontSize: 32 },
  pname: { color: C.fg, fontFamily: F.display, fontSize: 23 },
  phandle: { color: C.muted, fontFamily: F.body, fontSize: 14, marginTop: 3 },
  bio: { color: C.fg, fontFamily: F.body, fontSize: 15, lineHeight: 21 },
  editbtn: { alignSelf: "flex-start", borderWidth: 1, borderColor: C.line, borderRadius: 99, paddingVertical: 7, paddingHorizontal: 14 },
  editTxt: { color: C.fg, fontFamily: F.semi, fontSize: 13 },
  stats: { flexDirection: "row", backgroundColor: C.surface, borderWidth: 1, borderColor: C.line, borderRadius: 16, paddingVertical: 12 },
  stat: { flex: 1, alignItems: "center", gap: 2 },
  statNum: { color: C.fg, fontFamily: F.display, fontSize: 20 },
  statLbl: { color: C.muted, fontFamily: F.semi, fontSize: 10, letterSpacing: 0.7 },
  ptabs: { flexDirection: "row", borderBottomWidth: 1, borderColor: C.line },
  ptab: { flex: 1, paddingVertical: 10, alignItems: "center", borderBottomWidth: 2, borderColor: "transparent", marginBottom: -1 },
  ptabOn: { borderColor: C.accent },
  ptabTxt: { color: C.muted, fontFamily: F.semi, fontSize: 14 },
  pitem: { backgroundColor: C.surface, borderWidth: 1, borderColor: C.line, borderRadius: 14, padding: 14, gap: 10 },
  pitemT: { color: C.fg, fontFamily: F.display, fontSize: 16, lineHeight: 20 },
  pitemM: { flexDirection: "row", alignItems: "center", gap: 8 },
  thumbs: { marginLeft: "auto", flexDirection: "row", paddingLeft: 8 },
  small: { color: C.muted, fontFamily: F.body, fontSize: 12.5 },
  gold: { color: C.accent, fontFamily: F.bold, fontSize: 12 },
  rgrid: { flexDirection: "row", flexWrap: "wrap", gap: 12 },
  sgrid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  stile: { borderRadius: 14, backgroundColor: C.surface, alignItems: "center", justifyContent: "center" },
  rm: { position: "absolute", top: 4, right: 4, width: 22, height: 22, borderRadius: 11, backgroundColor: "rgba(10,8,14,0.75)", alignItems: "center", justifyContent: "center" },
  rmTxt: { color: "#fff", fontSize: 15, lineHeight: 17 },
  addtile: { borderRadius: 14, borderWidth: 2, borderStyle: "dashed", borderColor: C.line, alignItems: "center", justifyContent: "center", gap: 2 },
  addPlus: { color: C.fg, fontSize: 22, lineHeight: 24 },
  addTxt: { color: C.muted, fontFamily: F.semi, fontSize: 11 },
  note: { color: C.muted, fontFamily: F.body, fontSize: 13, lineHeight: 19, backgroundColor: C.surface, borderRadius: 12, padding: 14 },
  pempty: { color: C.muted, fontFamily: F.body, fontSize: 14, lineHeight: 21, textAlign: "center", paddingVertical: 28 },
});
