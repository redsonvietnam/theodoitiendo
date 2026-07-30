/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface PoliceDepartment {
  code: string;
  name: string;
  aliases: string[];
  desc?: string;
}

export interface DocTypeMapping {
  name: string;
  symbol: string;
}

// Vietnamese standard police department abbreviations (Công an cấp tỉnh) with keyboard shortcuts (gõ tắt)
export const POLICE_DEPARTMENTS: PoliceDepartment[] = [
  { code: 'PV01', name: 'Phòng Tham mưu', aliases: ['v1', 'pv1', 'v01', 'pv01', 'thammuu', 'tm'] },
  { code: 'PX01', name: 'Phòng Tổ chức cán bộ', aliases: ['x1', 'px1', 'x01', 'px01', 'tochuccanbo', 'tccb'] },
  { code: 'PX03', name: 'Phòng Công tác đảng và công tác chính trị', aliases: ['x3', 'px3', 'x03', 'px03', 'congtacdang', 'ctd', 'ctct', 'tuyengiao'] },
  { code: 'PX05', name: 'Thanh tra Công an tỉnh', aliases: ['x5', 'px5', 'x05', 'px05', 'thanhtra', 'tt'] },
  { code: 'PH10', name: 'Phòng Hậu cần', aliases: ['h', 'h10', 'ph10', 'haucan', 'hc', 'phonghaucan'] },
  { code: 'PA01', name: 'Phòng An ninh đối ngoại', aliases: ['a1', 'pa1', 'a01', 'pa01', 'doingoai', 'dn', 'an1'] },
  { code: 'PA02', name: 'Phòng An ninh đối nội', aliases: ['a2', 'pa2', 'a02', 'pa02', 'doinoi', 'dn2', 'an2'] },
  { code: 'PA03', name: 'Phòng An ninh chính trị nội bộ', aliases: ['a3', 'pa3', 'a03', 'pa03', 'chinhtrinoibo', 'ctnb', 'an3'] },
  { code: 'PA04', name: 'Phòng An ninh kinh tế', aliases: ['a4', 'pa4', 'a04', 'pa04', 'kinhte', 'kt', 'an4'] },
  { code: 'PA05', name: 'Phòng An ninh mạng và phòng chống tội phạm công nghệ cao', aliases: ['a5', 'pa5', 'a05', 'pa05', 'anm', 'anninhmang', 'an5'] },
  { code: 'PA06', name: 'Phòng Kỹ thuật nghiệp vụ', aliases: ['a6', 'pa6', 'a06', 'pa06', 'kythuatnghiepvu', 'ktnv', 'an6'] },
  { code: 'PA08', name: 'Phòng Quản lý xuất nhập cảnh', aliases: ['a8', 'pa8', 'a08', 'pa08', 'xuatnhapcanh', 'xnc', 'an8'] },
  { code: 'PA09', name: 'Phòng Điều tra an ninh', aliases: ['a9', 'pa9', 'a09', 'pa09', 'dieutraanninh', 'dtan', 'an9'] },
  { code: 'PC01', name: 'Văn phòng Cơ quan Cảnh sát điều tra', aliases: ['c1', 'pc1', 'c01', 'pc01', 'canhsatdieutra', 'csdt', 'vp', 'vpcsqldt'] },
  { code: 'PC02', name: 'Phòng Cảnh sát hình sự', aliases: ['c2', 'pc2', 'c02', 'pc02', 'hinhsu', 'hs', 'cshs'] },
  { code: 'PC03', name: 'Phòng Cảnh sát ĐTTP về tham nhũng, kinh tế, buôn lậu, môi trường', aliases: ['c3', 'pc3', 'c03', 'pc03', 'cskinte', 'cskt', 'bl', 'moitruong'] },
  { code: 'PC04', name: 'Phòng Cảnh sát ĐTTP về ma túy', aliases: ['c4', 'pc4', 'c04', 'pc04', 'matuy', 'mt', 'csmt'] },
  { code: 'PC06', name: 'Phòng Cảnh sát quản lý hành chính về trật tự xã hội', aliases: ['c6', 'pc6', 'c06', 'pc06', 'hanhchinh', 'qlhc', 'ttxh'] },
  { code: 'PC07', name: 'Phòng Cảnh sát PCCC và CNCH', aliases: ['c7', 'pc7', 'c07', 'pc07', 'pccc', 'cnch', 'phongchay', 'chuuahuy'] },
  { code: 'PC08', name: 'Phòng Cảnh sát giao thông', aliases: ['c8', 'pc8', 'c08', 'pc08', 'giaothong', 'csgt', 'gt'] },
  { code: 'PC09', name: 'Phòng Kỹ thuật hình sự', aliases: ['c9', 'pc9', 'c09', 'pc09', 'kythuathinhsu', 'kths'] },
  { code: 'PC10', name: 'Phòng Cảnh sát thi hành án hình sự và hỗ trợ tư pháp', aliases: ['c10', 'pc10', 'c10', 'pc10', 'thihanhan', 'tha', 'cs10'] },
  { code: 'PC11', name: 'Phòng Cảnh sát cơ động', aliases: ['c11', 'pc11', 'c11', 'pc11', 'codong', 'cscd', 'cd', 'cs11'] },
  { code: 'PK02', name: 'Phòng Cảnh sát cơ động', aliases: ['k2', 'pk2', 'k02', 'pk02', 'codong', 'cscd', 'cd', 'pk', 'k1', 'pk1', 'k01', 'pk01'] }
];

