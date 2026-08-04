/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef, useEffect } from 'react';
import { 
  Edit2, 
  Trash2, 
  Settings2, 
  Check, 
  ChevronDown, 
  HelpCircle,
  Eye,
  EyeOff,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  MinusCircle,
  ChevronLeft,
  ChevronRight,
  Maximize2,
  Minimize2
} from 'lucide-react';
import { TaskBC } from '../types';
import { compileCanCu, computeAutoStatus, getTodayDateString, hasValidProduct, getTaskStatusInfo, isTaskCompleted } from '../utils/cancu';
import { formatDonViBanHanhDisplay } from '../utils/documentHelper';

interface ExcelTableViewProps {
  tasks: (TaskBC & { originalIndex: number })[];
  todayISO: string;
  daysUntil: (ds: string) => number | null;
  updateTask: (idx: number, fieldOrFields: keyof TaskBC | Partial<TaskBC>, value?: any) => void;
  onEditTask: (task: TaskBC, idx: number) => void;
  onMarkDone?: (task: TaskBC, idx: number) => void;
  onDeleteTask: (idx: number, taskId: string) => void;
  isWorkspaceExpanded?: boolean;
  onToggleExpand?: () => void;
}

interface ColumnConfig {
  id: string;
  label: string;
  subLabel?: string;
  colNo: string;
}

const COLUMNS: ColumnConfig[] = [
  { id: 'stt', label: 'TT', colNo: '' },
  { id: 'canCu', label: 'Căn cứ', subLabel: 'Loại, số, ngày, trích yếu', colNo: '(2)' },
  { id: 'noiDung', label: 'Tiêu chí / nội dung', subLabel: 'Nhiệm vụ chi tiết', colNo: '(3)' },
  { id: 'thoiHan', label: 'Thời hạn yêu cầu', subLabel: 'Mốc thời gian', colNo: '(4)' },
  { id: 'diemGiao', label: 'Điểm nhiệm vụ được giao', subLabel: 'Hệ số điểm', colNo: '(5)' },
  { id: 'donViTheoDoi', label: 'Đơn vị chủ trì theo dõi', subLabel: 'Chỉ huy/Đội theo dõi', colNo: '(6)' },
  { id: 'sanPham', label: 'Sản phẩm', subLabel: 'Kết quả đầu ra', colNo: '(7)' },
  { id: 'diemSoLuong', label: 'Điểm số lượng hoàn thành', subLabel: 'Số lượng đạt', colNo: '(8)' },
  { id: 'diemChatLuong', label: 'Điểm chất lượng', subLabel: 'Chất lượng đạt', colNo: '(9)' },
  { id: 'diemTienDo', label: 'Điểm tiến độ', subLabel: 'Đúng/trễ hạn', colNo: '(10)' },
  { id: 'minhChung', label: 'Minh chứng điểm vượt mức', subLabel: 'Tài liệu kèm theo', colNo: '(11)' },
  { id: 'donVi', label: 'Đơn vị thực hiện', subLabel: 'Nơi chấp hành', colNo: '(12)' },
  { id: 'trangThai', label: 'Trạng thái', subLabel: 'Đánh giá tiến độ', colNo: '' },
];

const DEFAULT_COLUMN_WIDTHS: Record<string, number> = {
  stt: 50,
  canCu: 380,
  noiDung: 340,
  thoiHan: 150,
  diemGiao: 100,
  donViTheoDoi: 150,
  sanPham: 160,
  diemSoLuong: 110,
  diemChatLuong: 100,
  diemTienDo: 100,
  minhChung: 200,
  donVi: 160,
  trangThai: 180,
  actions: 165,
};

