'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useTranslations } from 'next-intl';

type LobbyCountdownProps = {
    cleanupAt: string | null;
    onExpire: () => void;
};

function getTimeRemainingMs(cleanupAt: string | null) {
    if (!cleanupAt) return 0;

    const cleanupAtMs = Date.parse(cleanupAt);
    if (!Number.isFinite(cleanupAtMs)) return 0;

    return Math.max(0, cleanupAtMs - Date.now());
}

function formatTimeRemaining(timeRemainingMs: number) {
    const totalSeconds = Math.max(0, Math.ceil(timeRemainingMs / 1000));
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;

    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}

export function LobbyCountdown({ cleanupAt, onExpire }: LobbyCountdownProps) {
    const t = useTranslations('Lobby');
    const [timeRemainingMs, setTimeRemainingMs] = useState(() =>
        getTimeRemainingMs(cleanupAt)
    );
    const hasExpiredRef = useRef(false);

    useEffect(() => {
        hasExpiredRef.current = false;

        let timeoutId: number | null = null;

        const tick = () => {
            if (!cleanupAt) {
                setTimeRemainingMs(0);
                return;
            }

            const nextTimeRemainingMs = getTimeRemainingMs(cleanupAt);
            setTimeRemainingMs(nextTimeRemainingMs);

            if (nextTimeRemainingMs === 0) {
                if (!hasExpiredRef.current) {
                    hasExpiredRef.current = true;
                    onExpire();
                }

                return;
            }

            const nextWholeSecondMs = nextTimeRemainingMs % 1000 || 1000;
            timeoutId = window.setTimeout(tick, nextWholeSecondMs);
        };

        timeoutId = window.setTimeout(tick, 0);

        return () => {
            if (timeoutId !== null) {
                window.clearTimeout(timeoutId);
            }
        };
    }, [cleanupAt, onExpire]);

    const timeRemainingLabel = useMemo(
        () => formatTimeRemaining(timeRemainingMs),
        [timeRemainingMs]
    );

    if (!cleanupAt) return null;

    return (
        <p className="font-montserrat mt-4 text-[18px] font-bold leading-none text-[#D6B25E] md:text-[24px]">
            {t('closesIn', {time: timeRemainingLabel})}
        </p>
    );
}
