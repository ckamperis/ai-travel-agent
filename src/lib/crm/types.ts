/**
 * CRM integration types.
 * Adapter pattern: each CRM implements CRMAdapter.
 */

export interface CRMCustomer {
  externalId?: string;
  email: string;
  name: string;
  phone?: string;
  language?: string;
  tags?: string[];
  notes?: string;
  source?: string;
}

export interface CRMTrip {
  externalId?: string;
  customerExternalId?: string;
  destinations: string[];
  departureDate?: string;
  returnDate?: string;
  travelers?: number;
  totalCost?: number;
  status: string;
  notes?: string;
}

export interface CRMSyncResult {
  success: boolean;
  externalId?: string;
  error?: string;
}

export interface CRMAdapterConfig {
  name: string;
  enabled: boolean;
  /** Adapter-specific settings (URL, API key, etc.) */
  settings: Record<string, string>;
}

export interface CRMAdapter {
  readonly name: string;
  readonly label: string;

  /** Verify credentials / connectivity */
  testConnection(config: CRMAdapterConfig): Promise<{ ok: boolean; message: string }>;

  /** Push or update a customer record */
  pushCustomer(customer: CRMCustomer, config: CRMAdapterConfig): Promise<CRMSyncResult>;

  /** Push or update a trip / opportunity record */
  pushTrip(trip: CRMTrip, config: CRMAdapterConfig): Promise<CRMSyncResult>;
}
