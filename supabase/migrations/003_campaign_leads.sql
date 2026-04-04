-- ===========================================
-- PROLEAD - Campaign Leads Junction Table
-- ===========================================

-- ── Campaign Leads (many-to-many) ─────────

CREATE TABLE campaign_leads (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  campaign_id UUID NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
  lead_id UUID NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN (
    'pending', 'active', 'paused', 'completed', 'bounced', 'unsubscribed'
  )),
  current_step INTEGER DEFAULT 0,
  added_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE UNIQUE INDEX idx_campaign_leads_unique ON campaign_leads(campaign_id, lead_id);
CREATE INDEX idx_campaign_leads_campaign ON campaign_leads(campaign_id);
CREATE INDEX idx_campaign_leads_lead ON campaign_leads(lead_id);

-- ── RLS ───────────────────────────────────

ALTER TABLE campaign_leads ENABLE ROW LEVEL SECURITY;

CREATE POLICY "campaign_leads_access" ON campaign_leads
  FOR ALL USING (campaign_id IN (
    SELECT id FROM campaigns WHERE org_id IN (SELECT org_id FROM users WHERE id = auth.uid())
  ));
