# PROLEAD — Sprints State (live-coordination file for agents)

All 4 sprints read this file before starting and treat it as the source of truth for scope, file ownership, and decisions already made.

## Ground rules

- One agent per sprint. Each agent commits at the end of its work with a clear message prefixed `Sprint <n>:`.
- **Do not touch files outside your sprint scope.** File partitions are enforced below.
- All prompts in this repo are being standardized to English (system prompts) with a user-message language variable. Do not re-Dutch-ify.
- Every `supabase.from(...)` write that targets an org-scoped table MUST include `org_id` and check `error` with user-visible feedback (toast or inline banner).
- Never swallow errors with empty catch blocks. Never use `alert()` / `confirm()`.
- Run `npx tsc --noEmit` before committing.

---

## Sprint 1 — Security & deliverability (Wave 1, parallel with Sprint 3)

**Scope (edit these, nothing else):**
- `src/app/api/emails/track/route.ts`
- `src/app/api/webhooks/email/route.ts`
- `src/app/api/emails/inbound/route.ts`
- `src/app/api/emails/send/route.ts`
- `src/app/api/campaigns/[id]/activate/route.ts`
- `src/app/api/campaigns/[id]/route.ts`
- `src/lib/inngest/functions/send-sequence-step.ts`
- New: `supabase/migrations/005_atomic_counter_and_archive.sql`
- New helper: `src/lib/email/webhook-verify.ts`
- Types in `src/types/database.ts` only if new columns are added

**Must fix:**
1. `emails/track/route.ts` uses the SSR cookie client → recipient has no session → RLS blocks the status update to 0 rows. Switch to service-role client (same pattern as webhook route).
2. `webhooks/email/route.ts` accepts any POST. Verify the Svix signature headers (`svix-id`, `svix-timestamp`, `svix-signature`) against `RESEND_WEBHOOK_SECRET`. If env var missing, log warning and still reject in production (`process.env.NODE_ENV === "production"`).
3. `emails/inbound/route.ts` — require `x-prolead-inbound-secret` header matching `INBOUND_SECRET` env var. Also pause `campaign_leads` in the catch block so failed AI doesn't leave the sequence running.
4. Atomic counter: create Postgres function `increment_account_sent(account_id UUID) RETURNS INTEGER` that does `UPDATE email_accounts SET emails_sent_today = emails_sent_today + 1 WHERE id = $1 RETURNING emails_sent_today;`. Call it from both `emails/send/route.ts` and `send-sequence-step.ts`.
5. Inngest reschedule dedup: add `id: \`step-due-\${campaignLeadId}-\${stepNumber}-\${YYYYMMDD}\`` on all `inngest.send(...)` events that fire sequence steps.
6. `campaigns/[id]/activate/route.ts` — before firing events, count active email-accounts capacity (sum of `daily_limit - emails_sent_today`). If capacity < batch size, stagger `ts` across days. Currently fires 100 events at once.
7. `campaigns/[id]/route.ts` DELETE — if campaign has any `campaign_leads` with status `active` or `paused`, switch to `status='archived'` instead of hard-delete (avoids "campaign lead not found" in Inngest).
8. Fallback webhook match on `(to_email, subject)` → remove unless `provider_message_id` lookup fails AND timestamp within last 24h (limits misattribution).

**Required env vars to document (not set — user sets them later):**
- `RESEND_WEBHOOK_SECRET`
- `INBOUND_SECRET`

**Commit message:** `Sprint 1: security, deliverability, atomic counters, Inngest idempotency`

---

## Sprint 3 — AI agents upgrade (Wave 1, parallel with Sprint 1)

