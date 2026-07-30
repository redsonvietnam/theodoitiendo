/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { TaskBC, AppState } from '../types';
import { formatDonViBanHanhDisplay } from './documentHelper';

/**
 * Parses an unstructured "canCu" string into 5 structured components:
 * - loaiVanBan (Type of document)
 * - so (Document number)
 * - ngay (Date of document)
 * - donViBanHanh (Issuing authority)
 * - trichYeu (Summary / Abstract)
 */
export function parseCanCu(canCu: string) {
  if (!canCu) {
    return {
      loaiVanBan: '',
      so: '',
      ngay: '',
      donViBanHanh: '',
      trichYeu: ''
    };
  }

  const s = canCu.trim();

  // Try to find "về " (about/summary) - usually at the end
  let trichYeu = '';
  let rest = s;
  const veIndex = s.toLowerCase().indexOf(' về ');
  if (veIndex !== -1) {
    trichYeu = s.substring(veIndex + 4).trim();
    rest = s.substring(0, veIndex).trim();
  }

  // Try to find "của " (of/by) - usually before "về"
  let donViBanHanh = '';
  const cuaIndex = rest.toLowerCase().lastIndexOf(' của ');
  if (cuaIndex !== -1) {
    donViBanHanh = rest.substring(cuaIndex + 5).trim();
    rest = rest.substring(0, cuaIndex).trim();
  }

  // Try to find "ngày "
  let ngay = '';
  const dateMatch = s.match(/ngày\s+([0-9]{1,2}[\/\-][0-9]{1,2}[\/\-][0-9]{4})/i);
  if (dateMatch) {
    ngay = dateMatch[1];
    // remove "ngày [date]" from rest
    const matchStr = dateMatch[0];
    const matchIdx = rest.indexOf(matchStr);
    if (matchIdx !== -1) {
      rest = (rest.substring(0, matchIdx) + ' ' + rest.substring(matchIdx + matchStr.length)).trim();
    }
  } else {
    // If no full date, check if there is a " ngày " in rest
    const ngayIndex = rest.toLowerCase().lastIndexOf(' ngày ');
    if (ngayIndex !== -1) {
      ngay = rest.substring(ngayIndex + 6).trim();
      rest = rest.substring(0, ngayIndex).trim();
    }
  }

  // Try to find "số "
  let so = '';
  const soIndex = rest.toLowerCase().indexOf(' số ');
  if (soIndex !== -1) {
    const rawSo = rest.substring(soIndex + 4).trim();
    const firstSpace = rawSo.indexOf(' ');
    if (firstSpace !== -1) {
      so = rawSo.substring(0, firstSpace).trim();
      const restOfSo = rawSo.substring(firstSpace).trim();
      if (restOfSo && !donViBanHanh) {
        donViBanHanh = restOfSo.replace(/đã ban hành/g, '').trim();
      }
    } else {
      so = rawSo;
    }
    rest = rest.substring(0, soIndex).trim();
  } else {
    // Check for "số" without spaces
    const soMatch = rest.match(/số\s*([^\s,]+)/i);
    if (soMatch) {
      so = soMatch[1].trim();
      rest = rest.replace(soMatch[0], '').trim();
    }
  }

  // The remainder is loaiVanBan
  let loaiVanBan = rest.trim();

  // If loaiVanBan is empty, try to match some default document types
  if (!loaiVanBan) {
    const docTypes = [
      'Công văn', 'Kế hoạch', 'Quyết định', 'Thông báo', 'Nghị quyết', 
      'Chương trình hành động', 'Chương trình', 'Hướng dẫn', 'Kết luận thanh tra',
      'Kết luận', 'Đề án', 'Chỉ thị', 'Báo cáo'
    ];
    for (const type of docTypes) {
      if (s.toLowerCase().startsWith(type.toLowerCase())) {
        loaiVanBan = type;
        break;
      }
    }
  }

  // Default fallback
  if (!loaiVanBan) {
    loaiVanBan = 'Công văn';
  }

  return {
    loaiVanBan,
    so,
    ngay,
    donViBanHanh,
    trichYeu
  };
}

