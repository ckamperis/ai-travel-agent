/**
 * Generic webhook adapter.
 * POSTs JSON events to a configurable URL.
 * Events: customer.upsert, trip.updated, trip.status_changed
 */

import type { CRMAdapter, CRMAdapterConfig, CRMCustomer, CRMSyncResult, CRMTrip } from "../types";

async function postWebhook(
  url: string,
  event: string,
  payload: Record<string, unknown>,
  extraHeaders: Record<string, string>
): Promise<CRMSyncResult> {
  const body = JSON.stringify({ event, timestamp: new Date().toISOString(), data: payload });
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...extraHeaders },
    body,
  });
  if (!res.ok) {
    const text = await res.text();
    return { success: false, error: `HTTP ${res.status}: ${text}` };
  }
  try {
    const json = await res.json();
    return { success: true, externalId: json?.id ?? json?.externalId };
  } catch {
    // response may not be JSON — that's fine
    return { success: true };
  }
}

function parseHeaders(raw: string): Record<string, string> {
  if (!raw) return {};
  const headers: Record<string, string> = {};
  for (const line of raw.split("\n")) {
    const idx = line.indexOf(":");
    if (idx > 0) {
      headers[line.slice(0, idx).trim()] = line.slice(idx + 1).trim();
    }
  }
  return headers;
}

export class WebhookAdapter implements CRMAdapter {
  readonly name = "webhook";
  readonly label = "Webhook (Generic)";

  async testConnection(config: CRMAdapterConfig): Promise<{ ok: boolean; message: string }> {
    const { url } = config.settings;
    if (!url) return { ok: false, message: "Missing webhook URL" };
    try {
      const extra = parseHeaders(config.settings.headers ?? "");
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...extra },
        body: JSON.stringify({ event: "ping", timestamp: new Date().toISOString() }),
      });
      if (!res.ok) return { ok: false, message: `HTTP ${res.status}` };
      return { ok: true, message: "Webhook reachable" };
    } catch (err) {
      return { ok: false, message: err instanceof Error ? err.message : String(err) };
    }
  }

  async pushCustomer(customer: CRMCustomer, config: CRMAdapterConfig): Promise<CRMSyncResult> {
    const { url } = config.settings;
    if (!url) return { success: false, error: "Missing webhook URL" };
    const extra = parseHeaders(config.settings.headers ?? "");
    return postWebhook(url, "customer.upsert", { customer }, extra);
  }

  async pushTrip(trip: CRMTrip, config: CRMAdapterConfig): Promise<CRMSyncResult> {
    const { url } = config.settings;
    if (!url) return { success: false, error: "Missing webhook URL" };
    const extra = parseHeaders(config.settings.headers ?? "");
    return postWebhook(url, "trip.updated", { trip }, extra);
  }
}