**Scope (edit these, nothing else):**
- `src/lib/ai/claude.ts`
- `src/lib/ai/agents/*.ts` (all 6 + orchestrator)
- `src/lib/ai/prompts/*.ts` (all 6)
- `src/lib/ai/schemas/*.ts` (new — one Zod schema per agent)
- `package.json` only if Zod needs adding (it's already listed at ^4.3.6)

**Do NOT touch:** `send-sequence-step.ts`, any route file, any `(dashboard)` page. Sprint 1 owns Inngest; Sprint 2 owns dashboard pages.

**Must fix:**
1. Central `generateStructured<T>(schema, options)` helper in `claude.ts`:
   - Calls Anthropic SDK with `system` prompt using `cache_control: { type: "ephemeral" }` so system block is cached (~90% cost cut).
   - Validates output with a Zod schema.
   - On validate fail: retry ONCE with message "your previous output was invalid JSON for schema <name>. Return ONLY the object, no prose."
   - On 429 / 529 / overloaded_error: exponential backoff retry (3 attempts max, 1s→3s→9s).
   - On final failure: return a caller-provided fallback value, never throw.
2. Zod schemas in `src/lib/ai/schemas/{research,writer,responder,intent,scheduler,revival}.ts`. Each mirrors the existing TS interface.
3. Remove the brittle `response.match(/\{[\s\S]*\}/)` regex from EVERY agent — use the new helper.
4. **Research agent anti-hallucination.** Add explicit block to the system prompt: "You have no web/database access. You must not fabricate company pain points, recent triggers, or named decision-makers. When information is not present in the input, return empty arrays and set confidence accordingly. Mark inferred fields as hypotheses, not facts."
5. **All system prompts → English.** Output language controlled by a `language` field in the user message (`en` | `nl` | `ar` | `de` | `fr`). This stops Claude drift on non-NL threads.
6. **Scheduler timezone**: accept `senderTimezone` and `leadRegion` (`nl` | `gcc` | ...). Replace the hardcoded "Europe/Amsterdam, avoid Monday morning and Friday afternoon" block with per-region rules:
   - `nl`: Mon-Fri 09:00-17:00 Europe/Amsterdam, avoid Fri 15:00+
   - `gcc`: Sun-Thu 09:00-17:00 Asia/Dubai, avoid Thu 15:00+ (Fri-Sat = weekend)
   - Default: caller-provided tz, Mon-Fri
   Also: kill the stale `2026-04-10` example date — use "{today}+2 working days" phrasing.
7. **Writer agent**: restructure user prompt with XML tags:
   ```
   <verified_facts>name, title, company, domain</verified_facts>
   <speculative_research>everything from enrichment_data</speculative_research>
   ```
   Plus instruction: use only `<verified_facts>` as stated facts; reference `<speculative_research>` only as hypotheses ("ik gok dat X, klopt dat?").
8. **Responder agent**: add 3 few-shot examples covering meeting/objection/unsubscribe intents before the instruction block.
9. **Revival agent**: two-pass — first a cheap Haiku classifier returns `{should_revive: bool, reason: string}`. Only if true, call Sonnet for the body. Saves tokens when lead is truly dead.
10. **Intent + Scheduler (both Haiku)**: use `tool_choice: { type: "tool", name: "output" }` with a single tool whose input_schema mirrors the Zod schema. Haiku returns parseable tool-call JSON — eliminates parse errors entirely on the cheap agents.
11. **Language plumbing**: orchestrator accepts `language` + `senderTimezone` + `leadRegion` params and threads them to Writer/Responder/Scheduler. Default language = `en`, default tz = `Europe/Amsterdam`, default region = `nl`.

**Commit message:** `Sprint 3: AI agent reliability — Zod, prompt-cache, anti-halluc, i18n, region-aware scheduler`

---

## Sprint 2 — Save-bugs + Toaster + alert/confirm replace (Wave 2, parallel with Sprint 4)

**Scope (edit these, nothing else):**
- `src/app/(dashboard)/bedrijf/page.tsx`
- `src/app/(dashboard)/templates/page.tsx`
- `src/app/(dashboard)/meetings/page.tsx`
- `src/app/(dashboard)/sequences/page.tsx`
- `src/app/(dashboard)/sequences/[id]/page.tsx`
- `src/app/(dashboard)/campaigns/new/page.tsx`
- `src/app/(dashboard)/campaigns/[id]/page.tsx`
- `src/app/(dashboard)/campaigns/page.tsx`
- `src/app/(dashboard)/leads/page.tsx`
- `src/app/(dashboard)/leads/[id]/page.tsx`
- `src/app/(dashboard)/settings/page.tsx`
- `src/app/(dashboard)/inbox/page.tsx`
- `src/app/layout.tsx` — mount `<Toaster />`
- New: `src/hooks/use-org-id.ts` — resolves current user's org_id once per page
- New: `src/components/ui/confirm-dialog.tsx` — shadcn-based replacement for `confirm()`

**Do NOT touch:** `icp/page.tsx` (already fixed), `integrations/page.tsx` (Sprint 4 handles), any `api/` route, any `lib/ai/`, any `lib/inngest/`.

**Must fix (list from audit):**
1. `bedrijf/page.tsx` handleSave — no error check; show inline success/error.
2. `templates/page.tsx` handleSave — include `org_id`; show errors.
3. `meetings/page.tsx` handleAddMeeting — include `org_id`; show errors.
4. `sequences/page.tsx` handleCreate — include `org_id`; show errors.
5. `sequences/page.tsx` deleteSequence — delete parent first (or rely on CASCADE); show errors.
6. `sequences/[id]/page.tsx` saveName — check error before mutating local state.
7. `sequences/[id]/page.tsx` handleSaveStep — check `res.ok`; keep dialog open on fail.
8. `campaigns/new/page.tsx` handleCreate — check every fetch step; roll back campaign if any fails.
9. `campaigns/new/page.tsx` — replace generic `alert(...)` with inline error.
10. `campaigns/[id]/page.tsx` toggleStatus — surface error, don't flip local state silently.
11. `campaigns/[id]/page.tsx` addSelectedLeads — include `org_id`; upsert on unique index.
12. `campaigns/page.tsx` delete/status — errors.
13. `leads/page.tsx` handleAddLead — include `org_id`; error.
14. `leads/[id]/page.tsx` addNote — include `org_id`; error.
15. `leads/[id]/page.tsx` addTag — include `org_id`; error.
16. `leads/[id]/page.tsx` handleDelete — delete parent row first; don't destroy children before.
17. `leads/[id]/page.tsx` updateStatus / updateField — check error before local state mutation.
18. `settings/page.tsx` email-accounts handleAdd — guard empty `orgId`; surface errors.
19. `settings/page.tsx` VoiceTab handleSave — guard empty `orgId`; surface errors.
20. `inbox/page.tsx` handleSendReply — check error; keep replyText on fail.
21. `inbox/page.tsx` updateConversationStatus — surface error.

**Mount Toaster** in `src/app/layout.tsx` so `toast.success("...")` / `toast.error("...")` (from `sonner` via `components/ui/sonner`) work globally. Use `<Toaster richColors position="top-right" />`.

**`useOrgId()` hook** resolves user's org_id once, caches, returns `{orgId: string | null, isLoading: boolean}`. Use everywhere instead of inline fetch.

**Replace every `alert("...")` and `confirm("...")`** in these files with:
- `alert` → `toast.error("...")` or inline banner for form-specific errors.
- `confirm` → `<ConfirmDialog>` (new shadcn-based component) — a modal that returns a promise resolving to boolean.

**Commit message:** `Sprint 2: save-bugs class-kill (17+ forms), Toaster mount, useOrgId hook, confirm-dialog`

---

## Sprint 4 — Dead code & honest UI (Wave 2, parallel with Sprint 2)

**Scope (edit these, nothing else):**
- `src/app/(dashboard)/integrations/page.tsx`
- `src/app/api/ab-tests/route.ts` (delete or keep-stub)
- `src/lib/inngest/functions/check-dead-leads.ts` (remove cron or gate)
- `src/app/api/inngest/route.ts` (unregister dead cron)
- `src/app/(dashboard)/sequences/[id]/page.tsx` — ONLY the `channel` dropdown line where "linkedin" option is shown (Sprint 2 is handling save-bug fixes elsewhere in this file — coordinate via surgical edit on the SelectItem line only)
- `src/app/(dashboard)/campaigns/new/page.tsx` — SAME rule: only the `channel` dropdown line (Sprint 2 owns the rest of the file)

**Decisions already made:**
- A/B tests: **remove from UI.** Keep schema + API stub (harmless) but hide any UI surface that suggests users can run A/B tests. If there's an A/B tab in campaigns/[id] or sequences/[id], remove it.
- LinkedIn channel: **disable option with tooltip.** Keep the enum in DB, but mark the SelectItem as `disabled` in the UI with a tooltip "Coming soon — currently only email is sent".
- `check-dead-leads` cron: **remove from Inngest registration.** Also drop the daily trigger. The function stays in the file but is not scheduled.
- Integrations tiles: already have "Coming soon" badge from previous work. Add a small improvement: disable the Switch toggle on all tiles except Resend so users can't "activate" dead integrations.

**Critical: file-overlap coordination.** Sprint 2 is editing `sequences/[id]/page.tsx` and `campaigns/new/page.tsx` at the same time in a parallel worktree. Sprint 4 MUST:
1. Open ONLY the `channel` Select/SelectItem block.
2. Make ONE surgical edit per file — marking `linkedin` SelectItem as `disabled` with a tooltip.
3. Commit those two files LAST, AFTER Sprint 2 has already committed its save-bug fixes to them (Wave 2 merges Sprint 2 first, then Sprint 4 rebases onto that).

**Commit message:** `Sprint 4: remove dead A/B UI + LinkedIn channel option, unregister unused cron, tighten Integrations`

---

## Verification after each wave

```bash
cd "C:/Users/AYM/OneDrive - GHAYM Group/[GHAYM] GHAYMGROUP/[GHAYM] CLAUDE PROJECTS/prolead"
npx tsc --noEmit     # must be 0 errors
npx next build       # must succeed, all routes compile
```

If anything fails, main-thread fixes it before moving on. No wave advances until the previous is green.
