/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

// MainC.tsx renders "Mục III • Nhiệm vụ thường xuyên".
//
// This used to be a ~1,790-line file that was ~94% identical, copy-pasted
// code shared with MainB.tsx (Mục II). That duplication meant every bug fix
// or UI change had to be made twice, and it was easy to forget one of the
// two copies (this is exactly how a couple of real scoring bugs slipped in).
// The shared implementation now lives in MainSectionBC.tsx; this file only
// supplies the handful of things that actually differ for Mục III.

import { TaskBC } from '../types';
import MainSectionBC, { MainSectionBCConfig } from './MainSectionBC';

interface MainCProps {
  tasks: TaskBC[];
  updateTask: (idx: number, fieldOrFields: keyof TaskBC | Partial<TaskBC>, value?: any) => void;
  addTask?: (task: Omit<TaskBC, 'id' | 'stt'>) => void;
  deleteTask?: (idx: number) => void;
  todayISO: string;
  daysUntil: (ds: string) => number | null;
  onOpenGlobalAdd?: (section: 'B' | 'C') => void;
  isWorkspaceExpanded?: boolean;
  onToggleExpand?: () => void;
  activeEditingTaskId?: string | null;
  onClearActiveEditingTaskId?: () => void;
  viewMode: 'card' | 'excel';
  setViewMode: (mode: 'card' | 'excel') => void;
}

const MUC_III_CONFIG: MainSectionBCConfig = {
  section: 'C',
  sectionRoman: 'III',
  sectionTitle: 'MỤC III • NHIỆM VỤ THƯỜNG XUYÊN',
  sectionDescription: 'Nhiệm vụ thường xuyên, định kỳ hằng tháng, hằng quý của Công an cấp xã. Mỗi nhiệm vụ tương ứng tối đa 0,5 điểm.',
  idPrefix: 'c',
  computeTargetDate: (row) => row.ngayHetHan,
  trichYeuLabel: 'Trích yếu nội dung văn bản',
  tieuChiLabel: 'Tiêu chí/nội dung thường xuyên',
  tieuChiPlaceholder: 'Mô tả công việc (giữ vị trí xuống dòng của văn bản gốc)...',
  showManualStatusOverride: true,
};

export default function MainC(props: MainCProps) {
  return <MainSectionBC config={MUC_III_CONFIG} {...props} />;
}
