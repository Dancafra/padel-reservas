import { createBrowserClient } from "@supabase/ssr";

// El error de localStorage en SSR está resuelto por instrumentation.ts.
// createBrowserClient guarda la sesión en cookies (no localStorage),
// lo que permite que el middleware pueda leer la sesión correctamente.
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}
