"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import Navigation from "@/components/Navigation";
import { formatTime, getTodayDate, formatDate } from "@/lib/constants";
import { cancelReservationAsAdmin } from "./actions";

interface Reservation {
  id: string;
  user_id: string;
  reservation_date: string;
  slot_start: string;
  slot_end: string;
  status: string;
  profiles: {
    full_name: string;
    house_number: string;
    email: string;
  };
  reservation_players: {
    player_name: string;
  }[];
}

interface Profile {
  id: string;
  full_name: string;
  house_number: string;
  role: string;
}

export default function CalendarioPage() {
  const supabase = createClient();
  const [mounted, setMounted] = useState(false);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [selectedDate, setSelectedDate] = useState<string>(getTodayDate());
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [loading, setLoading] = useState(false);
  const [cancelingId, setCancelingId] = useState<string | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    const loadProfile = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data } = await supabase.from("profiles").select("*").eq("id", user.id);
      setProfile(data?.[0]);
    };
    loadProfile();
  }, []);

  useEffect(() => {
    const loadReservations = async () => {
      setLoading(true);
      const { data } = await supabase
        .from("reservations")
        .select("*, profiles(full_name, house_number, email), reservation_players(player_name)")
        .eq("reservation_date", selectedDate)
        .order("slot_start", { ascending: true });
      setReservations(data ?? []);
      setLoading(false);
    };
    loadReservations();
  }, [selectedDate]);

  const changeDate = (days: number) => {
    const date = new Date(selectedDate + "T00:00:00");
    date.setDate(date.getDate() + days);
    setSelectedDate(
      `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`
    );
  };

  const getDateLabel = (days: number) => {
    const date = new Date(selectedDate + "T00:00:00");
    date.setDate(date.getDate() + days);
    const months = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];
    return `${date.getDate()} ${months[date.getMonth()]}`;
  };

  const handleCancelReservation = async (id: string) => {
    if (!confirm("¿Cancelar esta reserva?")) return;
    setCancelingId(id);
    const result = await cancelReservationAsAdmin(id);
    if (result.success) {
      setReservations(reservations.filter((r) => r.id !== id));
    } else {
      alert(`Error: ${result.error}`);
    }
    setCancelingId(null);
  };

  if (!mounted || !profile) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="text-3xl mb-2">🎾</div>
          <p className="text-gray-400 text-sm">Cargando...</p>
        </div>
      </div>
    );
  }

  const confirmed = reservations.filter((r) => r.status === "confirmed");

  return (
    <div className="min-h-screen">
      <Navigation userRole={profile.role} userName={profile.full_name} houseNumber={profile.house_number} />

      <main className="max-w-3xl mx-auto px-4 py-6 space-y-5 safe-bottom">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Reservas</h1>
          <p className="text-gray-500 text-sm">Consulta el calendario de la cancha</p>
        </div>

        {/* Navegador de fechas */}
        <div className="card p-4">
          <div className="flex items-center gap-2">
            <button
              onClick={() => changeDate(-1)}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-gray-100 hover:bg-gray-200 text-sm font-semibold text-gray-700 transition-all active:scale-95 flex-shrink-0"
            >
              ←<span className="hidden sm:inline">{getDateLabel(-1)}</span>
            </button>

            <div className="flex-1 text-center">
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="w-full px-3 py-2 border border-gray-200 rounded-xl text-center font-semibold text-gray-900 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/40 focus:border-brand-500"
              />
              <p className="text-xs text-gray-500 text-center mt-1 capitalize">
                {formatDate(selectedDate)}
              </p>
            </div>

            <button
              onClick={() => changeDate(1)}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-gray-100 hover:bg-gray-200 text-sm font-semibold text-gray-700 transition-all active:scale-95 flex-shrink-0"
            >
              <span className="hidden sm:inline">{getDateLabel(1)}</span>→
            </button>
          </div>
        </div>

        {/* Lista */}
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-bold text-gray-900">Turnos del día</h2>
            {!loading && (
              <span className="chip bg-brand-100 text-brand-700">
                {confirmed.length} confirmada{confirmed.length !== 1 ? "s" : ""}
              </span>
            )}
          </div>

          {loading ? (
            <div className="text-center py-10">
              <div className="inline-block w-6 h-6 border-2 border-brand-500 border-t-transparent rounded-full animate-spin mb-2"></div>
              <p className="text-gray-400 text-sm">Cargando...</p>
            </div>
          ) : reservations.length === 0 ? (
            <div className="text-center py-10">
              <p className="text-3xl mb-2">📭</p>
              <p className="text-gray-400 text-sm font-medium">Sin reservas este día</p>
            </div>
          ) : (
            <div className="space-y-3">
              {reservations.map((res) => {
                const startDisplay = res.slot_start.substring(0, 5);
                const endDisplay = res.slot_end.substring(0, 5);
                const isConfirmed = res.status === "confirmed";
                return (
                  <div
                    key={res.id}
                    className={`flex items-center gap-3 p-3.5 rounded-2xl border ${
                      isConfirmed
                        ? "bg-white border-gray-100 shadow-sm"
                        : "bg-gray-50 border-gray-100 opacity-60"
                    }`}
                  >
                    <div
                      className={`w-12 h-12 rounded-xl flex flex-col items-center justify-center text-sm font-bold flex-shrink-0 ${
                        isConfirmed
                          ? "bg-gradient-to-br from-brand-500 to-brand-600 text-white shadow-sm shadow-brand-600/20"
                          : "bg-gray-200 text-gray-500"
                      }`}
                    >
                      {startDisplay.split(":")[0]}
                      <span className="text-[10px] opacity-80">:{startDisplay.split(":")[1]}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-sm text-gray-900">
                        {formatTime(startDisplay)} – {formatTime(endDisplay)}
                      </p>
                      <p className="text-xs text-gray-500 truncate">
                        Casa {res.profiles.house_number} · {res.profiles.full_name}
                      </p>
                      {res.reservation_players.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-1.5">
                          {res.reservation_players.map((p, i) => (
                            <span key={i} className="text-[10px] px-2 py-0.5 rounded-full bg-brand-50 text-brand-700 font-medium">
                              {p.player_name}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                    <div className="flex flex-col items-end gap-2 flex-shrink-0">
                      <span
                        className={`chip text-[10px] font-bold ${
                          isConfirmed ? "bg-brand-100 text-brand-700" : "bg-gray-100 text-gray-500"
                        }`}
                      >
                        {isConfirmed ? "Confirmada" : res.status}
                      </span>
                      {isConfirmed && (
                        <button
                          onClick={() => handleCancelReservation(res.id)}
                          disabled={cancelingId === res.id}
                          className="text-[10px] font-semibold text-red-500 hover:text-red-700 bg-red-50 hover:bg-red-100 px-2 py-1 rounded-lg transition-all disabled:opacity-50"
                        >
                          {cancelingId === res.id ? "..." : "Cancelar"}
                        </button>
                      )}
                    </div>
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
