/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { create } from 'zustand';
import { getState as getDbState, setState as setDbState } from '../db';
import { SEED_A, SEED_B, SEED_C, SEED_D } from '../data';
import { AppState, ActiveTab, TaskBC, TaskD } from '../types';
import { migrateTasks, compileCanCu } from '../utils/cancu';
import {
  checkBackendHealth, login as backendLogin, fetchMe, fetchState, pushState,
  getToken, setToken, clearToken, AuthRequiredError, AuthUser,
} from '../api/backendClient';

const DEFAULT_DON_VI = 'Công an xã Nâm Nung';
const DEFAULT_THANG = '07/2026';

export const buildDefaultState = (): AppState => ({
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

interface AppStore {
  state: AppState;
  isLoading: boolean;
  showSaveToast: boolean;
  /** Set when the last auto-save attempt failed — surfaced to the user in the UI. */
  saveError: string | null;
  /** Guards against double-invocation (e.g. React StrictMode double-effects). */
  hasLoaded: boolean;

  /** null = not checked yet, true = `node server.js` detected, false = plain IndexedDB-only mode. */
  backendAvailable: boolean | null;
  /** True once backend is confirmed available but no valid session token is held — App should show the login screen. */
  needsAuth: boolean;
  authToken: string | null;
  authUser: AuthUser | null;
  authError: string | null;
  isAuthenticating: boolean;

  login: (username: string, password: string) => Promise<void>;
  logout: () => void;
  /** Internal: fetches state+user for a held token. Returns true if it fully handled the outcome
   *  (success, or expired-token → login screen); false means "network hiccup, caller should fall
   *  back to IndexedDB". */
  loadFromBackendState: (token: string) => Promise<boolean>;

  load: () => Promise<void>;
  updateMeta: (field: keyof AppState['meta'], value: string) => void;
  updateHiddenSidebarItems: (items: ActiveTab[]) => void;
  updateStatusA: (idx: number, status: 'dam_bao' | 'khong_dam_bao' | '') => void;
  updateTaskBC: (section: 'B' | 'C', idx: number, fieldOrFields: keyof TaskBC | Partial<TaskBC>, value?: any) => void;
  addTaskBC: (section: 'B' | 'C', newTask: Omit<TaskBC, 'id' | 'stt'>) => void;
  deleteTaskBC: (section: 'B' | 'C', idx: number) => void;
  updateTaskD: (idx: number, field: keyof TaskD, value: any) => void;
  handleImportState: (newState: AppState) => void;
  resetToDefault: () => void;
}

/**
 * Central store for the app's primary data (sections A/B/C/D + meta).
 * Replaces what used to be one giant `useState` in `App.tsx`: any component
 * can now read/subscribe to just the slice it needs via `useAppStore(s => ...)`
 * instead of receiving everything through prop drilling.
 */
export const useAppStore = create<AppStore>()((set, get) => ({
  state: buildDefaultState(),
  isLoading: true,
  showSaveToast: false,
  saveError: null,
  hasLoaded: false,

  backendAvailable: null,
  needsAuth: false,
  authToken: null,
  authUser: null,
  authError: null,
  isAuthenticating: false,

  login: async (username, password) => {
    set({ isAuthenticating: true, authError: null });
    try {
      const { token } = await backendLogin(username, password);
      setToken(token);
      const ok = await get().loadFromBackendState(token);
      set({ isAuthenticating: false });
      if (!ok) {
        set({ authError: 'Đăng nhập thành công nhưng không tải được dữ liệu từ máy chủ. Vui lòng thử lại.' });
      }
    } catch (e) {
      set({
        isAuthenticating: false,
        authError: e instanceof Error ? e.message : 'Đăng nhập thất bại.',
      });
    }
  },

  logout: () => {
    clearToken();
    set({ authToken: null, authUser: null, needsAuth: true });
  },

  loadFromBackendState: async (token) => {
    try {
      const [remote, me] = await Promise.all([fetchState(token), fetchMe(token)]);
      let savedState = remote ? { ...remote } : null;
      if (savedState) {
        savedState.B = migrateTasks(savedState.B || []);
        savedState.C = migrateTasks(savedState.C || []);
        if (savedState.meta && (savedState.meta.donVi === 'Công an xã Lộc Nga' || !savedState.meta.donVi)) {
          savedState.meta.donVi = DEFAULT_DON_VI;
        }
      } else {
        savedState = buildSeedState();
      }
      set({
        state: savedState, isLoading: false,
        authToken: token, authUser: me, needsAuth: false, authError: null,
      });
      // Cache to IndexedDB so the app still shows something if the server drops later.
      Promise.resolve(setDbState(savedState)).catch(() => {});
      return true;
    } catch (e) {
      if (e instanceof AuthRequiredError) {
        clearToken();
        set({ authToken: null, authUser: null, needsAuth: true, isLoading: false });
        return true; // handled — login screen will be shown, don't fall back to IndexedDB
      }
      console.error('Error loading state from backend:', e);
      return false; // transient network error — let the caller fall back to IndexedDB
    }
  },

  load: async () => {
    if (get().hasLoaded) return;
    set({ hasLoaded: true });

    // --- ONE-CLICK RESTORE LOGIC ---
    try {
      const response = await fetch('/restore.json');
      if (response.ok) {
        const restoredData = await response.json();

        if (restoredData && restoredData.meta && Array.isArray(restoredData.B)) {
          console.log('Restore file found, proceeding with data recovery.');

          await setDbState(restoredData);
          set({ state: restoredData, isLoading: false });
          alert('Dữ liệu đã được phục hồi thành công từ file backup gần nhất!');

          try {
            await fetch('http://localhost:3001/delete-restore-file', { method: 'POST' });
            console.log('Restore file cleanup signal sent to server.');
          } catch (e) {
            console.error('Could not send cleanup signal to server:', e);
          }
          return;
        }
      }
    } catch (error) {
      // Normal if the restore file doesn't exist. Silently continue.
    }
    // --- END OF RESTORE LOGIC ---

    // --- BACKEND DETECTION (node server.js) ---
    // Resolves false (never throws) on timeout/network error, so a missing/down
    // backend transparently falls through to the plain IndexedDB flow below.
    const backendUp = await checkBackendHealth();
    set({ backendAvailable: backendUp });

    if (backendUp) {
      const token = getToken();
      if (token) {
        const handled = await get().loadFromBackendState(token);
        if (handled) return;
        // else: transient network error after health check passed — fall back to IndexedDB below.
      } else {
        set({ needsAuth: true, isLoading: false });
        return;
      }
    }
    // --- END OF BACKEND DETECTION ---

    try {
      const savedState = await getDbState();
      if (savedState) {
        savedState.B = migrateTasks(savedState.B || []);
        savedState.C = migrateTasks(savedState.C || []);
        if (savedState.meta && (savedState.meta.donVi === 'Công an xã Lộc Nga' || !savedState.meta.donVi)) {
          savedState.meta.donVi = DEFAULT_DON_VI;
        }
        set({ state: savedState, isLoading: false });
      } else {
        set({ state: buildSeedState(), isLoading: false });
      }
    } catch (e) {
      console.error('Error loading state from IndexedDB:', e);
      set({
        state: buildSeedState(),
        isLoading: false,
        saveError: 'Không đọc được dữ liệu đã lưu trước đó. Đang hiển thị dữ liệu mẫu — vui lòng KHÔNG lưu đè nếu bạn đã có dữ liệu cũ, hãy liên hệ người quản trị.'
      });
    }
  },

  updateMeta: (field, value) => {
    set(({ state }) => ({ state: { ...state, meta: { ...state.meta, [field]: value } } }));
  },

  updateHiddenSidebarItems: (items) => {
    set(({ state }) => ({ state: { ...state, hiddenSidebarItems: items } }));
  },

  updateStatusA: (idx, status) => {
    set(({ state }) => {
      const copyA = [...state.A];
      copyA[idx] = { ...copyA[idx], status };
      return { state: { ...state, A: copyA } };
    });
  },

  updateTaskBC: (section, idx, fieldOrFields, value) => {
    set(({ state }) => {
      const copy = [...state[section]];
      let updatedItem = { ...copy[idx] };

      if (typeof fieldOrFields === 'object' && fieldOrFields !== null) {
        updatedItem = { ...updatedItem, ...fieldOrFields };
      } else {
        updatedItem = { ...updatedItem, [fieldOrFields as keyof TaskBC]: value };
      }

      // Note: previously auto-transitioned trangThai to 'Hoàn thành đúng hạn'
      // whenever sanPham had content. Removed per product decision: marking a
      // task complete must be an explicit action (choosing "Đã hoàn thành"),
      // independent of whether a sản phẩm has been entered yet. A task can be
      // "Đã hoàn thành" with no sản phẩm, or have a sản phẩm while still
      // "Chưa hoàn thành".

      // If updating any of the 5 fields, compile canCu automatically
      const keys = typeof fieldOrFields === 'object' ? Object.keys(fieldOrFields) : [fieldOrFields];
      if (keys.some(k => ['loaiVanBan', 'so', 'ngay', 'donViBanHanh', 'trichYeu'].includes(k))) {
        updatedItem.canCu = compileCanCu(updatedItem);
      }

      copy[idx] = updatedItem;
      let updatedState = { ...state };
      updatedState[section] = copy;

      // If updating Section B and it becomes recurring, auto-add to Section C
      const isRecurring = updatedItem.kieuThoiHan === 'truoc_ngay_hang_thang' || updatedItem.kieuThoiHan === 'hang_nam';
      if (section === 'B' && isRecurring) {
        const listC = state.C;
        const existsInC = listC.some(t => t.noiDung === updatedItem.noiDung);
        if (!existsInC) {
          const maxSttC = listC.reduce((max, t) => t.stt > max ? t.stt : max, 0);
          const nextIdC = `C${listC.length + 1}_${Date.now().toString().slice(-4)}`;
          const itemC: TaskBC = { ...updatedItem, id: nextIdC, stt: maxSttC + 1 };
          updatedState.C = [...listC, itemC];
        }
      }

      return { state: updatedState };
    });
  },

  addTaskBC: (section, newTask) => {
    set(({ state }) => {
      const list = state[section];
      const maxStt = list.reduce((max, t) => t.stt > max ? t.stt : max, 0);
      const nextId = `${section}${list.length + 1}_${Date.now().toString().slice(-4)}`;

      const compiledCanCu = compileCanCu(newTask);
      // Same policy as updateTaskBC: no longer auto-transitions trangThai
      // based on sanPham content. Completion is an explicit choice.
      const finalTrangThai = newTask.trangThai;
      const item: TaskBC = {
        ...newTask,
        trangThai: finalTrangThai,
        id: nextId,
        stt: maxStt + 1,
        canCu: compiledCanCu
      };

      let updatedState = { ...state };
      updatedState[section] = [...list, item];

      const isRecurring = newTask.kieuThoiHan === 'truoc_ngay_hang_thang' || newTask.kieuThoiHan === 'hang_nam';
      if (section === 'B' && isRecurring) {
        const listC = state.C;
        const existsInC = listC.some(t => t.noiDung === newTask.noiDung);
        if (!existsInC) {
          const maxSttC = listC.reduce((max, t) => t.stt > max ? t.stt : max, 0);
          const nextIdC = `C${listC.length + 1}_${Date.now().toString().slice(-4)}`;
          const itemC: TaskBC = { ...newTask, id: nextIdC, stt: maxSttC + 1, canCu: compiledCanCu };
          updatedState.C = [...listC, itemC];
        }
      }

      return { state: updatedState };
    });
  },

  deleteTaskBC: (section, idx) => {
    set(({ state }) => {
      const list = [...state[section]];
      list.splice(idx, 1);
      const updatedList = list.map((t, i) => ({ ...t, stt: i + 1 }));
      return { state: { ...state, [section]: updatedList } };
    });
  },

  updateTaskD: (idx, field, value) => {
    set(({ state }) => {
      const copy = [...state.D];
      copy[idx] = { ...copy[idx], [field]: value };
      return { state: { ...state, D: copy } };
    });
  },

  handleImportState: (newState) => {
    const migratedState = {
      ...newState,
      B: migrateTasks(newState.B || []),
      C: migrateTasks(newState.C || [])
    };
    set({ state: migratedState });
  },

  resetToDefault: () => {
    set({ state: buildSeedState() });
  },
}));

// --- Debounced auto-save side effect ---
// Lives outside React's render tree (subscribed once at module load), so it
// runs regardless of which components are mounted/subscribed to the store.
let saveDebounceTimer: ReturnType<typeof setTimeout> | null = null;
let toastHideTimer: ReturnType<typeof setTimeout> | null = null;

useAppStore.subscribe((curr, prev) => {
  if (curr.isLoading) return;
  if (curr.state === prev.state) return; // nothing actually changed

  if (saveDebounceTimer) clearTimeout(saveDebounceTimer);
  saveDebounceTimer = setTimeout(async () => {
    try {
      const latest = useAppStore.getState().state;
      const stateToSave = {
        ...latest,
        hiddenSidebarItems: latest.hiddenSidebarItems?.filter(item => typeof item === 'string') || []
      };
      // IndexedDB is always written — it doubles as the local cache when a
      // backend is in use (see architecture decision in HANDOFF.md §3).
      await setDbState(stateToSave);
      sendBackupToServer(stateToSave);

      const { backendAvailable, authToken } = useAppStore.getState();
      if (backendAvailable && authToken) {
        try {
          await pushState(authToken, stateToSave);
        } catch (e) {
          if (e instanceof AuthRequiredError) {
            clearToken();
            useAppStore.setState({
              authToken: null, needsAuth: true,
              saveError: 'Phiên đăng nhập đã hết hạn. Dữ liệu vẫn được lưu tạm trên máy này — vui lòng đăng nhập lại để đồng bộ lên máy chủ.',
            });
            return;
          }
          console.error('Error saving state to backend:', e);
          useAppStore.setState({
            saveError: 'Không thể lưu dữ liệu lên máy chủ (đã lưu tạm trên máy này). Kiểm tra kết nối tới máy chủ.',
          });
          return;
        }
      }

      if (toastHideTimer) clearTimeout(toastHideTimer);
      useAppStore.setState({ showSaveToast: true, saveError: null });
      toastHideTimer = setTimeout(() => useAppStore.setState({ showSaveToast: false }), 800);
    } catch (e) {
      console.error('Error saving state to IndexedDB:', e);
      useAppStore.setState({
        saveError: 'Không thể lưu dữ liệu vào trình duyệt. Hãy xuất Excel ngay để sao lưu, tránh mất dữ liệu.'
      });
    }
  }, 300);
});
