import { isSupabaseConfigured, supabase } from "@/lib/supabase";

const APP_NAME = "complaint-converter";
const TRACK_KEY = "has_tracked_visit";

function resolveSourceCategory(
  utmSource: string | null,
  referrer: string
): string {
  if (utmSource) {
    const src = utmSource.toLowerCase();
    if (src.includes("x") || src.includes("twitter")) return "X";
    if (src.includes("note")) return "note";
    if (src.includes("google")) return "Google";
    if (src.includes("yahoo")) return "Yahoo";
    return utmSource;
  }

  if (referrer) {
    const ref = referrer.toLowerCase();
    if (
      ref.includes("t.co") ||
      ref.includes("x.com") ||
      ref.includes("twitter.com")
    ) {
      return "X";
    }
    if (ref.includes("note.com")) return "note";
    if (ref.includes("google.")) return "Google";
    if (ref.includes("yahoo.")) return "Yahoo";
    if (ref.includes("instagram.com")) return "Instagram";
    return "Other Referral";
  }

  return "Direct";
}

/**
 * 1セッションあたり1回だけ、参照元 / UTM を analytics_visits に記録する。
 */
export async function trackVisit(): Promise<void> {
  if (typeof window === "undefined") return;
  if (!isSupabaseConfigured() || !supabase) return;

  try {
    if (sessionStorage.getItem(TRACK_KEY)) return;
  } catch {
    // sessionStorage 不可環境では毎回送らないためスキップ
    return;
  }

  const urlParams = new URLSearchParams(window.location.search);
  const utmSource = urlParams.get("utm_source");
  const referrer = document.referrer || "";
  const sourceCategory = resolveSourceCategory(utmSource, referrer);

  try {
    const { error } = await supabase.from("analytics_visits").insert({
      app_name: APP_NAME,
      source_category: sourceCategory,
      utm_source: utmSource || null,
      referrer: referrer || null,
    });

    if (error) {
      console.error("[analytics] Visit tracking failed:", error.message);
      return;
    }

    try {
      sessionStorage.setItem(TRACK_KEY, "true");
    } catch {
      // ignore
    }
  } catch (err) {
    console.error("[analytics] Visit tracking failed:", err);
  }
}
