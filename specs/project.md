# Project Specification: Hệ Thống Quản Lý Tiến Độ Chỉ Đạo & Chỉ Tiêu

## Overview
Ứng dụng web quản lý nhiệm vụ cho Công an cấp xã, theo dõi tiến độ thực hiện các chỉ tiêu theo tháng đánh giá.

## Core Features
- Quản lý 4 loại nhiệm vụ: A (Tiêu chí chung), B (Có thời hạn), C (Thường xuyên), D (Chỉ tiêu QĐ 11)
- Tự động tính điểm, trạng thái (đúng hạn/trễ hạn/chưa hoàn thành)
- Import/Export Excel hai chiều
- Dashboard tổng quan với biểu đồ
- Calendar view
- Notification system

## Tech Stack
- React 19 + TypeScript
- Vite 6
- Tailwind CSS 4
- ExcelJS (xuất Excel)
- XLSX (nhập Excel)
- localStorage for state persistence

## User Roles
- Công an cấp xã: Quản lý và cập nhật nhiệm vụ
- Lãnh đạo: Xem dashboard, báo cáo

## Success Metrics
- Giảm thời gian quản lý nhiệm vụ 50%
- Tăng độ chính xác dữ liệu
- Dễ dàng xuất báo cáo Excel
