import { HotelResult } from "@/agents/types";

const BASE_URL = "https://booking-com15.p.rapidapi.com";
const RATE_LIMIT_MS = 1500;

function getHeaders(): Record<string, string> {
  const key = process.env.RAPIDAPI_KEY;
  if (!key) throw new Error("RAPIDAPI_KEY not set");
  return {
    "X-RapidAPI-Key": key,
    "X-RapidAPI-Host": "booking-com15.p.rapidapi.com",
  };
}

/* ── Rate limiter: max 1 API call per 1.5s ─────────────────────── */

let rateLimitQueue: Promise<void> = Promise.resolve();
let lastCallTime = 0;

async function rateLimitedFetch(url: string): Promise<Response> {
  const execute = async (): Promise<Response> => {
    const now = Date.now();
    const waitMs = Math.max(0, RATE_LIMIT_MS - (now - lastCallTime));
    if (waitMs > 0) await new Promise(r => setTimeout(r, waitMs));
    lastCallTime = Date.now();
    return fetch(url, { headers: getHeaders() });
  };

  const resultPromise = rateLimitQueue.then(execute, execute);
  rateLimitQueue = resultPromise.then(() => {}, () => {});
  return resultPromise;
}

async function fetchWithRetry(url: string): Promise<Response | null> {
  const res = await rateLimitedFetch(url);

  if (res.status === 403) {
    console.warn("[BookingAPI] RapidAPI key not subscribed to Booking.com API — using fallback");
    return null;
  }

  if (res.status === 429) {
    console.warn("[BookingAPI] Rate limited, retrying in 2s...");
    await new Promise(r => setTimeout(r, 2000));
    lastCallTime = Date.now();
    const retry = await fetch(url, { headers: getHeaders() });
    if (retry.status === 429 || retry.status === 403) {
      console.warn("[BookingAPI] Rate limited, falling back to GPT-4o");
      return null;
    }
    return retry;
  }

  return res;
}

/* ── Step A: Resolve destination ID (with cache) ──────────────── */

interface DestinationResult {
  dest_id: string;
  search_type: string;
  label: string;
}

const destinationCache = new Map<string, DestinationResult>();

export async function searchDestination(city: string): Promise<DestinationResult | null> {
  const cacheKey = city.toLowerCase().trim();
  if (destinationCache.has(cacheKey)) return destinationCache.get(cacheKey)!;

  const url = `${BASE_URL}/api/v1/hotels/searchDestination?query=${encodeURIComponent(city)}`;
  const res = await fetchWithRetry(url);

  if (!res) return null; // 403/429 — trigger fallback
  if (!res.ok) {
    console.error(`[BookingAPI] searchDestination failed ${res.status}: ${await res.text()}`);
    return null;
  }

  const json = await res.json();
  const results = json.data ?? json;

  if (!Array.isArray(results) || results.length === 0) {
    console.warn(`[BookingAPI] No destination found for "${city}"`);
    return null;
  }

  // Prefer city-level results
  const cityResult = results.find(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (r: any) => r.search_type === "city" || r.dest_type === "city"
  );
  const best = cityResult || results[0];

  const result: DestinationResult = {
    dest_id: String(best.dest_id),
    search_type: best.search_type || best.dest_type || "city",
    label: best.label || best.name || city,
  };

  destinationCache.set(cacheKey, result);
  return result;
}

/* ── Step B: Search hotels ──────────────────────────────────────── */

export async function searchBookingHotels(opts: {
  destId: string;
  searchType: string;
  checkIn: string;
  checkOut: string;
  adults: number;
  rooms?: number;
  currency?: string;
}): Promise<HotelResult[]> {
  const params = new URLSearchParams({
    dest_id: opts.destId,
    search_type: opts.searchType,
    arrival_date: opts.checkIn,
    departure_date: opts.checkOut,
    adults: String(opts.adults),
    room_qty: String(opts.rooms || 1),
    currency_code: opts.currency || "EUR",
    units: "metric",
    temperature_unit: "c",
    languagecode: "en-us",
    page_number: "1",
  });

  const url = `${BASE_URL}/api/v1/hotels/searchHotels?${params}`;
  const res = await fetchWithRetry(url);

  if (!res) return []; // 403/429 — trigger fallback
  if (!res.ok) {
    console.error(`[BookingAPI] searchHotels failed ${res.status}: ${await res.text()}`);
    return [];
  }

  const json = await res.json();
  const hotels = json.data?.hotels ?? json.data?.result ?? json.result ?? [];

  if (!Array.isArray(hotels) || hotels.length === 0) {
    console.warn("[BookingAPI] No hotels returned");
    return [];
  }

  const nights = computeNights(opts.checkIn, opts.checkOut);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return hotels.slice(0, 5).map((h: any): HotelResult => {
    const totalPrice = extractPrice(h);
    const perNight = nights > 0 && totalPrice > 0 ? Math.round(totalPrice / nights) : totalPrice;

    return {
      name: h.property?.name || h.hotel_name || h.name || "Unknown Hotel",
      area: h.property?.wishlistName || h.district || h.city || "",
      address: h.property?.countryCode
        ? `${h.property?.name || ""}, ${h.city_name || h.city || ""}`
        : h.address || h.hotel_name || "",
      pricePerNight: perNight,
      currency: h.property?.currency || h.currency_code || opts.currency || "EUR",
      rating: extractRating(h),
      stars: extractStars(h),
      metroStation: "-",
      metroDistance: "-",
      amenities: extractAmenities(h),
      highlights: h.property?.reviewScoreWord
        || h.review_score_word
        || (extractRating(h) >= 9 ? "Excellent" : extractRating(h) >= 8 ? "Very Good" : "Good"),
      lat: h.property?.latitude ?? h.latitude ?? undefined,
      lng: h.property?.longitude ?? h.longitude ?? undefined,
    };
  });
}

