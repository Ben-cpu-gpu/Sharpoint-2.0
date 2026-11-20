import { AnnaleItem, StudySheet, TDExercise } from '../types/course';
import { DEFAULT_SUBJECT_ID } from './courseCatalog';

export type PdfBlockCategory = 'formula' | 'theorem' | 'definition' | 'table' | 'text';

export interface PdfDetectedBox {
  id: string;
  pageNum: number;
  text: string;
  xPct: number;
  yPct: number;
  wPct: number;
  hPct: number;
  category: PdfBlockCategory;
}

export interface PdfScannedPage {
  pageNum: number;
  totalPages: number;
  previewUrl: string;
  aspectRatio: number;
  text: string;
  boxes: PdfDetectedBox[];
}

/**
 * Classifie une ligne/bloc PDF réel selon son contenu et sa géométrie (tableau multi-colonnes, formule, théorème, définition).
 */
export function classifyPdfBlock(text: string, isTabularGeometry = false): PdfBlockCategory {
  const trimmed = (text || '').trim();
  if (!trimmed) return 'text';

  if (
    isTabularGeometry ||
    /\b(?:tableau|table|bar[eè]me|annexe|valeurs?\s+num[eé]riques?)\b/i.test(trimmed) ||
    /\|[^|]+\|/.test(trimmed)
  ) {
    return 'table';
  }

  if (
    /[=≈≤≥∫∑∆∇∂√±×÷]|\\(?:frac|int|sum|partial|nabla|vec|sqrt|alpha|beta|gamma|rho|sigma|omega|lambda|theta)\b|\$\$?[^$]+\$\$?/.test(
      trimmed
    )
  ) {
    return 'formula';
  }

  if (
    /\b(?:th[eé]or[eè]me|principe|loi|corollaire|propri[eé]t[eé]|lemme|axiome|postulat|[eé]quation)\b/i.test(
      trimmed
    )
  ) {
    return 'theorem';
  }

  if (
    /\b(?:d[eé]finition|on\s+appelle|soit|avec|unit[eé]s?|kelvin|pascal|newton|joule|watt|hypoth[eè]se|domaine\s+de\s+validit[eé])\b|\[(?:m|kg|s|pa|n|j|w|k|v|a|rad|mol|hz)[^\]]*\]/i.test(
      trimmed
    )
  ) {
    return 'definition';
  }

  return 'text';
}

/**
 * Découpe un document long en segments cohérents alignés sur les marqueurs de page ou paragraphes,
 * afin d'éviter la troncature silencieuse à 30 000 caractères lors de l'extraction IA.
 */
export function chunkDocumentByPages(text: string, maxChunkChars = 22000): string[] {
  const clean = (text || '').trim();
  if (!clean) return [];
  if (clean.length <= maxChunkChars) return [clean];

  // Découpe d'abord sur les marqueurs de page `--- [Page X/Y] ---` si présents
  const pageSections = clean.split(/(?=---\s*\[Page\s+\d+\/\d+\]\s*---)/i).filter(Boolean);
  const units =
    pageSections.length > 1
      ? pageSections
      : clean.split(/\n{2,}/).filter(u => u.trim().length > 0);

  const chunks: string[] = [];
  let current = '';

  for (const unit of units) {
    if (unit.length > maxChunkChars) {
      if (current.trim()) {
        chunks.push(current.trim());
        current = '';
      }
      // Sous-découpe par lignes si une seule page/section dépasse maxChunkChars
      const lines = unit.split('\n');
      let sub = '';
      for (const line of lines) {
        if ((sub + '\n' + line).length > maxChunkChars && sub.trim()) {
          chunks.push(sub.trim());
          sub = line;
        } else {
          sub = sub ? `${sub}\n${line}` : line;
        }
      }
      if (sub.trim()) {
        chunks.push(sub.trim());
      }
      continue;
    }

    const candidate = current ? `${current}\n\n${unit}` : unit;
    if (candidate.length > maxChunkChars && current.trim()) {
      chunks.push(current.trim());
      current = unit;
    } else {
      current = candidate;
    }
  }

  if (current.trim()) {
    chunks.push(current.trim());
  }

  return chunks;
}

