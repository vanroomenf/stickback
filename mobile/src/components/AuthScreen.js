import { useState } from "react";
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { supabase } from "../lib/supabase.js";
import { C, F } from "../theme.js";
import { Primary } from "./ui.js";
import { BirthDateField, RulesCheckbox } from "./Safety.js";
import { MIN_AGE, TERMS_VERSION, ageFrom } from "../lib/util.js";
import { t } from "../i18n/index.js";

const USERNAME = /^[a-z0-9._]{3,20}$/;

// Supabase error messages, in words people understand
function explain(error) {
  const m = (error?.message || "").toLowerCase();
  if (m.includes("invalid login credentials")) return t("err.badLogin");
  if (m.includes("email not confirmed")) return t("err.notConfirmed");
  if (m.includes("already registered") || m.includes("already been registered")) return t("err.exists");
  if (m.includes("password") && m.includes("characters")) return t("err.shortPassword");
  if (m.includes("rate limit") || m.includes("too many")) return t("err.rateLimit");
  if (m.includes("network") || m.includes("fetch")) return t("err.offline");
  if (m.includes("database error saving new user")) return t("err.badUsername");
  if (m.includes("token has expired") || m.includes("invalid") && m.includes("otp") || m.includes("otp_expired")) return t("err.badCode");
  return t("err.generic");
}

