/**
 * CRM adapter registry.
 * Import adapters here — getAdapter() / listAdapters() are the public API.
 */

import type { CRMAdapter } from "./types";
import { SoftOneAdapter } from "./adapters/softone";
import { WebhookAdapter } from "./adapters/webhook";
import { HubSpotAdapter } from "./adapters/hubspot";
import { SalesforceAdapter } from "./adapters/salesforce";
import { EntersoftAdapter } from "./adapters/entersoft";
import { ZohoAdapter } from "./adapters/zoho";
import { PipedriveAdapter } from "./adapters/pipedrive";

const adapters: Record<string, CRMAdapter> = {
  softone: new SoftOneAdapter(),
  webhook: new WebhookAdapter(),
  hubspot: new HubSpotAdapter(),
  salesforce: new SalesforceAdapter(),
  entersoft: new EntersoftAdapter(),
  zoho: new ZohoAdapter(),
  pipedrive: new PipedriveAdapter(),
};

export function getAdapter(name: string): CRMAdapter | null {
  return adapters[name] ?? null;
}

export function listAdapters(): CRMAdapter[] {
  return Object.values(adapters);
}
