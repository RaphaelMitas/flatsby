import type { Messages } from "../../messages";

export const settings = {
  language: {
    title: "Sprache",
    description: "Wähle die Sprache, in der Flatsby in diesem Browser angezeigt wird.",
    system: "Wie im Browser",
  },
} satisfies Messages["settings"];
