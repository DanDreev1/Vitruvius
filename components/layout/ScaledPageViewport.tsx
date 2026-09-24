'use client';

import { useEffect, useRef, useState } from 'react';

import Header from '@/components/ui/Header';

const DESIGN_WIDTH = 1440;
const DESIGN_HEIGHT = 900;
const HEADER_HEIGHT = 120;
const HEADER_PREFERENCE_KEY = 'vitruvius:page-header-collapsed';
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

type PinchGesture = {
  startDistance: number;
  startZoom: number;
  contentX: number;
  contentY: number;
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

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

function getTouchPoint(first: Touch, second: Touch) {
  return {
    x: (first.clientX + second.clientX) / 2,
    y: (first.clientY + second.clientY) / 2,
    distance: Math.hypot(
      second.clientX - first.clientX,
      second.clientY - first.clientY
    ),
  };
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
  collapsibleHeader = false,
  contentDesignHeight = 780,
}: {
  children: React.ReactNode;
  headerBackdrop?: boolean;
  fluidWidth?: boolean;
  collapsibleHeader?: boolean;
  contentDesignHeight?: number;
}) {
  const [viewport, setViewport] = useState<ViewportSize>(EMPTY_VIEWPORT);
  const [isHeaderCollapsed, setIsHeaderCollapsed] = useState(false);
  const [gestureZoom, setGestureZoom] = useState(1);
  const [gestureOffset, setGestureOffset] = useState({ x: 0, y: 0 });
  const viewportRef = useRef<HTMLDivElement | null>(null);
  const pinchGestureRef = useRef<PinchGesture | null>(null);
  const gestureZoomRef = useRef(1);
  const gestureOffsetRef = useRef({ x: 0, y: 0 });

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

  useEffect(() => {
    if (!collapsibleHeader) return;

    const restorePreference = window.setTimeout(() => {
      setIsHeaderCollapsed(
        window.localStorage.getItem(HEADER_PREFERENCE_KEY) === 'true'
      );
    }, 0);

    return () => window.clearTimeout(restorePreference);
  }, [collapsibleHeader]);

  useEffect(() => {
    const element = viewportRef.current;
    if (!element || !viewport.width || !viewport.height) return;

    const currentDesignHeight = () =>
      collapsibleHeader
        ? contentDesignHeight + (isHeaderCollapsed ? 0 : HEADER_HEIGHT)
        : DESIGN_HEIGHT;

    const fittedScaleFor = (designHeight: number) =>
      Math.max(
        0.01,
        Math.min(viewport.width / DESIGN_WIDTH, viewport.height / designHeight)
      );

    const handleTouchStart = (event: TouchEvent) => {
      if (event.touches.length !== 2) return;
      event.preventDefault();

      const point = getTouchPoint(event.touches[0], event.touches[1]);
      const designHeight = currentDesignHeight();
      const fittedScale = fittedScaleFor(designHeight);
      const scale = fittedScale * gestureZoomRef.current;
      const canvasWidth = fluidWidth ? viewport.width / fittedScale : DESIGN_WIDTH;
      const centeredLeft = (viewport.width - canvasWidth * scale) / 2;
      const centeredTop = (viewport.height - designHeight * scale) / 2;

      pinchGestureRef.current = {
        startDistance: Math.max(point.distance, 1),
        startZoom: gestureZoomRef.current,
        contentX:
          (point.x - centeredLeft - gestureOffsetRef.current.x) / scale,
        contentY:
          (point.y - centeredTop - gestureOffsetRef.current.y) / scale,
      };
    };

    const handleTouchMove = (event: TouchEvent) => {
      const gesture = pinchGestureRef.current;
      if (!gesture || event.touches.length !== 2) return;
      event.preventDefault();

      const point = getTouchPoint(event.touches[0], event.touches[1]);
      const nextZoom = clamp(
        gesture.startZoom * (point.distance / gesture.startDistance),
        0.75,
        2.5
      );
      const designHeight = currentDesignHeight();
      const fittedScale = fittedScaleFor(designHeight);
      const nextScale = fittedScale * nextZoom;
      const canvasWidth = fluidWidth ? viewport.width / fittedScale : DESIGN_WIDTH;
      const centeredLeft = (viewport.width - canvasWidth * nextScale) / 2;
      const centeredTop = (viewport.height - designHeight * nextScale) / 2;
      const nextOffset = {
        x: point.x - gesture.contentX * nextScale - centeredLeft,
        y: point.y - gesture.contentY * nextScale - centeredTop,
      };

      gestureZoomRef.current = nextZoom;
      gestureOffsetRef.current = nextOffset;
      setGestureZoom(nextZoom);
      setGestureOffset(nextOffset);
    };

    const handleTouchEnd = (event: TouchEvent) => {
      if (event.touches.length < 2) pinchGestureRef.current = null;
    };

    element.addEventListener('touchstart', handleTouchStart, { passive: false });
    element.addEventListener('touchmove', handleTouchMove, { passive: false });
    element.addEventListener('touchend', handleTouchEnd);
    element.addEventListener('touchcancel', handleTouchEnd);

    return () => {
      element.removeEventListener('touchstart', handleTouchStart);
      element.removeEventListener('touchmove', handleTouchMove);
      element.removeEventListener('touchend', handleTouchEnd);
      element.removeEventListener('touchcancel', handleTouchEnd);
    };
  }, [
    collapsibleHeader,
    contentDesignHeight,
    fluidWidth,
    isHeaderCollapsed,
    viewport.height,
    viewport.width,
  ]);

  const toggleHeader = () => {
    setIsHeaderCollapsed((current) => {
      const next = !current;
      window.localStorage.setItem(HEADER_PREFERENCE_KEY, String(next));
      return next;
    });
  };

  const renderedChildren = collapsibleHeader ? (
    <>
      {!isHeaderCollapsed ? <Header fixedLayout onCollapse={toggleHeader} /> : null}
      {children}
    </>
  ) : children;

  if (!viewport.width || !viewport.height || !viewport.supportedWidth) {
    return (
      <NoHydrationViewportFallback
        headerBackdrop={headerBackdrop}
        fluidWidth={fluidWidth}
      >
        {renderedChildren}
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

  const designHeight = collapsibleHeader
    ? contentDesignHeight + (isHeaderCollapsed ? 0 : HEADER_HEIGHT)
    : DESIGN_HEIGHT;
  const fittedScale = Math.max(
    0.01,
    Math.min(viewport.width / DESIGN_WIDTH, viewport.height / designHeight)
  );
  const scale = fittedScale * gestureZoom;
  const canvasWidth = fluidWidth ? viewport.width / fittedScale : DESIGN_WIDTH;
  const left =
    (viewport.width - canvasWidth * scale) / 2 + gestureOffset.x;
  const top =
    (viewport.height - designHeight * scale) / 2 + gestureOffset.y;
  const showHeaderBackdrop = collapsibleHeader
    ? !isHeaderCollapsed
    : headerBackdrop;

  return (
    <div ref={viewportRef} className="fixed inset-0 overflow-hidden bg-[#0B1020]">
      {showHeaderBackdrop ? (
        <div
          className="absolute inset-x-0 bg-[#182135]"
          style={{ top, height: 120 * scale }}
        />
      ) : null}
      <div
        className="fixed-page-canvas absolute overflow-hidden bg-transparent"
        style={{
          left,
          top,
          width: canvasWidth,
          height: designHeight,
          transform: `scale(${scale})`,
          transformOrigin: 'top left',
        }}
      >
        {renderedChildren}
      </div>

      {collapsibleHeader && isHeaderCollapsed ? (
        <button
          type="button"
          onClick={toggleHeader}
          aria-label={isHeaderCollapsed ? 'Show header' : 'Hide header'}
          title={isHeaderCollapsed ? 'Show header' : 'Hide header'}
          className="fixed right-3 top-3 z-[100] flex items-center justify-center rounded-full border border-white/15 bg-[#182135]/95 text-white shadow-[0_8px_28px_rgba(0,0,0,.4)] backdrop-blur transition hover:border-[#D6B25E]/70 hover:text-[#D6B25E] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#D6B25E]"
          style={{ width: 48 * scale, height: 48 * scale }}
        >
          <svg
            viewBox="0 0 24 24"
            aria-hidden="true"
            style={{ width: 24 * scale, height: 24 * scale }}
          >
            <path
              d="m6 15 6-6 6 6"
              fill="none"
              stroke="currentColor"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2.25"
            />
          </svg>
        </button>
      ) : null}

    </div>
  );
}
