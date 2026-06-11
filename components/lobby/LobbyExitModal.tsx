'use client';

type LobbyExitModalProps = {
    isOpen: boolean;
    isSubmitting: boolean;
    onClose: () => void;
    onConfirm: () => void;
};

export function LobbyExitModal({
    isOpen,
    isSubmitting,
    onClose,
    onConfirm
}: LobbyExitModalProps) {
    if (!isOpen) return null;

    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-[#0B1020]/80 px-4 py-6 backdrop-blur-sm"
            role="dialog"
            aria-modal="true"
            aria-labelledby="lobby-exit-modal-title"
            onMouseDown={(event) => {
                if (event.target === event.currentTarget) {
                    onClose();
                }
            }}
        >
            <div
                className="w-full max-w-[620px] rounded-[28px] border border-white/15 bg-[#182135] p-5 shadow-[0_24px_70px_rgba(0,0,0,0.45)] min-[640px]:p-8"
                onMouseDown={(event) => event.stopPropagation()}
            >
                <h2
                    id="lobby-exit-modal-title"
                    className="font-montserrat-alt text-[28px] font-extrabold leading-none text-white min-[640px]:text-[34px]"
                >
                    Leave lobby?
                </h2>

                <p className="font-montserrat mt-5 text-[16px] font-semibold leading-[1.55] text-[#E7E7E7] min-[640px]:text-[18px]">
                    Are you sure you want to leave the lobby? Your current changes will not be saved.
                </p>

                <div className="mt-8 flex flex-col-reverse gap-3 min-[480px]:flex-row min-[480px]:justify-end">
                    <button
                        type="button"
                        className="font-montserrat-alt flex min-h-[54px] items-center justify-center rounded-full border border-white/15 px-8 text-[18px] font-bold text-white transition-colors hover:border-white/40 disabled:cursor-not-allowed disabled:opacity-50"
                        onClick={onClose}
                        disabled={isSubmitting}
                    >
                        Cancel
                    </button>

                    <button
                        type="button"
                        className="font-montserrat-alt flex min-h-[54px] items-center justify-center rounded-full border border-[#FF7A7A] bg-white px-8 text-[18px] font-bold text-black transition-colors hover:bg-[#FFECEC] disabled:cursor-not-allowed disabled:opacity-50"
                        onClick={onConfirm}
                        disabled={isSubmitting}
                    >
                        {isSubmitting ? 'Leaving...' : 'Leave lobby'}
                    </button>
                </div>
            </div>
        </div>
    );
}
