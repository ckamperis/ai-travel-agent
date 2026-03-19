import { auth } from "@/auth";
import { fetchInboxEmails } from "@/lib/gmail";
import { classifyEmails } from "@/lib/gmail-classify";

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

    const result = { emails: travelEmails, total: allEmails.length };
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
