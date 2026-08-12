import { Redis } from "@upstash/redis";

/**
 * Upstash Redis / Vercel KV REST クライアント。
 * 対応 env（いずれかのペア）:
 * - KV_REST_API_URL + KV_REST_API_TOKEN（Vercel KV）
 * - UPSTASH_REDIS_REST_URL + UPSTASH_REDIS_REST_TOKEN（Upstash 直）
 */
function resolveKvCredentials(): { url: string; token: string } | null {
  const url =
    process.env.KV_REST_API_URL?.trim() ||
    process.env.UPSTASH_REDIS_REST_URL?.trim() ||
    "";
  const token =
    process.env.KV_REST_API_TOKEN?.trim() ||
    process.env.UPSTASH_REDIS_REST_TOKEN?.trim() ||
    "";

  if (!url || !token) return null;
  return { url, token };
}

export function isKvConfigured(): boolean {
  return resolveKvCredentials() !== null;
}

let cached: Redis | null | undefined;

/**
 * Redis クライアントを返す。未設定時は null（呼び出し側で fail-closed）。
 */
export function getRedis(): Redis | null {
  if (cached !== undefined) return cached;

  const creds = resolveKvCredentials();
  if (!creds) {
    cached = null;
    return null;
  }

  cached = new Redis({
    url: creds.url,
    token: creds.token,
  });
  return cached;
}

/** テスト用にキャッシュをリセット */
export function resetKvClientForTests(): void {
  cached = undefined;
}
