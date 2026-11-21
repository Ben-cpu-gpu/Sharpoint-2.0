import React, { useEffect, useRef, useState } from 'react';
import {
  getRedirectResult,
  onAuthStateChanged,
  signInWithPopup,
  signInWithRedirect,
  signOut,
  User,
} from 'firebase/auth';
import { ErrorBoundary } from './components/common/ErrorBoundary';
import { CosmicBackdrop } from './components/common/CosmicBackdrop';
import { Header, MainTab } from './components/common/Header';
import { MobileBottomNav } from './components/common/MobileBottomNav';
import { ApiKeyModal } from './components/common/ApiKeyModal';
import { DebugDrawer } from './components/common/DebugDrawer';
import { IngestionModal } from './components/common/IngestionModal';
import { KatexRepairModal } from './components/common/KatexRepairModal';
import { GalacticTouchVFX } from './components/common/GalacticTouchVFX';
import { SelectionRepairBar, SelectedKatexTarget } from './components/common/SelectionRepairBar';
import { PracticeBatchModal } from './components/common/PracticeBatchModal';
import { SolarSystemNav } from './components/common/SolarSystemNav';
import { OfflineIndicator } from './components/common/OfflineIndicator';
import { CloudSyncState, MobileAuthError } from './components/common/CloudSyncControl';
import { KatexRepairProvider } from './contexts/KatexRepairContext';
import { SheetViewer } from './components/sheets/SheetViewer';
import { SheetEditor } from './components/sheets/SheetEditor';
import { RevisionModal } from './components/sheets/RevisionModal';
import { TDSection } from './components/td/TDSection';
import { AnnalesSection } from './components/annales/AnnalesSection';
import { StudySheet, TDExercise, AnnaleItem, ProviderHealthResult } from './types/course';
import { availableSubjects } from './data/initialData';
import {
  resolveActiveSheet,
  resolveSubjectId,
} from './utils/courseCatalog';
import { patchTextInExercise, patchTextInSheet } from './utils/documentExtraction';
import {
  mergeLocalAndCloudById,
  mergeRelaySettings,
  UserRelaySettings,
} from './utils/cloudSyncHelpers';
import {
  loadInitialData,
  saveAppData,
  exportDataAsJson,
  importDataFromJson,
} from './services/storageService';
import {
  AIProvider,
  getCerebrasApiKey,
  getGroqApiKey,
  getMistralApiKey,
  getOpenRouterApiKey,
  getSelectedModel,
  getSelectedProvider,
  hasKeyForProvider,
  setCerebrasApiKey,
  setGroqApiKey,
  setMistralApiKey,
  setOpenRouterApiKey,
  setSelectedModel,
} from './services/apiKeyService';
import { fetchGeminiServerStatus, testProviderHealth } from './services/aiService';
import { CloudAIProvider } from './utils/aiFallbackOrder';
import { auth, googleProvider } from './firebase';
import {
  deleteAnnaleInCloud,
  deleteStudySheetInCloud,
  deleteTDExerciseInCloud,
  ensureUserRoot,
  saveUserSettingsInCloud,
  subscribeToUserCloudData,
  uploadMissingLocalItemsToCloud,
  upsertAnnaleInCloud,
  upsertStudySheetInCloud,
  upsertTDExerciseInCloud,
} from './services/cloudSyncService';
import {
  BookOpen,
  Plus,
  PlusCircle,
  Trash2,
  CheckCircle2,
  Search,
  Layers,
} from 'lucide-react';

