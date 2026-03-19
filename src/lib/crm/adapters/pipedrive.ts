/**
 * Pipedrive CRM adapter — stub.
 */

import type { CRMAdapter, CRMAdapterConfig, CRMCustomer, CRMSyncResult, CRMTrip } from "../types";

export class PipedriveAdapter implements CRMAdapter {
  readonly name = "pipedrive";
  readonly label = "Pipedrive";

  async testConnection(_config: CRMAdapterConfig): Promise<{ ok: boolean; message: string }> {
    return { ok: false, message: "Pipedrive integration coming soon" };
  }

  async pushCustomer(_customer: CRMCustomer, _config: CRMAdapterConfig): Promise<CRMSyncResult> {
    throw new Error("Pipedrive integration coming soon");
  }

  async pushTrip(_trip: CRMTrip, _config: CRMAdapterConfig): Promise<CRMSyncResult> {
    throw new Error("Pipedrive integration coming soon");
  }
}
