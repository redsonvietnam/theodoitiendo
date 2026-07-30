/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { 
  Search, 
  Filter, 
  Calendar, 
  Award, 
  FileText, 
  Plus, 
  Edit2, 
  Trash2, 
  X, 
  Save, 
  Clock,
  CheckCircle,
  LayoutGrid,
  Table,
  ArrowUpDown,
  Building2,
  Eye,
  Gift,
  AlertTriangle,
  Pin
} from 'lucide-react';
import { TaskBC, TaskMilestone } from '../types';
import { compileCanCu, formatNgayBanHanh, isRecurringText, computeAutoStatus, cleanInlineText, formatParagraphText, getTaskNgayBanHanhTimestamp, getTaskNgayHetHanTimestamp, getTaskDeadlineISO, isTaskCompleted, hasValidProduct, getTodayDateString, getTaskStatusInfo } from '../utils/cancu';
import ExcelTableView from './ExcelTableView';
import { POLICE_DEPARTMENTS, suggestDocumentSymbol, parseDocumentNumber, formatDonViBanHanhDisplay, parseDocumentSymbolTwoWay, tryExpandShorthand, formatToDDMMYY, parseQuickDate } from '../utils/documentHelper';
import DeptCombobox from './DeptCombobox';
import MilestoneManager from './MilestoneManager';

/**
 * Configuration that captures everything that differs between Section II
 * ("Mục II - nhiệm vụ có thời hạn trong tháng", used by MainB.tsx) and
 * Section III ("Mục III - nhiệm vụ thường xuyên", used by MainC.tsx).
 *
 * MainB.tsx and MainC.tsx used to be two ~1,780-line files that were ~94%
 * byte-identical copy-paste of each other. That duplication meant every bug
 * fix or UI tweak had to be made twice (and was easy to forget in one of the
 * two places). This component consolidates the shared implementation; the
 * two thin wrapper files just supply the section-specific config below.
 */
export interface MainSectionBCConfig {
  /** 'B' for Mục II, 'C' for Mục III. Used for onOpenGlobalAdd and misc labels. */
  section: 'B' | 'C';
  /** Roman numeral shown in headings, e.g. "II" or "III". */
  sectionRoman: string;
  /** Big header title, e.g. "MỤC II • NHIỆM VỤ CÓ THỜI HẠN TRONG THÁNG". */
  sectionTitle: string;
  /** Subtitle/description shown under the header. */
  sectionDescription: string;
  /** DOM id prefix for the "số/ký hiệu văn bản" quick-entry inputs ('b' | 'c'). */
  idPrefix: 'b' | 'c';
  /**
   * How to compute the "target/deadline date" used for grouping & sorting.
   * Section II uses getTaskDeadlineISO() (handles recurring-style deadlines);
   * Section III just uses the raw ngayHetHan field.
   */
  computeTargetDate: (row: TaskBC) => string;
  /** Label for the "trích yếu" field (Section II numbers it "2.5.", Section III doesn't). */
  trichYeuLabel: string;
  /** Label for the "tiêu chí/nội dung" field. */
  tieuChiLabel: string;
  /** Placeholder for the "tiêu chí/nội dung" textarea. */
  tieuChiPlaceholder: string;
  /**
   * Section III's modal has an extra manual "Trạng thái thực hiện" dropdown
   * (lets staff set trangThai directly, bypassing the auto on-time/late
   * calculation) that Section II's modal does not have. Preserved as-is
   * during the merge rather than changed, since it reflects an existing,
   * possibly intentional, product decision for recurring tasks.
   */
  showManualStatusOverride: boolean;
}

interface MainSectionBCProps {
  config: MainSectionBCConfig;
  tasks: TaskBC[];
  updateTask: (idx: number, fieldOrFields: keyof TaskBC | Partial<TaskBC>, value?: any) => void;
  addTask?: (task: Omit<TaskBC, 'id' | 'stt'>) => void;
  deleteTask?: (idx: number) => void;
  todayISO: string;
  daysUntil: (ds: string) => number | null;
  onOpenGlobalAdd?: (section: 'B' | 'C') => void;
  isWorkspaceExpanded?: boolean;
  onToggleExpand?: () => void;
  activeEditingTaskId?: string | null;
  onClearActiveEditingTaskId?: () => void;
  viewMode: 'card' | 'excel';
  setViewMode: (mode: 'card' | 'excel') => void;
}

const COMMON_DOC_TYPES = [
  'Công văn',
  'Báo cáo',
  'Kế hoạch',
  'Nghị quyết',
  'Quyết định',
  'Chỉ thị',
  'Quy chế',
  'Quy định',
  'Thông cáo',
  'Thông báo',
  'Hướng dẫn',
  'Chương trình',
  'Phương án',
  'Đề án',
  'Dự án',
  'Biên bản',
  'Tờ trình',
  'Hợp đồng',
  'Công điện',
  'Bản ghi nhớ',
  'Bản thỏa thuận',
  'Giấy ủy quyền',
  'Giấy mời',
  'Giấy giới thiệu',
  'Giấy nghỉ phép',
  'Phiếu gửi',
  'Phiếu chuyển',
  'Phiếu báo',
  'Kết luận',
  'Nghị định',
  'Thông tư'
];

// Helper functions for deadline compilation
const formatDateVN = (dateStr: string) => {
  if (!dateStr) return '';
  const parts = dateStr.split('-');
  if (parts.length === 3) {
    return `${parts[2]}/${parts[1]}/${parts[0]}`;
  }
  return dateStr;
};

const getDayOfDate = (dateStr: string) => {
  if (!dateStr) return '';
  const parts = dateStr.split('-');
  if (parts.length === 3) {
    return parts[2];
  }
  return '';
};

