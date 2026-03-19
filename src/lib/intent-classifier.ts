/**
 * Intent classification for email messages using GPT-4o-mini.
 * Determines if a message is a new trip request, revision, question, confirmation, etc.
 */

import OpenAI from "openai";

export type IntentType =
  | "new_trip"
  | "revision"
  | "question"
  | "confirmation"
  | "cancellation"
  | "other";

export interface ChangeRequest {
  /** What aspect the customer wants changed */
  aspect: "hotel" | "flights" | "dates" | "activities" | "budget" | "travelers" | "destination" | "other";
  /** Natural language description of the change */
  description: string;
}

export interface IntentClassification {
  intent: IntentType;
  confidence: number;
  /** Only present for 'revision' intent */
  changes?: ChangeRequest[];
  /** Brief summary of the customer's request */
  summary: string;
}

/**
 * Classify the intent of a new message in the context of previous messages.
 */
export async function classifyIntent(
  newMessage: string,
  previousMessages: { direction: string; body_text: string }[] = []
): Promise<IntentClassification> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    console.warn("[intent-classifier] No OPENAI_API_KEY — defaulting to new_trip");
    return { intent: "new_trip", confidence: 0.5, summary: "No API key for classification" };
  }

  const client = new OpenAI({ apiKey });

  // Build conversation context (max 3 previous messages)
  const contextMessages = previousMessages.slice(0, 3);
  const contextBlock = contextMessages.length > 0
    ? contextMessages
        .map((m, i) => `--- Previous message ${i + 1} (${m.direction}) ---\n${m.body_text.slice(0, 500)}`)
        .join("\n\n")
    : "(No previous messages — this is the first message in the thread)";

  try {
    const response = await client.chat.completions.create({
      model: "gpt-4o-mini",
      max_tokens: 500,
      temperature: 0,
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content: `You are a travel agency email intent classifier. Analyze the customer's new message in the context of previous conversation history and classify the intent.

Return JSON with this structure:
{
  "intent": "new_trip" | "revision" | "question" | "confirmation" | "cancellation" | "other",
  "confidence": 0.0-1.0,
  "summary": "Brief summary of what the customer wants",
  "changes": [{"aspect": "...", "description": "..."}]  // ONLY for "revision" intent
}

Intent definitions:
- "new_trip": Customer is requesting a new trip plan (destinations, dates, etc.) with no prior context
- "revision": Customer wants to CHANGE something about a previously proposed trip (different hotel, different dates, add activities, etc.)
- "question": Customer is asking a question about the trip or the proposal (pricing details, visa requirements, etc.)
- "confirmation": Customer is confirming/accepting/approving the proposed trip or parts of it
- "cancellation": Customer wants to cancel the trip or is no longer interested
- "other": None of the above (general greeting, unrelated topic, etc.)

For "revision" intent, the "changes" array must include what aspects changed. Valid aspects: "hotel", "flights", "dates", "activities", "budget", "travelers", "destination", "other".

Key signals for "revision":
- "actually", "instead", "change", "different", "prefer", "switch", "can you also", "add"
- "I'd rather", "what about", "is there", "do you have"
- Mentioning specific alternatives (e.g., "a hotel with a pool", "an earlier flight")`,
        },
        {
          role: "user",
          content: `CONVERSATION HISTORY:\n${contextBlock}\n\n--- NEW MESSAGE FROM CUSTOMER ---\n${newMessage.slice(0, 1000)}`,
        },
      ],
    });

    const text = response.choices[0]?.message?.content || "{}";
    const parsed = JSON.parse(text);

    return {
      intent: parsed.intent || "other",
      confidence: parsed.confidence || 0.5,
      changes: parsed.intent === "revision" ? parsed.changes || [] : undefined,
      summary: parsed.summary || "",
    };
  } catch (err) {
    console.error("[intent-classifier] Classification failed:", err);
    return {
      intent: "other",
      confidence: 0,
      summary: "Classification failed",
    };
  }
}
