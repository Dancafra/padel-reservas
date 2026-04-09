"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { loginAction } from "./actions";

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} className="btn-primary w-full py-3 text-base">
      {pending ? (
        <span className="flex items-center justify-center gap-2">
          <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
          Entrando...
        </span>
      ) : (
        "Entrar →"
      )}
    </button>
  );
}

export default function LoginPage() {
  const [state, formAction] = useActionState(loginAction, { error: "", email: "" });

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 relative overflow-hidden">
      {/* Fondo decorativo */}
      <div className="absolute inset-0 bg-gradient-to-br from-brand-600 via-brand-500 to-emerald-400"></div>
      <div className="absolute -top-32 -right-32 w-96 h-96 rounded-full bg-white/10 blur-3xl"></div>
      <div className="absolute -bottom-32 -left-32 w-96 h-96 rounded-full bg-emerald-300/20 blur-3xl"></div>
      <div className="absolute top-1/4 left-1/4 w-64 h-64 rounded-full bg-white/5 blur-2xl"></div>

      <div className="relative w-full max-w-sm">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-3xl bg-white/20 backdrop-blur-sm text-4xl mb-4 shadow-xl shadow-black/10 ring-1 ring-white/30">
            🎾
          </div>
          <h1 className="text-3xl font-bold text-white">Aldea Savia</h1>
          <p className="text-white/80 font-semibold tracking-wide mt-0.5">Padel Club</p>
        </div>

        {/* Card */}
        <div className="bg-white/95 backdrop-blur-md rounded-3xl shadow-2xl shadow-black/20 p-6 sm:p-8 ring-1 ring-white/50">
          <h2 className="text-xl font-bold text-gray-900 mb-1">Bienvenido</h2>
          <p className="text-gray-500 text-sm mb-6">Inicia sesión para reservar tu turno</p>

          <form action={formAction} className="space-y-4">
            <div>
              <label className="label">Correo electrónico</label>
              <input
                type="email"
                name="email"
                className="input"
                placeholder="tu@correo.com"
                defaultValue={state.email || ""}
                required
                autoComplete="email"
              />
            </div>

            <div>
              <label className="label">Contraseña</label>
              <input
                type="password"
                name="password"
                className="input"
                placeholder="••••••••"
                required
                autoComplete="current-password"
              />
            </div>

            {state.error && (
              <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-700 font-medium">
                {state.error}
              </div>
            )}

            <SubmitButton />
          </form>
        </div>

        <p className="text-center text-xs text-white/60 mt-6 px-4">
          ¿Sin cuenta? Solicita tu invitación al administrador del condominio.
        </p>
      </div>
    </div>
  );
}
