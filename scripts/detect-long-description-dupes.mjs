// long_description 内の文どうしの重複検出（検出のみ・JSONは変更しない）
//
//   node scripts/detect-long-description-dupes.mjs
//   THRESHOLD=0.29 node scripts/detect-long-description-dupes.mjs
//
// 既定閾値 0.29: 文字2-gram Jaccard。0.5 では重点10件のうち4件が漏れ、
// 下げると全体ペア増はわずか（検証時 14→22）だったため調整。

import { existsSync, readFileSync, mkdirSync, writeFileSync } from "fs";
import { dirname, resolve } from "path";

const THRESHOLD = Number(process.env.THRESHOLD ?? "0.29");
const FOCUS = [
  "Jabra|Elite 5",
  "Sennheiser|MOMENTUM True Wireless 4",
  "Sennheiser|MOMENTUM Sport",
  "Sennheiser|CX Plus True Wireless",
  "Sony|LinkBuds Open",
  "Shure|AONIC 4",
  "Shure|AONIC 215 Gen 2",
  "Shure|AONIC 3",
  "JBL|TUNE BEAM 2",
  "JBL|Wave Buds 2",
];

function charBigrams(text) {
  const set = new Set();
  for (let i = 0; i < text.length - 1; i++) {
    set.add(text.slice(i, i + 2));
  }
  return set;
}

export function jaccardBigram(a, b) {
  const A = charBigrams(a);
  const B = charBigrams(b);
  if (A.size === 0 && B.size === 0) return 1;
  let inter = 0;
  for (const g of A) {
    if (B.has(g)) inter++;
  }
  const union = A.size + B.size - inter;
  return union === 0 ? 0 : inter / union;
}

export function splitSentences(text) {
  return String(text ?? "")
    .split(/[。！？\n]+/u)
    .map((s) => s.trim())
    .filter((s) => s.length >= 8);
}

export function findDuplicateSentencePairs(text, threshold = THRESHOLD) {
  const sentences = splitSentences(text);
  const pairs = [];
  for (let i = 0; i < sentences.length; i++) {
    for (let j = i + 1; j < sentences.length; j++) {
      const score = jaccardBigram(sentences[i], sentences[j]);
      if (score >= threshold) {
        pairs.push({
          a: sentences[i],
          b: sentences[j],
          similarity: Number(score.toFixed(4)),
        });
      }
    }
  }
  return pairs;
}

function main() {
  const jsonPath = resolve(process.cwd(), "scripts/data/long-descriptions.json");
  if (!existsSync(jsonPath)) {
    console.error(`not found: ${jsonPath}`);
    process.exit(1);
  }
  const data = JSON.parse(readFileSync(jsonPath, "utf-8"));

  console.log(`threshold=${THRESHOLD} (char 2-gram Jaccard)`);
  console.log(
    "note: 0.5 では LinkBuds Open / AONIC 215 Gen 2 / TUNE BEAM 2 / Wave Buds 2 が漏れるため 0.29 に調整",
  );

  const all = [];
  for (const [key, text] of Object.entries(data)) {
    const pairs = findDuplicateSentencePairs(text, THRESHOLD);
    for (const p of pairs) {
      all.push({ key, ...p });
    }
  }

  console.log(`\n全件ヒット: ${all.length}ペア / ${new Set(all.map((x) => x.key)).size}機種\n`);

  console.log("--- 重点10件 ---");
  let focusHits = 0;
  for (const key of FOCUS) {
    const pairs = findDuplicateSentencePairs(data[key] ?? "", THRESHOLD);
    const ok = pairs.length > 0;
    if (ok) focusHits++;
    console.log(`${ok ? "HIT" : "MISS"} ${key} (${pairs.length})`);
    for (const p of pairs) {
      console.log(`  sim=${p.similarity}`);
      console.log(`  A: ${p.a}`);
      console.log(`  B: ${p.b}`);
    }
  }
  console.log(`\n重点カバレッジ: ${focusHits}/${FOCUS.length}`);

  const out = {
    threshold: THRESHOLD,
    focusCoverage: `${focusHits}/${FOCUS.length}`,
    pairs: all,
  };
  const outPath = resolve(
    process.cwd(),
    "scripts/tmp/long-description-dupes.json",
  );
  mkdirSync(dirname(outPath), { recursive: true });
  writeFileSync(outPath, JSON.stringify(out, null, 2) + "\n", "utf-8");
  console.log(`\n出力: ${outPath}`);
}

main();
