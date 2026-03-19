/**
 * CRM sync orchestration.
 * Reads adapter configs, fans out to enabled adapters, logs results.
 */

import { getSupabase } from "../supabase";
import { getAdapter, listAdapters } from "./registry";
import type { CRMAdapterConfig, CRMCustomer, CRMTrip } from "./types";

/* ── Config helpers (from crm_adapter_configs table) ───── */

async function getEnabledConfigs(): Promise<CRMAdapterConfig[]> {
  const sb = getSupabase();
  if (!sb) return [];
  try {
    const { data, error } = await sb
      .from("crm_adapter_configs")
      .select("*")
      .eq("enabled", true);
    if (error) throw error;
    return (data ?? []) as CRMAdapterConfig[];
  } catch (err) {
    console.error("[crm-sync] getEnabledConfigs:", err);
    return [];
  }
}

/* ── Sync log ──────────────────────────────────────────── */

async function logSync(
  adapterName: string,
  event: string,
  entityType: "customer" | "trip",
  entityId: string,
  success: boolean,
  externalId?: string,
  error?: string
): Promise<void> {
  const sb = getSupabase();
  if (!sb) return;
  try {
    await sb.from("crm_sync_log").insert({
      adapter_name: adapterName,
      event,
      entity_type: entityType,
      entity_id: entityId,
      success,
      external_id: externalId ?? null,
      error: error ?? null,
    });
  } catch (err) {
    console.error("[crm-sync] logSync write failed:", err);
  }
}

/* ── Public sync functions ─────────────────────────────── */

export async function onCustomerCreated(
  customerId: string,
  customer: CRMCustomer
): Promise<void> {
  const configs = await getEnabledConfigs();
  for (const cfg of configs) {
    const adapter = getAdapter(cfg.name);
    if (!adapter) continue;
    try {
      const result = await adapter.pushCustomer(customer, cfg);
      await logSync(
        cfg.name,
        "customer.upsert",
        "customer",
        customerId,
        result.success,
        result.externalId,
        result.error
      );
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error(`[crm-sync] ${cfg.name} pushCustomer failed:`, msg);
      await logSync(cfg.name, "customer.upsert", "customer", customerId, false, undefined, msg);
    }
  }
}

export async function onTripStatusChange(
  tripId: string,
  trip: CRMTrip
): Promise<void> {
  const configs = await getEnabledConfigs();
  for (const cfg of configs) {
    const adapter = getAdapter(cfg.name);
    if (!adapter) continue;
    try {
      const result = await adapter.pushTrip(trip, cfg);
      await logSync(
        cfg.name,
        "trip.status_changed",
        "trip",
        tripId,
        result.success,
        result.externalId,
        result.error
      );
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error(`[crm-sync] ${cfg.name} pushTrip failed:`, msg);
      await logSync(cfg.name, "trip.status_changed", "trip", tripId, false, undefined, msg);
    }
  }
}

export async function syncAll(): Promise<{
  adapter: string;
  customers: number;
  trips: number;
  errors: string[];
}[]> {
  const sb = getSupabase();
  if (!sb) return [];

  const configs = await getEnabledConfigs();
  const results: { adapter: string; customers: number; trips: number; errors: string[] }[] = [];

  const { data: customers } = await sb.from("customers").select("*");
  const { data: trips } = await sb.from("trips").select("*");

  for (const cfg of configs) {
    const adapter = getAdapter(cfg.name);
    if (!adapter) continue;

    const entry = { adapter: cfg.name, customers: 0, trips: 0, errors: [] as string[] };

    for (const c of customers ?? []) {
      try {
        const r = await adapter.pushCustomer(
          { externalId: c.crm_external_id, email: c.email, name: c.name, phone: c.phone, language: c.language, tags: c.tags },
          cfg
        );
        if (r.success) entry.customers++;
        else entry.errors.push(r.error ?? "unknown");
      } catch (err) {
        entry.errors.push(err instanceof Error ? err.message : String(err));
      }
    }

    for (const t of trips ?? []) {
      try {
        const r = await adapter.pushTrip(
          { externalId: t.crm_external_id, destinations: t.destinations, status: t.status, totalCost: t.total_cost },
          cfg
        );
        if (r.success) entry.trips++;
        else entry.errors.push(r.error ?? "unknown");
      } catch (err) {
        entry.errors.push(err instanceof Error ? err.message : String(err));
      }
    }

    results.push(entry);
  }

  return results;
}

export { listAdapters, getAdapter } from "./registry";
