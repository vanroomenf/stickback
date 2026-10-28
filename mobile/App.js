import { useEffect, useState } from "react";
import { StatusBar } from "expo-status-bar";
import { ActivityIndicator, View } from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { useFonts } from "expo-font";
import { BricolageGrotesque_600SemiBold, BricolageGrotesque_800ExtraBold } from "@expo-google-fonts/bricolage-grotesque";
import { Figtree_400Regular, Figtree_500Medium, Figtree_600SemiBold, Figtree_700Bold } from "@expo-google-fonts/figtree";
import { supabase } from "./src/lib/supabase.js";
import AuthScreen from "./src/components/AuthScreen.js";
import StickbackApp from "./src/StickbackApp.js";
import { C } from "./src/theme.js";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { loadLanguage, onLanguageChange } from "./src/i18n/index.js";
import Intro from "./src/components/Intro.js";

const INTRO_KEY = "stickback.introSeen";

export default function App() {
  const [fontsReady, fontError] = useFonts({
    BricolageGrotesque_600SemiBold, BricolageGrotesque_800ExtraBold,
    Figtree_400Regular, Figtree_500Medium, Figtree_600SemiBold, Figtree_700Bold,
  });
  const [session, setSession] = useState(undefined); // undefined = still checking
  const [langReady, setLangReady] = useState(false);
  const [introSeen, setIntroSeen] = useState(null); // null = still checking
  const [langKey, setLangKey] = useState("");

  useEffect(() => {
    loadLanguage().finally(() => setLangReady(true));
    AsyncStorage.getItem(INTRO_KEY).then((v) => setIntroSeen(!!v)).catch(() => setIntroSeen(true));
    return onLanguageChange((code) => setLangKey(code)); // redraw every screen in the new language
  }, []);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session ?? null));
    const { data } = supabase.auth.onAuthStateChange((_event, s) => setSession(s ?? null));
    return () => data.subscription.unsubscribe();
  }, []);

  const ready = (fontsReady || fontError) && session !== undefined && langReady && introSeen !== null;
  const finishIntro = () => { setIntroSeen(true); AsyncStorage.setItem(INTRO_KEY, "1").catch(() => {}); };

  return (
    <SafeAreaProvider>
      <StatusBar style="light" />
      {!ready ? (
        <View style={{ flex: 1, backgroundColor: C.bg, alignItems: "center", justifyContent: "center" }}>
          <ActivityIndicator color={C.accent} />
        </View>
      ) : !introSeen ? (
        <Intro key={langKey} onDone={finishIntro} />
      ) : session ? (
        <StickbackApp key={session.user.id + langKey} userId={session.user.id} />
      ) : (
        <AuthScreen key={langKey} />
      )}
    </SafeAreaProvider>
  );
}
