/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useEffect, useState } from 'react';
import { getState, setState as setStateToDb } from '../db';
import { SEED_A, SEED_B, SEED_C, SEED_D } from '../data';
import { AppState, ActiveTab, TaskBC, TaskD } from '../types';
import { migrateTasks, compileCanCu } from '../utils/cancu';

const DEFAULT_DON_VI = 'Công an xã Nâm Nung';
const DEFAULT_THANG = '07/2026';

const buildDefaultState = (): AppState => ({
  meta: { donVi: DEFAULT_DON_VI, thang: DEFAULT_THANG },
  A: [], B: [], C: [], D: [], hiddenSidebarItems: []
});

const buildSeedState = (): AppState => ({
  meta: { donVi: DEFAULT_DON_VI, thang: DEFAULT_THANG },
  A: SEED_A,
  B: migrateTasks(SEED_B),
  C: migrateTasks(SEED_C),
  D: SEED_D,
  hiddenSidebarItems: []
});

// Attempts to send the current app state to a local backup server.
// Fails silently if the server is not running.
const sendBackupToServer = async (data: AppState) => {
  try {
    await fetch('http://localhost:3001/backup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
  } catch (error) {
    // Expected if the local backup server isn't running.
  }
};

/**
 * Owns the primary application data: loading it (with one-click restore
 * detection) from IndexedDB, auto-saving it back on every change, and every
 * CRUD operation over sections A/B/C/D.
 */
export function useAppState() {
  const [state, setState] = useState<AppState>(buildDefaultState());
  const [isLoading, setIsLoading] = useState(true);

  // Load state from IndexedDB on initial render, with restore check
  useEffect(() => {
    const loadState = async () => {
      // --- ONE-CLICK RESTORE LOGIC ---
      try {
        const response = await fetch('/restore.json');
        if (response.ok) {
          const restoredData = await response.json();

          if (restoredData && restoredData.meta && Array.isArray(restoredData.B)) {
            console.log('Restore file found, proceeding with data recovery.');

            await setStateToDb(restoredData);
            setState(restoredData);
            alert('Dữ liệu đã được phục hồi thành công từ file backup gần nhất!');

            try {
              await fetch('http://localhost:3001/delete-restore-file', { method: 'POST' });
              console.log('Restore file cleanup signal sent to server.');
            } catch (e) {
              console.error('Could not send cleanup signal to server:', e);
            }

            setIsLoading(false);
            return;
          }
        }
      } catch (error) {
        // Normal if the restore file doesn't exist. Silently continue.
      }
      // --- END OF RESTORE LOGIC ---

      try {
        const savedState = await getState();
        if (savedState) {
          savedState.B = migrateTasks(savedState.B || []);
          savedState.C = migrateTasks(savedState.C || []);
          if (savedState.meta && (savedState.meta.donVi === 'Công an xã Lộc Nga' || !savedState.meta.donVi)) {
            savedState.meta.donVi = DEFAULT_DON_VI;
          }
          setState(savedState);
        } else {
          setState(buildSeedState());
        }
      } catch (e) {
        console.error('Error loading state from IndexedDB:', e);
        setState(buildSeedState());
      } finally {
        setIsLoading(false);
      }
    };
    loadState();
  }, []);

  // Automatically save state to IndexedDB on changes (debounced)
  const [showSaveToast, setShowSaveToast] = useState(false);
  useEffect(() => {
    if (isLoading) return;

    const saveState = async () => {
      try {
        const stateToSave = {
          ...state,
          hiddenSidebarItems: state.hiddenSidebarItems?.filter(item => typeof item === 'string') || []
        };
        await setStateToDb(stateToSave);
        sendBackupToServer(stateToSave);

        setShowSaveToast(true);
        const timer = setTimeout(() => setShowSaveToast(false), 800);
        return () => clearTimeout(timer);
      } catch (e) {
        console.error('Error saving state to IndexedDB:', e);
      }
    };

    const debounceTimer = setTimeout(saveState, 300);
    return () => clearTimeout(debounceTimer);
  }, [state, isLoading]);

  const updateMeta = (field: keyof AppState['meta'], value: string) => {
    setState(prev => ({ ...prev, meta: { ...prev.meta, [field]: value } }));
  };

  const updateHiddenSidebarItems = (items: ActiveTab[]) => {
    setState(prev => ({ ...prev, hiddenSidebarItems: items }));
  };

  const updateStatusA = (idx: number, status: 'dam_bao' | 'khong_dam_bao' | '') => {
    setState(prev => {
      const copyA = [...prev.A];
      copyA[idx] = { ...copyA[idx], status };
      return { ...prev, A: copyA };
    });
  };

  const updateTaskBC = (section: 'B' | 'C', idx: number, fieldOrFields: keyof TaskBC | Partial<TaskBC>, value?: any) => {
    setState(prev => {
      const copy = [...prev[section]];
      let updatedItem = { ...copy[idx] };

      if (typeof fieldOrFields === 'object' && fieldOrFields !== null) {
        updatedItem = { ...updatedItem, ...fieldOrFields };
      } else {
        updatedItem = { ...updatedItem, [fieldOrFields as keyof TaskBC]: value };
      }

      // Auto transition status to 'Hoàn thành đúng hạn' if sanPham is entered and has content
      if (updatedItem.sanPham && updatedItem.sanPham.trim() !== '') {
        if (!updatedItem.trangThai || updatedItem.trangThai === 'Chưa hoàn thành') {
          updatedItem.trangThai = 'Hoàn thành đúng hạn';
        }
      }

      // If updating any of the 5 fields, compile canCu automatically
      const keys = typeof fieldOrFields === 'object' ? Object.keys(fieldOrFields) : [fieldOrFields];
      if (keys.some(k => ['loaiVanBan', 'so', 'ngay', 'donViBanHanh', 'trichYeu'].includes(k))) {
        updatedItem.canCu = compileCanCu(updatedItem);
      }

      copy[idx] = updatedItem;
      let updatedState = { ...prev };
      updatedState[section] = copy;

      // If updating Section B and it becomes recurring, auto-add to Section C
      const isRecurring = updatedItem.kieuThoiHan === 'truoc_ngay_hang_thang' || updatedItem.kieuThoiHan === 'hang_nam';
      if (section === 'B' && isRecurring) {
        const listC = prev.C;
        const existsInC = listC.some(t => t.noiDung === updatedItem.noiDung);
        if (!existsInC) {
          const maxSttC = listC.reduce((max, t) => t.stt > max ? t.stt : max, 0);
          const nextIdC = `C${listC.length + 1}_${Date.now().toString().slice(-4)}`;
          const itemC: TaskBC = { ...updatedItem, id: nextIdC, stt: maxSttC + 1 };
          updatedState.C = [...listC, itemC];
        }
      }

      return updatedState;
    });
  };

  const addTaskBC = (section: 'B' | 'C', newTask: Omit<TaskBC, 'id' | 'stt'>) => {
    setState(prev => {
      const list = prev[section];
      const maxStt = list.reduce((max, t) => t.stt > max ? t.stt : max, 0);
      const nextId = `${section}${list.length + 1}_${Date.now().toString().slice(-4)}`;

      const compiledCanCu = compileCanCu(newTask);
      let finalTrangThai = newTask.trangThai;
      if (newTask.sanPham && newTask.sanPham.trim() !== '') {
        if (!finalTrangThai || finalTrangThai === 'Chưa hoàn thành') {
          finalTrangThai = 'Hoàn thành đúng hạn';
        }
      }
      const item: TaskBC = {
        ...newTask,
        trangThai: finalTrangThai,
        id: nextId,
        stt: maxStt + 1,
        canCu: compiledCanCu
      };

      let updatedState = { ...prev };
      updatedState[section] = [...list, item];

      const isRecurring = newTask.kieuThoiHan === 'truoc_ngay_hang_thang' || newTask.kieuThoiHan === 'hang_nam';
      if (section === 'B' && isRecurring) {
        const listC = prev.C;
        const existsInC = listC.some(t => t.noiDung === newTask.noiDung);
        if (!existsInC) {
          const maxSttC = listC.reduce((max, t) => t.stt > max ? t.stt : max, 0);
          const nextIdC = `C${listC.length + 1}_${Date.now().toString().slice(-4)}`;
          const itemC: TaskBC = { ...newTask, id: nextIdC, stt: maxSttC + 1, canCu: compiledCanCu };
          updatedState.C = [...listC, itemC];
        }
      }

      return updatedState;
    });
  };

  const deleteTaskBC = (section: 'B' | 'C', idx: number) => {
    setState(prev => {
      const list = [...prev[section]];
      list.splice(idx, 1);
      const updatedList = list.map((t, i) => ({ ...t, stt: i + 1 }));
      return { ...prev, [section]: updatedList };
    });
  };

  const updateTaskD = (idx: number, field: keyof TaskD, value: any) => {
    setState(prev => {
      const copy = [...prev.D];
      copy[idx] = { ...copy[idx], [field]: value };
      return { ...prev, D: copy };
    });
  };

  const handleImportState = (newState: AppState) => {
    const migratedState = {
      ...newState,
      B: migrateTasks(newState.B || []),
      C: migrateTasks(newState.C || [])
    };
    setState(migratedState);
  };

  const resetToDefault = () => {
    setState(buildSeedState());
  };

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
