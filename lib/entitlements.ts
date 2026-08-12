import { getRedis, isKvConfigured } from "@/lib/kv";

export type EntitlementData = {
  isPro: boolean;
  customerEmail?: string;
  /** Unix ms。未設定なら無期限（単発購入など） */
  expiresAt?: number;
  createdAt: number;
  checkoutSessionId?: string;
  customerId?: string | null;
  mode?: string | null;
};

const KEY_PREFIX = "entitlement:";

/** sessionId はそのまま、email は小文字化してキー化 */
export function toEntitlementKey(sessionIdOrEmail: string): string {
  const raw = sessionIdOrEmail.trim();
  if (!raw) {
    throw new Error("entitlement key is empty");
  }
  if (raw.includes("@")) {
    return `${KEY_PREFIX}${raw.toLowerCase()}`;
  }
  return `${KEY_PREFIX}${raw}`;
}

export function isEntitlementActive(
  data: EntitlementData | null | undefined
): boolean {
  if (!data?.isPro) return false;
  if (typeof data.expiresAt === "number" && data.expiresAt <= Date.now()) {
    return false;
  }
  return true;
}

/**
 * KV に PRO 権限を保存する。
 * KV 未設定・書き込み失敗時は throw（webhook 再試行 / verify fail-closed 用）。
 */
export async function setEntitlement(
  key: string,
  data: EntitlementData
): Promise<void> {
  const redis = getRedis();
  if (!redis) {
    throw new Error(
      "KV が未設定です。KV_REST_API_URL / KV_REST_API_TOKEN（または UPSTASH_REDIS_REST_URL / TOKEN）を設定してください。"
    );
  }

  const redisKey = toEntitlementKey(key);
  const payload: EntitlementData = {
    ...data,
    isPro: Boolean(data.isPro),
    createdAt: data.createdAt || Date.now(),
    customerEmail: data.customerEmail?.trim().toLowerCase() || undefined,
  };

  await redis.set(redisKey, payload);

  // 有効期限がある場合は Redis TTL も付与（秒）
  if (typeof payload.expiresAt === "number" && payload.expiresAt > Date.now()) {
    const ttlSec = Math.max(
      1,
      Math.ceil((payload.expiresAt - Date.now()) / 1000)
    );
    await redis.expire(redisKey, ttlSec);
  }
}

/**
 * KV から PRO 権限を取得する。
 * 未設定・読取失敗・欠落時は null（fail-closed）。
 */
export async function getEntitlement(
  key: string
): Promise<EntitlementData | null> {
  if (!key?.trim()) return null;

  const redis = getRedis();
  if (!redis) {
    console.warn(
      "[entitlements] KV not configured — getEntitlement returns null (fail-closed)"
    );
    return null;
  }

  try {
    const redisKey = toEntitlementKey(key);
    const value = await redis.get<EntitlementData>(redisKey);
    if (!value || typeof value !== "object") return null;
    return value;
  } catch (err) {
    console.error("[entitlements] getEntitlement failed (fail-closed):", err);
    return null;
  }
}

/** session / email の両方に同じ entitlement を書き込む */
export async function grantProEntitlement(input: {
  sessionId: string;
  customerEmail?: string | null;
  customerId?: string | null;
  mode?: string | null;
  /** 省略時は無期限 */
  expiresAt?: number;
}): Promise<EntitlementData> {
  const sessionId = input.sessionId.trim();
  if (!sessionId) {
    throw new Error("sessionId is required to grant PRO entitlement");
  }

  const customerEmail =
    input.customerEmail?.trim().toLowerCase() || undefined;

  const data: EntitlementData = {
    isPro: true,
    customerEmail,
    createdAt: Date.now(),
    checkoutSessionId: sessionId,
    customerId: input.customerId ?? null,
    mode: input.mode ?? null,
    ...(typeof input.expiresAt === "number"
      ? { expiresAt: input.expiresAt }
      : {}),
  };

  await setEntitlement(sessionId, data);
  if (customerEmail) {
    await setEntitlement(customerEmail, data);
  }

  console.log(
    `[entitlements] granted PRO session=${sessionId} email=${customerEmail ?? "(none)"} kv=${isKvConfigured()}`
  );

  return data;
}

/** 有効な PRO か（session 優先、必要なら email） */
export async function hasActiveProEntitlement(input: {
  sessionId?: string | null;
  email?: string | null;
  allowEmailLookup?: boolean;
}): Promise<{
  active: boolean;
  data: EntitlementData | null;
  matchedBy: "session" | "email" | null;
}> {
  const sessionId = input.sessionId?.trim() || null;
  const email = input.email?.trim().toLowerCase() || null;

  if (sessionId) {
    const bySession = await getEntitlement(sessionId);
    if (isEntitlementActive(bySession)) {
      return { active: true, data: bySession, matchedBy: "session" };
    }
  }

  if (input.allowEmailLookup && email) {
    const byEmail = await getEntitlement(email);
    if (isEntitlementActive(byEmail)) {
      return { active: true, data: byEmail, matchedBy: "email" };
    }
  }

  return { active: false, data: null, matchedBy: null };
}
