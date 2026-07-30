import React, { useState, useEffect } from 'react';
import { TaskMilestone } from '../types';
import { Plus, Trash2, Calendar, Clock, CheckCircle2 } from 'lucide-react';
import { getTodayDateString, computeAutoStatus } from '../utils/cancu';
import { formatToDDMMYY, formatToDDMM, parseQuickDate } from '../utils/documentHelper';

interface MilestoneManagerProps {
  danhSachMoc: TaskMilestone[];
  onChange: (newMocs: TaskMilestone[]) => void;
  baseYear?: number;
  showStatus?: boolean;
  startTabIndex?: number;
}

const formatDateVN = (dateStr: string) => {
  if (!dateStr) return '';
  const parts = dateStr.split('-');
  if (parts.length === 3) {
    return `${parts[2]}/${parts[1]}/${parts[0]}`;
  }
  return dateStr;
};

const getDayOfDate = (dateStr: string) => {
  if (!dateStr) return '25';
  const parts = dateStr.split('-');
  if (parts.length === 3) return String(parseInt(parts[2], 10));
  return '25';
};

const getDayMonthOfDate = (dateStr: string) => {
  if (!dateStr) return '';
  const parts = dateStr.split('-');
  if (parts.length === 3) return `${parts[2]}/${parts[1]}`;
  return '';
};

const compileMocThoiHanString = (kieu?: string, date?: string, hour?: string) => {
  if (!date && kieu !== 'truoc_ngay_hang_thang') return '— Chưa chọn ngày —';
  const timeStr = hour ? ` (${hour})` : '';
  const dateVN = formatDateVN(date || '');
  const dayOnly = getDayOfDate(date || '');
  const dayMonth = getDayMonthOfDate(date || '');

  if (kieu === 'truoc_ngay_hang_thang') {
    return `Trước ngày ${dayOnly} hằng tháng${timeStr}`;
  }
  if (kieu === 'hang_nam') {
    return `Hằng năm trước ngày ${dayMonth}${timeStr}`;
  }
  return `Trước ngày ${dateVN}${timeStr}`;
};

