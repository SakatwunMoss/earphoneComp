/**
 * 診断スコアリング用キーワード辞書。
 * long_description / description への部分一致で加点する。
 * ヒット率が低い軸は同義語を厚くして調整する。
 */

export type SceneId = "commute" | "sport" | "wfh" | "game";
export type PriorityId = "sound" | "battery" | "fit" | "call";

export const SCENE_KEYWORDS: Record<SceneId, readonly string[]> = {
  commute: [
    "通勤",
    "通学",
    "電車",
    "騒音",
    "遮音",
    "飛行機",
    "移動",
    "外出",
    "日常使い",
    "毎日",
  ],
  sport: [
    "スポーツ",
    "運動",
    "ジム",
    "ランニング",
    "ワークアウト",
    "汗",
    "トレーニング",
    "ラン",
    "固定力",
    "落下",
  ],
  wfh: [
    "在宅",
    "デスク",
    "会議",
    "テレワーク",
    "作業",
    "オフィス",
    "ビジネス",
    "デスクワーク",
    "室内",
    "仕事",
  ],
  // 「ゲーム」本文ヒットはほぼ0のため、低遅延・没入系の同義語でカバー
  game: [
    "ゲーム",
    "ゲーミング",
    "低遅延",
    "遅延",
    "FPS",
    "没入",
    "映画",
    "動画",
    "空間",
    "プレイ",
  ],
};

export const PRIORITY_KEYWORDS: Record<PriorityId, readonly string[]> = {
  sound: [
    "音質",
    "音作り",
    "解像度",
    "低音",
    "チューニング",
    "音",
    "カスタム",
    "モニター",
    "聞きやす",
  ],
  battery: [
    "バッテリー",
    "持ち",
    "長時間",
    "連続再生",
    "電池",
    "充電",
    "ケース込み",
  ],
  fit: [
    "装着",
    "フィット",
    "つけ心地",
    "圧迫",
    "落ちにく",
    "快適",
    "軽量",
    "密閉",
    "イヤー",
  ],
  call: [
    "通話",
    "マイク",
    "会議",
    "ビジネス",
    "通話品質",
    "電話",
    "会話",
  ],
};

import { diagnoseCopy } from "@/lib/diagnose/copy";

export const SCENE_LABELS: Record<SceneId, string> = {
  commute: diagnoseCopy.quiz.options.scene.commute.ja,
  sport: diagnoseCopy.quiz.options.scene.sport.ja,
  wfh: diagnoseCopy.quiz.options.scene.wfh.ja,
  game: diagnoseCopy.quiz.options.scene.game.ja,
};

export const PRIORITY_LABELS: Record<PriorityId, string> = {
  sound: diagnoseCopy.quiz.options.priorities.sound.ja,
  battery: diagnoseCopy.quiz.options.priorities.battery.ja,
  fit: diagnoseCopy.quiz.options.priorities.fit.ja,
  call: diagnoseCopy.quiz.options.priorities.call.ja,
};
