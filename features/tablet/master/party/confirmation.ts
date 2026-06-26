export const PARTY_CONFIRMATION_SUPPRESSED_KEY =
  'vitruvius.partyDecisionConfirmationSuppressed';

export function isPartyConfirmationSuppressed() {
  if (typeof window === 'undefined') return false;
  return window.localStorage.getItem(PARTY_CONFIRMATION_SUPPRESSED_KEY) === 'true';
}

export function setPartyConfirmationSuppressed(value: boolean) {
  if (typeof window === 'undefined') return;

  if (value) {
    window.localStorage.setItem(PARTY_CONFIRMATION_SUPPRESSED_KEY, 'true');
    return;
  }

  window.localStorage.removeItem(PARTY_CONFIRMATION_SUPPRESSED_KEY);
}
