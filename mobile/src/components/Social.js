// Feed header (Per te / Amici, categories, leaderboard) and the weekly leaderboard
import { useEffect, useRef, useState } from "react";
import { ActivityIndicator, Platform, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { captureRef } from "react-native-view-shot";
import * as Sharing from "expo-sharing";
import { orderReplies } from "../store.js";
import Svg, { Path } from "react-native-svg";
import { CATEGORIES } from "../lib/api.js";
import { hue } from "../lib/util.js";
import { C, F } from "../theme.js";
import { Primary, Sheet, StickerCard } from "./ui.js";

export const TOPBAR_HEIGHT = 92;

function TrophyIcon({ color }) {
  return (
    <Svg viewBox="0 0 24 24" width={22} height={22}>
      <Path d="M7 4h10v3a5 5 0 0 1-10 0V4zM5 5H3v1a4 4 0 0 0 4 4M19 5h2v1a4 4 0 0 1-4 4M12 12v4M8 20h8M9.5 16h5l.5 4h-6z"
        fill="none" stroke={color} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

export function FeedHeader({ topInset, mode, onMode, category, onCategory, onLeaderboard }) {
  return (
    <View style={[st.bar, { paddingTop: topInset + 8 }]}>
      <View style={st.row}>
        <Text style={st.logo}>Stick<Text style={{ color: C.accent }}>back</Text></Text>
        <View style={st.tabs}>
          {[["foryou", "Per te"], ["friends", "Amici"]].map(([k, l]) => (
            <Pressable key={k} onPress={() => onMode(k)} hitSlop={6} accessibilityRole="tab" accessibilityState={{ selected: mode === k }}>
              <Text style={[st.tab, mode === k && st.tabOn]}>{l}</Text>
            </Pressable>
          ))}
        </View>
        <Pressable onPress={onLeaderboard} hitSlop={8} accessibilityLabel="Classifica della settimana" style={{ marginLeft: "auto" }}>
          <TrophyIcon color={C.accent} />
        </Pressable>
      </View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={st.chips}>
        {[[null, "Tutte"], ...CATEGORIES].map(([k, l]) => (
          <Pressable key={l} onPress={() => onCategory(k)} style={[st.chip, category === k && st.chipOn]}
            accessibilityRole="button" accessibilityState={{ selected: category === k }}>
            <Text style={[st.chipTxt, category === k && st.chipTxtOn]}>{l}</Text>
          </Pressable>
        ))}
      </ScrollView>
    </View>
  );
}

export function CategoryBadge({ label }) {
  return <View style={st.badge}><Text style={st.badgeTxt}>{label}</Text></View>;
}

export function LeaderboardSheet({ visible, load, onUser, onClose }) {
  const [rows, setRows] = useState(null);
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    if (!visible) return;
    setRows(null); setFailed(false);
    load().then(setRows).catch(() => setFailed(true));
  }, [visible, load]);

  return (
    <Sheet visible={visible} title="Classifica della settimana" onClose={onClose}>
      <Text style={st.sub}>Chi ha ricevuto più stelle sulle sue risposte negli ultimi 7 giorni.</Text>
      {failed ? <Text style={st.sub}>Non riesco a caricare la classifica. Riprova tra poco.</Text>
        : rows === null ? <ActivityIndicator color={C.accent} />
        : !rows.length ? <Text style={st.sub}>Ancora nessuna stella questa settimana. Rispondi ai problemi per entrare in classifica!</Text>
        : rows.map((r, i) => (
          <Pressable key={r.id} style={[st.lbRow, i < 3 && st.lbTop]} onPress={() => { onClose(); onUser(r.username); }}>
            <Text style={[st.rank, i === 0 && { color: C.accent }]}>{i + 1}</Text>
            <View style={[st.av, { backgroundColor: `hsl(${hue(r.username)}, 55%, 45%)` }]}>
              <Text style={st.avTxt}>{(r.name || r.username)[0].toUpperCase()}</Text>
            </View>
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text style={st.lbName} numberOfLines={1}>@{r.username}</Text>
              <Text style={st.lbSub}>{r.replies} {r.replies === 1 ? "risposta" : "risposte"}</Text>
            </View>
            <Text style={st.lbStars}>★ {r.stars}</Text>
          </Pressable>
        ))}
    </Sheet>
  );
}

const st = StyleSheet.create({
  bar: { position: "absolute", top: 0, left: 0, right: 0, backgroundColor: C.bg, paddingBottom: 8, gap: 8 },
  row: { flexDirection: "row", alignItems: "center", gap: 14, paddingHorizontal: 16 },
  logo: { color: C.fg, fontFamily: F.display, fontSize: 19, letterSpacing: -0.4 },
  tabs: { flexDirection: "row", gap: 14, marginLeft: 6 },
  tab: { color: C.muted, fontFamily: F.semi, fontSize: 15, paddingBottom: 3, borderBottomWidth: 2, borderColor: "transparent" },
  tabOn: { color: C.fg, borderColor: C.accent },
  chips: { gap: 7, paddingHorizontal: 16 },
  chip: { borderWidth: 1, borderColor: C.line, borderRadius: 99, paddingVertical: 5, paddingHorizontal: 12 },
  chipOn: { backgroundColor: C.fg, borderColor: C.fg },
  chipTxt: { color: C.muted, fontFamily: F.semi, fontSize: 13 },
  chipTxtOn: { color: C.bg },
  badge: { borderWidth: 1, borderColor: C.line, borderRadius: 99, paddingHorizontal: 8, paddingVertical: 1 },
  badgeTxt: { color: C.muted, fontFamily: F.semi, fontSize: 11 },
  sub: { color: C.muted, fontFamily: F.body, fontSize: 13, lineHeight: 18 },
  lbRow: { flexDirection: "row", alignItems: "center", gap: 12, backgroundColor: C.bg, borderRadius: 12, padding: 12 },
  lbTop: { borderWidth: 1, borderColor: C.line },
  rank: { width: 22, color: C.muted, fontFamily: F.display, fontSize: 18, textAlign: "center" },
  av: { width: 34, height: 34, borderRadius: 17, alignItems: "center", justifyContent: "center" },
  avTxt: { color: "#fff", fontFamily: F.bold, fontSize: 15 },
  lbName: { color: C.fg, fontFamily: F.semi, fontSize: 15 },
  lbSub: { color: C.muted, fontFamily: F.body, fontSize: 12 },
  lbStars: { color: C.accent, fontFamily: F.bold, fontSize: 15 },
});

// ───────── Share a problem as an image (for Instagram / TikTok stories) ─────────

export function ShareSheet({ problem, onClose, say }) {
  const cardRef = useRef(null);
  const [busy, setBusy] = useState(false);
  if (!problem) return <Sheet visible={false} title="" onClose={onClose} />;
  const best = orderReplies(problem)[0];

  const share = async () => {
    setBusy(true);
    try {
      const uri = await captureRef(cardRef, { format: "png", quality: 1, result: "tmpfile" });
      if (Platform.OS !== "web" && (await Sharing.isAvailableAsync())) {
        await Sharing.shareAsync(uri, { mimeType: "image/png", dialogTitle: "Condividi su Stickback", UTI: "public.png" });
      } else {
        say("Qui non posso condividere l'immagine: prova dall'app sul telefono.");
      }
    } catch {
      say("Non sono riuscito a creare l'immagine. Riprova.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Sheet visible title="Condividi nelle storie" onClose={onClose}>
      <Text style={st.sub}>Crea un'immagine verticale con il problema e la risposta con più stelle, pronta per Instagram, TikTok o WhatsApp.</Text>
      <View style={{ alignSelf: "center" }}>
        <View ref={cardRef} collapsable={false} style={sh.card}>
          <Text style={sh.logo}>Stick<Text style={{ color: C.accent }}>back</Text></Text>
          <Text style={sh.kicker}>@{problem.author} ha un problema</Text>
          <Text style={sh.text}>{problem.text}</Text>
          {best ? (
            <View style={{ gap: 6, alignItems: "center" }}>
              <StickerCard meme={best} size={196} />
              <Text style={sh.by}>risposta di @{best.author} · ★ {best.stars}</Text>
            </View>
          ) : (
            <Text style={sh.by}>Ancora nessuna risposta: rispondi tu!</Text>
          )}
          <View style={sh.foot}><Text style={sh.footTxt}>Rispondi anche tu, solo con uno sticker</Text></View>
        </View>
      </View>
      <Primary label={busy ? "Creo l'immagine…" : "Condividi"} disabled={busy} onPress={share} />
    </Sheet>
  );
}

const sh = StyleSheet.create({
  card: { width: 252, height: 448, backgroundColor: C.bg, borderRadius: 18, padding: 20, gap: 14, borderWidth: 1, borderColor: C.line, justifyContent: "space-between" },
  logo: { color: C.fg, fontFamily: F.display, fontSize: 20, letterSpacing: -0.4 },
  kicker: { color: C.muted, fontFamily: F.semi, fontSize: 12, marginBottom: -6 },
  text: { color: C.fg, fontFamily: F.display, fontSize: 19, lineHeight: 23 },
  by: { color: C.muted, fontFamily: F.semi, fontSize: 11, textAlign: "center" },
  foot: { backgroundColor: C.accent, borderRadius: 10, paddingVertical: 8, alignItems: "center" },
  footTxt: { color: C.accentInk, fontFamily: F.bold, fontSize: 12 },
});