export function formatDonViBanHanhDisplay(value: string | undefined): string {
  if (!value) return '';
  if (value === 'CAT') return 'CAT';
  const dept = POLICE_DEPARTMENTS.find(d => d.code === value);
  if (dept) {
    return `${dept.code} - ${dept.name}`;
  }
  return value;
}

/**
 * Checks if a police department matches the search keyword (supports aliases like a1, v1, x3, h, etc.)
 * Enhanced with smart police department prefix filtering rules for 'c' (PC), 'a' (PA), 'h'/'x' (PH/PX), 'v' (PV).
 */
export function matchDepartment(dept: PoliceDepartment, keyword: string): boolean {
  const cleanKeyword = keyword.toLowerCase().trim().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  if (!cleanKeyword) return true;

  // 1. Special single character / prefix shortcuts
  if (cleanKeyword === 'c' || cleanKeyword === 'pc') {
    return dept.code.startsWith('PC');
  }
  if (cleanKeyword === 'a' || cleanKeyword === 'pa') {
    return dept.code.startsWith('PA');
  }
  if (cleanKeyword === 'h' || cleanKeyword === 'ph') {
    return dept.code.startsWith('PH');
  }
  if (cleanKeyword === 'x' || cleanKeyword === 'px') {
    return dept.code.startsWith('PX');
  }
  if (cleanKeyword === 'v' || cleanKeyword === 'pv') {
    return dept.code.startsWith('PV');
  }
  if (cleanKeyword === 'k' || cleanKeyword === 'pk' || cleanKeyword === 'k2' || cleanKeyword === 'pk2') {
    return dept.code.startsWith('PK') || dept.code === 'PK02' || dept.code === 'PK01';
  }

  // 2. Direct code match (e.g. PV01)
  if (dept.code.toLowerCase().includes(cleanKeyword)) return true;

  // 3. Alias match (e.g. a1 matches PA01, x3 matches PX03)
  if (dept.aliases.some(alias => alias.toLowerCase().includes(cleanKeyword))) return true;

  // 4. Direct name match (e.g. Tham muu)
  // Ensure short words (<= 2 chars) only match at the start of a word inside the name
  const cleanName = dept.name.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  if (cleanName.includes(cleanKeyword)) {
    if (cleanKeyword.length <= 2) {
      const words = cleanName.split(/\s+/);
      return words.some(word => word.startsWith(cleanKeyword));
    }
    return true;
  }

  return false;
}

