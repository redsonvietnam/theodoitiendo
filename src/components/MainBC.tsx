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
  HelpCircle,
  Clock,
  CheckCircle,
  LayoutGrid,
  Table,
  ArrowUpDown,
  Building2,
  Eye,
  Gift,
  AlertTriangle,
  Pin,
  Layers,
  RefreshCw,
  Tag
} from 'lucide-react';
import { TaskBC, TaskMilestone } from '../types';
import { compileCanCu, formatNgayBanHanh, isRecurringText, computeAutoStatus, cleanInlineText, formatParagraphText, getTaskNgayBanHanhTimestamp, getTaskNgayHetHanTimestamp, getTaskDeadlineISO, isTaskCompleted, hasValidProduct, getTodayDateString, getTaskStatusInfo } from '../utils/cancu';
import ExcelTableView from './ExcelTableView';
import { POLICE_DEPARTMENTS, suggestDocumentSymbol, parseDocumentNumber, formatDonViBanHanhDisplay, parseDocumentSymbolTwoWay, tryExpandShorthand, formatToDDMMYY, parseQuickDate } from '../utils/documentHelper';
import DeptCombobox from './DeptCombobox';
import MilestoneManager from './MilestoneManager';

interface MainBCProps {
  tasksB: TaskBC[];
  tasksC: TaskBC[];
  updateTaskB: (idx: number, fieldOrFields: keyof TaskBC | Partial<TaskBC>, value?: any) => void;
  updateTaskC: (idx: number, fieldOrFields: keyof TaskBC | Partial<TaskBC>, value?: any) => void;
  addTaskB?: (task: Omit<TaskBC, 'id' | 'stt'>) => void;
  addTaskC?: (task: Omit<TaskBC, 'id' | 'stt'>) => void;
  deleteTaskB?: (idx: number) => void;
  deleteTaskC?: (idx: number) => void;
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

export interface CombinedTaskItem {
  task: TaskBC;
  section: 'B' | 'C';
  originalIndex: number;
}

export default function MainBC({
  tasksB,
  tasksC,
  updateTaskB,
  updateTaskC,
  addTaskB,
  addTaskC,
  deleteTaskB,
  deleteTaskC,
  todayISO,
  daysUntil,
  onOpenGlobalAdd,
  isWorkspaceExpanded,
  onToggleExpand,
  activeEditingTaskId,
  onClearActiveEditingTaskId,
  viewMode,
  setViewMode
}: MainBCProps) {
  const [filterSection, setFilterSection] = useState<'ALL' | 'B' | 'C'>('ALL');
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterDeadline, setFilterDeadline] = useState('');
  const [filterUnit, setFilterUnit] = useState('');
  const [sortBy, setSortBy] = useState<'ngayHetHan_asc' | 'ngayHetHan_desc' | 'ngay_asc' | 'ngay_desc'>('ngayHetHan_asc');

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalType, setModalType] = useState<'add' | 'edit'>('add');
  const [targetSection, setTargetSection] = useState<'B' | 'C'>('B');
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [shouldFocusProduct, setShouldFocusProduct] = useState(false);

  // Form States
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

  const [isCompletedChoice, setIsCompletedChoice] = useState<'chua_hoan_thanh' | 'hoan_thanh' | 'khong_ap_dung'>('chua_hoan_thanh');
  const [ngayHoanThanh, setNgayHoanThanh] = useState<string>(getTodayDateString());
  const [quickDateHoanThanh, setQuickDateHoanThanh] = useState<string>(formatToDDMMYY(getTodayDateString()));

  const [gioHetHan, setGioHetHan] = useState('00:00');
  const [kieuThoiHan, setKieuThoiHan] = useState('truoc_ngay');
  const [donViTheoDoi, setDonViTheoDoi] = useState('');
  const [ghiChu, setGhiChu] = useState('');
  const [danhSachMoc, setDanhSachMoc] = useState<TaskMilestone[]>([]);

  const [isExpanded, setIsExpanded] = useState(false);
  const [soNumberOnly, setSoNumberOnly] = useState('');
  const [soSymbolOnly, setSoSymbolOnly] = useState('');
  const [selectedDeptCode, setSelectedDeptCode] = useState('');
  const [isFromCAT, setIsFromCAT] = useState(false);

  // Handle activeEditingTaskId
  useEffect(() => {
    if (activeEditingTaskId && onClearActiveEditingTaskId) {
      let foundBIdx = tasksB.findIndex(t => t.id === activeEditingTaskId);
      if (foundBIdx !== -1) {
        handleOpenEditModal(tasksB[foundBIdx], foundBIdx, 'B');
        onClearActiveEditingTaskId();
        return;
      }
      let foundCIdx = tasksC.findIndex(t => t.id === activeEditingTaskId);
      if (foundCIdx !== -1) {
        handleOpenEditModal(tasksC[foundCIdx], foundCIdx, 'C');
        onClearActiveEditingTaskId();
      }
    }
  }, [activeEditingTaskId, tasksB, tasksC, onClearActiveEditingTaskId]);

  const handleDocTypeChange = (newType: string) => {
    setLoaiVanBan(newType);
    const newSymbol = suggestDocumentSymbol(newType, selectedDeptCode, isFromCAT);
    setSoSymbolOnly(newSymbol);
    setSo(soNumberOnly ? `${soNumberOnly}${newSymbol}` : newSymbol);
  };

  const applyTwoWayParsedResult = (
    detectedLoaiVanBan: string | undefined,
    detectedIsFromCAT: boolean,
    detectedDeptCode: string | undefined
  ) => {
    if (detectedLoaiVanBan) setLoaiVanBan(detectedLoaiVanBan);
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
      if (detectedIsFromCAT) setDonViBanHanh('CAT');
    }
  };

  const handleOpenAddModal = (sec: 'B' | 'C' = 'B', focusProd = false) => {
    setModalType('add');
    setTargetSection(sec);
    setEditingIndex(null);
    setShouldFocusProduct(focusProd);
    
    setLoaiVanBan(sec === 'C' ? 'Báo cáo' : 'Kế hoạch');
    setSo('');
    setSoNumberOnly('');
    setSoSymbolOnly('');
    setSelectedDeptCode('PV01');
    setIsFromCAT(false);
    setNgay(getTodayDateString());
    setQuickDate(formatToDDMMYY(getTodayDateString()));
    setQuickDateHetHan(formatToDDMMYY(getTodayDateString()));
    setDonViBanHanh('PV01');
    setTrichYeu('');
    setNoiDung('');
    setThoiHan('');
    setDiemGiao(0.5);
    setDonVi('');
    setSanPham('');
    setNgayHetHan(getTodayDateString());
    setIsCompletedChoice('chua_hoan_thanh');
    setNgayHoanThanh(getTodayDateString());
    setQuickDateHoanThanh(formatToDDMMYY(getTodayDateString()));
    
    setGioHetHan('00:00');
    setKieuThoiHan('truoc_ngay');
    setDonViTheoDoi('Phòng Tham mưu');
    setGhiChu('');
    setDanhSachMoc([]);
    
    setIsExpanded(false);
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (task: TaskBC, index: number, sec: 'B' | 'C') => {
    setModalType('edit');
    setTargetSection(sec);
    setEditingIndex(index);
    setShouldFocusProduct(false);

    setLoaiVanBan(task.loaiVanBan || 'Kế hoạch');
    setSo(task.so || '');
    const parsed = parseDocumentNumber(task.so || '');
    setSoNumberOnly(parsed.numberOnly);
    setSoSymbolOnly(parsed.symbolOnly);
    setIsFromCAT(parsed.isFromCAT);
    setSelectedDeptCode(parsed.departmentCode || parsed.customSuffix || '');

    setNgay(task.ngay || getTodayDateString());
    setQuickDate(formatToDDMMYY(task.ngay || getTodayDateString()));
    setQuickDateHetHan(formatToDDMMYY(task.ngayHetHan || getTodayDateString()));
    setDonViBanHanh(task.donViBanHanh || '');
    setTrichYeu(task.trichYeu || '');
    setNoiDung(task.noiDung || '');
    setThoiHan(task.thoiHan || '');
    setDiemGiao(task.diemGiao ?? 0.5);
    setDonVi(task.donVi || '');
    setSanPham(task.sanPham || '');
    setNgayHetHan(task.ngayHetHan || getTodayDateString());

    const isDone = isTaskCompleted(task.trangThai || '');
    const isNa = task.trangThai === 'Không áp dụng' || task.trangThai === '-';
    
    if (isNa) {
      setIsCompletedChoice('khong_ap_dung');
    } else if (isDone) {
      setIsCompletedChoice('hoan_thanh');
    } else {
      setIsCompletedChoice('chua_hoan_thanh');
    }

    setNgayHoanThanh(task.ngayHoanThanh || getTodayDateString());
    setQuickDateHoanThanh(formatToDDMMYY(task.ngayHoanThanh || getTodayDateString()));

    setGioHetHan(task.gioHetHan || '00:00');
    setKieuThoiHan(task.kieuThoiHan || 'truoc_ngay');
    setDonViTheoDoi(task.donViTheoDoi || task.donViBanHanh || '');
    setGhiChu(task.ghiChu || '');
    setDanhSachMoc(task.danhSachMoc || []);

    setIsExpanded(Boolean(task.gioHetHan || task.donViTheoDoi || task.ghiChu || (task.danhSachMoc && task.danhSachMoc.length > 0)));
    setIsModalOpen(true);
  };

  const handleSaveTask = (e: React.FormEvent) => {
    e.preventDefault();

    let computedStatus = '';
    if (isCompletedChoice === 'khong_ap_dung') {
      computedStatus = 'Không áp dụng';
    } else if (isCompletedChoice === 'hoan_thanh') {
      computedStatus = computeAutoStatus(ngayHetHan, ngayHoanThanh);
    } else {
      computedStatus = 'Chưa hoàn thành';
    }

    const computedSymbol = soSymbolOnly ? (soSymbolOnly.startsWith('/') ? soSymbolOnly : `/${soSymbolOnly}`) : '';
    const fallbackSo = soNumberOnly ? `${soNumberOnly}${computedSymbol}` : computedSymbol;
    const finalSo = so.trim() || fallbackSo;

    const finalNgay = ngay || getTodayDateString();
    const finalNgayHetHan = ngayHetHan || getTodayDateString();

    let finalThoiHan = thoiHan.trim();
    if (!finalThoiHan) {
      finalThoiHan = compileThoiHanString(kieuThoiHan, finalNgayHetHan, gioHetHan, '');
    }

    const compiledCanCuStr = compileCanCu({
      loaiVanBan,
      so: finalSo,
      ngay: finalNgay,
      donViBanHanh,
      trichYeu
    });

    const taskData: Omit<TaskBC, 'id' | 'stt'> = {
      canCu: compiledCanCuStr,
      loaiVanBan,
      so: finalSo,
      ngay: finalNgay,
      donViBanHanh,
      trichYeu,
      noiDung,
      thoiHan: finalThoiHan,
      diemGiao: Number(diemGiao),
      donVi,
      sanPham,
      ngayHetHan: finalNgayHetHan,
      ngayHoanThanh: isCompletedChoice === 'hoan_thanh' ? ngayHoanThanh : undefined,
      trangThai: computedStatus,
      gioHetHan,
      kieuThoiHan,
      donViTheoDoi,
      ghiChu,
      danhSachMoc
    };

    if (modalType === 'add') {
      if (targetSection === 'B') {
        if (addTaskB) addTaskB(taskData);
      } else {
        if (addTaskC) addTaskC(taskData);
      }
    } else if (modalType === 'edit' && editingIndex !== null) {
      if (targetSection === 'B') {
        updateTaskB(editingIndex, taskData as Partial<TaskBC>);
      } else {
        updateTaskC(editingIndex, taskData as Partial<TaskBC>);
      }
    }

    setIsModalOpen(false);
  };

  // Combine tasks from B and C
  const combinedList: CombinedTaskItem[] = [];
  tasksB.forEach((task, index) => {
    combinedList.push({ task, section: 'B', originalIndex: index });
  });
  tasksC.forEach((task, index) => {
    combinedList.push({ task, section: 'C', originalIndex: index });
  });

  // Filter combined tasks
  const filteredList = combinedList.filter(({ task, section }) => {
    if (filterSection !== 'ALL' && section !== filterSection) return false;

    if (search.trim()) {
      const q = search.toLowerCase().trim();
      const matchCanCu = task.canCu.toLowerCase().includes(q);
      const matchSo = (task.so || '').toLowerCase().includes(q);
      const matchTrichYeu = (task.trichYeu || '').toLowerCase().includes(q);
      const matchNoiDung = task.noiDung.toLowerCase().includes(q);
      const matchDonVi = task.donVi.toLowerCase().includes(q);
      const matchSanPham = task.sanPham.toLowerCase().includes(q);
      if (!matchCanCu && !matchSo && !matchTrichYeu && !matchNoiDung && !matchDonVi && !matchSanPham) return false;
    }

    if (filterStatus) {
      if (filterStatus === 'Hoàn thành') {
        if (!isTaskCompleted(task.trangThai)) return false;
      } else if (filterStatus === 'Chưa hoàn thành') {
        if (isTaskCompleted(task.trangThai) || task.trangThai === 'Không áp dụng') return false;
      } else if (filterStatus === 'Quá hạn') {
        const info = getTaskStatusInfo(task, todayISO);
        if (info.key !== 'qua_han') return false;
      } else if (task.trangThai !== filterStatus) {
        return false;
      }
    }

    if (filterDeadline) {
      const info = getTaskStatusInfo(task, todayISO);
      if (filterDeadline === 'sap_den_han' && info.key !== 'sap_den_han') return false;
      if (filterDeadline === 'qua_han' && info.key !== 'qua_han') return false;
      if (filterDeadline === 'hom_nay' && info.key !== 'hom_nay') return false;
    }

    if (filterUnit && task.donVi !== filterUnit) return false;

    return true;
  });

  // Sort
  filteredList.sort((a, b) => {
    const tA = a.task;
    const tB = b.task;
    if (sortBy === 'ngayHetHan_asc') {
      return getTaskNgayHetHanTimestamp(tA) - getTaskNgayHetHanTimestamp(tB);
    }
    if (sortBy === 'ngayHetHan_desc') {
      return getTaskNgayHetHanTimestamp(tB) - getTaskNgayHetHanTimestamp(tA);
    }
    if (sortBy === 'ngay_asc') {
      return getTaskNgayBanHanhTimestamp(tA) - getTaskNgayBanHanhTimestamp(tB);
    }
    if (sortBy === 'ngay_desc') {
      return getTaskNgayBanHanhTimestamp(tB) - getTaskNgayBanHanhTimestamp(tA);
    }
    return 0;
  });

  // Calculate statistics
  const totalBCount = tasksB.length;
  const totalCCount = tasksC.length;
  const totalCombined = combinedList.length;

  const totalScoreB = tasksB.reduce((sum, t) => sum + (isTaskCompleted(t.trangThai) ? (t.diemGiao ?? 0.5) : 0), 0);
  const totalMaxScoreB = tasksB.reduce((sum, t) => sum + (t.diemGiao ?? 0.5), 0);
  const totalScoreC = tasksC.reduce((sum, t) => sum + (isTaskCompleted(t.trangThai) ? (t.diemGiao ?? 0.5) : 0), 0);
  const totalMaxScoreC = tasksC.reduce((sum, t) => sum + (t.diemGiao ?? 0.5), 0);

  const totalScoreCombined = totalScoreB + totalScoreC;
  const totalMaxScoreCombined = totalMaxScoreB + totalMaxScoreC;

  // Extract unique departments for filtering
  const allUnits = Array.from(new Set(combinedList.map(x => x.task.donVi).filter(Boolean)));

  return (
    <div className="space-y-4">
      {/* Clean & Compact Control Toolbar (No big hero panel) */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs space-y-3">
        <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3">
          
          {/* Section Segment Switcher */}
          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl border border-slate-200 shrink-0">
            <button
              type="button"
              onClick={() => setFilterSection('ALL')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                filterSection === 'ALL'
                  ? 'bg-[#0f2444] text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Layers className="w-3.5 h-3.5 text-amber-400" />
              <span>Tất cả II & III ({totalCombined})</span>
            </button>
            <button
              type="button"
              onClick={() => setFilterSection('B')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                filterSection === 'B'
                  ? 'bg-sky-700 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Clock className="w-3.5 h-3.5 text-sky-300" />
              <span>Mục II - Thời hạn ({totalBCount})</span>
            </button>
            <button
              type="button"
              onClick={() => setFilterSection('C')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                filterSection === 'C'
                  ? 'bg-purple-700 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <RefreshCw className="w-3.5 h-3.5 text-purple-300" />
              <span>Mục III - Thường xuyên ({totalCCount})</span>
            </button>
          </div>

          {/* Search Box */}
          <div className="relative flex-1 min-w-[220px]">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Tìm theo số, căn cứ, nội dung, đơn vị, sản phẩm..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:bg-white focus:border-[#a3212e] focus:outline-none transition"
            />
            {search && (
              <button 
                onClick={() => setSearch('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Add New Task Triggers */}
          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => handleOpenAddModal('B')}
              className="flex items-center gap-1.5 px-3 py-2 bg-sky-600 hover:bg-sky-700 text-white rounded-xl text-xs font-bold transition shadow-xs cursor-pointer active:scale-95"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>+ Thêm Mục II</span>
            </button>
            <button
              type="button"
              onClick={() => handleOpenAddModal('C')}
              className="flex items-center gap-1.5 px-3 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-bold transition shadow-xs cursor-pointer active:scale-95"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>+ Thêm Mục III</span>
            </button>
          </div>
        </div>

        {/* Secondary Filters row */}
        <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-100 text-xs">
          {/* Status Filter */}
          <div className="flex items-center gap-1.5">
            <Filter className="w-3.5 h-3.5 text-slate-400" />
            <span className="font-semibold text-slate-500">Trạng thái:</span>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="px-2.5 py-1 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium focus:bg-white focus:border-[#a3212e] outline-none"
            >
              <option value="">Tất cả trạng thái</option>
              <option value="Hoàn thành">Đã hoàn thành (Tất cả)</option>
              <option value="Hoàn thành đúng hạn">Hoàn thành đúng hạn</option>
              <option value="Hoàn thành trễ hạn">Hoàn thành trễ hạn</option>
              <option value="Chưa hoàn thành">Chưa hoàn thành</option>
              <option value="Quá hạn">Đã quá hạn</option>
              <option value="Không áp dụng">Không áp dụng</option>
            </select>
          </div>

          {/* Unit Filter */}
          {allUnits.length > 0 && (
            <div className="flex items-center gap-1.5">
              <Building2 className="w-3.5 h-3.5 text-slate-400" />
              <span className="font-semibold text-slate-500">Đơn vị:</span>
              <select
                value={filterUnit}
                onChange={(e) => setFilterUnit(e.target.value)}
                className="px-2.5 py-1 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium focus:bg-white focus:border-[#a3212e] outline-none"
              >
                <option value="">Tất cả đơn vị</option>
                {allUnits.map(u => (
                  <option key={u} value={u}>{u}</option>
                ))}
              </select>
            </div>
          )}

          {/* Score summary inline badge */}
          <div className="ml-auto flex items-center gap-2">
            <span className="text-[11px] font-semibold text-slate-500">
              Tổng điểm: <strong className="text-[#a3212e] font-mono">{totalScoreCombined.toFixed(1)} / {totalMaxScoreCombined.toFixed(1)}</strong>
            </span>

            {/* Sort By */}
            <div className="flex items-center gap-1">
              <ArrowUpDown className="w-3.5 h-3.5 text-slate-400" />
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
                className="px-2 py-1 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium focus:bg-white focus:border-[#a3212e] outline-none"
              >
                <option value="ngayHetHan_asc">Hạn chót (Tăng dần)</option>
                <option value="ngayHetHan_desc">Hạn chót (Giảm dần)</option>
                <option value="ngay_asc">Ngày văn bản (Cũ đến mới)</option>
                <option value="ngay_desc">Ngày văn bản (Mới đến cũ)</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content View (Excel vs Cards) */}
      {viewMode === 'excel' ? (
        <div className="space-y-6">
          {(filterSection === 'ALL' || filterSection === 'B') && (
            <div className="bg-white p-4 rounded-2xl border border-sky-200 shadow-sm">
              <div className="flex items-center justify-between mb-3 border-b border-sky-100 pb-2">
                <h3 className="font-bold text-sky-900 text-sm flex items-center gap-2">
                  <Clock className="w-4 h-4 text-sky-600" />
                  MỤC II • NHIỆM VỤ CÓ THỜI HẠN TRONG THÁNG
                </h3>
                <span className="text-xs font-semibold text-sky-700 bg-sky-50 px-2 py-0.5 rounded border border-sky-200">
                  {tasksB.length} nhiệm vụ
                </span>
              </div>
              <ExcelTableView
                tasks={tasksB.map((t, idx) => ({ ...t, originalIndex: idx }))}
                todayISO={todayISO}
                daysUntil={daysUntil}
                updateTask={updateTaskB}
                onEditTask={(task, idx) => handleOpenEditModal(task, idx, 'B')}
                onDeleteTask={(idx) => deleteTaskB && deleteTaskB(idx)}
                isWorkspaceExpanded={isWorkspaceExpanded}
                onToggleExpand={onToggleExpand}
              />
            </div>
          )}

          {(filterSection === 'ALL' || filterSection === 'C') && (
            <div className="bg-white p-4 rounded-2xl border border-purple-200 shadow-sm">
              <div className="flex items-center justify-between mb-3 border-b border-purple-100 pb-2">
                <h3 className="font-bold text-purple-900 text-sm flex items-center gap-2">
                  <RefreshCw className="w-4 h-4 text-purple-600" />
                  MỤC III • NHIỆM VỤ THƯỜNG XUYÊN HẰNG THÁNG
                </h3>
                <span className="text-xs font-semibold text-purple-700 bg-purple-50 px-2 py-0.5 rounded border border-purple-200">
                  {tasksC.length} nhiệm vụ
                </span>
              </div>
              <ExcelTableView
                tasks={tasksC.map((t, idx) => ({ ...t, originalIndex: idx }))}
                todayISO={todayISO}
                daysUntil={daysUntil}
                updateTask={updateTaskC}
                onEditTask={(task, idx) => handleOpenEditModal(task, idx, 'C')}
                onDeleteTask={(idx) => deleteTaskC && deleteTaskC(idx)}
                isWorkspaceExpanded={isWorkspaceExpanded}
                onToggleExpand={onToggleExpand}
              />
            </div>
          )}
        </div>
      ) : (
        /* Card Grid View */
        <div className="space-y-4">
          {filteredList.length === 0 ? (
            <div className="bg-white rounded-2xl p-8 text-center border border-slate-200 text-slate-500 shadow-xs">
              <Layers className="w-10 h-10 mx-auto text-slate-300 mb-2" />
              <p className="font-bold text-slate-700 text-sm">Không tìm thấy nhiệm vụ nào phù hợp</p>
              <p className="text-xs text-slate-500 mt-1">Thử thay đổi bộ lọc hoặc từ khóa tìm kiếm</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredList.map(({ task, section, originalIndex }) => {
                const statusInfo = getTaskStatusInfo(task, todayISO);
                const isDone = isTaskCompleted(task.trangThai);
                const updateFunc = section === 'B' ? updateTaskB : updateTaskC;
                const deleteFunc = section === 'B' ? deleteTaskB : deleteTaskC;

                return (
                  <div
                    key={`${section}-${task.id || originalIndex}`}
                    className={`bg-white rounded-2xl border transition-all duration-200 hover:shadow-md flex flex-col justify-between overflow-hidden ${
                      section === 'B' ? 'border-sky-200/80 hover:border-sky-400' : 'border-purple-200/80 hover:border-purple-400'
                    }`}
                  >
                    {/* Card Top Header */}
                    <div className="p-4 space-y-3">
                      <div className="flex items-start justify-between gap-2 border-b border-slate-100 pb-2.5">
                        {/* Section Tag */}
                        <div className="flex items-center gap-1.5 flex-wrap">
                          {section === 'B' ? (
                            <span className="bg-sky-50 text-sky-800 border border-sky-300 font-bold px-2 py-0.5 rounded text-[10px] flex items-center gap-1">
                              <Clock className="w-3 h-3 text-sky-600" />
                              Mục II • Thời hạn
                            </span>
                          ) : (
                            <span className="bg-purple-50 text-purple-800 border border-purple-300 font-bold px-2 py-0.5 rounded text-[10px] flex items-center gap-1">
                              <RefreshCw className="w-3 h-3 text-purple-600" />
                              Mục III • Thường xuyên
                            </span>
                          )}

                          {/* Status Badge */}
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${statusInfo.bgClass} ${statusInfo.colorClass}`}>
                            {statusInfo.label}
                          </span>
                        </div>

                        {/* Edit & Delete Buttons */}
                        <div className="flex items-center gap-1 flex-none">
                          <button
                            type="button"
                            onClick={() => handleOpenEditModal(task, originalIndex, section)}
                            className="p-1 text-slate-400 hover:text-sky-600 hover:bg-sky-50 rounded transition cursor-pointer"
                            title="Sửa nhiệm vụ"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              if (window.confirm('Bạn có chắc muốn xóa nhiệm vụ này?')) {
                                if (deleteFunc) deleteFunc(originalIndex);
                              }
                            }}
                            className="p-1 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded transition cursor-pointer"
                            title="Xóa nhiệm vụ"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>

                      {/* Document Basis & Content */}
                      <div className="space-y-1.5">
                        <p className="text-xs font-bold text-[#0f2444] line-clamp-2 leading-snug">
                          {task.canCu || 'Chưa khai báo căn cứ'}
                        </p>
                        <p className="text-xs text-slate-600 leading-relaxed line-clamp-3">
                          {task.noiDung}
                        </p>
                      </div>

                      {/* Product Input Section */}
                      <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200/60 space-y-1">
                        <div className="flex items-center justify-between text-[10px] text-slate-500 font-semibold">
                          <span>Sản phẩm báo cáo:</span>
                          <span className="font-mono text-slate-700">Điểm giao: {task.diemGiao ?? 0.5}</span>
                        </div>
                        <input
                          type="text"
                          value={task.sanPham || ''}
                          placeholder="Nhập tên/link sản phẩm báo cáo..."
                          onChange={(e) => updateFunc(originalIndex, 'sanPham', e.target.value)}
                          className="w-full px-2 py-1 bg-white border border-slate-200 rounded text-xs text-slate-800 font-medium focus:border-[#a3212e] focus:outline-none transition"
                        />
                      </div>

                      {/* Department & Deadline */}
                      <div className="grid grid-cols-2 gap-2 text-[11px] pt-1">
                        <div className="bg-slate-100/70 p-2 rounded-lg">
                          <span className="text-[9px] text-slate-500 block uppercase font-bold">Đơn vị</span>
                          <span className="font-semibold text-slate-800 truncate block">{task.donVi || 'Chưa gán'}</span>
                        </div>
                        <div className="bg-slate-100/70 p-2 rounded-lg">
                          <span className="text-[9px] text-slate-500 block uppercase font-bold">Thời hạn</span>
                          <span className="font-semibold text-[#a3212e] truncate block">{task.thoiHan || formatDateVN(task.ngayHetHan)}</span>
                        </div>
                      </div>
                    </div>

                    {/* Card Bottom Quick Completion Action */}
                    <div className="bg-slate-50 p-3 border-t border-slate-100 flex items-center justify-between gap-2">
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => {
                            if (isDone) {
                              updateFunc(originalIndex, 'trangThai', 'Chưa hoàn thành');
                            } else {
                              const autoSt = computeAutoStatus(task.ngayHetHan, getTodayDateString());
                              updateFunc(originalIndex, {
                                trangThai: autoSt,
                                ngayHoanThanh: getTodayDateString()
                              });
                            }
                          }}
                          className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                            isDone
                              ? 'bg-emerald-600 text-white hover:bg-emerald-700'
                              : 'bg-white border border-slate-300 text-slate-700 hover:border-slate-400'
                          }`}
                        >
                          <CheckCircle className="w-3.5 h-3.5" />
                          <span>{isDone ? 'Đã hoàn thành' : 'Đánh dấu hoàn thành'}</span>
                        </button>
                      </div>

                      <span className="text-[10px] font-mono font-semibold text-slate-400">
                        {section === 'B' ? 'Mục II' : 'Mục III'}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* MODAL ADD / EDIT TASK */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-2xl w-full p-5 sm:p-6 space-y-4 my-8">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <div>
                <h3 className="font-display font-bold text-base text-[#0f2444] uppercase tracking-wide">
                  {modalType === 'add' 
                    ? `Thêm nhiệm vụ mới (${targetSection === 'B' ? 'Mục II • Có thời hạn' : 'Mục III • Thường xuyên'})`
                    : `Chỉnh sửa nhiệm vụ (${targetSection === 'B' ? 'Mục II' : 'Mục III'})`}
                </h3>
                <p className="text-xs text-slate-500">Khai báo đầy đủ thông tin căn cứ chỉ đạo và thời hạn theo dõi</p>
              </div>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveTask} className="space-y-4 text-xs">
              
              {/* Target Section Selection if Modal Type is Add */}
              {modalType === 'add' && (
                <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 space-y-1.5">
                  <label className="font-bold text-slate-700 block">Chọn Mục lưu trữ:</label>
                  <div className="flex items-center gap-4">
                    <label className="flex items-center gap-2 cursor-pointer font-semibold text-[#0f2444]">
                      <input
                        type="radio"
                        name="targetSection"
                        checked={targetSection === 'B'}
                        onChange={() => setTargetSection('B')}
                        className="accent-[#a3212e]"
                      />
                      <span>Mục II - Nhiệm vụ có thời hạn</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer font-semibold text-purple-900">
                      <input
                        type="radio"
                        name="targetSection"
                        checked={targetSection === 'C'}
                        onChange={() => setTargetSection('C')}
                        className="accent-purple-700"
                      />
                      <span>Mục III - Nhiệm vụ định kỳ hằng tháng</span>
                    </label>
                  </div>
                </div>
              )}

              {/* Document Info Row 1 */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Loại văn bản</label>
                  <select
                    value={loaiVanBan}
                    onChange={(e) => handleDocTypeChange(e.target.value)}
                    className="w-full px-2.5 py-2 bg-slate-50 border border-slate-300 rounded-lg font-medium focus:bg-white focus:border-[#a3212e] outline-none"
                  >
                    {COMMON_DOC_TYPES.map(t => (
                      <option key={t} value={t}>{t}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="font-bold text-slate-700 block mb-1">Số / Ký hiệu</label>
                  <input
                    type="text"
                    value={so}
                    placeholder="VD: 439/KH-CAT-PV01"
                    onChange={(e) => {
                      const val = e.target.value;
                      setSo(val);
                      const parsedFull = parseDocumentNumber(val);
                      setSoNumberOnly(parsedFull.numberOnly);
                      setSoSymbolOnly(parsedFull.symbolOnly);
                      const parsedTwoWay = parseDocumentSymbolTwoWay(parsedFull.symbolOnly);
                      applyTwoWayParsedResult(parsedTwoWay.detectedLoaiVanBan, parsedTwoWay.detectedIsFromCAT, parsedTwoWay.detectedDeptCode);
                    }}
                    className="w-full px-2.5 py-2 bg-slate-50 border border-slate-300 rounded-lg font-medium focus:bg-white focus:border-[#a3212e] outline-none font-mono"
                  />
                </div>

                <div>
                  <label className="font-bold text-slate-700 block mb-1">Ngày ban hành</label>
                  <input
                    type="date"
                    value={ngay}
                    onChange={(e) => setNgay(e.target.value)}
                    className="w-full px-2.5 py-2 bg-slate-50 border border-slate-300 rounded-lg font-medium focus:bg-white focus:border-[#a3212e] outline-none"
                  />
                </div>
              </div>

              {/* Trích yếu & Căn cứ */}
              <div>
                <label className="font-bold text-slate-700 block mb-1">Trích yếu / Nội dung căn cứ</label>
                <textarea
                  rows={2}
                  value={trichYeu}
                  onChange={(e) => setTrichYeu(e.target.value)}
                  placeholder="Nhập trích yếu văn bản chỉ đạo..."
                  className="w-full px-2.5 py-2 bg-slate-50 border border-slate-300 rounded-lg font-medium focus:bg-white focus:border-[#a3212e] outline-none"
                />
              </div>

              {/* Nội dung nhiệm vụ */}
              <div>
                <label className="font-bold text-slate-700 block mb-1">
                  Nội dung chỉ đạo cụ thể <span className="text-red-500">*</span>
                </label>
                <textarea
                  rows={3}
                  required
                  value={noiDung}
                  onChange={(e) => setNoiDung(e.target.value)}
                  placeholder="Nhập chi tiết nội dung chỉ đạo thực hiện..."
                  className="w-full px-2.5 py-2 bg-slate-50 border border-slate-300 rounded-lg font-medium focus:bg-white focus:border-[#a3212e] outline-none"
                />
              </div>

              {/* Đơn vị thực hiện & Hạn chót */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Đơn vị chủ trì</label>
                  <input
                    type="text"
                    value={donVi}
                    onChange={(e) => setDonVi(e.target.value)}
                    placeholder="VD: Phòng PV01, Đội 1..."
                    className="w-full px-2.5 py-2 bg-slate-50 border border-slate-300 rounded-lg font-medium focus:bg-white focus:border-[#a3212e] outline-none"
                  />
                </div>

                <div>
                  <label className="font-bold text-slate-700 block mb-1">Hạn chót hoàn thành</label>
                  <input
                    type="date"
                    value={ngayHetHan}
                    onChange={(e) => setNgayHetHan(e.target.value)}
                    className="w-full px-2.5 py-2 bg-slate-50 border border-slate-300 rounded-lg font-medium focus:bg-white focus:border-[#a3212e] outline-none"
                  />
                </div>

                <div>
                  <label className="font-bold text-slate-700 block mb-1">Điểm giao</label>
                  <input
                    type="number"
                    step="0.1"
                    value={diemGiao}
                    onChange={(e) => setDiemGiao(parseFloat(e.target.value) || 0)}
                    className="w-full px-2.5 py-2 bg-slate-50 border border-slate-300 rounded-lg font-medium focus:bg-white focus:border-[#a3212e] outline-none"
                  />
                </div>
              </div>

              {/* Form Buttons */}
              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl transition cursor-pointer"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-[#a3212e] hover:bg-[#821a24] text-white font-bold rounded-xl transition shadow-xs cursor-pointer flex items-center gap-1.5"
                >
                  <Save className="w-4 h-4" />
                  <span>Lưu nhiệm vụ</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
