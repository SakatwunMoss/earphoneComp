/**
 * 診断・トップ診断導線用の和英コピー。
 * 表示は英語を上・日本語を下（案A）で並べる。
 */

export type BilingualCopy = {
  en: string;
  ja: string;
};

export const diagnoseCopy = {
  nav: {
    label: { en: "Find Your Match", ja: "好み診断" } satisfies BilingualCopy,
  },
  home: {
    heroSupport: {
      en: "Browse by brand, or take a short quiz to find earphones that fit you.",
      ja: "ブランド一覧から探すか、好み診断で相性のよい機種を見つけられます。",
    } satisfies BilingualCopy,
    startQuiz: {
      en: "Start the quiz",
      ja: "好み診断を始める",
    } satisfies BilingualCopy,
    browseBrands: {
      en: "Browse by brand",
      ja: "メーカーから探す",
    } satisfies BilingualCopy,
    promoEyebrow: {
      en: "Find Your Match",
      ja: "好み診断",
    } satisfies BilingualCopy,
    promoTitle: {
      en: "Find earphones that fit you in about a minute",
      ja: "1分で、あなたに合うイヤホンが見つかる",
    } satisfies BilingualCopy,
    promoBody: {
      en: "Answer a few questions about how you listen and your budget. We'll suggest matches you can compare right away.",
      ja: "使用シーンや予算など、いくつかの質問に答えるだけでおすすめを提案します。結果からそのまま比較もできます。",
    } satisfies BilingualCopy,
    promoCta: {
      en: "Start the quiz",
      ja: "診断をはじめる",
    } satisfies BilingualCopy,
    brandsHeading: {
      en: "Browse by brand",
      ja: "メーカーから探す",
    } satisfies BilingualCopy,
  },
  quiz: {
    title: { en: "Find Your Match", ja: "好み診断" } satisfies BilingualCopy,
    intro: {
      en: "Answer a few questions and we'll suggest earphones from our catalog that fit you.",
      ja: "いくつかの質問に答えると、登録機種から相性のよいイヤホンを提案します。",
    } satisfies BilingualCopy,
    questionProgress: (current: number, total: number): BilingualCopy => ({
      en: `Question ${current} of ${total}`,
      ja: `質問 ${current} / ${total}`,
    }),
    back: { en: "Back", ja: "戻る" } satisfies BilingualCopy,
    next: { en: "Next", ja: "次へ" } satisfies BilingualCopy,
    seeResults: { en: "See results", ja: "結果を見る" } satisfies BilingualCopy,
    questions: {
      scene: {
        en: "Where will you mostly use them?",
        ja: "主な使用シーンは？",
      } satisfies BilingualCopy,
      nc: {
        en: "Do you need noise cancelling?",
        ja: "ノイズキャンセリングは必要ですか？",
      } satisfies BilingualCopy,
      form: {
        en: "What style do you prefer?",
        ja: "装着スタイルの希望は？",
      } satisfies BilingualCopy,
      budget: {
        en: "What's your max budget?",
        ja: "予算の上限は？",
      } satisfies BilingualCopy,
      priorities: {
        en: "What matters most? (pick any)",
        ja: "特に重視するポイントは？（複数可）",
      } satisfies BilingualCopy,
      water: {
        en: "Do you need sweat / water resistance?",
        ja: "汗・水濡れ対策は必要ですか？",
      } satisfies BilingualCopy,
    },
    options: {
      scene: {
        commute: { en: "Commute", ja: "通勤・通学" } satisfies BilingualCopy,
        sport: {
          en: "Sports & workouts",
          ja: "スポーツ・運動",
        } satisfies BilingualCopy,
        wfh: {
          en: "Work from home / desk",
          ja: "在宅・デスクワーク",
        } satisfies BilingualCopy,
        game: { en: "Gaming", ja: "ゲーム" } satisfies BilingualCopy,
      },
      nc: {
        required: { en: "Must-have", ja: "必須" } satisfies BilingualCopy,
        preferred: {
          en: "Nice to have",
          ja: "あった方がいい",
        } satisfies BilingualCopy,
        none: { en: "Not needed", ja: "不要" } satisfies BilingualCopy,
      },
      form: {
        tws: {
          en: "True wireless preferred",
          ja: "完全ワイヤレス希望",
        } satisfies BilingualCopy,
        any: { en: "Either is fine", ja: "どちらでも" } satisfies BilingualCopy,
      },
      budget: {
        under_10000: {
          en: "Up to ¥10,000",
          ja: "〜1万円",
        } satisfies BilingualCopy,
        under_30000: {
          en: "Up to ¥30,000",
          ja: "〜3万円",
        } satisfies BilingualCopy,
        no_limit: {
          en: "¥30,000+ (no limit)",
          ja: "3万円以上（上限なし）",
        } satisfies BilingualCopy,
      },
      priorities: {
        sound: {
          en: "Sound quality",
          ja: "音質",
        } satisfies BilingualCopy,
        battery: {
          en: "Battery life",
          ja: "バッテリー持ち",
        } satisfies BilingualCopy,
        fit: {
          en: "Comfort & fit",
          ja: "装着感",
        } satisfies BilingualCopy,
        call: {
          en: "Call quality",
          ja: "通話品質",
        } satisfies BilingualCopy,
      },
      water: {
        needed: { en: "Needed", ja: "必要" } satisfies BilingualCopy,
        not_needed: { en: "Not needed", ja: "不要" } satisfies BilingualCopy,
      },
    },
  },
  results: {
    title: { en: "Your matches", ja: "診断結果" } satisfies BilingualCopy,
    intro: {
      en: "Here are scored picks based on your answers.",
      ja: "回答をもとにスコアリングしたおすすめ機種です。",
    } satisfies BilingualCopy,
    empty: {
      en: "No matches found. Try changing your answers and run the quiz again.",
      ja: "条件に合う機種が見つかりませんでした。条件を変えてもう一度お試しください。",
    } satisfies BilingualCopy,
    relaxed: {
      en: "No exact match. Here are close recommendations",
      ja: "完全一致は見つかりませんでした。近い条件のおすすめはこちら",
    } satisfies BilingualCopy,
    relaxedPrefix: {
      en: "Relaxed",
      ja: "緩和",
    } satisfies BilingualCopy,
    count: (n: number): BilingualCopy => ({
      en: `${n} picks (by score)`,
      ja: `おすすめ ${n} 件（スコア順）`,
    }),
    compareTop: (n: number): BilingualCopy => ({
      en: `Compare top ${n}`,
      ja: `上位${n}件を比較`,
    }),
    restart: {
      en: "Retake the quiz",
      ja: "もう一度診断する",
    } satisfies BilingualCopy,
    compareLimit: {
      en: "You can compare up to 3 models",
      ja: "比較は3機種まで選択できます",
    } satisfies BilingualCopy,
    compareHint: {
      en: "Check up to 3 models to compare.",
      ja: "チェックで最大3機種を選んで比較できます。",
    } satisfies BilingualCopy,
    addToCompare: {
      en: "Add to compare",
      ja: "比較に追加",
    } satisfies BilingualCopy,
    removeFromCompare: {
      en: "Remove",
      ja: "比較から外す",
    } satisfies BilingualCopy,
    score: (rank: number, score: number): BilingualCopy => ({
      en: `#${rank} · Score ${score}`,
      ja: `#${rank} · スコア ${score}`,
    }),
    price: { en: "Price", ja: "価格" } satisfies BilingualCopy,
    category: { en: "Category", ja: "カテゴリ" } satisfies BilingualCopy,
  },
  reasons: {
    hasNc: {
      en: "Has noise cancelling",
      ja: "ノイズキャンセリング搭載",
    } satisfies BilingualCopy,
    noNcMatch: {
      en: "Matches “no NC” preference",
      ja: "NCなしの希望に一致",
    } satisfies BilingualCopy,
    sceneMention: (scene: BilingualCopy, hits: string[]): BilingualCopy => {
      const hintJa =
        hits.length > 0 ? `（${hits.slice(0, 2).join("・")}）` : "";
      const hintEn =
        hits.length > 0 ? ` (${hits.slice(0, 2).join(", ")})` : "";
      return {
        en: `Mentions ${scene.en.toLowerCase()} use${hintEn}`,
        ja: `${scene.ja}向けの記述あり${hintJa}`,
      };
    },
    priorityMatch: (labels: BilingualCopy[]): BilingualCopy => ({
      en: `Priority match: ${labels.map((l) => l.en).join(", ")}`,
      ja: `重視ポイント一致: ${labels.map((l) => l.ja).join("・")}`,
    }),
    waterReady: {
      en: "Sweat / water resistance",
      ja: "汗・水濡れ対策あり",
    } satisfies BilingualCopy,
    inBudget: { en: "Within budget", ja: "予算内" } satisfies BilingualCopy,
    tws: {
      en: "True wireless",
      ja: "完全ワイヤレス",
    } satisfies BilingualCopy,
    closeMatch: {
      en: "Close match",
      ja: "条件に近い候補",
    } satisfies BilingualCopy,
  },
  relaxedFilters: {
    budget: { en: "Budget", ja: "予算" } satisfies BilingualCopy,
    ncRequired: {
      en: "Noise cancelling required",
      ja: "ノイズキャンセリング必須",
    } satisfies BilingualCopy,
    water: {
      en: "Water resistance",
      ja: "防水",
    } satisfies BilingualCopy,
  },
  meta: {
    title: { en: "Find Your Match", ja: "好み診断" } satisfies BilingualCopy,
    description: {
      en: "Answer a few questions about use case and budget to get earphone recommendations you can compare.",
      ja: "使用シーンや予算などの質問に答えて、相性のよいイヤホンを提案します。結果からそのまま比較もできます。",
    } satisfies BilingualCopy,
    breadcrumb: {
      en: "Find Your Match",
      ja: "好み診断",
    } satisfies BilingualCopy,
  },
} as const;

export type RelaxedFilterId = keyof typeof diagnoseCopy.relaxedFilters;
