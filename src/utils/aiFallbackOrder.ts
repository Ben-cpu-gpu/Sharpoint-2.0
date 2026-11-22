export type CloudAIProvider = 'gemini' | 'groq' | 'cerebras' | 'mistral' | 'openrouter';
export type AnyAIProvider = CloudAIProvider | 'local';

/**
 * Ordre canonique de priorité des fournisseurs d'IA (Gemini prioritaire + API gratuites awesome-free-llm-apis) :
 * 1. Gemini (Serveur officiel @google/genai)
 * 2. Groq Cloud (Tier gratuit sans carte bancaire)
 * 3. Cerebras Cloud (1M tokens/jour gratuits)
 * 4. Mistral AI (Tier gratuit Experiment)
 * 5. OpenRouter (:free officiel 0€)
 * 6. Mode Local (strictement en dernier recours)
 */
export const PRIMARY_CLOUD_ORDER: readonly CloudAIProvider[] = [
  'gemini',
];

export const FREE_RELAY_CLOUD_ORDER: readonly CloudAIProvider[] = [
  'groq',
  'cerebras',
  'mistral',
  'openrouter',
];

export const LEGACY_LOCAL_MODEL_ID = 'local-priority';
export const LOCAL_FALLBACK_MODEL_ID = 'local-fallback';
export const DEFAULT_MODEL_ID = 'gemini-4-hydrogen';

const LEGACY_MODEL_ALIASES: Record<string, string> = {
  [LEGACY_LOCAL_MODEL_ID]: DEFAULT_MODEL_ID,
  'gemini-3.1-pro': DEFAULT_MODEL_ID,
  'gemini-3-flash': DEFAULT_MODEL_ID,
  'gemini-2.5-flash': DEFAULT_MODEL_ID,
  'gemini-2.5-pro': DEFAULT_MODEL_ID,
  'gemini-2.0-flash': DEFAULT_MODEL_ID,
  'gemini-2.0-pro': DEFAULT_MODEL_ID,
  'gemini-1.5-flash': DEFAULT_MODEL_ID,
  'gemini-1.5-pro': DEFAULT_MODEL_ID,
  'gemini-pro': DEFAULT_MODEL_ID,
  'claude-sonnet-5.5': DEFAULT_MODEL_ID,
  'claude-sonnet-4-20250514': DEFAULT_MODEL_ID,
  'claude-haiku-5.5': DEFAULT_MODEL_ID,
  'claude-3-5-haiku-latest': DEFAULT_MODEL_ID,
  'gpt-5': DEFAULT_MODEL_ID,
  'gpt-4o': DEFAULT_MODEL_ID,
  'gpt-4o-mini': DEFAULT_MODEL_ID,
};

export interface FallbackResolutionOptions {
  selectedProvider: AnyAIProvider;
  selectedModel: string;
  forceLocal?: boolean;
  /** Garantit que Gemini reste prioritaire en tête (ex: fiches, exos TD, annales). */
  preferGeminiFirst?: boolean;
  configuredKeys: {
    gemini: boolean;
    groq?: boolean;
    cerebras?: boolean;
    mistral?: boolean;
    openrouter?: boolean;
  };
}

export interface FallbackResolution {
  /** Ordre complet des fournisseurs cloud à tenter avant le mode local */
  cloudOrder: CloudAIProvider[];
  /** Sous-ensemble ordonné des fournisseurs cloud disposant d'une clé configurée */
  configuredCloudChain: CloudAIProvider[];
  /** Vrai uniquement si l'utilisateur a explicitement choisi ou accepté le Mode Local */
  shouldUseLocalImmediately: boolean;
}

/**
 * Normalise l'ID de modèle stocké (migre 'local-priority', Claude/ChatGPT retirés et anciens alias Gemini).
 */
export function normalizeStoredModelId(storedModel: string | null | undefined): string {
  if (!storedModel) {
    return DEFAULT_MODEL_ID;
  }
  return LEGACY_MODEL_ALIASES[storedModel] || storedModel;
}

/**
 * Normalise le fournisseur stocké (migre Claude/OpenAI/'local-priority' vers Gemini en priorité 1).
 */
export function normalizeStoredProvider(
  storedProvider: string | null | undefined,
  rawStoredModel: string | null | undefined
): AnyAIProvider {
  if (
    rawStoredModel === LEGACY_LOCAL_MODEL_ID ||
    storedProvider === 'claude' ||
    storedProvider === 'openai' ||
    (rawStoredModel && (rawStoredModel.startsWith('claude-') || rawStoredModel.startsWith('gpt-')))
  ) {
    return 'gemini';
  }
  if (
    storedProvider === 'gemini' ||
    storedProvider === 'groq' ||
    storedProvider === 'cerebras' ||
    storedProvider === 'mistral' ||
    storedProvider === 'openrouter' ||
    storedProvider === 'local'
  ) {
    return storedProvider;
  }
  return 'gemini';
}

