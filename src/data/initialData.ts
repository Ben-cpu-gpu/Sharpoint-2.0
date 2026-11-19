import { AnnaleItem, StudySheet, Subject, TDExercise } from '../types/course';

export const availableSubjects: Subject[] = [
  {
    id: 'meca-flu',
    name: 'Mécanique des Fluides & Aéro',
    code: 'AERO-301',
    description: 'Écoulements incompressibles, couches limites, portance et traînée',
    color: 'from-blue-600 to-indigo-600',
  },
  {
    id: 'thermo',
    name: 'Thermodynamique & Moteurs',
    code: 'PROP-302',
    description: 'Cycles thermiques (Beau de Rochas, Brayton), turbomachines et bilans exergétiques',
    color: 'from-amber-600 to-orange-600',
  },
  {
    id: 'rdm',
    name: 'Résistance des Matériaux (RDM)',
    code: 'STRU-303',
    description: 'Flexion, torsion, flambement, critères de Tresca et Von Mises',
    color: 'from-emerald-600 to-teal-600',
  },
];

export const initialSheets: StudySheet[] = [
  {
    id: 'sheet_mecaflu_01',
    subjectId: 'meca-flu',
    title: 'Théorème de Bernoulli & Écoulements Parfaits',
    subtitle: 'Lois de conservation dans un tube de courant stationnaire',
    chapter: 'Dynamique des fluides incompressibles',
    tags: ['Aérodynamique', 'ESTACA Promo 3A', 'Examen Écrit', 'Fluides'],
    mastery: 'learning',
    theorems: [
      {
        id: 'thm_bernoulli',
        name: 'Théorème de Bernoulli (Forme Énergétique)',
        statement: 'P + \\frac{1}{2}\\rho v^2 + \\rho g z = \\text{Constante le long d\'une ligne de courant}',
        strictConditions: [
          'Écoulement stationnaire (\\partial / \\partial t = 0)',
          'Fluide incompressible (\\rho = \\text{cste})',
          'Fluide parfait non visqueux (\\mu = 0, aucune dissipation visqueuse)',
          'Le long d\'une même ligne de courant (ou partout si l\'écoulement est irrotationnel \\vec{\\nabla} \\times \\vec{v} = \\vec{0})'
        ],
        professorTip: 'Toujours annoncer les 4 hypothèses dans les 2 premières lignes de votre copie ESTACA. Oublier "le long d\'une même ligne de courant" fait perdre 1 point au barème.',
      },
      {
        id: 'thm_kutta',
        name: 'Théorème de Kutta-Joukowski (Portance Aérodynamique)',
        statement: 'L\' = \\rho_\\infty \\cdot V_\\infty \\cdot \\Gamma',
        strictConditions: [
          'Écoulement bidimensionnel plan non visqueux et irrotationnel',
          'Circulation de vitesse non nulle \\Gamma = \\oint_C \\vec{V} \\cdot d\\vec{l} autour du profil',
          'Fluide incompressible à vitesse subsonique modérée (Ma < 0.3)'
        ],
        professorTip: 'Vérifiez le signe de la circulation \\Gamma : orientée dans le sens horaire pour créer une portance dirigée vers le haut.',
      }
    ],
    magicFormulas: [
      {
        id: 'fml_pression_dynamique',
        name: 'Pression Dynamique de Stagnation',
        formula: 'q = \\frac{1}{2} \\rho v^2',
        unitsAndVariables: 'q : Pression dynamique en Pascal [Pa = kg·m⁻¹·s⁻²], \\rho : masse volumique du fluide en [kg/m³] (1.225 kg/m³ pour l\'air à 15°C au niveau de la mer), v : vitesse de l\'écoulement en mètres par seconde [m/s].',
        validityDomain: 'Vitesses subsoniques incompressibles (Nombre de Mach Ma < 0.3).',
      },
      {
        id: 'fml_reynolds',
        name: 'Nombre de Reynolds Caractéristique',
        formula: 'Re = \\frac{\\rho v L}{\\mu} = \\frac{v L}{\\nu}',
        unitsAndVariables: 'Re : Nombre sans dimension [-], \\rho : masse volumique [kg/m³], v : vitesse [m/s], L : longueur caractéristique (corde de l\'aile) [m], \\mu : viscosité dynamique [Pa·s = kg·m⁻¹·s⁻¹], \\nu : viscosité cinématique [m²/s].',
        validityDomain: 'Détermine la transition laminaire / turbulent (Re_critique ~ 5×10⁵ sur plaque plane).',
      },
      {
        id: 'fml_portance_globale',
        name: 'Force de Portance Aérodynamique Réelle',
        formula: 'F_z = \\frac{1}{2} \\rho S v^2 C_z',
        unitsAndVariables: 'F_z : Portance en Newtons [N], \\rho : [kg/m³], S : surface alaire en mètres carrés [m²], v : vitesse relative [m/s], C_z : coefficient adimensionnel de portance [-].',
        validityDomain: 'Valable pour un profil ou une voilure d\'aéronef avant le décrochage aérodynamique.',
      }
    ],
    stepByStepMethods: [
      {
        id: 'mth_tubepitot',
        goal: 'Calcul de la vitesse anémométrique d\'un aéronef via sonde Pitot',
        steps: [
          '1. Poser les deux points de référence : Point infini amont (1) et point d\'arrêt au nez du tube (2).',
          '2. Écrire le théorème de Bernoulli entre (1) et (2) sur la ligne de courant centrale : P_1 + 1/2 \\rho v_1^2 = P_2 (v_2 = 0 au point d\'arrêt).',
          '3. Exprimer la pression totale P_t = P_2 et la pression statique P_s = P_1.',
          '4. Isoler la vitesse littérale : v_1 = \\sqrt{\\frac{2(P_t - P_s)}{\\rho}}.',
          '5. Effectuer l\'application numérique avec \\rho = 1.225 kg/m³ et vérifier que la vitesse est exprimée en m/s (puis convertir en nœuds ou km/h si demandé).'
        ],
        trapToAvoid: 'Ne confondez pas pression statique P_s et pression totale P_t. La différence P_t - P_s est toujours strictement positive.',
      }
    ],
    examTraps: [
      'Appliquer Bernoulli entre deux réservoirs traversés par une pompe ou une turbine sans ajouter le terme de travail massique w_i.',
      'Utiliser la masse volumique de l\'eau (1000 kg/m³) à la place de l\'air (1.225 kg/m³) en aérodynamique.',
      'Oublier que Bernoulli n\'est valide que pour un fluide PARFAIT (invalide dans la couche limite où les frottements visqueux dominent).'
    ],
    flashcards: [
      {
        id: 'fc_flu_1',
        question: 'Quelles sont les 4 conditions strictes d\'application du théorème de Bernoulli simple ?',
        answer: '1. Écoulement stationnaire, 2. Fluide incompressible, 3. Fluide parfait (non visqueux), 4. Le long d\'une même ligne de courant.',
      },
      {
        id: 'fc_flu_2',
        question: 'Quelle est la valeur standard de la masse volumique de l\'air au niveau de la mer en atmosphère ISA ?',
        answer: '1.225 kg/m³ (à T = 288.15 K et P = 101325 Pa).',
      },
      {
        id: 'fc_flu_3',
        question: 'Comment s\'exprime le nombre de Reynolds et que compare-t-il ?',
        answer: 'Re = (rho * v * L) / mu. Il compare le rapport des forces d\'inertie sur les forces visqueuses.',
      }
    ],
    quiz: [
      {
        id: 'qz_flu_1',
        question: 'Une sonde Pitot mesure une pression totale de 102 500 Pa et une pression statique de 101 325 Pa dans l\'air (rho = 1.225 kg/m³). Quelle est la vitesse de l\'aéronef ?',
        options: ['v = 43.8 m/s', 'v = 31.0 m/s', 'v = 62.4 m/s', 'v = 98.2 m/s'],
        correctIndex: 0,
        explanation: 'Delta P = 102500 - 101325 = 1175 Pa. v = sqrt(2 * 1175 / 1.225) = sqrt(1918.36) = 43.8 m/s (soit ~157.7 km/h).',
      },
      {
        id: 'qz_flu_2',
        question: 'Dans la couche limite au voisinage d\'une voilure, que peut-on affirmer concernant le théorème de Bernoulli ?',
        options: [
          'Il s\'applique parfaitement car l\'air est un gaz parfait',
          'Il est inapplicable car les contraintes de cisaillement visqueux sont non négligeables',
          'Il s\'applique uniquement si la vitesse est supersonique',
          'Il s\'applique en remplaçant la pression statique par la portance'
        ],
        correctIndex: 1,
        explanation: 'Dans la couche limite, les gradients de vitesse sont très élevés et la viscosité joue un rôle de premier plan (forces visqueuses comparables aux forces d\'inertie), violant l\'hypothèse de fluide parfait.',
      }
    ]
  },
  {
    id: 'sheet_thermo_01',
    subjectId: 'thermo',
    title: 'Cycle de Beau de Rochas (Moteurs 4 Temps)',
    subtitle: 'Modélisation thermodynamique des moteurs à allumage commandé',
    chapter: 'Cycles moteurs à combustion interne',
    tags: ['Automobile', 'ESTACA Moteurs', 'Thermodynamique', 'Cycle Air Standard'],
    mastery: 'to_learn',
    theorems: [
      {
        id: 'thm_rendement_carnot',
        name: 'Théorème de Carnot pour moteur ditherme',
        statement: '\\eta_{Carnot} = 1 - \\frac{T_{source\\_froide}}{T_{source\\_chaude}} = 1 - \\frac{T_F}{T_C}',
        strictConditions: [
          'Cycle réversible fonctionnant entre exactement deux thermostats de températures T_F et T_C',
          'Aucune irréversibilité mécanique ou thermique (frottements internes nuls)',
          'Températures T_F et T_C exprimées impérativement en Kelvin [K]'
        ],
        professorTip: 'Règle d\'or ESTACA : Tout rendement supérieur au rendement de Carnot est physiquement impossible (violation du 2nd principe de la thermodynamique).',
      }
    ],
    magicFormulas: [
      {
        id: 'fml_taux_compression',
        name: 'Taux de Compression Volumétrique (Rapport volumétrique)',
        formula: 'r = \\frac{V_{max}}{V_{min}} = \\frac{V_1}{V_2}',
        unitsAndVariables: 'r : Taux volumétrique sans dimension [-] (typiquement entre 8 et 12 sur moteur essence), V_1 : volume au point mort bas (PMB) en [m³], V_2 : volume au point mort haut (PMH) en [m³].',
        validityDomain: 'Géométrie du cylindre moteur.',
      },
      {
        id: 'fml_rendement_otto',
        name: 'Rendement Théorique du Cycle de Beau de Rochas (Otto)',
        formula: '\\eta_{th} = 1 - \\frac{1}{r^{\\gamma - 1}}',
        unitsAndVariables: '\\eta_{th} : Rendement thermique sans dimension [-], r : taux de compression [-], \\gamma : indice adiabatique (C_p / C_v = 1.4 pour l\'air diatomique).',
        validityDomain: 'Cycle à air standard, compressions et détentes isentropiques, combustions et échappements isochores.',
      }
    ],
    stepByStepMethods: [
      {
        id: 'mth_otto_cycle',
        goal: 'Calcul des températures aux 4 points du cycle de Beau de Rochas',
        steps: [
          '1. Point 1 (Début de compression PMB) : T_1 et P_1 sont les conditions d\'admission ambiantes (ex: 298 K, 1 bar).',
          '2. Compression Isentropique 1 -> 2 : Utiliser la loi de Laplace T_2 = T_1 \\cdot r^{\\gamma - 1} et P_2 = P_1 \\cdot r^\\gamma.',
          '3. Combustion Isochore 2 -> 3 : Bilan d\'énergie Q_{23} = m \\cdot C_v \\cdot (T_3 - T_2) => T_3 = T_2 + \\frac{Q_{combustion}}{m C_v}.',
          '4. Détente Isentropique 3 -> 4 : T_4 = T_3 / r^{\\gamma - 1}.',
          '5. Refroidissement Isochore 4 -> 1 : Q_{41} = m \\cdot C_v \\cdot (T_1 - T_4) < 0 (chaleur cédée à la source froide).'
        ],
        trapToAvoid: 'Ne convertissez jamais les températures en Celsius pour la loi de Laplace. Toujours T_Kelvin = T_Celsius + 273.15.',
      }
    ],
    examTraps: [
      'Calculer avec la température en degré Celsius (°C) au lieu de Kelvin (K).',
      'Confondre C_p et C_v dans le calcul de la chaleur échangée à volume constant (Q = m * Cv * Delta T et non Cp).',
      'Oublier que l\'air standard a un coefficient gamma = 1.40 et une masse molaire M = 28.96 g/mol.'
    ],
    flashcards: [
      {
        id: 'fc_thm_1',
        question: 'Quelle est la relation de Mayer reliant Cp, Cv et R pour un gaz parfait ?',
        answer: 'Cp - Cv = R/M (ou Cpm - Cvm = R pour les capacités molaires).',
      },
      {
        id: 'fc_thm_2',
        question: 'Comment évolue le rendement du cycle d\'Otto lorsque le taux de compression r augmente ?',
        answer: 'Le rendement augmente asymptotiquement : eta = 1 - 1 / r^(gamma - 1).',
      }
    ],
    quiz: [
      {
        id: 'qz_thm_1',
        question: 'Pour un moteur à essence avec r = 9 et un fluide équivalent air (gamma = 1.4), quel est le rendement théorique du cycle de Beau de Rochas ?',
        options: ['eta = 58.5 %', 'eta = 42.1 %', 'eta = 74.2 %', 'eta = 33.3 %'],
        correctIndex: 0,
        explanation: 'eta = 1 - (1 / 9^(1.4 - 1)) = 1 - (1 / 9^0.4) = 1 - 0.415 = 0.585 soit 58.5%.',
      }
    ]
  },
  {
    id: 'sheet_rdm_01',
    subjectId: 'rdm',
    title: 'Flexion Simple & Critère de Von Mises',
    subtitle: 'Dimensionnement des structures aéronautiques et automobiles',
    chapter: 'Théorie des poutres et critères de ruine',
    tags: ['Structures', 'ESTACA RDM', 'Dimensionnement', 'Von Mises'],
    mastery: 'to_learn',
    theorems: [
      {
        id: 'thm_navier_bernoulli',
        name: 'Hypothèse cinématique d\'Euler-Bernoulli',
        statement: '\\sigma_{xx}(y) = - \\frac{M_{fz}}{I_{Gz}} \\cdot y',
        strictConditions: [
          'Poutre droite de section constante (ou lentement variable)',
          'Les sections droites planes et perpendiculaires à la ligne moyenne restent planes et perpendiculaires après déformation',
          'Matériau élastique linéaire, homogène et isotrope (Loi de Hooke \\sigma = E \\cdot \\epsilon)',
          'Petites perturbations et petits déplacements'
        ],
        professorTip: 'Le moment quadratique I_Gz s\'exprime en m⁴. Pour un rectangle de base b et hauteur h : I_Gz = (b * h³) / 12.',
      }
    ],
    magicFormulas: [
      {
        id: 'fml_von_mises_2d',
        name: 'Contrainte Équivalente de Von Mises (État plan de contraintes)',
        formula: '\\sigma_{VM} = \\sqrt{\\sigma_{xx}^2 + \\sigma_{yy}^2 - \\sigma_{xx}\\sigma_{yy} + 3\\tau_{xy}^2}',
        unitsAndVariables: '\\sigma_{VM} : Contrainte équivalente en Mégapascal [MPa = 10⁶ N/m²], \\sigma_{xx}, \\sigma_{yy} : contraintes normales [MPa], \\tau_{xy} : contrainte de cisaillement [MPa].',
        validityDomain: 'Matériaux ductiles (Aluminium aéronautique 2024-T3, aciers de châssis). Ruine si \\sigma_{VM} > R_e / s.',
      },
      {
        id: 'fml_moment_quadratique_rect',
        name: 'Moment Quadratique de Section Rectangulaire',
        formula: 'I_{Gz} = \\frac{b \\cdot h^3}{12}',
        unitsAndVariables: 'b : largeur de la poutre en [m], h : hauteur de la poutre en [m], I_{Gz} : moment d\'inertie en mètres à la puissance 4 [m⁴].',
        validityDomain: 'Section rectangulaire homogène par rapport à son axe neutre horizontal passant par le centre de gravité G.',
      }
    ],
    stepByStepMethods: [
      {
        id: 'mth_flexion_dim',
        goal: 'Dimensionner l\'épaisseur d\'un longeron d\'aile soumis à un moment fléchissant',
        steps: [
          '1. Établir le diagramme du moment fléchissant M_fz(x) le long de la travée.',
          '2. Identifier la section critique soumise au moment maximal |M_fz|_{max}.',
          '3. Calculer la contrainte normale maximale en fibre extrême : \\sigma_{max} = |M_{fz}|_{max} / (I_{Gz} / y_{max}).',
          '4. Poser la condition de résistance avec coefficient de sécurité s : \\sigma_{max} \\le \\frac{R_e}{s}.',
          '5. Isoler la cote inconnue (ex: hauteur h ou épaisseur e) et arrondir à la dimension standard supérieure.'
        ],
        trapToAvoid: 'Ne pas oublier que pour une section symétrique de hauteur h, y_{max} = h / 2.',
      }
    ],
    examTraps: [
      'Inverser b et h dans la formule I = b*h³/12 (c\'est la dimension parallèle à l\'axe neutre qui est au degré 1, la dimension perpendiculaire est au cube).',
      'Confondre la limite élastique R_e (seuil de plastification) et la résistance ultime à la rupture R_m.',
      'Oublier d\'appliquer le coefficient de sécurité s (s > 1.5 en aéronautique commerciale).'
    ],
    flashcards: [
      {
        id: 'fc_rdm_1',
        question: 'Quelle est la dimension et l\'unité SI du moment quadratique I_Gz ?',
        answer: 'Dimension L⁴, unité en mètres puissance 4 [m⁴] (ou mm⁴ en calcul pratique).',
      },
      {
        id: 'fc_rdm_2',
        question: 'Quelle est la condition de non-plastification selon le critère de Tresca ?',
        answer: 'sigma_Tresca = max(|sigma_1 - sigma_2|, |sigma_2 - sigma_3|, |sigma_3 - sigma_1|) <= Re / s.',
      }
    ],
    quiz: [
      {
        id: 'qz_rdm_1',
        question: 'Une poutre rectangulaire de largeur b = 20 mm et hauteur h = 60 mm subit un moment fléchissant M_fz = 1200 N·m. Quelle est la contrainte normale maximale en fibre extrême ?',
        options: ['sigma_max = 100 MPa', 'sigma_max = 50 MPa', 'sigma_max = 166.7 MPa', 'sigma_max = 25 MPa'],
        correctIndex: 0,
        explanation: 'I_Gz = b*h^3/12 = 0.020 * 0.060^3 / 12 = 3.6e-7 m^4. y_max = h/2 = 0.030 m. sigma_max = M * y_max / I_Gz = 1200 * 0.030 / 3.6e-7 = 100 000 000 Pa = 100 MPa.',
      }
    ]
  }
];

