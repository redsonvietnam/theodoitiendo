/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useState } from 'react';
import { TaskBC, TaskMilestone } from '../types';
import { isRecurringText } from '../utils/cancu';
import {
  POLICE_DEPARTMENTS,
  suggestDocumentSymbol,
  parseDocumentNumber,
  parseDocumentSymbolTwoWay,
  tryExpandShorthand,
  formatToDDMMYY,
} from '../utils/documentHelper';
import { getTodayDateString, formatDateVN, getDayOfDate, getDayMonthOfDate } from '../utils/dateHelpers';

const compileThoiHanString = (kieu: string, date: string, hour: string, manual: string) => {
  if (kieu === 'custom' || kieu === 'custom_c') return manual;
  if (!date) return '';
  const timeStr = hour ? ` ${hour}` : '';
  const dateVN = formatDateVN(date);
  const dayOnly = getDayOfDate(date);
  const dayMonth = getDayMonthOfDate(date);

  if (kieu === 'truoc_ngay') return `Trước${timeStr} ngày ${dateVN}`;
  if (kieu === 'truoc_ngay_hang_thang') return `Trước${timeStr} ngày ${dayOnly} hằng tháng`;
  if (kieu === 'hang_nam') return `Hằng năm trước${timeStr} ngày ${dayMonth}`;
  return `Hạn chót: ${dateVN}${timeStr}`;
};

/**
 * Owns every field and piece of automation logic behind the central "Thêm
 * nhiệm vụ" modal: document number/symbol parsing helpers, milestone list,
 * and the section B/C payload builder used on submit.
 */
export function useGlobalAddTaskForm() {
  const [isGlobalAddOpen, setIsGlobalAddOpen] = useState(false);
  const [targetSection, setTargetSection] = useState<'B' | 'C'>('B');

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

  useEffect(() => {
    if (isGlobalAddOpen) {
      setTimeout(() => {
        const input = document.getElementById('add-task-so-number');
        if (input) input.focus();
      }, 80);
    }
  }, [isGlobalAddOpen]);

  const handleCATToggle = (checked: boolean) => {
    setIsFromCAT(checked);

    const deptObj = POLICE_DEPARTMENTS.find(d => d.code === selectedDeptCode);
    if (checked) {
      setDonViBanHanh('CAT');
      if (deptObj) setDonViTheoDoi(deptObj.name);
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
        const symbolInput = document.getElementById('add-task-so-symbol') as HTMLInputElement | null;
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
        const numInput = document.getElementById('add-task-so-number') as HTMLInputElement | null;
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

  // Handle direct edits to the full "số hiệu" preview/edit field, re-parsing
  // it back into number/symbol parts and re-detecting doc type/dept/CAT.
  const handleFullSoChange = (val: string) => {
    setSo(val);
    const parsedFull = parseDocumentNumber(val);
    setSoNumberOnly(parsedFull.numberOnly);
    setSoSymbolOnly(parsedFull.symbolOnly);
    const parsedTwoWay = parseDocumentSymbolTwoWay(parsedFull.symbolOnly);
    applyTwoWayParsedResult(parsedTwoWay.detectedLoaiVanBan, parsedTwoWay.detectedIsFromCAT, parsedTwoWay.detectedDeptCode);
  };

  // Handle opening global add modal with designated default section
  const handleOpenGlobalAdd = (sec: 'B' | 'C') => {
    setTargetSection(sec);
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
    setIsGlobalAddOpen(true);
  };

  /**
   * Shapes current form fields into a Section B/C task payload, deciding
   * whether it belongs in B or C based on recurrence. Does not touch
   * app state directly — caller is expected to pass the result to
   * `addTaskBC(finalSection, payload)`.
   */
  const buildTaskPayload = (): { finalSection: 'B' | 'C'; payload: Omit<TaskBC, 'id' | 'stt'> } => {
    const finalNgayHetHan = ngayHetHan || getTodayDateString();
    const finalThoiHan = compileThoiHanString(kieuThoiHan, finalNgayHetHan, gioHetHan, thoiHan);

    let finalKieuThoiHan = kieuThoiHan;
    if (kieuThoiHan === 'custom') {
      const isRecur = isRecurringText(thoiHan);
      finalKieuThoiHan = isRecur ? 'custom_c' : 'custom';
    }

    const isRecurring = finalKieuThoiHan === 'truoc_ngay_hang_thang' || finalKieuThoiHan === 'hang_nam' || finalKieuThoiHan === 'custom_c';
    const finalSection: 'B' | 'C' = isRecurring ? 'C' : 'B';

    const computedSymbol = soSymbolOnly ? (soSymbolOnly.startsWith('/') ? soSymbolOnly : `/${soSymbolOnly}`) : '';
    const fallbackSo = soNumberOnly ? `${soNumberOnly}${computedSymbol}` : computedSymbol;
    const finalSo = so.trim() || fallbackSo;

    const finalNgay = ngay || getTodayDateString();

    const payload: Omit<TaskBC, 'id' | 'stt'> = {
      canCu: '',
      loaiVanBan,
      so: finalSo,
      ngay: finalNgay,
      donViBanHanh,
      trichYeu,
      noiDung,
      thoiHan: finalThoiHan,
      diemGiao,
      donVi,
      sanPham,
      ngayHetHan: finalNgayHetHan,
      trangThai: '' as const,
      gioHetHan,
      kieuThoiHan: finalKieuThoiHan,
      donViTheoDoi: donViTheoDoi || donViBanHanh,
      ghiChu,
      danhSachMoc: (danhSachMoc && danhSachMoc.length > 0) ? danhSachMoc : [
        {
          id: `moc_1_${Date.now()}`,
          tenMoc: 'Mốc 1',
          kieuThoiHan: finalKieuThoiHan || 'truoc_ngay',
          ngayHetHan: finalNgayHetHan,
          trangThai: 'Chưa hoàn thành'
        }
      ]
    };

    return { finalSection, payload };
  };

  return {
    isGlobalAddOpen, setIsGlobalAddOpen,
    targetSection,
    loaiVanBan, setLoaiVanBan,
    so, setSo,
    ngay, setNgay,
    quickDate, setQuickDate,
    quickDateHetHan, setQuickDateHetHan,
    donViBanHanh, setDonViBanHanh,
    trichYeu, setTrichYeu,
    noiDung, setNoiDung,
    thoiHan, setThoiHan,
    diemGiao, setDiemGiao,
    donVi, setDonVi,
    sanPham, setSanPham,
    ngayHetHan, setNgayHetHan,
    gioHetHan, setGioHetHan,
    kieuThoiHan, setKieuThoiHan,
    donViTheoDoi, setDonViTheoDoi,
    ghiChu, setGhiChu,
    danhSachMoc, setDanhSachMoc,
    isExpanded, setIsExpanded,
    soNumberOnly,
    soSymbolOnly,
    selectedDeptCode,
    isFromCAT,
    handleDocTypeChange,
    handleDeptCodeChange,
    handleCATToggle,
    handleSoNumberChange,
    handleSymbolKeyDown,
    handleSoSymbolManualChange,
    handleFullSoChange,
    handleOpenGlobalAdd,
    buildTaskPayload,
  };
}
