export function safeInternalPath(path: string | null | undefined, fallback = '/'): string {
  if (!path) return fallback;
  if (!path.startsWith('/') || path.startsWith('//') || path.includes('\\') || path.includes('://')) {
    return fallback;
  }
  return path;
}
