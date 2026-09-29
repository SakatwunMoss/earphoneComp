import type {
  BudgetPreference,
  FormPreference,
  NcPreference,
  WaterPreference,
} from "@/lib/diagnose/scoreEarphones";
import type { PriorityId, SceneId } from "@/lib/diagnose/tagKeywords";

export const DIAGNOSE_STORAGE_KEY = "earphone-diagnose-state:v1";
export const DIAGNOSE_RETURNING_KEY = "earphone-diagnose-returning:v1";
/** 読み取りは v1（selectedIds なし）も後方互換で受け付ける */
export const DIAGNOSE_STATE_VERSION = 2;
export const DIAGNOSE_STATE_TTL_MS = 24 * 60 * 60 * 1000;
export const DIAGNOSE_RETURNING_TTL_MS = 30 * 60 * 1000;
export const DIAGNOSE_MAX_COMPARE = 3;

const SCENE_IDS = new Set<SceneId>(["commute", "sport", "wfh", "game"]);
const NC_IDS = new Set<NcPreference>(["required", "preferred", "none"]);
const FORM_IDS = new Set<FormPreference>(["tws", "any"]);
const BUDGET_IDS = new Set<BudgetPreference>([
  "under_10000",
  "under_30000",
  "no_limit",
]);
const PRIORITY_IDS = new Set<PriorityId>(["sound", "battery", "fit", "call"]);
const WATER_IDS = new Set<WaterPreference>(["needed", "not_needed"]);
const ACCEPTED_STATE_VERSIONS = new Set([1, 2]);

export type PersistedDraft = {
  scene: SceneId | null;
  nc: NcPreference | null;
  form: FormPreference | null;
  budget: BudgetPreference | null;
  priorities: PriorityId[];
  water: WaterPreference | null;
};

export type PersistedDiagnoseState = {
  version: number;
  draft: PersistedDraft;
  stepIndex: number;
  finished: boolean;
  savedAt: number;
  /** 比較チェック中の機種 ID（v1 保存には無い場合あり） */
  selectedIds: string[];
};

type ReturningPayload = {
  at: number;
};

/** Strict Mode の二重マウントでも finished 復元を維持する（モジュールスコープ） */
let memoryRestoredFinished = false;

export function createInitialDraft(): PersistedDraft {
  return {
    scene: null,
    nc: null,
    form: null,
    budget: null,
    priorities: [],
    water: null,
  };
}

export function saveDiagnoseState(input: {
  draft: PersistedDraft;
  stepIndex: number;
  finished: boolean;
  selectedIds: string[];
}): void {
  try {
    const payload: PersistedDiagnoseState = {
      version: DIAGNOSE_STATE_VERSION,
      draft: input.draft,
      stepIndex: input.stepIndex,
      finished: input.finished,
      savedAt: Date.now(),
      selectedIds: input.finished
        ? sanitizeSelectedIds(input.selectedIds, null, DIAGNOSE_MAX_COMPARE)
        : [],
    };
    sessionStorage.setItem(DIAGNOSE_STORAGE_KEY, JSON.stringify(payload));
  } catch {
    // private mode / quota — ignore
  }
}

/**
 * 検証済みの保存データを返す。不正・期限切れなら破棄して null。
 */
export function loadDiagnoseState(
  stepCount: number,
): PersistedDiagnoseState | null {
  try {
    const raw = sessionStorage.getItem(DIAGNOSE_STORAGE_KEY);
    if (!raw) {
      return null;
    }
    const parsed: unknown = JSON.parse(raw);
    if (!isValidPersistedState(parsed, stepCount)) {
      clearDiagnoseState();
      return null;
    }
    if (Date.now() - parsed.savedAt > DIAGNOSE_STATE_TTL_MS) {
      clearDiagnoseState();
      return null;
    }
    return {
      ...parsed,
      version: DIAGNOSE_STATE_VERSION,
      selectedIds: normalizeSelectedIdsField(parsed),
    };
  } catch {
    clearDiagnoseState();
    return null;
  }
}

