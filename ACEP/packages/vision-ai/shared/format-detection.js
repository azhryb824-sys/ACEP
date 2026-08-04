/**
 * ACEP Vision AI — Shared Image Format Detection
 *
 * Single source of truth for magic-byte image format detection.
 * Used by image-engine.js, flux.js, together.js, and any storage code.
 */

const FORMAT_MAGIC = [
  { sig: [0xFF, 0xD8, 0xFF], ext: 'jpg', mime: 'image/jpeg' },
  { sig: [0x89, 0x50, 0x4E, 0x47], ext: 'png', mime: 'image/png' },
  { sig: [0x52, 0x49, 0x46, 0x46], ext: 'webp', mime: 'image/webp' },
  { sig: [0x47, 0x49, 0x46, 0x38], ext: 'gif', mime: 'image/gif' },
  { sig: [0x42, 0x4D], ext: 'bmp', mime: 'image/bmp' },
  { sig: [0x49, 0x49, 0x2A, 0x00], ext: 'tiff', mime: 'image/tiff' },
  { sig: [0x4D, 0x4D, 0x00, 0x2A], ext: 'tiff', mime: 'image/tiff' },
];

function detectFormat(buffer) {
  if (!buffer || !Buffer.isBuffer(buffer) || buffer.length < 2) return null;
  for (const fmt of FORMAT_MAGIC) {
    const sig = fmt.sig;
    let match = true;
    for (let i = 0; i < sig.length; i++) {
      if (buffer[i] !== sig[i]) { match = false; break; }
    }
    if (match) return fmt;
  }
  return null;
}

function detectExtension(buffer) {
  const fmt = detectFormat(buffer);
  return fmt ? fmt.ext : 'png';
}

function detectMimeType(buffer) {
  const fmt = detectFormat(buffer);
  return fmt ? fmt.mime : 'image/png';
}

module.exports = { detectFormat, detectExtension, detectMimeType, FORMAT_MAGIC };
