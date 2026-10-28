import { useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, useWindowDimensions, View } from "react-native";
import { ME } from "../data.js";
import { orderReplies } from "../store.js";
import { fmt, hue, initialOf } from "../lib/util.js";
import { C, F } from "../theme.js";
import { CrownIcon, StarIcon, StickerCard, StickerImage } from "./ui.js";

export default function Profile({ user, users, problems, myStickers, showBack, onBack, onGo, onEdit, onAddStickers, onPaste, onRemoveSticker, topInset }) {
  const [tab, setTab] = useState("problemi");
  const { width } = useWindowDimensions();
  const me = user === ME;
  const info = users[user] || { name: user, bio: "Qui solo per gli sticker." };

  const probs = problems.filter((p) => p.author === user);
  const replies = problems.flatMap((p) => p.memes.filter((m) => m.author === user).map((m) => ({ p, m })));
  const stars = probs.reduce((a, p) => a + p.stars, 0) + replies.reduce((a, r) => a + r.m.stars, 0);
  const crowns = replies.filter((r) => r.p.winner === r.m.id).length;
  const tabs = [["problemi", "Problemi"], ["risposte", "Risposte"], ...(me ? [["sticker", "Sticker"]] : [])];

  const inner = Math.min(width, 520) - 40;
  const half = (inner - 12) / 2;
  const tile = (inner - 30) / 4;

  return (
    <ScrollView contentContainerStyle={[st.wrap, { paddingTop: topInset + 12 }]}>
      <View style={st.phead}>
        {showBack && <Pressable onPress={onBack} hitSlop={8}><Text style={st.back}>‹ Indietro</Text></Pressable>}
        {!me && <Text style={st.ttl}>@{user}</Text>}
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
      {me && <Pressable style={st.editbtn} onPress={onEdit}><Text style={st.editTxt}>Modifica profilo</Text></Pressable>}

      <View style={st.stats}>
        {[["Problemi", probs.length], ["Risposte", replies.length], ["Stelle", fmt(stars)], ["Corone", crowns]].map(([l, v], i) => (
          <View key={l} style={st.stat}>
            <Text style={[st.statNum, i === 3 && { color: C.accent }]}>{v}</Text>
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
        <Pressable key={p.id} style={st.pitem} onPress={() => onGo(p.id)}>
          <Text style={st.pitemT}>{p.text}</Text>
          <View style={st.pitemM}>
            <StarIcon filled size={14} color={C.accent} />
            <Text style={st.small}>{fmt(p.stars)}</Text>
            <Text style={st.small}>{p.memes.length} risposte</Text>
            <Text style={st.small}>{p.time}</Text>
            <View style={st.thumbs}>
              {orderReplies(p).slice(0, 3).map((m) => (
                <View key={m.id} style={{ marginLeft: -8 }}><StickerCard meme={m} size={34} compact /></View>
              ))}
            </View>
          </View>
        </Pressable>
      )) : <Text style={st.pempty}>{me ? "Non hai ancora raccontato nessun problema.\nTocca + in basso per iniziare." : "Nessun problema ancora."}</Text>)}

      {tab === "risposte" && (replies.length ? (
        <View style={st.rgrid}>
          {replies.map(({ p, m }) => (
            <Pressable key={m.id} style={{ width: half, gap: 6 }} onPress={() => onGo(p.id, m.id)}>
              <StickerCard meme={m} size={half} />
              <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                <StarIcon filled size={13} color={C.accent} />
                <Text style={st.gold}>{fmt(m.stars)}</Text>
                {p.winner === m.id && <><CrownIcon /><Text style={st.gold}>Migliore</Text></>}
              </View>
              <Text style={st.small} numberOfLines={2}>su: {p.text}</Text>
            </Pressable>
          ))}
        </View>
      ) : <Text style={st.pempty}>Nessuna risposta ancora.</Text>)}

      {tab === "sticker" && (
        <>
          <View style={st.sgrid}>
            <Pressable style={[st.addtile, { width: tile, height: tile }]} onPress={onAddStickers} accessibilityLabel="Aggiungi sticker dalla galleria">
              <Text style={st.addPlus}>+</Text><Text style={st.addTxt}>Galleria</Text>
            </Pressable>
            <Pressable style={[st.addtile, { width: tile, height: tile }]} onPress={onPaste} accessibilityLabel="Incolla uno sticker copiato">
              <Text style={st.addPlus}>⧉</Text><Text style={st.addTxt}>Incolla</Text>
            </Pressable>
            {myStickers.map((sk) => (
              <View key={sk.v} style={[st.stile, { width: tile, height: tile }]}>
                <StickerImage sticker={sk} thumb style={{ width: "78%", height: "78%" }} />
                <Pressable style={st.rm} hitSlop={6} onPress={() => onRemoveSticker(sk.v)} accessibilityLabel="Togli dai tuoi sticker">
                  <Text style={st.rmTxt}>×</Text>
                </Pressable>
              </View>
            ))}
          </View>
          <Text style={st.note}>
            Aggiungi i tuoi sticker dalla galleria, oppure incolla uno sticker copiato (su iPhone: fai uno screenshot, aprilo in Foto, tieni premuto sullo sticker e scegli Copia). Puoi salvare anche quelli che usano gli altri, con il pulsante accanto alla stella. Quelli che trovi già qui all'inizio sono esempi da GIPHY.
          </Text>
        </>
      )}
    </ScrollView>
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
