/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { POLICE_DEPARTMENTS, PoliceDepartment, matchDepartment } from '../utils/documentHelper';
import { Search, ChevronDown, Check, Zap, X } from 'lucide-react';

interface DeptComboboxProps {
  value: string;
  onChange: (code: string) => void;
}

export default function DeptCombobox({ value, onChange }: DeptComboboxProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);

  // Sync selected code to display query when value changes
  useEffect(() => {
    const selectedDept = POLICE_DEPARTMENTS.find(d => d.code === value || d.name === value);
    if (selectedDept) {
      setSearchQuery(`${selectedDept.code} - ${selectedDept.name}`);
    } else if (value === 'KHAC') {
      setSearchQuery('— Khác (Tự nhập) —');
    } else if (value) {
      setSearchQuery(value);
    } else {
      setSearchQuery('');
    }
  }, [value]);

  // Click outside to close and commit search query
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        const q = searchQuery.trim();
        if (q === '') {
          onChange('');
        } else {
          // Check standard departments
          const matchedDept = POLICE_DEPARTMENTS.find(
            d => d.aliases.some(alias => alias === q.toLowerCase()) || 
                 d.code.toLowerCase() === q.toLowerCase() ||
                 d.name.toLowerCase() === q.toLowerCase() ||
                 `${d.code} - ${d.name}`.toLowerCase() === q.toLowerCase()
          );
          if (matchedDept) {
            onChange(matchedDept.code);
          } else {
            // It's a custom text typed by the user
            onChange(q);
          }
        }
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [searchQuery, onChange]);

  const filteredDepts = POLICE_DEPARTMENTS.filter(dept => {
    const foundDept = POLICE_DEPARTMENTS.find(d => d.code === value || d.name === value);
    const currentSelectedText = foundDept ? `${foundDept.code} - ${foundDept.name}` : '';
    if (searchQuery === currentSelectedText) return true;
    return matchDepartment(dept, searchQuery);
  });

  const handleSelect = (code: string) => {
    onChange(code);
    setIsOpen(false);
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange('');
    setSearchQuery('');
    setIsOpen(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      const q = searchQuery.trim();
      if (q === '') {
        onChange('');
        setIsOpen(false);
      } else {
        const matchedDept = POLICE_DEPARTMENTS.find(
          d => d.aliases.some(alias => alias === q.toLowerCase()) || 
               d.code.toLowerCase() === q.toLowerCase() ||
               `${d.code} - ${d.name}`.toLowerCase() === q.toLowerCase()
        );
        if (matchedDept) {
          onChange(matchedDept.code);
        } else {
          onChange(q);
        }
        setIsOpen(false);
        e.currentTarget.blur();
      }
    }
  };

  const isCustomInput = searchQuery.trim() !== '' && !POLICE_DEPARTMENTS.some(
    d => d.code.toLowerCase() === searchQuery.trim().toLowerCase() ||
         `${d.code} - ${d.name}`.toLowerCase() === searchQuery.trim().toLowerCase()
  );

  return (
    <div className="relative" ref={containerRef} id="dept-combobox-container">
      <div 
        onClick={() => setIsOpen(true)}
        className="relative w-full flex items-center bg-white border border-slate-200 focus-within:border-[#a3212e] rounded-lg text-xs font-semibold outline-none transition cursor-pointer overflow-hidden shadow-sm"
      >
        <div className="pl-3 text-slate-400 flex items-center">
          <Search className="w-3.5 h-3.5" />
        </div>
        <input
          type="text"
          className="w-full bg-transparent text-slate-800 pl-2 pr-10 py-2.5 text-xs font-bold outline-none cursor-text placeholder-slate-400"
          placeholder="Nhập tên phòng ban hoặc mã đơn vị..."
          value={searchQuery}
          onChange={(e) => {
            const val = e.target.value;
            setSearchQuery(val);
            setIsOpen(true);

            // Instantly select when user types a matching shortcut or code
            // Skip instant selection for single-character inputs (e.g. 'c', 'a', 'h')
            // so that users can view the filtered list of departments
            const cleanVal = val.toLowerCase().trim();
            if (cleanVal === 'ph10' || cleanVal === 'h10') {
              onChange('PH10');
              setIsOpen(false);
            } else if (cleanVal && cleanVal.length > 1) {
              const matchedDept = POLICE_DEPARTMENTS.find(
                d => d.aliases.some(alias => alias === cleanVal) || d.code.toLowerCase() === cleanVal
              );
              if (matchedDept) {
                onChange(matchedDept.code);
                setIsOpen(false);
              }
            }
          }}
          onFocus={() => {
            setIsOpen(true);
            setSearchQuery('');
          }}
          onKeyDown={handleKeyDown}
        />
        
        {searchQuery && (
          <button
            type="button"
            onClick={handleClear}
            className="absolute right-7 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1 rounded-full hover:bg-slate-100 transition cursor-pointer"
          >
            <X className="w-3 h-3" />
          </button>
        )}

        <div className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none">
          <ChevronDown className="w-3.5 h-3.5" />
        </div>
      </div>

      {isOpen && (
        <div className="absolute z-50 w-full mt-1 bg-white border border-slate-200/80 rounded-lg shadow-xl max-h-60 overflow-y-auto custom-scrollbar animate-fadein">
          <div className="p-1.5 bg-slate-50 border-b border-slate-100 flex items-center justify-between text-[10px] font-bold text-slate-500 uppercase tracking-wider select-none">
            <span>Danh sách đề xuất</span>
            <span className="flex items-center gap-0.5 text-[#a3212e] font-mono"><Zap className="w-2.5 h-2.5 fill-current" /> Đề xuất nhanh</span>
          </div>

          <div className="p-1">
            {/* Custom Input dynamically suggested at the top */}
            {isCustomInput && (
              <button
                type="button"
                onClick={() => handleSelect(searchQuery.trim())}
                className="w-full flex items-center justify-between px-3 py-2 bg-red-50 text-[#a3212e] font-bold rounded-md text-left text-xs transition cursor-pointer mb-1 border border-red-100"
              >
                <div className="flex flex-col">
                  <span className="text-[10px] text-red-500 font-bold uppercase tracking-wide">Sử dụng ký hiệu tự nhập:</span>
                  <span className="font-mono text-sm">{searchQuery.trim()}</span>
                </div>
                <Check className="w-4 h-4 text-[#a3212e]" />
              </button>
            )}

            {filteredDepts.length > 0 ? (
              <>
                {filteredDepts.map((dept) => {
                  const isSelected = value === dept.code;
                  return (
                    <button
                      key={dept.code}
                      type="button"
                      onClick={() => handleSelect(dept.code)}
                      className={`w-full flex items-center justify-between px-3 py-2 rounded-md text-left text-xs transition cursor-pointer ${
                        isSelected 
                          ? 'bg-red-50 text-[#a3212e] font-bold' 
                          : 'text-slate-700 hover:bg-slate-50'
                      }`}
                    >
                      <div className="flex flex-col">
                        <span className="font-bold">{dept.code} - {dept.name}</span>
                      </div>
                      {isSelected && <Check className="w-3.5 h-3.5 text-[#a3212e]" />}
                    </button>
                  );
                })}
                <button
                  type="button"
                  onClick={() => handleSelect('KHAC')}
                  className={`w-full flex items-center justify-between px-3 py-2 rounded-md text-left text-xs transition cursor-pointer border border-dashed border-slate-200 mt-1 ${
                    value === 'KHAC'
                      ? 'bg-red-50 text-[#a3212e] font-bold border-red-200'
                      : 'text-slate-500 hover:bg-slate-50 hover:text-[#a3212e]'
                  }`}
                >
                  <span className="font-bold">— Khác (Tự nhập) —</span>
                  {value === 'KHAC' && <Check className="w-3.5 h-3.5 text-[#a3212e]" />}
                </button>
              </>
            ) : (
              <div>
                <button
                  type="button"
                  onClick={() => handleSelect('KHAC')}
                  className={`w-full flex items-center justify-between px-3 py-2 rounded-md text-left text-xs transition cursor-pointer border border-dashed border-slate-200 ${
                    value === 'KHAC'
                      ? 'bg-red-50 text-[#a3212e] font-bold border-red-200'
                      : 'text-slate-500 hover:bg-slate-50 hover:text-[#a3212e]'
                  }`}
                >
                  <span className="font-bold">— Khác (Tự nhập) —</span>
                  {value === 'KHAC' && <Check className="w-3.5 h-3.5 text-[#a3212e]" />}
                </button>
                {!isCustomInput && (
                  <div className="px-3 py-4 text-center text-xs text-slate-400 font-medium italic">
                    Không tìm thấy phòng ban phù hợp. Gõ để nhập tự do.
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
