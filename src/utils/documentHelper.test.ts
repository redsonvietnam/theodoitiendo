/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { describe, it, expect } from 'vitest';
import {
  suggestDocumentSymbol,
  parseDocumentNumber,
  parseDocumentSymbolTwoWay,
  tryExpandShorthand,
  matchDepartment,
  formatToDDMMYY,
  parseQuickDate,
  formatDonViBanHanhDisplay,
  POLICE_DEPARTMENTS,
} from './documentHelper';

describe('suggestDocumentSymbol', () => {
  it('trả về rỗng khi không có loại văn bản', () => {
    expect(suggestDocumentSymbol('', 'PV01', false)).toBe('');
  });

  it('ghép đúng ký hiệu cho văn bản không thuộc CAT', () => {
    expect(suggestDocumentSymbol('Kế hoạch', 'PC08', false)).toBe('/KH-PC08');
  });

  it('thêm "-CAT" vào ký hiệu khi văn bản do Công an tỉnh ban hành', () => {
    expect(suggestDocumentSymbol('Kế hoạch', 'PC08', true)).toBe('/KH-CAT-PC08');
  });

  it('Công văn có ký hiệu rỗng nên chỉ còn đơn vị', () => {
    expect(suggestDocumentSymbol('Công văn', 'PC08', false)).toBe('/PC08');
    expect(suggestDocumentSymbol('Công văn', 'PC08', true)).toBe('/CAT-PC08');
  });

  it('không có đơn vị và không phải CAT thì trả về rỗng cho Công văn', () => {
    expect(suggestDocumentSymbol('Công văn', '', false)).toBe('');
  });

  it('CAT nhưng không có đơn vị vẫn ra ký hiệu CAT', () => {
    expect(suggestDocumentSymbol('Kế hoạch', '', true)).toBe('/KH-CAT');
  });
});

describe('parseDocumentNumber', () => {
  it('tách đúng số và ký hiệu từ chuỗi đầy đủ', () => {
    const result = parseDocumentNumber('58/KH-CAT-PA04');
    expect(result.numberOnly).toBe('58');
    expect(result.symbolOnly).toBe('/KH-CAT-PA04');
    expect(result.isFromCAT).toBe(true);
    expect(result.departmentCode).toBe('PA04');
  });

  it('chuỗi chỉ có số thì numberOnly = chuỗi đó, symbolOnly rỗng', () => {
    const result = parseDocumentNumber('123');
    expect(result.numberOnly).toBe('123');
    expect(result.symbolOnly).toBe('');
  });

  it('chuỗi rỗng trả về tất cả các trường rỗng/false', () => {
    const result = parseDocumentNumber('');
    expect(result).toEqual({
      numberOnly: '',
      symbolOnly: '',
      isFromCAT: false,
      departmentCode: '',
      customSuffix: ''
    });
  });

  it('nhận diện đơn vị theo dõi tuỳ chỉnh khi không khớp mã chuẩn', () => {
    const result = parseDocumentNumber('10/BC-CAT-ABC');
    expect(result.departmentCode).toBe('');
    expect(result.customSuffix).toBe('ABC');
  });
});

describe('parseDocumentSymbolTwoWay', () => {
  it('nhận diện đúng loại văn bản, đơn vị và cờ CAT từ ký hiệu chuẩn', () => {
    const result = parseDocumentSymbolTwoWay('/KH-CAT-PC08');
    expect(result.detectedLoaiVanBan).toBe('Kế hoạch');
    expect(result.detectedIsFromCAT).toBe(true);
    expect(result.detectedDeptCode).toBe('PC08');
  });

  it('mặc định là Công văn khi không nhận diện được loại văn bản', () => {
    const result = parseDocumentSymbolTwoWay('/PC08');
    expect(result.detectedLoaiVanBan).toBe('Công văn');
    expect(result.detectedDeptCode).toBe('PC08');
    expect(result.detectedIsFromCAT).toBe(false);
  });

  it('chuỗi rỗng trả về detectedIsFromCAT = false và không có trường khác', () => {
    const result = parseDocumentSymbolTwoWay('');
    expect(result).toEqual({ detectedIsFromCAT: false });
  });
});

