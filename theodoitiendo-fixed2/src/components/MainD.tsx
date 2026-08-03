/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { 
  Search, 
  ChevronDown, 
  ChevronRight, 
  CheckSquare, 
  Award, 
  LayoutGrid, 
  List, 
  ArrowLeft, 
  ArrowRight, 
  Eye, 
  X, 
  MessageSquare, 
  Filter, 
  Edit3, 
  AlertTriangle 
} from 'lucide-react';
import { TaskD } from '../types';

interface MainDProps {
  tasks: TaskD[];
  updateTask: (idx: number, field: keyof TaskD, value: any) => void;
  activeSectionIdx?: number | null;
  setActiveSectionIdx?: (idx: number | null) => void;
  viewMode: 'list' | 'kanban';
  setViewMode: (mode: 'list' | 'kanban') => void;
}

export default function MainD({ tasks, updateTask, activeSectionIdx, setActiveSectionIdx, viewMode, setViewMode }: MainDProps) {
  const [search, setSearch] = useState('');
  const [collapsedSections, setCollapsedSections] = useState<Record<number, boolean>>({});
  const [flashingSectionIdx, setFlashingSectionIdx] = useState<number | null>(null);

  // Kanban filters
  const [selectedSectionFilter, setSelectedSectionFilter] = useState<number | null>(null);
  const [selectedUnitFilter, setSelectedUnitFilter] = useState<string>('');

  // Selected task detail modal
  const [selectedDetailTask, setSelectedDetailTask] = useState<{
    originalIndex: number;
    task: TaskD;
  } | null>(null);

  // Scroll and expand logic on selection from external components (like sidebar)
  useEffect(() => {
    if (activeSectionIdx !== null && activeSectionIdx !== undefined) {
      // 1. Switch to list mode
      setViewMode('list');

      // 2. Force expand this section
      setCollapsedSections(prev => ({
        ...prev,
        [activeSectionIdx]: false
      }));

      // 3. Set flashing active section
      setFlashingSectionIdx(activeSectionIdx);
      const timer = setTimeout(() => {
        setFlashingSectionIdx(null);
      }, 2500); // Highlight for 2.5 seconds

      // 4. Scroll to element
      setTimeout(() => {
        const el = document.getElementById(`section-d-header-${activeSectionIdx}`);
        if (el) {
          el.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      }, 150);

      return () => clearTimeout(timer);
    }
  }, [activeSectionIdx]);

  // Status options for Section D
  const statusOptions = [
    'Đạt',
    'Chưa đạt',
    'Đang triển khai',
    'Không áp dụng'
  ] as const;

  const columnsD = [
    { title: 'Chưa đánh giá', value: '', color: 'border-t-slate-400 bg-slate-50', text: 'text-slate-600', badgeBg: 'bg-slate-200 text-slate-700' },
    { title: 'Chưa đạt', value: 'Chưa đạt', color: 'border-t-red-500 bg-red-50/20', text: 'text-red-700', badgeBg: 'bg-red-100 text-red-700' },
    { title: 'Đang triển khai', value: 'Đang triển khai', color: 'border-t-blue-500 bg-blue-50/20', text: 'text-blue-700', badgeBg: 'bg-blue-100 text-blue-700' },
    { title: 'Đạt', value: 'Đạt', color: 'border-t-emerald-500 bg-emerald-50/20', text: 'text-emerald-700', badgeBg: 'bg-emerald-100 text-emerald-700' },
    { title: 'Không áp dụng', value: 'Không áp dụng', color: 'border-t-slate-500 bg-slate-100/30', text: 'text-slate-500', badgeBg: 'bg-slate-200 text-slate-600' }
  ] as const;

  // Toggle collapse for a header section
  const toggleCollapse = (headerIdx: number) => {
    setCollapsedSections(prev => ({
      ...prev,
      [headerIdx]: !prev[headerIdx]
    }));
  };

  // Group tasks into sections based on headers for the list view
  const getGroupedSections = () => {
    const groups: { header: TaskD & { originalIndex: number }; items: (TaskD & { originalIndex: number })[] }[] = [];
    let currentGroup: { header: TaskD & { originalIndex: number }; items: (TaskD & { originalIndex: number })[] } | null = null;

    tasks.forEach((row, idx) => {
      if (row.type === 'header') {
        if (currentGroup) {
          groups.push(currentGroup);
        }
        currentGroup = {
          header: { ...row, originalIndex: idx },
          items: []
        };
      } else if (row.type === 'item' && currentGroup) {
        // Apply search if active
        const hay = `${row.content} ${row.yeuCau} ${row.donVi} ${row.stt}`.toLowerCase();
        if (!search || hay.includes(search.toLowerCase())) {
          currentGroup.items.push({ ...row, originalIndex: idx });
        }
      }
    });

    if (currentGroup) {
      groups.push(currentGroup);
    }

    return groups.filter(g => g.items.length > 0);
  };

  // Extract all section headers
  const getSectionHeaders = () => {
    return tasks
      .map((t, idx) => ({ ...t, originalIndex: idx }))
      .filter(t => t.type === 'header' && t.title);
  };

  // Extract unique units for filtering
  const getUniqueUnits = () => {
    const items = tasks.filter(r => r.type === 'item');
    return Array.from(new Set(items.map(t => t.donVi).filter(Boolean))).sort() as string[];
  };

  // Extract Kanban cards belonging to a column
  const getKanbanColumnCards = (colValue: string) => {
    const cards: (TaskD & { originalIndex: number; sectionTitle?: string })[] = [];
    let currentHeaderTitle = '';
    let currentHeaderIdx = -1;

    tasks.forEach((row, idx) => {
      if (row.type === 'header') {
        currentHeaderTitle = row.title || '';
        currentHeaderIdx = idx;
      } else if (row.type === 'item') {
        // Match status column
        if ((row.trangThai || '') !== colValue) {
          return;
        }

        // Match section filter
        if (selectedSectionFilter !== null && currentHeaderIdx !== selectedSectionFilter) {
          return;
        }

        // Match unit filter
        if (selectedUnitFilter && row.donVi !== selectedUnitFilter) {
          return;
        }

        // Match search query
        const hay = `${row.content} ${row.yeuCau} ${row.donVi} ${row.stt}`.toLowerCase();
        if (!search || hay.includes(search.toLowerCase())) {
          cards.push({
            ...row,
            originalIndex: idx,
            sectionTitle: currentHeaderTitle
          });
        }
      }
    });

    return cards;
  };

  // Drag & Drop Handlers
  const handleDragStart = (e: React.DragEvent, originalIndex: number) => {
    e.dataTransfer.setData('text/plain', originalIndex.toString());
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent, colValue: any) => {
    e.preventDefault();
    const originalIndex = parseInt(e.dataTransfer.getData('text/plain'), 10);
    if (!isNaN(originalIndex)) {
      updateTask(originalIndex, 'trangThai', colValue);
    }
  };

  // Click manually move card left/right
  const moveCard = (originalIndex: number, currentVal: string, dir: 'left' | 'right') => {
    const colValues = columnsD.map(c => c.value);
    const curIdx = colValues.indexOf(currentVal as any);
    
    let nextIdx = curIdx + (dir === 'left' ? -1 : 1);
    if (nextIdx >= 0 && nextIdx < colValues.length) {
      updateTask(originalIndex, 'trangThai', colValues[nextIdx]);
    }
  };

  const sections = getGroupedSections();
  const itemsOnly = tasks.filter(t => t.type === 'item');
  const totalItemsCount = itemsOnly.length;
  const totalUpdatedCount = itemsOnly.filter(t => t.trangThai).length;

  return (
    <div className="space-y-6">
      {/* Header with dual statistics */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-slate-200 pb-5">
        <div>
          <h2 className="font-display text-2xl font-bold text-[#0f2444] tracking-wide flex items-center gap-2">
            MỤC IV • CHỈ TIÊU THEO QUYẾT ĐỊNH SỐ 11
          </h2>
          <p className="text-sm text-slate-500 font-medium mt-1">
            Quy định số 11/QĐ-CAT-PV01-TMCS về theo dõi tiến độ thực hiện chỉ tiêu của Công an cấp xã.
          </p>
        </div>
        
        {/* Visual progress card */}
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-3 bg-white px-4 py-2.5 border border-slate-200 rounded-xl shadow-xs">
            <CheckSquare className="w-5 h-5 text-[#a3212e]" />
            <div className="text-xs">
              <span className="text-slate-500 block font-semibold uppercase tracking-wider text-[9px]">Tổng tiến trình</span>
              <span className="font-display font-bold text-base text-[#0f2444]">
                {totalUpdatedCount} / {totalItemsCount} hoàn thành
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Toolbar filters - dynamically updates depending on view mode */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 flex flex-wrap gap-3 items-center shadow-sm">
        {/* Search Input */}
        <div className="relative flex-1 min-w-[240px]">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            className="w-full bg-slate-50 border border-slate-200 focus:border-[#a3212e] focus:bg-white text-slate-800 pl-10 pr-4 py-2 rounded-lg text-xs font-medium outline-none transition placeholder-slate-400"
            placeholder="Tìm theo nội dung chỉ tiêu, yêu cầu..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        {/* Section filter - Kanban view only */}
        {viewMode === 'kanban' && (
          <div className="relative flex-none min-w-[180px]">
            <select
              className="w-full bg-white border border-slate-200 text-slate-700 px-3 py-2 rounded-lg text-xs font-semibold outline-none focus:border-[#a3212e] cursor-pointer appearance-none pr-8 truncate"
              value={selectedSectionFilter === null ? '' : selectedSectionFilter}
              onChange={(e) => {
                const val = e.target.value;
                setSelectedSectionFilter(val === '' ? null : parseInt(val, 10));
              }}
            >
              <option value="">— Tất cả nhóm chỉ tiêu —</option>
              {getSectionHeaders().map(h => (
                <option key={h.originalIndex} value={h.originalIndex}>
                  {h.title?.split('\n')[0].trim()}
                </option>
              ))}
            </select>
            <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>
        )}

        {/* Unit Filter */}
        <div className="relative flex-none min-w-[160px]">
          <select
            className="w-full bg-white border border-slate-200 text-slate-700 px-3 py-2 rounded-lg text-xs font-semibold outline-none focus:border-[#a3212e] cursor-pointer appearance-none pr-8"
            value={selectedUnitFilter}
            onChange={(e) => setSelectedUnitFilter(e.target.value)}
          >
            <option value="">— Tất cả đơn vị —</option>
            {getUniqueUnits().map(u => (
              <option key={u} value={u}>{u}</option>
            ))}
          </select>
          <Filter className="w-3.5 h-3.5 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
        </div>

        {/* Count badge */}
        <span className="bg-slate-100 text-slate-600 text-xs font-mono font-bold px-3 py-1.5 rounded-lg ml-auto">
          Hiển thị {viewMode === 'list' 
            ? sections.reduce((sum, s) => sum + s.items.length, 0) 
            : columnsD.reduce((sum, col) => sum + getKanbanColumnCards(col.value).length, 0)
          } / {totalItemsCount} chỉ tiêu
        </span>
      </div>

      {/* Main Content Render */}
      {viewMode === 'list' ? (
        /* ================= LIST VIEW (ACCORDION) ================= */
        sections.length === 0 ? (
          <div className="bg-white border border-slate-200 rounded-xl p-8 text-center text-slate-400 font-semibold text-xs">
            Không tìm thấy chỉ tiêu nào phù hợp với bộ lọc.
          </div>
        ) : (
          <div className="space-y-4">
            {sections.map((sec) => {
              const hIdx = sec.header.originalIndex;
              const isCollapsed = collapsedSections[hIdx];
              const isFlashing = flashingSectionIdx === hIdx;

              return (
                <div 
                  key={hIdx} 
                  id={`section-d-header-${hIdx}`} 
                  className={`bg-white border rounded-xl overflow-hidden shadow-xs transition-all duration-500 scroll-mt-6 ${
                    isFlashing 
                      ? 'border-[#a3212e] ring-2 ring-[#a3212e]/30 scale-[1.002] shadow-md' 
                      : 'border-slate-200'
                  }`}
                >
                  {/* Section Header Accordion */}
                  <button
                    onClick={() => toggleCollapse(hIdx)}
                    className={`w-full px-5 py-3.5 flex items-center justify-between text-left cursor-pointer outline-none transition-colors duration-500 ${
                      isFlashing 
                        ? 'bg-[#a3212e] text-white' 
                        : 'bg-[#0f2444] text-white hover:bg-[#152e55]'
                    }`}
                  >
                    <span className="font-display text-xs font-bold uppercase tracking-wider">
                      {sec.header.title}
                    </span>
                    {isCollapsed ? (
                      <ChevronRight className="w-4 h-4 text-slate-300" />
                    ) : (
                      <ChevronDown className="w-4 h-4 text-slate-300" />
                    )}
                  </button>

                  {/* Section Items */}
                  {!isCollapsed && (
                    <div className="divide-y divide-slate-100 px-5">
                      {sec.items.map((row) => (
                        <div key={row.originalIndex} className="py-4 flex flex-col md:flex-row items-start gap-4">
                          {/* Number Badge */}
                          <div className="w-7 h-7 rounded-lg bg-slate-100 text-slate-600 font-mono font-bold text-xs flex items-center justify-center flex-none">
                            {row.stt}
                          </div>

                          {/* Content details */}
                          <div className="flex-1 space-y-3 min-w-0">
                            <div>
                              <p className="text-xs font-semibold text-slate-800 leading-relaxed whitespace-pre-line">
                                {row.content}
                              </p>
                            </div>
                            
                            {row.yeuCau && (
                              <div className="bg-slate-50/70 p-2.5 rounded-lg border border-slate-100 text-[11px] font-medium text-slate-500 leading-relaxed">
                                <span className="font-bold text-slate-600 block mb-0.5">Yêu cầu chỉ tiêu:</span>
                                {row.yeuCau}
                              </div>
                            )}

                            {/* Controls Row */}
                            <div className="flex flex-wrap items-center gap-3 pt-1">
                              {row.donVi && (
                                <span className="bg-sky-50 text-sky-700 text-[10px] font-bold px-2 py-0.5 rounded border border-sky-100">
                                  {row.donVi}
                                </span>
                              )}
                              
                              {/* Status dropdown */}
                              <select
                                className={`border px-2.5 py-1 rounded-lg text-[11px] font-bold outline-none cursor-pointer ${
                                  row.trangThai === 'Đạt'
                                    ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                    : row.trangThai === 'Đang triển khai'
                                      ? 'bg-blue-50 text-blue-700 border-blue-200'
                                      : row.trangThai === 'Chưa đạt'
                                        ? 'bg-red-50 text-red-700 border-red-200'
                                        : 'bg-slate-50 text-slate-600 border-slate-200'
                                }`}
                                value={row.trangThai || ''}
                                onChange={(e) => updateTask(row.originalIndex, 'trangThai', e.target.value)}
                              >
                                <option value="">— Chưa đánh giá —</option>
                                {statusOptions.map(o => (
                                  <option key={o} value={o}>{o}</option>
                                ))}
                              </select>

                              {/* Ghi chú input */}
                              <input
                                type="text"
                                className="bg-slate-50 border border-slate-200 focus:border-[#a3212e] focus:bg-white text-slate-700 px-3 py-1 rounded-lg text-[11px] font-medium outline-none transition flex-1 min-w-[200px]"
                                value={row.ghiChu || ''}
                                onChange={(e) => updateTask(row.originalIndex, 'ghiChu', e.target.value)}
                                placeholder="Nhập ghi chú kết quả / tiến trình thực hiện..."
                              />
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )
      ) : (
        /* ================= KANBAN BOARD VIEW (DECISION 11) ================= */
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4 items-start overflow-x-auto pb-4">
          {columnsD.map((col) => {
            const cards = getKanbanColumnCards(col.value);

            return (
              <div
                key={col.title}
                onDragOver={handleDragOver}
                onDrop={(e) => handleDrop(e, col.value)}
                className="bg-slate-100/80 rounded-xl p-3 flex flex-col gap-3 min-h-[500px] border border-slate-200/80 shadow-xs"
              >
                {/* Column Header */}
                <div className={`border-t-3 ${col.color} p-2 rounded bg-white shadow-xs flex items-center justify-between`}>
                  <h4 className={`text-xs font-bold uppercase tracking-wider ${col.text}`}>
                    {col.title}
                  </h4>
                  <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-full ${col.badgeBg}`}>
                    {cards.length}
                  </span>
                </div>

                {/* Column Cards Container */}
                <div className="space-y-3 flex-1 overflow-y-auto max-h-[550px] pr-1">
                  {cards.map((card) => {
                    // Extract abbreviated section name
                    const rawTitle = card.sectionTitle || '';
                    const shortGroup = rawTitle.startsWith('I.') 
                      ? 'Nhóm I' 
                      : rawTitle.startsWith('II.') 
                        ? 'Nhóm II' 
                        : rawTitle.startsWith('III.') 
                          ? 'Nhóm III' 
                          : rawTitle.startsWith('IV.') 
                            ? 'Nhóm IV' 
                            : 'Chỉ tiêu';

                    return (
                      <div
                        key={card.originalIndex}
                        draggable
                        onDragStart={(e) => handleDragStart(e, card.originalIndex)}
                        className="bg-white border border-slate-200 rounded-lg p-3 shadow-xs hover:shadow-md transition duration-150 cursor-grab active:cursor-grabbing group relative space-y-2.5 border-l-3 border-l-slate-400"
                      >
                        {/* Header metadata row */}
                        <div className="flex items-center justify-between gap-1 flex-wrap text-[9px] font-semibold text-slate-400">
                          <span className="bg-slate-100 text-[#0f2444] font-mono font-bold px-1.5 py-0.5 rounded flex items-center gap-0.5">
                            STT {card.stt}
                          </span>
                          <span className="bg-[#f4f2ec] text-[#0f2444]/80 px-1.5 py-0.5 rounded font-bold uppercase tracking-wide">
                            {shortGroup}
                          </span>
                        </div>

                        {/* Card criteria content */}
                        <p className="text-xs font-semibold text-slate-800 leading-relaxed line-clamp-3" title={card.content}>
                          {card.content}
                        </p>

                        {/* Assignee unit */}
                        {card.donVi && (
                          <div className="flex items-center gap-1">
                            <span className="bg-sky-50 text-sky-700 text-[9px] font-bold px-1.5 py-0.5 rounded border border-sky-100/50">
                              {card.donVi}
                            </span>
                          </div>
                        )}

                        {/* Mini note strip if present */}
                        {card.ghiChu && (
                          <div className="bg-slate-50/80 rounded border border-slate-100 p-1.5 flex items-start gap-1 text-[10px] text-slate-500 leading-snug">
                            <MessageSquare className="w-3 h-3 text-slate-400 mt-0.5 flex-none" />
                            <span className="line-clamp-2">{card.ghiChu}</span>
                          </div>
                        )}

                        {/* Interactive Footer & Actions */}
                        <div className="flex items-center justify-between border-t border-slate-100 pt-1.5 bg-slate-50/50 -mx-3 -mb-3 p-1.5 rounded-b-lg">
                          {/* Left quick transfer */}
                          <button
                            onClick={() => moveCard(card.originalIndex, col.value, 'left')}
                            disabled={col.value === columnsD[0].value}
                            className="p-1 hover:bg-slate-200 rounded text-slate-500 disabled:opacity-20 cursor-pointer outline-none"
                            title="Di chuyển sang cột bên trái"
                          >
                            <ArrowLeft className="w-3 h-3" />
                          </button>

                          {/* Quick note write / detail opener */}
                          <button
                            onClick={() => setSelectedDetailTask({ originalIndex: card.originalIndex, task: card })}
                            className="text-[9px] font-bold text-[#0f2444] hover:text-[#a3212e] px-2 py-0.5 rounded transition flex items-center gap-1 cursor-pointer outline-none hover:bg-white border border-transparent hover:border-slate-200"
                          >
                            <Edit3 className="w-3 h-3" /> Cập nhật
                          </button>

                          {/* Right quick transfer */}
                          <button
                            onClick={() => moveCard(card.originalIndex, col.value, 'right')}
                            disabled={col.value === columnsD[columnsD.length - 1].value}
                            className="p-1 hover:bg-slate-200 rounded text-slate-500 disabled:opacity-20 cursor-pointer outline-none"
                            title="Di chuyển sang cột bên phải"
                          >
                            <ArrowRight className="w-3 h-3" />
                          </button>
                        </div>
                      </div>
                    );
                  })}

                  {cards.length === 0 && (
                    <div className="text-center py-10 text-slate-300 font-bold text-[10px] border-2 border-dashed border-slate-200 rounded-lg">
                      Kéo thả chỉ tiêu vào đây
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* DETAILED DIALOG MODAL FOR UPDATING INDIVIDUAL CRITERION */}
      {selectedDetailTask && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-slate-200 max-w-lg w-full overflow-hidden shadow-2xl animate-fade-in flex flex-col">
            {/* Header */}
            <div className="bg-[#0f2444] text-white px-5 py-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="bg-white/10 px-2 py-0.5 rounded text-xs font-mono font-bold text-[#ddc06a]">
                  STT {selectedDetailTask.task.stt}
                </span>
                <span className="text-xs font-bold uppercase tracking-wider text-slate-200">
                  Cập nhật tiến độ chỉ tiêu QĐ11
                </span>
              </div>
              <button 
                onClick={() => setSelectedDetailTask(null)}
                className="text-white hover:bg-white/10 p-1 rounded-lg cursor-pointer outline-none transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Body */}
            <div className="p-6 space-y-4 max-h-[75vh] overflow-y-auto text-xs">
              {/* Category */}
              {selectedDetailTask.task.sectionTitle && (
                <div>
                  <span className="text-[10px] font-bold text-slate-400 tracking-wider uppercase block mb-0.5">
                    Nhóm danh mục chỉ tiêu
                  </span>
                  <p className="text-[#a3212e] font-bold">
                    {selectedDetailTask.task.sectionTitle}
                  </p>
                </div>
              )}

              {/* Core Content */}
              <div>
                <span className="text-[10px] font-bold text-slate-400 tracking-wider uppercase block mb-1">
                  Nội dung chỉ tiêu
                </span>
                <p className="text-slate-800 font-bold leading-relaxed text-xs bg-slate-50 p-3 rounded-xl border border-slate-100">
                  {selectedDetailTask.task.content}
                </p>
              </div>

              {/* Requirement details */}
              {selectedDetailTask.task.yeuCau && (
                <div>
                  <span className="text-[10px] font-bold text-slate-400 tracking-wider uppercase block mb-1">
                    Yêu cầu / Hướng dẫn thực hiện
                  </span>
                  <p className="text-slate-600 font-medium leading-relaxed bg-[#fbfbfb] p-3 rounded-xl border border-slate-100">
                    {selectedDetailTask.task.yeuCau}
                  </p>
                </div>
              )}

              {/* Controls */}
              <div className="grid grid-cols-2 gap-4 pt-1">
                <div>
                  <span className="text-[10px] font-bold text-slate-400 tracking-wider uppercase block mb-1">
                    Đơn vị phụ trách
                  </span>
                  <div className="bg-slate-50 border border-slate-100 px-3 py-2 rounded-lg text-xs font-bold text-slate-700">
                    {selectedDetailTask.task.donVi || 'Công an cấp xã'}
                  </div>
                </div>

                <div>
                  <span className="text-[10px] font-bold text-slate-400 tracking-wider uppercase block mb-1">
                    Trạng thái đánh giá
                  </span>
                  <select
                    className="w-full bg-slate-50 border border-slate-200 text-slate-700 px-3 py-2 rounded-lg text-xs font-bold focus:border-[#a3212e] focus:bg-white outline-none cursor-pointer"
                    value={selectedDetailTask.task.trangThai || ''}
                    onChange={(e) => {
                      const updatedVal = e.target.value as any;
                      updateTask(selectedDetailTask.originalIndex, 'trangThai', updatedVal);
                      setSelectedDetailTask(prev => prev ? {
                        ...prev,
                        task: { ...prev.task, trangThai: updatedVal }
                      } : null);
                    }}
                  >
                    <option value="">— Chưa đánh giá —</option>
                    {statusOptions.map(o => (
                      <option key={o} value={o}>{o}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Notes Area */}
              <div>
                <span className="text-[10px] font-bold text-slate-400 tracking-wider uppercase block mb-1">
                  Ghi chú kết quả / Diễn giải tiến trình
                </span>
                <textarea
                  rows={4}
                  className="w-full bg-slate-50 border border-slate-200 focus:border-[#a3212e] focus:bg-white text-slate-700 px-3 py-2 rounded-lg text-xs font-medium outline-none transition resize-none"
                  placeholder="Nhập ghi chú kết quả đạt được, số liệu, văn bản ban hành..."
                  value={selectedDetailTask.task.ghiChu || ''}
                  onChange={(e) => {
                    const noteVal = e.target.value;
                    updateTask(selectedDetailTask.originalIndex, 'ghiChu', noteVal);
                    setSelectedDetailTask(prev => prev ? {
                      ...prev,
                      task: { ...prev.task, ghiChu: noteVal }
                    } : null);
                  }}
                />
              </div>
            </div>

            {/* Footer */}
            <div className="bg-slate-50 px-5 py-3.5 flex justify-end">
              <button
                onClick={() => setSelectedDetailTask(null)}
                className="bg-[#0f2444] text-white px-4 py-2 rounded-lg text-xs font-bold hover:bg-[#18355e] transition cursor-pointer outline-none"
              >
                Hoàn thành & Đóng
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
