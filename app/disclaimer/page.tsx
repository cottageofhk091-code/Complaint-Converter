import { redirect } from "next/navigation";

/** /disclaimer は利用規約・免責事項ページへ統合 */
export default function DisclaimerPage() {
  redirect("/terms");
}
