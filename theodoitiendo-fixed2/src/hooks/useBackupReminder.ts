/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState } from 'react';
import { getDaysSinceLastBackup } from '../utils/cancu';

const BACKUP_SNOOZE_KEY = 'ca-xa-backup-reminder-snoozed-until';
export const BACKUP_REMINDER_THRESHOLD_DAYS = 7;
const BACKUP_SNOOZE_DAYS = 3;

const isBackupSnoozed = (): boolean => {
  try {
    const raw = localStorage.getItem(BACKUP_SNOOZE_KEY);
    if (!raw) return false;
    const snoozeUntil = parseInt(raw, 10);
    return !isNaN(snoozeUntil) && Date.now() < snoozeUntil;
  } catch {
    return false;
  }
};

/**
 * Data lives only in this browser's IndexedDB, so periodically nudge the
 * user to export an Excel backup if it's been a while.
 */
export function useBackupReminder() {
  const [backupReminderDismissed, setBackupReminderDismissed] = useState(false);
  const [daysSinceBackup, setDaysSinceBackup] = useState<number | null>(() => getDaysSinceLastBackup());

  const dismissBackupReminder = () => {
    setBackupReminderDismissed(true);
    try {
      const snoozeUntil = Date.now() + BACKUP_SNOOZE_DAYS * 24 * 60 * 60 * 1000;
      localStorage.setItem(BACKUP_SNOOZE_KEY, String(snoozeUntil));
    } catch { }
  };

  const shouldShowReminder =
    !backupReminderDismissed &&
    !isBackupSnoozed() &&
    (daysSinceBackup === null || daysSinceBackup >= BACKUP_REMINDER_THRESHOLD_DAYS);

  return {
    daysSinceBackup,
    setDaysSinceBackup,
    shouldShowReminder,
    dismissBackupReminder,
    setBackupReminderDismissed,
  };
}
