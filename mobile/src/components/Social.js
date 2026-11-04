// Feed header: the wordmark and the categories as text tabs, on the colour of the problem on screen
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { categories } from "../lib/api.js";
import { t } from "../i18n/index.js";
import { F } from "../theme.js";
import { Logo } from "./ui.js";

export const TOPBAR_HEIGHT = 92;

export function FeedHeader({ topInset, category, onCategory, tone }) {
  return (
    <View style={[st.bar, { paddingTop: topInset + 10, backgroundColor: tone.bg, borderColor: tone.line }]}>
      <View style={st.row}><Logo color={tone.fg} /></View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={st.tabs}>
        {[[null, t("cat.all")], ...categories()].map(([k, l]) => {
          const on = category === k;
          return (
            <Pressable key={l} onPress={() => onCategory(k)} style={st.tab} accessibilityRole="tab" accessibilityState={{ selected: on }}>
              <Text style={[st.tabTxt, { color: on ? tone.fg : tone.muted, fontFamily: on ? F.bold : F.medium }]}>{l}</Text>
              <View style={[st.under, { backgroundColor: on ? tone.fg : "transparent" }]} />
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
}

const st = StyleSheet.create({
  bar: { position: "absolute", top: 0, left: 0, right: 0, borderBottomWidth: StyleSheet.hairlineWidth },
  row: { paddingHorizontal: 20, paddingBottom: 6 },
  tabs: { paddingHorizontal: 20, gap: 20 },
  tab: { paddingTop: 8, minHeight: 40, justifyContent: "space-between" },
  tabTxt: { fontSize: 15 },
  under: { height: 2, borderRadius: 1, marginTop: 8 },
});
