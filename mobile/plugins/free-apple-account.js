// Free Apple account (Xcode "Personal Team"): it can't sign apps with push notifications,
// so for that build we take the push permission out. Everything else stays the same.
const { withEntitlementsPlist } = require("expo/config-plugins");

module.exports = (config) =>
  withEntitlementsPlist(config, (c) => {
    delete c.modResults["aps-environment"];
    return c;
  });