export const PROVIDER_MODEL_CHAINS: Record<CloudAIProvider, readonly string[]> = {
  gemini: [
    'gemini-4-hydrogen',
    'gemini-3.1-flash-lite',
  ],
  groq: [
    'llama-3.3-70b-versatile',
    'qwen/qwen3-32b',
    'llama-3.1-8b-instant',
  ],
  cerebras: [
    'llama-3.3-70b',
    'qwen-3-32b',
    'llama3.1-8b',
  ],
  mistral: [
    'mistral-small-latest',
    'open-mistral-nemo',
  ],
  openrouter: [
    'meta-llama/llama-3.3-70b-instruct:free',
    'deepseek/deepseek-r1-0528:free',
    'google/gemma-3-27b-it:free',
  ],
};

export const LIGHT_FAST_MODEL_CHAINS: Record<CloudAIProvider, readonly string[]> = {
  gemini: [
    'gemini-4-hydrogen',
    'gemini-3.1-flash-lite',
  ],
  groq: [
    'llama-3.1-8b-instant',
    'qwen/qwen3-32b',
    'llama-3.3-70b-versatile',
  ],
  cerebras: [
    'llama3.1-8b',
    'qwen-3-32b',
    'llama-3.3-70b',
  ],
  mistral: [
    'open-mistral-nemo',
    'mistral-small-latest',
  ],
  openrouter: [
    'google/gemma-3-27b-it:free',
    'meta-llama/llama-3.3-70b-instruct:free',
    'deepseek/deepseek-r1-0528:free',
  ],
};

/**
 * Retourne la liste ordonnée des modèles valides à tenter pour un fournisseur donné.
 * Pour Gemini, conserve toujours Gemini 4 Hydrogen (modèle principal du compte Google) en priorité #1,
 * même en mode rapide (le serveur réduit alors thinkingLevel à LOW), avec Flash-Lite en secours.
 */
export function getCandidateModelsForProvider(
  provider: CloudAIProvider,
  preferredModel?: string,
  preferLightFastModel = false
): string[] {
  const defaults = preferLightFastModel
    ? LIGHT_FAST_MODEL_CHAINS[provider] || PROVIDER_MODEL_CHAINS[provider] || []
    : PROVIDER_MODEL_CHAINS[provider] || [];
  if ((!preferLightFastModel || provider === 'gemini') && preferredModel && defaults.includes(preferredModel)) {
    return [preferredModel, ...defaults.filter(m => m !== preferredModel)];
  }
  return [...defaults];
}

/**
 * Résout la chaîne de priorité et de repli :
 * 1. Gemini (Serveur) en priorité -> API gratuites awesome-free-llm-apis configurées (Groq, Cerebras, Mistral, OpenRouter :free)
 * -> Mode Local uniquement en dernier recours (ou si forceLocal === true)
 */
export function resolveFallbackChain(options: FallbackResolutionOptions): FallbackResolution {
  const {
    selectedProvider,
    selectedModel,
    forceLocal = false,
    preferGeminiFirst = false,
    configuredKeys,
  } = options;

  const isExplicitLocalFallback =
    selectedProvider === 'local' || selectedModel === LOCAL_FALLBACK_MODEL_ID;

  if (forceLocal || isExplicitLocalFallback) {
    return {
      cloudOrder: [],
      configuredCloudChain: [],
      shouldUseLocalImmediately: true,
    };
  }

  const baseCloudChain: CloudAIProvider[] = [...PRIMARY_CLOUD_ORDER];
  for (const freeProvider of FREE_RELAY_CLOUD_ORDER) {
    if (configuredKeys[freeProvider]) {
      baseCloudChain.push(freeProvider);
    }
  }

  let cloudOrder: CloudAIProvider[];
  if (preferGeminiFirst || selectedProvider === 'gemini') {
    cloudOrder = baseCloudChain;
  } else {
    cloudOrder = [
      selectedProvider,
      ...baseCloudChain.filter(p => p !== selectedProvider),
    ];
  }

  const configuredCloudChain = cloudOrder.filter(provider => {
    if (provider === 'gemini') return configuredKeys.gemini;
    return Boolean(configuredKeys[provider]);
  });

  return {
    cloudOrder,
    configuredCloudChain,
    shouldUseLocalImmediately: false,
  };
}
