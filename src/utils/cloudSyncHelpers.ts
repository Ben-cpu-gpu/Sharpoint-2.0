import { AnnaleItem, ExerciseStatus, MasteryLevel, StudySheet, TDExercise } from '../types/course';
import { AnyAIProvider, normalizeStoredModelId, normalizeStoredProvider } from './aiFallbackOrder';

export const BLUEPRINT_LIMITS = {
  ID_PATTERN: /^[a-zA-Z0-9_-]+$/,
  MAX_ID_LEN: 128,
  MAX_SUBJECT_ID_LEN: 80,
  MAX_DISPLAY_NAME_LEN: 120,
  MAX_MODEL_LEN: 120,
  MAX_KEY_LEN: 512,
  MAX_TITLE_LEN: 300,
  MAX_SUBTITLE_LEN: 600,
  MAX_CHAPTER_LEN: 200,
  MAX_NOTION_LEN: 250,
  MAX_STATEMENT_LEN: 30000,
  MAX_SOLUTION_LEN: 45000,
  MAX_SESSION_LEN: 120,
  MAX_CLIENT_DATE_LEN: 64,
  MAX_TAGS: 25,
  MAX_THEOREMS: 60,
  MAX_FORMULAS: 80,
  MAX_METHODS: 60,
  MAX_TRAPS: 60,
  MAX_FLASHCARDS: 120,
  MAX_QUIZ: 80,
  MAX_HINTS: 25,
  MAX_GRADING: 40,
} as const;

export interface UserRelaySettings {
  selectedModel: string;
  selectedProvider: AnyAIProvider;
  groqKey: string;
  cerebrasKey: string;
  mistralKey: string;
  openrouterKey: string;
}

export function sanitizeString(value: unknown, maxLen: number, fallback = ''): string {
  const raw = typeof value === 'string' ? value.trim() : '';
  const candidate = raw.length > 0 ? raw : fallback;
  return candidate.slice(0, maxLen);
}

export function sanitizeFirestoreId(rawId: unknown, fallbackPrefix = 'item'): string {
  const base = typeof rawId === 'string' ? rawId.trim() : '';
  const cleaned = base.replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, BLUEPRINT_LIMITS.MAX_ID_LEN);
  if (cleaned.length > 0 && BLUEPRINT_LIMITS.ID_PATTERN.test(cleaned)) {
    return cleaned;
  }
  return `${fallbackPrefix}_${Date.now()}`.slice(0, BLUEPRINT_LIMITS.MAX_ID_LEN);
}

export function sanitizeStringArray(arr: unknown, maxItems: number, maxItemLen = 1000): string[] {
  if (!Array.isArray(arr)) return [];
  const out: string[] = [];
  for (const item of arr) {
    if (typeof item === 'string') {
      const trimmed = item.trim();
      if (trimmed.length > 0) {
        out.push(trimmed.slice(0, maxItemLen));
      }
    }
    if (out.length >= maxItems) break;
  }
  return out;
}

function normalizeMastery(value: unknown): MasteryLevel {
  if (value === 'learning' || value === 'mastered') return value;
  return 'to_learn';
}

function normalizeStatus(value: unknown): ExerciseStatus {
  if (value === 'in_progress' || value === 'completed') return value;
  return 'todo';
}

function normalizeDifficulty(value: unknown): 1 | 2 | 3 {
  const n = Number(value);
  if (n === 1 || n === 2 || n === 3) return n;
  return 2;
}

function clampNumber(value: unknown, min: number, max: number, fallback: number): number {
  const n = Number(value);
  if (!Number.isFinite(n)) return fallback;
  return Math.min(max, Math.max(min, Math.round(n)));
}

export function serializeUserSettingsPayload(
  settings: UserRelaySettings,
  ownerId: string
): UserRelaySettings & { ownerId: string } {
  const selectedModel = sanitizeString(
    normalizeStoredModelId(settings.selectedModel),
    BLUEPRINT_LIMITS.MAX_MODEL_LEN,
    'gemini-4-hydrogen'
  );
  const selectedProvider = normalizeStoredProvider(settings.selectedProvider, settings.selectedModel);

  return {
    ownerId: sanitizeFirestoreId(ownerId, 'user'),
    selectedModel,
    selectedProvider,
    groqKey: sanitizeString(settings.groqKey, BLUEPRINT_LIMITS.MAX_KEY_LEN),
    cerebrasKey: sanitizeString(settings.cerebrasKey, BLUEPRINT_LIMITS.MAX_KEY_LEN),
    mistralKey: sanitizeString(settings.mistralKey, BLUEPRINT_LIMITS.MAX_KEY_LEN),
    openrouterKey: sanitizeString(settings.openrouterKey, BLUEPRINT_LIMITS.MAX_KEY_LEN),
  };
}

/**
 * Fusionne de manière sûre les paramètres locaux et cloud lors de la première connexion d'un appareil :
 * - Priorité aux valeurs non vides du cloud si présentes
 * - Préserve toute clé API saisie localement avant connexion si elle est vide dans le cloud
 */
