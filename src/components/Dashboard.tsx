/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { 
  Shield, 
  Award, 
  CheckCircle2, 
  AlertTriangle, 
  Calendar, 
  ChevronRight, 
  BellRing,
  TrendingUp,
  FileText,
  Eye,
  EyeOff,
  Layers
} from 'lucide-react';
import { AppState, TaskBC } from '../types';
import { parseCanCu } from '../utils/cancu';

interface DashboardProps {
  state: AppState;
  setActiveTab: (tab: any) => void;
  todayISO: string;
  daysUntil: (ds: string) => number | null;
  onOpenTaskDetail?: (sec: 'B' | 'C', taskId: string) => void;
  showSectionI_IV?: boolean;
  onToggleSectionI_IV?: () => void;
}

export default function Dashboard({ 
  state, 
  setActiveTab, 
  todayISO, 
  daysUntil,
  onOpenTaskDetail,
  showSectionI_IV = false,
  onToggleSectionI_IV
}: DashboardProps) {
  // 1. Calculate A metrics
  const maxA = state.A.reduce((sum, r) => sum + r.maxPoints, 0);
  const scoreA = state.A.reduce((sum, r) => {
    if (r.status === 'dam_bao') return sum + r.maxPoints;
    return sum;
  }, 0);

  // Helper for B & C points calculation
  const getPointsBC = (row: TaskBC) => {
    if (row.trangThai === 'Hoàn thành đúng hạn') return row.diemGiao;
    if (row.trangThai === 'Hoàn thành trễ hạn') return row.diemGiao * 0.5;
    return 0;
  };

  // 2. Calculate B metrics
  const maxB = state.B.reduce((sum, r) => sum + r.diemGiao, 0);
  const scoreB = state.B.reduce((sum, r) => sum + getPointsBC(r), 0);

  // 3. Calculate C metrics
  const maxC = state.C.reduce((sum, r) => sum + r.diemGiao, 0);
  const scoreC = state.C.reduce((sum, r) => sum + getPointsBC(r), 0);

  // 4. Totals
  const totalMax = maxA + maxB + maxC;
  const totalScore = scoreA + scoreB + scoreC;
  const progressPct = totalMax ? (totalScore / totalMax) * 100 : 0;

  // 5. Overdue and soon tasks from B and C
  const allBC = [
    ...state.B.map(r => ({ ...r, _sec: 'B' as const })),
    ...state.C.map(r => ({ ...r, _sec: 'C' as const }))
  ];
  const overdueBC = allBC.filter(r => 
    r.ngayHetHan && 
    r.ngayHetHan < todayISO && 
    r.trangThai !== 'Hoàn thành đúng hạn' && 
    r.trangThai !== 'Hoàn thành trễ hạn' &&
    r.trangThai !== 'Không áp dụng'
  );

  const soonBC = allBC.filter(r => {
    if (!r.ngayHetHan) return false;
    const dLeft = daysUntil(r.ngayHetHan);
    return (
      dLeft !== null && 
      dLeft >= 0 && 
      dLeft <= 7 && 
      r.trangThai !== 'Hoàn thành đúng hạn' && 
      r.trangThai !== 'Hoàn thành trễ hạn' &&
      r.trangThai !== 'Không áp dụng'
    );
  });

  // 6. Updated tasks count
  const updatedA = state.A.filter(r => r.status).length;
  const updatedBC = allBC.filter(r => r.trangThai).length;
  
  const itemsD = state.D.filter(r => r.type === 'item');
  const updatedD = itemsD.filter(r => r.trangThai).length;

  const totalUpdated = updatedA + updatedBC + updatedD;
  const totalCount = state.A.length + allBC.length + itemsD.length;

  // Render SVG Shield Progress
  const renderShieldSvg = () => {
    const shieldPath = 'M75,6 L138,32 L138,88 C138,128 112,152 75,159 C38,152 12,128 12,88 L12,32 Z';
    const fillTop = 159 - (159 - 6) * Math.min(Math.max(progressPct, 0), 100) / 100;
    
    let color = '#a3212e'; // red
    if (progressPct >= 80) color = '#10b981'; // green
    else if (progressPct >= 50) color = '#f59e0b'; // amber

    return (
      <svg className="w-36 h-40 drop-shadow-md" viewBox="0 0 150 165">
        <defs>
          <clipPath id="clipShield">
            <path d={shieldPath} />
          </clipPath>
        </defs>
        {/* Background shield gray */}
        <path d={shieldPath} fill="#f1f5f9" stroke="#cbd5e1" strokeWidth="2" />
        
        {/* Fill level */}
        <g clipPath="url(#clipShield)">
          <rect x="0" y={fillTop} width="150" height={165 - fillTop} fill={color} className="transition-all duration-1000 ease-out" />
          <rect x="0" y={fillTop - 2} width="150" height="2" fill={color} opacity="0.8" />
        </g>
        
        {/* Frame overlay */}
        <path d={shieldPath} fill="none" stroke="#0f2444" strokeWidth="3" />
        
        {/* Texts */}
        <text x="75" y="82" textAnchor="middle" className="font-display font-bold text-3xl" fill="#0f2444">
          {Math.round(progressPct)}%
        </text>
        <text x="75" y="104" textAnchor="middle" className="font-sans text-[10px] font-bold uppercase tracking-wider" fill="#475569">
          ĐẠT CHỈ TIÊU
        </text>
      </svg>
    );
  };

  // Render SVG Donut Chart
  const renderDonutChart = (id: string, segments: { value: number; color: string; label: string }[]) => {
    const total = segments.reduce((sum, x) => sum + x.value, 0);
    const r = 36;
    const cx = 50;
    const cy = 50;
    const strokeWidth = 10;
    
    if (total === 0) {
      return (
        <svg className="w-24 h-24" viewBox="0 0 100 100">
          <circle cx={cx} cy={cy} r={r} fill="none" stroke="#e2e8f0" strokeWidth={strokeWidth} />
        </svg>
      );
    }

    let accumulatedAngle = -90;
    return (
      <svg className="w-24 h-24" viewBox="0 0 100 100">
        {segments.map((seg, i) => {
          if (seg.value === 0) return null;
          const ratio = seg.value / total;
          const deltaAngle = ratio * 360;
          const startAngle = accumulatedAngle;
          const endAngle = startAngle + deltaAngle;
          accumulatedAngle = endAngle;

          // Compute arc parameters
          const rad = Math.PI / 180;
          const x1 = cx + r * Math.cos(startAngle * rad);
          const y1 = cy + r * Math.sin(startAngle * rad);
          const x2 = cx + r * Math.cos(endAngle * rad);
          const y2 = cy + r * Math.sin(endAngle * rad);
          
          const largeArcFlag = deltaAngle > 180 ? 1 : 0;
          
          // Render full circle as a single element if ratio is virtually 100%
          if (ratio >= 0.999) {
            return (
              <circle
                key={i}
                cx={cx}
                cy={cy}
                r={r}
                fill="none"
                stroke={seg.color}
                strokeWidth={strokeWidth}
              />
            );
          }

          return (
            <path
              key={i}
              d={`M ${x1} ${y1} A ${r} ${r} 0 ${largeArcFlag} 1 ${x2} ${y2}`}
              fill="none"
              stroke={seg.color}
              strokeWidth={strokeWidth}
              strokeLinecap="round"
            />
          );
        })}
        {/* Total number in middle */}
        <text x={cx} y={cy + 4} textAnchor="middle" className="font-display font-bold text-base fill-[#0f2444]">
          {total}
        </text>
      </svg>
    );
  };

  // Segments for B+C status
  const statColorsBC = {
    'Hoàn thành đúng hạn': '#10b981', // green
    'Hoàn thành trễ hạn': '#f59e0b', // amber
    'Chưa hoàn thành': '#ef4444', // red
    'Không áp dụng': '#64748b', // slate
    'Chưa cập nhật': '#cbd5e1' // gray
  };

  const statusesBC = ['Hoàn thành đúng hạn', 'Hoàn thành trễ hạn', 'Chưa hoàn thành', 'Không áp dụng'] as const;
  const segmentsBC: { value: number; color: string; label: string }[] = statusesBC.map(status => ({
    value: allBC.filter(r => r.trangThai === status).length,
    color: statColorsBC[status],
    label: status
  }));
  segmentsBC.push({
    value: allBC.filter(r => !r.trangThai).length,
    color: statColorsBC['Chưa cập nhật'],
    label: 'Chưa cập nhật'
  });

  // Segments for D status
  const statColorsD = {
    'Đạt': '#10b981',
    'Chưa đạt': '#ef4444',
    'Đang triển khai': '#3b82f6', // blue
    'Không áp dụng': '#64748b',
    'Chưa cập nhật': '#cbd5e1'
  };

  const statusesD = ['Đạt', 'Chưa đạt', 'Đang triển khai', 'Không áp dụng'] as const;
  const segmentsD: { value: number; color: string; label: string }[] = statusesD.map(status => ({
    value: itemsD.filter(r => r.trangThai === status).length,
    color: statColorsD[status],
    label: status
  }));
  segmentsD.push({
    value: itemsD.filter(r => !r.trangThai).length,
    color: statColorsD['Chưa cập nhật'],
    label: 'Chưa cập nhật'
  });

  // Upcoming items from B and C with deadlines
  const urgentItems = allBC
    .filter(r => r.ngayHetHan && r.trangThai !== 'Hoàn thành đúng hạn' && r.trangThai !== 'Hoàn thành trễ hạn')
    .map(r => ({ ...r, dLeft: daysUntil(r.ngayHetHan) }))
    .sort((a, b) => {
      if (a.dLeft === null) return 1;
      if (b.dLeft === null) return -1;
      return a.dLeft - b.dLeft;
    })
    .slice(0, 5);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-slate-200 pb-5">
        <div>
          <h2 className="font-display text-2xl font-bold text-[#0f2444] tracking-wide">
            TỔNG QUAN TIẾN ĐỘ THÁNG ĐÁNH GIÁ
          </h2>
          <p className="text-sm text-slate-500 font-medium mt-1">
            Toàn cảnh điểm số và tình trạng thực hiện các chỉ tiêu, nhiệm vụ chính trị được giao.
          </p>
        </div>
        <div className="flex items-center gap-3 bg-white px-4 py-2 border border-slate-200 rounded-xl shadow-sm">
          <TrendingUp className="w-5 h-5 text-[#a3212e]" />
          <div className="text-xs">
            <span className="text-slate-500 block font-semibold uppercase tracking-wider text-[9px]">Điểm đạt hiện tại</span>
            <span className="font-display font-bold text-base text-[#0f2444]">
              {totalScore.toFixed(1).replace('.', ',')} / {totalMax.toFixed(1).replace('.', ',')} đ
            </span>
          </div>
        </div>
      </div>

      {/* Hero Bento */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 md:p-8 flex flex-col md:flex-row items-center gap-8 shadow-sm">
        <div className="flex flex-col items-center flex-none">
          {renderShieldSvg()}
          <span className="font-display text-[10px] tracking-widest text-slate-500 uppercase font-semibold mt-3">
            Tổng Tiến Độ
          </span>
        </div>
        
        <div className="flex-1 w-full grid grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="border-l-3 border-[#c9a227] pl-4 py-1">
            <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider flex items-center gap-1.5">
              <Award className="w-3 h-3 text-[#c9a227]" /> Điểm Đạt
            </span>
            <div className="font-display font-bold text-3xl text-[#0f2444] mt-1.5">
              {totalScore.toFixed(1).replace('.', ',')}
            </div>
            <p className="text-xs text-slate-500 font-semibold mt-1">
              trên {totalMax.toFixed(1).replace('.', ',')} tối đa
            </p>
          </div>

          <div className="border-l-3 border-sky-500 pl-4 py-1">
            <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider flex items-center gap-1.5">
              <CheckCircle2 className="w-3 h-3 text-sky-500" /> Đã cập nhật
            </span>
            <div className="font-display font-bold text-3xl text-[#0f2444] mt-1.5">
              {totalUpdated}
            </div>
            <p className="text-xs text-slate-500 font-semibold mt-1">
              trên {totalCount} nhiệm vụ
            </p>
          </div>

          <div className="border-l-3 border-[#a3212e] pl-4 py-1">
            <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider flex items-center gap-1.5">
              <AlertTriangle className="w-3 h-3 text-[#a3212e]" /> Quá hạn
            </span>
            <div className="font-display font-bold text-3xl text-[#a3212e] mt-1.5">
              {overdueBC.length}
            </div>
            <p className="text-xs text-slate-500 font-semibold mt-1">
              nhiệm vụ trễ hạn
            </p>
          </div>

          <div className="border-l-3 border-amber-500 pl-4 py-1">
            <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider flex items-center gap-1.5">
              <Calendar className="w-3 h-3 text-amber-500" /> Sắp đến hạn
            </span>
            <div className="font-display font-bold text-3xl text-amber-500 mt-1.5">
              {soonBC.length}
            </div>
            <p className="text-xs text-slate-500 font-semibold mt-1">
              trong 7 ngày tới
            </p>
          </div>
        </div>
      </div>

      {/* Grid of breakdowns */}
      <div className="grid md:grid-cols-2 gap-6">
        {/* Section Bars */}
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
          <div className="border-b-2 border-[#c9a227] pb-3 mb-5 inline-block">
            <h3 className="font-display text-sm font-bold text-[#0f2444] uppercase tracking-wider">
              Điểm Đạt Theo Từng Mục
            </h3>
          </div>
          
          <div className="space-y-5">
            {[
              ...(showSectionI_IV ? [{ label: 'Mục I • Tiêu chí xây dựng Đảng (Chung)', score: scoreA, max: maxA, tab: 'A' }] : []),
              { label: 'Mục II • Nhiệm vụ có thời hạn', score: scoreB, max: maxB, tab: 'B' },
              { label: 'Mục III • Nhiệm vụ thường xuyên', score: scoreC, max: maxC, tab: 'C' }
            ].map((item, idx) => {
              const pct = item.max ? (item.score / item.max) * 100 : 0;
              return (
                <div key={idx} className="group">
                  <div className="flex justify-between text-xs font-semibold mb-1.5">
                    <button 
                      onClick={() => setActiveTab(item.tab)}
                      className="text-[#0f2444] hover:text-[#a3212e] font-bold text-left transition outline-none cursor-pointer"
                    >
                      {item.label}
                    </button>
                    <span className="font-mono text-slate-500">
                      {item.score.toFixed(1).replace('.', ',')} / {item.max.toFixed(1).replace('.', ',')} đ
                    </span>
                  </div>
                  <div className="h-2 bg-slate-100 rounded-full overflow-hidden flex">
                    <div 
                      className="bg-gradient-to-r from-[#0f2444] to-slate-600 rounded-full transition-all duration-1000" 
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })}
            <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
              <button
                type="button"
                onClick={() => setActiveTab('BC')}
                className="inline-flex items-center gap-1.5 text-xs text-[#0f2444] hover:text-[#a3212e] font-bold transition cursor-pointer"
              >
                <Layers className="w-3.5 h-3.5 text-[#a3212e]" />
                <span>Xem chung Mục II & III (Tổng hợp)</span>
              </button>

              {!showSectionI_IV && onToggleSectionI_IV && (
                <button
                  type="button"
                  onClick={onToggleSectionI_IV}
                  className="inline-flex items-center gap-1 text-[11px] text-slate-500 hover:text-[#a3212e] font-semibold cursor-pointer transition"
                >
                  <Eye className="w-3 h-3 text-amber-500" />
                  Hiển thị Mục I & IV
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Donut Chart B + C */}
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
          <div className="border-b-2 border-[#c9a227] pb-3 mb-5 inline-block">
            <h3 className="font-display text-sm font-bold text-[#0f2444] uppercase tracking-wider">
              Trạng Thái Nhiệm Vụ (B + C)
            </h3>
          </div>

          <div className="flex items-center gap-6">
            <div className="flex-none">
              {renderDonutChart('donutBC', segmentsBC)}
            </div>
            <div className="flex-1 grid grid-cols-2 gap-y-2 gap-x-4 text-xs">
              {segmentsBC.map((seg, idx) => (
                <div key={idx} className="flex items-center justify-between font-medium">
                  <span className="flex items-center gap-1.5 text-slate-600">
                    <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: seg.color }} />
                    {seg.label}
                  </span>
                  <span className="font-mono font-bold text-slate-800">{seg.value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Grid of details & D stats */}
      <div className="grid md:grid-cols-2 gap-6">
        {/* Priority tasks */}
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
          <div className="flex items-center justify-between border-b-2 border-[#c9a227] pb-3 mb-5">
            <h3 className="font-display text-sm font-bold text-[#0f2444] uppercase tracking-wider flex items-center gap-2">
              <BellRing className="w-4 h-4 text-[#a3212e]" /> Nhiệm Vụ Cần Chú Ý
            </h3>
            <button 
              onClick={() => setActiveTab('calendar')}
              className="text-xs text-[#a3212e] font-semibold flex items-center gap-0.5 hover:underline outline-none cursor-pointer"
            >
              Xem trên lịch <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {urgentItems.length === 0 ? (
            <div className="text-center py-8 text-slate-400 text-xs font-semibold">
              Không có nhiệm vụ khẩn cấp nào chưa hoàn thành.
            </div>
          ) : (
            <div className="space-y-2">
              {urgentItems.map((item) => {
                const isOverdue = item.dLeft !== null && item.dLeft < 0;
                const isDueToday = item.dLeft === 0;
                
                let badgeColor = 'bg-slate-100 text-slate-700';
                let badgeText = `Còn ${item.dLeft} ngày`;
                
                if (isOverdue) {
                  badgeColor = 'bg-red-100 text-red-700 border border-red-200';
                  badgeText = `Quá hạn ${Math.abs(item.dLeft!)} ngày`;
                } else if (isDueToday) {
                  badgeColor = 'bg-amber-100 text-amber-800 border border-amber-200';
                  badgeText = 'Hết hạn hôm nay';
                } else if (item.dLeft! <= 3) {
                  badgeColor = 'bg-amber-50 text-amber-700 border border-amber-200';
                }

                // Extract doc info
                let docSo = item.so?.trim();
                let docNgay = item.ngay?.trim();
                if ((!docSo || !docNgay) && item.canCu) {
                  const parsed = parseCanCu(item.canCu);
                  if (!docSo && parsed.so) docSo = parsed.so;
                  if (!docNgay && parsed.ngay) docNgay = parsed.ngay;
                }

                return (
                  <div
                    key={item.id}
                    onClick={() => onOpenTaskDetail ? onOpenTaskDetail(item._sec, item.id) : setActiveTab(item._sec)}
                    className="p-3 bg-slate-50/70 hover:bg-amber-50/60 border border-slate-200/80 hover:border-amber-300 rounded-xl flex items-center justify-between gap-3 transition-all cursor-pointer group shadow-2xs"
                    title="Bấm để đến xem chi tiết nhiệm vụ này"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5 mb-1 flex-wrap">
                        <span className="bg-[#0f2444] text-white text-[9px] font-mono font-bold px-1.5 py-0.5 rounded shrink-0">
                          {item.id}
                        </span>
                        {(docSo || docNgay) && (
                          <span className="text-[9px] font-medium text-slate-700 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200 flex items-center gap-1">
                            <FileText className="w-2.5 h-2.5 text-amber-600 shrink-0" />
                            {docSo && <span className="font-semibold">{docSo}</span>}
                            {docSo && docNgay && <span>•</span>}
                            {docNgay && <span>{docNgay}</span>}
                          </span>
                        )}
                        <span className="text-[10px] text-slate-500 font-bold truncate ml-auto">
                          {item.donVi || 'CA Cấp Xã'}
                        </span>
                      </div>
                      <p className="text-xs font-semibold text-slate-800 group-hover:text-[#a3212e] line-clamp-1 transition-colors">
                        {item.noiDung}
                      </p>
                    </div>

                    <div className="flex items-center gap-2 flex-none">
                      <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-full ${badgeColor}`}>
                        {badgeText}
                      </span>
                      <div className="bg-white group-hover:bg-[#a3212e] group-hover:text-white p-1 rounded-lg border border-slate-200 group-hover:border-[#a3212e] text-slate-400 transition-all">
                        <ChevronRight className="w-3.5 h-3.5" />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Donut Chart D */}
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm flex flex-col justify-between">
          <div className="border-b-2 border-[#c9a227] pb-3 mb-5 inline-block">
            <h3 className="font-display text-sm font-bold text-[#0f2444] uppercase tracking-wider">
              Trạng Thái Chỉ Tiêu QĐ 11 (Mục IV)
            </h3>
          </div>

          {!showSectionI_IV ? (
            <div className="flex-1 flex flex-col items-center justify-center text-center py-6">
              <p className="text-xs text-slate-500 max-w-xs mb-3">
                Mục IV (Chỉ tiêu QĐ 11) mặc định được ẩn để tập trung theo dõi các nhiệm vụ có thời hạn và hằng tháng.
              </p>
              {onToggleSectionI_IV && (
                <button
                  type="button"
                  onClick={onToggleSectionI_IV}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#0f2444] hover:bg-[#173257] text-white text-xs font-semibold rounded-xl shadow-xs transition cursor-pointer"
                >
                  <Eye className="w-3.5 h-3.5 text-amber-400" />
                  Mở hiển thị Mục IV
                </button>
              )}
            </div>
          ) : (
            <div className="flex items-center gap-6">
              <div className="flex-none">
                {renderDonutChart('donutD', segmentsD)}
              </div>
              <div className="flex-1 grid grid-cols-2 gap-y-2 gap-x-4 text-xs">
                {segmentsD.map((seg, idx) => (
                  <div key={idx} className="flex items-center justify-between font-medium">
                    <span className="flex items-center gap-1.5 text-slate-600">
                      <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: seg.color }} />
                      {seg.label}
                    </span>
                    <span className="font-mono font-bold text-slate-800">{seg.value}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
