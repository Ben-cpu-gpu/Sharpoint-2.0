import React, { useState, useEffect } from 'react';
import { Terminal, X, CheckCircle2, AlertCircle, Copy, Check, Trash2, ShieldCheck, ChevronDown, ChevronUp } from 'lucide-react';
import { DebugLog } from '../../types/course';
import { subscribeToLogs, clearLogs } from '../../services/logService';

export const DebugDrawer: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [logs, setLogs] = useState<DebugLog[]>([]);
  const [filter, setFilter] = useState<'all' | 'success' | 'error'>('all');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [expandedLogId, setExpandedLogId] = useState<string | null>(null);

  useEffect(() => {
    const unsubscribe = subscribeToLogs((updatedLogs) => {
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

  const filteredLogs = logs.filter((log) => {
    if (filter === 'all') return true;
    return log.status === filter;
  });

  const errorCount = logs.filter((l) => l.status === 'error').length;

  return (
    <>
      {/* Bouton Flottant Déclencheur en bas d'écran */}
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-4 right-4 z-40 flex items-center gap-2 px-3.5 py-2 rounded-full bg-slate-900/95 hover:bg-slate-800 text-slate-200 text-xs font-semibold shadow-xl border border-slate-700/80 backdrop-blur-md transition-all hover:scale-105 active:scale-95 group"
      >
        <Terminal className="w-3.5 h-3.5 text-indigo-400 group-hover:rotate-12 transition-transform" />
        <span>Logs & Debug</span>
        {logs.length > 0 && (
          <span
            className={`px-1.5 py-0.5 rounded-full text-[10px] font-bold ${
              errorCount > 0 ? 'bg-red-500/20 text-red-400 border border-red-500/30' : 'bg-emerald-500/20 text-emerald-400'
            }`}
          >
            {logs.length}
          </span>
        )}
      </button>

      {/* Tiroir / Modale de Débogage */}
      {isOpen && (
        <div className="fixed inset-0 z-50 flex justify-end bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-xl h-full bg-slate-950 border-l border-slate-800 flex flex-col shadow-2xl">
            {/* Header du drawer */}
            <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-slate-900/60">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-lg bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                  <Terminal className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white flex items-center gap-2">
                    Console d'Inspection & Résilience IA
                    <span className="flex items-center gap-1 text-[11px] font-normal text-emerald-400 bg-emerald-950/60 border border-emerald-800/40 px-2 py-0.5 rounded-full">
                      <ShieldCheck className="w-3 h-3" />
                      Client-Side
                    </span>
                  </h3>
                  <p className="text-xs text-slate-400">
                    Traçabilité en temps réel des appels Gemini (3.1-pro) et Fallback Groq (120b)
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
                title="Fermer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Barre de filtres et d'actions */}
            <div className="px-4 py-2.5 bg-slate-900/30 border-b border-slate-800/60 flex items-center justify-between gap-2">
              <div className="flex gap-1">
                {(['all', 'success', 'error'] as const).map((mode) => (
                  <button
                    key={mode}
                    onClick={() => setFilter(mode)}
                    className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors ${
                      filter === mode
                        ? 'bg-indigo-600 text-white'
                        : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
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
                  onClick={clearLogs}
                  className="flex items-center gap-1 px-2.5 py-1 text-xs text-slate-400 hover:text-red-400 transition-colors rounded hover:bg-slate-800/60"
                  title="Effacer l'historique de debug"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Effacer</span>
                </button>
              )}
            </div>

            {/* Liste scrollable des logs */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3 font-mono text-xs">
              {filteredLogs.length === 0 ? (
                <div className="h-64 flex flex-col items-center justify-center text-slate-500 text-center p-6">
                  <Terminal className="w-8 h-8 mb-2 opacity-40 text-slate-400" />
                  <p>Aucun événement API enregistré pour le moment.</p>
                  <p className="text-[11px] text-slate-600 mt-1">
                    Les appels vers Google Gemini et Groq apparaîtront ici avec leur code HTTP.
                  </p>
                </div>
              ) : (
                filteredLogs.map((log) => {
                  const isExpanded = expandedLogId === log.id;
                  const isSuccess = log.status === 'success';

                  return (
                    <div
                      key={log.id}
                      className={`rounded-xl border p-3 transition-colors ${
                        isSuccess
                          ? 'bg-emerald-950/10 border-emerald-900/30 text-slate-200'
                          : 'bg-red-950/15 border-red-900/40 text-slate-200'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2">
                          {isSuccess ? (
                            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                          ) : (
                            <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
                          )}
                          <span
                            className={`px-1.5 py-0.5 rounded font-bold text-[10px] ${
                              log.apiProvider === 'Gemini'
                                ? 'bg-blue-500/20 text-blue-300 border border-blue-500/30'
                                : log.apiProvider === 'Groq'
                                ? 'bg-orange-500/20 text-orange-300 border border-orange-500/30'
                                : 'bg-slate-700 text-slate-300'
                            }`}
                          >
                            {log.apiProvider}
                          </span>
                          <span className="text-[11px] text-slate-400 font-normal">
                            {log.model}
                          </span>
                          {log.statusCode && (
                            <span
                              className={`px-1 py-0.2 rounded text-[10px] font-bold ${
                                log.statusCode >= 200 && log.statusCode < 300
                                  ? 'text-emerald-400 bg-emerald-900/30'
                                  : 'text-red-400 bg-red-900/40'
                              }`}
                            >
                              HTTP {log.statusCode}
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-1.5">
                          <span className="text-[10px] text-slate-500 font-sans">{log.timestamp}</span>
                          <button
                            onClick={() => handleCopy(log)}
                            className="p-1 rounded text-slate-400 hover:text-indigo-400 hover:bg-slate-800 transition-colors"
                            title="Copier le log"
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
                        <div className="mt-2 pt-2 border-t border-slate-800/80">
                          <button
                            onClick={() => setExpandedLogId(isExpanded ? null : log.id)}
                            className="flex items-center gap-1 text-[11px] text-slate-400 hover:text-indigo-300 font-sans"
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
                            <pre className="mt-2 p-2.5 rounded-lg bg-slate-900 border border-slate-800 text-[10px] text-slate-300 overflow-x-auto whitespace-pre-wrap max-h-48 leading-tight font-mono select-all">
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

            {/* Footer informations */}
            <div className="p-3 bg-slate-900/80 border-t border-slate-800 text-[11px] text-slate-400 flex items-center justify-between">
              <span>Résilience activée : Gemini ➔ Groq ➔ Mode Local</span>
              <span className="text-slate-500 font-mono">100% Client-Side</span>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
