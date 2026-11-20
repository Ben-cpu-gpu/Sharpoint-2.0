import test from 'node:test';
import assert from 'node:assert/strict';
import {
  BLUEPRINT_LIMITS,
  mergeLocalAndCloudById,
  mergeRelaySettings,
  sanitizeFirestoreId,
  serializeAnnalePayload,
  serializeStudySheetPayload,
  serializeTDExercisePayload,
  serializeUserSettingsPayload,
} from './cloudSyncHelpers';
import { AnnaleItem, StudySheet, TDExercise } from '../types/course';

test('sanitizeFirestoreId strips invalid characters and bounds length', () => {
  assert.equal(sanitizeFirestoreId('sheet_123-abc'), 'sheet_123-abc');
  assert.equal(sanitizeFirestoreId('bad id/with:dots!'), 'bad_id_with_dots_');
  const long = 'a'.repeat(300);
  assert.equal(sanitizeFirestoreId(long).length, BLUEPRINT_LIMITS.MAX_ID_LEN);
  assert.match(sanitizeFirestoreId(''), /^item_\d+$/);
});

test('serializeStudySheetPayload enforces blueprint field bounds and required defaults', () => {
  const dirtySheet: StudySheet = {
    id: 'sheet:1',
    subjectId: 'mec-point',
    title: 'T'.repeat(500),
    subtitle: 'S'.repeat(800),
    chapter: '',
    tags: Array.from({ length: 40 }, (_, i) => `tag_${i}`),
    mastery: 'mastered',
    theorems: [],
    magicFormulas: [],
    stepByStepMethods: [],
    examTraps: [],
    flashcards: [],
    quiz: [],
  };

  const payload = serializeStudySheetPayload(dirtySheet, 'user_abc');
  assert.equal(payload.id, 'sheet_1');
  assert.equal(payload.ownerId, 'user_abc');
  assert.equal(payload.title.length, BLUEPRINT_LIMITS.MAX_TITLE_LEN);
  assert.equal(payload.subtitle.length, BLUEPRINT_LIMITS.MAX_SUBTITLE_LEN);
  assert.equal(payload.chapter, 'Chapitre');
  assert.equal(payload.tags.length, BLUEPRINT_LIMITS.MAX_TAGS);
  assert.ok(payload.clientCreatedAt.length > 0);
});

test('serializeTDExercisePayload and serializeAnnalePayload clamp numeric and string bounds', () => {
  const td: TDExercise = {
    id: 'td_1',
    subjectId: 'thermo',
    chapter: 'Premier Principe',
    title: 'Détente de Joule',
    notion: 'Gaz parfaits',
    difficulty: 3,
    statement: '',
    hints: Array.from({ length: 40 }, (_, i) => `hint_${i}`),
    solution: 'Sol',
    status: 'in_progress',
  };
  const serializedTd = serializeTDExercisePayload(td, 'uid_1');
  assert.equal(serializedTd.statement, 'Énoncé');
  assert.equal(serializedTd.hints.length, BLUEPRINT_LIMITS.MAX_HINTS);

  const annale: AnnaleItem = {
    ...td,
    id: 'ann_1',
    session: '',
    year: 1800,
    durationMinutes: 9999,
    points: 0,
    gradingCriteria: ['Crit 1'],
  };
  const serializedAnnale = serializeAnnalePayload(annale, 'uid_1');
  assert.equal(serializedAnnale.session, 'Session Principale');
  assert.equal(serializedAnnale.year, 1950);
  assert.equal(serializedAnnale.durationMinutes, 600);
  assert.equal(serializedAnnale.points, 1);
});

test('serializeUserSettingsPayload normalizes legacy local-priority model and truncates keys', () => {
  const payload = serializeUserSettingsPayload(
    {
      selectedModel: 'local-priority',
      selectedProvider: 'local',
      groqKey: 'k'.repeat(800),
      cerebrasKey: '  csk-test  ',
      mistralKey: '  mis-test  ',
      openrouterKey: '',
    },
    'uid_1'
  );
  assert.equal(payload.selectedModel, 'gemini-4-hydrogen');
  assert.equal(payload.selectedProvider, 'gemini');
  assert.equal(payload.groqKey.length, BLUEPRINT_LIMITS.MAX_KEY_LEN);
  assert.equal(payload.cerebrasKey, 'csk-test');
  assert.equal(payload.mistralKey, 'mis-test');
});

test('mergeLocalAndCloudById keeps cloud items authoritative and detects local-only items', () => {
  const cloud = [{ id: 's1', title: 'Cloud S1' }];
  const local = [
    { id: 's1', title: 'Local S1' },
    { id: 's2', title: 'Local S2' },
    { id: 's2', title: 'Duplicate S2' },
  ];

  const { merged, missingInCloud } = mergeLocalAndCloudById(local, cloud);
  assert.equal(merged.length, 2);
  assert.equal(merged[0].title, 'Cloud S1');
  assert.equal(missingInCloud.length, 1);
  assert.equal(missingInCloud[0].id, 's2');
});

test('mergeRelaySettings preserves non-empty local keys if cloud values are empty', () => {
  const { merged, shouldPushMergedToCloud } = mergeRelaySettings(
    {
      selectedModel: 'gemini-4-hydrogen',
      selectedProvider: 'gemini',
      groqKey: 'gsk-local-123',
      cerebrasKey: '',
      mistralKey: 'mis-local-456',
      openrouterKey: '',
    },
    {
      selectedModel: 'gemini-4-hydrogen',
      selectedProvider: 'gemini',
      groqKey: '',
      cerebrasKey: 'csk-cloud-789',
      mistralKey: '',
      openrouterKey: '',
    }
  );
  assert.equal(merged.groqKey, 'gsk-local-123');
  assert.equal(merged.cerebrasKey, 'csk-cloud-789');
  assert.equal(merged.mistralKey, 'mis-local-456');
  assert.equal(shouldPushMergedToCloud, true);
});

