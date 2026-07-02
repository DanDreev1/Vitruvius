'use client';

import { useEffect, useState } from 'react';

const DESIGN_WIDTH = 1440;
const DESIGN_HEIGHT = 900;
const MIN_SUPPORTED_WIDTH = 500;

export default function ScaledPageViewport({
  children,
  headerBackdrop = false,
  fluidWidth = false,
}: {
  children: React.ReactNode;
  headerBackdrop?: boolean;
  fluidWidth?: boolean;
}) {
  const [viewport, setViewport] = useState({ width: 0, height: 0 });

  useEffect(() => {
    const update = () => setViewport({ width: window.innerWidth, height: window.innerHeight });
    update();
    window.addEventListener('resize', update);
    return () => window.removeEventListener('resize', update);
  }, []);

  if (!viewport.width) return <div className="fixed inset-0 bg-[#0B1020]" />;

  if (viewport.width <= MIN_SUPPORTED_WIDTH) {
    return (
      <div className="fixed inset-0 z-[2000] flex items-center justify-center bg-[#0B1020] px-8 text-center">
        <div className="max-w-[360px]">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-[20px] border border-white/10 bg-white/[.05] text-[28px] text-white/70">↻</div>
          <h1 className="mt-5 font-montserrat-alt text-[27px] font-extrabold text-white">Rotate your device</h1>
          <p className="mt-3 font-montserrat text-[14px] leading-relaxed text-white/55">Vitruvius uses a landscape game interface on smaller devices.</p>
        </div>
      </div>
    );
  }

  const scale = Math.min(viewport.width / DESIGN_WIDTH, viewport.height / DESIGN_HEIGHT);
  const canvasWidth = fluidWidth ? viewport.width / scale : DESIGN_WIDTH;
  const left = fluidWidth ? 0 : (viewport.width - DESIGN_WIDTH * scale) / 2;
  const top = (viewport.height - DESIGN_HEIGHT * scale) / 2;

  return (
    <div className="fixed inset-0 overflow-hidden bg-[#0B1020]">
      {headerBackdrop ? (
        <div
          className="absolute inset-x-0 bg-[#182135]"
          style={{ top, height: 120 * scale }}
        />
      ) : null}
      <div
        className="fixed-page-canvas absolute h-[900px] overflow-hidden bg-transparent"
        style={{ left, top, width: canvasWidth, transform: `scale(${scale})`, transformOrigin: 'top left' }}
      >
        {children}
      </div>
    </div>
  );
}
