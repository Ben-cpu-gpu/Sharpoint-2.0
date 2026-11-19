import { AnnaleItem, StudySheet, TDExercise } from '../types/course';

export const DEFAULT_SUBJECT_ID = 'maths';

export const INVENTED_SEED_IDS = new Set<string>([
  'sheet_mecaflu_01',
  'sheet_thermo_01',
  'sheet_rdm_01',
  'exo_td_mecaflu_01',
  'exo_td_thermo_01',
  'annale_estaca_2024_01',
]);

export interface StoredCourseCollections {
  sheets: StudySheet[];
  tdExercises: TDExercise[];
  annales: AnnaleItem[];
}

export function stripInventedSeedData(data: StoredCourseCollections): {
  cleaned: StoredCourseCollections;
  removedCount: number;
} {
  const sheets = data.sheets.filter(item => !INVENTED_SEED_IDS.has(item.id));
  const tdExercises = data.tdExercises.filter(item => !INVENTED_SEED_IDS.has(item.id));
  const annales = data.annales.filter(item => !INVENTED_SEED_IDS.has(item.id));

  const removedCount =
    (data.sheets.length - sheets.length) +
    (data.tdExercises.length - tdExercises.length) +
    (data.annales.length - annales.length);

  return {
    cleaned: { sheets, tdExercises, annales },
    removedCount,
  };
}

export function resolveSubjectId(
  selectedSubjectId: string | 'all' | undefined,
  validSubjectIds: readonly string[]
): string {
  if (selectedSubjectId && selectedSubjectId !== 'all' && validSubjectIds.includes(selectedSubjectId)) {
    return selectedSubjectId;
  }
  return validSubjectIds[0] || DEFAULT_SUBJECT_ID;
}

export function resolveActiveSheet(
  filteredSheets: StudySheet[],
  activeSheetId: string
): StudySheet | undefined {
  if (filteredSheets.length === 0) return undefined;
  return filteredSheets.find(s => s.id === activeSheetId) || filteredSheets[0];
}
