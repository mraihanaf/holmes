/**
 * Minimal ambient declarations for the Node built-ins used by `stats.ts`.
 * The Convex TypeScript project does not install @types/node, and these are
 * the only Node APIs the backend uses.
 */

interface NodeBufferLike extends Uint8Array {
  toString(encoding?: string): string;
}

declare module "node:zlib" {
  export function gzipSync(data: Uint8Array, options?: { level?: number }): NodeBufferLike;
  export function gunzipSync(data: Uint8Array): NodeBufferLike;
}

declare module "node:buffer" {
  export const Buffer: {
    from(data: string | Uint8Array, encoding?: string): NodeBufferLike;
  };
}
