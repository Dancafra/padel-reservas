"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { createInvite, deleteInvite } from "./actions";
import Navigation from "@/components/Navigation";

interface Profile {
  id: string;
  full_name: string;
  house_number: string;
  role: string;
}

interface InviteToken {
  id: string;
  email: string;
  full_name: string;
  house_number: string;
  is_used: boolean;
  expires_at: string;
  token: string;
}

export default function InvitarPage() {
  const supabase = createClient();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [invites, setInvites] = useState<InviteToken[]>([]);
  const [form, setForm] = useState({ email: "", full_name: "", house_number: "" });
  const [loading, setLoading] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  useEffect(() => {
    const loadData = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      const { data: profileData } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .single();
      setProfile(profileData);

      const { data: inviteData } = await supabase
        .from("invite_tokens")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(20);
      setInvites(inviteData ?? []);
    };
    loadData();
  }, []);

  const handleCreateInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile) return;
    setLoading(true);
    setMessage(null);

    const houseNumber = form.house_number.trim();
    const email = form.email.toLowerCase().trim();

    // 1. Verificar que la casa no tenga ya una cuenta de residente activa
    const { data: existingProfile } = await supabase
      .from("profiles")
      .select("id, full_name")
      .eq("house_number", houseNumber)
      .eq("role", "resident");

    if (existingProfile && existingProfile.length > 0) {
      setMessage({
        type: "error",
        text: `La casa ${houseNumber} ya tiene una cuenta registrada (${existingProfile[0].full_name}). Solo puede haber un usuario por casa.`,
      });
      setLoading(false);
      return;
    }

    // 2. Verificar que no haya una invitación activa pendiente para esa casa
    const { data: existingInvite } = await supabase
      .from("invite_tokens")
      .select("id, email")
      .eq("house_number", houseNumber)
      .eq("is_used", false)
      .gt("expires_at", new Date().toISOString());

    if (existingInvite && existingInvite.length > 0) {
      setMessage({
        type: "error",
        text: `Ya existe una invitación activa para la casa ${houseNumber} (enviada a ${existingInvite[0].email}). Espera a que expire o elimínala antes de crear una nueva.`,
      });
      setLoading(false);
      return;
    }

    // 3. Verificar que el correo no esté ya registrado
    const { data: existingEmail } = await supabase
      .from("profiles")
      .select("id")
      .eq("email", email);

    if (existingEmail && existingEmail.length > 0) {
      setMessage({
        type: "error",
        text: `El correo ${email} ya tiene una cuenta registrada en el sistema.`,
      });
      setLoading(false);
      return;
    }

    // 4. Todo OK, crear la invitación
    const result = await createInvite(email, form.full_name.trim(), houseNumber, profile.id);

    if (!result.success) {
      setMessage({ type: "error", text: "Error al crear invitación: " + result.error });
    } else {
      setInvites([result.data, ...invites]);
      setForm({ email: "", full_name: "", house_number: "" });
      setMessage({ type: "success", text: "Invitación creada. Copia el link y envíalo al condomino." });
    }
    setLoading(false);
  };

  const getInviteLink = (token: string) => {
    if (typeof window !== "undefined") {
      return `${window.location.origin}/register?token=${token}`;
    }
    return `/register?token=${token}`;
  };

  const handleCopy = (token: string, id: string) => {
    navigator.clipboard.writeText(getInviteLink(token));
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleDeleteInvite = async (id: string) => {
    const result = await deleteInvite(id);
    if (result.success) setInvites(invites.filter((i) => i.id !== id));
  };

  if (!profile) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-gray-400">Cargando...</p>
      </div>
    );
  }

  const pendingInvites = invites.filter((i) => !i.is_used && new Date(i.expires_at) > new Date());
  const usedOrExpiredInvites = invites.filter(
    (i) => i.is_used || new Date(i.expires_at) <= new Date()
  );

  return (
    <div className="min-h-screen">
      <Navigation userRole={profile.role} userName={profile.full_name} houseNumber={profile.house_number} />

      <main className="max-w-2xl mx-auto px-4 py-6 space-y-5 safe-bottom">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Invitar Condomino</h1>
          <p className="text-gray-500 text-sm">Crea un link para que un condomino se registre</p>
        </div>

        <div className="card space-y-4">
          <h2 className="font-bold text-gray-900">Nueva invitación</h2>
          <form onSubmit={handleCreateInvite} className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2">
                <label className="label">Nombre completo</label>
                <input type="text" value={form.full_name}
                  onChange={(e) => setForm({ ...form, full_name: e.target.value })}
                  className="input" placeholder="Juan García López" required />
              </div>
              <div className="col-span-2 sm:col-span-1">
                <label className="label">Correo electrónico</label>
                <input type="email" value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  className="input" placeholder="juan@correo.com" required />
              </div>
              <div className="col-span-2 sm:col-span-1">
                <label className="label">Casa #</label>
                <input type="text" value={form.house_number}
                  onChange={(e) => setForm({ ...form, house_number: e.target.value })}
                  className="input" placeholder="Ej: 42" required />
              </div>
            </div>

            {message && (
              <div className={`rounded-xl px-4 py-3 text-sm font-medium ${
                message.type === "success"
                  ? "bg-brand-50 text-brand-800 border border-brand-200"
                  : "bg-red-50 text-red-700 border border-red-200"
              }`}>{message.text}</div>
            )}
            <button type="submit" disabled={loading} className="btn-primary w-full">
              {loading ? "Creando..." : "✉️ Crear invitación"}
            </button>
          </form>
        </div>

        {pendingInvites.length > 0 && (
          <div className="card">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-bold text-gray-900">Activas</h2>
              <span className="chip bg-amber-100 text-amber-700">{pendingInvites.length}</span>
            </div>
            <div className="space-y-3">
              {pendingInvites.map((inv) => (
                <div key={inv.id} className="p-4 bg-amber-50 border border-amber-200 rounded-2xl space-y-3">
                  <div className="flex items-start justify-between">
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold text-sm text-gray-900">{inv.full_name}</p>
                      <p className="text-xs text-gray-500 truncate">{inv.email} · Casa {inv.house_number}</p>
                      <p className="text-xs text-amber-600 mt-0.5">
                        Vence {new Date(inv.expires_at).toLocaleDateString("es-MX")}
                      </p>
                    </div>
                    <button onClick={() => handleDeleteInvite(inv.id)}
                      className="text-gray-300 hover:text-red-500 transition-colors ml-2 text-lg">✕</button>
                  </div>
                  <button onClick={() => handleCopy(inv.token, inv.id)}
                    className={`w-full text-sm py-2.5 rounded-xl font-semibold transition-all ${
                      copiedId === inv.id
                        ? "bg-brand-600 text-white"
                        : "bg-white border border-gray-200 text-gray-700 hover:border-brand-400 hover:bg-brand-50"
                    }`}
                  >
                    {copiedId === inv.id ? "¡Copiado! ✓" : "📋 Copiar link de registro"}
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {usedOrExpiredInvites.length > 0 && (
          <div className="card">
            <h2 className="font-bold text-gray-900 mb-4">Historial</h2>
            <div className="space-y-2">
              {usedOrExpiredInvites.map((inv) => (
                <div key={inv.id}
                  className="flex items-center justify-between p-3.5 bg-gray-50 rounded-xl border border-gray-100 opacity-60">
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold text-sm text-gray-800">{inv.full_name}</p>
                    <p className="text-xs text-gray-500 truncate">{inv.email} · Casa {inv.house_number}</p>
                  </div>
                  <span className={`chip flex-shrink-0 ml-2 ${inv.is_used ? "bg-brand-100 text-brand-700" : "bg-gray-200 text-gray-500"}`}>
                    {inv.is_used ? "Usado ✓" : "Expirado"}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
