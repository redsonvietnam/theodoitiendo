/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { ShieldCheck, ShieldAlert, Award } from 'lucide-react';
import { TaskA } from '../types';

interface MainAProps {
  tasks: TaskA[];
  updateStatus: (idx: number, status: 'dam_bao' | 'khong_dam_bao' | '') => void;
}

export default function MainA({ tasks, updateStatus }: MainAProps) {
  const sumMax = tasks.reduce((sum, r) => sum + r.maxPoints, 0);
  const sumScore = tasks.reduce((sum, r) => {
    if (r.status === 'dam_bao') return sum + r.maxPoints;
    return sum;
  }, 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-slate-200 pb-5">
        <div>
          <h2 className="font-display text-2xl font-bold text-[#0f2444] tracking-wide">
            MỤC I • TIÊU CHÍ CHUNG XÂY DỰNG ĐẢNG
          </h2>
          <p className="text-sm text-slate-500 font-medium mt-1">
            Ban hành kèm Hướng dẫn số 20-HD/ĐUCA. Đánh giá Đảm bảo / Không đảm bảo cho từng tiêu chí để cộng điểm.
          </p>
        </div>
        <div className="flex items-center gap-3 bg-white px-4 py-2 border border-slate-200 rounded-xl shadow-sm">
          <Award className="w-5 h-5 text-[#a3212e]" />
          <div className="text-xs">
            <span className="text-slate-500 block font-semibold uppercase tracking-wider text-[9px]">Điểm Mục I</span>
            <span className="font-display font-bold text-base text-[#0f2444]">
              {sumScore} / {sumMax} đ
            </span>
          </div>
        </div>
      </div>

      {/* Checklist list */}
      <div className="space-y-4">
        {tasks.map((row, idx) => {
          const isOk = row.status === 'dam_bao';
          const isBad = row.status === 'khong_dam_bao';
          
          let borderClass = 'border-slate-200 border-l-4 border-l-slate-400';
          if (isOk) borderClass = 'border-slate-200 border-l-4 border-l-emerald-500 bg-emerald-50/10';
          if (isBad) borderClass = 'border-slate-200 border-l-4 border-l-red-500 bg-red-50/10';

          return (
            <div 
              key={row.id} 
              className={`bg-white border rounded-xl p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 transition-all duration-200 ${borderClass}`}
            >
              <div className="flex items-start gap-3.5">
                <div className={`w-8 h-8 rounded-lg font-mono font-bold text-sm flex items-center justify-center flex-none ${
                  isOk 
                    ? 'bg-emerald-500 text-white' 
                    : isBad 
                      ? 'bg-red-500 text-white' 
                      : 'bg-slate-100 text-slate-600'
                }`}>
                  0{row.stt}
                </div>
                <div className="space-y-1">
                  <p className="text-xs font-semibold text-slate-700 tracking-wider uppercase">
                    Tiêu chí {row.stt}
                  </p>
                  <p className="text-xs font-semibold text-slate-800 leading-relaxed max-w-3xl">
                    {row.content}
                  </p>
                </div>
              </div>

              {/* Evaluator buttons */}
              <div className="flex flex-col items-end gap-3 self-stretch sm:self-center flex-none">
                <div className="flex bg-slate-100 p-0.5 rounded-lg border border-slate-200">
                  <button
                    onClick={() => updateStatus(idx, isOk ? '' : 'dam_bao')}
                    className={`px-3 py-1.5 rounded-md text-xs font-bold transition flex items-center gap-1.5 cursor-pointer outline-none ${
                      isOk 
                        ? 'bg-emerald-500 text-white shadow-sm' 
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    <ShieldCheck className="w-3.5 h-3.5" />
                    Đảm bảo
                  </button>
                  <button
                    onClick={() => updateStatus(idx, isBad ? '' : 'khong_dam_bao')}
                    className={`px-3 py-1.5 rounded-md text-xs font-bold transition flex items-center gap-1.5 cursor-pointer outline-none ${
                      isBad 
                        ? 'bg-red-500 text-white shadow-sm' 
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    <ShieldAlert className="w-3.5 h-3.5" />
                    Không đảm bảo
                  </button>
                </div>
                
                <span className="font-mono text-xs font-bold text-[#0f2444]">
                  {isOk ? row.maxPoints : 0} / {row.maxPoints} điểm đạt
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
