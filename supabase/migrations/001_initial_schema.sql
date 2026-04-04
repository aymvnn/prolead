-- ===========================================
-- PROLEAD - Initial Database Schema
-- ===========================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ── Organizations ──────────────────────────

CREATE TABLE organizations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  settings JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ── Users ──────────────────────────────────

CREATE TABLE users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  email TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('owner', 'admin', 'member')),
  avatar_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_users_org ON users(org_id);

-- ── Voice Profiles ─────────────────────────

CREATE TABLE voice_profiles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  sample_emails TEXT[] DEFAULT '{}',
  tone_description TEXT NOT NULL DEFAULT '',
  style_guidelines TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_voice_profiles_org ON voice_profiles(org_id);

-- ── Leads ──────────────────────────────────

CREATE TABLE leads (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  company TEXT NOT NULL,
  title TEXT,
  linkedin_url TEXT,
  phone TEXT,
  website TEXT,
  industry TEXT,
  employee_count INTEGER,
  enrichment_data JSONB,
  icp_score NUMERIC(5,2),
  status TEXT NOT NULL DEFAULT 'new' CHECK (status IN (
    'new', 'researched', 'contacted', 'replied', 'interested',
    'meeting_booked', 'closed_won', 'closed_lost', 'unsubscribed', 'bounced'
  )),
  source TEXT,
  last_activity_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_leads_org ON leads(org_id);
CREATE INDEX idx_leads_status ON leads(org_id, status);
CREATE INDEX idx_leads_email ON leads(org_id, email);
CREATE INDEX idx_leads_company ON leads(org_id, company);
CREATE UNIQUE INDEX idx_leads_org_email ON leads(org_id, email);

-- ── Lead Tags ──────────────────────────────

CREATE TABLE lead_tags (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  lead_id UUID NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
  tag TEXT NOT NULL
);

CREATE INDEX idx_lead_tags_lead ON lead_tags(lead_id);
CREATE UNIQUE INDEX idx_lead_tags_unique ON lead_tags(lead_id, tag);

-- ── Lead Notes ─────────────────────────────

CREATE TABLE lead_notes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  lead_id UUID NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_lead_notes_lead ON lead_notes(lead_id);

-- ── Lead Trigger Events ────────────────────

CREATE TABLE lead_trigger_events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  lead_id UUID NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL CHECK (event_type IN (
    'job_change', 'funding', 'new_hire', 'company_news', 'technology_change', 'expansion'
  )),
  event_data JSONB NOT NULL DEFAULT '{}',
  detected_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_trigger_events_lead ON lead_trigger_events(lead_id);

-- ── ICP Profiles ───────────────────────────

CREATE TABLE icp_profiles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  criteria JSONB NOT NULL DEFAULT '{}',
  description TEXT NOT NULL DEFAULT '',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_icp_profiles_org ON icp_profiles(org_id);

-- ── Campaigns ──────────────────────────────

CREATE TABLE campaigns (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN (
    'draft', 'active', 'paused', 'completed', 'archived'
  )),
  icp_id UUID REFERENCES icp_profiles(id) ON DELETE SET NULL,
  voice_profile_id UUID REFERENCES voice_profiles(id) ON DELETE SET NULL,
  settings JSONB DEFAULT '{}',
  stats JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_campaigns_org ON campaigns(org_id);
CREATE INDEX idx_campaigns_status ON campaigns(org_id, status);

-- ── Sequences ──────────────────────────────

CREATE TABLE sequences (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  campaign_id UUID NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  steps_count INTEGER DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN (
    'draft', 'active', 'paused', 'completed'
  )),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_sequences_campaign ON sequences(campaign_id);

-- ── Sequence Steps ─────────────────────────

CREATE TABLE sequence_steps (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  sequence_id UUID NOT NULL REFERENCES sequences(id) ON DELETE CASCADE,
  step_number INTEGER NOT NULL,
  channel TEXT NOT NULL DEFAULT 'email' CHECK (channel IN ('email', 'linkedin')),
  delay_days INTEGER DEFAULT 0,
  delay_hours INTEGER DEFAULT 0,
  template_id UUID,
  ab_test_id UUID,
  settings JSONB DEFAULT '{}'
);

CREATE INDEX idx_sequence_steps_seq ON sequence_steps(sequence_id);

-- ── Email Accounts ─────────────────────────

CREATE TABLE email_accounts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  display_name TEXT,
  provider TEXT NOT NULL DEFAULT 'smtp' CHECK (provider IN ('smtp', 'resend')),
  smtp_host TEXT,
  smtp_port INTEGER,
  smtp_user TEXT,
  smtp_pass_encrypted TEXT,
  imap_host TEXT,
  imap_port INTEGER,
  warmup_status TEXT DEFAULT 'inactive' CHECK (warmup_status IN (
    'inactive', 'warming', 'warmed', 'paused'
  )),
  daily_limit INTEGER DEFAULT 50,
  emails_sent_today INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_email_accounts_org ON email_accounts(org_id);

-- ── Emails ─────────────────────────────────

CREATE TABLE emails (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  lead_id UUID NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
  campaign_id UUID REFERENCES campaigns(id) ON DELETE SET NULL,
  sequence_id UUID REFERENCES sequences(id) ON DELETE SET NULL,
  step_id UUID REFERENCES sequence_steps(id) ON DELETE SET NULL,
  email_account_id UUID NOT NULL REFERENCES email_accounts(id) ON DELETE CASCADE,
  from_email TEXT NOT NULL,
  to_email TEXT NOT NULL,
  subject TEXT NOT NULL,
  body_html TEXT NOT NULL,
  body_text TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'queued' CHECK (status IN (
    'queued', 'sending', 'sent', 'delivered', 'opened', 'clicked', 'replied', 'bounced', 'failed'
  )),
  direction TEXT NOT NULL DEFAULT 'outbound' CHECK (direction IN ('outbound', 'inbound')),
  thread_id TEXT,
  opened_at TIMESTAMPTZ,
  clicked_at TIMESTAMPTZ,
  replied_at TIMESTAMPTZ,
  bounced_at TIMESTAMPTZ,
  sent_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_emails_org ON emails(org_id);
CREATE INDEX idx_emails_lead ON emails(lead_id);
CREATE INDEX idx_emails_campaign ON emails(campaign_id);
CREATE INDEX idx_emails_status ON emails(org_id, status);
CREATE INDEX idx_emails_thread ON emails(thread_id);

-- ── Email Templates ────────────────────────

CREATE TABLE email_templates (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  subject TEXT NOT NULL,
  body TEXT NOT NULL,
  variables JSONB DEFAULT '[]',
  category TEXT,
  performance_stats JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_email_templates_org ON email_templates(org_id);

-- ── A/B Tests ──────────────────────────────

CREATE TABLE ab_tests (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  campaign_id UUID NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  variant_a JSONB NOT NULL DEFAULT '{}',
  variant_b JSONB NOT NULL DEFAULT '{}',
  winner TEXT CHECK (winner IN ('a', 'b')),
  results JSONB DEFAULT '{"a": {}, "b": {}}',
  status TEXT NOT NULL DEFAULT 'running' CHECK (status IN ('running', 'completed', 'paused')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_ab_tests_campaign ON ab_tests(campaign_id);

-- ── Conversations ──────────────────────────

CREATE TABLE conversations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  lead_id UUID NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
  campaign_id UUID REFERENCES campaigns(id) ON DELETE SET NULL,
  channel TEXT NOT NULL DEFAULT 'email' CHECK (channel IN ('email', 'linkedin')),
  messages JSONB DEFAULT '[]',
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN (
    'active', 'paused', 'closed', 'escalated'
  )),
  ai_summary TEXT,
  intent_classification TEXT,
  meeting_booked BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_conversations_lead ON conversations(lead_id);
CREATE INDEX idx_conversations_campaign ON conversations(campaign_id);
CREATE INDEX idx_conversations_status ON conversations(status);

-- ── Meetings ───────────────────────────────

CREATE TABLE meetings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  lead_id UUID NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
  conversation_id UUID REFERENCES conversations(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  start_time TIMESTAMPTZ NOT NULL,
  end_time TIMESTAMPTZ NOT NULL,
  timezone TEXT NOT NULL DEFAULT 'UTC',
  calendar_event_id TEXT,
  meeting_link TEXT,
  status TEXT NOT NULL DEFAULT 'scheduled' CHECK (status IN (
    'scheduled', 'completed', 'cancelled', 'no_show'
  )),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_meetings_org ON meetings(org_id);
CREATE INDEX idx_meetings_lead ON meetings(lead_id);
CREATE INDEX idx_meetings_time ON meetings(org_id, start_time);

-- ── Integrations ───────────────────────────

CREATE TABLE integrations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN (
    'google_calendar', 'linkedin', 'crm', 'smtp', 'resend'
  )),
  config JSONB NOT NULL DEFAULT '{}',
  status TEXT NOT NULL DEFAULT 'disconnected' CHECK (status IN (
    'connected', 'disconnected', 'error'
  )),
  last_sync_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_integrations_org ON integrations(org_id);

-- ── Analytics Events ───────────────────────

CREATE TABLE analytics_events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id UUID NOT NULL,
  properties JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_analytics_org ON analytics_events(org_id);
CREATE INDEX idx_analytics_type ON analytics_events(org_id, event_type);
CREATE INDEX idx_analytics_time ON analytics_events(org_id, created_at);

-- ── Daily Stats ────────────────────────────

CREATE TABLE daily_stats (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  emails_sent INTEGER DEFAULT 0,
  emails_opened INTEGER DEFAULT 0,
  emails_replied INTEGER DEFAULT 0,
  meetings_booked INTEGER DEFAULT 0,
  leads_researched INTEGER DEFAULT 0,
  response_rate NUMERIC(5,2) DEFAULT 0,
  open_rate NUMERIC(5,2) DEFAULT 0
);

CREATE UNIQUE INDEX idx_daily_stats_org_date ON daily_stats(org_id, date);

-- ── Updated At Trigger ─────────────────────

CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER leads_updated_at
  BEFORE UPDATE ON leads
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER campaigns_updated_at
  BEFORE UPDATE ON campaigns
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER conversations_updated_at
  BEFORE UPDATE ON conversations
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ── Row Level Security ─────────────────────

ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE voice_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE lead_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE lead_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE lead_trigger_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE icp_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE sequences ENABLE ROW LEVEL SECURITY;
ALTER TABLE sequence_steps ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE emails ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE ab_tests ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE meetings ENABLE ROW LEVEL SECURITY;
ALTER TABLE integrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE analytics_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE daily_stats ENABLE ROW LEVEL SECURITY;

-- RLS Policies: Users can only access their organization's data

CREATE POLICY "users_org_access" ON users
  FOR ALL USING (org_id IN (
    SELECT org_id FROM users WHERE id = auth.uid()
  ));

CREATE POLICY "org_access" ON organizations
  FOR ALL USING (id IN (
    SELECT org_id FROM users WHERE id = auth.uid()
  ));

-- Generic org-scoped policy for all org-scoped tables
DO $$
DECLARE
  tbl TEXT;
BEGIN
  FOR tbl IN SELECT unnest(ARRAY[
    'voice_profiles', 'leads', 'icp_profiles', 'campaigns',
    'email_accounts', 'emails', 'email_templates',
    'meetings', 'integrations', 'analytics_events', 'daily_stats'
  ]) LOOP
    EXECUTE format(
      'CREATE POLICY "%s_org_policy" ON %I FOR ALL USING (org_id IN (SELECT org_id FROM users WHERE id = auth.uid()))',
      tbl, tbl
    );
  END LOOP;
END $$;

-- Policies for tables that reference leads (org access via lead)
CREATE POLICY "lead_tags_access" ON lead_tags
  FOR ALL USING (lead_id IN (
    SELECT id FROM leads WHERE org_id IN (SELECT org_id FROM users WHERE id = auth.uid())
  ));

CREATE POLICY "lead_notes_access" ON lead_notes
  FOR ALL USING (lead_id IN (
    SELECT id FROM leads WHERE org_id IN (SELECT org_id FROM users WHERE id = auth.uid())
  ));

CREATE POLICY "lead_trigger_events_access" ON lead_trigger_events
  FOR ALL USING (lead_id IN (
    SELECT id FROM leads WHERE org_id IN (SELECT org_id FROM users WHERE id = auth.uid())
  ));

-- Policies for tables that reference campaigns
CREATE POLICY "sequences_access" ON sequences
  FOR ALL USING (campaign_id IN (
    SELECT id FROM campaigns WHERE org_id IN (SELECT org_id FROM users WHERE id = auth.uid())
  ));

CREATE POLICY "sequence_steps_access" ON sequence_steps
  FOR ALL USING (sequence_id IN (
    SELECT id FROM sequences WHERE campaign_id IN (
      SELECT id FROM campaigns WHERE org_id IN (SELECT org_id FROM users WHERE id = auth.uid())
    )
  ));

CREATE POLICY "ab_tests_access" ON ab_tests
  FOR ALL USING (campaign_id IN (
    SELECT id FROM campaigns WHERE org_id IN (SELECT org_id FROM users WHERE id = auth.uid())
  ));

CREATE POLICY "conversations_access" ON conversations
  FOR ALL USING (lead_id IN (
    SELECT id FROM leads WHERE org_id IN (SELECT org_id FROM users WHERE id = auth.uid())
  ));