describe('tryExpandShorthand', () => {
  it('mở rộng đúng gõ tắt loại văn bản + đơn vị (vd: "khpv01")', () => {
    const result = tryExpandShorthand('khpv01');
    expect(result).not.toBeNull();
    expect(result?.docType).toBe('Kế hoạch');
    expect(result?.departmentCode).toBe('PV01');
    expect(result?.isFromCAT).toBe(false);
  });

  it('nhận diện "cat" trong chuỗi để bật cờ isFromCAT', () => {
    const result = tryExpandShorthand('bccatc8');
    expect(result).not.toBeNull();
    expect(result?.docType).toBe('Báo cáo');
    expect(result?.isFromCAT).toBe(true);
    expect(result?.departmentCode).toBe('PC08');
  });

  it('trả về null khi không nhận diện được đơn vị hợp lệ', () => {
    expect(tryExpandShorthand('khxyz')).toBeNull();
  });

  it('trả về null với chuỗi rỗng', () => {
    expect(tryExpandShorthand('')).toBeNull();
  });
});

describe('matchDepartment', () => {
  const pc08 = POLICE_DEPARTMENTS.find(d => d.code === 'PC08')!;

  it('khớp theo tiền tố nhóm ("c" -> mọi đơn vị PC)', () => {
    expect(matchDepartment(pc08, 'c')).toBe(true);
    const pa01 = POLICE_DEPARTMENTS.find(d => d.code === 'PA01')!;
    expect(matchDepartment(pa01, 'c')).toBe(false);
  });

  it('khớp theo alias (vd: "gt" cho giao thông)', () => {
    expect(matchDepartment(pc08, 'gt')).toBe(true);
  });

  it('khớp theo mã đơn vị trực tiếp', () => {
    expect(matchDepartment(pc08, 'PC08')).toBe(true);
  });

  it('chuỗi rỗng khớp với mọi đơn vị', () => {
    expect(matchDepartment(pc08, '')).toBe(true);
  });
});

describe('formatToDDMMYY / parseQuickDate', () => {
  it('formatToDDMMYY chuyển đúng định dạng', () => {
    expect(formatToDDMMYY('2026-03-12')).toBe('120326');
  });

  it('formatToDDMMYY trả rỗng khi thiếu ngày', () => {
    expect(formatToDDMMYY(undefined)).toBe('');
  });

  it('parseQuickDate hiểu "5/7" (ngày/tháng, năm hiện tại)', () => {
    const year = new Date().getFullYear();
    expect(parseQuickDate('5/7')).toBe(`${year}-07-05`);
  });

  it('parseQuickDate hiểu chuỗi 6 số DDMMYY', () => {
    expect(parseQuickDate('050726')).toBe('2026-07-05');
  });

  it('parseQuickDate hiểu chuỗi 8 số DDMMYYYY', () => {
    expect(parseQuickDate('05072026')).toBe('2026-07-05');
  });

  it('parseQuickDate trả về null với ngày không hợp lệ', () => {
    expect(parseQuickDate('32/13/2026')).toBeNull();
    expect(parseQuickDate('abc')).toBeNull();
  });
});

describe('formatDonViBanHanhDisplay', () => {
  it('hiển thị "CAT" nguyên trạng', () => {
    expect(formatDonViBanHanhDisplay('CAT')).toBe('CAT');
  });

  it('ghép mã và tên đầy đủ khi tìm thấy đơn vị', () => {
    expect(formatDonViBanHanhDisplay('PC08')).toBe('PC08 - Phòng Cảnh sát giao thông');
  });

  it('trả về rỗng khi không có giá trị', () => {
    expect(formatDonViBanHanhDisplay(undefined)).toBe('');
  });
});
