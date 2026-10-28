import { useEffect, useMemo, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, TextInput, useWindowDimensions, View } from "react-native";
import { searchGiphy } from "../lib/giphy.js";
import { categories } from "../lib/api.js";
import { LANGUAGES, lang, t } from "../i18n/index.js";
import { nextId } from "../lib/util.js";
import { C, F } from "../theme.js";
import { Primary, Sheet, StickerCard, StickerImage } from "./ui.js";

const SOURCES = ["mine", "stickers", "gifs"];
const GIPHY_ERRORS = ["badkey", "ratelimit", "network"];

function GiphyPicker({ kind, selected, onSelect, cell }) {
  const [query, setQuery] = useState("");
  const [debounced, setDebounced] = useState("");
  const [state, setState] = useState({ status: "idle", items: [] });

  useEffect(() => { setQuery(""); setDebounced(""); setState({ status: "idle", items: [] }); }, [kind]);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(query), 350);
    return () => clearTimeout(t);
  }, [query]);
  useEffect(() => {
    const ctrl = new AbortController();
    setState((s) => ({ ...s, status: "loading" }));
    searchGiphy({ kind, query: debounced, signal: ctrl.signal })
      .then((items) => setState({ status: "done", items }))
      .catch((e) => { if (e.name !== "AbortError") setState({ status: e.code || "network", items: [] }); });
    return () => ctrl.abort();
  }, [kind, debounced]);

  const q = debounced.trim();
  let body;
  if (state.status === "loading" && !state.items.length) body = <Text style={st.gmsg}>{t("giphy.loading")}</Text>;
  else if (GIPHY_ERRORS.includes(state.status)) body = <Text style={st.gmsg}>{t(`giphy.${state.status}`)}</Text>;
  else if (!state.items.length) body = <Text style={st.gmsg}>{q ? t("giphy.noResultsFor", { q }) : t("giphy.noResults")}</Text>;
  else body = (
    <ScrollView style={{ maxHeight: cell * 3.4 }} nestedScrollEnabled keyboardShouldPersistTaps="handled">
      <View style={st.grid}>
        {state.items.map((g) => (
          <Pressable key={g.id} onPress={() => onSelect(g)} accessibilityLabel={g.title || t("giphy.result")}
            style={[st.gitem, { width: cell, height: cell, padding: kind === "gifs" ? 0 : cell * 0.12 }, selected?.v === g.v && st.on]}>
            <StickerImage sticker={g} thumb style={{ width: "100%", height: "100%" }} />
          </Pressable>
        ))}
      </View>
    </ScrollView>
  );

  return (
    <View style={{ gap: 10 }}>
      <TextInput value={query} onChangeText={setQuery} placeholder={kind === "gifs" ? t("giphy.searchGif") : t("giphy.searchSticker")}
        placeholderTextColor={C.muted} style={st.input} autoCorrect={false} returnKeyType="search" />
      {body}
      <Text style={st.attrib}>POWERED BY GIPHY</Text>
    </View>
  );
}

