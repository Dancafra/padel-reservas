import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Navigation from "@/components/Navigation";
import BookingPanel from "./BookingPanel";
import { getTodayDate, getTomorrowDate, formatDate, canBookNow, getMonthName } from "@/lib/constants";

export default async function DashboardPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/");

  const { data: profiles, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id);

  const profile = profiles?.[0];

  if (error) {
    return <div className="p-8"><pre>{JSON.stringify(error, null, 2)}</pre></div>;
  }
  if (!profile) {
    return <div className="p-8"><pre>No profile found for {user.id}</pre></div>;
  }
  if (profile.role === "admin") redirect("/admin");

  const { data: monthReservations } = await supabase
    .from("reservations")
    .select("id")
    .eq("user_id", user.id)
    .eq("status", "confirmed");

  const usedThisMonth = monthReservations?.length ?? 0;
  const remainingThisMonth = profile.monthly_slots_limit - usedThisMonth;

  const tomorrow = getTomorrowDate();
  const todayStr = getTodayDate();
  const bookingOpen = canBookNow();

  // Cargar reservas para hoy y mañana
  const { data: reservationsData } = await supabase
    .from("reservations")
    .select("*")
    .eq("user_id", user.id)
    .in("reservation_date", [todayStr, tomorrow])
    .eq("status", "confirmed");

  const todayReservation = (reservationsData ?? []).find(r => r.reservation_date === todayStr);
  const tomorrowReservation = (reservationsData ?? []).find(r => r.reservation_date === tomorrow);

  const { data: takenSlotsAll } = await supabase
    .from("reservations")
    .select("reservation_date, slot_start, slot_end")
    .in("reservation_date", [todayStr, tomorrow])
    .eq("status", "confirmed");

  const takenSlotsToday = (takenSlotsAll ?? [])
    .filter((t) => t.reservation_date === todayStr)
    .map((t) => ({ slot_start: t.slot_start, slot_end: t.slot_end }));
  const takenSlotsTomorrow = (takenSlotsAll ?? [])
    .filter((t) => t.reservation_date === tomorrow)
    .map((t) => ({ slot_start: t.slot_start, slot_end: t.slot_end }));

  // Cargar bloques para hoy y mañana
  const { data: blockedSlotsData } = await supabase
    .from("blocked_slots")
    .select("block_date, slot_start, slot_end")
    .in("block_date", [todayStr, tomorrow]);

  // Separar bloques por fecha
  const blockedSlotsToday = (blockedSlotsData ?? [])
    .filter(b => b.block_date === todayStr)
    .map(b => ({ slot_start: b.slot_start, slot_end: b.slot_end }));

  const blockedSlotsTomorrow = (blockedSlotsData ?? [])
    .filter(b => b.block_date === tomorrow)
    .map(b => ({ slot_start: b.slot_start, slot_end: b.slot_end }));

  const firstName = profile.full_name.split(" ")[0];
  const usagePercent = Math.min((usedThisMonth / profile.monthly_slots_limit) * 100, 100);

  return (
    <div className="min-h-screen">
      <Navigation
        userRole={profile.role}
        userName={profile.full_name}
        houseNumber={profile.house_number}
      />
      <main className="max-w-2xl mx-auto px-4 py-6 space-y-6 safe-bottom">
        {/* Hero header */}
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-brand-600 via-brand-500 to-emerald-500 p-6 text-white shadow-lg shadow-brand-600/20">
          <div className="absolute -right-8 -top-8 w-40 h-40 rounded-full bg-white/10 blur-2xl"></div>
          <div className="absolute -right-4 -bottom-12 w-48 h-48 rounded-full bg-emerald-300/20 blur-3xl"></div>
          <div className="relative">
            <p className="text-xs font-semibold uppercase tracking-wider text-white/70">
              Aldea Savia Padel
            </p>
            <h1 className="text-2xl sm:text-3xl font-bold mt-1 text-balance">
              Hola, {firstName} 👋
            </h1>
            <p className="text-white/80 text-sm mt-1">Casa {profile.house_number}</p>

            {/* Stats inline en el hero */}
            <div className="mt-5 grid grid-cols-3 gap-2 sm:gap-3">
              <div className="bg-white/15 backdrop-blur-sm rounded-2xl p-3 text-center ring-1 ring-white/20">
                <p className="text-2xl font-bold">{usedThisMonth}</p>
                <p className="text-[10px] sm:text-xs text-white/80 uppercase tracking-wide mt-0.5">Usados</p>
              </div>
              <div className="bg-white/15 backdrop-blur-sm rounded-2xl p-3 text-center ring-1 ring-white/20">
                <p className="text-2xl font-bold">{remainingThisMonth}</p>
                <p className="text-[10px] sm:text-xs text-white/80 uppercase tracking-wide mt-0.5">Libres</p>
              </div>
              <div className="bg-white/15 backdrop-blur-sm rounded-2xl p-3 text-center ring-1 ring-white/20">
                <p className="text-2xl font-bold">{profile.monthly_slots_limit}</p>
                <p className="text-[10px] sm:text-xs text-white/80 uppercase tracking-wide mt-0.5">Total</p>
              </div>
            </div>

            {/* Barra de progreso */}
            <div className="mt-4">
              <div className="h-1.5 w-full bg-white/20 rounded-full overflow-hidden">
                <div
                  className="h-full bg-white rounded-full transition-all"
                  style={{ width: `${usagePercent}%` }}
                ></div>
              </div>
            </div>
          </div>
        </div>

        {/* Panel de reserva */}
        <div className="card">
          <div className="mb-5">
            <h2 className="font-bold text-gray-900 text-lg">Reservar cancha</h2>
          </div>

          {remainingThisMonth <= 0 ? (
            <div className="bg-gradient-to-br from-red-50 to-pink-50 border border-red-200 rounded-2xl p-5 text-center">
              <div className="text-3xl mb-2">🚫</div>
              <p className="text-sm text-red-700 font-medium">
                Has alcanzado el límite de {profile.monthly_slots_limit} turnos este mes
              </p>
            </div>
          ) : (
            <BookingPanel
              userId={user.id}
              todayDate={todayStr}
              tomorrow={tomorrow}
              canBookTomorrow={bookingOpen}
              takenSlotsToday={takenSlotsToday}
              takenSlotsTomorrow={takenSlotsTomorrow}
              blockedSlotsToday={blockedSlotsToday}
              blockedSlotsTomorrow={blockedSlotsTomorrow}
              existingReservationToday={todayReservation ?? null}
              existingReservationTomorrow={tomorrowReservation ?? null}
            />
          )}
        </div>
      </main>
    </div>
  );
}
