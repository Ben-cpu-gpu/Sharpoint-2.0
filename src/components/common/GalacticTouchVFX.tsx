import React, { useEffect, useRef, useState } from 'react';
import {
  COSMIC_PALETTE,
  CosmicParticle,
  CosmicPointer,
  CosmicPulse,
  DEFAULT_COSMIC_CONFIG,
  createCosmicParticles,
  stepCosmicParticles,
} from '../../utils/cosmicParticles';

interface GalacticTouchVFXProps {
  disabled?: boolean;
}

/**
 * Pre-renders a crisp luminous sphere with soft radial halo onto an offscreen sprite canvas
 * for each cosmic color so 60 FPS rendering of hundreds of particles stays fast on desktop & mobile.
 */
function buildGlowSprites(): HTMLCanvasElement[] {
  const spriteSize = 48;
  const center = spriteSize / 2;

  return COSMIC_PALETTE.map(spec => {
    const offscreen = document.createElement('canvas');
    offscreen.width = spriteSize;
    offscreen.height = spriteSize;
    const octx = offscreen.getContext('2d');
    if (!octx) return offscreen;

    // Soft outer luminous halo
    const halo = octx.createRadialGradient(center, center, 0, center, center, center);
    halo.addColorStop(0, `rgba(255, 255, 255, 1)`);
    halo.addColorStop(0.2, `rgba(${spec.coreRgb}, 0.94)`);
    halo.addColorStop(0.46, `rgba(${spec.haloRgb}, 0.44)`);
    halo.addColorStop(0.78, `rgba(${spec.haloRgb}, 0.12)`);
    halo.addColorStop(1, `rgba(${spec.haloRgb}, 0)`);

    octx.fillStyle = halo;
    octx.beginPath();
    octx.arc(center, center, center, 0, Math.PI * 2);
    octx.fill();

    // Crisp glowing inner bead
    octx.fillStyle = `rgba(255, 255, 255, 0.96)`;
    octx.beginPath();
    octx.arc(center, center, 5.4, 0, Math.PI * 2);
    octx.fill();

    return offscreen;
  });
}

/**
 * Champ de particules cosmiques interactif en Canvas 2D :
 * - Centaines de petites billes lumineuses (bleu électrique, violet, cyan, magenta)
 * - Flottement organique en apesanteur et ondulations collectives
 * - Répulsion circulaire progressive au curseur ou au toucher (Pointer Events),
 *   propagation douce aux particules voisines, inertie et force de rappel.
 */
