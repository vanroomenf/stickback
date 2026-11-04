// app.json is the real config. With STICKBACK_FREE=1 (install on your iPhone with a free Apple account)
// the push permission is removed, because free accounts can't sign it.
// The plugin goes first in the list because the first plugin's changes are applied last.
module.exports = ({ config }) => {
  if (process.env.STICKBACK_FREE !== "1") return config;
  return { ...config, plugins: ["./plugins/free-apple-account.js", ...(config.plugins ?? [])] };
};
