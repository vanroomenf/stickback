import { useEffect, useMemo, useRef, useState } from "react";
import { Pressable, ScrollView, Text, TextInput, useWindowDimensions, View } from "react-native";
import { searchGiphy } from "../lib/giphy.js";
import { categories } from "../lib/api.js";
import { t } from "../i18n/index.js";
import { nextId } from "../lib/util.js";
import { F, useStyles, useTheme } from "../theme.js";
import { PasteIcon, PlusIcon, Primary, Sheet, StickerCard, StickerImage } from "./ui.js";

const SOURCES = ["mine", "stickers", "gifs"];
const GIPHY_ERRORS = ["badkey", "ratelimit", "network"];

function GiphyPicker({ kind, selected, onSelect, cell }) {
  const st = useStyles(makeStyles);
  const { C } = useTheme();
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
  const st = useStyles(makeStyles);
  const { C } = useTheme();
  const { width } = useWindowDimensions();
  const previewId = useMemo(nextId, [problem?.id, visible]);
  const [caption, setCaption] = useState("");
  const [sticker, setSticker] = useState(myStickers[0]);
  const [src, setSrc] = useState("mine");

  // a new problem starts empty; coming back to the same one (e.g. after making a sticker) keeps your text
  const lastPid = useRef(null);
  useEffect(() => {
    if (!visible) return;
    if (problem?.id !== lastPid.current) { setCaption(""); setSrc("mine"); lastPid.current = problem?.id; }
    setSticker((s) => s || myStickers[0]);
  }, [visible]); // eslint-disable-line react-hooks/exhaustive-deps
  // A sticker you just added becomes the selected one
  useEffect(() => { if (lastAdded) { setSticker(lastAdded); setSrc("mine"); } }, [lastAdded]);

  const inner = Math.min(width, 560) - 40;
  const cell = (inner - 20) / 3;
  const chip = 52;
  const text = caption.trim();
  const current = sticker || myStickers[0];
  const publish = () => {
    if (!text || !current) return;
    onPublish({ id: previewId, sticker: current, caption: text });
    lastPid.current = null; // next time starts empty
  };

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
          placeholderTextColor={C.muted} style={st.input} returnKeyType="done" submitBehavior="blurAndSubmit" />
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
              <PlusIcon color={C.fg} size={22} />
            </Pressable>
            <Pressable style={[st.chip, st.add, { width: chip, height: chip }]} onPress={onPaste} accessibilityLabel={t("profile.pasteLabel")}>
              <PasteIcon color={C.fg} size={21} />
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
  const st = useStyles(makeStyles);
  const { C } = useTheme();
  const [text, setText] = useState("");
  const [cat, setCat] = useState("altro");
  useEffect(() => { if (visible) { setText(""); setCat("altro"); } }, [visible]);
  return (
    <Sheet visible={visible} title={t("problem.title")} onClose={onClose}>
      <Text style={st.sub}>{t("problem.sub")}</Text>
      <View style={{ gap: 6 }}>
        <Text style={st.lab}>{t("problem.what")}</Text>
        <TextInput value={text} onChangeText={setText} maxLength={140} multiline autoFocus returnKeyType="done" submitBehavior="blurAndSubmit"
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
      <Primary label={t("publish")} disabled={!text.trim()} onPress={() => onPublish(text.trim(), cat)} />
    </Sheet>
  );
}

export function EditProfileSheet({ visible, profile, onClose, onSave }) {
  const st = useStyles(makeStyles);
  const { C } = useTheme();
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

const makeStyles = (C) => ({
  sub: { color: C.muted, fontFamily: F.body, fontSize: 14, lineHeight: 20 },
  lab: { color: C.muted, fontFamily: F.semi, fontSize: 12, letterSpacing: 0.6 },
  input: { backgroundColor: C.raised, borderRadius: 14, paddingHorizontal: 14, paddingVertical: 13, color: C.fg, fontFamily: F.medium, fontSize: 16 },
  seg: { flexDirection: "row", gap: 4, backgroundColor: C.raised, padding: 4, borderRadius: 12 },
  segBtn: { flex: 1, minHeight: 38, borderRadius: 9, alignItems: "center", justifyContent: "center" },
  segOn: { backgroundColor: C.surface },
  segTxt: { color: C.muted, fontFamily: F.semi, fontSize: 13 },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  chip: { borderRadius: 14, backgroundColor: C.raised, alignItems: "center", justifyContent: "center", borderWidth: 2, borderColor: "transparent", overflow: "hidden" },
  add: { backgroundColor: "transparent", borderWidth: 1.5, borderStyle: "dashed", borderColor: C.muted },
  addTxt: { color: C.fg, fontSize: 22 },
  on: { borderColor: C.fg, borderWidth: 2.5 },
  small: { color: C.muted, fontFamily: F.body, fontSize: 12.5, lineHeight: 18 },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  gitem: { borderRadius: 14, backgroundColor: C.raised, overflow: "hidden", borderWidth: 0, borderColor: "transparent" },
  gmsg: { color: C.muted, fontFamily: F.body, fontSize: 14, lineHeight: 20, textAlign: "center", paddingVertical: 18 },
  cats: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  cat: { borderRadius: 999, minHeight: 38, paddingHorizontal: 15, justifyContent: "center", backgroundColor: C.raised },
  catOn: { backgroundColor: C.fg },
  catTxt: { color: C.fg, fontFamily: F.medium, fontSize: 14 },
  attrib: { alignSelf: "flex-end", color: C.muted, fontFamily: F.bold, fontSize: 11, letterSpacing: 0.7 },
});
