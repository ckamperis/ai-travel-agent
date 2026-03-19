/**
 * HubSpot CRM adapter — stub.
 */

import type { CRMAdapter, CRMAdapterConfig, CRMCustomer, CRMSyncResult, CRMTrip } from "../types";

export class HubSpotAdapter implements CRMAdapter {
  readonly name = "hubspot";
  readonly label = "HubSpot";

  async testConnection(_config: CRMAdapterConfig): Promise<{ ok: boolean; message: string }> {
    return { ok: false, message: "HubSpot integration coming soon" };
  }

  async pushCustomer(_customer: CRMCustomer, _config: CRMAdapterConfig): Promise<CRMSyncResult> {
    throw new Error("HubSpot integration coming soon");
  }

  async pushTrip(_trip: CRMTrip, _config: CRMAdapterConfig): Promise<CRMSyncResult> {
    throw new Error("HubSpot integration coming soon");
  }
}
