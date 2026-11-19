import React, { useState } from 'react';
import { ErrorBoundary } from './components/common/ErrorBoundary';
import { CosmicBackdrop } from './components/common/CosmicBackdrop';
import { Header, MainTab } from './components/common/Header';
import { MobileBottomNav } from './components/common/MobileBottomNav';
import { ApiKeyModal } from './components/common/ApiKeyModal';
import { DebugDrawer } from './components/common/DebugDrawer';
import { IngestionModal } from './components/common/IngestionModal';
import { SheetViewer } from './components/sheets/SheetViewer';
import { SheetEditor } from './components/sheets/SheetEditor';
import { RevisionModal } from './components/sheets/RevisionModal';
import { TDSection } from './components/td/TDSection';
import { AnnalesSection } from './components/annales/AnnalesSection';
import { StudySheet, TDExercise, AnnaleItem, Subject } from './types/course';
import { availableSubjects } from './data/initialData';
import {
  resolveActiveSheet,
  resolveSubjectId,
} from './utils/courseCatalog';
import {
  loadInitialData,
  saveAppData,
  exportDataAsJson,
  importDataFromJson,
} from './services/storageService';
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
  const [isApiKeyModalOpen, setIsApiKeyModalOpen] = useState(false);

  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const handleManualSave = () => {
    const timestamp = saveAppData(sheets, tdExercises, annales);
    setLastSavedTime(timestamp);
    showToast(`Données sauvegardées à ${timestamp}`);
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
  };

  const handleSheetIngested = (newSheet: StudySheet) => {
    const next = [newSheet, ...sheets];
    setSheets(next);
    setActiveSheetId(newSheet.id);
    setCurrentTab('sheets');
    saveAppData(next, tdExercises, annales);
    showToast('Fiche de révision générée et ajoutée.');
  };

  const handleTdIngested = (newExercises: TDExercise[]) => {
    const next = [...newExercises, ...tdExercises];
    setTdExercises(next);
    setCurrentTab('td');
    saveAppData(sheets, next, annales);
    showToast(`${newExercises.length} exercice(s) de TD extrait(s).`);
  };

  const handleAnnalesIngested = (newAnnales: AnnaleItem[]) => {
    const next = [...newAnnales, ...annales];
    setAnnales(next);
    setCurrentTab('annales');
    saveAppData(sheets, tdExercises, next);
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

  return (
    <ErrorBoundary>
      <div className="relative min-h-screen bg-[#04060C] text-slate-100 flex flex-col font-sans pb-20 sm:pb-8">
        <CosmicBackdrop />

        <div className="relative z-10 flex flex-col min-h-screen">
          <Header
            currentTab={currentTab}
            onTabChange={setCurrentTab}
            onOpenIngest={() => setIsIngestionOpen(true)}
            onOpenSettings={() => setIsApiKeyModalOpen(true)}
            onManualSave={handleManualSave}
            lastSavedTime={lastSavedTime}
            onExportJson={handleExportJson}
            onImportJson={handleImportJson}
            counts={{
              sheets: sheets.length,
              td: tdExercises.length,
              annales: annales.length,
            }}
          />

          {toastMessage && (
            <div
              role="status"
              className="fixed top-20 right-4 z-50 flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#0A0E19]/95 border border-amber-400/40 text-amber-200 text-xs font-semibold shadow-2xl backdrop-blur-md animate-fade-in"
            >
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>{toastMessage}</span>
            </div>
          )}

          <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-5 sm:py-6 space-y-5">
            {/* Workspace Subject Filter Bar */}
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 pb-4 border-b border-white/[0.08]">
              <div className="flex flex-wrap items-center gap-1.5 p-1 rounded-xl bg-[#0A0E19] border border-white/[0.08]">
                <button
                  type="button"
                  onClick={() => setSelectedSubjectId('all')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap shrink-0 ${
                    selectedSubjectId === 'all'
                      ? 'bg-amber-500 text-[#04060C]'
                      : 'text-slate-400 hover:text-slate-100'
                  }`}
                >
                  Toutes matières
                </button>
                {availableSubjects.map((sub: Subject) => (
                  <button
                    key={sub.id}
                    type="button"
                    onClick={() => setSelectedSubjectId(sub.id)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap shrink-0 ${
                      selectedSubjectId === sub.id
                        ? 'bg-amber-500 text-[#04060C]'
                        : 'text-slate-400 hover:text-slate-100'
                    }`}
                  >
                    {sub.name}
                  </button>
                ))}
              </div>

              <div className="hidden sm:flex items-center gap-3 text-xs text-slate-400 font-mono shrink-0">
                <span>ESTACA Ingénierie</span>
                <span aria-hidden="true">·</span>
                <span>{sheets.length} fiches</span>
                <span aria-hidden="true">·</span>
                <span>{tdExercises.length} TD</span>
                <span aria-hidden="true">·</span>
                <span>{annales.length} annales</span>
              </div>
            </div>

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
                    <aside className="lg:col-span-4 space-y-3">
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
                    <div className="lg:col-span-8">
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
                }}
                onAddExercise={newExo => {
                  const next = [newExo, ...tdExercises];
                  setTdExercises(next);
                  saveAppData(sheets, next, annales);
                  showToast('Nouvel exercice ajouté au TD.');
                }}
                onDeleteExercise={id => {
                  const next = tdExercises.filter(e => e.id !== id);
                  setTdExercises(next);
                  saveAppData(sheets, next, annales);
                  showToast('Exercice supprimé.');
                }}
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
                }}
                onAddAnnale={newAnnale => {
                  const next = [newAnnale, ...annales];
                  setAnnales(next);
                  saveAppData(sheets, tdExercises, next);
                  showToast('Nouvelle annale générée.');
                }}
                onDeleteAnnale={id => {
                  const next = annales.filter(a => a.id !== id);
                  setAnnales(next);
                  saveAppData(sheets, tdExercises, next);
                  showToast('Annale supprimée.');
                }}
              />
            )}
          </main>
        </div>

        <MobileBottomNav
          currentTab={currentTab}
          onTabChange={setCurrentTab}
          onOpenIngest={() => setIsIngestionOpen(true)}
          onOpenSettings={() => setIsApiKeyModalOpen(true)}
          counts={{
            sheets: sheets.length,
            td: tdExercises.length,
            annales: annales.length,
          }}
        />

        <ApiKeyModal
          isOpen={isApiKeyModalOpen}
          onClose={() => setIsApiKeyModalOpen(false)}
          onKeysUpdated={() => {
            showToast('Paramètres et clés API mis à jour.');
          }}
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

        <IngestionModal
          isOpen={isIngestionOpen}
          onClose={() => setIsIngestionOpen(false)}
          defaultSubjectId={selectedSubjectId}
          onSheetCreated={handleSheetIngested}
          onTdCreated={handleTdIngested}
          onAnnalesCreated={handleAnnalesIngested}
        />

        <DebugDrawer />
      </div>
    </ErrorBoundary>
  );
};
