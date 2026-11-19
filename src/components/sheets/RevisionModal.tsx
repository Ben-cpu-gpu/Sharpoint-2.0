import React, { useState } from 'react';
import { X, BrainCircuit, GraduationCap, RotateCw, CheckCircle2, AlertCircle, ArrowRight, ArrowLeft, Trophy, Sparkles, Loader2 } from 'lucide-react';
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

  // État Flashcards
  const [currentFcIndex, setCurrentFcIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [masteredCards, setMasteredCards] = useState<Set<string>>(new Set());

  // État Quiz
  const [quizQuestions, setQuizQuestions] = useState<QuizQuestion[]>(sheet.quiz);
  const [currentQzIndex, setCurrentQzIndex] = useState(0);
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [isAnswerSubmitted, setIsAnswerSubmitted] = useState(false);
  const [score, setScore] = useState(0);
  const [quizCompleted, setQuizCompleted] = useState(false);
  const [isGeneratingMoreQuiz, setIsGeneratingMoreQuiz] = useState(false);

  if (!isOpen) return null;

  // Gestion Flashcards
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

  // Gestion Quiz
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md animate-fade-in">
      <div className="relative w-full max-w-2xl bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* En-tête de la modale */}
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/70">
          <div className="flex items-center gap-2">
            <button
              onClick={() => { setMode('flashcards'); setIsFlipped(false); }}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
                mode === 'flashcards'
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
            >
              <BrainCircuit className="w-4 h-4" />
              <span>Cartes Réflexes</span>
            </button>
            <button
              onClick={() => { setMode('quiz'); handleResetQuiz(); }}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
                mode === 'quiz'
                  ? 'bg-purple-600 text-white shadow-md shadow-purple-600/30'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
            >
              <GraduationCap className="w-4 h-4" />
              <span>Quiz QCM Noté</span>
            </button>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Corps principal : MODE FLASHCARDS */}
        {mode === 'flashcards' && (
          <div className="p-6 flex-1 flex flex-col justify-between overflow-y-auto">
            {flashcards.length === 0 ? (
              <div className="py-12 text-center text-slate-400 text-sm">
                Aucune flashcard disponible pour cette fiche. Utilisez le bouton "Ajouter notion IA" ou l'éditeur.
              </div>
            ) : (
              <>
                {/* Progression */}
                <div className="flex items-center justify-between text-xs text-slate-400 mb-4">
                  <span className="font-semibold text-slate-300">
                    Carte {currentFcIndex + 1} / {flashcards.length}
                  </span>
                  <span className="text-emerald-400 font-medium">
                    {masteredCards.size} maîtrisée(s)
                  </span>
                </div>

                <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden mb-6">
                  <div
                    className="bg-indigo-500 h-full transition-all duration-300"
                    style={{ width: `${((currentFcIndex + 1) / flashcards.length) * 100}%` }}
                  />
                </div>

                {/* Carte interactive avec effet de retournement */}
                <div
                  onClick={() => setIsFlipped(!isFlipped)}
                  className={`min-h-[260px] cursor-pointer rounded-2xl p-6 sm:p-8 flex flex-col justify-between border transition-all duration-300 transform select-none ${
                    isFlipped
                      ? 'bg-gradient-to-br from-indigo-950/70 to-slate-900 border-indigo-500/50 shadow-indigo-500/10 shadow-xl'
                      : 'bg-slate-950/90 border-slate-800 hover:border-slate-700 shadow-xl'
                  }`}
                >
                  <div className="flex items-center justify-between text-xs font-semibold">
                    <span className={isFlipped ? 'text-indigo-400 uppercase tracking-wider' : 'text-slate-500 uppercase tracking-wider'}>
                      {isFlipped ? '💡 Réponse / Réflexe Clé' : '❓ Question de Réflexe'}
                    </span>
                    <span className="text-[11px] text-slate-500 flex items-center gap-1">
                      <RotateCw className="w-3.5 h-3.5" />
                      Cliquez pour retourner
                    </span>
                  </div>

                  <div className="py-6 text-center">
                    <div className="text-base sm:text-lg font-medium text-slate-100 leading-relaxed">
                      <MathView math={isFlipped ? currentFc?.answer : currentFc?.question} />
                    </div>
                  </div>

                  <div className="text-center text-[11px] text-slate-500">
                    {isFlipped ? 'Face Verso (Explication)' : 'Face Recto (Auto-récitation)'}
                  </div>
                </div>

                {/* Boutons d'action Flashcard */}
                <div className="mt-6 flex flex-col sm:flex-row items-center justify-between gap-3">
                  <div className="flex items-center gap-2 w-full sm:w-auto">
                    <button
                      onClick={handlePrevFc}
                      disabled={currentFcIndex === 0}
                      className="flex-1 sm:flex-initial p-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-slate-300 transition-colors"
                      title="Carte précédente"
                    >
                      <ArrowLeft className="w-4 h-4 mx-auto" />
                    </button>
                    <button
                      onClick={handleNextFc}
                      disabled={currentFcIndex === flashcards.length - 1}
                      className="flex-1 sm:flex-initial p-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-slate-300 transition-colors"
                      title="Carte suivante"
                    >
                      <ArrowRight className="w-4 h-4 mx-auto" />
                    </button>
                  </div>

                  <div className="flex items-center gap-2 w-full sm:w-auto">
                    <button
                      onClick={() => handleNextFc()}
                      className="flex-1 sm:flex-initial px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition-colors"
                    >
                      À revoir
                    </button>
                    <button
                      onClick={() => handleToggleMastered(currentFc.id)}
                      className="flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition-all shadow-md shadow-emerald-600/30"
                    >
                      <CheckCircle2 className="w-4 h-4" />
                      <span>{masteredCards.has(currentFc.id) ? 'Déjà Maîtrisé ✓' : 'Marquer Maîtrisé'}</span>
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        )}

        {/* Corps principal : MODE QUIZ QCM NOTÉ */}
        {mode === 'quiz' && (
          <div className="p-6 flex-1 flex flex-col justify-between overflow-y-auto">
            {quizQuestions.length === 0 ? (
              <div className="py-12 text-center text-slate-400 text-sm">
                Aucun quiz disponible pour cette fiche.
              </div>
            ) : quizCompleted ? (
              /* ÉCRAN DE FIN DE QUIZ */
              <div className="py-8 text-center space-y-5 animate-fade-in">
                <div className="w-16 h-16 mx-auto rounded-full bg-purple-500/20 text-purple-400 border border-purple-500/30 flex items-center justify-center shadow-lg shadow-purple-500/20">
                  <Trophy className="w-8 h-8" />
                </div>

                <div>
                  <h3 className="text-xl font-bold text-white">Résultat du Quiz ESTACA</h3>
                  <p className="text-3xl font-black text-purple-400 mt-2">
                    {calculateScore20()} / 20
                  </p>
                  <p className="text-xs text-slate-400 mt-1">
                    {score} bonne(s) réponse(s) sur {quizQuestions.length} questions
                  </p>
                </div>

                <div className="max-w-md mx-auto p-4 rounded-2xl bg-slate-950/80 border border-slate-800 text-xs text-slate-300">
                  {calculateScore20() >= 16 ? (
                    <span className="text-emerald-400 font-semibold">
                      🎉 Mention Très Bien ! Maîtrise solide des concepts fondamentaux et réflexes de calcul validés.
                    </span>
                  ) : calculateScore20() >= 12 ? (
                    <span className="text-blue-400 font-semibold">
                      👍 Niveau Admissible. Quelques approximations sur les hypothèses strictes, relisez les théorèmes.
                    </span>
                  ) : (
                    <span className="text-amber-400 font-semibold">
                      ⚠️ Session Rattrapage conseillée. Reprenez les formules magiques et les pièges d'examen.
                    </span>
                  )}
                </div>

                <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-4">
                  <button
                    onClick={handleResetQuiz}
                    className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold transition-colors"
                  >
                    Recommencer ce quiz
                  </button>

                  <button
                    onClick={handleGenerateMoreQuiz}
                    disabled={isGeneratingMoreQuiz}
                    className="w-full sm:w-auto flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold shadow-lg shadow-purple-600/30 transition-all"
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
              /* QUESTION EN COURS */
              <>
                <div>
                  <div className="flex items-center justify-between text-xs text-slate-400 mb-3">
                    <span className="font-semibold text-purple-300">
                      Question {currentQzIndex + 1} sur {quizQuestions.length}
                    </span>
                    <span className="font-mono">
                      Score : {score} pt(s)
                    </span>
                  </div>

                  <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden mb-6">
                    <div
                      className="bg-purple-500 h-full transition-all duration-300"
                      style={{ width: `${((currentQzIndex + 1) / quizQuestions.length) * 100}%` }}
                    />
                  </div>

                  {/* Énoncé de la question */}
                  <h3 className="text-base font-bold text-white mb-5 leading-snug">
                    <MathView math={currentQz.question} />
                  </h3>

                  {/* 4 Options de réponse */}
                  <div className="space-y-2.5">
                    {currentQz.options.map((option, optIdx) => {
                      const isSelected = selectedOption === optIdx;
                      const isCorrect = optIdx === currentQz.correctIndex;

                      let btnStyle = 'bg-slate-950/80 border-slate-800 hover:border-purple-500/50 text-slate-200';

                      if (isAnswerSubmitted) {
                        if (isCorrect) {
                          btnStyle = 'bg-emerald-950/70 border-emerald-500 text-emerald-200 shadow-md shadow-emerald-500/20';
                        } else if (isSelected) {
                          btnStyle = 'bg-red-950/70 border-red-500 text-red-200 shadow-md shadow-red-500/20';
                        } else {
                          btnStyle = 'bg-slate-950/40 border-slate-900 text-slate-500 opacity-60';
                        }
                      }

                      return (
                        <button
                          key={optIdx}
                          onClick={() => handleSelectOption(optIdx)}
                          disabled={isAnswerSubmitted}
                          className={`w-full text-left p-3.5 rounded-xl border text-xs font-medium transition-all flex items-center justify-between gap-3 ${btnStyle}`}
                        >
                          <div className="flex items-center gap-3">
                            <span className="w-6 h-6 rounded-lg bg-slate-900 border border-slate-700/80 flex items-center justify-center font-bold text-[11px] shrink-0 text-slate-400">
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
                            <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
                          )}
                        </button>
                      );
                    })}
                  </div>

                  {/* Explication pédagogique immédiate */}
                  {isAnswerSubmitted && (
                    <div className="mt-4 p-4 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-300 space-y-1 animate-fade-in">
                      <p className="font-bold text-indigo-400 flex items-center gap-1.5">
                        <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
                        Explication & Rigueur d'Examen :
                      </p>
                      <div className="leading-relaxed text-slate-300">
                        <MathView math={currentQz.explanation} />
                      </div>
                    </div>
                  )}
                </div>

                {/* Footer question suivante */}
                {isAnswerSubmitted && (
                  <div className="mt-6 flex justify-end">
                    <button
                      onClick={handleNextQuizQuestion}
                      className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs shadow-lg shadow-purple-600/30 transition-all active:scale-95"
                    >
                      <span>{currentQzIndex < quizQuestions.length - 1 ? 'Question suivante' : 'Voir mon score final'}</span>
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
