import "@formatjs/intl-pluralrules/polyfill.js";
import "@formatjs/intl-pluralrules/locale-data/de.js";
import "@formatjs/intl-pluralrules/locale-data/en.js";

import { Platform } from "react-native";
import { ReadableStream } from "web-streams-polyfill";

if (Platform.OS !== "web") {
  const setupPolyfills = async () => {
    const { polyfillGlobal } =
      await import("react-native/Libraries/Utilities/PolyfillFunctions");
    const { TextEncoderStream, TextDecoderStream } =
      await import("@stardazed/streams-text-encoding");
    if (!("ReadableStream" in global)) {
      polyfillGlobal("ReadableStream", () => ReadableStream);
    }
    polyfillGlobal("TextEncoderStream", () => TextEncoderStream);
    polyfillGlobal("TextDecoderStream", () => TextDecoderStream);
  };
  void setupPolyfills();
}
