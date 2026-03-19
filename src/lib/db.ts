/**
 * Supabase data access layer.
 * Mirrors settings.ts functions but persists to PostgreSQL.
 * Every function returns null on error (graceful fallback to localStorage).
 */

import { getSupabase } from "./supabase";

/* ── Types matching Supabase schema ───────────────────────── */

export interface DbCustomer {
  id: string;
  email: string;
  name: string;
  phone: string;
  language: string;
  preferred_tone: string;
  tags: string[];
  notes: string;
  preferences: Record<string, unknown>;
  total_spend: number;
  trip_count: number;
  source: string;
  crm_external_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface DbConversation {
  id: string;
  customer_id: string;
  gmail_thread_id: string | null;
  subject: string;
  status: string;
  message_count: number;
  last_message_at: string;
  created_at: string;
  updated_at: string;
}

export interface DbMessage {
  id: string;
  conversation_id: string;
  direction: "inbound" | "outbound";
  from_email: string;
  to_email: string;
  subject: string;
  body_text: string;
  body_html: string;
  gmail_message_id: string | null;
  classification: string | null;
  created_at: string;
}

export interface DbTrip {
  id: string;
  customer_id: string;
  conversation_id: string | null;
  status: string;
  destinations: string[];
  dates: Record<string, unknown>;
  budget: Record<string, unknown>;
  travelers: Record<string, unknown>;
  special_requests: string[];
  current_version: number;
  total_cost: number | null;
  crm_external_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface DbTripVersion {
  id: string;
  trip_id: string;
  version_number: number;
  selected_flights: unknown[];
  selected_hotels: unknown[];
  itinerary_text: string;
  included_places: unknown[];
  composed_email: string;
  total_cost: number | null;
  change_summary: string;
  agent_results: Record<string, unknown>;
  created_at: string;
}

export interface DbFollowUp {
  id: string;
  trip_id: string | null;
  customer_id: string;
  scheduled_date: string;
  status: string;
  reminder_text: string;
  sent_at: string | null;
  created_at: string;
}

/* ── Customers ────────────────────────────────────────────── */

export async function getCustomers(): Promise<DbCustomer[] | null> {
  const sb = getSupabase();
  if (!sb) return null;
  try {
    const { data, error } = await sb
      .from("customers")
      .select("*")
      .order("updated_at", { ascending: false });
    if (error) throw error;
    return data;
  } catch (err) {
    console.error("[db] getCustomers:", err);
    return null;
  }
}

export async function getCustomerByEmail(
  email: string
): Promise<DbCustomer | null> {
  const sb = getSupabase();
  if (!sb) return null;
  try {
    const { data, error } = await sb
      .from("customers")
      .select("*")
      .ilike("email", email)
      .maybeSingle();
    if (error) throw error;
    return data;
  } catch (err) {
    console.error("[db] getCustomerByEmail:", err);
    return null;
  }
}

export async function upsertCustomer(data: {
  email: string;
  name: string;
  language?: string;
  source?: string;
  tags?: string[];
  phone?: string;
}): Promise<DbCustomer | null> {
  const sb = getSupabase();
  if (!sb) return null;
  try {
    const { data: row, error } = await sb
      .from("customers")
      .upsert(
        {
          email: data.email.toLowerCase(),
          name: data.name,
          language: data.language || "en",
          source: data.source || "manual",
          tags: data.tags || [],
          phone: data.phone || "",
        },
        { onConflict: "email" }
      )
      .select()
      .single();
    if (error) throw error;
    return row;
  } catch (err) {
    console.error("[db] upsertCustomer:", err);
    return null;
  }
}

export async function updateCustomer(
  id: string,
  updates: Partial<Pick<DbCustomer, "name" | "tags" | "notes" | "phone" | "language" | "preferred_tone">>
): Promise<boolean> {
  const sb = getSupabase();
  if (!sb) return false;
  try {
    const { error } = await sb.from("customers").update(updates).eq("id", id);
    if (error) throw error;
    return true;
  } catch (err) {
    console.error("[db] updateCustomer:", err);
    return false;
  }
}

/* ── Conversations ────────────────────────────────────────── */

export async function getConversations(
  customerId?: string
): Promise<DbConversation[] | null> {
  const sb = getSupabase();
  if (!sb) return null;
  try {
    let q = sb
      .from("conversations")
      .select("*")
      .order("last_message_at", { ascending: false });
    if (customerId) q = q.eq("customer_id", customerId);
    const { data, error } = await q;
    if (error) throw error;
    return data;
  } catch (err) {
    console.error("[db] getConversations:", err);
    return null;
  }
}

export async function getConversationByThreadId(
  gmailThreadId: string
): Promise<DbConversation | null> {
  const sb = getSupabase();
  if (!sb) return null;
  try {
    const { data, error } = await sb
      .from("conversations")
      .select("*")
      .eq("gmail_thread_id", gmailThreadId)
      .maybeSingle();
    if (error) throw error;
    return data;
  } catch (err) {
    console.error("[db] getConversationByThreadId:", err);
    return null;
  }
}

export async function createConversation(data: {
  customer_id: string;
  gmail_thread_id?: string;
  subject: string;
}): Promise<DbConversation | null> {
  const sb = getSupabase();
  if (!sb) return null;
  try {
    const { data: row, error } = await sb
      .from("conversations")
      .insert({
        customer_id: data.customer_id,
        gmail_thread_id: data.gmail_thread_id || null,
        subject: data.subject,
        message_count: 1,
      })
      .select()
      .single();
    if (error) throw error;
    return row;
  } catch (err) {
    console.error("[db] createConversation:", err);
    return null;
  }
}

export async function updateConversationStatus(
  id: string,
  status: string
): Promise<boolean> {
  const sb = getSupabase();
  if (!sb) return false;
  try {
    const { error } = await sb
      .from("conversations")
      .update({ status })
      .eq("id", id);
    if (error) throw error;
    return true;
  } catch (err) {
    console.error("[db] updateConversationStatus:", err);
    return false;
  }
}

/* ── Messages ─────────────────────────────────────────────── */

export async function getMessages(
  conversationId: string
): Promise<DbMessage[] | null> {
  const sb = getSupabase();
  if (!sb) return null;
  try {
    const { data, error } = await sb
      .from("messages")
      .select("*")
      .eq("conversation_id", conversationId)
      .order("created_at", { ascending: true });
    if (error) throw error;
    return data;
  } catch (err) {
    console.error("[db] getMessages:", err);
    return null;
  }
}

export async function createMessage(data: {
  conversation_id: string;
  direction: "inbound" | "outbound";
  from_email: string;
  to_email?: string;
  subject: string;
  body_text: string;
  body_html?: string;
  gmail_message_id?: string;
  classification?: string;
}): Promise<DbMessage | null> {
  const sb = getSupabase();
  if (!sb) return null;
  try {
    const { data: row, error } = await sb
      .from("messages")
      .insert({
        conversation_id: data.conversation_id,
        direction: data.direction,
        from_email: data.from_email,
        to_email: data.to_email || "",
        subject: data.subject,
        body_text: data.body_text,
        body_html: data.body_html || "",
        gmail_message_id: data.gmail_message_id || null,
        classification: data.classification || null,
      })
      .select()
      .single();
    if (error) throw error;

    // Increment conversation message_count (non-critical)
    try {
      const sb2 = getSupabase();
      if (sb2) {
        const { data: conv } = await sb2.from("conversations").select("message_count").eq("id", data.conversation_id).single();
        if (conv) {
          await sb2.from("conversations").update({ message_count: (conv.message_count || 0) + 1, last_message_at: new Date().toISOString() }).eq("id", data.conversation_id);
        }
      }
    } catch { /* non-critical */ }

    return row;
  } catch (err) {
    console.error("[db] createMessage:", err);
    return null;
  }
}

export async function getMessageByGmailId(
  gmailMessageId: string
): Promise<DbMessage | null> {
  const sb = getSupabase();
  if (!sb) return null;
  try {
    const { data, error } = await sb
      .from("messages")
      .select("*")
      .eq("gmail_message_id", gmailMessageId)
      .maybeSingle();
    if (error) throw error;
    return data;
  } catch (err) {
    console.error("[db] getMessageByGmailId:", err);
    return null;
  }
}

/* ── Trips ────────────────────────────────────────────────── */

export async function getTrips(
  customerId?: string
): Promise<DbTrip[] | null> {
  const sb = getSupabase();
  if (!sb) return null;
  try {
    let q = sb
      .from("trips")
      .select("*")
      .order("created_at", { ascending: false });
    if (customerId) q = q.eq("customer_id", customerId);
    const { data, error } = await q;
    if (error) throw error;
    return data;
  } catch (err) {
    console.error("[db] getTrips:", err);
    return null;
  }
}

export async function getTrip(id: string): Promise<DbTrip | null> {
  const sb = getSupabase();
  if (!sb) return null;
  try {
    const { data, error } = await sb
      .from("trips")
      .select("*")
      .eq("id", id)
      .single();
    if (error) throw error;
    return data;
  } catch (err) {
    console.error("[db] getTrip:", err);
    return null;
  }
}

export async function createTrip(data: {
  customer_id: string;
  conversation_id?: string;
  destinations: string[];
  dates: Record<string, unknown>;
  budget: Record<string, unknown>;
  travelers: Record<string, unknown>;
  special_requests?: string[];
  status?: string;
}): Promise<DbTrip | null> {
  const sb = getSupabase();
  if (!sb) return null;
  try {
    const { data: row, error } = await sb
      .from("trips")
      .insert({
        customer_id: data.customer_id,
        conversation_id: data.conversation_id || null,
        destinations: data.destinations,
        dates: data.dates,
        budget: data.budget,
        travelers: data.travelers,
        special_requests: data.special_requests || [],
        status: data.status || "new",
      })
      .select()
      .single();
    if (error) throw error;

    // Increment customer trip_count (non-critical)
    try {
      const sb2 = getSupabase();
      if (sb2) {
        const { data: cust } = await sb2.from("customers").select("trip_count").eq("id", data.customer_id).single();
        if (cust) {
          await sb2.from("customers").update({ trip_count: (cust.trip_count || 0) + 1 }).eq("id", data.customer_id);
        }
      }
    } catch { /* non-critical */ }

    return row;
  } catch (err) {
    console.error("[db] createTrip:", err);
    return null;
  }
}

export async function updateTripStatus(
  id: string,
  status: string
): Promise<boolean> {
  const sb = getSupabase();
  if (!sb) return false;
  try {
    const { error } = await sb.from("trips").update({ status }).eq("id", id);
    if (error) throw error;
    return true;
  } catch (err) {
    console.error("[db] updateTripStatus:", err);
    return false;
  }
}

/* ── Trip Versions ────────────────────────────────────────── */

export async function getTripVersions(
  tripId: string
): Promise<DbTripVersion[] | null> {
  const sb = getSupabase();
  if (!sb) return null;
  try {
    const { data, error } = await sb
      .from("trip_versions")
      .select("*")
      .eq("trip_id", tripId)
      .order("version_number", { ascending: true });
    if (error) throw error;
    return data;
  } catch (err) {
    console.error("[db] getTripVersions:", err);
    return null;
  }
}

export async function getLatestTripVersion(
  tripId: string
): Promise<DbTripVersion | null> {
  const sb = getSupabase();
  if (!sb) return null;
  try {
    const { data, error } = await sb
      .from("trip_versions")
      .select("*")
      .eq("trip_id", tripId)
      .order("version_number", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (error) throw error;
    return data;
  } catch (err) {
    console.error("[db] getLatestTripVersion:", err);
    return null;
  }
}

export async function createTripVersion(data: {
  trip_id: string;
  version_number: number;
  selected_flights?: unknown[];
  selected_hotels?: unknown[];
  itinerary_text?: string;
  included_places?: unknown[];
  composed_email: string;
  total_cost?: number;
  change_summary?: string;
  agent_results?: Record<string, unknown>;
}): Promise<DbTripVersion | null> {
  const sb = getSupabase();
  if (!sb) return null;
  try {
    const { data: row, error } = await sb
      .from("trip_versions")
      .insert({
        trip_id: data.trip_id,
        version_number: data.version_number,
        selected_flights: data.selected_flights || [],
        selected_hotels: data.selected_hotels || [],
        itinerary_text: data.itinerary_text || "",
        included_places: data.included_places || [],
        composed_email: data.composed_email,
        total_cost: data.total_cost || null,
        change_summary: data.change_summary || "",
        agent_results: data.agent_results || {},
      })
      .select()
      .single();
    if (error) throw error;

    // Update trip.current_version
    await getSupabase()
      ?.from("trips")
      .update({ current_version: data.version_number })
      .eq("id", data.trip_id);

    return row;
  } catch (err) {
    console.error("[db] createTripVersion:", err);
    return null;
  }
}

/* ── Follow-ups ───────────────────────────────────────────── */

export async function getFollowUps(
  status?: string
): Promise<DbFollowUp[] | null> {
  const sb = getSupabase();
  if (!sb) return null;
  try {
    let q = sb
      .from("follow_ups")
      .select("*, customers(name, email)")
      .order("scheduled_date", { ascending: true });
    if (status) q = q.eq("status", status);
    const { data, error } = await q;
    if (error) throw error;
    return data as DbFollowUp[];
  } catch (err) {
    console.error("[db] getFollowUps:", err);
    return null;
  }
}

export async function createFollowUp(data: {
  trip_id?: string;
  customer_id: string;
  scheduled_date: string;
  reminder_text?: string;
  status?: string;
}): Promise<DbFollowUp | null> {
  const sb = getSupabase();
  if (!sb) return null;
  try {
    const { data: row, error } = await sb
      .from("follow_ups")
      .insert({
        trip_id: data.trip_id || null,
        customer_id: data.customer_id,
        scheduled_date: data.scheduled_date,
        reminder_text: data.reminder_text || "",
        status: data.status || "pending",
      })
      .select()
      .single();
    if (error) throw error;
    return row;
  } catch (err) {
    console.error("[db] createFollowUp:", err);
    return null;
  }
}

export async function updateFollowUpStatus(
  id: string,
  status: string,
  sentAt?: string
): Promise<boolean> {
  const sb = getSupabase();
  if (!sb) return false;
  try {
    const updates: Record<string, unknown> = { status };
    if (sentAt) updates.sent_at = sentAt;
    const { error } = await sb.from("follow_ups").update(updates).eq("id", id);
    if (error) throw error;
    return true;
  } catch (err) {
    console.error("[db] updateFollowUpStatus:", err);
    return false;
  }
}

/* ── Processed Emails (trip + version join) ────────────────── */

export async function getProcessedTrips(): Promise<
  | (DbTrip & { trip_versions: DbTripVersion[]; customers: DbCustomer })[]
  | null
> {
  const sb = getSupabase();
  if (!sb) return null;
  try {
    const { data, error } = await sb
      .from("trips")
      .select("*, trip_versions(*), customers(*)")
      .order("created_at", { ascending: false })
      .limit(100);
    if (error) throw error;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return data as any;
  } catch (err) {
    console.error("[db] getProcessedTrips:", err);
    return null;
  }
}

export async function getProcessedCount(): Promise<number> {
  const sb = getSupabase();
  if (!sb) return 0;
  try {
    const { count, error } = await sb
      .from("trips")
      .select("*", { count: "exact", head: true });
    if (error) throw error;
    return count || 0;
  } catch (err) {
    console.error("[db] getProcessedCount:", err);
    return 0;
  }
}
