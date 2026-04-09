"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { createBlockedSlot, deleteBlockedSlot } from "./actions";
import Navigation from "@/components/Navigation";
import { getAvailableStartTimes, formatTime, formatDate, getTodayDate } from "@/lib/constants";

interface Profile {
  id: string;
  full_name: string;
  house_number: string;
  role: string;
}

interface BlockedSlot {
  id: string;
  block_date: string;
  slot_start: string;
  slot_end: string;
  reason: string;
}

export default function AdminBloqueosPage() {
  const supabase = createClient();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [blocks, setBlocks] = useState<BlockedSlot[]>([]);
  const [form, setForm] = useState({
    block_date: "",
    block_end_date: "",
    slot_start: "",
    slot_end: "",
    reason: "",
  });
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const availableTimes = getAvailableStartTimes();

  useEffect(() => {
    const loadData = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: profileData } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .single();
      setProfile(profileData);

      const today = getTodayDate();
      const { data: blocksData } = await supabase
        .from("blocked_slots")
        .select("*")
        .gte("block_date", today)
        .order("block_date", { ascending: true })
        .order("slot_start", { ascending: true });
      setBlocks(blocksData ?? []);
    };
    loadData();
  }, []);

  const handleBlock = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile || !form.block_date || !form.slot_start) return;
    setLoading(true);
    setMessage(null);

    const result = await createBlockedSlot(
      form.block_date,
      form.block_end_date || form.block_date,
      form.slot_start,
      form.slot_end || form.slot_start,
      form.reason,
      profile.id
    );

    if (!result.success) {
      setMessage({ type: "error", text: "Error al bloquear: " + result.error });
    } else {
      const newBlocks = Array.isArray(result.data) ? result.data : [result.data];
      setBlocks(
        [...blocks, ...newBlocks].sort(
          (a, b) => a.block_date.localeCompare(b.block_date) || a.slot_start.localeCompare(b.slot_start)
        )
      );
      setForm({ block_date: "", block_end_date: "", slot_start: "", slot_end: "", reason: "" });
      setMessage({ type: "success", text: "Turno bloqueado correctamente." });
    }
    setLoading(false);
  };

  const handleUnblock = async (id: string) => {
    if (!confirm("¿Desbloquear este turno?")) return;
    const result = await deleteBlockedSlot(id);
    if (result.success) setBlocks(blocks.filter((b) => b.id !== id));
  };

  if (!profile) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="text-3xl mb-2">🚫</div>
          <p className="text-gray-400 text-sm">Cargando...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <Navigation userRole={profile.role} userName={profile.full_name} houseNumber={profile.house_number} />

      <main className="max-w-2xl mx-auto px-4 py-6 space-y-5 safe-bottom">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Bloquear Turnos</h1>
          <p className="text-gray-500 text-sm">Reserva horarios para mantenimiento o eventos</p>
        </div>

        {/* Formulario */}
        <div className="card space-y-4">
          <h2 className="font-bold text-gray-900">Nuevo bloqueo</h2>
          <form onSubmit={handleBlock} className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label">Fecha inicio</label>
                <input
                  type="date"
                  value={form.block_date}
                  onChange={(e) => setForm({ ...form, block_date: e.target.value })}
                  className="input"
                  min={getTodayDate()}
                  required
                />
              </div>
              <div>
                <label className="label">Fecha fin (opcional)</label>
                <input
                  type="date"
                  value={form.block_end_date}
                  onChange={(e) => setForm({ ...form, block_end_date: e.target.value })}
                  className="input"
                  min={form.block_date || getTodayDate()}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label">Hora inicio</label>
                <select
                  value={form.slot_start}
                  onChange={(e) => setForm({ ...form, slot_start: e.target.value })}
                  className="input"
                  required
                >
                  <option value="">Seleccionar</option>
                  {availableTimes.map((t) => (
                    <option key={t} value={t}>{formatTime(t)}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="label">Hora fin (opcional)</label>
                <select
                  value={form.slot_end}
                  onChange={(e) => setForm({ ...form, slot_end: e.target.value })}
                  className="input"
                >
                  <option value="">Auto</option>
                  {availableTimes.map((t) => (
                    <option key={t} value={t}>{formatTime(t)}</option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="label">Razón (opcional)</label>
              <input
                type="text"
                value={form.reason}
                onChange={(e) => setForm({ ...form, reason: e.target.value })}
                className="input"
                placeholder="Ej: Mantenimiento de red..."
              />
            </div>

            {message && (
              <div
                className={`rounded-xl px-4 py-3 text-sm font-medium ${
                  message.type === "success"
                    ? "bg-brand-50 text-brand-800 border border-brand-200"
                    : "bg-red-50 text-red-700 border border-red-200"
                }`}
              >
                {message.text}
              </div>
            )}

            <button type="submit" disabled={loading} className="btn-primary w-full">
              {loading ? "Bloqueando..." : "🚫 Bloquear turno"}
            </button>
          </form>
        </div>

        {/* Lista de bloqueos */}
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-bold text-gray-900">Bloqueos activos</h2>
            {blocks.length > 0 && (
              <span className="chip bg-orange-100 text-orange-700">{blocks.length}</span>
            )}
          </div>

          {blocks.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-3xl mb-2">✅</p>
              <p className="text-gray-400 text-sm font-medium">Sin turnos bloqueados</p>
              <p className="text-gray-400 text-xs mt-1">Todos los horarios están disponibles</p>
            </div>
          ) : (
            <div className="space-y-2">
              {blocks.map((b) => {
                const startDisplay = b.slot_start.substring(0, 5);
                const endDisplay = b.slot_end.substring(0, 5);
                return (
                  <div
                    key={b.id}
                    className="flex items-center gap-3 p-3.5 rounded-2xl bg-orange-50 border border-orange-100"
                  >
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-orange-400 to-red-500 text-white flex flex-col items-center justify-center text-xs font-bold flex-shrink-0 shadow-sm shadow-orange-500/20">
                      {startDisplay.split(":")[0]}
                      <span className="text-[9px] opacity-80">:{startDisplay.split(":")[1]}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-sm text-gray-900 capitalize truncate">
                        {formatDate(b.block_date)}
                      </p>
                      <p className="text-xs text-gray-600">
                        {formatTime(startDisplay)} – {formatTime(endDisplay)}
                      </p>
                      {b.reason && (
                        <p className="text-xs text-orange-600 mt-0.5 truncate">{b.reason}</p>
                      )}
                    </div>
                    <button
                      onClick={() => handleUnblock(b.id)}
                      className="text-xs font-semibold text-gray-500 hover:text-red-600 bg-white hover:bg-red-50 border border-gray-200 hover:border-red-200 px-3 py-1.5 rounded-lg transition-all flex-shrink-0"
                    >
                      Quitar
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
