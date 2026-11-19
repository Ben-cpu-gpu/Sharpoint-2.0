import {
  AnyAIProvider,
  LOCAL_FALLBACK_MODEL_ID,
  normalizeStoredModelId,
  normalizeStoredProvider,
} from '../utils/aiFallbackOrder';

const ANTHROPIC_KEY_STORAGE = 'fichemaster_anthropic_api_key';
const OPENAI_KEY_STORAGE = 'fichemaster_openai_api_key';
const GROQ_KEY_STORAGE = 'fichemaster_groq_api_key';
const OPENROUTER_KEY_STORAGE = 'fichemaster_openrouter_api_key';
const SELECTED_MODEL_STORAGE = 'fichemaster_selected_model';
const SELECTED_PROVIDER_STORAGE = 'fichemaster_selected_provider';

let serverGeminiConfigured = true;

export function getServerGeminiConfigured(): boolean {
  return serverGeminiConfigured;
}

export function setServerGeminiConfigured(configured: boolean): void {
  serverGeminiConfigured = configured;
}

export type AIProvider = AnyAIProvider;

export interface ModelOption {
  id: string;
  provider: AIProvider;
  name: string;
  badge: string;
  description: string;
  isFreeTier?: boolean;
  sourceLabel?: string;
}

export const ALL_MODELS: ModelOption[] = [
  // --- 1. GOOGLE GEMINI (EXÉCUTÉ CÔTÉ SERVEUR) ---
  {
    id: 'gemini-4-hydrogen',
    provider: 'gemini',
    name: 'Gemini 4 Hydrogen',
    badge: 'Serveur · Recommandé',
    isFreeTier: true,
    sourceLabel: 'Serveur Gemini (@google/genai)',
    description: 'Modèle principal rapide et fiable exécuté côté serveur pour fiches, TD, annales et QCM',
  },
  {
    id: 'gemini-3.1-flash-lite',
    provider: 'gemini',
    name: 'Gemini 3.1 Flash Lite',
    badge: 'Serveur · Ultra-rapide',
    isFreeTier: true,
    sourceLabel: 'Serveur Gemini (@google/genai)',
    description: 'Modèle léger à très faible latence pour synthèses rapides et QCM',
  },
  {
    id: 'gemini-2.5-flash',
    provider: 'gemini',
    name: 'Gemini 2.5 Flash',
    badge: 'Serveur · Stable',
    isFreeTier: true,
    sourceLabel: 'Serveur Gemini (@google/genai)',
    description: 'Modèle polyvalent éprouvé pour l\'extraction PDF et la structuration JSON',
  },
  {
    id: 'gemini-2.5-pro',
    provider: 'gemini',
    name: 'Gemini 2.5 Pro',
    badge: 'Serveur · Raisonnement',
    isFreeTier: true,
    sourceLabel: 'Serveur Gemini (@google/genai)',
    description: 'Calculs formels avancés, démonstrations et sujets d\'annales ESTACA',
  },

  // --- 2. ANTHROPIC CLAUDE ---
  {
    id: 'claude-sonnet-4-20250514',
    provider: 'claude',
    name: 'Claude Sonnet 4',
    badge: 'Anthropic',
    isFreeTier: false,
    sourceLabel: 'Anthropic Console',
    description: 'Rédaction rigoureuse et démonstrations mathématiques pas à pas',
  },
  {
    id: 'claude-3-5-haiku-latest',
    provider: 'claude',
    name: 'Claude 3.5 Haiku',
    badge: 'Anthropic',
    isFreeTier: false,
    sourceLabel: 'Anthropic Console',
    description: 'Synthèse rapide des théorèmes et génération de flashcards',
  },

  // --- 3. OPENAI CHATGPT ---
  {
    id: 'gpt-4o',
    provider: 'openai',
    name: 'ChatGPT GPT-4o',
    badge: 'OpenAI',
    isFreeTier: false,
    sourceLabel: 'OpenAI Platform',
    description: 'Raisonnement scientifique polyvalent et structuration JSON stricte',
  },
  {
    id: 'gpt-4o-mini',
    provider: 'openai',
    name: 'ChatGPT GPT-4o mini',
    badge: 'OpenAI · Économique',
    isFreeTier: false,
    sourceLabel: 'OpenAI Platform',
    description: 'Version rapide et peu coûteuse pour QCM et variantes de TD',
  },

  // --- GROQ CLOUD (SOURCE SÛRE · GRATUIT SANS CARTE BANCAIRE) ---
  {
    id: 'llama-3.3-70b-versatile',
    provider: 'groq',
    name: 'Llama 3.3 70B Versatile',
    badge: 'Gratuit · Groq',
    isFreeTier: true,
    sourceLabel: 'Groq Cloud (Meta Open-Weights)',
    description: 'Inférence ultra-rapide gratuite (console.groq.com), très performant en sciences',
  },
  {
    id: 'qwen/qwen3-32b',
    provider: 'groq',
    name: 'Qwen 3 32B',
    badge: 'Gratuit · Groq',
    isFreeTier: true,
    sourceLabel: 'Groq Cloud (Alibaba Open-Weights)',
    description: 'Modèle ouvert performant en mathématiques, physique et code',
  },
  {
    id: 'llama-3.1-8b-instant',
    provider: 'groq',
    name: 'Llama 3.1 8B Instant',
    badge: 'Gratuit · Groq',
    isFreeTier: true,
    sourceLabel: 'Groq Cloud (Free Tier)',
    description: 'Réponse quasi instantanée avec limites de requêtes gratuites très larges',
  },

  // --- OPENROUTER (:free OFFICIEL · 0€) ---
  {
    id: 'meta-llama/llama-3.3-70b-instruct:free',
    provider: 'openrouter',
    name: 'Llama 3.3 70B Instruct (:free)',
    badge: 'Gratuit · OpenRouter',
    isFreeTier: true,
    sourceLabel: 'OpenRouter Official :free',
    description: 'Route gratuite officielle OpenRouter (0€) basée sur Meta Llama 3.3',
  },
  {
    id: 'deepseek/deepseek-r1-0528:free',
    provider: 'openrouter',
    name: 'DeepSeek R1 (:free)',
    badge: 'Gratuit · OpenRouter',
    isFreeTier: true,
    sourceLabel: 'OpenRouter Official :free',
    description: 'Modèle de raisonnement mathématique et physique pas-à-pas gratuit',
  },
  {
    id: 'google/gemma-3-27b-it:free',
    provider: 'openrouter',
    name: 'Gemma 3 27B (:free)',
    badge: 'Gratuit · OpenRouter',
    isFreeTier: true,
    sourceLabel: 'OpenRouter Official :free',
    description: 'Modèle ouvert Google Gemma 3 hébergé sur tier gratuit OpenRouter',
  },

  // --- 4. MODE LOCAL (DERNIER RECOURS) ---
  {
    id: LOCAL_FALLBACK_MODEL_ID,
    provider: 'local',
    name: 'Mode Local (Dernier recours)',
    badge: '4e · Offline',
    isFreeTier: true,
    sourceLabel: 'Navigateur (100% Hors-ligne)',
    description: 'Extraction hors-ligne dans votre navigateur uniquement en dernier recours après Gemini, Claude et ChatGPT',
  },
];

