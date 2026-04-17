"use client";

import { useState, useEffect, useMemo } from "react";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { useOrgId } from "@/hooks/use-org-id";
import type { Meeting, MeetingStatus, Lead } from "@/types/database";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Calendar,
  Clock,
  Video,
  Plus,
  ChevronLeft,
  ChevronRight,
  CalendarDays,
  List,
  Loader2,
  MoreHorizontal,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Link as LinkIcon,
} from "lucide-react";
import { useTranslation } from "@/components/language-provider";

type MeetingWithLead = Meeting & { lead: Lead | null };

const statusColors: Record<MeetingStatus, string> = {
  scheduled:
    "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300",
  completed:
    "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300",
  cancelled:
    "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300",
  no_show:
    "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300",
};

const statusKeys: Record<MeetingStatus, string> = {
  scheduled: "meetings.scheduled",
  completed: "meetings.completed",
  cancelled: "meetings.cancelled",
  no_show: "meetings.noShow",
};

export default function MeetingsPage() {
  const { t } = useTranslation();
  const { orgId } = useOrgId();
  const [meetings, setMeetings] = useState<MeetingWithLead[]>([]);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<"calendar" | "list">("list");

  // Add meeting dialog
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [formTitle, setFormTitle] = useState("");
  const [formLeadId, setFormLeadId] = useState("");
  const [formStartTime, setFormStartTime] = useState("");
  const [formEndTime, setFormEndTime] = useState("");
  const [formMeetingLink, setFormMeetingLink] = useState("");
  const [saving, setSaving] = useState(false);

  // Calendar month navigation
  const [calendarMonth, setCalendarMonth] = useState(new Date());

  const supabase = createClient();

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    setLoading(true);

    const [meetingsRes, leadsRes] = await Promise.all([
      supabase
        .from("meetings")
        .select(
          "*, lead:leads(id, first_name, last_name, company, email, title)",
        )
        .order("start_time", { ascending: true }),
      supabase
        .from("leads")
        .select("id, first_name, last_name, company")
        .order("first_name", { ascending: true }),
    ]);

    if (meetingsRes.data) {
      const mapped = meetingsRes.data.map((m: Record<string, unknown>) => {
        const leadData = m.lead;
        return {
          ...m,
          lead: Array.isArray(leadData)
            ? leadData[0] ?? null
            : leadData ?? null,
        } as MeetingWithLead;
      });
      setMeetings(mapped);
    }

    if (leadsRes.data) {
      setLeads(leadsRes.data as Lead[]);
    }

    setLoading(false);
  }

  const now = new Date();
  const upcoming = meetings.filter(
    (m) => m.status === "scheduled" && new Date(m.start_time) >= now,
  );
  const past = meetings.filter(
    (m) => m.status !== "scheduled" || new Date(m.start_time) < now,
  );

  const statCounts = useMemo(() => {
    const scheduledCount = meetings.filter(
      (m) => m.status === "scheduled",
    ).length;
    const completedCount = meetings.filter(
      (m) => m.status === "completed",
    ).length;
    const cancelledCount = meetings.filter(
      (m) => m.status === "cancelled",
    ).length;
    const noShowCount = meetings.filter((m) => m.status === "no_show").length;
    return { scheduledCount, completedCount, cancelledCount, noShowCount };
  }, [meetings]);

  function resetForm() {
    setFormTitle("");
    setFormLeadId("");
    setFormStartTime("");
    setFormEndTime("");
    setFormMeetingLink("");
  }

  async function handleAddMeeting(e: React.FormEvent) {
    e.preventDefault();
    if (!formTitle.trim() || !formLeadId || !formStartTime || !formEndTime)
      return;
    if (!orgId) {
      toast.error("No organization found. Please sign in again.");
      return;
    }

    setSaving(true);

    const { error } = await supabase.from("meetings").insert({
      org_id: orgId,
      title: formTitle.trim(),
      lead_id: formLeadId,
      start_time: new Date(formStartTime).toISOString(),
      end_time: new Date(formEndTime).toISOString(),
      meeting_link: formMeetingLink.trim() || null,
      status: "scheduled",
      timezone: "Europe/Amsterdam",
    });

    setSaving(false);

    if (error) {
      toast.error(`Kon meeting niet inplannen: ${error.message}`);
      return;
    }

    toast.success("Meeting ingepland.");
    setShowAddDialog(false);
    resetForm();
    loadData();
  }

  async function updateMeetingStatus(id: string, newStatus: MeetingStatus) {
    const { error } = await supabase
      .from("meetings")
      .update({ status: newStatus })
      .eq("id", id);

    if (error) {
      toast.error(`Kon status niet bijwerken: ${error.message}`);
      return;
    }
    loadData();
  }

  function getLeadName(m: MeetingWithLead): string {
    if (!m.lead) return t("meetings.unknown");
    return `${m.lead.first_name} ${m.lead.last_name}`;
  }

  // Calendar helpers
  const calYear = calendarMonth.getFullYear();
  const calMonth = calendarMonth.getMonth();
  const firstDayOfMonth = new Date(calYear, calMonth, 1);
  // Monday = 0
  const startDow = (firstDayOfMonth.getDay() + 6) % 7;
  const daysInMonth = new Date(calYear, calMonth + 1, 0).getDate();
  const calendarDays: (number | null)[] = [];
  for (let i = 0; i < startDow; i++) calendarDays.push(null);
  for (let d = 1; d <= daysInMonth; d++) calendarDays.push(d);
  while (calendarDays.length % 7 !== 0) calendarDays.push(null);

  const weekDays = ["Ma", "Di", "Wo", "Do", "Vr", "Za", "Zo"];
  const monthLabel = calendarMonth.toLocaleDateString("nl-NL", {
    month: "long",
    year: "numeric",
  });

  function prevMonth() {
    setCalendarMonth(new Date(calYear, calMonth - 1, 1));
  }
  function nextMonth() {
    setCalendarMonth(new Date(calYear, calMonth + 1, 1));
  }

  function renderMeetingRow(meeting: MeetingWithLead) {
    return (
      <TableRow
        key={meeting.id}
        className="hover:bg-neutral-50 dark:hover:bg-neutral-900"
      >
        <TableCell className="font-medium">{meeting.title}</TableCell>
        <TableCell>
          <div className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-full bg-neutral-100 text-xs font-medium dark:bg-neutral-800">
              {meeting.lead ? meeting.lead.first_name[0] : "?"}
            </div>
            <div>
              <p className="text-sm">{getLeadName(meeting)}</p>
              <p className="text-xs text-neutral-500">
                {meeting.lead?.company ?? ""}
              </p>
            </div>
          </div>
        </TableCell>
        <TableCell>
          <div className="flex items-center gap-1.5">
            <Calendar className="h-3.5 w-3.5 text-neutral-400" />
            <span className="text-sm">
              {new Date(meeting.start_time).toLocaleDateString("nl-NL", {
                weekday: "short",
                day: "numeric",
                month: "short",
              })}{" "}
              om{" "}
              {new Date(meeting.start_time).toLocaleTimeString("nl-NL", {
                hour: "2-digit",
                minute: "2-digit",
              })}
            </span>
          </div>
        </TableCell>
        <TableCell className="text-sm text-neutral-500">
          {(() => {
            const start = new Date(meeting.start_time);
            const end = new Date(meeting.end_time);
            const mins = Math.round(
              (end.getTime() - start.getTime()) / 60000,
            );
            return `${mins} min`;
          })()}
        </TableCell>
        <TableCell>
          {meeting.meeting_link ? (
            <a
              href={meeting.meeting_link}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 text-sm text-blue-600 hover:underline"
            >
              <Video className="h-3.5 w-3.5" />
              Link
            </a>
          ) : (
            <span className="text-sm text-neutral-400">-</span>
          )}
        </TableCell>
        <TableCell>
          <Badge
            variant="secondary"
            className={statusColors[meeting.status]}
          >
            {t(statusKeys[meeting.status])}
          </Badge>
        </TableCell>
        <TableCell>
          <DropdownMenu>
            <DropdownMenuTrigger
              render={
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7"
                />
              }
            >
              <MoreHorizontal className="h-4 w-4" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem
                onClick={() => updateMeetingStatus(meeting.id, "completed")}
              >
                <CheckCircle2 className="mr-2 h-4 w-4" />
                {t("meetings.completed")}
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => updateMeetingStatus(meeting.id, "cancelled")}
              >
                <XCircle className="mr-2 h-4 w-4" />
                {t("meetings.cancelled")}
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => updateMeetingStatus(meeting.id, "no_show")}
              >
                <AlertTriangle className="mr-2 h-4 w-4" />
                {t("meetings.noShow")}
              </DropdownMenuItem>
              {meeting.status !== "scheduled" && (
                <DropdownMenuItem
                  onClick={() =>
                    updateMeetingStatus(meeting.id, "scheduled")
                  }
                >
                  <Calendar className="mr-2 h-4 w-4" />
                  {t("meetings.reschedule")}
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </TableCell>
      </TableRow>
    );
  }

  return (
    <div className="space-y-6">
      {/* Actions Bar */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Button
            variant={view === "list" ? "default" : "outline"}
            size="sm"
            onClick={() => setView("list")}
          >
            <List className="mr-2 h-4 w-4" />
            {t("meetings.list")}
          </Button>
          <Button
            variant={view === "calendar" ? "default" : "outline"}
            size="sm"
            onClick={() => setView("calendar")}
          >
            <CalendarDays className="mr-2 h-4 w-4" />
            {t("meetings.calendar")}
          </Button>
        </div>
        <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
          <DialogTrigger render={<Button />}>
            <Plus className="mr-2 h-4 w-4" />
            {t("meetings.schedule")}
          </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <form onSubmit={handleAddMeeting}>
              <DialogHeader>
                <DialogTitle>{t("meetings.schedule")}</DialogTitle>
                <DialogDescription>
                  {t("meetings.scheduleDesc")}
                </DialogDescription>
              </DialogHeader>
              <div className="mt-4 space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="mtg-title">{t("meetings.formTitle")}</Label>
                  <Input
                    id="mtg-title"
                    placeholder="Bijv. Kennismaking"
                    value={formTitle}
                    onChange={(e) => setFormTitle(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="mtg-lead">{t("meetings.formLead")}</Label>
                  <Select
                    value={formLeadId}
                    onValueChange={(v) => v && setFormLeadId(v)}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder={t("meetings.selectLead")} />
                    </SelectTrigger>
                    <SelectContent>
                      {leads.map((lead) => (
                        <SelectItem key={lead.id} value={lead.id}>
                          {lead.first_name} {lead.last_name} - {lead.company}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="mtg-start">{t("meetings.startTime")}</Label>
                    <Input
                      id="mtg-start"
                      type="datetime-local"
                      value={formStartTime}
                      onChange={(e) => setFormStartTime(e.target.value)}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="mtg-end">{t("meetings.endTime")}</Label>
                    <Input
                      id="mtg-end"
                      type="datetime-local"
                      value={formEndTime}
                      onChange={(e) => setFormEndTime(e.target.value)}
                      required
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="mtg-link">{t("meetings.meetingLink")}</Label>
                  <Input
                    id="mtg-link"
                    type="url"
                    placeholder="https://meet.google.com/..."
                    value={formMeetingLink}
                    onChange={(e) => setFormMeetingLink(e.target.value)}
                  />
                </div>
              </div>
              <DialogFooter className="mt-4">
                <Button type="submit" disabled={saving || !formLeadId}>
                  {saving && (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  )}
                  {t("meetings.planBtn")}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-24">
          <Loader2 className="h-8 w-8 animate-spin text-neutral-400" />
          <span className="ml-3 text-neutral-500">{t("common.loading")}</span>
        </div>
      ) : (
        <>
          {/* Stats */}
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            {[
              {
                label: t("meetings.scheduled"),
                value: statCounts.scheduledCount,
                color: "text-blue-600",
              },
              {
                label: t("meetings.completed"),
                value: statCounts.completedCount,
                color: "text-green-600",
              },
              {
                label: t("meetings.cancelled"),
                value: statCounts.cancelledCount,
                color: "text-red-600",
              },
              {
                label: t("meetings.noShow"),
                value: statCounts.noShowCount,
                color: "text-orange-600",
              },
            ].map((stat) => (
              <div
                key={stat.label}
                className="rounded-lg border border-neutral-200 bg-white p-4 dark:border-neutral-800 dark:bg-neutral-950"
              >
                <p className="text-sm text-neutral-500">{stat.label}</p>
                <p className={`text-2xl font-bold ${stat.color}`}>
                  {stat.value}
                </p>
              </div>
            ))}
          </div>

          {view === "calendar" ? (
            <Card className="border-neutral-200 bg-white dark:border-neutral-800 dark:bg-neutral-950">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="capitalize">{monthLabel}</CardTitle>
                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={prevMonth}
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={nextMonth}
                    >
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-7 gap-px">
                  {weekDays.map((day) => (
                    <div
                      key={day}
                      className="p-2 text-center text-xs font-medium text-neutral-500"
                    >
                      {day}
                    </div>
                  ))}
                  {calendarDays.map((day, i) => {
                    const meetingsOnDay = day
                      ? meetings.filter((m) => {
                          const d = new Date(m.start_time);
                          return (
                            d.getDate() === day &&
                            d.getMonth() === calMonth &&
                            d.getFullYear() === calYear
                          );
                        })
                      : [];
                    const isToday =
                      day === now.getDate() &&
                      calMonth === now.getMonth() &&
                      calYear === now.getFullYear();
                    return (
                      <div
                        key={i}
                        className={`min-h-[80px] rounded border p-1 text-sm ${
                          day
                            ? "border-neutral-100 dark:border-neutral-800"
                            : "border-transparent"
                        } ${isToday ? "bg-blue-50/50 dark:bg-blue-950/20" : ""}`}
                      >
                        {day && (
                          <>
                            <span
                              className={`text-xs ${isToday ? "font-bold text-blue-600" : "text-neutral-500"}`}
                            >
                              {day}
                            </span>
                            {meetingsOnDay.map((m) => (
                              <div
                                key={m.id}
                                className={`mt-0.5 truncate rounded px-1 py-0.5 text-[10px] font-medium ${statusColors[m.status]}`}
                              >
                                {new Date(m.start_time).toLocaleTimeString(
                                  "nl-NL",
                                  { hour: "2-digit", minute: "2-digit" },
                                )}{" "}
                                {m.lead
                                  ? m.lead.first_name
                                  : m.title}
                              </div>
                            ))}
                          </>
                        )}
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-6">
              {/* Upcoming */}
              <div>
                <h3 className="mb-3 text-sm font-semibold uppercase text-neutral-500">
                  {t("meetings.upcoming")}
                </h3>
                <div className="rounded-lg border border-neutral-200 bg-white dark:border-neutral-800 dark:bg-neutral-950">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>{t("meetings.meeting")}</TableHead>
                        <TableHead>{t("meetings.lead")}</TableHead>
                        <TableHead>{t("meetings.dateTime")}</TableHead>
                        <TableHead>{t("meetings.duration")}</TableHead>
                        <TableHead>{t("meetings.link")}</TableHead>
                        <TableHead>{t("meetings.statusLabel")}</TableHead>
                        <TableHead className="w-10" />
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {upcoming.length === 0 ? (
                        <TableRow>
                          <TableCell
                            colSpan={7}
                            className="h-24 text-center text-neutral-500"
                          >
                            <div className="flex flex-col items-center gap-2">
                              <Calendar className="h-8 w-8 text-neutral-300 dark:text-neutral-600" />
                              <p>{t("meetings.noUpcoming")}</p>
                            </div>
                          </TableCell>
                        </TableRow>
                      ) : (
                        upcoming.map(renderMeetingRow)
                      )}
                    </TableBody>
                  </Table>
                </div>
              </div>

              {/* Past */}
              <div>
                <h3 className="mb-3 text-sm font-semibold uppercase text-neutral-500">
                  {t("meetings.past")}
                </h3>
                <div className="rounded-lg border border-neutral-200 bg-white dark:border-neutral-800 dark:bg-neutral-950">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>{t("meetings.meeting")}</TableHead>
                        <TableHead>{t("meetings.lead")}</TableHead>
                        <TableHead>{t("meetings.dateTime")}</TableHead>
                        <TableHead>{t("meetings.duration")}</TableHead>
                        <TableHead>{t("meetings.link")}</TableHead>
                        <TableHead>{t("meetings.statusLabel")}</TableHead>
                        <TableHead className="w-10" />
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {past.length === 0 ? (
                        <TableRow>
                          <TableCell
                            colSpan={7}
                            className="h-24 text-center text-neutral-500"
                          >
                            {t("meetings.noPast")}
                          </TableCell>
                        </TableRow>
                      ) : (
                        past.map(renderMeetingRow)
                      )}
                    </TableBody>
                  </Table>
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