/**
 * Helper to format date from YYYY-MM-DD to DD/MM/YYYY for Vietnamese display
 */
export function formatNgayBanHanh(dateStr: string | undefined): string {
  if (!dateStr) return '';
  const s = dateStr.trim();
  const parts = s.split('-');
  if (parts.length === 3 && parts[0].length === 4) { // YYYY-MM-DD
    const d = parseInt(parts[2], 10);
    const m = parseInt(parts[1], 10);
    const y = parts[0];
    return `${d < 10 ? '0' + d : d}/${m < 10 ? '0' + m : m}/${y}`;
  }
  return s;
}

/**
 * Combines structured fields into a single basis string
 */
export function compileCanCu(task: {
  loaiVanBan?: string;
  so?: string;
  ngay?: string;
  donViBanHanh?: string;
  trichYeu?: string;
  canCu?: string;
}) {
  const parts: string[] = [];
  if (task.loaiVanBan) {
    parts.push(task.loaiVanBan.trim());
  }
  if (task.so) {
    parts.push(`số ${task.so.trim()}`);
  }
  if (task.ngay) {
    const formattedNgay = formatNgayBanHanh(task.ngay);
    if (formattedNgay.toLowerCase().startsWith('ngày')) {
      parts.push(formattedNgay);
    } else {
      parts.push(`ngày ${formattedNgay}`);
    }
  }
  if (task.donViBanHanh) {
    const rawDv = task.donViBanHanh.trim();
    const dv = formatDonViBanHanhDisplay(rawDv) || rawDv;
    if (dv.toLowerCase().startsWith('của')) {
      parts.push(dv);
    } else {
      parts.push(`của ${dv}`);
    }
  }
  if (task.trichYeu) {
    const ty = task.trichYeu.trim();
    if (ty.toLowerCase().startsWith('về việc')) {
      parts.push(ty);
    } else if (ty.toLowerCase().startsWith('về')) {
      parts.push(`về việc ${ty.substring(2).trim()}`);
    } else {
      parts.push(`về việc ${ty}`);
    }
  }

  if (parts.length === 0) return task.canCu || '';
  return parts.join(' ');
}

/**
 * Migrates old states or runs parse over items to ensure structured fields exist
 */
export function migrateTasks(tasks: TaskBC[]): TaskBC[] {
  return tasks.map(t => {
    const parsed = parseCanCu(t.canCu);
    return {
      ...t,
      loaiVanBan: t.loaiVanBan !== undefined ? t.loaiVanBan : parsed.loaiVanBan,
      so: t.so !== undefined ? t.so : parsed.so,
      ngay: (t.ngay && t.ngay.trim()) ? t.ngay : parsed.ngay,
      donViBanHanh: t.donViBanHanh !== undefined ? t.donViBanHanh : parsed.donViBanHanh,
      trichYeu: t.trichYeu !== undefined ? t.trichYeu : parsed.trichYeu
    };
  });
}

/**
 * Safely parses any date string (ISO YYYY-MM-DD or DD/MM/YYYY or DD-MM-YYYY or DD.MM.YYYY) to a Unix timestamp.
 */
export function parseToTimestamp(dateStr: string | undefined): number {
  if (!dateStr) return 0;
  const s = dateStr.trim();
  if (!s) return 0;

  // 1. Check YYYY-MM-DD or YYYY/MM/DD
  const isoMatch = s.match(/^([0-9]{4})[\-\/]([0-9]{1,2})[\-\/]([0-9]{1,2})/);
  if (isoMatch) {
    const y = parseInt(isoMatch[1], 10);
    const m = parseInt(isoMatch[2], 10) - 1;
    const d = parseInt(isoMatch[3], 10);
    return new Date(y, m, d).getTime();
  }

  // 2. Check DD/MM/YYYY or DD-MM-YYYY or DD.MM.YYYY
  const dmyMatch = s.match(/^([0-9]{1,2})[\/\-\.]([0-9]{1,2})[\/\-\.]([0-9]{4})/);
  if (dmyMatch) {
    const d = parseInt(dmyMatch[1], 10);
    const m = parseInt(dmyMatch[2], 10) - 1;
    const y = parseInt(dmyMatch[3], 10);
    return new Date(y, m, d).getTime();
  }

  // 3. Fallback
  const parsed = Date.parse(s);
  return isNaN(parsed) ? 0 : parsed;
}

