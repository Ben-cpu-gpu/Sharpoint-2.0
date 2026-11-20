import React, { useState, useEffect } from 'react';
import {
  X,
  Key,
  ExternalLink,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  Eye,
  EyeOff,
  Trash2,
  Cpu,
  Sliders,
  Layers,
  Laptop,
  Zap,
  Activity,
  RefreshCw,
  ShieldCheck,
  Server,
} from 'lucide-react';
import {
  getServerGeminiConfigured,
  getGroqApiKey,
  setGroqApiKey,
  getCerebrasApiKey,
  setCerebrasApiKey,
  getMistralApiKey,
  setMistralApiKey,
  getOpenRouterApiKey,
  setOpenRouterApiKey,
  getSelectedModel,
  setSelectedModel,
  getSelectedProvider,
  ALL_MODELS,
  AIProvider,
} from '../../services/apiKeyService';
import { STRICT_EXHAUSTIVENESS_RULE } from '../../services/aiService';
import { ProviderHealthResult } from '../../types/course';
import { CloudAIProvider } from '../../utils/aiFallbackOrder';

interface ApiKeyModalProps {
  isOpen: boolean;
  initialTab?: AIProvider;
  onClose: () => void;
  onKeysUpdated: () => void;
  healthMap: Record<AIProvider, ProviderHealthResult>;
  onTestProvider: (
    provider: AIProvider,
    keyOverride?: string,
    modelOverride?: string
  ) => Promise<ProviderHealthResult>;
  onTestAllProviders: (
    draftKeys?: Partial<Record<CloudAIProvider, string>>
  ) => Promise<void>;
  isTestingAll: boolean;
}

const DASHBOARD_PROVIDERS: Array<{
  id: AIProvider;
  label: string;
  rank: string;
  isFree: boolean;
}> = [
  { id: 'gemini', label: 'Gemini (Serveur)', rank: '1er · Prioritaire', isFree: true },
  { id: 'groq', label: 'Groq Cloud', rank: '2e · Sans CB', isFree: true },
  { id: 'cerebras', label: 'Cerebras Cloud', rank: '3e · 1M tok/j', isFree: true },
  { id: 'mistral', label: 'Mistral Experiment', rank: '4e · Français', isFree: true },
  { id: 'openrouter', label: 'OpenRouter (:free)', rank: '5e · 0€ officiel', isFree: true },
  { id: 'local', label: 'Mode Local', rank: '6e · Dernier recours', isFree: true },
];