export function mergeRelaySettings(
  local: UserRelaySettings,
  cloud: UserRelaySettings | null
): { merged: UserRelaySettings; shouldPushMergedToCloud: boolean } {
  if (!cloud) {
    return { merged: local, shouldPushMergedToCloud: true };
  }

  const pickKey = (cloudVal: string, localVal: string): string => {
    const c = (cloudVal || '').trim();
    const l = (localVal || '').trim();
    return c.length > 0 ? c : l;
  };

  const merged: UserRelaySettings = {
    selectedModel: (cloud.selectedModel || '').trim() || local.selectedModel,
    selectedProvider: cloud.selectedProvider || local.selectedProvider,
    groqKey: pickKey(cloud.groqKey, local.groqKey),
    cerebrasKey: pickKey(cloud.cerebrasKey, local.cerebrasKey),
    mistralKey: pickKey(cloud.mistralKey, local.mistralKey),
    openrouterKey: pickKey(cloud.openrouterKey, local.openrouterKey),
  };

  const shouldPushMergedToCloud =
    merged.groqKey !== (cloud.groqKey || '').trim() ||
    merged.cerebrasKey !== (cloud.cerebrasKey || '').trim() ||
    merged.mistralKey !== (cloud.mistralKey || '').trim() ||
    merged.openrouterKey !== (cloud.openrouterKey || '').trim();

  return { merged, shouldPushMergedToCloud };
}

export function serializeStudySheetPayload(sheet: StudySheet, ownerId: string) {
  const id = sanitizeFirestoreId(sheet.id, 'sheet');
  const subjectId = sanitizeFirestoreId(sheet.subjectId, 'math').slice(0, BLUEPRINT_LIMITS.MAX_SUBJECT_ID_LEN);

  const theorems = Array.isArray(sheet.theorems)
    ? sheet.theorems.slice(0, BLUEPRINT_LIMITS.MAX_THEOREMS).map((t, idx) => ({
        id: sanitizeFirestoreId(t?.id, `thm_${idx}`),
        name: sanitizeString(t?.name, 250, 'Théorème'),
        statement: sanitizeString(t?.statement, 4000),
        strictConditions: sanitizeStringArray(t?.strictConditions, 20, 500),
        professorTip: sanitizeString(t?.professorTip, 1000),
      }))
    : [];

  const magicFormulas = Array.isArray(sheet.magicFormulas)
    ? sheet.magicFormulas.slice(0, BLUEPRINT_LIMITS.MAX_FORMULAS).map((f, idx) => ({
        id: sanitizeFirestoreId(f?.id, `frm_${idx}`),
        name: sanitizeString(f?.name, 250, 'Formule'),
        formula: sanitizeString(f?.formula, 2000),
        unitsAndVariables: sanitizeString(f?.unitsAndVariables, 1500),
        validityDomain: sanitizeString(f?.validityDomain, 1000),
      }))
    : [];

  const stepByStepMethods = Array.isArray(sheet.stepByStepMethods)
    ? sheet.stepByStepMethods.slice(0, BLUEPRINT_LIMITS.MAX_METHODS).map((m, idx) => ({
        id: sanitizeFirestoreId(m?.id, `mth_${idx}`),
        goal: sanitizeString(m?.goal, 400, 'Méthode'),
        steps: sanitizeStringArray(m?.steps, 30, 1200),
        trapToAvoid: sanitizeString(m?.trapToAvoid, 1000),
      }))
    : [];

  const flashcards = Array.isArray(sheet.flashcards)
    ? sheet.flashcards.slice(0, BLUEPRINT_LIMITS.MAX_FLASHCARDS).map((fc, idx) => ({
        id: sanitizeFirestoreId(fc?.id, `fc_${idx}`),
        question: sanitizeString(fc?.question, 1200, 'Question'),
        answer: sanitizeString(fc?.answer, 2000, 'Réponse'),
      }))
    : [];

  const quiz = Array.isArray(sheet.quiz)
    ? sheet.quiz.slice(0, BLUEPRINT_LIMITS.MAX_QUIZ).map((q, idx) => {
        const rawOptions = Array.isArray(q?.options) ? q.options : [];
        const options: [string, string, string, string] = [
          sanitizeString(rawOptions[0], 500, 'Option A'),
          sanitizeString(rawOptions[1], 500, 'Option B'),
          sanitizeString(rawOptions[2], 500, 'Option C'),
          sanitizeString(rawOptions[3], 500, 'Option D'),
        ];
        return {
          id: sanitizeFirestoreId(q?.id, `qz_${idx}`),
          question: sanitizeString(q?.question, 1200, 'Question'),
          options,
          correctIndex: clampNumber(q?.correctIndex, 0, 3, 0),
          explanation: sanitizeString(q?.explanation, 2500),
        };
      })
    : [];

  return {
    id,
    ownerId: sanitizeFirestoreId(ownerId, 'user'),
    subjectId,
    title: sanitizeString(sheet.title, BLUEPRINT_LIMITS.MAX_TITLE_LEN, 'Fiche de révision'),
    subtitle: sanitizeString(sheet.subtitle, BLUEPRINT_LIMITS.MAX_SUBTITLE_LEN),
    chapter: sanitizeString(sheet.chapter, BLUEPRINT_LIMITS.MAX_CHAPTER_LEN, 'Chapitre'),
    tags: sanitizeStringArray(sheet.tags, BLUEPRINT_LIMITS.MAX_TAGS, 64),
    mastery: normalizeMastery(sheet.mastery),
    theorems,
    magicFormulas,
    stepByStepMethods,
    examTraps: sanitizeStringArray(sheet.examTraps, BLUEPRINT_LIMITS.MAX_TRAPS, 1000),
    flashcards,
    quiz,
    clientCreatedAt: sanitizeString(sheet.createdAt, BLUEPRINT_LIMITS.MAX_CLIENT_DATE_LEN, new Date().toISOString()),
  };
}