export default function AuthScreen() {
  const insets = useSafeAreaInsets();
  const [mode, setMode] = useState("signup"); // "signup" | "login" | "reset"
  const [codeSent, setCodeSent] = useState(false); // reset: the email with the code has gone out
  const [code, setCode] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [username, setUsername] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState(null); // { kind: "error" | "info", text }
  const [birth, setBirth] = useState("");
  const [rules, setRules] = useState(false);
  const [tooYoung, setTooYoung] = useState(false);

  const signup = mode === "signup";
  const cleanUser = username.trim().toLowerCase();
  const userOk = !signup || USERNAME.test(cleanUser);
  const age = ageFrom(birth);
  const canSend = email.includes("@") && password.length >= 6 && userOk && !busy && (!signup || (age !== null && rules));

  // Forgotten password: a code by email, then the new password, all inside the app
  const sendCode = async () => {
    setBusy(true); setMsg(null);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email.trim());
      if (error) throw error;
      setCodeSent(true); setCode(""); setPassword("");
      setMsg({ kind: "info", text: t("auth.codeSent", { email: email.trim() }) });
    } catch (e) {
      setMsg({ kind: "error", text: explain(e) });
    } finally { setBusy(false); }
  };
  const saveNewPassword = async () => {
    setBusy(true); setMsg(null);
    try {
      const { error } = await supabase.auth.verifyOtp({ email: email.trim(), token: code.trim(), type: "recovery" });
      if (error) throw error;
      // you're logged in now: set the new password, and the app opens
      const { error: upError } = await supabase.auth.updateUser({ password });
      if (upError) throw upError;
    } catch (e) {
      setMsg({ kind: "error", text: explain(e) });
      setBusy(false);
    }
  };
  const backToLogin = () => { setMode("login"); setCodeSent(false); setMsg(null); setPassword(""); };

  if (mode === "reset") {
    return (
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={{ flex: 1, backgroundColor: C.bg }}>
        <ScrollView contentContainerStyle={[st.wrap, { paddingTop: insets.top + 48, paddingBottom: insets.bottom + 24 }]} keyboardShouldPersistTaps="handled">
          <Text style={st.logo}>Stick<Text style={{ color: C.accent }}>back</Text></Text>
          <Text style={st.title}>{t("auth.resetTitle")}</Text>
          {!codeSent && <Text style={st.tag}>{t("auth.resetBody")}</Text>}
          <View style={st.field}>
            <Text style={st.lab}>{t("auth.email")}</Text>
            <TextInput value={email} onChangeText={(v) => { setEmail(v); setCodeSent(false); }} autoCapitalize="none" autoCorrect={false} keyboardType="email-address"
              placeholder={t("auth.emailPh")} placeholderTextColor={C.muted} style={st.input} textContentType="emailAddress" autoComplete="email" />
          </View>
          {msg && <Text style={[st.msg, msg.kind === "error" ? st.err : st.info]}>{msg.text}</Text>}
          {codeSent ? (
            <>
              <View style={st.field}>
                <Text style={st.lab}>{t("auth.code")}</Text>
                <TextInput value={code} onChangeText={(v) => setCode(v.replace(/\D/g, ""))} keyboardType="number-pad" maxLength={10}
                  placeholder={t("auth.codePh")} placeholderTextColor={C.muted} style={[st.input, st.codeInput]}
                  textContentType="oneTimeCode" autoComplete="one-time-code" />
              </View>
              <View style={st.field}>
                <Text style={st.lab}>{t("auth.newPassword")}</Text>
                <TextInput value={password} onChangeText={setPassword} secureTextEntry placeholder={t("auth.passwordPh")} placeholderTextColor={C.muted}
                  style={st.input} textContentType="newPassword" autoComplete="new-password" />
              </View>
              <Primary label={busy ? t("wait") : t("auth.savePassword")} disabled={busy || code.length < 6 || password.length < 6} onPress={saveNewPassword} />
              <Pressable onPress={sendCode} disabled={busy} style={st.linkBtn}><Text style={st.linkTxt}>{t("auth.resend")}</Text></Pressable>
            </>
          ) : (
            <Primary label={busy ? t("wait") : t("auth.sendCode")} disabled={busy || !email.includes("@")} onPress={sendCode} />
          )}
          <Pressable onPress={backToLogin} style={st.linkBtn}><Text style={st.linkMuted}>{t("auth.back")}</Text></Pressable>
        </ScrollView>
      </KeyboardAvoidingView>
    );
  }

  const submit = async () => {
    setBusy(true);
    setMsg(null);
    try {
      if (signup) {
        if (age < MIN_AGE) { setTooYoung(true); return; }
        const { data, error } = await supabase.auth.signUp({
          email: email.trim(),
          password,
          // the date of birth is not sent: only that you are old enough and accepted the rules
          options: { data: { username: cleanUser, name: cleanUser, age_ok: "true", terms: TERMS_VERSION } },
        });
        if (error) throw error;
        if (!data.session) {
          setMsg({ kind: "info", text: t("auth.checkEmail", { email: email.trim() }) });
          setMode("login");
        }
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
        if (error) throw error;
      }
    } catch (e) {
      setMsg({ kind: "error", text: explain(e) });
    } finally {
      setBusy(false);
    }
  };

  return (
    <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={{ flex: 1, backgroundColor: C.bg }}>
      <ScrollView contentContainerStyle={[st.wrap, { paddingTop: insets.top + 48, paddingBottom: insets.bottom + 24 }]} keyboardShouldPersistTaps="handled">
        <Text style={st.logo}>Stick<Text style={{ color: C.accent }}>back</Text></Text>
        <Text style={st.tag}>{t("tagline")}</Text>

        <View style={st.seg}>
          {[["signup", t("auth.signup")], ["login", t("auth.login")]].map(([k, l]) => (
            <Pressable key={k} style={[st.segBtn, mode === k && st.segOn]} onPress={() => { setMode(k); setMsg(null); }}>
              <Text style={[st.segTxt, mode === k && { color: C.fg }]}>{l}</Text>
            </Pressable>
          ))}
        </View>

        {signup && (
          <View style={st.field}>
            <Text style={st.lab}>{t("auth.username")}</Text>
            <TextInput value={username} onChangeText={setUsername} autoCapitalize="none" autoCorrect={false} maxLength={20}
              placeholder={t("auth.usernamePh")} placeholderTextColor={C.muted} style={st.input} textContentType="username" />
            <Text style={[st.hint, username && !userOk && { color: "#ff8a8a" }]}>
              {t("auth.usernameHint")}
            </Text>
          </View>
        )}
        <View style={st.field}>
          <Text style={st.lab}>{t("auth.email")}</Text>
          <TextInput value={email} onChangeText={setEmail} autoCapitalize="none" autoCorrect={false} keyboardType="email-address"
            placeholder={t("auth.emailPh")} placeholderTextColor={C.muted} style={st.input} textContentType="emailAddress" autoComplete="email" />
        </View>
        <View style={st.field}>
          <Text style={st.lab}>{t("auth.password")}</Text>
          <TextInput value={password} onChangeText={setPassword} secureTextEntry placeholder={t("auth.passwordPh")} placeholderTextColor={C.muted}
            style={st.input} textContentType={signup ? "newPassword" : "password"} autoComplete={signup ? "new-password" : "password"}
            returnKeyType="go" onSubmitEditing={() => canSend && submit()} />
        </View>

        {signup && <BirthDateField value={birth} onChange={(t) => { setBirth(t); setTooYoung(false); }} />}
        {signup && <RulesCheckbox checked={rules} onToggle={() => setRules(!rules)} />}
        {tooYoung && <Text style={[st.msg, st.err]}>{t("auth.tooYoung", { age: MIN_AGE })}</Text>}

        {msg && <Text style={[st.msg, msg.kind === "error" ? st.err : st.info]}>{msg.text}</Text>}

        <Primary label={busy ? t("wait") : signup ? t("auth.signup") : t("auth.login")} disabled={!canSend} onPress={submit} />
        {!signup && (
          <Pressable onPress={() => { setMode("reset"); setMsg(null); setCodeSent(false); }} style={st.linkBtn}>
            <Text style={st.linkMuted}>{t("auth.forgot")}</Text>
          </Pressable>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const st = StyleSheet.create({
  wrap: { paddingHorizontal: 24, gap: 16, maxWidth: 480, width: "100%", alignSelf: "center" },
  logo: { color: C.fg, fontFamily: F.display, fontSize: 40, letterSpacing: -1 },
  tag: { color: C.muted, fontFamily: F.medium, fontSize: 17, lineHeight: 23, marginBottom: 12 },
  seg: { flexDirection: "row", gap: 4, backgroundColor: C.surface, padding: 4, borderRadius: 12 },
  segBtn: { flex: 1, paddingVertical: 10, borderRadius: 9, alignItems: "center" },
  segOn: { backgroundColor: C.bg, borderWidth: 1, borderColor: C.line },
  segTxt: { color: C.muted, fontFamily: F.semi, fontSize: 14 },
  field: { gap: 6 },
  lab: { color: C.muted, fontFamily: F.semi, fontSize: 12, letterSpacing: 0.8 },
  input: { backgroundColor: C.surface, borderWidth: 1, borderColor: C.line, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 12, color: C.fg, fontFamily: F.medium, fontSize: 16 },
  hint: { color: C.muted, fontFamily: F.body, fontSize: 12 },
  msg: { fontFamily: F.medium, fontSize: 14, lineHeight: 20, borderRadius: 12, padding: 12 },
  err: { color: "#ffd6d6", backgroundColor: "#4a1f27" },
  info: { color: C.fg, backgroundColor: C.surface },
  title: { color: C.fg, fontFamily: F.display, fontSize: 24 },
  codeInput: { fontSize: 22, letterSpacing: 6, fontFamily: F.bold },
  linkBtn: { alignSelf: "center", padding: 8 },
  linkTxt: { color: C.accent, fontFamily: F.semi, fontSize: 14 },
  linkMuted: { color: C.muted, fontFamily: F.semi, fontSize: 14 },
});
