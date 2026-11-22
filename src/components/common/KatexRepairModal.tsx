import React, { useState, useEffect } from 'react';
import { X, Sparkles, Wand2, Copy, Check, CheckCircle2, AlertTriangle, Loader2 } from 'lucide-react';
import { MathView } from './MathView';
import { executeWithFallback } from '../../services/aiService';

interface KatexRepairModalProps {
  isOpen: boolean;
  initialLatex?: string;
  targetLabel?: string;
  onClose: () => void;
  onFixed?: (fixedLatex: string, originalSnippet: string) => void;
}

function balanceLatexSegment(segment: string): string {
  let cleaned = segment.trim();
  if (!cleaned.includes('_{') && /_[A-Za-z0-9]{2,}/.test(cleaned)) {
    cleaned = cleaned.replace(/_([A-Za-z0-9]{2,})/g, '_{$1}');
  }
  const openCount = (cleaned.match(/\{/g) || []).length;
  const closeCount = (cleaned.match(/\}/g) || []).length;
  if (openCount > closeCount) {
    cleaned += '}'.repeat(openCount - closeCount);
  }
  return cleaned;
}

function localHeuristicKatexFix(raw: string): string {
  const trimmed = raw.trim();
  if (trimmed.includes('$')) {
    return trimmed
      .replace(/\$\$([\s\S]*?)\$\$/g, (_, inner) => `$$${balanceLatexSegment(inner)}$$`)
      .replace(/(?<!\$)\$(?!\$)([^\n$]+?)(?<!\$)\$(?!\$)/g, (_, inner) => `$${balanceLatexSegment(inner)}$`);
  }
  return balanceLatexSegment(trimmed);
}

