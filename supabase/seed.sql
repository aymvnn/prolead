-- =============================================
-- PROLEAD - Seed Data for Development
-- Run after 001_initial_schema.sql migration
-- =============================================

-- Note: In production, org_id and user_id will come from Supabase Auth.
-- For development, we use placeholder UUIDs that match the authenticated user.
-- Replace 'YOUR_USER_ID' and 'YOUR_ORG_ID' with actual IDs after first login.

-- ── Sample Organization ──────────────────────
INSERT INTO organizations (id, name, settings)
VALUES (
  'a0000000-0000-0000-0000-000000000001',
  'GHAYM Group',
  '{"timezone": "Europe/Amsterdam", "language": "nl"}'
) ON CONFLICT (id) DO NOTHING;

-- ── Sample ICP Profile ───────────────────────
INSERT INTO icp_profiles (id, org_id, name, criteria, description, is_active)
VALUES (
  'b0000000-0000-0000-0000-000000000001',
  'a0000000-0000-0000-0000-000000000001',
  'SaaS Founders Benelux',
  '{
    "industries": ["SaaS", "Fintech", "E-commerce", "MarTech"],
    "company_sizes": {"min": 10, "max": 500},
    "titles": ["CEO", "CTO", "VP Sales", "Head of Growth", "Founder"],
    "locations": ["Benelux"],
    "pain_points": [
      "Lage reply rates op cold outreach",
      "Geen personalisatie op schaal",
      "Handmatig lead research kost te veel tijd",
      "Sales pipeline is onvoorspelbaar"
    ]
  }',
  'Industrieën: SaaS, Fintech, E-commerce, MarTech
Bedrijfsgrootte: 10-500 medewerkers
Functietitels: CEO, CTO, VP Sales, Head of Growth, Founder
Pijnpunten: Lage reply rates op cold outreach; Geen personalisatie op schaal; Handmatig lead research kost te veel tijd; Sales pipeline is onvoorspelbaar
Waardepropositie: ProLead helpt sales teams hun outreach te personaliseren op schaal met AI. Door automatisch leads te researchen en gepersonaliseerde emails te genereren, boeken onze klanten gemiddeld 3x meer meetings.',
  true
) ON CONFLICT (id) DO NOTHING;

