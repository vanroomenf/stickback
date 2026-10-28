// Reporting, blocking, settings and the age / rules check
import { useEffect, useState } from "react";
import { ActivityIndicator, Linking, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { REPORT_REASONS } from "../lib/api.js";
import { MIN_AGE, PRIVACY_URL, RULES_URL, ageFrom } from "../lib/util.js";
import { C, F } from "../theme.js";
import { Primary, Sheet } from "./ui.js";

const open = (url) => Linking.openURL(url).catch(() => {});

// "Ho letto e accetto le Regole e la Privacy" with tappable links
export function RulesCheckbox({ checked, onToggle }) {
  return (
    <Pressable style={st.check} onPress={onToggle} accessibilityRole="checkbox" accessibilityState={{ checked }}>
      <View style={[st.box, checked && st.boxOn]}>{checked && <Text style={st.tick}>✓</Text>}</View>
      <Text style={st.checkTxt}>
        Ho letto e accetto le <Text style={st.link} onPress={() => open(RULES_URL)}>regole della community</Text> e
        l'<Text style={st.link} onPress={() => open(PRIVACY_URL)}>informativa sulla privacy</Text>.
      </Text>
    </Pressable>
  );
}

export function BirthDateField({ value, onChange }) {
  const age = ageFrom(value);
  const bad = value.length >= 8 && age === null;
  // Insert the slashes while typing: 28102008 → 28/10/2008
  const format = (t) => {
    const digits = t.replace(/\D/g, "").slice(0, 8);
    return [digits.slice(0, 2), digits.slice(2, 4), digits.slice(4)].filter(Boolean).join("/");
  };
  return (
    <View style={{ gap: 6 }}>
      <Text style={st.lab}>DATA DI NASCITA</Text>
      <TextInput value={value} onChangeText={(t) => onChange(format(t))} placeholder="GG/MM/AAAA" placeholderTextColor={C.muted}
        keyboardType="number-pad" maxLength={10} style={st.input} />
      {bad && <Text style={st.errTxt}>Questa data non esiste. Scrivila come 28/10/2008.</Text>}
    </View>
  );
}

// Shown after login to accounts that haven't confirmed age and rules yet, or that were suspended
export function TermsGate({ banned, onAccept, onSignOut }) {
  const insets = useSafeAreaInsets();
  const [birth, setBirth] = useState("");
  const [ok, setOk] = useState(false);
  const [busy, setBusy] = useState(false);
  const [tooYoung, setTooYoung] = useState(false);
  const age = ageFrom(birth);

  const go = async () => {
    if (age < MIN_AGE) { setTooYoung(true); return; }
    setBusy(true);
    try { await onAccept(); } finally { setBusy(false); }
  };

  return (
    <ScrollView style={{ flex: 1, backgroundColor: C.bg }} contentContainerStyle={[st.gate, { paddingTop: insets.top + 48, paddingBottom: insets.bottom + 24 }]}>
      <Text style={st.logo}>Stick<Text style={{ color: C.accent }}>back</Text></Text>
      {banned ? (
        <>
          <Text style={st.gateTitle}>Il tuo account è sospeso</Text>
          <Text style={st.body}>Un moderatore ha sospeso il tuo account perché ha violato le regole della community. Non puoi più pubblicare né rispondere.</Text>
          <Text style={st.link} onPress={() => open(RULES_URL)}>Leggi le regole della community</Text>
        </>
      ) : tooYoung ? (
        <>
          <Text style={st.gateTitle}>Stickback è per chi ha almeno {MIN_AGE} anni</Text>
          <Text style={st.body}>Per ora non puoi usare l'app. Ti aspettiamo quando avrai {MIN_AGE} anni!</Text>
        </>
      ) : (
        <>
          <Text style={st.gateTitle}>Prima di iniziare</Text>
          <Text style={st.body}>Stickback è per chi ha almeno {MIN_AGE} anni. Ti chiediamo la data di nascita solo per controllarlo: non la salviamo.</Text>
          <BirthDateField value={birth} onChange={setBirth} />
          <RulesCheckbox checked={ok} onToggle={() => setOk(!ok)} />
          <Primary label={busy ? "Un attimo…" : "Continua"} disabled={age === null || !ok || busy} onPress={go} />
        </>
      )}
      <Pressable onPress={onSignOut} style={{ alignSelf: "center", padding: 8 }}><Text style={st.muted}>Esci</Text></Pressable>
    </ScrollView>
  );
}

// "⋯" menu for a problem, a reply or a person
export function MoreSheet({ target, me, onClose, onReport, onBlock, onDelete }) {
  if (!target) return <Sheet visible={false} title="" onClose={onClose} />;
  const mine = target.author === me;
  const title = target.kind === "problem" ? "Problema" : target.kind === "reply" ? "Risposta" : `@${target.author}`;
  return (
    <Sheet visible title={title} onClose={onClose}>
      {mine ? (
        <Row label={target.kind === "problem" ? "Elimina il problema" : "Elimina la risposta"} hint="Sparisce per tutti. Non si può annullare." danger onPress={onDelete} />
      ) : (
        <>
          {target.kind !== "user" && <Row label={target.kind === "problem" ? "Segnala il problema" : "Segnala la risposta"} hint="Un moderatore la controlla. L'autore non saprà chi l'ha segnalata." onPress={onReport} />}
          {target.kind === "user" && <Row label="Segnala il profilo" hint="Per nome utente, bio o comportamento." onPress={onReport} />}
          <Row label={`Blocca @${target.author}`} hint="Non vedrete più i contenuti l'uno dell'altro e non potrà risponderti." danger onPress={onBlock} />
        </>
      )}
    </Sheet>
  );
}

function Row({ label, hint, danger, onPress }) {
  return (
    <Pressable style={({ pressed }) => [st.row, pressed && { opacity: 0.7 }]} onPress={onPress} accessibilityRole="button">
      <Text style={[st.rowTxt, danger && { color: "#ff8a8a" }]}>{label}</Text>
      {!!hint && <Text style={st.rowHint}>{hint}</Text>}
    </Pressable>
  );
}

export function ReportSheet({ target, onClose, onSend }) {
  const [reason, setReason] = useState(null);
  const [details, setDetails] = useState("");
  const [busy, setBusy] = useState(false);
  useEffect(() => { setReason(null); setDetails(""); }, [target]);
  const send = async () => { setBusy(true); try { await onSend(reason, details); } finally { setBusy(false); } };
  return (
    <Sheet visible={!!target} title="Perché lo segnali?" onClose={onClose}>
      <Text style={st.body}>La segnalazione è anonima. Un moderatore la controlla, di solito entro 24 ore.</Text>
      {REPORT_REASONS.map(([k, l, h]) => (
        <Pressable key={k} style={[st.reason, reason === k && st.reasonOn]} onPress={() => setReason(k)} accessibilityRole="radio" accessibilityState={{ selected: reason === k }}>
          <Text style={st.rowTxt}>{l}</Text>
          <Text style={st.rowHint}>{h}</Text>
        </Pressable>
      ))}
      {reason === "autolesionismo" && (
        <View style={st.help}>
          <Text style={st.helpTitle}>Se qualcuno è in pericolo adesso, chiama il 112.</Text>
          <Text style={st.body}>Se sei tu a stare male, puoi parlarne subito: in Svizzera chiama il 143 (Telefono Amico) o il 147 (per i giovani); in Italia il Telefono Amico allo 02 2327 2327.</Text>
        </View>
      )}
      {reason && (
        <TextInput value={details} onChangeText={setDetails} maxLength={300} multiline placeholder="Vuoi aggiungere qualcosa? (facoltativo)"
          placeholderTextColor={C.muted} style={[st.input, { minHeight: 64, textAlignVertical: "top" }]} />
      )}
      <Primary label={busy ? "Invio…" : "Invia segnalazione"} disabled={!reason || busy} onPress={send} />
    </Sheet>
  );
}

export function ConfirmSheet({ visible, title, text, confirm, danger, onClose, onConfirm }) {
  const [busy, setBusy] = useState(false);
  const go = async () => { setBusy(true); try { await onConfirm(); } finally { setBusy(false); } };
  return (
    <Sheet visible={visible} title={title} onClose={onClose}>
      <Text style={st.body}>{text}</Text>
      <Pressable style={[st.danger, !danger && { backgroundColor: C.accent }, busy && { opacity: 0.5 }]} onPress={go} disabled={busy}>
        <Text style={[st.dangerTxt, !danger && { color: C.accentInk }]}>{busy ? "Un attimo…" : confirm}</Text>
      </Pressable>
    </Sheet>
  );
}

export function SettingsSheet({ visible, loadBlocked, onUnblock, onDeleteAccount, onSignOut, onClose }) {
  const [blocked, setBlocked] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  useEffect(() => {
    if (!visible) return;
    setBlocked(null);
    loadBlocked().then(setBlocked).catch(() => setBlocked([]));
  }, [visible, loadBlocked]);

  return (
    <>
      <Sheet visible={visible && !confirmDelete} title="Impostazioni" onClose={onClose}>
        <Text style={st.lab}>UTENTI BLOCCATI</Text>
        {blocked === null ? <ActivityIndicator color={C.accent} /> : blocked.length ? blocked.map((b) => (
          <View key={b.id} style={st.blockedRow}>
            <Text style={[st.rowTxt, { flex: 1 }]} numberOfLines={1}>@{b.username}</Text>
            <Pressable style={st.smallBtn} onPress={async () => { await onUnblock(b); setBlocked((l) => l.filter((x) => x.id !== b.id)); }}>
              <Text style={st.smallBtnTxt}>Sblocca</Text>
            </Pressable>
          </View>
        )) : <Text style={st.muted}>Non hai bloccato nessuno.</Text>}

        <Text style={[st.lab, { marginTop: 8 }]}>INFORMAZIONI</Text>
        <Row label="Regole della community" onPress={() => open(RULES_URL)} />
        <Row label="Informativa sulla privacy" onPress={() => open(PRIVACY_URL)} />

        <Text style={[st.lab, { marginTop: 8 }]}>ACCOUNT</Text>
        <Row label="Esci" onPress={onSignOut} />
        <Row label="Elimina account" hint="Cancella per sempre profilo, problemi, risposte, stelle e sticker." danger onPress={() => setConfirmDelete(true)} />
      </Sheet>
      <ConfirmSheet visible={visible && confirmDelete} title="Eliminare l'account?" danger confirm="Elimina per sempre"
        text="Cancelliamo il tuo profilo, i tuoi problemi, le risposte, le stelle e gli sticker che hai caricato. Non si può annullare."
        onClose={() => setConfirmDelete(false)} onConfirm={onDeleteAccount} />
    </>
  );
}

const st = StyleSheet.create({
  gate: { paddingHorizontal: 24, gap: 16, maxWidth: 480, width: "100%", alignSelf: "center" },
  logo: { color: C.fg, fontFamily: F.display, fontSize: 34, letterSpacing: -1, marginBottom: 8 },
  gateTitle: { color: C.fg, fontFamily: F.display, fontSize: 24, lineHeight: 29 },
  body: { color: C.muted, fontFamily: F.body, fontSize: 14, lineHeight: 20 },
  muted: { color: C.muted, fontFamily: F.medium, fontSize: 14 },
  lab: { color: C.muted, fontFamily: F.semi, fontSize: 12, letterSpacing: 0.8 },
  input: { backgroundColor: C.bg, borderWidth: 1, borderColor: C.line, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 12, color: C.fg, fontFamily: F.medium, fontSize: 16 },
  errTxt: { color: "#ff8a8a", fontFamily: F.medium, fontSize: 12 },
  check: { flexDirection: "row", gap: 12, alignItems: "flex-start" },
  box: { width: 24, height: 24, borderRadius: 7, borderWidth: 2, borderColor: C.line, alignItems: "center", justifyContent: "center", marginTop: 1 },
  boxOn: { backgroundColor: C.accent, borderColor: C.accent },
  tick: { color: C.accentInk, fontFamily: F.bold, fontSize: 15, lineHeight: 18 },
  checkTxt: { flex: 1, color: C.fg, fontFamily: F.body, fontSize: 14, lineHeight: 20 },
  link: { color: C.accent, fontFamily: F.semi, textDecorationLine: "underline" },
  row: { backgroundColor: C.bg, borderRadius: 12, paddingVertical: 13, paddingHorizontal: 14, gap: 3 },
  rowTxt: { color: C.fg, fontFamily: F.semi, fontSize: 15 },
  rowHint: { color: C.muted, fontFamily: F.body, fontSize: 12.5, lineHeight: 17 },
  reason: { borderRadius: 12, paddingVertical: 11, paddingHorizontal: 14, gap: 2, backgroundColor: C.bg, borderWidth: 2, borderColor: "transparent" },
  reasonOn: { borderColor: C.accent },
  help: { backgroundColor: "#3a2a12", borderRadius: 12, padding: 14, gap: 6 },
  helpTitle: { color: C.fg, fontFamily: F.bold, fontSize: 14 },
  danger: { backgroundColor: "#c92a3a", borderRadius: 14, paddingVertical: 14, alignItems: "center" },
  dangerTxt: { color: "#fff", fontFamily: F.bold, fontSize: 15 },
  blockedRow: { flexDirection: "row", alignItems: "center", gap: 10, backgroundColor: C.bg, borderRadius: 12, paddingVertical: 10, paddingHorizontal: 14 },
  smallBtn: { borderWidth: 1, borderColor: C.line, borderRadius: 99, paddingVertical: 6, paddingHorizontal: 12 },
  smallBtnTxt: { color: C.fg, fontFamily: F.semi, fontSize: 13 },
});