// Document types and their official abbreviations according to Decree 30/2020/NĐ-CP
export const DOCUMENT_TYPE_MAPPINGS: DocTypeMapping[] = [
  { name: 'Công văn', symbol: '' },
  { name: 'Báo cáo', symbol: 'BC' },
  { name: 'Kế hoạch', symbol: 'KH' },
  { name: 'Nghị quyết', symbol: 'NQ' },
  { name: 'Quyết định', symbol: 'QĐ' },
  { name: 'Chỉ thị', symbol: 'CT' },
  { name: 'Quy chế', symbol: 'QC' },
  { name: 'Quy định', symbol: 'QyĐ' },
  { name: 'Thông cáo', symbol: 'TC' },
  { name: 'Thông báo', symbol: 'TB' },
  { name: 'Hướng dẫn', symbol: 'HD' },
  { name: 'Chương trình', symbol: 'CTr' },
  { name: 'Phương án', symbol: 'PA' },
  { name: 'Đề án', symbol: 'ĐA' },
  { name: 'Dự án', symbol: 'DA' },
  { name: 'Biên bản', symbol: 'BB' },
  { name: 'Tờ trình', symbol: 'TTr' },
  { name: 'Hợp đồng', symbol: 'HĐ' },
  { name: 'Công điện', symbol: 'CĐ' },
  { name: 'Bản ghi nhớ', symbol: 'BGN' },
  { name: 'Bản thỏa thuận', symbol: 'BTT' },
  { name: 'Giấy ủy quyền', symbol: 'GUQ' },
  { name: 'Giấy mời', symbol: 'GM' },
  { name: 'Giấy giới thiệu', symbol: 'GGT' },
  { name: 'Giấy nghỉ phép', symbol: 'GNP' },
  { name: 'Phiếu gửi', symbol: 'PG' },
  { name: 'Phiếu chuyển', symbol: 'PC' },
  { name: 'Phiếu báo', symbol: 'PB' },
  { name: 'Kết luận', symbol: 'KL' },
  { name: 'Nghị định', symbol: 'NĐ' },
  { name: 'Thông tư', symbol: 'TT' }
];

/**
 * Gets abbreviation for a document type
 */
export function getDocTypeSymbol(docType: string): string {
  const match = DOCUMENT_TYPE_MAPPINGS.find(
    m => m.name.toLowerCase().trim() === docType.toLowerCase().trim()
  );
  if (match) return match.symbol;
  
  // Dynamic fallback: take the first letters of each word capitalized
  const words = docType.trim().split(/\s+/);
  if (words.length === 1) {
    return docType.substring(0, 2).toUpperCase();
  }
  return words
    .map(w => w.charAt(0))
    .join('')
    .toUpperCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, ''); // strip accents for symbol
}

/**
 * Auto-suggests the document symbol based on document type, drafting unit, and provincial police toggle
 */
export function suggestDocumentSymbol(
  docType: string,
  departmentCode: string,
  isFromCAT: boolean,
  customSuffix: string = ''
): string {
  if (!docType) return '';
  const typeSym = getDocTypeSymbol(docType);

  if (isFromCAT) {
    const deptPart = departmentCode ? `-${departmentCode}` : (customSuffix ? `-${customSuffix}` : '');
    const prefix = typeSym ? `${typeSym}-CAT` : 'CAT';
    return `/${prefix}${deptPart}`;
  } else {
    const deptPart = departmentCode ? `-${departmentCode}` : (customSuffix ? `-${customSuffix}` : '');
    const prefix = typeSym ? `${typeSym}` : '';
    if (!prefix) {
      const body = departmentCode || customSuffix;
      return body ? `/${body}` : '';
    }
    return `/${prefix}${deptPart}`;
  }
}

export interface ParsedDocNumber {
  numberOnly: string;
  symbolOnly: string;
  isFromCAT: boolean;
  departmentCode: string;
  customSuffix: string;
}

/**
 * Parses an existing full document number/symbol (e.g., "58/KH-CAT-PA04")
 */
