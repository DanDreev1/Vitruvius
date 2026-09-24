export const TABLET_SHORT_TEXT_MAX_LENGTH = 80;
export const TABLET_DESCRIPTION_MAX_LENGTH = 300;
export const TABLET_NOTE_CONTENT_MAX_LENGTH = 1000;
export const TABLET_MESSAGE_MAX_LENGTH = 300;

export function assertTabletTextLength(
  value: string | null | undefined,
  maxLength: number,
  fieldName: string
) {
  if (value != null && value.length > maxLength) {
    throw new Error(`${fieldName} must be ${maxLength} characters or fewer.`);
  }
}

export function clampTabletMessage(value: unknown) {
  return typeof value === 'string'
    ? value.slice(0, TABLET_MESSAGE_MAX_LENGTH)
    : '';
}
