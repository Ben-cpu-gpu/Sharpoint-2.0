import React, { useState } from 'react';
import {
  Search,
  GraduationCap,
  Sparkles,
  ChevronDown,
  ChevronUp,
  CheckCircle,
  HelpCircle,
  Award,
  Loader2,
  Trash2,
  Play,
} from 'lucide-react';
import { AnnaleItem, ExerciseStatus, DifficultyLevel } from '../../types/course';
import { MathView } from '../common/MathView';
import { generateSimilarExercise } from '../../services/aiService';
import { ExamTimerModal } from './ExamTimerModal';

interface AnnalesSectionProps {
  annales: AnnaleItem[];
  selectedSubjectId: string | 'all';
  onUpdateAnnale: (annale: AnnaleItem) => void;
  onAddAnnale: (annale: AnnaleItem) => void;
  onDeleteAnnale: (id: string) => void;
}

export const AnnalesSection: React.FC<AnnalesSectionProps> = ({
  annales,
  selectedSubjectId,
  onUpdateAnnale,
  onAddAnnale,
  onDeleteAnnale,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedYear, setSelectedYear] = useState<number | 'all'>('all');
  const [selectedSession, setSelectedSession] = useState<string>('all');
  const [selectedDifficulty, setSelectedDifficulty] = useState<DifficultyLevel | 'all'>('all');
  const [selectedStatus, setSelectedStatus] = useState<ExerciseStatus | 'all'>('all');

  const [expandedCards, setExpandedCards] = useState<Record<string, boolean>>({});
  const [revealedHints, setRevealedHints] = useState<Record<string, number>>({});
  const [revealedSolutions, setRevealedSolutions] = useState<Record<string, boolean>>({});
  const [cloningId, setCloningId] = useState<string | null>(null);
  const [activeTimerAnnale, setActiveTimerAnnale] = useState<AnnaleItem | null>(null);

  const years = Array.from(new Set(annales.map(a => a.year))).sort((a, b) => b - a);
  const sessions = Array.from(new Set(annales.map(a => a.session))).filter(Boolean);

  const filteredAnnales = annales.filter(a => {
    if (selectedSubjectId !== 'all' && a.subjectId !== selectedSubjectId) return false;
    if (selectedYear !== 'all' && a.year !== selectedYear) return false;
    if (selectedSession !== 'all' && a.session !== selectedSession) return false;
    if (selectedDifficulty !== 'all' && a.difficulty !== selectedDifficulty) return false;
    if (selectedStatus !== 'all' && a.status !== selectedStatus) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return (
        a.title.toLowerCase().includes(q) ||
        a.notion.toLowerCase().includes(q) ||
        a.statement.toLowerCase().includes(q)
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

  const handleStatusChange = (annale: AnnaleItem, status: ExerciseStatus) => {
    onUpdateAnnale({ ...annale, status });
  };

  const handleCloneAnnale = async (annale: AnnaleItem) => {
    setCloningId(annale.id);
    try {
      const cloned = (await generateSimilarExercise(annale, 'annale')) as AnnaleItem;
      onAddAnnale(cloned);
      setExpandedCards(prev => ({ ...prev, [cloned.id]: true }));
    } catch (err) {
      console.error('Erreur clonage Annale IA', err);
    } finally {
      setCloningId(null);
    }
  };

  return (
    <div className="space-y-6">
      {activeTimerAnnale && (
        <ExamTimerModal
          initialMinutes={activeTimerAnnale.durationMinutes || 120}
          examTitle={activeTimerAnnale.title}
          isOpen={true}
          onClose={() => setActiveTimerAnnale(null)}
        />
      )}

      {/* Search & Filters */}
      <div className="bg-[#0A0E19] border border-white/[0.08] rounded-2xl p-4 sm:p-5 space-y-4">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              aria-label="Rechercher une annale d'examen"
              placeholder="Rechercher une annale, session, mot-clé, théorème..."
              className="w-full rounded-xl bg-[#04060C] border border-white/[0.1] pl-10 pr-4 py-2 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-amber-400/60 transition-colors"
            />
          </div>

          <div className="flex gap-2 sm:w-auto">
            {years.length > 0 && (
              <select
                value={selectedYear}
                onChange={e => setSelectedYear(e.target.value === 'all' ? 'all' : Number(e.target.value))}
                aria-label="Filtrer par année"
                className="rounded-xl bg-[#04060C] border border-white/[0.1] px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-amber-400/60 cursor-pointer"
              >
                <option value="all">Toutes les années</option>
                {years.map(yr => (
                  <option key={yr} value={yr}>
                    {yr}
                  </option>
                ))}
              </select>
            )}

            {sessions.length > 0 && (
              <select
                value={selectedSession}
                onChange={e => setSelectedSession(e.target.value)}
                aria-label="Filtrer par session"
                className="rounded-xl bg-[#04060C] border border-white/[0.1] px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-amber-400/60 cursor-pointer"
              >
                <option value="all">Toutes les sessions</option>
                {sessions.map(s => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            )}
          </div>
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
                {diff === 3 && 'Examen Officiel'}
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
                {st === 'completed' && 'Corrigé'}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Annales List */}
      {filteredAnnales.length === 0 ? (
        <div className="py-16 text-center text-slate-400 bg-[#0A0E19]/70 rounded-2xl border border-white/[0.08]">
          <GraduationCap className="w-10 h-10 mx-auto opacity-40 text-amber-400 mb-3" />
          <p className="text-sm font-medium text-slate-200">Aucune annale d'examen ne correspond à vos filtres.</p>
          <p className="text-xs text-slate-400 mt-1">
            Importez des sujets d'annales ESTACA via « Ingérer PDF » en haut.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredAnnales.map(annale => {
            const isExpanded = expandedCards[annale.id] ?? true;
            const hintCount = annale.hints.length;
            const currentHintStep = revealedHints[annale.id] || 0;
            const isSolutionVisible = revealedSolutions[annale.id] || false;
            const isCloningThis = cloningId === annale.id;

            return (
              <article
                key={annale.id}
                className="bg-[#0A0E19] border border-white/[0.08] rounded-2xl overflow-hidden transition-colors hover:border-white/[0.15]"
              >
                <div className="p-5 flex flex-col lg:flex-row lg:items-center justify-between gap-3 bg-[#0D1322]/60 border-b border-white/[0.06]">
                  <button
                    type="button"
                    onClick={() => toggleCard(annale.id)}
                    aria-expanded={isExpanded}
                    className="flex-1 text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 rounded-lg"
                  >
                    <div className="flex flex-wrap items-center gap-2 text-xs text-slate-400 mb-1">
                      <span className="text-amber-300 font-medium">
                        {annale.session} · {annale.year}
                      </span>
                      <span aria-hidden="true">·</span>
                      <span className="font-mono text-sky-300">{annale.durationMinutes} min</span>
                      <span aria-hidden="true">·</span>
                      <span className="font-mono text-emerald-300">{annale.points} pts</span>
                      <span aria-hidden="true">·</span>
                      <span className="font-mono">Niveau {annale.difficulty}</span>
                    </div>

                    <h3 className="font-display text-base font-semibold text-slate-100 hover:text-amber-200 transition-colors">
                      {annale.title}
                    </h3>
                  </button>

                  <div className="flex flex-wrap items-center gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={() => setActiveTimerAnnale(annale)}
                      className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-[#04060C] text-xs font-bold transition-colors whitespace-nowrap"
                      title="Lancer le chronomètre en conditions réelles"
                    >
                      <Play className="w-3.5 h-3.5 fill-current" />
                      <span>Mode Examen ({annale.durationMinutes} min)</span>
                    </button>

                    <div className="flex items-center rounded-xl bg-[#04060C] border border-white/[0.08] p-1">
                      <button
                        type="button"
                        onClick={() => handleStatusChange(annale, 'todo')}
                        className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-colors whitespace-nowrap ${
                          annale.status === 'todo'
                            ? 'bg-amber-500/20 text-amber-300 border border-amber-400/30'
                            : 'text-slate-400 hover:text-slate-100'
                        }`}
                      >
                        À faire
                      </button>
                      <button
                        type="button"
                        onClick={() => handleStatusChange(annale, 'in_progress')}
                        className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-colors whitespace-nowrap ${
                          annale.status === 'in_progress'
                            ? 'bg-sky-500/20 text-sky-300 border border-sky-400/30'
                            : 'text-slate-400 hover:text-slate-100'
                        }`}
                      >
                        En cours
                      </button>
                      <button
                        type="button"
                        onClick={() => handleStatusChange(annale, 'completed')}
                        className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-colors whitespace-nowrap ${
                          annale.status === 'completed'
                            ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-400/30'
                            : 'text-slate-400 hover:text-slate-100'
                        }`}
                      >
                        Corrigé
                      </button>
                    </div>

                    <button
                      type="button"
                      onClick={() => toggleCard(annale.id)}
                      aria-label={isExpanded ? `Replier ${annale.title}` : `Déplier ${annale.title}`}
                      className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-white/[0.06]"
                    >
                      {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {isExpanded && (
                  <div className="p-5 space-y-4">
                    <div className="text-xs text-slate-200 leading-relaxed bg-[#04060C] p-4 rounded-xl border border-white/[0.07] whitespace-pre-wrap select-text">
                      <MathView math={annale.statement} />
                    </div>

                    {annale.gradingCriteria && annale.gradingCriteria.length > 0 && (
                      <div className="p-4 rounded-xl bg-[#04060C] border border-sky-400/25 space-y-2">
                        <div className="flex items-center gap-2 text-sky-300 font-semibold text-xs">
                          <Award className="w-4 h-4 text-sky-400" />
                          <span>Barème Officiel & Critères d'Évaluation</span>
                        </div>
                        <ul className="space-y-1.5 text-xs text-slate-200 pl-1">
                          {annale.gradingCriteria.map((crit, cIdx) => (
                            <li key={cIdx} className="flex items-start gap-2.5 leading-relaxed">
                              <span className="font-mono text-sky-400">0{cIdx + 1}</span>
                              <MathView>{crit}</MathView>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {hintCount > 0 && (
                      <div className="space-y-2">
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-xs font-semibold text-amber-300 flex items-center gap-1.5">
                            <HelpCircle className="w-4 h-4 text-amber-400" />
                            <span>
                              Indices ({currentHintStep} / {hintCount})
                            </span>
                          </span>

                          {currentHintStep < hintCount && (
                            <button
                              type="button"
                              onClick={() => handleRevealNextHint(annale.id, hintCount)}
                              className="px-3 py-1.5 rounded-lg bg-amber-500/15 hover:bg-amber-500/25 border border-amber-400/30 text-amber-200 text-xs font-semibold transition-colors"
                            >
                              Révéler l'indice {currentHintStep + 1}
                            </button>
                          )}
                        </div>

                        {currentHintStep > 0 && (
                          <div className="space-y-2 animate-fade-in">
                            {annale.hints.slice(0, currentHintStep).map((hint, hIdx) => (
                              <div
                                key={hIdx}
                                className="p-3 rounded-xl bg-[#04060C] border border-amber-400/25 text-xs text-amber-100/90 flex items-start gap-2.5"
                              >
                                <span className="font-bold text-amber-400 font-mono">0{hIdx + 1}</span>
                                <div className="flex-1 leading-relaxed">
                                  <MathView math={hint} />
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
                        onClick={() => toggleSolution(annale.id)}
                        className={`w-full py-2.5 px-4 rounded-xl border text-xs font-semibold transition-colors flex items-center justify-center gap-2 ${
                          isSolutionVisible
                            ? 'bg-[#101625] border-white/[0.15] text-slate-100'
                            : 'bg-[#04060C] hover:bg-[#101625] border-emerald-400/30 text-emerald-300'
                        }`}
                      >
                        <CheckCircle className="w-4 h-4 text-emerald-400" />
                        <span>
                          {isSolutionVisible ? 'Masquer le corrigé officiel' : 'Révéler le corrigé officiel pas à pas'}
                        </span>
                      </button>

                      {isSolutionVisible && (
                        <div className="mt-3 p-4 rounded-xl bg-[#04060C] border border-emerald-400/25 text-xs text-slate-200 space-y-2 whitespace-pre-wrap select-text animate-fade-in leading-relaxed">
                          <MathView math={annale.solution} />
                        </div>
                      )}
                    </div>

                    <div className="pt-3 border-t border-white/[0.06] flex items-center justify-between gap-2">
                      <button
                        type="button"
                        onClick={() => handleCloneAnnale(annale)}
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
                            <span>Générer une annale similaire via IA</span>
                          </>
                        )}
                      </button>

                      <button
                        type="button"
                        onClick={() => onDeleteAnnale(annale.id)}
                        aria-label={`Supprimer ${annale.title}`}
                        title="Supprimer cette annale"
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
