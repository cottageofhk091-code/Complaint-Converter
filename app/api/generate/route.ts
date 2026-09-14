import { GoogleGenAI } from "@google/genai";
import { sendGA4Event } from "@/lib/ga4-mp";
import { resolveProAccess } from "@/lib/pro-access";
import { createSupabaseAnonClient } from "@/lib/supabase";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import {
  consumeFreeTrialCredit,
  ensureFreeTrialGranted,
  fetchProfile,
  resolveFreeTrialState,
} from "@/lib/profiles";
import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const maxDuration = 60; // タイムアウトを60秒に延長

type FaultLevel =
  | "clear_fault"
  | "partial_fault"
  | "unclear"
  | "no_fault"
  | "customer_misunderstanding";

type ResponsePolicy =
  | "full_apology"
  | "apology_with_remedy"
  | "fact_clarification"
  | "firm_refusal"
  | "escalate_legal";

type Tone = "sincere" | "business" | "firm";

interface GenerateRequest {
  content: string;
  faultLevel: FaultLevel;
  responsePolicy: ResponsePolicy;
  tone: Tone;
  /** 検証済み Stripe Checkout Session ID（PRO 全文返却に必須） */
  checkoutSessionId?: string;
  /** ログイン済みかどうか（ログ用。Paywall 判定には使わない） */
  isRegistered?: boolean;
}

interface GenerateResult {
  riskLevel: "高" | "中" | "低";
  riskReason: string;
  subjectSuggestions: string[];
  replyBody: string;
  preventionNotes: string[];
  freePreview: string;
  isPro: boolean;
  paywalled: boolean;
  usedFreeTrial?: boolean;
  freeTrialCreditsRemaining?: number;
}

const FAULT_LABELS: Record<FaultLevel, string> = {
  clear_fault: "自社に明確な過失あり",
  partial_fault: "双方に過失の可能性",
  unclear: "事実関係が未確定",
  no_fault: "自社に過失なし（主張）",
  customer_misunderstanding: "相手の誤解・事実誤認の可能性",
};

const POLICY_LABELS: Record<ResponsePolicy, string> = {
  full_apology: "全面的なお詫び",
  apology_with_remedy: "お詫び＋具体的な是正・補償提案",
  fact_clarification: "事実確認・説明を優先",
  firm_refusal: "不当要求への毅然とした拒否",
  escalate_legal: "法務・専門家へのエスカレーション示唆",
};

const TONE_LABELS: Record<Tone, string> = {
  sincere: "最上級の誠意",
  business: "標準ビジネス",
  firm: "毅然・法的防衛",
};

/**
 * Interactions API 向け推奨モデル（短い ID。models/ プレフィックスなし）
 */
const MODEL_FALLBACKS = ["gemini-3.6-flash"] as const;

const SYSTEM_PROMPT = `あなたは日本企業向けの危機管理・カスタマーコミュニケーション専門家です。
クレーム／苦情に対する返信メール案を作成します。

【絶対遵守ルール】
1. 事実が未確定の段階で過失を自認しない（「弊社の責任です」「当社のミスです」等の断定は、明確な過失が入力で示されている場合のみ）。
2. 法的責任の有無を認める表現を避ける。謝罪は「ご不便・ご不快をおかけしたことへの配慮」と「事実確認・再発防止の姿勢」に限定しうる。
3. 感情を煽る表現、相手を挑発する表現、SNS炎上を誘発しうる表現を避ける。
4. 過度な補償約束・金銭の確約はしない（提案する場合は「検討させていただく」「別途ご案内」等に留める）。
5. 個人情報・社内秘密を推測して書かない。
6. トーン指定に従いつつ、ビジネス文書として品位を保つ。
7. 二次炎上防止の観点（公開投稿・録音・弁護士介入など）を意識する。

【出力形式】
必ず次のJSONオブジェクトのみを返すこと。Markdownや説明文は付けない。

{
  "riskLevel": "高" | "中" | "低",
  "riskReason": "炎上危険度の短い理由（1〜2文）",
  "subjectSuggestions": ["件名案1", "件名案2", "件名案3"],
  "replyBody": "返信メール本文（日本語、敬体、適切な改行）",
  "preventionNotes": ["二次炎上防止メモ1", "メモ2", "メモ3"],
  "freePreview": "replyBodyの冒頭2〜3文程度のプレビュー用抜粋"
}`;

