// app.json is the real config. With STICKBACK_FREE=1 (install on your iPhone with a free Apple account):
//  - the push permission is removed, because free accounts can't sign it;
//  - the app gets its own identifier and Florin's personal team, so Xcode can make the signing profile by itself.
// The plugin goes first in the list because the first plugin's changes are applied last.
module.exports = ({ config }) => {
  if (process.env.STICKBACK_FREE !== "1") return config;
  return {
    ...config,
    ios: { ...config.ios, bundleIdentifier: "com.florinvanroomen.stickback", appleTeamId: "NZTN5DH57B" },
    plugins: ["./plugins/free-apple-account.js", ...(config.plugins ?? [])],
  };
};