export function clearDiagnoseState(): void {
  try {
    sessionStorage.removeItem(DIAGNOSE_STORAGE_KEY);
    sessionStorage.removeItem(DIAGNOSE_RETURNING_KEY);
  } catch {
    // ignore
  }
  memoryRestoredFinished = false;
}

/** 詳細・比較など診断外ページへ進む直前に立てる（タイムスタンプ付き） */
export function markDiagnoseReturning(): void {
  try {
    const payload: ReturningPayload = { at: Date.now() };
    sessionStorage.setItem(DIAGNOSE_RETURNING_KEY, JSON.stringify(payload));
  } catch {
    // ignore
  }
}

export function isDiagnoseReturning(): boolean {
  try {
    const raw = sessionStorage.getItem(DIAGNOSE_RETURNING_KEY);
    if (!raw) {
      return false;
    }
    // 旧形式 "1" はタイムスタンプ無しのため無効扱い
    if (raw === "1") {
      clearDiagnoseReturning();
      return false;
    }
    const parsed: unknown = JSON.parse(raw);
    if (
      typeof parsed !== "object" ||
      parsed === null ||
      typeof (parsed as ReturningPayload).at !== "number" ||
      !Number.isFinite((parsed as ReturningPayload).at)
    ) {
      clearDiagnoseReturning();
      return false;
    }
    const at = (parsed as ReturningPayload).at;
    if (Date.now() - at > DIAGNOSE_RETURNING_TTL_MS) {
      clearDiagnoseReturning();
      return false;
    }
    return true;
  } catch {
    clearDiagnoseReturning();
    return false;
  }
}

export function clearDiagnoseReturning(): void {
  try {
    sessionStorage.removeItem(DIAGNOSE_RETURNING_KEY);
  } catch {
    // ignore
  }
}

/**
 * 診断・詳細・比較以外のパスに入ったとき用。
 * returning と「結果復元済み」メモリの両方を落とす。
 */
export function clearDiagnoseReturningOnForeignPath(): void {
  clearDiagnoseReturning();
  memoryRestoredFinished = false;
}

/**
 * finished の復元可否を決める。
 * - returning フラグ（詳細などから戻る想定）
 * - または同一タブ内で既に finished を復元済み（Strict Mode 対策）
 * returning はここでは消さない（偽アンマウント後も参照できるよう遅延クリアする）
 */
export function shouldRestoreFinished(): boolean {
  if (isDiagnoseReturning() || memoryRestoredFinished) {
    memoryRestoredFinished = true;
    return true;
  }
  return false;
}

export function markMemoryRestoredFinished(): void {
  memoryRestoredFinished = true;
}

export function clearMemoryRestoredFinished(): void {
  memoryRestoredFinished = false;
}

/**
 * 診断ページを離れるとき、詳細へ向かっていないなら
 * 「結果を復元済み」メモリだけ落とす。
 */
export function onDiagnosePageLeave(): void {
  if (isDiagnoseReturning()) {
    return;
  }
  memoryRestoredFinished = false;
}

/**
 * 存在する ID だけを順序維持で残し、上限件数に切り詰める。
 * availableIds が null のときは文字列配列として整形のみ（上限適用）。
 */
export function sanitizeSelectedIds(
  ids: unknown,
  availableIds: ReadonlySet<string> | readonly string[] | null,
  max: number = DIAGNOSE_MAX_COMPARE,
): string[] {
  if (!Array.isArray(ids) || max <= 0) {
    return [];
  }
  const available =
    availableIds == null
      ? null
      : availableIds instanceof Set
        ? availableIds
        : new Set(availableIds);
  const out: string[] = [];
  for (const id of ids) {
    if (typeof id !== "string" || id.length === 0) {
      continue;
    }
    if (available && !available.has(id)) {
      continue;
    }
    if (out.includes(id)) {
      continue;
    }
    out.push(id);
    if (out.length >= max) {
      break;
    }
  }
  return out;
}

