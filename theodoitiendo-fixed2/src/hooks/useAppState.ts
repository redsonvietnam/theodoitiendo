/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useEffect } from 'react';
import { useAppStore } from '../store/appStore';

/**
 * Thin wrapper around `useAppStore` (Zustand) that preserves the hook API
 * previously backed by a local `useState`. Triggers the initial load once,
 * and derives `taskCounts` for the sidebar badges.
 */
export function useAppState() {
  const state = useAppStore(s => s.state);
  const isLoading = useAppStore(s => s.isLoading);
  const showSaveToast = useAppStore(s => s.showSaveToast);
  const saveError = useAppStore(s => s.saveError);
  const backendAvailable = useAppStore(s => s.backendAvailable);
  const needsAuth = useAppStore(s => s.needsAuth);
  const authUser = useAppStore(s => s.authUser);
  const logout = useAppStore(s => s.logout);
  const load = useAppStore(s => s.load);
  const updateMeta = useAppStore(s => s.updateMeta);
  const updateHiddenSidebarItems = useAppStore(s => s.updateHiddenSidebarItems);
  const updateStatusA = useAppStore(s => s.updateStatusA);
  const updateTaskBC = useAppStore(s => s.updateTaskBC);
  const addTaskBC = useAppStore(s => s.addTaskBC);
  const deleteTaskBC = useAppStore(s => s.deleteTaskBC);
  const updateTaskD = useAppStore(s => s.updateTaskD);
  const handleImportState = useAppStore(s => s.handleImportState);
  const resetToDefault = useAppStore(s => s.resetToDefault);

  useEffect(() => {
    load();
  }, [load]);

  const taskCounts = {
    A: state.A?.length || 0,
    B: state.B?.length || 0,
    C: state.C?.length || 0,
    D: state.D?.filter(t => t.type === 'item').length || 0
  };

  return {
    state,
    isLoading,
    showSaveToast,
    saveError,
    backendAvailable,
    needsAuth,
    authUser,
    logout,
    taskCounts,
    updateMeta,
    updateHiddenSidebarItems,
    updateStatusA,
    updateTaskBC,
    addTaskBC,
    deleteTaskBC,
    updateTaskD,
    handleImportState,
    resetToDefault,
  };
}
