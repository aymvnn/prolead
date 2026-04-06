"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import type {
  Conversation,
  ConversationMessage,
  ConversationStatus,
  Lead,
} from "@/types/database";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Search,
  Inbox as InboxIcon,
  Send,
  Star,
  Archive,
  User,
  Building2,
  Briefcase,
  ExternalLink,
  Loader2,
  CheckCircle2,
  AlertTriangle,
  Pause,
  X,
  Mail,
  MessageSquare,
} from "lucide-react";
import { useTranslation } from "@/components/language-provider";

type ConversationWithLead = Conversation & { lead: Lead | null };

const statusBadgeColors: Record<ConversationStatus, string> = {
  active:
    "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300",
  paused:
    "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300",
  closed:
    "bg-neutral-100 text-neutral-600 dark:bg-neutral-800 dark:text-neutral-400",
  escalated:
    "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300",
};

const statusKeys: Record<ConversationStatus, string> = {
  active: "inbox.statusActive",
  paused: "inbox.statusPaused",
  closed: "inbox.statusClosed",
  escalated: "inbox.statusEscalated",
};

const intentKeys: Record<string, string> = {
  meeting: "inbox.intentMeeting",
  objection: "inbox.intentObjection",
  question: "inbox.intentQuestion",
  not_interested: "inbox.intentNotInterested",
  unsubscribe: "inbox.intentUnsubscribe",
  positive: "inbox.intentPositive",
  neutral: "inbox.intentNeutral",
  unknown: "inbox.intentUnknown",
};

const intentColors: Record<string, string> = {
  meeting: "bg-teal-100 text-teal-800 dark:bg-teal-900 dark:text-teal-300",
  positive:
    "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300",
  question:
    "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300",
  objection:
    "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300",
  not_interested:
    "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300",
  unsubscribe:
    "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300",
  neutral:
    "bg-neutral-100 text-neutral-600 dark:bg-neutral-800 dark:text-neutral-400",
  unknown:
    "bg-neutral-100 text-neutral-600 dark:bg-neutral-800 dark:text-neutral-400",
};

const channelLabels: Record<string, string> = {
  email: "Email",
  linkedin: "LinkedIn",
};

