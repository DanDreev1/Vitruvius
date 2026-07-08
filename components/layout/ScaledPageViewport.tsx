'use client';

import { useEffect, useState } from 'react';

const DESIGN_WIDTH = 1440;
const DESIGN_HEIGHT = 900;
const MIN_PORTRAIT_SUPPORTED_WIDTH = 700;
const MIN_LANDSCAPE_SUPPORTED_WIDTH = 500;
const MIN_LANDSCAPE_SUPPORTED_HEIGHT = 260;

type ViewportSize = {
  width: number;
  height: number;
  supportedWidth: number;
  longSide: number;
  shortSide: number;
  isLandscape: boolean;
  measuredAt: number;
  effectTicks: number;
};

const EMPTY_VIEWPORT: ViewportSize = {
  width: 0,
  height: 0,
  supportedWidth: 0,
  longSide: 0,
  shortSide: 0,
  isLandscape: false,
  measuredAt: 0,
  effectTicks: 0,
};

function firstPositive(...values: number[]) {
  return values.find((value) => Number.isFinite(value) && value > 0) ?? 0;
}

function getViewportSize(): ViewportSize {
  if (typeof window === 'undefined') {
    return EMPTY_VIEWPORT;
  }

  const visualViewport = window.visualViewport;
  const documentElement = document.documentElement;
  const viewportWidth = visualViewport?.width ?? 0;
  const viewportHeight = visualViewport?.height ?? 0;
  const windowWidth = window.innerWidth;
  const windowHeight = window.innerHeight;
  const documentWidth = documentElement.clientWidth;
  const documentHeight = documentElement.clientHeight;
  const screenWidth = window.screen?.width ?? 0;
  const screenHeight = window.screen?.height ?? 0;
  const orientationType = window.screen?.orientation?.type ?? '';
  const legacyOrientation =
    typeof window.orientation === 'number' ? window.orientation : 0;
  const mediaLandscape = window.matchMedia?.('(orientation: landscape)').matches ?? false;

  const width = Math.max(viewportWidth, windowWidth, documentWidth, 1);
  const height = Math.max(viewportHeight, windowHeight, documentHeight, 1);
  const longSide = Math.max(
    viewportWidth,
    viewportHeight,
    windowWidth,
    windowHeight,
    documentWidth,
    documentHeight,
    screenWidth,
    screenHeight,
    1
  );
  const shortSide = Math.max(
    Math.min(width, height),
    Math.min(Math.max(screenWidth, 1), Math.max(screenHeight, 1))
  );
  const isLandscape =
    width > height ||
    mediaLandscape ||
    orientationType.includes('landscape') ||
    Math.abs(legacyOrientation) === 90 ||
    screenWidth > screenHeight;

  const supportedWidth = firstPositive(viewportWidth, windowWidth, documentWidth);

  return {
    width: Math.round(width),
    height: Math.round(height),
    supportedWidth: Math.round(supportedWidth),
    longSide: Math.round(longSide),
    shortSide: Math.round(shortSide),
    isLandscape,
    measuredAt: Date.now(),
    effectTicks: 0,
  };
}

function RotateDevicePrompt({ className = '' }: { className?: string }) {
  return (
    <div className={`fixed inset-0 z-[2000] flex items-center justify-center bg-[#0B1020] px-8 text-center ${className}`}>
      <div className="max-w-[360px]">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-[20px] border border-white/10 bg-white/[.05] text-white/70">
          <svg viewBox="0 0 24 24" aria-hidden="true" className="h-8 w-8">
            <path
              d="M7 7h10M7 7l3-3M7 7l3 3M17 17H7M17 17l-3-3M17 17l-3 3"
              fill="none"
              stroke="currentColor"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2.4"
            />
          </svg>
        </div>
        <h1 className="mt-5 font-montserrat-alt text-[27px] font-extrabold text-white">
          Rotate your device
        </h1>
        <p className="mt-3 font-montserrat text-[14px] leading-relaxed text-white/55">
          Vitruvius uses a landscape interface on smaller devices.
        </p>
      </div>
    </div>
  );
}

