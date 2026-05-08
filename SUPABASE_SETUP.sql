-- Run this in your Supabase SQL Editor (https://app.supabase.com → SQL Editor)
-- Creates the 3 new tables required by the Personal OS

-- ── Cold Calls ────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS cold_calls (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_name     text NOT NULL,
  contact_name     text,
  phone            text,
  called_at        timestamptz NOT NULL DEFAULT now(),
  outcome          text CHECK (outcome IN ('interested','callback','not_interested','no_answer')),
  notes            text,
  next_action      text,
  next_action_date date,
  created_at       timestamptz NOT NULL DEFAULT now()
);

-- RLS: only the admin can read/write cold_calls
ALTER TABLE cold_calls ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admin full access to cold_calls"
  ON cold_calls FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM "Clients"
      WHERE "Auth_UUID" = auth.uid() AND is_admin = true
    )
  );

-- ── Leads ─────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS leads (
  id                   uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_name         text NOT NULL,
  website              text,
  contact_name         text,
  email                text,
  phone                text,
  instagram_url        text,
  linkedin_url         text,
  facebook_url         text,
  other_info           jsonb,
  status               text NOT NULL DEFAULT 'new'
                         CHECK (status IN ('new','contacted','converted','dead')),
  ai_outreach_message  text,
  notes                text,
  created_at           timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE leads ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admin full access to leads"
  ON leads FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM "Clients"
      WHERE "Auth_UUID" = auth.uid() AND is_admin = true
    )
  );

-- ── Instagram Posts ───────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS instagram_posts (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  post_url          text,
  instagram_post_id text,
  caption           text,
  posted_at         timestamptz,
  likes             integer DEFAULT 0,
  comments          integer DEFAULT 0,
  reach             integer DEFAULT 0,
  impressions       integer DEFAULT 0,
  saves             integer DEFAULT 0,
  media_type        text DEFAULT 'image'
                      CHECK (media_type IN ('image','video','carousel')),
  ai_analysis       text,
  created_at        timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE instagram_posts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admin full access to instagram_posts"
  ON instagram_posts FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM "Clients"
      WHERE "Auth_UUID" = auth.uid() AND is_admin = true
    )
  );

-- ── Settings (for Instagram token + future config) ────────────────────────────
CREATE TABLE IF NOT EXISTS settings (
  key        text PRIMARY KEY,
  value      text,
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admin full access to settings"
  ON settings FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM "Clients"
      WHERE "Auth_UUID" = auth.uid() AND is_admin = true
    )
  );
