import test from 'node:test';
import assert from 'node:assert/strict';
import {
  chunkDocumentByPages,
  classifyPdfBlock,
  mergeExercises,
  mergeStudySheets,
  patchTextInExercise,
  patchTextInSheet,
} from './documentExtraction';
import { AnnaleItem, StudySheet, TDExercise } from '../types/course';

test('classifyPdfBlock detects tables, formulas, theorems, definitions and plain text accurately', () => {
  assert.equal(classifyPdfBlock('Barème officiel de l’épreuve', false), 'table');
  assert.equal(classifyPdfBlock('Col A  Col B  Col C', true), 'table');
  assert.equal(classifyPdfBlock('P + \\frac{1}{2}\\rho v^2 = Cte', false), 'formula');
  assert.equal(classifyPdfBlock('Théorème de Bernoulli en régime permanent', false), 'theorem');
  assert.equal(classifyPdfBlock('Définition : la pression statique s’exprime en Pascal', false), 'definition');
  assert.equal(classifyPdfBlock('Introduction générale du chapitre', false), 'text');
});

test('chunkDocumentByPages splits multi-page documents on page boundaries without truncation', () => {
  const page1 = `--- [Page 1/3] ---\n${'A'.repeat(120)}`;
  const page2 = `--- [Page 2/3] ---\n${'B'.repeat(120)}`;
  const page3 = `--- [Page 3/3] ---\n${'C'.repeat(120)}`;
  const full = `${page1}\n\n${page2}\n\n${page3}`;

  const chunks = chunkDocumentByPages(full, 200);
  assert.equal(chunks.length, 3);
  assert.ok(chunks[0].includes('[Page 1/3]'));
  assert.ok(chunks[1].includes('[Page 2/3]'));
  assert.ok(chunks[2].includes('[Page 3/3]'));
  assert.equal(chunkDocumentByPages(full, 1000).length, 1);
});

test('mergeStudySheets combines multiple chunk sheets and deduplicates repeated items', () => {
  const base: StudySheet = {
    id: 'sheet_1',
    subjectId: 'meca',
    title: 'Mécanique des Fluides',
    subtitle: 'Chapitre 1',
    chapter: 'Dynamique',
    tags: ['Bernoulli', 'Fluide'],
    mastery: 'to_learn',
    theorems: [
      {
        id: 't1',
        name: 'Théorème de Bernoulli',
        statement: '$$p + \\frac{1}{2}\\rho v^2 + \\rho g z = \\text{Cte}$$',
        strictConditions: ['Fluide parfait'],
      },
    ],
    magicFormulas: [
      {
        id: 'f1',
        name: 'Nombre de Reynolds',
        formula: 'Re = \\frac{\\rho v D}{\\mu}',
        unitsAndVariables: 'Re sans dimension',
        validityDomain: 'Écoulement en conduite',
      },
    ],
    stepByStepMethods: [],
    examTraps: ['Oublier la conversion en Pa'],
    flashcards: [{ id: 'fc1', question: 'Unité de viscosité ?', answer: 'Pa·s' }],
    quiz: [],
    createdAt: '2026-01-01T00:00:00.000Z',
  };

  const chunk2: StudySheet = {
    ...base,
    id: 'sheet_2',
    tags: ['Fluide', 'Viscosité'],
    theorems: [
      base.theorems[0], // doublon volontaire
      {
        id: 't2',
        name: 'Théorème d’Euler',
        statement: '$$\\vec{F} = \\dot{m}(\\vec{v}_2 - \\vec{v}_1)$$',
        strictConditions: ['Régime permanent'],
      },
    ],
    magicFormulas: [],
    examTraps: ['Oublier la conversion en Pa', 'Confondre débit massique et volumique'],
    flashcards: [{ id: 'fc2', question: 'Relation débit massique ?', answer: 'q_m = rho * Q_v' }],
  };

  const merged = mergeStudySheets([base, chunk2], 'meca');
  assert.equal(merged.theorems.length, 2);
  assert.equal(merged.magicFormulas.length, 1);
  assert.equal(merged.examTraps.length, 2);
  assert.equal(merged.flashcards.length, 2);
  assert.deepEqual(merged.tags, ['Bernoulli', 'Fluide', 'Viscosité']);
});

test('mergeExercises deduplicates by title + statement prefix', () => {
  const ex1: TDExercise = {
    id: 'e1',
    subjectId: 'meca',
    chapter: 'Ch1',
    title: 'Exercice 1',
    notion: 'Statique',
    difficulty: 2,
    statement: 'Calculer la force résultante sur la vanne.',
    hints: ['Utiliser la pression hydrostatique'],
    solution: 'F = 10 kN',
    status: 'todo',
  };
  const ex2: TDExercise = { ...ex1, id: 'e2' };
  const ex3: TDExercise = { ...ex1, id: 'e3', title: 'Exercice 2', statement: 'Déterminer le moment.' };

  const merged = mergeExercises([[ex1], [ex2, ex3]]);
  assert.equal(merged.length, 2);
});

test('patchTextInSheet patches broken KaTeX in place across sheet sections', () => {
  const sheet: StudySheet = {
    id: 's1',
    subjectId: 'meca',
    title: 'Test',
    subtitle: 'Sub',
    chapter: 'Ch',
    tags: [],
    mastery: 'to_learn',
    theorems: [
      {
        id: 't1',
        name: 'T1',
        statement: '$$\\frac{a}{b_0$$',
        strictConditions: ['Si $v_x = 0$'],
      },
    ],
    magicFormulas: [
      {
        id: 'f1',
        name: 'F1',
        formula: 'C_z = \\frac{L}{q S',
        unitsAndVariables: 'S en m²',
        validityDomain: 'Subsonique',
      },
    ],
    stepByStepMethods: [],
    examTraps: [],
    flashcards: [],
    quiz: [],
    createdAt: '2026-01-01T00:00:00.000Z',
  };

  const res1 = patchTextInSheet(sheet, '\\frac{a}{b_0', '\\frac{a}{b_0}');
  assert.equal(res1.replaced, true);
  assert.equal(res1.sheet.theorems[0].statement, '$$\\frac{a}{b_0}$$');

  const res2 = patchTextInSheet(res1.sheet, 'C_z = \\frac{L}{q S', 'C_z = \\frac{L}{q S}');
  assert.equal(res2.replaced, true);
  assert.equal(res2.sheet.magicFormulas[0].formula, 'C_z = \\frac{L}{q S}');
});

test('patchTextInExercise patches broken KaTeX in TDExercise and AnnaleItem', () => {
  const annale: AnnaleItem = {
    id: 'a1',
    subjectId: 'aero',
    chapter: 'Vol',
    title: 'Annale 2024',
    notion: 'Portance',
    difficulty: 3,
    statement: 'Calculer $F_z = \\frac{1}{2} \\rho V^2 S C_z$.',
    hints: ['Utiliser $C_z0$'],
    solution: 'On obtient $F_z = 1200 N$.',
    status: 'todo',
    session: 'Principale',
    year: 2024,
    durationMinutes: 120,
    points: 20,
    gradingCriteria: ['Justesse $C_z0$ : 5 pts'],
  };

  const res = patchTextInExercise(annale, 'C_z0', 'C_{z0}');
  assert.equal(res.replaced, true);
  assert.equal(res.item.hints[0], 'Utiliser $C_{z0}$');
});