export function parseDocumentNumber(soFull: string): ParsedDocNumber {
  if (!soFull) {
    return {
      numberOnly: '',
      symbolOnly: '',
      isFromCAT: false,
      departmentCode: '',
      customSuffix: ''
    };
  }

  const trimmed = soFull.trim();
  const slashIndex = trimmed.indexOf('/');
  
  if (slashIndex === -1) {
    // If no slash, it's either just a number or just a symbol
    if (/^\d+$/.test(trimmed)) {
      return {
        numberOnly: trimmed,
        symbolOnly: '',
        isFromCAT: false,
        departmentCode: '',
        customSuffix: ''
      };
    } else {
      return {
        numberOnly: '',
        symbolOnly: trimmed,
        isFromCAT: trimmed.includes('-CAT'),
        departmentCode: '',
        customSuffix: ''
      };
    }
  }

  const numberOnly = trimmed.substring(0, slashIndex).trim();
  const symbolOnly = trimmed.substring(slashIndex).trim(); // includes the leading slash e.g., "/KH-CAT-PA04"

  const isFromCAT = symbolOnly.includes('-CAT');
  
  // Try to find if any of standard department codes exist in the suffix
  let departmentCode = '';
  let customSuffix = '';
  
  // Sort departments by code length descending to match longer ones first if any
  const sortedDepts = [...POLICE_DEPARTMENTS].sort((a, b) => b.code.length - a.code.length);
  
  for (const dept of sortedDepts) {
    // Check if the symbol ends with the department code or has it preceded by a dash
    if (symbolOnly.endsWith(dept.code) || symbolOnly.includes(`-${dept.code}`)) {
      departmentCode = dept.code;
      break;
    }
  }

  // If no standard department code, check if there is custom text after CAT or standard symbol
  if (!departmentCode) {
    const parts = symbolOnly.split('-');
    if (parts.length > 1) {
      const lastPart = parts[parts.length - 1];
      if (lastPart && lastPart !== 'CAT') {
        customSuffix = lastPart;
      }
    }
  }

  return {
    numberOnly,
    symbolOnly,
    isFromCAT,
    departmentCode,
    customSuffix
  };
}

export interface TwoWayParsedResult {
  detectedLoaiVanBan?: string;
  detectedIsFromCAT: boolean;
  detectedDeptCode?: string;
}

export const SHORTHAND_DOC_TYPES = [
  { short: 'ttr', name: 'Tờ trình', symbol: 'TTr' },
  { short: 'ctr', name: 'Chương trình', symbol: 'CTr' },
  { short: 'bgn', name: 'Bản ghi nhớ', symbol: 'BGN' },
  { short: 'btt', name: 'Bản thỏa thuận', symbol: 'BTT' },
  { short: 'guq', name: 'Giấy ủy quyền', symbol: 'GUQ' },
  { short: 'ggt', name: 'Giấy giới thiệu', symbol: 'GGT' },
  { short: 'gnp', name: 'Giấy nghỉ phép', symbol: 'GNP' },
  { short: 'qyd', name: 'Quy định', symbol: 'QyĐ' },
  { short: 'qyđ', name: 'Quy định', symbol: 'QyĐ' },
  { short: 'kh', name: 'Kế hoạch', symbol: 'KH' },
  { short: 'bc', name: 'Báo cáo', symbol: 'BC' },
  { short: 'cv', name: 'Công văn', symbol: '' },
  { short: 'nq', name: 'Nghị quyết', symbol: 'NQ' },
  { short: 'qd', name: 'Quyết định', symbol: 'QĐ' },
  { short: 'qđ', name: 'Quyết định', symbol: 'QĐ' },
  { short: 'ct', name: 'Chỉ thị', symbol: 'CT' },
  { short: 'qc', name: 'Quy chế', symbol: 'QC' },
  { short: 'tc', name: 'Thông cáo', symbol: 'TC' },
  { short: 'tb', name: 'Thông báo', symbol: 'TB' },
  { short: 'hd', name: 'Hướng dẫn', symbol: 'HD' },
  { short: 'pa', name: 'Phương án', symbol: 'PA' },
  { short: 'da', name: 'Dự án', symbol: 'DA' },
  { short: 'đa', name: 'Đề án', symbol: 'ĐA' },
  { short: 'bb', name: 'Biên bản', symbol: 'BB' },
  { short: 'hđ', name: 'Hợp đồng', symbol: 'HĐ' },
  { short: 'hd', name: 'Hợp đồng', symbol: 'HĐ' },
  { short: 'cd', name: 'Công điện', symbol: 'CĐ' },
  { short: 'cđ', name: 'Công điện', symbol: 'CĐ' },
  { short: 'gm', name: 'Giấy mời', symbol: 'GM' },
  { short: 'pg', name: 'Phiếu gửi', symbol: 'PG' },
  { short: 'pc', name: 'Phiếu chuyển', symbol: 'PC' },
  { short: 'pb', name: 'Phiếu báo', symbol: 'PB' },
  { short: 'kl', name: 'Kết luận', symbol: 'KL' },
  { short: 'nd', name: 'Nghị định', symbol: 'NĐ' },
  { short: 'nđ', name: 'Nghị định', symbol: 'NĐ' },
  { short: 'tt', name: 'Thông tư', symbol: 'TT' },
];

