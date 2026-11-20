import { User } from 'firebase/auth';
import {
  collection,
  deleteDoc,
  deleteField,
  doc,
  getDoc,
  onSnapshot,
  query,
  serverTimestamp,
  setDoc,
  Unsubscribe,
  updateDoc,
  where,
  writeBatch,
} from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { AnnaleItem, StudySheet, TDExercise } from '../types/course';
import { normalizeStoredModelId, normalizeStoredProvider } from '../utils/aiFallbackOrder';
import {
  BLUEPRINT_LIMITS,
  sanitizeFirestoreId,
  sanitizeString,
  serializeAnnalePayload,
  serializeStudySheetPayload,
  serializeTDExercisePayload,
  serializeUserSettingsPayload,
  UserRelaySettings,
} from '../utils/cloudSyncHelpers';

export interface CloudSnapshotCallbacks {
  onSheets: (sheets: StudySheet[]) => void;
  onTdExercises: (exercises: TDExercise[]) => void;
  onAnnales: (annales: AnnaleItem[]) => void;
  onSettings: (settings: UserRelaySettings | null, exists: boolean) => void;
  onSyncError?: (error: Error) => void;
}

export async function ensureUserRoot(user: User): Promise<void> {
  const path = `users/${user.uid}`;
  const userRef = doc(db, 'users', user.uid);
  const displayName = sanitizeString(
    user.displayName || user.email?.split('@')[0],
    BLUEPRINT_LIMITS.MAX_DISPLAY_NAME_LEN,
    'Étudiant ESTACA'
  );

  let snap;
  try {
    snap = await getDoc(userRef);
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, path);
  }

  if (!snap.exists()) {
    try {
      await setDoc(userRef, {
        ownerId: user.uid,
        displayName,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, path);
    }
  } else {
    const existingName = snap.data()?.displayName;
    if (existingName !== displayName) {
      try {
        await updateDoc(userRef, {
          displayName,
          updatedAt: serverTimestamp(),
        });
      } catch (error) {
        handleFirestoreError(error, OperationType.UPDATE, path);
      }
    }
  }
}

