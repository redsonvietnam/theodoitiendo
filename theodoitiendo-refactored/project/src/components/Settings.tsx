import React from 'react';
import { ActiveTab } from '../types';

interface SettingsProps {
    hiddenItems: ActiveTab[];
    updateHiddenItems: (items: ActiveTab[]) => void;
}

export default function Settings({ hiddenItems, updateHiddenItems }: SettingsProps) {
    const allTabs: { id: ActiveTab; label: string }[] = [
        { id: 'dashboard', label: 'Tổng quan' },
        { id: 'calendar', label: 'Lịch nhiệm vụ' },
        { id: 'A', label: 'I. Tiêu chí chung' },
        { id: 'BC', label: 'II & III. Hiển thị chung' },
        { id: 'B', label: 'II. Có thời hạn' },
        { id: 'C', label: 'III. Thường xuyên' },
        { id: 'D', label: 'IV. Chỉ tiêu QĐ11' },
        { id: 'excel', label: 'Nhập / Xuất Excel' },
    ];

    const toggleItem = (id: ActiveTab) => {
        if (hiddenItems.includes(id)) {
            updateHiddenItems(hiddenItems.filter(item => item !== id));
        } else {
            updateHiddenItems([...hiddenItems, id]);
        }
    };

    return (
        <div className="p-6 bg-white rounded-xl shadow-sm border border-slate-200">
            <h2 className="text-lg font-bold text-[#0f2444] mb-4">Cấu hình hiển thị Sidebar</h2>
            <p className="text-sm text-slate-600 mb-6">Chọn các mục bạn muốn ẩn khỏi thanh điều hướng bên trái:</p>
            <div className="space-y-3">
                {allTabs.map(tab => (
                    <label key={tab.id} className="flex items-center gap-3 cursor-pointer p-3 rounded-lg hover:bg-slate-50 border border-transparent hover:border-slate-200 transition">
                        <input
                            type="checkbox"
                            checked={!hiddenItems.includes(tab.id)}
                            onChange={() => toggleItem(tab.id)}
                            className="w-4 h-4 text-[#a3212e] rounded focus:ring-[#a3212e]"
                        />
                        <span className="text-sm font-medium text-slate-700">{tab.label}</span>
                    </label>
                ))}
            </div>
        </div>
    );
}