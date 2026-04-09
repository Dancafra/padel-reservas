"use client";

import { useSearchParams, useRouter } from "next/navigation";
import { useState, useEffect, Suspense } from "react";
import { createClient } from "@/lib/supabase/client";
import { createProfileFromInvite } from "./actions";

function RegisterForm() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const supabase = createClient();

  const token = searchParams.get("token");
  const [inviteData, setInviteData] = useState<{
    email: string;
    full_name: string;
    house_number: string;
  } | null>(null);

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [validating, setValidating] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (!token) {
      setError("Link de invitación inválido o expirado.");
      setValidating(false);
      return;
    }

    const validateToken = async () => {
      const { data, error } = await supabase
        .from("invite_tokens")
        .select("email, full_name, house_number, is_used, expires_at, id")
        .eq("token", token)
        .single();

      if (error || !data) {
        setError("Link de invitación inválido o no encontrado.");
      } else if (data.is_used) {
        setError("Este link de invitación ya fue utilizado.");
      } else if (new Date(data.expires_at) < new Date()) {
        setError("Este link de invitación ha expirado. Solicita uno nuevo al administrador.");
      } else {
        setInviteData({
          email: data.email,
          full_name: data.full_name,
          house_number: data.house_number,
        });
      }
      setValidating(false);
    };

    validateToken();
  }, [token]);

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (password.length < 6) {
      setError("La contraseña debe tener al menos 6 caracteres.");
      return;
    }
    if (password !== confirmPassword) {
      setError("Las contraseñas no coinciden.");
      return;
    }

    setLoading(true);

    try {
      const { data, error } = await supabase.auth.signUp({
        email: inviteData!.email,
        password,
        options: {
          data: { full_name: inviteData!.full_name },
          emailRedirectTo: `${window.location.origin}/auth/callback`,
        },
      });

      if (error) {
        setError("Error al crear la cuenta: " + error.message);
        setLoading(false);
        return;
      }

      if (data.user) {
        const result = await createProfileFromInvite(
          data.user.id,
          inviteData!.email,
          inviteData!.full_name,
          inviteData!.house_number,
          token!
        );

        if (!result || !result.success) {
          setError(result.error || "Error creando perfil");
          setLoading(false);
          return;
        }
      }

      setSuccess(true);
    } catch (err: any) {
      setError("Error: " + err.message);
    }
    setLoading(false);
  };

  const sharedWrapper = (children: React.ReactNode) => (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-br from-brand-600 via-brand-500 to-emerald-400"></div>
      <div className="absolute -top-32 -right-32 w-96 h-96 rounded-full bg-white/10 blur-3xl"></div>
      <div className="absolute -bottom-32 -left-32 w-96 h-96 rounded-full bg-emerald-300/20 blur-3xl"></div>
      <div className="relative w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-3xl bg-white/20 backdrop-blur-sm text-4xl mb-4 shadow-xl ring-1 ring-white/30">🎾</div>
          <h1 className="text-3xl font-bold text-white">Aldea Savia</h1>
          <p className="text-white/80 font-semibold">Padel Club</p>
        </div>
        {children}
      </div>
    </div>
  );

  if (validating) {
    return sharedWrapper(
      <div className="bg-white/95 backdrop-blur-md rounded-3xl p-8 text-center shadow-2xl">
        <div className="inline-block w-8 h-8 border-2 border-brand-500 border-t-transparent rounded-full animate-spin mb-3"></div>
        <p className="text-gray-500 text-sm">Validando invitación...</p>
      </div>
    );
  }

  return sharedWrapper(
    <>
      {error && !inviteData && (
        <div className="bg-white/95 backdrop-blur-md rounded-3xl p-8 text-center shadow-2xl">
          <p className="text-4xl mb-3">⚠️</p>
          <p className="text-gray-800 font-semibold">{error}</p>
          <p className="text-sm text-gray-500 mt-2">Contacta al administrador del condominio.</p>
        </div>
      )}

      {success && (
        <div className="bg-white/95 backdrop-blur-md rounded-3xl p-8 text-center shadow-2xl">
          <p className="text-4xl mb-3">✅</p>
          <h2 className="text-xl font-bold text-gray-900 mb-2">¡Cuenta creada!</h2>
          <p className="text-gray-500 text-sm mb-5">
            Enviamos un correo a <strong>{inviteData?.email}</strong> para confirmar tu cuenta.
            Revisa tu bandeja y spam.
          </p>
          <button onClick={() => router.push("/")} className="btn-primary w-full">Ir a iniciar sesión</button>
        </div>
      )}

      {inviteData && !success && (
        <div className="bg-white/95 backdrop-blur-md rounded-3xl shadow-2xl p-6 sm:p-8">
          <h2 className="text-xl font-bold text-gray-900 mb-1">Crear tu cuenta</h2>
          <div className="flex items-center gap-3 p-3 bg-brand-50 border border-brand-200 rounded-2xl mb-5 mt-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-brand-500 to-brand-600 text-white flex items-center justify-center text-base flex-shrink-0">🏠</div>
            <div className="min-w-0">
              <p className="text-sm font-bold text-brand-900">{inviteData.full_name}</p>
              <p className="text-xs text-brand-600 truncate">{inviteData.email} · Casa {inviteData.house_number}</p>
            </div>
          </div>

          <form onSubmit={handleRegister} className="space-y-4">
            <div>
              <label className="label">Nueva contraseña</label>
              <input type="password" value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="input" placeholder="Mínimo 6 caracteres" required autoComplete="new-password" />
            </div>
            <div>
              <label className="label">Confirmar contraseña</label>
              <input type="password" value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="input" placeholder="Repite tu contraseña" required autoComplete="new-password" />
            </div>
            {error && (
              <div className="rounded-xl px-4 py-3 text-sm font-medium bg-red-50 text-red-700 border border-red-200">{error}</div>
            )}
            <button type="submit" disabled={loading} className="btn-primary w-full py-3 text-base">
              {loading ? "Creando..." : "Crear mi cuenta →"}
            </button>
          </form>
        </div>
      )}
    </>
  );
}

export default function RegisterPage() {
  return (
    <Suspense>
      <RegisterForm />
    </Suspense>
  );
}
