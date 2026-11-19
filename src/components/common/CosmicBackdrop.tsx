import React, { useEffect, useRef } from 'react';

interface Star {
  x: number;
  y: number;
  r: number;
  alpha: number;
  twinkleSpeed: number;
  phase: number;
  tint: string;
}

interface OrbitParticle {
  angle: number;
  radiusRatio: number;
  speed: number;
  size: number;
  alpha: number;
  isAmber: boolean;
}

export const CosmicBackdrop: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const prefersReducedMotion =
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    let animationId = 0;
    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = window.innerHeight);

    const starTints = ['#F8FAFC', '#E2E8F0', '#BAE6FD', '#FDE68A'];
    const stars: Star[] = Array.from({ length: 95 }, () => ({
      x: Math.random() * width,
      y: Math.random() * height,
      r: Math.random() * 1.15 + 0.25,
      alpha: Math.random() * 0.45 + 0.12,
      twinkleSpeed: Math.random() * 0.008 + 0.002,
      phase: Math.random() * Math.PI * 2,
      tint: starTints[Math.floor(Math.random() * starTints.length)],
    }));

    const orbitParticles: OrbitParticle[] = Array.from({ length: 42 }, () => ({
      angle: Math.random() * Math.PI * 2,
      radiusRatio: 0.14 + Math.random() * 0.28,
      speed: (Math.random() * 0.0012 + 0.0004) * (Math.random() > 0.2 ? 1 : 0.6),
      size: Math.random() * 1.4 + 0.5,
      alpha: Math.random() * 0.35 + 0.08,
      isAmber: Math.random() > 0.32,
    }));

    const handleResize = () => {
      if (!canvas) return;
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
      stars.forEach((s) => {
        s.x = Math.random() * width;
        s.y = Math.random() * height;
      });
    };

    window.addEventListener('resize', handleResize);

    let tick = 0;
    const drawFrame = () => {
      ctx.clearRect(0, 0, width, height);
      tick += 1;

      // Subtle starfield
      for (const star of stars) {
        const twinkle = prefersReducedMotion
          ? 1
          : 0.7 + 0.3 * Math.sin(tick * star.twinkleSpeed + star.phase);
        ctx.globalAlpha = star.alpha * twinkle;
        ctx.fillStyle = star.tint;
        ctx.beginPath();
        ctx.arc(star.x, star.y, star.r, 0, Math.PI * 2);
        ctx.fill();
      }

      // Faint accretion dust orbiting a distant upper-right singularity focal point
      const cx = width * 0.84;
      const cy = height * 0.18;
      const baseScale = Math.min(width, height);

      for (const p of orbitParticles) {
        if (!prefersReducedMotion) {
          p.angle += p.speed;
        }
        const rx = baseScale * p.radiusRatio * 1.45;
        const ry = baseScale * p.radiusRatio * 0.42;
        const cosTilt = Math.cos(-0.28);
        const sinTilt = Math.sin(-0.28);
        const lx = Math.cos(p.angle) * rx;
        const ly = Math.sin(p.angle) * ry;
        const px = cx + lx * cosTilt - ly * sinTilt;
        const py = cy + lx * sinTilt + ly * cosTilt;

        ctx.globalAlpha = p.alpha;
        ctx.fillStyle = p.isAmber ? '#FBBF24' : '#7DD3FC';
        ctx.beginPath();
        ctx.arc(px, py, p.size, 0, Math.PI * 2);
        ctx.fill();
      }

      ctx.globalAlpha = 1;
    };

    drawFrame();

    if (!prefersReducedMotion) {
      let lastTime = 0;
      const loop = (time: number) => {
        // ~30fps cap keeps CPU light and thermal profile quiet
        if (time - lastTime >= 33) {
          lastTime = time;
          drawFrame();
        }
        animationId = requestAnimationFrame(loop);
      };
      animationId = requestAnimationFrame(loop);
    }

    return () => {
      window.removeEventListener('resize', handleResize);
      if (animationId) cancelAnimationFrame(animationId);
    };
  }, []);

  return (
    <div
      aria-hidden="true"
      className="fixed inset-0 pointer-events-none overflow-hidden z-0"
    >
      {/* Deep Space Obsidian & Distant Singularity Halo */}
      <div
        className="absolute inset-0"
        style={{
          background:
            'radial-gradient(circle at 84% 16%, rgba(245, 158, 11, 0.08) 0%, rgba(15, 23, 42, 0.35) 28%, rgba(4, 6, 12, 0.96) 66%), radial-gradient(circle at 12% 88%, rgba(56, 189, 248, 0.05) 0%, transparent 45%)',
        }}
      />

      {/* Precision Orbital Coordinate Reticle */}
      <svg
        className="absolute -top-48 -right-48 w-[760px] h-[760px] text-slate-300 opacity-[0.06]"
        viewBox="0 0 600 600"
        fill="none"
      >
        <circle cx="300" cy="300" r="110" stroke="currentColor" strokeWidth="1" />
        <circle cx="300" cy="300" r="175" stroke="currentColor" strokeWidth="0.75" strokeDasharray="4 6" />
        <ellipse
          cx="300"
          cy="300"
          rx="270"
          ry="82"
          transform="rotate(-16 300 300)"
          stroke="#F59E0B"
          strokeWidth="1"
        />
        <ellipse
          cx="300"
          cy="300"
          rx="220"
          ry="64"
          transform="rotate(-16 300 300)"
          stroke="currentColor"
          strokeWidth="0.75"
          strokeDasharray="2 5"
        />
      </svg>

      <canvas ref={canvasRef} className="absolute inset-0 w-full h-full" />
    </div>
  );
};
