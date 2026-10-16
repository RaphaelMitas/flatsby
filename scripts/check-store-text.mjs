import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

const storeDir = join(import.meta.dirname, "../apps/expo/store");

const limits = {
  // Play's cap; the App Store allows 4000.
  "release_notes.txt": 500,
  "description.txt": 4000,
  "name.txt": 30,
  "subtitle.txt": 30,
  "keywords.txt": 100,
  "privacy_url.txt": Infinity,
  "support_url.txt": Infinity,
  "marketing_url.txt": Infinity,
  "play/title.txt": 30,
  "play/short_description.txt": 80,
};

const errors = [];
const locales = readdirSync(storeDir, { withFileTypes: true })
  .filter((entry) => entry.isDirectory())
  .map((entry) => entry.name);
for (const locale of locales) {
  for (const [file, limit] of Object.entries(limits)) {
    const path = join(storeDir, locale, file);
    if (!existsSync(path)) {
      errors.push(`${locale}/${file} is missing`);
      continue;
    }
    const length = [...readFileSync(path, "utf8").trimEnd()].length;
    if (length === 0) errors.push(`${locale}/${file} is empty`);
    if (length > limit) {
      errors.push(`${locale}/${file} has ${length} characters, limit ${limit}`);
    }
  }
}

if (errors.length > 0) {
  console.error(errors.join("\n"));
  process.exit(1);
}
