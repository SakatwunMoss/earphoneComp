import type { Earphone } from "@/types/database";
import {
  diagnoseCopy,
  type BilingualCopy,
  type RelaxedFilterId,
} from "@/lib/diagnose/copy";
import {
  PRIORITY_KEYWORDS,
  SCENE_KEYWORDS,
  type PriorityId,
  type SceneId,
} from "@/lib/diagnose/tagKeywords";

export type NcPreference = "required" | "preferred" | "none";
export type FormPreference = "tws" | "any";
export type BudgetPreference = "under_10000" | "under_30000" | "no_limit";
export type WaterPreference = "needed" | "not_needed";

export type QuizAnswers = {
  scene: SceneId;
  nc: NcPreference;
  form: FormPreference;
  budget: BudgetPreference;
  priorities: PriorityId[];
  water: WaterPreference;
};

export type HardFilterFlags = {
  /** 予算上限を適用するか */
  budget: boolean;
  /** NC必須を適用するか */
  ncRequired: boolean;
  /** 防水必要を適用するか */
  waterNeeded: boolean;
};

export type ScoreBreakdown = {
  nc: number;
  scene: number;
  priorities: number;
  priceFit: number;
  /** シーンでヒットしたキーワード（表示用、最大数件） */
  sceneHits: string[];
  /** 重視ポイントでヒットした軸 */
  priorityHits: PriorityId[];
  matchedNc: boolean;
  matchedWater: boolean;
  matchedCategory: boolean;
  matchedBudget: boolean;
};

export type ScoredEarphone = {
  earphone: Earphone;
  score: number;
  breakdown: ScoreBreakdown;
  reasons: BilingualCopy[];
};

export type RecommendResult = {
  items: ScoredEarphone[];
  /** ハード条件を段階緩和した結果かどうか */
  relaxed: boolean;
  /** 緩和で外した条件のラベル（UI表示用） */
  relaxedFilters: BilingualCopy[];
};

const SCENE_SCORE_MAX = 25;
const PRIORITY_PER_AXIS = 15;
const PRIORITY_SCORE_MAX = 30;
const NC_PREFERRED_BONUS = 20;
const NC_NONE_BONUS = 10;
const PRICE_FIT_MAX = 5;
/** ゲーム軸は本文ヒットが薄いため、ANC搭載に軽い補助加点 */
const GAME_ANC_BONUS = 8;
const WATER_MIN_LIQUID_RATING = 4;

const UNKNOWN_WATER = new Set(["", "記載なし(要確認)"]);

/**
 * IPコードから液体侵入保護の数字を取り出す。
 * IPX4 → 4, IP54 → 4, IP68 → 8。不明は null。
 */
export function parseWaterLiquidRating(
  waterResistance: string | null,
): number | null {
  if (waterResistance == null) {
    return null;
  }
  const trimmed = waterResistance.trim();
  if (UNKNOWN_WATER.has(trimmed)) {
    return null;
  }

  const ipx = /^IPX(\d)$/i.exec(trimmed);
  if (ipx) {
    return Number(ipx[1]);
  }

  const ip = /^IP(\d)(\d)$/i.exec(trimmed);
  if (ip) {
    return Number(ip[2]);
  }

  return null;
}

function budgetMax(budget: BudgetPreference): number | null {
  switch (budget) {
    case "under_10000":
      return 10000;
    case "under_30000":
      return 30000;
    case "no_limit":
      return null;
  }
}

function textCorpus(earphone: Earphone): string {
  return [earphone.long_description, earphone.description]
    .filter((part): part is string => Boolean(part?.trim()))
    .join("\n");
}

function countKeywordHits(
  text: string,
  keywords: readonly string[],
): { scoreRatio: number; hits: string[] } {
  if (!text) {
    return { scoreRatio: 0, hits: [] };
  }
  const hits: string[] = [];
  for (const keyword of keywords) {
    if (text.includes(keyword)) {
      hits.push(keyword);
    }
  }
  if (keywords.length === 0) {
    return { scoreRatio: 0, hits };
  }
  // 1ヒットで十分な加点、複数ヒットで上限へ近づける
  const ratio = Math.min(1, hits.length / 2);
  return { scoreRatio: ratio, hits: hits.slice(0, 4) };
}

