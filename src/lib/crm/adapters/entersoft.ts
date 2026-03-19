/**
 * Entersoft ERP/CRM adapter — stub.
 */

import type { CRMAdapter, CRMAdapterConfig, CRMCustomer, CRMSyncResult, CRMTrip } from "../types";

export class EntersoftAdapter implements CRMAdapter {
  readonly name = "entersoft";
  readonly label = "Entersoft";

  async testConnection(_config: CRMAdapterConfig): Promise<{ ok: boolean; message: string }> {
    return { ok: false, message: "Entersoft integration coming soon" };
  }

  async pushCustomer(_customer: CRMCustomer, _config: CRMAdapterConfig): Promise<CRMSyncResult> {
    throw new Error("Entersoft integration coming soon");
  }

  async pushTrip(_trip: CRMTrip, _config: CRMAdapterConfig): Promise<CRMSyncResult> {
    throw new Error("Entersoft integration coming soon");
  }
}
