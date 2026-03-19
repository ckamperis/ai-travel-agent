const GMAIL_API = "https://gmail.googleapis.com/gmail/v1/users/me";

export interface GmailEmail {
  id: string;
  from: string;
  subject: string;
  body: string;
  date: string;
  snippet: string;
}

/**
 * Fetch recent primary inbox emails from Gmail API.
 */
export async function fetchInboxEmails(
  accessToken: string,
  maxResults: number = 20
): Promise<GmailEmail[]> {
  // Step 1: List message IDs
  const listUrl = `${GMAIL_API}/messages?q=${encodeURIComponent(
    "in:inbox category:primary newer_than:7d"
  )}&maxResults=${maxResults}`;

  const listRes = await fetch(listUrl, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!listRes.ok) {
    const text = await listRes.text();
    console.error(`[Gmail] messages.list failed ${listRes.status}: ${text}`);
    if (listRes.status === 401) throw new Error("GMAIL_TOKEN_EXPIRED");
    throw new Error(`Gmail API error: ${listRes.status}`);
  }

  const listData = await listRes.json();
  const messageIds: { id: string }[] = listData.messages || [];

  if (messageIds.length === 0) return [];

  // Step 2: Fetch each message in parallel (Gmail has generous per-user limits)
  const emails = await Promise.all(
    messageIds.map((m) => fetchSingleMessage(accessToken, m.id))
  );

  return emails.filter((e): e is GmailEmail => e !== null);
}

async function fetchSingleMessage(
  accessToken: string,
  messageId: string
): Promise<GmailEmail | null> {
  try {
    const res = await fetch(
      `${GMAIL_API}/messages/${messageId}?format=full`,
      { headers: { Authorization: `Bearer ${accessToken}` } }
    );

    if (!res.ok) return null;

    const msg = await res.json();
    const headers = msg.payload?.headers || [];

    const getHeader = (name: string): string =>
      headers.find(
        (h: { name: string; value: string }) =>
          h.name.toLowerCase() === name.toLowerCase()
      )?.value || "";

    const from = getHeader("From");
    const subject = getHeader("Subject");
    const dateStr = getHeader("Date");
    const body = extractBody(msg.payload);

    return {
      id: msg.id,
      from,
      subject,
      body,
      date: dateStr,
      snippet: msg.snippet || "",
    };
  } catch (err) {
    console.error(`[Gmail] Failed to fetch message ${messageId}:`, err);
    return null;
  }
}

/**
 * Extract plain text body from Gmail message payload.
 * Handles text/plain, text/html (strip tags), and multipart/* (recurse).
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function extractBody(payload: any): string {
  if (!payload) return "";

  const mimeType = payload.mimeType || "";

  // Direct text/plain
  if (mimeType === "text/plain" && payload.body?.data) {
    return decodeBase64Url(payload.body.data);
  }

  // Multipart — recurse into parts, prefer text/plain
  if (mimeType.startsWith("multipart/") && Array.isArray(payload.parts)) {
    // Try text/plain first
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const plainPart = payload.parts.find((p: any) => p.mimeType === "text/plain");
    if (plainPart?.body?.data) {
      return decodeBase64Url(plainPart.body.data);
    }

    // Recurse into nested multipart
    for (const part of payload.parts) {
      const result = extractBody(part);
      if (result) return result;
    }

    // Fallback to text/html (strip tags)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const htmlPart = payload.parts.find((p: any) => p.mimeType === "text/html");
    if (htmlPart?.body?.data) {
      return stripHtml(decodeBase64Url(htmlPart.body.data));
    }
  }

  // Direct text/html fallback
  if (mimeType === "text/html" && payload.body?.data) {
    return stripHtml(decodeBase64Url(payload.body.data));
  }

  return "";
}

function decodeBase64Url(data: string): string {
  // Gmail uses base64url encoding (no padding, - instead of +, _ instead of /)
  const base64 = data.replace(/-/g, "+").replace(/_/g, "/");
  return Buffer.from(base64, "base64").toString("utf-8");
}

function stripHtml(html: string): string {
  return html
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "")
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>/gi, "\n\n")
    .replace(/<\/div>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}
