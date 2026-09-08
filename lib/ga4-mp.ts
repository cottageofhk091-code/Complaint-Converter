/**
 * GA4 Measurement Protocol (server-side) helper.
 * Env: NEXT_PUBLIC_GA_ID (measurement ID), GA4_API_SECRET
 */
export async function sendGA4Event(
  eventName: string,
  params: Record<string, unknown> = {}
): Promise<void> {
  const apiSecret = process.env.GA4_API_SECRET;
  const measurementId = process.env.NEXT_PUBLIC_GA_ID;

  if (!apiSecret || !measurementId) {
    console.warn("[GA4 MP] Missing GA4_API_SECRET or NEXT_PUBLIC_GA_ID");
    return;
  }

  const clientId =
    (typeof params.clientId === "string" && params.clientId) ||
    `server.${Date.now()}.${Math.random().toString(36).substring(2, 9)}`;

  const { clientId: _omitClientId, ...eventParams } = params;

  const payload = {
    client_id: clientId,
    events: [
      {
        name: eventName,
        params: {
          event_category: "concierge",
          engagement_time_msec: 100,
          ...eventParams,
        },
      },
    ],
  };

  try {
    await fetch(
      `https://www.google-analytics.com/mp/collect?measurement_id=${encodeURIComponent(measurementId)}&api_secret=${encodeURIComponent(apiSecret)}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      }
    );
  } catch (err) {
    console.error("[GA4 MP Error]:", err);
  }
}
