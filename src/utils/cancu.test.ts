import { describe, it, expect, beforeEach } from 'vitest';
import {
  parseCanCu,
  compileCanCu,
  parseToTimestamp,
  daysUntil,
  computeAutoStatus,
  getTaskStatusInfo,
  getEarnedPoints,
  isTaskCompleted,
  hasValidProduct,
  migrateTasks,
  isRecurringText,
  cleanInlineText,
  formatParagraphText,
  getDaysSinceLastBackup,
  recordBackupExport,
} from './cancu';
import { TaskBC } from '../types';




function makeTask(overrides: Partial<TaskBC> = {}): TaskBC {
  return {
    id: 't1',
    stt: 1,
    canCu: '',
    noiDung: 'Nội dung mẫu',
    thoiHan: '',
    diemGiao: 1,
    donVi: 'PC08',
    sanPham: 'Báo cáo',
    ngayHetHan: '2026-07-15',
    trangThai: '',
    ...overrides,
  };
}

describe('parseCanCu / compileCanCu', () => {
  it('tách đúng các thành phần từ một chuỗi căn cứ đầy đủ', () => {
    const input =
      'Công văn số 850/CAT-PC06 ngày 12/6/2026 của Công an tỉnh về tăng cường kiểm tra lưu trú';
    const parsed = parseCanCu(input);
    expect(parsed.loaiVanBan).toBe('Công văn');
    expect(parsed.so).toBe('850/CAT-PC06');
    expect(parsed.ngay).toBe('12/6/2026');
    expect(parsed.donViBanHanh).toBe('Công an tỉnh');
    expect(parsed.trichYeu).toBe('tăng cường kiểm tra lưu trú');
  });

  it('trả về các trường rỗng khi chuỗi đầu vào rỗng', () => {
    const parsed = parseCanCu('');
    expect(parsed).toEqual({ loaiVanBan: '', so: '', ngay: '', donViBanHanh: '', trichYeu: '' });
  });

  it('compileCanCu ghép lại thành câu có cấu trúc hợp lý', () => {
    const compiled = compileCanCu({
      loaiVanBan: 'Kế hoạch',
      so: '292/KH-CAT-PC06',
      ngay: '2026-05-28',
      donViBanHanh: 'PC06',
      trichYeu: 'triển khai chiến dịch mùa hè',
    });
    expect(compiled).toContain('Kế hoạch');
    expect(compiled).toContain('số 292/KH-CAT-PC06');
    expect(compiled).toContain('ngày 28/05/2026');
    expect(compiled).toContain('về việc triển khai chiến dịch mùa hè');
  });
});

describe('parseToTimestamp / daysUntil', () => {
  it('parse đúng định dạng ISO (YYYY-MM-DD)', () => {
    const ts = parseToTimestamp('2026-07-15');
    const d = new Date(ts);
    expect(d.getFullYear()).toBe(2026);
    expect(d.getMonth()).toBe(6); // 0-indexed = July
    expect(d.getDate()).toBe(15);
  });

  it('parse đúng định dạng DD/MM/YYYY', () => {
    const ts = parseToTimestamp('15/07/2026');
    const d = new Date(ts);
    expect(d.getFullYear()).toBe(2026);
    expect(d.getMonth()).toBe(6);
    expect(d.getDate()).toBe(15);
  });

  it('daysUntil tính đúng số ngày còn lại theo ngày tham chiếu', () => {
    expect(daysUntil('2026-07-20', '2026-07-15')).toBe(5);
    expect(daysUntil('2026-07-10', '2026-07-15')).toBe(-5);
    expect(daysUntil('2026-07-15', '2026-07-15')).toBe(0);
  });
});

describe('computeAutoStatus', () => {
  it('trả về "Không áp dụng" khi chọn không áp dụng', () => {
    expect(computeAutoStatus('khong_ap_dung')).toBe('Không áp dụng');
  });

  it('trả về "-" khi chưa hoàn thành', () => {
    expect(computeAutoStatus('chua_hoan_thanh')).toBe('-');
  });

  it('trả về "Hoàn thành" khi hoàn thành đúng hạn (ngày hoàn thành <= hạn chót)', () => {
    const status = computeAutoStatus('hoan_thanh', '2026-07-14', '2026-07-15');
    expect(status).toBe('Hoàn thành');
  });

  it('trả về "Hoàn thành trễ hạn N ngày" kèm đúng số ngày trễ khi hoàn thành sau hạn chót', () => {
    const status = computeAutoStatus('hoan_thanh', '2026-07-18', '2026-07-15');
    expect(status).toBe('Hoàn thành trễ hạn 3 ngày');
  });
});

