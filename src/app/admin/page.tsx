import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Navigation from "@/components/Navigation";
import Link from "next/link";
import { formatDate, formatTime, getTodayDate, getTomorrowDate, getMonthName, getNowInQuintanaRoo } from "@/lib/constants";

export default async function AdminDashboard() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/");

  const { data: profiles } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id);

  const profile = profiles?.[0];
  if (!profile || profile.role !== "admin") redirect("/dashboard");

  const tomorrowDate = getTomorrowDate();
  const todayStr = getTodayDate();
  const qrNow = getNowInQuintanaRoo();
  const currentMonth = qrNow.getMonth() + 1;
  const currentYear = qrNow.getFullYear();

  const [
    { data: todayReservations },
    { data: tomorrowReservations },
    { data: activeUsers },
    { data: monthReservations },
    { data: pendingInvites },
  ] = await Promise.all([
    supabase
      .from("reservations")
      .select("*, profiles(full_name, house_number)")
      .eq("reservation_date", todayStr)
      .eq("status", "confirmed")
      .order("slot_start", { ascending: true }),
    supabase
      .from("reservations")
      .select("*, profiles(full_name, house_number)")
      .eq("reservation_date", tomorrowDate)
      .eq("status", "confirmed")
      .order("slot_start", { ascending: true }),
    supabase.from("profiles").select("id").eq("role", "resident").eq("is_active", true),
    supabase
      .from("reservations")
      .select("id")
      .eq("status", "confirmed")
      .gte("reservation_date", `${currentYear}-${String(currentMonth).padStart(2, "0")}-01`),
    supabase
      .from("invite_tokens")
      .select("id")
      .eq("is_used", false)
      .gt("expires_at", new Date().toISOString()),
  ]);

  const quickLinks = [
    { href: "/admin/calendario", label: "Ver Reservas", emoji: "📅", color: "from-blue-500 to-blue-600" },
    { href: "/admin/reservas", label: "Crear Reserva", emoji: "✨", color: "from-brand-500 to-brand-600" },
    { href: "/admin/invitar", label: "Invitar", emoji: "✉️", color: "from-purple-500 to-purple-600" },
    { href: "/admin/usuarios", label: "Usuarios", emoji: "👥", color: "from-amber-500 to-orange-500" },
    { href: "/admin/bloqueos", label: "Bloquear Turnos", emoji: "🚫", color: "from-red-500 to-red-600" },
  ];

  return (
    <div className="min-h-screen">
      <Navigation
        userRole={profile.role}
        userName={profile.full_name}
        houseNumber={profile.house_number}
      />

      <main className="max-w-3xl mx-auto px-4 py-6 space-y-6 safe-bottom">
        {/* Hero */}
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-gray-900 via-gray-800 to-brand-900 p-6 text-white shadow-xl">
          <div className="absolute -right-8 -top-8 w-48 h-48 rounded-full bg-brand-500/20 blur-3xl"></div>
          <div className="absolute right-10 bottom-0 w-32 h-32 rounded-full bg-emerald-400/10 blur-2xl"></div>
          <div className="relative">
            <p className="text-xs font-semibold uppercase tracking-wider text-white/50">Panel Admin</p>
            <h1 className="text-2xl sm:text-3xl font-bold mt-1">Aldea Savia Padel</h1>
            <p className="text-white/60 text-sm mt-1">{getMonthName(currentMonth)} {currentYear}</p>

            <div className="mt-5 grid grid-cols-4 gap-2">
              {[
                { label: "Casas activas", value: activeUsers?.length ?? 0, icon: "🏠" },
                { label: getMonthName(currentMonth), value: monthReservations?.length ?? 0, icon: "📊" },
                { label: "Hoy", value: todayReservations?.length ?? 0, icon: "🎾" },
                { label: "Invitaciones", value: pendingInvites?.length ?? 0, icon: "✉️" },
              ].map((stat) => (
                <div
                  key={stat.label}
                  className="bg-white/10 backdrop-blur-sm rounded-2xl p-2.5 sm:p-3 text-center ring-1 ring-white/10"
                >
                  <div className="text-lg sm:text-xl mb-0.5">{stat.icon}</div>
                  <p className="text-lg sm:text-2xl font-bold">{stat.value}</p>
                  <p className="text-[9px] sm:text-[10px] text-white/60 uppercase tracking-wide leading-tight mt-0.5">
                    {stat.label}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Accesos rápidos */}
        <div>
          <h2 className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-3 px-1">
            Acciones rápidas
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {quickLinks.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="card card-hover flex items-center gap-3 p-4 group"
              >
                <div
                  className={`w-10 h-10 rounded-xl bg-gradient-to-br ${item.color} text-white flex items-center justify-center text-xl shadow-sm flex-shrink-0`}
                >
                  {item.emoji}
                </div>
                <span className="text-sm font-semibold text-gray-800 group-hover:text-brand-600 transition-colors">
                  {item.label}
                </span>
              </Link>
            ))}
          </div>
        </div>

        {/* Reservas de hoy */}
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-bold text-gray-900">Cancha hoy</h2>
            <span className="text-xs text-gray-500 capitalize">{formatDate(todayStr)}</span>
          </div>
          {!todayReservations || todayReservations.length === 0 ? (
            <div className="text-center py-6">
              <p className="text-2xl mb-1">🎾</p>
              <p className="text-gray-400 text-sm">Sin reservas hoy</p>
            </div>
          ) : (
            <div className="space-y-2">
              {todayReservations.map((r) => {
                const startDisplay = r.slot_start.substring(0, 5);
                const endDisplay = r.slot_end.substring(0, 5);
                const p = r.profiles as { full_name: string; house_number: string };
                return (
                  <div
                    key={r.id}
                    className="flex items-center gap-3 p-3 rounded-xl bg-brand-50 border border-brand-100"
                  >
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-brand-500 to-brand-600 text-white flex flex-col items-center justify-center text-sm font-bold flex-shrink-0 shadow-sm shadow-brand-600/20">
                      {startDisplay.split(":")[0]}
                      <span className="text-[9px] text-white/80">:{startDisplay.split(":")[1]}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-sm text-gray-900">
                        {formatTime(startDisplay)} – {formatTime(endDisplay)}
                      </p>
                      <p className="text-xs text-gray-500 truncate">Casa {p?.house_number} · {p?.full_name}</p>
                    </div>
                    <span className="chip bg-brand-100 text-brand-700 flex-shrink-0">✓</span>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Reservas de mañana */}
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-bold text-gray-900">Cancha mañana</h2>
            <span className="text-xs text-gray-500 capitalize">{formatDate(tomorrowDate)}</span>
          </div>
          {!tomorrowReservations || tomorrowReservations.length === 0 ? (
            <div className="text-center py-6">
              <p className="text-2xl mb-1">📭</p>
              <p className="text-gray-400 text-sm">Sin reservas para mañana</p>
            </div>
          ) : (
            <div className="space-y-2">
              {tomorrowReservations.map((r) => {
                const startDisplay = r.slot_start.substring(0, 5);
                const endDisplay = r.slot_end.substring(0, 5);
                const p = r.profiles as { full_name: string; house_number: string };
                return (
                  <div
                    key={r.id}
                    className="flex items-center gap-3 p-3 rounded-xl bg-blue-50 border border-blue-100"
                  >
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 text-white flex flex-col items-center justify-center text-sm font-bold flex-shrink-0 shadow-sm shadow-blue-600/20">
                      {startDisplay.split(":")[0]}
                      <span className="text-[9px] text-white/80">:{startDisplay.split(":")[1]}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-sm text-gray-900">
                        {formatTime(startDisplay)} – {formatTime(endDisplay)}
                      </p>
                      <p className="text-xs text-gray-500 truncate">Casa {p?.house_number} · {p?.full_name}</p>
                    </div>
                    <span className="chip bg-blue-100 text-blue-700 flex-shrink-0">✓</span>
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