// --- GESTION DES CLÉS ANTHROPIC CLAUDE ---
export function getAnthropicApiKey(): string {
  const stored = localStorage.getItem(ANTHROPIC_KEY_STORAGE);
  if (stored && stored.trim().length > 0) return stored.trim();
  const envKey = (import.meta as any).env?.VITE_ANTHROPIC_API_KEY;
  if (envKey && envKey.trim().length > 0) return envKey.trim();
  return '';
}
export function setAnthropicApiKey(key: string): void {
  if (key && key.trim()) localStorage.setItem(ANTHROPIC_KEY_STORAGE, key.trim());
  else localStorage.removeItem(ANTHROPIC_KEY_STORAGE);
}

// --- GESTION DES CLÉS OPENAI ---
export function getOpenAIApiKey(): string {
  const stored = localStorage.getItem(OPENAI_KEY_STORAGE);
  if (stored && stored.trim().length > 0) return stored.trim();
  const envKey = (import.meta as any).env?.VITE_OPENAI_API_KEY;
  if (envKey && envKey.trim().length > 0) return envKey.trim();
  return '';
}
export function setOpenAIApiKey(key: string): void {
  if (key && key.trim()) localStorage.setItem(OPENAI_KEY_STORAGE, key.trim());
  else localStorage.removeItem(OPENAI_KEY_STORAGE);
}

