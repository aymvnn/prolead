// ===========================================
// PROLEAD - Database Types
// ===========================================

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

// ── Enums ──────────────────────────────────

export type UserRole = "owner" | "admin" | "member";
export type LeadStatus =
  | "new"
  | "researched"
  | "contacted"
  | "replied"
  | "interested"
  | "meeting_booked"
  | "closed_won"
  | "closed_lost"
  | "unsubscribed"
  | "bounced";

export type CampaignStatus = "draft" | "active" | "paused" | "completed" | "archived";
export type SequenceStatus = "draft" | "active" | "paused" | "completed";
export type EmailStatus = "queued" | "sending" | "sent" | "delivered" | "opened" | "clicked" | "replied" | "bounced" | "failed";
export type EmailDirection = "outbound" | "inbound";
export type Channel = "email" | "linkedin";
export type IntentClassification = "meeting" | "objection" | "question" | "not_interested" | "unsubscribe" | "positive" | "neutral" | "unknown";
export type MeetingStatus = "scheduled" | "completed" | "cancelled" | "no_show";
export type IntegrationType = "google_calendar" | "linkedin" | "crm" | "smtp" | "resend";
export type WarmupStatus = "inactive" | "warming" | "warmed" | "paused";
export type ABTestStatus = "running" | "completed" | "paused";
export type ConversationStatus = "active" | "paused" | "closed" | "escalated";
export type TriggerEventType = "job_change" | "funding" | "new_hire" | "company_news" | "technology_change" | "expansion";

export type SuppressionReason = "unsubscribed" | "bounced_hard" | "complained" | "invalid" | "manual";

// ── Table Types ────────────────────────────

export interface CompanyProfile {
  company_name?: string;
  website?: string;
  description?: string;
  products?: string;
  usps?: string[];
  pricing_info?: string;
  client_cases?: string;
  competitive_advantage?: string;
  target_regions?: string;
  tone_of_voice?: string;
  extra_context?: string;
}

export interface Organization {
  id: string;
  name: string;
  settings: Json;
  company_profile: CompanyProfile;
  created_at: string;
}

export interface User {
  id: string;
  org_id: string;
  email: string;
  name: string;
  role: UserRole;
  avatar_url: string | null;
  created_at: string;
}

export interface VoiceProfile {
  id: string;
  org_id: string;
  name: string;
  sample_emails: string[];
  tone_description: string;
  style_guidelines: string | null;
  created_at: string;
}

