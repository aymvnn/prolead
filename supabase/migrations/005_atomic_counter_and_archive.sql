-- Migration 005: atomic sent-counter + archive-safe campaign delete
--
-- Two concurrent code paths increment email_accounts.emails_sent_today:
--   1) POST /api/emails/send         (manual send)
--   2) send-sequence-step Inngest fn (automated sequence step)
-- Both used read-modify-write: `set emails_sent_today = X + 1`. Under
-- parallel Inngest fan-out (100 events at once), this loses writes and the
-- daily-limit gate becomes useless. Move the increment into the database so
-- it's a single atomic statement.

CREATE OR REPLACE FUNCTION increment_account_sent(p_account_id UUID)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_count INTEGER;
BEGIN
  UPDATE email_accounts
    SET emails_sent_today = emails_sent_today + 1
  WHERE id = p_account_id
  RETURNING emails_sent_today INTO new_count;
  RETURN new_count;
END $$;

GRANT EXECUTE ON FUNCTION increment_account_sent(UUID) TO anon, authenticated, service_role;
