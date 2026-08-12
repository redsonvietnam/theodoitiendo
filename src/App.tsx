/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import Sidebar from './components/Sidebar';
import Dashboard from './components/Dashboard';
import MainA from './components/MainA';
import MainB from './components/MainB';
import MainC from './components/MainC';
import MainBC from './components/MainBC';
import MainD from './components/MainD';
import CalendarView from './components/CalendarView';
import ExcelIO from './components/ExcelIO';
import MilestoneManager from './components/MilestoneManager';
import NotificationPanel from './components/NotificationPanel';
import Settings from './components/Settings';
import Login from './components/Login';
import { ActiveTab } from './types';
import { Save, CheckCircle, Plus, X, HelpCircle, AlertTriangle, Maximize2, Minimize2, List, LayoutGrid, Table } from 'lucide-react';
import { cleanInlineText, formatParagraphText } from './utils/cancu';
import { POLICE_DEPARTMENTS, suggestDocumentSymbol, formatToDDMMYY, parseQuickDate } from './utils/documentHelper';
import DeptCombobox from './components/DeptCombobox';
import { getTodayDateString, formatDateVN } from './utils/dateHelpers';
import { useAppState } from './hooks/useAppState';
import { useBackupReminder } from './hooks/useBackupReminder';
import { useViewPreferences } from './hooks/useViewPreferences';
import { useGlobalAddTaskForm } from './hooks/useGlobalAddTaskForm';

// Reference date is dynamic and defaults to the actual current date
const REFERENCE_TODAY = getTodayDateString();

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

