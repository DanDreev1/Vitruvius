'use client';
import { useTranslations } from 'next-intl';

type NicknameModalProps = {
    isOpen: boolean;
    value: string;
    error: string | null;
    isSaving: boolean;
    onChange: (value: string) => void;
    onClose: () => void;
    onSave: () => void;
};

export function NicknameModal({
    isOpen,
    value,
    error,
    isSaving,
    onChange,
    onClose,
    onSave
}: NicknameModalProps) {
    const t = useTranslations('Lobby');
    const common = useTranslations('Common');
    if (!isOpen) return null;

    const isSaveDisabled = isSaving || value.trim().length === 0;

    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-[#0B1020]/80 px-4 py-6 backdrop-blur-sm"
            role="dialog"
            aria-modal="true"
            aria-labelledby="nickname-modal-title"
            onMouseDown={(event) => {
                if (event.target === event.currentTarget) {
                    onClose();
                }
            }}
        >
            <form
                className="w-full max-w-[620px] rounded-[28px] border border-white/15 bg-[#182135] p-5 shadow-[0_24px_70px_rgba(0,0,0,0.45)] min-[640px]:p-8"
                onSubmit={(event) => {
                    event.preventDefault();
                    onSave();
                }}
                onMouseDown={(event) => event.stopPropagation()}
            >
                <h2
                    id="nickname-modal-title"
                    className="font-montserrat-alt text-[28px] font-extrabold leading-none text-white min-[640px]:text-[34px]"
                >
                    {t('editNickname')}
                </h2>

                <label
                    htmlFor="nickname-input"
                    className="font-montserrat mt-7 block text-[14px] font-bold text-[#D6B25E] min-[640px]:text-[16px]"
                >
                    {t('nickname')}
                </label>

                <input
                    id="nickname-input"
                    value={value}
                    onChange={(event) => onChange(event.currentTarget.value)}
                    className="font-montserrat mt-3 h-[58px] w-full rounded-full border border-white/15 bg-[#0B1020] px-6 text-[18px] font-bold text-white outline-none transition-colors placeholder:text-white/35 focus:border-[#D6B25E] min-[640px]:h-[66px] min-[640px]:text-[20px]"
                    placeholder={t('nickname')}
                    autoFocus
                    maxLength={36}
                    disabled={isSaving}
                />

                <p className="font-montserrat mt-3 min-h-[20px] text-[14px] font-semibold text-[#FF7A7A]">
                    {error ?? ''}
                </p>

                <div className="mt-6 flex flex-col-reverse gap-3 min-[480px]:flex-row min-[480px]:justify-end">
                    <button
                        type="button"
                        className="font-montserrat-alt flex min-h-[54px] items-center justify-center rounded-full border border-white/15 px-8 text-[18px] font-bold text-white transition-colors hover:border-white/40 disabled:cursor-not-allowed disabled:opacity-50"
                        onClick={onClose}
                        disabled={isSaving}
                    >
                        {common('cancel')}
                    </button>

                    <button
                        type="submit"
                        className="font-montserrat-alt flex min-h-[54px] items-center justify-center rounded-full bg-white px-8 text-[18px] font-bold text-black transition-colors disabled:cursor-not-allowed disabled:opacity-50"
                        disabled={isSaveDisabled}
                    >
                        {isSaving ? t('saving') : common('save')}
                    </button>
                </div>
            </form>
        </div>
    );
}