export default function InboxPage() {
  const { t } = useTranslation();
  const [conversations, setConversations] = useState<ConversationWithLead[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [channelFilter, setChannelFilter] = useState("all");
  const [replyText, setReplyText] = useState("");
  const [sending, setSending] = useState(false);
  const [updating, setUpdating] = useState(false);

  const supabase = createClient();

  useEffect(() => {
    loadConversations();
  }, [statusFilter, channelFilter]);

  async function loadConversations() {
    setLoading(true);

    let query = supabase
      .from("conversations")
      .select("*, lead:leads(id, first_name, last_name, company, title, email, icp_score, status, linkedin_url)")
      .order("updated_at", { ascending: false });

    if (statusFilter !== "all") {
      query = query.eq("status", statusFilter);
    }
    if (channelFilter !== "all") {
      query = query.eq("channel", channelFilter);
    }

    const { data, error } = await query;

    if (!error && data) {
      // Supabase returns `lead` as an array when using select with joins; take first
      const mapped = data.map((c: Record<string, unknown>) => {
        const leadData = c.lead;
        return {
          ...c,
          lead: Array.isArray(leadData) ? leadData[0] ?? null : leadData ?? null,
        } as ConversationWithLead;
      });
      setConversations(mapped);
    }
    setLoading(false);
  }

  const selected = conversations.find((c) => c.id === selectedId) ?? null;

  const filtered = conversations.filter((c) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    const leadName = c.lead
      ? `${c.lead.first_name} ${c.lead.last_name}`.toLowerCase()
      : "";
    const company = c.lead?.company?.toLowerCase() ?? "";
    return leadName.includes(q) || company.includes(q);
  });

  function getLastMessage(conv: ConversationWithLead): ConversationMessage | null {
    const msgs = conv.messages as ConversationMessage[];
    if (!msgs || msgs.length === 0) return null;
    return msgs[msgs.length - 1];
  }

  function getLeadDisplayName(lead: Lead | null): string {
    if (!lead) return t("inbox.unknown");
    return `${lead.first_name} ${lead.last_name}`;
  }

  async function handleSendReply() {
    if (!selected || !replyText.trim()) return;
    setSending(true);

    const currentMessages = (selected.messages ?? []) as ConversationMessage[];
    const newMessage: ConversationMessage = {
      role: "assistant",
      content: replyText.trim(),
      timestamp: new Date().toISOString(),
    };
    const updatedMessages = [...currentMessages, newMessage];

    const { error } = await supabase
      .from("conversations")
      .update({ messages: updatedMessages })
      .eq("id", selected.id);

    if (!error) {
      setReplyText("");
      loadConversations();
    }
    setSending(false);
  }

  async function updateConversationStatus(
    id: string,
    newStatus: ConversationStatus,
  ) {
    setUpdating(true);
    const { error } = await supabase
      .from("conversations")
      .update({ status: newStatus })
      .eq("id", id);

    if (!error) {
      loadConversations();
    }
    setUpdating(false);
  }

  return (
    <div className="flex h-[calc(100vh-7rem)] gap-0 overflow-hidden rounded-lg border border-neutral-200 bg-white dark:border-neutral-800 dark:bg-neutral-950">
      {/* Left: Conversation List */}
      <div className="flex w-80 flex-col border-r border-neutral-200 dark:border-neutral-800">
        <div className="space-y-2 border-b border-neutral-200 p-3 dark:border-neutral-800">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400" />
            <Input
              type="search"
              placeholder={t("inbox.search")}
              className="bg-neutral-50 pl-9 dark:bg-neutral-900"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <div className="flex gap-2">
            <Select
              value={statusFilter}
              onValueChange={(v) => v && setStatusFilter(v)}
            >
              <SelectTrigger className="flex-1 bg-neutral-50 dark:bg-neutral-900">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t("inbox.allStatuses")}</SelectItem>
                <SelectItem value="active">{t("inbox.statusActive")}</SelectItem>
                <SelectItem value="paused">{t("inbox.statusPaused")}</SelectItem>
                <SelectItem value="closed">{t("inbox.statusClosed")}</SelectItem>
                <SelectItem value="escalated">{t("inbox.statusEscalated")}</SelectItem>
              </SelectContent>
            </Select>
            <Select
              value={channelFilter}
              onValueChange={(v) => v && setChannelFilter(v)}
            >
              <SelectTrigger className="w-28 bg-neutral-50 dark:bg-neutral-900">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t("inbox.channel")}</SelectItem>
                <SelectItem value="email">Email</SelectItem>
                <SelectItem value="linkedin">LinkedIn</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <ScrollArea className="flex-1">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-5 w-5 animate-spin text-neutral-400" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center gap-2 p-8 text-center">
              <InboxIcon className="h-8 w-8 text-neutral-300 dark:text-neutral-600" />
              <p className="text-sm text-neutral-500">
                {t("inbox.noConversations")}
              </p>
            </div>
          ) : (
            filtered.map((conv) => {
              const lastMsg = getLastMessage(conv);
              const leadName = getLeadDisplayName(conv.lead);
              const isSelected = selectedId === conv.id;
              return (
                <button
                  key={conv.id}
                  onClick={() => setSelectedId(conv.id)}
                  className={`w-full border-b border-neutral-100 p-3 text-left transition-colors hover:bg-neutral-50 dark:border-neutral-800 dark:hover:bg-neutral-900 ${
                    isSelected
                      ? "bg-neutral-50 dark:bg-neutral-900"
                      : ""
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <span className="text-sm font-semibold">{leadName}</span>
                    <span className="text-xs text-neutral-400">
                      {new Date(conv.updated_at).toLocaleDateString("nl-NL", {
                        day: "numeric",
                        month: "short",
                      })}
                    </span>
                  </div>
                  <p className="mt-0.5 text-xs text-neutral-500">
                    {conv.lead?.company ?? ""}
                  </p>
                  {lastMsg && (
                    <p className="mt-1 truncate text-xs text-neutral-400">
                      {lastMsg.role === "assistant" ? `${t("inbox.you")}: ` : ""}
                      {lastMsg.content}
                    </p>
                  )}
                  <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                    <Badge
                      variant="secondary"
                      className={`text-[10px] ${statusBadgeColors[conv.status]}`}
                    >
                      {t(statusKeys[conv.status])}
                    </Badge>
                    {conv.intent_classification && (
                      <Badge
                        variant="secondary"
                        className={`text-[10px] ${intentColors[conv.intent_classification] || ""}`}
                      >
                        {intentKeys[conv.intent_classification] ? t(intentKeys[conv.intent_classification]) : conv.intent_classification}
                      </Badge>
                    )}
                    <Badge variant="secondary" className="text-[10px]">
                      {channelLabels[conv.channel] || conv.channel}
                    </Badge>
                  </div>
                </button>
              );
            })
          )}
        </ScrollArea>
      </div>

      {/* Center: Message Thread */}
      <div className="flex flex-1 flex-col">
        {selected ? (
          <>
            <div className="flex items-center justify-between border-b border-neutral-200 px-4 py-3 dark:border-neutral-800">
              <div>
                <h3 className="text-sm font-semibold">
                  {getLeadDisplayName(selected.lead)}
                </h3>
                <p className="text-xs text-neutral-500">
                  {selected.lead?.company ?? ""} &middot;{" "}
                  {channelLabels[selected.channel]}
                </p>
              </div>
              <div className="flex items-center gap-1">
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-xs"
                  disabled={updating}
                  onClick={() =>
                    updateConversationStatus(selected.id, "closed")
                  }
                >
                  <CheckCircle2 className="mr-1 h-3 w-3" />
                  {t("inbox.close")}
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-xs"
                  disabled={updating}
                  onClick={() =>
                    updateConversationStatus(selected.id, "escalated")
                  }
                >
                  <AlertTriangle className="mr-1 h-3 w-3" />
                  {t("inbox.escalate")}
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-xs"
                  disabled={updating}
                  onClick={() =>
                    updateConversationStatus(
                      selected.id,
                      selected.status === "paused" ? "active" : "paused",
                    )
                  }
                >
                  {selected.status === "paused" ? (
                    <>
                      <Mail className="mr-1 h-3 w-3" />
                      {t("inbox.resume")}
                    </>
                  ) : (
                    <>
                      <Pause className="mr-1 h-3 w-3" />
                      {t("inbox.pause")}
                    </>
                  )}
                </Button>
              </div>
            </div>
            <ScrollArea className="flex-1 p-4">
              {(() => {
                const msgs = (selected.messages ?? []) as ConversationMessage[];
                if (msgs.length === 0) {
                  return (
                    <div className="flex flex-col items-center justify-center gap-2 py-12 text-center">
                      <MessageSquare className="h-8 w-8 text-neutral-300 dark:text-neutral-600" />
                      <p className="text-sm text-neutral-400">
                        {t("inbox.noMessages")}
                      </p>
                    </div>
                  );
                }
                return (
                  <div className="space-y-4">
                    {msgs.map((msg, idx) => (
                      <div
                        key={idx}
                        className={`rounded-lg p-4 ${
                          msg.role === "assistant"
                            ? "bg-blue-50 dark:bg-blue-950/30"
                            : "bg-neutral-50 dark:bg-neutral-900"
                        }`}
                      >
                        <div className="mb-2 flex items-center justify-between">
                          <span
                            className={`text-xs font-medium ${
                              msg.role === "assistant"
                                ? "text-blue-700 dark:text-blue-400"
                                : ""
                            }`}
                          >
                            {msg.role === "assistant"
                              ? t("inbox.you")
                              : getLeadDisplayName(selected.lead)}
                          </span>
                          <span className="text-xs text-neutral-400">
                            {msg.timestamp
                              ? new Date(msg.timestamp).toLocaleDateString(
                                  "nl-NL",
                                  {
                                    day: "numeric",
                                    month: "short",
                                    hour: "2-digit",
                                    minute: "2-digit",
                                  },
                                )
                              : ""}
                          </span>
                        </div>
                        <p className="whitespace-pre-wrap text-sm text-neutral-700 dark:text-neutral-300">
                          {msg.content}
                        </p>
                      </div>
                    ))}
                  </div>
                );
              })()}
            </ScrollArea>
            <div className="border-t border-neutral-200 p-3 dark:border-neutral-800">
              <div className="flex items-end gap-2">
                <Textarea
                  placeholder={t("inbox.typeReply")}
                  className="bg-neutral-50 dark:bg-neutral-900"
                  rows={2}
                  value={replyText}
                  onChange={(e) => setReplyText(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
                      handleSendReply();
                    }
                  }}
                />
                <Button
                  size="icon"
                  onClick={handleSendReply}
                  disabled={!replyText.trim() || sending}
                >
                  {sending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Send className="h-4 w-4" />
                  )}
                </Button>
              </div>
              <p className="mt-1 text-[10px] text-neutral-400">
                {t("inbox.sendShortcut")}
              </p>
            </div>
          </>
        ) : (
          <div className="flex flex-1 flex-col items-center justify-center gap-3 text-center">
            <InboxIcon className="h-12 w-12 text-neutral-300 dark:text-neutral-600" />
            <div>
              <p className="font-medium text-neutral-600 dark:text-neutral-400">
                {t("inbox.selectConversation")}
              </p>
              <p className="text-sm text-neutral-400">
                {t("inbox.selectConversationDesc")}
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Right: Lead Info */}
      <div className="w-64 border-l border-neutral-200 dark:border-neutral-800">
        {selected && selected.lead ? (
          <div className="space-y-4 p-4">
            <div className="flex flex-col items-center gap-2 text-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-neutral-100 text-lg font-bold dark:bg-neutral-800">
                {selected.lead.first_name[0]}
              </div>
              <div>
                <p className="font-semibold">
                  {getLeadDisplayName(selected.lead)}
                </p>
                <p className="text-xs text-neutral-500">
                  {selected.lead.company}
                </p>
              </div>
            </div>
            <div className="space-y-3 text-sm">
              <div className="flex items-center gap-2 text-neutral-600 dark:text-neutral-400">
                <Building2 className="h-4 w-4" />
                <span>{selected.lead.company}</span>
              </div>
              {selected.lead.title && (
                <div className="flex items-center gap-2 text-neutral-600 dark:text-neutral-400">
                  <Briefcase className="h-4 w-4" />
                  <span>{selected.lead.title}</span>
                </div>
              )}
              {selected.lead.icp_score !== null && (
                <div className="flex items-center gap-2 text-neutral-600 dark:text-neutral-400">
                  <User className="h-4 w-4" />
                  <span>ICP Score: {selected.lead.icp_score}%</span>
                </div>
              )}
              {selected.lead.email && (
                <div className="flex items-center gap-2 text-neutral-600 dark:text-neutral-400">
                  <Mail className="h-4 w-4" />
                  <span className="truncate text-xs">
                    {selected.lead.email}
                  </span>
                </div>
              )}
            </div>
            <div className="space-y-2">
              <p className="text-xs font-medium uppercase text-neutral-500">
                {t("inbox.leadStatus")}
              </p>
              <Badge variant="secondary">{selected.lead.status}</Badge>
            </div>
            <div className="space-y-2">
              <p className="text-xs font-medium uppercase text-neutral-500">
                {t("inbox.conversationStatus")}
              </p>
              <Badge
                variant="secondary"
                className={statusBadgeColors[selected.status]}
              >
                {t(statusKeys[selected.status])}
              </Badge>
            </div>
            {selected.intent_classification && (
              <div className="space-y-2">
                <p className="text-xs font-medium uppercase text-neutral-500">
                  {t("inbox.intent")}
                </p>
                <Badge
                  variant="secondary"
                  className={
                    intentColors[selected.intent_classification] || ""
                  }
                >
                  {intentKeys[selected.intent_classification] ? t(intentKeys[selected.intent_classification]) : selected.intent_classification}
                </Badge>
              </div>
            )}
            {selected.ai_summary && (
              <div className="space-y-2">
                <p className="text-xs font-medium uppercase text-neutral-500">
                  {t("inbox.aiSummary")}
                </p>
                <p className="text-xs text-neutral-600 dark:text-neutral-400">
                  {selected.ai_summary}
                </p>
              </div>
            )}
            {selected.lead.linkedin_url && (
              <a
                href={selected.lead.linkedin_url}
                target="_blank"
                rel="noopener noreferrer"
              >
                <Button variant="outline" size="sm" className="w-full">
                  <ExternalLink className="mr-2 h-3 w-3" />
                  {t("inbox.linkedinProfile")}
                </Button>
              </a>
            )}
          </div>
        ) : (
          <div className="flex h-full flex-col items-center justify-center gap-2 p-4 text-center">
            <User className="h-8 w-8 text-neutral-300 dark:text-neutral-600" />
            <p className="text-xs text-neutral-400">
              {t("inbox.selectToViewLead")}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