export const GalacticTouchVFX: React.FC<GalacticTouchVFXProps> = ({ disabled = false }) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [particleCount, setParticleCount] = useState(0);

  useEffect(() => {
    if (disabled || typeof window === 'undefined') {
      setParticleCount(0);
      return;
    }

    const prefersReduced =
      window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefersReduced) return;

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const sprites = buildGlowSprites();
    let viewW = window.innerWidth;
    let viewH = window.innerHeight;
    let particles: CosmicParticle[] = createCosmicParticles(viewW, viewH);
    setParticleCount(particles.length);

    const activePointers = new Map<number, CosmicPointer>();
    const pulses: CosmicPulse[] = [];
    let rafId: number | null = null;
    let lastFrameMs = performance.now();
    const startMs = lastFrameMs;

    const resize = () => {
      const nextW = Math.max(1, window.innerWidth);
      const nextH = Math.max(1, window.innerHeight);
      const dpr = Math.min(window.devicePixelRatio || 1, 2);

      canvas.width = Math.floor(nextW * dpr);
      canvas.height = Math.floor(nextH * dpr);
      canvas.style.width = `${nextW}px`;
      canvas.style.height = `${nextH}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      // Rebuild/scale home positions proportionally so resize feels seamless
      if (Math.abs(nextW - viewW) > 60 || Math.abs(nextH - viewH) > 60) {
        viewW = nextW;
        viewH = nextH;
        particles = createCosmicParticles(viewW, viewH);
        setParticleCount(particles.length);
      } else {
        const sx = nextW / Math.max(1, viewW);
        const sy = nextH / Math.max(1, viewH);
        for (let i = 0; i < particles.length; i++) {
          particles[i].homeX *= sx;
          particles[i].homeY *= sy;
          particles[i].x *= sx;
          particles[i].y *= sy;
        }
        viewW = nextW;
        viewH = nextH;
      }
    };

    resize();
    window.addEventListener('resize', resize);

    const emitPulse = (x: number, y: number, strength: number, maxRadius: number) => {
      if (pulses.length >= 6) pulses.shift();
      pulses.push({
        x,
        y,
        radius: 10,
        maxRadius,
        speed: 4.8,
        strength,
        alpha: 1,
      });
    };

    const onPointerMove = (e: PointerEvent) => {
      const existing = activePointers.get(e.pointerId);
      const vx = existing ? e.clientX - existing.x : 0;
      const vy = existing ? e.clientY - existing.y : 0;

      activePointers.set(e.pointerId, {
        id: e.pointerId,
        x: e.clientX,
        y: e.clientY,
        vx: Math.max(-40, Math.min(40, vx)),
        vy: Math.max(-40, Math.min(40, vy)),
        active: true,
        isPressed: existing?.isPressed ?? e.buttons > 0,
      });

      const speed = Math.hypot(vx, vy);
      if (speed > 26 && pulses.length < 4) {
        emitPulse(e.clientX, e.clientY, 0.72, 195);
      }
    };

    const onPointerDown = (e: PointerEvent) => {
      activePointers.set(e.pointerId, {
        id: e.pointerId,
        x: e.clientX,
        y: e.clientY,
        vx: 0,
        vy: 0,
        active: true,
        isPressed: true,
      });
      emitPulse(e.clientX, e.clientY, 1.45, 255);
    };

    const onPointerRelease = (e: PointerEvent) => {
      if (e.pointerType === 'mouse' && e.type === 'pointerup') {
        const ptr = activePointers.get(e.pointerId);
        if (ptr) {
          ptr.isPressed = false;
        }
        return;
      }
      activePointers.delete(e.pointerId);
    };

    const clearPointers = () => {
      activePointers.clear();
    };

    window.addEventListener('pointermove', onPointerMove, { passive: true });
    window.addEventListener('pointerdown', onPointerDown, { passive: true });
    window.addEventListener('pointerup', onPointerRelease, { passive: true });
    window.addEventListener('pointercancel', onPointerRelease, { passive: true });
    window.addEventListener('blur', clearPointers);
    document.addEventListener('mouseleave', clearPointers);

    const drawFrame = (nowMs: number) => {
      const dtSec = (nowMs - lastFrameMs) * 0.001;
      lastFrameMs = nowMs;
      const timeSec = (nowMs - startMs) * 0.001;

      const pointerList = Array.from(activePointers.values());
      const responsiveRadius = viewW < 640 ? 128 : DEFAULT_COSMIC_CONFIG.repulsionRadius;

      stepCosmicParticles(particles, pointerList, pulses, dtSec, timeSec, {
        ...DEFAULT_COSMIC_CONFIG,
        repulsionRadius: responsiveRadius,
      });

      // Decay pointer velocity between frames
      for (const ptr of activePointers.values()) {
        ptr.vx *= 0.78;
        ptr.vy *= 0.78;
      }

      ctx.clearRect(0, 0, viewW, viewH);

      // Subtle violet/cyan nebula shimmer around active pointer touches
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';

      for (let j = 0; j < pointerList.length; j++) {
        const ptr = pointerList[j];
        if (!ptr.active) continue;
        const auraR = responsiveRadius * 0.92;
        const aura = ctx.createRadialGradient(ptr.x, ptr.y, 0, ptr.x, ptr.y, auraR);
        aura.addColorStop(0, ptr.isPressed ? 'rgba(167, 139, 250, 0.2)' : 'rgba(56, 189, 248, 0.12)');
        aura.addColorStop(0.55, 'rgba(236, 72, 153, 0.06)');
        aura.addColorStop(1, 'rgba(37, 99, 235, 0)');
        ctx.fillStyle = aura;
        ctx.beginPath();
        ctx.arc(ptr.x, ptr.y, auraR, 0, Math.PI * 2);
        ctx.fill();
      }

      // Draw hundreds of luminous spherical beads with subtle halos
      for (let i = 0; i < particles.length; i++) {
        const p = particles[i];
        const twinkle = 0.8 + 0.2 * Math.sin(timeSec * p.twinkleSpeed + p.phase);
        const speedBoost = Math.min(0.32, Math.hypot(p.vx, p.vy) * 0.045);
        const alpha = Math.min(1, p.baseAlpha * twinkle + speedBoost);
        const drawSize = p.radius * (7.4 + speedBoost * 5.2);
        const half = drawSize * 0.5;
        const sprite = sprites[p.colorIdx] || sprites[0];

        ctx.globalAlpha = alpha;
        ctx.drawImage(sprite, p.x - half, p.y - half, drawSize, drawSize);
      }

      ctx.restore();
      rafId = window.requestAnimationFrame(drawFrame);
    };

    rafId = window.requestAnimationFrame(drawFrame);

    return () => {
      window.removeEventListener('resize', resize);
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerdown', onPointerDown);
      window.removeEventListener('pointerup', onPointerRelease);
      window.removeEventListener('pointercancel', onPointerRelease);
      window.removeEventListener('blur', clearPointers);
      document.removeEventListener('mouseleave', clearPointers);
      if (rafId !== null) {
        window.cancelAnimationFrame(rafId);
      }
    };
  }, [disabled]);

  if (disabled) return null;

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      data-testid="galactic-touch-vfx"
      data-particle-count={particleCount}
      className="fixed inset-0 pointer-events-none z-[5]"
    />
  );
};