export function ReplySheet({ visible, problem, myStickers, lastAdded, onClose, onPublish, onAddStickers, onPaste }) {
  const { width } = useWindowDimensions();
  const previewId = useMemo(nextId, [problem?.id, visible]);
  const [caption, setCaption] = useState("");
  const [sticker, setSticker] = useState(myStickers[0]);
  const [src, setSrc] = useState("mine");

  useEffect(() => { if (visible) { setCaption(""); setSrc("mine"); setSticker((s) => s || myStickers[0]); } }, [visible]); // eslint-disable-line react-hooks/exhaustive-deps
  // A sticker you just added becomes the selected one
  useEffect(() => { if (lastAdded) { setSticker(lastAdded); setSrc("mine"); } }, [lastAdded]);

  const inner = Math.min(width, 560) - 40;
  const cell = (inner - 20) / 3;
  const chip = 52;
  const text = caption.trim();
  const current = sticker || myStickers[0];
  const publish = () => { if (text && current) onPublish({ id: previewId, sticker: current, caption: text }); };

  return (
    <Sheet visible={visible} title={t("reply.title")} onClose={onClose}>
      {problem && <Text style={st.sub} numberOfLines={2}>{t("reply.to", { text: problem.text })}</Text>}
      {current && (
        <View style={{ alignSelf: "center" }}>
          <StickerCard size={Math.min(inner * 0.44, 170)} placeholder={!text}
            meme={{ id: previewId, sticker: current, caption: text || t("reply.preview") }} />
        </View>
      )}
      <View style={{ gap: 6 }}>
        <Text style={st.lab}>{t("reply.yourText")}</Text>
        <TextInput value={caption} onChangeText={setCaption} maxLength={50} placeholder={t("reply.ph")}
          placeholderTextColor={C.muted} style={st.input} returnKeyType="send" onSubmitEditing={publish} />
      </View>

      <View style={st.seg}>
        {SOURCES.map((k) => [k, t(`src.${k}`)]).map(([k, l]) => (
          <Pressable key={k} style={[st.segBtn, src === k && st.segOn]} onPress={() => setSrc(k)} accessibilityRole="tab" accessibilityState={{ selected: src === k }}>
            <Text style={[st.segTxt, src === k && { color: C.fg }]}>{l}</Text>
          </Pressable>
        ))}
      </View>

      {src === "mine" ? (
        <View style={{ gap: 8 }}>
          <View style={st.chips}>
            <Pressable style={[st.chip, st.add, { width: chip, height: chip }]} onPress={onAddStickers} accessibilityLabel={t("reply.addGallery")}>
              <Text style={st.addTxt}>+</Text>
            </Pressable>
            <Pressable style={[st.chip, st.add, { width: chip, height: chip }]} onPress={onPaste} accessibilityLabel={t("profile.pasteLabel")}>
              <Text style={[st.addTxt, { fontSize: 18 }]}>⧉</Text>
            </Pressable>
            {myStickers.map((sk, i) => (
              <Pressable key={sk.v} onPress={() => setSticker(sk)} accessibilityLabel={t("reply.sticker", { n: i + 1 })}
                style={[st.chip, { width: chip, height: chip }, current?.v === sk.v && st.on]}>
                <StickerImage sticker={sk} thumb style={{ width: "82%", height: "82%" }} />
              </Pressable>
            ))}
          </View>
          <Text style={st.small}>{t("reply.note")}</Text>
        </View>
      ) : (
        <GiphyPicker kind={src} selected={current} onSelect={setSticker} cell={cell} />
      )}

      <Primary label={t("publish")} disabled={!text} onPress={publish} />
    </Sheet>
  );
}

export function ProblemSheet({ visible, onClose, onPublish }) {
  const [text, setText] = useState("");
  const [cat, setCat] = useState("altro");
  const [postLang, setPostLang] = useState(lang());
  useEffect(() => { if (visible) { setText(""); setCat("altro"); setPostLang(lang()); } }, [visible]);
  return (
    <Sheet visible={visible} title={t("problem.title")} onClose={onClose}>
      <Text style={st.sub}>{t("problem.sub")}</Text>
      <View style={{ gap: 6 }}>
        <Text style={st.lab}>{t("problem.what")}</Text>
        <TextInput value={text} onChangeText={setText} maxLength={140} multiline autoFocus
          placeholder={t("problem.ph")} placeholderTextColor={C.muted}
          style={[st.input, { minHeight: 84, textAlignVertical: "top" }]} />
        <Text style={[st.small, { alignSelf: "flex-end" }]}>{text.length} / 140</Text>
      </View>
      <View style={{ gap: 8 }}>
        <Text style={st.lab}>{t("problem.category")}</Text>
        <View style={st.cats}>
          {categories().map(([k, l]) => (
            <Pressable key={k} onPress={() => setCat(k)} style={[st.cat, cat === k && st.catOn]} accessibilityRole="radio" accessibilityState={{ selected: cat === k }}>
              <Text style={[st.catTxt, cat === k && { color: C.bg }]}>{l}</Text>
            </Pressable>
          ))}
        </View>
      </View>
      <View style={{ gap: 8 }}>
        <Text style={st.lab}>{t("problem.lang")}</Text>
        <View style={st.cats}>
          {LANGUAGES.map(([k, l]) => (
            <Pressable key={k} onPress={() => setPostLang(k)} style={[st.cat, postLang === k && st.catOn]} accessibilityRole="radio" accessibilityState={{ selected: postLang === k }}>
              <Text style={[st.catTxt, postLang === k && { color: C.bg }]}>{l}</Text>
            </Pressable>
          ))}
        </View>
      </View>
      <Primary label={t("publish")} disabled={!text.trim()} onPress={() => onPublish(text.trim(), cat, postLang)} />
    </Sheet>
  );
}

