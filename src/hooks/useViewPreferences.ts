/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState } from 'react';

type CardExcelMode = 'card' | 'excel';

const readLocalStorage = <T,>(key: string, fallback: T): T => {
  try {
    const raw = localStorage.getItem(key);
    return (raw as unknown as T) || fallback;
  } catch {
    return fallback;
  }
};

/**
 * View-mode toggles (card/excel per section, list/kanban for D) and workspace
 * layout flags. Each is persisted to localStorage so preferences survive a
 * page reload.
 */
export function useViewPreferences() {
  const [showSectionI_IV, setShowSectionI_IV] = useState<boolean>(() => {
    try {
      return localStorage.getItem('show_section_I_IV') === 'true';
    } catch {
      return false;
    }
  });

  const handleToggleSectionI_IV = () => {
    setShowSectionI_IV(prev => {
      const next = !prev;
      try {
        localStorage.setItem('show_section_I_IV', String(next));
      } catch { }
      return next;
    });
  };

  const [sidebarCollapsed, setSidebarCollapsed] = useState<boolean>(() => {
    try {
      return localStorage.getItem('sidebar_collapsed') === 'true';
    } catch {
      return false;
    }
  });

  const [workspaceExpanded, setWorkspaceExpanded] = useState<boolean>(false);

  const [viewModeB, setViewModeB] = useState<CardExcelMode>(() => readLocalStorage('mainB_viewMode', 'card' as CardExcelMode));
  const handleSetViewModeB = (mode: CardExcelMode) => {
    setViewModeB(mode);
    try { localStorage.setItem('mainB_viewMode', mode); } catch { }
  };

  const [viewModeC, setViewModeC] = useState<CardExcelMode>(() => readLocalStorage('mainC_viewMode', 'card' as CardExcelMode));
  const handleSetViewModeC = (mode: CardExcelMode) => {
    setViewModeC(mode);
    try { localStorage.setItem('mainC_viewMode', mode); } catch { }
  };

  const [viewModeBC, setViewModeBC] = useState<CardExcelMode>(() => readLocalStorage('mainBC_viewMode', 'card' as CardExcelMode));
  const handleSetViewModeBC = (mode: CardExcelMode) => {
    setViewModeBC(mode);
    try { localStorage.setItem('mainBC_viewMode', mode); } catch { }
  };

  const [viewModeD, setViewModeD] = useState<'list' | 'kanban'>(() => {
    try {
      return (localStorage.getItem('mainD_viewMode') as 'list' | 'kanban') || 'list';
    } catch {
      return 'list';
    }
  });
  const handleSetViewModeD = (mode: 'list' | 'kanban') => {
    setViewModeD(mode);
    try { localStorage.setItem('mainD_viewMode', mode); } catch { }
  };

  return {
    showSectionI_IV,
    handleToggleSectionI_IV,
    sidebarCollapsed,
    setSidebarCollapsed,
    workspaceExpanded,
    setWorkspaceExpanded,
    viewModeB,
    handleSetViewModeB,
    viewModeC,
    handleSetViewModeC,
    viewModeBC,
    handleSetViewModeBC,
    viewModeD,
    handleSetViewModeD,
  };
}
