/**
 * Next.js Instrumentation Hook
 *
 * Este archivo corre al INICIAR el servidor, antes de cualquier request.
 *
 * Fix: Next.js 15.3+ arranca Node.js con --localstorage-file sin ruta válida.
 * Esto crea un `localStorage` global roto (los métodos existen pero no son
 * funciones reales). @supabase/auth-js accede a localStorage al importarse,
 * lo que causa "localStorage.getItem is not a function" en SSR.
 *
 * Solución: reemplazar el localStorage roto con una implementación en memoria
 * ANTES de que cualquier módulo de Supabase se importe.
 */
export async function register() {
  // Solo corregir en el runtime de Node.js (no en el edge runtime)
  if (process.env.NEXT_RUNTIME === "edge") return;

  const ls = globalThis.localStorage as
    | { getItem?: unknown }
    | undefined
    | null;

  const isBroken =
    typeof ls === "undefined" ||
    ls === null ||
    typeof ls.getItem !== "function";

  if (isBroken) {
    const store: Record<string, string> = {};

    Object.defineProperty(globalThis, "localStorage", {
      value: {
        getItem: (key: string): string | null => store[key] ?? null,
        setItem: (key: string, value: string): void => {
          store[key] = String(value);
        },
        removeItem: (key: string): void => {
          delete store[key];
        },
        clear: (): void => {
          for (const k of Object.keys(store)) delete store[k];
        },
        get length(): number {
          return Object.keys(store).length;
        },
        key: (index: number): string | null =>
          Object.keys(store)[index] ?? null,
      },
      writable: true,
      configurable: true,
    });
  }
}
