import React, { useState } from 'react';
import { 
  Search, 
  GraduationCap, 
  Clock, 
  Sparkles, 
  ChevronDown, 
  ChevronUp, 
  CheckCircle, 
  HelpCircle, 
  Award, 
  Loader2, 
  Trash2, 
  Star, 
  Play 
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

  // État des cartes
  const [expandedCards, setExpandedCards] = useState<Record<string, boolean>>({});
  const [revealedHints, setRevealedHints] = useState<Record<string, number>>({});
  const [revealedSolutions, setRevealedSolutions] = useState<Record<string, boolean>>({});
  const [cloningId, setCloningId] = useState<string | null>(null);

  // État du chronomètre d'examen
  const [activeTimerAnnale, setActiveTimerAnnale] = useState<AnnaleItem | null>(null);

  // Extraire les années et sessions uniques
  const years = Array.from(new Set(annales.map(a => a.year))).sort((a, b) => b - a);
  const sessions = Array.from(new Set(annales.map(a => a.session))).filter(Boolean);

  // Filtrage
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
      {/* Modale Chronomètre d'Examen Flottante */}
      {activeTimerAnnale && (
        <ExamTimerModal
          initialMinutes={activeTimerAnnale.durationMinutes || 120}
          examTitle={activeTimerAnnale.title}
          isOpen={true}
          onClose={() => setActiveTimerAnnale(null)}
        />
      )}

      {/* Barre de Recherche & Filtres Avancés */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 sm:p-5 shadow-xl space-y-3.5">
        <div className="flex flex-col sm:flex-row gap-3">
          {/* Recherche */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Rechercher une annale, session, mot-clé, théorème..."
              className="w-full rounded-xl bg-slate-950/80 border border-slate-800 pl-10 pr-4 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-colors"
            />
          </div>

          {/* Filtres Année & Session */}
          <div className="flex gap-2 sm:w-auto">
            {years.length > 0 && (
              <select
                value={selectedYear}
                onChange={e => setSelectedYear(e.target.value === 'all' ? 'all' : Number(e.target.value))}
                className="rounded-xl bg-slate-950/80 border border-slate-800 px-3 py-2 text-xs text-slate-300 focus:outline-none focus:border-indigo-500 cursor-pointer"
              >
                <option value="all">Toutes les années</option>
                {years.map(yr => (
                  <option key={yr} value={yr}>{yr}</option>
                ))}
              </select>
            )}

            {sessions.length > 0 && (
              <select
                value={selectedSession}
                onChange={e => setSelectedSession(e.target.value)}
                className="rounded-xl bg-slate-950/80 border border-slate-800 px-3 py-2 text-xs text-slate-300 focus:outline-none focus:border-indigo-500 cursor-pointer"
              >
                <option value="all">Toutes les sessions</option>
                {sessions.map(s => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            )}
          </div>
        </div>

        {/* Pastilles Statut & Difficulté */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-slate-800/60">
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
                {diff === 3 && '3 • Examen Officiel ⭐'}
              </button>
            ))}
          </div>

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
                {st === 'completed' && 'Corrigé ✓'}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Liste des Annales */}
      {filteredAnnales.length === 0 ? (
        <div className="py-16 text-center text-slate-500 bg-slate-900/40 rounded-2xl border border-slate-800">
          <GraduationCap className="w-10 h-10 mx-auto opacity-30 text-slate-400 mb-2" />
          <p className="text-sm">Aucune annale d'examen ne correspond à vos filtres.</p>
          <p className="text-xs text-slate-600 mt-1">
            Importez des sujets d'annales ESTACA via le bouton d'ingestion en haut.
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
              <div
                key={annale.id}
                className="bg-slate-900 border border-slate-800 rounded-2xl shadow-xl overflow-hidden transition-all hover:border-indigo-900/60"
              >
                {/* Header de la carte d'annale */}
                <div className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-950/40 border-b border-slate-800/80">
                  <div className="flex-1 cursor-pointer" onClick={() => toggleCard(annale.id)}>
                    <div className="flex flex-wrap items-center gap-2 mb-1.5">
                      <span className="text-[11px] font-bold px-2 py-0.5 rounded-md bg-purple-500/15 text-purple-300 border border-purple-500/30">
                        {annale.session} • {annale.year}
                      </span>
                      <span className="text-[11px] font-medium px-2 py-0.5 rounded-md bg-slate-800 text-slate-300 flex items-center gap-1">
                        <Clock className="w-3 h-3 text-indigo-400" />
                        {annale.durationMinutes} min
                      </span>
                      <span className="text-[11px] font-bold px-2 py-0.5 rounded-md bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
                        {annale.points} points
                      </span>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-amber-500/15 text-amber-300 flex items-center gap-1">
                        <Star className="w-3 h-3 fill-current" />
                        Niveau {annale.difficulty}
                      </span>
                    </div>

                    <h3 className="text-base font-bold text-white hover:text-indigo-300 transition-colors">
                      {annale.title}
                    </h3>
                  </div>

                  {/* Bouton Mode Examen (Chronomètre) & Contrôles */}
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      onClick={() => setActiveTimerAnnale(annale)}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gradient-to-r from-indigo-600 to-indigo-500 hover:from-indigo-500 hover:to-indigo-400 text-white text-xs font-bold shadow-md shadow-indigo-600/25 active:scale-95 transition-all"
                      title="Lancer le chronomètre en conditions réelles"
                    >
                      <Play className="w-3.5 h-3.5 fill-current" />
                      <span>Mode Examen ({annale.durationMinutes} min)</span>
                    </button>

                    <div className="flex items-center rounded-xl bg-slate-950 border border-slate-800 p-1">
                      <button
                        onClick={() => handleStatusChange(annale, 'todo')}
                        className={`px-2 py-1 rounded-lg text-[10px] font-semibold transition-colors ${
                          annale.status === 'todo' ? 'bg-amber-600 text-white' : 'text-slate-400 hover:text-slate-200'
                        }`}
                      >
                        À faire
                      </button>
                      <button
                        onClick={() => handleStatusChange(annale, 'in_progress')}
                        className={`px-2 py-1 rounded-lg text-[10px] font-semibold transition-colors ${
                          annale.status === 'in_progress' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-slate-200'
                        }`}
                      >
                        En cours
                      </button>
                      <button
                        onClick={() => handleStatusChange(annale, 'completed')}
                        className={`px-2 py-1 rounded-lg text-[10px] font-semibold transition-colors ${
                          annale.status === 'completed' ? 'bg-emerald-600 text-white' : 'text-slate-400 hover:text-slate-200'
                        }`}
                      >
                        Corrigé ✓
                      </button>
                    </div>

                    <button
                      onClick={() => toggleCard(annale.id)}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
                    >
                      {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {/* Contenu Déplié de l'Annale */}
                {isExpanded && (
                  <div className="p-5 space-y-4">
                    {/* Énoncé du sujet d'examen */}
                    <div className="text-xs text-slate-200 leading-relaxed bg-slate-950/70 p-4 rounded-xl border border-slate-800/80 whitespace-pre-wrap select-text font-sans">
                      <MathView math={annale.statement} />
                    </div>

                    {/* Barème Officiel ESTACA */}
                    {annale.gradingCriteria && annale.gradingCriteria.length > 0 && (
                      <div className="p-4 rounded-xl bg-indigo-950/30 border border-indigo-900/40 space-y-2">
                        <div className="flex items-center gap-2 text-indigo-300 font-bold text-xs">
                          <Award className="w-4 h-4 text-indigo-400" />
                          <span>Barème Officiel de Correction & Critères d'Évaluation :</span>
                        </div>
                        <ul className="space-y-1 text-xs text-indigo-200/90 pl-2">
                          {annale.gradingCriteria.map((crit, cIdx) => (
                            <li key={cIdx} className="flex items-start gap-2">
                              <span className="text-indigo-400 font-bold">🎯</span>
                              <MathView>{crit}</MathView>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {/* Indices progressifs */}
                    {hintCount > 0 && (
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-amber-400 flex items-center gap-1.5">
                            <HelpCircle className="w-4 h-4" />
                            Indices ({currentHintStep} / {hintCount})
                          </span>

                          {currentHintStep < hintCount && (
                            <button
                              onClick={() => handleRevealNextHint(annale.id, hintCount)}
                              className="px-3 py-1 rounded-lg bg-amber-950/60 hover:bg-amber-900 border border-amber-800/60 text-amber-300 text-xs font-semibold transition-colors"
                            >
                              Révéler l'indice {currentHintStep + 1}
                            </button>
                          )}
                        </div>

                        {currentHintStep > 0 && (
                          <div className="space-y-1.5 animate-fade-in">
                            {annale.hints.slice(0, currentHintStep).map((hint, hIdx) => (
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

                    {/* Correction détaillée pas à pas */}
                    <div className="pt-2 border-t border-slate-800/60">
                      <button
                        onClick={() => toggleSolution(annale.id)}
                        className={`w-full py-2.5 rounded-xl border text-xs font-bold transition-all flex items-center justify-center gap-2 ${
                          isSolutionVisible
                            ? 'bg-slate-800 border-slate-700 text-white'
                            : 'bg-indigo-950/50 hover:bg-indigo-900/60 border-indigo-800/50 text-indigo-300'
                        }`}
                      >
                        <CheckCircle className="w-4 h-4 text-emerald-400" />
                        <span>{isSolutionVisible ? 'Masquer le corrigé officiel' : 'Révéler le corrigé officiel pas à pas'}</span>
                      </button>

                      {isSolutionVisible && (
                        <div className="mt-3 p-4 rounded-xl bg-slate-950 border border-emerald-900/30 text-xs text-slate-200 space-y-2 whitespace-pre-wrap font-sans select-text animate-fade-in">
                          <MathView math={annale.solution} />
                        </div>
                      )}
                    </div>

                    {/* Footer : Générer une annale clone via IA */}
                    <div className="pt-3 border-t border-slate-800/60 flex items-center justify-between">
                      <button
                        onClick={() => handleCloneAnnale(annale)}
                        disabled={isCloningThis}
                        className="flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 border border-indigo-500/30 text-xs font-semibold transition-all active:scale-95 disabled:opacity-50"
                      >
                        {isCloningThis ? (
                          <>
                            <Loader2 className="w-3.5 h-3.5 animate-spin text-indigo-400" />
                            <span>Génération d'un sujet clone IA...</span>
                          </>
                        ) : (
                          <>
                            <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
                            <span>Générer une annale similaire via IA</span>
                          </>
                        )}
                      </button>

                      <button
                        onClick={() => onDeleteAnnale(annale.id)}
                        className="p-1.5 rounded-lg text-slate-500 hover:text-red-400 transition-colors"
                        title="Supprimer cette annale"
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
