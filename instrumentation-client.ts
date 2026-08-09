// Next.js / @sentry/nextjs v10+ loads client SDK from this file.
// Keep sentry.client.config.ts as the canonical init (per project setup request).
import * as Sentry from "@sentry/nextjs";
import "./sentry.client.config";

export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;