export function serializeTDExercisePayload(exercise: TDExercise, ownerId: string) {
  return {
    id: sanitizeFirestoreId(exercise.id, 'td'),
    ownerId: sanitizeFirestoreId(ownerId, 'user'),
    subjectId: sanitizeFirestoreId(exercise.subjectId, 'math').slice(0, BLUEPRINT_LIMITS.MAX_SUBJECT_ID_LEN),
    chapter: sanitizeString(exercise.chapter, BLUEPRINT_LIMITS.MAX_CHAPTER_LEN, 'Chapitre'),
    title: sanitizeString(exercise.title, BLUEPRINT_LIMITS.MAX_TITLE_LEN, 'Exercice de TD'),
    notion: sanitizeString(exercise.notion, BLUEPRINT_LIMITS.MAX_NOTION_LEN),
    difficulty: normalizeDifficulty(exercise.difficulty),
    statement: sanitizeString(exercise.statement, BLUEPRINT_LIMITS.MAX_STATEMENT_LEN, 'Énoncé'),
    hints: sanitizeStringArray(exercise.hints, BLUEPRINT_LIMITS.MAX_HINTS, 1000),
    solution: sanitizeString(exercise.solution, BLUEPRINT_LIMITS.MAX_SOLUTION_LEN),
    status: normalizeStatus(exercise.status),
    clientCreatedAt: sanitizeString(exercise.createdAt, BLUEPRINT_LIMITS.MAX_CLIENT_DATE_LEN, new Date().toISOString()),
  };
}

export function serializeAnnalePayload(annale: AnnaleItem, ownerId: string) {
  return {
    id: sanitizeFirestoreId(annale.id, 'annale'),
    ownerId: sanitizeFirestoreId(ownerId, 'user'),
    subjectId: sanitizeFirestoreId(annale.subjectId, 'math').slice(0, BLUEPRINT_LIMITS.MAX_SUBJECT_ID_LEN),
    chapter: sanitizeString(annale.chapter, BLUEPRINT_LIMITS.MAX_CHAPTER_LEN, 'Annale'),
    title: sanitizeString(annale.title, BLUEPRINT_LIMITS.MAX_TITLE_LEN, 'Sujet d\'annale'),
    notion: sanitizeString(annale.notion, BLUEPRINT_LIMITS.MAX_NOTION_LEN),
    difficulty: normalizeDifficulty(annale.difficulty),
    statement: sanitizeString(annale.statement, BLUEPRINT_LIMITS.MAX_STATEMENT_LEN, 'Énoncé'),
    hints: sanitizeStringArray(annale.hints, BLUEPRINT_LIMITS.MAX_HINTS, 1000),
    solution: sanitizeString(annale.solution, BLUEPRINT_LIMITS.MAX_SOLUTION_LEN),
    status: normalizeStatus(annale.status),
    session: sanitizeString(annale.session, BLUEPRINT_LIMITS.MAX_SESSION_LEN, 'Session Principale'),
    year: clampNumber(annale.year, 1950, 2100, new Date().getFullYear()),
    durationMinutes: clampNumber(annale.durationMinutes, 5, 600, 120),
    points: clampNumber(annale.points, 1, 200, 20),
    gradingCriteria: sanitizeStringArray(annale.gradingCriteria, BLUEPRINT_LIMITS.MAX_GRADING, 500),
    clientCreatedAt: sanitizeString(annale.createdAt, BLUEPRINT_LIMITS.MAX_CLIENT_DATE_LEN, new Date().toISOString()),
  };
}

export function mergeLocalAndCloudById<T extends { id: string }>(
  localItems: T[],
  cloudItems: T[]
): { merged: T[]; missingInCloud: T[] } {
  const cloudIds = new Set(cloudItems.map(item => sanitizeFirestoreId(item.id)));
  const missingInCloud: T[] = [];
  const seenLocal = new Set<string>();

  for (const item of localItems) {
    const cleanId = sanitizeFirestoreId(item.id);
    if (!cloudIds.has(cleanId) && !seenLocal.has(cleanId)) {
      seenLocal.add(cleanId);
      missingInCloud.push({ ...item, id: cleanId });
    }
  }

  return {
    merged: [...cloudItems, ...missingInCloud],
    missingInCloud,
  };
}
