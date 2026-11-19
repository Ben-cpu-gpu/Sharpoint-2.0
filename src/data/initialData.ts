import { AnnaleItem, StudySheet, Subject, TDExercise } from '../types/course';

export const availableSubjects: Subject[] = [
  {
    id: 'maths',
    name: 'Mathématiques',
    code: 'MATH-101',
    description: 'Analyse, algèbre linéaire, calcul différentiel et équations différentielles',
    color: 'from-amber-500 to-orange-500',
  },
  {
    id: 'meca-point',
    name: 'Mécanique du Point',
    code: 'MECA-102',
    description: 'Cinématique, dynamique newtonienne, théorèmes énergétiques et moments cinétiques',
    color: 'from-sky-500 to-blue-600',
  },
  {
    id: 'meca-systemes',
    name: 'Mécanique des systèmes',
    code: 'MECA-201',
    description: 'Cinématique du solide, torseurs, géométrie des masses et dynamique des systèmes',
    color: 'from-indigo-500 to-blue-600',
  },
  {
    id: 'meca-fluides',
    name: 'Mécanique des Fluides',
    code: 'FLUI-301',
    description: 'Statique des fluides, Bernoulli, théorème d\'Euler et écoulements visqueux',
    color: 'from-cyan-500 to-sky-600',
  },
  {
    id: 'thermodynamique',
    name: 'Thermodynamique',
    code: 'THER-202',
    description: 'Principes de la thermodynamique, machines thermiques, cycles moteurs et entropie',
    color: 'from-amber-600 to-rose-600',
  },
  {
    id: 'thermochimie',
    name: 'Thermochimie',
    code: 'CHIM-203',
    description: 'Enthalpies de réaction, équilibres chimiques, loi de Hess et potentiel chimique',
    color: 'from-rose-500 to-amber-500',
  },
  {
    id: 'ondes',
    name: 'Physique des Ondes',
    code: 'PHYS-204',
    description: 'Propagation mécanique et électromagnétique, interférences, diffraction et acoustique',
    color: 'from-violet-500 to-sky-500',
  },
  {
    id: 'electricite',
    name: 'Électricité',
    code: 'ELEC-103',
    description: 'Circuits linéaires, régimes transitoires et sinusoïdaux, quadripôles et filtrage',
    color: 'from-yellow-500 to-amber-600',
  },
  {
    id: 'outils-ingenieur',
    name: "Outil du Physicien et de l'Ingénieur",
    code: 'OUTI-104',
    description: 'Analyse dimensionnelle, incertitudes de mesure, calcul vectoriel et méthodes numériques',
    color: 'from-slate-400 to-sky-500',
  },
  {
    id: 'tech-mecanismes',
    name: 'Technologie des Mécanismes',
    code: 'TECH-205',
    description: 'Liaisons mécaniques, schémas cinématiques, transmissions de puissance et cotation',
    color: 'from-orange-500 to-amber-600',
  },
  {
    id: 'algorithmique',
    name: 'Algorithmique',
    code: 'ALGO-105',
    description: 'Structures de données, complexité, récursivité et algorithmes numériques',
    color: 'from-emerald-500 to-cyan-600',
  },
  {
    id: 'empreinte-carbone',
    name: 'Empreinte Carbone',
    code: 'ECOL-206',
    description: 'Bilans carbone, analyse du cycle de vie (ACV), mix énergétique et décarbonation',
    color: 'from-emerald-500 to-teal-600',
  },
  {
    id: 'langues',
    name: 'Langues',
    code: 'LANG-106',
    description: 'Anglais scientifique et technique, communication d\'ingénierie et préparation TOEIC',
    color: 'from-sky-400 to-indigo-500',
  },
];

export const initialSheets: StudySheet[] = [];

export const initialTdExercises: TDExercise[] = [];

export const initialAnnales: AnnaleItem[] = [];
