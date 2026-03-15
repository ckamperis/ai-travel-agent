# API Setup — Quick Reference v2

## 1. Claude API ✅ (ήδη το έχεις)
🔗 https://console.anthropic.com
- Key: sk-ant-api03-...
- Model: claude-sonnet-4-20250514

---

## 2. Google Places API (5 λεπτά)

🔗 https://console.cloud.google.com/

| Βήμα | Τι κάνεις |
|------|-----------|
| 1 | Project → επέλεξε ή δημιούργησε |
| 2 | APIs & Services → Library |
| 3 | Ψάξε "Places API (New)" → Enable |
| 4 | Credentials → Create Credentials → API Key |
| 5 | Βάλτο στο .env.local |

**Test:**
```bash
curl -X POST "https://places.googleapis.com/v1/places:searchText" \
  -H "Content-Type: application/json" \
  -H "X-Goog-Api-Key: YOUR_KEY" \
  -H "X-Goog-FieldMask: places.displayName,places.rating,places.formattedAddress" \
  -d '{"textQuery": "best restaurants Athens Plaka", "maxResultCount": 3}'
```
✅ Αν πάρεις JSON με results → δουλεύει!

---

## 3. Duffel API (0 λεπτά — ΔΕΝ χρειάζεται signup!)

- **Test key:** `duffel_test`
- Βάζεις αυτό ως DUFFEL_API_KEY στο .env.local
- Επιστρέφει simulated αλλά ρεαλιστικά flight data
- Για real data αργότερα: signup στο https://app.duffel.com

**Test:**
```bash
curl -s -X POST "https://api.duffel.com/air/offer_requests" \
  -H "Authorization: Bearer duffel_test" \
  -H "Duffel-Version: v2" \
  -H "Content-Type: application/json" \
  -d '{
    "data": {
      "slices": [{"origin": "LHR", "destination": "ATH", "departure_date": "2025-08-04"}],
      "passengers": [{"type": "adult"}, {"type": "adult"}],
      "cabin_class": "economy"
    }
  }' | head -c 500
```
✅ Αν πάρεις JSON με offers → δουλεύει!

Αν HAM→ATH δεν βγάζει αποτελέσματα, δοκίμασε LHR→ATH ή FRA→ATH.

---

## .env.local

```env
# Claude API
ANTHROPIC_API_KEY=sk-ant-api03-xxxxxxxxxxxxx

# Google Places (New API v1)
GOOGLE_PLACES_API_KEY=AIzaSyxxxxxxxxxxxxxxxxx

# Duffel (test mode — no signup needed)
DUFFEL_API_KEY=duffel_test
```

---

## Checklist

- [ ] Claude API key ready
- [ ] Google Cloud project exists
- [ ] Places API (New) enabled
- [ ] Google API key created + tested
- [ ] Duffel test curl works
- [ ] .env.local created with all 3 keys
- [ ] Node.js 18+ installed
- [ ] Claude Code installed + working
- [ ] CLAUDE.md + BUILD_PLAN.md στον φάκελο του project

---

## Μετά το checklist → Άνοιξε Claude Code

```bash
mkdir ai-travel-agent
cd ai-travel-agent
# Βάλε CLAUDE.md, BUILD_PLAN.md, .env.local στον φάκελο
claude
# Μέσα στο Claude Code, copy-paste Prompt 1 από BUILD_PLAN.md
```