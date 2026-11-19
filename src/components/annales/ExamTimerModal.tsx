import React, { useState, useEffect } from 'react';
import { Play, Pause, RotateCcw, X, Clock, AlertTriangle, Minimize2, Maximize2 } from 'lucide-react';

interface ExamTimerModalProps {
  initialMinutes: number;
  examTitle: string;
  isOpen: boolean;
  onClose: () => void;
}

export const ExamTimerModal: React.FC<ExamTimerModalProps> = ({
  initialMinutes,
  examTitle,
  isOpen,
  onClose,
}) => {
  const [totalSeconds, setTotalSeconds] = useState(initialMinutes * 60);
  const [remainingSeconds, setRemainingSeconds] = useState(initialMinutes * 60);
  const [isRunning, setIsRunning] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);

  useEffect(() => {
    setTotalSeconds(initialMinutes * 60);
    setRemainingSeconds(initialMinutes * 60);
    setIsRunning(false);
  }, [initialMinutes]);

  useEffect(() => {
    let timer: any = null;
    if (isRunning && remainingSeconds > 0) {
      timer = setInterval(() => {
        setRemainingSeconds(prev => {
          if (prev <= 1) {
            clearInterval(timer);
            setIsRunning(false);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [isRunning, remainingSeconds]);

  if (!isOpen) return null;

  const hours = Math.floor(remainingSeconds / 3600);
  const minutes = Math.floor((remainingSeconds % 3600) / 60);
  const seconds = remainingSeconds % 60;

  const format2 = (n: number) => n.toString().padStart(2, '0');

  const progressPercent = totalSeconds > 0 ? ((totalSeconds - remainingSeconds) / totalSeconds) * 100 : 0;
  const isUrgent = remainingSeconds > 0 && remainingSeconds <= 300; // moins de 5 minutes
  const isFinished = remainingSeconds === 0;

  const handleReset = () => {
    setIsRunning(false);
    setRemainingSeconds(totalSeconds);
  };

  const handleAdjustMinutes = (delta: number) => {
    setRemainingSeconds(prev => Math.max(0, prev + delta * 60));
  };

  // Rendu minimisé (Widget flottant discret en haut à droite)
  if (isMinimized) {
    return (
      <div className="fixed top-18 right-4 z-50 bg-slate-900 border border-indigo-500/50 rounded-2xl p-3 shadow-2xl backdrop-blur-md flex items-center gap-3 animate-fade-in">
        <div className="flex items-center gap-2">
          <Clock className={`w-4 h-4 ${isUrgent ? 'text-red-400 animate-pulse' : 'text-indigo-400'}`} />
          <span className="font-mono text-sm font-bold text-white">
            {format2(hours)}:{format2(minutes)}:{format2(seconds)}
          </span>
        </div>

        <button
          onClick={() => setIsRunning(!isRunning)}
          className="p-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white"
        >
          {isRunning ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
        </button>

        <button
          onClick={() => setIsMinimized(false)}
          className="p-1.5 rounded-lg text-slate-400 hover:text-white"
          title="Agrandir"
        >
          <Maximize2 className="w-3.5 h-3.5" />
        </button>

        <button
          onClick={onClose}
          className="p-1.5 rounded-lg text-slate-400 hover:text-red-400"
          title="Fermer"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
    );
  }

  // Rendu modale complète
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md animate-fade-in">
      <div className="relative w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl overflow-hidden p-6 text-center space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2 text-indigo-400">
            <Clock className="w-4 h-4" />
            <span className="text-xs font-bold uppercase tracking-wider text-slate-300">
              Conditions Réelles d'Examen ESTACA
            </span>
          </div>

          <div className="flex items-center gap-1">
            <button
              onClick={() => setIsMinimized(true)}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
              title="Minimiser en widget flottant"
            >
              <Minimize2 className="w-4 h-4" />
            </button>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
              title="Fermer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div>
          <h3 className="text-sm font-bold text-white line-clamp-1">{examTitle}</h3>
          <p className="text-xs text-slate-400 mt-0.5">
            Durée officielle allouée : {initialMinutes} minutes
          </p>
        </div>

        {/* Compteur dégressif grand format */}
        <div className={`p-6 rounded-3xl border transition-all ${
          isFinished
            ? 'bg-red-950/40 border-red-500/50 shadow-lg shadow-red-500/20'
            : isUrgent
            ? 'bg-amber-950/40 border-amber-500/50 shadow-lg shadow-amber-500/20 animate-pulse'
            : 'bg-slate-950 border-slate-800'
        }`}>
          <div className="font-mono text-5xl sm:text-6xl font-black text-white tracking-tight">
            {format2(hours)}:{format2(minutes)}:{format2(seconds)}
          </div>

          <div className="mt-4 w-full bg-slate-800 h-2 rounded-full overflow-hidden">
            <div
              className={`h-full transition-all duration-500 ${
                isUrgent ? 'bg-amber-500' : isFinished ? 'bg-red-500' : 'bg-indigo-500'
              }`}
              style={{ width: `${progressPercent}%` }}
            />
          </div>

          {isFinished && (
            <div className="mt-3 text-red-400 text-xs font-bold flex items-center justify-center gap-1.5">
              <AlertTriangle className="w-4 h-4" />
              <span>Temps écoulé ! Déposez votre copie d'examen.</span>
            </div>
          )}
        </div>

        {/* Boutons de contrôle du chronomètre */}
        <div className="flex items-center justify-center gap-3">
          <button
            onClick={() => handleAdjustMinutes(-5)}
            className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold"
            title="Retirer 5 minutes"
          >
            -5 min
          </button>

          <button
            onClick={() => setIsRunning(!isRunning)}
            className={`flex items-center gap-2 px-6 py-3 rounded-2xl font-bold text-sm shadow-xl transition-all active:scale-95 text-white ${
              isRunning
                ? 'bg-amber-600 hover:bg-amber-500 shadow-amber-600/30'
                : 'bg-indigo-600 hover:bg-indigo-500 shadow-indigo-600/30'
            }`}
          >
            {isRunning ? (
              <>
                <Pause className="w-4 h-4" /> Pause
              </>
            ) : (
              <>
                <Play className="w-4 h-4" /> Lancer l'épreuve
              </>
            )}
          </button>

          <button
            onClick={handleReset}
            className="p-3 rounded-2xl bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
            title="Réinitialiser le chronomètre"
          >
            <RotateCcw className="w-4 h-4" />
          </button>

          <button
            onClick={() => handleAdjustMinutes(5)}
            className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold"
            title="Ajouter 5 minutes"
          >
            +5 min
          </button>
        </div>

        <p className="text-[11px] text-slate-500">
          Vous pouvez minimiser ce chronomètre pour travailler tout en gardant un œil sur le temps restant.
        </p>
      </div>
    </div>
  );
};