export function tryExpandShorthand(input: string): ShorthandExpansionResult | null {
  if (!input) return null;
  
  let str = input.toLowerCase().trim();
  if (str.startsWith('/')) {
    str = str.substring(1);
  }
  str = str.trim();
  if (!str) return null;

  // 1. Check if it contains 'cat'
  let isFromCAT = false;
  if (str.includes('cat')) {
    isFromCAT = true;
    str = str.replace(/[-_]?cat[-_]?/g, '');
  }

  // 2. Find document type shorthand at the start
  let matchedDocType = null;
  for (const item of SHORTHAND_DOC_TYPES) {
    if (str.startsWith(item.short)) {
      matchedDocType = item;
      str = str.substring(item.short.length);
      if (str.startsWith('-') || str.startsWith('_') || str.startsWith('/')) {
        str = str.substring(1);
      }
      break;
    }
  }

  // 3. Find department from the rest of the string
  const cleanDeptStr = str.trim();
  let matchedDept = null;
  if (cleanDeptStr) {
    // Exact match or alias match
    matchedDept = POLICE_DEPARTMENTS.find(d => 
      d.code.toLowerCase() === cleanDeptStr ||
      d.aliases.some(alias => alias.toLowerCase() === cleanDeptStr)
    );
  }

  // ONLY auto-expand if we found a valid department matching!
  if (matchedDept) {
    const docType = matchedDocType ? matchedDocType.name : 'Công văn';
    const departmentCode = matchedDept.code;
    const expandedSymbol = suggestDocumentSymbol(docType, departmentCode, isFromCAT);
    return {
      docType,
      isFromCAT,
      departmentCode,
      expandedSymbol
    };
  }

  return null;
}

export interface ShorthandExpansionResult {
  docType: string;
  isFromCAT: boolean;
  departmentCode: string;
  expandedSymbol: string;
}

export function parseDocumentSymbolTwoWay(symbolStr: string): TwoWayParsedResult {
  // Strip leading slash if any
  let cleanSymbol = symbolStr.startsWith('/') ? symbolStr.substring(1) : symbolStr;
  cleanSymbol = cleanSymbol.trim();
  
  if (!cleanSymbol) {
    return {
      detectedIsFromCAT: false
    };
  }

  // 1. Detect isFromCAT
  const parts = cleanSymbol.split('-');
  const detectedIsFromCAT = parts.some(p => p.toUpperCase() === 'CAT');

  // 2. Detect department code
  let detectedDeptCode: string | undefined = undefined;
  const sortedDepts = [...POLICE_DEPARTMENTS].sort((a, b) => b.code.length - a.code.length);
  for (const part of parts) {
    const matched = sortedDepts.find(d => d.code.toUpperCase() === part.toUpperCase());
    if (matched) {
      detectedDeptCode = matched.code;
      break;
    }
  }
  
  if (!detectedDeptCode) {
    for (const d of sortedDepts) {
      if (cleanSymbol.toUpperCase().includes(d.code.toUpperCase())) {
        detectedDeptCode = d.code;
        break;
      }
    }
  }

  // 3. Detect loaiVanBan (document type)
  let detectedLoaiVanBan: string | undefined = undefined;
  const firstPart = parts[0]?.toUpperCase() || '';
  if (firstPart && firstPart !== 'CAT' && (!detectedDeptCode || firstPart !== detectedDeptCode.toUpperCase())) {
    const match = DOCUMENT_TYPE_MAPPINGS.find(
      m => m.symbol && m.symbol.toUpperCase() === firstPart
    );
    if (match) {
      detectedLoaiVanBan = match.name;
    } else {
      const matchedBySymbol = DOCUMENT_TYPE_MAPPINGS.find(
        m => m.symbol && cleanSymbol.toUpperCase().startsWith(m.symbol.toUpperCase() + '-')
      );
      if (matchedBySymbol) {
        detectedLoaiVanBan = matchedBySymbol.name;
      }
    }
  }

  if (!detectedLoaiVanBan) {
    detectedLoaiVanBan = 'Công văn';
  }

  return {
    detectedLoaiVanBan,
    detectedIsFromCAT,
    detectedDeptCode
  };
}

