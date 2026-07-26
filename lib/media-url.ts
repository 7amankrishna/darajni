const legacyFilesOrigin = "http://files.darajni.in";
const secureFilesOrigin = "https://files.darajni.in";

export function normalizeMediaUrl(value: string | null | undefined) {
  if (!value) return null;
  return value.startsWith(legacyFilesOrigin)
    ? `${secureFilesOrigin}${value.slice(legacyFilesOrigin.length)}`
    : value;
}
