/**
 * Salesforce CRM adapter — stub.
 */

import type { CRMAdapter, CRMAdapterConfig, CRMCustomer, CRMSyncResult, CRMTrip } from "../types";

export class SalesforceAdapter implements CRMAdapter {
  readonly name = "salesforce";
  readonly label = "Salesforce";

  async testConnection(_config: CRMAdapterConfig): Promise<{ ok: boolean; message: string }> {
    return { ok: false, message: "Salesforce integration coming soon" };
  }

  async pushCustomer(_customer: CRMCustomer, _config: CRMAdapterConfig): Promise<CRMSyncResult> {
    throw new Error("Salesforce integration coming soon");
  }

  async pushTrip(_trip: CRMTrip, _config: CRMAdapterConfig): Promise<CRMSyncResult> {
    throw new Error("Salesforce integration coming soon");
  }
}