export const initialTdExercises: TDExercise[] = [
  {
    id: 'exo_td_mecaflu_01',
    subjectId: 'meca-flu',
    chapter: 'Théorème d\'Euler & Écoulements avec Déviation de Jet',
    title: 'Effort de poussée sur l\'aube d\'une turbomachine aéronautique',
    notion: 'Théorème des quantités de mouvement d\'Euler pour volume de contrôle ouvert',
    difficulty: 2,
    statement: `Un jet d'air horizontal de section constante $S = 0.02\\text{ m}^2$, de vitesse uniforme $V_1 = 150\\text{ m/s}$ et de masse volumique $\\rho = 1.225\\text{ kg/m}^3$, frappe une aube fixe qui dévie le jet d'un angle $\\theta = 60^\\circ$ sans frottement visqueux ($V_2 = V_1$).
    
1. Rappelez le théorème d'Euler pour un volume de contrôle fixe traversé par un écoulement stationnaire.
2. Déterminez le débit massique $Q_m$ traversant l'aube.
3. Calculez les composantes $R_x$ et $R_y$ de la force exercée par le fluide sur l'aube.
4. En déduire la norme totale de la force d'impact $\|\\vec{R}\|$.`,
    hints: [
      'Le théorème d\'Euler relie la résultante des forces extérieures au bilan des flux de quantité de mouvement : \\sum \\vec{F}_{ext} = Q_m (\\vec{V}_{out} - \\vec{V}_{in}).',
      'Attention au repère : la vitesse de sortie a pour composantes V_2 * cos(theta) selon x et V_2 * sin(theta) selon y.',
      'La force du fluide SUR l\'aube est l\'opposée de l\'action de l\'aube sur le fluide : \\vec{R}_{fluide \\to aube} = -\\vec{F}_{aube \\to fluide}.'
    ],
    solution: `**Résolution détaillée pas à pas :**

1. **Théorème d'Euler :**
En régime permanent pour un volume de contrôle délimité par l'aube et les sections d'entrée/sortie :
$$\\sum \\vec{F}_{ext} = Q_m (\\vec{V}_2 - \\vec{V}_1)$$
Ici, les pressions en entrée et en sortie sont égales à la pression atmosphérique ambiante $P_0$, donc la résultante des forces de pression est nulle. La seule force extérieure est la force exercée par l'aube sur le fluide $\\vec{F}_{aube \\to fluide}$.

2. **Débit massique :**
$$Q_m = \\rho \\cdot S \\cdot V_1 = 1.225 \\times 0.02 \\times 150 = 3.675\\text{ kg/s}$$

3. **Projection vectorielle :**
- Entrée : $\\vec{V}_1 = V_1 \\vec{u}_x$
- Sortie : $\\vec{V}_2 = V_1 \\cos(60^\\circ)\\vec{u}_x + V_1 \\sin(60^\\circ)\\vec{u}_y = 75\\vec{u}_x + 129.9\\vec{u}_y$
D'où l'action du fluide sur l'aube $\\vec{R} = - \\vec{F}_{aube \\to fluide} = Q_m (\\vec{V}_1 - \\vec{V}_2)$ :
$$R_x = Q_m (V_1 - V_1 \\cos 60^\\circ) = 3.675 \\times (150 - 75) = 275.6\\text{ N}$$
$$R_y = Q_m (0 - V_1 \\sin 60^\\circ) = -3.675 \\times 129.9 = -477.4\\text{ N}$$

4. **Norme totale :**
$$\\|\\vec{R}\\| = \\sqrt{R_x^2 + R_y^2} = \\sqrt{275.6^2 + (-477.4)^2} = 551.3\\text{ N}$$
L'effort exercé sur l'aube est donc de **551.3 N**.`,
    status: 'in_progress',
    createdAt: '2026-11-19T10:00:00Z',
  },
  {
    id: 'exo_td_thermo_01',
    subjectId: 'thermo',
    chapter: 'Cycle de Brayton & Turboréacteur Double Flux',
    title: 'Rendement thermique d\'une turbine à gaz aéronautique',
    notion: 'Compressions isentropiques et apport de chaleur isobare',
    difficulty: 3,
    statement: `Une turbine à gaz d'avion fonctionne suivant un cycle de Brayton idéal. L'air entre dans le compresseur à $T_1 = 280\\text{ K}$ et $P_1 = 1\\text{ bar}$. Le taux de compression du compresseur vaut $\\pi = P_2 / P_1 = 16$.
La température maximale admissible en entrée de turbine est limitée métallurgiquement à $T_3 = 1450\\text{ K}$.
On prendra $\\gamma = 1.4$ et $C_p = 1005\\text{ J/(kg}\\cdot\\text{K)}$.

1. Calculez la température $T_2$ en fin de compression isentropique.
2. Calculez la température $T_4$ en sortie de turbine après détente isentropique jusqu'à $P_4 = P_1$.
3. Déterminez le travail net massique développé par le cycle $w_{net} = w_{turbine} - w_{compresseur}$.
4. Calculez le rendement thermique global $\\eta$ du cycle et comparez-le à la formule théorique.`,
    hints: [
      'Pour une compression isentropique de gaz parfait : T_2 = T_1 * (P_2 / P_1)^((gamma - 1)/gamma).',
      'Le travail du compresseur est w_c = Cp * (T_2 - T_1). Le travail de turbine est w_t = Cp * (T_3 - T_4).',
      'Le rendement théorique s\'exprime uniquement en fonction du taux de pression : \\eta = 1 - \\pi^(-(\\gamma-1)/\\gamma).'
    ],
    solution: `**Correction détaillée :**

1. **Température en fin de compression (1 -> 2) :**
$$\\frac{\\gamma - 1}{\\gamma} = \\frac{0.4}{1.4} \\approx 0.2857$$
$$T_2 = T_1 \\cdot \\pi^{0.2857} = 280 \\cdot 16^{0.2857} = 280 \\cdot 2.2085 = 618.4\\text{ K}$$

2. **Température en sortie de turbine (3 -> 4) :**
La détente 3 -> 4 est isentropique vers le même rapport de pression $\\pi$ :
$$T_4 = \\frac{T_3}{\\pi^{0.2857}} = \\frac{1450}{2.2085} = 656.5\\text{ K}$$

3. **Travail net massique :**
$$w_c = C_p (T_2 - T_1) = 1005 \\times (618.4 - 280) = 340.1\\text{ kJ/kg}$$
$$w_t = C_p (T_3 - T_4) = 1005 \\times (1450 - 656.5) = 797.5\\text{ kJ/kg}$$
$$w_{net} = w_t - w_c = 797.5 - 340.1 = 457.4\\text{ kJ/kg}$$

4. **Rendement thermique :**
Chaleur fournie dans la chambre de combustion :
$$q_{in} = C_p (T_3 - T_2) = 1005 \\times (1450 - 618.4) = 835.8\\text{ kJ/kg}$$
$$\\eta = \\frac{w_{net}}{q_{in}} = \\frac{457.4}{835.8} = 54.7\\%$$
Formule théorique directe : $\\eta_{th} = 1 - \\frac{1}{16^{0.2857}} = 1 - 0.4528 = 54.7\\%$. Concordance parfaite.`,
    status: 'todo',
    createdAt: '2026-11-19T11:00:00Z',
  }
];