/**
 * Format YYYY-MM-DD to DDMMYY (e.g. 2026-03-12 -> 120326)
 */
export function formatToDDMMYY(dateStr: string | undefined): string {
  if (!dateStr) return '';
  const parts = dateStr.split('-');
  if (parts.length === 3) {
    const yyyy = parts[0];
    const mm = parts[1];
    const dd = parts[2];
    return `${dd}${mm}${yyyy.substring(2)}`;
  }
  return '';
}

/**
 * Format YYYY-MM-DD or DD/MM/YYYY to DDMM (e.g. 2026-12-25 -> 2512)
 */
export function formatToDDMM(dateStr: string | undefined): string {
  if (!dateStr) return '';
  const clean = dateStr.trim();
  const parts = clean.split(/[\/\-\.]/);
  if (parts.length === 3) {
    if (parts[0].length === 4) { // YYYY-MM-DD
      return `${parts[2].padStart(2, '0')}${parts[1].padStart(2, '0')}`;
    } else { // DD/MM/YYYY
      return `${parts[0].padStart(2, '0')}${parts[1].padStart(2, '0')}`;
    }
  }
  if (parts.length === 1 && parts[0].length >= 4) {
    return parts[0].substring(0, 4);
  }
  return clean;
}

export function standardizeToYYYYMMDD(str: string | undefined): string {
  if (!str) return '';
  const clean = str.trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(clean)) {
    return clean;
  }
  const parts = clean.split(/[\/\-]/);
  if (parts.length === 3) {
    if (parts[0].length === 4) {
      const yyyy = parts[0];
      const mm = parts[1].padStart(2, '0');
      const dd = parts[2].padStart(2, '0');
      return `${yyyy}-${mm}-${dd}`;
    }
    if (parts[2].length === 4) {
      const dd = parts[0].padStart(2, '0');
      const mm = parts[1].padStart(2, '0');
      const yyyy = parts[2];
      return `${yyyy}-${mm}-${dd}`;
    }
  }
  return clean;
}

/**
 * Checks whether a deadline matches a specific calendar target date (year, monthZeroIndexed, day).
 * Handles:
 * - "truoc_ngay_hang_thang": matches day of every month
 * - "hang_nam": matches month & day of EVERY year
 * - "truoc_ngay" or exact date: matches YYYY-MM-DD
 */
export function isDateMatchingDeadline(
  ngayHetHan: string | undefined,
  kieuThoiHan: string | undefined,
  year: number,
  monthZeroIndexed: number,
  day: number
): boolean {
  if (!ngayHetHan) return false;
  const dayStr = String(day).padStart(2, '0');
  const monthStr = String(monthZeroIndexed + 1).padStart(2, '0');
  const dateQuery = `${year}-${monthStr}-${dayStr}`;

  const kieu = kieuThoiHan || 'truoc_ngay';

  if (kieu === 'truoc_ngay_hang_thang') {
    const clean = ngayHetHan.trim();
    const parts = clean.split(/[\/\-\.]/);
    if (parts.length === 3) {
      const d = parts[0].length === 4 ? parts[2] : parts[0];
      return d.padStart(2, '0') === dayStr;
    }
    if (parts.length === 1) {
      if (parts[0].length <= 2) {
        return parts[0].padStart(2, '0') === dayStr;
      }
      return parts[0].substring(0, 2) === dayStr;
    }
  }

  if (kieu === 'hang_nam') {
    const clean = ngayHetHan.trim();
    const parts = clean.split(/[\/\-\.]/);
    if (parts.length === 3) {
      if (parts[0].length === 4) { // YYYY-MM-DD
        return parts[1].padStart(2, '0') === monthStr && parts[2].padStart(2, '0') === dayStr;
      } else { // DD/MM/YYYY
        return parts[0].padStart(2, '0') === dayStr && parts[1].padStart(2, '0') === monthStr;
      }
    }
    if (parts.length === 1 && parts[0].length >= 4) { // DDMM or DDMMYY
      const dd = parts[0].substring(0, 2);
      const mm = parts[0].substring(2, 4);
      return dd === dayStr && mm === monthStr;
    }
  }

  return standardizeToYYYYMMDD(ngayHetHan) === dateQuery;
}

