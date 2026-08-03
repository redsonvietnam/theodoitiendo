/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import { useBackupReminder } from './useBackupReminder';

// getDaysSinceLastBackup reads its own localStorage key inside utils/cancu;
// we don't mock it here, so by default (no backup ever recorded) it returns
// null, which is exactly the case the reminder banner must cover.
describe('useBackupReminder', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('hiển thị nhắc nhở khi chưa từng backup lần nào (daysSinceBackup = null)', () => {
    const { result } = renderHook(() => useBackupReminder());
    expect(result.current.daysSinceBackup).toBeNull();
    expect(result.current.shouldShowReminder).toBe(true);
  });

  it('dismissBackupReminder tắt banner và lưu snooze vào localStorage', () => {
    const { result } = renderHook(() => useBackupReminder());

    act(() => result.current.dismissBackupReminder());

    expect(result.current.shouldShowReminder).toBe(false);
    expect(localStorage.getItem('ca-xa-backup-reminder-snoozed-until')).not.toBeNull();
  });

  it('vẫn snooze (ẩn banner) ở lần render mới nếu chưa hết thời gian snooze', () => {
    const { result, unmount } = renderHook(() => useBackupReminder());
    act(() => result.current.dismissBackupReminder());
    unmount();

    // Mount a fresh instance of the hook, as would happen on page reload.
    const { result: result2 } = renderHook(() => useBackupReminder());
    expect(result2.current.shouldShowReminder).toBe(false);
  });

  it('daysSinceBackup dưới ngưỡng 7 ngày thì không hiện nhắc nhở', () => {
    const { result } = renderHook(() => useBackupReminder());

    act(() => {
      result.current.setDaysSinceBackup(0);
    });

    expect(result.current.daysSinceBackup).toBe(0);
    expect(result.current.shouldShowReminder).toBe(false);
  });

  it('setBackupReminderDismissed(false) cho phép banner hiện lại (không còn bị dismiss)', () => {
    const { result } = renderHook(() => useBackupReminder());

    act(() => {
      result.current.setDaysSinceBackup(10);
      result.current.dismissBackupReminder();
    });
    expect(result.current.shouldShowReminder).toBe(false);

    act(() => {
      // Clear the snooze that dismiss() set, simulating a fresh backup export.
      localStorage.removeItem('ca-xa-backup-reminder-snoozed-until');
      result.current.setDaysSinceBackup(0);
      result.current.setBackupReminderDismissed(false);
    });

    expect(result.current.shouldShowReminder).toBe(false); // 0 days is still under threshold
  });
});
