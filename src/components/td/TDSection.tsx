import React, { useState } from 'react';
import { 
  Search, 
  Filter, 
  Sparkles, 
  ChevronDown, 
  ChevronUp, 
  HelpCircle, 
  CheckCircle, 
  Clock, 
  BookOpen, 
  Loader2, 
  Plus, 
  Trash2, 
  Star 
} from 'lucide-react';
import { TDExercise, ExerciseStatus, DifficultyLevel } from '../../types/course';
import { MathView } from '../common/MathView';
import { generateSimilarExercise } from '../../services/aiService';

interface TDSectionProps {
  exercises: TDExercise[];
  selectedSubjectId: string | 'all';
  onUpdateExercise: (exercise: TDExercise) => void;
  onAddExercise: (exercise: TDExercise) => void;
  onDeleteExercise: (id: string) => void;
}

export const TDSection: React.FC<TDSectionProps> = ({
  exercises,
  selectedSubjectId,
  onUpdateExercise,
  onAddExercise,
  onDeleteExercise,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedChapter, setSelectedChapter] = useState<string>('all');
  const [selectedDifficulty, setSelectedDifficulty] = useState<DifficultyLevel | 'all'>('all');
  const [selectedStatus, setSelectedStatus] = useState<ExerciseStatus | 'all'>('all');

  // Dépliages des cartes
  const [expandedCards, setExpandedCards] = useState<Record<string, boolean>>({});
  const [revealedHints, setRevealedHints] = useState<Record<string, number>>({});
  const [revealedSolutions, setRevealedSolutions] = useState<Record<string, boolean>>({});
  const [cloningId, setCloningId] = useState<string | null>(null);

  // Extraire les chapitres disponibles
  const chapters = Array.from(new Set(exercises.map(e => e.chapter))).filter(Boolean);

  // Filtrage
  const filteredExercises = exercises.filter(e => {
    if (selectedSubjectId !== 'all' && e.subjectId !== selectedSubjectId) return false;
    if (selectedChapter !== 'all' && e.chapter !== selectedChapter) return false;
    if (selectedDifficulty !== 'all' && e.difficulty !== selectedDifficulty) return false;
    if (selectedStatus !== 'all' && e.status !== selectedStatus) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return (
        e.title.toLowerCase().includes(q) ||
        e.notion.toLowerCase().includes(q) ||
        e.statement.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const toggleCard = (id: string) => {
    setExpandedCards(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const handleRevealNextHint = (id: string, maxHints: number) => {
    setRevealedHints(prev => {
      const current = prev[id] || 0;
      if (current < maxHints) {
        return { ...prev, [id]: current + 1 };
      }
      return prev;
    });
  };

  const toggleSolution = (id: string) => {
    setRevealedSolutions(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const handleStatusChange = (exercise: TDExercise, status: ExerciseStatus) => {
    onUpdateExercise({ ...exercise, status });
  };

  const handleCloneExercise = async (exercise: TDExercise) => {
    setCloningId(exercise.id);
    try {
      const cloned = (await generateSimilarExercise(exercise, 'td')) as TDExercise;
      onAddExercise(cloned);
      // Ouvre immédiatement la nouvelle carte générée
      setExpandedCards(prev => ({ ...prev, [cloned.id]: true }));
    } catch (err) {
      console.error('Erreur clonage IA', err);
    } finally {
      setCloningId(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Barre supérieure : Recherche & Filtres ergonomiques */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 sm:p-5 shadow-xl space-y-3.5">
        <div className="flex flex-col sm:flex-row gap-3">
          {/* Recherche textuelle */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Rechercher par titre, notion, mot-clé, énoncé..."
              className="w-full rounded-xl bg-slate-950/80 border border-slate-800 pl-10 pr-4 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-colors"
            />
          </div>

          {/* Filtre Chapitre */}
          {chapters.length > 0 && (
            <div className="sm:w-64">
              <select
                value={selectedChapter}
                onChange={e => setSelectedChapter(e.target.value)}
                className="w-full rounded-xl bg-slate-950/80 border border-slate-800 px-3 py-2 text-xs text-slate-300 focus:outline-none focus:border-indigo-500 cursor-pointer"
              >
                <option value="all">Tous les chapitres ({exercises.length})</option>
                {chapters.map(ch => (
                  <option key={ch} value={ch}>{ch}</option>
                ))}
              </select>
            </div>
          )}
        </div>

        {/* Ligne des pastilles : Difficulté & Statut */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-slate-800/60">
          {/* Filtres de difficulté */}
          <div className="flex items-center gap-1.5">
            <span className="text-[11px] text-slate-500 font-semibold mr-1">Difficulté :</span>
            {(['all', 1, 2, 3] as const).map(diff => (
              <button
                key={diff}
                onClick={() => setSelectedDifficulty(diff)}
                className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-colors ${
                  selectedDifficulty === diff
                    ? 'bg-indigo-600 text-white'
                    : 'bg-slate-950 text-slate-400 hover:text-slate-200 border border-slate-800'
                }`}
              >
                {diff === 'all' && 'Toutes'}
                {diff === 1 && '1 • Débutant'}
                {diff === 2 && '2 • Intermédiaire'}
                {diff === 3 && '3 • ESTACA ⭐'}
              </button>
            ))}
          </div>

          {/* Filtres de statut */}
          <div className="flex items-center gap-1.5">
            <span className="text-[11px] text-slate-500 font-semibold mr-1">Statut :</span>
            {(['all', 'todo', 'in_progress', 'completed'] as const).map(st => (
              <button
                key={st}
                onClick={() => setSelectedStatus(st)}
                className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-colors ${
                  selectedStatus === st
                    ? 'bg-indigo-600 text-white'
                    : 'bg-slate-950 text-slate-400 hover:text-slate-200 border border-slate-800'
                }`}
              >
                {st === 'all' && 'Tous'}
                {st === 'todo' && 'À faire'}
                {st === 'in_progress' && 'En cours'}
                {st === 'completed' && 'Résolu ✓'}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Liste des exercices */}
      {filteredExercises.length === 0 ? (
        <div className="py-16 text-center text-slate-500 bg-slate-900/40 rounded-2xl border border-slate-800">
          <BookOpen className="w-10 h-10 mx-auto opacity-30 text-slate-400 mb-2" />
          <p className="text-sm">Aucun exercice de TD ne correspond à vos filtres.</p>
          <p className="text-xs text-slate-600 mt-1">
            Utilisez le bouton "Ingérer PDF / Cours" en haut pour charger une feuille de TD complète.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredExercises.map(exercise => {
            const isExpanded = expandedCards[exercise.id] ?? true;
            const hintCount = exercise.hints.length;
            const currentHintStep = revealedHints[exercise.id] || 0;
            const isSolutionVisible = revealedSolutions[exercise.id] || false;
            const isCloningThis = cloningId === exercise.id;

            return (
              <div
                key={exercise.id}
                className="bg-slate-900 border border-slate-800 rounded-2xl shadow-xl overflow-hidden transition-all hover:border-slate-700/80"
              >
                {/* En-tête de carte pliable */}
                <div className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-950/40 border-b border-slate-800/80">
                  <div className="flex-1 cursor-pointer" onClick={() => toggleCard(exercise.id)}>
                    <div className="flex flex-wrap items-center gap-2 mb-1.5">
                      <span className="text-[11px] font-semibold px-2 py-0.5 rounded-md bg-indigo-500/10 text-indigo-300 border border-indigo-500/20">
                        {exercise.chapter}
                      </span>
                      <span className="text-[11px] px-2 py-0.5 rounded-md bg-slate-800 text-slate-400">
                        Notion : {exercise.notion}
                      </span>
                      {/* Badge difficulté */}
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-md flex items-center gap-1 ${
                          exercise.difficulty === 3
                            ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                            : exercise.difficulty === 2
                            ? 'bg-blue-500/20 text-blue-300'
                            : 'bg-emerald-500/20 text-emerald-300'
                        }`}
                      >
                        <Star className="w-3 h-3 fill-current" />
                        Niveau {exercise.difficulty} / 3
                      </span>
                    </div>

                    <h3 className="text-base font-bold text-white hover:text-indigo-300 transition-colors flex items-center gap-2">
                      {exercise.title}
                    </h3>
                  </div>

                  {/* Contrôles d'état et actions */}
                  <div className="flex items-center gap-2 shrink-0">
                    {/* Sélecteur de statut */}
                    <div className="flex items-center rounded-xl bg-slate-950 border border-slate-800 p-1">
                      <button
                        onClick={() => handleStatusChange(exercise, 'todo')}
                        className={`px-2 py-1 rounded-lg text-[10px] font-semibold transition-colors ${
                          exercise.status === 'todo' ? 'bg-amber-600 text-white' : 'text-slate-400 hover:text-slate-200'
                        }`}
                        title="À faire"
                      >
                        À faire
                      </button>
                      <button
                        onClick={() => handleStatusChange(exercise, 'in_progress')}
                        className={`px-2 py-1 rounded-lg text-[10px] font-semibold transition-colors ${
                          exercise.status === 'in_progress' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-slate-200'
                        }`}
                        title="En cours"
                      >
                        En cours
                      </button>
                      <button
                        onClick={() => handleStatusChange(exercise, 'completed')}
                        className={`px-2 py-1 rounded-lg text-[10px] font-semibold transition-colors ${
                          exercise.status === 'completed' ? 'bg-emerald-600 text-white' : 'text-slate-400 hover:text-slate-200'
                        }`}
                        title="Résolu"
                      >
                        Résolu ✓
                      </button>
                    </div>

                    {/* Déplier / Replier */}
                    <button
                      onClick={() => toggleCard(exercise.id)}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
                    >
                      {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {/* Contenu de l'exercice (si déplié) */}
                {isExpanded && (
                  <div className="p-5 space-y-4">
                    {/* Énoncé */}
                    <div className="text-xs text-slate-200 leading-relaxed bg-slate-950/70 p-4 rounded-xl border border-slate-800/80 whitespace-pre-wrap select-text font-sans">
                      <MathView math={exercise.statement} />
                    </div>

                    {/* Zone des indices progressifs */}
                    {hintCount > 0 && (
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-amber-400 flex items-center gap-1.5">
                            <HelpCircle className="w-4 h-4" />
                            Indices de recherche ({currentHintStep} / {hintCount} révélé{currentHintStep > 1 ? 's' : ''})
                          </span>

                          {currentHintStep < hintCount && (
                            <button
                              onClick={() => handleRevealNextHint(exercise.id, hintCount)}
                              className="px-3 py-1 rounded-lg bg-amber-950/60 hover:bg-amber-900 border border-amber-800/60 text-amber-300 text-xs font-semibold transition-colors"
                            >
                              Révéler l'indice {currentHintStep + 1}
                            </button>
                          )}
                        </div>

                        {currentHintStep > 0 && (
                          <div className="space-y-1.5 animate-fade-in">
                            {exercise.hints.slice(0, currentHintStep).map((hint, hIdx) => (
                              <div
                                key={hIdx}
                                className="p-3 rounded-xl bg-amber-950/20 border border-amber-900/40 text-xs text-amber-200/90 flex items-start gap-2"
                              >
                                <span className="font-bold text-amber-400 font-mono">#{hIdx + 1}</span>
                                <div className="flex-1">
                                  <MathView math={hint} />
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}

                    {/* Solution détaillée pas à pas */}
                    <div className="pt-2 border-t border-slate-800/60">
                      <button
                        onClick={() => toggleSolution(exercise.id)}
                        className={`w-full py-2.5 rounded-xl border text-xs font-bold transition-all flex items-center justify-center gap-2 ${
                          isSolutionVisible
                            ? 'bg-slate-800 border-slate-700 text-white'
                            : 'bg-indigo-950/50 hover:bg-indigo-900/60 border-indigo-800/50 text-indigo-300'
                        }`}
                      >
                        <CheckCircle className="w-4 h-4 text-emerald-400" />
                        <span>{isSolutionVisible ? 'Masquer la correction détaillée' : 'Révéler la correction détaillée pas à pas'}</span>
                      </button>

                      {isSolutionVisible && (
                        <div className="mt-3 p-4 rounded-xl bg-slate-950 border border-emerald-900/30 text-xs text-slate-200 space-y-2 whitespace-pre-wrap font-sans select-text animate-fade-in">
                          <MathView math={exercise.solution} />
                        </div>
                      )}
                    </div>

                    {/* Footer de carte : Bouton Générer similaire via IA & Supprimer */}
                    <div className="pt-3 border-t border-slate-800/60 flex items-center justify-between">
                      <button
                        onClick={() => handleCloneExercise(exercise)}
                        disabled={isCloningThis}
                        className="flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 border border-indigo-500/30 text-xs font-semibold transition-all active:scale-95 disabled:opacity-50"
                      >
                        {isCloningThis ? (
                          <>
                            <Loader2 className="w-3.5 h-3.5 animate-spin text-indigo-400" />
                            <span>Génération d'une variante IA...</span>
                          </>
                        ) : (
                          <>
                            <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
                            <span>Générer un exercice similaire via IA</span>
                          </>
                        )}
                      </button>

                      <button
                        onClick={() => onDeleteExercise(exercise.id)}
                        className="p-1.5 rounded-lg text-slate-500 hover:text-red-400 transition-colors"
                        title="Supprimer cet exercice"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