/**
 * Parse 6-digit DDMMYY to YYYY-MM-DD
 */
function isValidDate(day: number, month: number, year: number): boolean {
  if (isNaN(day) || isNaN(month) || isNaN(year)) return false;
  if (month < 1 || month > 12) return false;
  if (day < 1 || day > 31) return false;
  const date = new Date(year, month - 1, day);
  return (
    date.getFullYear() === year &&
    date.getMonth() === month - 1 &&
    date.getDate() === day
  );
}

function formatToYYYYMMDD(day: number, month: number, year: number): string {
  const yyyyStr = String(year);
  const mmStr = String(month).padStart(2, '0');
  const ddStr = String(day).padStart(2, '0');
  return `${yyyyStr}-${mmStr}-${ddStr}`;
}

/**
 * Parse quick date string to YYYY-MM-DD. Always assumes day is first (Vietnamese format).
 */
export function parseQuickDate(val: string): string | null {
  if (!val) return null;
  const trimmedVal = val.trim();
  if (!trimmedVal) return null;

  // 1. If the input contains separators (slashes, dashes, dots, or spaces)
  const hasSeparators = /[\/\-\.\s]/.test(trimmedVal);
  if (hasSeparators) {
    const parts = trimmedVal.split(/[\/\-\.\s]+/).filter(Boolean);
    if (parts.length === 2) {
      // e.g. "5/7" or "05/07"
      const day = parseInt(parts[0], 10);
      const month = parseInt(parts[1], 10);
      const year = new Date().getFullYear();
      if (isValidDate(day, month, year)) {
        return formatToYYYYMMDD(day, month, year);
      }
    } else if (parts.length === 3) {
      // e.g. "5/7/26" or "05/07/2026"
      const day = parseInt(parts[0], 10);
      const month = parseInt(parts[1], 10);
      const yearStr = parts[2];
      let year = parseInt(yearStr, 10);
      if (yearStr.length === 2) {
        year = 2000 + year;
      }
      if (isValidDate(day, month, year)) {
        return formatToYYYYMMDD(day, month, year);
      }
    }
  }

  // 2. If it is purely digits
  const digits = trimmedVal.replace(/\D/g, '');
  if (digits.length === 4) {
    // e.g. 0507 -> Day 05, Month 07
    const dd = digits.substring(0, 2);
    const mm = digits.substring(2, 4);
    const day = parseInt(dd, 10);
    const month = parseInt(mm, 10);
    const year = new Date().getFullYear();
    if (isValidDate(day, month, year)) {
      return formatToYYYYMMDD(day, month, year);
    }
  } else if (digits.length === 6) {
    // e.g. 050726 -> Day 05, Month 07, Year 26
    const dd = digits.substring(0, 2);
    const mm = digits.substring(2, 4);
    const yy = digits.substring(4, 6);
    const day = parseInt(dd, 10);
    const month = parseInt(mm, 10);
    const year = 2000 + parseInt(yy, 10);
    if (isValidDate(day, month, year)) {
      return formatToYYYYMMDD(day, month, year);
    }
  } else if (digits.length === 8) {
    // e.g. 05072026 -> Day 05, Month 07, Year 2026
    const dd = digits.substring(0, 2);
    const mm = digits.substring(2, 4);
    const yyyy = digits.substring(4, 8);
    const day = parseInt(dd, 10);
    const month = parseInt(mm, 10);
    const year = parseInt(yyyy, 10);
    if (isValidDate(day, month, year)) {
      return formatToYYYYMMDD(day, month, year);
    }
  }

  return null;
}



