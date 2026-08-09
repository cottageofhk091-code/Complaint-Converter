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
    beforeSendTransaction(event) {
      // Avoid leaking request bodies / PII in transaction payloads
      if (event.request?.data) {
        event.request.data = "[REDACTED]";
      }
      if (event.request?.cookies) {
        event.request.cookies = {};
      }
      if (event.request?.headers) {
        const headers: Record<string, string> = {};
        for (const [k, v] of Object.entries(event.request.headers)) {
          headers[k] = /(authorization|cookie|token|secret|api[_-]?key)/i.test(k)
            ? "[REDACTED]"
            : String(v);
        }
        event.request.headers = headers;
      }
      return event;
    },
  });
}
