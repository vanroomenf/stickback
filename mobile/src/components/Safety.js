// Reporting, blocking, settings and the age / rules check
import { useEffect, useState } from "react";
import { ActivityIndicator, Linking, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { reportReasons } from "../lib/api.js";
import { MIN_AGE, ageFrom } from "../lib/util.js";
import { LANGUAGES, chosenLanguage, helplines, privacyUrl, rulesUrl, setLanguage, t } from "../i18n/index.js";
import { C, F } from "../theme.js";
import { Primary, Sheet } from "./ui.js";

const open = (url) => Linking.openURL(url).catch(() => {});

// "I have read and accept the rules and the privacy policy", with the two links tappable
export function RulesCheckbox({ checked, onToggle }) {
  return (
    <Pressable style={st.check} onPress={onToggle} accessibilityRole="checkbox" accessibilityState={{ checked }}>
      <View style={[st.box, checked && st.boxOn]}>{checked && <Text style={st.tick}>✓</Text>}</View>
      <Text style={st.checkTxt}>
        {t("rules.accept").split(/(\{rules\}|\{privacy\})/).map((part, i) =>
          part === "{rules}" ? <Text key={i} style={st.link} onPress={() => open(rulesUrl())}>{t("rules.rules")}</Text>
          : part === "{privacy}" ? <Text key={i} style={st.link} onPress={() => open(privacyUrl())}>{t("rules.privacy")}</Text>
          : part)}
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
      <Text style={st.lab}>{t("birth.label")}</Text>
      <TextInput value={value} onChangeText={(t) => onChange(format(t))} placeholder={t("birth.ph")} placeholderTextColor={C.muted}
        keyboardType="number-pad" maxLength={10} style={st.input} />
      {bad && <Text style={st.errTxt}>{t("birth.bad")}</Text>}
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
          <Text style={st.gateTitle}>{t("gate.bannedTitle")}</Text>
          <Text style={st.body}>{t("gate.bannedBody")}</Text>
          <Text style={st.link} onPress={() => open(rulesUrl())}>{t("gate.readRules")}</Text>
        </>
      ) : tooYoung ? (
        <>
          <Text style={st.gateTitle}>{t("gate.tooYoungTitle", { age: MIN_AGE })}</Text>
          <Text style={st.body}>{t("gate.tooYoungBody", { age: MIN_AGE })}</Text>
        </>
      ) : (
        <>
          <Text style={st.gateTitle}>{t("gate.title")}</Text>
          <Text style={st.body}>{t("gate.body", { age: MIN_AGE })}</Text>
          <BirthDateField value={birth} onChange={setBirth} />
          <RulesCheckbox checked={ok} onToggle={() => setOk(!ok)} />
          <Primary label={busy ? t("wait") : t("gate.continue")} disabled={age === null || !ok || busy} onPress={go} />
        </>
      )}
      <Pressable onPress={onSignOut} style={{ alignSelf: "center", padding: 8 }}><Text style={st.muted}>{t("signOut")}</Text></Pressable>
    </ScrollView>
  );
}

