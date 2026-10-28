// Inline module Swift sits outside ios/, so the fingerprint misses it without this
/** @type {import('expo/fingerprint').Config} */
module.exports = {
  extraSources: [{ type: "dir", filePath: "siri", reasons: ["inlineModules"] }],
};
