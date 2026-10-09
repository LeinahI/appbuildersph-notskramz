import { MAX_IMAGE_CHARS } from '@ugatan/shared';

/** Longest side sent to the hub. Enough for leaf spots, and small enough to send over Wi-Fi in a second. */
const MAX_SIDE = 1024;
/** JPEG qualities to try, best first, until the photo fits the hub's limit. */
const QUALITIES = [0.82, 0.7, 0.55, 0.4];

/**
 * Shrinks a photo from the camera or gallery to a JPEG of at most 1024 px on its long side, and returns it as
 * base64 with no "data:" prefix, the form the hub reads. Throws when the file is not an image the browser can open.
 */
export async function shrinkPhoto(file: Blob): Promise<string> {
  // imageOrientation applies the camera's rotation, so a portrait photo is not sent sideways.
  const bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' });
  try {
    const scale = Math.min(1, MAX_SIDE / Math.max(bitmap.width, bitmap.height));
    const width = Math.max(1, Math.round(bitmap.width * scale));
    const height = Math.max(1, Math.round(bitmap.height * scale));
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Canvas is not available.');
    ctx.drawImage(bitmap, 0, 0, width, height);

    for (const quality of QUALITIES) {
      const url = canvas.toDataURL('image/jpeg', quality);
      const base64 = url.slice(url.indexOf(',') + 1);
      if (base64.length <= MAX_IMAGE_CHARS) return base64;
    }
    throw new Error('Photo is too large.');
  } finally {
    bitmap.close();
  }
}

/** A base64 JPEG as an address an <img> can show. */
export const photoSrc = (base64: string) => `data:image/jpeg;base64,${base64}`;
