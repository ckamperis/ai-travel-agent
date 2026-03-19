import OpenAI from "openai";
import type { GmailEmail } from "./gmail";

/* ── Pre-filter rules (no AI needed) ─────────────────────────── */

const NOREPLY_PATTERNS = [
  "noreply@", "no-reply@", "newsletter@", "mailer@",
  "notifications@", "alert@", "updates@", "digest@",
  "marketing@", "promo@", "info@google.com", "support@",
];

const SKIP_SUBJECT_PATTERNS = [
  "unsubscribe", "receipt", "invoice", "password reset",
  "verification code", "otp", "confirm your", "verify your",
  "order confirmation", "shipping update", "delivery notification",
  "payment received", "subscription", "newsletter", "weekly digest",
  "security alert", "sign-in", "login attempt",
];

function shouldPreFilterSkip(email: GmailEmail): string | null {
  const fromLower = email.from.toLowerCase();
  const subjectLower = (email.subject || "").toLowerCase().trim();
  const bodyLength = (email.body || "").trim().length;

  // Empty/blank subject AND very short body
  if ((!subjectLower || subjectLower.length === 0) && bodyLength < 50) {
    return "empty subject + short body";
  }

  // No-reply addresses
  for (const pattern of NOREPLY_PATTERNS) {
    if (fromLower.includes(pattern)) {
      return `noreply sender (${pattern})`;
    }
  }

  // Skip subject keywords
  for (const pattern of SKIP_SUBJECT_PATTERNS) {
    if (subjectLower.includes(pattern)) {
      return `skip keyword in subject ("${pattern}")`;
    }
  }

  return null; // passes pre-filter
}

/* ── Main classify function ──────────────────────────────────── */

/**
 * Classify emails as travel-related or not.
 * Stage 1: Pre-filter (instant, free)
 * Stage 2: GPT-4o-mini classification (cheap, batched)
 * Returns only emails classified as "travel".
 */
export async function classifyEmails(
  emails: GmailEmail[]
): Promise<GmailEmail[]> {
  if (emails.length === 0) return [];

  // Stage 1: Pre-filter
  const candidates: GmailEmail[] = [];
  for (const email of emails) {
    const skipReason = shouldPreFilterSkip(email);
    if (skipReason) {
      console.log(`[Classifier] PRE-FILTER SKIP: "${email.from}" subject="${email.subject || '(empty)'}" → ${skipReason}`);
    } else {
      candidates.push(email);
    }
  }

  console.log(`[Classifier] Pre-filter: ${emails.length} emails → ${candidates.length} candidates (${emails.length - candidates.length} skipped)`);

  if (candidates.length === 0) return [];

  // Stage 2: AI classification
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    console.warn("[Classifier] No OPENAI_API_KEY — returning all candidates unfiltered");
    return candidates;
  }

  const client = new OpenAI({ apiKey });
  const batchSize = 10;
  const results: boolean[] = [];

  for (let i = 0; i < candidates.length; i += batchSize) {
    const batch = candidates.slice(i, i + batchSize);
    const classifications = await classifyBatch(client, batch);
    results.push(...classifications);
  }

  const travelEmails = candidates.filter((_, i) => results[i]);

  // Log final results
  for (let i = 0; i < candidates.length; i++) {
    const e = candidates[i];
    const label = results[i] ? "travel" : "skip";
    console.log(`[Classifier] "${e.from}" subject="${e.subject || '(empty)'}" → ${label}`);
  }

  return travelEmails;
}

/* ── Batch AI classification ──────────────────────────────────── */

async function classifyBatch(
  client: OpenAI,
  batch: GmailEmail[]
): Promise<boolean[]> {
  const numbered = batch
    .map((e, i) => {
      const snippet = (e.body || "").slice(0, 300).replace(/\n/g, " ");
      return `${i + 1}. From: ${e.from}\n   Subject: ${e.subject || "(empty)"}\n   Snippet: ${snippet}`;
    })
    .join("\n\n");

  try {
    const response = await client.chat.completions.create({
      model: "gpt-4o-mini",
      max_tokens: 200,
      temperature: 0,
      messages: [
        {
          role: "system",
          content: `You are a travel inquiry classifier for a travel agency inbox.
For each numbered email, respond with ONLY the number followed by "travel" or "skip", one per line.

"travel" ONLY if the email is a GENUINE customer inquiry asking the travel agency to plan, book, or organize a trip. Must contain at least ONE of:
- Specific destination mention
- Date/duration mention
- Request for flights, hotels, or activities
- Budget mention
- Group size mention

"skip" for EVERYTHING else including:
- Empty or blank emails
- Newsletters, promotions, marketing
- Receipts, confirmations, invoices
- Personal emails not related to travel planning
- Spam or automated notifications
- Emails with empty or missing subjects
- General questions not about trip planning

When in doubt, classify as "skip". Only clear travel planning requests pass.

Example response:
1. travel
2. skip
3. skip`,
        },
        {
          role: "user",
          content: numbered,
        },
      ],
    });

    const text = response.choices[0]?.message?.content || "";
    const lines = text.split("\n").map((l) => l.trim()).filter(Boolean);

    const map = new Map<number, boolean>();
    for (const line of lines) {
      const m = line.match(/^(\d+)\.\s*(travel|skip)/i);
      if (m) {
        map.set(parseInt(m[1]), m[2].toLowerCase() === "travel");
      }
    }

    // Default to skip (not travel) for unparsed entries
    return batch.map((_, i) => map.get(i + 1) ?? false);
  } catch (err) {
    console.error("[Classifier] AI classification failed:", err);
    // On error, default to skip (strict) rather than passing everything
    return batch.map(() => false);
  }
}
