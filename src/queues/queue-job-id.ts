export function buildQueueJobId(...parts: Array<string | number | Date | undefined | null>) {
  return parts
    .filter((part): part is string | number | Date => part !== undefined && part !== null)
    .map((part) => (part instanceof Date ? part.toISOString() : String(part)))
    .map((part) => part.replace(/:/g, '-'))
    .join('__');
}
