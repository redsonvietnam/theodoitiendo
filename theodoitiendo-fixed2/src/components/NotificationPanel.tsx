/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef, useEffect } from 'react';
import { 
  Bell, Clock, Check, AlertTriangle, Calendar, ChevronRight, 
  Search, Volume2, VolumeX, BellRing, CheckCircle2, ArrowUpRight,
  FileText, Building2, ExternalLink, RotateCcw
} from 'lucide-react';
import { AppState, TaskBC } from '../types';
import { parseCanCu, isTaskCompleted, hasValidProduct, getTodayDateString, computeAutoStatus } from '../utils/cancu';
import { formatToDDMMYY, parseQuickDate } from '../utils/documentHelper';

interface NotificationPanelProps {
  state: AppState;
  daysUntil: (ds: string) => number | null;
  onUpdateTask: (sec: 'B' | 'C', idx: number, fieldOrFields: keyof TaskBC | Partial<TaskBC>, val?: any) => void;
  onNavigateToTab: (tab: 'B' | 'C') => void;
  onOpenTaskDetail?: (sec: 'B' | 'C', taskId: string) => void;
}

const formatDateVN = (dateStr: string) => {
  if (!dateStr) return '';
  const parts = dateStr.split('-');
  if (parts.length === 3) {
    return `${parts[2]}/${parts[1]}/${parts[0]}`;
  }
  return dateStr;
};

