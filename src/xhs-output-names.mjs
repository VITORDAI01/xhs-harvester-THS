export function buildXhsOutputBaseName({ since, until, accountName = "" }) {
  const baseName = `xhs_notes_${since}_to_${until}`;
  const accountSegment = sanitizeOutputNameSegment(accountName);
  return accountSegment ? `${baseName}_${accountSegment}` : baseName;
}

export function sanitizeOutputNameSegment(value) {
  return String(value || "")
    .trim()
    .replace(/[\\/:*?"<>|]/g, "_")
    .replace(/\s+/g, "_")
    .replace(/_+/g, "_")
    .replace(/^_+|_+$/g, "");
}
