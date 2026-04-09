"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import Navigation from "@/components/Navigation";
import { formatDate, formatTime, getTomorrowDate } from "@/lib/constants";

interface Profile {
  id: string;
  full_name: string;
  house_number: string;
  role: string;
}

interface Notification {
  id: string;
  notification_date: string;
  slot_start: string;
  is_sent: boolean;
  created_at: string;
}

export default function NotificacionesPage() {
  const supabase = createClient();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [notifications, setNotifications] = useState<Notification[]>([]);

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

      const tomorrow = getTomorrowDate();
      const { data: notifData } = await supabase
        .from("slot_notifications")
        .select("*")
        .eq("user_id", user.id)
        .gte("notification_date", tomorrow)
        .order("notification_date", { ascending: true })
        .order("slot_start", { ascending: true });

      setNotifications(notifData ?? []);
    };
    loadData();
  }, []);

  const handleDelete = async (id: string) => {
    const { error } = await supabase
      .from("slot_notifications")
      .delete()
      .eq("id", id);

    if (!error) {
      setNotifications(notifications.filter((n) => n.id !== id));
    }
  };

  if (!profile) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block w-8 h-8 border-2 border-brand-500 border-t-transparent rounded-full animate-spin mb-3"></div>
          <p className="text-gray-400 text-sm">Cargando...</p>
        </div>
      </div>
    );
  }

  const pending = notifications.filter((n) => !n.is_sent);
  const sent = notifications.filter((n) => n.is_sent);

  return (
    <div className="min-h-screen">
      <Navigation
        userRole={profile.role}
        userName={profile.full_name}
        houseNumber={profile.house_number}
      />

      <main className="max-w-2xl mx-auto px-4 py-6 space-y-5 safe-bottom">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Notificaciones</h1>
          <p className="text-gray-500 text-sm">Avisos cuando se libere un turno que quieres</p>
        </div>

        {/* Info card */}
        <div className="flex gap-3 p-4 bg-blue-50 border border-blue-200 rounded-2xl">
          <div className="text-xl flex-shrink-0">💡</div>
          <p className="text-sm text-blue-800 leading-relaxed">
            Cuando un turno esté ocupado, puedes presionar{" "}
            <strong className="text-blue-900">"Avísame"</strong> para que te llegue un correo
            si ese turno se cancela.
          </p>
        </div>

        {/* Pending */}
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-bold text-gray-900">Alertas activas</h2>
            {pending.length > 0 && (
              <span className="chip bg-amber-100 text-amber-700">{pending.length}</span>
            )}
          </div>

          {pending.length === 0 ? (
            <div className="text-center py-8">
              <div className="w-14 h-14 rounded-2xl bg-gray-100 flex items-center justify-center text-2xl mx-auto mb-3">
                🔔
              </div>
              <p className="font-semibold text-gray-700 text-sm">Sin alertas activas</p>
              <p className="text-xs text-gray-400 mt-1">
                Ve a "Reservar" y presiona "Avísame" en un turno ocupado
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {pending.map((n) => {
                const startDisplay = n.slot_start.substring(0, 5);
                const hour = startDisplay.split(":")[0];
                const min = startDisplay.split(":")[1];
                return (
                  <div
                    key={n.id}
                    className="flex items-center gap-3 p-3.5 bg-amber-50 border border-amber-200 rounded-2xl"
                  >
                    <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-amber-400 to-orange-500 text-white flex flex-col items-center justify-center text-xs font-bold flex-shrink-0 shadow-sm shadow-amber-500/20">
                      {hour}
                      <span className="text-[9px] opacity-80">:{min}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-sm text-gray-900 capitalize">
                        {formatDate(n.notification_date)}
                      </p>
                      <p className="text-xs text-gray-600">{formatTime(startDisplay)}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="chip bg-amber-100 text-amber-700 hidden sm:inline-flex">
                        Esperando
                      </span>
                      <button
                        onClick={() => handleDelete(n.id)}
                        className="text-gray-300 hover:text-red-500 transition-colors text-lg leading-none"
                        aria-label="Eliminar"
                      >
                        ✕
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Sent */}
        {sent.length > 0 && (
          <div className="card">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-bold text-gray-900">Ya notificadas</h2>
              <span className="chip bg-brand-100 text-brand-700">{sent.length}</span>
            </div>
            <div className="space-y-2">
              {sent.map((n) => {
                const startDisplay = n.slot_start.substring(0, 5);
                const hour = startDisplay.split(":")[0];
                const min = startDisplay.split(":")[1];
                return (
                  <div
                    key={n.id}
                    className="flex items-center gap-3 p-3.5 bg-gray-50 border border-gray-100 rounded-2xl opacity-60"
                  >
                    <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-brand-400 to-brand-600 text-white flex flex-col items-center justify-center text-xs font-bold flex-shrink-0">
                      {hour}
                      <span className="text-[9px] opacity-80">:{min}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-sm text-gray-900 capitalize">
                        {formatDate(n.notification_date)}
                      </p>
                      <p className="text-xs text-gray-500">{formatTime(startDisplay)}</p>
                    </div>
                    <span className="chip bg-brand-100 text-brand-700 flex-shrink-0">
                      Enviada ✓
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
