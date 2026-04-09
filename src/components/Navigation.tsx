"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

interface NavProps {
  userRole?: string;
  userName?: string;
  houseNumber?: string;
}

export default function Navigation({ userRole, userName, houseNumber }: NavProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);

  const handleLogout = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/");
  };

  const residentLinks = [
    { href: "/dashboard", label: "Reservar", icon: "🎾" },
    { href: "/mis-reservas", label: "Mis Reservas", icon: "📋" },
    { href: "/notificaciones", label: "Avisos", icon: "🔔" },
  ];

  const adminLinks = [
    { href: "/admin", label: "Dashboard", icon: "📊" },
    { href: "/admin/calendario", label: "Reservas", icon: "📅" },
    { href: "/admin/reservas", label: "Crear", icon: "✨" },
    { href: "/admin/invitar", label: "Invitar", icon: "✉️" },
    { href: "/admin/usuarios", label: "Usuarios", icon: "👥" },
    { href: "/admin/bloqueos", label: "Bloqueos", icon: "🚫" },
  ];

  const links = userRole === "admin" ? adminLinks : residentLinks;
  const homeHref = userRole === "admin" ? "/admin" : "/dashboard";

  const initials = userName
    ? userName
        .split(" ")
        .slice(0, 2)
        .map((n) => n[0])
        .join("")
        .toUpperCase()
    : "?";

  return (
    <nav className="bg-white/80 backdrop-blur-md border-b border-gray-200/80 sticky top-0 z-50">
      <div className="max-w-5xl mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link href={homeHref} className="flex items-center gap-2.5 group">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-brand-500 to-brand-700 flex items-center justify-center text-lg shadow-sm shadow-brand-600/20 group-hover:shadow-md group-hover:shadow-brand-600/30 transition-all">
              🎾
            </div>
            <div className="hidden sm:block">
              <p className="text-sm font-bold text-gray-900 leading-none">Aldea Savia</p>
              <p className="text-[11px] text-brand-600 font-medium leading-none mt-0.5">Padel Club</p>
            </div>
          </Link>

          {/* Desktop nav */}
          <div className="hidden md:flex items-center gap-1">
            {links.map((link) => {
              const active = pathname === link.href;
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`px-3 py-2 rounded-xl text-sm font-medium transition-all ${
                    active
                      ? "bg-brand-50 text-brand-700 shadow-sm"
                      : "text-gray-600 hover:text-gray-900 hover:bg-gray-100/70"
                  }`}
                >
                  {link.label}
                </Link>
              );
            })}
          </div>

          {/* User info + logout */}
          <div className="hidden md:flex items-center gap-3">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-full bg-gradient-to-br from-brand-100 to-brand-200 text-brand-700 flex items-center justify-center text-xs font-bold ring-2 ring-white shadow-sm">
                {initials}
              </div>
              <div className="text-right">
                <p className="text-sm font-semibold text-gray-900 leading-none">{userName}</p>
                <p className="text-[11px] text-gray-500 leading-none mt-0.5">Casa {houseNumber}</p>
              </div>
            </div>
            <button
              onClick={handleLogout}
              className="text-xs text-gray-500 hover:text-red-600 transition-colors px-2 py-1.5 rounded-lg hover:bg-red-50"
              title="Cerrar sesión"
            >
              Salir
            </button>
          </div>

          {/* Mobile hamburger */}
          <button
            className="md:hidden p-2 rounded-xl text-gray-700 hover:bg-gray-100 active:scale-95 transition-all"
            onClick={() => setMenuOpen(!menuOpen)}
            aria-label="Menú"
          >
            <div className="w-5 flex flex-col gap-[5px]">
              <span
                className={`h-0.5 bg-current rounded transition-all ${
                  menuOpen ? "rotate-45 translate-y-[7px]" : ""
                }`}
              ></span>
              <span
                className={`h-0.5 bg-current rounded transition-all ${
                  menuOpen ? "opacity-0" : ""
                }`}
              ></span>
              <span
                className={`h-0.5 bg-current rounded transition-all ${
                  menuOpen ? "-rotate-45 -translate-y-[7px]" : ""
                }`}
              ></span>
            </div>
          </button>
        </div>

        {/* Mobile menu */}
        {menuOpen && (
          <div className="md:hidden border-t border-gray-100 py-3 animate-[slideDown_0.2s_ease]">
            <div className="flex items-center gap-3 px-2 mb-3 pb-3 border-b border-gray-100">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-brand-100 to-brand-200 text-brand-700 flex items-center justify-center text-sm font-bold">
                {initials}
              </div>
              <div>
                <p className="text-sm font-semibold text-gray-900">{userName}</p>
                <p className="text-xs text-gray-500">Casa {houseNumber}</p>
              </div>
            </div>
            <div className="space-y-1">
              {links.map((link) => {
                const active = pathname === link.href;
                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    onClick={() => setMenuOpen(false)}
                    className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
                      active
                        ? "bg-brand-50 text-brand-700"
                        : "text-gray-700 hover:bg-gray-100/70"
                    }`}
                  >
                    <span className="text-lg">{link.icon}</span>
                    {link.label}
                  </Link>
                );
              })}
            </div>
            <button
              onClick={handleLogout}
              className="w-full flex items-center gap-3 px-3 py-2.5 text-sm text-red-600 hover:bg-red-50 rounded-xl mt-2 font-medium transition-all"
            >
              <span className="text-lg">🚪</span>
              Cerrar sesión
            </button>
          </div>
        )}
      </div>
    </nav>
  );
}