export const initialAnnales: AnnaleItem[] = [
  {
    id: 'annale_estaca_2024_01',
    subjectId: 'meca-flu',
    chapter: 'Aérodynamique & Écoulements compressibles',
    title: 'Examen Final ESTACA 2024 - Aérodynamique Haute Vitesse & Effet Venturi',
    notion: 'Bernoulli généralisé, débit critique et force de portance sur profil NACA 0012',
    difficulty: 3,
    statement: `ÉPREUVE OFFICIELLE D'AÉRODYNAMIQUE ESTACA - PROMO 2026 (Durée : 2h00 - Sans calculatrice programmable)

Un avion d'affaires vole à vitesse de croisière $V_\\infty = 180\\text{ m/s}$ à une altitude où la pression ambiante vaut $P_\\infty = 70\\text{ kPa}$ et la température $T_\\infty = 250\\text{ K}$.
L'aile d'envergure $b = 14\\text{ m}$ et de corde moyenne $c = 2.2\\text{ m}$ est équipée d'un profil symétrique NACA 0012 avec un calage à incidence $\\alpha = 4^\\circ$.

Partie 1 : Bilan sur la chambre de combustion et effet Venturi interne.
Partie 2 : Calcul de la portance brute générée à partir du coefficient de portance théorique $C_z = 2\\pi \\alpha_{rad}$.
Partie 3 : Détermination de la traînée induite en supposant une répartition elliptique de circulation.`,
    hints: [
      'Pour le NACA 0012 à faible incidence : C_z = 2 * pi * alpha_rad. Pensez à convertir 4 degrés en radians (alpha_rad = 4 * pi / 180).',
      'Masse volumique de l\'air ambiant : rho = P_\\infty / (r * T_\\infty) avec r = 287 J/(kg*K).',
      'Traînée induite : C_{xi} = C_z^2 / (pi * Lambda) où Lambda = b^2 / S est l\'allongement de la voilure.'
    ],
    solution: `**Corrigé Officiel Examen ESTACA :**

**1. Masse volumique de l'air en vol :**
$$\\rho = \\frac{P_\\infty}{r T_\\infty} = \\frac{70000}{287 \\times 250} = \\frac{70000}{71750} = 0.9756\\text{ kg/m}^3$$

**2. Coefficient de portance et force globale :**
- Incidence en radians : $\\alpha_{rad} = 4 \\times \\frac{\\pi}{180} = 0.06981\\text{ rad}$
- Coefficient théorique : $C_z = 2\\pi \\times 0.06981 = 0.4386$
- Surface alaire : $S = b \\times c = 14 \\times 2.2 = 30.8\\text{ m}^2$
- Portance totale $F_z$ :
$$F_z = \\frac{1}{2} \\rho S V_\\infty^2 C_z = \\frac{1}{2} \\times 0.9756 \\times 30.8 \\times (180)^2 \\times 0.4386 = 213\\,640\\text{ N} \\approx 213.6\\text{ kN}$$

**3. Allongement et Traînée Induite :**
- Allongement : $\\Lambda = \\frac{b^2}{S} = \\frac{14^2}{30.8} = 6.364$
- Coefficient de traînée induite :
$$C_{xi} = \\frac{C_z^2}{\\pi \\Lambda} = \\frac{(0.4386)^2}{\\pi \\times 6.364} = \\frac{0.1924}{20.0} = 0.00962$$
- Force de traînée induite :
$$F_{xi} = \\frac{1}{2} \\rho S V_\\infty^2 C_{xi} = \\frac{1}{2} \\times 0.9756 \\times 30.8 \\times 32400 \\times 0.00962 = 4\\,685\\text{ N} \\approx 4.69\\text{ kN}$$

La finesse aérodynamique induite vaut ainsi $f = C_z / C_{xi} = 0.4386 / 0.00962 \\approx 45.6$.`,
    status: 'todo',
    session: 'Session Principale Janvier',
    year: 2024,
    durationMinutes: 120,
    points: 20,
    gradingCriteria: [
      'Calcul rigoureux de la masse volumique rho (loi des gaz parfaits) : 3 pts',
      'Conversion propre de l\'angle d\'incidence et formule de portance mince : 4 pts',
      'Surface alaire et application numérique précise de F_z : 5 pts',
      'Définition de l\'allongement Lambda et formule de Munk pour la traînée induite : 5 pts',
      'Respect des unités SI et analyse critique de la finesse : 3 pts'
    ],
    createdAt: '2026-11-19T09:00:00Z',
  }
];
