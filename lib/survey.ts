/**
 * 会員登録時アンケート選択肢（中央ダッシュボード連携用）
 */

export const AGE_GROUP_OPTIONS = [
  { value: "under_10s", label: "10代以下" },
  { value: "20s", label: "20代" },
  { value: "30s", label: "30代" },
  { value: "40s", label: "40代" },
  { value: "50s", label: "50代" },
  { value: "60s_plus", label: "60代以上" },
] as const;

export type AgeGroup = (typeof AGE_GROUP_OPTIONS)[number]["value"];

/** 地方区分（都道府県より粗く、ダッシュボード集計しやすい） */
export const REGION_OPTIONS = [
  { value: "hokkaido", label: "北海道" },
  { value: "tohoku", label: "東北" },
  { value: "kanto", label: "関東" },
  { value: "chubu", label: "中部" },
  { value: "kinki", label: "近畿" },
  { value: "chugoku", label: "中国" },
  { value: "shikoku", label: "四国" },
  { value: "kyushu_okinawa", label: "九州・沖縄" },
  { value: "overseas", label: "海外" },
] as const;

export type Region = (typeof REGION_OPTIONS)[number]["value"];

export function ageGroupLabel(value: string): string {
  return AGE_GROUP_OPTIONS.find((o) => o.value === value)?.label ?? value;
}

export function regionLabel(value: string): string {
  return REGION_OPTIONS.find((o) => o.value === value)?.label ?? value;
}
