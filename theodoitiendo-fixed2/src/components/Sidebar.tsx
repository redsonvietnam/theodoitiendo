/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import {
  LayoutDashboard,
  Calendar as CalendarIcon,
  Kanban as KanbanIcon,
  CheckCircle,
  Clock,
  RefreshCw,
  FileText,
  FileSpreadsheet,
  ChevronLeft,
  ChevronRight,
  Eye,
  EyeOff,
  Layers,
  Settings
} from 'lucide-react';
import { ActiveTab, MetaData, TaskD } from '../types';

interface SidebarProps {
  activeTab: ActiveTab;
  setActiveTab: (tab: ActiveTab) => void;
  meta: MetaData;
  updateMeta: (field: keyof MetaData, value: string) => void;
  taskCounts: {
    A: number;
    B: number;
    C: number;
    D: number;
  };
  tasksD?: TaskD[];
  selectedSectionDIdx?: number | null;
  onSelectSectionD?: (idx: number) => void;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
  hiddenSidebarItems: ActiveTab[];
  updateHiddenSidebarItems: (items: ActiveTab[]) => void;
}

export default function Sidebar({
  activeTab,
  setActiveTab,
  meta,
  updateMeta,
  taskCounts,
  tasksD,
  selectedSectionDIdx,
  onSelectSectionD,
  isCollapsed,
  onToggleCollapse,
  hiddenSidebarItems,
  updateHiddenSidebarItems
}: SidebarProps) {
  const toggleCollapsed = () => {
    onToggleCollapse();
  };

  const allItems = [
    { id: 'dashboard', label: 'Tổng quan', icon: LayoutDashboard },
    { id: 'calendar', label: 'Lịch nhiệm vụ', icon: CalendarIcon, badge: 'Mới' },
    { id: 'A', label: 'I. Tiêu chí chung', icon: CheckCircle, count: taskCounts.A },
    { id: 'BC', label: 'II & III. Hiển thị chung', icon: Layers, count: taskCounts.B + taskCounts.C },
    { id: 'B', label: 'II. Có thời hạn', icon: Clock, count: taskCounts.B },
    { id: 'C', label: 'III. Thường xuyên', icon: RefreshCw, count: taskCounts.C },
    { id: 'D', label: 'IV. Chỉ tiêu QĐ11', icon: FileText, count: taskCounts.D },
    { id: 'excel', label: 'Nhập / Xuất Excel', icon: FileSpreadsheet },
  ];

  const menuItems = allItems.filter(item => !hiddenSidebarItems.includes(item.id as ActiveTab));

  const renderMenuItem = (item: any) => {
    const Icon = item.icon;
    const isActive = activeTab === item.id;

    // Get Section D subheaders if this is item D
    const isD = item.id === 'D';
    const subSections = isD && tasksD
      ? tasksD
        .map((t, index) => ({ t, index }))
        .filter(x => x.t.type === 'header' && x.t.title)
        .map(x => ({
          idx: x.index,
          title: x.t.title || ''
        }))
      : [];

    return (
      <div key={item.id} className="space-y-1">
        <button
          onClick={() => {
            setActiveTab(item.id);
            if (isD && subSections.length > 0 && onSelectSectionD && selectedSectionDIdx === null) {
              onSelectSectionD(subSections[0].idx);
            }
          }}
          className={`w-full flex items-center rounded-lg text-xs font-medium transition duration-200 cursor-pointer ${isCollapsed ? 'justify-center p-2.5' : 'justify-between px-3 py-2.5'
            } ${isActive
              ? 'bg-[#a3212e] text-white shadow-md'
              : 'text-slate-300 hover:bg-white/5 hover:text-white'
            }`}
          title={item.label}
        >
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="relative flex-none">
              <Icon className={`w-4 h-4 ${isActive ? 'text-white' : 'text-slate-400'}`} />
              {isCollapsed && ('badge' in item || 'count' in item) && (
                <span className="absolute -top-1 -right-1 w-2 h-2 bg-amber-500 rounded-full border border-[#0f2444]" />
              )}
            </div>
            {!isCollapsed && <span className="truncate">{item.label}</span>}
          </div>

          {/* Badges or Counts */}
          {!isCollapsed && (
            <div className="flex items-center gap-1.5 flex-none">
              {'badge' in item && item.badge && (
                <span className="bg-amber-500 text-[9px] text-[#0f2444] font-bold px-1.5 py-0.5 rounded shadow-sm">
                  {item.badge}
                </span>
              )}
              {'count' in item && item.count !== undefined && (
                <span className={`text-[10px] px-1.5 py-0.5 rounded font-mono ${isActive ? 'bg-white/20 text-white' : 'bg-white/5 text-slate-400'
                  }`}>
                  {item.count}
                </span>
              )}
            </div>
          )}
        </button>

        {/* Section D Subheaders nested collapsible dock */}
        {!isCollapsed && isD && subSections.length > 0 && (
          <div className="pl-2.5 pr-1 py-1 space-y-1 border-l border-white/10 ml-4 mt-1 max-h-[320px] overflow-y-auto custom-scrollbar">
            {subSections.map((sub) => {
              const cleanTitle = sub.title.split('\n')[0].split('(')[0].trim();
              const isSubActive = isActive && selectedSectionDIdx === sub.idx;
              return (
                <button
                  key={sub.idx}
                  onClick={() => {
                    if (onSelectSectionD) {
                      onSelectSectionD(sub.idx);
                    }
                  }}
                  className={`w-full text-left pl-3 pr-2 py-1.5 rounded-md text-[10px] leading-normal transition-all flex items-start gap-2 cursor-pointer ${isSubActive
                    ? 'bg-white/10 text-[#ddc06a] font-bold border-r-2 border-[#c9a227]'
                    : 'text-slate-400 hover:bg-white/5 hover:text-slate-200 font-medium'
                    }`}
                  title={sub.title}
                >
                  <span className={`w-1 h-1 rounded-full mt-1.5 flex-none ${isSubActive ? 'bg-[#ddc06a]' : 'bg-slate-500'
                    }`} />
                  <span className="line-clamp-2">{cleanTitle}</span>
                </button>
              );
            })}
          </div>
        )}
      </div>
    );
  };

  return (
    <aside className={`flex-none bg-gradient-to-b from-[#0f2444] to-[#173257] text-white flex flex-col md:sticky md:top-0 md:h-screen overflow-y-auto border-r border-slate-800 transition-all duration-300 ease-in-out ${isCollapsed ? 'w-16' : 'w-72'
      }`}>
      {/* Brand */}
      <div className={`border-b border-white/10 flex transition-all duration-300 ${isCollapsed ? 'p-3 flex-col items-center gap-3' : 'p-4 items-center justify-between gap-2'
        }`}>
        <div className={`flex items-center gap-3 min-w-0 ${isCollapsed ? 'justify-center' : ''}`}>
          <div className="w-10 h-10 rounded-full bg-[#a3212e] flex items-center justify-center font-display text-sm font-bold text-[#ddc06a] border-2 border-[#c9a227] shadow-lg animate-pulse flex-none">
            CA
          </div>
          {!isCollapsed && (
            <div className="min-w-0">
              <h1 className="font-display text-xs font-bold tracking-wide uppercase leading-tight text-white truncate max-w-[140px]" title={meta.donVi?.toUpperCase() || 'CÔNG AN XÃ NÂM NUNG'}>
                {meta.donVi?.toUpperCase() || 'CÔNG AN XÃ NÂM NUNG'}
              </h1>
              <p className="text-[9px] text-slate-300 font-medium truncate">
                Theo dõi chỉ tiêu công việc
              </p>
            </div>
          )}
        </div>

        {/* Toggle Button */}
        <button
          onClick={toggleCollapsed}
          className="p-1.5 rounded-lg hover:bg-white/10 text-slate-400 hover:text-white transition cursor-pointer flex-none"
          title={isCollapsed ? 'Mở rộng menu' : 'Thu nhỏ menu'}
        >
          {isCollapsed ? (
            <ChevronRight className="w-4 h-4" />
          ) : (
            <ChevronLeft className="w-4 h-4" />
          )}
        </button>
      </div>

      {/* Navigation */}
      <nav className={`flex-1 py-4 space-y-1 ${isCollapsed ? 'px-2' : 'px-3'}`}>
        {menuItems.map(item => renderMenuItem(item))}

        {/* Settings button */}
        <div className="pt-2 mt-2 border-t border-white/10">
          <button
            type="button"
            onClick={() => setActiveTab('settings')}
            className={`w-full flex items-center rounded-lg text-xs font-semibold transition cursor-pointer ${isCollapsed ? 'justify-center p-2.5' : 'justify-between px-3 py-2'} ${activeTab === 'settings' ? 'bg-white/10 text-white' : 'text-slate-400 hover:text-white hover:bg-white/5'}`}
            title="Cấu hình"
          >
            <div className="flex items-center gap-2.5 min-w-0">
              <Settings className="w-4 h-4" />
              {!isCollapsed && <span className="truncate">Cấu hình</span>}
            </div>
          </button>
        </div>
      </nav>

      {/* Footer */}
      <div className={`p-4 border-t border-white/10 text-[10px] text-slate-400 font-medium bg-[#0b1b33] flex transition-all duration-300 ${isCollapsed ? 'justify-center' : 'items-center gap-2'
        }`}>
        <span
          className="w-2 h-2 rounded-full bg-emerald-500 shadow-sm shadow-emerald-500/50 animate-pulse flex-none"
          title="Dữ liệu tự lưu trên thiết bị"
        />
        {!isCollapsed && <span className="truncate">Dữ liệu tự lưu trên thiết bị</span>}
      </div>
    </aside>
  );
}
