/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useRef, useState } from 'react';
import * as XLSX from 'xlsx';
import ExcelJS from 'exceljs';
import { 
  Download, 
  Upload, 
  RefreshCcw, 
  CheckCircle, 
  AlertCircle, 
  FileSpreadsheet,
  FileCode
} from 'lucide-react';
import { AppState, TaskA, TaskBC, TaskD } from '../types';
import { parseCanCu } from '../utils/cancu';

interface ExcelIOProps {
  state: AppState;
  resetToDefault: () => void;
  importState: (newState: AppState) => void;
}

export default function ExcelIO({ state, resetToDefault, importState }: ExcelIOProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [logs, setLogs] = useState<string[]>(['Sẵn sàng. Chưa có thao tác nào.']);
  const [dragActive, setDragActive] = useState(false);
  const [exportMode, setExportMode] = useState<'single' | 'split'>('single');

  // Custom export filters
  const [exportSection, setExportSection] = useState<'all' | 'B' | 'C' | 'BC' | 'A' | 'D'>('all');
  const [timeFilter, setTimeFilter] = useState<'chu_ky' | 'thang_nay' | 'custom' | 'all'>('chu_ky');
  const [customStartDate, setCustomStartDate] = useState<string>('');
  const [customEndDate, setCustomEndDate] = useState<string>('');
  const [keepUndatedTasks, setKeepUndatedTasks] = useState<boolean>(true);

  // Selected statuses (all by default)
  const [selectedStatuses, setSelectedStatuses] = useState<string[]>([
    'Hoàn thành đúng hạn',
    'Hoàn thành trễ hạn',
    'Chưa hoàn thành',
    'Không áp dụng',
    ''
  ]);

  const addLog = (msg: string) => {
    const t = new Date().toLocaleTimeString('vi-VN');
    setLogs(prev => [`[${t}] ${msg}`, ...prev]);
  };

  // Score calculators
  const pointsA = (row: TaskA) => {
    if (row.status === 'dam_bao') return row.maxPoints;
    if (row.status === 'khong_dam_bao') return 0;
    return null;
  };

  const pointsBC = (row: TaskBC) => {
    if (row.trangThai === 'Hoàn thành đúng hạn') return row.diemGiao;
    if (row.trangThai === 'Hoàn thành trễ hạn') return row.diemGiao * 0.5;
    if (row.trangThai === 'Chưa hoàn thành') return 0;
    return null;
  };

  // Helper to format date to DD/MM/YYYY
  const formatDateVN = (dateStr: string) => {
    if (!dateStr) return '';
    const parts = dateStr.split('-');
    if (parts.length === 3) {
      return `${parts[2]}/${parts[1]}/${parts[0]}`;
    }
    return dateStr;
  };

  // EXPORT EXCEL
  const handleExport = async () => {
    try {
      addLog('Đang khởi tạo công cụ định dạng Excel chuyên nghiệp...');
      const workbook = new ExcelJS.Workbook();
      
      const metaThangParts = (state.meta.thang || '7/2026').split('/');
      const thangNum = parseInt(metaThangParts[0], 10) || 7;
      const namNum = parseInt(metaThangParts[1], 10) || 2026;

      // 2. Date and status filtering helper
      const filterTaskByDateAndStatus = (task: TaskBC) => {
        // Status filter
        const statusMatch = selectedStatuses.includes(task.trangThai || '');
        if (!statusMatch) return false;

        // Date filter
        if (timeFilter === 'all') return true;

        if (!task.ngayHetHan) {
          return keepUndatedTasks;
        }

        const taskDate = new Date(task.ngayHetHan);
        if (isNaN(taskDate.getTime())) {
          return keepUndatedTasks;
        }

        if (timeFilter === 'thang_nay') {
          return taskDate.getFullYear() === namNum && (taskDate.getMonth() + 1) === thangNum;
        }

        if (timeFilter === 'chu_ky') {
          const startMonth = thangNum === 1 ? 12 : thangNum - 1;
          const startYear = thangNum === 1 ? namNum - 1 : namNum;
          const startDate = new Date(startYear, startMonth - 1, 15);
          const endDate = new Date(namNum, thangNum - 1, 14, 23, 59, 59);
          return taskDate >= startDate && taskDate <= endDate;
        }

        if (timeFilter === 'custom') {
          if (customStartDate) {
            const sD = new Date(customStartDate);
            if (taskDate < sD) return false;
          }
          if (customEndDate) {
            const eD = new Date(customEndDate);
            eD.setHours(23, 59, 59);
            if (taskDate > eD) return false;
          }
          return true;
        }

        return true;
      };

      const filterTaskD = (task: TaskD) => {
        if (task.type === 'header') return true;

        const statusMap: Record<string, string[]> = {
          'Hoàn thành đúng hạn': ['Đạt'],
          'Hoàn thành trễ hạn': ['Đạt'],
          'Chưa hoàn thành': ['Chưa đạt', 'Đang triển khai'],
          'Không áp dụng': ['Không áp dụng'],
          '': ['']
        };

        const allowedDStatuses: string[] = [];
        selectedStatuses.forEach(s => {
          if (statusMap[s]) {
            allowedDStatuses.push(...statusMap[s]);
          }
        });

        return allowedDStatuses.includes(task.trangThai || '');
      };

      // Filter and map STT sequentially
      const exportB = state.B.filter(filterTaskByDateAndStatus).map((t, idx) => ({ ...t, stt: idx + 1 }));
      const exportC = state.C.filter(filterTaskByDateAndStatus).map((t, idx) => ({ ...t, stt: idx + 1 }));
      const exportD = state.D.filter(filterTaskD);

      // Styling helper for any sheet
      const styleSheetRow = (
        wsheet: ExcelJS.Worksheet,
        rowNum: number,
        options: {
          bold?: boolean;
          size?: number;
          italic?: boolean;
          fillColor?: string; // hex color code
          horizontal?: 'center' | 'left' | 'right';
          vertical?: 'middle' | 'top' | 'bottom';
          wrapText?: boolean;
          border?: boolean;
          height?: number;
        }
      ) => {
        const row = wsheet.getRow(rowNum);
        row.height = options.height || 24;
        for (let c = 1; c <= 13; c++) {
          const cell = row.getCell(c);
          cell.font = {
            name: 'Times New Roman',
            size: options.size || 11,
            bold: !!options.bold,
            italic: !!options.italic,
          };
          cell.alignment = {
            horizontal: options.horizontal || 'center',
            vertical: options.vertical || 'middle',
            wrapText: options.wrapText !== undefined ? options.wrapText : true,
          };
          if (options.fillColor) {
            cell.fill = {
              type: 'pattern',
              pattern: 'solid',
              fgColor: { argb: 'FF' + options.fillColor.replace('#', '') },
            };
          }
          if (options.border !== false) {
            cell.border = {
              top: { style: 'thin', color: { argb: 'FFB0B0B0' } },
              left: { style: 'thin', color: { argb: 'FFB0B0B0' } },
              bottom: { style: 'thin', color: { argb: 'FFB0B0B0' } },
              right: { style: 'thin', color: { argb: 'FFB0B0B0' } },
            };
          }
        }
      };

      const colWidths = [
        { key: 'colA', width: 6 },   // TT
        { key: 'colB', width: 12 },  // Nhóm lĩnh vực công tác
        { key: 'colC', width: 22 },  // Căn cứ
        { key: 'colD', width: 45 },  // Tiêu chí / Nội dung / Yêu cầu (wrap text)
        { key: 'colE', width: 14 },  // Thời hạn / Đảm bảo
        { key: 'colF', width: 8 },   // Điểm giao
        { key: 'colG', width: 11 },  // Đơn vị theo dõi
        { key: 'colH', width: 14 },  // Sản phẩm
        { key: 'colI', width: 8 },   // Điểm đạt / Số lượng
        { key: 'colJ', width: 8 },   // Điểm chất lượng
        { key: 'colK', width: 8 },   // Điểm tiến độ
        { key: 'colL', width: 15 },  // Minh chứng / Ghi chú
        { key: 'colM', width: 12 },  // Đơn vị thực hiện
      ];

      const setupSheet = (wsheet: ExcelJS.Worksheet) => {
        wsheet.views = [{ showGridLines: true }];
        wsheet.columns = colWidths;
      };

      const colHeaders = [
        "TT", 
        "(1) Nhóm lĩnh vực công tác", 
        "(2) Căn cứ", 
        "(3) Tiêu chí/nội dung", 
        "(4) Thời hạn yêu cầu", 
        "(5) Điểm nhiệm vụ được giao", 
        "(6) Đơn vị chủ trì theo dõi", 
        "(7) Sản phẩm", 
        "(8) Điểm số lượng hoàn thành", 
        "(9) Điểm chất lượng", 
        "(10) Điểm tiến độ", 
        "(11) Minh chứng của điểm vượt mức", 
        "(12) Đơn vị thực hiện"
      ];

      const includeA = exportSection === 'all' || exportSection === 'A';
      const includeB = exportSection === 'all' || exportSection === 'B' || exportSection === 'BC';
      const includeC = exportSection === 'all' || exportSection === 'C' || exportSection === 'BC';
      const includeD = exportSection === 'all' || exportSection === 'D';

      if (exportMode === 'single') {
        const ws = workbook.addWorksheet(`Tháng ${thangNum}`);
        setupSheet(ws);
        const styleRow = (rowNum: number, options: any) => styleSheetRow(ws, rowNum, options);

        let rIdx = 1;

        // Row 1: Title (Bold, Center, Times New Roman, Size 15)
        ws.addRow([`DANH MỤC NHIỆM VỤ CÔNG TÁC THÁNG ${thangNum} ĐỐI VỚI CÔNG AN CẤP XÃ VÀ ĐỒN`]);
        ws.mergeCells(rIdx, 1, rIdx, 13);
        styleRow(rIdx, { bold: true, size: 15, border: false, height: 38, horizontal: 'center' });
        rIdx++;

        // Row 2: Spacing
        ws.addRow([]);
        styleRow(rIdx, { border: false, height: 12 });
        rIdx++;

        let sumMaxA = 0;
        let sumScoreA = 0;

        // SECTION I (MỤC I)
        if (includeA) {
          ws.addRow(["I - DANH MỤC ĐIỂM CHẤM TIÊU CHÍ CHUNG (theo Hướng dẫn số 20-HD/ĐUCA của Đảng ủy Công an Trung ương)"]);
          ws.mergeCells(rIdx, 1, rIdx, 13);
          styleRow(rIdx, { bold: true, size: 12, fillColor: 'DCE6F1', border: true, height: 28, horizontal: 'center' });
          rIdx++;

          ws.addRow([
            "STT", "", "Nội dung/Tiêu chí", "Điểm tối đa", 
            "Đảm bảo\n(đánh dấu X)", "", 
            "Không đảm bảo\n(đánh dấu X)", "", 
            "Điểm đạt (chấm tối đa nếu đảm bảo, chấm 0 điểm nếu không đảm bảo)", "", "", 
            "Đơn vị theo dõi", ""
          ]);
          ws.mergeCells(rIdx, 1, rIdx, 2);
          ws.mergeCells(rIdx, 5, rIdx, 6);
          ws.mergeCells(rIdx, 7, rIdx, 8);
          ws.mergeCells(rIdx, 9, rIdx, 11);
          ws.mergeCells(rIdx, 12, rIdx, 13);
          styleRow(rIdx, { bold: true, size: 10.5, fillColor: 'F2F2F2', height: 36 });
          rIdx++;

          state.A.forEach(r => {
            const p = pointsA(r);
            sumMaxA += r.maxPoints;
            if (p !== null) sumScoreA += p;

            ws.addRow([
              r.stt,
              "",
              r.content,
              r.maxPoints,
              r.status === 'dam_bao' ? 'X' : '',
              "",
              r.status === 'khong_dam_bao' ? 'X' : '',
              "",
              p === null ? '' : p,
              "",
              "",
              r.unit || "",
              ""
            ]);
            
            ws.mergeCells(rIdx, 1, rIdx, 2);
            ws.mergeCells(rIdx, 5, rIdx, 6);
            ws.mergeCells(rIdx, 7, rIdx, 8);
            ws.mergeCells(rIdx, 9, rIdx, 11);
            ws.mergeCells(rIdx, 12, rIdx, 13);
            styleRow(rIdx, { height: 26 });
            rIdx++;
          });

          ws.addRow([
            "", "", "TỔNG ĐIỂM", sumMaxA, "", "", "", "", sumScoreA, "", "", "", ""
          ]);
          ws.mergeCells(rIdx, 9, rIdx, 11);
          ws.mergeCells(rIdx, 12, rIdx, 13);
          styleRow(rIdx, { bold: true, size: 11, fillColor: 'F9F9F9', height: 26 });
          rIdx++;

          ws.addRow([]);
          styleRow(rIdx, { border: false, height: 12 });
          rIdx++;
        }

        // SECTION II (MỤC II - CÓ THỜI HẠN)
        let secIIStartRow = rIdx;
        let secIIEndRow = rIdx;
        if (includeB) {
          ws.addRow(["II - DANH MỤC NHIỆM VỤ CÓ THỜI HẠN HOÀN THÀNH TRONG THÁNG ĐÁNH GIÁ (15 tháng trước đến ngày 14 của tháng đánh giá)"]);
          ws.mergeCells(rIdx, 1, rIdx, 13);
          styleRow(rIdx, { bold: true, size: 12, fillColor: 'DCE6F1', border: true, height: 28, horizontal: 'center' });
          rIdx++;

          ws.addRow([]);
          styleRow(rIdx, { border: false, height: 12 });
          rIdx++;

          ws.addRow(colHeaders);
          styleRow(rIdx, { bold: true, size: 10.5, fillColor: 'F2F2F2', height: 36 });
          rIdx++;

          secIIStartRow = rIdx;
          exportB.forEach(r => {
            const showDiemSoLuong = r.diemSoLuong !== undefined ? r.diemSoLuong : (
              r.trangThai === 'Hoàn thành đúng hạn' ? r.diemGiao : (r.trangThai === 'Hoàn thành trễ hạn' ? r.diemGiao * 0.5 : '')
            );
            const showDiemChatLuong = r.diemChatLuong !== undefined ? r.diemChatLuong : '';
            const showDiemTienDo = r.diemTienDo !== undefined ? r.diemTienDo : '';

            ws.addRow([
              r.stt,
              "",
              r.canCu || "",
              r.noiDung || "",
              r.thoiHan || (r.ngayHetHan ? "Trước ngày " + formatDateVN(r.ngayHetHan) : ""),
              r.diemGiao,
              r.donViTheoDoi || r.donVi || "",
              r.sanPham || "",
              showDiemSoLuong,
              showDiemChatLuong,
              showDiemTienDo,
              r.minhChung || "",
              r.donVi || "Công an các địa phương"
            ]);
            styleRow(rIdx, { height: 28 });
            rIdx++;
          });
          secIIEndRow = rIdx - 1;
        }

        // SECTION III (MỤC III - THƯỜNG XUYÊN)
        let secIIIStartRow = rIdx;
        let secIIIEndRow = rIdx;
        if (includeC) {
          ws.addRow(["III - DANH MỤC ĐIỂM CHẤM ĐỐI VỚI NHIỆM VỤ  THỰC HIỆN THƯỜNG XUYÊN HOẶC CÓ THỜI HẠN HOÀN THÀNH CỤ THỂ VÀ PHẢI BÁO CÁO ĐỊNH KỲ HẰNG THÁNG (trừ nhiệm vụ đã thống kê ở mục B)"]);
          ws.mergeCells(rIdx, 1, rIdx, 13);
          styleRow(rIdx, { bold: true, size: 12, fillColor: 'DCE6F1', border: true, height: 28, horizontal: 'center' });
          rIdx++;

          ws.addRow(colHeaders);
          styleRow(rIdx, { bold: true, size: 10.5, fillColor: 'F2F2F2', height: 36 });
          rIdx++;

          secIIIStartRow = rIdx;
          exportC.forEach(r => {
            const showDiemSoLuong = r.diemSoLuong !== undefined ? r.diemSoLuong : (
              r.trangThai === 'Hoàn thành đúng hạn' ? r.diemGiao : (r.trangThai === 'Hoàn thành trễ hạn' ? r.diemGiao * 0.5 : '')
            );
            const showDiemChatLuong = r.diemChatLuong !== undefined ? r.diemChatLuong : '';
            const showDiemTienDo = r.diemTienDo !== undefined ? r.diemTienDo : '';

            ws.addRow([
              r.stt,
              "",
              r.canCu || "",
              r.noiDung || "",
              r.thoiHan || (r.ngayHetHan ? "Trước ngày " + formatDateVN(r.ngayHetHan) : ""),
              r.diemGiao,
              r.donViTheoDoi || r.donVi || "",
              r.sanPham || "",
              showDiemSoLuong,
              showDiemChatLuong,
              showDiemTienDo,
              r.minhChung || "",
              r.donVi || "Công an các địa phương"
            ]);
            styleRow(rIdx, { height: 28 });
            rIdx++;
          });
          secIIIEndRow = rIdx - 1;
        }

        // SECTION IV (MỤC IV - QĐ 11)
        if (includeD) {
          ws.addRow(["IV.   DANH MỤC CHỈ TIÊU THỰC HIỆN THEO QUYẾT ĐỊNH SỐ 11/QĐ-CAT-PV01-TMCS NGÀY 16/02/2026 CỦA CÔNG AN TỈNH "]);
          ws.mergeCells(rIdx, 1, rIdx, 13);
          styleRow(rIdx, { bold: true, size: 12, fillColor: 'DCE6F1', border: true, height: 28, horizontal: 'center' });
          rIdx++;

          ws.addRow(colHeaders);
          styleRow(rIdx, { bold: true, size: 10.5, fillColor: 'F2F2F2', height: 36 });
          rIdx++;

          exportD.forEach(r => {
            if (r.type === 'header') {
              ws.addRow([r.title, "", "", "", "", "", "", "", "", "", "", "", ""]);
              ws.mergeCells(rIdx, 1, rIdx, 13);
              styleRow(rIdx, { bold: true, size: 11, fillColor: 'F5F5F5', height: 26, horizontal: 'center' });
              rIdx++;
              return;
            }

            ws.addRow([
              r.stt,
              "",
              r.content || "",
              r.yeuCau || "",
              "Ngày 16 hằng tháng",
              25,
              r.donVi || "",
              "",
              r.trangThai || "",
              "",
              "",
              r.ghiChu || "",
              "Công an các địa phương"
            ]);
            styleRow(rIdx, { height: 28 });
            rIdx++;
          });
        }

        // Total row calculations and formatting
        const totalScoreB = includeB ? exportB.reduce((s, r) => s + (pointsBC(r) || 0), 0) : 0;
        const totalScoreC = includeC ? exportC.reduce((s, r) => s + (pointsBC(r) || 0), 0) : 0;
        const totalGiaoB = includeB ? exportB.reduce((s, r) => s + r.diemGiao, 0) : 0;
        const totalGiaoC = includeC ? exportC.reduce((s, r) => s + r.diemGiao, 0) : 0;
        const totalAchieved = totalScoreB + totalScoreC;
        const scoreA = includeA ? state.A.reduce((s, r) => s + (pointsA(r) || 0), 0) : 0;
        const totalKPI = scoreA + totalAchieved;

        if (includeB || includeC) {
          ws.addRow([
            "", "", "TỔNG ĐIỂM", "", "", 
            totalGiaoB + totalGiaoC, 
            "", "", 
            totalAchieved, 
            0, 
            0, 
            "", ""
          ]);
          styleRow(rIdx, { bold: true, size: 11, fillColor: 'F2F2F2', height: 28 });
          rIdx++;
        }

        // Row: KPI score row
        ws.addRow([
          "Tổng điểm KPI = ", "", "", "", "", totalKPI, "", "", "", "", "", "", ""
        ]);
        ws.mergeCells(rIdx, 1, rIdx, 5);
        ws.mergeCells(rIdx, 6, rIdx, 13);
        styleRow(rIdx, { bold: true, size: 11.5, fillColor: 'DCE6F1', height: 30, horizontal: 'center' });
        rIdx++;

        // Row: Classification score row
        ws.addRow([
          "Tổng điểm dùng trong đánh giá, xếp loại tập thể = ", "", "", "", "", totalKPI, "", "", "", "", "", "", ""
        ]);
        ws.mergeCells(rIdx, 1, rIdx, 5);
        ws.mergeCells(rIdx, 6, rIdx, 13);
        styleRow(rIdx, { bold: true, size: 11.5, fillColor: 'DCE6F1', height: 30, horizontal: 'center' });
        rIdx++;
      } else {
        // --- SPLIT EXPORT MODE ---
        addLog('Đang xuất file Excel phân chia theo trang tính riêng biệt...');

        const totalScoreB = exportB.reduce((s, r) => s + (pointsBC(r) || 0), 0);
        const totalGiaoB = exportB.reduce((s, r) => s + r.diemGiao, 0);
        const totalScoreC = exportC.reduce((s, r) => s + (pointsBC(r) || 0), 0);
        const totalGiaoC = exportC.reduce((s, r) => s + r.diemGiao, 0);
        const datD = exportD.filter(r => r.type !== 'header' && r.trangThai === 'Đạt').length;
        const totalD = exportD.filter(r => r.type !== 'header').length;

        let sumMaxA = 0;
        let sumScoreA = 0;
        state.A.forEach(r => {
          const p = pointsA(r);
          sumMaxA += r.maxPoints;
          if (p !== null) sumScoreA += p;
        });

        // 1. SHEET TỔNG HỢP CHUNG
        const wsS = workbook.addWorksheet('Tổng hợp');
        setupSheet(wsS);
        let rS = 1;

        wsS.addRow([`DANH MỤC NHIỆM VỤ CÔNG TÁC THÁNG ${thangNum} ĐỐI VỚI CÔNG AN CẤP XÃ VÀ ĐỒN`]);
        wsS.mergeCells(rS, 1, rS, 13);
        styleSheetRow(wsS, rS, { bold: true, size: 15, border: false, height: 38, horizontal: 'center' });
        rS++;

        wsS.addRow([`BÁO CÁO TỔNG HỢP KẾT QUẢ ĐÁNH GIÁ CHẤM ĐIỂM`]);
        wsS.mergeCells(rS, 1, rS, 13);
        styleSheetRow(wsS, rS, { bold: true, size: 12, border: false, height: 24, horizontal: 'center' });
        rS++;

        wsS.addRow([]);
        styleSheetRow(wsS, rS, { border: false, height: 12 });
        rS++;

        wsS.addRow(["BẢNG TỰ CHẤM ĐIỂM THEO CHUYÊN MỤC CÔNG TÁC:"]);
        wsS.mergeCells(rS, 1, rS, 13);
        styleSheetRow(wsS, rS, { bold: true, size: 11, border: false, height: 24, horizontal: 'left' });
        rS++;

        wsS.addRow(["STT", "Chuyên mục đánh giá", "Nội dung tóm tắt", "Số lượng chỉ tiêu", "Điểm tối đa / Giao", "Điểm tự chấm đạt", "", "", "", "", "", "Ghi chú", ""]);
        wsS.mergeCells(rS, 2, rS, 3);
        wsS.mergeCells(rS, 6, rS, 11);
        wsS.mergeCells(rS, 12, rS, 13);
        styleSheetRow(wsS, rS, { bold: true, size: 10.5, fillColor: 'F2F2F2', height: 28 });
        rS++;

        let sttCounter = 1;
        if (includeA) {
          wsS.addRow([`${sttCounter++}`, "Mục I: Tiêu chí chung", "Tiêu chí theo Hướng dẫn số 20-HD/ĐUCA", `${state.A.length}`, sumMaxA, sumScoreA, "", "", "", "", "", "Chi tiết tại Sheet 'I. Tiêu chí chung'", ""]);
          wsS.mergeCells(rS, 2, rS, 3);
          wsS.mergeCells(rS, 6, rS, 11);
          wsS.mergeCells(rS, 12, rS, 13);
          styleSheetRow(wsS, rS, { height: 26 });
          rS++;
        }

        if (includeB) {
          wsS.addRow([`${sttCounter++}`, "Mục II: Nhiệm vụ có thời hạn", "Nhiệm vụ hoàn thành trong tháng", `${exportB.length}`, totalGiaoB, totalScoreB, "", "", "", "", "", "Chi tiết tại Sheet 'II. Có thời hạn'", ""]);
          wsS.mergeCells(rS, 2, rS, 3);
          wsS.mergeCells(rS, 6, rS, 11);
          wsS.mergeCells(rS, 12, rS, 13);
          styleSheetRow(wsS, rS, { height: 26 });
          rS++;
        }

        if (includeC) {
          wsS.addRow([`${sttCounter++}`, "Mục III: Nhiệm vụ thường xuyên", "Báo cáo định kỳ hằng tháng", `${exportC.length}`, totalGiaoC, totalScoreC, "", "", "", "", "", "Chi tiết tại Sheet 'III. Thường xuyên'", ""]);
          wsS.mergeCells(rS, 2, rS, 3);
          wsS.mergeCells(rS, 6, rS, 11);
          wsS.mergeCells(rS, 12, rS, 13);
          styleSheetRow(wsS, rS, { height: 26 });
          rS++;
        }

        if (includeD) {
          wsS.addRow([`${sttCounter++}`, "Mục IV: Chỉ tiêu QĐ 11", "Chỉ tiêu theo Quyết định số 11/QĐ-CAT-PV01-TMCS", `${totalD}`, "25 điểm giao", `${datD}/${totalD} đạt`, "", "", "", "", "", "Chi tiết tại Sheet 'IV. Chỉ tiêu QĐ 11'", ""]);
          wsS.mergeCells(rS, 2, rS, 3);
          wsS.mergeCells(rS, 6, rS, 11);
          wsS.mergeCells(rS, 12, rS, 13);
          styleSheetRow(wsS, rS, { height: 26 });
          rS++;
        }

        wsS.addRow([]);
        styleSheetRow(wsS, rS, { border: false, height: 16 });
        rS++;

        const activeKPI = (includeA ? sumScoreA : 0) + (includeB ? totalScoreB : 0) + (includeC ? totalScoreC : 0);

        wsS.addRow(["Tổng điểm KPI tự chấm =", "", "", "", "", activeKPI, "", "", "", "", "", "", ""]);
        wsS.mergeCells(rS, 1, rS, 5);
        wsS.mergeCells(rS, 6, rS, 13);
        styleSheetRow(wsS, rS, { bold: true, size: 11.5, fillColor: 'DCE6F1', height: 32, horizontal: 'center' });
        rS++;

        // 2. SHEET MỤC I - TIÊU CHÍ CHUNG
        if (includeA) {
          const ws1 = workbook.addWorksheet('I. Tiêu chí chung');
          setupSheet(ws1);
          let r1 = 1;

          ws1.addRow([`DANH MỤC NHIỆM VỤ CÔNG TÁC THÁNG ${thangNum} ĐỐI VỚI CÔNG AN CẤP XÃ VÀ ĐỒN`]);
          ws1.mergeCells(r1, 1, r1, 13);
          styleSheetRow(ws1, r1, { bold: true, size: 14, border: false, height: 38, horizontal: 'center' });
          r1++;

          ws1.addRow(["I - DANH MỤC ĐIỂM CHẤM TIÊU CHÍ CHUNG (theo Hướng dẫn số 20-HD/ĐUCA của Đảng ủy Công an Trung ương)"]);
          ws1.mergeCells(r1, 1, r1, 13);
          styleSheetRow(ws1, r1, { bold: true, size: 12, fillColor: 'DCE6F1', border: true, height: 28, horizontal: 'center' });
          r1++;

          ws1.addRow([
            "STT", "", "Nội dung/Tiêu chí", "Điểm tối đa", 
            "Đảm bảo\n(đánh dấu X)", "", 
            "Không đảm bảo\n(đánh dấu X)", "", 
            "Điểm đạt (chấm tối đa nếu đảm bảo, chấm 0 điểm nếu không đảm bảo)", "", "", 
            "Đơn vị theo dõi", ""
          ]);
          ws1.mergeCells(r1, 1, r1, 2);
          ws1.mergeCells(r1, 5, r1, 6);
          ws1.mergeCells(r1, 7, r1, 8);
          ws1.mergeCells(r1, 9, r1, 11);
          ws1.mergeCells(r1, 12, r1, 13);
          styleSheetRow(ws1, r1, { bold: true, size: 10.5, fillColor: 'F2F2F2', height: 36 });
          r1++;

          state.A.forEach(r => {
            const p = pointsA(r);
            ws1.addRow([
              r.stt,
              "",
              r.content,
              r.maxPoints,
              r.status === 'dam_bao' ? 'X' : '',
              "",
              r.status === 'khong_dam_bao' ? 'X' : '',
              "",
              p === null ? '' : p,
              "",
              "",
              r.unit || "",
              ""
            ]);
            ws1.mergeCells(r1, 1, r1, 2);
            ws1.mergeCells(r1, 5, r1, 6);
            ws1.mergeCells(r1, 7, r1, 8);
            ws1.mergeCells(r1, 9, r1, 11);
            ws1.mergeCells(r1, 12, r1, 13);
            styleSheetRow(ws1, r1, { height: 26 });
            r1++;
          });

          ws1.addRow([
            "", "", "TỔNG ĐIỂM MỤC I", sumMaxA, "", "", "", "", sumScoreA, "", "", "", ""
          ]);
          ws1.mergeCells(r1, 9, r1, 11);
          ws1.mergeCells(r1, 12, r1, 13);
          styleSheetRow(ws1, r1, { bold: true, size: 11, fillColor: 'F9F9F9', height: 26 });
        }

        // 3. SHEET MỤC II - CÓ THỜI HẠN
        if (includeB) {
          const ws2 = workbook.addWorksheet('II. Có thời hạn');
          setupSheet(ws2);
          let r2 = 1;

          ws2.addRow([`DANH MỤC NHIỆM VỤ CÔNG TÁC THÁNG ${thangNum} ĐỐI VỚI CÔNG AN CẤP XÃ VÀ ĐỒN`]);
          ws2.mergeCells(r2, 1, r2, 13);
          styleSheetRow(ws2, r2, { bold: true, size: 14, border: false, height: 38, horizontal: 'center' });
          r2++;

          ws2.addRow(["II - DANH MỤC NHIỆM VỤ CÓ THỜI HẠN HOÀN THÀNH TRONG THÁNG ĐÁNH GIÁ (15 tháng trước đến ngày 14 của tháng đánh giá)"]);
          ws2.mergeCells(r2, 1, r2, 13);
          styleSheetRow(ws2, r2, { bold: true, size: 12, fillColor: 'DCE6F1', border: true, height: 28, horizontal: 'center' });
          r2++;

          ws2.addRow(colHeaders);
          styleSheetRow(ws2, r2, { bold: true, size: 10.5, fillColor: 'F2F2F2', height: 36 });
          r2++;

          const startB = r2;
          exportB.forEach(r => {
            const showDiemSoLuong = r.diemSoLuong !== undefined ? r.diemSoLuong : (
              r.trangThai === 'Hoàn thành đúng hạn' ? r.diemGiao : (r.trangThai === 'Hoàn thành trễ hạn' ? r.diemGiao * 0.5 : '')
            );
            const showDiemChatLuong = r.diemChatLuong !== undefined ? r.diemChatLuong : '';
            const showDiemTienDo = r.diemTienDo !== undefined ? r.diemTienDo : '';

            ws2.addRow([
              r.stt,
              "",
              r.canCu || "",
              r.noiDung || "",
              r.thoiHan || (r.ngayHetHan ? "Trước ngày " + formatDateVN(r.ngayHetHan) : ""),
              r.diemGiao,
              r.donViTheoDoi || r.donVi || "",
              r.sanPham || "",
              showDiemSoLuong,
              showDiemChatLuong,
              showDiemTienDo,
              r.minhChung || "",
              r.donVi || "Công an các địa phương"
            ]);
            styleSheetRow(ws2, r2, { height: 28 });
            r2++;
          });
          const endB = r2 - 1;

          ws2.addRow([
            "", "", "TỔNG ĐIỂM MỤC II", "", "", 
            { formula: `SUM(F${startB}:F${endB})`, result: totalGiaoB }, 
            "", "", 
            { formula: `SUM(I${startB}:I${endB})`, result: totalScoreB }, 
            { formula: `SUM(J${startB}:J${endB})`, result: 0 }, 
            { formula: `SUM(K${startB}:K${endB})`, result: 0 }, 
            "", ""
          ]);
          styleSheetRow(ws2, r2, { bold: true, size: 11, fillColor: 'F2F2F2', height: 28 });
        }

        // 4. SHEET MỤC III - THƯỜNG XUYÊN
        if (includeC) {
          const ws3 = workbook.addWorksheet('III. Thường xuyên');
          setupSheet(ws3);
          let r3 = 1;

          ws3.addRow([`DANH MỤC NHIỆM VỤ CÔNG TÁC THÁNG ${thangNum} ĐỐI VỚI CÔNG AN CẤP XÃ VÀ ĐỒN`]);
          ws3.mergeCells(r3, 1, r3, 13);
          styleSheetRow(ws3, r3, { bold: true, size: 14, border: false, height: 38, horizontal: 'center' });
          r3++;

          ws3.addRow(["III - DANH MỤC ĐIỂM CHẤM ĐỐI VỚI NHIỆM VỤ THỰC HIỆN THƯỜNG XUYÊN HOẶC CÓ THỜI HẠN HOÀN THÀNH CỤ THỂ VÀ PHẢI BÁO CÁO ĐỊNH KỲ HẰNG THÁNG (trừ nhiệm vụ đã thống kê ở mục B)"]);
          ws3.mergeCells(r3, 1, r3, 13);
          styleSheetRow(ws3, r3, { bold: true, size: 12, fillColor: 'DCE6F1', border: true, height: 28, horizontal: 'center' });
          r3++;

          ws3.addRow(colHeaders);
          styleSheetRow(ws3, r3, { bold: true, size: 10.5, fillColor: 'F2F2F2', height: 36 });
          r3++;

          const startC = r3;
          exportC.forEach(r => {
            const showDiemSoLuong = r.diemSoLuong !== undefined ? r.diemSoLuong : (
              r.trangThai === 'Hoàn thành đúng hạn' ? r.diemGiao : (r.trangThai === 'Hoàn thành trễ hạn' ? r.diemGiao * 0.5 : '')
            );
            const showDiemChatLuong = r.diemChatLuong !== undefined ? r.diemChatLuong : '';
            const showDiemTienDo = r.diemTienDo !== undefined ? r.diemTienDo : '';

            ws3.addRow([
              r.stt,
              "",
              r.canCu || "",
              r.noiDung || "",
              r.thoiHan || (r.ngayHetHan ? "Trước ngày " + formatDateVN(r.ngayHetHan) : ""),
              r.diemGiao,
              r.donViTheoDoi || r.donVi || "",
              r.sanPham || "",
              showDiemSoLuong,
              showDiemChatLuong,
              showDiemTienDo,
              r.minhChung || "",
              r.donVi || "Công an các địa phương"
            ]);
            styleSheetRow(ws3, r3, { height: 28 });
            r3++;
          });
          const endC = r3 - 1;

          ws3.addRow([
            "", "", "TỔNG ĐIỂM MỤC III", "", "", 
            { formula: `SUM(F${startC}:F${endC})`, result: totalGiaoC }, 
            "", "", 
            { formula: `SUM(I${startC}:I${endC})`, result: totalScoreC }, 
            { formula: `SUM(J${startC}:J${endC})`, result: 0 }, 
            { formula: `SUM(K${startC}:K${endC})`, result: 0 }, 
            "", ""
          ]);
          styleSheetRow(ws3, r3, { bold: true, size: 11, fillColor: 'F2F2F2', height: 28 });
        }

        // 5. SHEET MỤC IV - CHỈ TIÊU QĐ 11
        if (includeD) {
          const ws4 = workbook.addWorksheet('IV. Chỉ tiêu QĐ 11');
          setupSheet(ws4);
          let r4 = 1;

          ws4.addRow([`DANH MỤC NHIỆM VỤ CÔNG TÁC THÁNG ${thangNum} ĐỐI VỚI CÔNG AN CẤP XÃ VÀ ĐỒN`]);
          ws4.mergeCells(r4, 1, r4, 13);
          styleSheetRow(ws4, r4, { bold: true, size: 14, border: false, height: 38, horizontal: 'center' });
          r4++;

          ws4.addRow(["IV. DANH MỤC CHỈ TIÊU THỰC HIỆN THEO QUYẾT ĐỊNH SỐ 11/QĐ-CAT-PV01-TMCS NGÀY 16/02/2026 CỦA CÔNG AN TỈNH"]);
          ws4.mergeCells(r4, 1, r4, 13);
          styleSheetRow(ws4, r4, { bold: true, size: 12, fillColor: 'DCE6F1', border: true, height: 28, horizontal: 'center' });
          r4++;

          ws4.addRow(colHeaders);
          styleSheetRow(ws4, r4, { bold: true, size: 10.5, fillColor: 'F2F2F2', height: 36 });
          r4++;

          exportD.forEach(r => {
            if (r.type === 'header') {
              ws4.addRow([r.title, "", "", "", "", "", "", "", "", "", "", "", ""]);
              ws4.mergeCells(r4, 1, r4, 13);
              styleSheetRow(ws4, r4, { bold: true, size: 11, fillColor: 'F5F5F5', height: 26, horizontal: 'center' });
              r4++;
              return;
            }

            ws4.addRow([
              r.stt,
              "",
              r.content || "",
              r.yeuCau || "",
              "Ngày 16 hằng tháng",
              25,
              r.donVi || "",
              "",
              r.trangThai || "",
              "",
              "",
              r.ghiChu || "",
              "Công an các địa phương"
            ]);
            styleSheetRow(ws4, r4, { height: 28 });
            r4++;
          });

          ws4.addRow([
            "", "", "TỔNG SỐ CHỈ TIÊU ĐẠT", "", "", "", "", "", `${datD}/${totalD} Đạt`, "", "", "", ""
          ]);
          styleSheetRow(ws4, r4, { bold: true, size: 11, fillColor: 'F2F2F2', height: 28 });
        }
      }

      // Save using ArrayBuffer
      const buffer = await workbook.xlsx.writeBuffer();
      const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });

      const cleanThang = (state.meta.thang || 'Thang').replace(/[\/\\]/g, '-');
      const filename = exportMode === 'single'
        ? `CA-Xa_Bao-cao_${cleanThang}.xlsx`
        : `CA-Xa_Bao-cao-chia-sheet_${cleanThang}.xlsx`;

      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      a.click();
      window.URL.revokeObjectURL(url);

      addLog(`Đã xuất file Excel định dạng chuẩn thành công (${exportMode === 'single' ? '1 Sheet' : '5 Sheets'}): ${filename}`);
    } catch (err: any) {
      console.error(err);
      addLog(`Lỗi khi xuất file Excel: ${err.message}`);
    }
  };

  // Helper to parse ISO date from various date string formats or Excel date numbers
  const extractISODate = (val: any): string | null => {
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

    // "Trước ngày DD hằng tháng" or "Ngày DD"
    const dayMatch = str.match(/ngày\s+(\d{1,2})\b/i);
    if (dayMatch) {
      const dd = dayMatch[1].padStart(2, '0');
      const now = new Date();
      const yyyy = now.getFullYear();
      const mm = String(now.getMonth() + 1).padStart(2, '0');
      return `${yyyy}-${mm}-${dd}`;
    }

    // Excel numeric date serial (e.g., 46228)
    const num = Number(str);
    if (!isNaN(num) && num > 30000 && num < 60000) {
      const dateObj = new Date(Math.round((num - 25569) * 86400 * 1000));
      if (!isNaN(dateObj.getTime())) {
        const yyyy = dateObj.getFullYear();
        const mm = String(dateObj.getMonth() + 1).padStart(2, '0');
        const dd = String(dateObj.getDate()).padStart(2, '0');
        return `${yyyy}-${mm}-${dd}`;
      }
    }

    return null;
  };

  // Helper to parse status for section B/C tasks
  const parseTrangThai = (val: any, diemGiao: number = 0.5, sanPham?: string): TaskBC['trangThai'] => {
    if (val !== undefined && val !== null && val !== '') {
      const str = String(val).trim();
      const num = parseFloat(str);

      if (!isNaN(num)) {
        if (num >= diemGiao) return 'Hoàn thành đúng hạn';
        if (num > 0) return 'Hoàn thành trễ hạn';
        if (num === 0) return 'Chưa hoàn thành';
      }

      const lower = str.toLowerCase();
      if (lower.includes('đúng hạn') || lower.includes('đã hoàn thành') || lower.includes('hoàn thành xuất sắc')) {
        return 'Hoàn thành đúng hạn';
      }
      if (lower.includes('trễ') || lower.includes('quá hạn') || lower.includes('muộn')) {
        return 'Hoàn thành trễ hạn';
      }
      if (lower.includes('chưa') || lower.includes('chưa đạt') || lower.includes('đang thực hiện')) {
        return 'Chưa hoàn thành';
      }
      if (lower.includes('không áp dụng') || lower.includes('káp')) {
        return 'Không áp dụng';
      }
    }

    if (sanPham && sanPham.trim() !== '') {
      return 'Hoàn thành đúng hạn';
    }
    return '';
  };

  // Helper to parse status for section D tasks
  const parseStatusD = (val: any): TaskD['trangThai'] => {
    if (!val) return '';
    const str = String(val).trim();
    const lower = str.toLowerCase();
    if (lower.includes('đạt') && !lower.includes('chưa')) return 'Đạt';
    if (lower.includes('chưa') || lower.includes('không đạt')) return 'Chưa đạt';
    if (lower.includes('triển khai') || lower.includes('đang')) return 'Đang triển khai';
    if (lower.includes('không áp dụng')) return 'Không áp dụng';
    return '';
  };

  // IMPORT EXCEL
  const handleImportFile = async (file: File) => {
    if (!file) return;
    addLog(`Đang đọc file Excel: ${file.name} ...`);

    try {
      const buf = await file.arrayBuffer();
      const wb = XLSX.read(buf, { type: 'array', cellDates: false });
      
      let updatedCount = 0;
      let addedCount = 0;
      const tempState = JSON.parse(JSON.stringify(state)) as AppState;

      wb.SheetNames.forEach(sheetName => {
        const cleanSheetName = sheetName.trim().toLowerCase();

        // Skip summary / dashboard sheets to prevent reading summary tables as task rows
        if (
          cleanSheetName.includes('tổng hợp') || 
          cleanSheetName.includes('summary') || 
          cleanSheetName.includes('dashboard')
        ) {
          return;
        }

        const sh = wb.Sheets[sheetName];
        if (!sh) return;

        const rows: any[][] = XLSX.utils.sheet_to_json(sh, { header: 1 });
        if (!rows || rows.length === 0) return;

        let currentSection: 'A' | 'B' | 'C' | 'D' | null = null;

        // Auto-detect section based on sheet name
        if (cleanSheetName.includes('i.') || cleanSheetName.includes('tiêu chí chung') || cleanSheetName === 'mục a') {
          currentSection = 'A';
        } else if (cleanSheetName.includes('ii.') || cleanSheetName.includes('có thời hạn') || cleanSheetName === 'mục b') {
          currentSection = 'B';
        } else if (cleanSheetName.includes('iii.') || cleanSheetName.includes('thường xuyên') || cleanSheetName === 'mục c') {
          currentSection = 'C';
        } else if (cleanSheetName.includes('iv.') || cleanSheetName.includes('chỉ tiêu') || cleanSheetName === 'mục d') {
          currentSection = 'D';
        }

        rows.forEach((r) => {
          if (!r || r.length === 0) return;

          const rowText = r.slice(0, 5).map(c => String(c || '').trim()).join(' ');

          // Section Header Detections inside row content
          if (rowText.includes('DANH MỤC ĐIỂM CHẤM TIÊU CHÍ CHUNG') || rowText.includes('I - DANH MỤC ĐIỂM CHẤM TIÊU CHÍ CHUNG')) {
            currentSection = 'A';
            return;
          }
          if (rowText.includes('DANH MỤC NHIỆM VỤ CÓ THỜI HẠN') || rowText.includes('II - DANH MỤC NHIỆM VỤ CÓ THỜI HẠN')) {
            currentSection = 'B';
            return;
          }
          if (rowText.includes('DANH MỤC ĐIỂM CHẤM ĐỐI VỚI NHIỆM VỤ') || rowText.includes('III - DANH MỤC ĐIỂM CHẤM ĐỐI VỚI NHIỆM VỤ')) {
            currentSection = 'C';
            return;
          }
          if (rowText.includes('DANH MỤC CHỈ TIÊU THỰC HIỆN THEO QUYẾT ĐỊNH SỐ 11') || rowText.includes('IV. DANH MỤC CHỈ TIÊU THỰC HIỆN') || rowText.includes('IV.   DANH MỤC CHỈ TIÊU THỰC HIỆN')) {
            currentSection = 'D';
            return;
          }

          const firstCellStr = String(r[0] || '').trim();

          // Skip header / summary rows
          if (
            rowText.includes('TỔNG ĐIỂM') || 
            rowText.includes('Tổng điểm') || 
            rowText.includes('KPI') || 
            rowText.includes('tập thể') || 
            rowText.includes('DANH MỤC NHIỆM VỤ CÔNG TÁC') ||
            rowText.includes('(1) Nhóm lĩnh vực') ||
            firstCellStr === 'TT' ||
            firstCellStr === 'STT'
          ) {
            return;
          }

          if (currentSection === 'A') {
            const stt = parseInt(firstCellStr, 10);
            if (!isNaN(stt)) {
              const targetIdx = tempState.A.findIndex(item => item.stt === stt);
              if (targetIdx !== -1) {
                if (r[2]) tempState.A[targetIdx].content = String(r[2]).trim();
                if (r[3] !== undefined && String(r[3]).trim() !== '') {
                  const maxPts = parseFloat(String(r[3]).trim());
                  if (!isNaN(maxPts)) tempState.A[targetIdx].maxPoints = maxPts;
                }
                if (r[11]) tempState.A[targetIdx].unit = String(r[11]).trim();

                const isDamBao = String(r[4] || '').trim().toUpperCase() === 'X';
                const isKhongDamBao = String(r[6] || '').trim().toUpperCase() === 'X';
                if (isDamBao) tempState.A[targetIdx].status = 'dam_bao';
                else if (isKhongDamBao) tempState.A[targetIdx].status = 'khong_dam_bao';
                else {
                  const achieved = parseFloat(String(r[8] || '').trim());
                  if (!isNaN(achieved)) {
                    if (achieved === tempState.A[targetIdx].maxPoints) tempState.A[targetIdx].status = 'dam_bao';
                    else if (achieved === 0) tempState.A[targetIdx].status = 'khong_dam_bao';
                  }
                }
                updatedCount++;
              }
            }
          } else if (currentSection === 'B' || currentSection === 'C') {
            const stt = parseInt(firstCellStr, 10);
            const noiDungVal = r[3] ? String(r[3]).trim() : '';
            const canCuVal = r[2] ? String(r[2]).trim() : '';

            if (!isNaN(stt) || noiDungVal || canCuVal) {
              const targetArr = currentSection === 'B' ? tempState.B : tempState.C;
              let targetIdx = !isNaN(stt) ? targetArr.findIndex(item => item.stt === stt) : -1;

              if (targetIdx === -1 && noiDungVal) {
                targetIdx = targetArr.findIndex(item => item.noiDung === noiDungVal);
              }

              const newCanCu = canCuVal;
              const parsedCanCu = parseCanCu(newCanCu);

              const thoiHanVal = r[4] ? String(r[4]).trim() : '';
              const extractedIso = extractISODate(thoiHanVal);

              const diemGiao = parseFloat(String(r[5] || '').trim());
              const donViTheoDoiVal = r[6] ? String(r[6]).trim() : '';
              const sanPhamVal = r[7] ? String(r[7]).trim() : '';

              const diemSoLuongVal = r[8] !== undefined && String(r[8]).trim() !== '' ? parseFloat(String(r[8]).trim()) : undefined;
              const diemChatLuongVal = r[9] !== undefined && String(r[9]).trim() !== '' ? parseFloat(String(r[9]).trim()) : undefined;
              const diemTienDoVal = r[10] !== undefined && String(r[10]).trim() !== '' ? parseFloat(String(r[10]).trim()) : undefined;
              const minhChungVal = r[11] !== undefined ? String(r[11]).trim() : '';
              const donViVal = r[12] ? String(r[12]).trim() : '';

              const computedTrangThai = parseTrangThai(
                r[8], 
                !isNaN(diemGiao) ? diemGiao : 0.5, 
                sanPhamVal
              );

              if (targetIdx !== -1) {
                const item = targetArr[targetIdx];
                if (newCanCu) {
                  item.canCu = newCanCu;
                  if (parsedCanCu.loaiVanBan) item.loaiVanBan = parsedCanCu.loaiVanBan;
                  if (parsedCanCu.so) item.so = parsedCanCu.so;
                  if (parsedCanCu.ngay) item.ngay = parsedCanCu.ngay;
                  if (parsedCanCu.donViBanHanh) item.donViBanHanh = parsedCanCu.donViBanHanh;
                  if (parsedCanCu.trichYeu) item.trichYeu = parsedCanCu.trichYeu;
                }
                if (noiDungVal) item.noiDung = noiDungVal;
                if (thoiHanVal) item.thoiHan = thoiHanVal;
                if (extractedIso) item.ngayHetHan = extractedIso;
                if (!isNaN(diemGiao)) item.diemGiao = diemGiao;
                if (donViTheoDoiVal) item.donViTheoDoi = donViTheoDoiVal;
                if (sanPhamVal) item.sanPham = sanPhamVal;
                if (donViVal) item.donVi = donViVal;
                if (diemSoLuongVal !== undefined) item.diemSoLuong = diemSoLuongVal;
                if (diemChatLuongVal !== undefined) item.diemChatLuong = diemChatLuongVal;
                if (diemTienDoVal !== undefined) item.diemTienDo = diemTienDoVal;
                if (minhChungVal) item.minhChung = minhChungVal;
                if (computedTrangThai) item.trangThai = computedTrangThai;

                updatedCount++;
              } else if (noiDungVal || canCuVal) {
                const nextStt = !isNaN(stt) ? stt : (targetArr.length + 1);
                const nextId = `${currentSection}${targetArr.length + 1}_${Date.now().toString().slice(-4)}`;
                const newItem: TaskBC = {
                  id: nextId,
                  stt: nextStt,
                  canCu: newCanCu,
                  loaiVanBan: parsedCanCu.loaiVanBan || 'Công văn',
                  so: parsedCanCu.so || '',
                  ngay: parsedCanCu.ngay || '',
                  donViBanHanh: parsedCanCu.donViBanHanh || 'CAT',
                  trichYeu: parsedCanCu.trichYeu || noiDungVal,
                  noiDung: noiDungVal || 'Nhiệm vụ từ Excel',
                  thoiHan: thoiHanVal || 'Theo yêu cầu',
                  diemGiao: !isNaN(diemGiao) ? diemGiao : 0.5,
                  donVi: donViVal || 'Công an các địa phương',
                  sanPham: sanPhamVal || '',
                  ngayHetHan: extractedIso || '2026-07-20',
                  trangThai: computedTrangThai || '',
                  donViTheoDoi: donViTheoDoiVal || parsedCanCu.donViBanHanh || 'Phòng Tham mưu',
                  diemSoLuong: diemSoLuongVal,
                  diemChatLuong: diemChatLuongVal,
                  diemTienDo: diemTienDoVal,
                  minhChung: minhChungVal
                };
                targetArr.push(newItem);
                addedCount++;
              }
            }
          } else if (currentSection === 'D') {
            const sttStr = String(r[0] || '').trim();
            const contentStr = r[2] ? String(r[2]).trim() : '';
            if (sttStr || contentStr) {
              const targetIdx = tempState.D.findIndex(item => 
                item.type === 'item' && 
                (String(item.stt).trim() === sttStr || String(item.stt).trim().padStart(2, '0') === sttStr.padStart(2, '0'))
              );
              if (targetIdx !== -1) {
                if (r[2]) tempState.D[targetIdx].content = String(r[2]).trim();
                if (r[3]) tempState.D[targetIdx].yeuCau = String(r[3]).trim();
                if (r[6]) tempState.D[targetIdx].donVi = String(r[6]).trim();
                const statusStr = parseStatusD(r[8]);
                if (statusStr) tempState.D[targetIdx].trangThai = statusStr;
                if (r[11]) tempState.D[targetIdx].ghiChu = String(r[11]).trim();
                updatedCount++;
              }
            }
          }
        });
      });

      importState(tempState);
      const addedMsg = addedCount > 0 ? `, thêm mới ${addedCount} dòng` : '';
      addLog(`Đồng bộ thành công! Đã cập nhật ${updatedCount} dòng${addedMsg} dữ liệu từ file Excel.`);
    } catch (err: any) {
      addLog(`Lỗi khi đọc file Excel: ${err.message}`);
    }

    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(true);
  };

  const handleDragLeave = () => {
    setDragActive(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleImportFile(e.dataTransfer.files[0]);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="border-b border-slate-200 pb-5">
        <h2 className="font-display text-2xl font-bold text-[#0f2444] tracking-wide">
          ĐỒNG BỘ DỮ LIỆU EXCEL HAI CHIỀU
        </h2>
        <p className="text-sm text-slate-500 font-medium mt-1">
          Nhập và xuất báo cáo dưới định dạng bảng tính Excel (.xlsx) gốc để sao lưu hoặc đồng bộ dữ liệu.
        </p>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        {/* Export Card */}
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-4">
          <div className="flex items-center gap-3 border-b border-slate-100 pb-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <Download className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-display text-sm font-bold text-[#0f2444] uppercase tracking-wider">
                Xuất file Excel báo cáo
              </h3>
              <p className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider">
                Download report worksheet
              </p>
            </div>
          </div>

          <p className="text-xs text-slate-500 font-medium leading-relaxed">
            Tạo file bảng tính Excel đầy đủ 4 mục tiêu chí (I, II, III, IV) và bảng tổng hợp điểm tự động dựa trên các trạng thái đánh giá, ngày hết hạn và ghi chú hiện tại của bạn.
          </p>

          {/* Cấu trúc Sheet Option */}
          <div className="space-y-2 mt-3 pt-1">
            <span className="text-[11px] font-bold text-slate-600 block uppercase tracking-wider">Cấu trúc trang tính khi xuất:</span>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setExportMode('single')}
                className={`p-2.5 rounded-xl border text-left transition-all duration-200 cursor-pointer flex flex-col justify-between h-22 outline-none ${
                  exportMode === 'single'
                    ? 'border-[#a3212e] bg-[#a3212e]/5 text-[#a3212e] shadow-sm'
                    : 'border-slate-200 hover:border-slate-300 text-slate-500 bg-slate-50/50'
                }`}
              >
                <span className="text-[11px] font-bold block">Gộp chung 1 Sheet</span>
                <span className="text-[9px] font-medium leading-normal text-slate-400 block mt-1">Tất cả các mục nằm chung trên một trang tính duy nhất</span>
              </button>
              <button
                type="button"
                onClick={() => setExportMode('split')}
                className={`p-2.5 rounded-xl border text-left transition-all duration-200 cursor-pointer flex flex-col justify-between h-22 outline-none ${
                  exportMode === 'split'
                    ? 'border-[#a3212e] bg-[#a3212e]/5 text-[#a3212e] shadow-sm'
                    : 'border-slate-200 hover:border-slate-300 text-slate-500 bg-slate-50/50'
                }`}
              >
                <span className="text-[11px] font-bold block">Tách thành 5 Sheet</span>
                <span className="text-[9px] font-medium leading-normal text-slate-400 block mt-1">1 trang Tổng hợp kết quả và 4 trang chi tiết từng Mục (I, II, III, IV)</span>
              </button>
            </div>
          </div>

          {/* LỌC CHUYÊN MỤC BÁO CÁO */}
          <div className="space-y-2 border-t border-slate-100 pt-4">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-slate-600 block uppercase tracking-wider">
                Chọn mục cần xuất file:
              </span>
              {exportSection === 'B' && (
                <span className="text-[10px] font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200">
                  ★ Mục theo dõi thường xuyên
                </span>
              )}
            </div>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setExportSection('all')}
                className={`p-2.5 rounded-xl border text-left transition-all duration-200 cursor-pointer flex flex-col justify-between h-16 outline-none ${
                  exportSection === 'all'
                    ? 'border-[#a3212e] bg-[#a3212e]/5 text-[#a3212e] font-bold shadow-xs'
                    : 'border-slate-200 hover:border-slate-300 text-slate-500 bg-slate-50/50'
                }`}
              >
                <span className="text-[11px] font-bold block">Tất cả các mục (I, II, III, IV)</span>
                <span className="text-[9px] font-medium leading-normal text-slate-400 block mt-0.5">Xuất đầy đủ báo cáo 4 mục</span>
              </button>

              <button
                type="button"
                onClick={() => setExportSection('B')}
                className={`p-2.5 rounded-xl border text-left transition-all duration-200 cursor-pointer flex flex-col justify-between h-16 outline-none ${
                  exportSection === 'B'
                    ? 'border-[#a3212e] bg-[#a3212e]/5 text-[#a3212e] font-bold shadow-xs'
                    : 'border-slate-200 hover:border-slate-300 text-slate-500 bg-slate-50/50'
                }`}
              >
                <span className="text-[11px] font-bold block text-emerald-700">Chỉ Mục II (Có thời hạn) ★</span>
                <span className="text-[9px] font-medium leading-normal text-slate-400 block mt-0.5">Mục thường xuyên theo dõi nhất</span>
              </button>

              <button
                type="button"
                onClick={() => setExportSection('BC')}
                className={`p-2.5 rounded-xl border text-left transition-all duration-200 cursor-pointer flex flex-col justify-between h-16 outline-none ${
                  exportSection === 'BC'
                    ? 'border-[#a3212e] bg-[#a3212e]/5 text-[#a3212e] font-bold shadow-xs'
                    : 'border-slate-200 hover:border-slate-300 text-slate-500 bg-slate-50/50'
                }`}
              >
                <span className="text-[11px] font-bold block">Mục II & Mục III</span>
                <span className="text-[9px] font-medium leading-normal text-slate-400 block mt-0.5">Việc có thời hạn & việc thường xuyên</span>
              </button>

              <button
                type="button"
                onClick={() => setExportSection('A')}
                className={`p-2.5 rounded-xl border text-left transition-all duration-200 cursor-pointer flex flex-col justify-between h-16 outline-none ${
                  exportSection === 'A'
                    ? 'border-[#a3212e] bg-[#a3212e]/5 text-[#a3212e] font-bold shadow-xs'
                    : 'border-slate-200 hover:border-slate-300 text-slate-500 bg-slate-50/50'
                }`}
              >
                <span className="text-[11px] font-bold block">Chỉ Mục I (Tiêu chí chung)</span>
                <span className="text-[9px] font-medium leading-normal text-slate-400 block mt-0.5">Tiêu chí Hướng dẫn 20-HD/ĐUCA</span>
              </button>

              <button
                type="button"
                onClick={() => setExportSection('C')}
                className={`p-2.5 rounded-xl border text-left transition-all duration-200 cursor-pointer flex flex-col justify-between h-16 outline-none ${
                  exportSection === 'C'
                    ? 'border-[#a3212e] bg-[#a3212e]/5 text-[#a3212e] font-bold shadow-xs'
                    : 'border-slate-200 hover:border-slate-300 text-slate-500 bg-slate-50/50'
                }`}
              >
                <span className="text-[11px] font-bold block">Chỉ Mục III (Thường xuyên)</span>
                <span className="text-[9px] font-medium leading-normal text-slate-400 block mt-0.5">Nhiệm vụ báo cáo định kỳ</span>
              </button>

              <button
                type="button"
                onClick={() => setExportSection('D')}
                className={`p-2.5 rounded-xl border text-left transition-all duration-200 cursor-pointer flex flex-col justify-between h-16 outline-none ${
                  exportSection === 'D'
                    ? 'border-[#a3212e] bg-[#a3212e]/5 text-[#a3212e] font-bold shadow-xs'
                    : 'border-slate-200 hover:border-slate-300 text-slate-500 bg-slate-50/50'
                }`}
              >
                <span className="text-[11px] font-bold block">Chỉ Mục IV (Chỉ tiêu QĐ 11)</span>
                <span className="text-[9px] font-medium leading-normal text-slate-400 block mt-0.5">Chỉ tiêu Công an tỉnh giao</span>
              </button>
            </div>
          </div>

          {/* LỌC THỜI GIAN NHIỆM VỤ */}
          <div className="space-y-2 border-t border-slate-100 pt-4">
            <span className="text-[11px] font-bold text-slate-600 block uppercase tracking-wider">Lọc thời gian nhiệm vụ:</span>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setTimeFilter('chu_ky')}
                className={`p-2.5 rounded-xl border text-left transition-all duration-200 cursor-pointer flex flex-col justify-between h-18 outline-none ${
                  timeFilter === 'chu_ky'
                    ? 'border-[#a3212e] bg-[#a3212e]/5 text-[#a3212e]'
                    : 'border-slate-200 hover:border-slate-300 text-slate-500 bg-slate-50/50'
                }`}
              >
                <span className="text-[11px] font-bold block">15 tháng trước - 14 tháng này</span>
                <span className="text-[9px] font-medium leading-normal text-slate-400 block mt-0.5">Chu kỳ đánh giá thường sử dụng nhất</span>
              </button>
              <button
                type="button"
                onClick={() => setTimeFilter('thang_nay')}
                className={`p-2.5 rounded-xl border text-left transition-all duration-200 cursor-pointer flex flex-col justify-between h-18 outline-none ${
                  timeFilter === 'thang_nay'
                    ? 'border-[#a3212e] bg-[#a3212e]/5 text-[#a3212e]'
                    : 'border-slate-200 hover:border-slate-300 text-slate-500 bg-slate-50/50'
                }`}
              >
                <span className="text-[11px] font-bold block">Việc trong tháng này</span>
                <span className="text-[9px] font-medium leading-normal text-slate-400 block mt-0.5">Lọc theo tháng dương lịch hiện tại</span>
              </button>
              <button
                type="button"
                onClick={() => setTimeFilter('custom')}
                className={`p-2.5 rounded-xl border text-left transition-all duration-200 cursor-pointer flex flex-col justify-between h-18 outline-none ${
                  timeFilter === 'custom'
                    ? 'border-[#a3212e] bg-[#a3212e]/5 text-[#a3212e]'
                    : 'border-slate-200 hover:border-slate-300 text-slate-500 bg-slate-50/50'
                }`}
              >
                <span className="text-[11px] font-bold block">Tùy chỉnh khoảng ngày</span>
                <span className="text-[9px] font-medium leading-normal text-slate-400 block mt-0.5">Chọn khoảng ngày bắt đầu - kết thúc</span>
              </button>
              <button
                type="button"
                onClick={() => setTimeFilter('all')}
                className={`p-2.5 rounded-xl border text-left transition-all duration-200 cursor-pointer flex flex-col justify-between h-18 outline-none ${
                  timeFilter === 'all'
                    ? 'border-[#a3212e] bg-[#a3212e]/5 text-[#a3212e]'
                    : 'border-slate-200 hover:border-slate-300 text-slate-500 bg-slate-50/50'
                }`}
              >
                <span className="text-[11px] font-bold block">Tất cả thời gian</span>
                <span className="text-[9px] font-medium leading-normal text-slate-400 block mt-0.5">Xuất toàn bộ nhiệm vụ hiện có</span>
              </button>
            </div>

            {/* Custom date range input fields */}
            {timeFilter === 'custom' && (
              <div className="grid grid-cols-2 gap-2 bg-slate-50 p-2.5 rounded-xl border border-slate-200 mt-2 animate-fadeIn">
                <div>
                  <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Từ ngày:</label>
                  <input
                    type="date"
                    value={customStartDate}
                    onChange={(e) => setCustomStartDate(e.target.value)}
                    className="w-full bg-white border border-slate-200 text-slate-700 px-2.5 py-1.5 rounded-lg text-xs outline-none focus:border-[#a3212e] transition"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Đến ngày:</label>
                  <input
                    type="date"
                    value={customEndDate}
                    onChange={(e) => setCustomEndDate(e.target.value)}
                    className="w-full bg-white border border-slate-200 text-slate-700 px-2.5 py-1.5 rounded-lg text-xs outline-none focus:border-[#a3212e] transition"
                  />
                </div>
              </div>
            )}

            {/* Checkbox keep undated tasks */}
            {timeFilter !== 'all' && (
              <label className="flex items-center gap-2 mt-2 cursor-pointer text-slate-600 hover:text-slate-900 select-none">
                <input
                  type="checkbox"
                  checked={keepUndatedTasks}
                  onChange={(e) => setKeepUndatedTasks(e.target.checked)}
                  className="rounded border-slate-300 text-[#a3212e] focus:ring-[#a3212e] w-3.5 h-3.5"
                />
                <span className="text-[11px] font-medium leading-tight">Giữ lại nhiệm vụ thường xuyên (không có ngày cố định)</span>
              </label>
            )}
          </div>

          {/* LỌC TRẠNG THÁI NHIỆM VỤ */}
          <div className="space-y-2 border-t border-slate-100 pt-4 pb-2">
            <span className="text-[11px] font-bold text-slate-600 block uppercase tracking-wider">Trạng thái nhiệm vụ xuất:</span>
            <div className="grid grid-cols-2 gap-1.5 bg-slate-50 p-2.5 rounded-xl border border-slate-200">
              {[
                { label: 'Hoàn thành đúng hạn', value: 'Hoàn thành đúng hạn' },
                { label: 'Hoàn thành trễ hạn', value: 'Hoàn thành trễ hạn' },
                { label: 'Chưa hoàn thành', value: 'Chưa hoàn thành' },
                { label: 'Không áp dụng', value: 'Không áp dụng' },
                { label: 'Mới / Chưa đánh giá', value: '' }
              ].map((st) => {
                const isChecked = selectedStatuses.includes(st.value);
                return (
                  <label
                    key={st.label}
                    className={`flex items-center gap-2 p-1.5 rounded-lg cursor-pointer transition select-none ${
                      isChecked ? 'bg-white text-[#a3212e] font-bold shadow-xs' : 'text-slate-500 hover:text-slate-950'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={isChecked}
                      onChange={() => {
                        if (isChecked) {
                          setSelectedStatuses(selectedStatuses.filter(v => v !== st.value));
                        } else {
                          setSelectedStatuses([...selectedStatuses, st.value]);
                        }
                      }}
                      className="rounded border-slate-300 text-[#a3212e] focus:ring-[#a3212e] w-3.5 h-3.5"
                    />
                    <span className="text-[11px] truncate">{st.label}</span>
                  </label>
                );
              })}
            </div>
            
            <div className="flex justify-between text-[10px] font-semibold text-slate-400 mt-1 uppercase px-1">
              <button
                type="button"
                onClick={() => setSelectedStatuses(['Hoàn thành đúng hạn', 'Hoàn thành trễ hạn', 'Chưa hoàn thành', 'Không áp dụng', ''])}
                className="hover:text-[#a3212e] transition cursor-pointer"
              >
                Chọn tất cả
              </button>
              <button
                type="button"
                onClick={() => setSelectedStatuses([])}
                className="hover:text-[#a3212e] transition cursor-pointer"
              >
                Bỏ chọn tất cả
              </button>
            </div>
          </div>

          <button
            onClick={handleExport}
            className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs px-4 py-3 rounded-xl shadow transition duration-250 flex items-center justify-center gap-2 outline-none cursor-pointer"
          >
            <FileSpreadsheet className="w-4 h-4" />
            {exportMode === 'single' ? 'Xuất file Excel (1 Sheet tổng hợp)' : 'Xuất file Excel (Phân chia 5 Sheet)'}
          </button>
        </div>

        {/* Import Card */}
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-4">
          <div className="flex items-center gap-3 border-b border-slate-100 pb-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
              <Upload className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-display text-sm font-bold text-[#0f2444] uppercase tracking-wider">
                Nhập file Excel đồng bộ
              </h3>
              <p className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider">
                Upload & Sync worksheet
              </p>
            </div>
          </div>

          <p className="text-xs text-slate-500 font-medium leading-relaxed">
            Tải lên file Excel (.xlsx) đã điền thông tin đánh giá hoặc thời hạn hoàn thành của các mục để đồng bộ dữ liệu nhanh vào phần mềm trên thiết bị này.
          </p>

          {/* Drag & Drop Area */}
          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`border-2 border-dashed rounded-xl p-6 text-center transition cursor-pointer flex flex-col items-center gap-2 ${
              dragActive 
                ? 'border-[#a3212e] bg-rose-50/10' 
                : 'border-slate-200 hover:border-[#a3212e] bg-slate-50/50'
            }`}
          >
            <Upload className="w-6 h-6 text-slate-400 group-hover:text-[#a3212e]" />
            <span className="text-xs text-slate-600 font-bold">Kéo thả file Excel vào đây hoặc click để duyệt</span>
            <span className="text-[10px] text-slate-400 font-semibold">Chấp nhận .xlsx hoặc .xls</span>
            
            <input
              type="file"
              ref={fileInputRef}
              className="hidden"
              accept=".xlsx, .xls"
              onChange={(e) => {
                if (e.target.files && e.target.files[0]) {
                  handleImportFile(e.target.files[0]);
                }
              }}
            />
          </div>
        </div>
      </div>

      {/* Sync Log Console & Restore Reset Options */}
      <div className="bg-[#0f2444] rounded-2xl p-5 shadow-lg border border-slate-800 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/10 pb-3">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
            <h3 className="font-display text-xs font-bold uppercase text-slate-200 tracking-wider">
              Bảng log tiến độ đồng bộ dữ liệu
            </h3>
          </div>
          <button
            onClick={() => {
              if (confirm('Xoá toàn bộ tiến trình đã ghi nhận, khôi phục lại bảng dữ liệu gốc ban đầu?')) {
                resetToDefault();
                addLog('Đã hoàn tác và khôi phục toàn bộ dữ liệu chỉ tiêu gốc.');
              }
            }}
            className="text-rose-400 hover:text-rose-300 text-xs font-bold flex items-center gap-1.5 transition outline-none cursor-pointer"
          >
            <RefreshCcw className="w-3.5 h-3.5" /> Khôi phục dữ liệu gốc
          </button>
        </div>

        {/* Console viewport */}
        <div className="bg-[#0c1e3a] text-emerald-400 font-mono text-[11px] p-4 rounded-xl max-h-48 overflow-y-auto whitespace-pre-line border border-slate-800/80 shadow-inner">
          {logs.join('\n')}
        </div>
      </div>
    </div>
  );
}
