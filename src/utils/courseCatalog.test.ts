import test from 'node:test';
import assert from 'node:assert/strict';
import {
  DEFAULT_SUBJECT_ID,
  resolveActiveSheet,
  resolveSubjectId,
  stripInventedSeedData,
} from './courseCatalog';
import { StudySheet, TDExercise, AnnaleItem } from '../types/course';

function makeSheet(id: string, subjectId = 'maths'): StudySheet {
  return {
    id,
    subjectId,
    title: `Sheet ${id}`,
    subtitle: 'Sub',
    chapter: 'Chap',
    tags: [],
    mastery: 'to_learn',
    theorems: [],
    magicFormulas: [],
    stepByStepMethods: [],
    examTraps: [],
    flashcards: [],
    quiz: [],
  };
}

function makeTd(id: string): TDExercise {
  return {
    id,
    subjectId: 'maths',
    chapter: 'Chap',
    title: `TD ${id}`,
    notion: 'Notion',
    difficulty: 1,
    statement: 'Statement',
    hints: [],
    solution: 'Solution',
    status: 'todo',
  };
}

function makeAnnale(id: string): AnnaleItem {
  return {
    ...makeTd(id),
    session: 'Principale',
    year: 2025,
    durationMinutes: 120,
    points: 20,
    gradingCriteria: [],
  };
}

test('stripInventedSeedData removes legacy invented items while preserving user items', () => {
  const { cleaned, removedCount } = stripInventedSeedData({
    sheets: [makeSheet('sheet_mecaflu_01'), makeSheet('user_sheet_1', 'thermodynamique')],
    tdExercises: [makeTd('exo_td_mecaflu_01'), makeTd('user_td_1')],
    annales: [makeAnnale('annale_estaca_2024_01')],
  });

  assert.equal(removedCount, 3);
  assert.deepEqual(cleaned.sheets.map(s => s.id), ['user_sheet_1']);
  assert.deepEqual(cleaned.tdExercises.map(t => t.id), ['user_td_1']);
  assert.deepEqual(cleaned.annales, []);
});

test('resolveSubjectId uses selected subject when valid and falls back to first subject on all/invalid', () => {
  const valid = ['maths', 'meca-point', 'thermodynamique'];
  assert.equal(resolveSubjectId('thermodynamique', valid), 'thermodynamique');
  assert.equal(resolveSubjectId('all', valid), DEFAULT_SUBJECT_ID);
  assert.equal(resolveSubjectId('meca-flu', valid), DEFAULT_SUBJECT_ID);
  assert.equal(resolveSubjectId(undefined, valid), DEFAULT_SUBJECT_ID);
});

test('resolveActiveSheet returns undefined when filtered list is empty instead of leaking other subjects', () => {
  assert.equal(resolveActiveSheet([], 'user_sheet_1'), undefined);
  const s1 = makeSheet('s1', 'maths');
  const s2 = makeSheet('s2', 'maths');
  assert.equal(resolveActiveSheet([s1, s2], 's2')?.id, 's2');
  assert.equal(resolveActiveSheet([s1, s2], 'nonexistent')?.id, 's1');
});
