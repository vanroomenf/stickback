import { giphy } from "./lib/stickers.js";

const S = (id, file) => giphy(id, "img", file);

// A few GIPHY stickers shown in "I miei" until you have your own
export const exampleStickers = () => [
  S("7tjJBKwoDBxoj6nsrV"), S("9dpRdBxidjDOBt3NpM"), S("tr4TTyG4BjxfDioymO"), S("gF92QJVGxi3IZDVzDy"),
  S("Xnc4pmKdiS9bLzsMRk"), S("3oKIPuWIyL38g3pWSs"), S("DflFs8DrNVZNXFdkh8", "giphy-downsized-medium.gif"), S("WeE0UodPY4iAgwRpLK"),
].map((st) => ({ ...st, example: true }));