-- ── Sample Leads ─────────────────────────────
INSERT INTO leads (id, org_id, email, first_name, last_name, company, title, linkedin_url, phone, website, industry, employee_count, status, source, icp_score, created_at)
VALUES
  ('c0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000001',
   'jan.devries@techflow.nl', 'Jan', 'de Vries', 'TechFlow', 'CEO',
   'https://linkedin.com/in/jandevries', '+31612345678', 'https://techflow.nl',
   'SaaS', 85, 'researched', 'linkedin', 92,
   NOW() - INTERVAL '7 days'),

  ('c0000000-0000-0000-0000-000000000002', 'a0000000-0000-0000-0000-000000000001',
   'lisa.bakker@growthbase.io', 'Lisa', 'Bakker', 'GrowthBase', 'VP Sales',
   'https://linkedin.com/in/lisabakker', '+31687654321', 'https://growthbase.io',
   'MarTech', 42, 'contacted', 'csv_import', 78,
   NOW() - INTERVAL '5 days'),

  ('c0000000-0000-0000-0000-000000000003', 'a0000000-0000-0000-0000-000000000001',
   'tom.hendriks@paypilot.eu', 'Tom', 'Hendriks', 'PayPilot', 'CTO',
   'https://linkedin.com/in/tomhendriks', NULL, 'https://paypilot.eu',
   'Fintech', 120, 'new', 'manual', NULL,
   NOW() - INTERVAL '3 days'),

  ('c0000000-0000-0000-0000-000000000004', 'a0000000-0000-0000-0000-000000000001',
   'sarah.jansen@shopify-plus.nl', 'Sarah', 'Jansen', 'ShopMax', 'Head of Growth',
   'https://linkedin.com/in/sarahjansen', '+31698765432', 'https://shopmax.nl',
   'E-commerce', 200, 'replied', 'linkedin', 85,
   NOW() - INTERVAL '10 days'),

  ('c0000000-0000-0000-0000-000000000005', 'a0000000-0000-0000-0000-000000000001',
   'mark.visser@datastack.io', 'Mark', 'Visser', 'DataStack', 'Founder',
   'https://linkedin.com/in/markvisser', '+31611223344', 'https://datastack.io',
   'SaaS', 28, 'interested', 'referral', 95,
   NOW() - INTERVAL '14 days'),

  ('c0000000-0000-0000-0000-000000000006', 'a0000000-0000-0000-0000-000000000001',
   'emma.willemsen@cloudnine.be', 'Emma', 'Willemsen', 'CloudNine', 'CEO',
   'https://linkedin.com/in/emmawillemsen', NULL, 'https://cloudnine.be',
   'SaaS', 65, 'meeting_booked', 'linkedin', 88,
   NOW() - INTERVAL '21 days'),

  ('c0000000-0000-0000-0000-000000000007', 'a0000000-0000-0000-0000-000000000001',
   'pieter.degraaf@logistiq.nl', 'Pieter', 'de Graaf', 'LogistiQ', 'COO',
   NULL, '+31655443322', 'https://logistiq.nl',
   'Logistics', 350, 'new', 'csv_import', NULL,
   NOW() - INTERVAL '1 day'),

  ('c0000000-0000-0000-0000-000000000008', 'a0000000-0000-0000-0000-000000000001',
   'nina.schmidt@fintechlab.de', 'Nina', 'Schmidt', 'FintechLab', 'VP Engineering',
   'https://linkedin.com/in/ninaschmidt', '+4915112345678', 'https://fintechlab.de',
   'Fintech', 95, 'contacted', 'linkedin', 72,
   NOW() - INTERVAL '8 days'),

  ('c0000000-0000-0000-0000-000000000009', 'a0000000-0000-0000-0000-000000000001',
   'robbert.kuiper@saleshub.nl', 'Robbert', 'Kuiper', 'SalesHub', 'Founder',
   'https://linkedin.com/in/robbertkuiper', '+31622334455', 'https://saleshub.nl',
   'SaaS', 15, 'closed_won', 'referral', 90,
   NOW() - INTERVAL '30 days'),

  ('c0000000-0000-0000-0000-000000000010', 'a0000000-0000-0000-0000-000000000001',
   'anke.peters@marketwise.be', 'Anke', 'Peters', 'MarketWise', 'CMO',
   'https://linkedin.com/in/ankepeters', NULL, 'https://marketwise.be',
   'MarTech', 55, 'unsubscribed', 'csv_import', 65,
   NOW() - INTERVAL '45 days'),

  ('c0000000-0000-0000-0000-000000000011', 'a0000000-0000-0000-0000-000000000001',
   'daan.mulder@apifirst.io', 'Daan', 'Mulder', 'APIFirst', 'CTO',
   'https://linkedin.com/in/daanmulder', '+31633445566', 'https://apifirst.io',
   'SaaS', 38, 'researched', 'manual', 82,
   NOW() - INTERVAL '4 days'),

  ('c0000000-0000-0000-0000-000000000012', 'a0000000-0000-0000-0000-000000000001',
   'sophie.vander.berg@retailflow.nl', 'Sophie', 'van der Berg', 'RetailFlow', 'Head of Sales',
   'https://linkedin.com/in/sophievdberg', '+31644556677', 'https://retailflow.nl',
   'E-commerce', 150, 'new', 'linkedin', NULL,
   NOW() - INTERVAL '2 days')
ON CONFLICT (id) DO NOTHING;

-- ── Sample Tags ──────────────────────────────
INSERT INTO lead_tags (lead_id, tag) VALUES
  ('c0000000-0000-0000-0000-000000000001', 'Priority'),
  ('c0000000-0000-0000-0000-000000000001', 'SaaS'),
  ('c0000000-0000-0000-0000-000000000002', 'MarTech'),
  ('c0000000-0000-0000-0000-000000000004', 'Hot Lead'),
  ('c0000000-0000-0000-0000-000000000005', 'VIP'),
  ('c0000000-0000-0000-0000-000000000005', 'Priority'),
  ('c0000000-0000-0000-0000-000000000006', 'Meeting Gepland'),
  ('c0000000-0000-0000-0000-000000000009', 'Klant'),
  ('c0000000-0000-0000-0000-000000000011', 'SaaS'),
  ('c0000000-0000-0000-0000-000000000011', 'Follow-up')
