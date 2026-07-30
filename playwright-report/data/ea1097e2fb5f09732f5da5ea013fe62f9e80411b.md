# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: add-task.spec.ts >> E2E: Add a new task
- Location: e2e\add-task.spec.ts:8:1

# Error details

```
Error: expect(locator).toBeVisible() failed

Locator: getByLabel('Nội dung công việc')
Expected: visible
Timeout: 10000ms
Error: element(s) not found

Call log:
  - Expect "toBeVisible" with timeout 10000ms
  - waiting for getByLabel('Nội dung công việc')

```

```yaml
- complementary:
  - text: CA
  - heading "CÔNG AN XÃ NÂM NUNG" [level=1]
  - paragraph: Theo dõi chỉ tiêu công việc
  - button "Thu nhỏ menu"
  - navigation:
    - button "Tổng quan"
    - button "Lịch nhiệm vụ Mới"
    - button "I. Tiêu chí chung 6"
    - button "II & III. Hiển thị chung 63"
    - button "II. Có thời hạn 25"
    - button "III. Thường xuyên 38"
    - button "IV. Chỉ tiêu QĐ11 63"
    - button "I. CHỈ TIÊU MỆNH LỆNH ĐẢNG ỦY CATW, BỘ CÔNG AN GIAO"
    - button "II. CHỈ TIÊU CÔNG TÁC CHUYÊN MÔN"
    - button "1. Công tác tham mưu"
    - button "2. Công tác bảo vệ an ninh quốc gia"
    - button "3. Công tác đấu tranh phòng, chống tội phạm"
    - button "3.1. Công tác điều tra, xử lý tội phạm"
    - button "3.2. Công tác đấu tranh phòng, chống tội phạm về trật tự xã hội"
    - button "3.3. Công tác đấu tranh phòng, chống tội phạm về kinh tế, tham nhũng, buôn lậu, môi trường"
    - button "3.4. Công tác đấu tranh phòng, chống tội phạm và vi phạm pháp luật về ma túy"
    - button "4. Công tác quản lý nhà nước"
    - button "6. Công tác nghiệp vụ cơ bản của lực lượng An ninh nhân dân"
    - button "7. Công tác nghiệp vụ cơ bản của lực lượng Cảnh sát nhân dân"
    - button "8. Công tác xây dựng phong trào toàn dân bảo vệ ANTQ, xây dựng Công an phường kiểu mẫu, Công an xã"
    - button "9. Công tác xây dựng Đảng, xây dựng lực lượng"
    - button "9.1. Công tác xây dựng Đảng, công tác chính trị, tổ chức cán bộ"
    - button "9.2. Công tác tổ chức cán bộ"
    - button "9.3. Công tác thanh tra, kiểm tra, giải quyết khiếu nại tố cáo"
    - button "III. CÁC NHÓM CHỈ TIÊU LỚN GIAI ĐOẠN 2026 - 2030"
    - button "Nhập / Xuất Excel"
    - button "Cấu hình"
  - text: Dữ liệu tự lưu trên thiết bị
- main:
  - heading "HỆ THỐNG QUẢN LÝ TIẾN ĐỘ CHỈ ĐẠO & CHỈ TIÊU" [level=1]
  - paragraph: "Đơn vị: Công an xã Nâm Nung • Tháng theo dõi: 07/2026"
  - button "Dạng thẻ"
  - button "Bảng Excel"
  - button "THÊM NHIỆM VỤ MỚI"
  - button "63"
  - text: "Nhắc sao lưu dữ liệu: Bạn chưa từng xuất Excel để sao lưu trên trình duyệt này. Toàn bộ dữ liệu chỉ đang lưu trong trình duyệt này — xoá cache/đổi máy sẽ mất dữ liệu."
  - button "Xuất Excel ngay"
  - button "Nhắc lại sau 3 ngày"
  - heading "MỤC II • NHIỆM VỤ CÓ THỜI HẠN TRONG THÁNG" [level=2]
  - paragraph: Theo dõi tiến độ thực hiện các văn bản có quy định thời hạn cụ thể trong tháng.
  - text: Điểm Mục II0,0 / 12,5 đ Thống kê Sản phẩm
  - button "Chưa cập nhật:4"
  - button "Đã cập nhật:21"
  - textbox "Tìm kiếm..."
  - combobox:
    - option "⏳ Hạn tăng" [selected]
    - option "⏳ Hạn giảm"
    - option "📅 Ban hành mới"
    - option "📅 Ban hành cũ"
  - combobox:
    - option "— Tất cả hạn —" [selected]
    - option "🔴 Quá hạn"
    - option "🟡 Sắp đến hạn"
  - combobox:
    - option "— Trạng thái —" [selected]
    - option "✅ Hoàn thành"
    - option "⚠️ Hoàn thành trễ hạn"
    - option "- (Chưa xong)"
    - 'option "⚠️ SP: Chưa cập nhật (4)"'
    - 'option "✓ SP: Đã cập nhật (21)"'
  - combobox:
    - option "— Đơn vị —" [selected]
    - option "PA02 (Đội 3)"
    - option "PA06"
    - option "PC06"
    - option "PC07"
    - option "PH10, PV01"
    - option "PV01, PH10"
    - option "PV06"
    - option "PX03 (BTN)"
    - option "PX03 (HPN)"
    - option "PX03 (Đội 1)"
    - option "PX03 (Đội 2)"
    - option "PX03 (Đội 3)"
    - option "PX05"
    - option "PX06"
    - option "Đ8-PV01"
  - text: "25/25 việc #B16Kế hoạch số 256/KH-BAN(PX03) ngày 12/5/2026Thực hiện: PX03 (HPN) Điểm: 0,0 / 0,5 đ 2.5. Trích yếu văn bản — Tiêu chí / Nội dung nhiệm vụ Báo cáo kết quả triển khai tháng hành động quốc gia về phòng chống bạo lực gia đình, tháng hành động vì trẻ em năm 2026 và tổ chức các hoạt động kỷ niệm 25 năm ngày gia đình Việt Nam trước 25/6/2026"
  - button "Chỉnh sửa / Cập nhật nhiệm vụ"
  - text: "Hạn:Trước ngày 25/06/2026 Quá 36 ngày Trạng thái:"
  - combobox:
    - option "Hoàn thành"
    - option "-" [selected]
  - text: "SP phúc đáp:"
  - textbox "Số v/b phúc đáp, báo cáo...": Báo cáo kết quả triển khai
  - text: "#B20Công văn số 4380/CAT-PH10 ngày 23/6/2026Thực hiện: PH10, PV01 Điểm: 0,0 / 0,5 đ 2.5. Trích yếu văn bản việc hướng dẫn tổ chức các hoạt động hưởng ứng Ngày Thế giới chống sa mạc hóa và hạn hán năm 2026 Tiêu chí / Nội dung nhiệm vụ báo cáo kết quả triển khai thực hiện các hoạt động hưởng ứng"
  - button "Chỉnh sửa / Cập nhật nhiệm vụ"
  - text: "Hạn:Trước ngày 25/06/2026 Quá 36 ngày Trạng thái:"
  - combobox:
    - option "Hoàn thành"
    - option "-" [selected]
  - text: "SP phúc đáp:"
  - textbox "Số v/b phúc đáp, báo cáo...": báo cáo gửi CAT (qua PH10) trước 25/6
  - text: "#B9Công văn số 997/CAT-PX03 ngày 23/6/2026Thực hiện: PX03 (Đội 1) Điểm: 0,0 / 0,5 đ 2.5. Trích yếu văn bản rà soát, lập danh sách trang thông tin điện tử cá nhân của CBCS theo Quy định số 85-QĐ/TW Tiêu chí / Nội dung nhiệm vụ Lập danh sách trang thông tin điện tử cá nhân của CBCS theo Quy định số 85-QĐ/TW trước 26/6/2026"
  - button "Chỉnh sửa / Cập nhật nhiệm vụ"
  - text: "Hạn:Trước ngày 26/06/2026 Quá 35 ngày Trạng thái:"
  - combobox:
    - option "Hoàn thành"
    - option "-" [selected]
  - text: "SP phúc đáp:"
  - textbox "Số v/b phúc đáp, báo cáo...": Báo cáo danh sách trang thông tin điện tử của CBCS
  - text: "#B1Công văn số 4524/CAT-PV01(XDPT) ngày 25/6/2026Thực hiện: Đ8-PV01 Điểm: 0,0 / 0,5 đ 2.5. Trích yếu văn bản triển khai thực hiện Quyết định và Kế hoạch của Bộ Công an về xây dựng Công an xã, phường, đặc khu kiểu mẫu về ANTT Tiêu chí / Nội dung nhiệm vụ Chấm điểm thực hiện tiêu chí xây dựng Công an xã, phường, đặc khu kiểu mẫu về ANTT, Báo trước ngày 29/6"
  - button "Chỉnh sửa / Cập nhật nhiệm vụ"
  - text: "Hạn:Trước ngày 29/06/2026 Quá 32 ngày Trạng thái:"
  - combobox:
    - option "Hoàn thành"
    - option "-" [selected]
  - text: "SP phúc đáp:"
  - textbox "Số v/b phúc đáp, báo cáo...": Bảng tự chấm điểm
  - text: "#B4Kế hoạch số 292/KH-CAT-PC06 ngày 28/5/2026Thực hiện: PC06 Điểm: 0,0 / 0,5 đ 2.5. Trích yếu văn bản việc triển khai “Chiến dịch mùa hè số cùng VNeID” Tiêu chí / Nội dung nhiệm vụ Thực hiện đảm bảo các yêu cầu, nội dung của kế hoạch; kết quả bước đầu hoàn thành trước ngày 30/6/2026"
  - button "Chỉnh sửa / Cập nhật nhiệm vụ"
  - text: "Hạn:Trước ngày 30/06/2026 Quá 31 ngày Trạng thái:"
  - combobox:
    - option "Hoàn thành"
    - option "-" [selected]
  - text: "SP phúc đáp:"
  - textbox "Số v/b phúc đáp, báo cáo...": Đồng loạt tổ chức Lễ ra quân theo kế hoạch của CA tỉnh; có báo cáo
  - text: "#B10Kế hoạch số 347/KH-CAT-PX03 ngày 19/6/2026Thực hiện: PX03 (Đội 2) Điểm: 0,0 / 0,5 đ 2.5. Trích yếu văn bản triển khai Phong trào thi đua \"Đẩy mạnh cải cách hành chính Nhà nước trên địa bàn tỉnh Lâm Đồng giai đoạn 2026-2030\" Tiêu chí / Nội dung nhiệm vụ Triển khai Phong trào thi đua \"Đẩy mạnh cải cách hành chính Nhà nước trên địa bàn tỉnh Lâm Đồng giai đoạn 2026-2030\" trước 30/6/2026"
  - button "Chỉnh sửa / Cập nhật nhiệm vụ"
  - text: "Hạn:Trước ngày 30/06/2026 Quá 31 ngày Trạng thái:"
  - combobox:
    - option "Hoàn thành"
    - option "-" [selected]
  - text: "SP phúc đáp:"
  - textbox "Số v/b phúc đáp, báo cáo...": Kế hoạch triển khai của đơn vị
  - text: "#B17Công văn số 702/PX05-Đ2 ngày 17/6/2026Thực hiện: PX05 Điểm: 0,0 / 0,5 đ 2.5. Trích yếu văn bản việc báo cáo phục vụ thanh tra việc chấp hành các quy định của pháp luật về phòng, chống tham nhũng Tiêu chí / Nội dung nhiệm vụ Đề nghị gửi báo cáo trước ngày 30/6/2026"
  - button "Chỉnh sửa / Cập nhật nhiệm vụ"
  - text: "Hạn:Trước ngày 30/06/2026 Quá 31 ngày Trạng thái:"
  - combobox:
    - option "Hoàn thành"
    - option "-" [selected]
  - text: "SP phúc đáp:"
  - textbox "Số v/b phúc đáp, báo cáo...": Báo cáo của Công an các đơn vị, địa phương
  - text: "#B19Kế hoạch số 233/KH-CAT-PA02 ngày 16/6/2026Thực hiện: PA02 (Đội 3) Điểm: 0,0 / 0,5 đ 2.5. Trích yếu văn bản đấu tranh, xử lý số đối tượng lợi dụng khiếu kiện vi phạm pháp luật Tiêu chí / Nội dung nhiệm vụ Các xã, phường, đặc khu xây dựng kế hoạch đấu tranh, xử lý số đối tượng lợi dụng khiếu kiện vi phạm pháp luật và lập danh sách số đầu đơn, cốt cán khiếu kiện trên địa bàn"
  - button "Chỉnh sửa / Cập nhật nhiệm vụ"
  - text: "Hạn:Trước ngày 30/06/2026 Quá 31 ngày Trạng thái:"
  - combobox:
    - option "Hoàn thành"
    - option "-" [selected]
  - text: "SP phúc đáp:"
  - textbox "Số v/b phúc đáp, báo cáo...": Xây dựng kế hoạch và lập danh sách đầu đơn khiếu kiện gửi trước ngày 30/6/2026
  - text: "#B23Công văn số 474/CV-CAT-PA06 ngày 10/12/2025Thực hiện: PA06 Điểm: 0,0 / 0,5 đ 2.5. Trích yếu văn bản việc thu thập thông tin Camera giám sát phục vụ công tác Công an Tiêu chí / Nội dung nhiệm vụ Thực hiện định kỳ hằng tháng, 06 tháng, năm báo cáo kết quả thu thập thông tin theo biểu mẫu số 01 và 02 nộp về Công an tỉnh (qua PA06)"
  - button "Chỉnh sửa / Cập nhật nhiệm vụ"
  - text: "Hạn:Trước ngày 30/06/2026 Quá 31 ngày Trạng thái:"
  - combobox:
    - option "Hoàn thành"
    - option "-" [selected]
  - text: "SP phúc đáp:"
  - textbox "Số v/b phúc đáp, báo cáo...": Định kỳ 06 tháng, năm báo cáo
  - text: "#B21Công văn số 3724/CAT-PH10 ngày 04/6/2026Thực hiện: PV01, PH10 Điểm: 0,0 / 0,5 đ 2.5. Trích yếu văn bản việc tổ chức các hoạt động hưởng ứng Ngày Môi trường Thế giới, Tháng hành động vì môi trường và Ngày Đại dương thế giới, Tuần lễ Biển và Hải đảo Việt Nam năm 2026 Tiêu chí / Nội dung nhiệm vụ Triển khai thực hiện việc tổ chức các hoạt động hưởng ứng Ngày Môi trường Thế giới, Tháng hành động vì môi trường và Ngày Đại dương thế giới, Tuần lễ Biển và Hải đảo Việt Nam năm 2026 trong Công an tỉnh Lâm Đồng"
  - button "Chỉnh sửa / Cập nhật nhiệm vụ"
  - text: "Hạn:Trước ngày 01/07/2026 Quá 30 ngày Trạng thái:"
  - combobox:
    - option "Hoàn thành"
    - option "-" [selected]
  - text: "SP phúc đáp:"
  - textbox "Số v/b phúc đáp, báo cáo...": báo cáo về Công an tỉnh trước ngày 01/7/2026
  - text: "#B22Kế hoạch số 40/KH-CAT-PH10 ngày 21/01/2026Thực hiện: PV01, PH10 Điểm: 0,0 / 0,5 đ 2.5. Trích yếu văn bản triển khai Kế hoạch số 209/KH-UBND ngày 07/01/2026 của UBND tỉnh về triển khai Tháng hành động về An toàn, vệ sinh lao động, Tháng công nhân năm 2026 trên địa bàn tỉnh Lâm Đồng Tiêu chí / Nội dung nhiệm vụ Báo cáo kết quả triển khai tháng hành động vệ sinh an toàn lao động năm 2026"
  - button "Chỉnh sửa / Cập nhật nhiệm vụ"
  - text: "Hạn:Trước ngày 01/07/2026 Quá 30 ngày Trạng thái:"
  - combobox:
    - option "Hoàn thành"
    - option "-" [selected]
  - text: "SP phúc đáp:"
  - textbox "Số v/b phúc đáp, báo cáo...": Báo cáo về Công an tỉnh trước ngày 01/7/2026
  - text: "#B11Công văn số 4636/CAT-PX03 ngày 29/6/2026Thực hiện: PX03 (Đội 2) Điểm: 0,0 / 0,5 đ 2.5. Trích yếu văn bản Sơ kết 6 tháng đầu năm 2026 về thực hiện phong trào thi đua \"Ba nhất: Kỷ luật nhất- Trung thành nhất- Gần dân nhất\" của Bộ Công an Tiêu chí / Nội dung nhiệm vụ Sơ kết 6 tháng đầu năm 2026 về thực hiện phong trào thi đua \"Ba nhất: Kỷ luật nhất- Trung thành nhất- Gần dân nhất\" của Bộ Công an trước 2/7/2026"
  - button "Chỉnh sửa / Cập nhật nhiệm vụ"
  - text: "Hạn:Trước ngày 02/07/2026 Quá 29 ngày Trạng thái:"
  - combobox:
    - option "Hoàn thành"
    - option "-" [selected]
  - text: "SP phúc đáp:"
  - textbox "Số v/b phúc đáp, báo cáo...": Báo cáo kết quả
  - text: "#B14Công văn số 2242/CAT-PX03 ngày 16/4/2026Thực hiện: PX03 (Đội 3) Điểm: 0,0 / 0,5 đ 2.5. Trích yếu văn bản Triển khai Cuộc thi Đại sứ Văn hóa đọc năm 2026 Tiêu chí / Nội dung nhiệm vụ Triển khai Cuộc thi với chủ đề \"50 năm Tự hào lực lượng Cảnh sát PCCC\" trước 5/7/2026"
  - button "Chỉnh sửa / Cập nhật nhiệm vụ"
  - text: "Hạn:Trước ngày 05/07/2026 Quá 26 ngày Trạng thái:"
  - combobox:
    - option "Hoàn thành"
    - option "-" [selected]
  - text: "SP phúc đáp:"
  - textbox "Số v/b phúc đáp, báo cáo...": Báo cáo kết quả triển khai
  - text: "#B2Kế hoạch số 330/KH-CAT-PV01(Đ8) ngày 12/6/2026Thực hiện: Đ8-PV01 Điểm: 0,0 / 0,5 đ 2.5. Trích yếu văn bản tổ sơ kết 05 năm thực hiện Thông tư số 124/2021/TT-BCA ngày 28/12/2021 của Bộ Công an quy định khu dân cư, xã, phường, thị trấn, cơ quan, doanh nghiệp, cơ sở giáo dục đạt tiêu chuẩn “An toàn về an ninh, trật tự” giai đoạn 2021-2026. Tiêu chí / Nội dung nhiệm vụ Công an cấp xã Báo cáo kết quả về Công an tinh trước ngày 10/7"
  - button "Chỉnh sửa / Cập nhật nhiệm vụ"
  - text: "Hạn:Trước ngày 10/07/2026 Quá 21 ngày Trạng thái:"
  - combobox:
    - option "Hoàn thành"
    - option "-" [selected]
  - text: "SP phúc đáp:"
  - textbox "Số v/b phúc đáp, báo cáo...": Báo cáo
  - text: "#B12Kế hoạch số 360/KH-CAT-PX03 ngày 24/6/2026Thực hiện: PX03 (Đội 3) Điểm: 0,0 / 0,5 đ 2.5. Trích yếu văn bản Tổ chức CBCS tham quan Triển lãm hiện vật, hình ảnh lịch sử chào mừng kỷ niệm 80 năm Ngày truyền thống CAND; báo cáo số lượng CBCS tham quan Tiêu chí / Nội dung nhiệm vụ Tổ chức CBCS tham quan Triển lãm hiện vật, hình ảnh lịch sử chào mừng kỷ niệm 80 năm Ngày truyền thống CAND; báo cáo số lượng CBCS tham quan trước 10/7/2026"
  - button "Chỉnh sửa / Cập nhật nhiệm vụ"
  - text: "Hạn:Trước ngày 10/07/2026 Quá 21 ngày Trạng thái:"
  - combobox:
    - option "Hoàn thành"
    - option "-" [selected]
  - text: "SP phúc đáp:"
  - textbox "Số v/b phúc đáp, báo cáo...": Báo cáo số lượng CBCS tham quan
  - text: "#B13Kế hoạch số 314/KH-CAT-PX03 ngày 05/6/2026Thực hiện: PX03 (Đội 3) Điểm: 0,0 / 0,5 đ 2.5. Trích yếu văn bản Triển khai Cuộc thi Đại sứ Văn hóa đọc năm 2026 Tiêu chí / Nội dung nhiệm vụ Triển khai Cuộc thi Đại sứ Văn hóa đọc năm 2026 trước 10/7/2026"
  - button "Chỉnh sửa / Cập nhật nhiệm vụ"
  - text: "Hạn:Trước ngày 10/07/2026 Quá 21 ngày Trạng thái:"
  - combobox:
    - option "Hoàn thành"
    - option "-" [selected]
  - text: "SP phúc đáp:"
  - textbox "Số v/b phúc đáp, báo cáo...": Báo cáo kết quả tổ chức và bài dự thi
  - text: "#B15Kế hoạch số 08/KH-CAT-PV01 ngày 08/7/2025Thực hiện: PX03 (BTN) Điểm: 0,0 / 0,5 đ 2.5. Trích yếu văn bản Tổ chức đợt sinh hoạt chính trị kỷ niệm 80 năm Ngày truyền thống lực lượng An ninh nhân dân Tiêu chí / Nội dung nhiệm vụ Tổ chức đợt sinh hoạt chính trị kỷ niệm 80 năm Ngày truyền thống lực lượng An ninh nhân dân trước 10/7/2026"
  - button "Chỉnh sửa / Cập nhật nhiệm vụ"
  - text: "Hạn:Trước ngày 10/07/2026 Quá 21 ngày Trạng thái:"
  - combobox:
    - option "Hoàn thành"
    - option "-" [selected]
  - text: "SP phúc đáp:"
  - textbox "Số v/b phúc đáp, báo cáo...": Ít nhất 01 hoạt động tại đơn vị
  - text: "#B18Kết luận thanh tra số 693/KL-PX05 ngày 15/6/2026Thực hiện: PX05 Điểm: 0,0 / 0,5 đ 2.5. Trích yếu văn bản thanh tra chuyên đề cơ sở nhà đất dôi dư sau sắp xếp của cơ quan tổ chức thuộc thẩm quyền quản lý của Công an tỉnh Lâm Đồng Tiêu chí / Nội dung nhiệm vụ Đề nghị báo cáo quả thực hiện Kết luận thanh tra trước ngày 10/7/2026"
  - button "Chỉnh sửa / Cập nhật nhiệm vụ"
  - text: "Hạn:Trước ngày 10/07/2026 Quá 21 ngày Trạng thái:"
  - combobox:
    - option "Hoàn thành"
    - option "-" [selected]
  - text: "SP phúc đáp:"
  - textbox "Số v/b phúc đáp, báo cáo...": Báo cáo kết quả thực hiện Kết luận thanh tra
  - text: "#B8Quyết định số 16-QĐ/UBKT, ngày 22/4/2026Thực hiện: PX06 Điểm: 0,0 / 0,5 đ 2.5. Trích yếu văn bản ban hành khung tiêu chí đánh giá, chấm điểm thi đua trên lĩnh vực công tác kiểm tra, giám sát, thi hành kỷ luật của Đảng trong Công an Lâm Đồng năm 2026 Tiêu chí / Nội dung nhiệm vụ Có thông báo để UBKT cấp trên dự các hội nghị, cuộc họp của cấp ủy, chi bộ; cử thành viên UBKT cấp mình dự các cuộc họp với cấp ủy, tổ chức đảng cấp dưới"
  - button "Chỉnh sửa / Cập nhật nhiệm vụ"
  - text: "Hạn:Trước ngày 12/07/2026 Quá 19 ngày Trạng thái:"
  - combobox:
    - option "Hoàn thành"
    - option "-" [selected]
  - text: "SP phúc đáp:"
  - textbox "Số v/b phúc đáp, báo cáo..."
  - text: "#B3Công văn số 850/CAT-PC06Thực hiện: PC06 Điểm: 0,0 / 0,5 đ 2.5. Trích yếu văn bản việc tăng cường kiểm tra công tác lưu trú, tập trung vào các đối tượng thuộc diện quản lý liên quan đến ma túy Tiêu chí / Nội dung nhiệm vụ Giao Công an các địa phương thực hiện kiểm tra 100% các cơ sở có liên quan đến ma túy, hoàn thành trước ngày 15/7/2026"
  - button "Chỉnh sửa / Cập nhật nhiệm vụ"
  - text: "Hạn:Trước ngày 15/07/2026 Quá 16 ngày Trạng thái:"
  - combobox:
    - option "Hoàn thành"
    - option "-" [selected]
  - text: "SP phúc đáp:"
  - textbox "Số v/b phúc đáp, báo cáo...": Có báo cáo kết quả kiểm tra cuối đợt
  - text: "#B24Công văn số 952/CAT-PV06 ngày 09/06/2026Thực hiện: PV06 Điểm: 0,0 / 0,5 đ 2.5. Trích yếu văn bản khẩn trương khắc phục và xử lý dứt điểm tồn tại hạn chế trong công tác hồ sơ nghiệp vụ trên các phần mềm NVCB, ĐTHS, HSNV Tiêu chí / Nội dung nhiệm vụ Xử lý dứt điểm tồn tại, hạn chế trong công tác hồ sơ nghiệp vụ trên các phần mềm NVCB, ĐTHS, HSNV"
  - button "Chỉnh sửa / Cập nhật nhiệm vụ"
  - text: "Hạn:Trước ngày 15/07/2026 Quá 16 ngày Trạng thái:"
  - combobox:
    - option "Hoàn thành"
    - option "-" [selected]
  - text: "SP phúc đáp:"
  - textbox "Số v/b phúc đáp, báo cáo...": Khắc phục dứt điểm tình trạng chênh lệch số liệu thống kế hồ sơ nghiệp vụ CS đang quản lý, sử dụng giữa Công an các đơn vị, địa phương với PV06
  - text: "#B5Kế hoạch số 38/KH-CAT-PC07 ngày 21/01/2026Thực hiện: PC07 Điểm: 0,0 / 0,5 đ 2.5. Trích yếu văn bản việc triển khai công tác quản lý, vận hành, khai thác, sử dụng và tiếp tục cập nhật, hoàn thiện Cơ sở dữ liệu quốc gia về PCCC và CNCH, truyền tin báo cháy và ứng dụng \"Báo cháy 114\" Tiêu chí / Nội dung nhiệm vụ Hướng dẫn cơ sở thuộc diện quản lý về PCCC và CNCH trang bị, kết nối thiết bị truyền tin báo cháy"
  - button "Chỉnh sửa / Cập nhật nhiệm vụ"
  - text: "Hạn:Trước ngày 20/07/2026 Quá 11 ngày Trạng thái:"
  - combobox:
    - option "Hoàn thành"
    - option "-" [selected]
  - text: "SP phúc đáp:"
  - textbox "Số v/b phúc đáp, báo cáo..."
  - text: "#B25Công văn số 1010/CAT-PV06 ngày 26/06/2026Thực hiện: PV06 Điểm: 0,0 / 0,5 đ 2.5. Trích yếu văn bản chấn chỉnh trong thực hiện công tác hồ sơ NVCB của lực lượng CSND Tiêu chí / Nội dung nhiệm vụ Chấn chỉnh trong thực hiện công tác hồ sơ nghiệp vụ cơ bản của lực lượng CSND"
  - button "Chỉnh sửa / Cập nhật nhiệm vụ"
  - text: "Hạn:Trước ngày 20/07/2026 Quá 11 ngày Trạng thái:"
  - combobox:
    - option "Hoàn thành"
    - option "-" [selected]
  - text: "SP phúc đáp:"
  - textbox "Số v/b phúc đáp, báo cáo...": Kết thúc nộp lưu hồ sơ NVCB quá hạn
  - text: "#B7Thực hiện: PC07 Điểm: 0,0 / 0,5 đ 2.5. Trích yếu văn bản — Tiêu chí / Nội dung nhiệm vụ Tham mưu UBND cùng cấp thực hiện kiểm tra an toàn PCCC đối với các cơ sở quy định tại Điểm c, Khoản 2, Điều 13 Nghị định số 105/2025/NĐ-CP"
  - button "Chỉnh sửa / Cập nhật nhiệm vụ"
  - text: "Hạn:Trước ngày 25/07/2026 Quá 6 ngày Trạng thái:"
  - combobox:
    - option "Hoàn thành"
    - option "-" [selected]
  - text: "SP phúc đáp:"
  - textbox "Số v/b phúc đáp, báo cáo..."
  - text: "#B6Kế hoạch số 03/KH-CAT-PC07 ngày 07/01/2026Thực hiện: PC07 Điểm: 0,0 / 0,5 đ 2.5. Trích yếu văn bản — Tiêu chí / Nội dung nhiệm vụ Không để xảy ra vụ cháy cấp V; Không để xảy ra vụ cháy cấp III trở lên so với năm 2025"
  - button "Chỉnh sửa / Cập nhật nhiệm vụ"
  - text: "Hạn:Trước ngày 31/07/2026 Hôm nay Trạng thái:"
  - combobox:
    - option "Hoàn thành"
    - option "-" [selected]
  - text: "SP phúc đáp:"
  - textbox "Số v/b phúc đáp, báo cáo..."
- heading "THÊM MỚI CHỈ ĐẠO / CHỈ TIÊU" [level=3]
- button
- text: I. Thông tin văn bản gốc Số, ký hiệu văn bản *
- textbox "Số"
- text: /
- 'textbox "Ví dụ: KH-PV01"'
- text: "📝 Số hiệu đầy đủ sẽ lưu:"
- 'textbox "Ví dụ: 439/KH-CAT-PV01"'
- text: Loại văn bản
- combobox:
  - option "— Chọn loại —"
  - option "Công văn"
  - option "Báo cáo"
  - option "Kế hoạch" [selected]
  - option "Nghị quyết"
  - option "Quyết định"
  - option "Chỉ thị"
  - option "Quy chế"
  - option "Quy định"
  - option "Thông cáo"
  - option "Thông báo"
  - option "Hướng dẫn"
  - option "Chương trình"
  - option "Phương án"
  - option "Đề án"
  - option "Dự án"
  - option "Biên bản"
  - option "Tờ trình"
  - option "Hợp đồng"
  - option "Công điện"
  - option "Bản ghi nhớ"
  - option "Bản thỏa thuận"
  - option "Giấy ủy quyền"
  - option "Giấy mời"
  - option "Giấy giới thiệu"
  - option "Giấy nghỉ phép"
  - option "Phiếu gửi"
  - option "Phiếu chuyển"
  - option "Phiếu báo"
  - option "Kết luận"
  - option "Nghị định"
  - option "Thông tư"
  - option "— Khác —"
- text: Đơn vị ban hành *
- textbox "Nhập tên phòng ban hoặc mã đơn vị...": PV01 - Phòng Tham mưu
- button
- text: Cấp CAT
- button:
  - checkbox
- text: Ngày ban hành * (dạng ddmm hoặc ddmmyy)
- 'textbox "Ví dụ: 310726"': "310726"
- text: 31/07/2026📅
- textbox: 2026-07-31
- text: II. Nội dung & Trích yếu Trích yếu nội dung văn bản (inline - không xuống dòng)
- textbox "Tóm tắt nội dung văn bản gốc (tự động inline gọn)..."
- text: Chỉ tiêu / Nội dung chỉ đạo cụ thể (giữ nguyên paragraph gốc)
- textbox "Nhập chi tiết nhiệm vụ, công việc (giữ nguyên vị trí xuống dòng của văn bản gốc)..."
- text: Sản phẩm (nếu có sản phẩm phúc đáp, trạng thái sẽ tự động chuyển sang hoàn thành)
- 'textbox "Ví dụ: Báo cáo số 12/BC-TTH, Kế hoạch..."'
- text: III. Thời hạn & Thực hiện Chọn ngày hạn chót (dạng ddmm hoặc ddmmyy)
- button "+ Giờ"
- textbox "Gõ ddmm hoặc ddmmyy...": "310726"
- button "Ngày"
- button "Tháng🔁"
- button "Năm🔁"
- button "+ Thêm mốc báo cáo"
- text: "Thời gian báo cáo: Trước ngày 31/07/2026"
- button "Mở rộng thông tin bổ sung (Điểm, Người thực hiện, Ghi chú...)Mở rộng"
- button "HỦY BỎ"
- button "LƯU NHIỆM VỤ"
- text: Tự động lưu...
```

