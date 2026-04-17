"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import {
  getAvailableStartTimes,
  getSlotEnd,
  formatTime,
  slotsOverlap,
  getCurrentTimeQR,
} from "@/lib/constants";
import { createReservation } from "./actions";

interface Slot {
  slot_start: string;
  slot_end: string;
}

interface Reservation {
  id: string;
  slot_start: string;
  slot_end: string;
  status: string;
}

interface Player {
  player_name: string;
  slot_number: number;
}

interface BookingPanelProps {
  userId: string;
  todayDate: string;
  tomorrow: string;
  canBookTomorrow: boolean;
  takenSlotsToday: Slot[];
  takenSlotsTomorrow: Slot[];
  blockedSlotsToday: Slot[];
  blockedSlotsTomorrow: Slot[];
  existingReservationToday: Reservation | null;
  existingReservationTomorrow: Reservation | null;
}

// Singleton del cliente Supabase a nivel de módulo (solo en browser)
const getSupabase = () => createClient();

export default function BookingPanel({
  userId,
  todayDate,
  tomorrow,
  canBookTomorrow,
  takenSlotsToday,
  takenSlotsTomorrow,
  blockedSlotsToday,
  blockedSlotsTomorrow,
  existingReservationToday,
  existingReservationTomorrow,
}: BookingPanelProps) {
  const router = useRouter();
  const supabase = getSupabase();

  const [selectedTime, setSelectedTime] = useState<string | null>(null);
  const [selectedDuration, setSelectedDuration] = useState<60 | 90 | null>(null);
  const [selectedDate, setSelectedDate] = useState<string>(todayDate);

  // Seleccionar bloques, reservas y reserva existente basado en la fecha seleccionada
  const blockedSlots = selectedDate === todayDate ? blockedSlotsToday : blockedSlotsTomorrow;
  const takenSlots = selectedDate === todayDate ? takenSlotsToday : takenSlotsTomorrow;
  const existingReservation = selectedDate === todayDate ? existingReservationToday : existingReservationTomorrow;
  const [playerNames, setPlayerNames] = useState<string[]>(["", "", "", ""]);
  const [existingPlayers, setExistingPlayers] = useState<Player[]>([]);
  const [loading, setLoading] = useState(false);
  const [cancelLoading, setCancelLoading] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [wantNotification, setWantNotification] = useState<string | null>(null);

  const allStartTimes = getAvailableStartTimes();

  // Suma minutos a una hora HH:MM
  const addMinutes = (time: string, minutes: number): string => {
    const [h, m] = time.split(":").map(Number);
    const total = h * 60 + m + minutes;
    const hh = Math.floor(total / 60);
    const mm = total % 60;
    return `${String(hh).padStart(2, "0")}:${String(mm).padStart(2, "0")}`;
  };

  const canDuration = (startTime: string, duration: number): boolean => {
    const endTime = addMinutes(startTime, duration);
    // No puede terminar después del cierre (22:00)
    if (endTime > "22:00") return false;
    const hasConflict =
      takenSlots.some((t) =>
        slotsOverlap(startTime, endTime, t.slot_start.substring(0, 5), t.slot_end.substring(0, 5))
      ) ||
      blockedSlots.some((b) =>
        slotsOverlap(startTime, endTime, b.slot_start.substring(0, 5), b.slot_end.substring(0, 5))
      );
    return !hasConflict;
  };

  const can60Min = (startTime: string): boolean => canDuration(startTime, 60);
  const can90Min = (startTime: string): boolean => canDuration(startTime, 90);

  // Cargar jugadores de la reserva existente
  useEffect(() => {
    if (!existingReservation) return;
    supabase
      .from("reservation_players")
      .select("player_name, slot_number")
      .eq("reservation_id", existingReservation.id)
      .order("slot_number")
      .then(({ data }) => setExistingPlayers(data ?? []));
  }, [existingReservation]);

  const getSlotStatus = (startTime: string): "available" | "taken" | "blocked" | "passed" => {
    const endTime = getSlotEnd(startTime);

    // Si tiene reserva para esta fecha, bloquea todos los horarios
    if (existingReservation) return "blocked";

    // Si el turno ya pasó (solo hoy) — comparación simple de strings HH:MM en QR
    if (selectedDate === todayDate) {
      const currentTimeQR = getCurrentTimeQR();
      if (startTime <= currentTimeQR) return "passed";
    }

    const isBlocked = blockedSlots.some((b) =>
      slotsOverlap(startTime, endTime, b.slot_start.substring(0, 5), b.slot_end.substring(0, 5))
    );
    if (isBlocked) return "blocked";
    const isTaken = takenSlots.some((t) =>
      slotsOverlap(startTime, endTime, t.slot_start.substring(0, 5), t.slot_end.substring(0, 5))
    );
    if (isTaken) return "taken";
    return "available";
  };

  const filledPlayersCount = playerNames.filter((n) => n.trim() !== "").length;

  const handleBook = async () => {
    if (!selectedTime || !selectedDuration) return;
    setLoading(true);
    setMessage(null);

    const result = await createReservation(
      userId,
      selectedDate,
      selectedTime,
      selectedDuration,
      playerNames
    );

    if (!result.success) {
      setMessage({ type: "error", text: result.error ?? "No se pudo hacer la reserva." });
      setLoading(false);
      return;
    }

    const slotEnd = addMinutes(selectedTime, selectedDuration);
    setMessage({
      type: "success",
      text: `¡Reserva confirmada! ${formatTime(selectedTime)} – ${formatTime(slotEnd)} (${selectedDuration} min)${result.count > 0 ? ` · ${result.count} jugador${result.count > 1 ? "es" : ""}` : ""}`,
    });
    setSelectedTime(null);
    setSelectedDuration(null);
    setPlayerNames(["", "", "", ""]);
    router.refresh();
    setLoading(false);
  };

  const handleCancel = async () => {
    if (!existingReservation) return;
    setCancelLoading(true);
    setMessage(null);

    const { error } = await supabase
      .from("reservations")
      .update({ status: "cancelled" })
      .eq("id", existingReservation.id);

    if (error) {
      setMessage({ type: "error", text: "No se pudo cancelar la reserva." });
    } else {
      setMessage({ type: "success", text: "Reserva cancelada." });
      router.refresh();
    }
    setCancelLoading(false);
  };

  const handleNotifyMe = async (startTime: string) => {
    setWantNotification(startTime);
    await supabase.from("slot_notifications").upsert({
      user_id: userId,
      notification_date: selectedDate,
      slot_start: startTime + ":00",
    });
    setMessage({ type: "success", text: `Te avisaremos si el turno de ${formatTime(startTime)} se libera.` });
    setWantNotification(null);
  };


  // ── Vista: selección de turno ─────────────────────────────────────
  const canBook = selectedTime ? (can90Min(selectedTime) || can60Min(selectedTime)) : false;

  return (
    <div className="space-y-5">
      {/* Selector de fecha — tabs pill */}
      <div className="relative flex p-1 bg-gray-100 rounded-2xl">
        <button
          onClick={() => setSelectedDate(todayDate)}
          className={`relative z-10 flex-1 py-2.5 rounded-xl text-sm font-semibold transition-all ${
            selectedDate === todayDate
              ? "bg-white text-brand-700 shadow-sm"
              : "text-gray-500 hover:text-gray-700"
          }`}
        >
          Hoy
        </button>
        <button
          onClick={() => setSelectedDate(tomorrow)}
          className={`relative z-10 flex-1 py-2.5 rounded-xl text-sm font-semibold transition-all ${
            selectedDate === tomorrow
              ? "bg-white text-brand-700 shadow-sm"
              : "text-gray-500 hover:text-gray-700"
          }`}
        >
          Mañana
        </button>
      </div>

      {/* Reserva existente */}
      {existingReservation && (
        <div className="relative overflow-hidden bg-gradient-to-br from-brand-50 to-emerald-50 border border-brand-200 rounded-2xl p-4 space-y-3">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-brand-500 to-brand-600 text-white flex items-center justify-center text-xl shadow-sm shadow-brand-600/20 flex-shrink-0">
              ✓
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-brand-700">
                Ya reservaste {selectedDate === todayDate ? "hoy" : "mañana"}
              </p>
              <p className="text-brand-900 font-bold text-base">
                {formatTime(existingReservation.slot_start.substring(0, 5))} – {formatTime(existingReservation.slot_end.substring(0, 5))}
              </p>
            </div>
          </div>
          <p className="text-xs text-brand-600 px-3">Para cancelar esta reserva, ve a "Mis Reservas"</p>
        </div>
      )}

      {/* Mañana aún no disponible */}
      {selectedDate === tomorrow && !canBookTomorrow && (
        <div className="bg-gradient-to-br from-amber-50 to-orange-50 border border-amber-200 rounded-2xl p-5 text-center">
          <div className="text-3xl mb-2">⏰</div>
          <p className="text-sm text-amber-900 font-semibold">Las reservas para mañana abren a las 9:00 AM</p>
          <p className="text-xs text-amber-700 mt-1">Mientras tanto, puedes reservar para hoy</p>
        </div>
      )}

      {/* Step 1: horarios */}
      {(selectedDate === todayDate || canBookTomorrow) && (
        <div>
          <div className="flex items-center gap-2 mb-3">
            <span className="w-6 h-6 rounded-full bg-brand-100 text-brand-700 text-xs font-bold flex items-center justify-center">1</span>
            <p className="text-sm font-semibold text-gray-800">Selecciona el horario</p>
          </div>
          <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
            {allStartTimes.map((startTime) => {
              const status = getSlotStatus(startTime);
              const isSelected = selectedTime === startTime;
              const canBook = status === "available" && (can90Min(startTime) || can60Min(startTime));
              const isDisabled = !canBook;

              let durationText = "";
              if (status !== "available") {
                if (status === "passed") durationText = "Ya pasó";
                else if (status === "blocked") durationText = existingReservation ? "Tu reserva" : "Bloqueado";
                else durationText = "Ocupado";
              } else if (can90Min(startTime)) {
                durationText = "90 min";
              } else if (can60Min(startTime)) {
                durationText = "60 min";
              } else {
                durationText = "—";
              }

              return (
                <button
                  key={startTime}
                  disabled={isDisabled}
                  onClick={() => {
                    setSelectedTime(isSelected ? null : startTime);
                    setSelectedDuration(null);
                    setPlayerNames(["", "", "", ""]);
                  }}
                  className={`slot-btn ${
                    isDisabled
                      ? "slot-btn-disabled"
                      : isSelected
                      ? "slot-btn-selected"
                      : "slot-btn-available"
                  }`}
                >
                  <div className="text-sm font-bold">{formatTime(startTime)}</div>
                  <div className={`text-[10px] font-medium mt-0.5 ${
                    isSelected ? "text-white/90" : isDisabled ? "text-gray-300" : "text-gray-500"
                  }`}>
                    {durationText}
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Step 2: duración */}
      {selectedTime && (
        <div>
          <div className="flex items-center gap-2 mb-3">
            <span className="w-6 h-6 rounded-full bg-brand-100 text-brand-700 text-xs font-bold flex items-center justify-center">2</span>
            <p className="text-sm font-semibold text-gray-800">Elige la duración</p>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={() => setSelectedDuration(60)}
              disabled={!can60Min(selectedTime)}
              className={`rounded-2xl py-4 font-semibold transition-all border-2 ${
                !can60Min(selectedTime)
                  ? "bg-gray-50 border-gray-100 text-gray-300 cursor-not-allowed"
                  : selectedDuration === 60
                  ? "bg-gradient-to-br from-brand-600 to-brand-500 border-brand-600 text-white shadow-md shadow-brand-600/20"
                  : "bg-white border-gray-200 text-gray-700 hover:border-brand-400 hover:bg-brand-50/50 active:scale-[0.98]"
              }`}
            >
              <div className="text-xl font-bold">60</div>
              <div className="text-[11px] opacity-80 uppercase tracking-wide">minutos</div>
            </button>
            <button
              onClick={() => setSelectedDuration(90)}
              disabled={!can90Min(selectedTime)}
              className={`rounded-2xl py-4 font-semibold transition-all border-2 ${
                !can90Min(selectedTime)
                  ? "bg-gray-50 border-gray-100 text-gray-300 cursor-not-allowed"
                  : selectedDuration === 90
                  ? "bg-gradient-to-br from-brand-600 to-brand-500 border-brand-600 text-white shadow-md shadow-brand-600/20"
                  : "bg-white border-gray-200 text-gray-700 hover:border-brand-400 hover:bg-brand-50/50 active:scale-[0.98]"
              }`}
            >
              <div className="text-xl font-bold">90</div>
              <div className="text-[11px] opacity-80 uppercase tracking-wide">minutos</div>
            </button>
          </div>
        </div>
      )}

      {/* Step 3: confirmar */}
      {selectedTime && selectedDuration && (
        <div className="bg-gradient-to-br from-brand-50 to-emerald-50 border border-brand-200 rounded-2xl p-5 space-y-4">
          <div className="flex items-center gap-2">
            <span className="w-6 h-6 rounded-full bg-brand-600 text-white text-xs font-bold flex items-center justify-center">3</span>
            <p className="text-sm font-semibold text-brand-800">Confirma tu reserva</p>
          </div>
          <div className="bg-white rounded-xl p-4 ring-1 ring-brand-100">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-500">Turno reservado</p>
            <p className="text-gray-900 font-bold text-xl mt-1">
              {formatTime(selectedTime)} – {formatTime(addMinutes(selectedTime, selectedDuration))}
            </p>
            <p className="text-xs text-brand-600 font-medium mt-1">{selectedDuration} minutos de cancha</p>
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs font-semibold uppercase tracking-wide text-gray-600">Jugadores</p>
              <span className="text-[10px] text-gray-400 uppercase">Opcional</span>
            </div>
            <div className="space-y-2">
              {playerNames.map((name, idx) => (
                <input
                  key={idx}
                  type="text"
                  value={name}
                  onChange={(e) => {
                    const updated = [...playerNames];
                    updated[idx] = e.target.value;
                    setPlayerNames(updated);
                  }}
                  className="input"
                  placeholder={`Jugador ${idx + 1}`}
                  maxLength={50}
                />
              ))}
            </div>
          </div>

          <div className="flex gap-2">
            <button
              onClick={() => {
                setSelectedTime(null);
                setSelectedDuration(null);
                setPlayerNames(["", "", "", ""]);
              }}
              className="btn-secondary flex-1"
            >
              Cancelar
            </button>
            <button onClick={handleBook} disabled={loading} className="btn-primary flex-[2]">
              {loading ? "Reservando..." : "Confirmar ✓"}
            </button>
          </div>
        </div>
      )}

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
    </div>
  );
}
