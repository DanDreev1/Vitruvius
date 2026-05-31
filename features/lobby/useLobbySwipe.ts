import { useRef, useState } from 'react';

export function useLobbySwipe() {
    const [activeSlide, setActiveSlide] = useState<0 | 1>(0);
    const touchStartX = useRef<number | null>(null);

    function onTouchStart(e: React.TouchEvent<HTMLDivElement>) {
        touchStartX.current = e.touches[0].clientX;
    }

    function onTouchEnd(e: React.TouchEvent<HTMLDivElement>) {
        if (touchStartX.current === null) return;

        const diff = e.changedTouches[0].clientX - touchStartX.current;

        if (diff < -50) setActiveSlide(1);
        if (diff > 50) setActiveSlide(0);

        touchStartX.current = null;
    }

    return {
        activeSlide,
        setActiveSlide,
        onTouchStart,
        onTouchEnd
    };
}