import { useEffect, useState } from "react";
import { StatusBar } from "expo-status-bar";
import { ActivityIndicator, View } from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { useFonts } from "expo-font";
import { Onest_400Regular, Onest_500Medium, Onest_600SemiBold, Onest_700Bold, Onest_800ExtraBold } from "@expo-google-fonts/onest";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { supabase } from "./src/lib/supabase.js";
import AuthScreen from "./src/components/AuthScreen.js";
import Intro from "./src/components/Intro.js";
import StickbackApp from "./src/StickbackApp.js";
import { ThemeProvider, useTheme } from "./src/theme.js";
import { loadLanguage, onLanguageChange } from "./src/i18n/index.js";

const INTRO_KEY = "stickback.introSeen";

export default function App() {
  return (
    <SafeAreaProvider>
      <ThemeProvider>
        <Root />
      </ThemeProvider>
    </SafeAreaProvider>
  );
}

function Root() {
  const { C } = useTheme();
  const [fontsReady, fontError] = useFonts({ Onest_400Regular, Onest_500Medium, Onest_600SemiBold, Onest_700Bold, Onest_800ExtraBold });
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
    <>
      <StatusBar style={C.dark ? "light" : "dark"} />
      {!ready ? (
        <View style={{ flex: 1, backgroundColor: C.bg, alignItems: "center", justifyContent: "center" }}>
          <ActivityIndicator color={C.muted} />
        </View>
      ) : !introSeen ? (
        <Intro key={langKey} onDone={finishIntro} />
      ) : session ? (
        <StickbackApp key={session.user.id + langKey} userId={session.user.id} />
      ) : (
        <AuthScreen key={langKey} />
      )}
    </>
  );
}
