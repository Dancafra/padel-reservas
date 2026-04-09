"use client";

import { useEffect, useState } from "react";
import { formatDate, formatTime, parseQRDateTimeToUTC } from "@/lib/constants";
import CancelButton from "./CancelButton";

interface Reservation {
  id: string;
  reservation_date: string;
  slot_start: string;
  slot_end: string;
  status: string;
  reservation_players?: { player_name: string; slot_number: number }[];
}

export default function ReservationItem({ reservation: r }: { reservation: Reservation }) {
  const [mounted, setMounted] = useState(false);
  const [nowUTC, setNowUTC] = useState<Date>(new Date());

  useEffect(() => {
    setMounted(true);
    setNowUTC(new Date());
    const interval = setInterval(() => setNowUTC(new Date()), 30000);
    return () => clearInterval(interval);
  }, []);

  if (!mounted) return null;

  const startDisplay = r.slot_start.substring(0, 5);
  const endDisplay = r.slot_end.substring(0, 5);

  const reservationUTC = parseQRDateTimeToUTC(r.reservation_date, r.slot_start);
  const reservationEndUTC = parseQRDateTimeToUTC(r.reservation_date, r.slot_end);
  const isPast = reservationEndUTC.getTime() < nowUTC.getTime();
  const isOngoing =
    reservationUTC.getTime() <= nowUTC.getTime() &&
    reservationEndUTC.getTime() > nowUTC.getTime();
  const timeUntilStart = reservationUTC.getTime() - nowUTC.getTime();
  const threeHoursMs = 180 * 60 * 1000;
  const canCancel = !isPast && !isOngoing && timeUntilStart > threeHoursMs;

  const players =
    (r.reservation_players as { player_name: string; slot_number: number }[] | null)
      ?.sort((a, b) => a.slot_number - b.slot_number) ?? [];

  return (
    <div
      className={`rounded-2xl border overflow-hidden transition-all ${
        isPast
          ? "bg-gray-50 border-gray-100 opacity-60"
          : isOngoing
          ? "bg-gradient-to-br from-emerald-50 to-brand-50 border-brand-200 shadow-sm"
          : "bg-white border-gray-100 shadow-sm"
      }`}
    >
      <div className="p-4 flex items-center justify-between gap-3">
        {/* Indicador de hora (izquierda) */}
        <div
          className={`w-12 h-12 rounded-xl flex flex-col items-center justify-center flex-shrink-0 font-bold text-sm ${
            isPast
              ? "bg-gray-100 text-gray-400"
              : isOngoing
              ? "bg-gradient-to-br from-brand-500 to-brand-600 text-white shadow-sm shadow-brand-600/20"
              : "bg-brand-50 text-brand-700"
          }`}
        >
          {startDisplay.split(":")[0]}
          <span className={`text-[10px] font-medium ${isPast ? "text-gray-400" : isOngoing ? "text-white/80" : "text-brand-500"}`}>
            :{startDisplay.split(":")[1]}
          </span>
        </div>

        {/* Detalles */}
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-sm text-gray-900 capitalize truncate">
            {formatDate(r.reservation_date)}
          </p>
          <p className="text-xs text-gray-500 mt-0.5">
            {formatTime(startDisplay)} – {formatTime(endDisplay)}
          </p>
          {players.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-2">
              {players.map((p) => (
                <span
                  key={p.slot_number}
                  className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${
                    isPast
                      ? "bg-gray-100 text-gray-500"
                      : "bg-brand-100 text-brand-700"
                  }`}
                >
                  {p.player_name}
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Status + cancelar */}
        <div className="flex flex-col items-end gap-2 flex-shrink-0">
          <span
            className={`chip text-[10px] font-bold ${
              isPast
                ? "bg-gray-100 text-gray-500"
                : isOngoing
                ? "bg-brand-600 text-white"
                : "bg-brand-100 text-brand-700"
            }`}
          >
            {isPast ? "Jugado" : isOngoing ? "En curso" : "Confirmado"}
          </span>
          {!isPast && !isOngoing && (
            <CancelButton
              reservationId={r.id}
              canCancel={canCancel}
              minutesUntilStart={Math.round(timeUntilStart / 60 / 1000)}
            />
          )}
        </div>
      </div>
    </div>
  );
}
