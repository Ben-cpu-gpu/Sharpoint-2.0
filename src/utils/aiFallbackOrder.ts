export type CloudAIProvider = 'gemini' | 'claude' | 'openai' | 'groq' | 'openrouter';
export type AnyAIProvider = CloudAIProvider | 'local';

/**
 * Ordre canonique de priorité des fournisseurs d'IA :
 * 1. Gemini (local navigateur / clé Google AI Studio gratuite)
 * 2. Claude (Anthropic)
 * 3. ChatGPT (OpenAI)
 * (+ Groq & OpenRouter :free en relais gratuits si configurés)
 * 4. Mode Local (strictement en dernier recours)
 */
export const PRIMARY_CLOUD_ORDER: readonly CloudAIProvider[] = [
  'gemini',
  'claude',
  'openai',
];

export const FREE_RELAY_CLOUD_ORDER: readonly CloudAIProvider[] = [
  'groq',
  'openrouter',
];

export const LEGACY_LOCAL_MODEL_ID = 'local-priority';
export const LOCAL_FALLBACK_MODEL_ID = 'local-fallback';
export const DEFAULT_MODEL_ID = 'gemini-4-hydrogen';

const LEGACY_MODEL_ALIASES: Record<string, string> = {
  [LEGACY_LOCAL_MODEL_ID]: DEFAULT_MODEL_ID,
  'gemini-3.1-pro': 'gemini-2.5-pro',
  'gemini-3-flash': 'gemini-4-hydrogen',
  'gemini-2.0-flash': 'gemini-4-hydrogen',
  'gemini-2.0-pro': 'gemini-2.5-pro',
  'gemini-1.5-flash': 'gemini-4-hydrogen',
  'gemini-1.5-pro': 'gemini-2.5-pro',
  'gemini-pro': 'gemini-4-hydrogen',
  'claude-sonnet-5.5': 'claude-sonnet-4-20250514',
  'claude-haiku-5.5': 'claude-3-5-haiku-latest',
  'gpt-5': 'gpt-4o',
};

export interface FallbackResolutionOptions {
  selectedProvider: AnyAIProvider;
  selectedModel: string;
  forceLocal?: boolean;
  configuredKeys: {
    gemini: boolean;
    claude: boolean;
    openai: boolean;
    groq?: boolean;
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
 * Normalise l'ID de modèle stocké (migre l'ancien 'local-priority' et les anciens alias).
 */
export function normalizeStoredModelId(storedModel: string | null | undefined): string {
  if (!storedModel) {
    return DEFAULT_MODEL_ID;
  }
  return LEGACY_MODEL_ALIASES[storedModel] || storedModel;
}

/**
 * Normalise le fournisseur stocké (si l'ancien 'local-priority' était actif, rétablit Gemini en priorité 1).
 */
export function normalizeStoredProvider(
  storedProvider: string | null | undefined,
  rawStoredModel: string | null | undefined
): AnyAIProvider {
  if (rawStoredModel === LEGACY_LOCAL_MODEL_ID) {
    return 'gemini';
  }
  if (
    storedProvider === 'gemini' ||
    storedProvider === 'claude' ||
    storedProvider === 'openai' ||
    storedProvider === 'groq' ||
    storedProvider === 'openrouter' ||
    storedProvider === 'local'
  ) {
    return storedProvider;
  }
  return 'gemini';
}

/**
 * Résout la chaîne de priorité et de repli :
 * 1. Gemini -> 2. Claude -> 3. ChatGPT (ou le fournisseur cloud explicitement sélectionné en tête)
 * + Relais gratuits optionnels (Groq, OpenRouter :free) si configurés
 * 4. Mode Local uniquement en dernier recours (ou si forceLocal === true)
 */
export function resolveFallbackChain(options: FallbackResolutionOptions): FallbackResolution {
  const { selectedProvider, selectedModel, forceLocal = false, configuredKeys } = options;

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
  if (configuredKeys.groq) {
    baseCloudChain.push('groq');
  }
  if (configuredKeys.openrouter) {
    baseCloudChain.push('openrouter');
  }

  let cloudOrder: CloudAIProvider[];
  if (selectedProvider !== 'gemini') {
    cloudOrder = [
      selectedProvider,
      ...baseCloudChain.filter(p => p !== selectedProvider),
    ];
  } else {
    cloudOrder = baseCloudChain;
  }

  const configuredCloudChain = cloudOrder.filter(provider => {
    if (provider === 'gemini') return configuredKeys.gemini;
    if (provider === 'claude') return configuredKeys.claude;
    if (provider === 'openai') return configuredKeys.openai;
    if (provider === 'groq') return Boolean(configuredKeys.groq);
    if (provider === 'openrouter') return Boolean(configuredKeys.openrouter);
    return false;
  });

  return {
    cloudOrder,
    configuredCloudChain,
    shouldUseLocalImmediately: false,
  };
}
