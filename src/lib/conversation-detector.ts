/**
 * Conversation thread detection.
 * Checks if a Gmail thread already exists in our DB → existing conversation or new.
 */

import {
  getConversationByThreadId,
  getCustomerByEmail,
  getMessages,
  DbConversation,
} from "./db";
import { getSupabase } from "./supabase";

export interface ConversationDetectionResult {
  isNew: boolean;
  conversationId?: string;
  customerId?: string;
  tripId?: string;
  /** Previous messages in this conversation (most recent first, max 3) */
  previousMessages?: { direction: string; body_text: string; created_at: string }[];
}

/**
 * Detect whether a Gmail thread is new or part of an existing conversation.
 */
export async function detectConversation(
  gmailThreadId: string | undefined,
  senderEmail: string,
  subject: string
): Promise<ConversationDetectionResult> {
  // 1. Try thread ID lookup (fastest, most reliable)
  if (gmailThreadId) {
    const conversation = await getConversationByThreadId(gmailThreadId);
    if (conversation) {
      return await enrichExistingConversation(conversation);
    }
  }

  // 2. Fallback: check if sender is a known customer with an active conversation
  const customer = await getCustomerByEmail(senderEmail);
  if (customer) {
    const conversation = await findActiveConversationBySubject(
      customer.id,
      subject
    );
    if (conversation) {
      return await enrichExistingConversation(conversation);
    }

    // Known customer but no matching conversation → new conversation
    return { isNew: true, customerId: customer.id };
  }

  // 3. Completely new
  return { isNew: true };
}

/**
 * Enrich an existing conversation with trip and message context.
 */
async function enrichExistingConversation(
  conversation: DbConversation
): Promise<ConversationDetectionResult> {
  const result: ConversationDetectionResult = {
    isNew: false,
    conversationId: conversation.id,
    customerId: conversation.customer_id,
  };

  // Find associated trip
  const tripId = await findTripByConversation(conversation.id);
  if (tripId) {
    result.tripId = tripId;
  }

  // Get recent messages for context (last 3)
  const messages = await getMessages(conversation.id);
  if (messages && messages.length > 0) {
    result.previousMessages = messages
      .slice(-3)
      .reverse()
      .map((m) => ({
        direction: m.direction,
        body_text: m.body_text,
        created_at: m.created_at,
      }));
  }

  return result;
}

/**
 * Find an active conversation for a customer matching the subject line.
 * Handles "Re: " and "Fwd: " prefixes.
 */
async function findActiveConversationBySubject(
  customerId: string,
  subject: string
): Promise<DbConversation | null> {
  const sb = getSupabase();
  if (!sb) return null;

  // Normalize subject: strip Re:, Fwd:, etc.
  const normalized = normalizeSubject(subject);

  try {
    const { data, error } = await sb
      .from("conversations")
      .select("*")
      .eq("customer_id", customerId)
      .in("status", ["active", "new", "in_progress"])
      .order("last_message_at", { ascending: false })
      .limit(10);
    if (error) throw error;
    if (!data || data.length === 0) return null;

    // Match by normalized subject
    for (const conv of data) {
      if (normalizeSubject(conv.subject) === normalized) {
        return conv;
      }
    }
    return null;
  } catch (err) {
    console.error("[conversation-detector] findActiveConversationBySubject:", err);
    return null;
  }
}

/**
 * Find the trip associated with a conversation.
 */
async function findTripByConversation(
  conversationId: string
): Promise<string | null> {
  const sb = getSupabase();
  if (!sb) return null;

  try {
    const { data, error } = await sb
      .from("trips")
      .select("id")
      .eq("conversation_id", conversationId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (error) throw error;
    return data?.id ?? null;
  } catch (err) {
    console.error("[conversation-detector] findTripByConversation:", err);
    return null;
  }
}

/**
 * Normalize email subject by stripping Re:/Fwd:/FW: prefixes and trimming.
 */
function normalizeSubject(subject: string): string {
  return subject
    .replace(/^(re|fwd|fw)\s*:\s*/gi, "")
    .replace(/^(re|fwd|fw)\s*:\s*/gi, "") // Handle double Re: Re:
    .trim()
    .toLowerCase();
}
