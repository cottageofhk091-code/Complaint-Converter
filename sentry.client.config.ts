import * as Sentry from "@sentry/nextjs";
import { SENTRY_DSN, scrubSentryEvent } from "./lib/sentry-scrub";

// Guard against double-init when both instrumentation-client.ts and
// the legacy sentry.client.config.ts loader are present.
if (!Sentry.getClient()) {
  Sentry.init({
    dsn: SENTRY_DSN,
    environment: process.env.NODE_ENV,
    tracesSampleRate: process.env.NODE_ENV === "development" ? 1.0 : 0.1,
    sendDefaultPii: false,
    beforeSend(event, hint) {
      return scrubSentryEvent(event, hint);
    },
    beforeBreadcrumb(breadcrumb) {
      if (breadcrumb.message) {
        breadcrumb.message = breadcrumb.message
          .replace(
            /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g,
            "[REDACTED_EMAIL]"
          )
          .replace(/\b(sk|pk)_(live|test)_[A-Za-z0-9]+\b/g, "[REDACTED_STRIPE_KEY]")
          .replace(/\bwhsec_[A-Za-z0-9]+\b/g, "[REDACTED_WEBHOOK_SECRET]");
      }
      if (breadcrumb.data) {
        const sensitive =
          /(authorization|password|passwd|secret|token|api[_-]?key|cookie|email)/i;
        for (const key of Object.keys(breadcrumb.data)) {
          if (sensitive.test(key)) {
            breadcrumb.data[key] = "[REDACTED]";
          }
        }
      }
      return breadcrumb;
    },
  });
}