export const App: React.FC = () => {
  const [initialData] = useState(() => loadInitialData());
  const [sheets, setSheets] = useState<StudySheet[]>(initialData.sheets);
  const [tdExercises, setTdExercises] = useState<TDExercise[]>(initialData.tdExercises);
  const [annales, setAnnales] = useState<AnnaleItem[]>(initialData.annales);
  const [lastSavedTime, setLastSavedTime] = useState<string | null>(initialData.lastSavedTime);

  const [currentTab, setCurrentTab] = useState<MainTab>('sheets');
  const [selectedSubjectId, setSelectedSubjectId] = useState<string | 'all'>('all');
  const [sheetSearch, setSheetSearch] = useState('');

  const [activeSheetId, setActiveSheetId] = useState<string>(() => initialData.sheets[0]?.id || '');
  const [isEditingSheet, setIsEditingSheet] = useState(false);

  const [isRevisionOpen, setIsRevisionOpen] = useState(false);
  const [revisionInitialMode, setRevisionInitialMode] = useState<'flashcards' | 'quiz'>('flashcards');
  const [isIngestionOpen, setIsIngestionOpen] = useState(false);
  const [isKatexRepairOpen, setIsKatexRepairOpen] = useState(false);
  const [repairKatexInitial, setRepairKatexInitial] = useState('');
  const [repairKatexTarget, setRepairKatexTarget] = useState<{
    scopeType: 'sheet' | 'td' | 'annale';
    scopeId: string;
    label?: string;
  } | null>(null);
  const [isPracticeBatchOpen, setIsPracticeBatchOpen] = useState(false);
  const [practiceBatchType, setPracticeBatchType] = useState<'td' | 'annale'>('td');
  const [isApiKeyModalOpen, setIsApiKeyModalOpen] = useState(false);
  const [apiModalInitialTab, setApiModalInitialTab] = useState<AIProvider | undefined>(undefined);
  const [isTestingAll, setIsTestingAll] = useState(false);

  const [cloudUser, setCloudUser] = useState<User | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const [syncState, setSyncState] = useState<CloudSyncState>('offline_local');
  const [syncError, setSyncError] = useState<string | null>(null);
  const [authError, setAuthError] = useState<MobileAuthError | null>(null);
  const [fatalFirestoreError, setFatalFirestoreError] = useState<Error | null>(null);

  const [focusMode, setFocusMode] = useState<boolean>(() => {
    try {
      return localStorage.getItem('fichemaster_focus_mode') === 'true';
    } catch {
      return false;
    }
  });

  const handleToggleFocusMode = () => {
    setFocusMode(prev => {
      const next = !prev;
      try {
        localStorage.setItem('fichemaster_focus_mode', String(next));
      } catch {
        // Ignore storage restriction
      }
      return next;
    });
  };

  const [katexRepairMode, setKatexRepairMode] = useState(false);
  const katexRepairModeRef = useRef(katexRepairMode);
  katexRepairModeRef.current = katexRepairMode;

  const toggleKatexRepairMode = () => {
    setKatexRepairMode(prev => !prev);
  };

  const openScopedKatexRepair = (
    snippet: string,
    scopeType: 'sheet' | 'td' | 'annale',
    scopeId: string
  ) => {
    setRepairKatexInitial(snippet);
    setRepairKatexTarget({
      scopeType,
      scopeId,
      label:
        scopeType === 'sheet'
          ? 'Fiche de cours active'
          : scopeType === 'td'
          ? 'Exercice de TD'
          : "Annale d'examen",
    });
    setIsKatexRepairOpen(true);
  };

  useEffect(() => {
    const handleGlobalKatexClick = (e: MouseEvent) => {
      if (!katexRepairModeRef.current) return;
      const target = (e.target as HTMLElement).closest('.katex-repair-trigger');
      if (target) {
        const rawLatex = target.getAttribute('data-latex');
        if (rawLatex) {
          const scopeEl = target.closest('[data-katex-repair-scope]') as HTMLElement | null;
          if (scopeEl) {
            const st = (scopeEl.getAttribute('data-scope-type') || 'sheet') as 'sheet' | 'td' | 'annale';
            const sid = scopeEl.getAttribute('data-scope-id') || '';
            if (sid) {
              openScopedKatexRepair(decodeURIComponent(rawLatex), st, sid);
              return;
            }
          }
          setRepairKatexInitial(decodeURIComponent(rawLatex));
          setRepairKatexTarget(null);
          setIsKatexRepairOpen(true);
        }
      }
    };
    document.addEventListener('click', handleGlobalKatexClick);
    return () => document.removeEventListener('click', handleGlobalKatexClick);
  }, []);

  const latestLocalDataRef = useRef({ sheets, tdExercises, annales });
  latestLocalDataRef.current = { sheets, tdExercises, annales };
  const migratedUidsRef = useRef<Set<string>>(new Set());

  const buildInitialHealthMap = (): Record<AIProvider, ProviderHealthResult> => {
    const providers: AIProvider[] = ['gemini', 'groq', 'cerebras', 'mistral', 'openrouter', 'local'];
    const map = {} as Record<AIProvider, ProviderHealthResult>;
    for (const p of providers) {
      if (p === 'local') {
        map[p] = {
          provider: 'local',
          status: 'ok',
          latencyMs: 1,
          statusCode: 200,
          testedModel: 'Regex Client-Side',
          message: 'Extraction client-side disponible (dernier recours).',
        };
      } else if (p === 'gemini') {
        map[p] = {
          provider: p,
          status: 'untested',
          message: 'Service Gemini serveur prêt — cliquez sur Tester.',
        };
      } else if (hasKeyForProvider(p)) {
        map[p] = {
          provider: p,
          status: 'untested',
          message: 'Clé présente — cliquez sur Tester pour vérifier l\'API.',
        };
      } else {
        map[p] = {
          provider: p,
          status: 'missing',
          message: 'Aucune clé API configurée.',
        };
      }
    }
    return map;
  };

  const [healthMap, setHealthMap] = useState<Record<AIProvider, ProviderHealthResult>>(() =>
    buildInitialHealthMap()
  );

  useEffect(() => {
    let active = true;
    fetchGeminiServerStatus().then(configured => {
      if (!active) return;
      setHealthMap(prev => {
        if (prev.gemini?.status === 'ok' || prev.gemini?.status === 'testing') {
          return prev;
        }
        return {
          ...prev,
          gemini: {
            provider: 'gemini',
            status: configured ? 'untested' : 'missing',
            message: configured
              ? 'Service Gemini serveur prêt — cliquez sur Tester.'
              : 'GEMINI_API_KEY non configurée côté serveur (Settings > Secrets).',
          },
        };
      });
    });
    return () => {
      active = false;
    };
  }, []);

  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  if (fatalFirestoreError) {
    throw fatalFirestoreError;
  }

  const getCurrentLocalRelaySettings = (): UserRelaySettings => ({
    selectedModel: getSelectedModel(),
    selectedProvider: getSelectedProvider(),
    groqKey: getGroqApiKey(),
    cerebrasKey: getCerebrasApiKey(),
    mistralKey: getMistralApiKey(),
    openrouterKey: getOpenRouterApiKey(),
  });

  const classifyAuthError = (err: any): MobileAuthError | null => {
    const code = String(err?.code || '');
    if (code === 'auth/popup-closed-by-user' || code === 'auth/cancelled-popup-request') {
      return null;
    }
    const hostname = typeof window !== 'undefined' ? window.location.hostname : '';
    const isUnauthorizedDomain = code === 'auth/unauthorized-domain';
    const canRetryRedirect =
      !isUnauthorizedDomain &&
      (code === 'auth/popup-blocked' ||
        code === 'auth/operation-not-supported-in-this-environment' ||
        code === 'auth/internal-error' ||
        code === 'auth/web-storage-unsupported' ||
        code === 'auth/network-request-failed' ||
        code === '');

    const message = isUnauthorizedDomain
      ? `Firebase refuse la connexion car le domaine "${hostname}" n'est pas encore dans la liste des domaines autorisés du projet.`
      : code === 'auth/popup-blocked' || code === 'auth/operation-not-supported-in-this-environment'
      ? 'La fenêtre Google a été bloquée par le navigateur mobile. Essayez la connexion par redirection.'
      : err?.message || 'Authentification Google impossible sur cet appareil.';

    return {
      code,
      message,
      hostname,
      isUnauthorizedDomain,
      canRetryRedirect,
    };
  };

  useEffect(() => {
    let activeUnsub: (() => void) | null = null;
    let cancelled = false;

    void getRedirectResult(auth)
      .then(result => {
        if (!cancelled && result?.user) {
          setAuthError(null);
          showToast('Connexion Google réussie · Synchronisation cloud active.');
        }
      })
      .catch(err => {
        if (cancelled) return;
        const classified = classifyAuthError(err);
        if (classified) {
          setAuthError(classified);
        }
      });

    const unsubAuth = onAuthStateChanged(auth, async user => {
      if (activeUnsub) {
        activeUnsub();
        activeUnsub = null;
      }

      if (cancelled) return;

      if (!user) {
        setCloudUser(null);
        setAuthReady(true);
        setSyncState('offline_local');
        setSyncError(null);
        return;
      }
      setAuthError(null);

      setCloudUser(user);
      setAuthReady(true);
      setSyncState('connecting');
      setSyncError(null);

      try {
        await ensureUserRoot(user);
        if (cancelled) return;

        const loaded = {
          sheets: false,
          td: false,
          annales: false,
          settings: false,
          cloudSheets: [] as StudySheet[],
          cloudTd: [] as TDExercise[],
          cloudAnnales: [] as AnnaleItem[],
          cloudSettings: null as UserRelaySettings | null,
          cloudSettingsExists: false,
        };

        const maybeRunInitialMigration = async () => {
          if (
            migratedUidsRef.current.has(user.uid) ||
            !loaded.sheets ||
            !loaded.td ||
            !loaded.annales ||
            !loaded.settings
          ) {
            return;
          }
          migratedUidsRef.current.add(user.uid);
          const localSnap = latestLocalDataRef.current;
          const sheetMerge = mergeLocalAndCloudById(localSnap.sheets, loaded.cloudSheets);
          const tdMerge = mergeLocalAndCloudById(localSnap.tdExercises, loaded.cloudTd);
          const annaleMerge = mergeLocalAndCloudById(localSnap.annales, loaded.cloudAnnales);

          if (
            sheetMerge.missingInCloud.length > 0 ||
            tdMerge.missingInCloud.length > 0 ||
            annaleMerge.missingInCloud.length > 0
          ) {
            setSyncState('syncing');
            await uploadMissingLocalItemsToCloud(user.uid, {
              sheets: sheetMerge.missingInCloud,
              tdExercises: tdMerge.missingInCloud,
              annales: annaleMerge.missingInCloud,
            });
          }

          const { merged: mergedSettings, shouldPushMergedToCloud } = mergeRelaySettings(
            getCurrentLocalRelaySettings(),
            loaded.cloudSettingsExists ? loaded.cloudSettings : null
          );

          if (!loaded.cloudSettingsExists || shouldPushMergedToCloud) {
            await saveUserSettingsInCloud(user.uid, mergedSettings);
          }
          setSyncState('synced');
        };

        activeUnsub = subscribeToUserCloudData(user.uid, {
          onSheets: cloudSheets => {
            loaded.sheets = true;
            loaded.cloudSheets = cloudSheets;
            const nextSheets = !migratedUidsRef.current.has(user.uid)
              ? mergeLocalAndCloudById(latestLocalDataRef.current.sheets, cloudSheets).merged
              : cloudSheets;
            setSheets(nextSheets);
            saveAppData(nextSheets, latestLocalDataRef.current.tdExercises, latestLocalDataRef.current.annales);
            setActiveSheetId(prev => (prev && nextSheets.some(s => s.id === prev) ? prev : nextSheets[0]?.id || ''));
            void maybeRunInitialMigration();
            setSyncState('synced');
          },
          onTdExercises: cloudTd => {
            loaded.td = true;
            loaded.cloudTd = cloudTd;
            const nextTd = !migratedUidsRef.current.has(user.uid)
              ? mergeLocalAndCloudById(latestLocalDataRef.current.tdExercises, cloudTd).merged
              : cloudTd;
            setTdExercises(nextTd);
            saveAppData(latestLocalDataRef.current.sheets, nextTd, latestLocalDataRef.current.annales);
            void maybeRunInitialMigration();
            setSyncState('synced');
          },
          onAnnales: cloudAnnales => {
            loaded.annales = true;
            loaded.cloudAnnales = cloudAnnales;
            const nextAnnales = !migratedUidsRef.current.has(user.uid)
              ? mergeLocalAndCloudById(latestLocalDataRef.current.annales, cloudAnnales).merged
              : cloudAnnales;
            setAnnales(nextAnnales);
            saveAppData(latestLocalDataRef.current.sheets, latestLocalDataRef.current.tdExercises, nextAnnales);
            void maybeRunInitialMigration();
            setSyncState('synced');
          },
          onSettings: (cloudSettings, exists) => {
            loaded.settings = true;
            loaded.cloudSettingsExists = exists;
            loaded.cloudSettings = cloudSettings;
            if (exists && cloudSettings) {
              const appliedSettings = !migratedUidsRef.current.has(user.uid)
                ? mergeRelaySettings(getCurrentLocalRelaySettings(), cloudSettings).merged
                : cloudSettings;
              setGroqApiKey(appliedSettings.groqKey);
              setCerebrasApiKey(appliedSettings.cerebrasKey);
              setMistralApiKey(appliedSettings.mistralKey);
              setOpenRouterApiKey(appliedSettings.openrouterKey);
              setSelectedModel(appliedSettings.selectedModel);
              refreshHealthStatusesAfterKeyUpdate();
            }
            void maybeRunInitialMigration();
            setSyncState('synced');
          },
          onSyncError: err => {
            setSyncState('error');
            setSyncError(err.message);
            if (err.message.includes('Missing or insufficient permissions') || err.message.includes('PERMISSION_DENIED')) {
              setFatalFirestoreError(err);
            }
          },
        });
      } catch (err) {
        const errorObj = err instanceof Error ? err : new Error(String(err));
        setSyncState('error');
        setSyncError(errorObj.message);
        if (errorObj.message.includes('Missing or insufficient permissions')) {
          setFatalFirestoreError(errorObj);
        }
      }
    });

    return () => {
      cancelled = true;
      unsubAuth();
      if (activeUnsub) activeUnsub();
    };
  }, []);

  const handleRetryRedirectSignIn = async () => {
    try {
      setSyncState('connecting');
      setSyncError(null);
      setAuthError(null);
      await signInWithRedirect(auth, googleProvider);
    } catch (err: any) {
      setSyncState('offline_local');
      const classified = classifyAuthError(err);
      if (classified) {
        setAuthError(classified);
        showToast(classified.message);
      }
    }
  };

  const handleSignInGoogle = async () => {
    try {
      setSyncState('connecting');
      setSyncError(null);
      setAuthError(null);
      await signInWithPopup(auth, googleProvider);
      showToast('Connexion Google réussie · Synchronisation cloud active.');
    } catch (err: any) {
      const code = String(err?.code || '');
      if (code === 'auth/popup-blocked' || code === 'auth/operation-not-supported-in-this-environment') {
        try {
          await signInWithRedirect(auth, googleProvider);
          return;
        } catch (redirectErr: any) {
          setSyncState('offline_local');
          const classifiedRedirect = classifyAuthError(redirectErr);
          if (classifiedRedirect) {
            setAuthError(classifiedRedirect);
            showToast(classifiedRedirect.message);
          }
          return;
        }
      }
      setSyncState('offline_local');
      const classified = classifyAuthError(err);
      if (classified) {
        setAuthError(classified);
        showToast(classified.message);
      }
    }
  };

  const handleSignOutGoogle = async () => {
    try {
      await signOut(auth);
      setAuthError(null);
      showToast('Déconnecté · Mode stockage local actif.');
    } catch (err: any) {
      showToast(`Erreur lors de la déconnexion : ${err?.message || 'Erreur'}`);
    }
  };

  const handleOpenDashboard = (providerTab?: AIProvider) => {
    setApiModalInitialTab(providerTab);
    setIsApiKeyModalOpen(true);
  };

  const handleTestProvider = async (
    provider: AIProvider,
    keyOverride?: string,
    modelOverride?: string
  ): Promise<ProviderHealthResult> => {
    setHealthMap(prev => ({
      ...prev,
      [provider]: {
        ...prev[provider],
        provider,
        status: 'testing',
        message: 'Vérification en cours...',
      },
    }));

    const result = await testProviderHealth(provider, keyOverride, modelOverride);
    setHealthMap(prev => ({
      ...prev,
      [provider]: result,
    }));
    return result;
  };

  const handleTestAllProviders = async (
    draftKeys?: Partial<Record<CloudAIProvider, string>>
  ) => {
    setIsTestingAll(true);
    try {
      const providers: AIProvider[] = ['gemini', 'groq', 'cerebras', 'mistral', 'openrouter', 'local'];
      await Promise.all(
        providers.map(p => {
          const override = p === 'local' ? undefined : draftKeys?.[p];
          return handleTestProvider(p, override);
        })
      );
      showToast('Diagnostic de connectivité des API terminé.');
    } finally {
      setIsTestingAll(false);
    }
  };

  const refreshHealthStatusesAfterKeyUpdate = () => {
    setHealthMap(prev => {
      const next = { ...prev };
      const cloudProviders: CloudAIProvider[] = ['gemini', 'groq', 'cerebras', 'mistral', 'openrouter'];
      for (const p of cloudProviders) {
        if (!hasKeyForProvider(p)) {
          next[p] = {
            provider: p,
            status: 'missing',
            message: 'Aucune clé API configurée.',
          };
        } else if (next[p].status === 'missing') {
          next[p] = {
            provider: p,
            status: 'untested',
            message: 'Clé enregistrée — prête à être testée.',
          };
        }
      }
      return next;
    });
  };

  const runCloudTask = (task: Promise<unknown>) => {
    setSyncState('syncing');
    task
      .then(() => {
        setSyncState('synced');
      })
      .catch(err => {
        const errorObj = err instanceof Error ? err : new Error(String(err));
        setSyncState('error');
        setSyncError(errorObj.message);
        if (errorObj.message.includes('Missing or insufficient permissions')) {
          setFatalFirestoreError(errorObj);
        }
      });
  };

  const handleManualSave = () => {
    const timestamp = saveAppData(sheets, tdExercises, annales);
    setLastSavedTime(timestamp);
    if (cloudUser) {
      runCloudTask(
        Promise.all([
          ...sheets.map(s => upsertStudySheetInCloud(cloudUser.uid, s)),
          ...tdExercises.map(t => upsertTDExerciseInCloud(cloudUser.uid, t)),
          ...annales.map(a => upsertAnnaleInCloud(cloudUser.uid, a)),
          saveUserSettingsInCloud(cloudUser.uid, getCurrentLocalRelaySettings()),
        ])
      );
      showToast(`Données sauvegardées & synchronisées (${timestamp})`);
    } else {
      showToast(`Données sauvegardées à ${timestamp}`);
    }
  };

  const handleExportJson = () => {
    exportDataAsJson({ sheets, tdExercises, annales });
    showToast('Export JSON téléchargé avec succès.');
  };

  const handleImportJson = async (file: File) => {
    try {
      const imported = await importDataFromJson(file);
      setSheets(imported.sheets);
      setTdExercises(imported.tdExercises);
      setAnnales(imported.annales);
      if (imported.sheets.length > 0) {
        setActiveSheetId(imported.sheets[0].id);
      }
      const timestamp = saveAppData(imported.sheets, imported.tdExercises, imported.annales);
      setLastSavedTime(timestamp);
      if (cloudUser) {
        runCloudTask(
          Promise.all([
            ...imported.sheets.map(s => upsertStudySheetInCloud(cloudUser.uid, s)),
            ...imported.tdExercises.map(t => upsertTDExerciseInCloud(cloudUser.uid, t)),
            ...imported.annales.map(a => upsertAnnaleInCloud(cloudUser.uid, a)),
          ])
        );
      }
      showToast('Sauvegarde JSON importée avec succès.');
    } catch (err: any) {
      showToast(`Erreur d'import : ${err?.message || 'Fichier invalide'}`);
    }
  };

  const activeSheet = sheets.find(s => s.id === activeSheetId) || sheets[0];

  const handleUpdateSheet = (updated: StudySheet) => {
    const next = sheets.map(s => (s.id === updated.id ? updated : s));
    setSheets(next);
    saveAppData(next, tdExercises, annales);
    if (cloudUser) {
      runCloudTask(upsertStudySheetInCloud(cloudUser.uid, updated));
    }
  };

  const handleSaveEditor = (updated: StudySheet) => {
    handleUpdateSheet(updated);
    setIsEditingSheet(false);
    showToast('Fiche de révision enregistrée.');
  };

  const handleDeleteSheet = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const next = sheets.filter(s => s.id !== id);
    setSheets(next);
    if (activeSheetId === id) {
      setActiveSheetId(next[0]?.id || '');
    }
    saveAppData(next, tdExercises, annales);
    if (cloudUser) {
      runCloudTask(deleteStudySheetInCloud(cloudUser.uid, id));
    }
    showToast('Fiche supprimée.');
  };

  const handleCreateBlankSheet = () => {
    const targetSubjectId = resolveSubjectId(
      selectedSubjectId,
      availableSubjects.map(s => s.id)
    );
    const newSheet: StudySheet = {
      id: `sheet_${Date.now()}`,
      subjectId: targetSubjectId,
      title: 'Nouvelle Fiche de Cours',
      subtitle: 'Description synthétique du chapitre',
      chapter: 'Nouveau Chapitre',
      tags: ['ESTACA', 'Cours'],
      mastery: 'to_learn',
      theorems: [],
      magicFormulas: [],
      stepByStepMethods: [],
      examTraps: [],
      flashcards: [],
      quiz: [],
      createdAt: new Date().toISOString(),
    };
    const next = [newSheet, ...sheets];
    setSheets(next);
    setActiveSheetId(newSheet.id);
    setIsEditingSheet(true);
    saveAppData(next, tdExercises, annales);
    if (cloudUser) {
      runCloudTask(upsertStudySheetInCloud(cloudUser.uid, newSheet));
    }
  };

  const handleSheetIngested = (newSheet: StudySheet) => {
    const next = [newSheet, ...sheets];
    setSheets(next);
    setActiveSheetId(newSheet.id);
    setCurrentTab('sheets');
    saveAppData(next, tdExercises, annales);
    if (cloudUser) {
      runCloudTask(upsertStudySheetInCloud(cloudUser.uid, newSheet));
    }
    showToast('Fiche de révision générée et ajoutée.');
  };

  const handleTdIngested = (newExercises: TDExercise[]) => {
    const next = [...newExercises, ...tdExercises];
    setTdExercises(next);
    setCurrentTab('td');
    saveAppData(sheets, next, annales);
    if (cloudUser) {
      runCloudTask(Promise.all(newExercises.map(ex => upsertTDExerciseInCloud(cloudUser.uid, ex))));
    }
    showToast(`${newExercises.length} exercice(s) de TD extrait(s).`);
  };

  const handleAnnalesIngested = (newAnnales: AnnaleItem[]) => {
    const next = [...newAnnales, ...annales];
    setAnnales(next);
    setCurrentTab('annales');
    saveAppData(sheets, tdExercises, next);
    if (cloudUser) {
      runCloudTask(Promise.all(newAnnales.map(an => upsertAnnaleInCloud(cloudUser.uid, an))));
    }
    showToast(`${newAnnales.length} annale(s) d'examen extraite(s).`);
  };

  const filteredSheets = sheets.filter(s => {
    if (selectedSubjectId !== 'all' && s.subjectId !== selectedSubjectId) return false;
    if (sheetSearch.trim()) {
      const q = sheetSearch.toLowerCase();
      return (
        s.title.toLowerCase().includes(q) ||
        s.chapter.toLowerCase().includes(q) ||
        s.tags.some(t => t.toLowerCase().includes(q))
      );
    }
    return true;
  });

  const resolvedActiveSheet = resolveActiveSheet(filteredSheets, activeSheetId);

  const getMasteryLabel = (mastery: StudySheet['mastery']) => {
    if (mastery === 'mastered') return 'Maîtrisé';
    if (mastery === 'learning') return 'En cours';
    return 'À apprendre';
  };

  const subjectCounts = React.useMemo(() => {
    const map: Record<string, { sheets: number; td: number; annales: number }> = {};
    for (const sub of availableSubjects) {
      map[sub.id] = { sheets: 0, td: 0, annales: 0 };
    }
    for (const s of sheets) {
      if (map[s.subjectId]) map[s.subjectId].sheets += 1;
    }
    for (const t of tdExercises) {
      if (map[t.subjectId]) map[t.subjectId].td += 1;
    }
    for (const a of annales) {
      if (map[a.subjectId]) map[a.subjectId].annales += 1;
    }
    return map;
  }, [sheets, tdExercises, annales]);

  const activeProvider = getSelectedProvider();

  return (
    <ErrorBoundary>
      <KatexRepairProvider
        value={{
          katexRepairMode,
          setKatexRepairMode,
          toggleKatexRepairMode,
          onOpenKatexModal: (initialLatex = '') => {
            setRepairKatexInitial(initialLatex);
            setRepairKatexTarget(null);
            setIsKatexRepairOpen(true);
          },
        }}
      >
      <div className="relative min-h-screen bg-[#04060C] text-slate-100 flex flex-col font-sans pb-20 md:pb-8 overflow-x-clip">
        <CosmicBackdrop focusMode={focusMode} />
        <GalacticTouchVFX disabled={focusMode} />

        <div className="relative z-10 flex flex-col min-h-screen min-w-0">
          <Header
            currentTab={currentTab}
            onTabChange={setCurrentTab}
            onOpenIngest={() => setIsIngestionOpen(true)}
            onOpenSettings={() => handleOpenDashboard()}
            katexRepairMode={katexRepairMode}
            onToggleKatexRepairMode={toggleKatexRepairMode}
            onOpenKatexRepair={() => {
              setRepairKatexInitial('');
              setRepairKatexTarget(null);
              setIsKatexRepairOpen(true);
            }}
            onManualSave={handleManualSave}
            lastSavedTime={lastSavedTime}
            onExportJson={handleExportJson}
            onImportJson={handleImportJson}
            activeHealthStatus={healthMap[activeProvider]?.status}
            counts={{
              sheets: sheets.length,
              td: tdExercises.length,
              annales: annales.length,
            }}
            cloudUser={cloudUser}
            authReady={authReady}
            syncState={syncState}
            syncError={syncError}
            authError={authError}
            onDismissAuthError={() => setAuthError(null)}
            onRetryRedirectSignIn={handleRetryRedirectSignIn}
            onSignIn={handleSignInGoogle}
            onSignOut={handleSignOutGoogle}
            focusMode={focusMode}
            onToggleFocusMode={handleToggleFocusMode}
          />

          {toastMessage && (
            <div
              role="status"
              className="fixed top-20 right-4 z-50 flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#0A0E19]/98 border border-amber-400/40 text-amber-200 text-xs font-semibold shadow-2xl animate-fade-in"
            >
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>{toastMessage}</span>
            </div>
          )}

          <main
            className={`flex-1 max-w-[1400px] w-full mx-auto px-3 sm:px-5 lg:px-6 py-5 sm:py-6 space-y-6 min-w-0 ${
              focusMode ? 'latex-focus' : ''
            }`}
          >
            {/* Observatoire Système Solaire + Tableau de Bord IA */}
            <SolarSystemNav
              currentTab={currentTab}
              onTabChange={setCurrentTab}
              selectedSubjectId={selectedSubjectId}
              onSelectSubject={setSelectedSubjectId}
              subjects={availableSubjects}
              counts={{
                sheets: sheets.length,
                td: tdExercises.length,
                annales: annales.length,
              }}
              subjectCounts={subjectCounts}
              onOpenIngest={() => setIsIngestionOpen(true)}
              onOpenDashboard={handleOpenDashboard}
              healthMap={healthMap}
              onTestProvider={p => handleTestProvider(p)}
              onTestAllProviders={() => handleTestAllProviders()}
              isTestingAll={isTestingAll}
              focusMode={focusMode}
            />

            {/* 1. SECTION FICHES DE COURS */}
            {currentTab === 'sheets' && (
              <div className="space-y-6">
                {isEditingSheet && activeSheet ? (
                  <SheetEditor
                    sheet={activeSheet}
                    onSave={handleSaveEditor}
                    onCancel={() => setIsEditingSheet(false)}
                  />
                ) : (
                  <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                    {/* Sidebar Fiches */}
                    <aside className="lg:col-span-4 space-y-3 min-w-0">
                      <div className="bg-[#0A0E19]/90 border border-white/[0.08] rounded-2xl p-4 space-y-3">
                        <div className="flex items-center justify-between gap-2">
                          <h2 className="font-display text-sm font-semibold text-slate-100 flex items-center gap-2">
                            <Layers className="w-4 h-4 text-amber-400" />
                            <span>Index des fiches</span>
                            <span className="font-mono text-xs text-slate-400">({filteredSheets.length})</span>
                          </h2>
                          <button
                            type="button"
                            onClick={handleCreateBlankSheet}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#101625] hover:bg-[#161E33] text-amber-300 text-xs font-semibold transition-colors border border-amber-500/30 whitespace-nowrap shrink-0"
                          >
                            <Plus className="w-3.5 h-3.5" />
                            <span>Nouvelle</span>
                          </button>
                        </div>

                        <div className="relative">
                          <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                          <input
                            type="text"
                            value={sheetSearch}
                            onChange={e => setSheetSearch(e.target.value)}
                            aria-label="Filtrer les fiches de cours"
                            placeholder="Rechercher un théorème, chapitre..."
                            className="w-full rounded-xl bg-[#04060C] border border-white/[0.1] pl-9 pr-3 py-2 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-amber-400/60 transition-colors"
                          />
                        </div>
                      </div>

                      <div className="space-y-2 max-h-[68vh] overflow-y-auto pr-1">
                        {filteredSheets.length === 0 ? (
                          <div className="p-6 text-center text-slate-400 bg-[#0A0E19]/70 rounded-2xl border border-white/[0.08] text-xs">
                            Aucune fiche enregistrée pour le moment.
                          </div>
                        ) : (
                          filteredSheets.map(s => {
                            const isSelected = resolvedActiveSheet && resolvedActiveSheet.id === s.id;
                            return (
                              <div
                                key={s.id}
                                className={`relative rounded-2xl border transition-all group ${
                                  isSelected
                                    ? 'bg-[#101625] border-amber-400/45 shadow-[0_0_24px_-10px_rgba(245,158,11,0.35)]'
                                    : 'bg-[#0A0E19]/85 border-white/[0.08] hover:border-white/[0.18] hover:bg-[#0D1322]'
                                }`}
                              >
                                <button
                                  type="button"
                                  onClick={() => {
                                    setActiveSheetId(s.id);
                                    setIsEditingSheet(false);
                                  }}
                                  className="w-full text-left p-4 pr-11 rounded-2xl focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-400"
                                >
                                  <div className="flex items-center gap-2 text-[11px] text-slate-400 mb-1.5">
                                    <span className="truncate max-w-[165px] text-sky-300/90 font-medium">
                                      {s.chapter}
                                    </span>
                                    <span aria-hidden="true">·</span>
                                    <span
                                      className={`font-medium shrink-0 ${
                                        s.mastery === 'mastered'
                                          ? 'text-emerald-400'
                                          : s.mastery === 'learning'
                                          ? 'text-amber-300'
                                          : 'text-slate-400'
                                      }`}
                                    >
                                      {getMasteryLabel(s.mastery)}
                                    </span>
                                  </div>

                                  <h3 className="font-display text-sm font-semibold text-slate-100 group-hover:text-amber-200 transition-colors line-clamp-1">
                                    {s.title}
                                  </h3>
                                  <p className="text-xs text-slate-400 line-clamp-1 mt-0.5">
                                    {s.subtitle}
                                  </p>

                                  <div className="mt-3 pt-2.5 border-t border-white/[0.06] flex items-center gap-2 text-[11px] font-mono text-slate-400">
                                    <span>{s.theorems.length} théorèmes</span>
                                    <span aria-hidden="true">·</span>
                                    <span>{s.magicFormulas.length} formules</span>
                                  </div>
                                </button>

                                <button
                                  type="button"
                                  onClick={e => handleDeleteSheet(s.id, e)}
                                  aria-label={`Supprimer ${s.title}`}
                                  title="Supprimer la fiche"
                                  className="absolute bottom-3 right-3 p-1.5 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-white/[0.05] opacity-70 sm:opacity-0 sm:group-hover:opacity-100 focus:opacity-100 transition-all"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            );
                          })
                        )}
                      </div>
                    </aside>

                    {/* Visualiseur de la fiche active */}
                    <div className="lg:col-span-8 min-w-0">
                      {resolvedActiveSheet ? (
                        <SheetViewer
                          sheet={resolvedActiveSheet}
                          onEdit={() => {
                            setActiveSheetId(resolvedActiveSheet.id);
                            setIsEditingSheet(true);
                          }}
                          onOpenRevision={mode => {
                            setActiveSheetId(resolvedActiveSheet.id);
                            setRevisionInitialMode(mode);
                            setIsRevisionOpen(true);
                          }}
                          onUpdateSheet={handleUpdateSheet}
                          onOpenPracticeBatch={type => {
                            setPracticeBatchType(type);
                            setIsPracticeBatchOpen(true);
                          }}
                          onSelectKatexForRepair={(snippet, scopeType, scopeId) =>
                            openScopedKatexRepair(snippet, scopeType, scopeId)
                          }
                        />
                      ) : (
                        <div className="py-20 px-6 text-center text-slate-400 bg-[#0A0E19]/80 rounded-2xl border border-white/[0.08] space-y-5">
                          <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-400/25 flex items-center justify-center mx-auto">
                            <BookOpen className="w-6 h-6 text-amber-400" />
                          </div>
                          <div className="max-w-md mx-auto space-y-1.5">
                            <h3 className="font-display text-base font-bold text-slate-100">
                              Votre espace de révision est prêt
                            </h3>
                            <p className="text-xs text-slate-400 leading-relaxed">
                              Importez un polycopié de cours PDF pour générer une fiche structurée par IA, ou créez une fiche vierge manuellement.
                            </p>
                          </div>
                          <div className="flex flex-wrap items-center justify-center gap-2.5">
                            <button
                              type="button"
                              onClick={() => setIsIngestionOpen(true)}
                              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-[#04060C] text-xs font-bold transition-colors"
                            >
                              <PlusCircle className="w-4 h-4" />
                              <span>Ingérer un PDF</span>
                            </button>
                            <button
                              type="button"
                              onClick={handleCreateBlankSheet}
                              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[#04060C] hover:bg-[#101625] border border-white/[0.1] text-slate-200 text-xs font-semibold transition-colors"
                            >
                              <Plus className="w-4 h-4 text-amber-400" />
                              <span>Créer une fiche vierge</span>
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* 2. SECTION EXERCICES & TD */}
            {currentTab === 'td' && (
              <TDSection
                exercises={tdExercises}
                selectedSubjectId={selectedSubjectId}
                onUpdateExercise={updated => {
                  const next = tdExercises.map(e => (e.id === updated.id ? updated : e));
                  setTdExercises(next);
                  saveAppData(sheets, next, annales);
                  if (cloudUser) {
                    runCloudTask(upsertTDExerciseInCloud(cloudUser.uid, updated));
                  }
                }}
                onAddExercise={newExo => {
                  const next = [newExo, ...tdExercises];
                  setTdExercises(next);
                  saveAppData(sheets, next, annales);
                  if (cloudUser) {
                    runCloudTask(upsertTDExerciseInCloud(cloudUser.uid, newExo));
                  }
                  showToast('Nouvel exercice ajouté au TD.');
                }}
                onDeleteExercise={id => {
                  const next = tdExercises.filter(e => e.id !== id);
                  setTdExercises(next);
                  saveAppData(sheets, next, annales);
                  if (cloudUser) {
                    runCloudTask(deleteTDExerciseInCloud(cloudUser.uid, id));
                  }
                  showToast('Exercice supprimé.');
                }}
                onOpenPracticeBatch={() => {
                  setPracticeBatchType('td');
                  setIsPracticeBatchOpen(true);
                }}
                onSelectKatexForRepair={(snippet, scopeType, scopeId) =>
                  openScopedKatexRepair(snippet, scopeType, scopeId)
                }
              />
            )}

            {/* 3. SECTION ANNALES D'EXAMENS */}
            {currentTab === 'annales' && (
              <AnnalesSection
                annales={annales}
                selectedSubjectId={selectedSubjectId}
                onUpdateAnnale={updated => {
                  const next = annales.map(a => (a.id === updated.id ? updated : a));
                  setAnnales(next);
                  saveAppData(sheets, tdExercises, next);
                  if (cloudUser) {
                    runCloudTask(upsertAnnaleInCloud(cloudUser.uid, updated));
                  }
                }}
                onAddAnnale={newAnnale => {
                  const next = [newAnnale, ...annales];
                  setAnnales(next);
                  saveAppData(sheets, tdExercises, next);
                  if (cloudUser) {
                    runCloudTask(upsertAnnaleInCloud(cloudUser.uid, newAnnale));
                  }
                  showToast('Nouvelle annale générée.');
                }}
                onDeleteAnnale={id => {
                  const next = annales.filter(a => a.id !== id);
                  setAnnales(next);
                  saveAppData(sheets, tdExercises, next);
                  if (cloudUser) {
                    runCloudTask(deleteAnnaleInCloud(cloudUser.uid, id));
                  }
                  showToast('Annale supprimée.');
                }}
                onOpenPracticeBatch={() => {
                  setPracticeBatchType('annale');
                  setIsPracticeBatchOpen(true);
                }}
                onSelectKatexForRepair={(snippet, scopeType, scopeId) =>
                  openScopedKatexRepair(snippet, scopeType, scopeId)
                }
              />
            )}
          </main>
        </div>

        <MobileBottomNav
          currentTab={currentTab}
          onTabChange={setCurrentTab}
          onOpenIngest={() => setIsIngestionOpen(true)}
          onOpenSettings={() => handleOpenDashboard()}
          counts={{
            sheets: sheets.length,
            td: tdExercises.length,
            annales: annales.length,
          }}
        />

        <ApiKeyModal
          isOpen={isApiKeyModalOpen}
          initialTab={apiModalInitialTab}
          onClose={() => setIsApiKeyModalOpen(false)}
          onKeysUpdated={() => {
            refreshHealthStatusesAfterKeyUpdate();
            if (cloudUser) {
              runCloudTask(saveUserSettingsInCloud(cloudUser.uid, getCurrentLocalRelaySettings()));
              showToast('Paramètres et clés API synchronisés dans le cloud.');
            } else {
              showToast('Paramètres et clés API mis à jour.');
            }
          }}
          healthMap={healthMap}
          onTestProvider={handleTestProvider}
          onTestAllProviders={handleTestAllProviders}
          isTestingAll={isTestingAll}
        />

        {activeSheet && (
          <RevisionModal
            sheet={activeSheet}
            initialMode={revisionInitialMode}
            isOpen={isRevisionOpen}
            onClose={() => setIsRevisionOpen(false)}
            onUpdateQuiz={newQuiz => {
              handleUpdateSheet({ ...activeSheet, quiz: newQuiz });
            }}
          />
        )}

        {isIngestionOpen && (
          <IngestionModal
            isOpen={isIngestionOpen}
            onClose={() => setIsIngestionOpen(false)}
            defaultSubjectId={selectedSubjectId}
            defaultTargetType={currentTab}
            onSheetCreated={handleSheetIngested}
            onTdCreated={handleTdIngested}
            onAnnalesCreated={handleAnnalesIngested}
          />
        )}

        <SelectionRepairBar
          enabled={katexRepairMode}
          onRepairSelection={(target: SelectedKatexTarget) => {
            openScopedKatexRepair(target.snippet, target.scopeType, target.scopeId);
          }}
        />

        <KatexRepairModal
          isOpen={isKatexRepairOpen}
          initialLatex={repairKatexInitial}
          targetLabel={repairKatexTarget?.label}
          onClose={() => setIsKatexRepairOpen(false)}
          onFixed={(fixedLatex, originalSnippet) => {
            const snippetToFind = originalSnippet || repairKatexInitial;
            let appliedInPlace = false;

            if (repairKatexTarget && snippetToFind) {
              if (repairKatexTarget.scopeType === 'sheet') {
                const targetSheet = sheets.find(s => s.id === repairKatexTarget.scopeId);
                if (targetSheet) {
                  const res = patchTextInSheet(targetSheet, snippetToFind, fixedLatex);
                  if (res.replaced) {
                    handleUpdateSheet(res.sheet);
                    appliedInPlace = true;
                  }
                }
              } else if (repairKatexTarget.scopeType === 'td') {
                const targetExo = tdExercises.find(e => e.id === repairKatexTarget.scopeId);
                if (targetExo) {
                  const res = patchTextInExercise(targetExo, snippetToFind, fixedLatex);
                  if (res.replaced) {
                    const next = tdExercises.map(e => (e.id === res.item.id ? res.item : e));
                    setTdExercises(next);
                    saveAppData(sheets, next, annales);
                    if (cloudUser) runCloudTask(upsertTDExerciseInCloud(cloudUser.uid, res.item));
                    appliedInPlace = true;
                  }
                }
              } else if (repairKatexTarget.scopeType === 'annale') {
                const targetAnnale = annales.find(a => a.id === repairKatexTarget.scopeId);
                if (targetAnnale) {
                  const res = patchTextInExercise(targetAnnale, snippetToFind, fixedLatex);
                  if (res.replaced) {
                    const next = annales.map(a => (a.id === res.item.id ? res.item : a));
                    setAnnales(next);
                    saveAppData(sheets, tdExercises, next);
                    if (cloudUser) runCloudTask(upsertAnnaleInCloud(cloudUser.uid, res.item));
                    appliedInPlace = true;
                  }
                }
              }
            } else if (snippetToFind) {
              if (resolvedActiveSheet && currentTab === 'sheets') {
                const res = patchTextInSheet(resolvedActiveSheet, snippetToFind, fixedLatex);
                if (res.replaced) {
                  handleUpdateSheet(res.sheet);
                  appliedInPlace = true;
                }
              }
              if (!appliedInPlace) {
                for (const s of sheets) {
                  const res = patchTextInSheet(s, snippetToFind, fixedLatex);
                  if (res.replaced) {
                    handleUpdateSheet(res.sheet);
                    appliedInPlace = true;
                    break;
                  }
                }
              }
              if (!appliedInPlace) {
                for (const ex of tdExercises) {
                  const res = patchTextInExercise(ex, snippetToFind, fixedLatex);
                  if (res.replaced) {
                    const next = tdExercises.map(e => (e.id === res.item.id ? res.item : e));
                    setTdExercises(next);
                    saveAppData(sheets, next, annales);
                    if (cloudUser) runCloudTask(upsertTDExerciseInCloud(cloudUser.uid, res.item));
                    appliedInPlace = true;
                    break;
                  }
                }
              }
              if (!appliedInPlace) {
                for (const an of annales) {
                  const res = patchTextInExercise(an, snippetToFind, fixedLatex);
                  if (res.replaced) {
                    const next = annales.map(a => (a.id === res.item.id ? res.item : a));
                    setAnnales(next);
                    saveAppData(sheets, tdExercises, next);
                    if (cloudUser) runCloudTask(upsertAnnaleInCloud(cloudUser.uid, res.item));
                    appliedInPlace = true;
                    break;
                  }
                }
              }
            }

            try {
              navigator.clipboard?.writeText?.(fixedLatex)?.catch(() => {});
            } catch {
              // Ignore clipboard restrictions
            }

            showToast(
              appliedInPlace
                ? 'Correction KaTeX appliquée directement dans le document !'
                : 'Formule KaTeX corrigée et copiée dans le presse-papiers.'
            );
          }}
        />

        <PracticeBatchModal
          isOpen={isPracticeBatchOpen}
          initialType={practiceBatchType}
          defaultSubjectId={selectedSubjectId}
          sheets={sheets}
          onClose={() => setIsPracticeBatchOpen(false)}
          onExercisesCreated={newExercises => {
            handleTdIngested(newExercises);
            showToast(`${newExercises.length} exercices générés avec corrections détaillées !`);
          }}
          onAnnalesCreated={newAnnales => {
            handleAnnalesIngested(newAnnales);
            showToast(`${newAnnales.length} annales générées avec barème et corrigés !`);
          }}
        />

        <OfflineIndicator />

        <DebugDrawer />
      </div>
      </KatexRepairProvider>
    </ErrorBoundary>
  );
};
