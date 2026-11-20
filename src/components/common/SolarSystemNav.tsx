import React, { useMemo, useState } from 'react';
import {
  BookOpen,
  Calculator,
  GraduationCap,
  FileUp,
  Activity,
  CheckCircle2,
  AlertCircle,
  SlidersHorizontal,
  RefreshCw,
  ChevronDown,
  ChevronUp,
  Sparkles,
  Laptop,
  Orbit,
} from 'lucide-react';
import { MainTab } from './Header';
import { ProviderHealthResult, Subject } from '../../types/course';
import { AIProvider, ALL_MODELS, getSelectedModel, getSelectedProvider, hasKeyForProvider } from '../../services/apiKeyService';
import { CloudAIProvider } from '../../utils/aiFallbackOrder';
import { computeSolarSystemLayout, SOLAR_CANVAS_HEIGHT, SOLAR_CANVAS_WIDTH } from '../../utils/solarLayout';

interface SolarSystemNavProps {
  currentTab: MainTab;
  onTabChange: (tab: MainTab) => void;
  selectedSubjectId: string | 'all';
  onSelectSubject: (subjectId: string | 'all') => void;
  subjects: Subject[];
  counts: {
    sheets: number;
    td: number;
    annales: number;
  };
  subjectCounts: Record<string, { sheets: number; td: number; annales: number }>;
  onOpenIngest: () => void;
  onOpenDashboard: (providerTab?: AIProvider) => void;
  healthMap: Record<AIProvider, ProviderHealthResult>;
  onTestProvider: (provider: AIProvider) => Promise<ProviderHealthResult>;
  onTestAllProviders: () => Promise<void>;
  isTestingAll: boolean;
  focusMode?: boolean;
}

const API_PROVIDER_ORDER: AIProvider[] = [
  'gemini',
  'groq',
  'cerebras',
  'mistral',
  'openrouter',
  'local',
];

const PROVIDER_META: Record<
  AIProvider,
  { shortLabel: string; dashboardLabel: string; rankTag: string; isFree: boolean }
> = {
  gemini: {
    shortLabel: '1 · Gemini',
    dashboardLabel: 'Gemini (Google Serveur)',
    rankTag: '1er · Prioritaire',
    isFree: true,
  },
  groq: {
    shortLabel: 'Groq Gratuit',
    dashboardLabel: 'Groq Cloud (Llama/Qwen)',
    rankTag: '2e · Sans CB',
    isFree: true,
  },
  cerebras: {
    shortLabel: 'Cerebras',
    dashboardLabel: 'Cerebras (1M tok/j)',
    rankTag: '3e · Sans CB',
    isFree: true,
  },
  mistral: {
    shortLabel: 'Mistral AI',
    dashboardLabel: 'Mistral Experiment',
    rankTag: '4e · Français',
    isFree: true,
  },
  openrouter: {
    shortLabel: 'OpenRouter',
    dashboardLabel: 'OpenRouter (:free)',
    rankTag: '5e · :free 0€',
    isFree: true,
  },
  local: {
    shortLabel: '6 · Local',
    dashboardLabel: 'Mode Local (Navigateur)',
    rankTag: 'Dernier recours',
    isFree: true,
  },
};

function getSubjectAccentHex(subjectId: string): string {
  switch (subjectId) {
    case 'maths':
    case 'thermodynamique':
    case 'electricite':
    case 'tech-mecanismes':
      return '#F59E0B';
    case 'meca-point':
    case 'meca-systemes':
    case 'meca-fluides':
    case 'outils-ingenieur':
    case 'langues':
      return '#38BDF8';
    case 'thermochimie':
    case 'ondes':
      return '#A78BFA';
    case 'algorithmique':
    case 'empreinte-carbone':
      return '#34D399';
    default:
      return '#F59E0B';
  }
}

