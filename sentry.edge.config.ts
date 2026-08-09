import * as Sentry from "@sentry/nextjs";
import { SENTRY_DSN, scrubSentryEvent } from "./lib/sentry-scrub";

if (!Sentry.getClient()) {
  Sentry.init({
    dsn: SENTRY_DSN,
    environment: process.env.NODE_ENV,
    tracesSampleRate: process.env.NODE_ENV === "development" ? 1.0 : 0.1,
    sendDefaultPii: false,
    beforeSend(event, hint) {
      return scrubSentryEvent(event, hint);
    },
  });
}