function buildUserPrompt(body: GenerateRequest): string {
  return `【入力情報】
■ 状況／相手からのメール本文:
${body.content}

■ 自社の過失状況: ${FAULT_LABELS[body.faultLevel]}
■ 希望する対応方針: ${POLICY_LABELS[body.responsePolicy]}
■ トーン: ${TONE_LABELS[body.tone]}

上記に基づき、危機管理に配慮した返信メール案をJSONで出力してください。`;
}

function extractJson(text: string): Omit<GenerateResult, "isPro" | "paywalled"> {
  const trimmed = text.trim();
  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/);
  const raw = fenced ? fenced[1].trim() : trimmed;
  const parsed = JSON.parse(raw) as Omit<GenerateResult, "isPro" | "paywalled">;

  if (!parsed.riskLevel || !parsed.replyBody || !parsed.subjectSuggestions) {
    throw new Error("Incomplete JSON from model");
  }

  if (!parsed.freePreview) {
    parsed.freePreview = parsed.replyBody.slice(0, 120);
  }

  if (!parsed.preventionNotes) {
    parsed.preventionNotes = [];
  }

  return parsed;
}

/** 非 PRO 向け: 全文・防止メモをサーバー側で除去 */
function applyPaywall(
  result: Omit<GenerateResult, "isPro" | "paywalled">,
  isPro: boolean
): GenerateResult {
  if (isPro) {
    return { ...result, isPro: true, paywalled: false };
  }

  return {
    riskLevel: result.riskLevel,
    riskReason: result.riskReason,
    subjectSuggestions: result.subjectSuggestions,
    freePreview: result.freePreview,
    replyBody: "",
    preventionNotes: [],
    isPro: false,
    paywalled: true,
  };
}

function errorText(err: unknown): string {
  if (err instanceof Error) return err.message;
  if (typeof err === "string") return err;
  try {
    return JSON.stringify(err);
  } catch {
    return String(err);
  }
}

function toUserFacingError(err: unknown): { error: string; status: number } {
  const msg = errorText(err);

  if (/api[_ ]?key|permission|unauthorized|401|403/i.test(msg)) {
    return {
      status: 401,
      error:
        "Gemini APIキーが無効、または権限が不足しています。.env.local の GEMINI_API_KEY を確認してください。",
    };
  }

  if (/quota|rate.?limit|429|resource.?exhausted/i.test(msg)) {
    return {
      status: 429,
      error:
        "Gemini APIの利用上限に達しました。しばらく待ってから再度お試しください。",
    };
  }

  if (err instanceof SyntaxError || msg.includes("Incomplete JSON")) {
    return {
      status: 502,
      error:
        "AIの応答形式を解析できませんでした。もう一度お試しください。",
    };
  }

  return {
    status: 500,
    error: msg
      ? `生成中にエラーが発生しました: ${msg}`
      : "生成中に予期しないエラーが発生しました。",
  };
}

/** models/xxx → xxx（SDK が models/ を付与するため重複を防ぐ） */
function normalizeModelId(name: string): string {
  return name.replace(/^(models\/)+/i, "").trim();
}

function isRetryableModelError(err: unknown): boolean {
  const msg = errorText(err).toLowerCase();
  return (
    msg.includes("not_found") ||
    msg.includes("not found") ||
    msg.includes("404") ||
    msg.includes("no longer available") ||
    msg.includes("is not found for api version") ||
    msg.includes("not available to new users") ||
    msg.includes("recommend you to use")
  );
}

