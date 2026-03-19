import { auth } from "@/auth";
import { fetchInboxEmails, type GmailEmail } from "@/lib/gmail";
import { classifyEmails } from "@/lib/gmail-classify";
import { detectConversation, type ConversationDetectionResult } from "@/lib/conversation-detector";
import { classifyIntent, type IntentClassification } from "@/lib/intent-classifier";

/* ── Simple in-memory cache (5 min TTL) ──────────────────────── */

interface CacheEntry {
  data: unknown;
  timestamp: number;
}

const cache = new Map<string, CacheEntry>();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

function getCached(key: string): unknown | null {
  const entry = cache.get(key);
  if (!entry) return null;
  if (Date.now() - entry.timestamp > CACHE_TTL) {
    cache.delete(key);
    return null;
  }
  return entry.data;
}

function setCache(key: string, data: unknown) {
  cache.set(key, { data, timestamp: Date.now() });
}

/* ── Enriched email type returned to the client ──────────────── */

export interface EnrichedGmailEmail extends GmailEmail {
  conversation?: ConversationDetectionResult;
  intent?: IntentClassification;
}

/**
 * Extract sender email from a "From" header like "John Doe <john@example.com>"
 */
function extractSenderEmail(from: string): string {
  const match = from.match(/<([^>]+)>/);
  return (match ? match[1] : from).toLowerCase().trim();
}

/* ── GET /api/gmail ──────────────────────────────────────────── */

export async function GET(request: Request) {
  const session = await auth();

  if (!session?.accessToken) {
    return Response.json(
      { error: "Not authenticated. Connect Gmail first." },
      { status: 401 }
    );
  }

  if (session.error === "RefreshTokenError") {
    return Response.json(
      { error: "Gmail token expired. Please reconnect." },
      { status: 401 }
    );
  }

  // Check for force refresh
  const url = new URL(request.url);
  const forceRefresh = url.searchParams.get("refresh") === "1";

  const cacheKey = `gmail:${session.user?.email || "default"}`;

  if (!forceRefresh) {
    const cached = getCached(cacheKey);
    if (cached) {
      return Response.json(cached);
    }
  }

  try {
    console.log("[Gmail API] Fetching inbox emails...");
    const allEmails = await fetchInboxEmails(session.accessToken, 20);
    console.log(`[Gmail API] Fetched ${allEmails.length} emails, classifying...`);

    const travelEmails = await classifyEmails(allEmails);
    console.log(`[Gmail API] ${travelEmails.length} travel emails out of ${allEmails.length}`);

    // Enrich each travel email with conversation detection + intent classification
    const enrichedEmails = await enrichEmails(travelEmails);

    const result = { emails: enrichedEmails, total: allEmails.length };
    setCache(cacheKey, result);

    return Response.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";

    if (message === "GMAIL_TOKEN_EXPIRED") {
      return Response.json(
        { error: "Gmail token expired. Please reconnect." },
        { status: 401 }
      );
    }

    console.error("[Gmail API] Error:", err);
    return Response.json(
      { error: `Failed to fetch emails: ${message}` },
      { status: 500 }
    );
  }
}

/**
 * Enrich travel emails with conversation detection and intent classification.
 * Runs in parallel for all emails, but non-blocking — failures don't prevent return.
 */
async function enrichEmails(
  emails: GmailEmail[]
): Promise<EnrichedGmailEmail[]> {
  const enriched: EnrichedGmailEmail[] = await Promise.all(
    emails.map(async (email) => {
      const result: EnrichedGmailEmail = { ...email };

      try {
        // Step 1: Detect conversation
        const senderEmail = extractSenderEmail(email.from);
        const conversation = await detectConversation(
          email.threadId,
          senderEmail,
          email.subject
        );
        result.conversation = conversation;

        // Step 2: If existing conversation, classify intent
        if (!conversation.isNew && conversation.previousMessages) {
          const intent = await classifyIntent(
            email.body,
            conversation.previousMessages.map((m) => ({
              direction: m.direction,
              body_text: m.body_text,
            }))
          );
          result.intent = intent;
          console.log(
            `[Gmail API] Thread ${email.threadId}: intent=${intent.intent} (${intent.confidence})`
          );
        } else {
          console.log(
            `[Gmail API] Thread ${email.threadId}: new conversation`
          );
        }
      } catch (err) {
        console.error(
          `[Gmail API] Enrichment failed for ${email.id}:`,
          err
        );
        // Non-blocking: return email without enrichment
      }

      return result;
    })
  );

  return enriched;
}
