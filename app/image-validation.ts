const MAX_DIMENSION = 12_000;
const MAX_PIXELS = 40_000_000;

function starts(bytes: Uint8Array, values: number[]) {
  return values.every((value, index) => bytes[index] === value);
}

function jpegSize(bytes: Uint8Array) {
  let offset = 2;
  while (offset + 9 < bytes.length) {
    if (bytes[offset] !== 0xff) return null;
    const marker = bytes[offset + 1];
    const length = (bytes[offset + 2] << 8) | bytes[offset + 3];
    if ([0xc0, 0xc1, 0xc2, 0xc3, 0xc5, 0xc6, 0xc7, 0xc9, 0xca, 0xcb, 0xcd, 0xce, 0xcf].includes(marker))
      return {
        width: (bytes[offset + 7] << 8) | bytes[offset + 8],
        height: (bytes[offset + 5] << 8) | bytes[offset + 6],
      };
    if (length < 2) return null;
    offset += length + 2;
  }
  return null;
}

function dimensions(bytes: Uint8Array, type: string) {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  if (type === "image/png" && bytes.length >= 24)
    return { width: view.getUint32(16), height: view.getUint32(20) };
  if (type === "image/gif" && bytes.length >= 10)
    return { width: view.getUint16(6, true), height: view.getUint16(8, true) };
  if (type === "image/jpeg") return jpegSize(bytes);
  if (type === "image/webp" && bytes.length >= 30) {
    const chunk = String.fromCharCode(...bytes.slice(12, 16));
    if (chunk === "VP8X")
      return {
        width: 1 + bytes[24] + (bytes[25] << 8) + (bytes[26] << 16),
        height: 1 + bytes[27] + (bytes[28] << 8) + (bytes[29] << 16),
      };
  }
  return null;
}

export function validateImageBytes(buffer: ArrayBuffer, declaredType: string) {
  const bytes = new Uint8Array(buffer);
  const validSignature =
    (declaredType === "image/jpeg" && starts(bytes, [0xff, 0xd8, 0xff])) ||
    (declaredType === "image/png" && starts(bytes, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) ||
    (declaredType === "image/gif" && (starts(bytes, [0x47, 0x49, 0x46, 0x38, 0x37, 0x61]) || starts(bytes, [0x47, 0x49, 0x46, 0x38, 0x39, 0x61]))) ||
    (declaredType === "image/webp" && starts(bytes, [0x52, 0x49, 0x46, 0x46]) && String.fromCharCode(...bytes.slice(8, 12)) === "WEBP");
  if (!validSignature)
    return { valid: false, error: "파일 확장자와 실제 이미지 형식이 일치하지 않습니다." } as const;
  const size = dimensions(bytes, declaredType);
  if (size && (size.width < 64 || size.height < 64))
    return { valid: false, error: "이미지는 가로·세로 64px 이상이어야 합니다." } as const;
  if (size && (size.width > MAX_DIMENSION || size.height > MAX_DIMENSION || size.width * size.height > MAX_PIXELS))
    return { valid: false, error: "이미지 해상도가 너무 큽니다. 40메가픽셀 이하로 올려 주세요." } as const;
  return { valid: true, width: size?.width || null, height: size?.height || null } as const;
}
