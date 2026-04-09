import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Navigation from "@/components/Navigation";
import { formatDate, formatTime, getMonthName, getNowInQuintanaRoo } from "@/lib/constants";
import ReservationItem from "./ReservationItem";

export default async function MisReservasPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/");

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  if (!profile) redirect("/");

  const qrNow = getNowInQuintanaRoo();
  const currentYear = qrNow.getFullYear();
  const currentMonth = qrNow.getMonth() + 1;

  const { data: reservations } = await supabase
    .from("reservations")
    .select("*, reservation_players(player_name, slot_number)")
    .eq("user_id", user.id)
    .gte(
      "reservation_date",
      `${currentYear}-${String(currentMonth).padStart(2, "0")}-01`
    )
    .order("reservation_date", { ascending: true })
    .order("slot_start", { ascending: true });

  const confirmed = reservations?.filter((r) => r.status === "confirmed") ?? [];
  const cancelled = reservations?.filter((r) => r.status === "cancelled") ?? [];
  const usedCount = confirmed.length;
  const remaining = profile.monthly_slots_limit - usedCount;
  const usagePercent = Math.min((usedCount / profile.monthly_slots_limit) * 100, 100);

  return (
    <div className="min-h-screen">
      <Navigation
        userRole={profile.role}
        userName={profile.full_name}
        houseNumber={profile.house_number}
      />

      <main className="max-w-2xl mx-auto px-4 py-6 space-y-5 safe-bottom">
        {/* Header con resumen visual */}
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-brand-600 via-brand-500 to-emerald-500 p-6 text-white shadow-lg shadow-brand-600/20">
          <div className="absolute -right-8 -top-8 w-40 h-40 rounded-full bg-white/10 blur-2xl"></div>
          <div className="absolute -right-4 -bottom-12 w-48 h-48 rounded-full bg-emerald-300/20 blur-3xl"></div>
          <div className="relative">
            <p className="text-xs font-semibold uppercase tracking-wider text-white/70">
              {getMonthName(currentMonth)} {currentYear}
            </p>
            <h1 className="text-2xl sm:text-3xl font-bold mt-1">Mis Reservas</h1>

            <div className="mt-5 grid grid-cols-3 gap-2">
              <div className="bg-white/15 backdrop-blur-sm rounded-2xl p-3 text-center ring-1 ring-white/20">
                <p className="text-2xl font-bold">{usedCount}</p>
                <p className="text-[10px] sm:text-xs text-white/80 uppercase tracking-wide mt-0.5">Usados</p>
              </div>
              <div className="bg-white/15 backdrop-blur-sm rounded-2xl p-3 text-center ring-1 ring-white/20">
                <p className={`text-2xl font-bold ${remaining <= 2 ? "text-red-300" : ""}`}>{remaining}</p>
                <p className="text-[10px] sm:text-xs text-white/80 uppercase tracking-wide mt-0.5">Libres</p>
              </div>
              <div className="bg-white/15 backdrop-blur-sm rounded-2xl p-3 text-center ring-1 ring-white/20">
                <p className="text-2xl font-bold">{profile.monthly_slots_limit}</p>
                <p className="text-[10px] sm:text-xs text-white/80 uppercase tracking-wide mt-0.5">Límite</p>
              </div>
            </div>

            <div className="mt-4">
              <div className="h-1.5 w-full bg-white/20 rounded-full overflow-hidden">
                <div
                  className="h-full bg-white rounded-full transition-all"
                  style={{ width: `${usagePercent}%` }}
                ></div>
              </div>
              <p className="text-[11px] text-white/60 mt-1.5">
                {usedCount} de {profile.monthly_slots_limit} turnos este mes
              </p>
            </div>
          </div>
        </div>

        {/* Reservas confirmadas */}
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-bold text-gray-900">Confirmadas</h2>
            {confirmed.length > 0 && (
              <span className="chip bg-brand-100 text-brand-700">{confirmed.length}</span>
            )}
          </div>
          {confirmed.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-3xl mb-2">🎾</p>
              <p className="text-gray-500 text-sm font-medium">Sin reservas confirmadas este mes</p>
              <p className="text-gray-400 text-xs mt-1">¡Reserva un turno desde el dashboard!</p>
            </div>
          ) : (
            <div className="space-y-3">
              {confirmed.map((r) => (
                <ReservationItem key={r.id} reservation={r} />
              ))}
            </div>
          )}
        </div>

        {/* Reservas canceladas */}
        {cancelled.length > 0 && (
          <div className="card">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-bold text-gray-900">Canceladas</h2>
              <span className="chip bg-red-100 text-red-600">{cancelled.length}</span>
            </div>
            <div className="space-y-2">
              {cancelled.map((r) => {
                const startDisplay = r.slot_start.substring(0, 5);
                const endDisplay = r.slot_end.substring(0, 5);
                return (
                  <div
                    key={r.id}
                    className="flex items-center justify-between p-3.5 rounded-xl bg-gray-50 border border-gray-100 opacity-70"
                  >
                    <div className="min-w-0">
                      <p className="font-semibold text-sm text-gray-700 capitalize truncate">
                        {formatDate(r.reservation_date)}
                      </p>
                      <p className="text-xs text-gray-500 mt-0.5">
                        {formatTime(startDisplay)} – {formatTime(endDisplay)}
                      </p>
                    </div>
                    <span className="chip bg-red-100 text-red-600 flex-shrink-0 ml-2">
                      Cancelada
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
