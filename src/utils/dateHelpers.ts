/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export const getTodayDateString = () => {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
};

export const formatDateVN = (dateStr: string) => {
  if (!dateStr) return '';
  const parts = dateStr.split('-');
  if (parts.length === 3) return `${parts[2]}/${parts[1]}/${parts[0]}`;
  return dateStr;
};

export const getDayOfDate = (dateStr: string) => {
  if (!dateStr) return '';
  const parts = dateStr.split('-');
  return parts.length === 3 ? parts[2] : '';
};

export const getDayMonthOfDate = (dateStr: string) => {
  if (!dateStr) return '';
  const parts = dateStr.split('-');
  return parts.length === 3 ? `${parts[2]}/${parts[1]}` : '';
};