export default function MilestoneManager({
  danhSachMoc = [],
  onChange,
  baseYear = new Date().getFullYear(),
  showStatus = true,
  startTabIndex = 6
}: MilestoneManagerProps) {
  // Always maintain at least 1 milestone ("Mốc 1") by default
  useEffect(() => {
    if (!danhSachMoc || danhSachMoc.length === 0) {
      const defaultMoc: TaskMilestone = {
        id: `moc_1_${Date.now()}`,
        tenMoc: 'Mốc 1',
        kieuThoiHan: 'truoc_ngay',
        ngayHetHan: getTodayDateString(),
        trangThai: 'Chưa hoàn thành'
      };
      onChange([defaultMoc]);
    }
  }, [danhSachMoc]);

  const [showHourMap, setShowHourMap] = useState<Record<string, boolean>>({});
  const [quickDateMap, setQuickDateMap] = useState<Record<string, string>>({});
  const [monthlyDayMap, setMonthlyDayMap] = useState<Record<string, string>>({});

  const handleAddMoc = () => {
    const nextNum = danhSachMoc.length + 1;
    const newId = `moc_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
    const newMoc: TaskMilestone = {
      id: newId,
      tenMoc: `Mốc ${nextNum}`,
      kieuThoiHan: 'truoc_ngay',
      ngayHetHan: getTodayDateString(),
      trangThai: 'Chưa hoàn thành'
    };
    onChange([...danhSachMoc, newMoc]);
  };

  const handleUpdateMoc = (id: string, updates: Partial<TaskMilestone>) => {
    const updated = danhSachMoc.map(m => {
      if (m.id === id) {
        const item = { ...m, ...updates };
        
        // Auto update completion status logic
        if (updates.trangThai === 'Đã hoàn thành' || updates.trangThai === 'Hoàn thành đúng hạn' || updates.trangThai === 'Hoàn thành trễ hạn') {
          const compDate = item.ngayHoanThanh || getTodayDateString();
          item.ngayHoanThanh = compDate;
          item.trangThai = computeAutoStatus('hoan_thanh', compDate, item.ngayHetHan);
        } else if (updates.trangThai === 'Chưa hoàn thành' || updates.trangThai === 'Không áp dụng' || updates.trangThai === '') {
          item.ngayHoanThanh = '';
        }
        return item;
      }
      return m;
    });
    onChange(updated);
  };

  const handleRemoveMoc = (id: string) => {
    if (danhSachMoc.length <= 1) return; // Always keep at least 1 milestone
    onChange(danhSachMoc.filter(m => m.id !== id));
  };

  const toggleHourInput = (id: string) => {
    setShowHourMap(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const handleQuickDateInput = (mocId: string, val: string, kieu: string) => {
    const cleaned = val.replace(/[^0-9\/\-\.\s]/g, '').substring(0, 10);
    setQuickDateMap(prev => ({ ...prev, [mocId]: cleaned }));

    if (kieu === 'truoc_ngay_hang_thang') {
      let num = parseInt(cleaned, 10);
      if (!isNaN(num) && num >= 1 && num <= 31 && cleaned.length <= 2) {
        const padDay = String(num).padStart(2, '0');
        const curParts = (danhSachMoc.find(m => m.id === mocId)?.ngayHetHan || getTodayDateString()).split('-');
        const y = curParts[0] || String(baseYear);
        const m = curParts[1] || '01';
        handleUpdateMoc(mocId, { ngayHetHan: `${y}-${m}-${padDay}` });
        return;
      }
    }

    const parsed = parseQuickDate(cleaned);
    if (parsed) {
      handleUpdateMoc(mocId, { ngayHetHan: parsed });
    }
  };

  const currentList = danhSachMoc.length > 0 ? danhSachMoc : [{
    id: 'moc_default',
    tenMoc: 'Mốc 1',
    kieuThoiHan: 'truoc_ngay',
    ngayHetHan: getTodayDateString(),
    trangThai: 'Chưa hoàn thành'
  }];

  return (
    <div className="space-y-2">
      {/* Single Unified Card Container for all Milestones */}
      <div className="bg-white border border-slate-200 rounded-xl p-2.5 space-y-2 shadow-2xs">
        {/* Label above */}
        <div className="flex items-center justify-between gap-1 pb-0.5 border-b border-slate-100">
          <label className="text-[11px] font-bold text-slate-700 block">
            Chọn ngày hạn chót <span className="text-[10px] text-slate-400 font-normal">(dạng ddmm hoặc ddmmyy)</span>
          </label>
          {currentList.length > 0 && (
            <button
              type="button"
              onClick={() => toggleHourInput(currentList[0].id)}
              className="text-[10px] text-[#a3212e] font-bold hover:underline flex items-center gap-0.5 cursor-pointer"
            >
              <Clock className="w-3 h-3" />
              {showHourMap[currentList[0].id] || (currentList[0] as TaskMilestone).gioHetHan ? 'Ẩn giờ' : '+ Giờ'}
            </button>
          )}
        </div>

        {/* Tight List of Milestones */}
        <div className="space-y-1.5">
          {currentList.map((moc, index) => {
            const currentKieu = moc.kieuThoiHan || 'truoc_ngay';
            const isDone = moc.trangThai === 'Hoàn thành đúng hạn' || moc.trangThai === 'Hoàn thành trễ hạn' || moc.trangThai === 'Đã hoàn thành';
            const isLate = moc.trangThai === 'Hoàn thành trễ hạn';
            const isMonthly = currentKieu === 'truoc_ngay_hang_thang';
            const isYearly = currentKieu === 'hang_nam';
            const isSpecificDate = currentKieu === 'truoc_ngay';
            const hasHour = Boolean(moc.gioHetHan);
            const isHourOpen = showHourMap[moc.id] || hasHour;

            return (
              <div key={moc.id || index} className="space-y-1">
                {/* Single Row: Input + Mode Toggles + Delete */}
                <div className="flex items-center gap-1.5">
                  {/* Left: Input box */}
                  <div className="flex-1 min-w-[110px]">
                    <input
                      type="text"
                      tabIndex={startTabIndex + index}
                      className="w-full bg-slate-50 border border-slate-200 focus:bg-white focus:border-[#a3212e] text-slate-800 px-2 py-1 rounded-md text-xs font-mono font-bold outline-none transition"
                      placeholder={isMonthly ? "Gõ ngày (1-31)..." : isYearly ? "Gõ ddmm (ví dụ 2512)..." : "Gõ ddmm hoặc ddmmyy..."}
                      maxLength={10}
                      value={quickDateMap[moc.id] !== undefined ? quickDateMap[moc.id] : (isMonthly ? getDayOfDate(moc.ngayHetHan) : isYearly ? formatToDDMM(moc.ngayHetHan) : formatToDDMMYY(moc.ngayHetHan))}
                      onChange={(e) => handleQuickDateInput(moc.id, e.target.value, currentKieu)}
                      onFocus={(e) => e.target.select()}
                      onBlur={() => {
                        const cur = quickDateMap[moc.id] || (isMonthly ? getDayOfDate(moc.ngayHetHan) : isYearly ? formatToDDMM(moc.ngayHetHan) : formatToDDMMYY(moc.ngayHetHan));
                        if (isMonthly) {
                          let num = parseInt(cur, 10);
                          if (isNaN(num) || num < 1) num = 25;
                          if (num > 31) num = 31;
                          const padDay = String(num).padStart(2, '0');
                          const curParts = (moc.ngayHetHan || getTodayDateString()).split('-');
                          const y = curParts[0] || String(baseYear);
                          const m = curParts[1] || '01';
                          handleUpdateMoc(moc.id, { ngayHetHan: `${y}-${m}-${padDay}` });
                          setQuickDateMap(prev => ({ ...prev, [moc.id]: String(num) }));
                        } else {
                          const parsed = parseQuickDate(cur);
                          if (parsed) {
                            handleUpdateMoc(moc.id, { ngayHetHan: parsed });
                            setQuickDateMap(prev => ({ ...prev, [moc.id]: isYearly ? formatToDDMM(parsed) : formatToDDMMYY(parsed) }));
                          }
                        }
                      }}
                    />
                  </div>

                  {/* Right: Mode Toggles */}
                  <div className="flex items-center gap-0.5 bg-slate-100 p-0.5 rounded-md shrink-0">
                    <button
                      type="button"
                      onClick={() => {
                        handleUpdateMoc(moc.id, { kieuThoiHan: 'truoc_ngay' });
                        setQuickDateMap(prev => ({ ...prev, [moc.id]: formatToDDMMYY(moc.ngayHetHan) }));
                      }}
                      className={`px-1.5 py-0.5 rounded text-[11px] font-bold transition cursor-pointer ${
                        isSpecificDate
                          ? 'bg-[#a3212e] text-white font-extrabold shadow-2xs'
                          : 'bg-white text-slate-700 hover:text-slate-900 border border-slate-200'
                      }`}
                      title="Ngày cụ thể"
                    >
                      Ngày
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        handleUpdateMoc(moc.id, { kieuThoiHan: 'truoc_ngay_hang_thang' });
                        setQuickDateMap(prev => ({ ...prev, [moc.id]: getDayOfDate(moc.ngayHetHan) }));
                      }}
                      className={`px-1.5 py-0.5 rounded text-[11px] font-bold transition cursor-pointer flex items-center gap-0.5 ${
                        isMonthly
                          ? 'bg-emerald-700 text-white font-extrabold shadow-2xs'
                          : 'bg-emerald-50 text-emerald-800 hover:bg-emerald-100 border border-emerald-300/80'
                      }`}
                      title="Hằng tháng (Lặp lại)"
                    >
                      <span>Tháng</span>
                      <span className="text-[8px] opacity-80">🔁</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        handleUpdateMoc(moc.id, { kieuThoiHan: 'hang_nam' });
                        setQuickDateMap(prev => ({ ...prev, [moc.id]: formatToDDMM(moc.ngayHetHan) }));
                      }}
                      className={`px-1.5 py-0.5 rounded text-[11px] font-bold transition cursor-pointer flex items-center gap-0.5 ${
                        isYearly
                          ? 'bg-emerald-700 text-white font-extrabold shadow-2xs'
                          : 'bg-emerald-50 text-emerald-800 hover:bg-emerald-100 border border-emerald-300/80'
                      }`}
                      title="Hằng năm (Lặp lại)"
                    >
                      <span>Năm</span>
                      <span className="text-[8px] opacity-80">🔁</span>
                    </button>
                  </div>

                  {/* Delete button if > 1 milestone */}
                  {currentList.length > 1 && (
                    <button
                      type="button"
                      onClick={() => handleRemoveMoc(moc.id)}
                      className="text-slate-400 hover:text-rose-600 p-1 rounded hover:bg-rose-50 transition cursor-pointer shrink-0"
                      title="Xóa mốc này"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                {/* Hour Field if toggled */}
                {isHourOpen && (
                  <div className="flex items-center justify-between gap-2 pt-1 border-t border-slate-100">
                    <label className="text-[10px] font-bold text-slate-600">Giờ chót (HH:mm):</label>
                    <input
                      type="text"
                      className="w-20 bg-slate-50 border border-slate-200 text-slate-800 px-2 py-0.5 rounded text-xs font-mono outline-none focus:border-[#a3212e]"
                      placeholder="17:00"
                      value={moc.gioHetHan || ''}
                      onChange={(e) => handleUpdateMoc(moc.id, { gioHetHan: e.target.value })}
                    />
                  </div>
                )}

                {/* Status row if showStatus is enabled */}
                {showStatus && (
                  <div className="space-y-1 pt-1 border-t border-slate-100">
                    <label className="text-[10px] font-bold text-slate-500 block">
                      Trạng thái
                    </label>
                    <select
                      className={`w-full border px-2 py-1 rounded-lg text-xs font-bold outline-none cursor-pointer ${
                        isDone ? 'bg-emerald-50 border-emerald-300 text-emerald-900' : 'bg-slate-50 border-slate-200 text-slate-800'
                      }`}
                      value={isDone ? 'Đã hoàn thành' : (moc.trangThai || 'Chưa hoàn thành')}
                      onChange={(e) => handleUpdateMoc(moc.id, { trangThai: e.target.value as any })}
                    >
                      <option value="Chưa hoàn thành">⏳ Chưa hoàn thành</option>
                      <option value="Đã hoàn thành">✅ Đã hoàn thành</option>
                      <option value="Không áp dụng">⚪ Không áp dụng</option>
                    </select>

                    {isDone && (
                      <div className="mt-1 p-1.5 bg-emerald-50 rounded-lg border border-emerald-200 space-y-1">
                        <div className="flex items-center justify-between text-[10px] font-bold text-emerald-900">
                          <span className="flex items-center gap-1">
                            <CheckCircle2 className="w-3 h-3 text-emerald-600" /> Ngày nộp:
                          </span>
                          <span className={`px-1.5 py-0.5 rounded text-[9px] font-black ${
                            isLate ? 'bg-amber-100 text-amber-900' : 'bg-emerald-100 text-emerald-900'
                          }`}>
                            {isLate ? 'Trễ hạn' : 'Đúng hạn'}
                          </span>
                        </div>
                        <input
                          type="date"
                          className="w-full bg-white border border-emerald-300 text-slate-800 px-2 py-0.5 rounded text-xs font-mono font-bold outline-none cursor-pointer"
                          value={moc.ngayHoanThanh || ''}
                          onChange={(e) => handleUpdateMoc(moc.id, { ngayHoanThanh: e.target.value })}
                        />
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Add milestone button */}
        <button
          type="button"
          onClick={handleAddMoc}
          className="w-full border border-dashed border-[#a3212e]/40 hover:border-[#a3212e] bg-red-50/20 hover:bg-red-50 text-[#a3212e] font-bold text-xs py-1.5 px-2 rounded-lg flex items-center justify-center gap-1 transition cursor-pointer"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>+ Thêm mốc báo cáo</span>
        </button>
      </div>

      {/* Result summary banner at the bottom */}
      <div className="bg-slate-50 border border-slate-200 rounded-xl p-2.5 space-y-1">
        <div className="flex items-center gap-1.5 text-xs font-bold text-slate-700">
          <Calendar className="w-3.5 h-3.5 text-[#a3212e]" />
          <span>Thời gian báo cáo:</span>
        </div>
        <div className="space-y-0.5 text-xs font-mono font-bold text-[#0f2444] pl-5">
          {currentList.map((m, idx) => (
            <div key={m.id || idx} className="flex items-center gap-2">
              {currentList.length > 1 && (
                <span className="text-[10px] font-bold text-slate-500 bg-slate-200/80 px-1.5 py-0.2 rounded font-sans">
                  Mốc {idx + 1}:
                </span>
              )}
              <span className="text-[#a3212e]">
                {compileMocThoiHanString(m.kieuThoiHan, m.ngayHetHan, m.gioHetHan)}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