export function EditProfileSheet({ visible, profile, onClose, onSave }) {
  const [name, setName] = useState(profile.name);
  const [bio, setBio] = useState(profile.bio);
  useEffect(() => { if (visible) { setName(profile.name); setBio(profile.bio); } }, [visible]); // eslint-disable-line react-hooks/exhaustive-deps
  return (
    <Sheet visible={visible} title={t("edit.title")} onClose={onClose}>
      <View style={{ gap: 6 }}>
        <Text style={st.lab}>{t("edit.name")}</Text>
        <TextInput value={name} onChangeText={setName} maxLength={30} style={st.input} placeholderTextColor={C.muted} />
      </View>
      <View style={{ gap: 6 }}>
        <Text style={st.lab}>{t("edit.bio")}</Text>
        <TextInput value={bio} onChangeText={setBio} maxLength={100} multiline style={[st.input, { minHeight: 60, textAlignVertical: "top" }]} />
      </View>
      <Primary label={t("save")} onPress={() => onSave({ name: name.trim() || t("edit.defaultName"), bio: bio.trim() })} />
    </Sheet>
  );
}

const st = StyleSheet.create({
  sub: { color: C.muted, fontFamily: F.body, fontSize: 13, lineHeight: 18 },
  lab: { color: C.muted, fontFamily: F.semi, fontSize: 12, letterSpacing: 0.8 },
  input: { backgroundColor: C.bg, borderWidth: 1, borderColor: C.line, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 11, color: C.fg, fontFamily: F.medium, fontSize: 15 },
  seg: { flexDirection: "row", gap: 4, backgroundColor: C.bg, padding: 4, borderRadius: 12 },
  segBtn: { flex: 1, paddingVertical: 8, borderRadius: 9, alignItems: "center" },
  segOn: { backgroundColor: C.surface, borderWidth: 1, borderColor: C.line },
  segTxt: { color: C.muted, fontFamily: F.semi, fontSize: 13 },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  chip: { borderRadius: 12, backgroundColor: C.bg, alignItems: "center", justifyContent: "center", borderWidth: 2, borderColor: "transparent", overflow: "hidden" },
  add: { borderStyle: "dashed", borderColor: C.line },
  addTxt: { color: C.muted, fontSize: 22 },
  on: { borderColor: C.accent, borderWidth: 3 },
  small: { color: C.muted, fontFamily: F.body, fontSize: 12, lineHeight: 17 },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  gitem: { borderRadius: 14, backgroundColor: C.bg, overflow: "hidden", borderWidth: 0, borderColor: "transparent" },
  gmsg: { color: C.muted, fontFamily: F.body, fontSize: 13, lineHeight: 19, textAlign: "center", paddingVertical: 18 },
  cats: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  cat: { borderWidth: 1, borderColor: C.line, borderRadius: 99, paddingVertical: 7, paddingHorizontal: 13, backgroundColor: C.bg },
  catOn: { backgroundColor: C.fg, borderColor: C.fg },
  catTxt: { color: C.fg, fontFamily: F.semi, fontSize: 13 },
  attrib: { alignSelf: "flex-end", color: C.muted, fontFamily: F.bold, fontSize: 11, letterSpacing: 0.7 },
});