export function matchesHardFilters(
  earphone: Earphone,
  answers: QuizAnswers,
  flags: HardFilterFlags = {
    budget: true,
    ncRequired: true,
    waterNeeded: true,
  },
): boolean {
  if (answers.form === "tws" && earphone.category !== "完全ワイヤレス") {
    return false;
  }

  if (flags.budget) {
    const max = budgetMax(answers.budget);
    if (max != null) {
      if (earphone.price == null || earphone.price > max) {
        return false;
      }
    }
  }

  if (flags.ncRequired && answers.nc === "required") {
    if (!earphone.noise_cancelling) {
      return false;
    }
  }

  if (flags.waterNeeded && answers.water === "needed") {
    const rating = parseWaterLiquidRating(earphone.water_resistance);
    // null / 記載なし は needed 時のみ除外。not_needed ではここに来ない
    if (rating == null || rating < WATER_MIN_LIQUID_RATING) {
      return false;
    }
  }

  return true;
}

function priceFitScore(earphone: Earphone, answers: QuizAnswers): number {
  const max = budgetMax(answers.budget);
  if (max == null || earphone.price == null) {
    return 0;
  }
  // 上限に近いほどわずかに加点（同点崩し）
  const ratio = earphone.price / max;
  if (ratio > 1) {
    return 0;
  }
  return Math.round(PRICE_FIT_MAX * ratio);
}

export function scoreEarphone(
  earphone: Earphone,
  answers: QuizAnswers,
): { score: number; breakdown: ScoreBreakdown } {
  const corpus = textCorpus(earphone);

  let nc = 0;
  if (answers.nc === "preferred" && earphone.noise_cancelling) {
    nc = NC_PREFERRED_BONUS;
  } else if (answers.nc === "none" && !earphone.noise_cancelling) {
    nc = NC_NONE_BONUS;
  }

  const sceneKw = SCENE_KEYWORDS[answers.scene];
  const sceneMatch = countKeywordHits(corpus, sceneKw);
  let scene = Math.round(SCENE_SCORE_MAX * sceneMatch.scoreRatio);
  // ゲーム軸の補助: 本文が薄くても ANC があると没入用途に寄せる
  if (answers.scene === "game" && earphone.noise_cancelling) {
    scene = Math.min(SCENE_SCORE_MAX, scene + GAME_ANC_BONUS);
  }

  let prioritiesRaw = 0;
  const priorityHits: PriorityId[] = [];
  for (const priority of answers.priorities) {
    const match = countKeywordHits(corpus, PRIORITY_KEYWORDS[priority]);
    if (match.hits.length > 0) {
      prioritiesRaw += PRIORITY_PER_AXIS;
      priorityHits.push(priority);
    }
  }
  const priorities = Math.min(PRIORITY_SCORE_MAX, prioritiesRaw);

  const priceFit = priceFitScore(earphone, answers);

  const max = budgetMax(answers.budget);
  const matchedBudget =
    max == null || (earphone.price != null && earphone.price <= max);

  const waterRating = parseWaterLiquidRating(earphone.water_resistance);
  const matchedWater =
    answers.water !== "needed" ||
    (waterRating != null && waterRating >= WATER_MIN_LIQUID_RATING);

  const breakdown: ScoreBreakdown = {
    nc,
    scene,
    priorities,
    priceFit,
    sceneHits: sceneMatch.hits,
    priorityHits,
    matchedNc:
      answers.nc !== "required" || earphone.noise_cancelling === true,
    matchedWater,
    matchedCategory:
      answers.form !== "tws" || earphone.category === "完全ワイヤレス",
    matchedBudget,
  };

  const score = nc + scene + priorities + priceFit;
  return { score, breakdown };
}

