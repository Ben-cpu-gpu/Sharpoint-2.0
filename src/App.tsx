import React, { useState } from 'react';
import { ErrorBoundary } from './components/common/ErrorBoundary';
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
import { StudySheet, TDExercise, AnnaleItem } from './types/course';
import { 
  loadInitialData, 
  saveAppData, 
  exportDataAsJson, 
  importDataFromJson 
} from './services/storageService';
import { 
  BookOpen, 
  Plus, 
  Trash2, 
  CheckCircle2, 
  Search, 
  Layers 
} from 'lucide-react';

export const App: React.FC = () => {
  // Chargement de l'état initial depuis localStorage ou données ESTACA par défaut
  const [initialData] = useState(() => loadInitialData());
  const [sheets, setSheets] = useState<StudySheet[]>(initialData.sheets);
  const [tdExercises, setTdExercises] = useState<TDExercise[]>(initialData.tdExercises);
  const [annales, setAnnales] = useState<AnnaleItem[]>(initialData.annales);
  const [lastSavedTime, setLastSavedTime] = useState<string | null>(initialData.lastSavedTime);

  // Navigation & Filtres
  const [currentTab, setCurrentTab] = useState<MainTab>('sheets');
  const [selectedSubjectId, setSelectedSubjectId] = useState<string | 'all'>('all');
  const [sheetSearch, setSheetSearch] = useState('');

  // Sélection & Édition Fiche
  const [activeSheetId, setActiveSheetId] = useState<string>(() => initialData.sheets[0]?.id || '');
  const [isEditingSheet, setIsEditingSheet] = useState(false);

  // Modales
  const [isRevisionOpen, setIsRevisionOpen] = useState(false);
  const [revisionInitialMode, setRevisionInitialMode] = useState<'flashcards' | 'quiz'>('flashcards');
  const [isIngestionOpen, setIsIngestionOpen] = useState(false);
  const [isApiKeyModalOpen, setIsApiKeyModalOpen] = useState(false);

  // Notification Toast éphémère
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  // Sauvegarde manuelle explicite dans localStorage
  const handleManualSave = () => {
    const timestamp = saveAppData(sheets, tdExercises, annales);
    setLastSavedTime(timestamp);
    showToast(`Données sauvegardées à ${timestamp}`);
  };

  // Export JSON
  const handleExportJson = () => {
    exportDataAsJson({ sheets, tdExercises, annales });
    showToast('Export JSON téléchargé avec succès !');
  };

  // Import JSON
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
      showToast('Sauvegarde JSON importée avec succès !');
    } catch (err: any) {
      alert(`Erreur d'import : ${err.message}`);
    }
  };

  // Gestion des fiches
  const activeSheet = sheets.find(s => s.id === activeSheetId) || sheets[0];

  const handleUpdateSheet = (updated: StudySheet) => {
    const next = sheets.map(s => s.id === updated.id ? updated : s);
    setSheets(next);
    saveAppData(next, tdExercises, annales);
  };

  const handleSaveEditor = (updated: StudySheet) => {
    handleUpdateSheet(updated);
    setIsEditingSheet(false);
    showToast('Fiche de révision enregistrée !');
  };

  const handleDeleteSheet = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm('Voulez-vous vraiment supprimer cette fiche de révision ?')) {
      const next = sheets.filter(s => s.id !== id);
      setSheets(next);
      if (activeSheetId === id && next.length > 0) {
        setActiveSheetId(next[0].id);
      }
      saveAppData(next, tdExercises, annales);
      showToast('Fiche supprimée.');
    }
  };

  const handleCreateBlankSheet = () => {
    const newSheet: StudySheet = {
      id: `sheet_${Date.now()}`,
      subjectId: selectedSubjectId === 'all' ? 'meca-flu' : selectedSubjectId,
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

  // Ingestion Callbacks
  const handleSheetIngested = (newSheet: StudySheet) => {
    const next = [newSheet, ...sheets];
    setSheets(next);
    setActiveSheetId(newSheet.id);
    setCurrentTab('sheets');
    saveAppData(next, tdExercises, annales);
    showToast('Fiche de révision générée et ajoutée !');
  };

  const handleTdIngested = (newExercises: TDExercise[]) => {
    const next = [...newExercises, ...tdExercises];
    setTdExercises(next);
    setCurrentTab('td');
    saveAppData(sheets, next, annales);
    showToast(`${newExercises.length} exercice(s) de TD extrait(s) !`);
  };

  const handleAnnalesIngested = (newAnnales: AnnaleItem[]) => {
    const next = [...newAnnales, ...annales];
    setAnnales(next);
    setCurrentTab('annales');
    saveAppData(sheets, tdExercises, next);
    showToast(`${newAnnales.length} annale(s) d'examen extraite(s) !`);
  };

  // Filtrage des fiches
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

  return (
    <ErrorBoundary>
      <div className="min-h-screen bg-[#131314] text-[#e3e3e3] flex flex-col font-sans selection:bg-blue-600 selection:text-white pb-16 sm:pb-0">
        {/* En-tête Google AI Studio */}
        <Header
          currentTab={currentTab}
          onTabChange={setCurrentTab}
          onOpenIngest={() => setIsIngestionOpen(true)}
          onOpenSettings={() => setIsApiKeyModalOpen(true)}
          onManualSave={handleManualSave}
          lastSavedTime={lastSavedTime}
          onExportJson={handleExportJson}
          onImportJson={handleImportJson}
          selectedSubjectId={selectedSubjectId}
          onSubjectChange={setSelectedSubjectId}
          counts={{
            sheets: sheets.length,
            td: tdExercises.length,
            annales: annales.length,
          }}
        />

        {/* Notification Toast */}
        {toastMessage && (
          <div className="fixed top-16 right-4 z-50 flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-[#1e1f20] border border-blue-500/50 text-blue-300 text-xs font-semibold shadow-2xl backdrop-blur-md animate-fade-in">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            <span>{toastMessage}</span>
          </div>
        )}

        {/* Contenu Principal Mobile & Desktop */}
        <main className="flex-1 max-w-7xl w-full mx-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-6">
          {/* 1. SECTION FICHES DE COURS */}
          {currentTab === 'sheets' && (
            <div className="space-y-6">
              {/* Si on est en mode édition complète */}
              {isEditingSheet && activeSheet ? (
                <SheetEditor
                  sheet={activeSheet}
                  onSave={handleSaveEditor}
                  onCancel={() => setIsEditingSheet(false)}
                />
              ) : (
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                  {/* Volet Latéral / Liste des Fiches */}
                  <div className="lg:col-span-4 space-y-3">
                    <div className="bg-[#1e1f20] border border-[#282a2c] rounded-2xl p-3.5 shadow-xl space-y-3">
                      <div className="flex items-center justify-between">
                        <h2 className="text-xs font-bold text-[#8e918f] uppercase tracking-wider flex items-center gap-1.5">
                          <Layers className="w-3.5 h-3.5 text-blue-400" />
                          Mes Fiches ({filteredSheets.length})
                        </h2>
                        <button
                          onClick={handleCreateBlankSheet}
                          className="flex items-center gap-1 px-2.5 py-1 rounded-xl bg-blue-600/20 hover:bg-blue-600/30 text-blue-300 text-xs font-semibold transition-colors border border-blue-500/30"
                          title="Créer une fiche vierge"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          <span>Nouvelle</span>
                        </button>
                      </div>

                      {/* Recherche dans les fiches */}
                      <div className="relative">
                        <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-[#8e918f]" />
                        <input
                          type="text"
                          value={sheetSearch}
                          onChange={e => setSheetSearch(e.target.value)}
                          placeholder="Filtrer les fiches..."
                          className="w-full rounded-xl bg-[#131314] border border-[#37393b] pl-8.5 pr-3 py-1.5 text-xs text-white placeholder-[#8e918f] focus:outline-none focus:border-blue-500 transition-colors"
                        />
                      </div>
                    </div>

                    {/* Liste scrollable des vignettes */}
                    <div className="space-y-2 max-h-[70vh] overflow-y-auto pr-1">
                      {filteredSheets.length === 0 ? (
                        <div className="p-6 text-center text-[#8e918f] bg-[#1e1f20]/50 rounded-2xl border border-[#282a2c] text-xs">
                          Aucune fiche trouvée.
                        </div>
                      ) : (
                        filteredSheets.map(s => {
                          const isSelected = activeSheet && activeSheet.id === s.id;
                          return (
                            <div
                              key={s.id}
                              onClick={() => {
                                setActiveSheetId(s.id);
                                setIsEditingSheet(false);
                              }}
                              className={`p-3.5 rounded-2xl border cursor-pointer transition-all flex flex-col justify-between group ${
                                isSelected
                                  ? 'bg-blue-950/30 border-blue-500 text-white shadow-lg ring-1 ring-blue-500/30'
                                  : 'bg-[#1e1f20]/80 border-[#282a2c] hover:border-[#37393b] text-[#c4c7c5] hover:bg-[#1e1f20]'
                              }`}
                            >
                              <div>
                                <div className="flex items-center justify-between text-[10px] text-[#8e918f] mb-1">
                                  <span className="font-semibold text-blue-400 truncate max-w-[150px]">
                                    {s.chapter}
                                  </span>
                                  <span
                                    className={`px-1.5 py-0.2 rounded font-bold ${
                                      s.mastery === 'mastered'
                                        ? 'bg-emerald-950/80 text-emerald-400 border border-emerald-800/50'
                                        : s.mastery === 'learning'
                                        ? 'bg-blue-950/80 text-blue-400 border border-blue-800/50'
                                        : 'bg-amber-950/80 text-amber-400 border border-amber-800/50'
                                    }`}
                                  >
                                    {s.mastery === 'mastered' ? 'Maîtrisé' : s.mastery === 'learning' ? 'En cours' : 'À apprendre'}
                                  </span>
                                </div>

                                <h3 className="text-xs font-bold text-white group-hover:text-blue-300 transition-colors line-clamp-1">
                                  {s.title}
                                </h3>
                                <p className="text-[11px] text-[#8e918f] line-clamp-1 mt-0.5">
                                  {s.subtitle}
                                </p>
                              </div>

                              <div className="mt-2.5 pt-2 border-t border-[#282a2c] flex items-center justify-between text-[10px] text-[#8e918f]">
                                <span>{s.theorems.length} thm • {s.magicFormulas.length} fml</span>
                                <button
                                  onClick={(e) => handleDeleteSheet(s.id, e)}
                                  className="opacity-0 group-hover:opacity-100 p-1 hover:text-red-400 transition-opacity"
                                  title="Supprimer la fiche"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </div>
                          );
                        })
                      )}
                    </div>
                  </div>

                  {/* Visualiseur de la fiche active */}
                  <div className="lg:col-span-8">
                    {activeSheet ? (
                      <SheetViewer
                        sheet={activeSheet}
                        onEdit={() => setIsEditingSheet(true)}
                        onOpenRevision={(mode) => {
                          setRevisionInitialMode(mode);
                          setIsRevisionOpen(true);
                        }}
                        onUpdateSheet={handleUpdateSheet}
                      />
                    ) : (
                      <div className="py-24 text-center text-[#8e918f] bg-[#1e1f20]/50 rounded-3xl border border-[#282a2c]">
                        <BookOpen className="w-12 h-12 mx-auto opacity-30 text-[#8e918f] mb-3" />
                        <h3 className="text-base font-bold text-white">Sélectionnez ou créez une fiche</h3>
                        <p className="text-xs text-[#8e918f] mt-1">
                          Ou ingérez votre cours PDF pour transformer instantanément vos cours.
                        </p>
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
              onUpdateExercise={(updated) => {
                const next = tdExercises.map(e => e.id === updated.id ? updated : e);
                setTdExercises(next);
                saveAppData(sheets, next, annales);
              }}
              onAddExercise={(newExo) => {
                const next = [newExo, ...tdExercises];
                setTdExercises(next);
                saveAppData(sheets, next, annales);
                showToast('Nouvel exercice ajouté au TD !');
              }}
              onDeleteExercise={(id) => {
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
              onUpdateAnnale={(updated) => {
                const next = annales.map(a => a.id === updated.id ? updated : a);
                setAnnales(next);
                saveAppData(sheets, tdExercises, next);
              }}
              onAddAnnale={(newAnnale) => {
                const next = [newAnnale, ...annales];
                setAnnales(next);
                saveAppData(sheets, tdExercises, next);
                showToast('Nouvelle annale clone générée !');
              }}
              onDeleteAnnale={(id) => {
                const next = annales.filter(a => a.id !== id);
                setAnnales(next);
                saveAppData(sheets, tdExercises, next);
                showToast('Annale supprimée.');
              }}
            />
          )}
        </main>

        {/* Barre de navigation inférieure Mobile (App Smartphone) */}
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

        {/* Modale Paramètres & Clés API Google AI Studio */}
        <ApiKeyModal
          isOpen={isApiKeyModalOpen}
          onClose={() => setIsApiKeyModalOpen(false)}
          onKeysUpdated={() => {
            showToast('Paramètres et clés API mis à jour !');
          }}
        />

        {/* Modale d'Entraînement Interactif */}
        {activeSheet && (
          <RevisionModal
            sheet={activeSheet}
            initialMode={revisionInitialMode}
            isOpen={isRevisionOpen}
            onClose={() => setIsRevisionOpen(false)}
            onUpdateQuiz={(newQuiz) => {
              handleUpdateSheet({ ...activeSheet, quiz: newQuiz });
            }}
          />
        )}

        {/* Modale d'Ingestion de Documents */}
        <IngestionModal
          isOpen={isIngestionOpen}
          onClose={() => setIsIngestionOpen(false)}
          onSheetCreated={handleSheetIngested}
          onTdCreated={handleTdIngested}
          onAnnalesCreated={handleAnnalesIngested}
        />

        {/* Tiroir d'Inspection & Debugging IA */}
        <DebugDrawer />
      </div>
    </ErrorBoundary>
  );
};
