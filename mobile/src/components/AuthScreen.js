import { useState } from "react";
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { supabase } from "../lib/supabase.js";
import { C, F } from "../theme.js";
import { Primary } from "./ui.js";
import { BirthDateField, RulesCheckbox } from "./Safety.js";
import { MIN_AGE, TERMS_VERSION, ageFrom } from "../lib/util.js";

const USERNAME = /^[a-z0-9._]{3,20}$/;

// Supabase error messages, in words people understand
function explain(error) {
  const m = (error?.message || "").toLowerCase();
  if (m.includes("invalid login credentials")) return "Email o password sbagliate.";
  if (m.includes("email not confirmed")) return "Prima conferma l'email: apri il link che ti abbiamo mandato, poi accedi.";
  if (m.includes("already registered") || m.includes("already been registered")) return "Esiste già un account con questa email. Accedi.";
  if (m.includes("password") && m.includes("characters")) return "La password deve avere almeno 6 caratteri.";
  if (m.includes("rate limit") || m.includes("too many")) return "Troppi tentativi in poco tempo. Riprova tra qualche minuto.";
  if (m.includes("network") || m.includes("fetch")) return "Connessione assente. Controlla internet e riprova.";
  if (m.includes("database error saving new user")) return "Questo nome utente non è ammesso. Scegline un altro.";
  return error?.message || "Qualcosa non ha funzionato. Riprova.";
}

export default function AuthScreen() {
  const insets = useSafeAreaInsets();
  const [mode, setMode] = useState("signup"); // "signup" | "login"
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
          setMsg({ kind: "info", text: `Ti abbiamo mandato un'email a ${email.trim()}. Apri il link per confermare, poi torna qui e accedi.` });
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
        <Text style={st.tag}>Racconta un problema.{"\n"}Ti rispondono solo con sticker.</Text>

        <View style={st.seg}>
          {[["signup", "Crea account"], ["login", "Accedi"]].map(([k, l]) => (
            <Pressable key={k} style={[st.segBtn, mode === k && st.segOn]} onPress={() => { setMode(k); setMsg(null); }}>
              <Text style={[st.segTxt, mode === k && { color: C.fg }]}>{l}</Text>
            </Pressable>
          ))}
        </View>

        {signup && (
          <View style={st.field}>
            <Text style={st.lab}>NOME UTENTE</Text>
            <TextInput value={username} onChangeText={setUsername} autoCapitalize="none" autoCorrect={false} maxLength={20}
              placeholder="es. florin.vr" placeholderTextColor={C.muted} style={st.input} textContentType="username" />
            <Text style={[st.hint, username && !userOk && { color: "#ff8a8a" }]}>
              Da 3 a 20 caratteri: lettere minuscole, numeri, punto e trattino basso.
            </Text>
          </View>
        )}
        <View style={st.field}>
          <Text style={st.lab}>EMAIL</Text>
          <TextInput value={email} onChangeText={setEmail} autoCapitalize="none" autoCorrect={false} keyboardType="email-address"
            placeholder="tu@email.com" placeholderTextColor={C.muted} style={st.input} textContentType="emailAddress" autoComplete="email" />
        </View>
        <View style={st.field}>
          <Text style={st.lab}>PASSWORD</Text>
          <TextInput value={password} onChangeText={setPassword} secureTextEntry placeholder="Almeno 6 caratteri" placeholderTextColor={C.muted}
            style={st.input} textContentType={signup ? "newPassword" : "password"} autoComplete={signup ? "new-password" : "password"}
            returnKeyType="go" onSubmitEditing={() => canSend && submit()} />
        </View>

        {signup && <BirthDateField value={birth} onChange={(t) => { setBirth(t); setTooYoung(false); }} />}
        {signup && <RulesCheckbox checked={rules} onToggle={() => setRules(!rules)} />}
        {tooYoung && <Text style={[st.msg, st.err]}>Stickback è per chi ha almeno {MIN_AGE} anni. Per ora non puoi creare un account.</Text>}

        {msg && <Text style={[st.msg, msg.kind === "error" ? st.err : st.info]}>{msg.text}</Text>}

        <Primary label={busy ? "Un attimo…" : signup ? "Crea account" : "Accedi"} disabled={!canSend} onPress={submit} />
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
});
