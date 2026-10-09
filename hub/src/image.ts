import { MAX_IMAGE_SIDE } from '@ugatan/shared';

export interface JpegInfo {
  width: number;
  height: number;
}

/**
 * Reads the pixel size from a JPEG header without decoding it. Returns null when the bytes are not a JPEG with a
 * frame header, so the hub rejects the file before the image library sees it.
 */
export function jpegInfo(bytes: Uint8Array): JpegInfo | null {
  if (bytes.length < 4 || bytes[0] !== 0xff || bytes[1] !== 0xd8 || bytes[2] !== 0xff) return null;
  let i = 2;
  while (i + 3 < bytes.length) {
    if (bytes[i] !== 0xff) return null;
    // Fill bytes may repeat 0xff before a marker.
    while (bytes[i] === 0xff && i + 1 < bytes.length) i++;
    const marker = bytes[i]!;
    i++;
    // Markers with no length: standalone (TEM, RSTn, SOI, EOI).
    if (marker === 0x01 || (marker >= 0xd0 && marker <= 0xd9)) continue;
    if (i + 1 >= bytes.length) return null;
    const length = (bytes[i]! << 8) | bytes[i + 1]!;
    if (length < 2) return null;
    // SOF0..SOF15, except DHT (c4), JPG (c8), and DAC (cc), carry the frame size.
    const isFrame = marker >= 0xc0 && marker <= 0xcf && marker !== 0xc4 && marker !== 0xc8 && marker !== 0xcc;
    if (isFrame) {
      if (i + 6 >= bytes.length) return null;
      const height = (bytes[i + 3]! << 8) | bytes[i + 4]!;
      const width = (bytes[i + 5]! << 8) | bytes[i + 6]!;
      return width > 0 && height > 0 ? { width, height } : null;
    }
    // Start of scan: no frame header came before it.
    if (marker === 0xda) return null;
    i += length;
  }
  return null;
}

/** The bytes of a base64 string, or null when it is not valid base64. Accepts a "data:image/jpeg;base64," prefix. */
export function decodeBase64(value: string): Uint8Array | null {
  const raw = value.startsWith('data:') ? value.slice(value.indexOf(',') + 1) : value;
  if (!raw || raw.length % 4 === 1 || !/^[A-Za-z0-9+/\r\n]*={0,2}$/.test(raw)) return null;
  return new Uint8Array(Buffer.from(raw, 'base64'));
}

/** The JPEG bytes of a photo, or a reason it is refused. */
export function readPhoto(value: string): { bytes: Uint8Array } | { error: string } {
  const bytes = decodeBase64(value);
  if (!bytes) return { error: 'image must be base64.' };
  const info = jpegInfo(bytes);
  if (!info) return { error: 'image must be a JPEG.' };
  if (info.width > MAX_IMAGE_SIDE || info.height > MAX_IMAGE_SIDE) {
    return { error: `image must be at most ${MAX_IMAGE_SIDE} pixels on each side.` };
  }
  return { bytes };
}
