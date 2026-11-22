import React, { useState, useEffect } from 'react';
import { Terminal, X, CheckCircle2, AlertCircle, Copy, Check, Trash2, ChevronDown, ChevronUp } from 'lucide-react';
import { DebugLog } from '../../types/course';
import { subscribeToLogs, clearLogs } from '../../services/logService';

export const DebugDrawer: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [logs, setLogs] = useState<DebugLog[]>([]);
  const [filter, setFilter] = useState<'all' | 'success' | 'error'>('all');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [expandedLogId, setExpandedLogId] = useState<string | null>(null);

  useEffect(() => {
    const unsubscribe = subscribeToLogs(updatedLogs => {
      setLogs(updatedLogs);
    });
    return unsubscribe;
  }, []);

  const handleCopy = (log: DebugLog) => {
    const text = `[${log.timestamp}] [${log.apiProvider}] Model: ${log.model} - Status: ${log.status} (Code ${log.statusCode || 200})\nMessage: ${log.message}\nPayload: ${log.rawPayload || 'N/A'}`;
    navigator.clipboard.writeText(text);
    setCopiedId(log.id);
    setTimeout(() => setCopiedId(null), 2500);
  };

  const filteredLogs = logs.filter(log => {
    if (filter === 'all') return true;
    return log.status === filter;
  });

  const errorCount = logs.filter(l => l.status === 'error').length;

  return (
    <>
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        aria-label="Ouvrir la console d'inspection IA"
        className="flex fixed bottom-[74px] right-3 md:bottom-4 md:right-4 z-30 items-center gap-1.5 sm:gap-2 px-3 py-1.5 sm:px-3.5 sm:py-2 rounded-xl bg-[#0A0E19]/95 hover:bg-[#101625] text-slate-200 text-xs font-semibold shadow-xl border border-white/[0.1] transition-colors"
      >
        <Terminal className="w-3.5 h-3.5 text-amber-400" />
        <span>Logs IA</span>
        {logs.length > 0 && (
          <span
            className={`font-mono text-[11px] ${
              errorCount > 0 ? 'text-rose-400' : 'text-emerald-400'
            }`}
          >
            ({logs.length})
          </span>
        )}
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-50 flex justify-end bg-black/80 animate-fade-in">
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Console d'inspection IA"
            className="w-full max-w-xl h-full bg-[#04060C] border-l border-white/[0.1] flex flex-col shadow-2xl"
          >
            <div className="p-4 border-b border-white/[0.08] flex items-center justify-between bg-[#0A0E19]">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-lg bg-amber-500/15 text-amber-400 border border-amber-400/30">
                  <Terminal className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-display text-sm font-bold text-slate-100">
                    Console d'Inspection &amp; Résilience IA
                  </h3>
                  <p className="text-xs text-slate-400">
                    Traçabilité des appels Gemini, Groq, Cerebras, Mistral, OpenRouter et Mode Local
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                aria-label="Fermer la console"
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/[0.06] transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="px-4 py-2.5 bg-[#0A0E19]/60 border-b border-white/[0.08] flex items-center justify-between gap-2">
              <div className="flex gap-1">
                {(['all', 'success', 'error'] as const).map(mode => (
                  <button
                    key={mode}
                    type="button"
                    onClick={() => setFilter(mode)}
                    className={`px-3 py-1 rounded-lg text-xs font-medium transition-colors ${
                      filter === mode
                        ? 'bg-amber-500 text-[#04060C] font-semibold'
                        : 'text-slate-400 hover:text-white hover:bg-white/[0.06]'
                    }`}
                  >
                    {mode === 'all' && `Tous (${logs.length})`}
                    {mode === 'success' && 'Succès'}
                    {mode === 'error' && `Erreurs (${errorCount})`}
                  </button>
                ))}
              </div>

              {logs.length > 0 && (
                <button
                  type="button"
                  onClick={clearLogs}
                  className="flex items-center gap-1 px-2.5 py-1 text-xs text-slate-400 hover:text-rose-400 transition-colors rounded-lg hover:bg-white/[0.05]"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Effacer</span>
                </button>
              )}
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-3 font-mono text-xs">
              {filteredLogs.length === 0 ? (
                <div className="h-64 flex flex-col items-center justify-center text-slate-500 text-center p-6">
                  <Terminal className="w-8 h-8 mb-2 opacity-40 text-slate-400" />
                  <p className="font-sans text-sm text-slate-300">Aucun événement API enregistré.</p>
                  <p className="font-sans text-xs text-slate-500 mt-1">
                    Les requêtes vers Gemini, Groq, Cerebras, Mistral, OpenRouter ou Mode Local apparaîtront ici.
                  </p>
                </div>
              ) : (
                filteredLogs.map(log => {
                  const isExpanded = expandedLogId === log.id;
                  const isSuccess = log.status === 'success';

                  return (
                    <div
                      key={log.id}
                      className={`rounded-xl border p-3.5 ${
                        isSuccess
                          ? 'bg-[#0A0E19] border-emerald-400/25 text-slate-200'
                          : 'bg-[#0A0E19] border-rose-400/35 text-slate-200'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex flex-wrap items-center gap-2 text-[11px]">
                          {isSuccess ? (
                            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                          ) : (
                            <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
                          )}
                          <span className="font-bold text-amber-300">{log.apiProvider}</span>
                          <span className="text-slate-400">·</span>
                          <span className="text-slate-300">{log.model}</span>
                          {log.statusCode && (
                            <>
                              <span className="text-slate-500">·</span>
                              <span className={log.statusCode < 300 ? 'text-emerald-400' : 'text-rose-400'}>
                                HTTP {log.statusCode}
                              </span>
                            </>
                          )}
                        </div>

                        <div className="flex items-center gap-1.5">
                          <span className="text-[10px] text-slate-500">{log.timestamp}</span>
                          <button
                            type="button"
                            onClick={() => handleCopy(log)}
                            aria-label="Copier ce log"
                            className="p-1 rounded text-slate-400 hover:text-amber-300 hover:bg-white/[0.06] transition-colors"
                          >
                            {copiedId === log.id ? (
                              <Check className="w-3.5 h-3.5 text-emerald-400" />
                            ) : (
                              <Copy className="w-3.5 h-3.5" />
                            )}
                          </button>
                        </div>
                      </div>

                      <div className="mt-2 text-slate-300 text-xs font-sans break-words leading-relaxed">
                        {log.message}
                      </div>

                      {log.rawPayload && (
                        <div className="mt-2 pt-2 border-t border-white/[0.06]">
                          <button
                            type="button"
                            onClick={() => setExpandedLogId(isExpanded ? null : log.id)}
                            className="flex items-center gap-1 text-[11px] text-slate-400 hover:text-amber-300 font-sans"
                          >
                            {isExpanded ? (
                              <>
                                <ChevronUp className="w-3 h-3" /> Masquer le payload brut
                              </>
                            ) : (
                              <>
                                <ChevronDown className="w-3 h-3" /> Afficher le payload brut
                              </>
                            )}
                          </button>

                          {isExpanded && (
                            <pre className="mt-2 p-2.5 rounded-lg bg-[#04060C] border border-white/[0.08] text-[10px] text-slate-300 overflow-x-auto whitespace-pre-wrap max-h-48 leading-tight font-mono select-all">
                              {log.rawPayload}
                            </pre>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>

            <div className="p-3.5 bg-[#0A0E19] border-t border-white/[0.08] text-xs text-slate-400 flex items-center justify-between gap-3">
              <span>Priorité : 1. Gemini → Groq → Cerebras → Mistral → OpenRouter → Local</span>
              <span className="font-mono text-slate-500 shrink-0">Hybride</span>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