export function subscribeToUserCloudData(
  uid: string,
  callbacks: CloudSnapshotCallbacks
): Unsubscribe {
  const sheetsPath = `users/${uid}/sheets`;
  const tdPath = `users/${uid}/tdExercises`;
  const annalesPath = `users/${uid}/annales`;
  const settingsPath = `users/${uid}/settings/preferences`;

  const unsubSheets = onSnapshot(
    query(collection(db, 'users', uid, 'sheets'), where('ownerId', '==', uid)),
    snapshot => {
      const items: StudySheet[] = snapshot.docs.map(d => {
        const data = d.data();
        return {
          id: data.id || d.id,
          subjectId: data.subjectId,
          title: data.title,
          subtitle: data.subtitle || '',
          chapter: data.chapter,
          tags: Array.isArray(data.tags) ? data.tags : [],
          mastery: data.mastery || 'to_learn',
          theorems: Array.isArray(data.theorems) ? data.theorems : [],
          magicFormulas: Array.isArray(data.magicFormulas) ? data.magicFormulas : [],
          stepByStepMethods: Array.isArray(data.stepByStepMethods) ? data.stepByStepMethods : [],
          examTraps: Array.isArray(data.examTraps) ? data.examTraps : [],
          flashcards: Array.isArray(data.flashcards) ? data.flashcards : [],
          quiz: Array.isArray(data.quiz) ? data.quiz : [],
          createdAt: data.clientCreatedAt || undefined,
        };
      });
      callbacks.onSheets(items);
    },
    error => {
      try {
        handleFirestoreError(error, OperationType.LIST, sheetsPath);
      } catch (err) {
        callbacks.onSyncError?.(err as Error);
      }
    }
  );

  const unsubTd = onSnapshot(
    query(collection(db, 'users', uid, 'tdExercises'), where('ownerId', '==', uid)),
    snapshot => {
      const items: TDExercise[] = snapshot.docs.map(d => {
        const data = d.data();
        return {
          id: data.id || d.id,
          subjectId: data.subjectId,
          chapter: data.chapter,
          title: data.title,
          notion: data.notion || '',
          difficulty: data.difficulty || 2,
          statement: data.statement,
          hints: Array.isArray(data.hints) ? data.hints : [],
          solution: data.solution || '',
          status: data.status || 'todo',
          createdAt: data.clientCreatedAt || undefined,
        };
      });
      callbacks.onTdExercises(items);
    },
    error => {
      try {
        handleFirestoreError(error, OperationType.LIST, tdPath);
      } catch (err) {
        callbacks.onSyncError?.(err as Error);
      }
    }
  );

  const unsubAnnales = onSnapshot(
    query(collection(db, 'users', uid, 'annales'), where('ownerId', '==', uid)),
    snapshot => {
      const items: AnnaleItem[] = snapshot.docs.map(d => {
        const data = d.data();
        return {
          id: data.id || d.id,
          subjectId: data.subjectId,
          chapter: data.chapter,
          title: data.title,
          notion: data.notion || '',
          difficulty: data.difficulty || 2,
          statement: data.statement,
          hints: Array.isArray(data.hints) ? data.hints : [],
          solution: data.solution || '',
          status: data.status || 'todo',
          session: data.session || 'Session Principale',
          year: Number(data.year) || new Date().getFullYear(),
          durationMinutes: Number(data.durationMinutes) || 120,
          points: Number(data.points) || 20,
          gradingCriteria: Array.isArray(data.gradingCriteria) ? data.gradingCriteria : [],
          createdAt: data.clientCreatedAt || undefined,
        };
      });
      callbacks.onAnnales(items);
    },
    error => {
      try {
        handleFirestoreError(error, OperationType.LIST, annalesPath);
      } catch (err) {
        callbacks.onSyncError?.(err as Error);
      }
    }
  );

  const unsubSettings = onSnapshot(
    doc(db, 'users', uid, 'settings', 'preferences'),
    snapshot => {
      if (!snapshot.exists()) {
        callbacks.onSettings(null, false);
        return;
      }
      const data = snapshot.data();
      const normalizedModel = normalizeStoredModelId(data.selectedModel);
      const normalizedProvider = normalizeStoredProvider(data.selectedProvider, data.selectedModel);
      callbacks.onSettings(
        {
          selectedModel: normalizedModel,
          selectedProvider: normalizedProvider,
          groqKey: data.groqKey || '',
          cerebrasKey: data.cerebrasKey || '',
          mistralKey: data.mistralKey || '',
          openrouterKey: data.openrouterKey || '',
        },
        true
      );
    },
    error => {
      try {
        handleFirestoreError(error, OperationType.GET, settingsPath);
      } catch (err) {
        callbacks.onSyncError?.(err as Error);
      }
    }
  );

  return () => {
    unsubSheets();
    unsubTd();
    unsubAnnales();
    unsubSettings();
  };
}

