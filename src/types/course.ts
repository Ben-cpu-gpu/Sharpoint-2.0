export type MasteryLevel = 'to_learn' | 'learning' | 'mastered';
export type ExerciseStatus = 'todo' | 'in_progress' | 'completed';
export type DifficultyLevel = 1 | 2 | 3; // 1: Fondamentaux, 2: Intermédiaire, 3: Type Examen ESTACA

export interface TheoremItem {
  id: string;
  name: string;
  statement: string; // LaTeX
  strictConditions: string[]; // Toutes les hypothèses indispensables (ex: écoulement incompressible, fluide parfait)
  professorTip?: string;
}

export interface MagicFormula {
  id: string;
  name: string;
  formula: string; // LaTeX
  unitsAndVariables: string; // 100% des unités SI et significations
  validityDomain: string; // Conditions d'application
}

export interface StepByStepMethod {
  id: string;
  goal: string;
  steps: string[]; // Démarche complète étape par étape
  trapToAvoid?: string;
}

export interface Flashcard {
  id: string;
  question: string;
  answer: string;
}

export interface QuizQuestion {
  id: string;
  question: string;
  options: [string, string, string, string]; // Exactement 4 choix
  correctIndex: number; // 0, 1, 2 ou 3
  explanation: string; // Explication pédagogique avec calcul
}

export interface StudySheet {
  id: string;
  subjectId: string;
  title: string;
  subtitle: string;
  chapter: string;
  tags: string[];
  mastery: MasteryLevel;
  theorems: TheoremItem[];
  magicFormulas: MagicFormula[];
  stepByStepMethods: StepByStepMethod[];
  examTraps: string[];
  flashcards: Flashcard[];
  quiz: QuizQuestion[];
  createdAt?: string;
  updatedAt?: string;
}

export interface TDExercise {
  id: string;
  subjectId: string;
  chapter: string;
  title: string;
  notion: string;
  difficulty: DifficultyLevel;
  statement: string;
  hints: string[];
  solution: string; // Correction détaillée avec calculs intermédiaires
  status: ExerciseStatus;
  createdAt?: string;
}

export interface AnnaleItem extends TDExercise {
  session: string; // 'Session Principale', 'Rattrapages', 'Partiel Automne'
  year: number; // ex: 2024
  durationMinutes: number; // ex: 120 (pour le chronomètre)
  points: number; // ex: 20
  gradingCriteria: string[]; // Barème officiel détaillé
}

export interface DebugLog {
  id: string;
  timestamp: string;
  apiProvider: 'Gemini' | 'Groq' | 'Local';
  model: string;
  status: 'success' | 'error';
  statusCode?: number;
  message: string;
  rawPayload?: string;
}

export interface Subject {
  id: string;
  name: string;
  code: string;
  description: string;
  color: string;
}
