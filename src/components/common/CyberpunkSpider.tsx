import React, { useEffect, useId, useRef } from 'react';
import {
  SPIDER_LEG_SPECS,
  SPIDER_VIEWBOX_SIZE,
  computeSpiderPose,
} from '../../utils/cyberpunkSpider';

interface CyberpunkSpiderProps {
  className?: string;
}

/**
 * Minimalist animated cyberpunk spider rendered in pure crisp vector SVG
 * on a transparent background:
 * - Small solid black geometric body with subtle neon-pink outline and glow
 * - 8 long, thin, asymmetrical angular legs in hot pink/magenta
 * - Small glowing yellow nodes at every articulation (knee, ankle) and extremity (tip)
 * - Continuous, fluid, independent organic leg articulation via rAF
 */
export const CyberpunkSpider: React.FC<CyberpunkSpiderProps> = ({ className = 'w-16 h-16' }) => {
  const uid = useId().replace(/:/g, '');
  const pinkGlowId = `spider-pink-glow-${uid}`;
  const yellowGlowId = `spider-yellow-glow-${uid}`;

  const cephaloRef = useRef<SVGPolygonElement | null>(null);
  const abdomenRef = useRef<SVGPolygonElement | null>(null);
  const legRefs = useRef<Array<SVGPolylineElement | null>>([]);
  const kneeRefs = useRef<Array<SVGCircleElement | null>>([]);
  const ankleRefs = useRef<Array<SVGCircleElement | null>>([]);
  const tipRefs = useRef<Array<SVGCircleElement | null>>([]);

  const initialPose = computeSpiderPose(0, false);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const prefersReduced =
      window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefersReduced) return;

    let rafId: number | null = null;
    const startMs = performance.now();

    const applyPose = (nowMs: number) => {
      const timeSec = (nowMs - startMs) * 0.001;
      const pose = computeSpiderPose(timeSec, true);

      if (cephaloRef.current) {
        cephaloRef.current.setAttribute('points', pose.cephalothoraxPoints);
      }
      if (abdomenRef.current) {
        abdomenRef.current.setAttribute('points', pose.abdomenPoints);
      }

      for (let i = 0; i < pose.legs.length; i++) {
        const leg = pose.legs[i];
        const poly = legRefs.current[i];
        if (poly) poly.setAttribute('points', leg.polylinePoints);

        const knee = kneeRefs.current[i];
        if (knee) {
          knee.setAttribute('cx', leg.knee.x.toFixed(2));
          knee.setAttribute('cy', leg.knee.y.toFixed(2));
        }

        const ankle = ankleRefs.current[i];
        if (ankle) {
          ankle.setAttribute('cx', leg.ankle.x.toFixed(2));
          ankle.setAttribute('cy', leg.ankle.y.toFixed(2));
        }

        const tip = tipRefs.current[i];
        if (tip) {
          tip.setAttribute('cx', leg.tip.x.toFixed(2));
          tip.setAttribute('cy', leg.tip.y.toFixed(2));
        }
      }

      rafId = window.requestAnimationFrame(applyPose);
    };

    rafId = window.requestAnimationFrame(applyPose);

    return () => {
      if (rafId !== null) {
        window.cancelAnimationFrame(rafId);
      }
    };
  }, []);

  return (
    <svg
      viewBox={`0 0 ${SPIDER_VIEWBOX_SIZE} ${SPIDER_VIEWBOX_SIZE}`}
      data-testid="cyberpunk-spider"
      aria-hidden="true"
      className={`${className} overflow-visible bg-transparent`}
      fill="none"
    >
      <defs>
        <filter id={pinkGlowId} x="-35%" y="-35%" width="170%" height="170%">
          <feGaussianBlur stdDeviation="1.9" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
        <filter id={yellowGlowId} x="-90%" y="-90%" width="280%" height="280%">
          <feGaussianBlur stdDeviation="1.6" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      {/* 8 long, thin, angular hot-pink / magenta articulated legs */}
      <g filter={`url(#${pinkGlowId})`}>
        {SPIDER_LEG_SPECS.map((spec, idx) => (
          <polyline
            key={spec.id}
            ref={el => {
              legRefs.current[idx] = el;
            }}
            data-leg-id={spec.id}
            points={initialPose.legs[idx].polylinePoints}
            stroke="#FF2A85"
            strokeWidth="1.45"
            strokeLinecap="round"
            strokeLinejoin="miter"
            strokeMiterlimit="4"
          />
        ))}
      </g>

      {/* Small solid black geometric body with subtle neon-pink outline and glow */}
      <g filter={`url(#${pinkGlowId})`}>
        <polygon
          ref={abdomenRef}
          points={initialPose.abdomenPoints}
          fill="#050508"
          stroke="#FF3B9A"
          strokeOpacity="0.92"
          strokeWidth="1.3"
          strokeLinejoin="miter"
        />
        <polygon
          ref={cephaloRef}
          points={initialPose.cephalothoraxPoints}
          fill="#040407"
          stroke="#FF2A85"
          strokeOpacity="0.96"
          strokeWidth="1.35"
          strokeLinejoin="miter"
        />
      </g>

      {/* Small glowing yellow nodes at every articulation and extremity */}
      <g filter={`url(#${yellowGlowId})`}>
        {SPIDER_LEG_SPECS.map((spec, idx) => {
          const leg = initialPose.legs[idx];
          return (
            <g key={`nodes-${spec.id}`}>
              <circle
                ref={el => {
                  kneeRefs.current[idx] = el;
                }}
                cx={leg.knee.x}
                cy={leg.knee.y}
                r="1.95"
                fill="#FDE047"
              />
              <circle
                ref={el => {
                  ankleRefs.current[idx] = el;
                }}
                cx={leg.ankle.x}
                cy={leg.ankle.y}
                r="1.75"
                fill="#FACC15"
              />
              <circle
                ref={el => {
                  tipRefs.current[idx] = el;
                }}
                cx={leg.tip.x}
                cy={leg.tip.y}
                r="1.5"
                fill="#FEF08A"
              />
            </g>
          );
        })}
      </g>
    </svg>
  );
};
