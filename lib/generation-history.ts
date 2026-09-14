import { HISTORY_LIMIT } from "@/lib/pricing";

export type GenerationHistoryItem = {
  id: string;
  createdAt: string;
  riskLevel: string;
  riskReason: string;
  subjectSuggestions: string[];
  replyBody: string;
  freePreview: string;
  preventionNotes: string[];
};

function storageKey(userId: string): string {
  return `apology_generation_history_v1:${userId}`;
}

function readAll(userId: string): GenerationHistoryItem[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(storageKey(userId));
    if (!raw) return [];
    const parsed = JSON.parse(raw) as GenerationHistoryItem[];
    if (!Array.isArray(parsed)) return [];
    return parsed;
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

/** 有料会員向け: 最新を先頭に追加し、上限超過分は古いものから削除（FIFO） */
export function pushGenerationHistory(
  userId: string,
  item: Omit<GenerationHistoryItem, "id" | "createdAt"> & {
    id?: string;
    createdAt?: string;
  }
): GenerationHistoryItem[] {
  const next: GenerationHistoryItem = {
    id: item.id || `h_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    createdAt: item.createdAt || new Date().toISOString(),
    riskLevel: item.riskLevel,
    riskReason: item.riskReason,
    subjectSuggestions: item.subjectSuggestions || [],
    replyBody: item.replyBody || "",
    freePreview: item.freePreview || "",
    preventionNotes: item.preventionNotes || [],
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