export const KatexRepairModal: React.FC<KatexRepairModalProps> = ({
  isOpen,
  initialLatex = '',
  targetLabel,
  onClose,
  onFixed,
}) => {
  const [inputLatex, setInputLatex] = useState(initialLatex);
  const [fixedResult, setFixedResult] = useState<{ fixedLatex: string; explanation: string } | null>(null);
  const [isRepairing, setIsRepairing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setInputLatex(initialLatex);
      setFixedResult(null);
      setErrorMessage(null);
      setCopied(false);
    }
  }, [isOpen, initialLatex]);

  if (!isOpen) return null;

  const handleRepair = async () => {
    if (!inputLatex.trim()) {
      setErrorMessage('Veuillez entrer ou sélectionner une formule KaTeX / LaTeX à réparer.');
      return;
    }

    setIsRepairing(true);
    setErrorMessage(null);

    try {
      const systemPrompt = `Tu es un expert en typographie mathématique et syntaxe KaTeX (LaTeX).
Analyse la formule fournie, détecte les erreurs de syntaxe (accolades non fermées, antislashs manquants, environnements incorrects, indices mal formés comme _Gz au lieu de _{Gz}), et retourne un JSON valide strict :
{
  "fixedLatex": string (code KaTeX corrigé sans délimiteurs $$ externes sauf si présents dans l'original, 100% valide),
  "explanation": string (explication concise des corrections apportées en français)
}`;

      const userPrompt = `Répare et corrige cette formule KaTeX/LaTeX :\n${inputLatex}`;

      const result = await executeWithFallback<{ fixedLatex: string; explanation: string }>(
        systemPrompt,
        userPrompt,
        (parsed: any) => ({
          fixedLatex: parsed.fixedLatex || inputLatex,
          explanation: parsed.explanation || 'Correction syntaxique KaTeX appliquée.',
        }),
        false,
        () => ({
          fixedLatex: localHeuristicKatexFix(inputLatex),
          explanation: 'Correction automatique locale des accolades, indices et symboles KaTeX.',
        }),
        undefined,
        { preferLightFastModel: true }
      );

      setFixedResult(result);
    } catch (err: any) {
      if (err?.message === 'REQUIRE_USER_CONSENT') {
        setFixedResult({
          fixedLatex: localHeuristicKatexFix(inputLatex),
          explanation: 'IA cloud indisponible : réparation syntaxique locale appliquée (vous pouvez aussi éditer le code manuellement ci-dessus).',
        });
      } else {
        setErrorMessage(err?.message || 'Erreur lors de la réparation KaTeX par IA.');
      }
    } finally {
      setIsRepairing(false);
    }
  };

  const handleCopy = () => {
    if (!fixedResult?.fixedLatex) return;
    try {
      navigator.clipboard?.writeText?.(fixedResult.fixedLatex)?.catch(() => {});
    } catch {
      // Ignore clipboard restrictions
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 animate-modal-backdrop">
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Assistant de Réparation KaTeX"
        className="relative w-full max-w-xl bg-[#0A0E19] border border-amber-500/35 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] animate-modal-panel"
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-white/[0.08] flex items-center justify-between bg-[#04060C]">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-amber-500/15 text-amber-400 border border-amber-400/35">
              <Wand2 className="w-4 h-4" />
            </div>
            <div>
              <h2 className="font-display text-base font-bold text-slate-100">
                Assistant KaTeX &amp; Réparateur IA
              </h2>
              <p className="text-xs text-slate-400">
                {targetLabel
                  ? `Cible sélectionnée : ${targetLabel}`
                  : 'Correction automatique des erreurs de syntaxe graphique & LaTeX'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fermer le réparateur"
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/[0.06] transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 overflow-y-auto space-y-4 font-mono text-xs">
          <div>
            <label htmlFor="katexRepairInput" className="block text-xs font-semibold text-slate-300 mb-2 font-sans">
              Code KaTeX / LaTeX à analyser et réparer
            </label>
            <textarea
              id="katexRepairInput"
              value={inputLatex}
              onChange={e => setInputLatex(e.target.value)}
              placeholder="Collez ou sélectionnez une formule KaTeX cassée (ex: \frac{a}{b_0 ...)..."
              rows={3}
              className="w-full rounded-xl bg-[#04060C] border border-white/[0.1] p-3 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-amber-400/60 font-mono"
            />
          </div>

          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={handleRepair}
              disabled={isRepairing || !inputLatex.trim()}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-[#04060C] text-xs font-bold transition-colors shadow-lg cursor-pointer"
            >
              {isRepairing ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Réparation IA en cours...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  <span>Réparer via IA</span>
                </>
              )}
            </button>
          </div>

          {errorMessage && (
            <div className="p-3 rounded-xl bg-rose-950/30 border border-rose-500/40 text-rose-300 text-xs flex items-center gap-2 font-sans">
              <AlertTriangle className="w-4 h-4 shrink-0 text-rose-400" />
              <span>{errorMessage}</span>
            </div>
          )}

          {fixedResult && (
            <div className="p-4 rounded-xl bg-[#04060C] border border-amber-400/40 space-y-3 font-sans animate-fade-in">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-amber-300 flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  Résultat Corrigé &amp; Validé
                </span>
                <button
                  type="button"
                  onClick={handleCopy}
                  className="px-2.5 py-1 rounded-lg bg-[#101625] hover:bg-[#161F36] border border-white/[0.1] text-[11px] text-slate-200 flex items-center gap-1 transition-colors"
                >
                  {copied ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-400" />
                      <span>Copié</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5 text-slate-400" />
                      <span>Copier le code</span>
                    </>
                  )}
                </button>
              </div>

              {/* Rendu visuel instantané */}
              <div className="p-4 rounded-xl bg-[#070B14] border border-white/[0.08] text-center overflow-x-auto">
                <MathView block repairEnabled={false}>{fixedResult.fixedLatex}</MathView>
              </div>

              <div className="space-y-1 font-mono text-[11px]">
                <div className="text-slate-400">Code KaTeX corrigé :</div>
                <input
                  type="text"
                  aria-label="Code KaTeX corrigé"
                  value={fixedResult.fixedLatex}
                  onChange={e =>
                    setFixedResult(prev =>
                      prev ? { ...prev, fixedLatex: e.target.value } : prev
                    )
                  }
                  className="w-full p-2 rounded bg-[#0A0E19] text-amber-200 border border-white/[0.08] focus:outline-none focus:border-amber-400/60"
                />
              </div>

              <p className="text-xs text-slate-300 italic pt-1">
                💬 {fixedResult.explanation}
              </p>

              {onFixed && (
                <div className="pt-2 flex justify-end">
                  <button
                    type="button"
                    onClick={() => {
                      onFixed(fixedResult.fixedLatex, initialLatex || inputLatex);
                      onClose();
                    }}
                    className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold transition-colors cursor-pointer"
                  >
                    Appliquer cette correction
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-white/[0.08] bg-[#04060C] flex items-center justify-between text-xs text-slate-400 font-sans">
          <span>Sélectionnez une formule ou surlignez du texte pour le réparer en place.</span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-[#0A0E19] hover:bg-[#101625] border border-white/[0.1] text-slate-200 text-xs font-semibold transition-colors"
          >
            Fermer
          </button>
        </div>
      </div>
    </div>
  );
};