export interface Lead {
  id: string;
  org_id: string;
  email: string;
  first_name: string;
  last_name: string;
  company: string;
  title: string | null;
  linkedin_url: string | null;
  phone: string | null;
  website: string | null;
  industry: string | null;
  employee_count: number | null;
  enrichment_data: Json | null;
  icp_score: number | null;
  status: LeadStatus;
  source: string | null;
  last_activity_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface LeadTag {
  id: string;
  lead_id: string;
  tag: string;
}

export interface LeadNote {
  id: string;
  lead_id: string;
  user_id: string;
  content: string;
  created_at: string;
}

export interface LeadTriggerEvent {
  id: string;
  lead_id: string;
  event_type: TriggerEventType;
  event_data: Json;
  detected_at: string;
}

export interface ICPProfile {
  id: string;
  org_id: string;
  name: string;
  criteria: {
    industries?: string[];
    company_sizes?: { min?: number; max?: number };
    titles?: string[];
    locations?: string[];
    technologies?: string[];
    pain_points?: string[];
    keywords?: string[];
  };
  description: string;
  is_active: boolean;
  created_at: string;
}

export interface Campaign {
  id: string;
  org_id: string;
  name: string;
  status: CampaignStatus;
  icp_id: string | null;
  voice_profile_id: string | null;
  settings: {
    daily_limit?: number;
    timezone?: string;
    send_window_start?: string;
    send_window_end?: string;
    skip_weekends?: boolean;
  };
  stats: {
    total_leads?: number;
    emails_sent?: number;
    emails_opened?: number;
    emails_replied?: number;
    meetings_booked?: number;
  };
  created_at: string;
  updated_at: string;
}

export interface Sequence {
  id: string;
  campaign_id: string;
  name: string;
  steps_count: number;
  status: SequenceStatus;
  created_at: string;
}

export interface SequenceStep {
  id: string;
  sequence_id: string;
  step_number: number;
  channel: Channel;
  delay_days: number;
  delay_hours: number;
  template_id: string | null;
  ab_test_id: string | null;
  settings: Json;
}

export interface EmailAccount {
  id: string;
  org_id: string;
  email: string;
  display_name: string | null;
  provider: "smtp" | "resend";
  smtp_host: string | null;
  smtp_port: number | null;
  smtp_user: string | null;
  smtp_pass_encrypted: string | null;
  imap_host: string | null;
  imap_port: number | null;
  warmup_status: WarmupStatus;
  daily_limit: number;
  emails_sent_today: number;
  is_active: boolean;
  created_at: string;
}

export interface Email {
  id: string;
  org_id: string;
  lead_id: string;
  campaign_id: string | null;
  sequence_id: string | null;
  step_id: string | null;
  /** Nullable since migration 004 — inbound replies don't have a sending account. */
  email_account_id: string | null;
  from_email: string;
  to_email: string;
  subject: string;
  body_html: string;
  body_text: string;
  status: EmailStatus;
  direction: EmailDirection;
  thread_id: string | null;
  /** Resend email id persisted at send time (migration 004). */
  provider_message_id: string | null;
  /** HMAC-signed one-click unsubscribe token (migration 004). */
  unsubscribe_token: string | null;
  opened_at: string | null;
  clicked_at: string | null;
  replied_at: string | null;
  bounced_at: string | null;
  sent_at: string | null;
  created_at: string;
}

export interface EmailSuppression {
  id: string;
  org_id: string;
  email: string;
  reason: SuppressionReason;
  source: string | null;
  created_at: string;
}

export interface EmailTemplate {
  id: string;
  org_id: string;
  name: string;
  subject: string;
  body: string;
  variables: string[];
  category: string | null;
  performance_stats: {
    open_rate?: number;
    reply_rate?: number;
    uses?: number;
  };
  created_at: string;
}

export interface ABTest {
  id: string;
  campaign_id: string;
  name: string;
  variant_a: { subject?: string; body?: string };
  variant_b: { subject?: string; body?: string };
  winner: "a" | "b" | null;
  results: {
    a: { sent?: number; opened?: number; replied?: number };
    b: { sent?: number; opened?: number; replied?: number };
  };
  status: ABTestStatus;
  created_at: string;
}

export interface Conversation {
  id: string;
  lead_id: string;
  campaign_id: string | null;
  channel: Channel;
  messages: ConversationMessage[];
  status: ConversationStatus;
  ai_summary: string | null;
  intent_classification: IntentClassification | null;
  meeting_booked: boolean;
  created_at: string;
  updated_at: string;
}

export interface ConversationMessage {
  role: "assistant" | "lead";
  content: string;
  timestamp: string;
  email_id?: string;
}

export interface Meeting {
  id: string;
  org_id: string;
  lead_id: string;
  conversation_id: string | null;
  title: string;
  start_time: string;
  end_time: string;
  timezone: string;
  calendar_event_id: string | null;
  meeting_link: string | null;
  status: MeetingStatus;
  notes: string | null;
  created_at: string;
}

export interface Integration {
  id: string;
  org_id: string;
  type: IntegrationType;
  config: Json;
  status: "connected" | "disconnected" | "error";
  last_sync_at: string | null;
  created_at: string;
}

export interface AnalyticsEvent {
  id: string;
  org_id: string;
  event_type: string;
  entity_type: string;
  entity_id: string;
  properties: Json;
  created_at: string;
}

export interface DailyStats {
  id: string;
  org_id: string;
  date: string;
  emails_sent: number;
  emails_opened: number;
  emails_replied: number;
  meetings_booked: number;
  leads_researched: number;
  response_rate: number;
  open_rate: number;
}
