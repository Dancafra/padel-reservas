"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import Navigation from "@/components/Navigation";
import { getMonthName, getNowInQuintanaRoo } from "@/lib/constants";

interface Profile {
  id: string;
  full_name: string;
  house_number: string;
  email: string;
  role: string;
  is_active: boolean;
  monthly_slots_limit: number;
  created_at: string;
}

interface UserWithStats extends Profile {
  usedThisMonth: number;
  totalReservations: number;
}

export default function AdminUsuariosPage() {
  const supabase = createClient();
  const [adminProfile, setAdminProfile] = useState<Profile | null>(null);
  const [users, setUsers] = useState<UserWithStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editLimit, setEditLimit] = useState(12);

  const now = getNowInQuintanaRoo();
  const currentMonth = now.getMonth() + 1;
  const currentYear = now.getFullYear();

  useEffect(() => {
    const loadData = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      const { data: adminData } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .single();
      setAdminProfile(adminData);

      const { data: residents } = await supabase
        .from("profiles")
        .select("*")
        .eq("role", "resident")
        .order("house_number", { ascending: true });

      if (!residents) {
        setLoading(false);
        return;
      }

      const enriched: UserWithStats[] = await Promise.all(
        residents.map(async (r) => {
          const { data: reservations } = await supabase
            .from("reservations")
            .select("id")
            .eq("user_id", r.id)
            .eq("status", "confirmed")
            .gte(
              "reservation_date",
              `${currentYear}-${String(currentMonth).padStart(2, "0")}-01`
            );

          const { data: allReservations } = await supabase
            .from("reservations")
            .select("id")
            .eq("user_id", r.id)
            .eq("status", "confirmed");

          return {
            ...r,
            usedThisMonth: reservations?.length ?? 0,
            totalReservations: allReservations?.length ?? 0,
          };
        })
      );

      setUsers(enriched);
      setLoading(false);
    };
    loadData();
  }, []);

  const handleToggleActive = async (userId: string, currentStatus: boolean) => {
    const { error } = await supabase
      .from("profiles")
      .update({ is_active: !currentStatus })
      .eq("id", userId);

    if (!error) {
      setUsers(
        users.map((u) =>
          u.id === userId ? { ...u, is_active: !currentStatus } : u
        )
      );
    }
  };

  const handleUpdateLimit = async (userId: string) => {
    const { error } = await supabase
      .from("profiles")
      .update({ monthly_slots_limit: editLimit })
      .eq("id", userId);

    if (!error) {
      setUsers(
        users.map((u) =>
          u.id === userId ? { ...u, monthly_slots_limit: editLimit } : u
        )
      );
      setEditingId(null);
    }
  };

  if (!adminProfile) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block w-8 h-8 border-2 border-brand-500 border-t-transparent rounded-full animate-spin mb-3"></div>
          <p className="text-gray-400 text-sm">Cargando...</p>
        </div>
      </div>
    );
  }

  const activeCount = users.filter((u) => u.is_active).length;
  const totalUsed = users.reduce((s, u) => s + u.usedThisMonth, 0);

  return (
    <div className="min-h-screen">
      <Navigation
        userRole={adminProfile.role}
        userName={adminProfile.full_name}
        houseNumber={adminProfile.house_number}
      />

      <main className="max-w-3xl mx-auto px-4 py-6 space-y-5 safe-bottom">
        {/* Header */}
        <div className="rounded-3xl bg-gradient-to-br from-gray-900 via-gray-800 to-brand-900 p-5 text-white overflow-hidden relative">
          <div className="absolute -top-8 -right-8 w-32 h-32 rounded-full bg-brand-500/20 blur-2xl"></div>
          <div className="absolute -bottom-6 -left-6 w-24 h-24 rounded-full bg-emerald-500/20 blur-xl"></div>
          <div className="relative">
            <p className="text-white/60 text-xs font-semibold uppercase tracking-wider mb-1">
              {getMonthName(currentMonth)} {currentYear}
            </p>
            <h1 className="text-2xl font-bold mb-4">Condominos</h1>
            <div className="grid grid-cols-3 gap-3">
              <div className="bg-white/10 rounded-2xl p-3 text-center">
                <p className="text-2xl font-bold">{users.length}</p>
                <p className="text-white/60 text-xs mt-0.5">Registrados</p>
              </div>
              <div className="bg-white/10 rounded-2xl p-3 text-center">
                <p className="text-2xl font-bold text-emerald-400">{activeCount}</p>
                <p className="text-white/60 text-xs mt-0.5">Activos</p>
              </div>
              <div className="bg-white/10 rounded-2xl p-3 text-center">
                <p className="text-2xl font-bold text-brand-300">{totalUsed}</p>
                <p className="text-white/60 text-xs mt-0.5">Turnos usados</p>
              </div>
            </div>
          </div>
        </div>

        {/* User list */}
        {loading ? (
          <div className="card text-center py-10">
            <div className="inline-block w-7 h-7 border-2 border-brand-500 border-t-transparent rounded-full animate-spin mb-3"></div>
            <p className="text-gray-400 text-sm">Cargando condominos...</p>
          </div>
        ) : users.length === 0 ? (
          <div className="card text-center py-10">
            <p className="text-4xl mb-3">👥</p>
            <p className="text-gray-700 font-semibold">Sin condominos registrados</p>
            <p className="text-xs text-gray-400 mt-1">Ve a "Invitar" para agregar el primero</p>
          </div>
        ) : (
          <div className="space-y-3">
            {users.map((u) => {
              const usedPercent = Math.min(
                100,
                Math.round((u.usedThisMonth / u.monthly_slots_limit) * 100)
              );
              const initials = u.full_name
                .split(" ")
                .slice(0, 2)
                .map((n) => n[0])
                .join("")
                .toUpperCase();

              return (
                <div
                  key={u.id}
                  className={`card transition-opacity ${!u.is_active ? "opacity-50" : ""}`}
                >
                  {/* Top row */}
                  <div className="flex items-start gap-3 mb-4">
                    <div className={`w-11 h-11 rounded-2xl flex items-center justify-center text-sm font-bold flex-shrink-0 shadow-sm ${
                      u.is_active
                        ? "bg-gradient-to-br from-brand-500 to-brand-600 text-white"
                        : "bg-gray-200 text-gray-400"
                    }`}>
                      {initials}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-bold text-gray-900 text-sm">{u.full_name}</p>
                        {!u.is_active && (
                          <span className="chip bg-red-100 text-red-600 text-[10px]">Suspendido</span>
                        )}
                      </div>
                      <p className="text-xs text-gray-500 truncate">{u.email}</p>
                      <p className="text-xs font-semibold text-brand-700 mt-0.5">Casa {u.house_number}</p>
                    </div>
                    <button
                      onClick={() => handleToggleActive(u.id, u.is_active)}
                      className={`flex-shrink-0 text-xs font-semibold px-3 py-1.5 rounded-xl border transition-all ${
                        u.is_active
                          ? "border-red-200 text-red-600 hover:bg-red-50"
                          : "border-green-200 text-green-600 hover:bg-green-50"
                      }`}
                    >
                      {u.is_active ? "Suspender" : "Activar"}
                    </button>
                  </div>

                  {/* Stats */}
                  <div className="grid grid-cols-3 gap-2 mb-4">
                    <div className="bg-brand-50 rounded-xl py-2.5 text-center">
                      <p className="text-lg font-bold text-brand-700">{u.usedThisMonth}</p>
                      <p className="text-[10px] font-medium text-brand-500 uppercase tracking-wide">Usados</p>
                    </div>
                    <div className="bg-gray-50 rounded-xl py-2.5 text-center">
                      <p className="text-lg font-bold text-gray-700">
                        {Math.max(0, u.monthly_slots_limit - u.usedThisMonth)}
                      </p>
                      <p className="text-[10px] font-medium text-gray-400 uppercase tracking-wide">Restantes</p>
                    </div>
                    <div className="bg-gray-50 rounded-xl py-2.5 text-center">
                      <p className="text-lg font-bold text-gray-700">{u.totalReservations}</p>
                      <p className="text-[10px] font-medium text-gray-400 uppercase tracking-wide">Historial</p>
                    </div>
                  </div>

                  {/* Progress bar */}
                  <div className="mb-3">
                    <div className="flex justify-between text-xs text-gray-400 mb-1">
                      <span>Uso mensual</span>
                      <span>{usedPercent}%</span>
                    </div>
                    <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all ${
                          usedPercent >= 90
                            ? "bg-red-500"
                            : usedPercent >= 70
                            ? "bg-amber-400"
                            : "bg-brand-500"
                        }`}
                        style={{ width: `${usedPercent}%` }}
                      />
                    </div>
                  </div>

                  {/* Limit editor */}
                  {editingId === u.id ? (
                    <div className="flex gap-2 items-center flex-wrap">
                      <span className="text-xs text-gray-500">Límite mensual:</span>
                      <input
                        type="number"
                        value={editLimit}
                        onChange={(e) => setEditLimit(Number(e.target.value))}
                        className="input w-20 text-sm py-1.5"
                        min={1}
                        max={30}
                      />
                      <button
                        onClick={() => handleUpdateLimit(u.id)}
                        className="btn-primary text-xs py-1.5 px-3"
                      >
                        Guardar
                      </button>
                      <button
                        onClick={() => setEditingId(null)}
                        className="text-xs text-gray-500 hover:text-gray-700 px-2 py-1.5"
                      >
                        Cancelar
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => { setEditingId(u.id); setEditLimit(u.monthly_slots_limit); }}
                      className="text-xs text-brand-600 hover:text-brand-800 font-medium flex items-center gap-1"
                    >
                      <span>✏️</span>
                      <span>Límite: {u.monthly_slots_limit} turnos/mes · Cambiar</span>
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