export default function ExcelTableView({
  tasks,
  todayISO,
  daysUntil,
  updateTask,
  onEditTask,
  onMarkDone,
  onDeleteTask,
  isWorkspaceExpanded = false,
  onToggleExpand
}: ExcelTableViewProps) {
  // Column visibility state (default all true)
  const [visibleColumns, setVisibleColumns] = useState<Record<string, boolean>>({
    stt: true,
    canCu: true,
    noiDung: true,
    thoiHan: true,
    diemGiao: true,
    donViTheoDoi: true,
    sanPham: true,
    diemSoLuong: true,
    diemChatLuong: true,
    diemTienDo: true,
    minhChung: true,
    donVi: true,
    trangThai: true,
    actions: true,
  });

  // State-based Column Widths for customizable/adjustable layouts
  const [columnWidths, setColumnWidths] = useState<Record<string, number>>(() => {
    try {
      const saved = localStorage.getItem('excel_column_widths');
      if (saved) return JSON.parse(saved);
    } catch {}
    return { ...DEFAULT_COLUMN_WIDTHS };
  });

  // States for floating scroll synchronization
  const [scrollPercent, setScrollPercent] = useState<number>(0);
  const [canScroll, setCanScroll] = useState<boolean>(false);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);

  const handleTableScroll = () => {
    if (tableContainerRef.current) {
      const container = tableContainerRef.current;
      const maxScroll = container.scrollWidth - container.clientWidth;
      setCanScroll(maxScroll > 10); // True if there is significant scrollable area
      if (maxScroll > 0) {
        setScrollPercent((container.scrollLeft / maxScroll) * 100);
      } else {
        setScrollPercent(0);
      }
    }
  };

  const handleSliderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const percent = parseFloat(e.target.value);
    setScrollPercent(percent);
    if (tableContainerRef.current) {
      const container = tableContainerRef.current;
      const maxScroll = container.scrollWidth - container.clientWidth;
      container.scrollLeft = (percent / 100) * maxScroll;
    }
  };

  useEffect(() => {
    // Small timeout to allow table sizes to recalculate and render before updating scroll properties
    const timer = setTimeout(() => {
      handleTableScroll();
    }, 150);
    return () => clearTimeout(timer);
  }, [columnWidths, visibleColumns, tasks]);

  const [resizingCol, setResizingCol] = useState<string | null>(null);
  const startWidthRef = useRef<number>(0);
  const startMouseXRef = useRef<number>(0);

  const handleResizeStart = (colId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    setResizingCol(colId);
    startWidthRef.current = columnWidths[colId] || 100;
    startMouseXRef.current = e.clientX;

    const handleResizeMove = (moveEvent: MouseEvent) => {
      const deltaX = moveEvent.clientX - startMouseXRef.current;
      const newWidth = Math.max(50, startWidthRef.current + deltaX);
      setColumnWidths(prev => {
        const updated = { ...prev, [colId]: newWidth };
        try {
          localStorage.setItem('excel_column_widths', JSON.stringify(updated));
        } catch {}
        return updated;
      });
    };

    const handleResizeEnd = () => {
      setResizingCol(null);
      window.removeEventListener('mousemove', handleResizeMove);
      window.removeEventListener('mouseup', handleResizeEnd);
    };

    window.addEventListener('mousemove', handleResizeMove);
    window.addEventListener('mouseup', handleResizeEnd);
  };

  const renderResizeHandle = (colId: string) => (
    <div
      onMouseDown={(e) => handleResizeStart(colId, e)}
      className="absolute right-0 top-0 bottom-0 w-2.5 cursor-col-resize hover:bg-[#a3212e]/60 active:bg-[#a3212e] transition-colors z-20 flex items-center justify-center group/handle select-none"
      title="Kéo để thay đổi chiều rộng cột"
    >
      <div className="w-[1.5px] h-full bg-white/20 group-hover/handle:bg-white/60 transition-colors" />
    </div>
  );

  const [showConfigMenu, setShowConfigMenu] = useState(false);
  const tableContainerRef = useRef<HTMLDivElement>(null);

  // Mouse drag-to-scroll state
  const [isDragging, setIsDragging] = useState(false);
  const [startX, setStartX] = useState(0);
  const [scrollLeft, setScrollLeft] = useState(0);

  // Toggle visibility of a column
  const toggleColumn = (colId: string) => {
    setVisibleColumns(prev => ({
      ...prev,
      [colId]: !prev[colId]
    }));
  };

  // Select all or reset columns
  const resetColumns = (visible = true) => {
    const next: Record<string, boolean> = {};
    Object.keys(visibleColumns).forEach(key => {
      next[key] = visible;
    });
    // actions and stt should always be visible by default
    next.stt = true;
    next.actions = true;
    setVisibleColumns(next);
  };

  // Scroll handler
  const scrollTable = (direction: 'left' | 'right') => {
    if (tableContainerRef.current) {
      const scrollAmount = 400;
      tableContainerRef.current.scrollBy({
        left: direction === 'left' ? -scrollAmount : scrollAmount,
        behavior: 'smooth'
      });
    }
  };

  // Mouse Drag handlers
  const handleMouseDown = (e: React.MouseEvent) => {
    const target = e.target as HTMLElement;
    // Don't drag if clicking buttons, inputs, selects, textareas or their parents
    if (
      target.tagName === 'INPUT' || 
      target.tagName === 'SELECT' || 
      target.tagName === 'TEXTAREA' || 
      target.closest('button') || 
      target.closest('select') ||
      target.closest('input') ||
      target.closest('textarea')
    ) {
      return;
    }
    
    setIsDragging(true);
    if (tableContainerRef.current) {
      setStartX(e.pageX - tableContainerRef.current.offsetLeft);
      setScrollLeft(tableContainerRef.current.scrollLeft);
    }
  };

  const handleMouseLeave = () => {
    setIsDragging(false);
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging || !tableContainerRef.current) return;
    e.preventDefault();
    const x = e.pageX - tableContainerRef.current.offsetLeft;
    const walk = (x - startX) * 1.5; // Drag sensitivity
    tableContainerRef.current.scrollLeft = scrollLeft - walk;
  };

  // Calculate dynamic table width based on visible columns
  const totalTableWidth = Object.keys(visibleColumns).reduce((acc, colId) => {
    if (visibleColumns[colId]) {
      return acc + (columnWidths[colId] || 100);
    }
    return acc;
  }, 0);

  return (
    <div className={isFullscreen 
      ? "fixed inset-0 bg-white z-[99999] flex flex-col p-6 w-screen h-screen m-0 rounded-none overflow-hidden" 
      : "bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden flex flex-col"
    }>
      <style>{`
        .excel-scrollbar {
          scrollbar-width: auto;
          scrollbar-color: #cbd5e1 #f8fafc;
        }
        .excel-scrollbar::-webkit-scrollbar {
          height: 14px;
          width: 14px;
        }
        .excel-scrollbar::-webkit-scrollbar-track {
          background: #f8fafc;
          border-top: 1px solid #e2e8f0;
          border-bottom: 1px solid #e2e8f0;
        }
        .excel-scrollbar::-webkit-scrollbar-thumb {
          background: #cbd5e1;
          border-radius: 9999px;
          border: 3px solid #f8fafc;
        }
        .excel-scrollbar::-webkit-scrollbar-thumb:hover {
          background: #a3212e;
        }
      `}</style>

      {/* Column Config Header bar */}
      <div className="bg-slate-50 border-b border-slate-200 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 select-none">
        <div className="flex items-center gap-2">
          <Settings2 className="w-4 h-4 text-[#0f2444]" />
          <span className="text-xs font-bold text-slate-700 uppercase tracking-wide">
            {isFullscreen ? "BẢNG EXCEL TOÀN MÀN HÌNH - PHÓNG TO TỐI ĐA" : "CẤU HÌNH HIỂN THỊ CỘT TRÊN BẢNG EXCEL"}
          </span>
        </div>
        
        <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
          <button
            onClick={() => {
              setIsFullscreen(!isFullscreen);
              if (onToggleExpand) {
                onToggleExpand();
              }
            }}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-bold shadow-xs transition cursor-pointer border ${
              isFullscreen
                ? 'bg-rose-50 border-rose-300 text-[#a3212e] hover:bg-rose-100'
                : 'bg-white border-slate-200 hover:border-slate-300 text-slate-700 hover:bg-slate-50'
            }`}
            title={isFullscreen ? 'Thu nhỏ bảng lại bình thường' : 'Mở rộng bảng toàn màn hình'}
          >
            {isFullscreen ? (
              <>
                <Minimize2 className="w-3.5 h-3.5 text-[#a3212e]" />
                <span>Thu nhỏ bảng</span>
              </>
            ) : (
              <>
                <Maximize2 className="w-3.5 h-3.5 text-slate-500" />
                <span>Xem toàn màn hình</span>
              </>
            )}
          </button>

          <div className="relative">
            <button
              onClick={() => setShowConfigMenu(!showConfigMenu)}
              className="flex items-center gap-2 bg-white border border-slate-200 hover:border-slate-300 text-slate-700 px-3 py-1.5 rounded-lg text-xs font-semibold shadow-xs transition cursor-pointer"
            >
              <Eye className="w-3.5 h-3.5 text-slate-500" />
              Ẩn/Hiện trường ({Object.values(visibleColumns).filter(Boolean).length - 1} / 13)
              <ChevronDown className={`w-3.5 h-3.5 text-slate-400 transition-transform ${showConfigMenu ? 'rotate-180' : ''}`} />
            </button>

            {showConfigMenu && (
              <>
                <div 
                  className="fixed inset-0 z-10" 
                  onClick={() => setShowConfigMenu(false)}
                />
                <div className="absolute right-0 mt-2 w-96 bg-white border border-slate-200 rounded-xl shadow-lg z-20 p-4 space-y-3">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                    <span className="font-bold text-xs text-slate-800">Cột & Chiều rộng (px)</span>
                    <div className="flex gap-2 items-center">
                      <button 
                        onClick={() => resetColumns(true)}
                        className="text-[10px] font-bold text-[#a3212e] hover:underline cursor-pointer"
                      >
                        Hiện hết
                      </button>
                      <span className="text-slate-300">|</span>
                      <button 
                        onClick={() => {
                          setColumnWidths({ ...DEFAULT_COLUMN_WIDTHS });
                          try { localStorage.setItem('excel_column_widths', JSON.stringify(DEFAULT_COLUMN_WIDTHS)); } catch {}
                        }}
                        className="text-[10px] font-bold text-slate-600 hover:underline cursor-pointer"
                        title="Khôi phục kích thước cột mặc định"
                      >
                        Reset rộng
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 gap-1.5 max-h-72 overflow-y-auto pr-1">
                    {COLUMNS.map((col) => (
                      <div key={col.id} className="flex items-center justify-between gap-2 p-1.5 hover:bg-slate-50 rounded-lg transition text-xs">
                        <label className="flex items-center gap-2 cursor-pointer flex-1 min-w-0">
                          <input 
                            type="checkbox"
                            checked={!!visibleColumns[col.id]}
                            onChange={() => toggleColumn(col.id)}
                            className="rounded border-slate-300 text-[#a3212e] focus:ring-[#a3212e] w-3.5 h-3.5 flex-shrink-0"
                          />
                          <div className="flex-1 min-w-0">
                            <div className="font-semibold text-slate-700 flex items-center gap-1.5 truncate">
                              {col.colNo && <span className="text-[10px] text-slate-400 font-mono flex-shrink-0">{col.colNo}</span>}
                              <span className="truncate">{col.label}</span>
                            </div>
                          </div>
                        </label>
                        <div className="flex items-center gap-1 flex-shrink-0">
                          <input
                            type="number"
                            min="50"
                            max="800"
                            value={columnWidths[col.id] || 100}
                            onChange={(e) => {
                              const val = Math.max(50, parseInt(e.target.value) || 50);
                              setColumnWidths(prev => {
                                const next = { ...prev, [col.id]: val };
                                try { localStorage.setItem('excel_column_widths', JSON.stringify(next)); } catch {}
                                return next;
                              });
                            }}
                            className="w-16 text-center bg-slate-50 border border-slate-200 focus:bg-white focus:border-[#a3212e] text-slate-800 px-1 py-0.5 rounded outline-none text-[10px] font-bold"
                          />
                          <span className="text-[9px] text-slate-400 font-mono">px</span>
                        </div>
                      </div>
                    ))}
                    
                    <div className="flex items-center justify-between gap-2 p-1.5 hover:bg-slate-50 rounded-lg transition text-xs border-t border-slate-100 mt-1 pt-2">
                      <label className="flex items-center gap-2 cursor-pointer flex-1">
                        <input 
                          type="checkbox"
                          checked={!!visibleColumns.actions}
                          onChange={() => toggleColumn('actions')}
                          className="rounded border-slate-300 text-[#a3212e] focus:ring-[#a3212e] w-3.5 h-3.5 flex-shrink-0"
                        />
                        <span className="font-semibold text-slate-700">Cột Thao tác</span>
                      </label>
                      <div className="flex items-center gap-1 flex-shrink-0">
                        <input
                          type="number"
                          min="50"
                          max="800"
                          value={columnWidths.actions || 100}
                          onChange={(e) => {
                            const val = Math.max(50, parseInt(e.target.value) || 50);
                            setColumnWidths(prev => {
                              const next = { ...prev, actions: val };
                              try { localStorage.setItem('excel_column_widths', JSON.stringify(next)); } catch {}
                              return next;
                            });
                          }}
                          className="w-16 text-center bg-slate-50 border border-slate-200 focus:bg-white focus:border-[#a3212e] text-slate-800 px-1 py-0.5 rounded outline-none text-[10px] font-bold"
                        />
                        <span className="text-[9px] text-slate-400 font-mono">px</span>
                      </div>
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Spreadsheet grid with mouse-drag pan & custom scrollbar */}
      <div 
        ref={tableContainerRef}
        onMouseDown={handleMouseDown}
        onMouseLeave={handleMouseLeave}
        onMouseUp={handleMouseUp}
        onMouseMove={handleMouseMove}
        onScroll={handleTableScroll}
        className={`overflow-auto w-full ${isFullscreen ? 'flex-1 h-full' : 'max-h-[calc(100vh-270px)]'} excel-scrollbar border border-slate-200/60 rounded-xl relative bg-white ${
          isDragging ? 'cursor-grabbing select-none' : 'cursor-grab'
        }`}
      >
        <table 
          className="text-left border-collapse table-fixed select-text"
          style={{ minWidth: `max(100%, ${totalTableWidth}px)` }}
        >
          <thead>
            {/* Row 1: Column Names */}
            <tr className="bg-[#0f2444] text-white divide-x divide-slate-700">
              {visibleColumns.stt && (
                <th 
                  style={{ width: columnWidths.stt }}
                  className="relative group text-center py-3 px-2 text-[11px] font-bold uppercase tracking-wider sticky top-0 bg-[#0f2444] z-30 shadow-[0_1px_0_0_rgba(51,65,85,0.15)]"
                >
                  TT
                  {renderResizeHandle('stt')}
                </th>
              )}
              {visibleColumns.canCu && (
                <th 
                  style={{ width: columnWidths.canCu }}
                  className="relative group py-3 px-3 text-[11px] font-bold uppercase tracking-wider sticky top-0 bg-[#0f2444] z-30 shadow-[0_1px_0_0_rgba(51,65,85,0.15)]"
                >
                  (2) Căn cứ
                  {renderResizeHandle('canCu')}
                </th>
              )}
              {visibleColumns.noiDung && (
                <th 
                  style={{ width: columnWidths.noiDung }}
                  className="relative group py-3 px-3 text-[11px] font-bold uppercase tracking-wider sticky top-0 bg-[#0f2444] z-30 shadow-[0_1px_0_0_rgba(51,65,85,0.15)]"
                >
                  (3) Tiêu chí/nội dung
                  {renderResizeHandle('noiDung')}
                </th>
              )}
              {visibleColumns.thoiHan && (
                <th 
                  style={{ width: columnWidths.thoiHan }}
                  className="relative group py-3 px-3 text-[11px] font-bold uppercase tracking-wider text-center sticky top-0 bg-[#0f2444] z-30 shadow-[0_1px_0_0_rgba(51,65,85,0.15)]"
                >
                  (4) Thời hạn yêu cầu
                  {renderResizeHandle('thoiHan')}
                </th>
              )}
              {visibleColumns.diemGiao && (
                <th 
                  style={{ width: columnWidths.diemGiao }}
                  className="relative group py-3 px-2 text-[11px] font-bold uppercase tracking-wider text-center sticky top-0 bg-[#0f2444] z-30 shadow-[0_1px_0_0_rgba(51,65,85,0.15)]"
                >
                  (5) Điểm giao
                  {renderResizeHandle('diemGiao')}
                </th>
              )}
              {visibleColumns.donViTheoDoi && (
                <th 
                  style={{ width: columnWidths.donViTheoDoi }}
                  className="relative group py-3 px-3 text-[11px] font-bold uppercase tracking-wider text-center sticky top-0 bg-[#0f2444] z-30 shadow-[0_1px_0_0_rgba(51,65,85,0.15)]"
                >
                  (6) Đơn vị theo dõi
                  {renderResizeHandle('donViTheoDoi')}
                </th>
              )}
              {visibleColumns.sanPham && (
                <th 
                  style={{ width: columnWidths.sanPham }}
                  className="relative group py-3 px-3 text-[11px] font-bold uppercase tracking-wider sticky top-0 bg-[#0f2444] z-30 shadow-[0_1px_0_0_rgba(51,65,85,0.15)]"
                >
                  (7) Sản phẩm
                  {renderResizeHandle('sanPham')}
                </th>
              )}
              {visibleColumns.diemSoLuong && (
                <th 
                  style={{ width: columnWidths.diemSoLuong }}
                  className="relative group py-3 px-2 text-[11px] font-bold uppercase tracking-wider text-center leading-tight sticky top-0 bg-[#0f2444] z-30 shadow-[0_1px_0_0_rgba(51,65,85,0.15)]"
                >
                  (8) Điểm số lượng
                  {renderResizeHandle('diemSoLuong')}
                </th>
              )}
              {visibleColumns.diemChatLuong && (
                <th 
                  style={{ width: columnWidths.diemChatLuong }}
                  className="relative group py-3 px-2 text-[11px] font-bold uppercase tracking-wider text-center leading-tight sticky top-0 bg-[#0f2444] z-30 shadow-[0_1px_0_0_rgba(51,65,85,0.15)]"
                >
                  (9) Điểm chất lượng
                  {renderResizeHandle('diemChatLuong')}
                </th>
              )}
              {visibleColumns.diemTienDo && (
                <th 
                  style={{ width: columnWidths.diemTienDo }}
                  className="relative group py-3 px-2 text-[11px] font-bold uppercase tracking-wider text-center leading-tight sticky top-0 bg-[#0f2444] z-30 shadow-[0_1px_0_0_rgba(51,65,85,0.15)]"
                >
                  (10) Điểm tiến độ
                  {renderResizeHandle('diemTienDo')}
                </th>
              )}
              {visibleColumns.minhChung && (
                <th 
                  style={{ width: columnWidths.minhChung }}
                  className="relative group py-3 px-3 text-[11px] font-bold uppercase tracking-wider leading-tight sticky top-0 bg-[#0f2444] z-30 shadow-[0_1px_0_0_rgba(51,65,85,0.15)]"
                >
                  (11) Minh chứng vượt mức
                  {renderResizeHandle('minhChung')}
                </th>
              )}
              {visibleColumns.donVi && (
                <th 
                  style={{ width: columnWidths.donVi }}
                  className="relative group py-3 px-3 text-[11px] font-bold uppercase tracking-wider text-center sticky top-0 bg-[#0f2444] z-30 shadow-[0_1px_0_0_rgba(51,65,85,0.15)]"
                >
                  (12) Đơn vị thực hiện
                  {renderResizeHandle('donVi')}
                </th>
              )}
              {visibleColumns.trangThai && (
                <th 
                  style={{ width: columnWidths.trangThai }}
                  className="relative group py-3 px-3 text-[11px] font-bold uppercase tracking-wider text-center sticky top-0 bg-[#0f2444] z-30 shadow-[0_1px_0_0_rgba(51,65,85,0.15)]"
                >
                  Trạng thái
                  {renderResizeHandle('trangThai')}
                </th>
              )}
              {visibleColumns.actions && (
                <th 
                  style={{ width: columnWidths.actions }}
                  className="relative group py-3 px-2 text-[11px] font-bold uppercase tracking-wider text-center sticky top-0 bg-[#0f2444] z-30 shadow-[0_1px_0_0_rgba(51,65,85,0.15)]"
                >
                  {renderResizeHandle('actions')}
                </th>
              )}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {tasks.map((row, index) => {
              const rowStatusInfo = getTaskStatusInfo(row);
              const isOverdue = row.ngayHetHan && row.ngayHetHan < todayISO && !rowStatusInfo.isCompleted;
              const dLeft = daysUntil(row.ngayHetHan);
              const isDueSoon = row.ngayHetHan && !isOverdue && dLeft !== null && dLeft <= 5 && !rowStatusInfo.isCompleted;

              // Determine row background
              let rowBg = 'hover:bg-slate-50/70 transition-colors';
              if (rowStatusInfo.isCompleted && !rowStatusInfo.isLate) {
                rowBg = 'bg-emerald-50/25 hover:bg-emerald-50/40 transition-colors';
              } else if (rowStatusInfo.isCompleted && rowStatusInfo.isLate) {
                rowBg = 'bg-amber-50/20 hover:bg-amber-50/35 transition-colors';
              } else if (isOverdue) {
                rowBg = 'bg-red-50/40 hover:bg-red-50/60 transition-colors';
              } else if (isDueSoon) {
                rowBg = 'bg-amber-50/35 hover:bg-amber-50/50 transition-colors';
              }

              // Default point values
              const showDiemSoLuong = row.diemSoLuong !== undefined ? row.diemSoLuong : (
                rowStatusInfo.isCompleted ? (rowStatusInfo.isLate ? row.diemGiao * 0.5 : row.diemGiao) : ''
              );
              const showDiemChatLuong = row.diemChatLuong !== undefined ? row.diemChatLuong : '';
              const showDiemTienDo = row.diemTienDo !== undefined ? row.diemTienDo : '';

              return (
                <tr key={row.id} className={`${rowBg} divide-x divide-slate-200 text-xs font-medium text-slate-700 align-top`}>
                  {/* STT */}
                  {visibleColumns.stt && (
                    <td className="py-3 px-2 text-center font-mono font-bold text-slate-500">
                      {row.stt}
                    </td>
                  )}

                  {/* (2) Căn cứ */}
                  {visibleColumns.canCu && (
                    <td className="py-3 px-3 leading-relaxed text-slate-800 font-semibold space-y-1">
                      <div>{row.canCu || compileCanCu(row)}</div>
                      <div className="flex flex-wrap gap-1 mt-1 text-[9px]">
                        <span className="bg-[#0f2444] text-white font-mono px-1.5 py-0.2 rounded font-bold">
                          {row.id}
                        </span>
                        {row.loaiVanBan && (
                          <span className="bg-slate-100 text-slate-600 px-1 py-0.2 rounded border border-slate-200 font-semibold">
                            {row.loaiVanBan}
                          </span>
                        )}
                        {row.so && (
                          <span className="bg-slate-100 text-slate-600 px-1 py-0.2 rounded border border-slate-200 font-mono font-bold">
                            Số: {row.so}
                          </span>
                        )}
                        {row.ngay && (
                          <span className="bg-slate-100 text-slate-600 px-1 py-0.2 rounded border border-slate-200">
                            Ngày: {row.ngay}
                          </span>
                        )}
                      </div>
                    </td>
                  )}

                  {/* (3) Tiêu chí / nội dung */}
                  {visibleColumns.noiDung && (
                    <td className="py-3 px-3 leading-relaxed text-slate-900 font-medium whitespace-pre-line">
                      {row.noiDung}
                    </td>
                  )}

                  {/* (4) Thời hạn yêu cầu */}
                  {visibleColumns.thoiHan && (
                    <td className={`py-3 px-3 text-center space-y-1.5 transition-colors ${
                      isOverdue 
                        ? 'bg-red-100/50' 
                        : isDueSoon 
                          ? 'bg-amber-100/40' 
                          : ''
                    }`}>
                      <span className={`inline-block px-2.5 py-1 rounded-md font-bold text-[11px] border transition-all duration-150 ${
                        isOverdue 
                          ? 'bg-red-500 text-white border-red-600 shadow-xs' 
                          : isDueSoon 
                            ? 'bg-amber-500 text-white border-amber-600 shadow-xs' 
                            : 'bg-slate-100 border-slate-200 text-slate-700 font-semibold'
                      }`}>
                        {row.thoiHan || '—'}
                      </span>
                      {row.ngayHetHan && (
                        <div className={`text-[10px] font-mono font-bold ${
                          isOverdue 
                            ? 'text-red-700 bg-red-100/80 px-1 py-0.5 rounded border border-red-200' 
                            : isDueSoon 
                              ? 'text-amber-800 bg-amber-100/80 px-1 py-0.5 rounded border border-amber-200' 
                              : 'text-slate-400'
                        }`}>
                          Hạn chót: {row.ngayHetHan}
                        </div>
                      )}
                      {row.danhSachMoc && row.danhSachMoc.length > 0 && (
                        <div className="bg-sky-50 text-sky-800 text-[10px] font-bold px-1.5 py-0.5 rounded border border-sky-200 flex flex-col gap-0.5 text-left">
                          <span className="font-extrabold text-[9px] uppercase tracking-wide text-sky-900 border-b border-sky-200/60 pb-0.5">
                            📌 {row.danhSachMoc.length} Mốc báo cáo:
                          </span>
                          {row.danhSachMoc.map((m, idx) => (
                            <div key={m.id || idx} className="flex items-center justify-between gap-1 text-[9px] leading-tight">
                              <span className="truncate max-w-[100px]">{m.tenMoc}:</span>
                              <span className="font-mono text-[9px] shrink-0 font-bold">{m.ngayHetHan}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </td>
                  )}

                  {/* (5) Điểm giao */}
                  {visibleColumns.diemGiao && (
                    <td className="py-3 px-2 text-center font-mono font-bold text-amber-700 bg-amber-50/5">
                      {row.diemGiao.toFixed(1).replace('.', ',')} đ
                    </td>
                  )}

                  {/* (6) Đơn vị theo dõi */}
                  {visibleColumns.donViTheoDoi && (
                    <td className="py-3 px-3 text-center text-slate-800 font-bold">
                      {row.donViTheoDoi || formatDonViBanHanhDisplay(row.donViBanHanh) || '—'}
                    </td>
                  )}

                  {/* (7) Sản phẩm */}
                  {visibleColumns.sanPham && (
                    <td className="py-2 px-2 text-slate-800 font-medium">
                      <input
                        type="text"
                        className={`w-full bg-transparent border-b focus:border-[#a3212e] focus:bg-white px-1.5 py-0.5 outline-none text-xs transition ${
                          !hasValidProduct(row)
                            ? 'border-dashed border-purple-300 text-purple-950 placeholder:text-purple-400/80 bg-purple-50/30 font-medium'
                            : 'border-transparent text-emerald-950 font-bold bg-emerald-50/20'
                        }`}
                        placeholder="Chưa cập nhật..."
                        value={row.sanPham || ''}
                        onChange={(e) => updateTask(row.originalIndex, 'sanPham', e.target.value)}
                      />
                    </td>
                  )}

                  {/* (8) Điểm số lượng hoàn thành */}
                  {visibleColumns.diemSoLuong && (
                    <td className="py-2.5 px-1 text-center">
                      <input 
                        type="number"
                        step="0.1"
                        value={showDiemSoLuong}
                        onChange={(e) => {
                          const v = parseFloat(e.target.value);
                          updateTask(row.originalIndex, 'diemSoLuong', isNaN(v) ? undefined : v);
                        }}
                        className="w-full text-center bg-slate-50 border border-slate-200 focus:bg-white focus:border-[#a3212e] text-slate-800 px-1 py-1 rounded outline-none font-mono font-bold text-xs"
                        placeholder="—"
                      />
                    </td>
                  )}

                  {/* (9) Điểm chất lượng */}
                  {visibleColumns.diemChatLuong && (
                    <td className="py-2.5 px-1 text-center">
                      <input 
                        type="number"
                        step="0.1"
                        value={showDiemChatLuong}
                        onChange={(e) => {
                          const v = parseFloat(e.target.value);
                          updateTask(row.originalIndex, 'diemChatLuong', isNaN(v) ? undefined : v);
                        }}
                        className="w-full text-center bg-slate-50 border border-slate-200 focus:bg-white focus:border-[#a3212e] text-slate-800 px-1 py-1 rounded outline-none font-mono font-bold text-xs"
                        placeholder="—"
                      />
                    </td>
                  )}

                  {/* (10) Điểm tiến độ */}
                  {visibleColumns.diemTienDo && (
                    <td className="py-2.5 px-1 text-center">
                      <input 
                        type="number"
                        step="0.1"
                        value={showDiemTienDo}
                        onChange={(e) => {
                          const v = parseFloat(e.target.value);
                          updateTask(row.originalIndex, 'diemTienDo', isNaN(v) ? undefined : v);
                        }}
                        className="w-full text-center bg-slate-50 border border-slate-200 focus:bg-white focus:border-[#a3212e] text-slate-800 px-1 py-1 rounded outline-none font-mono font-bold text-xs"
                        placeholder="—"
                      />
                    </td>
                  )}

                  {/* (11) Minh chứng điểm vượt mức */}
                  {visibleColumns.minhChung && (
                    <td className="py-2 px-2 text-center">
                      <textarea
                        rows={2}
                        value={row.minhChung || ''}
                        onChange={(e) => {
                          updateTask(row.originalIndex, 'minhChung', e.target.value);
                        }}
                        className="w-full text-left bg-slate-50 border border-slate-200 focus:bg-white focus:border-[#a3212e] text-slate-800 px-2 py-1 rounded outline-none text-[11px] leading-tight resize-y min-h-[38px]"
                        placeholder="Nhập minh chứng..."
                      />
                    </td>
                  )}

                  {/* (12) Đơn vị thực hiện */}
                  {visibleColumns.donVi && (
                    <td className="py-3 px-3 text-center text-slate-800 font-semibold">
                      {row.donVi}
                    </td>
                  )}

                  {/* Trạng thái */}
                  {visibleColumns.trangThai && (
                    <td className={`py-2.5 px-2 text-center transition-colors ${
                      isOverdue 
                        ? 'bg-red-100/50' 
                        : isDueSoon 
                          ? 'bg-amber-100/40' 
                          : ''
                    }`}>
                      {(() => {
                        const statusInfo = getTaskStatusInfo(row);
                        return (
                          <>
                            <select
                              value={statusInfo.isCompleted ? 'Hoàn thành' : '-'}
                              onChange={(e) => {
                                const val = e.target.value;
                                if (val === 'Hoàn thành') {
                                  const compDate = row.ngayHoanThanh || getTodayDateString();
                                  updateTask(row.originalIndex, { ngayHoanThanh: compDate, trangThai: 'Hoàn thành' });
                                } else {
                                  updateTask(row.originalIndex, { ngayHoanThanh: '', trangThai: '-' });
                                }
                              }}
                              className={`w-full rounded px-1.5 py-1 text-[11px] font-bold outline-none cursor-pointer border transition-all ${
                                statusInfo.isCompleted
                                  ? (statusInfo.isLate ? 'bg-amber-600 text-white border-amber-700' : 'bg-emerald-600 text-white border-emerald-700')
                                  : isOverdue 
                                    ? 'bg-red-500 text-white border-red-600 focus:border-red-700' 
                                    : isDueSoon 
                                      ? 'bg-amber-500 text-white border-amber-600 focus:border-amber-700' 
                                      : 'bg-slate-50 border-slate-200 text-slate-700 focus:border-[#a3212e]'
                              }`}
                            >
                              <option value="Hoàn thành" className="text-emerald-700 bg-white">Hoàn thành</option>
                              <option value="-" className="text-slate-700 bg-white">-</option>
                            </select>

                            {/* Completed Date Picker inside cell if task is completed */}
                            {statusInfo.isCompleted && (
                              <div className="mt-1.5 p-1 bg-white/90 border border-emerald-200 rounded flex flex-col gap-1 text-[10px]">
                                <div className="flex items-center justify-center gap-1">
                                  <span className="text-emerald-800 font-bold">Xong:</span>
                                  <input
                                    type="date"
                                    value={row.ngayHoanThanh || getTodayDateString()}
                                    onChange={(e) => {
                                      const newDate = e.target.value;
                                      updateTask(row.originalIndex, { ngayHoanThanh: newDate, trangThai: 'Hoàn thành' });
                                    }}
                                    className="bg-emerald-50 border border-emerald-300 rounded px-1 py-0.5 text-[10px] font-mono font-bold text-slate-800 outline-none focus:border-emerald-600 cursor-pointer"
                                  />
                                </div>
                                {statusInfo.isLate && (
                                  <span className="text-[9px] font-extrabold px-1 py-0.5 rounded text-center bg-amber-100 text-amber-800 border border-amber-200">
                                    {statusInfo.statusText}
                                  </span>
                                )}
                              </div>
                            )}
                          </>
                        );
                      })()}

                      {isOverdue && !isTaskCompleted(row) && (
                        <div className="text-[10px] text-red-700 font-extrabold mt-1 flex items-center justify-center gap-1 bg-red-100/80 py-0.5 rounded border border-red-200 shadow-3xs">
                          <XCircle className="w-3 h-3 text-red-600 animate-pulse" /> Trễ hạn!
                        </div>
                      )}
                      {isDueSoon && !isTaskCompleted(row) && (
                        <div className="text-[10px] text-amber-850 font-extrabold mt-1 flex items-center justify-center gap-1 bg-amber-100/80 py-0.5 rounded border border-amber-200 shadow-3xs">
                          <AlertTriangle className="w-3 h-3 text-amber-600 animate-bounce" /> Sắp hết hạn!
                        </div>
                      )}
                    </td>
                  )}

                  {/* Action buttons (Chỉ nút bút chì Sửa) */}
                  {visibleColumns.actions && (
                    <td className="py-2.5 px-2">
                      <div className="flex items-center justify-center">
                        <button
                          onClick={() => onEditTask(row, row.originalIndex)}
                          className="h-7 w-7 bg-slate-100 text-slate-700 hover:bg-[#0f2444] hover:text-white rounded-md transition cursor-pointer inline-flex items-center justify-center border border-slate-200 shrink-0"
                          title="Chỉnh sửa / Cập nhật nhiệm vụ"
                        >
                          <Edit2 className="w-3.5 h-3.5 shrink-0" />
                        </button>
                      </div>
                    </td>
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Bottom control bar with scroll indicators & buttons */}
      <div className="bg-slate-50 border-t border-slate-200 px-4 py-2 flex flex-col md:flex-row md:items-center justify-between gap-3 select-none text-slate-500 text-[11px] sticky bottom-0 z-20 shadow-[0_-4px_12px_rgba(0,0,0,0.05)] rounded-b-2xl">
        <div className="flex items-center gap-2">
          <span className="w-1.5 h-1.5 bg-[#a3212e] rounded-full animate-pulse flex-shrink-0" />
          <span className="truncate">💡 Sử dụng kéo chuột, thanh trượt nổi ở giữa, hoặc phím mũi tên.</span>
        </div>
        
        {/* Floating Range Slider for convenient scroll back and forth */}
        {canScroll && (
          <div className="flex-1 max-w-xs md:max-w-md mx-auto w-full px-3 py-1 bg-white border border-slate-200 rounded-full flex items-center gap-2 shadow-xs">
            <span className="text-[9px] font-extrabold text-slate-400 font-mono tracking-wider flex-shrink-0">THANH TRƯỢT NỔI</span>
            <input
              type="range"
              min="0"
              max="100"
              step="0.1"
              value={scrollPercent}
              onChange={handleSliderChange}
              className="flex-1 h-1.5 bg-slate-100 rounded-lg appearance-none cursor-ew-resize accent-[#a3212e] focus:outline-none"
              style={{
                background: `linear-gradient(to right, #a3212e 0%, #a3212e ${scrollPercent}%, #cbd5e1 ${scrollPercent}%, #cbd5e1 100%)`
              }}
            />
            <span className="text-[9px] font-mono font-bold text-[#a3212e] w-8 text-right flex-shrink-0">
              {Math.round(scrollPercent)}%
            </span>
          </div>
        )}

        <div className="flex items-center gap-2 justify-end self-end md:self-auto">
          <span className="font-mono text-[10px] bg-slate-200/60 text-slate-600 px-1.5 py-0.5 rounded whitespace-nowrap">
            Rộng: {totalTableWidth}px
          </span>
          <div className="h-4 w-px bg-slate-300" />
          <div className="flex items-center gap-1 bg-white border border-slate-200 rounded p-0.5 shadow-2xs flex-shrink-0">
            <button
              onClick={() => scrollTable('left')}
              className="p-1 hover:bg-slate-100 text-slate-500 hover:text-[#a3212e] rounded transition cursor-pointer"
              title="Cuộn sang trái"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="text-slate-400 text-[9px] font-bold px-1 select-none whitespace-nowrap">CUỘN BẢNG</span>
            <button
              onClick={() => scrollTable('right')}
              className="p-1 hover:bg-slate-100 text-slate-500 hover:text-[#a3212e] rounded transition cursor-pointer"
              title="Cuộn sang phải"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