/* ── Location to coordinates ────────────────────────────────────── */

export async function locationToLatLong(query: string): Promise<{ lat: number; lng: number } | null> {
  const key = process.env.RAPIDAPI_KEY;
  if (!key) return null;

  try {
    const url = `${BASE_URL}/api/v1/meta/locationToLatLong?query=${encodeURIComponent(query)}`;
    const res = await fetchWithRetry(url);

    if (!res || !res.ok) return null;

    const json = await res.json();
    const data = json.data ?? json;

    if (data && (data.latitude || data.lat)) {
      return {
        lat: Number(data.latitude ?? data.lat),
        lng: Number(data.longitude ?? data.lng ?? data.lon),
      };
    }

    // Some responses return an array
    if (Array.isArray(data) && data.length > 0) {
      const first = data[0];
      return {
        lat: Number(first.latitude ?? first.lat),
        lng: Number(first.longitude ?? first.lng ?? first.lon),
      };
    }

    return null;
  } catch (err) {
    console.error("[BookingAPI] locationToLatLong failed:", err);
    return null;
  }
}

/* ── Helpers ────────────────────────────────────────────────────── */

function computeNights(checkIn: string, checkOut: string): number {
  const d1 = new Date(checkIn);
  const d2 = new Date(checkOut);
  const diff = Math.round((d2.getTime() - d1.getTime()) / (1000 * 60 * 60 * 24));
  return diff > 0 ? diff : 1;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function extractPrice(h: any): number {
  // The API nests price in several possible locations
  const price =
    h.property?.priceBreakdown?.grossPrice?.value ??
    h.property?.priceBreakdown?.strikethroughPrice?.value ??
    h.composite_price_breakdown?.gross_amount_per_night?.value ??
    h.composite_price_breakdown?.gross_amount?.value ??
    h.min_total_price ??
    h.price_breakdown?.gross_price ??
    h.price ??
    0;
  return Math.round(Number(price));
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function extractRating(h: any): number {
  const score =
    h.property?.reviewScore ??
    h.review_score ??
    h.rating ??
    0;
  return Math.round(Number(score) * 10) / 10;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function extractStars(h: any): number {
  const stars =
    h.property?.propertyClass ??
    h.property?.stars ??
    h.class ??
    h.stars ??
    h.hotel_class ??
    3;
  return Math.min(5, Math.max(1, Math.round(Number(stars))));
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function extractAmenities(h: any): string[] {
  // Booking API may include checkin/checkout info or badges
  const amenities: string[] = ["WiFi"];
  const badges = h.property?.reviewScoreWord || h.review_score_word || "";

  if (h.property?.isPreferredPlus || h.is_genius_deal) amenities.push("Genius Deal");
  if (badges.toLowerCase().includes("superb") || badges.toLowerCase().includes("exceptional")) amenities.push("Top Rated");

  // Check for breakfast in various places
  const priceBreakdown = h.property?.priceBreakdown || h.composite_price_breakdown || {};
  const benefitBadges = priceBreakdown.benefitBadges || [];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  if (Array.isArray(benefitBadges) && benefitBadges.some((b: any) =>
    (b.text || b.identifier || "").toLowerCase().includes("breakfast")
  )) {
    amenities.push("Breakfast");
  }

  if (h.has_free_parking || h.hotel_has_free_parking) amenities.push("Free Parking");
  if (h.has_swimming_pool || h.hotel_has_swimming_pool) amenities.push("Pool");

  return amenities;
}
