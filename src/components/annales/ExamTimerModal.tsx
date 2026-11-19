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
  const isUrgent = remainingSeconds > 0 && remainingSeconds <= 300;
  const isFinished = remainingSeconds === 0;

  const handleReset = () => {
    setIsRunning(false);
    setRemainingSeconds(totalSeconds);
  };

  const handleAdjustMinutes = (delta: number) => {
    setRemainingSeconds(prev => Math.max(0, prev + delta * 60));
  };

  if (isMinimized) {
    return (
      <div className="fixed top-20 right-4 z-50 bg-[#0A0E19]/95 border border-amber-400/40 rounded-xl p-3 shadow-2xl backdrop-blur-md flex items-center gap-3 animate-fade-in">
        <div className="flex items-center gap-2">
          <Clock className={`w-4 h-4 ${isUrgent ? 'text-rose-400' : 'text-amber-400'}`} />
          <span className="font-mono text-sm font-bold text-slate-100">
            {format2(hours)}:{format2(minutes)}:{format2(seconds)}
          </span>
        </div>

        <button
          type="button"
          onClick={() => setIsRunning(!isRunning)}
          aria-label={isRunning ? 'Mettre le chronomètre en pause' : 'Démarrer le chronomètre'}
          className="p-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-[#04060C]"
        >
          {isRunning ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
        </button>

        <button
          type="button"
          onClick={() => setIsMinimized(false)}
          aria-label="Agrandir le chronomètre"
          title="Agrandir"
          className="p-1.5 rounded-lg text-slate-400 hover:text-white"
        >
          <Maximize2 className="w-3.5 h-3.5" />
        </button>

        <button
          type="button"
          onClick={onClose}
          aria-label="Fermer le chronomètre"
          title="Fermer"
          className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in">
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Chronomètre d'examen"
        className="relative w-full max-w-md bg-[#0A0E19] border border-white/[0.12] rounded-2xl shadow-2xl overflow-hidden p-6 text-center space-y-6"
      >
        <div className="flex items-center justify-between border-b border-white/[0.08] pb-3.5">
          <div className="flex items-center gap-2 text-amber-400">
            <Clock className="w-4 h-4" />
            <span className="font-display text-xs font-semibold text-slate-200">
              Conditions Réelles d'Examen
            </span>
          </div>

          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => setIsMinimized(true)}
              aria-label="Minimiser le chronomètre"
              title="Minimiser en widget flottant"
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/[0.06]"
            >
              <Minimize2 className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={onClose}
              aria-label="Fermer le chronomètre"
              title="Fermer"
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/[0.06]"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div>
          <h3 className="font-display text-base font-bold text-slate-100 line-clamp-1">{examTitle}</h3>
          <p className="text-xs text-slate-400 mt-1 font-mono">
            Durée officielle allouée : {initialMinutes} min
          </p>
        </div>

        <div
          className={`p-6 rounded-2xl border transition-colors ${
            isFinished
              ? 'bg-rose-950/30 border-rose-500/40'
              : isUrgent
              ? 'bg-amber-950/30 border-amber-400/50'
              : 'bg-[#04060C] border-white/[0.08]'
          }`}
        >
          <div className="font-mono text-5xl sm:text-6xl font-bold text-slate-50 tracking-tight">
            {format2(hours)}:{format2(minutes)}:{format2(seconds)}
          </div>

          <div className="mt-5 w-full bg-white/[0.08] h-1.5 rounded-full overflow-hidden">
            <div
              className={`h-full transition-all duration-500 ${
                isUrgent ? 'bg-amber-400' : isFinished ? 'bg-rose-500' : 'bg-sky-400'
              }`}
              style={{ width: `${progressPercent}%` }}
            />
          </div>

          {isFinished && (
            <div className="mt-3 text-rose-300 text-xs font-semibold flex items-center justify-center gap-1.5">
              <AlertTriangle className="w-4 h-4" />
              <span>Temps écoulé. Déposez votre copie d'examen.</span>
            </div>
          )}
        </div>

        <div className="flex items-center justify-center gap-2.5">
          <button
            type="button"
            onClick={() => handleAdjustMinutes(-5)}
            className="px-3 py-2 rounded-xl bg-[#04060C] hover:bg-[#101625] border border-white/[0.1] text-slate-300 text-xs font-mono font-semibold"
          >
            -5 min
          </button>

          <button
            type="button"
            onClick={() => setIsRunning(!isRunning)}
            className={`flex items-center gap-2 px-6 py-2.5 rounded-xl font-bold text-xs transition-colors ${
              isRunning
                ? 'bg-sky-500 hover:bg-sky-400 text-[#04060C]'
                : 'bg-amber-500 hover:bg-amber-400 text-[#04060C]'
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
            type="button"
            onClick={handleReset}
            aria-label="Réinitialiser le chronomètre"
            title="Réinitialiser"
            className="p-2.5 rounded-xl bg-[#04060C] hover:bg-[#101625] border border-white/[0.1] text-slate-300 transition-colors"
          >
            <RotateCcw className="w-4 h-4" />
          </button>

          <button
            type="button"
            onClick={() => handleAdjustMinutes(5)}
            className="px-3 py-2 rounded-xl bg-[#04060C] hover:bg-[#101625] border border-white/[0.1] text-slate-300 text-xs font-mono font-semibold"
          >
            +5 min
          </button>
        </div>

        <p className="text-[11px] text-slate-400">
          Minimisez ce chronomètre pour garder le décompte visible pendant votre rédaction.
        </p>
      </div>
    </div>
  );
};