/** Interactions API のレスポンスからテキストを取り出す */
function extractInteractionText(interaction: {
  output_text?: string;
  steps?: Array<{
    type?: string;
    content?: Array<{ type?: string; text?: string }> | string;
  }>;
}): string {
  if (interaction.output_text?.trim()) {
    return interaction.output_text.trim();
  }

  // steps 内の model output からテキストを収集（SDK の output_text が無い場合のフォールバック）
  const parts: string[] = [];
  for (const step of interaction.steps ?? []) {
    if (step.type !== "model_output" && step.type !== "text") continue;
    if (typeof step.content === "string" && step.content.trim()) {
      parts.push(step.content.trim());
      continue;
    }
    if (Array.isArray(step.content)) {
      for (const block of step.content) {
        if (block?.type === "text" && block.text?.trim()) {
          parts.push(block.text.trim());
        }
      }
    }
  }
  return parts.join("\n");
}

async function generateWithInteractions(
  ai: GoogleGenAI,
  input: string
): Promise<{ text: string; model: string }> {
  const failures: string[] = [];

  for (const rawId of MODEL_FALLBACKS) {
    const model = normalizeModelId(rawId);
    try {
      console.log(`[/api/generate] interactions.create trying model: ${model}`);

      const interaction = await ai.interactions.create({
        model,
        input,
        system_instruction: SYSTEM_PROMPT,
        response_format: {
          type: "text",
          mime_type: "application/json",
        },
        stream: false,
      });

      const text = extractInteractionText(interaction);
      if (!text) {
        failures.push(`${model}: 空の応答 (status=${interaction.status})`);
        console.warn(
          `[/api/generate] empty interaction output from ${model}`,
          { status: interaction.status, steps: interaction.steps }
        );
        continue;
      }

      if (interaction.status === "failed") {
        failures.push(`${model}: status=failed`);
        console.error(`[/api/generate] interaction failed (${model})`, interaction);
        continue;
      }

      console.log(`[/api/generate] success with model: ${model}`);
      return { text, model };
    } catch (err) {
      const detail = errorText(err);
      console.error(
        `[/api/generate] interactions.create failed (model=${model}):`,
        err
      );
      console.error(`[/api/generate] detail:`, detail);
      failures.push(`${model}: ${detail}`);

      if (!isRetryableModelError(err)) {
        throw err;
      }
    }
  }

  throw new Error(
    `Interactions API で利用可能なGeminiモデルが見つかりませんでした。試行結果: ${failures.join(" | ")}`
  );
}

