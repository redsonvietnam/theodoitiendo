import { describe, it, expect } from 'vitest';
import {
  suggestDocumentSymbol,
  parseDocumentNumber,
  formatDonViBanHanhDisplay,
  parseDocumentSymbolTwoWay,
  tryExpandShorthand,
  formatToDDMMYY,
  parseQuickDate,
} from './documentHelper';

describe('suggestDocumentSymbol', () => {
  it('should suggest a symbol with CAT prefix when isFromCAT is true', () => {
    const symbol = suggestDocumentSymbol('Kế hoạch', 'PC06', true);
    expect(symbol).toBe('/KH-CAT-PC06');
  });

  it('should suggest a symbol without CAT prefix when isFromCAT is false', () => {
    const symbol = suggestDocumentSymbol('Báo cáo', 'PA05', false);
    expect(symbol).toBe('/BC-PA05');
  });

  it('should handle custom suffix', () => {
    const symbol = suggestDocumentSymbol('Công văn', '', true, 'TTV');
    expect(symbol).toBe('/CAT-TTV');
  });

  it('should return empty for empty doc type', () => {
    expect(suggestDocumentSymbol('', 'PC01', true)).toBe('');
  });
});

describe('parseDocumentNumber', () => {
  it('should parse a full document number correctly', () => {
    const parsed = parseDocumentNumber('123/KH-CAT-PC06');
    expect(parsed.numberOnly).toBe('123');
    expect(parsed.symbolOnly).toBe('/KH-CAT-PC06');
    expect(parsed.isFromCAT).toBe(true);
    expect(parsed.departmentCode).toBe('PC06');
    expect(parsed.customSuffix).toBe('');
  });

  it('should handle number only', () => {
    const parsed = parseDocumentNumber('456');
    expect(parsed.numberOnly).toBe('456');
    expect(parsed.symbolOnly).toBe('');
  });

  it('should handle symbol only', () => {
    const parsed = parseDocumentNumber('/NQ-PA02');
    expect(parsed.numberOnly).toBe('');
    expect(parsed.symbolOnly).toBe('/NQ-PA02');
    expect(parsed.isFromCAT).toBe(false);
    expect(parsed.departmentCode).toBe('PA02');
  });
});

describe('formatDonViBanHanhDisplay', () => {
    it('should format a known department code', () => {
        expect(formatDonViBanHanhDisplay('PC08')).toBe('PC08 - Phòng Cảnh sát giao thông');
    });

    it('should return CAT for CAT', () => {
        expect(formatDonViBanHanhDisplay('CAT')).toBe('CAT');
    });

    it('should return the input if not found', () => {
        expect(formatDonViBanHanhDisplay('UNKNOWN')).toBe('UNKNOWN');
    });
});


describe('parseDocumentSymbolTwoWay', () => {
    it('should detect doc type, CAT, and dept code from a full symbol', () => {
        const result = parseDocumentSymbolTwoWay('/KH-CAT-PC06');
        expect(result.detectedLoaiVanBan).toBe('Kế hoạch');
        expect(result.detectedIsFromCAT).toBe(true);
        expect(result.detectedDeptCode).toBe('PC06');
    });

    it('should default to Công văn if type is not recognized', () => {
        const result = parseDocumentSymbolTwoWay('/XYZ-PC01');
        expect(result.detectedLoaiVanBan).toBe('Công văn');
        expect(result.detectedDeptCode).toBe('PC01');
    });
});

describe('tryExpandShorthand', () => {
    it('should expand a valid shorthand like "kh-cat-pc06"', () => {
        const result = tryExpandShorthand('kh-cat-pc06');
        expect(result).not.toBeNull();
        expect(result?.docType).toBe('Kế hoạch');
        expect(result?.isFromCAT).toBe(true);
        expect(result?.departmentCode).toBe('PC06');
        expect(result?.expandedSymbol).toBe('/KH-CAT-PC06');
    });

    it('should return null for invalid shorthand', () => {
        const result = tryExpandShorthand('invalid-shorthand');
        expect(result).toBeNull();
    });
});

describe('formatToDDMMYY', () => {
    it('should format YYYY-MM-DD to DDMMYY', () => {
        expect(formatToDDMMYY('2026-07-31')).toBe('310726');
    });

    it('should return empty string for invalid input', () => {
        expect(formatToDDMMYY('invalid-date')).toBe('');
        expect(formatToDDMMYY(undefined)).toBe('');
    });
});

describe('parseQuickDate', () => {
    it('should parse DD/MM to YYYY-MM-DD', () => {
        const currentYear = new Date().getFullYear();
        expect(parseQuickDate('31/07')).toBe(`${currentYear}-07-31`);
    });

    it('should parse DDMMYY to YYYY-MM-DD', () => {
        expect(parseQuickDate('310726')).toBe('2026-07-31');
    });

    it('should parse DDMM to YYYY-MM-DD', () => {
        const currentYear = new Date().getFullYear();
        expect(parseQuickDate('3107')).toBe(`${currentYear}-07-31`);
    });

    it('should return null for invalid date string', () => {
        expect(parseQuickDate('9999')).toBeNull();
        expect(parseQuickDate('32/13')).toBeNull();
    });
});
