-- ===========================================
-- PROLEAD - Migration 004: Hotfix voor morgen
-- ===========================================
-- Bevat: company_profile kolom, provider_message_id op emails,
-- nullable email_account_id (voor inbound), suppression-tabel,
-- unsubscribe_token op emails.
-- ===========================================

-- 1. organizations.company_profile (gebruikt door code, niet in eerdere migraties)
ALTER TABLE organizations
  ADD COLUMN IF NOT EXISTS company_profile JSONB DEFAULT '{}'::jsonb;

-- 2. emails.provider_message_id — Resend message id persist
ALTER TABLE emails
  ADD COLUMN IF NOT EXISTS provider_message_id TEXT;

CREATE INDEX IF NOT EXISTS idx_emails_provider_message_id
  ON emails(provider_message_id);

-- 3. emails.unsubscribe_token — one-click unsubscribe token per send
ALTER TABLE emails
  ADD COLUMN IF NOT EXISTS unsubscribe_token TEXT;

CREATE INDEX IF NOT EXISTS idx_emails_unsubscribe_token
  ON emails(unsubscribe_token);

-- 4. emails.email_account_id nullable — inbound heeft geen account
ALTER TABLE emails
  ALTER COLUMN email_account_id DROP NOT NULL;

-- De FK cascade blijft bestaan; een NULL waarde is nu geldig.

-- 5. email_suppressions tabel — centrale opt-out
CREATE TABLE IF NOT EXISTS email_suppressions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  reason TEXT NOT NULL CHECK (reason IN (
    'unsubscribed', 'bounced_hard', 'complained', 'invalid', 'manual'
  )),
  source TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_suppressions_org_email
  ON email_suppressions(org_id, email);

CREATE INDEX IF NOT EXISTS idx_suppressions_org
  ON email_suppressions(org_id);

ALTER TABLE email_suppressions ENABLE ROW LEVEL SECURITY;

-- Idempotent policy create
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'email_suppressions'
      AND policyname = 'email_suppressions_org_policy'
  ) THEN
    EXECUTE 'CREATE POLICY "email_suppressions_org_policy" ON email_suppressions
      FOR ALL USING (org_id IN (SELECT org_id FROM users WHERE id = auth.uid()))';
  END IF;
END $$;