// --- GESTION DES CLÉS GROQ (Tier Gratuit) ---
export function getGroqApiKey(): string {
  const stored = localStorage.getItem(GROQ_KEY_STORAGE);
  if (stored && stored.trim().length > 0) return stored.trim();
  const envKey = (import.meta as any).env?.VITE_GROQ_API_KEY;
  if (envKey && envKey.trim().length > 0) return envKey.trim();
  return '';
}
export function setGroqApiKey(key: string): void {
  if (key && key.trim()) localStorage.setItem(GROQ_KEY_STORAGE, key.trim());
  else localStorage.removeItem(GROQ_KEY_STORAGE);
}

// --- GESTION DES CLÉS OPENROUTER (:free) ---
export function getOpenRouterApiKey(): string {
  const stored = localStorage.getItem(OPENROUTER_KEY_STORAGE);
  if (stored && stored.trim().length > 0) return stored.trim();
  const envKey = (import.meta as any).env?.VITE_OPENROUTER_API_KEY;
  if (envKey && envKey.trim().length > 0) return envKey.trim();
  return '';
}
export function setOpenRouterApiKey(key: string): void {
  if (key && key.trim()) localStorage.setItem(OPENROUTER_KEY_STORAGE, key.trim());
  else localStorage.removeItem(OPENROUTER_KEY_STORAGE);
}

// --- MODÈLE & FOURNISSEUR ACTIF ---
export function getSelectedModel(): string {
  const stored = localStorage.getItem(SELECTED_MODEL_STORAGE);
  const normalized = normalizeStoredModelId(stored);
  if (stored && stored !== normalized) {
    localStorage.setItem(SELECTED_MODEL_STORAGE, normalized);
    if (stored === 'local-priority') {
      localStorage.setItem(SELECTED_PROVIDER_STORAGE, 'gemini');
    }
  }
  return normalized;
}
export function setSelectedModel(modelId: string): void {
  const normalized = normalizeStoredModelId(modelId);
  localStorage.setItem(SELECTED_MODEL_STORAGE, normalized);
  const found = ALL_MODELS.find(m => m.id === normalized);
  if (found) {
    setSelectedProvider(found.provider);
  }
}

export function getSelectedProvider(): AIProvider {
  const rawModel = localStorage.getItem(SELECTED_MODEL_STORAGE);
  const stored = localStorage.getItem(SELECTED_PROVIDER_STORAGE);
  const normalized = normalizeStoredProvider(stored, rawModel);
  if (stored && stored !== normalized) {
    localStorage.setItem(SELECTED_PROVIDER_STORAGE, normalized);
  }
  return normalized;
}
export function setSelectedProvider(provider: AIProvider): void {
  localStorage.setItem(SELECTED_PROVIDER_STORAGE, provider);
}

export function hasKeyForProvider(provider: AIProvider): boolean {
  if (provider === 'local') return true;
  if (provider === 'gemini') return serverGeminiConfigured;
  if (provider === 'claude') return getAnthropicApiKey().length > 0;
  if (provider === 'openai') return getOpenAIApiKey().length > 0;
  if (provider === 'groq') return getGroqApiKey().length > 0;
  if (provider === 'openrouter') return getOpenRouterApiKey().length > 0;
  return false;
}

export function hasActiveKeyForCurrentModel(): boolean {
  return hasKeyForProvider(getSelectedProvider());
}
