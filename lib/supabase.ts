import { createBrowserClient } from "@supabase/ssr";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

export const supabaseUrl =
  process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() || "";
export const supabaseAnonKey =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim() || "";

export function isSupabaseConfigured(): boolean {
  return Boolean(supabaseUrl && supabaseAnonKey);
}

/**
 * ブラウザ用（@supabase/ssr）。
 * PKCE code_verifier を Cookie に保存し、/auth/callback の Route Handler と共有する。
 */
export function createSupabaseBrowserClient(): SupabaseClient {
  if (!isSupabaseConfigured()) {
    throw new Error("Supabase is not configured");
  }
  return createBrowserClient(supabaseUrl, supabaseAnonKey);
}

/**
 * サーバー API 用の単純な anon クライアント（ユーザーセッション不要な insert 等）。
 */
export function createSupabaseAnonClient(): SupabaseClient | null {
  if (!isSupabaseConfigured()) return null;
  return createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}

function initBrowserExport(): SupabaseClient | null {
  if (!isSupabaseConfigured()) return null;
  // Client Components 向け。SSR 時も createBrowserClient は安全に呼べる。
  return createBrowserClient(supabaseUrl, supabaseAnonKey);
}

/** 既存 import（AuthProvider / profiles 等）互換 */
export const supabase: SupabaseClient | null = initBrowserExport();

export function getSupabaseOrThrow(): SupabaseClient {
  if (!supabase) {
    throw new Error(
      "Supabase が未設定です。NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY を確認してください。"
    );
  }
  return supabase;
}

if (!isSupabaseConfigured()) {
  console.warn(
    "[supabase] Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY"
  );
}
