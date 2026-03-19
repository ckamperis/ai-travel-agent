-- ═══════════════════════════════════════════════════════════
-- TravelAgent AI — Initial Schema
-- Run via Supabase Dashboard → SQL Editor
-- ═══════════════════════════════════════════════════════════

-- 1. customers
CREATE TABLE IF NOT EXISTS customers (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email         TEXT NOT NULL UNIQUE,
  name          TEXT NOT NULL DEFAULT '',
  phone         TEXT DEFAULT '',
  language      TEXT DEFAULT 'en',
  preferred_tone TEXT DEFAULT 'professional',
  tags          TEXT[] DEFAULT '{}',
  notes         TEXT DEFAULT '',
  preferences   JSONB DEFAULT '{}',
  total_spend   NUMERIC(10,2) DEFAULT 0,
  trip_count    INT DEFAULT 0,
  source        TEXT DEFAULT 'manual',
  crm_external_id TEXT,
  created_at    TIMESTAMPTZ DEFAULT now(),
  updated_at    TIMESTAMPTZ DEFAULT now()
);

-- 2. conversations
CREATE TABLE IF NOT EXISTS conversations (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id     UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  gmail_thread_id TEXT UNIQUE,
  subject         TEXT DEFAULT '',
  status          TEXT DEFAULT 'active',
  message_count   INT DEFAULT 0,
  last_message_at TIMESTAMPTZ DEFAULT now(),
  created_at      TIMESTAMPTZ DEFAULT now(),
  updated_at      TIMESTAMPTZ DEFAULT now()
);

-- 3. messages
CREATE TABLE IF NOT EXISTS messages (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id  UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  direction        TEXT NOT NULL,
  from_email       TEXT NOT NULL,
  to_email         TEXT DEFAULT '',
  subject          TEXT DEFAULT '',
  body_text        TEXT DEFAULT '',
  body_html        TEXT DEFAULT '',
  gmail_message_id TEXT UNIQUE,
  classification   TEXT,
  created_at       TIMESTAMPTZ DEFAULT now()
);

-- 4. trips
CREATE TABLE IF NOT EXISTS trips (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id      UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  conversation_id  UUID REFERENCES conversations(id) ON DELETE SET NULL,
  status           TEXT DEFAULT 'new',
  destinations     TEXT[] DEFAULT '{}',
  dates            JSONB DEFAULT '{}',
  budget           JSONB DEFAULT '{}',
  travelers        JSONB DEFAULT '{}',
  special_requests TEXT[] DEFAULT '{}',
  current_version  INT DEFAULT 1,
  total_cost       NUMERIC(10,2),
  crm_external_id  TEXT,
  created_at       TIMESTAMPTZ DEFAULT now(),
  updated_at       TIMESTAMPTZ DEFAULT now()
);

-- 5. trip_versions
CREATE TABLE IF NOT EXISTS trip_versions (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id           UUID NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
  version_number    INT NOT NULL,
  selected_flights  JSONB DEFAULT '[]',
  selected_hotels   JSONB DEFAULT '[]',
  itinerary_text    TEXT DEFAULT '',
  included_places   JSONB DEFAULT '[]',
  composed_email    TEXT DEFAULT '',
  total_cost        NUMERIC(10,2),
  change_summary    TEXT DEFAULT '',
  agent_results     JSONB DEFAULT '{}',
  created_at        TIMESTAMPTZ DEFAULT now(),
  UNIQUE(trip_id, version_number)
);

-- 6. follow_ups
CREATE TABLE IF NOT EXISTS follow_ups (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id         UUID REFERENCES trips(id) ON DELETE SET NULL,
  customer_id     UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  scheduled_date  DATE NOT NULL,
  status          TEXT DEFAULT 'pending',
  reminder_text   TEXT DEFAULT '',
  sent_at         TIMESTAMPTZ,
  created_at      TIMESTAMPTZ DEFAULT now()
);

-- 7. crm_sync_log
CREATE TABLE IF NOT EXISTS crm_sync_log (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type   TEXT NOT NULL,
  entity_id     UUID NOT NULL,
  adapter_name  TEXT NOT NULL,
  direction     TEXT NOT NULL,
  status        TEXT NOT NULL,
  error_message TEXT,
  payload       JSONB,
  created_at    TIMESTAMPTZ DEFAULT now()
);

-- ═══════════════════════════════════════════════════════════
-- Indexes
-- ═══════════════════════════════════════════════════════════

CREATE INDEX IF NOT EXISTS idx_customers_email ON customers(email);
CREATE INDEX IF NOT EXISTS idx_conversations_customer ON conversations(customer_id);
CREATE INDEX IF NOT EXISTS idx_conversations_gmail_thread ON conversations(gmail_thread_id);
CREATE INDEX IF NOT EXISTS idx_conversations_status ON conversations(status);
CREATE INDEX IF NOT EXISTS idx_messages_conversation ON messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_messages_gmail_id ON messages(gmail_message_id);
CREATE INDEX IF NOT EXISTS idx_trips_customer ON trips(customer_id);
CREATE INDEX IF NOT EXISTS idx_trips_conversation ON trips(conversation_id);
CREATE INDEX IF NOT EXISTS idx_trips_status ON trips(status);
CREATE INDEX IF NOT EXISTS idx_trip_versions_trip ON trip_versions(trip_id);
CREATE INDEX IF NOT EXISTS idx_follow_ups_customer ON follow_ups(customer_id);
CREATE INDEX IF NOT EXISTS idx_follow_ups_status_date ON follow_ups(status, scheduled_date);
CREATE INDEX IF NOT EXISTS idx_crm_sync_log_entity ON crm_sync_log(entity_type, entity_id);

-- ═══════════════════════════════════════════════════════════
-- Row Level Security (single-tenant v1: all rows visible)
-- ═══════════════════════════════════════════════════════════

ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE trips ENABLE ROW LEVEL SECURITY;
ALTER TABLE trip_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE follow_ups ENABLE ROW LEVEL SECURITY;
ALTER TABLE crm_sync_log ENABLE ROW LEVEL SECURITY;

-- Allow all operations for authenticated users (single-tenant)
CREATE POLICY "Allow all for authenticated" ON customers FOR ALL USING (true);
CREATE POLICY "Allow all for authenticated" ON conversations FOR ALL USING (true);
CREATE POLICY "Allow all for authenticated" ON messages FOR ALL USING (true);
CREATE POLICY "Allow all for authenticated" ON trips FOR ALL USING (true);
CREATE POLICY "Allow all for authenticated" ON trip_versions FOR ALL USING (true);
CREATE POLICY "Allow all for authenticated" ON follow_ups FOR ALL USING (true);
CREATE POLICY "Allow all for authenticated" ON crm_sync_log FOR ALL USING (true);

-- ═══════════════════════════════════════════════════════════
-- updated_at trigger
-- ═══════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_customers_updated_at BEFORE UPDATE ON customers
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_conversations_updated_at BEFORE UPDATE ON conversations
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_trips_updated_at BEFORE UPDATE ON trips
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
