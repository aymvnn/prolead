const translations: Record<string, Record<string, string>> = {
  // ── Sidebar ─────────────────────────────────
  "nav.overview": { nl: "Overzicht", en: "Overview" },
  "nav.company": { nl: "Bedrijfsprofiel", en: "Company Profile" },
  "nav.leadprompter": { nl: "Lead Prompter", en: "Lead Prompter" },
  "nav.leads": { nl: "Leads", en: "Leads" },
  "nav.campaigns": { nl: "Campaigns", en: "Campaigns" },
  "nav.sequences": { nl: "Sequences", en: "Sequences" },
  "nav.inbox": { nl: "Inbox", en: "Inbox" },
  "nav.meetings": { nl: "Meetings", en: "Meetings" },
  "nav.templates": { nl: "Templates", en: "Templates" },
  "nav.icp": { nl: "ICP Forge", en: "ICP Forge" },
  "nav.analytics": { nl: "Analytics", en: "Analytics" },
  "nav.integrations": { nl: "Integraties", en: "Integrations" },
  "nav.settings": { nl: "Instellingen", en: "Settings" },
  "nav.logout": { nl: "Uitloggen", en: "Log out" },

  // ── Header ──────────────────────────────────
  "header.search": { nl: "Zoeken...", en: "Search..." },

  // ── Dashboard / Overview ────────────────────
  "overview.title": { nl: "Welkom bij PROLEAD", en: "Welcome to PROLEAD" },
  "overview.totalLeads": { nl: "Totale Leads", en: "Total Leads" },
  "overview.emailsSent": { nl: "Emails Verstuurd", en: "Emails Sent" },
  "overview.openRate": { nl: "Open Rate", en: "Open Rate" },
  "overview.meetingsBooked": { nl: "Meetings Geboekt", en: "Meetings Booked" },
  "overview.recentActivity": { nl: "Recente Activiteit", en: "Recent Activity" },
  "overview.recentActivityDesc": { nl: "Laatste 10 events in het platform.", en: "Last 10 events on the platform." },
  "overview.activeCampaigns": { nl: "Actieve Campagnes", en: "Active Campaigns" },
  "overview.activeCampaignsDesc": { nl: "Campagnes die nu actief zijn.", en: "Currently active campaigns." },
  "overview.upcomingMeetings": { nl: "Aankomende Meetings", en: "Upcoming Meetings" },
  "overview.upcomingMeetingsDesc": { nl: "De eerstvolgende 5 geplande meetings.", en: "Next 5 scheduled meetings." },
  "overview.allMeetings": { nl: "Alle meetings", en: "All meetings" },
  "overview.noActivity": { nl: "Nog geen activiteit geregistreerd.", en: "No activity recorded yet." },
  "overview.noCampaigns": { nl: "Geen actieve campagnes.", en: "No active campaigns." },
  "overview.startCampaign": { nl: "Campagne starten", en: "Start campaign" },
  "overview.noMeetings": { nl: "Geen aankomende meetings.", en: "No upcoming meetings." },
  "overview.unknownLead": { nl: "Onbekende lead", en: "Unknown lead" },
  "overview.loading": { nl: "Dashboard laden...", en: "Loading dashboard..." },

  // ── Leads ───────────────────────────────────
  "leads.title": { nl: "Leads", en: "Leads" },
  "leads.search": { nl: "Zoek leads...", en: "Search leads..." },
  "leads.addLead": { nl: "Lead toevoegen", en: "Add lead" },
  "leads.import": { nl: "Importeren", en: "Import" },
  "leads.export": { nl: "Exporteren", en: "Export" },
  "leads.allStatuses": { nl: "Alle statussen", en: "All statuses" },
  "leads.noLeads": { nl: "Geen leads gevonden", en: "No leads found" },
  "leads.delete": { nl: "Verwijderen", en: "Delete" },
  "leads.research": { nl: "AI Research", en: "AI Research" },
  "leads.tags": { nl: "Tags", en: "Tags" },
  "leads.selected": { nl: "geselecteerd", en: "selected" },

  // ── Campaigns ───────────────────────────────
  "campaigns.title": { nl: "Campaigns", en: "Campaigns" },
  "campaigns.new": { nl: "Nieuwe campaign", en: "New campaign" },
  "campaigns.search": { nl: "Zoek campaigns...", en: "Search campaigns..." },
  "campaigns.totalLeads": { nl: "Totaal leads", en: "Total leads" },
  "campaigns.sent": { nl: "Emails verstuurd", en: "Emails sent" },
  "campaigns.replyRate": { nl: "Gem. reply rate", en: "Avg. reply rate" },
  "campaigns.meetings": { nl: "Meetings geboekt", en: "Meetings booked" },
  "campaigns.noCampaigns": { nl: "Nog geen campaigns. Maak je eerste campaign aan.", en: "No campaigns yet. Create your first campaign." },
  "campaigns.activate": { nl: "Activeren", en: "Activate" },
  "campaigns.pause": { nl: "Pauzeren", en: "Pause" },
  "campaigns.resume": { nl: "Hervatten", en: "Resume" },
  "campaigns.delete": { nl: "Verwijderen", en: "Delete" },
  "campaigns.loading": { nl: "Campaigns laden...", en: "Loading campaigns..." },

  // ── Sequences ───────────────────────────────
  "sequences.title": { nl: "Sequences", en: "Sequences" },
  "sequences.new": { nl: "Nieuwe sequence", en: "New sequence" },
  "sequences.addStep": { nl: "Stap toevoegen", en: "Add step" },
  "sequences.channel": { nl: "Kanaal", en: "Channel" },
  "sequences.delay": { nl: "Vertraging", en: "Delay" },
  "sequences.edit": { nl: "Bewerken", en: "Edit" },

  // ── Inbox ───────────────────────────────────
  "inbox.title": { nl: "Inbox", en: "Inbox" },
  "inbox.search": { nl: "Zoek berichten...", en: "Search messages..." },
  "inbox.allStatuses": { nl: "Alle statussen", en: "All statuses" },
  "inbox.noConversations": { nl: "Geen gesprekken gevonden", en: "No conversations found" },
  "inbox.selectConversation": { nl: "Selecteer een gesprek", en: "Select a conversation" },
  "inbox.typeReply": { nl: "Typ je antwoord...", en: "Type your reply..." },
  "inbox.close": { nl: "Sluiten", en: "Close" },
  "inbox.escalate": { nl: "Escaleren", en: "Escalate" },
  "inbox.pause": { nl: "Pauzeren", en: "Pause" },
  "inbox.resume": { nl: "Hervatten", en: "Resume" },

  // ── Meetings ────────────────────────────────
  "meetings.title": { nl: "Meetings", en: "Meetings" },
  "meetings.schedule": { nl: "Meeting plannen", en: "Schedule meeting" },
  "meetings.list": { nl: "Lijst", en: "List" },
  "meetings.calendar": { nl: "Kalender", en: "Calendar" },
  "meetings.upcoming": { nl: "Aankomende meetings", en: "Upcoming meetings" },
  "meetings.past": { nl: "Afgelopen meetings", en: "Past meetings" },
  "meetings.scheduled": { nl: "Gepland", en: "Scheduled" },
  "meetings.completed": { nl: "Voltooid", en: "Completed" },
  "meetings.cancelled": { nl: "Geannuleerd", en: "Cancelled" },
  "meetings.noShow": { nl: "Niet verschenen", en: "No show" },
  "meetings.noUpcoming": { nl: "Geen aankomende meetings.", en: "No upcoming meetings." },

  // ── Templates ───────────────────────────────
  "templates.title": { nl: "Templates", en: "Templates" },
  "templates.new": { nl: "Nieuw template", en: "New template" },
  "templates.search": { nl: "Zoek templates...", en: "Search templates..." },
  "templates.noTemplates": { nl: "Geen templates gevonden", en: "No templates found" },
  "templates.edit": { nl: "Bewerken", en: "Edit" },
  "templates.delete": { nl: "Verwijderen", en: "Delete" },

  // ── ICP ─────────────────────────────────────
  "icp.title": { nl: "ICP Forge", en: "ICP Forge" },

  // ── Analytics ───────────────────────────────
  "analytics.title": { nl: "Analytics", en: "Analytics" },
  "analytics.refresh": { nl: "Vernieuwen", en: "Refresh" },
  "analytics.loading": { nl: "Laden...", en: "Loading..." },

  // ── Integrations ────────────────────────────
  "integrations.title": { nl: "Integraties", en: "Integrations" },

  // ── Settings ────────────────────────────────
  "settings.title": { nl: "Instellingen", en: "Settings" },
  "settings.general": { nl: "Algemeen", en: "General" },
  "settings.email": { nl: "Email Accounts", en: "Email Accounts" },
  "settings.voice": { nl: "Voice Profiles", en: "Voice Profiles" },
  "settings.team": { nl: "Team", en: "Team" },
  "settings.profile": { nl: "Profiel", en: "Profile" },
  "settings.profileDesc": { nl: "Je persoonlijke gegevens.", en: "Your personal details." },
  "settings.name": { nl: "Naam", en: "Name" },
  "settings.orgName": { nl: "Organisatie naam", en: "Organization name" },
  "settings.langTitle": { nl: "Taal & Regio", en: "Language & Region" },
  "settings.langDesc": { nl: "Stel in welke taal de interface en de AI-gegenereerde emails gebruiken.", en: "Set the language for the interface and AI-generated emails." },
  "settings.uiLang": { nl: "Interface taal", en: "Interface language" },
  "settings.uiLangDesc": { nl: "De taal van de PROLEAD interface.", en: "The language of the PROLEAD interface." },
  "settings.emailLang": { nl: "Email taal (AI)", en: "Email language (AI)" },
  "settings.emailLangDesc": { nl: "De taal waarin de AI emails schrijft.", en: "The language in which AI writes emails." },
  "settings.timezone": { nl: "Tijdzone", en: "Timezone" },
  "settings.dailyLimit": { nl: "Dagelijkse email limiet", en: "Daily email limit" },
  "settings.dailyLimitDesc": { nl: "Max emails per dag (Resend gratis = 100).", en: "Max emails per day (Resend free = 100)." },
  "settings.prefs": { nl: "Voorkeuren", en: "Preferences" },
  "settings.prefsDesc": { nl: "App-instellingen en notificaties.", en: "App settings and notifications." },
  "settings.emailNotif": { nl: "Email notificaties", en: "Email notifications" },
  "settings.emailNotifDesc": { nl: "Ontvang notificaties bij nieuwe replies.", en: "Receive notifications for new replies." },
  "settings.dailyReport": { nl: "Dagelijks rapport", en: "Daily report" },
  "settings.dailyReportDesc": { nl: "Ontvang een dagelijkse samenvatting per email.", en: "Receive a daily email summary." },
  "settings.save": { nl: "Opslaan", en: "Save" },
  "settings.saved": { nl: "Opgeslagen!", en: "Saved!" },

  // ── Lead Prompter ───────────────────────────
  "prompter.title": { nl: "Lead Prompter", en: "Lead Prompter" },
  "prompter.desc": { nl: "Genereer een kant-en-klare prompt voor Claude om leads te zoeken. Kopieer de prompt en plak hem in Claude Cowork.", en: "Generate a ready-made prompt for Claude to find leads. Copy and paste it into Claude Cowork." },
  "prompter.howItWorks": { nl: "Hoe het werkt", en: "How it works" },
  "prompter.config": { nl: "Configuratie", en: "Configuration" },
  "prompter.configDesc": { nl: "Pas de parameters aan voor je lead zoektocht.", en: "Adjust parameters for your lead search." },
  "prompter.icpProfile": { nl: "ICP Profiel", en: "ICP Profile" },
  "prompter.companyName": { nl: "Bedrijfsnaam", en: "Company name" },
  "prompter.product": { nl: "Product/Dienst beschrijving", en: "Product/Service description" },
  "prompter.regions": { nl: "Doelregio's", en: "Target regions" },
  "prompter.leadCount": { nl: "Aantal leads", en: "Number of leads" },
  "prompter.language": { nl: "Taal van leads", en: "Lead language" },
  "prompter.extra": { nl: "Extra instructies (optioneel)", en: "Extra instructions (optional)" },
  "prompter.generated": { nl: "Gegenereerde Prompt", en: "Generated Prompt" },
  "prompter.generatedDesc": { nl: "Kopieer en plak in Claude Cowork.", en: "Copy and paste into Claude Cowork." },
  "prompter.copy": { nl: "Kopieer prompt", en: "Copy prompt" },
  "prompter.copied": { nl: "Gekopieerd!", en: "Copied!" },
  "prompter.sendLimit": { nl: "Verzendlimiet: 100 emails/dag", en: "Send limit: 100 emails/day" },
  "prompter.afterImport": { nl: "Na het importeren", en: "After importing" },

  // ── Company Profile ─────────────────────────
  "company.title": { nl: "Bedrijfsprofiel", en: "Company Profile" },
  "company.desc": { nl: "Alles over je bedrijf op een plek. De AI agents gebruiken dit bij elke email.", en: "Everything about your company in one place. AI agents use this for every email." },
  "company.aiInfo": { nl: "Dit profiel wordt door alle AI agents gelezen", en: "This profile is read by all AI agents" },
  "company.aiInfoDesc": { nl: "Hoe meer je invult, hoe beter de AI je emails personaliseert.", en: "The more you fill in, the better AI personalizes your emails." },
  "company.autoFill": { nl: "Auto-invullen vanaf website", en: "Auto-fill from website" },
  "company.autoFillDesc": { nl: "Vul je website URL in en de AI analyseert je site om het profiel automatisch in te vullen.", en: "Enter your website URL and AI analyzes your site to auto-fill the profile." },
  "company.autoFillBtn": { nl: "AI Auto-invullen", en: "AI Auto-fill" },
  "company.analyzing": { nl: "Analyseren...", en: "Analyzing..." },
  "company.save": { nl: "Profiel opslaan", en: "Save profile" },
  "company.saved": { nl: "Opgeslagen!", en: "Saved!" },
  "company.basic": { nl: "Basisinformatie", en: "Basic information" },
  "company.basicDesc": { nl: "Naam en website van je bedrijf.", en: "Name and website of your company." },
  "company.name": { nl: "Bedrijfsnaam", en: "Company name" },
  "company.website": { nl: "Website", en: "Website" },
  "company.whatDoYouDo": { nl: "Wat doet je bedrijf? (1-3 zinnen)", en: "What does your company do? (1-3 sentences)" },
  "company.product": { nl: "Product / Dienst", en: "Product / Service" },
  "company.productDesc": { nl: "Wat verkoop je precies? Wees specifiek.", en: "What exactly do you sell? Be specific." },
  "company.productLabel": { nl: "Productbeschrijving", en: "Product description" },
  "company.pricing": { nl: "Prijsindicatie (optioneel, intern)", en: "Pricing indication (optional, internal)" },
  "company.targetMarket": { nl: "Doelmarkt", en: "Target market" },
  "company.regions": { nl: "Regio's en markten", en: "Regions and markets" },
  "company.usps": { nl: "Unique Selling Points", en: "Unique Selling Points" },
  "company.uspsDesc": { nl: "Waarom moeten klanten bij jou kopen?", en: "Why should customers buy from you?" },
  "company.clients": { nl: "Klantcases & Referenties", en: "Client Cases & References" },
  "company.clientsDesc": { nl: "Welke bedrijven gebruiken jouw product al?", en: "Which companies already use your product?" },
  "company.competitive": { nl: "Concurrentievoordeel", en: "Competitive Advantage" },
  "company.competitiveDesc": { nl: "Wat maakt jou anders dan de concurrentie?", en: "What makes you different from competitors?" },
  "company.tone": { nl: "Communicatiestijl", en: "Communication Style" },
  "company.toneDesc": { nl: "Hoe wil je dat de AI communiceert namens jou?", en: "How should AI communicate on your behalf?" },
  "company.toneLabel": { nl: "Tone of voice", en: "Tone of voice" },
  "company.extra": { nl: "Extra context", en: "Extra context" },
  "company.extraDesc": { nl: "Alles wat de AI nog moet weten. Vrij tekstveld.", en: "Anything else AI should know. Free text field." },

  // ── Common ──────────────────────────────────
  "common.save": { nl: "Opslaan", en: "Save" },
  "common.saved": { nl: "Opgeslagen!", en: "Saved!" },
  "common.cancel": { nl: "Annuleren", en: "Cancel" },
  "common.delete": { nl: "Verwijderen", en: "Delete" },
  "common.edit": { nl: "Bewerken", en: "Edit" },
  "common.create": { nl: "Aanmaken", en: "Create" },
  "common.loading": { nl: "Laden...", en: "Loading..." },
  "common.active": { nl: "Actief", en: "Active" },
  "common.paused": { nl: "Gepauzeerd", en: "Paused" },
  "common.draft": { nl: "Concept", en: "Draft" },
  "common.completed": { nl: "Voltooid", en: "Completed" },
  "common.archived": { nl: "Gearchiveerd", en: "Archived" },

  // ── Lead statuses ───────────────────────────
  "status.new": { nl: "Nieuw", en: "New" },
  "status.researched": { nl: "Onderzocht", en: "Researched" },
  "status.contacted": { nl: "Benaderd", en: "Contacted" },
  "status.replied": { nl: "Gereageerd", en: "Replied" },
  "status.interested": { nl: "Geinteresseerd", en: "Interested" },
  "status.meeting_booked": { nl: "Meeting", en: "Meeting" },
  "status.closed_won": { nl: "Gewonnen", en: "Won" },
  "status.closed_lost": { nl: "Verloren", en: "Lost" },
  "status.unsubscribed": { nl: "Afgemeld", en: "Unsubscribed" },
  "status.bounced": { nl: "Bounced", en: "Bounced" },

  // ── Event types ─────────────────────────────
  "event.email_sent": { nl: "Email verstuurd", en: "Email sent" },
  "event.email_opened": { nl: "Email geopend", en: "Email opened" },
  "event.email_replied": { nl: "Reply ontvangen", en: "Reply received" },
  "event.email_bounced": { nl: "Email bounced", en: "Email bounced" },
  "event.lead_created": { nl: "Lead aangemaakt", en: "Lead created" },
  "event.lead_enriched": { nl: "Lead verrijkt", en: "Lead enriched" },
  "event.meeting_booked": { nl: "Meeting geboekt", en: "Meeting booked" },
  "event.meeting_completed": { nl: "Meeting voltooid", en: "Meeting completed" },
  "event.campaign_started": { nl: "Campagne gestart", en: "Campaign started" },
  "event.campaign_paused": { nl: "Campagne gepauzeerd", en: "Campaign paused" },
};

let currentLanguage = "nl";

export function setLanguage(lang: string) {
  currentLanguage = lang;
}

export function getLanguage(): string {
  return currentLanguage;
}

export function t(key: string): string {
  const entry = translations[key];
  if (!entry) return key;
  return entry[currentLanguage] || entry["nl"] || key;
}
