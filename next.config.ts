import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Tratar los paquetes de Supabase como externos al bundle del servidor.
  // Esto evita que webpack los transforme y permite que el polyfill de
  // localStorage en instrumentation.ts tome efecto antes de que se carguen.
  serverExternalPackages: ["@supabase/ssr", "@supabase/supabase-js"],
};

export default nextConfig;