export function selectedIdsEqual(a: string[], b: string[]): boolean {
  if (a.length !== b.length) {
    return false;
  }
  return a.every((id, index) => id === b[index]);
}

/** 診断結果を復元してよいパス（returning を維持） */
export function isDiagnoseRetainPath(pathname: string): boolean {
  if (pathname === "/diagnose" || pathname.startsWith("/diagnose/")) {
    return true;
  }
  if (pathname === "/compare" || pathname.startsWith("/compare/")) {
    return true;
  }
  const parts = pathname.split("/").filter(Boolean);
  // /brands/{brand}/{id}（機種詳細）および /brands/{brand}/compare
  return parts.length >= 3 && parts[0] === "brands";
}

/** 詳細・比較ページへの遷移かどうか（クリック時に returning を立てる） */
export function isDiagnoseResumeHref(href: string): boolean {
  try {
    const url = new URL(href, "https://example.invalid");
    return isDiagnoseRetainPath(url.pathname) && url.pathname !== "/diagnose";
  } catch {
    return false;
  }
}

function normalizeSelectedIdsField(state: {
  selectedIds?: unknown;
}): string[] {
  return sanitizeSelectedIds(state.selectedIds, null, DIAGNOSE_MAX_COMPARE);
}

function isValidPersistedState(
  value: unknown,
  stepCount: number,
): value is Omit<PersistedDiagnoseState, "selectedIds"> & {
  selectedIds?: unknown;
} {
  if (typeof value !== "object" || value === null) {
    return false;
  }
  const v = value as Record<string, unknown>;
  if (
    typeof v.version !== "number" ||
    !ACCEPTED_STATE_VERSIONS.has(v.version)
  ) {
    return false;
  }
  if (typeof v.savedAt !== "number" || !Number.isFinite(v.savedAt)) {
    return false;
  }
  if (typeof v.finished !== "boolean") {
    return false;
  }
  if (
    typeof v.stepIndex !== "number" ||
    !Number.isInteger(v.stepIndex) ||
    v.stepIndex < 0 ||
    v.stepIndex >= stepCount
  ) {
    return false;
  }
  if (!isValidDraft(v.draft)) {
    return false;
  }
  if (v.finished && !isDraftComplete(v.draft)) {
    return false;
  }
  // selectedIds は未定義（v1）でも可。配列なら要素が string であることだけ見る
  if (v.selectedIds !== undefined) {
    if (!Array.isArray(v.selectedIds)) {
      return false;
    }
    if (!v.selectedIds.every((id) => typeof id === "string")) {
      return false;
    }
  }
  return true;
}

function isValidDraft(value: unknown): value is PersistedDraft {
  if (typeof value !== "object" || value === null) {
    return false;
  }
  const d = value as Record<string, unknown>;
  if (!(d.scene === null || SCENE_IDS.has(d.scene as SceneId))) {
    return false;
  }
  if (!(d.nc === null || NC_IDS.has(d.nc as NcPreference))) {
    return false;
  }
  if (!(d.form === null || FORM_IDS.has(d.form as FormPreference))) {
    return false;
  }
  if (!(d.budget === null || BUDGET_IDS.has(d.budget as BudgetPreference))) {
    return false;
  }
  if (!(d.water === null || WATER_IDS.has(d.water as WaterPreference))) {
    return false;
  }
  if (!Array.isArray(d.priorities)) {
    return false;
  }
  if (
    !d.priorities.every(
      (id) => typeof id === "string" && PRIORITY_IDS.has(id as PriorityId),
    )
  ) {
    return false;
  }
  return true;
}

function isDraftComplete(draft: PersistedDraft): boolean {
  return (
    draft.scene != null &&
    draft.nc != null &&
    draft.form != null &&
    draft.budget != null &&
    draft.water != null
  );
}
