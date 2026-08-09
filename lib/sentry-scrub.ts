/**
 * Shared scrubbing for Sentry events (PII / secrets).
 */
import type { ErrorEvent, EventHint } from "@sentry/nextjs";

const SENSITIVE_KEY =
  /(authorization|password|passwd|secret|token|api[_-]?key|cookie|set-cookie|credit|card|cvv|ssn|stripe|gemini|webhook)/i;

const EMAIL_RE = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
const BEARER_RE = /\bBearer\s+[A-Za-z0-9\-._~+/]+=*/gi;
const STRIPE_KEY_RE = /\b(sk|pk)_(live|test)_[A-Za-z0-9]+\b/g;
const WHSEC_RE = /\bwhsec_[A-Za-z0-9]+\b/g;
const GENERIC_SECRET_RE =
  /\b(AIza[0-9A-Za-z\-_]{20,}|AQ\.[A-Za-z0-9_\-]{20,})\b/g;

function scrubString(value: string): string {
  return value
    .replace(EMAIL_RE, "[REDACTED_EMAIL]")
    .replace(BEARER_RE, "Bearer [REDACTED]")
    .replace(STRIPE_KEY_RE, "[REDACTED_STRIPE_KEY]")
    .replace(WHSEC_RE, "[REDACTED_WEBHOOK_SECRET]")
    .replace(GENERIC_SECRET_RE, "[REDACTED_SECRET]");
}

function scrubUnknown(value: unknown, depth = 0): unknown {
  if (depth > 6 || value == null) return value;
  if (typeof value === "string") return scrubString(value);
  if (typeof value === "number" || typeof value === "boolean") return value;
  if (Array.isArray(value)) {
    return value.map((item) => scrubUnknown(item, depth + 1));
  }
  if (typeof value === "object") {
    const out: Record<string, unknown> = {};
    for (const [key, nested] of Object.entries(
      value as Record<string, unknown>
    )) {
      if (SENSITIVE_KEY.test(key)) {
        out[key] = "[REDACTED]";
      } else {
        out[key] = scrubUnknown(nested, depth + 1);
      }
    }
    return out;
  }
  return value;
}

export function scrubSentryEvent(
  event: ErrorEvent,
  hint?: EventHint
): ErrorEvent | null {
  void hint;
  try {
    if (event.message) {
      event.message = scrubString(event.message);
    }

    if (event.exception?.values) {
      for (const ex of event.exception.values) {
        if (ex.value) ex.value = scrubString(ex.value);
      }
    }

    if (event.request) {
      if (event.request.headers) {
        const headers: Record<string, string> = {};
        for (const [k, v] of Object.entries(event.request.headers)) {
          headers[k] = SENSITIVE_KEY.test(k)
            ? "[REDACTED]"
            : scrubString(String(v));
        }
        event.request.headers = headers;
      }
      if (event.request.cookies) {
        event.request.cookies = {};
      }
      if (event.request.data) {
        event.request.data = scrubUnknown(event.request.data);
      }
      if (event.request.query_string) {
        if (typeof event.request.query_string === "string") {
          event.request.query_string = scrubString(event.request.query_string);
        }
      }
      if (event.request.url) {
        event.request.url = scrubString(event.request.url);
      }
    }

    if (event.user) {
      if (event.user.email) event.user.email = "[REDACTED_EMAIL]";
      if (event.user.ip_address) event.user.ip_address = "{{auto}}";
      if (event.user.username) {
        event.user.username = scrubString(String(event.user.username));
      }
    }

    if (event.extra) {
      event.extra = scrubUnknown(event.extra) as typeof event.extra;
    }
    if (event.contexts) {
      event.contexts = scrubUnknown(event.contexts) as typeof event.contexts;
    }
    if (event.breadcrumbs) {
      event.breadcrumbs = event.breadcrumbs.map((b) => ({
        ...b,
        message: b.message ? scrubString(b.message) : b.message,
        data: b.data
          ? (scrubUnknown(b.data) as Record<string, unknown>)
          : b.data,
      }));
    }

    return event;
  } catch {
    // Scrubbing failure: drop event rather than leak raw data
    return null;
  }
}

export const SENTRY_DSN =
  process.env.NEXT_PUBLIC_SENTRY_DSN ||
  "https://50c780a5801c2dcbc82f40b7a4733fc4@o4511880740274176.ingest.us.sentry.io/4511880774483968";
