import { AnnaleItem, StudySheet, TDExercise } from '../types/course';
import { initialAnnales, initialSheets, initialTdExercises } from '../data/initialData';

const SHEETS_KEY = 'fichemaster_sheets_v1';
const TD_KEY = 'fichemaster_td_v1';
const ANNALES_KEY = 'fichemaster_annales_v1';
const LAST_SAVED_KEY = 'fichemaster_last_saved';

export interface AppStateData {
  sheets: StudySheet[];
  tdExercises: TDExercise[];
  annales: AnnaleItem[];
  lastSavedTime: string | null;
}

export function loadInitialData(): AppStateData {
  try {
    const rawSheets = localStorage.getItem(SHEETS_KEY);
    const rawTd = localStorage.getItem(TD_KEY);
    const rawAnnales = localStorage.getItem(ANNALES_KEY);
    const lastSaved = localStorage.getItem(LAST_SAVED_KEY);

    return {
      sheets: rawSheets ? JSON.parse(rawSheets) : initialSheets,
      tdExercises: rawTd ? JSON.parse(rawTd) : initialTdExercises,
      annales: rawAnnales ? JSON.parse(rawAnnales) : initialAnnales,
      lastSavedTime: lastSaved || null,
    };
  } catch (error) {
    console.error('Erreur lors du chargement des données depuis localStorage:', error);
    return {
      sheets: initialSheets,
      tdExercises: initialTdExercises,
      annales: initialAnnales,
      lastSavedTime: null,
    };
  }
}

export function saveAppData(sheets: StudySheet[], tdExercises: TDExercise[], annales: AnnaleItem[]): string {
  const timestamp = new Date().toLocaleTimeString('fr-FR', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });

  try {
    localStorage.setItem(SHEETS_KEY, JSON.stringify(sheets));
    localStorage.setItem(TD_KEY, JSON.stringify(tdExercises));
    localStorage.setItem(ANNALES_KEY, JSON.stringify(annales));
    localStorage.setItem(LAST_SAVED_KEY, timestamp);
  } catch (error) {
    console.error('Erreur lors de la sauvegarde dans localStorage:', error);
  }

  return timestamp;
}

export function exportDataAsJson(data: { sheets: StudySheet[]; tdExercises: TDExercise[]; annales: AnnaleItem[] }): void {
  const exportPayload = {
    version: '1.0.0',
    exportedAt: new Date().toISOString(),
    school: 'ESTACA Ingénieurs',
    ...data,
  };

  const blob = new Blob([JSON.stringify(exportPayload, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `fichemaster_sauvegarde_${new Date().toISOString().slice(0, 10)}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export async function importDataFromJson(file: File): Promise<{
  sheets: StudySheet[];
  tdExercises: TDExercise[];
  annales: AnnaleItem[];
}> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = event.target?.result as string;
        const parsed = JSON.parse(text);

        if (!parsed || (!parsed.sheets && !parsed.tdExercises && !parsed.annales)) {
          throw new Error('Fichier JSON invalide ou structure FicheMaster non reconnue.');
        }

        resolve({
          sheets: Array.isArray(parsed.sheets) ? parsed.sheets : [],
          tdExercises: Array.isArray(parsed.tdExercises) ? parsed.tdExercises : [],
          annales: Array.isArray(parsed.annales) ? parsed.annales : [],
        });
      } catch (e: any) {
        reject(new Error(`Échec de lecture du fichier : ${e.message}`));
      }
    };
    reader.onerror = () => reject(new Error('Erreur de lecture du fichier.'));
    reader.readAsText(file);
  });
}
