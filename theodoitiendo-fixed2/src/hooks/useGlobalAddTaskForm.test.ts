/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { describe, it, expect } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import { useGlobalAddTaskForm } from './useGlobalAddTaskForm';

describe('useGlobalAddTaskForm - buildTaskPayload', () => {
  it('nhiệm vụ một lần (không định kỳ) được xếp vào Mục B', () => {
    const { result } = renderHook(() => useGlobalAddTaskForm());

    act(() => {
      result.current.setNoiDung('Báo cáo sơ kết quý III');
      result.current.setKieuThoiHan('truoc_ngay');
      result.current.setNgayHetHan('2026-09-30');
    });

    const { finalSection, payload } = result.current.buildTaskPayload();
    expect(finalSection).toBe('B');
    expect(payload.thoiHan).toBe('Trước 00:00 ngày 30/09/2026');
    expect(payload.noiDung).toBe('Báo cáo sơ kết quý III');
  });

  it('nhiệm vụ định kỳ hằng tháng được tự động xếp vào Mục C', () => {
    const { result } = renderHook(() => useGlobalAddTaskForm());

    act(() => {
      result.current.setKieuThoiHan('truoc_ngay_hang_thang');
      result.current.setNgayHetHan('2026-08-05');
    });

    const { finalSection, payload } = result.current.buildTaskPayload();
    expect(finalSection).toBe('C');
    expect(payload.thoiHan).toBe('Trước 00:00 ngày 05 hằng tháng');
  });

  it('nhiệm vụ định kỳ hằng năm được tự động xếp vào Mục C', () => {
    const { result } = renderHook(() => useGlobalAddTaskForm());

    act(() => {
      result.current.setKieuThoiHan('hang_nam');
      result.current.setNgayHetHan('2026-12-25');
    });

    const { finalSection } = result.current.buildTaskPayload();
    expect(finalSection).toBe('C');
  });

  it('thời hạn kiểu "custom" chứa từ ngữ định kỳ được tự nhận diện và chuyển vào Mục C', () => {
    const { result } = renderHook(() => useGlobalAddTaskForm());

    act(() => {
      result.current.setKieuThoiHan('custom');
      result.current.setThoiHan('Định kỳ hàng tuần vào thứ Hai');
    });

    const { finalSection } = result.current.buildTaskPayload();
    expect(finalSection).toBe('C');
  });

  it('ghép đúng "số hiệu" từ soNumberOnly + soSymbolOnly khi trường "so" để trống', () => {
    const { result } = renderHook(() => useGlobalAddTaskForm());

    act(() => result.current.handleDeptCodeChange('PC08'));
    act(() => result.current.handleSoNumberChange('123'));

    const { payload } = result.current.buildTaskPayload();
    expect(payload.so).toBe('123/KH-PC08');
  });

  it('mặc định luôn có ít nhất 1 mốc thời hạn nếu người dùng chưa thêm mốc nào', () => {
    const { result } = renderHook(() => useGlobalAddTaskForm());
    const { payload } = result.current.buildTaskPayload();
    expect(payload.danhSachMoc?.length).toBe(1);
    expect(payload.danhSachMoc?.[0].tenMoc).toBe('Mốc 1');
  });
});

describe('useGlobalAddTaskForm - tự động hoá nhập ký hiệu văn bản', () => {
  it('handleDeptCodeChange tự điền đơn vị ban hành và đơn vị theo dõi', () => {
    const { result } = renderHook(() => useGlobalAddTaskForm());

    act(() => result.current.handleDeptCodeChange('PC08'));

    expect(result.current.donViBanHanh).toBe('PC08');
    expect(result.current.donViTheoDoi).toBe('Phòng Cảnh sát giao thông');
  });

  it('bật "isFromCAT" (CAT) đổi đơn vị ban hành thành CAT', () => {
    const { result } = renderHook(() => useGlobalAddTaskForm());

    act(() => result.current.handleDeptCodeChange('PC08'));
    act(() => result.current.handleCATToggle(true));

    expect(result.current.donViBanHanh).toBe('CAT');
    expect(result.current.donViTheoDoi).toBe('Phòng Cảnh sát giao thông');
    expect(result.current.soSymbolOnly).toContain('CAT');
  });

  it('handleSoNumberChange tự tách phần số và ký hiệu khi gõ liền (vd: "10/KH")', () => {
    const { result } = renderHook(() => useGlobalAddTaskForm());

    act(() => result.current.handleSoNumberChange('10/KH-PC08'));

    expect(result.current.soNumberOnly).toBe('10');
    expect(result.current.soSymbolOnly).toBe('/KH-PC08');
    // Should also auto-detect doc type and department from the symbol.
    expect(result.current.loaiVanBan).toBe('Kế hoạch');
    expect(result.current.selectedDeptCode).toBe('PC08');
  });

  it('handleOpenGlobalAdd đặt lại toàn bộ form về giá trị mặc định và mở modal', () => {
    const { result } = renderHook(() => useGlobalAddTaskForm());

    act(() => result.current.setNoiDung('dữ liệu cũ còn sót'));
    act(() => result.current.handleOpenGlobalAdd('C'));

    expect(result.current.isGlobalAddOpen).toBe(true);
    expect(result.current.targetSection).toBe('C');
    expect(result.current.noiDung).toBe('');
    expect(result.current.loaiVanBan).toBe('Kế hoạch');
    expect(result.current.danhSachMoc.length).toBe(1);
  });
});
