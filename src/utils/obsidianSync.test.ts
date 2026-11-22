import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildObsidianNewUri,
  buildVaultExportEntries,
  buildZipArchive,
  computeCrc32,
  generateObsidianCanvas,
  parseObsidianMarkdownToSheet,
  sanitizeObsidianFilename,
  sheetToObsidianMarkdown,
} from './obsidianSync.ts';
import { availableSubjects } from '../data/initialData.ts';
import { StudySheet, TDExercise, AnnaleItem } from '../types/course.ts';

const sampleSheet: StudySheet = {
  id: 'sheet_test_1',
  subjectId: 'maths',
  title: 'Séries de Fourier : Coefficients & Convergence',
  subtitle: 'Décomposition spectrale des signaux périodiques',
  chapter: 'Analyse Harmonique',
  tags: ['ESTACA', 'Fourier'],
  mastery: 'learning',
  theorems: [
    {
      id: 'thm_1',
      name: 'Théorème de Dirichlet',
      statement: 'S_n(t) \\to \\frac{f(t^+) + f(t^-)}{2}',
      strictConditions: ['Signal périodique', '$C^1$ par morceaux'],
      professorTip: 'Vérifier la continuité aux bords de période.',
    },
  ],
  magicFormulas: [
    {
      id: 'fml_1',
      name: 'Identité de Parseval',
      formula: '$$\\frac{1}{T}\\int_0^T |f(t)|^2 dt = \\sum_{n=-\\infty}^{+\\infty} |c_n|^2$$',
      unitsAndVariables: 'f(t) en V, T en s',
      validityDomain: 'Signal de carré intégrable sur une période',
    },
  ],
  stepByStepMethods: [
    {
      id: 'mth_1',
      goal: 'Calculer c_n rapidement',
      steps: ['Tester la parité de f(t)', 'Intégrer sur [-T/2, T/2]'],
      trapToAvoid: 'Oublier c_0 séparément',
    },
  ],
  examTraps: ['Confondre $a_n$ et $c_n$'],
  flashcards: [{ id: 'fc_1', question: 'Que vaut $c_0$ ?', answer: 'La valeur moyenne sur une période.' }],
  quiz: [],
};

test('sanitizeObsidianFilename strips reserved vault characters', () => {
  assert.equal(
    sanitizeObsidianFilename('Chapitre 1: Cinématique / Vecteurs? *ESTACA*'),
    'Chapitre 1 Cinématique Vecteurs ESTACA'
  );
});

test('sheetToObsidianMarkdown and parseObsidianMarkdownToSheet preserve content in round-trip', () => {
  const md = sheetToObsidianMarkdown(sampleSheet, 'Mathématiques');
  assert.ok(md.includes('[[Mathématiques]]'));
  assert.ok(md.includes('> [!abstract] Théorème de Dirichlet'));
  assert.ok(md.includes('> [!tip] Identité de Parseval'));
  assert.ok(md.includes('> [!example] Calculer c_n rapidement'));
  assert.ok(md.includes('> [!warning] Erreurs fréquentes à éviter'));

  const parsed = parseObsidianMarkdownToSheet('Fourier.md', md, availableSubjects);
  assert.equal(parsed.title, sampleSheet.title);
  assert.equal(parsed.subjectId, 'maths');
  assert.equal(parsed.mastery, 'learning');
  assert.equal(parsed.theorems.length, 1);
  assert.equal(parsed.magicFormulas.length, 1);
  assert.equal(parsed.stepByStepMethods.length, 1);
  assert.equal(parsed.examTraps.length, 1);
  assert.equal(parsed.flashcards.length, 1);
});

test('parseObsidianMarkdownToSheet supports plain non-FicheMaster Obsidian Markdown notes', () => {
  const plainMd = `# Oscillateur Harmonique Amorti

## Équation différentielle
$$\\ddot{x} + 2\\zeta\\omega_0\\dot{x} + \\omega_0^2 x = 0$$

## Points clés
- Régime pseudopériodique pour $\\zeta < 1$
- Régime critique pour $\\zeta = 1$
`;
  const parsed = parseObsidianMarkdownToSheet('Oscillateur.md', plainMd, availableSubjects);
  assert.equal(parsed.title, 'Oscillateur Harmonique Amorti');
  assert.ok(parsed.magicFormulas.length >= 1);
  assert.ok(parsed.theorems.length >= 2);
});

test('generateObsidianCanvas emits valid JSON Canvas nodes and edges', () => {
  const td: TDExercise[] = [
    {
      id: 'td_1',
      subjectId: 'maths',
      chapter: 'Fourier',
      title: 'TD Signal Carré',
      notion: 'Coefficients',
      difficulty: 2,
      statement: 'Calculer c_n',
      hints: ['Parité impaire'],
      solution: 'Voir détail',
      status: 'todo',
    },
  ];
  const annales: AnnaleItem[] = [];
  const rawCanvas = generateObsidianCanvas([sampleSheet], td, annales, availableSubjects);
  const parsed = JSON.parse(rawCanvas);
  assert.ok(Array.isArray(parsed.nodes) && parsed.nodes.length >= 4);
  assert.ok(Array.isArray(parsed.edges) && parsed.edges.length >= 3);
  assert.equal(parsed.nodes[0].id, 'hub-fichemaster');
});

test('buildZipArchive generates valid PKZIP signatures and CRC32 for vault entries', () => {
  const entries = buildVaultExportEntries([sampleSheet], [], [], availableSubjects);
  const zip = buildZipArchive(entries);
  // Local file header PK\x03\x04
  assert.equal(zip[0], 0x50);
  assert.equal(zip[1], 0x4b);
  assert.equal(zip[2], 0x03);
  assert.equal(zip[3], 0x04);
  // EOCD PK\x05\x06 at last 22 bytes
  const eocdOffset = zip.length - 22;
  assert.equal(zip[eocdOffset], 0x50);
  assert.equal(zip[eocdOffset + 1], 0x4b);
  assert.equal(zip[eocdOffset + 2], 0x05);
  assert.equal(zip[eocdOffset + 3], 0x06);

  // Known CRC32 sanity check for ASCII "123456789" === 0xCBF43926
  const check = computeCrc32(new TextEncoder().encode('123456789'));
  assert.equal(check, 0xcbf43926);

  const uri = buildObsidianNewUri(sampleSheet, 'Mathématiques', 'MonCoffre');
  assert.ok(uri.startsWith('obsidian://new?'));
  assert.ok(uri.includes('vault=MonCoffre'));
});
