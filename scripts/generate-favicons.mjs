/**
 * 小サイズ表示向けに簡略化したファビコンを生成する。
 * 元の favicon-source.png は細部が多く 16x16 / 32x32 では潰れるため、
 * 太い「E」＋ティール背景のシンプルなデザインから各サイズを出力する。
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import sharp from "sharp";
import toIco from "to-ico";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");

/** 16〜48px 向け。細部なしの太い E でタブ表示を鮮明に保つ */
const FAVICON_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="32" y2="32" gradientUnits="userSpaceOnUse">
      <stop offset="0%" stop-color="#2dd4bf"/>
      <stop offset="100%" stop-color="#0d9488"/>
    </linearGradient>
  </defs>
  <rect width="32" height="32" rx="5" fill="url(#bg)"/>
  <path fill="#f0fdfa" d="M8 7h14v3.5H11.5v3H20v3.5H11.5v3H22V23H8z"/>
</svg>`;

/** 180px 向け。角丸と軽い影でホーム画面追加時も視認性を確保 */
const APPLE_ICON_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 180 180">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="180" y2="180" gradientUnits="userSpaceOnUse">
      <stop offset="0%" stop-color="#2dd4bf"/>
      <stop offset="100%" stop-color="#0d9488"/>
    </linearGradient>
    <filter id="shadow" x="-10%" y="-10%" width="120%" height="120%">
      <feDropShadow dx="0" dy="2" stdDeviation="2" flood-color="#065f46" flood-opacity="0.35"/>
    </filter>
  </defs>
  <rect width="180" height="180" rx="28" fill="url(#bg)"/>
  <path fill="#ecfdf5" filter="url(#shadow)" d="M44 40h78v20H58v17h56v20H58v17h64v20H44z"/>
</svg>`;

async function renderPng(svg, size) {
  return sharp(Buffer.from(svg)).resize(size, size).png().toBuffer();
}

async function main() {
  const publicDir = join(root, "public");
  const appDir = join(root, "src", "app");
  mkdirSync(publicDir, { recursive: true });

  const sizes = [
    { name: "favicon-16x16.png", size: 16 },
    { name: "favicon-32x32.png", size: 32 },
    { name: "favicon-48x48.png", size: 48 },
  ];

  const pngBuffers = {};

  for (const { name, size } of sizes) {
    const buffer = await renderPng(FAVICON_SVG, size);
    pngBuffers[size] = buffer;
    writeFileSync(join(publicDir, name), buffer);
    console.log(`wrote public/${name}`);
  }

  const icon32 = pngBuffers[32];
  const icon16 = pngBuffers[16];
  const icon48 = pngBuffers[48];

  writeFileSync(join(appDir, "icon.png"), icon32);
  console.log("wrote src/app/icon.png");

  const appleBuffer = await renderPng(APPLE_ICON_SVG, 180);
  writeFileSync(join(publicDir, "apple-touch-icon.png"), appleBuffer);
  writeFileSync(join(appDir, "apple-icon.png"), appleBuffer);
  console.log("wrote public/apple-touch-icon.png & src/app/apple-icon.png");

  const icoBuffer = await toIco([icon16, icon32, icon48]);
  writeFileSync(join(appDir, "favicon.ico"), icoBuffer);
  console.log("wrote src/app/favicon.ico (16, 32, 48)");

  console.log("Done.");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