/**
 * Gets a reliable timestamp for "ngày ban hành" of a task (checking task.ngay first, falling back to canCu string).
 */
export function getTaskNgayBanHanhTimestamp(task: { ngay?: string; canCu?: string }): number {
  if (task.ngay) {
    const ts = parseToTimestamp(task.ngay);
    if (ts > 0) return ts;
  }
  if (task.canCu) {
    const parsed = parseCanCu(task.canCu);
    if (parsed.ngay) {
      const ts = parseToTimestamp(parsed.ngay);
      if (ts > 0) return ts;
    }
  }
  return 0;
}

/**
 * Helper to parse ISO date from various date string formats or Excel date numbers
 */
export function extractISODate(val: any): string | null {
  if (!val) return null;
  const str = String(val).trim();
  if (!str) return null;
  
  // ISO YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}$/.test(str)) {
    return str;
  }
  
  // DD/MM/YYYY or DD-MM-YYYY
  const dmYMatch = str.match(/(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})/);
  if (dmYMatch) {
    const dd = dmYMatch[1].padStart(2, '0');
    const mm = dmYMatch[2].padStart(2, '0');
    const yyyy = dmYMatch[3];
    return `${yyyy}-${mm}-${dd}`;
  }

  // YYYY/MM/DD
  const yMDMatch = str.match(/(\d{4})[\/\-](\d{1,2})[\/\-](\d{1,2})/);
  if (yMDMatch) {
    const yyyy = yMDMatch[1];
    const mm = yMDMatch[2].padStart(2, '0');
    const dd = yMDMatch[3].padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  }

  return null;
}

/**
 * Extract ISO deadline string (YYYY-MM-DD) from a task object
 */
export function getTaskDeadlineISO(task: { ngayHetHan?: string; thoiHan?: string; danhSachMoc?: { ngayHetHan?: string }[] }): string {
  if (task.ngayHetHan && /^\d{4}-\d{2}-\d{2}$/.test(task.ngayHetHan)) {
    return task.ngayHetHan;
  }
  if (task.danhSachMoc && task.danhSachMoc.length > 0 && task.danhSachMoc[0].ngayHetHan) {
    const iso = extractISODate(task.danhSachMoc[0].ngayHetHan);
    if (iso) return iso;
  }
  if (task.thoiHan) {
    const iso = extractISODate(task.thoiHan);
    if (iso) return iso;
  }
  return '';
}

/**
 * Gets a reliable timestamp for "ngày hết hạn" of a task.
 */
export function getTaskNgayHetHanTimestamp(task: { ngayHetHan?: string; thoiHan?: string; danhSachMoc?: { ngayHetHan?: string }[] }): number {
  const deadlineIso = getTaskDeadlineISO(task);
  if (deadlineIso) {
    return parseToTimestamp(deadlineIso);
  }
  return 0;
}

/**
 * Checks if a deadline/frequency string implies a recurring or periodic task
 */
export function isRecurringText(text: string | undefined): boolean {
  if (!text) return false;
  const t = text.toLowerCase();
  return t.includes('định kỳ') || t.includes('định kì') || 
         t.includes('thường xuyên') || t.includes('hằng') || 
         t.includes('hàng') || t.includes('mỗi') || 
         t.includes('lặp') || t.includes('chu kỳ') || 
         t.includes('chu kì') || t.includes('đều đặn');
}

