import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { isSupabaseConfigured, supabaseUrl } from "@/lib/supabase";

/**
 * RLS をバイパスする Service Role クライアント（サーバー専用）。
 * free_trial_used の確実な更新に使う。未設定時は null。
 */
export function createSupabaseServiceClient(): SupabaseClient | null {
  if (!isSupabaseConfigured()) return null;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (!serviceKey) {
    console.warn(
      "[supabase/admin] SUPABASE_SERVICE_ROLE_KEY が未設定です。無料体験フラグ更新が RLS 制限を受ける可能性があります。"
    );
    return null;
  }
  return createClient(supabaseUrl, serviceKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  });
}

/** Service Role があればそれを、なければ呼び出し元クライアントを返す */
export function getWriteClient(fallback: SupabaseClient): SupabaseClient {
  return createSupabaseServiceClient() ?? fallback;
}