function normalizeKey(value: string): string {
  return (value || '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Fusionne plusieurs StudySheet issues de segments consécutifs d'un même cours sans perte ni doublons.
 */
export function mergeStudySheets(sheets: StudySheet[], subjectId = DEFAULT_SUBJECT_ID): StudySheet {
  if (sheets.length === 0) {
    return {
      id: `sheet_${Date.now()}`,
      subjectId,
      title: 'Fiche de Révision',
      subtitle: 'Synthèse complète',
      chapter: 'Généralités',
      tags: ['ESTACA'],
      mastery: 'to_learn',
      theorems: [],
      magicFormulas: [],
      stepByStepMethods: [],
      examTraps: [],
      flashcards: [],
      quiz: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
  }
  if (sheets.length === 1) return sheets[0];

  const first = sheets[0];
  const seenTheorems = new Set<string>();
  const seenFormulas = new Set<string>();
  const seenMethods = new Set<string>();
  const seenTraps = new Set<string>();
  const seenFlashcards = new Set<string>();
  const seenQuiz = new Set<string>();
  const tagSet = new Set<string>();

  const theorems: StudySheet['theorems'] = [];
  const magicFormulas: StudySheet['magicFormulas'] = [];
  const stepByStepMethods: StudySheet['stepByStepMethods'] = [];
  const examTraps: string[] = [];
  const flashcards: StudySheet['flashcards'] = [];
  const quiz: StudySheet['quiz'] = [];

  for (const sheet of sheets) {
    for (const tag of sheet.tags || []) {
      if (tag.trim()) tagSet.add(tag.trim());
    }
    for (const thm of sheet.theorems || []) {
      const k = normalizeKey(thm.name || thm.statement);
      if (k && !seenTheorems.has(k)) {
        seenTheorems.add(k);
        theorems.push(thm);
      }
    }
    for (const fml of sheet.magicFormulas || []) {
      const k = normalizeKey(fml.name || fml.formula);
      if (k && !seenFormulas.has(k)) {
        seenFormulas.add(k);
        magicFormulas.push(fml);
      }
    }
    for (const mth of sheet.stepByStepMethods || []) {
      const k = normalizeKey(mth.goal);
      if (k && !seenMethods.has(k)) {
        seenMethods.add(k);
        stepByStepMethods.push(mth);
      }
    }
    for (const trap of sheet.examTraps || []) {
      const k = normalizeKey(trap);
      if (k && !seenTraps.has(k)) {
        seenTraps.add(k);
        examTraps.push(trap);
      }
    }
    for (const fc of sheet.flashcards || []) {
      const k = normalizeKey(fc.question);
      if (k && !seenFlashcards.has(k)) {
        seenFlashcards.add(k);
        flashcards.push(fc);
      }
    }
    for (const q of sheet.quiz || []) {
      const k = normalizeKey(q.question);
      if (k && !seenQuiz.has(k)) {
        seenQuiz.add(k);
        quiz.push(q);
      }
    }
  }

  return {
    ...first,
    subjectId,
    tags: Array.from(tagSet).slice(0, 10),
    theorems,
    magicFormulas,
    stepByStepMethods,
    examTraps,
    flashcards,
    quiz,
    updatedAt: new Date().toISOString(),
  };
}

/**
 * Fusionne et déduplique des listes d'exercices ou d'annales extraits sur plusieurs segments.
 */
export function mergeExercises<T extends TDExercise | AnnaleItem>(lists: T[][]): T[] {
  const seen = new Set<string>();
  const merged: T[] = [];

  for (const list of lists) {
    for (const item of list) {
      const k = normalizeKey(`${item.title}|${item.statement.slice(0, 80)}`);
      if (!seen.has(k)) {
        seen.add(k);
        merged.push(item);
      }
    }
  }

  return merged;
}

function replaceSnippet(source: string, oldSnippet: string, newLatex: string): { value: string; changed: boolean } {
  if (!source || !oldSnippet) return { value: source, changed: false };
  if (source.includes(oldSnippet)) {
    return { value: source.replace(oldSnippet, newLatex), changed: true };
  }
  const trimmedOld = oldSnippet.trim();
  if (trimmedOld && source.includes(trimmedOld)) {
    return { value: source.replace(trimmedOld, newLatex), changed: true };
  }
  // Essaie sans délimiteurs $...$ ou $$...$$ si l'utilisateur a sélectionné la formule rendue
  const unwrapped = trimmedOld.replace(/^\$\$?/, '').replace(/\$\$?$/, '').trim();
  if (unwrapped && unwrapped.length >= 2 && source.includes(unwrapped)) {
    return { value: source.replace(unwrapped, newLatex), changed: true };
  }
  return { value: source, changed: false };
}

/**
 * Remplace directement un fragment KaTeX / LaTeX cassé dans une StudySheet.
 * Retourne la fiche mise à jour et un booléen indiquant si un remplacement a été effectué.
 */
export function patchTextInSheet(
  sheet: StudySheet,
  oldSnippet: string,
  newLatex: string
): { sheet: StudySheet; replaced: boolean } {
  let replaced = false;
  const tryReplace = (str: string): string => {
    if (replaced) return str;
    const res = replaceSnippet(str, oldSnippet, newLatex);
    if (res.changed) replaced = true;
    return res.value;
  };

  const theorems = sheet.theorems.map(t => ({
    ...t,
    statement: tryReplace(t.statement),
    strictConditions: t.strictConditions.map(c => tryReplace(c)),
    professorTip: t.professorTip ? tryReplace(t.professorTip) : t.professorTip,
  }));

  const magicFormulas = sheet.magicFormulas.map(f => ({
    ...f,
    formula: tryReplace(f.formula),
    unitsAndVariables: tryReplace(f.unitsAndVariables),
    validityDomain: tryReplace(f.validityDomain),
  }));

  const stepByStepMethods = sheet.stepByStepMethods.map(m => ({
    ...m,
    goal: tryReplace(m.goal),
    steps: m.steps.map(s => tryReplace(s)),
    trapToAvoid: m.trapToAvoid ? tryReplace(m.trapToAvoid) : m.trapToAvoid,
  }));

  const examTraps = sheet.examTraps.map(tr => tryReplace(tr));
  const flashcards = sheet.flashcards.map(fc => ({
    ...fc,
    question: tryReplace(fc.question),
    answer: tryReplace(fc.answer),
  }));
  const quiz = sheet.quiz.map(q => ({
    ...q,
    question: tryReplace(q.question),
    options: q.options.map(opt => tryReplace(opt)) as [string, string, string, string],
    explanation: tryReplace(q.explanation),
  }));

  if (!replaced) {
    return { sheet, replaced: false };
  }

  return {
    sheet: {
      ...sheet,
      theorems,
      magicFormulas,
      stepByStepMethods,
      examTraps,
      flashcards,
      quiz,
      updatedAt: new Date().toISOString(),
    },
    replaced: true,
  };
}

/**
 * Remplace directement un fragment KaTeX / LaTeX cassé dans un TDExercise ou une AnnaleItem.
 */
export function patchTextInExercise<T extends TDExercise | AnnaleItem>(
  item: T,
  oldSnippet: string,
  newLatex: string
): { item: T; replaced: boolean } {
  let replaced = false;
  const tryReplace = (str: string): string => {
    if (replaced) return str;
    const res = replaceSnippet(str, oldSnippet, newLatex);
    if (res.changed) replaced = true;
    return res.value;
  };

  const statement = tryReplace(item.statement);
  const hints = item.hints.map(h => tryReplace(h));
  const solution = tryReplace(item.solution);
  const gradingCriteria =
    'gradingCriteria' in item && Array.isArray(item.gradingCriteria)
      ? item.gradingCriteria.map(c => tryReplace(c))
      : undefined;

  if (!replaced) {
    return { item, replaced: false };
  }

  return {
    item: {
      ...item,
      statement,
      hints,
      solution,
      ...(gradingCriteria ? { gradingCriteria } : {}),
    },
    replaced: true,
  };
}