# Test source

```ts
  1  | import { test, expect } from '@playwright/test';
  2  | 
  3  | test.beforeEach(async ({ page }) => {
  4  |   await page.goto('http://localhost:3000');
  5  |   await expect(page.locator('text=Đang tải dữ liệu...')).not.toBeVisible({ timeout: 20000 });
  6  | });
  7  | 
  8  | test('E2E: Add a new task', async ({ page }) => {
  9  |   // 1. Navigate to the correct tab that contains the add button
  10 |   await page.getByRole('button', { name: 'II. Có thời hạn' }).click();
  11 | 
  12 |   // 2. Open the "Thêm nhanh" modal
  13 |   await page.getByRole('button', { name: 'THÊM NHIỆM VỤ MỚI' }).click();
> 14 |   await expect(page.getByLabel('Nội dung công việc')).toBeVisible({ timeout: 10000 });
     |                                                       ^ Error: expect(locator).toBeVisible() failed
  15 | 
  16 |   // 3. Fill out the form
  17 |   const taskContent = `Nhiệm vụ E2E - ${Date.now()}`;
  18 |   await page.getByLabel('Nội dung công việc').fill(taskContent);
  19 |   await page.getByLabel('Hạn chót').fill('2026-12-31');
  20 |   await page.getByLabel('Đơn vị theo dõi').selectOption({ label: 'Phòng Cảnh sát giao thông' });
  21 | 
  22 |   // 4. Save the task
  23 |   await page.getByRole('button', { name: 'Lưu công việc' }).click();
  24 | 
  25 |   // 5. Verify the task appears in the list
  26 |   await expect(page.locator(`text=${taskContent}`)).toBeVisible({ timeout: 10000 });
  27 | });
  28 | 
```