const getDayMonthOfDate = (dateStr: string) => {
  if (!dateStr) return '';
  const parts = dateStr.split('-');
  if (parts.length === 3) {
    return `${parts[2]}/${parts[1]}`;
  }
  return '';
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

export default function MainSectionBC({ 
  config,
  tasks, 
  updateTask, 
  addTask, 
  deleteTask, 
  todayISO, 
  daysUntil,
  onOpenGlobalAdd,
  isWorkspaceExpanded,
  onToggleExpand,
  activeEditingTaskId,
  onClearActiveEditingTaskId,
  viewMode,
  setViewMode
}: MainSectionBCProps) {
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterDeadline, setFilterDeadline] = useState('');
  const [filterUnit, setFilterUnit] = useState('');
  const [sortBy, setSortBy] = useState<'ngayHetHan_asc' | 'ngayHetHan_desc' | 'ngay_asc' | 'ngay_desc'>('ngayHetHan_asc');

  // Auto-open editing modal if activeEditingTaskId is set
  useEffect(() => {
    if (activeEditingTaskId && onClearActiveEditingTaskId) {
      const idx = tasks.findIndex(t => t.id === activeEditingTaskId);
      if (idx !== -1) {
        handleOpenEditModal(tasks[idx], idx);
      }
      onClearActiveEditingTaskId();
    }
  }, [activeEditingTaskId, tasks, onClearActiveEditingTaskId]);

  // Modals state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalType, setModalType] = useState<'add' | 'edit'>('add');
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [shouldFocusProduct, setShouldFocusProduct] = useState(false);

  // Form states (focused + advanced fields)
  const [loaiVanBan, setLoaiVanBan] = useState('Kế hoạch');
  const [so, setSo] = useState('');
  const [ngay, setNgay] = useState(getTodayDateString());
  const [quickDate, setQuickDate] = useState(formatToDDMMYY(getTodayDateString()));
  const [quickDateHetHan, setQuickDateHetHan] = useState(formatToDDMMYY(getTodayDateString()));
  const [donViBanHanh, setDonViBanHanh] = useState('');
  const [trichYeu, setTrichYeu] = useState('');
  const [noiDung, setNoiDung] = useState('');
  const [thoiHan, setThoiHan] = useState('');
  const [diemGiao, setDiemGiao] = useState<number>(0.5);
  const [donVi, setDonVi] = useState('');
  const [sanPham, setSanPham] = useState('');
  const [ngayHetHan, setNgayHetHan] = useState(getTodayDateString());
  const [trangThai, setTrangThai] = useState<'Hoàn thành đúng hạn' | 'Hoàn thành trễ hạn' | 'Chưa hoàn thành' | 'Không áp dụng' | ''>('');
  
  // Status & Completion Auto-calculation states
  const [isCompletedChoice, setIsCompletedChoice] = useState<'chua_hoan_thanh' | 'hoan_thanh' | 'khong_ap_dung'>('chua_hoan_thanh');
  const [ngayHoanThanh, setNgayHoanThanh] = useState<string>(getTodayDateString());
  const [quickDateHoanThanh, setQuickDateHoanThanh] = useState<string>(formatToDDMMYY(getTodayDateString()));

  // New fields for 12-field layout
  const [gioHetHan, setGioHetHan] = useState('00:00');
  const [kieuThoiHan, setKieuThoiHan] = useState('truoc_ngay');
  const [donViTheoDoi, setDonViTheoDoi] = useState('');
  const [ghiChu, setGhiChu] = useState('');
  const [danhSachMoc, setDanhSachMoc] = useState<TaskMilestone[]>([]);
  const [isExpanded, setIsExpanded] = useState(false);

  // Document numbering automation helper states
  const [soNumberOnly, setSoNumberOnly] = useState('');
  const [soSymbolOnly, setSoSymbolOnly] = useState('');
  const [selectedDeptCode, setSelectedDeptCode] = useState('');
  const [isFromCAT, setIsFromCAT] = useState(false);

  const handleDocTypeChange = (newType: string) => {
    setLoaiVanBan(newType);
    const newSymbol = suggestDocumentSymbol(newType, selectedDeptCode, isFromCAT);
    setSoSymbolOnly(newSymbol);
    setSo(soNumberOnly ? `${soNumberOnly}${newSymbol}` : newSymbol);
  };

  const handleDeptCodeChange = (newCode: string) => {
    setSelectedDeptCode(newCode);

    // Auto-populate Đơn vị ban hành & Đơn vị theo dõi
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

    // Auto-update Đơn vị ban hành
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

  useEffect(() => {
    if (isModalOpen) {
      const timer = setTimeout(() => {
        if (shouldFocusProduct) {
          const productInput = document.getElementById('modal-san-pham-input') as HTMLInputElement | null;
          if (productInput) {
            productInput.focus();
            if ('select' in productInput) {
              productInput.select();
            }
          }
        } else {
          const input = document.getElementById(`edit-${config.idPrefix}-task-so-number`) as HTMLInputElement | null;
          if (input) {
            input.focus();
          }
        }
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [isModalOpen, shouldFocusProduct]);

  const handleSoNumberChange = (num: string) => {
    // Split if there is a slash or a letter (a-z, A-Z)
    const match = num.match(/[a-zA-Z/]/);
    if (match && match.index !== undefined) {
      const index = match.index;
      const numPart = num.substring(0, index).trim();
      const rawSymPart = num.substring(index).replace(/^\//, ''); // remove leading slash if typed
      
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

      // Automatically focus the symbol input field
      setTimeout(() => {
        const symbolInput = document.getElementById(`edit-${config.idPrefix}-task-so-symbol`) as HTMLInputElement | null;
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
        const numInput = document.getElementById(`edit-${config.idPrefix}-task-so-number`) as HTMLInputElement | null;
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

  // Status options for B/C tasks
  const statusOptions = [
    'Hoàn thành',
    '-'
  ] as const;

  // Extract unique units for filter dropdown
  const uniqueUnits = Array.from(new Set(tasks.map(t => t.donVi).filter(Boolean))).sort();

  // Metrics
  const totalPointsMax = tasks.reduce((sum, r) => sum + r.diemGiao, 0);
  const totalPointsScore = tasks.reduce((sum, r) => {
    const info = getTaskStatusInfo(r);
    return sum + r.diemGiao * info.scoreMultiplier;
  }, 0);

  // Product stats for Section III
  const totalNoSpCount = tasks.filter(t => !hasValidProduct(t)).length;
  const totalHasSpCount = tasks.filter(t => hasValidProduct(t)).length;

  // Quick Mark Done & Open Edit Modal with Product Focus handler
  const handleMarkDone = (row: TaskBC, originalIndex: number) => {
    // Open Edit Modal ("giao diện sửa") and focus product input.
    // Task is NOT modified in state/database until user enters product/date and clicks Save (Confirm).
    handleOpenEditModal(row, originalIndex, true);
  };

  // Filter logic
  const filteredTasks = tasks.map((t, originalIndex) => ({ ...t, originalIndex })).filter(row => {
    const formattedDV = formatDonViBanHanhDisplay(row.donViBanHanh);
    const hay = `${row.canCu} ${row.noiDung} ${row.donVi} ${row.sanPham} ${row.loaiVanBan || ''} ${row.so || ''} ${row.donViBanHanh || ''} ${formattedDV} ${row.trichYeu || ''} ${row.donViTheoDoi || ''} ${row.ghiChu || ''}`.toLowerCase();
    const matchesSearch = !search || hay.includes(search.toLowerCase());
    
    const statusInfo = getTaskStatusInfo(row);
    let matchesStatus = true;
    if (filterStatus === '__blank' || filterStatus === '-') {
      matchesStatus = !statusInfo.isCompleted;
    } else if (filterStatus === 'no_sp') {
      matchesStatus = !hasValidProduct(row);
    } else if (filterStatus === 'has_sp') {
      matchesStatus = hasValidProduct(row);
    } else if (filterStatus === 'Hoàn thành') {
      matchesStatus = statusInfo.isCompleted && !statusInfo.isLate;
    } else if (filterStatus === 'Hoàn thành trễ hạn') {
      matchesStatus = statusInfo.isLate;
    } else if (filterStatus) {
      matchesStatus = row.trangThai === filterStatus || statusInfo.statusText.includes(filterStatus);
    }

    let matchesDeadline = true;
    const isCompleted = statusInfo.isCompleted;
    const dLeft = row.ngayHetHan ? daysUntil(row.ngayHetHan) : null;
    if (filterDeadline === 'overdue') {
      matchesDeadline = !isCompleted && dLeft !== null && dLeft < 0;
    } else if (filterDeadline === 'nearing') {
      matchesDeadline = !isCompleted && dLeft !== null && dLeft >= 0 && dLeft <= 5;
    }

    const matchesUnit = !filterUnit || row.donVi === filterUnit;

    return matchesSearch && matchesStatus && matchesDeadline && matchesUnit;
  });

  const sortedTasks = [...filteredTasks].sort((a, b) => {
    if (sortBy === 'ngayHetHan_asc') {
      const tsA = getTaskNgayHetHanTimestamp(a);
      const tsB = getTaskNgayHetHanTimestamp(b);
      if (!tsA && !tsB) return 0;
      if (!tsA) return 1;
      if (!tsB) return -1;
      return tsA - tsB;
    } else if (sortBy === 'ngay_desc') {
      const tsA = getTaskNgayBanHanhTimestamp(a);
      const tsB = getTaskNgayBanHanhTimestamp(b);
      if (!tsA && !tsB) return 0;
      if (!tsA) return 1;
      if (!tsB) return -1;
      return tsB - tsA;
    } else if (sortBy === 'ngay_asc') {
      const tsA = getTaskNgayBanHanhTimestamp(a);
      const tsB = getTaskNgayBanHanhTimestamp(b);
      if (!tsA && !tsB) return 0;
      if (!tsA) return 1;
      if (!tsB) return -1;
      return tsA - tsB;
    } else { // ngayHetHan_desc
      const tsA = getTaskNgayHetHanTimestamp(a);
      const tsB = getTaskNgayHetHanTimestamp(b);
      if (!tsA && !tsB) return 0;
      if (!tsA) return 1;
      if (!tsB) return -1;
      return tsB - tsA;
    }
  });

  // Open modal for adding
  const handleOpenAddModal = () => {
    setModalType('add');
    setEditingIndex(null);
    setShouldFocusProduct(false);
    setLoaiVanBan('Kế hoạch');
    setSo('');
    setSoNumberOnly('');
    setSoSymbolOnly('');
    setSelectedDeptCode('PV01');
    setIsFromCAT(false);
    setNgay(getTodayDateString());
    setQuickDate(formatToDDMMYY(getTodayDateString()));
    setQuickDateHetHan(formatToDDMMYY(getTodayDateString()));
    setDonViBanHanh('Phòng Tham mưu');
    setTrichYeu('');
    setNoiDung('');
    setThoiHan('');
    setDiemGiao(0.5);
    setDonVi('');
    setSanPham('');
    setNgayHetHan(getTodayDateString());
    setTrangThai('');
    setIsCompletedChoice('chua_hoan_thanh');
    const today = getTodayDateString();
    setNgayHoanThanh(today);
    setQuickDateHoanThanh(formatToDDMMYY(today));
    setGioHetHan('00:00');
    setKieuThoiHan('truoc_ngay');
    setDonViTheoDoi('Phòng Tham mưu');
    setGhiChu('');
    setDanhSachMoc([
      {
        id: `moc_1_${Date.now()}`,
        tenMoc: 'Mốc 1',
        kieuThoiHan: 'truoc_ngay',
        ngayHetHan: getTodayDateString(),
        trangThai: 'Chưa hoàn thành'
      }
    ]);
    setIsExpanded(false);
    setIsModalOpen(true);
  };

  // Open modal for editing
  const handleOpenEditModal = (task: TaskBC, idx: number, focusProductInput = false) => {
    setModalType('edit');
    setEditingIndex(idx);
    setShouldFocusProduct(focusProductInput);
    setLoaiVanBan(task.loaiVanBan || 'Kế hoạch');
    setSo(task.so || '');

    // Parse existing document number & symbol
    const parsed = parseDocumentNumber(task.so || '');
    setSoNumberOnly(parsed.numberOnly);
    setSoSymbolOnly(parsed.symbolOnly);
    setIsFromCAT(parsed.isFromCAT);
    setSelectedDeptCode(parsed.departmentCode || parsed.customSuffix || '');

    setNgay(task.ngay || '');
    setQuickDate(formatToDDMMYY(task.ngay || ''));
    setDonViBanHanh(task.donViBanHanh || '');
    setTrichYeu(task.trichYeu || '');
    setNoiDung(task.noiDung || '');
    setThoiHan(task.thoiHan || '');
    setDiemGiao(task.diemGiao || 0.5);
    setDonVi(task.donVi || '');
    setSanPham(task.sanPham || '');
    setNgayHetHan(task.ngayHetHan || '');
    setQuickDateHetHan(formatToDDMMYY(task.ngayHetHan || ''));
    
    // Status & Completion
    const isDone = isTaskCompleted(task) || focusProductInput;
    if (task.trangThai === 'Không áp dụng' && !focusProductInput) {
      setIsCompletedChoice('khong_ap_dung');
      setTrangThai('Không áp dụng');
      setNgayHoanThanh('');
      setQuickDateHoanThanh('');
    } else if (isDone) {
      setIsCompletedChoice('hoan_thanh');
      setTrangThai('Đã hoàn thành');
      const hoanThanhVal = task.ngayHoanThanh || getTodayDateString();
      setNgayHoanThanh(hoanThanhVal);
      setQuickDateHoanThanh(formatToDDMMYY(hoanThanhVal));
    } else {
      setIsCompletedChoice('chua_hoan_thanh');
      setTrangThai(task.trangThai || '');
      setNgayHoanThanh('');
      setQuickDateHoanThanh('');
    }

    setGioHetHan(task.gioHetHan || '00:00');
    setKieuThoiHan(task.kieuThoiHan || 'truoc_ngay');
    setDonViTheoDoi(task.donViTheoDoi || task.donViBanHanh || '');
    setGhiChu(task.ghiChu || '');
    setDanhSachMoc((task.danhSachMoc && task.danhSachMoc.length > 0) ? task.danhSachMoc : []);
    setIsExpanded(false);
    setIsModalOpen(true);

    if (focusProductInput) {
      setTimeout(() => {
        const inputEl = document.getElementById('modal-san-pham-input') as HTMLInputElement | null;
        if (inputEl) {
          inputEl.focus();
          if ('select' in inputEl) {
            inputEl.select();
          }
        }
      }, 150);
    }
  };

  // Handle Save (Add or Update)
  const handleSaveTask = (e: React.FormEvent) => {
    e.preventDefault();
    
    const finalNgayHetHan = ngayHetHan || getTodayDateString();
    const finalThoiHan = (kieuThoiHan === 'custom' || kieuThoiHan === 'custom_c')
      ? thoiHan
      : compileThoiHanString(kieuThoiHan, finalNgayHetHan, gioHetHan, thoiHan);

    let finalKieuThoiHan = kieuThoiHan;
    if (kieuThoiHan === 'custom') {
      const isRecur = isRecurringText(thoiHan);
      finalKieuThoiHan = isRecur ? 'custom_c' : 'custom';
    }

    // If both number and symbol are blank, do not auto-fill default symbol
    const computedSymbol = soSymbolOnly ? (soSymbolOnly.startsWith('/') ? soSymbolOnly : `/${soSymbolOnly}`) : '';
    const fallbackSo = soNumberOnly 
      ? `${soNumberOnly}${computedSymbol}` 
      : computedSymbol;
    const finalSo = so.trim() || fallbackSo;

    const finalNgay = ngay || getTodayDateString();

    // Handle status & completed date automatically
    let finalNgayHoanThanh = '';
    let finalTrangThai = '';

    if (isCompletedChoice === 'hoan_thanh') {
      finalNgayHoanThanh = ngayHoanThanh || getTodayDateString();
      finalTrangThai = computeAutoStatus('hoan_thanh', finalNgayHoanThanh, finalNgayHetHan);
    } else if (isCompletedChoice === 'khong_ap_dung') {
      finalTrangThai = 'Không áp dụng';
      finalNgayHoanThanh = '';
    } else {
      finalTrangThai = '-';
      finalNgayHoanThanh = '';
    }

    const taskData = {
      loaiVanBan,
      so: finalSo,
      ngay: finalNgay,
      donViBanHanh,
      trichYeu: cleanInlineText(trichYeu),
      noiDung: formatParagraphText(noiDung),
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
      danhSachMoc,
      canCu: '' // Will be compiled in App.tsx or combined later
    };

    if (modalType === 'add') {
      if (addTask) {
        addTask(taskData);
      }
    } else {
      if (editingIndex !== null) {
        // Update all fields for this task at once!
        updateTask(editingIndex, taskData);
      }
    }
    setIsModalOpen(false);
  };

  // Handle Delete task
  const handleDeleteTask = (idx: number, taskId: string) => {
    if (confirm(`Bạn có chắc chắn muốn xóa nhiệm vụ [${taskId}] không?`)) {
      if (deleteTask) {
        deleteTask(idx);
      }
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-slate-200 pb-5">
        <div>
          <h2 className="font-display text-2xl font-bold text-[#0f2444] tracking-wide">
            {config.sectionTitle}
          </h2>
          <p className="text-sm text-slate-500 font-medium mt-1">
            {config.sectionDescription}
          </p>
        </div>
        <div className="flex items-center gap-3 flex-wrap sm:flex-nowrap">
          {/* Điểm Mục */}
          <div className="flex items-center gap-3 bg-white px-4 py-2 border border-slate-200 rounded-xl shadow-xs">
            <Award className="w-5 h-5 text-[#a3212e]" />
            <div className="text-xs">
              <span className="text-slate-500 block font-semibold uppercase tracking-wider text-[9px]">Điểm Mục {config.sectionRoman}</span>
              <span className="font-display font-bold text-base text-[#0f2444]">
                {totalPointsScore.toFixed(1).replace('.', ',')} / {totalPointsMax.toFixed(1).replace('.', ',')} đ
              </span>
            </div>
          </div>

          {/* Thống kê Sản phẩm */}
          <div className="flex items-center gap-3 bg-white px-3.5 py-2 border border-slate-200 rounded-xl shadow-xs">
            <FileText className="w-5 h-5 text-purple-600 shrink-0" />
            <div className="text-xs">
              <span className="text-slate-500 block font-semibold uppercase tracking-wider text-[9px]">Thống kê Sản phẩm</span>
              <div className="flex items-center gap-1.5 mt-0.5">
                <button 
                  onClick={() => setFilterStatus(filterStatus === 'no_sp' ? '' : 'no_sp')}
                  className={`px-2 py-0.5 rounded-lg text-[11px] font-bold transition cursor-pointer flex items-center gap-1 ${
                    filterStatus === 'no_sp' 
                      ? 'bg-purple-700 text-white shadow-2xs' 
                      : 'bg-purple-100 text-purple-800 hover:bg-purple-200'
                  }`}
                  title="Lọc các văn bản chưa cập nhật sản phẩm"
                >
                  <span>Chưa cập nhật:</span>
                  <span className="font-mono font-extrabold">{totalNoSpCount}</span>
                </button>

                <button 
                  onClick={() => setFilterStatus(filterStatus === 'has_sp' ? '' : 'has_sp')}
                  className={`px-2 py-0.5 rounded-lg text-[11px] font-bold transition cursor-pointer flex items-center gap-1 ${
                    filterStatus === 'has_sp' 
                      ? 'bg-emerald-700 text-white shadow-2xs' 
                      : 'bg-emerald-100 text-emerald-800 hover:bg-emerald-200'
                  }`}
                  title="Lọc các văn bản đã cập nhật sản phẩm"
                >
                  <span>Đã cập nhật:</span>
                  <span className="font-mono font-extrabold">{totalHasSpCount}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Toolbar */}
      <div className="bg-white border border-slate-200 rounded-xl p-2 flex items-center gap-2 shadow-sm overflow-x-auto scrollbar-none flex-nowrap">
        {/* Search */}
        <div className="relative flex-1 min-w-[180px] shrink-0">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            className="w-full bg-slate-50 border border-slate-200 focus:border-[#a3212e] focus:bg-white text-slate-800 pl-8 pr-3 py-1.5 rounded-lg text-xs font-medium outline-none transition placeholder-slate-400"
            placeholder="Tìm kiếm..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
 
        {/* Sort dropdown */}
        <div className="relative flex-none shrink-0">
          <select
            className="bg-white border border-slate-200 text-slate-700 pl-8 pr-7 py-1.5 rounded-lg text-xs font-semibold outline-none focus:border-[#a3212e] cursor-pointer appearance-none"
            value={sortBy}
            onChange={(e: any) => setSortBy(e.target.value)}
          >
            <option value="ngayHetHan_asc">⏳ Hạn tăng</option>
            <option value="ngayHetHan_desc">⏳ Hạn giảm</option>
            <option value="ngay_desc">📅 Ban hành mới</option>
            <option value="ngay_asc">📅 Ban hành cũ</option>
          </select>
          <ArrowUpDown className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
        </div>
 
        {/* Deadline Filter */}
        <div className="relative flex-none shrink-0">
          <select
            className="bg-white border border-slate-200 text-slate-700 pl-3 pr-7 py-1.5 rounded-lg text-xs font-semibold outline-none focus:border-[#a3212e] cursor-pointer appearance-none"
            value={filterDeadline}
            onChange={(e) => setFilterDeadline(e.target.value)}
          >
            <option value="">— Tất cả hạn —</option>
            <option value="overdue">🔴 Quá hạn</option>
            <option value="nearing">🟡 Sắp đến hạn</option>
          </select>
          <Filter className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
        </div>
 
        {/* Status Filter */}
        <div className="relative flex-none shrink-0">
          <select
            className="bg-white border border-slate-200 text-slate-700 pl-3 pr-7 py-1.5 rounded-lg text-xs font-semibold outline-none focus:border-[#a3212e] cursor-pointer appearance-none max-w-[150px]"
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
          >
            <option value="">— Trạng thái —</option>
            <option value="Hoàn thành">✅ Hoàn thành</option>
            <option value="Hoàn thành trễ hạn">⚠️ Hoàn thành trễ hạn</option>
            <option value="-">- (Chưa xong)</option>
            <option value="no_sp">⚠️ SP: Chưa cập nhật ({totalNoSpCount})</option>
            <option value="has_sp">✓ SP: Đã cập nhật ({totalHasSpCount})</option>
          </select>
          <Filter className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
        </div>
 
        {/* Unit Filter */}
        <div className="relative flex-none shrink-0">
          <select
            className="bg-white border border-slate-200 text-slate-700 pl-3 pr-7 py-1.5 rounded-lg text-xs font-semibold outline-none focus:border-[#a3212e] cursor-pointer appearance-none max-w-[140px]"
            value={filterUnit}
            onChange={(e) => setFilterUnit(e.target.value)}
          >
            <option value="">— Đơn vị —</option>
            {uniqueUnits.map(u => (
              <option key={u} value={u}>{u}</option>
            ))}
          </select>
          <Filter className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
        </div>
 
        {/* Count badge */}
        <span className="bg-slate-100 text-slate-600 text-xs font-mono font-bold px-2.5 py-1.5 rounded-lg flex-none shrink-0 whitespace-nowrap">
          {filteredTasks.length}/{tasks.length} việc
        </span>
      </div>

      {/* Grid of tasks */}
      {filteredTasks.length === 0 ? (
         <div className="bg-white border border-slate-200 rounded-xl p-8 text-center text-slate-400 font-semibold text-xs">
           Không tìm thấy nhiệm vụ nào phù hợp với bộ lọc.
         </div>
      ) : viewMode === 'excel' ? (
        <ExcelTableView
          tasks={sortedTasks}
          todayISO={todayISO}
          daysUntil={daysUntil}
          updateTask={updateTask}
          onEditTask={handleOpenEditModal}
          onMarkDone={handleMarkDone}
          onDeleteTask={handleDeleteTask}
          isWorkspaceExpanded={isWorkspaceExpanded}
          onToggleExpand={onToggleExpand}
        />
      ) : (
        <div className="space-y-4">
          {sortedTasks.map((row) => {
            const targetDate = config.computeTargetDate(row);
            const statusInfo = getTaskStatusInfo(row);
            const isOverdue = targetDate && targetDate < todayISO && !statusInfo.isCompleted;
            const dLeft = targetDate ? daysUntil(targetDate) : null;
            const isDueSoon = targetDate && !isOverdue && dLeft !== null && dLeft <= 7 && !statusInfo.isCompleted;
            
            // Get score achieved
            const scoreEarned = row.diemGiao * statusInfo.scoreMultiplier;

            // Compute border decoration based on status
            let borderClass = 'border-l-slate-300';
            let cardBg = 'bg-white';

            if (statusInfo.isCompleted && !statusInfo.isLate) borderClass = 'border-l-emerald-500';
            else if (statusInfo.isCompleted && statusInfo.isLate) borderClass = 'border-l-amber-500';
            else if (isOverdue) borderClass = 'border-l-red-500';

            if (statusInfo.isCompleted) cardBg = 'bg-white';
            else if (isOverdue) cardBg = 'bg-red-50/15 border-red-200';
            else if (isDueSoon) cardBg = 'bg-amber-50/15 border-amber-200';

            return (
              <div 
                key={row.id}
                className={`${cardBg} border border-l-4 ${borderClass} rounded-xl p-3.5 shadow-2xs space-y-2.5 transition hover:shadow-md relative group`}
              >
                {/* Header Ribbon: Integrated Metadata Header */}
                <div className="flex flex-wrap items-center gap-x-2 gap-y-1.5 text-[11px] font-medium text-slate-600 bg-slate-50/80 p-2 rounded-lg border border-slate-100/80 w-full min-h-[36px]">
                  {/* ID Badge */}
                  <span className="bg-[#0f2444] text-white text-[10px] font-mono font-bold px-2 py-0.5 rounded inline-flex items-center justify-center h-5 flex-none">
                    #{row.id}
                  </span>

                  {/* Căn cứ văn bản */}
                  {(() => {
                    const docParts = [];
                    if (row.loaiVanBan) docParts.push(row.loaiVanBan);
                    if (row.so) docParts.push(`số ${row.so}`);
                    if (row.ngay) docParts.push(`ngày ${formatDateVN(row.ngay)}`);
                    const canCuText = docParts.join(' ');
                    if (!canCuText) return null;
                    return (
                      <span className="bg-slate-100 text-slate-800 text-[10px] font-bold px-2 py-0.5 rounded border border-slate-200 inline-flex items-center gap-1 h-5 flex-none">
                        <FileText className="w-3 h-3 text-slate-500 shrink-0" />
                        <span>{canCuText}</span>
                      </span>
                    );
                  })()}

                  {/* Đơn vị thực hiện */}
                  {row.donVi && (
                    <span className="text-blue-800 bg-blue-50 px-2 py-0.5 rounded border border-blue-100 font-bold inline-flex items-center gap-1 h-5 flex-none text-[10px]">
                      <Building2 className="w-3 h-3 text-blue-600 shrink-0" />
                      <span>Thực hiện: {row.donVi}</span>
                    </span>
                  )}

                  {/* Đơn vị theo dõi */}
                  {row.donViTheoDoi && (
                    <span className="text-purple-800 bg-purple-50 px-2 py-0.5 rounded border border-purple-100 font-semibold inline-flex items-center gap-1 h-5 flex-none text-[10px]">
                      <Eye className="w-3 h-3 text-purple-600 shrink-0" />
                      <span>Theo dõi: {row.donViTheoDoi}</span>
                    </span>
                  )}

                  {/* Điểm giao / Điểm đạt */}
                  <div className="ml-auto inline-flex items-center gap-1 font-mono font-bold text-[10px]">
                    <span className="bg-[#fbf5e4] text-[#a3212e] px-2 py-0.5 rounded border border-amber-200 inline-flex items-center gap-1 h-5">
                      <Award className="w-3 h-3 text-[#a3212e] shrink-0" />
                      <span>Điểm: {scoreEarned.toFixed(1).replace('.', ',')} / {row.diemGiao.toFixed(1).replace('.', ',')} đ</span>
                    </span>
                  </div>
                </div>

                {/* Unified Main Content Block with Integrated Vertical Action Column */}
                <div className="bg-slate-50/50 border border-slate-200/60 rounded-lg p-2.5 space-y-2 text-xs">
                  <div className="grid grid-cols-1 md:grid-cols-12 gap-2.5 items-stretch">
                    {/* Trích yếu văn bản */}
                    <div className="md:col-span-5">
                      <span className="font-bold text-slate-400 block uppercase text-[9px] tracking-wider mb-0.5">
                        2.5. Trích yếu văn bản
                      </span>
                      <div className="text-slate-800 font-semibold text-xs leading-snug" title={row.trichYeu}>
                        {row.trichYeu || '—'}
                      </div>
                    </div>

                    {/* Tiêu chí / Nội dung nhiệm vụ */}
                    <div className="md:col-span-6 border-t md:border-t-0 md:border-l border-slate-200/70 pt-2 md:pt-0 md:pl-2.5">
                      <span className="font-bold text-slate-400 block uppercase text-[9px] tracking-wider mb-0.5">
                        Tiêu chí / Nội dung nhiệm vụ
                      </span>
                      <div className="text-slate-800 font-semibold text-xs leading-snug whitespace-pre-line" title={row.noiDung}>
                        {row.noiDung || '—'}
                      </div>
                    </div>

                    {/* Nút Sửa (Cập nhật nhiệm vụ - Duy nhất icon bút chì) */}
                    <div className="md:col-span-1 border-t md:border-t-0 md:border-l border-slate-200/70 pt-2 md:pt-0 md:pl-2.5 flex items-center justify-start md:justify-center shrink-0">
                      <button
                        onClick={() => handleOpenEditModal(row, row.originalIndex)}
                        className="h-8 w-8 bg-slate-100 text-slate-700 hover:bg-[#0f2444] hover:text-white rounded-lg transition cursor-pointer inline-flex items-center justify-center shrink-0 border border-slate-200 shadow-3xs"
                        title="Chỉnh sửa / Cập nhật nhiệm vụ"
                      >
                        <Edit2 className="w-4 h-4 shrink-0" />
                      </button>
                    </div>
                  </div>

                  {/* Ghi chú inline if present */}
                  {row.ghiChu && (
                    <div className="pt-1.5 border-t border-slate-200/60 text-[11px] text-slate-600 flex items-start gap-1">
                      <span className="font-bold text-slate-400 uppercase text-[9px] tracking-wider shrink-0 mt-0.5">Ghi chú:</span>
                      <span className="italic font-medium text-slate-700">{row.ghiChu}</span>
                    </div>
                  )}
                </div>

                {/* Status, Deadline & Product Control Bar (Bottom Bar) */}
                <div className="flex flex-wrap items-center justify-between gap-2 pt-0.5 text-[11px]">
                  {/* Left: Thời hạn & đếm ngược */}
                  <div className="flex items-center gap-1.5 flex-wrap">
                    {(row.thoiHan || targetDate) && (
                      <div className="inline-flex items-center gap-1.5 bg-white border border-slate-200 text-slate-700 px-2.5 py-1 rounded-lg font-semibold shadow-3xs h-7">
                        <Clock className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span className="text-slate-500 font-bold">Hạn:</span>
                        <span className="font-bold text-slate-800">
                          {row.thoiHan || (targetDate ? `Trước ngày ${formatDateVN(targetDate)}` : '')}
                        </span>
                        {targetDate && (
                          <div className="inline-flex items-center gap-1 pl-1.5 border-l border-slate-200">
                            {isOverdue ? (
                              <span className="text-red-600 font-bold inline-flex items-center gap-1 bg-red-50 px-1.5 py-0.5 rounded text-[10px]">
                                <AlertTriangle className="w-3 h-3 text-red-600 shrink-0" />
                                <span>Quá {Math.abs(dLeft!)} ngày</span>
                              </span>
                            ) : dLeft === 0 ? (
                              <span className="text-amber-700 font-bold inline-flex items-center gap-1 bg-amber-50 px-1.5 py-0.5 rounded text-[10px]">
                                <Clock className="w-3 h-3 text-amber-600 shrink-0" />
                                <span>Hôm nay</span>
                              </span>
                            ) : dLeft !== null && dLeft > 0 ? (
                              <span className="text-emerald-700 font-bold inline-flex items-center gap-1 bg-emerald-50 px-1.5 py-0.5 rounded text-[10px]">
                                <Clock className="w-3 h-3 text-emerald-600 shrink-0" />
                                <span>Còn {dLeft} ngày</span>
                              </span>
                            ) : null}
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Right: Trạng thái & Sản phẩm */}
                  <div className="flex items-center gap-2 flex-wrap ml-auto">
                    {/* Trạng thái & Sản phẩm Box */}
                    <div className="inline-flex items-center gap-1.5 bg-white border border-slate-200 px-2.5 py-1 rounded-lg font-semibold shadow-3xs h-7">
                      <span className="text-slate-500 font-bold text-[10px] inline-flex items-center gap-1">Trạng thái:</span>
                      <select
                        className={`font-bold outline-none cursor-pointer bg-transparent text-[11px] leading-none ${
                          statusInfo.isLate
                            ? 'text-amber-700 font-bold'
                            : statusInfo.isCompleted
                              ? 'text-emerald-700 font-bold'
                              : 'text-slate-500'
                        }`}
                        value={statusInfo.isCompleted ? 'Hoàn thành' : '-'}
                        onChange={(e) => {
                          const val = e.target.value;
                          if (val === 'Hoàn thành') {
                            updateTask(row.originalIndex, {
                              trangThai: 'Hoàn thành',
                              ngayHoanThanh: row.ngayHoanThanh || getTodayDateString()
                            });
                            setTimeout(() => {
                              const el = document.getElementById(`product-input-${row.id}`);
                              if (el) el.focus();
                            }, 50);
                          } else {
                            updateTask(row.originalIndex, {
                              trangThai: '-',
                              ngayHoanThanh: ''
                            });
                          }
                        }}
                      >
                        <option value="Hoàn thành">Hoàn thành</option>
                        <option value="-">-</option>
                      </select>

                      {statusInfo.isCompleted && statusInfo.isLate && (
                        <span className="text-[10px] font-extrabold px-1.5 py-0.5 rounded bg-amber-100 text-amber-800 border border-amber-200 shrink-0 inline-flex items-center">
                          {statusInfo.statusText}
                        </span>
                      )}

                      <div className="inline-flex items-center gap-1 ml-1.5 pl-1.5 border-l border-slate-200">
                        <span className="text-slate-500 font-bold text-[10px] inline-flex items-center gap-1">
                          <Gift className="w-3.5 h-3.5 text-purple-600 shrink-0" />
                          <span>SP phúc đáp:</span>
                        </span>
                        <input
                          id={`product-input-${row.id}`}
                          type="text"
                          className={`bg-transparent border-b focus:border-[#a3212e] focus:bg-amber-50/80 px-1.5 py-0.5 outline-none transition text-slate-800 font-semibold w-[130px] sm:w-[170px] text-[11px] leading-tight ${
                            !hasValidProduct(row)
                              ? 'border-dashed border-purple-400 placeholder:text-purple-500 text-purple-950 focus:ring-1 focus:ring-purple-400' 
                              : 'border-transparent text-emerald-900 font-bold focus:ring-1 focus:ring-emerald-400'
                          }`}
                          placeholder="Số v/b phúc đáp, báo cáo..."
                          value={row.sanPham || ''}
                          onChange={(e) => updateTask(row.originalIndex, 'sanPham', e.target.value)}
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Milestones list if any */}
                {row.danhSachMoc && row.danhSachMoc.length > 0 && (
                  <div className="bg-sky-50/70 border border-sky-200/70 rounded-lg p-2 text-[11px] space-y-1.5 mt-1">
                    <div className="flex items-center justify-between border-b border-sky-200/50 pb-1">
                      <span className="font-extrabold text-sky-900 inline-flex items-center gap-1.5 text-[10px]">
                        <Pin className="w-3 h-3 text-sky-700 shrink-0" />
                        <span>Báo cáo định kỳ / Mốc thời hạn ({row.danhSachMoc.length} mốc)</span>
                      </span>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-1.5">
                      {row.danhSachMoc.map((moc, mIdx) => {
                        const isDone = moc.trangThai === 'Hoàn thành đúng hạn' || moc.trangThai === 'Hoàn thành trễ hạn' || moc.trangThai === 'Đã hoàn thành' || moc.trangThai === 'Hoàn thành';
                        return (
                          <div key={moc.id || mIdx} className="bg-white border border-sky-200/60 rounded p-1.5 shadow-3xs space-y-0.5">
                            <div className="flex items-center justify-between gap-1">
                              <span className="font-bold text-slate-800 text-[10px] truncate">{moc.tenMoc}</span>
                              <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded shrink-0 inline-flex items-center gap-1 ${
                                isDone ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-600'
                              }`}>
                                {isDone ? <CheckCircle className="w-2.5 h-2.5 text-emerald-600 shrink-0" /> : <Clock className="w-2.5 h-2.5 text-slate-400 shrink-0" />}
                                <span>{isDone ? 'Hoàn thành' : 'Chưa xong'}</span>
                              </span>
                            </div>
                            <div className="flex justify-between items-center text-[9px] text-slate-500 font-mono">
                              <span>Hạn: <strong className="text-slate-700">{moc.ngayHetHan}</strong></span>
                              {moc.ngayHoanThanh && <span className="text-emerald-700 font-bold">Xong: {moc.ngayHoanThanh}</span>}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* DETAILED FORM MODAL FOR ADDING/EDITING */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 animate-fade-in">
          <div className="bg-white rounded-2xl border border-slate-200 w-full max-w-6xl shadow-2xl flex flex-col max-h-[90vh]">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4 flex-none">
              <h3 className="font-display font-bold text-base text-[#0f2444] uppercase tracking-wide">
                {modalType === 'add' ? `Thêm nhiệm vụ mới (Mục ${config.sectionRoman})` : `Chỉnh sửa nhiệm vụ [${tasks[editingIndex || 0]?.id || ''}]`}
              </h3>
              <button 
                onClick={() => setIsModalOpen(false)}
                className="p-1.5 text-slate-400 hover:bg-slate-100 rounded-lg transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleSaveTask} className="overflow-y-auto p-6 space-y-5 flex-1 custom-scrollbar">
              
              {shouldFocusProduct && (
                <div className="bg-amber-50 border-2 border-amber-400 text-amber-900 rounded-xl p-3.5 text-xs font-semibold flex items-center justify-between shadow-xs animate-fade-in">
                  <div className="flex items-center gap-2.5">
                    <CheckCircle className="w-5 h-5 text-emerald-600 shrink-0" />
                    <span>Nhiệm vụ đã được chuyển trạng thái <strong>Hoàn thành</strong>. Vui lòng nhập <strong>Sản phẩm</strong> và kiểm tra <strong>Ngày hoàn thành thực tế</strong> bên dưới:</span>
                  </div>
                </div>
              )}

              {/* THREE COLUMN GRID FOR FORM SECTIONS */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 items-start">
                
                {/* COLUMN 1: SECTION I - THÔNG TIN VĂN BẢN GỐC (Document Metadata) */}
                <div className="order-1 bg-[#fcfcfc] border border-slate-200/80 rounded-xl p-4 space-y-4">
                  <span className="text-xs font-bold text-[#0f2444] tracking-wider uppercase block border-b border-slate-200/60 pb-1.5">
                    I. Thông tin văn bản gốc
                  </span>

                  {/* 1. Số, ký hiệu văn bản */}
                  <div>
                    <label className="block text-xs font-bold text-slate-600 mb-1">
                      Số, ký hiệu văn bản <span className="text-red-500">*</span>
                    </label>
                    <div className="grid grid-cols-12 gap-1 bg-white p-1 rounded-lg border-2 border-amber-400/80 focus-within:border-[#a3212e] transition shadow-sm">
                      <input
                        type="text"
                        required
                        id={`edit-${config.idPrefix}-task-so-number`}
                        tabIndex={1}
                        className="col-span-4 bg-slate-50/50 border-none text-slate-800 px-1 py-1 text-xs font-bold outline-none text-center placeholder-slate-400"
                        placeholder="Số"
                        value={soNumberOnly}
                        onChange={(e) => handleSoNumberChange(e.target.value)}
                      />
                      <div className="col-span-1 flex items-center justify-center text-slate-400 font-bold">/</div>
                      <input
                        type="text"
                        id={`edit-${config.idPrefix}-task-so-symbol`}
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
                    <label className="block text-xs font-bold text-slate-600 mb-1">
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

                  {/* 3. Đơn vị ban hành & Cấp CAT (Same row, custom width) */}
                  <div className="grid grid-cols-12 gap-2 items-end">
                    <div className="col-span-10">
                      <label className="block text-xs font-bold text-slate-600 mb-1">
                        Đơn vị ban hành <span className="text-red-500">*</span>
                      </label>
                      <DeptCombobox
                        value={selectedDeptCode}
                        onChange={handleDeptCodeChange}
                      />
                    </div>
                    <div className="col-span-2">
                      <label className="block text-xs font-bold text-slate-600 mb-1 text-center whitespace-nowrap">
                        Cấp CAT
                      </label>
                      <button
                        type="button"
                        onClick={() => handleCATToggle(!isFromCAT)}
                        className={`w-full flex items-center justify-center px-1 py-2 rounded-lg border transition cursor-pointer h-[38px] ${
                          isFromCAT
                            ? 'bg-red-50 border-red-300 text-[#a3212e] shadow-sm'
                            : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={isFromCAT}
                          onChange={() => {}} // handled by button onClick
                          className="rounded text-[#a3212e] focus:ring-[#a3212e] cursor-pointer w-4 h-4"
                        />
                      </button>
                    </div>
                  </div>

                  {selectedDeptCode === 'KHAC' && (
                    <div className="animate-fade-in">
                      <label className="block text-xs font-bold text-slate-600 mb-1">
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
                    <label className="block text-xs font-bold text-slate-600 mb-1">
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
                            tabIndex={-1}
                            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                            value={ngay}
                            onClick={(e) => { e.stopPropagation(); try { e.currentTarget.showPicker(); } catch (err) {} }}
                            onFocus={(e) => { e.stopPropagation(); try { e.currentTarget.showPicker(); } catch (err) {} }}
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
                    <label className="block text-xs font-bold text-slate-600 mb-1">
                      {config.trichYeuLabel} <span className="text-[10px] text-slate-400 font-normal">(inline - không xuống dòng)</span>
                    </label>
                    <textarea
                      rows={2}
                      tabIndex={4}
                      className="w-full bg-white border-2 border-amber-400/80 focus:border-[#a3212e] text-slate-800 px-2.5 py-1.5 rounded-lg text-xs font-medium outline-none transition resize-none overflow-hidden"
                      placeholder="Tóm tắt nội dung văn bản gốc (inline)..."
                      value={trichYeu}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') e.preventDefault();
                      }}
                      onChange={(e) => {
                        const val = cleanInlineText(e.target.value);
                        setTrichYeu(val);
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
                    <label className="block text-xs font-bold text-slate-600 mb-1">
                      {config.tieuChiLabel} <span className="text-[10px] text-slate-400 font-normal">(giữ nguyên paragraph gốc)</span>
                    </label>
                    <textarea
                      rows={4}
                      tabIndex={5}
                      className="w-full bg-white border-2 border-amber-400/80 focus:border-[#a3212e] text-slate-800 px-2.5 py-1.5 rounded-lg text-xs font-medium outline-none transition whitespace-pre-wrap resize-none overflow-hidden"
                      placeholder={config.tieuChiPlaceholder}
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
                      onBlur={(e) => {
                        const formatted = formatParagraphText(e.target.value);
                        setNoiDung(formatted);
                        e.target.style.height = 'auto';
                        e.target.style.height = `${e.target.scrollHeight}px`;
                      }}
                      ref={(el) => {
                        if (el) {
                          el.style.height = 'auto';
                          el.style.height = `${el.scrollHeight}px`;
                        }
                      }}
                    />
                  </div>

                  {/* Trạng thái công việc (Hợp nhất 1 mục dưới Tiêu chí/nội dung cần làm) */}
                  <div className="border border-slate-200 rounded-lg p-3 bg-white space-y-3">
                    <div className="flex items-center justify-between">
                      <label className="block text-xs font-bold text-slate-700">
                        Trạng thái công việc
                      </label>
                      {(() => {
                        const isDone = (trangThai === 'Hoàn thành' || trangThai === 'Hoàn thành đúng hạn' || trangThai === 'Hoàn thành trễ hạn' || trangThai === 'Đã hoàn thành');
                        if (isDone) {
                          const dummyTask: TaskBC = {
                            id: 'temp', stt: 1, canCu: '', noiDung: '', thoiHan: '', diemGiao: 0.5, donVi: '', sanPham: '',
                            trangThai: 'Hoàn thành', ngayHetHan, ngayHoanThanh
                          };
                          const info = getTaskStatusInfo(dummyTask);
                          return (
                            <span className={`text-[11px] font-extrabold px-2 py-0.5 rounded border ${
                              info.isLate
                                ? 'bg-amber-100 text-amber-800 border-amber-200'
                                : 'bg-emerald-100 text-emerald-800 border-emerald-200'
                            }`}>
                              {info.statusText}
                            </span>
                          );
                        }
                        return null;
                      })()}
                    </div>
                    <select
                      className="w-full bg-white border border-slate-200 text-slate-800 px-2.5 py-1.5 rounded-lg text-xs font-semibold outline-none focus:border-[#a3212e] cursor-pointer"
                      value={(trangThai === 'Hoàn thành' || trangThai === 'Hoàn thành đúng hạn' || trangThai === 'Hoàn thành trễ hạn' || trangThai === 'Đã hoàn thành') ? 'Hoàn thành' : '-'}
                      onChange={(e) => {
                        const val = e.target.value;
                        if (val === 'Hoàn thành') {
                          setTrangThai('Hoàn thành');
                          if (!ngayHoanThanh) {
                            const today = getTodayDateString();
                            setNgayHoanThanh(today);
                            setQuickDateHoanThanh(formatToDDMMYY(today));
                          }
                        } else {
                          setTrangThai('-');
                          setNgayHoanThanh('');
                          setQuickDateHoanThanh('');
                        }
                      }}
                    >
                      <option value="Hoàn thành">Hoàn thành</option>
                      <option value="-">-</option>
                    </select>

                    {/* Sản phẩm */}
                    <div className={shouldFocusProduct ? 'p-2.5 rounded-xl border-2 border-amber-400 bg-amber-50/60 ring-2 ring-amber-400/40 transition-all shadow-xs' : ''}>
                      <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center justify-between">
                        <span>Sản phẩm <span className="text-slate-400 font-normal text-[10px]">(nếu có sản phẩm, trạng thái sẽ tự chuyển thành hoàn thành)</span></span>
                        {shouldFocusProduct && <span className="text-[10px] text-amber-800 font-extrabold uppercase animate-pulse">👉 Nhập sản phẩm tại đây</span>}
                      </label>
                      <input
                        id="modal-san-pham-input"
                        type="text"
                        className={`w-full bg-white text-slate-800 px-2.5 py-1.5 rounded-lg text-xs font-semibold outline-none transition ${
                          shouldFocusProduct
                            ? 'border-2 border-amber-500 focus:border-[#a3212e] focus:ring-2 focus:ring-amber-300 shadow-xs'
                            : 'border border-slate-200 focus:border-[#a3212e]'
                        }`}
                        placeholder="Ví dụ: Báo cáo số 12/BC-TTH, Kế hoạch..."
                        value={sanPham}
                        onChange={(e) => {
                          const val = e.target.value;
                          setSanPham(val);
                          if (val.trim() !== '') {
                            setIsCompletedChoice('hoan_thanh');
                            if (!trangThai || trangThai === 'Chưa hoàn thành' || trangThai === '-') {
                              setTrangThai('Đã hoàn thành');
                              if (!ngayHoanThanh) {
                                const today = getTodayDateString();
                                setNgayHoanThanh(today);
                                setQuickDateHoanThanh(formatToDDMMYY(today));
                              }
                            }
                          }
                        }}
                      />
                    </div>

                    {(trangThai === 'Hoàn thành' || trangThai === 'Hoàn thành đúng hạn' || trangThai === 'Hoàn thành trễ hạn' || trangThai === 'Đã hoàn thành') && (
                      <div className={`rounded-lg p-2.5 space-y-2 animate-fade-in mt-1.5 transition-all ${
                        shouldFocusProduct 
                          ? 'bg-amber-50/80 border-2 border-amber-400 ring-2 ring-amber-400/40 shadow-xs' 
                          : 'bg-emerald-50/70 border border-emerald-200/80'
                      }`}>
                        <label className="block text-[11px] font-bold text-emerald-900 flex items-center justify-between">
                          <span>Ngày hoàn thành thực tế:</span>
                          {shouldFocusProduct && <span className="text-[10px] text-amber-800 font-extrabold uppercase">📌 Kiểm tra ngày hoàn thành</span>}
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
                            onFocus={(e) => e.target.select()}
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
                          const isLate = autoStat === 'Hoàn thành trễ hạn';
                          return (
                            <div className={`p-2 rounded text-[11px] font-bold flex items-center justify-between border ${
                              isLate 
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
                </div>

                {/* COLUMN 3: SECTION III - THỜI HẠN & THỰC HIỆN (Timing & Assignment Controls) */}
                <div className="order-3 space-y-4">
                  {/* Thời hạn yêu cầu phức tạp (Field 4) */}
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
                      baseYear={parseInt((ngay || '').substring(0, 4)) || new Date().getFullYear()}
                    />
                  </div>
                </div>

                {/* NÚT & PHẦN TRƯỜNG THÔNG TIN MỞ RỘNG TRẢI ĐỀU 3 CỘT */}
                <div className="col-span-1 lg:col-span-3 space-y-4 order-last">
                  {/* NÚT MỞ RỘNG BỔ SUNG CÁC TRƯỜNG THÔNG TIN KHÁC (Collapsible) */}
                  <div>
                    <button
                      type="button"
                      onClick={() => setIsExpanded(!isExpanded)}
                      className="w-full flex items-center justify-between p-3 bg-slate-50 border border-slate-200 hover:bg-slate-100 rounded-xl transition cursor-pointer text-xs font-bold text-slate-700"
                    >
                      <span className="flex items-center gap-1.5">
                        <Plus className={`w-3.5 h-3.5 text-[#a3212e] transition-transform duration-300 ${isExpanded ? 'rotate-45' : ''}`} />
                        {isExpanded ? 'Thu gọn thông tin bổ sung' : 'Mở rộng thông tin bổ sung (Điểm, Người thực hiện, Ghi chú...)'}
                      </span>
                      <span className="text-[10px] text-slate-400 font-mono uppercase">
                        {isExpanded ? 'Thu gọn' : 'Mở rộng'}
                      </span>
                    </button>
                  </div>

                  {/* PHẦN CÁC TRƯỜNG THÔNG TIN MỞ RỘNG */}
                  {isExpanded && (
                    <div className="border border-slate-200 rounded-xl p-4 bg-white space-y-3.5 animate-fade-in">
                      {/* Row 1: Đơn vị thực hiện */}
                      <div>
                        <label className="block text-xs font-bold text-slate-600 mb-1">
                          12. Đơn vị thực hiện
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
                        
                        {/* Custom text input if manual typing is selected */}
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

                      {/* Row 2: 6. Đơn vị được giao theo dõi & Điểm thi đua tối đa */}
                      <div className="grid grid-cols-12 gap-3.5">
                        <div className="col-span-12 sm:col-span-9">
                          <label className="block text-xs font-bold text-slate-600 mb-1">
                            6. Đơn vị được giao theo dõi
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
                          <label className="block text-xs font-bold text-slate-600 mb-1">
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

                      {/* Row 3: Giao thực hiện & Trạng thái */}

                      <div className={`grid grid-cols-1 ${config.showManualStatusOverride ? 'sm:grid-cols-2' : ''} gap-3.5`}>
                        {/* Ghi chú field (Field 9) */}
                        <div>
                          <label className="block text-xs font-bold text-slate-600 mb-1">
                            9. Ghi chú bổ sung
                          </label>
                          <input
                            type="text"
                            className="w-full bg-white border border-slate-200 focus:border-[#a3212e] text-slate-800 px-2.5 py-1.5 rounded-lg text-xs font-medium outline-none transition"
                            placeholder="Nhập ghi chú thêm..."
                            value={ghiChu}
                            onChange={(e) => setGhiChu(e.target.value)}
                          />
                        </div>

                        {/* Trạng thái (chỉ hiển thị khi cấu hình cho phép chỉnh trạng thái thủ công - hiện tại là Mục III) */}
                        {config.showManualStatusOverride && (
                          <div>
                            <label className="block text-xs font-bold text-slate-600 mb-1">
                              Trạng thái thực hiện
                            </label>
                            <select
                              className="w-full bg-white border border-slate-200 text-slate-700 px-2.5 py-1.5 rounded-lg text-xs font-semibold outline-none focus:border-[#a3212e] cursor-pointer"
                              value={trangThai}
                              onChange={(e) => setTrangThai(e.target.value as any)}
                            >
                              <option value="">— Chưa cập nhật / Chưa làm —</option>
                              {statusOptions.map(o => (
                                <option key={o} value={o}>{o}</option>
                              ))}
                            </select>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Action buttons */}
              {(() => {
                const activeEditingTask = editingIndex !== null ? tasks[editingIndex] : null;
                return (
                  <div className="flex items-center justify-between gap-3 pt-4 border-t border-slate-200 flex-none">
                    <div>
                      {modalType === 'edit' && editingIndex !== null && activeEditingTask && (
                        <button
                          type="button"
                          onClick={() => {
                            handleDeleteTask(editingIndex, activeEditingTask.id);
                            setIsModalOpen(false);
                          }}
                          className="bg-red-50 hover:bg-red-100 text-red-600 border border-red-200 px-4 py-2.5 rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer transition shadow-3xs"
                          title="Xóa vĩnh viễn nhiệm vụ này khỏi hệ thống"
                        >
                          <Trash2 className="w-4 h-4 text-red-600 shrink-0" />
                          <span>Xóa nhiệm vụ</span>
                        </button>
                      )}
                    </div>

                    <div className="flex items-center gap-3">
                      <button
                        type="button"
                        onClick={() => setIsModalOpen(false)}
                        className="bg-slate-100 hover:bg-slate-200 text-slate-700 px-5 py-2.5 rounded-xl text-xs font-bold cursor-pointer transition"
                      >
                        Hủy bỏ
                      </button>
                      <button
                        type="submit"
                        className="bg-[#a3212e] hover:bg-[#851b25] text-white px-5 py-2.5 rounded-xl text-xs font-bold flex items-center gap-2 shadow cursor-pointer transition"
                      >
                        <Save className="w-4 h-4" />
                        {modalType === 'add' ? 'Thêm nhiệm vụ' : 'Cập nhật thay đổi'}
                      </button>
                    </div>
                  </div>
                );
              })()}
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
