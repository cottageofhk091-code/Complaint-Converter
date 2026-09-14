import { HISTORY_LIMIT } from "@/lib/pricing";

/**
 * 有料プラン向け生成履歴（ブラウザ localStorage）。
 * - replyBody: お詫びメール本文
 * - subjectSuggestions / recommended_subjects: 推奨件名案
 * - preventionNotes / secondary_flame_prevention: 二次炎上防止メモ
 */
export type GenerationHistoryItem = {
  id: string;
  createdAt: string;
  riskLevel: string;
  riskReason: string;
  /** 推奨件名案 */
  subjectSuggestions: string[];
  replyBody: string;
  freePreview: string;
  /** 二次炎上防止メモ */
  preventionNotes: string[];
};

function storageKey(userId: string): string {
  return `apology_generation_history_v1:${userId}`;
}

function asStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((v) => (typeof v === "string" ? v.trim() : String(v ?? "").trim()))
    .filter(Boolean);
}

/** 旧データ・別名キーにも耐える正規化 */
export function normalizeHistoryItem(
  raw: unknown
): GenerationHistoryItem | null {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;

  const id = typeof o.id === "string" && o.id ? o.id : null;
  if (!id) return null;

  const createdAt =
    typeof o.createdAt === "string" && o.createdAt
      ? o.createdAt
      : typeof o.created_at === "string" && o.created_at
        ? o.created_at
        : new Date(0).toISOString();

  const subjectSuggestions = asStringArray(
    o.subjectSuggestions ??
      o.recommended_subjects ??
      o.subjects ??
      o.subject
  );

  const preventionNotes = asStringArray(
    o.preventionNotes ??
      o.secondary_flame_prevention ??
      o.notes ??
      o.prevention_notes
  );

  const replyBody =
    typeof o.replyBody === "string"
      ? o.replyBody
      : typeof o.reply_body === "string"
        ? o.reply_body
        : typeof o.body === "string"
          ? o.body
          : "";

  const freePreview =
    typeof o.freePreview === "string"
      ? o.freePreview
      : typeof o.free_preview === "string"
        ? o.free_preview
        : "";

  return {
    id,
    createdAt,
    riskLevel: typeof o.riskLevel === "string" ? o.riskLevel : "—",
    riskReason: typeof o.riskReason === "string" ? o.riskReason : "",
    subjectSuggestions,
    replyBody,
    freePreview,
    preventionNotes,
  };
}

function readAll(userId: string): GenerationHistoryItem[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(storageKey(userId));
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed
      .map(normalizeHistoryItem)
      .filter((x): x is GenerationHistoryItem => x !== null);
  } catch {
    return [];
  }
}

function writeAll(userId: string, items: GenerationHistoryItem[]): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(storageKey(userId), JSON.stringify(items));
  } catch (err) {
    console.warn("[history] save failed:", err);
  }
}

export type GenerationHistoryInput = {
  id?: string;
  createdAt?: string;
  riskLevel?: string;
  riskReason?: string;
  subjectSuggestions?: string[] | null;
  /** 別名: recommended_subjects */
  recommended_subjects?: string[] | null;
  replyBody?: string | null;
  freePreview?: string | null;
  preventionNotes?: string[] | null;
  /** 別名: secondary_flame_prevention / notes */
  secondary_flame_prevention?: string[] | null;
  notes?: string[] | null;
};

/** 有料会員向け: 最新を先頭に追加し、上限超過分は古いものから削除（FIFO） */
export function pushGenerationHistory(
  userId: string,
  item: GenerationHistoryInput
): GenerationHistoryItem[] {
  const subjectSuggestions = asStringArray(
    item.subjectSuggestions ?? item.recommended_subjects
  );
  const preventionNotes = asStringArray(
    item.preventionNotes ??
      item.secondary_flame_prevention ??
      item.notes
  );

  const next: GenerationHistoryItem = {
    id: item.id || `h_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    createdAt: item.createdAt || new Date().toISOString(),
    riskLevel: item.riskLevel || "—",
    riskReason: item.riskReason || "",
    subjectSuggestions,
    replyBody: item.replyBody || "",
    freePreview: item.freePreview || "",
    preventionNotes,
  };

  const list = [next, ...readAll(userId)].slice(0, HISTORY_LIMIT);
  writeAll(userId, list);
  return list;
}

export function listGenerationHistory(userId: string): GenerationHistoryItem[] {
  return readAll(userId);
}

export function deleteGenerationHistoryItem(
  userId: string,
  id: string
): GenerationHistoryItem[] {
  const list = readAll(userId).filter((x) => x.id !== id);
  writeAll(userId, list);
  return list;
}
