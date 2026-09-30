/** Stable encoding for replay checksums. Array order is meaningful; object key order is not. */
export function canonicalJson(value: unknown): string {
  if (value === null || typeof value !== 'object') {
    if (typeof value === 'number' && !Number.isFinite(value)) throw new Error('Non-finite state value');
    const encoded = JSON.stringify(value);
    if (encoded === undefined) throw new Error('Non-JSON state value');
    return encoded;
  }
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(',')}]`;
  const object = value as Record<string, unknown>;
  return `{${Object.keys(object).sort().map(key => `${JSON.stringify(key)}:${canonicalJson(object[key])}`).join(',')}}`;
}

/** Versioned integrity checksum, not a cryptographic or anti-cheat claim. */
export function stableHash(value: unknown): string {
  const text = canonicalJson(value);
  let a = 2166136261;
  let b = 0x9e3779b9;
  for (let i = 0; i < text.length; i++) {
    a = Math.imul(a ^ text.charCodeAt(i), 16777619);
    b = Math.imul(b ^ text.charCodeAt(i), 0x85ebca6b);
  }
  return `json-fnv-v1:${(a >>> 0).toString(16).padStart(8, '0')}${(b >>> 0).toString(16).padStart(8, '0')}`;
}
