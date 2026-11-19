export interface RectBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface OrbitalNodePosition {
  id: string;
  angleDeg: number;
  x: number;
  y: number;
  align: 'left' | 'right' | 'center';
  box: RectBox;
}

export interface SolarLayoutResult {
  width: number;
  height: number;
  cx: number;
  cy: number;
  sunRadius: number;
  ring1: { rx: number; ry: number; nodes: OrbitalNodePosition[] };
  ring2: { rx: number; ry: number; nodes: OrbitalNodePosition[] };
  ring3: { rx: number; ry: number; nodes: OrbitalNodePosition[] };
}

export const SOLAR_CANVAS_WIDTH = 960;
export const SOLAR_CANVAS_HEIGHT = 700;
export const SOLAR_CX = 480;
export const SOLAR_CY = 350;

/**
 * Calcule des coordonnées orbitales sans chevauchement pour :
 * - Centre : Soleil (Rajouter un PDF)
 * - Anneau 1 : Catégories (Fiches de cours, Exos, Annales)
 * - Anneau 2 : Matières (13 matières disposées sur les arcs gauche/droit)
 * - Anneau 3 : Clés API (satellites externes sur les arcs supérieur et inférieur)
 */
export function computeSolarSystemLayout(
  categoryIds: readonly string[],
  subjectIds: readonly string[],
  apiProviderIds: readonly string[]
): SolarLayoutResult {
  const cx = SOLAR_CX;
  const cy = SOLAR_CY;

  // Anneau 1 : 3 catégories autour du Soleil (clearance >= 16px autour du Soleil et sans troncature)
  const r1x = 158;
  const r1y = 114;
  const ring1Angles = [-90, 26, 154];
  const ring1Nodes: OrbitalNodePosition[] = categoryIds.map((id, idx) => {
    const angleDeg = ring1Angles[idx % ring1Angles.length];
    const rad = (angleDeg * Math.PI) / 180;
    const x = Math.round(cx + r1x * Math.cos(rad));
    const y = Math.round(cy + r1y * Math.sin(rad));
    const width = 156;
    const height = 34;
    return {
      id,
      angleDeg,
      x,
      y,
      align: 'center',
      box: { x: x - width / 2, y: y - height / 2, width, height },
    };
  });

  // Anneau 2 : 13 matières réparties sans superposition (7 à droite, 6 à gauche sur ellipse ample)
  const r2x = 278;
  const r2y = 210;
  const rightCount = Math.ceil(subjectIds.length / 2);
  const leftCount = subjectIds.length - rightCount;

  const ring2Nodes: OrbitalNodePosition[] = subjectIds.map((id, idx) => {
    let angleDeg: number;
    let align: 'left' | 'right' | 'center';

    if (idx < rightCount) {
      const spanStart = -66;
      const spanEnd = 66;
      const t = rightCount === 1 ? 0.5 : idx / (rightCount - 1);
      angleDeg = spanStart + t * (spanEnd - spanStart);
      align = 'left';
    } else {
      const leftIdx = idx - rightCount;
      const spanStart = 116;
      const spanEnd = 244;
      const t = leftCount === 1 ? 0.5 : leftIdx / (leftCount - 1);
      angleDeg = spanStart + t * (spanEnd - spanStart);
      align = 'right';
    }

    const rad = (angleDeg * Math.PI) / 180;
    const x = Math.round(cx + r2x * Math.cos(rad));
    const y = Math.round(cy + r2y * Math.sin(rad));
    const width = 172;
    const height = 34;

    const boxX = align === 'left' ? x - 12 : x - width + 12;
    return {
      id,
      angleDeg,
      x,
      y,
      align,
      box: { x: boxX, y: y - height / 2, width, height },
    };
  });

  // Anneau 3 : Clés API sur l'orbite extérieure (arc supérieur et inférieur, hors zone latérale des 13 matières)
  const r3x = 414;
  const r3y = 304;
  const topCount = Math.ceil(apiProviderIds.length / 2);
  const bottomCount = apiProviderIds.length - topCount;

  const ring3Nodes: OrbitalNodePosition[] = apiProviderIds.map((id, idx) => {
    let angleDeg: number;
    if (idx < topCount) {
      const t = topCount === 1 ? 0.5 : idx / (topCount - 1);
      angleDeg = -128 + t * 76; // -128° à -52°
    } else {
      const bIdx = idx - topCount;
      const t = bottomCount === 1 ? 0.5 : bIdx / (bottomCount - 1);
      angleDeg = 52 + t * 76; // +52° à +128°
    }

    const rad = (angleDeg * Math.PI) / 180;
    const x = Math.round(cx + r3x * Math.cos(rad));
    const y = Math.round(cy + r3y * Math.sin(rad));
    const width = 152;
    const height = 42;

    return {
      id,
      angleDeg,
      x,
      y,
      align: 'center',
      box: { x: x - width / 2, y: y - height / 2, width, height },
    };
  });

  return {
    width: SOLAR_CANVAS_WIDTH,
    height: SOLAR_CANVAS_HEIGHT,
    cx,
    cy,
    sunRadius: 52,
    ring1: { rx: r1x, ry: r1y, nodes: ring1Nodes },
    ring2: { rx: r2x, ry: r2y, nodes: ring2Nodes },
    ring3: { rx: r3x, ry: r3y, nodes: ring3Nodes },
  };
}

export function boxesOverlap(a: RectBox, b: RectBox, padding = 2): boolean {
  return !(
    a.x + a.width + padding <= b.x ||
    b.x + b.width + padding <= a.x ||
    a.y + a.height + padding <= b.y ||
    b.y + b.height + padding <= a.y
  );
}
