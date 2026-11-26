/**
 * Lightweight, zero-dependency client-side ZIP generator.
 * RFC 1951 / PKZip compliant STORE method with UTF-8 filename encoding (Bit 11).
 * Universally supported by Windows Explorer, macOS Finder, iOS, Android, and 7-Zip.
 */

import { ensureFilenameTimestamp } from './csvExport';

export interface ZipFileEntry {
  name: string;
  content: string;
}

// Precomputed CRC-32 table
const CRC_TABLE = new Uint32Array(256);
for (let i = 0; i < 256; i++) {
  let c = i;
  for (let k = 0; k < 8; k++) {
    c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  }
  CRC_TABLE[i] = c >>> 0;
}

function calculateCrc32(bytes: Uint8Array): number {
  let crc = 0xffffffff;
  for (let i = 0; i < bytes.length; i++) {
    crc = CRC_TABLE[(crc ^ bytes[i]) & 0xff] ^ (crc >>> 8);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function getDosDateTime(date: Date = new Date()): { time: number; date: number } {
  const time =
    ((date.getHours() << 11) | (date.getMinutes() << 5) | (date.getSeconds() >> 1)) & 0xffff;
  const d =
    (((date.getFullYear() - 1980) << 9) | ((date.getMonth() + 1) << 5) | date.getDate()) & 0xffff;
  return { time, date: d };
}

/**
 * Creates a standard uncompressed PKZip buffer from an array of text files.
 */
export function createZipArchive(files: ZipFileEntry[]): Uint8Array {
  const encoder = new TextEncoder();
  const now = new Date();
  const { time: dosTime, date: dosDate } = getDosDateTime(now);

  interface PreparedFile {
    nameBytes: Uint8Array;
    dataBytes: Uint8Array;
    crc: number;
    offset: number;
  }

  const prepared: PreparedFile[] = [];
  let totalLocalSize = 0;

  for (const file of files) {
    const nameBytes = encoder.encode(file.name);
    const dataBytes = encoder.encode(file.content);
    const crc = calculateCrc32(dataBytes);
    prepared.push({
      nameBytes,
      dataBytes,
      crc,
      offset: totalLocalSize,
    });
    // Local header: 30 bytes + filename + data
    totalLocalSize += 30 + nameBytes.length + dataBytes.length;
  }

  let centralDirSize = 0;
  for (const p of prepared) {
    // Central directory header: 46 bytes + filename
    centralDirSize += 46 + p.nameBytes.length;
  }

  // End of central directory record: 22 bytes
  const totalZipSize = totalLocalSize + centralDirSize + 22;
  const buffer = new ArrayBuffer(totalZipSize);
  const view = new DataView(buffer);
  const u8 = new Uint8Array(buffer);

  let pos = 0;

  // 1. Write Local File Headers + File Data
  for (const p of prepared) {
    p.offset = pos; // Actual relative offset

    // Local file header signature (0x04034b50)
    view.setUint32(pos, 0x04034b50, true);
    // Version needed to extract (20 -> 2.0)
    view.setUint16(pos + 4, 20, true);
    // General purpose bit flag (0x0800 -> Bit 11 for UTF-8)
    view.setUint16(pos + 6, 0x0800, true);
    // Compression method (0 -> Store)
    view.setUint16(pos + 8, 0, true);
    // Last mod file time & date
    view.setUint16(pos + 10, dosTime, true);
    view.setUint16(pos + 12, dosDate, true);
    // CRC-32
    view.setUint32(pos + 14, p.crc, true);
    // Compressed size
    view.setUint32(pos + 18, p.dataBytes.length, true);
    // Uncompressed size
    view.setUint32(pos + 22, p.dataBytes.length, true);
    // File name length
    view.setUint16(pos + 26, p.nameBytes.length, true);
    // Extra field length
    view.setUint16(pos + 28, 0, true);

    pos += 30;
    u8.set(p.nameBytes, pos);
    pos += p.nameBytes.length;
    u8.set(p.dataBytes, pos);
    pos += p.dataBytes.length;
  }

  const centralDirStartOffset = pos;

  // 2. Write Central Directory File Headers
  for (const p of prepared) {
    // Central directory file header signature (0x02014b50)
    view.setUint32(pos, 0x02014b50, true);
    // Version made by (20)
    view.setUint16(pos + 4, 20, true);
    // Version needed to extract (20)
    view.setUint16(pos + 6, 20, true);
    // General purpose bit flag (0x0800)
    view.setUint16(pos + 8, 0x0800, true);
    // Compression method (0)
    view.setUint16(pos + 10, 0, true);
    // Last mod file time & date
    view.setUint16(pos + 12, dosTime, true);
    view.setUint16(pos + 14, dosDate, true);
    // CRC-32
    view.setUint32(pos + 16, p.crc, true);
    // Compressed size
    view.setUint32(pos + 20, p.dataBytes.length, true);
    // Uncompressed size
    view.setUint32(pos + 24, p.dataBytes.length, true);
    // File name length
    view.setUint16(pos + 28, p.nameBytes.length, true);
    // Extra field length
    view.setUint16(pos + 30, 0, true);
    // File comment length
    view.setUint16(pos + 32, 0, true);
    // Disk number start
    view.setUint16(pos + 34, 0, true);
    // Internal file attributes
    view.setUint16(pos + 36, 0, true);
    // External file attributes
    view.setUint32(pos + 38, 0, true);
    // Relative offset of local header
    view.setUint32(pos + 42, p.offset, true);

    pos += 46;
    u8.set(p.nameBytes, pos);
    pos += p.nameBytes.length;
  }

  // 3. Write End of Central Directory Record (EOCD)
  // End of central dir signature (0x06054b50)
  view.setUint32(pos, 0x06054b50, true);
  // Number of this disk
  view.setUint16(pos + 4, 0, true);
  // Disk where central directory starts
  view.setUint16(pos + 6, 0, true);
  // Number of central directory records on this disk
  view.setUint16(pos + 8, prepared.length, true);
  // Total number of central directory records
  view.setUint16(pos + 10, prepared.length, true);
  // Size of central directory
  view.setUint32(pos + 12, centralDirSize, true);
  // Offset of start of central directory
  view.setUint32(pos + 16, centralDirStartOffset, true);
  // ZIP file comment length
  view.setUint16(pos + 20, 0, true);

  return u8;
}

/**
 * Downloads multiple files bundled inside a standard ZIP archive.
 */
export function downloadZip(filename: string, files: ZipFileEntry[]): void {
  if (typeof window === 'undefined') return;

  const zipBytes = createZipArchive(files);
  const blob = new Blob([zipBytes], { type: 'application/zip' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');

  const formattedFilename = ensureFilenameTimestamp(
    filename.endsWith('.zip') ? filename : `${filename}.zip`
  );
  link.setAttribute('href', url);
  link.setAttribute('download', formattedFilename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