export const ApiKeyModal: React.FC<ApiKeyModalProps> = ({
  isOpen,
  initialTab,
  onClose,
  onKeysUpdated,
  healthMap,
  onTestProvider,
  onTestAllProviders,
  isTestingAll,
}) => {
  const [activeTab, setActiveTab] = useState<AIProvider>('gemini');
  const [groqKey, setGroqKey] = useState('');
  const [cerebrasKey, setCerebrasKey] = useState('');
  const [mistralKey, setMistralKey] = useState('');
  const [openrouterKey, setOpenrouterKey] = useState('');
  const [selectedModel, setModel] = useState('gemini-4-hydrogen');

  const [showGroqKey, setShowGroqKey] = useState(false);
  const [showCerebrasKey, setShowCerebrasKey] = useState(false);
  const [showMistralKey, setShowMistralKey] = useState(false);
  const [showOpenrouterKey, setShowOpenrouterKey] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setGroqKey(getGroqApiKey());
      setCerebrasKey(getCerebrasApiKey());
      setMistralKey(getMistralApiKey());
      setOpenrouterKey(getOpenRouterApiKey());
      const m = getSelectedModel();
      setModel(m);
      setActiveTab(initialTab || getSelectedProvider());
      setSavedSuccess(false);
    }
  }, [isOpen, initialTab]);

  if (!isOpen) return null;

  const isGeminiServerReady = getServerGeminiConfigured();

  const getDraftKeyForProvider = (provider: AIProvider): string => {
    if (provider === 'gemini') return isGeminiServerReady ? 'server' : '';
    if (provider === 'groq') return groqKey.trim();
    if (provider === 'cerebras') return cerebrasKey.trim();
    if (provider === 'mistral') return mistralKey.trim();
    if (provider === 'openrouter') return openrouterKey.trim();
    return 'local';
  };

  const getDraftKeysMap = (): Partial<Record<CloudAIProvider, string>> => ({
    groq: groqKey.trim(),
    cerebras: cerebrasKey.trim(),
    mistral: mistralKey.trim(),
    openrouter: openrouterKey.trim(),
  });

  const handleSelectModel = (modelId: string, provider: AIProvider) => {
    setModel(modelId);
    setActiveTab(provider);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setGroqApiKey(groqKey);
    setCerebrasApiKey(cerebrasKey);
    setMistralApiKey(mistralKey);
    setOpenRouterApiKey(openrouterKey);
    setSelectedModel(selectedModel);
    onKeysUpdated();
    setSavedSuccess(true);
    setTimeout(() => {
      setSavedSuccess(false);
      onClose();
    }, 850);
  };

  const handleClearAllKeys = () => {
    setGroqApiKey('');
    setCerebrasApiKey('');
    setMistralApiKey('');
    setOpenRouterApiKey('');
    setGroqKey('');
    setCerebrasKey('');
    setMistralKey('');
    setOpenrouterKey('');
    onKeysUpdated();
  };

  const handleQuickTest = async (provider: AIProvider) => {
    const draftKey =
      provider === 'local' || provider === 'gemini'
        ? undefined
        : getDraftKeyForProvider(provider);
    const activeModelObj = ALL_MODELS.find(m => m.id === selectedModel);
    const modelToTest =
      activeModelObj?.provider === provider ? activeModelObj.id : undefined;
    await onTestProvider(provider, draftKey, modelToTest);
  };

  const isGroqConnected = groqKey.trim().length > 10;
  const isCerebrasConnected = cerebrasKey.trim().length > 10;
  const isMistralConnected = mistralKey.trim().length > 10;
  const isOpenrouterConnected = openrouterKey.trim().length > 10;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 animate-fade-in">
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Tableau de Bord IA, Modèles Gratuits et Clés API"
        className="relative w-full max-w-3xl bg-[#0A0E19] border border-white/[0.12] rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]"
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-white/[0.08] flex items-center justify-between bg-[#04060C]">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-xl bg-amber-500/15 border border-amber-400/35 flex items-center justify-center">
              <Activity className="w-4 h-4 text-amber-400" />
            </div>
            <div>
              <h2 className="font-display text-sm font-bold text-slate-100">
                Tableau de Bord IA · Gemini Prioritaire &amp; API Gratuits
              </h2>
              <p className="text-xs text-slate-400">
                Gemini côté serveur en #1 + relais gratuits sélectionnés via{' '}
                <a
                  href="https://github.com/mnfst/awesome-free-llm-apis"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sky-400 hover:underline"
                >
                  awesome-free-llm-apis
                </a>
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Fermer le tableau de bord IA"
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/[0.06] transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSave} className="p-6 overflow-y-auto space-y-5 text-xs text-slate-300">
          {/* 1. DIAGNOSTIC EN DIRECT DES API ET MODÈLES */}
          <div className="p-4 rounded-xl bg-[#04060C] border border-white/[0.09] space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <span className="text-xs font-bold text-slate-100 flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-emerald-400" />
                  <span>Vérification en direct des services IA</span>
                </span>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Cascade : 1. Gemini (Serveur) → Groq → Cerebras → Mistral → OpenRouter (:free) → Mode Local
                </p>
              </div>

              <button
                type="button"
                onClick={() => onTestAllProviders(getDraftKeysMap())}
                disabled={isTestingAll}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-sky-500/15 hover:bg-sky-500/25 border border-sky-400/40 text-sky-300 text-xs font-semibold disabled:opacity-60 transition-colors"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isTestingAll ? 'animate-spin' : ''}`} />
                <span>{isTestingAll ? 'Vérification...' : 'Tout tester'}</span>
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {DASHBOARD_PROVIDERS.map(item => {
                const res = healthMap[item.id];
                const hasDraftKey = getDraftKeyForProvider(item.id).length > 0;
                const isOk = res?.status === 'ok';
                const isErr = res?.status === 'error';
                const isTesting = res?.status === 'testing';

                return (
                  <div
                    key={item.id}
                    className={`p-2.5 rounded-xl border flex items-center justify-between gap-2 ${
                      isOk
                        ? 'bg-emerald-950/20 border-emerald-400/35'
                        : isErr
                        ? 'bg-rose-950/20 border-rose-400/35'
                        : 'bg-[#0A0E19] border-white/[0.08]'
                    }`}
                  >
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="font-semibold text-slate-100 truncate">{item.label}</span>
                        {item.isFree && (
                          <span className="text-[10px] font-mono text-emerald-300 shrink-0">
                            Gratuit
                          </span>
                        )}
                      </div>
                      <div className="text-[10.5px] font-mono text-slate-400 flex items-center gap-1.5 mt-0.5 truncate">
                        {isTesting ? (
                          <span className="text-amber-300">Test en cours...</span>
                        ) : isOk ? (
                          <span className="text-emerald-300 flex items-center gap-1">
                            <CheckCircle2 className="w-3 h-3 shrink-0" />
                            <span>
                              Opérationnel{res.latencyMs ? ` · ${res.latencyMs} ms` : ''}
                            </span>
                          </span>
                        ) : isErr ? (
                          <span className="text-rose-300 flex items-center gap-1 truncate" title={res.message}>
                            <AlertCircle className="w-3 h-3 shrink-0" />
                            <span className="truncate">{res.message}</span>
                          </span>
                        ) : item.id === 'gemini' ? (
                          <span className={isGeminiServerReady ? 'text-sky-300' : 'text-amber-300'}>
                            {isGeminiServerReady
                              ? 'Service serveur prêt · Non testé'
                              : 'Secret serveur requis (Settings > Secrets)'}
                          </span>
                        ) : hasDraftKey ? (
                          <span className="text-sky-300">Clé renseignée · Non testée</span>
                        ) : (
                          <span>{item.rank} · Clé absente</span>
                        )}
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleQuickTest(item.id)}
                      disabled={isTesting}
                      className="px-2.5 py-1 rounded-lg bg-[#04060C] hover:bg-[#131C31] border border-white/[0.12] text-[11px] font-semibold text-slate-200 disabled:opacity-50 shrink-0 transition-colors"
                    >
                      Tester
                    </button>
                  </div>
                );
              })}
            </div>
          </div>

          {/* 2. SÉLECTION DU FOURNISSEUR */}
          <div className="space-y-2.5">
            <label className="text-xs font-semibold text-slate-200 flex items-center gap-1.5">
              <Cpu className="w-4 h-4 text-amber-400" />
              <span>Fournisseur à configurer (sources officielles)</span>
            </label>

            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
              <button
                type="button"
                onClick={() => setActiveTab('gemini')}
                className={`p-2.5 rounded-xl border flex flex-col items-center text-center transition-colors ${
                  activeTab === 'gemini'
                    ? 'bg-[#101625] border-amber-400/60 text-white'
                    : 'bg-[#04060C] border-white/[0.08] text-slate-400 hover:text-slate-100'
                }`}
              >
                <Sparkles className="w-4 h-4 mb-1 text-amber-400" />
                <span className="font-semibold text-[11px]">1 · Gemini</span>
                <span className="text-[10px] text-emerald-300">Serveur actif</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('groq')}
                className={`p-2.5 rounded-xl border flex flex-col items-center text-center transition-colors ${
                  activeTab === 'groq'
                    ? 'bg-[#101625] border-emerald-400/60 text-white'
                    : 'bg-[#04060C] border-white/[0.08] text-slate-400 hover:text-slate-100'
                }`}
              >
                <Zap className="w-4 h-4 mb-1 text-emerald-300" />
                <span className="font-semibold text-[11px]">Groq Cloud</span>
                <span className="text-[10px] text-emerald-300">Gratuit sûr</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('cerebras')}
                className={`p-2.5 rounded-xl border flex flex-col items-center text-center transition-colors ${
                  activeTab === 'cerebras'
                    ? 'bg-[#101625] border-sky-400/60 text-white'
                    : 'bg-[#04060C] border-white/[0.08] text-slate-400 hover:text-slate-100'
                }`}
              >
                <Zap className="w-4 h-4 mb-1 text-sky-400" />
                <span className="font-semibold text-[11px]">Cerebras</span>
                <span className="text-[10px] text-emerald-300">1M tok/jour</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('mistral')}
                className={`p-2.5 rounded-xl border flex flex-col items-center text-center transition-colors ${
                  activeTab === 'mistral'
                    ? 'bg-[#101625] border-amber-400/60 text-white'
                    : 'bg-[#04060C] border-white/[0.08] text-slate-400 hover:text-slate-100'
                }`}
              >
                <Layers className="w-4 h-4 mb-1 text-amber-300" />
                <span className="font-semibold text-[11px]">Mistral AI</span>
                <span className="text-[10px] text-emerald-300">Experiment</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('openrouter')}
                className={`p-2.5 rounded-xl border flex flex-col items-center text-center transition-colors ${
                  activeTab === 'openrouter'
                    ? 'bg-[#101625] border-sky-400/60 text-white'
                    : 'bg-[#04060C] border-white/[0.08] text-slate-400 hover:text-slate-100'
                }`}
              >
                <Sparkles className="w-4 h-4 mb-1 text-sky-300" />
                <span className="font-semibold text-[11px]">OpenRouter</span>
                <span className="text-[10px] text-emerald-300">Modèles :free</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('local')}
                className={`p-2.5 rounded-xl border flex flex-col items-center text-center transition-colors ${
                  activeTab === 'local'
                    ? 'bg-[#101625] border-white/[0.25] text-white'
                    : 'bg-[#04060C] border-white/[0.08] text-slate-400 hover:text-slate-100'
                }`}
              >
                <Laptop className="w-4 h-4 mb-1 text-slate-300" />
                <span className="font-semibold text-[11px]">6 · Mode Local</span>
                <span className="text-[10px] text-slate-400">Dernier recours</span>
              </button>
            </div>
          </div>

          {/* 3. CHOIX DU MODÈLE POUR CE FOURNISSEUR */}
          <div className="space-y-2">
            <span className="block text-xs font-semibold text-slate-300">
              Modèles disponibles pour ce fournisseur
            </span>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {ALL_MODELS.filter(m => m.provider === activeTab).map(m => (
                <button
                  type="button"
                  key={m.id}
                  onClick={() => handleSelectModel(m.id, m.provider)}
                  className={`p-3.5 rounded-xl border text-left transition-colors ${
                    selectedModel === m.id
                      ? 'bg-[#101625] border-amber-400/60 text-white ring-1 ring-amber-400/40'
                      : 'bg-[#04060C] border-white/[0.08] text-slate-300 hover:border-white/[0.2]'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-semibold text-xs text-slate-100">{m.name}</span>
                    <span
                      className={`text-[10.5px] font-mono shrink-0 ${
                        m.isFreeTier ? 'text-emerald-300' : 'text-amber-300/90'
                      }`}
                    >
                      {m.badge}
                    </span>
                  </div>
                  {m.sourceLabel && (
                    <span className="text-[10px] font-mono text-slate-500 block mt-0.5">
                      Source : {m.sourceLabel}
                    </span>
                  )}
                  <p className="text-[11px] text-slate-400 mt-1 leading-relaxed">{m.description}</p>
                </button>
              ))}
            </div>
          </div>

          {/* 4. STATUT OU SAISIE PAR ONGLET */}
          {activeTab === 'gemini' && (
            <div className="space-y-3 p-4 rounded-xl bg-[#04060C] border border-amber-400/20">
              <div className="flex items-center justify-between gap-2">
                <span className="font-semibold text-xs text-amber-300 flex items-center gap-1.5">
                  <Server className="w-3.5 h-3.5 text-amber-400" />
                  <span>Service Gemini exécuté côté serveur</span>
                </span>
                <button
                  type="button"
                  onClick={() => handleQuickTest('gemini')}
                  disabled={healthMap.gemini?.status === 'testing'}
                  className="px-3 py-1.5 rounded-lg bg-[#101625] hover:bg-[#161F36] border border-amber-400/40 text-amber-300 text-xs font-semibold shrink-0 disabled:opacity-50"
                >
                  {healthMap.gemini?.status === 'testing' ? 'Test en cours...' : 'Tester le serveur Gemini'}
                </button>
              </div>

              <p className="text-[11px] text-slate-300 leading-relaxed">
                Les appels Gemini fonctionnent automatiquement pour chaque utilisateur via l'API serveur de l'application. La clé associée est gérée directement dans le panneau <strong className="text-slate-100">Settings &gt; Secrets</strong>.
              </p>
            </div>
          )}

          {activeTab === 'cerebras' && (
            <div className="space-y-3 p-4 rounded-xl bg-[#04060C] border border-sky-400/20">
              <div className="flex items-center justify-between gap-2">
                <span className="font-semibold text-xs text-sky-300 flex items-center gap-1.5">
                  <Key className="w-3.5 h-3.5 text-sky-400" />
                  <span>Clé API Cerebras Cloud (awesome-free-llm-apis · 1M tok/jour gratuits)</span>
                </span>
                <a
                  href="https://cloud.cerebras.ai"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-sky-400 hover:underline flex items-center gap-1 shrink-0"
                >
                  <span>cloud.cerebras.ai</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>

              <div className="flex gap-2">
                <div className="relative flex-1">
                  <input
                    type={showCerebrasKey ? 'text' : 'password'}
                    value={cerebrasKey}
                    onChange={e => setCerebrasKey(e.target.value)}
                    aria-label="Clé API Cerebras Cloud"
                    placeholder="csk-..."
                    className="w-full rounded-xl bg-[#0A0E19] border border-white/[0.12] px-3.5 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-sky-400/60 font-mono pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowCerebrasKey(!showCerebrasKey)}
                    aria-label={showCerebrasKey ? 'Masquer la clé Cerebras' : 'Afficher la clé Cerebras'}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
                  >
                    {showCerebrasKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                <button
                  type="button"
                  onClick={() => handleQuickTest('cerebras')}
                  className="px-3 py-2 rounded-xl bg-[#101625] hover:bg-[#161F36] border border-sky-400/40 text-sky-300 text-xs font-semibold shrink-0"
                >
                  Tester cette clé
                </button>
              </div>

              <p className="text-[11px] text-slate-400">
                {isCerebrasConnected
                  ? 'Clé Cerebras configurée (Llama 3.3 70B & Qwen 3 32B ultra-rapides).'
                  : 'Tier gratuit sans carte bancaire issu de awesome-free-llm-apis (1 million de tokens gratuits/jour).'}
              </p>
            </div>
          )}

          {activeTab === 'mistral' && (
            <div className="space-y-3 p-4 rounded-xl bg-[#04060C] border border-amber-400/20">
              <div className="flex items-center justify-between gap-2">
                <span className="font-semibold text-xs text-amber-300 flex items-center gap-1.5">
                  <Key className="w-3.5 h-3.5 text-amber-400" />
                  <span>Clé API Mistral AI (La Plateforme · Tier Experiment gratuit)</span>
                </span>
                <a
                  href="https://console.mistral.ai/api-keys"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-sky-400 hover:underline flex items-center gap-1 shrink-0"
                >
                  <span>console.mistral.ai</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>

              <div className="flex gap-2">
                <div className="relative flex-1">
                  <input
                    type={showMistralKey ? 'text' : 'password'}
                    value={mistralKey}
                    onChange={e => setMistralKey(e.target.value)}
                    aria-label="Clé API Mistral AI"
                    placeholder="Clé API Mistral..."
                    className="w-full rounded-xl bg-[#0A0E19] border border-white/[0.12] px-3.5 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-400/60 font-mono pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowMistralKey(!showMistralKey)}
                    aria-label={showMistralKey ? 'Masquer la clé Mistral' : 'Afficher la clé Mistral'}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
                  >
                    {showMistralKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                <button
                  type="button"
                  onClick={() => handleQuickTest('mistral')}
                  className="px-3 py-2 rounded-xl bg-[#101625] hover:bg-[#161F36] border border-amber-400/40 text-amber-300 text-xs font-semibold shrink-0"
                >
                  Tester cette clé
                </button>
              </div>

              <p className="text-[11px] text-slate-400">
                {isMistralConnected
                  ? 'Clé Mistral AI configurée (Mistral Small & Open Mistral Nemo).'
                  : 'Tier gratuit Experiment sans carte bancaire (vérification téléphone) via awesome-free-llm-apis.'}
              </p>
            </div>
          )}

          {activeTab === 'groq' && (
            <div className="space-y-3 p-4 rounded-xl bg-[#04060C] border border-emerald-400/20">
              <div className="flex items-center justify-between gap-2">
                <span className="font-semibold text-xs text-emerald-300 flex items-center gap-1.5">
                  <Key className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Clé Groq Cloud (Tier Gratuit sans carte bancaire)</span>
                </span>
                <a
                  href="https://console.groq.com/keys"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-sky-400 hover:underline flex items-center gap-1 shrink-0"
                >
                  <span>console.groq.com/keys</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>

              <div className="flex gap-2">
                <div className="relative flex-1">
                  <input
                    type={showGroqKey ? 'text' : 'password'}
                    value={groqKey}
                    onChange={e => setGroqKey(e.target.value)}
                    aria-label="Clé API Groq Cloud"
                    placeholder="gsk_..."
                    className="w-full rounded-xl bg-[#0A0E19] border border-white/[0.12] px-3.5 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-400/60 font-mono pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowGroqKey(!showGroqKey)}
                    aria-label={showGroqKey ? 'Masquer la clé Groq' : 'Afficher la clé Groq'}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
                  >
                    {showGroqKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                <button
                  type="button"
                  onClick={() => handleQuickTest('groq')}
                  className="px-3 py-2 rounded-xl bg-[#101625] hover:bg-[#161F36] border border-emerald-400/40 text-emerald-300 text-xs font-semibold shrink-0"
                >
                  Tester cette clé
                </button>
              </div>

              <p className="text-[11px] text-slate-400">
                {isGroqConnected
                  ? 'Clé Groq configurée (Llama 3.3 70B & Qwen 3 32B gratuits).'
                  : 'Source officielle gratuite sans carte bancaire : obtenez une clé gsk_ sur console.groq.com.'}
              </p>
            </div>
          )}

          {activeTab === 'openrouter' && (
            <div className="space-y-3 p-4 rounded-xl bg-[#04060C] border border-sky-400/20">
              <div className="flex items-center justify-between gap-2">
                <span className="font-semibold text-xs text-sky-300 flex items-center gap-1.5">
                  <Key className="w-3.5 h-3.5 text-sky-400" />
                  <span>Clé OpenRouter (Modèles :free à 0€)</span>
                </span>
                <a
                  href="https://openrouter.ai/keys"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-sky-400 hover:underline flex items-center gap-1 shrink-0"
                >
                  <span>openrouter.ai/keys</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>

              <div className="flex gap-2">
                <div className="relative flex-1">
                  <input
                    type={showOpenrouterKey ? 'text' : 'password'}
                    value={openrouterKey}
                    onChange={e => setOpenrouterKey(e.target.value)}
                    aria-label="Clé API OpenRouter"
                    placeholder="sk-or-v1-..."
                    className="w-full rounded-xl bg-[#0A0E19] border border-white/[0.12] px-3.5 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-sky-400/60 font-mono pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowOpenrouterKey(!showOpenrouterKey)}
                    aria-label={showOpenrouterKey ? 'Masquer la clé OpenRouter' : 'Afficher la clé OpenRouter'}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
                  >
                    {showOpenrouterKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                <button
                  type="button"
                  onClick={() => handleQuickTest('openrouter')}
                  className="px-3 py-2 rounded-xl bg-[#101625] hover:bg-[#161F36] border border-sky-400/40 text-sky-300 text-xs font-semibold shrink-0"
                >
                  Tester cette clé
                </button>
              </div>

              <p className="text-[11px] text-slate-400">
                {isOpenrouterConnected
                  ? 'Clé OpenRouter configurée (DeepSeek R1, Llama 3.3 et Gemma 3 :free).'
                  : 'Créez un compte gratuit sur openrouter.ai : les modèles terminés par :free sont officiellement gratuits.'}
              </p>
            </div>
          )}

          {activeTab === 'local' && (
            <div className="p-4 rounded-xl bg-[#04060C] border border-white/[0.12] text-slate-200 space-y-1.5">
              <p className="font-semibold text-xs text-slate-100 flex items-center gap-1.5">
                <Laptop className="w-4 h-4 text-slate-300" />
                <span>Mode Local · Dernier recours (6e)</span>
              </p>
              <p className="text-xs text-slate-400 leading-relaxed">
                Par défaut, l'application génère les fiches, exos et annales prioritairement avec{' '}
                <strong className="text-slate-200">Gemini (Serveur)</strong>, puis bascule automatiquement vers vos API gratuites{' '}
                <strong className="text-slate-200">Groq, Cerebras, Mistral ou OpenRouter (:free)</strong> si configurées.
                L'extraction locale hors-ligne n'intervient qu'en dernier recours.
              </p>
            </div>
          )}

          <div className="p-4 rounded-xl bg-[#04060C] border border-white/[0.08] space-y-1.5">
            <div className="flex items-center gap-1.5 text-sky-300 font-semibold text-xs">
              <Sliders className="w-3.5 h-3.5" />
              <span>Instruction Système (Rigueur ESTACA)</span>
            </div>
            <p className="text-[11px] text-slate-400 italic leading-relaxed select-all">
              "{STRICT_EXHAUSTIVENESS_RULE}"
            </p>
          </div>

          {savedSuccess && (
            <div className="p-3 rounded-xl bg-emerald-950/40 border border-emerald-400/40 text-emerald-300 text-xs flex items-center gap-2 animate-fade-in">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>Modèle et paramètres mis à jour avec succès.</span>
            </div>
          )}

          <div className="pt-3 flex items-center justify-between border-t border-white/[0.08]">
            <button
              type="button"
              onClick={handleClearAllKeys}
              className="flex items-center gap-1.5 px-3 py-2 text-xs text-rose-400 hover:text-rose-300 hover:bg-rose-950/20 rounded-xl transition-colors"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Effacer clés relais</span>
            </button>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-xl bg-[#04060C] hover:bg-[#101625] border border-white/[0.1] text-slate-200 text-xs font-semibold"
              >
                Fermer
              </button>
              <button
                type="submit"
                className="px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-[#04060C] text-xs font-bold transition-colors"
              >
                Enregistrer
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
