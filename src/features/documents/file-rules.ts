/**
 * Client-side pre-checks (US-FE-08 AC2). The API is the authority: it detects the type from
 * the bytes (415) and enforces `app.documents.max-file-size` (413). These checks only save the
 * user a pointless upload.
 */

/** Backend default `app.documents.max-file-size` (US-BE-07 D6). */
export const MAX_UPLOAD_BYTES = 25 * 1024 * 1024;

export const ACCEPTED_EXTENSIONS = [".pdf", ".docx", ".txt", ".md"] as const;

/** For the file picker's `accept` attribute (extensions + MIME types). */
export const ACCEPT_ATTRIBUTE = [
  ...ACCEPTED_EXTENSIONS,
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "text/plain",
  "text/markdown",
].join(",");

export const ACCEPTED_FORMATS_LABEL = "PDF, DOCX, TXT or MD";

function extensionOf(name: string): string {
  const dot = name.lastIndexOf(".");
  return dot > 0 ? name.slice(dot).toLowerCase() : "";
}

/** Why a file cannot be uploaded, or null when it passes the client checks. */
export function validateFile(file: Pick<File, "name" | "size">): string | null {
  if (!(ACCEPTED_EXTENSIONS as readonly string[]).includes(extensionOf(file.name))) {
    return `Unsupported file type. Upload ${ACCEPTED_FORMATS_LABEL} files.`;
  }
  if (file.size === 0) return "The file is empty.";
  if (file.size > MAX_UPLOAD_BYTES) return `The file is larger than ${formatBytes(MAX_UPLOAD_BYTES)}.`;
  return null;
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  const units = ["KB", "MB", "GB"];
  let value = bytes / 1024;
  let unit = 0;
  while (value >= 1024 && unit < units.length - 1) {
    value /= 1024;
    unit += 1;
  }
  return `${value >= 10 || Number.isInteger(value) ? Math.round(value) : value.toFixed(1)} ${units[unit]}`;
}
