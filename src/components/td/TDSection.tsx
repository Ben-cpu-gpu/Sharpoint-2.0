import React, { useState } from 'react';
import {
  Search,
  Sparkles,
  ChevronDown,
  ChevronUp,
  HelpCircle,
  CheckCircle,
  BookOpen,
  Loader2,
  Trash2,
  Wand2,
  Zap,
  AlertTriangle,
  X,
} from 'lucide-react';
import { TDExercise, ExerciseStatus, DifficultyLevel } from '../../types/course';
import { MathView } from '../common/MathView';
import { generateSimilarExercise } from '../../services/aiService';
import { useKatexRepairContext } from '../../contexts/KatexRepairContext';

interface TDSectionProps {
  exercises: TDExercise[];
  selectedSubjectId: string | 'all';
  onUpdateExercise: (exercise: TDExercise) => void;
  onAddExercise: (exercise: TDExercise) => void;
  onDeleteExercise: (id: string) => void;
  onOpenPracticeBatch?: () => void;
  onSelectKatexForRepair?: (snippet: string, scopeType: 'td', scopeId: string) => void;
}

export const TDSection: React.FC<TDSectionProps> = ({
  exercises,
  selectedSubjectId,
  onUpdateExercise,
  onAddExercise,
  onDeleteExercise,
  onOpenPracticeBatch,
  onSelectKatexForRepair,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedChapter, setSelectedChapter] = useState<string>('all');
  const [selectedDifficulty, setSelectedDifficulty] = useState<DifficultyLevel | 'all'>('all');
  const [selectedStatus, setSelectedStatus] = useState<ExerciseStatus | 'all'>('all');
  const { katexRepairMode, toggleKatexRepairMode, onOpenKatexModal } = useKatexRepairContext();

  const [expandedCards, setExpandedCards] = useState<Record<string, boolean>>({});
  const [revealedHints, setRevealedHints] = useState<Record<string, number>>({});
  const [revealedSolutions, setRevealedSolutions] = useState<Record<string, boolean>>({});
  const [cloningId, setCloningId] = useState<string | null>(null);
  const [cloneError, setCloneError] = useState<string | null>(null);

  const chapters = Array.from(new Set(exercises.map(e => e.chapter))).filter(Boolean);

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
    setExpandedCards(prev => ({ ...prev, [id]: !(prev[id] ?? true) }));
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
    setCloneError(null);
    try {
      const cloned = (await generateSimilarExercise(exercise, 'td')) as TDExercise;
      onAddExercise(cloned);
      setExpandedCards(prev => ({ ...prev, [cloned.id]: true }));
    } catch (err: any) {
      const msg =
        err?.message === 'REQUIRE_USER_CONSENT'
          ? 'Impossible de cloner l’exercice : toutes les IA cloud ont échoué. Vérifiez « Logs IA » ou vos clés relais.'
          : err?.message || 'Erreur lors de la génération de l’exercice similaire.';
      setCloneError(msg);
    } finally {
      setCloningId(null);
    }
  };

  return (
    <div className="space-y-6 animate-tab-enter">
      {/* Search & Filters */}
      <div className="bg-[#0A0E19] border border-white/[0.08] rounded-2xl p-4 sm:p-5 space-y-4">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              aria-label="Rechercher un exercice de TD"
              placeholder="Rechercher par titre, notion, mot-clé, énoncé..."
              className="w-full rounded-xl bg-[#04060C] border border-white/[0.1] pl-10 pr-4 py-2 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-amber-400/60 transition-colors"
            />
          </div>

          {chapters.length > 0 && (
            <div className="sm:w-64">
              <select
                value={selectedChapter}
                onChange={e => setSelectedChapter(e.target.value)}
                aria-label="Filtrer par chapitre"
                className="w-full rounded-xl bg-[#04060C] border border-white/[0.1] px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-amber-400/60 cursor-pointer"
              >
                <option value="all">Tous les chapitres ({exercises.length})</option>
                {chapters.map(ch => (
                  <option key={ch} value={ch}>
                    {ch}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-white/[0.06]">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-xs text-slate-400 font-medium mr-1">Difficulté :</span>
            {(['all', 1, 2, 3] as const).map(diff => (
              <button
                key={diff}
                type="button"
                onClick={() => setSelectedDifficulty(diff)}
                className={`px-3 py-1 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap ${
                  selectedDifficulty === diff
                    ? 'bg-amber-500 text-[#04060C]'
                    : 'bg-[#04060C] text-slate-300 hover:text-white border border-white/[0.08]'
                }`}
              >
                {diff === 'all' && 'Toutes'}
                {diff === 1 && 'Niveau 1'}
                {diff === 2 && 'Niveau 2'}
                {diff === 3 && 'Niveau 3 · ESTACA'}
              </button>
            ))}
          </div>

          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-xs text-slate-400 font-medium mr-1">Statut :</span>
            {(['all', 'todo', 'in_progress', 'completed'] as const).map(st => (
              <button
                key={st}
                type="button"
                onClick={() => setSelectedStatus(st)}
                className={`px-3 py-1 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap ${
                  selectedStatus === st
                    ? 'bg-sky-500 text-[#04060C]'
                    : 'bg-[#04060C] text-slate-300 hover:text-white border border-white/[0.08]'
                }`}
              >
                {st === 'all' && 'Tous'}
                {st === 'todo' && 'À faire'}
                {st === 'in_progress' && 'En cours'}
                {st === 'completed' && 'Résolu'}
              </button>
            ))}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              role="switch"
              aria-checked={katexRepairMode}
              onClick={toggleKatexRepairMode}
              aria-label="Interrupteur mode ciblage et réparation KaTeX"
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap border cursor-pointer ${
                katexRepairMode
                  ? 'bg-amber-500/18 text-amber-200 border-amber-400/55'
                  : 'bg-[#04060C] text-slate-300 border-white/[0.1] hover:border-amber-400/40'
              }`}
            >
              <span
                aria-hidden="true"
                className={`relative inline-flex h-4 w-7 items-center rounded-full transition-colors ${
                  katexRepairMode ? 'bg-amber-500' : 'bg-slate-700'
                }`}
              >
                <span
                  className={`inline-block h-3 w-3 transform rounded-full bg-white shadow transition-transform ${
                    katexRepairMode ? 'translate-x-3.5' : 'translate-x-0.5'
                  }`}
                />
              </span>
              <span>Mode KaTeX</span>
            </button>

            {katexRepairMode && (
              <button
                type="button"
                onClick={() => onOpenKatexModal('')}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 border border-amber-300 text-[#04060C] text-xs font-bold transition-colors whitespace-nowrap cursor-pointer animate-fade-in"
                title="Cliquez sur n'importe quelle formule ou ouvrez le réparateur KaTeX"
              >
                <Wand2 className="w-3.5 h-3.5" />
                <span>Cibler / Réparer</span>
              </button>
            )}

            {onOpenPracticeBatch && (
              <button
                type="button"
                onClick={onOpenPracticeBatch}
                className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-sky-500 hover:bg-sky-400 text-[#04060C] text-xs font-bold transition-colors whitespace-nowrap cursor-pointer"
              >
                <Zap className="w-3.5 h-3.5" />
                <span>Générer pack d&apos;exercices IA</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {cloneError && (
        <div className="p-3.5 rounded-xl bg-rose-950/35 border border-rose-500/40 text-rose-200 text-xs flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
            <span>{cloneError}</span>
          </div>
          <button
            type="button"
            onClick={() => setCloneError(null)}
            aria-label="Fermer le message d'erreur"
            className="p-1 rounded hover:bg-white/[0.08]"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Exercise Cards */}
      {filteredExercises.length === 0 ? (
        <div className="py-16 text-center text-slate-400 bg-[#0A0E19]/70 rounded-2xl border border-white/[0.08]">
          <BookOpen className="w-10 h-10 mx-auto opacity-40 text-amber-400 mb-3" />
          <p className="text-sm font-medium text-slate-200">Aucun exercice de TD ne correspond à vos filtres.</p>
          <p className="text-xs text-slate-400 mt-1">
            Utilisez « Ingérer PDF » en haut pour importer une feuille de TD complète.
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
              <article
                key={exercise.id}
                data-katex-repair-scope="true"
                data-scope-type="td"
                data-scope-id={exercise.id}
                data-katex-select-mode={katexRepairMode ? 'true' : 'false'}
                className="bg-[#0A0E19] border border-white/[0.08] rounded-2xl overflow-hidden card-hover-cosmos hover:border-white/[0.15]"
              >
                <div className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-[#0D1322]/60 border-b border-white/[0.06]">
                  <button
                    type="button"
                    onClick={() => toggleCard(exercise.id)}
                    aria-expanded={isExpanded}
                    className="flex-1 text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 rounded-lg"
                  >
                    <div className="flex flex-wrap items-center gap-2 text-xs text-slate-400 mb-1">
                      <span className="text-sky-300 font-medium">{exercise.chapter}</span>
                      <span aria-hidden="true">·</span>
                      <span>{exercise.notion}</span>
                      <span aria-hidden="true">·</span>
                      <span
                        className={`font-mono font-semibold ${
                          exercise.difficulty === 3
                            ? 'text-amber-300'
                            : exercise.difficulty === 2
                            ? 'text-sky-300'
                            : 'text-emerald-300'
                        }`}
                      >
                        Niveau {exercise.difficulty}/3
                      </span>
                    </div>

                    <h3 className="font-display text-base font-semibold text-slate-100 hover:text-amber-200 transition-colors">
                      {exercise.title}
                    </h3>
                  </button>

                  <div className="flex items-center gap-2 shrink-0">
                    <div className="flex items-center rounded-xl bg-[#04060C] border border-white/[0.08] p-1">
                      <button
                        type="button"
                        onClick={() => handleStatusChange(exercise, 'todo')}
                        className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-colors whitespace-nowrap ${
                          exercise.status === 'todo'
                            ? 'bg-amber-500/20 text-amber-300 border border-amber-400/30'
                            : 'text-slate-400 hover:text-slate-100'
                        }`}
                      >
                        À faire
                      </button>
                      <button
                        type="button"
                        onClick={() => handleStatusChange(exercise, 'in_progress')}
                        className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-colors whitespace-nowrap ${
                          exercise.status === 'in_progress'
                            ? 'bg-sky-500/20 text-sky-300 border border-sky-400/30'
                            : 'text-slate-400 hover:text-slate-100'
                        }`}
                      >
                        En cours
                      </button>
                      <button
                        type="button"
                        onClick={() => handleStatusChange(exercise, 'completed')}
                        className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-colors whitespace-nowrap ${
                          exercise.status === 'completed'
                            ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-400/30'
                            : 'text-slate-400 hover:text-slate-100'
                        }`}
                      >
                        Résolu
                      </button>
                    </div>

                    <button
                      type="button"
                      onClick={() => toggleCard(exercise.id)}
                      aria-label={isExpanded ? `Replier ${exercise.title}` : `Déplier ${exercise.title}`}
                      className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-white/[0.06]"
                    >
                      {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {isExpanded && (
                  <div className="p-5 space-y-4">
                    <div className="text-xs text-slate-200 leading-relaxed bg-[#04060C] p-4 rounded-xl border border-white/[0.07] whitespace-pre-wrap select-text">
                      <MathView
                        math={exercise.statement}
                        onOpenRepair={snippet => {
                          onSelectKatexForRepair?.(snippet, 'td', exercise.id);
                        }}
                      />
                    </div>

                    {hintCount > 0 && (
                      <div className="space-y-2">
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-xs font-semibold text-amber-300 flex items-center gap-1.5">
                            <HelpCircle className="w-4 h-4 text-amber-400" />
                            <span>
                              Indices de recherche ({currentHintStep} / {hintCount})
                            </span>
                          </span>

                          {currentHintStep < hintCount && (
                            <button
                              type="button"
                              onClick={() => handleRevealNextHint(exercise.id, hintCount)}
                              className="px-3 py-1.5 rounded-lg bg-amber-500/15 hover:bg-amber-500/25 border border-amber-400/30 text-amber-200 text-xs font-semibold transition-colors"
                            >
                              Révéler l'indice {currentHintStep + 1}
                            </button>
                          )}
                        </div>

                        {currentHintStep > 0 && (
                          <div className="space-y-2 animate-fade-in">
                            {exercise.hints.slice(0, currentHintStep).map((hint, hIdx) => (
                              <div
                                key={hIdx}
                                className="p-3 rounded-xl bg-[#04060C] border border-amber-400/25 text-xs text-amber-100/90 flex items-start gap-2.5"
                              >
                                <span className="font-bold text-amber-400 font-mono">0{hIdx + 1}</span>
                                <div className="flex-1 leading-relaxed">
                                  <MathView
                                    math={hint}
                                    onOpenRepair={snippet => {
                                      onSelectKatexForRepair?.(snippet, 'td', exercise.id);
                                    }}
                                  />
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}

                    <div className="pt-2 border-t border-white/[0.06]">
                      <button
                        type="button"
                        onClick={() => toggleSolution(exercise.id)}
                        className={`w-full py-2.5 px-4 rounded-xl border text-xs font-semibold transition-colors flex items-center justify-center gap-2 ${
                          isSolutionVisible
                            ? 'bg-[#101625] border-white/[0.15] text-slate-100'
                            : 'bg-[#04060C] hover:bg-[#101625] border-emerald-400/30 text-emerald-300'
                        }`}
                      >
                        <CheckCircle className="w-4 h-4 text-emerald-400" />
                        <span>
                          {isSolutionVisible
                            ? 'Masquer la correction détaillée'
                            : 'Révéler la correction détaillée pas à pas'}
                        </span>
                      </button>

                      {isSolutionVisible && (
                        <div className="mt-3 p-4 rounded-xl bg-[#04060C] border border-emerald-400/25 text-xs text-slate-200 space-y-2 whitespace-pre-wrap select-text animate-fade-in leading-relaxed">
                          <MathView
                            math={exercise.solution}
                            onOpenRepair={snippet => {
                              onSelectKatexForRepair?.(snippet, 'td', exercise.id);
                            }}
                          />
                        </div>
                      )}
                    </div>

                    <div className="pt-3 border-t border-white/[0.06] flex items-center justify-between gap-2">
                      <button
                        type="button"
                        onClick={() => handleCloneExercise(exercise)}
                        disabled={isCloningThis}
                        className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-[#101625] hover:bg-[#172036] text-amber-200 border border-amber-400/30 text-xs font-semibold transition-colors disabled:opacity-50"
                      >
                        {isCloningThis ? (
                          <>
                            <Loader2 className="w-3.5 h-3.5 animate-spin text-amber-400" />
                            <span>Génération en cours...</span>
                          </>
                        ) : (
                          <>
                            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                            <span>Générer un exercice similaire via IA</span>
                          </>
                        )}
                      </button>

                      <button
                        type="button"
                        onClick={() => onDeleteExercise(exercise.id)}
                        aria-label={`Supprimer ${exercise.title}`}
                        title="Supprimer cet exercice"
                        className="p-2 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-white/[0.05] transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                )}
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
};
