/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  Calendar as CalendarIcon,
  Plus,
  X,
  Eye,
  Clock,
  CheckCircle,
  HelpCircle,
  AlertCircle,
  Save,
  Search
} from 'lucide-react';
import { AppState, TaskBC, TaskMilestone } from '../types';
import {
  formatDonViBanHanhDisplay,
  POLICE_DEPARTMENTS,
  suggestDocumentSymbol,
  parseDocumentNumber,
  parseDocumentSymbolTwoWay,
  tryExpandShorthand,
  formatToDDMMYY,
  formatToDDMM,
  parseQuickDate,
  isDateMatchingDeadline,
  standardizeToYYYYMMDD
} from '../utils/documentHelper';
import MilestoneManager from './MilestoneManager';
import DeptCombobox from './DeptCombobox';
import { compileCanCu, isRecurringText, computeAutoStatus, getTaskStatusInfo, cleanInlineText, formatParagraphText } from '../utils/cancu';

const getDayMonthOfDate = (dateStr: string) => {
  if (!dateStr) return '';
  const parts = dateStr.split('-');
  if (parts.length === 3) {
    return `${parts[2]}/${parts[1]}`;
  }
  return '';
};

const getDayOfDate = (dateStr: string) => {
  if (!dateStr) return '';
  const parts = dateStr.split('-');
  if (parts.length === 3) {
    return parts[2];
  }
  return '';
};

const formatDateVN = (dateStr: string) => {
  if (!dateStr) return '';
  const parts = dateStr.split('-');
  if (parts.length === 3) {
    return `${parts[2]}/${parts[1]}/${parts[0]}`;
  }
  return dateStr;
};

const compileThoiHanString = (kieu: string, date: string, hour: string, manual: string) => {
  if (kieu === 'custom' || kieu === 'custom_c') return manual;
  if (!date) return '';
  const timeStr = hour ? ` ${hour}` : '';
  const dateVN = formatDateVN(date);
  const dayOnly = getDayOfDate(date);
  const dayMonth = getDayMonthOfDate(date);

  if (kieu === 'truoc_ngay') {
    return `Trước${timeStr} ngày ${dateVN}`;
  }
  if (kieu === 'truoc_ngay_hang_thang') {
    return `Trước${timeStr} ngày ${dayOnly} hằng tháng`;
  }
  if (kieu === 'hang_nam') {
    return `Hằng năm trước${timeStr} ngày ${dayMonth}`;
  }
  return `Hạn chót: ${dateVN}${timeStr}`;
};

const getTodayDateString = () => {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
};

const daysUntil = (dateStr: string): number | null => {
  if (!dateStr) return null;
  const deadline = new Date(dateStr + 'T00:00:00');
  const today = new Date(getTodayDateString() + 'T00:00:00');

  // Calculate difference in days
  const diffTime = deadline.getTime() - today.getTime();
  const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));
  return diffDays;
};

const COMMON_DOC_TYPES = [
  'Công văn',
  'Báo cáo',
  'Kế hoạch',
  'Nghị quyết',
  'Quyết định',
  'Chỉ thị',
  'Quy chế',
  'Quy định',
  'Thông báo',
  'Chương trình',
  'Phương án',
  'Đề án',
  'Kết luận',
  'Khác'
];

interface CalendarViewProps {
  state: AppState;
  updateTaskBC: (section: 'B' | 'C', idx: number, fieldOrFields: keyof TaskBC | Partial<TaskBC>, value?: any) => void;
}

