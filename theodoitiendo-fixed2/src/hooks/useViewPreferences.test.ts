/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import { useViewPreferences } from './useViewPreferences';

describe('useViewPreferences', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('mặc định viewModeB/C/BC là "card" và viewModeD là "list" khi chưa có gì trong localStorage', () => {
    const { result } = renderHook(() => useViewPreferences());
    expect(result.current.viewModeB).toBe('card');
    expect(result.current.viewModeC).toBe('card');
    expect(result.current.viewModeBC).toBe('card');
    expect(result.current.viewModeD).toBe('list');
    expect(result.current.sidebarCollapsed).toBe(false);
  });

  it('đọc lại giá trị đã lưu trong localStorage khi khởi tạo', () => {
    localStorage.setItem('mainB_viewMode', 'excel');
    localStorage.setItem('sidebar_collapsed', 'true');
    localStorage.setItem('mainD_viewMode', 'kanban');

    const { result } = renderHook(() => useViewPreferences());
    expect(result.current.viewModeB).toBe('excel');
    expect(result.current.sidebarCollapsed).toBe(true);
    expect(result.current.viewModeD).toBe('kanban');
  });

  it('handleSetViewModeB cập nhật state và ghi lại localStorage', () => {
    const { result } = renderHook(() => useViewPreferences());

    act(() => result.current.handleSetViewModeB('excel'));

    expect(result.current.viewModeB).toBe('excel');
    expect(localStorage.getItem('mainB_viewMode')).toBe('excel');
  });

  it('handleToggleSectionI_IV đảo trạng thái và ghi lại localStorage', () => {
    const { result } = renderHook(() => useViewPreferences());
    expect(result.current.showSectionI_IV).toBe(false);

    act(() => result.current.handleToggleSectionI_IV());
    expect(result.current.showSectionI_IV).toBe(true);
    expect(localStorage.getItem('show_section_I_IV')).toBe('true');

    act(() => result.current.handleToggleSectionI_IV());
    expect(result.current.showSectionI_IV).toBe(false);
    expect(localStorage.getItem('show_section_I_IV')).toBe('false');
  });

  it('các chế độ xem B/C/BC/D độc lập với nhau', () => {
    const { result } = renderHook(() => useViewPreferences());

    act(() => result.current.handleSetViewModeC('excel'));

    expect(result.current.viewModeC).toBe('excel');
    expect(result.current.viewModeB).toBe('card');
    expect(result.current.viewModeBC).toBe('card');
  });
});
