"use client";

import { useActionState, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import Navigation from "@/components/Navigation";
import {
  getAvailableStartTimes,
  formatTime,
  getTodayDate,
  getCurrentTimeQR,
  slotsOverlap,
} from "@/lib/constants";
import { createReservationAsAdmin } from "./actions";

interface Profile {
  id: string;
  full_name: string;
  house_number: string;
  role: string;
}

interface User {
  id: string;
  email: string;
  full_name: string;
  house_number: string;
}

export default function AdminCrearReservaPage() {
  const supabase = createClient();
  const [mounted, setMounted] = useState(false);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [reservationType, setReservationType] = useState<"existing" | "new">("existing");
  const [users, setUsers] = useState<User[]>([]);
  const [selectedUserId, setSelectedUserId] = useState<string>("");
  const [searchHouse, setSearchHouse] = useState<string>("");
  const [formData, setFormData] = useState({ email: "", full_name: "", house_number: "" });
  const [playerNames, setPlayerNames] = useState<string[]>(["", "", "", ""]);
  const [reservationDate, setReservationDate] = useState<string>(getTodayDate());
  const [duration, setDuration] = useState<60 | 90>(60);
  const [blockedSlots, setBlockedSlots] = useState<any[]>([]);
  const [reservations, setReservations] = useState<any[]>([]);
  const [selectedSlot, setSelectedSlot] = useState<string>("");
  const [state, formAction] = useActionState(createReservationAsAdmin, { error: "", success: false });

  useEffect(() => {
    setMounted(true);
  }, []);

  const availableTimes = getAvailableStartTimes();

  useEffect(() => {
    const loadData = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      // Cargar perfil del admin
      const { data: profileData } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id);
      setProfile(profileData?.[0]);

      // Cargar lista de usuarios residentes
      const { data: usersData } = await supabase
        .from("profiles")
        .select("id, email, full_name, house_number")
        .eq("role", "resident")
        .order("house_number");
      setUsers(usersData ?? []);
    };
    loadData();
  }, []);

  useEffect(() => {
    const loadData = async () => {
      const { data: blockedData } = await supabase
        .from("blocked_slots")
        .select("*")
        .eq("block_date", reservationDate);
      setBlockedSlots(blockedData ?? []);

      const { data: resData } = await supabase
        .from("reservations")
        .select("*")
        .eq("reservation_date", reservationDate)
        .eq("status", "confirmed");
      setReservations(resData ?? []);
    };
    loadData();
  }, [reservationDate, supabase]);

  const handleUserSelect = (userId: string) => {
    setSelectedUserId(userId);
    const user = users.find(u => u.id === userId);
    if (user) {
      setFormData({
        email: user.email,
        full_name: user.full_name,
        house_number: user.house_number,
      });
    }
  };

  const handleFormAction = async (formDataObj: FormData) => {
    if (!selectedSlot) {
      alert("Por favor selecciona un horario");
      return;
    }
    if (reservationType === "existing" && !selectedUserId) {
      alert("Por favor selecciona un usuario");
      return;
    }
    if (reservationType === "new" && (!formData.email || !formData.full_name || !formData.house_number)) {
      alert("Por favor completa todos los campos");
      return;
    }

    // Asegurar que los datos correctos se envían
    if (reservationType === "existing") {
      formDataObj.set("email", formData.email);
      formDataObj.set("full_name", formData.full_name);
      formDataObj.set("house_number", formData.house_number);
    }
    formDataObj.set("slot_start", selectedSlot + ":00");
    formDataObj.set("duration", duration.toString());
    await formAction(formDataObj);
    if (state.success) {
      setPlayerNames(["", "", "", ""]);
      setSelectedSlot("");
    }
  };

  const addMinutes = (time: string, minutes: number): string => {
    const [h, m] = time.split(":").map(Number);
    const total = h * 60 + m + minutes;
    const hh = Math.floor(total / 60);
    const mm = total % 60;
    return `${String(hh).padStart(2, "0")}:${String(mm).padStart(2, "0")}`;
  };

  const hasConflict = (startTime: string, endTime: string): boolean => {
    const blockedConflict = blockedSlots.some((s) =>
      slotsOverlap(startTime, endTime, s.slot_start.substring(0, 5), s.slot_end.substring(0, 5))
    );
    const reservedConflict = reservations.some((r) =>
      slotsOverlap(startTime, endTime, r.slot_start.substring(0, 5), r.slot_end.substring(0, 5))
    );
    return blockedConflict || reservedConflict;
  };

  const getMaxDuration = (startTime: string): 0 | 60 | 90 => {
    // Turno ya pasado (solo hoy)
    if (reservationDate === getTodayDate()) {
      if (startTime <= getCurrentTimeQR()) return 0;
    }

    // No puede terminar después del cierre (22:00)
    const end90 = addMinutes(startTime, 90);
    const end60 = addMinutes(startTime, 60);

    if (end90 <= "22:00" && !hasConflict(startTime, end90)) return 90;
    if (end60 <= "22:00" && !hasConflict(startTime, end60)) return 60;
    return 0;
  };

  const isSlotBlocked = (startTime: string): boolean => {
    return getMaxDuration(startTime) === 0;
  };

  if (!profile) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="text-3xl mb-2">✨</div>
          <p className="text-gray-400 text-sm">Cargando...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <Navigation
        userRole={profile.role}
        userName={profile.full_name}
        houseNumber={profile.house_number}
      />

      <main className="max-w-2xl mx-auto px-4 py-6 space-y-5 safe-bottom">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Crear Reserva</h1>
          <p className="text-gray-500 text-sm">Reserva un turno para un condomino</p>
        </div>

        <div className="card space-y-5">
          {/* Tabs tipo */}
          <div className="relative flex p-1 bg-gray-100 rounded-2xl">
            <button
              type="button"
              onClick={() => setReservationType("existing")}
              className={`relative z-10 flex-1 py-2.5 rounded-xl text-sm font-semibold transition-all ${
                reservationType === "existing"
                  ? "bg-white text-brand-700 shadow-sm"
                  : "text-gray-500 hover:text-gray-700"
              }`}
            >
              Residente existente
            </button>
            <button
              type="button"
              onClick={() => setReservationType("new")}
              className={`relative z-10 flex-1 py-2.5 rounded-xl text-sm font-semibold transition-all ${
                reservationType === "new"
                  ? "bg-white text-brand-700 shadow-sm"
                  : "text-gray-500 hover:text-gray-700"
              }`}
            >
              Usuario nuevo
            </button>
          </div>

          <form action={handleFormAction} className="space-y-4">
            {/* Usuario existente */}
            {reservationType === "existing" ? (
              <div className="space-y-3">
                <div>
                  <label className="label">Buscar por número de casa</label>
                  <input
                    type="text"
                    placeholder="Ej: 42"
                    value={searchHouse}
                    onChange={(e) => setSearchHouse(e.target.value)}
                    className="input"
                  />
                </div>

                {searchHouse && (
                  <div className="border border-gray-200 rounded-2xl bg-white overflow-hidden max-h-48 overflow-y-auto shadow-sm">
                    {users
                      .filter((u) => u.house_number.includes(searchHouse))
                      .map((u) => (
                        <button
                          key={u.id}
                          type="button"
                          onClick={() => { handleUserSelect(u.id); setSearchHouse(""); }}
                          className="w-full text-left px-4 py-3 hover:bg-brand-50 border-b border-gray-100 last:border-0 transition-colors"
                        >
                          <p className="font-semibold text-sm text-gray-900">Casa {u.house_number}</p>
                          <p className="text-xs text-gray-500">{u.full_name} · {u.email}</p>
                        </button>
                      ))}
                    {users.filter((u) => u.house_number.includes(searchHouse)).length === 0 && (
                      <p className="text-sm text-gray-400 text-center py-4">Sin resultados</p>
                    )}
                  </div>
                )}

                {selectedUserId && (
                  <div className="flex items-center gap-3 p-3.5 bg-brand-50 border border-brand-200 rounded-2xl">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-brand-500 to-brand-600 text-white flex items-center justify-center text-base font-bold flex-shrink-0">
                      🏠
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-sm text-brand-900">Casa {formData.house_number}</p>
                      <p className="text-xs text-brand-700 truncate">{formData.full_name}</p>
                      <p className="text-xs text-brand-600 truncate">{formData.email}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => { setSelectedUserId(""); setFormData({ email: "", full_name: "", house_number: "" }); }}
                      className="text-xs text-gray-400 hover:text-red-500 transition-colors"
                    >
                      ✕
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <div className="space-y-3">
                <div>
                  <label className="label">Correo</label>
                  <input type="email" name="email" value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="input" placeholder="correo@ejemplo.com" required />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="label">Nombre completo</label>
                    <input type="text" name="full_name" value={formData.full_name}
                      onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                      className="input" placeholder="Juan Pérez" required />
                  </div>
                  <div>
                    <label className="label">Casa #</label>
                    <input type="text" name="house_number" value={formData.house_number}
                      onChange={(e) => setFormData({ ...formData, house_number: e.target.value })}
                      className="input" placeholder="42" required />
                  </div>
                </div>
              </div>
            )}

            {/* Fecha */}
            <div>
              <label className="label">Fecha</label>
              <input type="date" name="reservation_date" value={reservationDate}
                onChange={(e) => { setReservationDate(e.target.value); setSelectedSlot(""); }}
                className="input" min={getTodayDate()} required />
            </div>

            {/* Duración */}
            <div>
              <label className="label">Duración</label>
              <div className="grid grid-cols-2 gap-3">
                {([60, 90] as const).map((d) => (
                  <button key={d} type="button" onClick={() => setDuration(d)}
                    className={`rounded-2xl py-3 font-semibold transition-all border-2 ${
                      duration === d
                        ? "bg-gradient-to-br from-brand-600 to-brand-500 border-brand-600 text-white shadow-md shadow-brand-600/20"
                        : "bg-white border-gray-200 text-gray-700 hover:border-brand-400 hover:bg-brand-50/50"
                    }`}
                  >
                    <div className="text-xl font-bold">{d}</div>
                    <div className="text-[11px] opacity-80 uppercase tracking-wide">min</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Horarios */}
            <div>
              <label className="label">Horario disponible</label>
              <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                {availableTimes.map((t) => {
                  const maxDuration = getMaxDuration(t);
                  const blocked = maxDuration === 0;
                  const isSelected = selectedSlot === t;
                  return (
                    <button key={t} type="button" disabled={blocked} onClick={() => setSelectedSlot(t)}
                      className={`slot-btn ${
                        blocked ? "slot-btn-disabled" : isSelected ? "slot-btn-selected" : "slot-btn-available"
                      }`}
                    >
                      <div className="text-sm font-bold">{formatTime(t)}</div>
                      <div className={`text-[10px] font-medium mt-0.5 ${
                        isSelected ? "text-white/80" : blocked ? "text-gray-300" : "text-gray-500"
                      }`}>
                        {blocked ? "—" : `${maxDuration}m`}
                      </div>
                    </button>
                  );
                })}
              </div>
              {selectedSlot && (
                <div className="mt-3 flex items-center gap-2 p-3 bg-brand-50 border border-brand-200 rounded-xl">
                  <span className="text-brand-600 font-bold">✓</span>
                  <span className="text-sm font-semibold text-brand-800">
                    {formatTime(selectedSlot)} – {formatTime(addMinutes(selectedSlot, duration))} · {duration} min
                  </span>
                </div>
              )}
            </div>

            {/* Jugadores */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="label mb-0">Jugadores</label>
                <span className="text-[10px] text-gray-400 uppercase">Opcional</span>
              </div>
              <div className="space-y-2">
                {playerNames.map((_, idx) => (
                  <input key={idx} type="text" value={playerNames[idx]}
                    onChange={(e) => {
                      const n = [...playerNames]; n[idx] = e.target.value; setPlayerNames(n);
                    }}
                    className="input" placeholder={`Jugador ${idx + 1}`} />
                ))}
              </div>
            </div>

            <input type="hidden" name="player_names" value={JSON.stringify(playerNames.filter((n) => n.trim()))} />

            {state.error && (
              <div className="rounded-xl px-4 py-3 text-sm font-medium bg-red-50 text-red-700 border border-red-200">
                {state.error}
              </div>
            )}
            {state.success && (
              <div className="rounded-xl px-4 py-3 text-sm font-medium bg-brand-50 text-brand-800 border border-brand-200">
                ✓ Reserva creada correctamente
              </div>
            )}

            <button type="submit" className="btn-primary w-full text-base py-3">
              Crear reserva ✨
            </button>
          </form>
        </div>
      </main>
    </div>
  );
}
