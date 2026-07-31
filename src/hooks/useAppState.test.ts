/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { act, renderHook, waitFor } from '@testing-library/react';
import { AppState, TaskBC } from '../types';

// Mock the IndexedDB wrapper module so tests run without a real browser DB.
vi.mock('../db', () => ({
  getState: vi.fn(),
  setState: vi.fn(),
}));

import { getState, setState as setStateToDb } from '../db';
import { useAppStore, buildDefaultState } from '../store/appStore';
import { useAppState } from './useAppState';

const mockedGetState = vi.mocked(getState);
const mockedSetStateToDb = vi.mocked(setStateToDb);

const makeTaskBC = (overrides: Partial<TaskBC> = {}): TaskBC => ({
  id: 'x1',
  stt: 1,
  canCu: '',
  noiDung: 'Nội dung mẫu',
  thoiHan: '',
  diemGiao: 1,
  donVi: 'PC08',
  sanPham: '',
  ngayHetHan: '2026-07-15',
  trangThai: '',
  ...overrides,
});

beforeEach(() => {
  vi.resetAllMocks();
  // Zustand store is a module-level singleton — reset it before every test
  // so `hasLoaded`/`isLoading` behave like a fresh page load each time.
  useAppStore.setState({
    state: buildDefaultState(),
    isLoading: true,
    hasLoaded: false,
    showSaveToast: false,
  });
  // Default: no restore file present, and any fetch (e.g. to the local
  // backup server) is expected to fail silently, matching production when
  // no backup server is running.
  globalThis.fetch = vi.fn().mockRejectedValue(new Error('no server'));
  window.alert = vi.fn();
});

describe('useAppState - load', () => {
  it('nạp dữ liệu mẫu (seed) khi IndexedDB chưa có dữ liệu', async () => {
    mockedGetState.mockResolvedValue(undefined);

    const { result } = renderHook(() => useAppState());

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.taskCounts.B).toBeGreaterThan(0);
    expect(result.current.state.meta.donVi).toBe('Công an xã Nâm Nung');
  });

  it('nạp đúng dữ liệu đã lưu từ IndexedDB khi đã tồn tại', async () => {
    const saved: AppState = {
      meta: { donVi: 'Công an xã Nâm Nung', thang: '08/2026' },
      A: [], B: [makeTaskBC({ id: 'b1' })], C: [], D: [],
      hiddenSidebarItems: [],
    };
    mockedGetState.mockResolvedValue(saved);

    const { result } = renderHook(() => useAppState());

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.taskCounts.B).toBe(1);
    expect(result.current.state.meta.thang).toBe('08/2026');
  });

  it('tự sửa tên đơn vị cũ ("Công an xã Lộc Nga") về tên hiện tại khi nạp', async () => {
    const saved: AppState = {
      meta: { donVi: 'Công an xã Lộc Nga', thang: '08/2026' },
      A: [], B: [], C: [], D: [],
      hiddenSidebarItems: [],
    };
    mockedGetState.mockResolvedValue(saved);

    const { result } = renderHook(() => useAppState());

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.state.meta.donVi).toBe('Công an xã Nâm Nung');
  });

  it('ưu tiên dữ liệu từ restore.json nếu tồn tại, bỏ qua IndexedDB', async () => {
    const restoredData: AppState = {
      meta: { donVi: 'Công an xã Nâm Nung', thang: '09/2026' },
      A: [], B: [makeTaskBC({ id: 'restored-1' })], C: [], D: [],
      hiddenSidebarItems: [],
    };

    globalThis.fetch = vi.fn().mockImplementation((url: string) => {
      if (url === '/restore.json') {
        return Promise.resolve({ ok: true, json: () => Promise.resolve(restoredData) });
      }
      // e.g. the cleanup POST to the backup server
      return Promise.resolve({ ok: true, json: () => Promise.resolve({}) });
    });
    mockedGetState.mockResolvedValue(undefined);

    const { result } = renderHook(() => useAppState());

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.state.meta.thang).toBe('09/2026');
    expect(result.current.taskCounts.B).toBe(1);
    expect(mockedGetState).not.toHaveBeenCalled();
    expect(window.alert).toHaveBeenCalled();
  });
});

