/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface MetaData {
  donVi: string;
  thang: string;
}

export interface TaskA {
  id: string;
  stt: number;
  content: string;
  maxPoints: number;
  unit: string;
  status: 'dam_bao' | 'khong_dam_bao' | '';
}

export interface TaskMilestone {
  id: string;
  tenMoc: string;          // Ví dụ: "Báo cáo Tháng 8", "Báo cáo 6 tháng", "Báo cáo Quý III"
  kieuThoiHan?: string;    // "truoc_ngay" | "truoc_ngay_hang_thang" | "hang_quy" | "hang_nam"
  ngayHetHan: string;      // ISO format: YYYY-MM-DD
  gioHetHan?: string;      // HH:mm
  ngayHoanThanh?: string;  // ISO format: YYYY-MM-DD
  trangThai?: 'Hoàn thành' | 'Hoàn thành đúng hạn' | 'Hoàn thành trễ hạn' | 'Đã hoàn thành' | 'Chưa hoàn thành' | 'Không áp dụng' | '-' | string;
  ghiChu?: string;
}

export interface TaskBC {
  id: string;
  stt: number;
  canCu: string;
  // Bóc tách căn cứ thực hiện
  loaiVanBan?: string;
  so?: string;
  ngay?: string;
  donViBanHanh?: string;
  trichYeu?: string;

  // Trường bổ sung mới theo yêu cầu 12 trường thông tin
  gioHetHan?: string;       // Giờ hết hạn (ví dụ: "17:00")
  kieuThoiHan?: string;     // Kiểu thời hạn: "Trước ngày", "Trước ngày hằng tháng", "Hằng năm", ...
  donViTheoDoi?: string;    // Đơn vị giao theo dõi (mặc định trùng donViBanHanh)
  ghiChu?: string;          // Ghi chú
  
  // Danh sách các mốc thời hạn bổ sung (Phương án 1)
  danhSachMoc?: TaskMilestone[];

  // Các điểm chi tiết phục vụ báo cáo Excel
  diemSoLuong?: number;     // (8) Điểm số lượng hoàn thành
  diemChatLuong?: number;   // (9) Điểm chất lượng
  diemTienDo?: number;      // (10) Điểm tiến độ
  minhChung?: string;       // (11) Minh chứng của điểm vượt mức

  noiDung: string;
  thoiHan: string;
  diemGiao: number;
  donVi: string;
  sanPham: string;
  ngayHetHan: string; // ISO format: YYYY-MM-DD
  ngayHoanThanh?: string; // ISO format: YYYY-MM-DD (Ngày hoàn thành thực tế)
  trangThai: 'Hoàn thành' | 'Hoàn thành đúng hạn' | 'Hoàn thành trễ hạn' | 'Đã hoàn thành' | 'Chưa hoàn thành' | 'Không áp dụng' | '-' | string;
}

export interface TaskD {
  type: 'header' | 'item';
  title?: string;
  id?: string;
  stt?: string | number;
  content?: string;
  yeuCau?: string;
  donVi?: string;
  trangThai?: 'Đạt' | 'Chưa đạt' | 'Đang triển khai' | 'Không áp dụng' | '';
  ghiChu?: string;
}

export interface AppState {
  meta: MetaData;
  A: TaskA[];
  B: TaskBC[];
  C: TaskBC[];
  D: TaskD[];
}

export type ActiveTab = 'dashboard' | 'calendar' | 'A' | 'B' | 'C' | 'BC' | 'D' | 'excel';
