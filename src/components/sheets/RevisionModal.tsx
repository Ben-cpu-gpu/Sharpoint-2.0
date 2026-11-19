import React, { useState, useEffect } from 'react';
import {
  X,
  BrainCircuit,
  GraduationCap,
  RotateCw,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  ArrowLeft,
  Trophy,
  Sparkles,
  Loader2,
} from 'lucide-react';
import { StudySheet, QuizQuestion } from '../../types/course';
import { MathView } from '../common/MathView';
import { generateQuiz } from '../../services/aiService';

interface RevisionModalProps {
  sheet: StudySheet;
  initialMode?: 'flashcards' | 'quiz';
  isOpen: boolean;
  onClose: () => void;
  onUpdateQuiz?: (newQuiz: QuizQuestion[]) => void;
}

export const RevisionModal: React.FC<RevisionModalProps> = ({
  sheet,
  initialMode = 'flashcards',
  isOpen,
  onClose,
  onUpdateQuiz,
}) => {
  const [mode, setMode] = useState<'flashcards' | 'quiz'>(initialMode);

  const [currentFcIndex, setCurrentFcIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [masteredCards, setMasteredCards] = useState<Set<string>>(new Set());

  const [quizQuestions, setQuizQuestions] = useState<QuizQuestion[]>(sheet.quiz);
  const [currentQzIndex, setCurrentQzIndex] = useState(0);
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [isAnswerSubmitted, setIsAnswerSubmitted] = useState(false);
  const [score, setScore] = useState(0);
  const [quizCompleted, setQuizCompleted] = useState(false);
  const [isGeneratingMoreQuiz, setIsGeneratingMoreQuiz] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setMode(initialMode);
      setQuizQuestions(sheet.quiz);
      setCurrentFcIndex(0);
      setIsFlipped(false);
      setCurrentQzIndex(0);
      setSelectedOption(null);
      setIsAnswerSubmitted(false);
      setScore(0);
      setQuizCompleted(false);
    }
  }, [isOpen, initialMode, sheet]);

  if (!isOpen) return null;

  const flashcards = sheet.flashcards;
  const currentFc = flashcards[currentFcIndex];

  const handleNextFc = () => {
    setIsFlipped(false);
    if (currentFcIndex < flashcards.length - 1) {
      setCurrentFcIndex(currentFcIndex + 1);
    }
  };

  const handlePrevFc = () => {
    setIsFlipped(false);
    if (currentFcIndex > 0) {
      setCurrentFcIndex(currentFcIndex - 1);
    }
  };

  const handleToggleMastered = (id: string) => {
    const nextSet = new Set(masteredCards);
    if (nextSet.has(id)) {
      nextSet.delete(id);
    } else {
      nextSet.add(id);
    }
    setMasteredCards(nextSet);
    handleNextFc();
  };

  const currentQz = quizQuestions[currentQzIndex];

  const handleSelectOption = (idx: number) => {
    if (isAnswerSubmitted) return;
    setSelectedOption(idx);
    setIsAnswerSubmitted(true);
    if (idx === currentQz.correctIndex) {
      setScore(prev => prev + 1);
    }
  };

  const handleNextQuizQuestion = () => {
    if (currentQzIndex < quizQuestions.length - 1) {
      setCurrentQzIndex(currentQzIndex + 1);
      setSelectedOption(null);
      setIsAnswerSubmitted(false);
    } else {
      setQuizCompleted(true);
    }
  };

  const handleResetQuiz = () => {
    setCurrentQzIndex(0);
    setSelectedOption(null);
    setIsAnswerSubmitted(false);
    setScore(0);
    setQuizCompleted(false);
  };

  const handleGenerateMoreQuiz = async () => {
    setIsGeneratingMoreQuiz(true);
    try {
      const context = `Titre: ${sheet.title}. Chapitre: ${sheet.chapter}. Théorèmes: ${sheet.theorems.map(t => t.name).join(', ')}`;
      const newQuestions = await generateQuiz(context);
      setQuizQuestions(newQuestions);
      if (onUpdateQuiz) onUpdateQuiz(newQuestions);
      handleResetQuiz();
    } catch (err) {
      console.error('Erreur génération quiz', err);
    } finally {
      setIsGeneratingMoreQuiz(false);
    }
  };

  const calculateScore20 = () => {
    if (quizQuestions.length === 0) return 0;
    return Math.round((score / quizQuestions.length) * 20 * 10) / 10;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in">
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Entraînement Flashcards et Quiz"
        className="relative w-full max-w-2xl bg-[#0A0E19] border border-white/[0.12] rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]"
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-white/[0.08] flex items-center justify-between bg-[#04060C]">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                setMode('flashcards');
                setIsFlipped(false);
              }}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-colors ${
                mode === 'flashcards'
                  ? 'bg-sky-500 text-[#04060C]'
                  : 'text-slate-400 hover:text-white hover:bg-white/[0.06]'
              }`}
            >
              <BrainCircuit className="w-4 h-4" />
              <span>Cartes Réflexes</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setMode('quiz');
                handleResetQuiz();
              }}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-colors ${
                mode === 'quiz'
                  ? 'bg-amber-500 text-[#04060C]'
                  : 'text-slate-400 hover:text-white hover:bg-white/[0.06]'
              }`}
            >
              <GraduationCap className="w-4 h-4" />
              <span>Quiz QCM Noté</span>
            </button>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Fermer la session de révision"
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/[0.06] transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* FLASHCARDS */}
        {mode === 'flashcards' && (
          <div className="p-6 flex-1 flex flex-col justify-between overflow-y-auto">
            {flashcards.length === 0 ? (
              <div className="py-12 text-center text-slate-400 text-sm">
                Aucune flashcard disponible pour cette fiche. Ajoutez-en depuis l'éditeur.
              </div>
            ) : (
              <>
                <div className="flex items-center justify-between text-xs text-slate-400 mb-3 font-mono">
                  <span className="font-semibold text-slate-200">
                    Carte {currentFcIndex + 1} / {flashcards.length}
                  </span>
                  <span className="text-emerald-400 font-medium">
                    {masteredCards.size} maîtrisée(s)
                  </span>
                </div>

                <div className="w-full bg-white/[0.08] h-1.5 rounded-full overflow-hidden mb-6">
                  <div
                    className="bg-sky-400 h-full transition-all duration-300"
                    style={{ width: `${((currentFcIndex + 1) / flashcards.length) * 100}%` }}
                  />
                </div>

                <button
                  type="button"
                  onClick={() => setIsFlipped(!isFlipped)}
                  className={`min-h-[260px] w-full text-left cursor-pointer rounded-2xl p-6 sm:p-8 flex flex-col justify-between border transition-colors select-none ${
                    isFlipped
                      ? 'bg-[#101625] border-amber-400/45'
                      : 'bg-[#04060C] border-white/[0.1] hover:border-sky-400/40'
                  }`}
                >
                  <div className="flex items-center justify-between text-xs font-semibold w-full">
                    <span className={isFlipped ? 'text-amber-300' : 'text-sky-300'}>
                      {isFlipped ? 'Réponse & Réflexe Clé' : 'Question de Réflexe'}
                    </span>
                    <span className="text-[11px] text-slate-400 flex items-center gap-1.5 font-normal">
                      <RotateCw className="w-3.5 h-3.5" />
                      <span>Cliquer pour retourner</span>
                    </span>
                  </div>

                  <div className="py-6 text-center w-full">
                    <div className="text-base sm:text-lg font-medium text-slate-100 leading-relaxed">
                      <MathView math={isFlipped ? currentFc?.answer : currentFc?.question} />
                    </div>
                  </div>

                  <div className="text-center text-[11px] text-slate-400 w-full font-mono">
                    {isFlipped ? 'Verso · Explication' : 'Recto · Auto-récitation'}
                  </div>
                </button>

                <div className="mt-6 flex flex-col sm:flex-row items-center justify-between gap-3">
                  <div className="flex items-center gap-2 w-full sm:w-auto">
                    <button
                      type="button"
                      onClick={handlePrevFc}
                      disabled={currentFcIndex === 0}
                      aria-label="Carte précédente"
                      className="flex-1 sm:flex-initial p-2.5 rounded-xl bg-[#04060C] hover:bg-[#101625] border border-white/[0.1] disabled:opacity-40 text-slate-200 transition-colors"
                    >
                      <ArrowLeft className="w-4 h-4 mx-auto" />
                    </button>
                    <button
                      type="button"
                      onClick={handleNextFc}
                      disabled={currentFcIndex === flashcards.length - 1}
                      aria-label="Carte suivante"
                      className="flex-1 sm:flex-initial p-2.5 rounded-xl bg-[#04060C] hover:bg-[#101625] border border-white/[0.1] disabled:opacity-40 text-slate-200 transition-colors"
                    >
                      <ArrowRight className="w-4 h-4 mx-auto" />
                    </button>
                  </div>

                  <div className="flex items-center gap-2 w-full sm:w-auto">
                    <button
                      type="button"
                      onClick={handleNextFc}
                      className="flex-1 sm:flex-initial px-4 py-2.5 rounded-xl bg-[#04060C] hover:bg-[#101625] border border-white/[0.1] text-slate-200 text-xs font-semibold transition-colors"
                    >
                      À revoir
                    </button>
                    <button
                      type="button"
                      onClick={() => handleToggleMastered(currentFc.id)}
                      className="flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-[#04060C] text-xs font-bold transition-colors"
                    >
                      <CheckCircle2 className="w-4 h-4" />
                      <span>{masteredCards.has(currentFc.id) ? 'Maîtrisée' : 'Marquer maîtrisée'}</span>
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        )}

        {/* QUIZ */}
        {mode === 'quiz' && (
          <div className="p-6 flex-1 flex flex-col justify-between overflow-y-auto">
            {quizQuestions.length === 0 ? (
              <div className="py-12 text-center text-slate-400 text-sm">
                Aucun quiz disponible pour cette fiche.
              </div>
            ) : quizCompleted ? (
              <div className="py-8 text-center space-y-5 animate-fade-in">
                <div className="w-16 h-16 mx-auto rounded-2xl bg-amber-500/15 text-amber-400 border border-amber-400/35 flex items-center justify-center">
                  <Trophy className="w-8 h-8" />
                </div>

                <div>
                  <h3 className="font-display text-xl font-bold text-slate-100">Résultat du Quiz ESTACA</h3>
                  <p className="font-mono text-3xl font-bold text-amber-400 mt-2">
                    {calculateScore20()} / 20
                  </p>
                  <p className="text-xs text-slate-400 mt-1 font-mono">
                    {score} bonne(s) réponse(s) sur {quizQuestions.length}
                  </p>
                </div>

                <div className="max-w-md mx-auto p-4 rounded-xl bg-[#04060C] border border-white/[0.08] text-xs leading-relaxed">
                  {calculateScore20() >= 16 ? (
                    <span className="text-emerald-300 font-semibold">
                      Mention Très Bien : maîtrise solide des concepts fondamentaux et réflexes validés.
                    </span>
                  ) : calculateScore20() >= 12 ? (
                    <span className="text-sky-300 font-semibold">
                      Niveau Admissible : relisez les hypothèses strictes des théorèmes pour sécuriser les points.
                    </span>
                  ) : (
                    <span className="text-amber-300 font-semibold">
                      Session de révision conseillée : reprenez les formules clés et les pièges d'examen.
                    </span>
                  )}
                </div>

                <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-4">
                  <button
                    type="button"
                    onClick={handleResetQuiz}
                    className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-[#04060C] hover:bg-[#101625] border border-white/[0.1] text-slate-200 text-xs font-semibold transition-colors"
                  >
                    Recommencer ce quiz
                  </button>

                  <button
                    type="button"
                    onClick={handleGenerateMoreQuiz}
                    disabled={isGeneratingMoreQuiz}
                    className="w-full sm:w-auto flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-[#04060C] text-xs font-bold transition-colors"
                  >
                    {isGeneratingMoreQuiz ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Génération en cours...</span>
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-4 h-4" />
                        <span>Générer 4 nouvelles questions IA</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            ) : (
              <>
                <div>
                  <div className="flex items-center justify-between text-xs text-slate-400 mb-3 font-mono">
                    <span className="font-semibold text-amber-300">
                      Question {currentQzIndex + 1} / {quizQuestions.length}
                    </span>
                    <span>Score : {score} pt(s)</span>
                  </div>

                  <div className="w-full bg-white/[0.08] h-1.5 rounded-full overflow-hidden mb-6">
                    <div
                      className="bg-amber-400 h-full transition-all duration-300"
                      style={{ width: `${((currentQzIndex + 1) / quizQuestions.length) * 100}%` }}
                    />
                  </div>

                  <h3 className="font-display text-base font-bold text-slate-100 mb-5 leading-snug">
                    <MathView math={currentQz.question} />
                  </h3>

                  <div className="space-y-2.5">
                    {currentQz.options.map((option, optIdx) => {
                      const isSelected = selectedOption === optIdx;
                      const isCorrect = optIdx === currentQz.correctIndex;

                      let btnStyle =
                        'bg-[#04060C] border-white/[0.1] hover:border-amber-400/50 text-slate-200';

                      if (isAnswerSubmitted) {
                        if (isCorrect) {
                          btnStyle = 'bg-emerald-950/50 border-emerald-400/70 text-emerald-200';
                        } else if (isSelected) {
                          btnStyle = 'bg-rose-950/50 border-rose-400/70 text-rose-200';
                        } else {
                          btnStyle = 'bg-[#04060C]/60 border-white/[0.05] text-slate-500';
                        }
                      }

                      return (
                        <button
                          key={optIdx}
                          type="button"
                          onClick={() => handleSelectOption(optIdx)}
                          disabled={isAnswerSubmitted}
                          className={`w-full text-left p-3.5 rounded-xl border text-xs font-medium transition-colors flex items-center justify-between gap-3 ${btnStyle}`}
                        >
                          <div className="flex items-center gap-3">
                            <span className="w-6 h-6 rounded-lg bg-[#0A0E19] border border-white/[0.12] flex items-center justify-center font-mono font-bold text-[11px] shrink-0 text-slate-300">
                              {['A', 'B', 'C', 'D'][optIdx]}
                            </span>
                            <span className="leading-relaxed">
                              <MathView math={option} />
                            </span>
                          </div>

                          {isAnswerSubmitted && isCorrect && (
                            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                          )}
                          {isAnswerSubmitted && isSelected && !isCorrect && (
                            <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
                          )}
                        </button>
                      );
                    })}
                  </div>

                  {isAnswerSubmitted && (
                    <div className="mt-4 p-4 rounded-xl bg-[#04060C] border border-white/[0.1] text-xs text-slate-300 space-y-1.5 animate-fade-in">
                      <p className="font-semibold text-sky-300 flex items-center gap-1.5">
                        <Sparkles className="w-3.5 h-3.5 text-sky-400" />
                        <span>Explication & Rigueur d'Examen</span>
                      </p>
                      <div className="leading-relaxed text-slate-300">
                        <MathView math={currentQz.explanation} />
                      </div>
                    </div>
                  )}
                </div>

                {isAnswerSubmitted && (
                  <div className="mt-6 flex justify-end">
                    <button
                      type="button"
                      onClick={handleNextQuizQuestion}
                      className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-[#04060C] font-bold text-xs transition-colors"
                    >
                      <span>
                        {currentQzIndex < quizQuestions.length - 1 ? 'Question suivante' : 'Voir mon score final'}
                      </span>
                      <ArrowRight className="w-4 h-4" />
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
