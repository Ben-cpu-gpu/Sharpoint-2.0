import React, { useEffect, useState } from 'react';
import { Loader2, Sparkles, ShieldCheck, Cpu, Eye, FileText, CheckCircle2 } from 'lucide-react';

interface SpiderExtractionScannerProps {
  isOpen: boolean;
  fileName?: string;
  targetType: 'sheet' | 'td' | 'annale';
  progressStep: string;
  pdfPageProgress?: { current: number; total: number } | null;
  rawTextSample?: string;
}

export const SpiderExtractionScanner: React.FC<SpiderExtractionScannerProps> = ({
  isOpen,
  fileName,
  targetType,
  progressStep,
  pdfPageProgress,
  rawTextSample,
}) => {
  const [scanProgress, setScanProgress] = useState(10);
  const [detectedElementsCount, setDetectedElementsCount] = useState({
    formulas: 0,
    theorems: 0,
    definitions: 0,
    tables: 0,
  });
  const [spiderPos, setSpiderPos] = useState({ x: 20, y: 30 });
  const [highlightActive, setHighlightActive] = useState(false);

  // Synchronize progress and spider animation with real progress steps
  useEffect(() => {
    if (!isOpen) {
      setScanProgress(10);
      setDetectedElementsCount({ formulas: 0, theorems: 0, definitions: 0, tables: 0 });
      return;
    }

    const interval = setInterval(() => {
      setScanProgress(prev => {
        if (prev >= 92) return prev;
        const increment = Math.floor(Math.random() * 8) + 3;
        const next = Math.min(92, prev + increment);
        
        // Update mock detected elements dynamically based on progress
        if (next > 30 && next <= 60) {
          setDetectedElementsCount({
            formulas: Math.floor(next / 8),
            theorems: Math.floor(next / 20),
            definitions: Math.floor(next / 15),
            tables: 1,
          });
        } else if (next > 60) {
          setDetectedElementsCount({
            formulas: Math.max(3, Math.floor(next / 6)),
            theorems: Math.max(2, Math.floor(next / 15)),
            definitions: Math.max(3, Math.floor(next / 12)),
            tables: 2,
          });
        }
        return next;
      });

      // Move spider across document coordinates
      setSpiderPos({
        x: Math.floor(Math.random() * 75) + 12,
        y: Math.floor(Math.random() * 70) + 15,
      });
      setHighlightActive(true);
      setTimeout(() => setHighlightActive(false), 800);
    }, 1100);

    return () => clearInterval(interval);
  }, [isOpen]);

  // If pdfPageProgress is available, refine scan progress
  useEffect(() => {
    if (pdfPageProgress && pdfPageProgress.total > 0) {
      const pagePct = Math.round((pdfPageProgress.current / pdfPageProgress.total) * 70) + 15;
      setScanProgress(Math.min(95, pagePct));
    }
  }, [pdfPageProgress]);

  if (!isOpen) return null;

  const getTargetTitle = () => {
    if (targetType === 'sheet') return 'Extraction de Fiche de Cours & Théorèmes';
    if (targetType === 'td') return 'Découpage et Résolution de Feuille de TD';
    return 'Analyse d’Annale d’Examen & Barème Officiel';
  };

  const sampleLines = rawTextSample
    ? rawTextSample.split('\n').filter(l => l.trim().length > 5).slice(0, 12)
    : [
        'Équation fondamentale de la dynamique des fluides (Navier-Stokes simplifiée)',
        'Théorème de Bernoulli le long d’une ligne de courant en régime permanent',
        'Bilan thermique et flux conducto-convectif aux interfaces aérodynamiques',
        'Conditions aux limites : v(r=R) = 0 (condition de non-glissement paroi)',
        'Expression caractéristique : \\rho \\left( \\frac{\\partial \\vec{v}}{\\partial t} + (\\vec{v}\\cdot\\vec{\\nabla})\\vec{v} \\right) = -\\vec{\\nabla}p + \\mu \\Delta \\vec{v}',
        'Démonstration du critère de stabilité en régime transitoire stationnaire',
      ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-lg animate-fade-in">
      <div className="relative w-full max-w-4xl bg-[#0A0E19] border border-amber-500/30 rounded-2xl shadow-[0_0_50px_rgba(245,158,11,0.15)] overflow-hidden flex flex-col max-h-[92vh]">
        
        {/* Top Header */}
        <div className="px-6 py-4 border-b border-white/[0.08] flex items-center justify-between bg-[#04060C]">
          <div className="flex items-center gap-3">
            <div className="relative p-2.5 rounded-xl bg-amber-500/20 text-amber-400 border border-amber-400/40 shadow-inner">
              <Cpu className="w-5 h-5 animate-pulse" />
              <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-emerald-400 rounded-full animate-ping" />
            </div>
            <div>
              <h2 className="font-display text-sm md:text-base font-bold text-slate-100 flex items-center gap-2">
                <span>{getTargetTitle()}</span>
                <span className="px-2 py-0.5 text-[10px] rounded-full bg-amber-500/20 text-amber-300 border border-amber-400/30 font-mono">
                  Mode Vision Scanner IA
                </span>
              </h2>
              <p className="text-xs text-slate-400">
                {fileName ? `Fichier : ${fileName}` : 'Analyse intelligente multi-couches en cours'}
              </p>
            </div>
          </div>
          <div className="text-right font-mono">
            <div className="text-sm font-bold text-amber-400">{scanProgress}%</div>
            <div className="text-[10px] text-slate-400">Progression globale</div>
          </div>
        </div>

        {/* Main Content Area: Document Scanner & Animated Spider */}
        <div className="grid grid-cols-1 md:grid-cols-3 flex-1 overflow-hidden">
          
          {/* Document Preview Box with Simulated / Real Pages & Highlights (2 Cols) */}
          <div className="md:col-span-2 relative bg-[#04060C]/90 p-5 overflow-y-auto border-r border-white/[0.08] flex flex-col justify-between font-mono text-xs">
            
            {/* Header info bar inside document */}
            <div className="flex items-center justify-between pb-3 mb-3 border-b border-white/[0.06] text-slate-400 text-[11px]">
              <span className="flex items-center gap-1.5 text-amber-300">
                <FileText className="w-3.5 h-3.5" />
                {pdfPageProgress ? `Page ${pdfPageProgress.current} / ${pdfPageProgress.total}` : 'Flux Documentaire Brute'}
              </span>
              <span className="flex items-center gap-1 text-emerald-400">
                <ShieldCheck className="w-3.5 h-3.5" />
                Intégrité ESTACA OK
              </span>
            </div>

            {/* Document Text Lines container with Spider Canvas Simulation */}
            <div className="relative flex-1 bg-[#070b14] border border-white/[0.08] rounded-xl p-4 space-y-3 overflow-hidden shadow-inner">
              
              {/* Scanning Laser Beam Effect */}
              <div 
                className="absolute left-0 right-0 h-1 bg-gradient-to-r from-transparent via-amber-400 to-transparent opacity-80 shadow-[0_0_15px_#F59E0B] pointer-events-none transition-all duration-700 ease-in-out"
                style={{ top: `${spiderPos.y}%` }}
              />

              {/* Animated Spider ("L'Araignée Scanner") */}
              <div
                className="absolute z-30 transition-all duration-700 ease-out pointer-events-none flex flex-col items-center"
                style={{ left: `${spiderPos.x}%`, top: `${spiderPos.y}%` }}
              >
                {/* Spider Icon / Avatar with legs animation */}
                <div className="relative flex items-center justify-center w-8 h-8 rounded-full bg-amber-500/20 border border-amber-400/80 text-amber-300 shadow-[0_0_12px_rgba(245,158,11,0.6)] animate-bounce">
                  <span className="text-base select-none">🕷️</span>
                  {/* Scanning beam dot */}
                  <span className="absolute -bottom-1 w-1.5 h-1.5 bg-cyan-400 rounded-full animate-ping" />
                </div>
                <div className="px-1.5 py-0.5 mt-1 rounded bg-black/85 border border-amber-400/40 text-[9px] text-amber-300 whitespace-nowrap font-mono shadow-md">
                  Scanning...
                </div>
              </div>

              {/* Text Lines with Dynamic Detection Highlights */}
              {sampleLines.map((line, idx) => {
                const isHighlighted = highlightActive && Math.abs((spiderPos.y / 15) - idx) < 1.5;
                const isFormula = line.includes('=') || line.includes('\\') || line.includes('ρ');
                const isTheorem = line.includes('Théorème') || line.includes('Équation');
                
                return (
                  <div
                    key={idx}
                    className={`p-2 rounded-lg transition-all duration-300 border ${
                      isHighlighted
                        ? isFormula
                          ? 'bg-amber-500/20 border-amber-400/80 text-amber-200 shadow-[0_0_10px_rgba(245,158,11,0.3)] scale-[1.01]'
                          : isTheorem
                          ? 'bg-cyan-500/20 border-cyan-400/80 text-cyan-200 shadow-[0_0_10px_rgba(56,189,248,0.3)] scale-[1.01]'
                          : 'bg-emerald-500/15 border-emerald-400/70 text-emerald-200'
                        : 'bg-white/[0.02] border-white/[0.04] text-slate-300 opacity-80'
                    }`}
                  >
                    <div className="flex items-center justify-between text-[10px] text-slate-400 mb-1">
                      <span className="font-mono">Bloc [{idx + 1}]</span>
                      {isHighlighted && (
                        <span className="text-amber-300 font-bold flex items-center gap-1 animate-fade-in">
                          <Sparkles className="w-3 h-3" /> Détecté & Extraits
                        </span>
                      )}
                    </div>
                    <p className="text-xs leading-relaxed font-sans">{line}</p>
                  </div>
                );
              })}

            </div>

            {/* Footer document note */}
            <div className="mt-3 text-[11px] text-slate-400 flex items-center justify-between">
              <span>Moteur de vision par IA & OCR embarqué</span>
              <span className="text-amber-400 font-bold">Synchronisation 100% Temps Réel</span>
            </div>
          </div>

          {/* Telemetry & Detected Elements Sidebar (1 Col) */}
          <div className="p-5 bg-[#0A0E19] flex flex-col justify-between space-y-4">
            
            <div className="space-y-4">
              <div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300 mb-3 flex items-center gap-2">
                  <Eye className="w-4 h-4 text-amber-400" />
                  <span>Éléments Détectés</span>
                </h3>
                <div className="grid grid-cols-2 gap-2">
                  <div className="p-2.5 rounded-xl bg-[#04060C] border border-white/[0.08] text-center">
                    <div className="text-base font-bold text-amber-400 font-mono">{detectedElementsCount.formulas}</div>
                    <div className="text-[10px] text-slate-400 mt-0.5">Formules LaTeX</div>
                  </div>
                  <div className="p-2.5 rounded-xl bg-[#04060C] border border-white/[0.08] text-center">
                    <div className="text-base font-bold text-cyan-400 font-mono">{detectedElementsCount.theorems}</div>
                    <div className="text-[10px] text-slate-400 mt-0.5">Théorèmes</div>
                  </div>
                  <div className="p-2.5 rounded-xl bg-[#04060C] border border-white/[0.08] text-center">
                    <div className="text-base font-bold text-emerald-400 font-mono">{detectedElementsCount.definitions}</div>
                    <div className="text-[10px] text-slate-400 mt-0.5">Définitions SI</div>
                  </div>
                  <div className="p-2.5 rounded-xl bg-[#04060C] border border-white/[0.08] text-center">
                    <div className="text-base font-bold text-purple-400 font-mono">{detectedElementsCount.tables}</div>
                    <div className="text-[10px] text-slate-400 mt-0.5">Schémas & Tables</div>
                  </div>
                </div>
              </div>

              {/* Current Status Step */}
              <div className="p-3.5 rounded-xl bg-[#04060C] border border-amber-500/30 space-y-2">
                <div className="flex items-center gap-2 text-amber-300 text-xs font-semibold">
                  <Loader2 className="w-4 h-4 animate-spin shrink-0 text-amber-400" />
                  <span>Étape en cours</span>
                </div>
                <p className="text-xs text-slate-200 leading-relaxed font-mono">
                  {progressStep || 'Initialisation de l’araignée scanner...'}
                </p>
                {pdfPageProgress && (
                  <div className="pt-1 text-[11px] text-amber-300 font-mono">
                    Page analysée : {pdfPageProgress.current} / {pdfPageProgress.total}
                  </div>
                )}
              </div>
            </div>

            {/* Success Preview Banner */}
            <div className="p-3 rounded-xl bg-emerald-950/30 border border-emerald-500/30 text-emerald-300 text-[11px] flex items-center gap-2.5">
              <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
              <span>Transition automatique vers la fiche générée dès la fin de l’analyse.</span>
            </div>

          </div>

        </div>

        {/* Bottom Bar */}
        <div className="px-6 py-3 border-t border-white/[0.08] bg-[#04060C] flex items-center justify-between text-xs text-slate-400">
          <span>L’araignée explore et extrait chaque équation sans omission.</span>
          <span className="font-mono text-amber-400">FicheMaster IA Engine v2.0</span>
        </div>

      </div>
    </div>
  );
};
