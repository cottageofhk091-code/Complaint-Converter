import { existsSync, mkdirSync, readFileSync, writeFileSync } from "fs";
import path from "path";

export type StripeEntitlement = {
  sessionId: string;
  email: string | null;
  customerId: string | null;
  mode: string | null;
  unlockedAt: string;
};

type StoreFile = {
  bySessionId: Record<string, StripeEntitlement>;
  byEmail: Record<string, string[]>; // email -> sessionIds
};

type GlobalStore = typeof globalThis & {
  __smartOwabiStripeEntitlements?: StoreFile;
};

function emptyStore(): StoreFile {
  return { bySessionId: {}, byEmail: {} };
}

function memoryStore(): StoreFile {
  const g = globalThis as GlobalStore;
  if (!g.__smartOwabiStripeEntitlements) {
    g.__smartOwabiStripeEntitlements = emptyStore();
  }
  return g.__smartOwabiStripeEntitlements;
}

/** Vercel 等の読み取り専用 FS では /tmp を使う */
function getStorePath(): string {
  const base =
    process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME
      ? path.join("/tmp", "smart-owabi-data")
      : path.join(process.cwd(), ".data");
  return path.join(base, "stripe-entitlements.json");
}

function readFileStore(): StoreFile {
  try {
    const storePath = getStorePath();
    if (!existsSync(storePath)) return emptyStore();
    const raw = readFileSync(storePath, "utf8");
    const parsed = JSON.parse(raw) as StoreFile;
    return {
      bySessionId: parsed.bySessionId ?? {},
      byEmail: parsed.byEmail ?? {},
    };
  } catch (err) {
    console.error("[stripe-entitlements] read failed:", err);
    return emptyStore();
  }
}

function writeFileStore(store: StoreFile): void {
  try {
    const storePath = getStorePath();
    const dir = path.dirname(storePath);
    if (!existsSync(dir)) {
      mkdirSync(dir, { recursive: true });
    }
    writeFileSync(storePath, JSON.stringify(store, null, 2), "utf8");
  } catch (err) {
    // Vercel でも /tmp は書ける想定だが、失敗してもメモリと Stripe API 検証で継続
    console.warn("[stripe-entitlements] write failed (non-fatal):", err);
  }
}

function readStore(): StoreFile {
  const mem = memoryStore();
  const file = readFileStore();
  return {
    bySessionId: { ...file.bySessionId, ...mem.bySessionId },
    byEmail: { ...file.byEmail, ...mem.byEmail },
  };
}

function writeStore(store: StoreFile): void {
  const g = globalThis as GlobalStore;
  g.__smartOwabiStripeEntitlements = store;
  writeFileStore(store);
}

/** Webhook 等で決済完了を記録し、PRO 解除対象にする */
export function recordCheckoutCompleted(input: {
  sessionId: string;
  email?: string | null;
  customerId?: string | null;
  mode?: string | null;
}): StripeEntitlement {
  const store = readStore();
  const email = input.email?.trim().toLowerCase() || null;
  const entitlement: StripeEntitlement = {
    sessionId: input.sessionId,
    email,
    customerId: input.customerId ?? null,
    mode: input.mode ?? null,
    unlockedAt: new Date().toISOString(),
  };

  store.bySessionId[input.sessionId] = entitlement;
  if (email) {
    const list = store.byEmail[email] ?? [];
    if (!list.includes(input.sessionId)) {
      list.push(input.sessionId);
    }
    store.byEmail[email] = list;
  }

  writeStore(store);
  console.log(
    `[stripe-entitlements] unlocked session=${input.sessionId} email=${email ?? "(none)"}`
  );
  return entitlement;
}

export function getEntitlementBySessionId(
  sessionId: string
): StripeEntitlement | null {
  const store = readStore();
  return store.bySessionId[sessionId] ?? null;
}

export function hasEntitlementForEmail(email: string): boolean {
  const normalized = email.trim().toLowerCase();
  if (!normalized) return false;
  const store = readStore();
  return (store.byEmail[normalized]?.length ?? 0) > 0;
}
