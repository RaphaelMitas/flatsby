#!/usr/bin/env node
/**
 * Composes the store listing assets from the Maestro store-screenshot
 * captures: `node render.mjs <captures-dir> <out-dir>`.
 *
 * <captures-dir>/<platform>/<locale>/ holds one run of
 * apps/expo/e2e/screenshots/store-screenshots.yaml (full screens plus the
 * crop-* element captures). Writes, per store locale:
 *   <out>/<platform>/<store-locale>/NN.png   framed phone screenshots
 *   <out>/app-store/<store-locale>/{search,header}.png   iOS 27 creative assets
 *   <out>/play/<store-locale>/featureGraphic.png
 * The App Store and Play assets need iPhone captures; they are skipped without.
 */
import { readdirSync, readFileSync } from "node:fs";
import { mkdir, readFile } from "node:fs/promises";
import { createServer } from "node:http";
import { createRequire } from "node:module";
import { dirname, extname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "@playwright/test";

const [capturesArg, outArg] = process.argv.slice(2);
if (!capturesArg || !outArg) {
  console.error("Usage: node render.mjs <captures-dir> <out-dir>");
  process.exit(1);
}
const capturesDir = resolve(capturesArg);
const outDir = resolve(outArg);

const packageDir = dirname(fileURLToPath(import.meta.url));
const require = createRequire(import.meta.url);
const STORE_LOCALES = { en: "en-US", de: "de-DE" };

// Served paths the templates reference, mapped to files on disk.
const routes = {
  "/fonts/inter.woff2": () =>
    require.resolve("@fontsource-variable/inter/files/inter-latin-wght-normal.woff2"),
  "/brand/": (rest) => join(packageDir, "../../apps/expo/assets", rest),
  "/captures/": (rest) => join(capturesDir, rest),
  "/": (rest) => join(packageDir, rest),
};
const types = {
  ".html": "text/html",
  ".js": "text/javascript",
  ".json": "application/json",
  ".png": "image/png",
  ".woff2": "font/woff2",
};

const server = createServer(async (req, res) => {
  const path = decodeURIComponent(new URL(req.url ?? "/", "http://x").pathname);
  const prefix = Object.keys(routes).find((p) => path.startsWith(p));
  try {
    const file = routes[prefix](path.slice(prefix.length));
    const body = await readFile(file);
    res.writeHead(200, {
      "content-type": types[extname(file)] ?? "application/octet-stream",
    });
    res.end(body);
  } catch {
    res.writeHead(404);
    res.end();
  }
});
await new Promise((r) => server.listen(0, "127.0.0.1", r));
const { port } = server.address();
const base = `http://127.0.0.1:${port}`;

const browser = await chromium.launch();
const problems = [];

async function shoot(url, viewport, deviceScaleFactor, file) {
  const page = await browser.newPage({ viewport, deviceScaleFactor });
  page.on("pageerror", (e) => problems.push(`${url}: ${e.message}`));
  page.on("response", (r) => {
    if (r.status() >= 400) problems.push(`${url}: ${r.status()} ${r.url()}`);
  });
  await page.goto(`${base}${url}`);
  await page.waitForSelector("body[data-ready]", { timeout: 60_000 });
  await mkdir(dirname(file), { recursive: true });
  await page.screenshot({ path: file });
  await page.close();
  console.log(file);
}

// The phone screenshots render at the capture's own size, so each device
// class keeps its store resolution.
function pngSize(file) {
  const png = readFileSync(file);
  return { width: png.readUInt32BE(16), height: png.readUInt32BE(20) };
}

const frames = JSON.parse(
  readFileSync(join(packageDir, "screenshots/captions.json"), "utf8"),
);
const BANNERS = {
  search: { viewport: { width: 1920, height: 1280 }, scale: 2 },
  header: { viewport: { width: 1920, height: 823 }, scale: 2 },
};

for (const platform of readdirSync(capturesDir)) {
  for (const locale of readdirSync(join(capturesDir, platform))) {
    const storeLocale = STORE_LOCALES[locale];
    if (!storeLocale) continue;
    const captures = join(capturesDir, platform, locale);
    const viewport = pngSize(join(captures, "01-home.png"));
    for (const [i] of frames[locale].entries()) {
      await shoot(
        `/screenshots/template.html?frame=${i}&lang=${locale}&platform=${platform}`,
        viewport,
        1,
        join(
          outDir,
          platform,
          storeLocale,
          `${String(i + 1).padStart(2, "0")}.png`,
        ),
      );
    }
    if (platform !== "ios") continue;
    for (const [asset, { viewport: size, scale }] of Object.entries(BANNERS)) {
      await shoot(
        `/banners/template.html?asset=${asset}&lang=${locale}`,
        size,
        scale,
        join(outDir, "app-store", storeLocale, `${asset}.png`),
      );
    }
    await shoot(
      `/banners/template.html?asset=play&lang=${locale}`,
      { width: 1024, height: 500 },
      1,
      join(outDir, "play", storeLocale, "featureGraphic.png"),
    );
  }
}

await browser.close();
server.close();
if (problems.length > 0) {
  console.error(`Rendering problems:\n${problems.join("\n")}`);
  process.exit(1);
}