export default function NotificationPanel({
  state,
  daysUntil,
  onUpdateTask,
  onNavigateToTab,
  onOpenTaskDetail
}: NotificationPanelProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [currentTab, setCurrentTab] = useState<'all' | 'overdue' | 'nearing' | 'products'>('all');
  const [subProductFilter, setSubProductFilter] = useState<'no_sp' | 'has_sp' | 'all_done'>('no_sp');
  const [searchQuery, setSearchQuery] = useState('');
  const [soundEnabled, setSoundEnabled] = useState(() => {
    try {
      return localStorage.getItem('notif_sound_enabled') !== 'false';
    } catch {
      return true;
    }
  });
  const [browserNotifEnabled, setBrowserNotifEnabled] = useState(false);
  const [fastProducts, setFastProducts] = useState<{[key: string]: string}>({});
  const [fastCompletionDates, setFastCompletionDates] = useState<{[key: string]: string}>({});
  const [expandedInputTaskId, setExpandedInputTaskId] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const dropdownRef = useRef<HTMLDivElement>(null);

  // Sync localStorage sound pref
  const toggleSound = () => {
    const newValue = !soundEnabled;
    setSoundEnabled(newValue);
    try {
      localStorage.setItem('notif_sound_enabled', String(newValue));
    } catch {}
  };

  // Close dropdown on clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Check browser notification permissions
  useEffect(() => {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      setBrowserNotifEnabled(Notification.permission === 'granted');
    }
  }, []);

  // Play crisp success sound using browser's Web Audio API
  const playChimeSound = () => {
    if (!soundEnabled) return;
    try {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioContextClass) return;
      const ctx = new AudioContextClass();
      
      const playTone = (freq: number, start: number, duration: number) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, start);
        
        gain.gain.setValueAtTime(0.06, start);
        gain.gain.exponentialRampToValueAtTime(0.001, start + duration);
        
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(start);
        osc.stop(start + duration);
      };
      
      const now = ctx.currentTime;
      playTone(523.25, now, 0.12); // C5
      playTone(659.25, now + 0.08, 0.22); // E5
      playTone(783.99, now + 0.16, 0.32); // G5
    } catch (e) {
      console.warn("Sound play failed:", e);
    }
  };

  // Request browser notification permission
  const requestNotificationPermission = async () => {
    if (typeof window === 'undefined' || !('Notification' in window)) {
      showToast("Trình duyệt không hỗ trợ thông báo đẩy!");
      return;
    }
    try {
      const permission = await Notification.requestPermission();
      setBrowserNotifEnabled(permission === 'granted');
      if (permission === 'granted') {
        new Notification("Hệ Thống Quản Lý Hồ Sơ Tác Nghiệp", {
          body: "Đã bật thông báo đẩy thành công! Bạn sẽ nhận được các thông báo nhắc việc trực tiếp.",
          icon: "/favicon.ico"
        });
        showToast("Đã kích hoạt thông báo đẩy hệ thống!");
      } else {
        showToast("Bạn đã từ chối quyền thông báo trên trình duyệt.");
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Temporary feedback toast
  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 3000);
  };

  // Helper to compile all tasks and group by product availability
  const getAllTaskProductStats = () => {
    const allTasks: { task: TaskBC; section: 'B' | 'C'; originalIndex: number; dLeft: number; isOverdue: boolean; hasSp: boolean }[] = [];
    
    const processList = (tasks: TaskBC[], sec: 'B' | 'C') => {
      tasks.forEach((t, idx) => {
        const dLeft = t.ngayHetHan ? (daysUntil(t.ngayHetHan) ?? 0) : 0;
        const hasSp = hasValidProduct(t);
        allTasks.push({
          task: t,
          section: sec,
          originalIndex: idx,
          dLeft,
          isOverdue: dLeft < 0,
          hasSp
        });
      });
    };

    processList(state.B, 'B');
    processList(state.C, 'C');

    const noSpList = allTasks.filter(i => !i.hasSp);
    const hasSpList = allTasks.filter(i => i.hasSp);

    return {
      allTasks,
      noSpList,
      hasSpList,
      totalCount: allTasks.length,
      noSpCount: noSpList.length,
      hasSpCount: hasSpList.length
    };
  };

  const productStats = getAllTaskProductStats();

  // Filter and compile active alerts
  const getAlerts = () => {
    if (currentTab === 'products') {
      let targetList = productStats.noSpList;
      if (subProductFilter === 'has_sp') {
        targetList = productStats.hasSpList;
      } else if (subProductFilter === 'all_done') {
        targetList = productStats.allTasks;
      }

      return targetList.filter(item => {
        if (!searchQuery) return true;
        const q = searchQuery.toLowerCase();
        return (
          item.task.id.toLowerCase().includes(q) ||
          (item.task.noiDung || '').toLowerCase().includes(q) ||
          (item.task.donVi || '').toLowerCase().includes(q) ||
          (item.task.so || '').toLowerCase().includes(q) ||
          (item.task.sanPham || '').toLowerCase().includes(q) ||
          (item.task.minhChung || '').toLowerCase().includes(q)
        );
      });
    }

    const alerts: { task: TaskBC; section: 'B' | 'C'; originalIndex: number; dLeft: number; isOverdue: boolean; hasSp: boolean }[] = [];

    const processList = (list: TaskBC[], sec: 'B' | 'C') => {
      list.forEach((t, idx) => {
        if (!isTaskCompleted(t) && t.trangThai !== 'Không áp dụng') {
          if (t.ngayHetHan) {
            const dLeft = daysUntil(t.ngayHetHan);
            if (dLeft !== null) {
              if (dLeft < 0) {
                alerts.push({ task: t, section: sec, originalIndex: idx, dLeft, isOverdue: true, hasSp: hasValidProduct(t) });
              } else if (dLeft <= 5) {
                alerts.push({ task: t, section: sec, originalIndex: idx, dLeft, isOverdue: false, hasSp: hasValidProduct(t) });
              }
            }
          }
        }
      });
    };

    processList(state.B, 'B');
    processList(state.C, 'C');

    // Sort: Overdue first, then by earliest remaining days
    const sorted = alerts.sort((a, b) => {
      if (a.isOverdue && !b.isOverdue) return -1;
      if (!a.isOverdue && b.isOverdue) return 1;
      return a.dLeft - b.dLeft;
    });

    // Apply tab filtering
    const tabFiltered = sorted.filter(item => {
      if (currentTab === 'overdue') return item.isOverdue;
      if (currentTab === 'nearing') return !item.isOverdue;
      return true;
    });

    // Apply search filtering
    return tabFiltered.filter(item => {
      if (!searchQuery) return true;
      const q = searchQuery.toLowerCase();
      return (
        item.task.id.toLowerCase().includes(q) ||
        (item.task.noiDung || '').toLowerCase().includes(q) ||
        (item.task.donVi || '').toLowerCase().includes(q) ||
        (item.task.sanPham || '').toLowerCase().includes(q)
      );
    });
  };

  // Trigger push notifications when raw alerts load
  const previousAlertsCount = useRef(0);
  const rawAlerts = (() => {
    const alerts: TaskBC[] = [];
    const collect = (list: TaskBC[]) => {
      list.forEach(t => {
        if (!isTaskCompleted(t) && t.trangThai !== 'Không áp dụng' && t.ngayHetHan) {
          const dLeft = daysUntil(t.ngayHetHan);
          if (dLeft !== null && (dLeft < 0 || dLeft <= 5)) {
            alerts.push(t);
          }
        }
      });
    };
    collect(state.B);
    collect(state.C);
    return alerts;
  })();

  useEffect(() => {
    if (browserNotifEnabled && rawAlerts.length > previousAlertsCount.current) {
      const newItems = rawAlerts.length - previousAlertsCount.current;
      new Notification("Cập Nhật Tiến Độ", {
        body: `Có thêm ${newItems} nhiệm vụ cần xử lý (quá hạn hoặc sắp hết hạn)!`,
        icon: "/favicon.ico"
      });
    }
    previousAlertsCount.current = rawAlerts.length;
  }, [rawAlerts.length, browserNotifEnabled]);

  const alerts = getAlerts();
  const overdueCount = rawAlerts.filter(t => (daysUntil(t.ngayHetHan || '') || 0) < 0).length;
  const nearingCount = rawAlerts.filter(t => {
    const d = daysUntil(t.ngayHetHan || '');
    return d !== null && d >= 0 && d <= 5;
  }).length;
  const totalCount = rawAlerts.length;

  // Helper to get resolved ISO date (YYYY-MM-DD) from fastCompletionDates state or fallback
  const getResolvedCompletionDate = (taskId: string, fallbackDate?: string): string => {
    const quickStr = fastCompletionDates[taskId]?.trim();
    if (quickStr) {
      const parsed = parseQuickDate(quickStr);
      if (parsed) return parsed;
    }
    return fallbackDate || getTodayDateString();
  };

  // Handles fast complete action
  const handleFastComplete = (sec: 'B' | 'C', idx: number, task: TaskBC) => {
    const productVal = fastProducts[task.id]?.trim() || '';
    const finalNgayHoanThanh = getResolvedCompletionDate(task.id, task.ngayHoanThanh);
    const computedStatus = computeAutoStatus('hoan_thanh', finalNgayHoanThanh, task.ngayHetHan);

    onUpdateTask(sec, idx, {
      trangThai: computedStatus,
      ngayHoanThanh: finalNgayHoanThanh,
      ...(productVal ? { sanPham: productVal } : {})
    });

    playChimeSound();
    showToast(`Đã hoàn thành nhiệm vụ ${task.id}!`);
    setFastProducts(prev => {
      const copy = { ...prev };
      delete copy[task.id];
      return copy;
    });
    setFastCompletionDates(prev => {
      const copy = { ...prev };
      delete copy[task.id];
      return copy;
    });
    setExpandedInputTaskId(null);
  };

  // Handles updating product for completed tasks
  const handleUpdateProduct = (sec: 'B' | 'C', idx: number, task: TaskBC) => {
    const productVal = fastProducts[task.id]?.trim() || '';
    const finalNgayHoanThanh = getResolvedCompletionDate(task.id, task.ngayHoanThanh);
    const computedStatus = computeAutoStatus('hoan_thanh', finalNgayHoanThanh, task.ngayHetHan);

    onUpdateTask(sec, idx, {
      sanPham: productVal,
      ngayHoanThanh: finalNgayHoanThanh,
      trangThai: computedStatus
    });

    playChimeSound();
    showToast(`Đã cập nhật sản phẩm & ngày hoàn thành cho nhiệm vụ ${task.id}!`);
    setFastProducts(prev => {
      const copy = { ...prev };
      delete copy[task.id];
      return copy;
    });
    setFastCompletionDates(prev => {
      const copy = { ...prev };
      delete copy[task.id];
      return copy;
    });
    setExpandedInputTaskId(null);
  };

  // Revert accidental completion status back to 'Chưa hoàn thành'
  const handleRevertStatus = (sec: 'B' | 'C', idx: number, taskId: string) => {
    onUpdateTask(sec, idx, {
      trangThai: 'Chưa hoàn thành',
      ngayHoanThanh: ''
    });
    playChimeSound();
    showToast(`Đã chuyển nhiệm vụ ${taskId} về "Chưa hoàn thành"`);
  };

  const handleOpenDetail = (section: 'B' | 'C', taskId: string) => {
    if (onOpenTaskDetail) {
      onOpenTaskDetail(section, taskId);
    } else {
      onNavigateToTab(section);
    }
    setIsOpen(false);
  };

  // Format clean display for deadline without "Hạn: Hạn chót:" string duplication
  const formatDeadlineText = (thoiHanStr?: string) => {
    if (!thoiHanStr) return 'Chưa xác định';
    // Remove redundant leading phrases if present
    let cleaned = thoiHanStr.trim();
    if (cleaned.toLowerCase().startsWith('hạn chót:')) {
      cleaned = cleaned.substring(8).trim();
    }
    return cleaned;
  };

  return (
    <div className="relative inline-block text-left" ref={dropdownRef} id="notification-bell-container">
      {/* Trigger Bell Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`relative p-2.5 rounded-xl border transition duration-200 cursor-pointer flex items-center justify-center ${
          isOpen
            ? 'bg-slate-100 border-[#a3212e]/50 text-[#a3212e] shadow-inner'
            : 'bg-white hover:bg-slate-50 border-slate-200 text-slate-600 hover:text-[#0f2444] shadow-xs'
        }`}
        title="Xem các nhiệm vụ cần chú ý (quá hạn & sắp đến hạn)"
      >
        <Bell className="w-5 h-5" />
        {totalCount > 0 && (
          <span className="absolute -top-1.5 -right-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-[#a3212e] text-[10px] font-bold text-white shadow-md ring-2 ring-white">
            {totalCount}
          </span>
        )}
      </button>

      {/* Notification Dropdown Card */}
      {isOpen && (
        <div className="absolute right-0 mt-2.5 w-[320px] min-[400px]:w-[380px] sm:w-[480px] bg-white border border-slate-200 rounded-2xl shadow-2xl z-50 overflow-hidden transform origin-top-right transition-all">
          
          {/* Compact Top Header: Integrated Tabs & Toggles (No header title text) */}
          <div className="bg-[#0f2444] text-white px-3 py-2 flex items-center justify-between gap-2 border-b border-slate-800">
            {/* Embedded Tab Filters in Header */}
            <div className="flex items-center gap-1 bg-slate-800/80 p-0.5 rounded-lg text-[11px] font-bold">
              <button
                onClick={() => setCurrentTab('all')}
                className={`py-1 px-2 rounded-md transition-all cursor-pointer ${
                  currentTab === 'all'
                    ? 'bg-white text-[#0f2444] shadow-xs'
                    : 'text-slate-300 hover:text-white'
                }`}
              >
                Tất cả ({totalCount})
              </button>
              
              <button
                onClick={() => setCurrentTab('overdue')}
                className={`py-1 px-2 rounded-md transition-all cursor-pointer flex items-center gap-1 ${
                  currentTab === 'overdue'
                    ? 'bg-[#a3212e] text-white shadow-xs'
                    : 'text-rose-300 hover:bg-rose-900/40 hover:text-white'
                }`}
              >
                <span>Quá hạn</span>
                <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono ${
                  currentTab === 'overdue' ? 'bg-white/20 text-white' : 'bg-rose-950/80 text-rose-200'
                }`}>
                  {overdueCount}
                </span>
              </button>

              <button
                onClick={() => setCurrentTab('nearing')}
                className={`py-1 px-2 rounded-md transition-all cursor-pointer flex items-center gap-1 ${
                  currentTab === 'nearing'
                    ? 'bg-amber-500 text-white shadow-xs'
                    : 'text-amber-300 hover:bg-amber-900/40 hover:text-white'
                }`}
              >
                <span>Sắp hạn</span>
                <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono ${
                  currentTab === 'nearing' ? 'bg-white/20 text-white' : 'bg-amber-950/80 text-amber-200'
                }`}>
                  {nearingCount}
                </span>
              </button>

              <button
                onClick={() => setCurrentTab('products')}
                className={`py-1 px-2 rounded-md transition-all cursor-pointer flex items-center gap-1 ${
                  currentTab === 'products'
                    ? 'bg-purple-600 text-white shadow-xs'
                    : 'text-purple-300 hover:bg-purple-900/40 hover:text-white'
                }`}
                title="Quản lý và thống kê sản phẩm / báo cáo minh chứng của các nhiệm vụ"
              >
                <span>Sản phẩm</span>
                <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono ${
                  currentTab === 'products' ? 'bg-white/20 text-white' : 'bg-purple-950/80 text-purple-200'
                }`}>
                  {productStats.noSpCount}
                </span>
              </button>
            </div>

            {/* Audio & Push notification toggles */}
            <div className="flex items-center gap-1 shrink-0">
              <button
                onClick={toggleSound}
                className="p-1.5 hover:bg-white/10 rounded-lg text-slate-300 hover:text-white transition cursor-pointer"
                title={soundEnabled ? "Âm thanh: BẬT" : "Âm thanh: TẮT"}
              >
                {soundEnabled ? <Volume2 className="w-4 h-4 text-emerald-400" /> : <VolumeX className="w-4 h-4 text-slate-400" />}
              </button>

              <button
                onClick={requestNotificationPermission}
                className={`p-1.5 hover:bg-white/10 rounded-lg transition cursor-pointer ${
                  browserNotifEnabled ? 'text-emerald-400' : 'text-slate-300 hover:text-white'
                }`}
                title={browserNotifEnabled ? "Thông báo đẩy: ĐÃ BẬT" : "Bật thông báo đẩy"}
              >
                <BellRing className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Sub-filter Bar for Products Tab */}
          {currentTab === 'products' && (
            <div className="bg-purple-950/60 border-b border-purple-800/40 px-3 py-1.5 flex items-center justify-between text-xs">
              <span className="font-bold text-purple-200 flex items-center gap-1 text-[11px]">
                <FileText className="w-3.5 h-3.5 text-purple-400" />
                Thống kê sản phẩm:
              </span>
              <div className="flex items-center gap-1 bg-slate-900/90 p-0.5 rounded-lg border border-purple-800/50 text-[10px] font-semibold">
                <button
                  onClick={() => setSubProductFilter('no_sp')}
                  className={`px-2 py-0.5 rounded transition cursor-pointer flex items-center gap-1 ${
                    subProductFilter === 'no_sp' ? 'bg-purple-600 text-white shadow-2xs font-bold' : 'text-purple-300 hover:text-white'
                  }`}
                >
                  <span>Chưa cập nhật</span>
                  <span className="px-1 rounded bg-purple-950 text-purple-200 text-[9px] font-mono">{productStats.noSpCount}</span>
                </button>

                <button
                  onClick={() => setSubProductFilter('has_sp')}
                  className={`px-2 py-0.5 rounded transition cursor-pointer flex items-center gap-1 ${
                    subProductFilter === 'has_sp' ? 'bg-emerald-600 text-white shadow-2xs font-bold' : 'text-purple-300 hover:text-white'
                  }`}
                >
                  <span>Đã cập nhật</span>
                  <span className="px-1 rounded bg-emerald-950 text-emerald-200 text-[9px] font-mono">{productStats.hasSpCount}</span>
                </button>

                <button
                  onClick={() => setSubProductFilter('all_done')}
                  className={`px-2 py-0.5 rounded transition cursor-pointer flex items-center gap-1 ${
                    subProductFilter === 'all_done' ? 'bg-slate-700 text-white shadow-2xs font-bold' : 'text-purple-300 hover:text-white'
                  }`}
                >
                  <span>Tất cả</span>
                  <span className="px-1 rounded bg-slate-800 text-slate-200 text-[9px] font-mono">{productStats.totalCount}</span>
                </button>
              </div>
            </div>
          )}

          {/* Quick Search Bar */}
          <div className="bg-slate-50 border-b border-slate-200 p-2">
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 w-3.5 h-3.5 text-slate-400" />
              <input
                type="text"
                placeholder="Tìm nhanh nội dung, mã, đơn vị, sản phẩm..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-white border border-slate-200 rounded-lg py-1.5 pl-8 pr-3 text-xs font-medium text-slate-800 placeholder-slate-400 outline-none focus:ring-1 focus:ring-[#0f2444] focus:border-[#0f2444]"
              />
            </div>
          </div>

          {/* Feedback Toast */}
          {toastMessage && (
            <div className="bg-emerald-600 text-white text-xs font-semibold text-center py-2 px-3 flex items-center justify-center gap-1.5 animate-fadein">
              <CheckCircle2 className="w-4 h-4" />
              <span>{toastMessage}</span>
            </div>
          )}

          {/* List Content */}
          <div className="max-h-[400px] overflow-y-auto divide-y divide-slate-100 custom-scrollbar">
            {alerts.length === 0 ? (
              <div className="p-8 text-center">
                <div className="w-10 h-10 bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-2">
                  <Check className="w-5 h-5" />
                </div>
                <p className="text-slate-800 text-xs font-bold">Không có dữ liệu phù hợp</p>
                <p className="text-slate-400 text-[11px] mt-1">
                  {searchQuery 
                    ? "Không tìm thấy nhiệm vụ phù hợp với từ khóa tìm kiếm." 
                    : currentTab === 'products'
                      ? subProductFilter === 'no_sp'
                        ? "Tuyệt vời! Tất cả nhiệm vụ hoàn thành đều đã được cập nhật sản phẩm / báo cáo minh chứng."
                        : "Chưa có dữ liệu sản phẩm tương ứng."
                      : "Tất cả nhiệm vụ đều đúng tiến độ hoặc đã hoàn thành."}
                </p>
              </div>
            ) : (
              alerts.map(({ task, section, originalIndex, dLeft, isOverdue }) => {
                const isInputExpanded = expandedInputTaskId === task.id;
                const taskHasSp = hasValidProduct(task);
                const taskIsDone = isTaskCompleted(task);

                // Extract document number (số, ký hiệu) and date of issuance (ngày ban hành)
                let docSo = task.so?.trim();
                let docNgay = task.ngay?.trim();
                if ((!docSo || !docNgay) && task.canCu) {
                  const parsed = parseCanCu(task.canCu);
                  if (!docSo && parsed.so) docSo = parsed.so;
                  if (!docNgay && parsed.ngay) docNgay = parsed.ngay;
                }
                if (docNgay && docNgay.includes('-') && docNgay.split('-').length === 3) {
                  docNgay = formatDateVN(docNgay);
                }

                return (
                  <div
                    key={task.id}
                    className={`p-3.5 transition hover:bg-slate-50/80 flex flex-col gap-2 ${
                      taskIsDone
                        ? taskHasSp ? 'bg-emerald-50/20' : 'bg-purple-50/25'
                        : isOverdue ? 'bg-rose-50/20' : 'bg-amber-50/10'
                    }`}
                  >
                    {/* Header Row: Ultra-compact badges with category, document info, and deadline */}
                    <div className="flex items-center justify-between gap-1.5">
                      <div className="flex items-center gap-1 flex-wrap min-w-0">
                        <span className="text-[10px] text-slate-600 font-semibold bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200 shrink-0">
                          {section === 'B' ? 'Có thời hạn' : 'Thường xuyên'}
                        </span>

                        {/* Số, Ký hiệu văn bản & Ngày ban hành (ngắn gọn) */}
                        {(docSo || docNgay) && (
                          <span className="text-[10px] font-medium text-slate-700 bg-amber-50/90 px-1.5 py-0.5 rounded border border-amber-200/80 flex items-center gap-1 shrink-0 truncate max-w-[220px]">
                            <FileText className="w-3 h-3 text-amber-600 shrink-0" />
                            {docSo && <span className="font-semibold text-slate-800">{docSo}</span>}
                            {docSo && docNgay && <span className="text-slate-400">•</span>}
                            {docNgay && <span>{docNgay}</span>}
                          </span>
                        )}
                      </div>

                      {/* Clean Status or Deadline Badge */}
                      {taskHasSp ? (
                        <span className="bg-emerald-100 text-emerald-800 text-[10px] font-bold px-2 py-0.5 rounded-full border border-emerald-200 flex items-center gap-1 shrink-0">
                          <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                          Đã cập nhật
                        </span>
                      ) : (
                        <span className="bg-purple-100 text-purple-800 text-[10px] font-bold px-2 py-0.5 rounded-full border border-purple-200 flex items-center gap-1 shrink-0">
                          <AlertTriangle className="w-3 h-3 text-purple-600" />
                          Chưa cập nhật
                        </span>
                      )}
                    </div>

                    {/* Main Content & Actions Row */}
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <p 
                          onClick={() => handleOpenDetail(section, task.id)}
                          className="text-slate-800 text-xs font-semibold leading-snug hover:text-[#a3212e] cursor-pointer transition-colors"
                          title="Bấm để mở xem và cập nhật chi tiết nhiệm vụ"
                        >
                          {task.noiDung}
                        </p>
                        {/* Display existing product if present */}
                        {(task.sanPham || task.minhChung) && (
                          <p className="text-[11px] text-emerald-800 font-medium mt-1 flex items-center gap-1 bg-emerald-50/90 px-2 py-0.5 rounded border border-emerald-200/80">
                            <FileText className="w-3 h-3 text-emerald-600 shrink-0" />
                            <span>SP/BC: <strong className="font-semibold text-emerald-900">{task.sanPham || task.minhChung}</strong></span>
                          </p>
                        )}
                      </div>

                      {/* Action Buttons right beside trích yếu */}
                      <div className="flex items-center gap-1 shrink-0 self-start">
                        {currentTab === 'products' ? (
                          <>
                            <button
                              onClick={() => {
                                setFastProducts(prev => ({ ...prev, [task.id]: task.sanPham || '' }));
                                setFastCompletionDates(prev => ({ ...prev, [task.id]: formatToDDMMYY(task.ngayHoanThanh || getTodayDateString()) }));
                                setExpandedInputTaskId(isInputExpanded ? null : task.id);
                              }}
                              className="bg-purple-600 hover:bg-purple-700 text-white text-[10px] font-bold px-2 py-1 rounded-lg flex items-center gap-1 transition shadow-2xs cursor-pointer"
                              title={taskHasSp ? "Sửa/Cập nhật số báo cáo, sản phẩm minh chứng" : "Cập nhật số báo cáo / sản phẩm minh chứng"}
                            >
                              <FileText className="w-3 h-3" />
                              <span>{taskHasSp ? 'Sửa SP' : 'Cập nhật SP'}</span>
                            </button>
                            {!taskIsDone && (
                              <button
                                onClick={() => {
                                  if (isInputExpanded) {
                                    handleFastComplete(section, originalIndex, task);
                                  } else {
                                    setFastProducts(prev => ({ ...prev, [task.id]: task.sanPham || '' }));
                                    setFastCompletionDates(prev => ({ ...prev, [task.id]: formatToDDMMYY(task.ngayHoanThanh || getTodayDateString()) }));
                                    setExpandedInputTaskId(task.id);
                                  }
                                }}
                                className="bg-emerald-600 hover:bg-emerald-700 text-white text-[10px] font-bold px-2 py-1 rounded-lg flex items-center gap-1 transition shadow-2xs cursor-pointer"
                                title="Bấm để hoàn thành nhiệm vụ"
                              >
                                <Check className="w-3 h-3" />
                                <span>Xong</span>
                              </button>
                            )}
                          </>
                        ) : taskIsDone ? (
                          <>
                            <button
                              onClick={() => {
                                setFastProducts(prev => ({ ...prev, [task.id]: task.sanPham || '' }));
                                setFastCompletionDates(prev => ({ ...prev, [task.id]: formatToDDMMYY(task.ngayHoanThanh || getTodayDateString()) }));
                                setExpandedInputTaskId(isInputExpanded ? null : task.id);
                              }}
                              className="bg-purple-600 hover:bg-purple-700 text-white text-[10px] font-bold px-2 py-1 rounded-lg flex items-center gap-1 transition shadow-2xs cursor-pointer"
                              title={taskHasSp ? "Sửa/Cập nhật số báo cáo, sản phẩm minh chứng" : "Cập nhật số báo cáo / sản phẩm minh chứng"}
                            >
                              <FileText className="w-3 h-3" />
                              <span>{taskHasSp ? 'Sửa SP' : 'Cập nhật SP'}</span>
                            </button>

                            {!taskHasSp && (
                              <button
                                onClick={() => handleRevertStatus(section, originalIndex, task.id)}
                                className="bg-amber-50 hover:bg-amber-100 text-amber-800 text-[10px] font-bold px-2 py-1 rounded-lg flex items-center gap-1 transition shadow-2xs cursor-pointer border border-amber-300"
                                title="Bấm lộn? Trả về Chưa hoàn thành"
                              >
                                <RotateCcw className="w-3 h-3 text-amber-700" />
                                <span>Lỡ bấm lộn</span>
                              </button>
                            )}
                          </>
                        ) : (
                          <button
                            onClick={() => {
                              if (isInputExpanded) {
                                handleFastComplete(section, originalIndex, task);
                              } else {
                                setFastProducts(prev => ({ ...prev, [task.id]: task.sanPham || '' }));
                                setFastCompletionDates(prev => ({ ...prev, [task.id]: formatToDDMMYY(task.ngayHoanThanh || getTodayDateString()) }));
                                setExpandedInputTaskId(task.id);
                              }
                            }}
                            className="bg-emerald-600 hover:bg-emerald-700 text-white text-[10px] font-bold px-2.5 py-1 rounded-lg flex items-center gap-1 transition shadow-2xs cursor-pointer"
                            title="Bấm để nhập số báo cáo/minh chứng, chọn ngày hoàn thành và hoàn thành"
                          >
                            <Check className="w-3 h-3" />
                            <span>Xong</span>
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Quick Proof Document & Completion Date Entry */}
                    {isInputExpanded ? (
                      <div className="mt-1 p-2 bg-emerald-50/70 rounded-xl border border-emerald-200/80 space-y-1.5 animate-fadein">
                        <div className="flex items-center justify-between text-[10px] font-bold text-emerald-900">
                          <span className="flex items-center gap-1">
                            <FileText className="w-3 h-3 text-emerald-600" />
                            {taskIsDone ? 'Cập nhật Sản phẩm & Ngày hoàn thành:' : 'Nhập sản phẩm & Chọn ngày hoàn thành:'}
                          </span>
                          <button 
                            onClick={() => setExpandedInputTaskId(null)}
                            className="text-slate-400 hover:text-slate-600 cursor-pointer text-[10px]"
                          >
                            Đóng
                          </button>
                        </div>
                        <div className="flex flex-wrap sm:flex-nowrap items-center gap-1.5">
                          {/* Ô nhập nội dung sản phẩm */}
                          <input
                            type="text"
                            placeholder="Số BC / Công văn minh chứng..."
                            value={fastProducts[task.id] !== undefined ? fastProducts[task.id] : (task.sanPham || '')}
                            onChange={(e) => setFastProducts(prev => ({ ...prev, [task.id]: e.target.value }))}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                if (taskIsDone) {
                                  handleUpdateProduct(section, originalIndex, task);
                                } else {
                                  handleFastComplete(section, originalIndex, task);
                                }
                              }
                            }}
                            className="flex-1 min-w-[140px] bg-white border border-emerald-300 px-2.5 py-1 text-xs rounded-lg outline-none focus:border-emerald-600 focus:ring-1 focus:ring-emerald-500 font-medium text-slate-800 placeholder-slate-400"
                            autoFocus
                          />

                          {/* Ô nhập ngày hoàn thành (Kiểu ddmm hoặc ddmmyy, không label "Ngày HT", hiển thị kết quả ngày) */}
                          {(() => {
                            const currentQuick = fastCompletionDates[task.id] !== undefined
                              ? fastCompletionDates[task.id]
                              : formatToDDMMYY(task.ngayHoanThanh || getTodayDateString());
                            const parsedIso = parseQuickDate(currentQuick) || task.ngayHoanThanh || getTodayDateString();
                            const dateParts = parsedIso.split('-');
                            const formattedDisplay = dateParts.length === 3 
                              ? `${dateParts[2]}/${dateParts[1]}/${dateParts[0]}` 
                              : parsedIso;

                            return (
                              <div 
                                className="flex items-center gap-1.5 bg-white border border-emerald-300 px-2 py-1 rounded-lg focus-within:border-emerald-600 focus-within:ring-1 focus-within:ring-emerald-500 shrink-0" 
                                title="Ngày hoàn thành (nhập kiểu ddmm hoặc ddmmyy, tự động quy đổi)"
                              >
                                <Calendar className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                                <input
                                  type="text"
                                  placeholder="ddmmyy..."
                                  className="w-16 bg-transparent text-xs font-semibold text-slate-800 outline-none placeholder-slate-400 text-center"
                                  value={currentQuick}
                                  onFocus={(e) => e.target.select()}
                                  onChange={(e) => setFastCompletionDates(prev => ({ ...prev, [task.id]: e.target.value }))}
                                  onBlur={(e) => {
                                    const val = e.target.value.trim();
                                    if (val) {
                                      const parsed = parseQuickDate(val);
                                      if (parsed) {
                                        setFastCompletionDates(prev => ({ ...prev, [task.id]: formatToDDMMYY(parsed) }));
                                      }
                                    } else {
                                      setFastCompletionDates(prev => ({ ...prev, [task.id]: formatToDDMMYY(getTodayDateString()) }));
                                    }
                                  }}
                                  onKeyDown={(e) => {
                                    if (e.key === 'Enter') {
                                      if (taskIsDone) {
                                        handleUpdateProduct(section, originalIndex, task);
                                      } else {
                                        handleFastComplete(section, originalIndex, task);
                                      }
                                    }
                                  }}
                                />
                                <span className="text-[10px] font-bold text-emerald-800 bg-emerald-100 px-1.5 py-0.5 rounded border border-emerald-200 shrink-0 select-none">
                                  {formattedDisplay}
                                </span>
                              </div>
                            );
                          })()}

                          {/* Nút Xác nhận */}
                          <button
                            onClick={() => {
                              if (taskIsDone) {
                                handleUpdateProduct(section, originalIndex, task);
                              } else {
                                handleFastComplete(section, originalIndex, task);
                              }
                            }}
                            className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold py-1 px-3 rounded-lg transition shadow-xs cursor-pointer shrink-0 flex items-center gap-1 ml-auto sm:ml-0"
                          >
                            <Check className="w-3.5 h-3.5" />
                            <span>Xác nhận</span>
                          </button>
                        </div>
                      </div>
                    ) : null}

                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}