/** breakdown と回答から UI 表示用のマッチ理由テキストを生成する */
export function formatMatchReasons(
  breakdown: ScoreBreakdown,
  answers: QuizAnswers,
): BilingualCopy[] {
  const reasons: BilingualCopy[] = [];
  const { reasons: reasonCopy, quiz } = diagnoseCopy;

  if (answers.nc === "required" && breakdown.matchedNc) {
    reasons.push(reasonCopy.hasNc);
  } else if (breakdown.nc > 0) {
    reasons.push(
      answers.nc === "none" ? reasonCopy.noNcMatch : reasonCopy.hasNc,
    );
  }

  if (breakdown.scene > 0) {
    reasons.push(
      reasonCopy.sceneMention(
        quiz.options.scene[answers.scene],
        breakdown.sceneHits,
      ),
    );
  }

  if (breakdown.priorityHits.length > 0) {
    const labels = breakdown.priorityHits.map(
      (id) => quiz.options.priorities[id],
    );
    reasons.push(reasonCopy.priorityMatch(labels));
  }

  if (answers.water === "needed" && breakdown.matchedWater) {
    reasons.push(reasonCopy.waterReady);
  }

  if (breakdown.matchedBudget && answers.budget !== "no_limit") {
    reasons.push(reasonCopy.inBudget);
  }

  if (answers.form === "tws" && breakdown.matchedCategory) {
    reasons.push(reasonCopy.tws);
  }

  if (reasons.length === 0) {
    reasons.push(reasonCopy.closeMatch);
  }

  return reasons;
}

type RelaxStep = {
  flags: HardFilterFlags;
  newlyRelaxed: RelaxedFilterId[];
};

function buildRelaxationSteps(answers: QuizAnswers): RelaxStep[] {
  const steps: RelaxStep[] = [
    {
      flags: { budget: true, ncRequired: true, waterNeeded: true },
      newlyRelaxed: [],
    },
  ];

  // 優先度: 予算 → NC → 防水（装着スタイルは緩和しない）
  const canRelaxBudget = answers.budget !== "no_limit";
  const canRelaxNc = answers.nc === "required";
  const canRelaxWater = answers.water === "needed";

  let flags: HardFilterFlags = {
    budget: true,
    ncRequired: true,
    waterNeeded: true,
  };

  if (canRelaxBudget) {
    flags = { ...flags, budget: false };
    steps.push({ flags, newlyRelaxed: ["budget"] });
  }
  if (canRelaxNc) {
    flags = { ...flags, ncRequired: false };
    steps.push({ flags, newlyRelaxed: ["ncRequired"] });
  }
  if (canRelaxWater) {
    flags = { ...flags, waterNeeded: false };
    steps.push({ flags, newlyRelaxed: ["water"] });
  }

  return steps;
}

function rankCandidates(
  earphones: Earphone[],
  answers: QuizAnswers,
  flags: HardFilterFlags,
  limit: number,
): ScoredEarphone[] {
  const scored: ScoredEarphone[] = [];

  for (const earphone of earphones) {
    if (!matchesHardFilters(earphone, answers, flags)) {
      continue;
    }
    const { score, breakdown } = scoreEarphone(earphone, answers);
    scored.push({
      earphone,
      score,
      breakdown,
      reasons: formatMatchReasons(breakdown, answers),
    });
  }

  scored.sort((a, b) => {
    if (b.score !== a.score) {
      return b.score - a.score;
    }
    const pa = a.earphone.price;
    const pb = b.earphone.price;
    if (pa == null && pb == null) return 0;
    if (pa == null) return 1;
    if (pb == null) return -1;
    return pa - pb;
  });

  return scored.slice(0, limit);
}

export function recommendEarphones(
  earphones: Earphone[],
  answers: QuizAnswers,
  limit = 5,
): RecommendResult {
  const steps = buildRelaxationSteps(answers);
  const accumulatedRelaxed: RelaxedFilterId[] = [];

  for (let i = 0; i < steps.length; i++) {
    const step = steps[i];
    if (i > 0) {
      accumulatedRelaxed.push(...step.newlyRelaxed);
    }

    const items = rankCandidates(earphones, answers, step.flags, limit);
    if (items.length > 0) {
      return {
        items,
        relaxed: i > 0,
        relaxedFilters:
          i > 0
            ? accumulatedRelaxed.map(
                (id) => diagnoseCopy.relaxedFilters[id],
              )
            : [],
      };
    }
  }

  return {
    items: [],
    relaxed: true,
    relaxedFilters: accumulatedRelaxed.map(
      (id) => diagnoseCopy.relaxedFilters[id],
    ),
  };
}
