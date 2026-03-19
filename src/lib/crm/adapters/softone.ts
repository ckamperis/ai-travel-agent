/**
 * SoftOne ERP/CRM adapter.
 * Uses the SoftOne REST API (getBrowserData / getBrowserInfo patterns).
 * Pushes customers to TRDR table, trips to opportunities/orders.
 */

import type { CRMAdapter, CRMAdapterConfig, CRMCustomer, CRMSyncResult, CRMTrip } from "../types";

interface SoftOneResponse {
  success: boolean;
  id?: string;
  error?: string;
}

async function softoneRequest(
  baseUrl: string,
  service: string,
  payload: Record<string, unknown>,
  headers: Record<string, string>
): Promise<SoftOneResponse> {
  const url = `${baseUrl.replace(/\/$/, "")}/${service}`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...headers },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const text = await res.text();
    return { success: false, error: `HTTP ${res.status}: ${text}` };
  }
  const json = await res.json();
  return { success: true, id: json?.id ?? json?.TRDR ?? undefined };
}

export class SoftOneAdapter implements CRMAdapter {
  readonly name = "softone";
  readonly label = "SoftOne ERP";

  async testConnection(config: CRMAdapterConfig): Promise<{ ok: boolean; message: string }> {
    const { baseUrl, appId, token } = config.settings;
    if (!baseUrl || !appId) {
      return { ok: false, message: "Missing baseUrl or appId" };
    }
    try {
      const res = await fetch(
        `${baseUrl.replace(/\/$/, "")}/getBrowserInfo`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          body: JSON.stringify({ appId, object: "TRDR", list: "TRDRList" }),
        }
      );
      if (!res.ok) return { ok: false, message: `HTTP ${res.status}` };
      return { ok: true, message: "Connected to SoftOne" };
    } catch (err) {
      return { ok: false, message: err instanceof Error ? err.message : String(err) };
    }
  }

  async pushCustomer(customer: CRMCustomer, config: CRMAdapterConfig): Promise<CRMSyncResult> {
    const { baseUrl, appId, token } = config.settings;
    if (!baseUrl || !appId) {
      return { success: false, error: "Missing baseUrl or appId" };
    }

    const payload: Record<string, unknown> = {
      appId,
      object: "TRDR",
      data: {
        NAME: customer.name,
        EMAIL: customer.email,
        PHONE01: customer.phone ?? "",
        REMARKS: customer.notes ?? "",
        LANGCOD: customer.language ?? "en",
      },
    };

    // Update existing record if we have an external ID
    if (customer.externalId) {
      payload.key = customer.externalId;
    }

    const result = await softoneRequest(
      baseUrl,
      "setData",
      payload,
      token ? { Authorization: `Bearer ${token}` } : {}
    );

    return {
      success: result.success,
      externalId: result.id,
      error: result.error,
    };
  }

  async pushTrip(trip: CRMTrip, config: CRMAdapterConfig): Promise<CRMSyncResult> {
    const { baseUrl, appId, token } = config.settings;
    if (!baseUrl || !appId) {
      return { success: false, error: "Missing baseUrl or appId" };
    }

    const payload: Record<string, unknown> = {
      appId,
      object: "SALDOC",
      data: {
        TRNTYPE: "ORDER",
        TRDR: trip.customerExternalId ?? "",
        REMARKS: `${trip.destinations.join(", ")} — ${trip.status}`,
        SUMAMNT: trip.totalCost ?? 0,
        TRNDATE: trip.departureDate ?? new Date().toISOString().slice(0, 10),
      },
    };

    if (trip.externalId) {
      payload.key = trip.externalId;
    }

    const result = await softoneRequest(
      baseUrl,
      "setData",
      payload,
      token ? { Authorization: `Bearer ${token}` } : {}
    );

    return {
      success: result.success,
      externalId: result.id,
      error: result.error,
    };
  }
}
