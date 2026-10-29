import {RequestSecurityError} from './request-security.js';

const maximumDimension = 8192;
const maximumPixels = 16000000;
const crcTable = new Uint32Array(256);
for (let n = 0; n < 256; n++) {let c = n;for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;crcTable[n] = c >>> 0;}
function invalid() {throw new RequestSecurityError('A imagem está incompleta ou possui estrutura inválida. Use PNG, JPEG ou WebP.', 400);}
function dimensions(width, height) {
  if (!Number.isInteger(width) || !Number.isInteger(height) || width < 1 || height < 1 || width > maximumDimension || height > maximumDimension || width * height > maximumPixels) throw new RequestSecurityError('Use uma imagem de até 8192 pixels por lado e 16 megapixels.', 400);
  return {width, height};
}
function text(bytes, start, length) {return String.fromCharCode(...bytes.subarray(start, start + length));}
function crc(bytes, start, end) {let c = 0xffffffff;for (let i = start; i < end; i++) c = crcTable[(c ^ bytes[i]) & 255] ^ (c >>> 8);return (c ^ 0xffffffff) >>> 0;}
function png(bytes, view) {
  if (bytes.length < 57 || ![137,80,78,71,13,10,26,10].every((v, i) => bytes[i] === v)) invalid();
  let offset = 8, size, sawHeader = false, sawData = false, endedData = false, sawPalette = false, paletteRequired = false;
  while (offset + 12 <= bytes.length) {
    const length = view.getUint32(offset);
    const end = offset + 12 + length;
    if (length > bytes.length || end > bytes.length) invalid();
    const type = text(bytes, offset + 4, 4);
    if (!/^[A-Za-z]{4}$/.test(type) || view.getUint32(offset + 8 + length) !== crc(bytes, offset + 4, offset + 8 + length)) invalid();
    if (!sawHeader && type !== 'IHDR') invalid();
    if (type === 'IHDR') {
      if (sawHeader || length !== 13) invalid();
      size = dimensions(view.getUint32(offset + 8), view.getUint32(offset + 12));
      const depth = bytes[offset + 16], color = bytes[offset + 17];
      const allowed = {0:[1,2,4,8,16],2:[8,16],3:[1,2,4,8],4:[8,16],6:[8,16]};
      if (!allowed[color]?.includes(depth) || bytes[offset + 18] !== 0 || bytes[offset + 19] !== 0 || bytes[offset + 20] > 1) invalid();
      paletteRequired = color === 3;sawHeader = true;
    } else if (type === 'PLTE') {
      if (sawPalette || sawData || !length || length > 768 || length % 3) invalid();
      sawPalette = true;
    } else if (type === 'IDAT') {
      if (endedData || (paletteRequired && !sawPalette)) invalid();
      if (length) sawData = true;
    } else if (type === 'IEND') {
      if (length || !sawData || end !== bytes.length) invalid();
      return {...size, extension:'png', contentType:'image/png'};
    } else {
      if (type[0] === type[0].toUpperCase()) invalid();
      if (sawData) endedData = true;
    }
    offset = end;
  }
  invalid();
}
function jpeg(bytes, view) {
  if (bytes.length < 20 || bytes[0] !== 255 || bytes[1] !== 216) invalid();
  let offset = 2, size, frameComponents = 0, sawScan = false, sawQuantization = false, sawHuffman = false;
  while (offset < bytes.length) {
    if (bytes[offset++] !== 255) invalid();
    while (bytes[offset] === 255) offset++;
    const marker = bytes[offset++];
    if (marker === 217) {
      if (!size || !sawScan || !sawQuantization || !sawHuffman || offset !== bytes.length) invalid();
      return {...size, extension:'jpg', contentType:'image/jpeg'};
    }
    if (marker === undefined || marker === 0 || marker === 216 || (marker >= 208 && marker <= 215) || marker === 1 || offset + 2 > bytes.length) invalid();
    const length = view.getUint16(offset), end = offset + length;
    if (length < 2 || end > bytes.length) invalid();
    if ([192,193,194].includes(marker)) {
      if (size || length < 11 || bytes[offset + 2] !== 8) invalid();
      frameComponents = bytes[offset + 7];
      if (![1,3,4].includes(frameComponents) || length !== 8 + 3 * frameComponents) invalid();
      size = dimensions(view.getUint16(offset + 5), view.getUint16(offset + 3));
    } else if (marker >= 192 && marker <= 207 && ![196,200,204].includes(marker)) invalid();
    if (marker === 219) {
      let p = offset + 2;
      while (p < end) {const table = bytes[p++];if ((table >> 4) > 1 || (table & 15) > 3) invalid();p += 64 * ((table >> 4) + 1);if (p > end) invalid();}
      if (p !== end || length < 67) invalid();sawQuantization = true;
    }
    if (marker === 196) {
      if(length < 20) invalid();
      let p = offset + 2;
      while (p < end) {const table = bytes[p++];if ((table >> 4) > 1 || (table & 15) > 3 || p + 16 > end) invalid();let symbols = 0;for (let i = 0; i < 16; i++) symbols += bytes[p++];if (!symbols || symbols > 256 || p + symbols > end) invalid();p += symbols;}
      if (p !== end) invalid();sawHuffman = true;
    }
    offset = end;
    if (marker === 218) {
      const components = bytes[end - length + 2];
      if (!size || !components || components > frameComponents || length !== 6 + 2 * components || !sawQuantization || !sawHuffman) invalid();
      sawScan = true;
      const scanStart = offset;
      while (offset < bytes.length) {
        if (bytes[offset] !== 255) {offset++;continue;}
        let next = offset + 1;while (bytes[next] === 255) next++;
        const code = bytes[next];
        if (code === 0 || (code >= 208 && code <= 215)) {offset = next + 1;continue;}
        break;
      }
      if (offset === scanStart || offset >= bytes.length) invalid();
    }
  }
  invalid();
}
function webp(bytes, view) {
  if (bytes.length < 26 || text(bytes, 0, 4) !== 'RIFF' || text(bytes, 8, 4) !== 'WEBP' || view.getUint32(4, true) + 8 !== bytes.length) invalid();
  let offset = 12, size, canvas, sawImage = false;
  while (offset + 8 <= bytes.length) {
    const kind = text(bytes, offset, 4), length = view.getUint32(offset + 4, true), start = offset + 8, end = start + length;
    if (end > bytes.length || !length) invalid();
    if (kind === 'VP8X') {
      if (offset !== 12 || length !== 10 || bytes[start] & 0xc1 || bytes[start + 1] || bytes[start + 2] || bytes[start + 3]) invalid();
      if (bytes[start] & 2) throw new RequestSecurityError('Use uma imagem WebP sem animação.', 400);
      const width = 1 + bytes[start + 4] + (bytes[start + 5] << 8) + (bytes[start + 6] << 16);
      const height = 1 + bytes[start + 7] + (bytes[start + 8] << 8) + (bytes[start + 9] << 16);
      canvas = dimensions(width, height);
    } else if (kind === 'VP8 ') {
      if (sawImage || length < 10 || bytes[start] & 1 || text(bytes, start + 3, 3) !== '\x9d\x01\x2a') invalid();
      size = dimensions(view.getUint16(start + 6, true) & 0x3fff, view.getUint16(start + 8, true) & 0x3fff);sawImage = true;
    } else if (kind === 'VP8L') {
      if (sawImage || length < 5 || bytes[start] !== 47) invalid();
      const packed = view.getUint32(start + 1, true);if (packed >>> 29) invalid();
      size = dimensions((packed & 0x3fff) + 1, ((packed >>> 14) & 0x3fff) + 1);sawImage = true;
    } else if (!['ALPH','ICCP','EXIF','XMP '].includes(kind)) invalid();
    offset = end + (length % 2);
    if (length % 2 && (offset > bytes.length || bytes[end] !== 0)) invalid();
  }
  if (offset !== bytes.length || !sawImage || (canvas && (canvas.width !== size.width || canvas.height !== size.height))) invalid();
  return {...size, extension:'webp', contentType:'image/webp'};
}

/** Valida contêiner, limites e integridade estrutural; não é um decodificador de pixels. */
export function validateImage(value) {
  const bytes = value instanceof Uint8Array ? value : new Uint8Array(value);
  if (!bytes.length || bytes.length > 4 * 1024 * 1024) throw new RequestSecurityError('Selecione uma imagem de até 4 MB.', bytes.length ? 413 : 400);
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  if (bytes[0] === 137) return png(bytes, view);
  if (bytes[0] === 255) return jpeg(bytes, view);
  if (bytes[0] === 82) return webp(bytes, view);
  invalid();
}
