// Reporting, blocking, settings and the age / rules check
import { useEffect, useState } from "react";
import { ActivityIndicator, Linking, Pressable, ScrollView, Text, TextInput, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { reportReasons } from "../lib/api.js";
import { MIN_AGE, ageFrom } from "../lib/util.js";
import { LANGUAGES, chosenLanguage, feedLanguages, helplines, privacyUrl, rulesUrl, setLanguage, t } from "../i18n/index.js";
import { F, useStyles, useTheme } from "../theme.js";
import { Logo, Primary, Sheet } from "./ui.js";

const open = (url) => Linking.openURL(url).catch(() => {});

// "I have read and accept the rules and the privacy policy", with the two links tappable
export function RulesCheckbox({ checked, onToggle }) {
  const st = useStyles(makeStyles);
  const { C } = useTheme();
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
  const st = useStyles(makeStyles);
  const { C } = useTheme();
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
  const st = useStyles(makeStyles);
  const { C } = useTheme();
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
      <View style={{ marginBottom: 8 }}><Logo color={C.fg} size={30} /></View>
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
  const st = useStyles(makeStyles);
  const { C } = useTheme();
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
  const st = useStyles(makeStyles);
  const { C } = useTheme();
  return (
    <Pressable style={({ pressed }) => [st.row, pressed && { opacity: 0.7 }]} onPress={onPress} accessibilityRole="button">
      <Text style={[st.rowTxt, danger && { color: C.danger }]}>{label}</Text>
      {!!hint && <Text style={st.rowHint}>{hint}</Text>}
    </Pressable>
  );
}

export function ReportSheet({ target, onClose, onSend }) {
  const st = useStyles(makeStyles);
  const { C } = useTheme();
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
  const st = useStyles(makeStyles);
  const { C } = useTheme();
  const [busy, setBusy] = useState(false);
  const go = async () => { setBusy(true); try { await onConfirm(); } finally { setBusy(false); } };
  return (
    <Sheet visible={visible} title={title} onClose={onClose}>
      <Text style={st.body}>{text}</Text>
      <Primary label={busy ? t("wait") : confirm} danger={danger} disabled={busy} onPress={go} />
    </Sheet>
  );
}

// Local helplines for the phone's country; findahelpline.com when we don't know the country
function HelpNumbers() {
  const st = useStyles(makeStyles);
  const { C } = useTheme();
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

export function SettingsSheet({ visible, loadBlocked, onUnblock, onDeleteAccount, onSignOut, onClose, onFeedLanguages }) {
  const st = useStyles(makeStyles);
  const { C } = useTheme();
  const [feedLangs, setFeedLangs] = useState(feedLanguages);
  useEffect(() => { if (visible) setFeedLangs(feedLanguages()); }, [visible]);
  // at least one language stays on
  const toggleFeedLang = (code) => {
    const next = feedLangs.includes(code) ? feedLangs.filter((c) => c !== code) : [...feedLangs, code];
    if (!next.length) return;
    setFeedLangs(next);
    onFeedLanguages(next);
  };
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

        <Text style={[st.lab, { marginTop: 8 }]}>{t("settings.feedLangs")}</Text>
        <Text style={st.rowHint}>{t("settings.feedLangsHint")}</Text>
        <View style={st.langs}>
          {LANGUAGES.map(([code, label]) => {
            const on = feedLangs.includes(code);
            return (
              <Pressable key={code} onPress={() => toggleFeedLang(code)} style={[st.lang, on && st.langOn]}
                accessibilityRole="checkbox" accessibilityState={{ checked: on }}>
                <Text style={[st.langTxt, on && { color: C.bg }]}>{on ? "✓ " : ""}{label}</Text>
              </Pressable>
            );
          })}
        </View>

        <Text style={[st.lab, { marginTop: 8 }]}>{t("settings.blocked")}</Text>
        {blocked === null ? <ActivityIndicator color={C.muted} /> : blocked.length ? blocked.map((b) => (
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

const makeStyles = (C) => ({
  gate: { paddingHorizontal: 24, gap: 16, maxWidth: 480, width: "100%", alignSelf: "center" },
  gateTitle: { color: C.fg, fontFamily: F.bold, fontSize: 26, lineHeight: 31, letterSpacing: -0.5 },
  body: { color: C.muted, fontFamily: F.body, fontSize: 15, lineHeight: 21 },
  muted: { color: C.muted, fontFamily: F.medium, fontSize: 15 },
  lab: { color: C.muted, fontFamily: F.semi, fontSize: 12, letterSpacing: 0.6 },
  input: { backgroundColor: C.raised, borderRadius: 14, paddingHorizontal: 14, paddingVertical: 13, color: C.fg, fontFamily: F.medium, fontSize: 16 },
  errTxt: { color: C.danger, fontFamily: F.medium, fontSize: 13 },
  check: { flexDirection: "row", gap: 12, alignItems: "flex-start", minHeight: 44 },
  box: { width: 24, height: 24, borderRadius: 7, borderWidth: 1.8, borderColor: C.muted, alignItems: "center", justifyContent: "center", marginTop: 1 },
  boxOn: { backgroundColor: C.fg, borderColor: C.fg },
  tick: { color: C.bg, fontFamily: F.bold, fontSize: 15, lineHeight: 18 },
  checkTxt: { flex: 1, color: C.fg, fontFamily: F.body, fontSize: 15, lineHeight: 21 },
  link: { color: C.fg, fontFamily: F.semi, textDecorationLine: "underline" },
  row: { backgroundColor: C.surface, borderRadius: 14, paddingVertical: 14, paddingHorizontal: 16, gap: 3, minHeight: 50, justifyContent: "center" },
  rowTxt: { color: C.fg, fontFamily: F.semi, fontSize: 15 },
  rowHint: { color: C.muted, fontFamily: F.body, fontSize: 13, lineHeight: 18 },
  reason: { borderRadius: 14, paddingVertical: 12, paddingHorizontal: 16, gap: 2, backgroundColor: C.surface, borderWidth: 2, borderColor: "transparent" },
  reasonOn: { borderColor: C.fg },
  help: { backgroundColor: C.raised, borderRadius: 14, padding: 16, gap: 8 },
  helpTitle: { color: C.fg, fontFamily: F.bold, fontSize: 15 },
  helpLine: { color: C.fg, fontFamily: F.body, fontSize: 15, lineHeight: 24 },
  langs: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  lang: { borderRadius: 999, minHeight: 38, paddingHorizontal: 15, justifyContent: "center", backgroundColor: C.raised },
  langOn: { backgroundColor: C.fg },
  langTxt: { color: C.fg, fontFamily: F.medium, fontSize: 14 },
  blockedRow: { flexDirection: "row", alignItems: "center", gap: 10, backgroundColor: C.surface, borderRadius: 14, paddingVertical: 8, paddingHorizontal: 16 },
  smallBtn: { borderRadius: 999, minHeight: 36, paddingHorizontal: 14, justifyContent: "center", backgroundColor: C.raised },
  smallBtnTxt: { color: C.fg, fontFamily: F.semi, fontSize: 13 },
});
