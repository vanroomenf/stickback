// Build every Expo module on the Mac from its source code, instead of using the copies Expo ships already built.
// The ready-made copies can be built for a newer Expo core than the one installed, and then the app
// closes as soon as it opens ("Symbol not found … ExpoModulesJSI"). From source, all pieces match.
const { withPodfileProperties } = require("expo/config-plugins");

module.exports = (config) =>
  withPodfileProperties(config, (c) => {
    c.modResults.EXPO_USE_PRECOMPILED_MODULES = "false";
    return c;
  });
