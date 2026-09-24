import { supabase } from '@/lib/supabaseClient';

const PUBLIC_OBJECT_MARKER = '/storage/v1/object/public/';

export function createStorageReference(bucket: string, objectPath: string) {
  return `${bucket}/${objectPath.replace(/^\/+/, '')}`;
}

export function parseStorageReference(
  value: string,
  defaultBucket: string
): { bucket: string; objectPath: string } | null {
  if (/^https?:\/\//i.test(value)) {
    try {
      const url = new URL(value);
      const markerIndex = url.pathname.indexOf(PUBLIC_OBJECT_MARKER);
      if (markerIndex < 0) return null;
      const reference = decodeURIComponent(
        url.pathname.slice(markerIndex + PUBLIC_OBJECT_MARKER.length)
      );
      const separatorIndex = reference.indexOf('/');
      if (separatorIndex < 1) return null;
      return {
        bucket: reference.slice(0, separatorIndex),
        objectPath: reference.slice(separatorIndex + 1),
      };
    } catch {
      return null;
    }
  }

  const normalized = value.replace(/^\/+/, '');
  const separatorIndex = normalized.indexOf('/');
  if (separatorIndex < 1) {
    return { bucket: defaultBucket, objectPath: normalized };
  }

  const firstSegment = normalized.slice(0, separatorIndex);
  const knownBucketPrefix =
    firstSegment === defaultBucket ||
    firstSegment.startsWith('temporary-') ||
    firstSegment.endsWith('-images') ||
    firstSegment.endsWith('-music') ||
    firstSegment.endsWith('-avatars');

  return knownBucketPrefix
    ? { bucket: firstSegment, objectPath: normalized.slice(separatorIndex + 1) }
    : { bucket: defaultBucket, objectPath: normalized };
}

export function resolvePublicStorageUrl(
  value: string | null | undefined,
  defaultBucket: string
) {
  if (!value) return null;
  const reference = parseStorageReference(value, defaultBucket);
  if (!reference) return value;
  return supabase.storage
    .from(reference.bucket)
    .getPublicUrl(reference.objectPath).data.publicUrl;
}
