// Colours, type and light/dark theme. The app follows the phone's light or dark setting.
//
// Base colours are for profile, sheets and settings; every problem in the feed takes the soft
// colour of its category instead (CAT). Ink is the text colour on that background, muted the
// secondary text; all pairs pass 4.5:1 contrast.
import { createContext, useContext, useMemo } from "react";
import { StyleSheet, useColorScheme } from "react-native";

const LIGHT = {
  dark: false,
  bg: "#FFF8F2", // warm white
  surface: "#FFFFFF",
  raised: "#F4ECE5", // inputs, chips, quiet buttons
  line: "rgba(30,22,17,0.10)",
  fg: "#1E1611",
  muted: "#6F625A",
  accent: "#F0441F", // tomato: the + button, stars you gave, the logo
  onAccent: "#FFFFFF",
  danger: "#C42B1C",
  gifBg: "#EFE6DE",
  scrim: "rgba(30,20,14,0.42)",
};

const DARK = {
  dark: true,
  bg: "#15120F",
  surface: "#201B18",
  raised: "#2B2521",
  line: "rgba(255,240,230,0.11)",
  fg: "#F7EFE9",
  muted: "#A89990",
  accent: "#FF6A45",
  onAccent: "#1A0B05",
  danger: "#FF8A7A",
  gifBg: "#0E0C0A",
  scrim: "rgba(0,0,0,0.6)",
};

// One colour per category, light and dark: [background, ink, muted]
const CAT = {
  scuola: { light: ["#FFE2CC", "#2A1308", "#7A4A33"], dark: ["#2A170D", "#FFE2CC", "#D9A88C"] },
  lavoro: { light: ["#FFF0B8", "#2B2205", "#6E5A12"], dark: ["#262008", "#FFF0B8", "#D2BE72"] },
  famiglia: { light: ["#DDF6E7", "#10241C", "#2F6B4B"], dark: ["#10241C", "#D8F5E3", "#8FC2A6"] },
  amore: { light: ["#FFDDE6", "#3A0B1A", "#8A3550"], dark: ["#2C0F18", "#FFDDE6", "#E09AAE"] },
  amici: { light: ["#DCEBFF", "#0C1E38", "#2F5788"], dark: ["#0E1B2E", "#DCEBFF", "#94B4DD"] },
  altro: { light: ["#E6DEFF", "#21153F", "#594A86"], dark: ["#1B1530", "#E6DEFF", "#ADA0DA"] },
};
const CAT_KEYS = Object.keys(CAT);

// Fonts: Onest everywhere, in five weights
export const F = {
  display: "Onest_800ExtraBold",
  bold: "Onest_700Bold",
  semi: "Onest_600SemiBold",
  medium: "Onest_500Medium",
  body: "Onest_400Regular",
};

function build(dark) {
  const C = dark ? DARK : LIGHT;
  const mode = dark ? "dark" : "light";
  // colours of a category: { bg, fg, muted, line }
  const cat = (k) => {
    const [bg, fg, muted] = (CAT[k] ?? CAT.altro)[mode];
    return {
      bg, fg, muted,
      line: dark ? "rgba(255,255,255,0.12)" : "rgba(0,0,0,0.10)",
      card: dark ? "rgba(255,255,255,0.07)" : "rgba(255,255,255,0.55)", // behind each reply
    };
  };
  // a stable soft colour per username, for avatars
  const person = (name = "") => {
    const h = [...name].reduce((a, c) => (a * 31 + c.charCodeAt(0)) % 997, 7);
    const { bg, fg } = cat(CAT_KEYS[h % CAT_KEYS.length]);
    return { bg, fg };
  };
  return { C, F, dark, cat, person };
}

const ThemeContext = createContext(build(false));

export function ThemeProvider({ children }) {
  const scheme = useColorScheme();
  const value = useMemo(() => build(scheme === "dark"), [scheme]);
  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export const useTheme = () => useContext(ThemeContext);

// Styles that depend on the theme: const st = useStyles(makeStyles), with makeStyles = (C) => ({ … })
export function useStyles(factory) {
  const { C } = useTheme();
  return useMemo(() => StyleSheet.create(factory(C)), [C, factory]);
}