export function getTodayDateString(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Calculates remaining days from reference date (or today) until a deadline date string
 */
export function daysUntil(dateStr: string | undefined, referenceDateISO?: string): number | null {
  if (!dateStr) return null;
  const targetTs = parseToTimestamp(dateStr);
  if (!targetTs) return null;
  
  const refIso = referenceDateISO || getTodayDateString();
  const refTs = parseToTimestamp(refIso);
  if (!refTs) return null;

  const targetDate = new Date(targetTs);
  targetDate.setHours(0, 0, 0, 0);

  const refDate = new Date(refTs);
  refDate.setHours(0, 0, 0, 0);

  const diffMs = targetDate.getTime() - refDate.getTime();
  return Math.round(diffMs / (1000 * 60 * 60 * 24));
}

/**
 * Cleans inline summary/excerpt text by removing all newlines and collapsing multiple spaces.
 */
export function cleanInlineText(text: string): string {
  if (!text) return '';
  return text.replace(/[\r\n]+/g, ' ').replace(/\s+/g, ' ').trim();
}

/**
 * Formats multi-paragraph task content by preserving original line breaks,
 * normalizing line endings, trimming per-line whitespace, and collapsing 3+ consecutive newlines.
 */
export function formatParagraphText(text: string): string {
  if (!text) return '';
  return text
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .split('\n')
    .map(line => line.trim())
    .join('\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

/**
 * Checks if a task is marked as completed.
 */
export function isTaskCompleted(task: TaskBC | string | undefined | null): boolean {
  if (!task) return false;

  const checkStatusText = (raw: string): boolean => {
    const status = raw.trim().toLowerCase();
    if (!status) return false;
    // "Chưa hoàn thành" ("NOT yet completed") contains the substring
    // "hoàn thành", so a naive `.includes('hoàn thành')` check would wrongly
    // classify it as completed. Explicit negative/pending markers must be
    // excluded first.
    if (status.startsWith('chưa') || status === '-' || status === 'không áp dụng') {
      return false;
    }
    return status.includes('hoàn thành') || status.includes('đã làm') || status.includes('đã xong');
  };

  if (typeof task === 'string') {
    return checkStatusText(task);
  }

  if (checkStatusText(task.trangThai || '')) {
    return true;
  }
  if (task.ngayHoanThanh && task.ngayHoanThanh.trim() !== '') {
    return true;
  }
  return false;
}

/**
 * Checks if a task has a valid product/proof document attached (sanPham or minhChung).
 */
export function hasValidProduct(task: TaskBC): boolean {
  if (!task) return false;
  const sp = (task.sanPham || '').trim();
  const mc = (task.minhChung || '').trim();
  
  const invalidValues = [
    '', '-', '--', '---', 
    'chưa có', 'chưa báo cáo', 'chưa có sản phẩm', 'chưa thực hiện', 
    'chưa có sp', 'n/a', 'na', 'không', 'chưa'
  ];

  const isSpValid = sp !== '' && !invalidValues.includes(sp.toLowerCase());
  const isMcValid = mc !== '' && !invalidValues.includes(mc.toLowerCase());

  return isSpValid || isMcValid;
}

/**
 * Automatically computes status ('Hoàn thành đúng hạn' | 'Hoàn thành trễ hạn' | 'Chưa hoàn thành' | 'Không áp dụng')
 * based on completion selection, completed date (ngayHoanThanh), and deadline (ngayHetHan).
 */
export function computeAutoStatus(
  choice: 'chua_hoan_thanh' | 'hoan_thanh' | 'khong_ap_dung' | string,
  ngayHoanThanh?: string,
  ngayHetHan?: string
): string {
  if (choice === 'khong_ap_dung' || choice === 'Không áp dụng') {
    return 'Không áp dụng';
  }
  if (choice === 'chua_hoan_thanh' || choice === 'Chưa hoàn thành' || choice === '' || choice === '-') {
    return '-';
  }
  if (choice === 'hoan_thanh' || choice === 'Hoàn thành' || choice === 'Hoàn thành đúng hạn' || choice === 'Hoàn thành trễ hạn') {
    if (!ngayHoanThanh || !ngayHetHan) {
      return 'Hoàn thành';
    }
    const tsH = parseToTimestamp(ngayHetHan);
    const tsC = parseToTimestamp(ngayHoanThanh);
    if (tsH > 0 && tsC > 0) {
      const dH = new Date(tsH);
      dH.setHours(0, 0, 0, 0);
      const dC = new Date(tsC);
      dC.setHours(0, 0, 0, 0);
      const diffMs = dC.getTime() - dH.getTime();
      const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));
      if (diffDays > 0) {
        return `Hoàn thành trễ hạn ${diffDays} ngày`;
      }
    }
    return 'Hoàn thành';
  }
  return '';
}

export interface TaskStatusInfo {
  statusText: string;       // "Hoàn thành", "Hoàn thành trễ hạn X ngày", "-"
  statusType: 'hoan_thanh' | 'hoan_thanh_tre' | 'chua_hoan_thanh';
  isCompleted: boolean;
  isLate: boolean;
  daysLate: number;
  scoreMultiplier: number;
  key: string;
  label: string;
  bgClass: string;
  colorClass: string;
}

const BACKUP_EXPORT_STORAGE_KEY = 'ca-xa-last-backup-export-ts';

/**
 * Records "now" as the last time the user exported an Excel backup.
 * Used to power a periodic reminder banner, since all app data lives only
 * in this browser's localStorage (no server/cloud sync).
 */
export function recordBackupExport(): void {
  try {
    localStorage.setItem(BACKUP_EXPORT_STORAGE_KEY, String(Date.now()));
  } catch {
    // localStorage unavailable (e.g. private browsing) - safe to ignore.
  }
}

/**
 * Returns the number of whole days since the last recorded backup export,
 * or null if a backup has never been recorded on this device/browser.
 */
export function getDaysSinceLastBackup(): number | null {
  try {
    const raw = localStorage.getItem(BACKUP_EXPORT_STORAGE_KEY);
    if (!raw) return null;
    const ts = parseInt(raw, 10);
    if (!ts || isNaN(ts)) return null;
    return Math.floor((Date.now() - ts) / (1000 * 60 * 60 * 24));
  } catch {
    return null;
  }
}

/**
 * Returns a correct number of points earned for a task, based on its real
 * completion status (on-time = 100%, late = 50%, not completed/N-A = 0%).
 *
 * IMPORTANT: Always use this helper (or getTaskStatusInfo().scoreMultiplier)
 * instead of comparing `task.trangThai` against a fixed string like
 * 'Hoàn thành trễ hạn'. The real stored value includes a day count suffix
 * (e.g. "Hoàn thành trễ hạn 3 ngày"), so exact-equality checks silently fail
 * and undercount scores for late-completed tasks.
 */
export function getEarnedPoints(task: TaskBC, referenceDateISO?: string): number {
  if (!task) return 0;
  const info = getTaskStatusInfo(task, referenceDateISO);
  return (task.diemGiao || 0) * info.scoreMultiplier;
}

export function getTaskStatusInfo(task: TaskBC, referenceDateISO?: string): TaskStatusInfo {
  if (!task) {
    return {
      statusText: '-',
      statusType: 'chua_hoan_thanh',
      isCompleted: false,
      isLate: false,
      daysLate: 0,
      scoreMultiplier: 0,
      key: 'chua_hoan_thanh',
      label: 'Chưa hoàn thành',
      bgClass: 'bg-slate-100',
      colorClass: 'text-slate-600'
    };
  }

  const rawStatus = (task.trangThai || '').trim();
  if (rawStatus === 'Không áp dụng') {
    return {
      statusText: 'Không áp dụng',
      statusType: 'chua_hoan_thanh',
      isCompleted: false,
      isLate: false,
      daysLate: 0,
      scoreMultiplier: 0,
      key: 'khong_ap_dung',
      label: 'Không áp dụng',
      bgClass: 'bg-slate-100',
      colorClass: 'text-slate-500'
    };
  }

  const isDone = isTaskCompleted(task);

  if (isDone) {
    const deadlineIso = getTaskDeadlineISO(task);
    const completionDateIso = extractISODate(task.ngayHoanThanh) || getTodayDateString();

    if (deadlineIso && completionDateIso) {
      const tsDeadline = parseToTimestamp(deadlineIso);
      const tsComplete = parseToTimestamp(completionDateIso);

      if (tsDeadline > 0 && tsComplete > 0) {
        const dDeadline = new Date(tsDeadline);
        dDeadline.setHours(0, 0, 0, 0);
        const dComplete = new Date(tsComplete);
        dComplete.setHours(0, 0, 0, 0);

        const diffMs = dComplete.getTime() - dDeadline.getTime();
        const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));

        if (diffDays > 0) {
          return {
            statusText: `Hoàn thành trễ hạn ${diffDays} ngày`,
            statusType: 'hoan_thanh_tre',
            isCompleted: true,
            isLate: true,
            daysLate: diffDays,
            scoreMultiplier: 0.5,
            key: 'hoan_thanh_tre',
            label: `Hoàn thành trễ (${diffDays} ngày)`,
            bgClass: 'bg-amber-50',
            colorClass: 'text-amber-700'
          };
        }
      }
    }

    if (rawStatus.toLowerCase().includes('trễ')) {
      const match = rawStatus.match(/trễ\s+(?:hạn\s+)?([0-9]+)\s*ngày/i);
      const extractedDays = match ? parseInt(match[1], 10) : 1;
      return {
        statusText: `Hoàn thành trễ hạn ${extractedDays} ngày`,
        statusType: 'hoan_thanh_tre',
        isCompleted: true,
        isLate: true,
        daysLate: extractedDays,
        scoreMultiplier: 0.5,
        key: 'hoan_thanh_tre',
        label: `Hoàn thành trễ (${extractedDays} ngày)`,
        bgClass: 'bg-amber-50',
        colorClass: 'text-amber-700'
      };
    }

    return {
      statusText: 'Hoàn thành đúng hạn',
      statusType: 'hoan_thanh',
      isCompleted: true,
      isLate: false,
      daysLate: 0,
      scoreMultiplier: 1.0,
      key: 'hoan_thanh',
      label: 'Hoàn thành đúng hạn',
      bgClass: 'bg-emerald-50',
      colorClass: 'text-emerald-700'
    };
  }

  // Task is not completed
  const deadlineIso = getTaskDeadlineISO(task);
  const diffDays = daysUntil(deadlineIso, referenceDateISO);

  if (diffDays !== null) {
    if (diffDays < 0) {
      return {
        statusText: `Quá hạn ${Math.abs(diffDays)} ngày`,
        statusType: 'chua_hoan_thanh',
        isCompleted: false,
        isLate: true,
        daysLate: Math.abs(diffDays),
        scoreMultiplier: 0,
        key: 'qua_han',
        label: `Quá hạn ${Math.abs(diffDays)} ngày`,
        bgClass: 'bg-red-50',
        colorClass: 'text-red-700'
      };
    }
    if (diffDays === 0) {
      return {
        statusText: 'Đến hạn hôm nay',
        statusType: 'chua_hoan_thanh',
        isCompleted: false,
        isLate: false,
        daysLate: 0,
        scoreMultiplier: 0,
        key: 'hom_nay',
        label: 'Đến hạn hôm nay',
        bgClass: 'bg-amber-50',
        colorClass: 'text-amber-800'
      };
    }
    if (diffDays <= 3) {
      return {
        statusText: `Sắp đến hạn (${diffDays} ngày)`,
        statusType: 'chua_hoan_thanh',
        isCompleted: false,
        isLate: false,
        daysLate: 0,
        scoreMultiplier: 0,
        key: 'sap_den_han',
        label: `Sắp đến hạn (${diffDays} ngày)`,
        bgClass: 'bg-amber-50',
        colorClass: 'text-amber-700'
      };
    }
  }

  return {
    statusText: 'Chưa hoàn thành',
    statusType: 'chua_hoan_thanh',
    isCompleted: false,
    isLate: false,
    daysLate: 0,
    scoreMultiplier: 0,
    key: 'chua_hoan_thanh',
    label: 'Chưa hoàn thành',
    bgClass: 'bg-slate-100',
    colorClass: 'text-slate-600'
  };
}
