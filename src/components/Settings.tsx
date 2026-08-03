import React from 'react';
import { ActiveTab } from '../types';
import { AuthUser } from '../api/backendClient';

interface SettingsProps {
    hiddenItems: ActiveTab[];
    updateHiddenItems: (items: ActiveTab[]) => void;
    /** Only set when running via the local backend (`node server.js`). */
    authUser?: AuthUser | null;
    onLogout?: () => void;
}

export default function Settings({ hiddenItems, updateHiddenItems, authUser, onLogout }: SettingsProps) {
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
        <div className="p-6 bg-white rounded-xl shadow-sm border border-slate-200 space-y-6">
            {authUser && (
                <div className="flex items-center justify-between p-4 rounded-lg border border-slate-200 bg-slate-50">
                    <div>
                        <p className="text-sm font-semibold text-[#0f2444]">{authUser.username}</p>
                        <p className="text-xs text-slate-500">
                            {authUser.role === 'lanh_dao' ? 'Lãnh đạo' : 'Công an cấp xã'} · Đang đăng nhập qua máy chủ
                        </p>
                    </div>
                    {onLogout && (
                        <button
                            onClick={onLogout}
                            className="px-3 py-1.5 text-sm font-medium text-[#a3212e] border border-[#a3212e]/30 rounded-lg hover:bg-[#a3212e]/5 transition"
                        >
                            Đăng xuất
                        </button>
                    )}
                </div>
            )}
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