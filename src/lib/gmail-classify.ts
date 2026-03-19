import OpenAI from "openai";
import type { GmailEmail } from "./gmail";

/**
 * Classify emails as travel-related or not using GPT-4o-mini.
 * Processes in batches of 10 for efficiency.
 * Returns only emails classified as "travel".
 */
export async function classifyEmails(
  emails: GmailEmail[]
): Promise<GmailEmail[]> {
  if (emails.length === 0) return [];

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    console.warn("[GmailClassify] No OPENAI_API_KEY — returning all emails unfiltered");
    return emails;
  }

  const client = new OpenAI({ apiKey });
  const batchSize = 10;
  const results: boolean[] = [];

  for (let i = 0; i < emails.length; i += batchSize) {
    const batch = emails.slice(i, i + batchSize);
    const classifications = await classifyBatch(client, batch);
    results.push(...classifications);
  }

  return emails.filter((_, i) => results[i]);
}

async function classifyBatch(
  client: OpenAI,
  batch: GmailEmail[]
): Promise<boolean[]> {
  const numbered = batch
    .map((e, i) => {
      const snippet = e.body.slice(0, 300).replace(/\n/g, " ");
      return `${i + 1}. From: ${e.from}\n   Subject: ${e.subject}\n   Snippet: ${snippet}`;
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
          content: `You classify emails as travel-related or not.
For each numbered email, respond with ONLY the number followed by "travel" or "skip", one per line.

"travel" = booking inquiry, trip request, hotel/flight question, itinerary request, group travel, honeymoon, vacation planning, travel consultation.
"skip" = newsletters, promotions, receipts, confirmations, personal emails, spam, automated notifications.

Example response:
1. travel
2. skip
3. travel`,
        },
        {
          role: "user",
          content: numbered,
        },
      ],
    });

    const text = response.choices[0]?.message?.content || "";
    const lines = text.split("\n").map((l) => l.trim()).filter(Boolean);

    // Parse: each line is "N. travel" or "N. skip"
    const map = new Map<number, boolean>();
    for (const line of lines) {
      const m = line.match(/^(\d+)\.\s*(travel|skip)/i);
      if (m) {
        map.set(parseInt(m[1]), m[2].toLowerCase() === "travel");
      }
    }

    return batch.map((_, i) => map.get(i + 1) ?? false);
  } catch (err) {
    console.error("[GmailClassify] Classification failed:", err);
    // On error, include all emails (safer than dropping them)
    return batch.map(() => true);
  }
}
