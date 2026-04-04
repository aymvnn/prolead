/**
 * Email warmup logic.
 *
 * New email accounts should not blast their full daily limit from day one.
 * This module calculates a progressive volume ramp so deliverability is
 * preserved while the sending reputation builds up.
 *
 * Schedule (emails per day):
 *   Day  1    :  5
 *   Day  2-3  : 10
 *   Day  4-7  : 20
 *   Day  8-14 : 40
 *   Day 15-29 : 60
 *   Day 30+   : full configured limit (account.daily_limit)
 */

import type { WarmupStatus } from "@/types/database";

interface WarmupAccountInfo {
  warmup_status: WarmupStatus;
  daily_limit: number;
  created_at: string; // ISO date when the account was added
}

/**
 * Return the maximum number of emails allowed on a given day since
 * the warmup started.  `daysSinceStart` is 1-based (day 1 = first day).
 */
export function getWarmupLimit(
  daysSinceStart: number,
  fullDailyLimit: number,
): number {
  if (daysSinceStart <= 0) return 0;
  if (daysSinceStart === 1) return Math.min(5, fullDailyLimit);
  if (daysSinceStart <= 3) return Math.min(10, fullDailyLimit);
  if (daysSinceStart <= 7) return Math.min(20, fullDailyLimit);
  if (daysSinceStart <= 14) return Math.min(40, fullDailyLimit);
  if (daysSinceStart <= 29) return Math.min(60, fullDailyLimit);
  return fullDailyLimit;
}

/**
 * Determine how many days have elapsed since the account was created.
 */
function daysSinceCreation(createdAt: string): number {
  const created = new Date(createdAt);
  const now = new Date();
  const diffMs = now.getTime() - created.getTime();
  return Math.max(1, Math.ceil(diffMs / (1000 * 60 * 60 * 24)));
}

/**
 * Check whether the account still requires warmup and, if so,
 * return the effective daily limit.  Returns `null` when warmup
 * is not applicable (status is "warmed" or "inactive").
 */
export function shouldSendWarmup(account: WarmupAccountInfo): {
  needsWarmup: boolean;
  effectiveLimit: number;
} {
  if (
    account.warmup_status === "warmed" ||
    account.warmup_status === "inactive"
  ) {
    return { needsWarmup: false, effectiveLimit: account.daily_limit };
  }

  if (account.warmup_status === "paused") {
    return { needsWarmup: true, effectiveLimit: 0 };
  }

  // status === "warming"
  const days = daysSinceCreation(account.created_at);
  const effectiveLimit = getWarmupLimit(days, account.daily_limit);
  const needsWarmup = days < 30;

  return { needsWarmup, effectiveLimit };
}

/**
 * Get a human-readable warmup progress description.
 */
export function getWarmupProgress(account: WarmupAccountInfo): {
  day: number;
  effectiveLimit: number;
  percentComplete: number;
  label: string;
} {
  const day = daysSinceCreation(account.created_at);
  const effectiveLimit = getWarmupLimit(day, account.daily_limit);
  const percentComplete = Math.min(100, Math.round((day / 30) * 100));

  let label: string;
  if (account.warmup_status === "warmed") {
    label = "Warmup voltooid";
  } else if (account.warmup_status === "paused") {
    label = "Warmup gepauzeerd";
  } else if (account.warmup_status === "inactive") {
    label = "Niet actief";
  } else {
    label = `Dag ${day}/30 — max ${effectiveLimit} emails/dag`;
  }

  return { day, effectiveLimit, percentComplete, label };
}
