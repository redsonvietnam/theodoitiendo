/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

// MainB.tsx renders "Mục II • Nhiệm vụ có thời hạn trong tháng".
//
// This used to be a ~1,770-line file that was ~94% identical, copy-pasted
// code shared with MainC.tsx (Mục III). That duplication meant every bug fix
// or UI change had to be made twice, and it was easy to forget one of the
// two copies (this is exactly how a couple of real scoring bugs slipped in).
// The shared implementation now lives in MainSectionBC.tsx; this file only
// supplies the handful of things that actually differ for Mục II.

import { TaskBC } from '../types';
import { getTaskDeadlineISO } from '../utils/cancu';
import MainSectionBC, { MainSectionBCConfig } from './MainSectionBC';

interface MainBProps {
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

const MUC_II_CONFIG: MainSectionBCConfig = {
  section: 'B',
  sectionRoman: 'II',
  sectionTitle: 'MỤC II • NHIỆM VỤ CÓ THỜI HẠN TRONG THÁNG',
  sectionDescription: 'Theo dõi tiến độ thực hiện các văn bản có quy định thời hạn cụ thể trong tháng.',
  idPrefix: 'b',
  computeTargetDate: (row) => getTaskDeadlineISO(row),
  trichYeuLabel: '2.5. Trích yếu nội dung văn bản',
  tieuChiLabel: '3. Tiêu chí/nội dung cần làm',
  tieuChiPlaceholder: 'Mô tả công việc cụ thể (giữ vị trí xuống dòng của văn bản gốc)...',
  showManualStatusOverride: false,
};

export default function MainB(props: MainBProps) {
  return <MainSectionBC config={MUC_II_CONFIG} {...props} />;
}