describe('useAppState - CRUD', () => {
  beforeEach(() => {
    mockedGetState.mockResolvedValue({
      meta: { donVi: 'Công an xã Nâm Nung', thang: '07/2026' },
      A: [{ id: 'a1', stt: 1, content: 'Chỉ tiêu A1', maxPoints: 10, unit: 'điểm', status: '' as const }],
      B: [], C: [], D: [],
      hiddenSidebarItems: [],
    });
  });

  it('addTaskBC thêm nhiệm vụ một lần vào đúng Mục B, đánh số stt tăng dần', async () => {
    const { result } = renderHook(() => useAppState());
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    act(() => {
      result.current.addTaskBC('B', {
        canCu: '', noiDung: 'Việc mới', thoiHan: '', diemGiao: 1,
        donVi: 'PC08', sanPham: '', ngayHetHan: '2026-08-01', trangThai: '',
      });
    });

    expect(result.current.state.B).toHaveLength(1);
    expect(result.current.state.B[0].stt).toBe(1);
    expect(result.current.state.B[0].noiDung).toBe('Việc mới');
  });

  it('addTaskBC với nhiệm vụ định kỳ hằng năm tự động nhân bản sang Mục C', async () => {
    const { result } = renderHook(() => useAppState());
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    act(() => {
      result.current.addTaskBC('B', {
        canCu: '', noiDung: 'Báo cáo tổng kết năm', thoiHan: '', diemGiao: 1,
        donVi: 'PC08', sanPham: '', ngayHetHan: '2026-12-31', trangThai: '',
        kieuThoiHan: 'hang_nam',
      });
    });

    expect(result.current.state.B).toHaveLength(1);
    expect(result.current.state.C).toHaveLength(1);
    expect(result.current.state.C[0].noiDung).toBe('Báo cáo tổng kết năm');
  });

  it('updateTaskBC tự chuyển trạng thái sang "Hoàn thành đúng hạn" khi nhập sản phẩm', async () => {
    const { result } = renderHook(() => useAppState());
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    act(() => {
      result.current.addTaskBC('B', {
        canCu: '', noiDung: 'Việc cần làm', thoiHan: '', diemGiao: 1,
        donVi: 'PC08', sanPham: '', ngayHetHan: '2026-08-01', trangThai: '',
      });
    });

    act(() => {
      result.current.updateTaskBC('B', 0, 'sanPham', 'Báo cáo đã nộp');
    });

    expect(result.current.state.B[0].trangThai).toBe('Hoàn thành đúng hạn');
  });

  it('deleteTaskBC xoá đúng phần tử và đánh lại số thứ tự (stt) liên tục', async () => {
    const { result } = renderHook(() => useAppState());
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    act(() => {
      result.current.addTaskBC('B', makeTaskBC({ noiDung: 'Việc 1' }));
      result.current.addTaskBC('B', makeTaskBC({ noiDung: 'Việc 2' }));
      result.current.addTaskBC('B', makeTaskBC({ noiDung: 'Việc 3' }));
    });
    expect(result.current.state.B).toHaveLength(3);

    act(() => result.current.deleteTaskBC('B', 0));

    expect(result.current.state.B).toHaveLength(2);
    expect(result.current.state.B[0].noiDung).toBe('Việc 2');
    expect(result.current.state.B[0].stt).toBe(1);
    expect(result.current.state.B[1].stt).toBe(2);
  });

  it('updateStatusA cập nhật đúng trạng thái của chỉ tiêu A theo chỉ số', async () => {
    const { result } = renderHook(() => useAppState());
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    act(() => result.current.updateStatusA(0, 'dam_bao'));

    expect(result.current.state.A[0].status).toBe('dam_bao');
  });

  it('resetToDefault đưa dữ liệu về seed ban đầu', async () => {
    const { result } = renderHook(() => useAppState());
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    act(() => result.current.updateStatusA(0, 'dam_bao'));
    act(() => result.current.resetToDefault());

    expect(result.current.taskCounts.B).toBeGreaterThan(0);
    expect(result.current.state.meta.donVi).toBe('Công an xã Nâm Nung');
  });

  it('tự động lưu (debounced) xuống IndexedDB sau khi state thay đổi', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    const { result } = renderHook(() => useAppState());

    await vi.waitFor(() => expect(result.current.isLoading).toBe(false));
    mockedSetStateToDb.mockClear();

    act(() => result.current.updateStatusA(0, 'khong_dam_bao'));
    await act(async () => {
      vi.advanceTimersByTime(300); // debounce delay before save
      await Promise.resolve(); // flush the async saveState()
      vi.advanceTimersByTime(900); // save-toast auto-hide delay
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(mockedSetStateToDb).toHaveBeenCalled();
    vi.useRealTimers();
  });

  it('hiển thị saveError cho người dùng khi lưu xuống IndexedDB thất bại', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    mockedSetStateToDb.mockRejectedValue(new Error('QuotaExceededError'));

    const { result } = renderHook(() => useAppState());
    await vi.waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.saveError).toBeNull();

    act(() => result.current.updateStatusA(0, 'khong_dam_bao'));
    await act(async () => {
      vi.advanceTimersByTime(300);
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(result.current.saveError).toMatch(/Không thể lưu/);
    vi.useRealTimers();
  });

  it('saveError được xoá ngay khi có lần lưu thành công tiếp theo', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    mockedSetStateToDb.mockRejectedValueOnce(new Error('fail once'));

    const { result } = renderHook(() => useAppState());
    await vi.waitFor(() => expect(result.current.isLoading).toBe(false));

    act(() => result.current.updateStatusA(0, 'khong_dam_bao'));
    await act(async () => {
      vi.advanceTimersByTime(300);
      await Promise.resolve();
      await Promise.resolve();
    });
    expect(result.current.saveError).not.toBeNull();

    act(() => result.current.updateStatusA(0, 'dam_bao'));
    await act(async () => {
      vi.advanceTimersByTime(300);
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(result.current.saveError).toBeNull();
    vi.useRealTimers();
  });
});