export async function upsertStudySheetInCloud(uid: string, sheet: StudySheet): Promise<void> {
  const payload = serializeStudySheetPayload(sheet, uid);
  const path = `users/${uid}/sheets/${payload.id}`;
  const ref = doc(db, 'users', uid, 'sheets', payload.id);

  try {
    const existingSnap = await getDoc(ref);
    if (!existingSnap.exists()) {
      await setDoc(ref, {
        ...payload,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    } else {
      await updateDoc(ref, {
        subjectId: payload.subjectId,
        title: payload.title,
        subtitle: payload.subtitle,
        chapter: payload.chapter,
        tags: payload.tags,
        mastery: payload.mastery,
        theorems: payload.theorems,
        magicFormulas: payload.magicFormulas,
        stepByStepMethods: payload.stepByStepMethods,
        examTraps: payload.examTraps,
        flashcards: payload.flashcards,
        quiz: payload.quiz,
        updatedAt: serverTimestamp(),
      });
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function deleteStudySheetInCloud(uid: string, sheetId: string): Promise<void> {
  const cleanId = sanitizeFirestoreId(sheetId, 'sheet');
  const path = `users/${uid}/sheets/${cleanId}`;
  try {
    await deleteDoc(doc(db, 'users', uid, 'sheets', cleanId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

export async function upsertTDExerciseInCloud(uid: string, exercise: TDExercise): Promise<void> {
  const payload = serializeTDExercisePayload(exercise, uid);
  const path = `users/${uid}/tdExercises/${payload.id}`;
  const ref = doc(db, 'users', uid, 'tdExercises', payload.id);

  try {
    const existingSnap = await getDoc(ref);
    if (!existingSnap.exists()) {
      await setDoc(ref, {
        ...payload,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    } else {
      await updateDoc(ref, {
        subjectId: payload.subjectId,
        chapter: payload.chapter,
        title: payload.title,
        notion: payload.notion,
        difficulty: payload.difficulty,
        statement: payload.statement,
        hints: payload.hints,
        solution: payload.solution,
        status: payload.status,
        updatedAt: serverTimestamp(),
      });
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function deleteTDExerciseInCloud(uid: string, exerciseId: string): Promise<void> {
  const cleanId = sanitizeFirestoreId(exerciseId, 'td');
  const path = `users/${uid}/tdExercises/${cleanId}`;
  try {
    await deleteDoc(doc(db, 'users', uid, 'tdExercises', cleanId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

export async function upsertAnnaleInCloud(uid: string, annale: AnnaleItem): Promise<void> {
  const payload = serializeAnnalePayload(annale, uid);
  const path = `users/${uid}/annales/${payload.id}`;
  const ref = doc(db, 'users', uid, 'annales', payload.id);

  try {
    const existingSnap = await getDoc(ref);
    if (!existingSnap.exists()) {
      await setDoc(ref, {
        ...payload,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    } else {
      await updateDoc(ref, {
        subjectId: payload.subjectId,
        chapter: payload.chapter,
        title: payload.title,
        notion: payload.notion,
        difficulty: payload.difficulty,
        statement: payload.statement,
        hints: payload.hints,
        solution: payload.solution,
        status: payload.status,
        session: payload.session,
        year: payload.year,
        durationMinutes: payload.durationMinutes,
        points: payload.points,
        gradingCriteria: payload.gradingCriteria,
        updatedAt: serverTimestamp(),
      });
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function deleteAnnaleInCloud(uid: string, annaleId: string): Promise<void> {
  const cleanId = sanitizeFirestoreId(annaleId, 'annale');
  const path = `users/${uid}/annales/${cleanId}`;
  try {
    await deleteDoc(doc(db, 'users', uid, 'annales', cleanId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

export async function saveUserSettingsInCloud(
  uid: string,
  settings: UserRelaySettings
): Promise<void> {
  const payload = serializeUserSettingsPayload(settings, uid);
  const path = `users/${uid}/settings/preferences`;
  const ref = doc(db, 'users', uid, 'settings', 'preferences');

  try {
    const existingSnap = await getDoc(ref);
    if (!existingSnap.exists()) {
      await setDoc(ref, {
        ...payload,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    } else {
      const existingData = existingSnap.data() || {};
      const migrationDeletes =
        'claudeKey' in existingData || 'openaiKey' in existingData
          ? { claudeKey: deleteField(), openaiKey: deleteField() }
          : {};

      await updateDoc(ref, {
        selectedModel: payload.selectedModel,
        selectedProvider: payload.selectedProvider,
        groqKey: payload.groqKey,
        cerebrasKey: payload.cerebrasKey,
        mistralKey: payload.mistralKey,
        openrouterKey: payload.openrouterKey,
        ...migrationDeletes,
        updatedAt: serverTimestamp(),
      });
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function uploadMissingLocalItemsToCloud(
  uid: string,
  items: {
    sheets: StudySheet[];
    tdExercises: TDExercise[];
    annales: AnnaleItem[];
  }
): Promise<number> {
  const ops: Array<{ type: 'sheet' | 'td' | 'annale'; data: StudySheet | TDExercise | AnnaleItem }> = [
    ...items.sheets.map(s => ({ type: 'sheet' as const, data: s })),
    ...items.tdExercises.map(t => ({ type: 'td' as const, data: t })),
    ...items.annales.map(a => ({ type: 'annale' as const, data: a })),
  ];

  if (ops.length === 0) return 0;

  const CHUNK_SIZE = 300;
  for (let i = 0; i < ops.length; i += CHUNK_SIZE) {
    const chunk = ops.slice(i, i + CHUNK_SIZE);
    const batch = writeBatch(db);
    for (const op of chunk) {
      if (op.type === 'sheet') {
        const p = serializeStudySheetPayload(op.data as StudySheet, uid);
        batch.set(doc(db, 'users', uid, 'sheets', p.id), {
          ...p,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
      } else if (op.type === 'td') {
        const p = serializeTDExercisePayload(op.data as TDExercise, uid);
        batch.set(doc(db, 'users', uid, 'tdExercises', p.id), {
          ...p,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
      } else {
        const p = serializeAnnalePayload(op.data as AnnaleItem, uid);
        batch.set(doc(db, 'users', uid, 'annales', p.id), {
          ...p,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
      }
    }
    try {
      await batch.commit();
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `users/${uid}/batch_migration`);
    }
  }

  return ops.length;
}