export default function App() {
  const [activeTab, setActiveTab] = useState<ActiveTab>('dashboard');
  const [activeEditingTaskId, setActiveEditingTaskId] = useState<string | null>(null);
  const [selectedSectionDIdx, setSelectedSectionDIdx] = useState<number | null>(null);

  const {
    state, isLoading, showSaveToast, saveError, taskCounts,
    needsAuth, authUser, logout,
    updateMeta, updateHiddenSidebarItems, updateStatusA, updateTaskBC,
    addTaskBC, deleteTaskBC, updateTaskD, handleImportState, resetToDefault,
  } = useAppState();

  const { daysSinceBackup, setDaysSinceBackup, shouldShowReminder, dismissBackupReminder, setBackupReminderDismissed } = useBackupReminder();

  const {
    showSectionI_IV, handleToggleSectionI_IV,
    sidebarCollapsed, setSidebarCollapsed,
    workspaceExpanded, setWorkspaceExpanded,
    viewModeB, handleSetViewModeB,
    viewModeC, handleSetViewModeC,
    viewModeBC, handleSetViewModeBC,
    viewModeD, handleSetViewModeD,
  } = useViewPreferences();

  const {
    isGlobalAddOpen, setIsGlobalAddOpen, targetSection,
    loaiVanBan, setLoaiVanBan, so, ngay, setNgay,
    quickDate, setQuickDate, quickDateHetHan, setQuickDateHetHan,
    donViBanHanh, setDonViBanHanh, trichYeu, setTrichYeu,
    noiDung, setNoiDung, thoiHan, setThoiHan, diemGiao, setDiemGiao,
    donVi, setDonVi, sanPham, setSanPham, ngayHetHan, setNgayHetHan,
    gioHetHan, setGioHetHan, kieuThoiHan, setKieuThoiHan,
    donViTheoDoi, setDonViTheoDoi, ghiChu, setGhiChu,
    danhSachMoc, setDanhSachMoc, isExpanded, setIsExpanded,
    soNumberOnly, soSymbolOnly, selectedDeptCode, isFromCAT,
    handleDocTypeChange, handleDeptCodeChange, handleCATToggle,
    handleSoNumberChange, handleSymbolKeyDown, handleSoSymbolManualChange,
    handleFullSoChange, handleOpenGlobalAdd, buildTaskPayload,
  } = useGlobalAddTaskForm();

  // Handle saving task from the central, global add modal
  const handleGlobalSaveTask = (e: React.FormEvent) => {
    e.preventDefault();
    const { finalSection, payload } = buildTaskPayload();
    addTaskBC(finalSection, payload);
    setIsGlobalAddOpen(false);
  };

  // Utility to calculate days until deadline relative to 2026-07-14 reference date
  const daysUntil = (dateStr: string): number | null => {
    if (!dateStr) return null;
    const deadline = new Date(dateStr + 'T00:00:00');
    const today = new Date(REFERENCE_TODAY + 'T00:00:00');

    // Calculate difference in days
    const diffTime = deadline.getTime() - today.getTime();
    const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  // Render correct tab view content
  const renderTabContent = () => {
    switch (activeTab) {
      case 'dashboard':
        return (
          <Dashboard
            state={state}
            setActiveTab={(tab) => setActiveTab(tab)}
            todayISO={REFERENCE_TODAY}
            daysUntil={daysUntil}
            onOpenTaskDetail={(sec, taskId) => {
              setActiveTab(sec);
              setActiveEditingTaskId(taskId);
            }}
          // showSectionI_IV={showSectionI_IV} // No longer needed, handled by hiddenSidebarItems
          // onToggleSectionI_IV={handleToggleSectionI_IV} // No longer needed
          />
        );
      case 'calendar':
        return (
          <CalendarView
            state={state}
            updateTaskBC={(sec, idx, field, val) => updateTaskBC(sec, idx, field, val)}
          />
        );
      case 'A':
        return (
          <MainA
            tasks={state.A}
            updateStatus={updateStatusA}
          />
        );
      case 'B':
        return (
          <MainB
            tasks={state.B}
            updateTask={(idx, field, val) => updateTaskBC('B', idx, field, val)}
            addTask={(task) => addTaskBC('B', task)}
            deleteTask={(idx) => deleteTaskBC('B', idx)}
            todayISO={REFERENCE_TODAY}
            daysUntil={daysUntil}
            onOpenGlobalAdd={(sec) => handleOpenGlobalAdd(sec)}
            isWorkspaceExpanded={workspaceExpanded}
            onToggleExpand={() => setWorkspaceExpanded(!workspaceExpanded)}
            activeEditingTaskId={activeEditingTaskId}
            onClearActiveEditingTaskId={() => setActiveEditingTaskId(null)}
            viewMode={viewModeB}
            setViewMode={handleSetViewModeB}
          />
        );
      case 'C':
        return (
          <MainC
            tasks={state.C}
            updateTask={(idx, field, val) => updateTaskBC('C', idx, field, val)}
            addTask={(task) => addTaskBC('C', task)}
            deleteTask={(idx) => deleteTaskBC('C', idx)}
            todayISO={REFERENCE_TODAY}
            daysUntil={daysUntil}
            onOpenGlobalAdd={(sec) => handleOpenGlobalAdd(sec)}
            isWorkspaceExpanded={workspaceExpanded}
            onToggleExpand={() => setWorkspaceExpanded(!workspaceExpanded)}
            activeEditingTaskId={activeEditingTaskId}
            onClearActiveEditingTaskId={() => setActiveEditingTaskId(null)}
            viewMode={viewModeC}
            setViewMode={handleSetViewModeC}
          />
        );
      case 'BC':
        return (
          <MainBC
            tasksB={state.B}
            tasksC={state.C}
            updateTaskB={(idx, field, val) => updateTaskBC('B', idx, field, val)}
            updateTaskC={(idx, field, val) => updateTaskBC('C', idx, field, val)}
            addTaskB={(task) => addTaskBC('B', task)}
            addTaskC={(task) => addTaskBC('C', task)}
            deleteTaskB={(idx) => deleteTaskBC('B', idx)}
            deleteTaskC={(idx) => deleteTaskBC('C', idx)}
            todayISO={REFERENCE_TODAY}
            daysUntil={daysUntil}
            onOpenGlobalAdd={(sec) => handleOpenGlobalAdd(sec)}
            isWorkspaceExpanded={workspaceExpanded}
            onToggleExpand={() => setWorkspaceExpanded(!workspaceExpanded)}
            activeEditingTaskId={activeEditingTaskId}
            onClearActiveEditingTaskId={() => setActiveEditingTaskId(null)}
            viewMode={viewModeBC}
            setViewMode={handleSetViewModeBC}
          />
        );
      case 'D':
        return (
          <MainD
            tasks={state.D}
            updateTask={updateTaskD}
            activeSectionIdx={selectedSectionDIdx}
            setActiveSectionIdx={setSelectedSectionDIdx}
            viewMode={viewModeD}
            setViewMode={handleSetViewModeD}
          />
        );
      case 'excel':
        return (
          <ExcelIO
            state={state}
            resetToDefault={resetToDefault}
            importState={handleImportState}
            onBackupExported={() => {
              setDaysSinceBackup(0);
              setBackupReminderDismissed(false);
            }}
          />
        );
      case 'settings':
        return (
          <Settings
            hiddenItems={state.hiddenSidebarItems || []}
            updateHiddenItems={updateHiddenSidebarItems}
            authUser={authUser}
            onLogout={logout}
          />
        );
      default:
        return null;
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[#f4f2ec]">
        <div className="text-center">
          <div className="mx-auto mb-4 w-10 h-10 rounded-full border-4 border-[#0f2444]/15 border-t-[#0f2444] animate-spin" />
          <p className="text-lg font-semibold text-[#0f2444]">Đang tải dữ liệu...</p>
          <p className="text-sm text-slate-500">Vui lòng chờ trong giây lát.</p>
        </div>
      </div>
    );
  }

  // A backend (`node server.js`) was detected but no valid session is held —
  // require login before showing app data. Plain `npm run dev`/`npm start`
  // never sets this, so the app behaves exactly as before in that mode.
  if (needsAuth) {
    return <Login />;
  }

  return (
    <div className="flex flex-col md:flex-row min-h-screen bg-[#f4f2ec] text-[#1c2430]">
      {/* Side Navigation Bar */}
      <Sidebar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        meta={state.meta}
        updateMeta={updateMeta}
        taskCounts={taskCounts}
        tasksD={state.D}
        selectedSectionDIdx={selectedSectionDIdx}
        onSelectSectionD={(idx) => {
          setSelectedSectionDIdx(idx);
          setActiveTab('D');
        }}
        isCollapsed={sidebarCollapsed || workspaceExpanded}
        onToggleCollapse={() => {
          setSidebarCollapsed(!sidebarCollapsed);
          if (workspaceExpanded) setWorkspaceExpanded(false);
        }}
        hiddenSidebarItems={state.hiddenSidebarItems || []}
        updateHiddenSidebarItems={updateHiddenSidebarItems}
      />

      {/* Main Workspace Frame */}
      <main className={`flex-1 min-w-0 p-3 sm:p-4 lg:p-5 w-full relative transition-all duration-300 ${workspaceExpanded ? 'max-w-none' : 'max-w-[96%] xl:max-w-[1550px] 2xl:max-w-[1720px] mx-auto'
        }`}>

        {/* Sticky top utilities bar with floating design */}
        <div className="sticky top-0 z-45 bg-[#f4f2ec]/95 backdrop-blur-md pb-4 mb-6 border-b border-slate-200/80 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-lg md:text-xl font-bold text-[#0f2444] tracking-tight flex items-center gap-2">
              <span>HỆ THỐNG QUẢN LÝ TIẾN ĐỘ CHỈ ĐẠO & CHỈ TIÊU</span>
            </h1>
            <p className="text-[11px] text-slate-500 font-semibold">
              Đơn vị: <span className="text-[#a3212e]">{state.meta.donVi}</span> • Tháng theo dõi: <span className="text-[#a3212e]">{state.meta.thang}</span>
            </p>
          </div>

          <div className="flex items-center gap-3">
            {/* View Mode Toggle replacing the old Expand/Collapse board button */}
            {(activeTab === 'B' || activeTab === 'C' || activeTab === 'BC') && (
              <div className="flex items-center gap-1 bg-white p-1 rounded-xl border border-slate-200 shadow-sm">
                <button
                  type="button"
                  onClick={() => {
                    if (activeTab === 'B') handleSetViewModeB('card');
                    else if (activeTab === 'C') handleSetViewModeC('card');
                    else handleSetViewModeBC('card');
                  }}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${(activeTab === 'B' ? viewModeB : activeTab === 'C' ? viewModeC : viewModeBC) === 'card'
                    ? 'bg-[#a3212e] text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-950'
                    }`}
                  title="Xem dạng thẻ"
                >
                  <LayoutGrid className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Dạng thẻ</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (activeTab === 'B') handleSetViewModeB('excel');
                    else if (activeTab === 'C') handleSetViewModeC('excel');
                    else handleSetViewModeBC('excel');
                  }}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${(activeTab === 'B' ? viewModeB : activeTab === 'C' ? viewModeC : viewModeBC) === 'excel'
                    ? 'bg-[#a3212e] text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-950'
                    }`}
                  title="Xem dạng bảng Excel"
                >
                  <Table className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Bảng Excel</span>
                </button>
              </div>
            )}

            {/* Sticky Floating Add Task Trigger - Always visible to the left of notification button */}
            <button
              onClick={() => handleOpenGlobalAdd(activeTab === 'C' ? 'C' : 'B')}
              className="flex items-center gap-2 bg-[#a3212e] hover:bg-[#851b25] text-white px-3.5 sm:px-4 py-2 sm:py-2.5 rounded-xl transition shadow-md hover:shadow-lg font-bold text-xs cursor-pointer active:scale-95 shrink-0"
              title="Thêm nhiệm vụ mới"
            >
              <Plus className="w-4 h-4" />
              <span className="whitespace-nowrap">THÊM NHIỆM VỤ MỚI</span>
            </button>

            {/* Notification Panel Component */}
            <NotificationPanel
              state={state}
              daysUntil={daysUntil}
              onUpdateTask={updateTaskBC}
              onNavigateToTab={(tab) => {
                setActiveTab(tab);
              }}
              onOpenTaskDetail={(sec, taskId) => {
                setActiveTab(sec);
                setActiveEditingTaskId(taskId);
              }}
            />

            {/* Mode view (mục D) ở bên phải nút thông báo */}
            {activeTab === 'D' && (
              <div className="flex bg-slate-100 p-1 rounded-xl border border-slate-200 shadow-inner flex-none">
                <button
                  type="button"
                  onClick={() => handleSetViewModeD('list')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all outline-none cursor-pointer ${viewModeD === 'list'
                    ? 'bg-white text-[#a3212e] shadow-sm animate-fade-in'
                    : 'text-slate-600 hover:text-slate-900'
                    }`}
                  title="Xem dạng danh sách"
                >
                  <List className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Danh sách</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleSetViewModeD('kanban')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all outline-none cursor-pointer ${viewModeD === 'kanban'
                    ? 'bg-white text-[#a3212e] shadow-sm animate-fade-in'
                    : 'text-slate-600 hover:text-slate-900'
                    }`}
                  title="Xem dạng Kanban"
                >
                  <LayoutGrid className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Kanban view</span>
                </button>
              </div>
            )}
          </div>
        </div>

        {(() => {
          const hasData = state.A.length + state.B.length + state.C.length + state.D.length > 0;
          const shouldShowBackupReminder = hasData && shouldShowReminder;

          if (!shouldShowBackupReminder) return null;

          return (
            <div className="mb-3 flex items-start sm:items-center gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-amber-800 animate-fade-in">
              <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5 sm:mt-0" />
              <div className="flex-1 min-w-0 text-sm">
                <span className="font-semibold">Nhắc sao lưu dữ liệu: </span>
                {daysSinceBackup === null
                  ? 'Bạn chưa từng xuất Excel để sao lưu trên trình duyệt này.'
                  : `Đã ${daysSinceBackup} ngày kể từ lần xuất Excel gần nhất.`}{' '}
                Toàn bộ dữ liệu chỉ đang lưu trong trình duyệt này — xoá cache/đổi máy sẽ mất dữ liệu.
              </div>
              <button
                type="button"
                onClick={() => setActiveTab('excel')}
                className="shrink-0 px-3 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold transition-colors cursor-pointer"
              >
                Xuất Excel ngay
              </button>
              <button
                type="button"
                onClick={dismissBackupReminder}
                className="shrink-0 p-1 rounded-lg hover:bg-amber-100 text-amber-600 transition-colors cursor-pointer"
                title="Nhắc lại sau 3 ngày"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          );
        })()}

        {renderTabContent()}
      </main>

      {/* GLOBAL ADD TASK MODAL */}
      {isGlobalAddOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-6xl w-full max-h-[90vh] overflow-y-auto shadow-2xl border border-slate-100 flex flex-col">

            {/* Header */}
            <div className="bg-[#0f2444] text-white p-5 flex items-center justify-between sticky top-0 z-10">
              <div className="flex items-center gap-2.5">
                <Plus className="w-5 h-5 text-red-400 animate-pulse" />
                <div>
                  <h3 className="font-medium text-base tracking-wide uppercase">THÊM MỚI CHỈ ĐẠO / CHỈ TIÊU</h3>
                </div>
              </div>
              <button
                onClick={() => setIsGlobalAddOpen(false)}
                className="text-slate-300 hover:text-white p-1 rounded-lg hover:bg-white/10 transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleGlobalSaveTask} className="p-6 space-y-5">

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
                        id="add-task-so-number"
                        tabIndex={1}
                        className="col-span-4 bg-slate-50/50 border-none text-slate-800 px-1 py-1 text-xs font-bold outline-none text-center placeholder-slate-400"
                        placeholder="Số"
                        value={soNumberOnly}
                        onChange={(e) => handleSoNumberChange(e.target.value)}
                      />
                      <div className="col-span-1 flex items-center justify-center text-slate-400 font-bold">/</div>
                      <input
                        type="text"
                        id="add-task-so-symbol"
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
                      onChange={(e) => handleFullSoChange(e.target.value)}
                    />
                  </div>

                  {/* 2. Loại văn bản */}
                  <div>
                    <label className="block text-xs font-bold text-slate-600 mb-1">
                      Loại văn bản
                    </label>
                    <div className="flex gap-1.5">
                      <select
                        className="bg-white border border-slate-200 text-slate-700 px-2 py-2 rounded-lg text-xs font-semibold outline-none focus:border-[#a3212e] cursor-pointer flex-1"
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
                          className="bg-white border border-slate-200 text-slate-700 px-2.5 py-2 rounded-lg text-xs font-medium outline-none focus:border-[#a3212e] flex-1 min-w-[80px]"
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
                        className={`w-full flex items-center justify-center px-1 py-2 rounded-lg border transition cursor-pointer h-[38px] ${isFromCAT
                          ? 'bg-red-50 border-red-300 text-[#a3212e] shadow-sm'
                          : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                          }`}
                      >
                        <input
                          type="checkbox"
                          checked={isFromCAT}
                          onChange={() => { }} // handled by button onClick
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
                    <label className="block text-xs font-bold text-slate-600 mb-1">
                      Trích yếu nội dung văn bản <span className="text-[10px] text-slate-400 font-normal">(inline - không xuống dòng)</span>
                    </label>
                    <textarea
                      rows={2}
                      tabIndex={4}
                      className="w-full bg-white border-2 border-amber-400/80 focus:border-[#a3212e] text-slate-800 px-2.5 py-1.5 rounded-lg text-xs font-medium outline-none transition resize-none overflow-hidden"
                      placeholder="Tóm tắt nội dung văn bản gốc (tự động inline gọn)..."
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
                      Chỉ tiêu / Nội dung chỉ đạo cụ thể <span className="text-[10px] text-slate-400 font-normal">(giữ nguyên paragraph gốc)</span>
                    </label>
                    <textarea
                      rows={4}
                      tabIndex={5}
                      className="w-full bg-white border-2 border-amber-400/80 focus:border-[#a3212e] text-slate-800 px-2.5 py-1.5 rounded-lg text-xs font-medium outline-none transition whitespace-pre-wrap resize-none overflow-hidden"
                      placeholder="Nhập chi tiết nhiệm vụ, công việc (giữ nguyên vị trí xuống dòng của văn bản gốc)..."
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

                  {/* Sản phẩm */}
                  <div>
                    <label className="block text-xs font-bold text-slate-600 mb-1">
                      Sản phẩm <span className="text-slate-400 font-normal text-[10px]">(không tự động đổi trạng thái)</span>
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
                  {/* Thời hạn yêu cầu phức tạp (Field 4) */}
                  <div className="bg-[#fbfbfb] border border-slate-200/80 rounded-xl p-4 space-y-4 shadow-sm">
                    <span className="text-xs font-bold text-[#0f2444] tracking-wider uppercase block border-b border-slate-200/60 pb-1.5">
                      III. Thời hạn & Thực hiện
                    </span>

                    <MilestoneManager
                      danhSachMoc={danhSachMoc}
                      showStatus={false}
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
                      <span className="text-xs font-bold text-[#0f2444] tracking-wider uppercase block border-b border-slate-100 pb-1.5">
                        III. Giao thực hiện, Sản phẩm & Điểm số
                      </span>

                      <div className="grid grid-cols-12 gap-3.5">
                        {/* Đơn vị giao theo dõi, hướng dẫn */}
                        <div className="col-span-12 sm:col-span-9">
                          <label className="block text-xs font-bold text-slate-600 mb-1">
                            Đơn vị giao theo dõi, hướng dẫn... <span className="text-slate-400 font-normal text-[10px]">(ví dụ: PV01)</span>
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

                        {/* Điểm giao */}
                        <div className="col-span-12 sm:col-span-3">
                          <label className="block text-xs font-bold text-slate-600 mb-1">
                            Điểm giao
                          </label>
                          <input
                            type="number"
                            step="0.1"
                            min="0"
                            max="10"
                            className="w-full bg-white border border-slate-200 focus:border-[#a3212e] text-slate-800 px-2 py-1.5 rounded-lg text-xs font-semibold outline-none transition"
                            value={diemGiao}
                            onChange={(e) => setDiemGiao(parseFloat(e.target.value) || 0.5)}
                          />
                        </div>
                      </div>

                      <div>
                        {/* Đơn vị thực hiện */}
                        <label className="block text-xs font-bold text-slate-600 mb-1">
                          Chủ trì thực hiện
                        </label>
                        <input
                          type="text"
                          className="w-full bg-white border border-slate-200 focus:border-[#a3212e] text-slate-800 px-2 py-1.5 rounded-lg text-xs font-medium outline-none transition"
                          placeholder="Công an xã..."
                          value={donVi}
                          onChange={(e) => setDonVi(e.target.value)}
                        />
                      </div>

                      {/* Ghi chú */}
                      <div>
                        <label className="block text-xs font-bold text-slate-600 mb-1">
                          Ghi chú bổ sung
                        </label>
                        <input
                          type="text"
                          className="w-full bg-white border border-slate-200 focus:border-[#a3212e] text-slate-800 px-2.5 py-1.5 rounded-lg text-xs font-medium outline-none transition"
                          placeholder="Nhập ghi chú (nếu có)..."
                          value={ghiChu}
                          onChange={(e) => setGhiChu(e.target.value)}
                        />
                      </div>
                    </div>
                  )}
                </div>

              </div>

              {/* Submit Buttons */}
              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsGlobalAddOpen(false)}
                  className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs px-4 py-2.5 rounded-xl transition cursor-pointer"
                >
                  HỦY BỎ
                </button>
                <button
                  type="submit"
                  className="bg-[#0f2444] hover:bg-[#081528] text-white font-bold text-xs px-6 py-2.5 rounded-xl transition flex items-center gap-1.5 shadow-md cursor-pointer"
                >
                  <Save className="w-4 h-4" />
                  LƯU NHIỆM VỤ
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

      {/* Floating Saving feedback Toast */}
      <div
        className={`fixed bottom-6 right-6 bg-[#0f2444] border border-slate-700 text-white px-4 py-2.5 rounded-full shadow-2xl flex items-center gap-2 text-xs font-semibold transition-all duration-300 transform z-50 ${showSaveToast ? 'translate-y-0 opacity-100 scale-100' : 'translate-y-4 opacity-0 scale-95 pointer-events-none'
          }`}
      >
        <CheckCircle className="w-4 h-4 text-emerald-400" />
        <span>Tự động lưu...</span>
      </div>

      {/* Persistent banner shown when auto-save is failing — this is the app's
          only source of truth, so the user must know if it's not saving. */}
      {saveError && (
        <div className="fixed bottom-6 left-6 right-6 md:left-auto md:right-6 md:max-w-md bg-red-600 text-white px-4 py-3 rounded-xl shadow-2xl flex items-start gap-3 text-sm font-medium z-50">
          <AlertTriangle className="w-5 h-5 flex-shrink-0 mt-0.5" />
          <span>{saveError}</span>
        </div>
      )}
    </div>
  );
}