export default function CalendarView({ state, updateTaskBC }: CalendarViewProps) {
  const today = new Date();
  const [currentYear, setCurrentYear] = useState(today.getFullYear());
  const [currentMonth, setCurrentMonth] = useState(today.getMonth()); // 0-indexed
  const [searchQuery, setSearchQuery] = useState('');

  const [selectedTask, setSelectedTask] = useState<{
    section: 'B' | 'C';
    originalIndex: number;
    task: TaskBC;
  } | null>(null);

  const [quickAssignTask, setQuickAssignTask] = useState<{
    section: 'B' | 'C';
    originalIndex: number;
    task: TaskBC;
  } | null>(null);

  // Edit Form States
  const [loaiVanBan, setLoaiVanBan] = useState('Kế hoạch');
  const [so, setSo] = useState('');
  const [soNumberOnly, setSoNumberOnly] = useState('');
  const [soSymbolOnly, setSoSymbolOnly] = useState('');
  const [isFromCAT, setIsFromCAT] = useState(false);
  const [selectedDeptCode, setSelectedDeptCode] = useState('');
  const [ngay, setNgay] = useState('');
  const [quickDate, setQuickDate] = useState('');
  const [donViBanHanh, setDonViBanHanh] = useState('');
  const [trichYeu, setTrichYeu] = useState('');
  const [noiDung, setNoiDung] = useState('');
  const [thoiHan, setThoiHan] = useState('');
  const [diemGiao, setDiemGiao] = useState<number>(0.5);
  const [donVi, setDonVi] = useState('');
  const [sanPham, setSanPham] = useState('');
  const [ngayHetHan, setNgayHetHan] = useState('');
  const [quickDateHetHan, setQuickDateHetHan] = useState('');
  const [ngayHoanThanh, setNgayHoanThanh] = useState('');
  const [quickDateHoanThanh, setQuickDateHoanThanh] = useState('');
  const [trangThai, setTrangThai] = useState<string>('');
  const [gioHetHan, setGioHetHan] = useState('00:00');
  const [kieuThoiHan, setKieuThoiHan] = useState('truoc_ngay');
  const [donViTheoDoi, setDonViTheoDoi] = useState('');
  const [ghiChu, setGhiChu] = useState('');
  const [danhSachMoc, setDanhSachMoc] = useState<TaskMilestone[]>([]);
  const [isExpanded, setIsExpanded] = useState(false);

  const applyTwoWayParsedResult = (
    detectedLoaiVanBan: string | undefined,
    detectedIsFromCAT: boolean,
    detectedDeptCode: string | undefined
  ) => {
    if (detectedLoaiVanBan) {
      setLoaiVanBan(detectedLoaiVanBan);
    }
    setIsFromCAT(detectedIsFromCAT);
    setSelectedDeptCode(detectedDeptCode || '');

    if (detectedDeptCode) {
      const deptObj = POLICE_DEPARTMENTS.find(d => d.code === detectedDeptCode);
      if (deptObj) {
        if (detectedIsFromCAT) {
          setDonViBanHanh('CAT');
          setDonViTheoDoi(deptObj.name);
        } else {
          setDonViBanHanh(deptObj.code);
          setDonViTheoDoi(deptObj.name);
        }
      }
    } else {
      if (detectedIsFromCAT) {
        setDonViBanHanh('CAT');
      }
    }
  };

  const handleSoNumberChange = (num: string) => {
    const match = num.match(/[a-zA-Z/]/);
    if (match && match.index !== undefined) {
      const index = match.index;
      const numPart = num.substring(0, index).trim();
      const rawSymPart = num.substring(index).replace(/^\//, '');

      const expanded = tryExpandShorthand(rawSymPart);
      if (expanded) {
        setSoNumberOnly(numPart);
        setSoSymbolOnly(expanded.expandedSymbol);
        setSo(`${numPart}${expanded.expandedSymbol}`);
        applyTwoWayParsedResult(expanded.docType, expanded.isFromCAT, expanded.departmentCode);
      } else {
        const symPart = '/' + rawSymPart;
        setSoNumberOnly(numPart);
        setSoSymbolOnly(symPart);
        setSo(`${numPart}${symPart}`);
        const parsed = parseDocumentSymbolTwoWay(symPart);
        applyTwoWayParsedResult(parsed.detectedLoaiVanBan, parsed.detectedIsFromCAT, parsed.detectedDeptCode);
      }

      setTimeout(() => {
        const symbolInput = document.getElementById('cal-edit-task-so-symbol') as HTMLInputElement | null;
        if (symbolInput) {
          symbolInput.focus();
          symbolInput.setSelectionRange(symbolInput.value.length, symbolInput.value.length);
        }
      }, 50);
    } else {
      setSoNumberOnly(num);
      const symPart = soSymbolOnly ? (soSymbolOnly.startsWith('/') ? soSymbolOnly : `/${soSymbolOnly}`) : '';
      setSo(num ? `${num}${symPart}` : symPart);
    }
  };

  const handleSymbolKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace') {
      const displayVal = soSymbolOnly.startsWith('/') ? soSymbolOnly.substring(1) : soSymbolOnly;
      if (displayVal === '') {
        e.preventDefault();
        const numInput = document.getElementById('cal-edit-task-so-number') as HTMLInputElement | null;
        if (numInput) {
          numInput.focus();
          const newVal = soNumberOnly.slice(0, -1);
          handleSoNumberChange(newVal);
        }
      }
    }
  };

  const handleSoSymbolManualChange = (sym: string) => {
    let cleanSym = sym.startsWith('/') ? sym.substring(1) : sym;
    cleanSym = cleanSym.trim();

    if (!cleanSym) {
      setSoSymbolOnly('');
      setSo(soNumberOnly);
      applyTwoWayParsedResult(loaiVanBan, isFromCAT, '');
      return;
    }

    const expanded = tryExpandShorthand(cleanSym);

    if (expanded) {
      setSoSymbolOnly(expanded.expandedSymbol);
      setSo(soNumberOnly ? `${soNumberOnly}${expanded.expandedSymbol}` : expanded.expandedSymbol);
      applyTwoWayParsedResult(expanded.docType, expanded.isFromCAT, expanded.departmentCode);
    } else {
      const symWithSlash = sym.startsWith('/') ? sym : `/${sym}`;
      setSoSymbolOnly(symWithSlash);
      setSo(soNumberOnly ? `${soNumberOnly}${symWithSlash}` : symWithSlash);

      const parsed = parseDocumentSymbolTwoWay(symWithSlash);
      applyTwoWayParsedResult(parsed.detectedLoaiVanBan, parsed.detectedIsFromCAT, parsed.detectedDeptCode);
    }
  };

  const handleDocTypeChange = (newType: string) => {
    setLoaiVanBan(newType);
    const newSymbol = suggestDocumentSymbol(newType, selectedDeptCode, isFromCAT);
    setSoSymbolOnly(newSymbol);
    setSo(soNumberOnly ? `${soNumberOnly}${newSymbol}` : newSymbol);
  };

  const handleDeptCodeChange = (newCode: string) => {
    setSelectedDeptCode(newCode);
    if (newCode === 'KHAC') {
      setDonViBanHanh('');
    } else if (!newCode) {
      if (!isFromCAT) setDonViBanHanh('');
      setDonViTheoDoi('');
    } else {
      const deptObj = POLICE_DEPARTMENTS.find(d => d.code === newCode);
      if (deptObj) {
        if (isFromCAT) {
          setDonViBanHanh('CAT');
          setDonViTheoDoi(deptObj.name);
        } else {
          setDonViBanHanh(deptObj.code);
          setDonViTheoDoi(deptObj.name);
        }
      }
    }

    const newSymbol = suggestDocumentSymbol(loaiVanBan, newCode, isFromCAT);
    setSoSymbolOnly(newSymbol);
    setSo(soNumberOnly ? `${soNumberOnly}${newSymbol}` : newSymbol);
  };

  const handleCATToggle = (checked: boolean) => {
    setIsFromCAT(checked);
    const deptObj = POLICE_DEPARTMENTS.find(d => d.code === selectedDeptCode);
    if (checked) {
      setDonViBanHanh('CAT');
      if (deptObj) {
        setDonViTheoDoi(deptObj.name);
      }
    } else {
      if (deptObj) {
        setDonViBanHanh(deptObj.code);
        setDonViTheoDoi(deptObj.name);
      } else if (selectedDeptCode === 'KHAC' || !selectedDeptCode) {
        setDonViBanHanh('');
      }
    }

    const newSymbol = suggestDocumentSymbol(loaiVanBan, selectedDeptCode, checked);
    setSoSymbolOnly(newSymbol);
    setSo(soNumberOnly ? `${soNumberOnly}${newSymbol}` : newSymbol);
  };

  const handleOpenEdit = (section: 'B' | 'C', idx: number, t: TaskBC) => {
    setSelectedTask({ section, originalIndex: idx, task: t });
    setLoaiVanBan(t.loaiVanBan || 'Kế hoạch');
    setSo(t.so || '');

    const parsed = parseDocumentNumber(t.so || '');
    setSoNumberOnly(parsed.numberOnly);
    setSoSymbolOnly(parsed.symbolOnly);
    setIsFromCAT(parsed.isFromCAT);
    setSelectedDeptCode(parsed.departmentCode || parsed.customSuffix || '');

    setNgay(t.ngay || '');
    setQuickDate(formatToDDMMYY(t.ngay || ''));
    setDonViBanHanh(t.donViBanHanh || '');
    setTrichYeu(t.trichYeu || '');
    setNoiDung(t.noiDung || '');
    setThoiHan(t.thoiHan || '');
    setDiemGiao(t.diemGiao || 0.5);
    setDonVi(t.donVi || '');
    setSanPham(t.sanPham || '');
    setNgayHetHan(t.ngayHetHan || '');
    setQuickDateHetHan(formatToDDMMYY(t.ngayHetHan || ''));

    const openEditIsCompleted = getTaskStatusInfo(t).isCompleted || t.trangThai === 'Đã hoàn thành';
    if (openEditIsCompleted) {
      setTrangThai('Đã hoàn thành');
    } else {
      setTrangThai(t.trangThai || '');
    }

    const initialNgayHoanThanh = t.ngayHoanThanh || (openEditIsCompleted ? getTodayDateString() : '');
    setNgayHoanThanh(initialNgayHoanThanh);
    setQuickDateHoanThanh(formatToDDMMYY(initialNgayHoanThanh));

    setGioHetHan(t.gioHetHan || '00:00');
    setKieuThoiHan(t.kieuThoiHan || 'truoc_ngay');
    setDonViTheoDoi(t.donViTheoDoi || t.donViBanHanh || '');
    setGhiChu(t.ghiChu || '');
    setDanhSachMoc((t.danhSachMoc && t.danhSachMoc.length > 0) ? t.danhSachMoc : [
      {
        id: `moc_1_${Date.now()}`,
        tenMoc: 'Mốc 1',
        kieuThoiHan: t.kieuThoiHan || 'truoc_ngay',
        ngayHetHan: t.ngayHetHan || getTodayDateString(),
        trangThai: t.trangThai || 'Chưa hoàn thành'
      }
    ]);
    setIsExpanded(false);
  };

  const handleSave = () => {
    if (!selectedTask) return;

    const finalNgayHetHan = ngayHetHan || getTodayDateString();
    const finalThoiHan = (kieuThoiHan === 'custom' || kieuThoiHan === 'custom_c')
      ? thoiHan
      : compileThoiHanString(kieuThoiHan, finalNgayHetHan, gioHetHan, thoiHan);

    let finalKieuThoiHan = kieuThoiHan;
    if (kieuThoiHan === 'custom') {
      const isRecur = isRecurringText(thoiHan);
      finalKieuThoiHan = isRecur ? 'custom_c' : 'custom';
    }

    const computedSymbol = soSymbolOnly ? (soSymbolOnly.startsWith('/') ? soSymbolOnly : `/${soSymbolOnly}`) : '';
    const fallbackSo = soNumberOnly
      ? `${soNumberOnly}${computedSymbol}`
      : computedSymbol;
    const finalSo = so.trim() || fallbackSo;

    const finalNgay = ngay || getTodayDateString();

    let finalNgayHoanThanh = '';
    let finalTrangThai = trangThai;

    if (trangThai === 'Đã hoàn thành' || trangThai === 'Hoàn thành đúng hạn' || trangThai === 'Hoàn thành trễ hạn') {
      finalNgayHoanThanh = ngayHoanThanh || getTodayDateString();
      finalTrangThai = computeAutoStatus('hoan_thanh', finalNgayHoanThanh, finalNgayHetHan);
    } else if (trangThai === 'Chưa hoàn thành') {
      finalTrangThai = 'Chưa hoàn thành';
      finalNgayHoanThanh = '';
    } else if (trangThai === 'Không áp dụng') {
      finalTrangThai = 'Không áp dụng';
      finalNgayHoanThanh = '';
    } else {
      finalTrangThai = '';
      finalNgayHoanThanh = '';
    }

    const updatedFields: Partial<TaskBC> = {
      loaiVanBan,
      so: finalSo,
      ngay: finalNgay,
      donViBanHanh,
      trichYeu: cleanInlineText(trichYeu),
      noiDung: cleanInlineText(noiDung),
      thoiHan: finalThoiHan,
      diemGiao,
      donVi,
      sanPham,
      ngayHetHan: finalNgayHetHan,
      ngayHoanThanh: finalNgayHoanThanh,
      trangThai: finalTrangThai,
      gioHetHan,
      kieuThoiHan: finalKieuThoiHan,
      donViTheoDoi,
      ghiChu,
      danhSachMoc
    };

    updateTaskBC(selectedTask.section, selectedTask.originalIndex, updatedFields);
    setSelectedTask(null);
  };

  const [currentDay, setCurrentDay] = useState(today.getDate());
  const [showMonthPicker, setShowMonthPicker] = useState(false);
  const [filterSection, setFilterSection] = useState<'B' | 'C' | 'all'>('all');
  const [filterUnit, setFilterUnit] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterFromDate, setFilterFromDate] = useState<string>('');
  const [filterToDate, setFilterToDate] = useState<string>('');
  const [viewMode, setViewMode] = useState<'month' | 'week' | 'day' | 'agenda'>('month');
  const [calendarDateMode, setCalendarDateMode] = useState<'deadline' | 'issue'>('deadline');
  const [showStats, setShowStats] = useState<boolean>(false);
  const [showRightSidebar, setShowRightSidebar] = useState<boolean>(false);
  const [showFilters, setShowFilters] = useState<boolean>(false);

  const months = [
    'Tháng 1', 'Tháng 2', 'Tháng 3', 'Tháng 4',
    'Tháng 5', 'Tháng 6', 'Tháng 7', 'Tháng 8',
    'Tháng 9', 'Tháng 10', 'Tháng 11', 'Tháng 12'
  ];

  const daysOfWeek = ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'];

  // Calendar Math
  const getDaysInMonth = (year: number, month: number) => {
    return new Date(year, month + 1, 0).getDate();
  };

  const getFirstDayOfMonth = (year: number, month: number) => {
    // 0 = Sunday, 1 = Monday, etc.
    let day = new Date(year, month, 1).getDay();
    // Convert to Monday start: 0 = Monday, 1 = Tuesday ... 6 = Sunday
    return day === 0 ? 6 : day - 1;
  };

  const daysInMonth = getDaysInMonth(currentYear, currentMonth);
  const firstDayIndex = getFirstDayOfMonth(currentYear, currentMonth);

  // Week View Math
  const getDaysOfActiveWeek = () => {
    const current = new Date(currentYear, currentMonth, currentDay);
    const dayOfWeek = current.getDay(); // 0 = Sunday, 1 = Monday, etc.
    const distanceToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;

    const weekDays: Array<{ date: Date; dayNum: number; monthNum: number; yearNum: number; dateString: string; label: string }> = [];

    for (let i = 0; i < 7; i++) {
      const d = new Date(currentYear, currentMonth, currentDay + distanceToMonday + i);
      const yyyy = d.getFullYear();
      const mm = String(d.getMonth() + 1).padStart(2, '0');
      const dd = String(d.getDate()).padStart(2, '0');
      const dateString = `${yyyy}-${mm}-${dd}`;

      const labels = ['Chủ Nhật', 'Thứ Hai', 'Thứ Ba', 'Thứ Tư', 'Thứ Năm', 'Thứ Sáu', 'Thứ Bảy'];
      weekDays.push({
        date: d,
        dayNum: d.getDate(),
        monthNum: d.getMonth(),
        yearNum: d.getFullYear(),
        dateString,
        label: labels[d.getDay()]
      });
    }
    return weekDays;
  };

  const getWeekRangeStr = () => {
    const weekDays = getDaysOfActiveWeek();
    const start = weekDays[0];
    const end = weekDays[6];
    return `${start.dayNum}/${start.monthNum + 1} - ${end.dayNum}/${end.monthNum + 1}`;
  };

  // Navigate dates according to active view mode
  const prevDate = () => {
    if (viewMode === 'month' || viewMode === 'agenda') {
      prevMonth();
    } else if (viewMode === 'week') {
      const d = new Date(currentYear, currentMonth, currentDay);
      d.setDate(d.getDate() - 7);
      setCurrentYear(d.getFullYear());
      setCurrentMonth(d.getMonth());
      setCurrentDay(d.getDate());
    } else if (viewMode === 'day') {
      const d = new Date(currentYear, currentMonth, currentDay);
      d.setDate(d.getDate() - 1);
      setCurrentYear(d.getFullYear());
      setCurrentMonth(d.getMonth());
      setCurrentDay(d.getDate());
    }
  };

  const nextDate = () => {
    if (viewMode === 'month' || viewMode === 'agenda') {
      nextMonth();
    } else if (viewMode === 'week') {
      const d = new Date(currentYear, currentMonth, currentDay);
      d.setDate(d.getDate() + 7);
      setCurrentYear(d.getFullYear());
      setCurrentMonth(d.getMonth());
      setCurrentDay(d.getDate());
    } else if (viewMode === 'day') {
      const d = new Date(currentYear, currentMonth, currentDay);
      d.setDate(d.getDate() + 1);
      setCurrentYear(d.getFullYear());
      setCurrentMonth(d.getMonth());
      setCurrentDay(d.getDate());
    }
  };

  // Navigate months
  const prevMonth = () => {
    if (currentMonth === 0) {
      setCurrentMonth(11);
      setCurrentYear(prev => prev - 1);
    } else {
      setCurrentMonth(prev => prev - 1);
    }
  };

  const nextMonth = () => {
    if (currentMonth === 11) {
      setCurrentMonth(0);
      setCurrentYear(prev => prev + 1);
    } else {
      setCurrentMonth(prev => prev + 1);
    }
  };

  const resetToCurrent = () => {
    const today = new Date();
    setCurrentYear(today.getFullYear());
    setCurrentMonth(today.getMonth());
    setCurrentDay(today.getDate());
  };

  // Compile scheduled tasks for any given date
  const getTasksOnFullDate = (year: number, monthZeroIndexed: number, day: number) => {
    const dayStr = String(day).padStart(2, '0');
    const monthStr = String(monthZeroIndexed + 1).padStart(2, '0');
    const dateQuery = `${year}-${monthStr}-${dayStr}`;
    const todayStr = getTodayDateString();

    if (filterFromDate && dateQuery < filterFromDate) return [];
    if (filterToDate && dateQuery > filterToDate) return [];

    const matchTask = (t: TaskBC) => {
      if (calendarDateMode === 'issue') {
        if (!t.ngay) return false;
        return standardizeToYYYYMMDD(t.ngay) === dateQuery;
      }

      if (t.danhSachMoc && t.danhSachMoc.length > 0) {
        const hasMatchingMoc = t.danhSachMoc.some(m => {
          const mocKieu = m.kieuThoiHan || t.kieuThoiHan || 'truoc_ngay';
          return isDateMatchingDeadline(m.ngayHetHan, mocKieu, year, monthZeroIndexed, day);
        });
        if (hasMatchingMoc) return true;
      }

      if (!t.ngayHetHan) return false;
      const taskKieu = t.kieuThoiHan || 'truoc_ngay';
      return isDateMatchingDeadline(t.ngayHetHan, taskKieu, year, monthZeroIndexed, day);
    };

    const matchesStatus = (t: TaskBC) => {
      if (filterStatus === 'all') return true;
      if (filterStatus === 'completed') {
        return getTaskStatusInfo(t).isCompleted;
      }
      if (filterStatus === 'incomplete') {
        return t.trangThai === 'Chưa hoàn thành';
      }
      if (filterStatus === 'overdue') {
        const isPast = t.ngayHetHan && t.ngayHetHan < todayStr;
        return t.trangThai === 'Chưa hoàn thành' && isPast;
      }
      if (filterStatus === 'not_overdue_incomplete') {
        const isPast = t.ngayHetHan && t.ngayHetHan < todayStr;
        return t.trangThai === 'Chưa hoàn thành' && !isPast;
      }
      if (filterStatus === 'non_applicable') {
        return t.trangThai === 'Không áp dụng';
      }
      return true;
    };

    const scheduledB = state.B
      .map((t, idx) => ({ ...t, originalIndex: idx, section: 'B' as const }))
      .filter(matchTask);

    const scheduledC = state.C
      .map((t, idx) => ({ ...t, originalIndex: idx, section: 'C' as const }))
      .filter(matchTask);

    return [...scheduledB, ...scheduledC].filter(t => {
      const matchesSec = filterSection === 'all' || t.section === filterSection;
      const matchesUnit = !filterUnit || t.donVi === filterUnit;
      return matchesSec && matchesUnit && matchesStatus(t);
    }).map(t => {
      let isMatch = true;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchCanCu = t.canCu.toLowerCase().includes(q);
        const matchSo = (t.so || '').toLowerCase().includes(q);
        const matchTrichYeu = (t.trichYeu || '').toLowerCase().includes(q);
        const matchNoiDung = t.noiDung.toLowerCase().includes(q);
        const matchDonVi = t.donVi.toLowerCase().includes(q);
        const matchSanPham = t.sanPham.toLowerCase().includes(q);
        isMatch = matchCanCu || matchSo || matchTrichYeu || matchNoiDung || matchDonVi || matchSanPham;
      }
      return { ...t, isMatch };
    });
  };

  const getTasksOnDay = (day: number) => {
    return getTasksOnFullDate(currentYear, currentMonth, day);
  };

  // Compile unscheduled tasks (B and C with empty ngayHetHan)
  const getUnscheduledTasks = () => {
    const todayStr = getTodayDateString();

    const matchesStatus = (t: TaskBC) => {
      if (filterStatus === 'all') return true;
      // Unscheduled tasks don't have deadlines, so they can't be overdue
      if (filterStatus === 'overdue') return false;
      if (filterStatus === 'completed') {
        return getTaskStatusInfo(t).isCompleted;
      }
      if (filterStatus === 'incomplete' || filterStatus === 'not_overdue_incomplete') {
        return t.trangThai === 'Chưa hoàn thành';
      }
      if (filterStatus === 'non_applicable') {
        return t.trangThai === 'Không áp dụng';
      }
      return true;
    };

    const unscheduledB = state.B
      .map((t, idx) => ({ ...t, originalIndex: idx, section: 'B' as const }))
      .filter(t => !t.ngayHetHan);

    const unscheduledC = state.C
      .map((t, idx) => ({ ...t, originalIndex: idx, section: 'C' as const }))
      .filter(t => !t.ngayHetHan);

    return [...unscheduledB, ...unscheduledC].filter(t => {
      const matchesSec = filterSection === 'all' || t.section === filterSection;
      const matchesUnit = !filterUnit || t.donVi === filterUnit;
      return matchesSec && matchesUnit && matchesStatus(t);
    }).map(t => {
      let isMatch = true;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchCanCu = t.canCu.toLowerCase().includes(q);
        const matchSo = (t.so || '').toLowerCase().includes(q);
        const matchTrichYeu = (t.trichYeu || '').toLowerCase().includes(q);
        const matchNoiDung = t.noiDung.toLowerCase().includes(q);
        const matchDonVi = t.donVi.toLowerCase().includes(q);
        const matchSanPham = t.sanPham.toLowerCase().includes(q);
        isMatch = matchCanCu || matchSo || matchTrichYeu || matchNoiDung || matchDonVi || matchSanPham;
      }
      return { ...t, isMatch };
    });
  };

  const unscheduledList = getUnscheduledTasks();
  const allScheduledUnits = Array.from(new Set([...state.B, ...state.C].map(t => t.donVi).filter(Boolean))).sort();

  const getMonthScheduledTasks = () => {
    const monthTasks: Array<TaskBC & { originalIndex: number; section: 'B' | 'C'; day: number }> = [];
    for (let day = 1; day <= daysInMonth; day++) {
      const dayTasks = getTasksOnDay(day);
      dayTasks.forEach(t => {
        monthTasks.push({
          ...t,
          day
        });
      });
    }
    return monthTasks.sort((a, b) => a.day - b.day);
  };

  // Status colors inside Calendar Cell (Pastel Theme).
  // Takes the task (not just the raw trangThai string) because a
  // late-completed task stores trangThai as e.g. "Hoàn thành trễ hạn 5 ngày"
  // (day-count suffix) — an exact string switch would miss it and fall
  // through to the default gray style.
  const getStatusBg = (task: TaskBC) => {
    const info = getTaskStatusInfo(task);
    if (info.isCompleted && !info.isLate) return 'bg-emerald-50 text-emerald-700 border border-emerald-200/60';
    if (info.isCompleted && info.isLate) return 'bg-amber-50 text-amber-700 border border-amber-200/60';
    if (task.trangThai === 'Chưa hoàn thành') return 'bg-rose-50 text-rose-700 border border-rose-200/60';
    if (task.trangThai === 'Không áp dụng') return 'bg-slate-50 text-slate-500 border border-slate-200/60';
    return 'bg-slate-50 text-slate-600 border border-slate-200/60';
  };

  // Render Calendar Day Cells
  const renderCells = () => {
    const cells = [];
    const todayStr = getTodayDateString();
    const hasSearch = searchQuery.trim().length > 0;

    // Empty cells for padding before the 1st of month
    for (let i = 0; i < firstDayIndex; i++) {
      cells.push(
        <div key={`empty-${i}`} className="min-h-[125px] bg-slate-50/50 border border-slate-100 p-1.5" />
      );
    }

    // Days of the month
    for (let day = 1; day <= daysInMonth; day++) {
      const dayTasks = getTasksOnDay(day);
      const isToday =
        new Date().getDate() === day &&
        new Date().getMonth() === currentMonth &&
        new Date().getFullYear() === currentYear;

      const dayStr = String(day).padStart(2, '0');
      const monthStr = String(currentMonth + 1).padStart(2, '0');
      const dateString = `${currentYear}-${monthStr}-${dayStr}`;

      const dayOfWeek = new Date(currentYear, currentMonth, day).getDay();
      const isSaturday = dayOfWeek === 6;
      const isSunday = dayOfWeek === 0;

      cells.push(
        <div
          key={`day-${day}`}
          title="Nhấn vào ngày này để xem chi tiết theo Ngày"
          onClick={() => {
            if (quickAssignTask) {
              if (calendarDateMode === 'issue') {
                alert("Không thể gán nhanh ngày ban hành văn bản. Vui lòng chuyển sang chế độ xem 'Theo hạn văn bản' để xếp lịch.");
                return;
              }
              const updatedFields: Partial<TaskBC> = {
                ngayHetHan: dateString,
                thoiHan: quickAssignTask.task.thoiHan || `Hạn chót: ${formatDateVN(dateString)}`
              };
              updateTaskBC(quickAssignTask.section, quickAssignTask.originalIndex, updatedFields);
              setQuickAssignTask(null);
            } else {
              setCurrentDay(day);
              setViewMode('day');
            }
          }}
          onDragOver={(e) => {
            e.preventDefault();
            if (e.dataTransfer) {
              e.dataTransfer.dropEffect = 'move';
            }
          }}
          onDrop={(e) => {
            e.preventDefault();
            if (calendarDateMode === 'issue') {
              alert("Không thể kéo thả để đổi ngày ban hành văn bản. Vui lòng chuyển sang chế độ xem 'Theo hạn văn bản' để xếp lịch.");
              return;
            }
            try {
              const rawData = e.dataTransfer.getData('text/plain');
              if (!rawData) return;
              const { section, originalIndex } = JSON.parse(rawData);
              const t = section === 'B' ? state.B[originalIndex] : state.C[originalIndex];
              const finalThoiHan = t.kieuThoiHan === 'custom' || t.kieuThoiHan === 'custom_c'
                ? t.thoiHan
                : compileThoiHanString(t.kieuThoiHan || 'truoc_ngay', dateString, t.gioHetHan || '00:00', t.thoiHan || '');

              updateTaskBC(section, originalIndex, {
                ngayHetHan: dateString,
                thoiHan: finalThoiHan,
                trangThai: t.trangThai || 'Chưa hoàn thành'
              });
            } catch (err) {
              console.error("Drop failed:", err);
            }
          }}
          className={`min-h-[125px] border p-2 flex flex-col justify-between transition group/cell relative ${quickAssignTask
            ? 'hover:bg-amber-50/80 cursor-pointer border-dashed border-amber-400 bg-amber-50/10'
            : isToday
              ? 'bg-rose-50/5 border-slate-200 hover:bg-slate-50/60'
              : isSunday
                ? 'bg-rose-50/25 border-rose-100/70 hover:bg-rose-50/45'
                : isSaturday
                  ? 'bg-sky-50/15 border-sky-100/50 hover:bg-sky-50/35'
                  : 'bg-white border-slate-200 hover:bg-slate-50/60'
            } ${isToday ? 'ring-2 ring-[#a3212e] ring-inset' : ''
            }`}
        >
          {/* Day number header */}
          <div className="flex items-center justify-between pointer-events-none">
            <span className={`text-xs font-mono font-bold ${isToday
              ? 'bg-[#a3212e] text-white w-5 h-5 rounded-full flex items-center justify-center font-bold'
              : isSunday
                ? 'text-rose-600 font-extrabold'
                : isSaturday
                  ? 'text-sky-600 font-extrabold'
                  : 'text-slate-700'
              }`}>
              {day}
            </span>
            {dayTasks.length > 0 && (
              <span className="text-[9px] bg-slate-100 text-slate-500 font-bold px-1.5 py-0.25 rounded">
                {dayTasks.length} việc
              </span>
            )}
          </div>

          {/* Quick Assign overlay text */}
          {quickAssignTask && (
            <div className="absolute inset-x-0 bottom-1 flex justify-center pointer-events-none animate-pulse">
              <span className="bg-amber-100 border border-amber-300 text-amber-800 text-[9px] font-bold px-1.5 py-0.5 rounded shadow-sm">
                Gán hạn {day}/{currentMonth + 1}
              </span>
            </div>
          )}

          {/* List of small task dots/labels */}
          {!quickAssignTask && (
            <div className="space-y-1 mt-1.5 flex-1 overflow-y-auto max-h-[85px] pr-0.5 custom-scrollbar">
              {dayTasks.map(t => {
                const statusInfo = getTaskStatusInfo(t);
                const isOverdue = t.ngayHetHan && t.ngayHetHan < todayStr && !statusInfo.isCompleted;
                const dLeft = t.ngayHetHan ? daysUntil(t.ngayHetHan) : null;
                const isDueSoon = t.ngayHetHan && !isOverdue && dLeft !== null && dLeft <= 5 && !statusInfo.isCompleted;

                const searchOpacity = hasSearch ? (t.isMatch ? 'opacity-100' : 'opacity-30 hover:opacity-90') : 'opacity-100';

                // Section-specific indicators
                const sectionLabel = t.section === 'B' ? 'Hạn' : 'ĐK';
                const sectionBadgeClass = t.section === 'B'
                  ? 'bg-indigo-600 text-white'
                  : 'bg-purple-600 text-white';

                // Left border visual differentiator for Section B vs C
                const borderLeftClass = t.section === 'B'
                  ? 'border-l-[3px] border-l-indigo-500'
                  : 'border-l-[3px] border-l-purple-500';

                // Status theme (uses getTaskStatusInfo so a late-completed task,
                // e.g. trangThai === "Hoàn thành trễ hạn 5 ngày", is still
                // recognized instead of falling through to the default gray style)
                let statusBg = 'bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200';
                if (statusInfo.isCompleted && !statusInfo.isLate) {
                  statusBg = 'bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200';
                } else if (statusInfo.isCompleted && statusInfo.isLate) {
                  statusBg = 'bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200';
                } else if (t.trangThai === 'Chưa hoàn thành') {
                  statusBg = 'bg-rose-50 hover:bg-rose-100 text-rose-800 border border-rose-200';
                } else if (t.trangThai === 'Không áp dụng') {
                  statusBg = 'bg-slate-50 hover:bg-slate-100 text-slate-500 border border-slate-200';
                }

                return (
                  <button
                    key={`${t.section}-${t.id}`}
                    title={`${t.id}: ${t.noiDung}`}
                    onClick={(e) => {
                      e.stopPropagation();
                      handleOpenEdit(t.section, t.originalIndex, t);
                    }}
                    className={`w-full text-left text-[9.5px] px-1.5 py-1 rounded transition duration-150 active:scale-[0.99] flex flex-col gap-0.5 cursor-pointer outline-none shadow-3xs ${borderLeftClass} ${statusBg} ${searchOpacity}`}
                  >
                    <div className="flex items-center justify-between w-full">
                      <div className="flex items-center gap-1">
                        <span className={`${sectionBadgeClass} text-[7px] font-mono font-black px-1 rounded-xs scale-90`}>
                          {sectionLabel}
                        </span>
                        <span className="font-mono text-[8px] font-bold opacity-60">#{t.id}</span>
                      </div>

                      {/* Overdue/Due soon tag indicators */}
                      {isOverdue && (
                        <span className="bg-red-600 text-white text-[7px] px-1 rounded font-black uppercase tracking-wider scale-90">
                          🚨 TRỄ
                        </span>
                      )}
                      {isDueSoon && (
                        <span className="bg-amber-500 text-white text-[7px] px-1 rounded font-black uppercase tracking-wider scale-90">
                          ⏳ SẮP HẠN
                        </span>
                      )}
                    </div>
                    {(() => {
                      const matchedMoc = t.danhSachMoc?.find(m => {
                        const mocKieu = m.kieuThoiHan || t.kieuThoiHan || 'truoc_ngay';
                        return isDateMatchingDeadline(m.ngayHetHan, mocKieu, currentYear, currentMonth, day);
                      });
                      if (matchedMoc) {
                        return (
                          <span className="bg-sky-100 text-sky-800 text-[8px] font-bold px-1 py-0.5 rounded truncate block my-0.5">
                            📌 Mốc: {matchedMoc.tenMoc}
                          </span>
                        );
                      }
                      return null;
                    })()}
                    <span className="truncate font-bold leading-tight text-slate-800">{t.noiDung}</span>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      );
    }

    return cells;
  };

  // Compile monthly stats for the selected month
  const getMonthStats = () => {
    let total = 0;
    let completed = 0;
    let incomplete = 0;
    let nonApplicable = 0;

    for (let day = 1; day <= daysInMonth; day++) {
      const dayTasks = getTasksOnDay(day);
      total += dayTasks.length;
      dayTasks.forEach(t => {
        if (getTaskStatusInfo(t).isCompleted) {
          completed++;
        } else if (t.trangThai === 'Chưa hoàn thành') {
          incomplete++;
        } else if (t.trangThai === 'Không áp dụng') {
          nonApplicable++;
        }
      });
    }

    return { total, completed, incomplete, nonApplicable };
  };

  const stats = getMonthStats();

  return (
    <div className="space-y-4">
      {/* Header - Optimized for spacious workspace */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-slate-150 pb-3">
        <div className="flex items-baseline gap-2">
          <h2 className="font-display text-lg font-bold text-[#0f2444] tracking-wide uppercase">
            LỊCH NHIỆM VỤ
          </h2>
          <span className="text-[11px] text-slate-400 font-medium hidden md:inline">| Theo dõi thời hạn trực quan</span>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {/* Search Box */}
          <div className="relative flex-1 min-w-[220px]">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Tìm kiếm nhiệm vụ..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:bg-white focus:border-[#a3212e] focus:outline-none transition"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </div>

          {/* Collapse/Expand Filters */}
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`px-3 py-1.5 rounded-xl text-[11px] font-bold transition flex items-center gap-1.5 outline-none cursor-pointer border ${showFilters
              ? 'bg-amber-50 border-amber-300 text-amber-700 hover:bg-amber-100'
              : 'bg-white border-slate-200 hover:border-[#a3212e] hover:text-[#a3212e] text-[#0f2444]'
              }`}
          >
            <span>{showFilters ? '🙈 Ẩn Bộ lọc & Chú thích' : '🔍 Hiện Bộ lọc & Chú thích'}</span>
          </button>

          {/* Collapse/Expand stats button */}
          <button
            onClick={() => setShowStats(!showStats)}
            className={`px-3 py-1.5 rounded-xl text-[11px] font-bold transition flex items-center gap-1.5 outline-none cursor-pointer border ${showStats
              ? 'bg-emerald-50 border-emerald-300 text-emerald-700 hover:bg-emerald-100'
              : 'bg-white border-slate-200 hover:border-[#a3212e] hover:text-[#a3212e] text-[#0f2444]'
              }`}
          >
            <span className="relative flex h-2 w-2">
              <span className={`animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 ${showStats ? 'hidden' : ''}`}></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
            {showStats ? 'Thu gọn Thống kê' : 'Xem Thống kê Tháng'}
          </button>

          <button
            onClick={resetToCurrent}
            className="bg-white border border-slate-200 hover:border-[#a3212e] hover:text-[#a3212e] text-[#0f2444] px-3 py-1.5 rounded-xl text-[11px] font-bold transition flex items-center gap-1.5 outline-none cursor-pointer shadow-2xs"
          >
            <CalendarIcon className="w-3.5 h-3.5" /> Tháng này
          </button>
        </div>
      </div>

      {/* Monthly Statistics Card - Collapsible and spacious */}
      {showStats && (
        <div className="bg-gradient-to-r from-slate-50 to-slate-100/50 border border-slate-200 rounded-2xl p-5 shadow-sm grid grid-cols-2 md:grid-cols-4 gap-4 animate-fade-in">
          <div className="bg-white border border-slate-150 rounded-xl p-3.5 shadow-2xs">
            <span className="text-[10px] text-slate-400 font-extrabold uppercase tracking-wider block">Tổng việc tháng này</span>
            <span className="text-xl font-mono font-bold text-[#0f2444] mt-1 block">{stats.total} nhiệm vụ</span>
          </div>
          <div className="bg-emerald-50/50 border border-emerald-100 rounded-xl p-3.5 shadow-2xs">
            <span className="text-[10px] text-emerald-600 font-extrabold uppercase tracking-wider block">Đã hoàn thành</span>
            <span className="text-xl font-mono font-bold text-emerald-700 mt-1 block">{stats.completed} nhiệm vụ</span>
          </div>
          <div className="bg-rose-50/50 border border-rose-100 rounded-xl p-3.5 shadow-2xs">
            <span className="text-[10px] text-rose-600 font-extrabold uppercase tracking-wider block">Chưa HT / Trễ</span>
            <span className="text-xl font-mono font-bold text-rose-700 mt-1 block">{stats.incomplete} nhiệm vụ</span>
          </div>
          <div className="bg-amber-50/50 border border-amber-100 rounded-xl p-3.5 shadow-2xs">
            <span className="text-[10px] text-amber-600 font-extrabold uppercase tracking-wider block">Nhiệm vụ chưa xếp lịch</span>
            <span className="text-xl font-mono font-bold text-amber-700 mt-1 block">{unscheduledList.length} nhiệm vụ</span>
          </div>
        </div>
      )}

      {/* Quick Assign Banner Indicator */}
      {quickAssignTask && (
        <div className="bg-amber-50 border border-amber-200 text-amber-800 rounded-2xl p-4 flex items-center justify-between animate-fade-in shadow-sm">
          <div className="flex items-center gap-3">
            <span className="relative flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-amber-500"></span>
            </span>
            <span className="text-xs font-semibold">
              Đang ở chế độ <strong>Gán hạn nhanh</strong> cho nhiệm vụ <strong className="font-mono bg-amber-100 px-1.5 py-0.5 rounded text-[#0f2444]">{quickAssignTask.task.id}</strong>: <i>"{quickAssignTask.task.noiDung.substring(0, 100)}..."</i>.
              <br />
              <span className="text-amber-700 font-medium">👉 Hãy nhấn vào bất kỳ ô ngày nào trên bảng lịch dưới đây để gán nhanh thời hạn.</span>
            </span>
          </div>
          <button
            onClick={() => setQuickAssignTask(null)}
            className="bg-white border border-amber-200 hover:bg-amber-100 text-amber-800 px-3 py-1.5 rounded-lg text-[11px] font-bold transition outline-none cursor-pointer shadow-xs"
          >
            Hủy gán lịch
          </button>
        </div>
      )}

      {/* Main Grid: Calendar left, unscheduled sidebar right */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Calendar Left */}
        <div className={`${showRightSidebar ? 'lg:col-span-9' : 'lg:col-span-12'} bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-4 transition-all duration-300`}>
          {/* Calendar Header with Navigation */}
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-3">
            <div className="flex flex-wrap items-center gap-2 font-display font-bold text-base text-[#0f2444]">
              <CalendarIcon className="w-5 h-5 text-[#a3212e] shrink-0" />

              {/* Prev/Next now sit right beside what they control (Tháng/Năm), instead of being separated across the header */}
              <div className="flex items-center gap-0.5 bg-slate-50 border border-slate-200 p-0.5 rounded-xl">
                <button
                  onClick={prevDate}
                  className="p-1 hover:bg-white hover:shadow-sm rounded-lg text-slate-600 transition cursor-pointer outline-none"
                  title="Trở lại"
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                </button>

                {/* Month/Year quick picker */}
                <div className="relative">
                  <button
                    onClick={() => setShowMonthPicker(v => !v)}
                    className="flex items-center gap-1 hover:bg-white hover:shadow-sm text-[#0f2444] font-extrabold text-sm rounded-lg px-2 py-1 outline-none cursor-pointer transition"
                    title="Chọn nhanh Tháng/Năm"
                  >
                    <span>{months[currentMonth]}, {currentYear}</span>
                    <ChevronDown className={`w-3.5 h-3.5 text-slate-400 transition-transform ${showMonthPicker ? 'rotate-180' : ''}`} />
                  </button>

                  {showMonthPicker && (
                    <>
                      {/* Click-outside backdrop */}
                      <div className="fixed inset-0 z-40" onClick={() => setShowMonthPicker(false)} />

                      <div className="absolute top-full left-0 mt-1.5 z-50 bg-white border border-slate-200 rounded-2xl shadow-lg p-3 w-60 animate-fade-in">
                        {/* Year stepper */}
                        <div className="flex items-center justify-between mb-2.5">
                          <button
                            onClick={() => setCurrentYear(y => y - 1)}
                            className="p-1 hover:bg-slate-100 rounded-lg text-slate-500 cursor-pointer transition"
                            title="Năm trước"
                          >
                            <ChevronLeft className="w-3.5 h-3.5" />
                          </button>
                          <span className="text-xs font-extrabold text-[#0f2444] tracking-wide">Năm {currentYear}</span>
                          <button
                            onClick={() => setCurrentYear(y => y + 1)}
                            className="p-1 hover:bg-slate-100 rounded-lg text-slate-500 cursor-pointer transition"
                            title="Năm sau"
                          >
                            <ChevronRight className="w-3.5 h-3.5" />
                          </button>
                        </div>

                        {/* Month grid */}
                        <div className="grid grid-cols-3 gap-1.5">
                          {months.map((mName, mIdx) => {
                            const isSelected = mIdx === currentMonth;
                            const isRealToday = mIdx === today.getMonth() && currentYear === today.getFullYear();
                            return (
                              <button
                                key={mIdx}
                                onClick={() => { setCurrentMonth(mIdx); setShowMonthPicker(false); }}
                                className={`relative px-1.5 py-1.5 rounded-lg text-[11px] font-bold transition cursor-pointer outline-none ${isSelected
                                  ? 'bg-[#a3212e] text-white shadow-xs'
                                  : 'text-slate-600 hover:bg-slate-100'
                                  }`}
                                title={isRealToday ? `${mName} — tháng hiện tại` : mName}
                              >
                                {mName.replace('Tháng ', 'Th ')}
                                {isRealToday && !isSelected && (
                                  <span className="absolute top-1 right-1 w-1 h-1 rounded-full bg-emerald-500" />
                                )}
                              </button>
                            );
                          })}
                        </div>

                        <button
                          onClick={() => { setCurrentYear(today.getFullYear()); setCurrentMonth(today.getMonth()); setShowMonthPicker(false); }}
                          className="mt-2.5 w-full text-center text-[10px] font-bold text-emerald-700 hover:bg-emerald-50 rounded-lg py-1.5 cursor-pointer transition"
                        >
                          📍 Về tháng hiện tại
                        </button>
                      </div>
                    </>
                  )}
                </div>

                <button
                  onClick={nextDate}
                  className="p-1 hover:bg-white hover:shadow-sm rounded-lg text-slate-600 transition cursor-pointer outline-none"
                  title="Tiếp theo"
                >
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Today Button */}
              <button
                onClick={resetToCurrent}
                className="bg-emerald-50 hover:bg-emerald-100 border border-emerald-300 text-emerald-800 text-[11px] font-bold px-2.5 py-1 rounded-xl transition cursor-pointer shrink-0 ml-1 shadow-2xs flex items-center gap-1"
                title="Quay về ngày/tháng hiện tại"
              >
                <span>📍 Hôm nay</span>
              </button>
            </div>

            {/* View Mode & Nav Controls */}
            <div className="flex flex-wrap items-center gap-3">
              {/* Expand Calendar Workspace / Toggle Sidebar Button */}
              <button
                onClick={() => setShowRightSidebar(!showRightSidebar)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[10px] font-bold transition border cursor-pointer outline-none shadow-xs ${showRightSidebar
                  ? 'bg-white border-slate-200 hover:border-[#a3212e] text-slate-700 hover:text-[#a3212e]'
                  : 'bg-indigo-50 border-indigo-300 text-indigo-700 hover:bg-indigo-100'
                  }`}
                title={showRightSidebar ? "Mở rộng lịch (Ẩn cột chưa xếp lịch)" : "Hiện cột việc chưa xếp lịch"}
              >
                <span>{showRightSidebar ? "📂 Thu gọn việc" : "📂 Hiện việc chưa xếp"}</span>
              </button>

              {/* View Toggle */}
              <div className="flex items-center gap-0.5 bg-slate-100 p-0.5 rounded-xl border border-slate-200/50">
                <button
                  onClick={() => setViewMode('month')}
                  className={`px-2.5 py-1.5 rounded-lg text-[10px] font-bold transition cursor-pointer outline-none ${viewMode === 'month'
                    ? 'bg-white text-[#0f2444] shadow-xs'
                    : 'text-slate-500 hover:text-slate-700'
                    }`}
                >
                  Tháng
                </button>
                <button
                  onClick={() => setViewMode('week')}
                  className={`px-2.5 py-1.5 rounded-lg text-[10px] font-bold transition cursor-pointer outline-none ${viewMode === 'week'
                    ? 'bg-white text-[#0f2444] shadow-xs'
                    : 'text-slate-500 hover:text-slate-700'
                    }`}
                >
                  Tuần
                </button>
                <button
                  onClick={() => setViewMode('day')}
                  className={`px-2.5 py-1.5 rounded-lg text-[10px] font-bold transition cursor-pointer outline-none ${viewMode === 'day'
                    ? 'bg-white text-[#0f2444] shadow-xs'
                    : 'text-slate-500 hover:text-slate-700'
                    }`}
                >
                  Ngày
                </button>
                <button
                  onClick={() => setViewMode('agenda')}
                  className={`px-2.5 py-1.5 rounded-lg text-[10px] font-bold transition cursor-pointer outline-none ${viewMode === 'agenda'
                    ? 'bg-white text-[#0f2444] shadow-xs'
                    : 'text-slate-500 hover:text-slate-700'
                    }`}
                >
                  Danh sách
                </button>
              </div>

              {/* Day Mode Indicator Badge */}
              {viewMode === 'day' && (
                <div className="flex items-center gap-1.5 bg-rose-50 border border-rose-200 text-[#a3212e] px-2.5 py-1 rounded-xl text-[10px] font-bold animate-fade-in shadow-2xs">
                  <span>Chi tiết ngày {currentDay}/{currentMonth + 1}/{currentYear}</span>
                </div>
              )}

              {/* Calendar Date Mode Toggle (Hạn văn bản vs Ngày ban hành) */}
              <div className="flex items-center gap-0.5 bg-slate-100 p-0.5 rounded-xl border border-slate-200/50">
                <button
                  onClick={() => setCalendarDateMode('deadline')}
                  className={`px-3 py-1.5 rounded-lg text-[10px] font-bold transition cursor-pointer outline-none ${calendarDateMode === 'deadline'
                    ? 'bg-white text-[#a3212e] shadow-xs font-semibold'
                    : 'text-slate-500 hover:text-slate-700'
                    }`}
                  title="Hiển thị nhiệm vụ lên ô lịch dựa theo ngày hết hạn (hạn văn bản)"
                >
                  ⏳ Theo hạn
                </button>
                <button
                  onClick={() => setCalendarDateMode('issue')}
                  className={`px-3 py-1.5 rounded-lg text-[10px] font-bold transition cursor-pointer outline-none ${calendarDateMode === 'issue'
                    ? 'bg-white text-[#a3212e] shadow-xs font-semibold'
                    : 'text-slate-500 hover:text-slate-700'
                    }`}
                  title="Hiển thị nhiệm vụ lên ô lịch dựa theo ngày ban hành văn bản"
                >
                  📅 Theo ngày BH
                </button>
              </div>

            </div>
          </div>

          {/* Collapsible Filter Bar & Legend */}
          {showFilters && (
            <div className="bg-slate-50 border border-slate-200 p-4 rounded-xl space-y-3 animate-fade-in">
              <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-slate-150">
                <span className="text-[10px] font-bold text-[#0f2444] tracking-wider uppercase">
                  ⚙️ Bộ lọc hiển thị & Chú thích trạng thái
                </span>

                {/* Status Legend rendered here cleanly */}
                <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1 text-[9.5px] text-slate-500 font-semibold bg-white px-2.5 py-1 rounded-lg border border-slate-200">
                  <span className="flex items-center gap-1">
                    <span className="w-2 h-2 rounded bg-emerald-500"></span>
                    Đúng hạn
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="w-2 h-2 rounded bg-amber-500"></span>
                    Trễ hạn
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="w-2 h-2 rounded bg-rose-500"></span>
                    Chưa HT
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="w-2 h-2 rounded bg-slate-400"></span>
                    Khác
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] text-slate-400 uppercase tracking-wider font-bold whitespace-nowrap">Mục:</span>
                  <select
                    className="w-full bg-white border border-slate-200 text-slate-600 px-2 py-1.5 rounded-lg text-xs font-bold outline-none cursor-pointer shadow-xs focus:ring-1 focus:ring-[#a3212e]"
                    value={filterSection}
                    onChange={(e: any) => setFilterSection(e.target.value)}
                  >
                    <option value="all">Tất cả mục (B & C)</option>
                    <option value="B">Mục II (Thời hạn)</option>
                    <option value="C">Mục III (Định kỳ)</option>
                  </select>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-[10px] text-slate-400 uppercase tracking-wider font-bold whitespace-nowrap">Đơn vị:</span>
                  <select
                    className="w-full bg-white border border-slate-200 text-slate-600 px-2 py-1.5 rounded-lg text-xs font-bold outline-none cursor-pointer shadow-xs focus:ring-1 focus:ring-[#a3212e]"
                    value={filterUnit}
                    onChange={(e) => setFilterUnit(e.target.value)}
                  >
                    <option value="">Tất cả đơn vị</option>
                    {allScheduledUnits.map(u => (
                      <option key={u} value={u}>{u}</option>
                    ))}
                  </select>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-[10px] text-slate-400 uppercase tracking-wider font-bold whitespace-nowrap">Trạng thái:</span>
                  <select
                    className="w-full bg-white border border-slate-200 text-slate-600 px-2 py-1.5 rounded-lg text-xs font-bold outline-none cursor-pointer shadow-xs focus:ring-1 focus:ring-[#a3212e]"
                    value={filterStatus}
                    onChange={(e) => setFilterStatus(e.target.value)}
                  >
                    <option value="all">Tất cả trạng thái</option>
                    <option value="completed">Đã hoàn thành</option>
                    <option value="incomplete">Chưa hoàn thành</option>
                    <option value="overdue">⚠️ Quá hạn (Chưa xong)</option>
                    <option value="not_overdue_incomplete">Trong hạn (Chưa xong)</option>
                    <option value="non_applicable">Không áp dụng</option>
                  </select>
                </div>
              </div>

              {/* Khoảng thời gian lọc (Từ ngày - Đến ngày) */}
              <div className="pt-2 border-t border-slate-200/80 flex flex-wrap items-center justify-between gap-3">
                <div className="flex flex-wrap items-center gap-3">
                  <span className="text-[10px] text-slate-500 uppercase tracking-wider font-bold flex items-center gap-1">
                    📅 Lọc thời gian:
                  </span>
                  <div className="flex items-center gap-1.5">
                    <span className="text-[10px] text-slate-400 font-bold">Từ:</span>
                    <input
                      type="date"
                      value={filterFromDate}
                      onChange={(e) => setFilterFromDate(e.target.value)}
                      className="bg-white border border-slate-200 text-slate-700 px-2 py-1 rounded-lg text-xs font-semibold outline-none focus:border-[#a3212e] focus:ring-1 focus:ring-[#a3212e]"
                    />
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-[10px] text-slate-400 font-bold">Đến:</span>
                    <input
                      type="date"
                      value={filterToDate}
                      onChange={(e) => setFilterToDate(e.target.value)}
                      className="bg-white border border-slate-200 text-slate-700 px-2 py-1 rounded-lg text-xs font-semibold outline-none focus:border-[#a3212e] focus:ring-1 focus:ring-[#a3212e]"
                    />
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {/* Quick Preset Buttons */}
                  <button
                    type="button"
                    onClick={() => {
                      const mStr = String(currentMonth + 1).padStart(2, '0');
                      const lastDay = getDaysInMonth(currentYear, currentMonth);
                      setFilterFromDate(`${currentYear}-${mStr}-01`);
                      setFilterToDate(`${currentYear}-${mStr}-${String(lastDay).padStart(2, '0')}`);
                    }}
                    className="text-[10px] font-bold text-slate-600 hover:text-[#a3212e] bg-white border border-slate-200 hover:border-[#a3212e] px-2 py-1 rounded-lg transition cursor-pointer"
                  >
                    Tháng này
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const mStr = String(currentMonth + 1).padStart(2, '0');
                      setFilterFromDate(`${currentYear}-${mStr}-15`);
                      // Next month 14
                      let nextM = currentMonth + 1;
                      let nextY = currentYear;
                      if (nextM > 11) { nextM = 0; nextY += 1; }
                      const nextMStr = String(nextM + 1).padStart(2, '0');
                      setFilterToDate(`${nextY}-${nextMStr}-14`);
                    }}
                    className="text-[10px] font-bold text-slate-600 hover:text-[#a3212e] bg-white border border-slate-200 hover:border-[#a3212e] px-2 py-1 rounded-lg transition cursor-pointer"
                  >
                    Chu kỳ (15-14)
                  </button>
                  {(filterFromDate || filterToDate) && (
                    <button
                      type="button"
                      onClick={() => {
                        setFilterFromDate('');
                        setFilterToDate('');
                      }}
                      className="text-[10px] font-bold text-rose-600 hover:bg-rose-50 border border-rose-200 px-2 py-1 rounded-lg transition cursor-pointer flex items-center gap-1"
                    >
                      <X className="w-3 h-3" /> Xóa lọc ngày
                    </button>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Conditional View Rendering */}
          {viewMode === 'month' && (
            <div className="grid grid-cols-7 gap-1">
              {/* Weekdays */}
              {daysOfWeek.map(day => {
                const isSat = day === 'T7';
                const isSun = day === 'CN';
                return (
                  <div
                    key={day}
                    className={`text-center font-display font-bold text-xs py-1.5 border border-slate-100 rounded ${isSun ? 'text-rose-600 bg-rose-50/40 border-rose-100/50' :
                      isSat ? 'text-sky-600 bg-sky-50/20 border-sky-100/40' :
                        'text-slate-400 bg-slate-50'
                      }`}
                  >
                    {day}
                  </div>
                );
              })}

              {/* Days cells */}
              {renderCells()}
            </div>
          )}

          {viewMode === 'week' && (
            <div className="grid grid-cols-1 md:grid-cols-7 gap-3 min-h-[500px]">
              {getDaysOfActiveWeek().map(dayObj => {
                const dayTasks = getTasksOnFullDate(dayObj.yearNum, dayObj.monthNum, dayObj.dayNum);
                const isToday =
                  new Date().getDate() === dayObj.dayNum &&
                  new Date().getMonth() === dayObj.monthNum &&
                  new Date().getFullYear() === dayObj.yearNum;

                const isSun = dayObj.date.getDay() === 0;
                const isSat = dayObj.date.getDay() === 6;

                return (
                  <div
                    key={dayObj.dateString}
                    title="Nhấn vào ngày này để xem chi tiết theo Ngày"
                    onClick={() => {
                      if (quickAssignTask) {
                        if (calendarDateMode === 'issue') {
                          alert("Không thể gán nhanh ngày ban hành văn bản. Vui lòng chuyển sang chế độ xem 'Theo hạn văn bản' để xếp lịch.");
                          return;
                        }
                        const updatedFields: Partial<TaskBC> = {
                          ngayHetHan: dayObj.dateString,
                          thoiHan: quickAssignTask.task.thoiHan || `Hạn chót: ${formatDateVN(dayObj.dateString)}`
                        };
                        updateTaskBC(quickAssignTask.section, quickAssignTask.originalIndex, updatedFields);
                        setQuickAssignTask(null);
                      } else {
                        setCurrentYear(dayObj.yearNum);
                        setCurrentMonth(dayObj.monthNum);
                        setCurrentDay(dayObj.dayNum);
                        setViewMode('day');
                      }
                    }}
                    onDragOver={(e) => {
                      e.preventDefault();
                      if (e.dataTransfer) {
                        e.dataTransfer.dropEffect = 'move';
                      }
                    }}
                    onDrop={(e) => {
                      e.preventDefault();
                      if (calendarDateMode === 'issue') {
                        alert("Không thể kéo thả để đổi ngày ban hành văn bản. Vui lòng chuyển sang chế độ xem 'Theo hạn văn bản' để xếp lịch.");
                        return;
                      }
                      try {
                        const rawData = e.dataTransfer.getData('text/plain');
                        if (!rawData) return;
                        const { section, originalIndex } = JSON.parse(rawData);
                        const updatedFields: Partial<TaskBC> = {
                          ngayHetHan: dayObj.dateString,
                          thoiHan: `Hạn chót: ${formatDateVN(dayObj.dateString)}`
                        };
                        updateTaskBC(section, originalIndex, updatedFields);
                      } catch (err) {
                        console.error(err);
                      }
                    }}
                    className={`flex flex-col rounded-xl border p-2.5 transition duration-200 min-h-[400px] cursor-pointer ${isToday
                      ? 'bg-rose-50/20 border-[#a3212e] ring-1 ring-[#a3212e]'
                      : isSun
                        ? 'bg-rose-50/10 border-rose-100 hover:bg-rose-50/20'
                        : isSat
                          ? 'bg-sky-50/10 border-sky-100 hover:bg-sky-50/20'
                          : 'bg-slate-50/40 border-slate-200 hover:bg-slate-50'
                      }`}
                  >
                    {/* Header */}
                    <div className="border-b border-slate-100 pb-1.5 mb-2 flex items-center justify-between">
                      <div className="flex flex-col">
                        <span className={`text-[10px] font-bold ${isSun ? 'text-rose-600' : isSat ? 'text-sky-600' : 'text-slate-500'
                          }`}>
                          {dayObj.label}
                        </span>
                        <span className="text-xs font-black text-slate-800">
                          {dayObj.dayNum}/{dayObj.monthNum + 1}
                        </span>
                      </div>
                      <span className="bg-slate-100 text-slate-600 text-[9px] font-mono font-bold px-1.5 py-0.5 rounded-full">
                        {dayTasks.length} việc
                      </span>
                    </div>

                    {/* Task Stack */}
                    <div className="flex-1 space-y-2 overflow-y-auto max-h-[450px] pr-0.5 custom-scrollbar">
                      {dayTasks.length === 0 ? (
                        <div className="h-full flex items-center justify-center py-10 text-slate-300 font-bold text-[9px] text-center border border-dashed border-slate-150 rounded-lg">
                          Thả việc vào đây
                        </div>
                      ) : (
                        dayTasks.map(task => (
                          <div
                            key={`${task.section}-${task.id}`}
                            onClick={(e) => {
                              e.stopPropagation();
                              handleOpenEdit(task.section, task.originalIndex, task);
                            }}
                            className="bg-white border border-slate-150 hover:border-[#a3212e] rounded-lg p-2 shadow-2xs hover:shadow-xs transition duration-150 space-y-1 text-left"
                          >
                            <div className="flex items-center justify-between gap-1">
                              <span className="bg-[#0f2444] text-white text-[8px] font-mono font-bold px-1 rounded">
                                {task.id}
                              </span>
                              {task.donVi && (
                                <span className="bg-slate-100 text-slate-600 text-[8px] font-bold px-1 max-w-[70px] truncate" title={task.donVi}>
                                  {task.donVi}
                                </span>
                              )}
                            </div>
                            <p className="text-[10px] font-bold text-slate-700 line-clamp-3 leading-snug" title={task.noiDung}>
                              {task.noiDung}
                            </p>
                            <div className="flex items-center justify-between gap-1 pt-1 border-t border-slate-50">
                              <span className={`w-2 h-2 rounded-full ${getTaskStatusInfo(task).isCompleted && !getTaskStatusInfo(task).isLate ? 'bg-emerald-500' :
                                getTaskStatusInfo(task).isCompleted && getTaskStatusInfo(task).isLate ? 'bg-amber-500' :
                                  task.trangThai === 'Không áp dụng' ? 'bg-slate-400' : 'bg-rose-500'
                                }`} title={task.trangThai || 'Chưa hoàn thành'} />
                              <span className="text-[8px] font-bold text-[#0f2444]">Sửa</span>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {viewMode === 'day' && (
            <div
              onDragOver={(e) => {
                e.preventDefault();
                if (e.dataTransfer) {
                  e.dataTransfer.dropEffect = 'move';
                }
              }}
              onDrop={(e) => {
                e.preventDefault();
                if (calendarDateMode === 'issue') {
                  alert("Không thể kéo thả để đổi ngày ban hành văn bản. Vui lòng chuyển sang chế độ xem 'Theo hạn văn bản' để xếp lịch.");
                  return;
                }
                try {
                  const rawData = e.dataTransfer.getData('text/plain');
                  if (!rawData) return;
                  const { section, originalIndex } = JSON.parse(rawData);
                  const dateString = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(currentDay).padStart(2, '0')}`;
                  const updatedFields: Partial<TaskBC> = {
                    ngayHetHan: dateString,
                    thoiHan: `Hạn chót: ${formatDateVN(dateString)}`
                  };
                  updateTaskBC(section, originalIndex, updatedFields);
                } catch (err) {
                  console.error(err);
                }
              }}
              className="space-y-4 min-h-[500px] border border-dashed border-slate-200 bg-slate-50/20 p-4 rounded-2xl"
            >
              {(() => {
                const dayTasks = getTasksOnFullDate(currentYear, currentMonth, currentDay);
                const isToday =
                  new Date().getDate() === currentDay &&
                  new Date().getMonth() === currentMonth &&
                  new Date().getFullYear() === currentYear;

                return (
                  <div className="space-y-4 text-left">
                    {/* Date banner */}
                    <div className="bg-gradient-to-r from-[#0f2444] to-[#1a3861] text-white px-5 py-4 rounded-xl shadow-xs flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="font-display font-black text-sm uppercase tracking-wide">
                            {new Date(currentYear, currentMonth, currentDay).toLocaleDateString('vi-VN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                          </h4>
                          {isToday && (
                            <span className="bg-rose-600 text-white text-[9px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider animate-pulse">
                              Hôm nay
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-slate-300 mt-1 font-semibold">
                          {dayTasks.length} văn bản / nhiệm vụ đã được xếp lịch cho ngày này
                        </p>
                      </div>

                      <div className="text-[10px] bg-white/10 px-3 py-1.5 rounded-lg border border-white/10">
                        {calendarDateMode === 'deadline' ? '⏳ Chế độ hiển thị: Theo hạn văn bản' : '📅 Chế độ hiển thị: Theo ngày ban hành'}
                      </div>
                    </div>

                    {dayTasks.length === 0 ? (
                      <div className="text-center py-20 bg-white rounded-xl border border-dashed border-slate-200">
                        <CalendarIcon className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                        <p className="text-xs font-semibold text-slate-500">Chưa có nhiệm vụ nào được lên lịch cho ngày này.</p>
                        <p className="text-[10px] text-slate-400 mt-1 max-w-sm mx-auto leading-relaxed">
                          Kéo thả các việc từ cột danh sách bên phải trực tiếp vào vùng này để xếp lịch cho ngày này.
                        </p>
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 gap-3">
                        {dayTasks.map(task => (
                          <div
                            key={`${task.section}-${task.id}`}
                            className="bg-white hover:bg-slate-50/50 border border-slate-200 rounded-xl p-4 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 transition duration-150"
                          >
                            <div className="space-y-2 flex-1">
                              <div className="flex flex-wrap items-center gap-1.5">
                                <span className="bg-[#0f2444] text-white text-[9px] font-mono font-bold px-1.5 py-0.5 rounded">
                                  {task.id}
                                </span>
                                <span className="bg-indigo-50 text-indigo-700 text-[9px] font-bold px-1.5 py-0.5 rounded border border-indigo-100">
                                  Mục {task.section}
                                </span>
                                {task.donVi && (
                                  <span className="bg-slate-100 text-slate-700 text-[9px] font-bold px-1.5 py-0.5 rounded border border-slate-200">
                                    {task.donVi}
                                  </span>
                                )}
                                {task.loaiVanBan && (
                                  <span className="bg-amber-50 text-amber-800 text-[9px] font-bold px-1.5 py-0.5 rounded border border-amber-200/50">
                                    {task.loaiVanBan} {task.so ? `số ${task.so}` : ''}
                                  </span>
                                )}
                                {task.trangThai && (
                                  <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${getStatusBg(task)}`}>
                                    {task.trangThai}
                                  </span>
                                )}
                              </div>

                              <p className="text-xs font-bold text-slate-800 leading-relaxed">
                                {task.noiDung}
                              </p>

                              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-1 text-[10px] text-slate-500">
                                {task.ngay && (
                                  <p>
                                    <strong className="text-slate-400">Ngày ban hành:</strong> {formatDateVN(task.ngay)}
                                  </p>
                                )}
                                {task.thoiHan && (
                                  <p className="flex items-center gap-1">
                                    <strong className="text-slate-400">Thời hạn yêu cầu:</strong>
                                    <span className="text-rose-700 font-semibold">{task.thoiHan}</span>
                                  </p>
                                )}
                                {task.sanPham && (
                                  <p className="col-span-1 md:col-span-2">
                                    <strong className="text-slate-400">Yêu cầu sản phẩm:</strong> {task.sanPham}
                                  </p>
                                )}
                                {task.ghiChu && (
                                  <p className="col-span-1 md:col-span-2 italic text-slate-400">
                                    <strong className="text-slate-400">Ghi chú:</strong> {task.ghiChu}
                                  </p>
                                )}
                              </div>
                            </div>

                            <div className="flex md:flex-col items-center md:items-end justify-between w-full md:w-auto border-t md:border-t-0 pt-3 md:pt-0 border-slate-100 gap-3">
                              <span className="text-[10px] font-mono text-slate-500 bg-slate-50 px-2 py-1 rounded border border-slate-200">
                                Điểm giao: <strong className="text-slate-700 font-bold">{task.diemGiao}</strong>
                              </span>

                              <button
                                onClick={() => handleOpenEdit(task.section, task.originalIndex, task)}
                                className="bg-[#0f2444] hover:bg-[#15315c] text-white font-bold text-[10px] px-3.5 py-1.5 rounded-lg transition shadow-2xs outline-none cursor-pointer whitespace-nowrap"
                              >
                                Xem & Sửa
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })()}
            </div>
          )}

          {viewMode === 'agenda' && (
            <div className="space-y-4 max-h-[680px] overflow-y-auto pr-1 custom-scrollbar">
              {(() => {
                const agendaTasks = getMonthScheduledTasks();
                if (agendaTasks.length === 0) {
                  return (
                    <div className="text-center py-16 text-slate-400 bg-slate-50 rounded-2xl border border-dashed border-slate-200/85">
                      <CalendarIcon className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                      <p className="text-xs font-semibold text-slate-500">Không tìm thấy nhiệm vụ nào khớp bộ lọc trong tháng này.</p>
                      <p className="text-[10px] text-slate-400 mt-1">Sử dụng bộ lọc ở trên hoặc kéo thả nhiệm vụ từ cột bên phải vào để xếp lịch.</p>
                    </div>
                  );
                }

                // Group by day to create clean headers
                const groupedByDay: { [dayNum: number]: typeof agendaTasks } = {};
                agendaTasks.forEach(item => {
                  if (!groupedByDay[item.day]) {
                    groupedByDay[item.day] = [];
                  }
                  groupedByDay[item.day].push(item);
                });

                // Get sorted day numbers
                const dayNumbers = Object.keys(groupedByDay).map(Number).sort((a, b) => a - b);

                return (
                  <div className="space-y-6">
                    {dayNumbers.map(dayNum => {
                      const dayStr = String(dayNum).padStart(2, '0');
                      const monthStr = String(currentMonth + 1).padStart(2, '0');
                      const dayOfWeek = new Date(currentYear, currentMonth, dayNum).getDay();
                      const isSat = dayOfWeek === 6;
                      const isSun = dayOfWeek === 0;

                      return (
                        <div key={dayNum} className="space-y-2 border-l-2 border-slate-200 pl-4 relative ml-2 text-left">
                          {/* Chronological Dot Indicator */}
                          <div className={`absolute -left-[7px] top-1.5 w-3 h-3 rounded-full border border-white ${isSun ? 'bg-rose-500' : isSat ? 'bg-sky-500' : 'bg-slate-400'
                            }`}></div>

                          <h4
                            onClick={() => {
                              setCurrentDay(dayNum);
                              setViewMode('day');
                            }}
                            title="Nhấn để xem chi tiết ngày này"
                            className="font-display font-bold text-xs text-slate-700 flex items-center gap-2 cursor-pointer hover:text-[#a3212e] transition"
                          >
                            <span>Ngày {dayNum} tháng {currentMonth + 1}, {currentYear}</span>
                            <span className={`text-[10px] px-1.5 py-0.25 rounded font-bold ${isSun ? 'bg-rose-50 text-rose-600' :
                              isSat ? 'bg-sky-50 text-sky-600' :
                                'bg-slate-100 text-slate-500'
                              }`}>
                              {dayOfWeek === 0 ? 'Chủ Nhật' : dayOfWeek === 6 ? 'Thứ Bảy' : `Thứ ${dayOfWeek + 1}`}
                            </span>
                          </h4>

                          <div className="space-y-2">
                            {groupedByDay[dayNum].map(task => (
                              <div
                                key={`${task.section}-${task.id}`}
                                className="bg-slate-50 hover:bg-[#0f2444]/5 border border-slate-200/60 rounded-xl p-3 flex flex-col md:flex-row md:items-center justify-between gap-4 transition duration-200"
                              >
                                <div className="space-y-1 flex-1">
                                  <div className="flex items-center flex-wrap gap-2">
                                    <span className="bg-[#0f2444] text-white text-[9px] font-mono font-bold px-1.5 py-0.5 rounded">
                                      {task.id}
                                    </span>
                                    {task.donVi && (
                                      <span className="bg-slate-200/80 text-slate-600 text-[9px] font-bold px-1.5 py-0.5 rounded">
                                        {task.donVi}
                                      </span>
                                    )}
                                    <span className="text-[9px] text-slate-450 font-semibold font-mono">Mục {task.section}</span>
                                    {task.trangThai && (
                                      <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${getStatusBg(task)}`}>
                                        {task.trangThai}
                                      </span>
                                    )}
                                  </div>
                                  <p className="text-xs font-bold text-slate-800 leading-relaxed">
                                    {task.noiDung}
                                  </p>
                                  {task.sanPham && (
                                    <p className="text-[10px] text-slate-500">
                                      <span className="font-bold text-slate-400">Sản phẩm:</span> {task.sanPham}
                                    </p>
                                  )}
                                  {task.thoiHan && (
                                    <p className="text-[10px] text-slate-500 flex items-center gap-1">
                                      <Clock className="w-3 h-3 text-[#a3212e]" />
                                      <span className="font-semibold text-slate-600">{task.thoiHan}</span>
                                    </p>
                                  )}
                                </div>

                                <div className="flex items-center gap-2 flex-none justify-end border-t md:border-t-0 pt-2 md:pt-0 border-slate-200/60">
                                  <span className="text-[11px] font-mono text-slate-400 bg-white border border-slate-150 px-2 py-1 rounded-lg">
                                    Điểm: <strong className="text-slate-700 font-bold">{task.diemGiao}</strong>
                                  </span>
                                  <button
                                    onClick={() => handleOpenEdit(task.section, task.originalIndex, task)}
                                    className="bg-[#0f2444] hover:bg-[#1a3861] text-white font-bold text-[10px] px-3 py-1.5 rounded-lg transition shadow-xs cursor-pointer outline-none"
                                  >
                                    Chi tiết & Sửa
                                  </button>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                );
              })()}
            </div>
          )}
        </div>

        {/* Right Sidebar - Collapsible with animation */}
        {showRightSidebar && (
          <div className="col-span-1 lg:col-span-3 space-y-4 animate-fade-in">
            {/* Unscheduled Sidebar Right */}
            <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm space-y-3">
              <div className="border-b border-slate-100 pb-2">
                <h3 className="font-display text-xs font-bold text-[#0f2444] uppercase tracking-wider">
                  Việc Chưa Xếp Lịch
                </h3>
                <p className="text-[10px] text-slate-400 font-semibold mt-0.5 leading-relaxed">
                  Kéo thả vào lịch hoặc click Gán nhanh.
                </p>
              </div>

              {/* Tasks list */}
              <div className="space-y-2 max-h-[500px] overflow-y-auto pr-0.5 custom-scrollbar">
                {unscheduledList.length === 0 ? (
                  <div className="text-center py-8 text-slate-300 font-bold text-[10px]">
                    Đã xếp lịch toàn bộ.
                  </div>
                ) : (
                  unscheduledList.map(task => (
                    <div
                      key={`${task.section}-${task.id}`}
                      draggable
                      onDragStart={(e) => {
                        e.dataTransfer.setData('text/plain', JSON.stringify({
                          section: task.section,
                          originalIndex: task.originalIndex
                        }));
                        if (e.dataTransfer) {
                          e.dataTransfer.effectAllowed = 'move';
                        }
                      }}
                      className="bg-slate-50/75 hover:bg-[#0f2444]/5 border border-slate-150 rounded-lg p-2.5 text-left transition duration-200 space-y-1.5 group cursor-grab active:cursor-grabbing"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1">
                          <span className="bg-[#0f2444] text-white text-[8px] font-mono font-bold px-1 py-0.25 rounded">
                            {task.id}
                          </span>
                          {task.donVi && (
                            <span className="bg-slate-200/85 text-slate-600 text-[8px] font-bold px-1 py-0.25 rounded truncate max-w-[80px]">
                              {task.donVi}
                            </span>
                          )}
                        </div>
                        <span className="text-[8px] text-slate-400 font-semibold font-mono">Mục {task.section}</span>
                      </div>
                      <p className="text-[11px] font-medium text-slate-600 leading-relaxed line-clamp-2">
                        {task.noiDung}
                      </p>
                      <div className="flex items-center gap-1.5 pt-1.5 border-t border-slate-200/50">
                        <button
                          onClick={() => handleOpenEdit(task.section, task.originalIndex, task)}
                          className="flex-1 bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 font-bold text-[9px] py-1 rounded-md transition text-center cursor-pointer outline-none shadow-xs"
                        >
                          Sửa chi tiết
                        </button>
                        <button
                          onClick={() => setQuickAssignTask({ section: task.section, originalIndex: task.originalIndex, task })}
                          className={`flex-1 font-bold text-[9px] py-1 rounded-md transition text-center cursor-pointer outline-none border ${quickAssignTask?.task.id === task.id
                            ? 'bg-amber-100 text-amber-800 border-amber-300'
                            : 'bg-[#a3212e] hover:bg-[#8d1c27] text-white border-[#a3212e]'
                            }`}
                        >
                          {quickAssignTask?.task.id === task.id ? 'Hủy gán' : 'Gán nhanh'}
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Detail Modal */}
      {selectedTask && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-slate-200 w-full max-w-6xl shadow-2xl flex flex-col max-h-[90vh] overflow-hidden animate-fadein">
            {/* Header */}
            <div className="bg-[#0f2444] text-white px-6 py-4 flex items-center justify-between flex-none">
              <div className="flex items-center gap-2">
                <span className="bg-white/10 px-2.5 py-0.5 rounded text-xs font-mono font-bold text-red-300">
                  {selectedTask.task.id}
                </span>
                <span className="text-xs font-bold uppercase tracking-wider text-slate-200">
                  Chỉnh sửa nhiệm vụ Lịch trình Mục {selectedTask.section}
                </span>
              </div>
              <button
                onClick={() => setSelectedTask(null)}
                className="text-white hover:bg-white/10 p-1.5 rounded-lg cursor-pointer outline-none transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Body Form */}
            <div className="p-6 space-y-5 overflow-y-auto flex-1 custom-scrollbar text-xs">

              {/* THREE COLUMN GRID FOR FORM SECTIONS */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 items-start">

                {/* COLUMN 1: SECTION I - THÔNG TIN VĂN BẢN GỐC (Document Metadata) */}
                <div className="order-1 bg-[#fcfcfc] border border-slate-200/80 rounded-xl p-4 space-y-4">
                  <span className="text-xs font-bold text-[#0f2444] tracking-wider uppercase block border-b border-slate-200/60 pb-1.5">
                    I. Thông tin văn bản gốc
                  </span>

                  {/* 1. Số, ký hiệu văn bản */}
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 mb-1">
                      Số, ký hiệu văn bản <span className="text-red-500">*</span>
                    </label>
                    <div className="grid grid-cols-12 gap-1 bg-white p-1 rounded-lg border-2 border-amber-400/80 focus-within:border-[#a3212e] transition shadow-sm">
                      <input
                        type="text"
                        required
                        id="cal-edit-task-so-number"
                        tabIndex={1}
                        className="col-span-4 bg-slate-50/50 border-none text-slate-800 px-1 py-1 text-xs font-bold outline-none text-center placeholder-slate-400"
                        placeholder="Số"
                        value={soNumberOnly}
                        onChange={(e) => handleSoNumberChange(e.target.value)}
                      />
                      <div className="col-span-1 flex items-center justify-center text-slate-400 font-bold">/</div>
                      <input
                        type="text"
                        id="cal-edit-task-so-symbol"
                        tabIndex={2}
                        className="col-span-7 bg-white border-none text-slate-800 px-1.5 py-1 text-xs font-mono font-bold outline-none"
                        placeholder={`Ví dụ: ${suggestDocumentSymbol(loaiVanBan, selectedDeptCode, isFromCAT).replace(/^\//, '')}`}
                        value={(soSymbolOnly || '').startsWith('/') ? (soSymbolOnly || '').substring(1) : (soSymbolOnly || '')}
                        onKeyDown={handleSymbolKeyDown}
                        onChange={(e) => {
                          handleSoSymbolManualChange(e.target.value);
                        }}
                      />
                    </div>
                  </div>

                  {/* Live Preview & Direct Edit Số hiệu */}
                  <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-[11px] text-slate-600">
                    <span className="font-sans font-bold text-slate-600 shrink-0 flex items-center gap-1">
                      📝 Số hiệu đầy đủ sẽ lưu:
                    </span>
                    <input
                      type="text"
                      className="w-full sm:w-auto flex-1 bg-white border border-slate-300 focus:border-[#a3212e] focus:bg-white text-[#0f2444] font-bold px-2 py-1 rounded text-xs outline-none transition shadow-2xs font-mono"
                      placeholder="Ví dụ: 439/KH-CAT-PV01"
                      value={so || (soNumberOnly ? `${soNumberOnly}${soSymbolOnly}` : soSymbolOnly)}
                      onChange={(e) => {
                        const val = e.target.value;
                        setSo(val);
                        const parsedFull = parseDocumentNumber(val);
                        setSoNumberOnly(parsedFull.numberOnly);
                        setSoSymbolOnly(parsedFull.symbolOnly);
                        const parsedTwoWay = parseDocumentSymbolTwoWay(parsedFull.symbolOnly);
                        applyTwoWayParsedResult(parsedTwoWay.detectedLoaiVanBan, parsedTwoWay.detectedIsFromCAT, parsedTwoWay.detectedDeptCode);
                      }}
                    />
                  </div>

                  {/* 2. Loại văn bản */}
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 mb-1">
                      Loại văn bản
                    </label>
                    <div className="flex gap-1.5">
                      <select
                        className="bg-white border border-slate-200 text-slate-700 px-2 py-1.5 rounded-lg text-xs font-semibold outline-none focus:border-[#a3212e] cursor-pointer flex-1"
                        value={COMMON_DOC_TYPES.includes(loaiVanBan) ? loaiVanBan : (loaiVanBan ? 'other' : '')}
                        onChange={(e) => {
                          const val = e.target.value;
                          if (val !== 'other') {
                            handleDocTypeChange(val);
                          } else {
                            handleDocTypeChange('');
                          }
                        }}
                      >
                        <option value="">— Chọn loại —</option>
                        {COMMON_DOC_TYPES.map(t => (
                          <option key={t} value={t}>{t}</option>
                        ))}
                        <option value="other">— Khác —</option>
                      </select>
                      {!COMMON_DOC_TYPES.includes(loaiVanBan) && loaiVanBan !== undefined && (
                        <input
                          type="text"
                          className="bg-white border border-slate-200 text-slate-700 px-2.5 py-1.5 rounded-lg text-xs font-medium outline-none focus:border-[#a3212e] flex-1 min-w-[80px]"
                          placeholder="Nhập loại..."
                          value={loaiVanBan}
                          onChange={(e) => handleDocTypeChange(e.target.value)}
                        />
                      )}
                    </div>
                  </div>

                  {/* 3. Đơn vị ban hành & Cấp CAT */}
                  <div className="grid grid-cols-12 gap-2 items-end">
                    <div className="col-span-10">
                      <label className="block text-[10px] font-bold text-slate-500 mb-1">
                        Đơn vị ban hành <span className="text-red-500">*</span>
                      </label>
                      <DeptCombobox
                        value={selectedDeptCode}
                        onChange={handleDeptCodeChange}
                      />
                    </div>
                    <div className="col-span-2">
                      <label className="block text-[9px] font-bold text-slate-500 mb-1 text-center whitespace-nowrap">
                        Cấp CAT
                      </label>
                      <button
                        type="button"
                        onClick={() => handleCATToggle(!isFromCAT)}
                        className={`w-full flex items-center justify-center px-1 py-2 rounded-lg border transition cursor-pointer h-[38px] ${isFromCAT
                          ? 'bg-red-50 border-red-300 text-[#a3212e] shadow-sm'
                          : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                          }`}
                      >
                        <input
                          type="checkbox"
                          checked={isFromCAT}
                          onChange={() => { }}
                          className="rounded text-[#a3212e] focus:ring-[#a3212e] cursor-pointer w-4 h-4"
                        />
                      </button>
                    </div>
                  </div>

                  {selectedDeptCode === 'KHAC' && (
                    <div className="animate-fade-in">
                      <label className="block text-[10px] font-bold text-slate-500 mb-1">
                        Tên đơn vị ban hành khác <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        required
                        className="w-full bg-white border border-slate-200 focus:border-[#a3212e] text-slate-800 px-2.5 py-1.5 rounded-lg text-xs font-semibold outline-none transition"
                        placeholder="Nhập tên đơn vị ban hành khác..."
                        value={donViBanHanh}
                        onChange={(e) => {
                          setDonViBanHanh(e.target.value);
                          if (!donViTheoDoi) {
                            setDonViTheoDoi(e.target.value);
                          }
                        }}
                      />
                    </div>
                  )}

                  {/* 4. Ngày ban hành */}
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 mb-1">
                      Ngày ban hành <span className="text-red-500">*</span> <span className="text-[10px] text-slate-400 font-normal ml-1">(dạng ddmm hoặc ddmmyy)</span>
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <input
                          type="text"
                          tabIndex={3}
                          className="w-full bg-white border-2 border-amber-400/80 focus:border-[#a3212e] text-slate-800 px-2.5 py-1.5 rounded-lg text-xs font-mono font-bold outline-none transition"
                          placeholder={`Ví dụ: ${formatToDDMMYY(getTodayDateString())}`}
                          maxLength={10}
                          value={quickDate}
                          onChange={(e) => {
                            const val = e.target.value;
                            const cleaned = val.replace(/[^0-9\/\-\.\s]/g, '').substring(0, 10);
                            setQuickDate(cleaned);
                            const parsed = parseQuickDate(cleaned);
                            if (parsed) {
                              setNgay(parsed);
                            }
                          }}
                          onFocus={(e) => e.target.select()}
                          onBlur={() => {
                            const parsed = parseQuickDate(quickDate);
                            if (parsed) {
                              setNgay(parsed);
                              setQuickDate(formatToDDMMYY(parsed));
                            }
                          }}
                        />
                      </div>
                      <div>
                        <div className="relative">
                          <div className="w-full bg-white border border-slate-200 focus-within:border-[#a3212e] text-slate-800 px-2.5 py-1.5 rounded-lg text-xs font-semibold flex items-center justify-between transition min-h-[32px] pointer-events-none">
                            <span>{formatDateVN(ngay) || 'Chọn ngày...'}</span>
                            <span className="text-slate-400">📅</span>
                          </div>
                          <input
                            type="date"
                            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                            value={ngay}
                            onClick={(e) => { e.stopPropagation(); try { e.currentTarget.showPicker(); } catch (err) { } }}
                            onFocus={(e) => { e.stopPropagation(); try { e.currentTarget.showPicker(); } catch (err) { } }}
                            onChange={(e) => {
                              const val = e.target.value;
                              setNgay(val);
                              setQuickDate(formatToDDMMYY(val));
                            }}
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* COLUMN 2: SECTION II - TRÍCH YẾU & CHỈ ĐẠO (Large Text Content) */}
                <div className="order-2 bg-[#fcfcfc] border border-slate-200/80 rounded-xl p-4 space-y-4">
                  <span className="text-xs font-bold text-[#0f2444] tracking-wider uppercase block border-b border-slate-200/60 pb-1.5">
                    II. Nội dung & Trích yếu
                  </span>

                  {/* Trích yếu */}
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 mb-1">
                      2.5. Trích yếu nội dung văn bản
                    </label>
                    <textarea
                      rows={2}
                      tabIndex={4}
                      className="w-full bg-white border-2 border-amber-400/80 focus:border-[#a3212e] text-slate-800 px-2.5 py-1.5 rounded-lg text-xs font-medium outline-none transition resize-none overflow-hidden"
                      placeholder="Tóm tắt nội dung văn bản gốc..."
                      value={trichYeu}
                      onChange={(e) => {
                        setTrichYeu(e.target.value);
                        e.target.style.height = 'auto';
                        e.target.style.height = `${e.target.scrollHeight}px`;
                      }}
                      onInput={(e) => {
                        const target = e.currentTarget;
                        target.style.height = 'auto';
                        target.style.height = `${target.scrollHeight}px`;
                      }}
                      ref={(el) => {
                        if (el) {
                          el.style.height = 'auto';
                          el.style.height = `${el.scrollHeight}px`;
                        }
                      }}
                    />
                  </div>

                  {/* Nội dung chỉ đạo */}
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 mb-1">
                      3. Tiêu chí/nội dung cần làm
                    </label>
                    <textarea
                      rows={4}
                      tabIndex={5}
                      className="w-full bg-white border-2 border-amber-400/80 focus:border-[#a3212e] text-slate-800 px-2.5 py-1.5 rounded-lg text-xs font-medium outline-none transition resize-none overflow-hidden"
                      placeholder="Mô tả công việc cụ thể phải triển khai..."
                      value={noiDung}
                      onChange={(e) => {
                        setNoiDung(e.target.value);
                        e.target.style.height = 'auto';
                        e.target.style.height = `${e.target.scrollHeight}px`;
                      }}
                      onInput={(e) => {
                        const target = e.currentTarget;
                        target.style.height = 'auto';
                        target.style.height = `${target.scrollHeight}px`;
                      }}
                      ref={(el) => {
                        if (el) {
                          el.style.height = 'auto';
                          el.style.height = `${el.scrollHeight}px`;
                        }
                      }}
                    />
                  </div>

                  {/* Trạng thái công việc (Hợp nhất đặt dưới Tiêu chí) */}
                  <div className="border border-slate-200 rounded-lg p-3 bg-white space-y-2">
                    <label className="block text-xs font-bold text-slate-700">
                      Trạng thái công việc <span className="text-[10px] text-slate-400 font-normal">(không bắt buộc)</span>
                    </label>
                    <select
                      className="w-full bg-white border border-slate-200 text-slate-800 px-2.5 py-1.5 rounded-lg text-xs font-semibold outline-none focus:border-[#a3212e] cursor-pointer"
                      value={(trangThai === 'Hoàn thành đúng hạn' || trangThai === 'Hoàn thành trễ hạn' || trangThai === 'Đã hoàn thành') ? 'Đã hoàn thành' : trangThai}
                      onChange={(e) => {
                        const val = e.target.value;
                        setTrangThai(val);
                        if (val === 'Đã hoàn thành' || val === 'Hoàn thành đúng hạn' || val === 'Hoàn thành trễ hạn') {
                          if (!ngayHoanThanh) {
                            const today = getTodayDateString();
                            setNgayHoanThanh(today);
                            setQuickDateHoanThanh(formatToDDMMYY(today));
                          }
                        } else {
                          setNgayHoanThanh('');
                          setQuickDateHoanThanh('');
                        }
                      }}
                    >
                      <option value="">Chưa cập nhật</option>
                      <option value="Chưa hoàn thành">Chưa hoàn thành</option>
                      <option value="Đã hoàn thành">Đã hoàn thành</option>
                      <option value="Không áp dụng">Không áp dụng</option>
                    </select>

                    {(trangThai === 'Đã hoàn thành' || trangThai === 'Hoàn thành đúng hạn' || trangThai === 'Hoàn thành trễ hạn') && (
                      <div className="bg-emerald-50/70 border border-emerald-200/80 rounded-lg p-2.5 space-y-2 animate-fade-in mt-1.5">
                        <label className="block text-[11px] font-bold text-emerald-900">
                          Ngày hoàn thành thực tế:
                        </label>
                        <div className="grid grid-cols-2 gap-2">
                          <input
                            type="date"
                            className="bg-white border border-emerald-300 focus:border-emerald-600 text-slate-800 px-2 py-1 rounded-lg text-xs font-mono font-bold outline-none cursor-pointer"
                            value={ngayHoanThanh}
                            onChange={(e) => {
                              const val = e.target.value;
                              setNgayHoanThanh(val);
                              setQuickDateHoanThanh(formatToDDMMYY(val));
                            }}
                          />
                          <input
                            type="text"
                            className="bg-white border border-emerald-300 focus:border-emerald-600 text-slate-800 px-2 py-1 rounded-lg text-xs font-mono font-bold outline-none"
                            placeholder="dd/mm/yyyy"
                            value={quickDateHoanThanh}
                            onChange={(e) => {
                              const val = e.target.value;
                              setQuickDateHoanThanh(val);
                              const parsed = parseQuickDate(val);
                              if (parsed) setNgayHoanThanh(parsed);
                            }}
                          />
                        </div>

                        {/* Dynamic live result badge */}
                        {(() => {
                          const autoStat = computeAutoStatus('hoan_thanh', ngayHoanThanh || getTodayDateString(), ngayHetHan);
                          const isLate = autoStat.startsWith('Hoàn thành trễ hạn');
                          return (
                            <div className={`p-2 rounded text-[11px] font-bold flex items-center justify-between border ${isLate
                              ? 'bg-amber-100 text-amber-900 border-amber-300'
                              : 'bg-emerald-100 text-emerald-900 border-emerald-300'
                              }`}>
                              <span>Kết quả hệ thống tự tính:</span>
                              <span className="font-extrabold uppercase">
                                {isLate ? '⚠️ Hoàn thành trễ hạn' : '✅ Hoàn thành đúng hạn'}
                              </span>
                            </div>
                          );
                        })()}
                      </div>
                    )}
                  </div>

                  {/* Sản phẩm */}
                  <div>
                    <label className="block text-xs font-bold text-slate-600 mb-1">
                      Sản phẩm <span className="text-slate-400 font-normal text-[10px]">(không tự động đổi trạng thái — muốn đánh dấu hoàn thành, chọn "Đã hoàn thành" ở trên)</span>
                    </label>
                    <input
                      type="text"
                      className="w-full bg-white border border-slate-200 focus:border-[#a3212e] text-slate-800 px-2.5 py-1.5 rounded-lg text-xs font-medium outline-none transition"
                      placeholder="Ví dụ: Báo cáo số 12/BC-TTH, Kế hoạch..."
                      value={sanPham}
                      onChange={(e) => setSanPham(e.target.value)}
                    />
                  </div>
                </div>

                {/* COLUMN 3: SECTION III - THỜI HẠN & THỰC HIỆN (Timing & Assignment Controls) */}
                <div className="order-3 space-y-4">
                  <div className="bg-white border border-slate-200 rounded-xl p-4 space-y-4 shadow-sm">
                    <span className="text-xs font-bold text-[#0f2444] tracking-wider uppercase block border-b border-slate-200/60 pb-1.5">
                      III. Thời hạn & Thực hiện
                    </span>

                    {/* Thiết lập thời hạn hoàn thành / Mốc thời hạn (Mặc định Mốc 1) */}
                    <MilestoneManager
                      danhSachMoc={danhSachMoc}
                      onChange={(newMocs) => {
                        setDanhSachMoc(newMocs);
                        if (newMocs.length > 0) {
                          if (newMocs[0].ngayHetHan) {
                            setNgayHetHan(newMocs[0].ngayHetHan);
                            setQuickDateHetHan(formatToDDMMYY(newMocs[0].ngayHetHan));
                          }
                          if (newMocs[0].gioHetHan !== undefined) {
                            setGioHetHan(newMocs[0].gioHetHan || '');
                          }
                          if (newMocs[0].kieuThoiHan) {
                            setKieuThoiHan(newMocs[0].kieuThoiHan);
                          }
                        }
                      }}
                      baseYear={parseInt((ngay || '').substring(0, 4)) || currentYear}
                    />
                  </div>
                </div>

                {/* EXPANDABLE ADDITIONAL INFORMATION SECTION */}
                <div className="col-span-1 lg:col-span-3 space-y-4 order-last">
                  <div>
                    <button
                      type="button"
                      onClick={() => setIsExpanded(!isExpanded)}
                      className="w-full flex items-center justify-between p-3 bg-slate-50 border border-slate-200 hover:bg-slate-100 rounded-xl transition cursor-pointer text-xs font-bold text-slate-700"
                    >
                      <span className="flex items-center gap-1.5">
                        <Plus className={`w-3.5 h-3.5 text-[#a3212e] transition-transform duration-300 ${isExpanded ? 'rotate-45' : ''}`} />
                        {isExpanded ? 'Thu gọn thông tin bổ sung' : 'Mở rộng thông tin bổ sung (Điểm, Đơn vị/Tổ thực hiện, Đơn vị theo dõi, Ghi chú...)'}
                      </span>
                      <span className="text-[10px] text-slate-400 font-mono uppercase">
                        {isExpanded ? 'Thu gọn' : 'Mở rộng'}
                      </span>
                    </button>
                  </div>

                  {isExpanded && (
                    <div className="border border-slate-200 rounded-xl p-4 bg-white space-y-3.5 animate-fade-in">
                      {/* Đơn vị thực hiện */}
                      <div>
                        <label className="block text-[10px] font-bold text-slate-600 mb-1">
                          Đơn vị thực hiện (Tổ chuyên trách)
                        </label>
                        <select
                          className="w-full bg-white border border-slate-200 text-slate-700 px-2.5 py-1.5 rounded-lg text-xs font-semibold outline-none focus:border-[#a3212e] cursor-pointer"
                          value={[
                            'Tổ Tổng hợp',
                            'Tổ An ninh',
                            'Tổ Cảnh sát trật tự',
                            'Tổ Cảnh sát khu vực',
                            'Tổ Cảnh sát phòng chống tội phạm'
                          ].includes(donVi) ? donVi : (donVi ? 'other' : '')}
                          onChange={(e) => {
                            const val = e.target.value;
                            if (val === 'other') {
                              setDonVi('');
                            } else {
                              setDonVi(val);
                            }
                          }}
                        >
                          <option value="">— Chưa phân công —</option>
                          <option value="Tổ Tổng hợp">Tổ Tổng hợp</option>
                          <option value="Tổ An ninh">Tổ An ninh</option>
                          <option value="Tổ Cảnh sát trật tự">Tổ Cảnh sát trật tự</option>
                          <option value="Tổ Cảnh sát khu vực">Tổ Cảnh sát khu vực</option>
                          <option value="Tổ Cảnh sát phòng chống tội phạm">Tổ Cảnh sát phòng chống tội phạm</option>
                          <option value="other">— Nhập tay / Đơn vị tùy chỉnh —</option>
                        </select>

                        {(![
                          'Tổ Tổng hợp',
                          'Tổ An ninh',
                          'Tổ Cảnh sát trật tự',
                          'Tổ Cảnh sát khu vực',
                          'Tổ Cảnh sát phòng chống tội phạm'
                        ].includes(donVi) || donVi === '') && (
                            <input
                              type="text"
                              className="w-full bg-white border border-slate-200 focus:border-[#a3212e] text-slate-800 px-2.5 py-1.5 rounded-lg text-xs font-medium outline-none transition mt-1.5"
                              placeholder="Nhập tên đơn vị/cá nhân thực hiện..."
                              value={donVi}
                              onChange={(e) => setDonVi(e.target.value)}
                            />
                          )}
                      </div>

                      {/* Đơn vị theo dõi & Điểm thi đua */}
                      <div className="grid grid-cols-12 gap-3.5">
                        <div className="col-span-12 sm:col-span-9">
                          <label className="block text-[10px] font-bold text-slate-600 mb-1">
                            Đơn vị được giao theo dõi (Trường số 6)
                          </label>
                          <DeptCombobox
                            value={donViTheoDoi}
                            onChange={(val) => {
                              const deptObj = POLICE_DEPARTMENTS.find(d => d.code === val);
                              if (deptObj) {
                                setDonViTheoDoi(deptObj.name);
                              } else {
                                setDonViTheoDoi(val);
                              }
                            }}
                          />
                        </div>

                        <div className="col-span-12 sm:col-span-3">
                          <label className="block text-[10px] font-bold text-slate-600 mb-1">
                            Điểm thi đua tối đa
                          </label>
                          <input
                            type="number"
                            step="0.1"
                            className="w-full bg-white border border-slate-200 focus:border-[#a3212e] text-slate-800 px-2.5 py-1.5 rounded-lg text-xs font-medium outline-none transition"
                            value={diemGiao}
                            onChange={(e) => setDiemGiao(parseFloat(e.target.value) || 0.5)}
                          />
                        </div>
                      </div>

                      {/* Ghi chú */}
                      <div>
                        <label className="block text-[10px] font-bold text-slate-600 mb-1">
                          Ghi chú (Trường số 9)
                        </label>
                        <input
                          type="text"
                          className="w-full bg-white border border-slate-200 focus:border-[#a3212e] text-slate-800 px-2.5 py-1.5 rounded-lg text-xs font-medium outline-none transition"
                          placeholder="Nhập ghi chú thêm..."
                          value={ghiChu}
                          onChange={(e) => setGhiChu(e.target.value)}
                        />
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="bg-slate-50 px-6 py-4 flex justify-end gap-3 border-t border-slate-200 flex-none">
              <button
                type="button"
                onClick={() => setSelectedTask(null)}
                className="bg-white border border-slate-200 text-slate-700 px-4 py-2 rounded-xl text-xs font-bold hover:bg-slate-50 transition cursor-pointer outline-none"
              >
                Hủy bỏ
              </button>
              <button
                type="button"
                onClick={handleSave}
                className="bg-[#a3212e] hover:bg-[#851b25] text-white px-5 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 cursor-pointer outline-none shadow-md"
              >
                <Save className="w-4 h-4" /> Cập nhật thay đổi
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
