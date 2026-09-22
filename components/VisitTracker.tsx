"use client";

import { trackVisit } from "@/lib/analytics";
import { useEffect } from "react";

/** マウント時に1セッション1回の流入元トラッキングを実行 */
export default function VisitTracker() {
  useEffect(() => {
    void trackVisit();
  }, []);

  return null;
}