export const SolarSystemNav: React.FC<SolarSystemNavProps> = ({
  currentTab,
  onTabChange,
  selectedSubjectId,
  onSelectSubject,
  subjects,
  counts,
  subjectCounts,
  onOpenIngest,
  onOpenDashboard,
  healthMap,
  onTestProvider,
  onTestAllProviders,
  isTestingAll,
  focusMode = false,
}) => {
  const [isSunHovered, setIsSunHovered] = useState(false);
  const [isSunClicked, setIsSunClicked] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [tilt, setTilt] = useState<{ rx: number; ry: number }>({ rx: 0, ry: 0 });

  const selectedModelId = getSelectedModel();
  const selectedProvider = getSelectedProvider();
  const activeModelMeta = ALL_MODELS.find(m => m.id === selectedModelId);

  const categoryDefs: Array<{
    id: MainTab;
    label: string;
    shortLabel: string;
    count: number;
    icon: React.ReactNode;
  }> = [
    {
      id: 'sheets',
      label: 'Fiches de cours',
      shortLabel: 'Fiches de cours',
      count: counts.sheets,
      icon: <BookOpen className="w-3.5 h-3.5 shrink-0" />,
    },
    {
      id: 'td',
      label: 'Exos',
      shortLabel: 'Exos',
      count: counts.td,
      icon: <Calculator className="w-3.5 h-3.5 shrink-0" />,
    },
    {
      id: 'annales',
      label: 'Annales',
      shortLabel: 'Annales',
      count: counts.annales,
      icon: <GraduationCap className="w-3.5 h-3.5 shrink-0" />,
    },
  ];

  const layout = useMemo(
    () =>
      computeSolarSystemLayout(
        categoryDefs.map(c => c.id),
        subjects.map(s => s.id),
        API_PROVIDER_ORDER
      ),
    [subjects]
  );

  const activeCategoryNode = layout.ring1.nodes.find(n => n.id === currentTab);
  const activeSubjectNode =
    selectedSubjectId === 'all'
      ? undefined
      : layout.ring2.nodes.find(n => n.id === selectedSubjectId);

  const activeSubjectObj = subjects.find(s => s.id === selectedSubjectId);

  const sunEngaged = isSunHovered || isSunClicked;
  const sunLabel = sunEngaged ? 'Importer un PDF' : 'Rajouter un pdf';

  const handleSunClick = () => {
    setIsSunClicked(true);
    onOpenIngest();
    setTimeout(() => setIsSunClicked(false), 600);
  };

  const getHealthBadge = (provider: AIProvider) => {
    const res = healthMap[provider];
    const hasKey = hasKeyForProvider(provider);

    if (res?.status === 'testing') {
      return {
        dotClass: 'bg-amber-400',
        textClass: 'text-amber-300',
        borderClass: 'border-amber-400/50',
        label: 'Test...',
      };
    }
    if (res?.status === 'ok') {
      return {
        dotClass: 'bg-emerald-400',
        textClass: 'text-emerald-300',
        borderClass: 'border-emerald-400/50',
        label: res.latencyMs ? `OK · ${res.latencyMs}ms` : 'OK',
      };
    }
    if (res?.status === 'error') {
      return {
        dotClass: 'bg-rose-400',
        textClass: 'text-rose-300',
        borderClass: 'border-rose-400/50',
        label: res.statusCode ? `Err ${res.statusCode}` : 'Erreur',
      };
    }
    if (hasKey && provider !== 'local') {
      return {
        dotClass: 'bg-sky-400',
        textClass: 'text-sky-300',
        borderClass: 'border-sky-400/40',
        label: provider === 'gemini' ? 'Serveur' : 'Clé prête',
      };
    }
    if (provider === 'local') {
      return {
        dotClass: 'bg-emerald-400',
        textClass: 'text-emerald-300',
        borderClass: 'border-white/[0.16]',
        label: 'Prêt',
      };
    }
    return {
      dotClass: 'bg-slate-500',
      textClass: 'text-slate-400',
      borderClass: 'border-white/[0.1]',
      label: provider === 'gemini' ? 'Secret req.' : 'Sans clé',
    };
  };

  const workingCloudCount = (['gemini', 'groq', 'cerebras', 'mistral', 'openrouter'] as CloudAIProvider[]).filter(
    p => healthMap[p]?.status === 'ok' || hasKeyForProvider(p)
  ).length;

  return (
    <section
      aria-label="Observatoire du Système Solaire et Tableau de Bord IA"
      className={`rounded-2xl border border-white/[0.09] overflow-hidden shadow-[0_24px_60px_-28px_rgba(0,0,0,0.9)] ${
        focusMode ? 'bg-[#070B14]/96' : 'bg-[#070B14]/76'
      }`}
    >
      {/* Barre supérieure compacte de l'observatoire */}
      <div className="px-4 sm:px-5 py-3 border-b border-white/[0.08] bg-[#04060C]/75 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="h-7 w-7 rounded-lg bg-amber-500/15 border border-amber-400/35 flex items-center justify-center shrink-0">
            <Orbit className="w-4 h-4 text-amber-400" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="font-display text-xs sm:text-sm font-bold text-slate-100 whitespace-nowrap">
                Système Solaire ESTACA
              </h2>
              <span className="text-[11px] font-mono text-slate-400 truncate">
                {categoryDefs.find(c => c.id === currentTab)?.label}
                {' · '}
                {activeSubjectObj ? activeSubjectObj.name : 'Toutes matières'}
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {selectedSubjectId !== 'all' && (
            <button
              type="button"
              onClick={() => onSelectSubject('all')}
              className="px-2.5 py-1.5 rounded-lg bg-[#0A0E19] hover:bg-[#101625] border border-amber-400/35 text-[11px] font-semibold text-amber-300 transition-colors whitespace-nowrap"
            >
              Toutes les matières
            </button>
          )}
          <button
            type="button"
            onClick={() => setIsCollapsed(prev => !prev)}
            aria-expanded={!isCollapsed}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-[#0A0E19] hover:bg-[#101625] border border-white/[0.1] text-[11px] font-medium text-slate-300 hover:text-white transition-colors whitespace-nowrap"
          >
            {isCollapsed ? (
              <>
                <ChevronDown className="w-3.5 h-3.5 text-amber-400" />
                <span>Afficher l'orbite</span>
              </>
            ) : (
              <>
                <ChevronUp className="w-3.5 h-3.5 text-slate-400" />
                <span>Réduire</span>
              </>
            )}
          </button>
        </div>
      </div>

      {!isCollapsed && (
        <div className="grid grid-cols-1 xl:grid-cols-12">
          {/* STAGE CENTRAL : SYSTÈME SOLAIRE */}
          <div className="xl:col-span-8 min-w-0 p-3 sm:p-5 border-b xl:border-b-0 xl:border-r border-white/[0.08] bg-[radial-gradient(circle_at_50%_50%,rgba(245,158,11,0.08)_0%,rgba(56,189,248,0.03)_42%,transparent_72%)]">
            {/* DESKTOP ORBITAL CANVAS (lg+) */}
            <div
              className="hidden lg:block w-full max-w-[960px] mx-auto"
              style={focusMode ? undefined : { perspective: '1100px' }}
              onMouseMove={
                focusMode
                  ? undefined
                  : e => {
                      const rect = e.currentTarget.getBoundingClientRect();
                      const nx = (e.clientX - rect.left) / rect.width - 0.5;
                      const ny = (e.clientY - rect.top) / rect.height - 0.5;
                      setTilt({ rx: -ny * 9, ry: nx * 11 });
                    }
              }
              onMouseLeave={focusMode ? undefined : () => setTilt({ rx: 0, ry: 0 })}
            >
              <div
                className={`relative w-full select-none transition-transform duration-300 ease-out ${
                  !focusMode && tilt.rx === 0 && tilt.ry === 0 ? 'solar-stage-idle-3d' : ''
                }`}
                style={{
                  aspectRatio: `${SOLAR_CANVAS_WIDTH} / ${SOLAR_CANVAS_HEIGHT}`,
                  transform: focusMode
                    ? 'none'
                    : tilt.rx !== 0 || tilt.ry !== 0
                    ? `rotateX(${tilt.rx.toFixed(2)}deg) rotateY(${tilt.ry.toFixed(2)}deg)`
                    : undefined,
                  transformStyle: focusMode ? undefined : 'preserve-3d',
                }}
              >
                {/* SVG Orbits & Vectors */}
                <svg
                  aria-hidden="true"
                  viewBox={`0 0 ${SOLAR_CANVAS_WIDTH} ${SOLAR_CANVAS_HEIGHT}`}
                  className="absolute inset-0 w-full h-full pointer-events-none"
                >
                  <defs>
                    <radialGradient id="sunCoreGlow" cx="50%" cy="50%" r="50%">
                      <stop offset="0%" stopColor="#FEF3C7" stopOpacity="0.95" />
                      <stop offset="45%" stopColor="#F59E0B" stopOpacity="0.45" />
                      <stop offset="100%" stopColor="#F59E0B" stopOpacity="0" />
                    </radialGradient>
                  </defs>

                  {/* Halo du Soleil */}
                  <circle
                    cx={layout.cx}
                    cy={layout.cy}
                    r={sunEngaged ? 96 : 82}
                    fill="url(#sunCoreGlow)"
                    className="transition-all duration-300"
                  />

                  {/* Anneau 3 : Orbite des Clés API */}
                  <ellipse
                    cx={layout.cx}
                    cy={layout.cy}
                    rx={layout.ring3.rx}
                    ry={layout.ring3.ry}
                    fill="none"
                    stroke="rgba(56, 189, 248, 0.22)"
                    strokeWidth="1.2"
                    strokeDasharray="4 6"
                  />

                  {/* Anneau 2 : Orbite des 13 Matières */}
                  <ellipse
                    cx={layout.cx}
                    cy={layout.cy}
                    rx={layout.ring2.rx}
                    ry={layout.ring2.ry}
                    fill="none"
                    stroke="rgba(255, 255, 255, 0.14)"
                    strokeWidth="1.35"
                  />

                  {/* Anneau 1 : Orbite Catégories (Fiches / Exos / Annales) */}
                  <ellipse
                    cx={layout.cx}
                    cy={layout.cy}
                    rx={layout.ring1.rx}
                    ry={layout.ring1.ry}
                    fill="none"
                    stroke="rgba(245, 158, 11, 0.35)"
                    strokeWidth="1.5"
                  />

                  {/* Rayon de sélection vers la Catégorie active (Anneau 1) */}
                  {activeCategoryNode && (
                    <line
                      x1={layout.cx}
                      y1={layout.cy}
                      x2={activeCategoryNode.x}
                      y2={activeCategoryNode.y}
                      stroke="#F59E0B"
                      strokeOpacity="0.65"
                      strokeWidth="2"
                    />
                  )}

                  {/* Rayon de sélection vers la Matière active (Anneau 2) */}
                  {activeSubjectNode && (
                    <line
                      x1={layout.cx}
                      y1={layout.cy}
                      x2={activeSubjectNode.x}
                      y2={activeSubjectNode.y}
                      stroke="#38BDF8"
                      strokeOpacity="0.7"
                      strokeWidth="1.8"
                      strokeDasharray="5 4"
                    />
                  )}

                  {/* Repères d'anneaux */}
                  <text
                    x={layout.cx}
                    y={layout.cy - layout.ring1.ry - 24}
                    textAnchor="middle"
                    fill="rgba(253, 230, 138, 0.6)"
                    fontSize="10"
                    fontFamily="JetBrains Mono, monospace"
                    letterSpacing="1.6"
                  >
                    ANNEAU 1 · CATÉGORIES
                  </text>
                  <text
                    x={layout.cx}
                    y={layout.cy + layout.ring2.ry + 28}
                    textAnchor="middle"
                    fill="rgba(148, 163, 184, 0.65)"
                    fontSize="10"
                    fontFamily="JetBrains Mono, monospace"
                    letterSpacing="1.6"
                  >
                    ANNEAU 2 · 13 MATIÈRES ESTACA
                  </text>
                  <text
                    x={layout.cx}
                    y={layout.cy - layout.ring3.ry - 28}
                    textAnchor="middle"
                    fill="rgba(56, 189, 248, 0.65)"
                    fontSize="10"
                    fontFamily="JetBrains Mono, monospace"
                    letterSpacing="1.6"
                  >
                    ANNEAU 3 · CLÉS API &amp; MODÈLES
                  </text>
                </svg>

                {/* Bouton "Toutes matières" discret en haut à gauche du stage */}
                <button
                  type="button"
                  onClick={() => onSelectSubject('all')}
                  className={`absolute top-1.5 left-1.5 z-20 px-2.5 py-1.5 rounded-xl border text-[11px] font-semibold transition-all ${
                    selectedSubjectId === 'all'
                      ? 'bg-amber-500/20 border-amber-400/60 text-amber-200 shadow-[0_0_16px_-4px_rgba(245,158,11,0.45)]'
                      : 'bg-[#0A0E19]/85 border-white/[0.1] text-slate-400 hover:text-slate-100 hover:border-white/[0.22]'
                  }`}
                >
                  Toutes matières ({subjects.length})
                </button>

                {/* GYROSCOPE 3D AUTOUR DU SOLEIL (supprimé en Mode Focus) */}
                {!focusMode && (
                  <div
                    aria-hidden="true"
                    data-testid="solar-3d-gyro"
                    className="absolute pointer-events-none z-25"
                    style={{
                      left: `${((layout.cx - layout.sunRadius * 1.95) / layout.width) * 100}%`,
                      top: `${((layout.cy - layout.sunRadius * 1.95) / layout.height) * 100}%`,
                      width: `${((layout.sunRadius * 3.9) / layout.width) * 100}%`,
                      height: `${((layout.sunRadius * 3.9) / layout.height) * 100}%`,
                      transformStyle: 'preserve-3d',
                      transform: 'translateZ(34px)',
                    }}
                  >
                    <div className="solar-gyro-a absolute inset-0 rounded-full border-2 border-amber-400/60 shadow-[0_0_24px_rgba(245,158,11,0.45)]">
                      <span className="absolute -top-1 left-1/2 -translate-x-1/2 w-2.5 h-2.5 rounded-full bg-amber-300 shadow-[0_0_10px_#FDE68A]" />
                    </div>
                    <div className="solar-gyro-b absolute inset-2 rounded-full border border-sky-400/65 shadow-[0_0_20px_rgba(56,189,248,0.4)]">
                      <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-2 h-2 rounded-full bg-sky-300 shadow-[0_0_10px_#38BDF8]" />
                    </div>
                  </div>
                )}

                {/* CENTRE : LE SOLEIL ("Rajouter un pdf" -> change uniquement au survol / clic) */}
                <button
                  type="button"
                  onClick={handleSunClick}
                  onMouseEnter={() => setIsSunHovered(true)}
                  onMouseLeave={() => setIsSunHovered(false)}
                  onFocus={() => setIsSunHovered(true)}
                  onBlur={() => setIsSunHovered(false)}
                  aria-label="Rajouter un PDF dans l'espace de révision"
                  style={{
                    left: `${((layout.cx - layout.sunRadius) / layout.width) * 100}%`,
                    top: `${((layout.cy - layout.sunRadius) / layout.height) * 100}%`,
                    width: `${((layout.sunRadius * 2) / layout.width) * 100}%`,
                    height: `${((layout.sunRadius * 2) / layout.height) * 100}%`,
                    transform: focusMode ? undefined : 'translateZ(46px)',
                  }}
                  className={`absolute z-30 rounded-full flex flex-col items-center justify-center text-center px-2 transition-all duration-200 cursor-pointer border-2 focus:outline-none focus-visible:ring-4 focus-visible:ring-amber-300/60 ${
                    sunEngaged
                      ? 'bg-gradient-to-br from-amber-300 via-amber-400 to-orange-500 text-[#04060C] border-amber-100 scale-105 shadow-[0_0_45px_rgba(245,158,11,0.75)]'
                      : 'bg-gradient-to-br from-amber-400 via-amber-500 to-orange-600 text-[#04060C] border-amber-200/80 shadow-[0_0_32px_rgba(245,158,11,0.5)]'
                  }`}
                >
                  <FileUp className="w-4 h-4 mb-0.5 shrink-0" />
                  <span className="font-display text-[11px] font-extrabold leading-tight">
                    {sunLabel}
                  </span>
                </button>

                {/* ANNEAU 1 : CATÉGORIES (Fiches de cours / Exos / Annales) */}
                {layout.ring1.nodes.map(node => {
                  const cat = categoryDefs.find(c => c.id === node.id);
                  if (!cat) return null;
                  const isActive = currentTab === cat.id;

                  return (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() => onTabChange(cat.id)}
                      aria-pressed={isActive}
                      style={{
                        left: `${(node.box.x / layout.width) * 100}%`,
                        top: `${(node.box.y / layout.height) * 100}%`,
                        width: `${(node.box.width / layout.width) * 100}%`,
                        height: `${(node.box.height / layout.height) * 100}%`,
                      }}
                      className={`absolute z-20 rounded-full px-2 flex items-center justify-center gap-1 text-[10px] xl:text-[10.5px] font-semibold transition-all border whitespace-nowrap ${
                        isActive
                          ? 'bg-amber-500 text-[#04060C] border-amber-200 shadow-[0_0_24px_-2px_rgba(245,158,11,0.75)] ring-2 ring-amber-300/40'
                          : 'bg-[#0A0E19]/95 text-slate-200 border-amber-400/30 hover:border-amber-400/70 hover:bg-[#101729]'
                      }`}
                    >
                      {cat.icon}
                      <span>{cat.shortLabel}</span>
                      <span
                        className={`font-mono text-[9.5px] tabular-nums ${
                          isActive ? 'text-[#04060C]/80 font-bold' : 'text-slate-400'
                        }`}
                      >
                        ({cat.count})
                      </span>
                    </button>
                  );
                })}

                {/* ANNEAU 2 : LES 13 MATIÈRES */}
                {layout.ring2.nodes.map(node => {
                  const sub = subjects.find(s => s.id === node.id);
                  if (!sub) return null;
                  const isSelected = selectedSubjectId === sub.id;
                  const subStat = subjectCounts[sub.id] || { sheets: 0, td: 0, annales: 0 };
                  const tabCount =
                    currentTab === 'sheets'
                      ? subStat.sheets
                      : currentTab === 'td'
                      ? subStat.td
                      : subStat.annales;
                  const planetColor = getSubjectAccentHex(sub.id);

                  return (
                    <button
                      key={sub.id}
                      type="button"
                      onClick={() => onSelectSubject(isSelected ? 'all' : sub.id)}
                      aria-pressed={isSelected}
                      title={`${sub.name} (${tabCount})`}
                      style={{
                        left: `${(node.box.x / layout.width) * 100}%`,
                        top: `${(node.box.y / layout.height) * 100}%`,
                        width: `${(node.box.width / layout.width) * 100}%`,
                        height: `${(node.box.height / layout.height) * 100}%`,
                      }}
                      className={`absolute z-20 rounded-xl px-2 flex items-center gap-1.5 text-left transition-all border ${
                        isSelected
                          ? 'bg-[#131C31] border-sky-400 text-white shadow-[0_0_22px_-4px_rgba(56,189,248,0.65)] ring-2 ring-sky-400/40'
                          : 'bg-[#0A0E19]/92 border-white/[0.11] text-slate-300 hover:text-white hover:border-white/[0.28] hover:bg-[#101626]'
                      }`}
                    >
                      <span
                        aria-hidden="true"
                        className="w-2.5 h-2.5 rounded-full shrink-0"
                        style={{
                          backgroundColor: isSelected ? '#38BDF8' : planetColor,
                          boxShadow: isSelected ? '0 0 8px #38BDF8' : 'none',
                        }}
                      />
                      <span className="text-[10.5px] font-medium leading-[1.15] line-clamp-2 flex-1">
                        {sub.name}
                      </span>
                      {tabCount > 0 && (
                        <span className="font-mono text-[10px] tabular-nums text-amber-300 shrink-0">
                          {tabCount}
                        </span>
                      )}
                    </button>
                  );
                })}

                {/* ANNEAU 3 : SATELLITES CLÉS API */}
                {layout.ring3.nodes.map(node => {
                  const provider = node.id as AIProvider;
                  const meta = PROVIDER_META[provider];
                  const badge = getHealthBadge(provider);
                  const isCurrentProvider = selectedProvider === provider;

                  return (
                    <button
                      key={provider}
                      type="button"
                      onClick={() => onOpenDashboard(provider)}
                      title={`Inspecter ou configurer ${meta.dashboardLabel}`}
                      style={{
                        left: `${(node.box.x / layout.width) * 100}%`,
                        top: `${(node.box.y / layout.height) * 100}%`,
                        width: `${(node.box.width / layout.width) * 100}%`,
                        height: `${(node.box.height / layout.height) * 100}%`,
                      }}
                      className={`absolute z-20 rounded-xl px-2.5 py-1 flex flex-col justify-center transition-all border ${
                        isCurrentProvider
                          ? 'bg-[#121B30] border-amber-400/70 shadow-[0_0_20px_-4px_rgba(245,158,11,0.5)]'
                          : `bg-[#060A13]/95 ${badge.borderClass} hover:border-white/[0.3] hover:bg-[#0D1322]`
                      }`}
                    >
                      <div className="flex items-center justify-between gap-1.5 w-full">
                        <span className="text-[10.5px] font-bold text-slate-100 truncate">
                          {meta.shortLabel}
                        </span>
                        <span
                          aria-hidden="true"
                          className={`w-2 h-2 rounded-full shrink-0 ${badge.dotClass}`}
                        />
                      </div>
                      <div className="flex items-center justify-between gap-1 w-full mt-0.5">
                        <span className={`text-[9.5px] font-mono tabular-nums truncate ${badge.textClass}`}>
                          {badge.label}
                        </span>
                        {isCurrentProvider && (
                          <span className="text-[9px] font-mono text-amber-300 shrink-0">ACTIF</span>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* VUE COMPACTE MOBILE / TABLETTE (< lg) */}
            <div className="lg:hidden space-y-4">
              {/* Soleil Mobile */}
              <div
                className="relative flex flex-col items-center justify-center py-5"
                style={focusMode ? undefined : { perspective: '700px' }}
              >
                {!focusMode && (
                  <div
                    aria-hidden="true"
                    className="pointer-events-none absolute w-44 h-44 flex items-center justify-center"
                    style={{ transformStyle: 'preserve-3d' }}
                  >
                    <div className="solar-gyro-a absolute inset-0 rounded-full border-2 border-amber-400/55 shadow-[0_0_20px_rgba(245,158,11,0.4)]">
                      <span className="absolute -top-1 left-1/2 -translate-x-1/2 w-2 h-2 rounded-full bg-amber-300" />
                    </div>
                    <div className="solar-gyro-b absolute inset-3 rounded-full border border-sky-400/60 shadow-[0_0_16px_rgba(56,189,248,0.35)]">
                      <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-2 h-2 rounded-full bg-sky-300" />
                    </div>
                  </div>
                )}
                <button
                  type="button"
                  onClick={handleSunClick}
                  onMouseEnter={() => setIsSunHovered(true)}
                  onMouseLeave={() => setIsSunHovered(false)}
                  onFocus={() => setIsSunHovered(true)}
                  onBlur={() => setIsSunHovered(false)}
                  className={`relative z-10 w-28 h-28 rounded-full flex flex-col items-center justify-center text-center px-3 border-2 transition-all ${
                    sunEngaged
                      ? 'bg-gradient-to-br from-amber-300 via-amber-400 to-orange-500 text-[#04060C] border-amber-100 shadow-[0_0_32px_rgba(245,158,11,0.65)]'
                      : 'bg-gradient-to-br from-amber-400 via-amber-500 to-orange-600 text-[#04060C] border-amber-200/80 shadow-[0_0_24px_rgba(245,158,11,0.45)]'
                  }`}
                >
                  <FileUp className="w-5 h-5 mb-1" />
                  <span className="font-display text-xs font-extrabold leading-tight">{sunLabel}</span>
                </button>
              </div>

              {/* Anneau 1 Mobile : Catégories */}
              <div className="space-y-1.5">
                <span className="text-[11px] font-mono uppercase tracking-wider text-amber-300/80 block">
                  Anneau 1 · Catégories
                </span>
                <div className="grid grid-cols-3 gap-2">
                  {categoryDefs.map(cat => {
                    const isActive = currentTab === cat.id;
                    return (
                      <button
                        key={cat.id}
                        type="button"
                        onClick={() => onTabChange(cat.id)}
                        className={`min-h-[44px] px-2.5 py-2 rounded-xl border text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors ${
                          isActive
                            ? 'bg-amber-500 text-[#04060C] border-amber-200'
                            : 'bg-[#0A0E19] text-slate-300 border-white/[0.1]'
                        }`}
                      >
                        {cat.icon}
                        <span className="truncate">
                          {cat.id === 'sheets' ? (
                            <>
                              <span className="sm:hidden">Fiches</span>
                              <span className="hidden sm:inline">{cat.shortLabel}</span>
                            </>
                          ) : (
                            cat.shortLabel
                          )}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Anneau 2 Mobile : 13 Matières */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-mono uppercase tracking-wider text-slate-400">
                    Anneau 2 · Matières ({subjects.length})
                  </span>
                  <button
                    type="button"
                    onClick={() => onSelectSubject('all')}
                    className={`text-[11px] font-semibold px-2.5 py-1 rounded-lg border ${
                      selectedSubjectId === 'all'
                        ? 'bg-sky-500/20 border-sky-400/60 text-sky-200'
                        : 'bg-[#0A0E19] border-white/[0.1] text-slate-400'
                    }`}
                  >
                    Toutes
                  </button>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {subjects.map(sub => {
                    const isSelected = selectedSubjectId === sub.id;
                    return (
                      <button
                        key={sub.id}
                        type="button"
                        onClick={() => onSelectSubject(isSelected ? 'all' : sub.id)}
                        className={`min-h-[44px] px-3 py-2 rounded-xl border text-left text-xs font-medium flex items-center gap-2 transition-colors ${
                          isSelected
                            ? 'bg-[#131C31] border-sky-400 text-white'
                            : 'bg-[#0A0E19] border-white/[0.08] text-slate-300'
                        }`}
                      >
                        <span
                          className="w-2 h-2 rounded-full shrink-0"
                          style={{ backgroundColor: getSubjectAccentHex(sub.id) }}
                        />
                        <span className="line-clamp-2 leading-tight">{sub.name}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Anneau 3 Mobile : Clés API */}
              <div className="space-y-1.5">
                <span className="text-[11px] font-mono uppercase tracking-wider text-sky-400/80 block">
                  Anneau 3 · Clés API &amp; Santé
                </span>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {API_PROVIDER_ORDER.map(provider => {
                    const meta = PROVIDER_META[provider];
                    const badge = getHealthBadge(provider);
                    return (
                      <button
                        key={provider}
                        type="button"
                        onClick={() => onOpenDashboard(provider)}
                        className={`min-h-[44px] px-3 py-2 rounded-xl border text-left transition-colors bg-[#0A0E19] ${badge.borderClass}`}
                      >
                        <div className="flex items-center justify-between gap-1">
                          <span className="text-xs font-semibold text-slate-100 truncate">
                            {meta.shortLabel}
                          </span>
                          <span className={`w-2 h-2 rounded-full shrink-0 ${badge.dotClass}`} />
                        </div>
                        <span className={`text-[10px] font-mono tabular-nums block ${badge.textClass}`}>
                          {badge.label}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>

          {/* PANNEAU DROIT : TABLEAU DE BORD SANTÉ DES CLÉS & MODÈLES GRATUITS */}
          <aside
            className={`xl:col-span-4 min-w-0 p-4 sm:p-5 flex flex-col justify-between gap-4 ${
              focusMode ? 'bg-[#050811]/95' : 'bg-[#050811]/82'
            }`}
          >
            <div className="space-y-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h3 className="font-display text-sm font-bold text-slate-100 flex items-center gap-2">
                    <Activity className="w-4 h-4 text-sky-400" />
                    <span>Tableau de Bord IA</span>
                  </h3>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    Diagnostic des clés, latence réelle et modèles gratuits sûrs
                  </p>
                </div>

                <button
                  type="button"
                  onClick={onTestAllProviders}
                  disabled={isTestingAll}
                  className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-[#0A0E19] hover:bg-[#101625] border border-sky-400/35 text-[11px] font-semibold text-sky-300 disabled:opacity-60 transition-colors whitespace-nowrap shrink-0"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isTestingAll ? 'animate-spin' : ''}`} />
                  <span>{isTestingAll ? 'Test...' : 'Tester tout'}</span>
                </button>
              </div>

              {/* Modèle Actif & Statut global */}
              <div className="p-3 rounded-xl bg-[#0A0E19] border border-white/[0.08] space-y-1.5">
                <div className="flex items-center justify-between gap-2 text-[11px]">
                  <span className="text-slate-400">Modèle sélectionné</span>
                  <span className="font-mono text-amber-300 font-semibold">
                    {activeModelMeta?.isFreeTier ? 'Tier Gratuit' : 'Standard'}
                  </span>
                </div>
                <div className="flex items-center justify-between gap-2">
                  <span className="font-display text-xs font-bold text-slate-100 truncate">
                    {activeModelMeta?.name || selectedModelId}
                  </span>
                  <span className="text-[11px] font-mono tabular-nums text-slate-400 shrink-0">
                    {workingCloudCount}/5 API prêtes
                  </span>
                </div>
              </div>

              {/* Liste Santé par fournisseur */}
              <div className="space-y-2">
                {API_PROVIDER_ORDER.map(provider => {
                  const meta = PROVIDER_META[provider];
                  const health = healthMap[provider];
                  const badge = getHealthBadge(provider);
                  const hasKey = hasKeyForProvider(provider);
                  const isCurrent = selectedProvider === provider;

                  return (
                    <div
                      key={provider}
                      className={`p-2.5 rounded-xl border transition-colors ${
                        isCurrent
                          ? 'bg-[#10172A] border-amber-400/45'
                          : 'bg-[#0A0E19]/80 border-white/[0.08]'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <button
                          type="button"
                          onClick={() => onOpenDashboard(provider)}
                          className="min-w-0 text-left flex items-center gap-2 hover:text-white"
                        >
                          {provider === 'local' ? (
                            <Laptop className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          ) : (
                            <Sparkles
                              className={`w-3.5 h-3.5 shrink-0 ${
                                isCurrent ? 'text-amber-400' : 'text-sky-400'
                              }`}
                            />
                          )}
                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5">
                              <span className="text-xs font-semibold text-slate-100 truncate">
                                {meta.dashboardLabel}
                              </span>
                            </div>
                            <div className="flex items-center gap-1.5 text-[10.5px] font-mono">
                              <span className={meta.isFree ? 'text-emerald-300' : 'text-slate-400'}>
                                {meta.rankTag}
                              </span>
                              <span className="text-slate-600">·</span>
                              <span className={badge.textClass}>{badge.label}</span>
                            </div>
                          </div>
                        </button>

                        <div className="flex items-center gap-1.5 shrink-0">
                          {health?.status === 'ok' && (
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" aria-label="API valide" />
                          )}
                          {health?.status === 'error' && (
                            <AlertCircle className="w-3.5 h-3.5 text-rose-400" aria-label="Erreur API" />
                          )}
                          {provider !== 'local' && (
                            <button
                              type="button"
                              onClick={() => onTestProvider(provider)}
                              disabled={health?.status === 'testing'}
                              className="px-2 py-1 rounded-lg bg-[#04060C] hover:bg-[#161F36] border border-white/[0.1] text-[10.5px] font-semibold text-slate-200 disabled:opacity-50 transition-colors"
                            >
                              {hasKey ? 'Tester' : 'Clé'}
                            </button>
                          )}
                        </div>
                      </div>

                      {health?.message && health.status === 'error' && (
                        <p className="mt-1.5 text-[10.5px] text-rose-300/90 leading-snug line-clamp-2">
                          {health.message}
                        </p>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Action bas de panneau */}
            <button
              type="button"
              onClick={() => onOpenDashboard()}
              className="w-full py-2.5 px-4 rounded-xl bg-amber-500 hover:bg-amber-400 text-[#04060C] text-xs font-bold flex items-center justify-center gap-2 transition-colors shadow-[0_0_24px_-6px_rgba(245,158,11,0.45)]"
            >
              <SlidersHorizontal className="w-3.5 h-3.5" />
              <span>Gérer Clés API &amp; Modèles Gratuits</span>
            </button>
          </aside>
        </div>
      )}
    </section>
  );
};
