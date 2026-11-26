/**
 * Utility for exporting clean, RFC 4180 compliant CSV files with UTF-8 BOM
 * for Microsoft Excel, Google Sheets, and standard spreadsheet tools.
 */

export function escapeCsvField(val: unknown): string {
  if (val === null || val === undefined) return '""';
  const str = String(val).replace(/"/g, '""');
  return `"${str}"`;
}

/**
 * Builds RFC 4180 compliant CSV string with UTF-8 BOM prefix.
 */
export function generateCsvContent(
  headers: string[],
  rows: (string | number | null | undefined)[][]
): string {
  const headerLine = headers.map(escapeCsvField).join(',');
  const rowLines = rows.map(row => row.map(escapeCsvField).join(','));
  return '\uFEFF' + [headerLine, ...rowLines].join('\r\n');
}

/**
 * Returns formatted timestamp suitable for filenames: YYYY-MM-DD_HH-mm-ss
 */
export function getFilenameTimestamp(date: Date = new Date()): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}_${pad(date.getHours())}-${pad(date.getMinutes())}-${pad(date.getSeconds())}`;
}

/**
 * Ensures the filename contains a timestamp (YYYY-MM-DD_HH-mm-ss) before its extension.
 */
export function ensureFilenameTimestamp(filename: string): string {
  if (/\d{4}[-_]\d{2}[-_]\d{2}/.test(filename)) {
    return filename;
  }
  const timestamp = getFilenameTimestamp();
  const extMatch = filename.match(/(\.[^.]+)$/);
  if (extMatch) {
    const base = filename.slice(0, -extMatch[1].length);
    return `${base}_${timestamp}${extMatch[1]}`;
  }
  return `${filename}_${timestamp}`;
}

export function downloadCsv(filename: string, headers: string[], rows: (string | number | null | undefined)[][]): void {
  if (typeof window === 'undefined') return;

  const csvContent = generateCsvContent(headers, rows);
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');

  const formattedFilename = ensureFilenameTimestamp(filename.endsWith('.csv') ? filename : `${filename}.csv`);
  link.setAttribute('href', url);
  link.setAttribute('download', formattedFilename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
