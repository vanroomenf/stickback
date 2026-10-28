// Feed header: logo and the category filter
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { categories } from "../lib/api.js";
import { t } from "../i18n/index.js";
import { C, F } from "../theme.js";

export const TOPBAR_HEIGHT = 84;

export function FeedHeader({ topInset, category, onCategory }) {
  return (
    <View style={[st.bar, { paddingTop: topInset + 8 }]}>
      <View style={st.row}>
        <Text style={st.logo}>Stick<Text style={{ color: C.accent }}>back</Text></Text>
      </View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={st.chips}>
        {[[null, t("cat.all")], ...categories()].map(([k, l]) => (
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

const st = StyleSheet.create({
  bar: { position: "absolute", top: 0, left: 0, right: 0, backgroundColor: C.bg, paddingBottom: 8, gap: 8 },
  row: { flexDirection: "row", alignItems: "center", gap: 14, paddingHorizontal: 16 },
  logo: { color: C.fg, fontFamily: F.display, fontSize: 21, letterSpacing: -0.4 },
  chips: { gap: 7, paddingHorizontal: 16 },
  chip: { borderWidth: 1, borderColor: C.line, borderRadius: 99, paddingVertical: 5, paddingHorizontal: 12 },
  chipOn: { backgroundColor: C.fg, borderColor: C.fg },
  chipTxt: { color: C.muted, fontFamily: F.semi, fontSize: 13 },
  chipTxtOn: { color: C.bg },
  badge: { borderWidth: 1, borderColor: C.line, borderRadius: 99, paddingHorizontal: 8, paddingVertical: 1 },
  badgeTxt: { color: C.muted, fontFamily: F.semi, fontSize: 11 },
});