ON CONFLICT DO NOTHING;

-- ── Sample Notes ─────────────────────────────
-- Note: user_id should match your authenticated user. Using placeholder.
INSERT INTO lead_notes (lead_id, user_id, content, created_at) VALUES
  ('c0000000-0000-0000-0000-000000000001',
   '00000000-0000-0000-0000-000000000000',
   'Jan is geïnteresseerd in AI-oplossingen voor hun sales team. Heeft momenteel 3 SDRs die handmatig outreach doen.',
   NOW() - INTERVAL '6 days'),

  ('c0000000-0000-0000-0000-000000000001',
   '00000000-0000-0000-0000-000000000000',
   'Follow-up gepland voor volgende week. Wil graag een demo zien van de email personalisatie.',
   NOW() - INTERVAL '3 days'),

  ('c0000000-0000-0000-0000-000000000004',
   '00000000-0000-0000-0000-000000000000',
   'Sarah reageerde positief op de eerste email. Ze willen hun cold outreach automatiseren.',
   NOW() - INTERVAL '8 days'),

  ('c0000000-0000-0000-0000-000000000005',
   '00000000-0000-0000-0000-000000000000',
   'Mark is zeer enthousiast. Heeft zelf al naar AI tools voor sales gezocht. Perfecte timing.',
   NOW() - INTERVAL '12 days'),

  ('c0000000-0000-0000-0000-000000000006',
   '00000000-0000-0000-0000-000000000000',
   'Meeting geboekt voor dinsdag 15:00. Emma wil het hele team meenemen.',
   NOW() - INTERVAL '5 days'),

  ('c0000000-0000-0000-0000-000000000009',
   '00000000-0000-0000-0000-000000000000',
   'Deal gesloten! Robbert gaat ProLead gebruiken voor hun eigen outreach. Contract getekend.',
   NOW() - INTERVAL '20 days')
ON CONFLICT DO NOTHING;

-- ── Sample Enrichment Data ───────────────────
UPDATE leads SET enrichment_data = '{
  "company_summary": "TechFlow is een B2B SaaS-bedrijf dat workflow automatisering tools bouwt voor middelgrote bedrijven in de Benelux.",
  "company_industry": "SaaS",
  "company_size": "85 medewerkers",
  "pain_points": ["Handmatige sales processen", "Lage conversie rates", "Geen schaalbare outreach"],
  "decision_maker_level": "C-level",
  "talking_points": ["Recent Series B funding van €5M", "Groeien naar DACH regio", "Zoeken naar sales automation"],
  "recent_news": "TechFlow heeft onlangs een partnerschap aangekondigd met een grote Duitse enterprise klant.",
  "technologies_used": ["HubSpot", "Salesforce", "Slack"],
  "icp_score": 92
}'
WHERE id = 'c0000000-0000-0000-0000-000000000001';

UPDATE leads SET enrichment_data = '{
  "company_summary": "DataStack bouwt data pipeline tools voor developers. Klein maar snelgroeiend team in Amsterdam.",
  "company_industry": "SaaS",
  "company_size": "28 medewerkers",
  "pain_points": ["Te weinig leads", "Founder-led sales is niet schaalbaar", "Geen dedicated sales team"],
  "decision_maker_level": "Founder/CEO",
  "talking_points": ["Seed funding ontvangen", "Product-market fit bereikt", "Zoekt eerste sales hire"],
  "recent_news": "DataStack lanceerde vorige maand v2.0 met real-time streaming support.",
  "technologies_used": ["Linear", "Notion", "GitHub"],
  "icp_score": 95
}'
WHERE id = 'c0000000-0000-0000-0000-000000000005';