// "⋯" menu for a problem, a reply or a person
export function MoreSheet({ target, me, onClose, onReport, onBlock, onDelete }) {
  if (!target) return <Sheet visible={false} title="" onClose={onClose} />;
  const mine = target.author === me;
  const title = target.kind === "problem" ? t("more.problem") : target.kind === "reply" ? t("more.reply") : `@${target.author}`;
  return (
    <Sheet visible title={title} onClose={onClose}>
      {mine ? (
        <Row label={target.kind === "problem" ? t("more.deleteProblem") : t("more.deleteReply")} hint={t("more.deleteHint")} danger onPress={onDelete} />
      ) : (
        <>
          {target.kind !== "user" && <Row label={target.kind === "problem" ? t("more.reportProblem") : t("more.reportReply")} hint={t("more.reportHint")} onPress={onReport} />}
          {target.kind === "user" && <Row label={t("more.reportUser")} hint={t("more.reportUserHint")} onPress={onReport} />}
          <Row label={t("more.block", { user: target.author })} hint={t("more.blockHint")} danger onPress={onBlock} />
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
    <Sheet visible={!!target} title={t("report.title")} onClose={onClose}>
      <Text style={st.body}>{t("report.body")}</Text>
      {reportReasons().map(([k, l, h]) => (
        <Pressable key={k} style={[st.reason, reason === k && st.reasonOn]} onPress={() => setReason(k)} accessibilityRole="radio" accessibilityState={{ selected: reason === k }}>
          <Text style={st.rowTxt}>{l}</Text>
          <Text style={st.rowHint}>{h}</Text>
        </Pressable>
      ))}
      {reason === "autolesionismo" && (
        <View style={st.help}>
          <HelpNumbers />
        </View>
      )}
      {reason && (
        <TextInput value={details} onChangeText={setDetails} maxLength={300} multiline placeholder={t("report.details")}
          placeholderTextColor={C.muted} style={[st.input, { minHeight: 64, textAlignVertical: "top" }]} />
      )}
      <Primary label={busy ? t("report.sending") : t("report.send")} disabled={!reason || busy} onPress={send} />
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
        <Text style={[st.dangerTxt, !danger && { color: C.accentInk }]}>{busy ? t("wait") : confirm}</Text>
      </Pressable>
    </Sheet>
  );
}

// Local helplines for the phone's country; findahelpline.com when we don't know the country
function HelpNumbers() {
  const { emergency, lines } = helplines();
  return (
    <>
      <Text style={st.helpTitle}>{t("help.emergency", { number: emergency })}</Text>
      {lines.length ? (
        <>
          <Text style={st.body}>{t("help.intro")}</Text>
          {lines.map((l) => (
            <Text key={l.number} style={st.helpLine} onPress={() => open(`tel:${l.number.replace(/\s/g, "")}`)}>
              <Text style={{ fontFamily: F.bold }}>{l.number}</Text> · {l.name}{l.youth ? ` (${t("help.youth")})` : ""}
            </Text>
          ))}
        </>
      ) : (
        <Text style={[st.body, st.link]} onPress={() => open("https://findahelpline.com")}>{t("help.fallback")}</Text>
      )}
    </>
  );
}

export function SettingsSheet({ visible, loadBlocked, onUnblock, onDeleteAccount, onSignOut, onClose }) {
  const [blocked, setBlocked] = useState(null);
  const chosen = chosenLanguage();
  const [confirmDelete, setConfirmDelete] = useState(false);
  useEffect(() => {
    if (!visible) return;
    setBlocked(null);
    loadBlocked().then(setBlocked).catch(() => setBlocked([]));
  }, [visible, loadBlocked]);

  return (
    <>
      <Sheet visible={visible && !confirmDelete} title={t("settings.title")} onClose={onClose}>
        <Text style={st.lab}>{t("settings.language")}</Text>
        <View style={st.langs}>
          {[[null, t("settings.auto")], ...LANGUAGES].map(([code, label]) => (
            <Pressable key={label} onPress={() => setLanguage(code)} style={[st.lang, chosen === code && st.langOn]}
              accessibilityRole="radio" accessibilityState={{ selected: chosen === code }}>
              <Text style={[st.langTxt, chosen === code && { color: C.bg }]}>{label}</Text>
            </Pressable>
          ))}
        </View>

        <Text style={[st.lab, { marginTop: 8 }]}>{t("settings.blocked")}</Text>
        {blocked === null ? <ActivityIndicator color={C.accent} /> : blocked.length ? blocked.map((b) => (
          <View key={b.id} style={st.blockedRow}>
            <Text style={[st.rowTxt, { flex: 1 }]} numberOfLines={1}>@{b.username}</Text>
            <Pressable style={st.smallBtn} onPress={async () => { await onUnblock(b); setBlocked((l) => l.filter((x) => x.id !== b.id)); }}>
              <Text style={st.smallBtnTxt}>{t("settings.unblock")}</Text>
            </Pressable>
          </View>
        )) : <Text style={st.muted}>{t("settings.noneBlocked")}</Text>}

        <Text style={[st.lab, { marginTop: 8 }]}>{t("settings.info")}</Text>
        <Row label={t("settings.rules")} onPress={() => open(rulesUrl())} />
        <Row label={t("settings.privacy")} onPress={() => open(privacyUrl())} />

        <Text style={[st.lab, { marginTop: 8 }]}>{t("settings.account")}</Text>
        <Row label={t("signOut")} onPress={onSignOut} />
        <Row label={t("settings.deleteAccount")} hint={t("settings.deleteAccountHint")} danger onPress={() => setConfirmDelete(true)} />
      </Sheet>
      <ConfirmSheet visible={visible && confirmDelete} title={t("settings.deleteTitle")} danger confirm={t("settings.deleteConfirm")}
        text={t("settings.deleteText")}
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
  helpLine: { color: C.fg, fontFamily: F.body, fontSize: 14, lineHeight: 21 },
  langs: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  lang: { borderWidth: 1, borderColor: C.line, borderRadius: 99, paddingVertical: 7, paddingHorizontal: 13, backgroundColor: C.bg },
  langOn: { backgroundColor: C.fg, borderColor: C.fg },
  langTxt: { color: C.fg, fontFamily: F.semi, fontSize: 13 },
  danger: { backgroundColor: "#c92a3a", borderRadius: 14, paddingVertical: 14, alignItems: "center" },
  dangerTxt: { color: "#fff", fontFamily: F.bold, fontSize: 15 },
  blockedRow: { flexDirection: "row", alignItems: "center", gap: 10, backgroundColor: C.bg, borderRadius: 12, paddingVertical: 10, paddingHorizontal: 14 },
  smallBtn: { borderWidth: 1, borderColor: C.line, borderRadius: 99, paddingVertical: 6, paddingHorizontal: 12 },
  smallBtnTxt: { color: C.fg, fontFamily: F.semi, fontSize: 13 },
});