describe('getTaskStatusInfo', () => {
  it('nhiệm vụ hoàn thành trễ hạn phải có scoreMultiplier = 0.5 (nửa điểm)', () => {
    const task = makeTask({
      trangThai: 'Hoàn thành trễ hạn 3 ngày',
      ngayHetHan: '2026-07-15',
      ngayHoanThanh: '2026-07-18',
    });
    const info = getTaskStatusInfo(task);
    expect(info.statusType).toBe('hoan_thanh_tre');
    expect(info.isCompleted).toBe(true);
    expect(info.isLate).toBe(true);
    expect(info.daysLate).toBe(3);
    expect(info.scoreMultiplier).toBe(0.5);
  });

  it('nhiệm vụ hoàn thành đúng hạn phải có scoreMultiplier = 1.0 (điểm đầy đủ)', () => {
    const task = makeTask({
      trangThai: 'Hoàn thành đúng hạn',
      ngayHetHan: '2026-07-15',
      ngayHoanThanh: '2026-07-10',
    });
    const info = getTaskStatusInfo(task);
    expect(info.statusType).toBe('hoan_thanh');
    expect(info.scoreMultiplier).toBe(1.0);
  });

  it('nhiệm vụ "Không áp dụng" phải có scoreMultiplier = 0', () => {
    const task = makeTask({ trangThai: 'Không áp dụng' });
    const info = getTaskStatusInfo(task);
    expect(info.scoreMultiplier).toBe(0);
  });

  it('nhiệm vụ quá hạn và chưa hoàn thành phải có scoreMultiplier = 0', () => {
    const task = makeTask({ trangThai: '', ngayHetHan: '2026-07-01' });
    const info = getTaskStatusInfo(task, '2026-07-15');
    expect(info.isCompleted).toBe(false);
    expect(info.scoreMultiplier).toBe(0);
  });
});

describe('getEarnedPoints (regression test cho lỗi tính điểm trễ hạn)', () => {
  // Đây là test hồi quy trực tiếp cho lỗi: Dashboard.tsx / ExcelIO.tsx trước đây
  // so khớp CHÍNH XÁC trangThai === 'Hoàn thành trễ hạn', trong khi giá trị
  // thực tế được lưu luôn có hậu tố số ngày (vd: "Hoàn thành trễ hạn 3 ngày"),
  // khiến nhiệm vụ hoàn thành trễ hạn bị tính 0 điểm thay vì 50%.
  it('phải trả về đúng 50% điểm giao cho nhiệm vụ có trạng thái "Hoàn thành trễ hạn X ngày"', () => {
    const task = makeTask({
      diemGiao: 2,
      trangThai: 'Hoàn thành trễ hạn 3 ngày',
      ngayHetHan: '2026-07-15',
      ngayHoanThanh: '2026-07-18',
    });
    expect(getEarnedPoints(task)).toBe(1);
  });

  it('phải trả về đủ 100% điểm giao cho nhiệm vụ hoàn thành đúng hạn', () => {
    const task = makeTask({
      diemGiao: 2,
      trangThai: 'Hoàn thành đúng hạn',
      ngayHetHan: '2026-07-15',
      ngayHoanThanh: '2026-07-10',
    });
    expect(getEarnedPoints(task)).toBe(2);
  });

  it('phải trả về 0 điểm cho nhiệm vụ chưa hoàn thành', () => {
    const task = makeTask({ diemGiao: 2, trangThai: '', ngayHetHan: '2026-07-01' });
    expect(getEarnedPoints(task, '2026-07-15')).toBe(0);
  });
});

describe('isTaskCompleted / hasValidProduct', () => {
  it('nhận diện đúng các biến thể trạng thái đã hoàn thành', () => {
    expect(isTaskCompleted(makeTask({ trangThai: 'Hoàn thành trễ hạn 5 ngày' }))).toBe(true);
    expect(isTaskCompleted(makeTask({ trangThai: 'Hoàn thành đúng hạn' }))).toBe(true);
    expect(isTaskCompleted(makeTask({ trangThai: 'Chưa hoàn thành' }))).toBe(false);
    expect(isTaskCompleted(makeTask({ trangThai: '' }))).toBe(false);
  });

  it('nhận diện đúng sản phẩm/minh chứng hợp lệ', () => {
    expect(hasValidProduct(makeTask({ sanPham: 'Báo cáo kết quả' }))).toBe(true);
    expect(hasValidProduct(makeTask({ sanPham: '', minhChung: '' }))).toBe(false);
    expect(hasValidProduct(makeTask({ sanPham: 'Chưa có' }))).toBe(false);
  });
});

