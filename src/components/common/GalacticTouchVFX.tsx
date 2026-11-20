import React, { useEffect, useRef } from 'react';

interface GalacticTouchVFXProps {
  disabled?: boolean;
}

interface StarParticle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  alpha: number;
  decay: number;
  color: string;
  twinklePhase: number;
}

interface RibbonNode {
  x: number;
  y: number;
  life: number;
}

const GALAXY_PALETTE = [
  'rgba(248, 250, 252,', // Starlight white
  'rgba(56, 189, 248,',  // Cyan nebula
  'rgba(245, 158, 11,',  // Solar amber
  'rgba(167, 139, 250,', // Milky Way violet
];

/**
 * Effet visuel galactique léger ("Voie Lactée") déclenché au survol de la souris ou au balayage tactile.
 * Optimisé 2D Canvas : s'arrête automatiquement (0% CPU) dès que le sillage s'estompe.
 */
export const GalacticTouchVFX: React.FC<GalacticTouchVFXProps> = ({ disabled = false }) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const particlesRef = useRef<StarParticle[]>([]);
  const ribbonRef = useRef<RibbonNode[]>([]);
  const rafRef = useRef<number | null>(null);
  const lastSpawnRef = useRef<{ x: number; y: number; t: number }>({ x: 0, y: 0, t: 0 });

  useEffect(() => {
    if (disabled || typeof window === 'undefined') {
      particlesRef.current = [];
      ribbonRef.current = [];
      return;
    }

    const prefersReduced =
      window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefersReduced) return;

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 1.75);
      canvas.width = Math.floor(window.innerWidth * dpr);
      canvas.height = Math.floor(window.innerHeight * dpr);
      canvas.style.width = `${window.innerWidth}px`;
      canvas.style.height = `${window.innerHeight}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();
    window.addEventListener('resize', resize);

    const drawFrame = () => {
      ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);

      // 1. Sillage nébuleuse / constellation reliant les positions récentes du curseur ou du doigt
      const ribbon = ribbonRef.current;
      for (let i = ribbon.length - 1; i >= 0; i--) {
        ribbon[i].life -= 0.045;
        if (ribbon[i].life <= 0) {
          ribbon.splice(i, 1);
        }
      }

      if (ribbon.length >= 2) {
        ctx.save();
        ctx.lineCap = 'round';
        for (let i = 1; i < ribbon.length; i++) {
          const prev = ribbon[i - 1];
          const curr = ribbon[i];
          const alpha = Math.min(prev.life, curr.life) * 0.22;
          if (alpha <= 0.005) continue;
          const grad = ctx.createLinearGradient(prev.x, prev.y, curr.x, curr.y);
          grad.addColorStop(0, `rgba(56, 189, 248, ${alpha})`);
          grad.addColorStop(0.5, `rgba(167, 139, 250, ${alpha * 1.1})`);
          grad.addColorStop(1, `rgba(245, 158, 11, ${alpha})`);
          ctx.strokeStyle = grad;
          ctx.lineWidth = 1.6 + curr.life * 2.2;
          ctx.beginPath();
          ctx.moveTo(prev.x, prev.y);
          ctx.lineTo(curr.x, curr.y);
          ctx.stroke();
        }
        ctx.restore();
      }

      // 2. Poussière d'étoiles galactiques
      const particles = particlesRef.current;
      for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];
        p.x += p.vx;
        p.y += p.vy;
        p.vx *= 0.965;
        p.vy *= 0.965;
        p.alpha -= p.decay;
        p.twinklePhase += 0.18;

        if (p.alpha <= 0.01) {
          particles.splice(i, 1);
          continue;
        }

        const twinkle = 0.72 + 0.28 * Math.sin(p.twinklePhase);
        const a = Math.max(0, Math.min(1, p.alpha * twinkle));

        // Halo nébuleux subtil
        const glowRadius = p.radius * 3.4;
        const glow = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, glowRadius);
        glow.addColorStop(0, `${p.color} ${a * 0.85})`);
        glow.addColorStop(0.45, `${p.color} ${a * 0.28})`);
        glow.addColorStop(1, `${p.color} 0)`);
        ctx.fillStyle = glow;
        ctx.beginPath();
        ctx.arc(p.x, p.y, glowRadius, 0, Math.PI * 2);
        ctx.fill();

        // Cœur stellaire brillant
        ctx.fillStyle = `rgba(255, 255, 255, ${Math.min(1, a * 1.15)})`;
        ctx.beginPath();
        ctx.arc(p.x, p.y, Math.max(0.7, p.radius * 0.55), 0, Math.PI * 2);
        ctx.fill();
      }

      if (particles.length > 0 || ribbon.length > 0) {
        rafRef.current = window.requestAnimationFrame(drawFrame);
      } else {
        rafRef.current = null;
        ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);
      }
    };

    const ensureLoopRunning = () => {
      if (rafRef.current === null) {
        rafRef.current = window.requestAnimationFrame(drawFrame);
      }
    };

    const spawnBurst = (x: number, y: number, count: number, speedScale = 1) => {
      const now = performance.now();
      const dx = x - lastSpawnRef.current.x;
      const dy = y - lastSpawnRef.current.y;
      if (count <= 3 && Math.hypot(dx, dy) < 6 && now - lastSpawnRef.current.t < 18) {
        return;
      }
      lastSpawnRef.current = { x, y, t: now };

      ribbonRef.current.push({ x, y, life: 1 });
      if (ribbonRef.current.length > 18) {
        ribbonRef.current.shift();
      }

      const maxParticles = 96;
      for (let i = 0; i < count; i++) {
        if (particlesRef.current.length >= maxParticles) {
          particlesRef.current.shift();
        }
        const angle = Math.random() * Math.PI * 2;
        const speed = (0.25 + Math.random() * 1.15) * speedScale;
        const color = GALAXY_PALETTE[Math.floor(Math.random() * GALAXY_PALETTE.length)];
        particlesRef.current.push({
          x: x + (Math.random() - 0.5) * 10,
          y: y + (Math.random() - 0.5) * 10,
          vx: Math.cos(angle) * speed + dx * 0.03,
          vy: Math.sin(angle) * speed + dy * 0.03,
          radius: 1.1 + Math.random() * 2.1,
          alpha: 0.65 + Math.random() * 0.35,
          decay: 0.018 + Math.random() * 0.018,
          color,
          twinklePhase: Math.random() * Math.PI * 2,
        });
      }

      ensureLoopRunning();
    };

    const onPointerMove = (e: PointerEvent) => {
      spawnBurst(e.clientX, e.clientY, 2, 0.9);
    };

    const onPointerDown = (e: PointerEvent) => {
      spawnBurst(e.clientX, e.clientY, 8, 1.35);
    };

    const onTouchMove = (e: TouchEvent) => {
      const touch = e.touches[0];
      if (touch) {
        spawnBurst(touch.clientX, touch.clientY, 3, 1.05);
      }
    };

    window.addEventListener('pointermove', onPointerMove, { passive: true });
    window.addEventListener('pointerdown', onPointerDown, { passive: true });
    window.addEventListener('touchmove', onTouchMove, { passive: true });

    return () => {
      window.removeEventListener('resize', resize);
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerdown', onPointerDown);
      window.removeEventListener('touchmove', onTouchMove);
      if (rafRef.current !== null) {
        window.cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
    };
  }, [disabled]);

  if (disabled) return null;

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      data-testid="galactic-touch-vfx"
      className="fixed inset-0 pointer-events-none z-[15]"
    />
  );
};