function NoHydrationViewportFallback({
  children,
  headerBackdrop,
  fluidWidth,
}: {
  children: React.ReactNode;
  headerBackdrop: boolean;
  fluidWidth: boolean;
}) {
  return (
    <div className="no-js-scaled-viewport fixed inset-0 overflow-hidden bg-[#0B1020]">
      <RotateDevicePrompt className="no-js-rotate-prompt" />

      {headerBackdrop ? (
        <div className="no-js-header-backdrop absolute inset-x-0 top-0 h-[120px] bg-[#182135]" />
      ) : null}

      <div
        className={[
          'fixed-page-canvas no-js-page-canvas absolute h-[900px] overflow-hidden bg-transparent',
          fluidWidth ? 'no-js-page-canvas-fluid' : '',
        ].join(' ')}
      >
        {children}
      </div>
    </div>
  );
}

export default function ScaledPageViewport({
  children,
  headerBackdrop = false,
  fluidWidth = false,
}: {
  children: React.ReactNode;
  headerBackdrop?: boolean;
  fluidWidth?: boolean;
}) {
  const [viewport, setViewport] = useState<ViewportSize>(EMPTY_VIEWPORT);

  useEffect(() => {
    const update = () =>
      setViewport((currentViewport) => ({
        ...getViewportSize(),
        effectTicks: currentViewport.effectTicks + 1,
      }));

    const updateAfterOrientationSettles = () => {
      update();
      window.setTimeout(update, 50);
      window.setTimeout(update, 180);
      window.setTimeout(update, 420);
      window.setTimeout(update, 820);
    };

    update();
    const retryInterval = window.setInterval(() => {
      setViewport((currentViewport) => {
        if (
          currentViewport.width > 0 &&
          currentViewport.height > 0 &&
          currentViewport.supportedWidth > 0
        ) {
          window.clearInterval(retryInterval);
          return currentViewport;
        }

        return {
          ...getViewportSize(),
          effectTicks: currentViewport.effectTicks + 1,
        };
      });
    }, 120);
    const retryStopTimeout = window.setTimeout(() => {
      window.clearInterval(retryInterval);
    }, 3000);

    window.addEventListener('resize', update);
    window.addEventListener('orientationchange', updateAfterOrientationSettles);
    window.visualViewport?.addEventListener('resize', update);
    window.visualViewport?.addEventListener('scroll', update);

    return () => {
      window.removeEventListener('resize', update);
      window.removeEventListener('orientationchange', updateAfterOrientationSettles);
      window.visualViewport?.removeEventListener('resize', update);
      window.visualViewport?.removeEventListener('scroll', update);
      window.clearInterval(retryInterval);
      window.clearTimeout(retryStopTimeout);
    };
  }, []);

  if (!viewport.width || !viewport.height || !viewport.supportedWidth) {
    return (
      <NoHydrationViewportFallback
        headerBackdrop={headerBackdrop}
        fluidWidth={fluidWidth}
      >
        {children}
      </NoHydrationViewportFallback>
    );
  }

  const promptWidth = viewport.isLandscape ? viewport.longSide : viewport.supportedWidth;
  const promptHeight = viewport.isLandscape ? viewport.shortSide : Math.max(viewport.height, 1);
  const shouldShowRotatePrompt = viewport.isLandscape
    ? promptWidth < MIN_LANDSCAPE_SUPPORTED_WIDTH ||
      promptHeight < MIN_LANDSCAPE_SUPPORTED_HEIGHT
    : promptWidth < MIN_PORTRAIT_SUPPORTED_WIDTH;

  if (shouldShowRotatePrompt) {
    return <RotateDevicePrompt />;
  }

  const scale = Math.max(
    0.01,
    Math.min(viewport.width / DESIGN_WIDTH, viewport.height / DESIGN_HEIGHT)
  );
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
        style={{
          left,
          top,
          width: canvasWidth,
          transform: `scale(${scale})`,
          transformOrigin: 'top left',
        }}
      >
        {children}
      </div>
    </div>
  );
}