export async function POST(req: NextRequest) {
  try {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey || apiKey === "your_gemini_api_key_here") {
      return NextResponse.json(
        {
          error:
            "GEMINI_API_KEY が設定されていません。.env.local を確認してください。",
        },
        { status: 503 }
      );
    }

    let body: GenerateRequest;
    try {
      body = (await req.json()) as GenerateRequest;
    } catch (parseReqErr) {
      console.error("[/api/generate] invalid request JSON:", parseReqErr);
      return NextResponse.json(
        { error: "リクエスト本文のJSONが不正です。" },
        { status: 400 }
      );
    }

    if (!body.content?.trim()) {
      return NextResponse.json(
        { error: "状況／メール本文を入力してください。" },
        { status: 400 }
      );
    }

    if (!body.faultLevel || !body.responsePolicy || !body.tone) {
      return NextResponse.json(
        { error: "過失状況・対応方針・トーンを選択してください。" },
        { status: 400 }
      );
    }

    const checkoutSessionId =
      body.checkoutSessionId?.trim() ||
      req.headers.get("x-checkout-session-id")?.trim() ||
      null;

    // PRO 判定は KV 上の entitlement のみ（fail-closed）。email 単独・Stripe 直照会は不可。
    const access = await resolveProAccess({
      sessionId: checkoutSessionId,
      allowEmailLookup: false,
      kvOnly: true,
    });

    let entitledByMembership = false;
    let shouldConsumeFreeTrial = false;
    let freeTrialCreditsRemaining = 0;

    if (!access.entitled) {
      try {
        const supabaseAuth = await createSupabaseServerClient();
        const {
          data: { user: authUser },
        } = await supabaseAuth.auth.getUser();
        if (authUser) {
          const profile = await fetchProfile(authUser.id, supabaseAuth);
          const meta = (authUser.user_metadata || {}) as Record<string, unknown>;
          if (profile?.membership_type === "paid") {
            entitledByMembership = true;
          } else {
            let trial = resolveFreeTrialState(profile, meta);
            // 判定不能・未整備なら付与を再試行
            if (trial.unknown || (!trial.available && !trial.freeTrialUsed)) {
              await ensureFreeTrialGranted(authUser.id, supabaseAuth);
              const refreshed = await fetchProfile(authUser.id, supabaseAuth);
              trial = resolveFreeTrialState(refreshed, {
                ...meta,
                free_trial_used:
                  meta.free_trial_used === true
                    ? true
                    : refreshed?.free_trial_used === true
                      ? true
                      : false,
              });
            }

            if (trial.available && !trial.freeTrialUsed) {
              shouldConsumeFreeTrial = true;
              freeTrialCreditsRemaining = trial.freeTrialCredits;
            }
            // 消費済みでも生成自体は続行（プレビュー／paywall）。遮断・402 は行わない。
          }
        }
      } catch (trialErr) {
        console.warn("[/api/generate] free trial check skipped:", trialErr);
      }
    }

    const ai = new GoogleGenAI({ apiKey });

    let text: string;
    let model: string;
    try {
      ({ text, model } = await generateWithInteractions(
        ai,
        buildUserPrompt(body)
      ));
    } catch (genErr) {
      console.error("[/api/generate] all interaction attempts failed:", genErr);
      console.error("[/api/generate] detail:", errorText(genErr));
      return NextResponse.json(
        { error: errorText(genErr) },
        { status: 502 }
      );
    }

    try {
      const result = extractJson(text);
      // 無料権の消費は生成成功後のみ。Stripe PRO / paid は消費しない。
      let usedFreeTrial = false;
      let unlockFull = Boolean(access.entitled || entitledByMembership);

      if (!unlockFull && shouldConsumeFreeTrial) {
        try {
          const supabaseAuth = await createSupabaseServerClient();
          const consumed = await consumeFreeTrialCredit(supabaseAuth);
          usedFreeTrial = consumed.success && consumed.freeTrialUsed;
          freeTrialCreditsRemaining = consumed.freeTrialCredits;
          unlockFull = consumed.success;
          if (!consumed.success) {
            console.error(
              "[/api/generate] free trial eligible but consume failed; keeping paywall",
              consumed
            );
          } else {
            console.info("[/api/generate] free trial marked used", {
              freeTrialUsed: consumed.freeTrialUsed,
            });
          }
        } catch (consumeErr) {
          console.warn("[/api/generate] free trial consume error:", consumeErr);
          unlockFull = false;
        }
      }

      const payload = {
        ...applyPaywall(result, unlockFull),
        usedFreeTrial,
        freeTrialUsed: usedFreeTrial || undefined,
        freeTrialCreditsRemaining: usedFreeTrial ? 0 : freeTrialCreditsRemaining,
      };

      try {
        await sendGA4Event("apology_generated", {
          event_category: "concierge",
        });
      } catch (gaError) {
        console.error("GA4 send error:", gaError);
      }

      const supabase = createSupabaseAnonClient();
      if (supabase) {
        void Promise.resolve(
          supabase.from("app_logs").insert([
            {
              app_name: "apology",
              user_type: body.isRegistered ? "registered" : "unregistered",
              action_type: "generate_apology",
            },
          ])
        )
          .then(({ error }) => {
            if (error) console.error("Supabase log error:", error);
          })
          .catch((dbError: unknown) => {
            console.error("Supabase log error:", dbError);
          });
      }

      return NextResponse.json(payload);
    } catch (parseErr) {
      console.error(
        `[/api/generate] JSON parse failed (model=${model}):`,
        parseErr
      );
      console.error("[/api/generate] raw response text:", text);
      return NextResponse.json(
        {
          error:
            "AIの応答形式を解析できませんでした。もう一度お試しください。",
        },
        { status: 502 }
      );
    }
  } catch (err) {
    console.error("[/api/generate] unhandled error:", err);
    console.error("[/api/generate] unhandled detail:", errorText(err));
    const { error, status } = toUserFacingError(err);
    return NextResponse.json({ error }, { status });
  }
}