describe('migrateTasks', () => {
  it('should parse canCu and populate structured fields if they are missing', () => {
    const oldTasks: TaskBC[] = [
      makeTask({
        canCu: 'Công văn số 123/A-B ngày 01/01/2023 của Đơn vị C về việc D',
        loaiVanBan: undefined,
        so: undefined,
        ngay: undefined,
        donViBanHanh: undefined,
        trichYeu: undefined,
      }),
    ];
    const migrated = migrateTasks(oldTasks);
    expect(migrated[0].loaiVanBan).toBe('Công văn');
    expect(migrated[0].so).toBe('123/A-B');
    expect(migrated[0].ngay).toBe('01/01/2023');
    expect(migrated[0].donViBanHanh).toBe('Đơn vị C');
    expect(migrated[0].trichYeu).toBe('việc D');
  });

  it('should not overwrite existing structured fields', () => {
    const tasks: TaskBC[] = [
      makeTask({
        canCu: 'Công văn số 123/A-B ngày 01/01/2023 của Đơn vị C về việc D',
        loaiVanBan: 'Báo cáo', // Field đã tồn tại
        so: '456/X-Y', // Field đã tồn tại
        ngay: '02/02/2024',
        donViBanHanh: 'Đơn vị Z',
        trichYeu: 'Việc E',
      }),
    ];
    const migrated = migrateTasks(tasks);
    expect(migrated[0].loaiVanBan).toBe('Báo cáo');
    expect(migrated[0].so).toBe('456/X-Y');
    expect(migrated[0].ngay).toBe('02/02/2024');
    expect(migrated[0].donViBanHanh).toBe('Đơn vị Z');
    expect(migrated[0].trichYeu).toBe('Việc E');
  });

  it('should handle empty canCu string gracefully', () => {
    const tasks = [makeTask({ canCu: '' })];
    const migrated = migrateTasks(tasks);
    expect(migrated[0].loaiVanBan).toBe('');
    expect(migrated[0].so).toBe('');
    expect(migrated[0].ngay).toBe('');
  });
});


describe('isRecurringText', () => {
  it('should return true for recurring keywords', () => {
    expect(isRecurringText('Báo cáo định kỳ hằng tháng')).toBe(true);
    expect(isRecurringText('Làm thường xuyên')).toBe(true);
    expect(isRecurringText('Nộp mỗi tuần')).toBe(true);
    expect(isRecurringText('Công việc lặp lại')).toBe(true);
  });

  it('should return false for non-recurring text', () => {
    expect(isRecurringText('Hoàn thành trước 30/7')).toBe(false);
    expect(isRecurringText('Báo cáo một lần')).toBe(false);
    expect(isRecurringText(undefined)).toBe(false);
  });
});

describe('cleanInlineText', () => {
  it('should remove newlines and collapse multiple spaces', () => {
    const input = '  Nội dung \n có nhiều   dòng\r\n và   khoảng trắng. ';
    const expected = 'Nội dung có nhiều dòng và khoảng trắng.';
    expect(cleanInlineText(input)).toBe(expected);
  });
  it('should return empty string for empty input', () => {
    expect(cleanInlineText('')).toBe('');
  });
});

describe('formatParagraphText', () => {
  it('should preserve single and double newlines but collapse more', () => {
    const input = 'Dòng 1\n\nDòng 2\n\n\nDòng 3\r\n\r\n\r\n\r\nDòng 4';
    const expected = 'Dòng 1\n\nDòng 2\n\nDòng 3\n\nDòng 4';
    expect(formatParagraphText(input)).toBe(expected);
  });

  it('should trim whitespace from each line', () => {
    const input = '  Dòng 1  \n   Dòng 2   ';
    const expected = 'Dòng 1\nDòng 2';
    expect(formatParagraphText(input)).toBe(expected);
  });
});

describe('getDaysSinceLastBackup', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('should return null if no backup has been recorded', () => {
    expect(getDaysSinceLastBackup()).toBeNull();
  });

  it('should return 0 for a backup made today', () => {
    recordBackupExport();
    expect(getDaysSinceLastBackup()).toBe(0);
  });

  it('should return correct number of days', () => {
    const threeDaysAgo = Date.now() - 3 * 24 * 60 * 60 * 1000;
    localStorage.setItem('ca-xa-last-backup-export-ts', String(threeDaysAgo));
    expect(getDaysSinceLastBackup()).toBe(3);
  });
});

